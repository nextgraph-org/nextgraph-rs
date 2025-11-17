// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use std::collections::HashMap;
use std::sync::RwLock;
use std::u64;

use futures::SinkExt;
pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_net::{app_protocol::*, orm::*};
use ng_oxigraph::oxrdf::Quad;
use ng_repo::log::*;

use crate::orm::types::*;
use crate::orm::utils::*;
use crate::orm::OrmChanges;
use crate::types::*;
use crate::verifier::*;
use ng_net::types::OverlayLink;
use ng_repo::types::OverlayId;
use ng_repo::types::RepoId;
use serde_json::json;
use serde_json::Value;
use std::collections::HashSet;
use std::sync::Arc;
// use std::sync::RwLock;

/// Represents a diff operation with all its components.
/// Encapsulates: operation type, patch type, value, and optional IRI.
#[derive(Clone, Debug)]
struct DiffOperation {
    op: OrmPatchOp,
    val_type: Option<OrmPatchType>,
    value: Option<Value>,
}

impl Verifier {
    /// Applies quad patches and
    /// generates and sends JSON patches to JS-land.
    ///
    /// TODO: How to prevent duplicate application of change data?
    pub(crate) async fn orm_backend_update(
        &mut self,
        session_id: u64,
        repo_id: RepoId,
        overlay_id: OverlayId,
        patch: GraphQuadsPatch,
    ) {
        let inserts = patch.inserts;
        let removes = patch.removes;

        // log_info!(
        //     "inserts\n{}",
        //     inserts
        //         .iter()
        //         .map(|q| format!("{q}",))
        //         .collect::<Vec<_>>()
        //         .join("\n")
        // );
        // log_info!(
        //     "removes\n{}",
        //     removes
        //         .iter()
        //         .map(|q| format!("{q}",))
        //         .collect::<Vec<_>>()
        //         .join("\n")
        // );
        // TODO: Omit sending patches back to the subscription where they came from.

        // Apply changes to all affected scopes and send patches to clients
        self.apply_changes_to_all_scopes(repo_id, overlay_id, &inserts, &removes, session_id)
            .await;
    }

    /// Processes database quad updates. For each subscription, whose scope is affected:
    /// - Updates TORMOs
    /// - Creates and sends patches to the subscribing clients
    async fn apply_changes_to_all_scopes(
        &mut self,
        repo_id: RepoId,
        overlay_id: OverlayId,
        inserts: &[Quad],
        removes: &[Quad],
        origin_session_id: u64,
    ) {
        let overlaylink: OverlayLink = overlay_id.into();

        // Collect scope strings to process (to avoid borrow conflicts)
        let scope_strs: Vec<String> = self.orm_subscriptions.keys().cloned().collect();

        for scope_str in scope_strs {
            // TODO: This could be hacky if two threads want to read the subscriptions in parallel
            // Temporarily take the subscriptions out to avoid borrow conflicts
            let mut subs = self.orm_subscriptions.remove(&scope_str).unwrap();

            // First: Clean up and remove old subscriptions
            subs.retain(|sub| !sub.sender.is_closed());

            // Process changes for each subscription.
            for orm_subscription in subs.iter_mut() {
                // Check if this scope is affected by this backend update
                if !Self::is_scope_affected(&scope_str, repo_id, &overlaylink) {
                    continue;
                }

                // Process changes for this shape
                let mut orm_changes: OrmChanges = HashMap::new();
                let _ = self.process_changes_for_subscription(
                    orm_subscription,
                    inserts,
                    removes,
                    &mut orm_changes,
                    false,
                );
                // log_info!("[apply_changes_to_all_scopes] got the following changes from process_changes_for_subscription: {:?}", orm_changes);

                // Send patches if the subscription's session is different to the origin's session.
                // TODO: Is this the session_id the correct way to check this?
                // if origin_session_id != orm_subscription.session_id {
                //     // Create and send patches from changes
                //     Verifier::send_orm_patches_from_changes(orm_subscription, &orm_changes).await;
                // }

                //log_info!("[apply_changes_to_all_scopes]: Create and send patches for orm_subscription.session_id {} and origin_session_id {}", orm_subscription.session_id, origin_session_id);
                Verifier::send_orm_patches_from_changes(orm_subscription, &orm_changes).await;
            }

            // Put the subscriptions back
            self.orm_subscriptions.insert(scope_str, subs);
        }
    }

    /// Checks if a scope is affected by this backend update.
    fn is_scope_affected(scope_str: &String, repo_id: RepoId, overlaylink: &OverlayLink) -> bool {
        let scope_nuri = NuriV0::new_from(scope_str).unwrap_or_else(|_| NuriV0::new_empty());
        scope_nuri.target == NuriTargetV0::UserSite
            || scope_nuri
                .overlay
                .as_ref()
                .map_or(false, |ol| overlaylink == ol)
            || scope_nuri.target == NuriTargetV0::Repo(repo_id)
            || scope_str == "did:ng:i" // Listens to all (entire user site).
    }

    /// Creates and sends patches to clients from orm changes.
    async fn send_orm_patches_from_changes(
        orm_subscription: &OrmSubscription,
        orm_changes: &OrmChanges,
    ) {
        // The JSON patches to send to JS land.
        let mut patches: Vec<OrmPatch> = vec![];

        // Keep track of object patches to create: (path, Option<IRI>)
        // The IRI is Some for real subjects, None for intermediate objects
        let mut objects_to_create: HashSet<(Vec<String>, Option<(SubjectIri, GraphIri)>)> =
            HashSet::new();

        // Process subject changes and build patches (inline to avoid borrow issues)
        for (shape_iri, graph_changes) in orm_changes.iter() {
            for (graph_iri, subject_changes) in graph_changes.iter() {
                for (subject_iri, change) in subject_changes {
                    // log_info!(
                    //     "[PATCH TRACE] Begin subject changes: subject='{}' graph='{}' shape='{}' #changed_preds={}",
                    //     subject_iri,
                    //     graph_iri,
                    //     shape_iri,
                    //     change.predicates.len()
                    // );

                    // Log changes
                    for (_pred_iri, pred_change) in &change.predicates {
                        let tracked_predicate = pred_change.tracked_predicate.read().unwrap();
                        let Some(schema_arc) = tracked_predicate.schema_arc() else {
                            continue;
                        };
                        let pred_name = schema_arc.readablePredicate.clone();

                        // Log all added/removed values for this predicate change
                        // if !pred_change.values_added.is_empty() {
                        //     for v in &pred_change.values_added {
                        //         log_info!(
                        //             "[PATCH TRACE]    + Added value for pred='{}': {:?}",
                        //             pred_name,
                        //             v
                        //         );
                        //     }
                        // }
                        // if !pred_change.values_removed.is_empty() {
                        //     for v in &pred_change.values_removed {
                        //         log_info!(
                        //             "[PATCH TRACE]    - Removed value for pred='{}': {:?}",
                        //             pred_name,
                        //             v
                        //         );
                        //     }
                        // }
                    }

                    // Get the tracked orm object for this (subject, shape) pair
                    let Some(tracked_orm_object_arc) =
                        orm_subscription.get_tracked_orm_object(graph_iri, subject_iri, shape_iri)
                    else {
                        // We might not be tracking this subject x shape combination. Then, there is nothing to do.
                        continue;
                    };
                    let tracked_orm_object = tracked_orm_object_arc.read().unwrap();

                    // Skip if tormo is invalid and was it before? There is nothing we need to inform about.
                    if change.prev_valid == TrackedOrmObjectValidity::Invalid
                        && tracked_orm_object.valid == TrackedOrmObjectValidity::Invalid
                    {
                        continue;
                    }

                    // Subject became invalid or untracked?
                    // Mark to be deleted and create remove patch
                    if change.prev_valid == TrackedOrmObjectValidity::Valid
                        && tracked_orm_object.valid != TrackedOrmObjectValidity::Valid
                    {
                        // Check if any parent is also being deleted
                        let has_parent_being_deleted =
                            tracked_orm_object.parents.iter().any(|parent_w| {
                                if let Some(parent_arc) = parent_w.upgrade() {
                                    let parent_ts = parent_arc.read().unwrap();
                                    parent_ts.valid == TrackedOrmObjectValidity::ToDelete
                                } else {
                                    false
                                }
                            });

                        if !has_parent_being_deleted {
                            // Create deletion patch
                            let mut path = vec![];
                            build_path_to_root_and_create_patches(
                                &tracked_orm_object,
                                &orm_subscription.shape_type.shape,
                                &mut path,
                                DiffOperation {
                                    op: OrmPatchOp::remove,
                                    val_type: Some(OrmPatchType::object),
                                    value: None,
                                },
                                &mut patches,
                                &mut objects_to_create,
                                &change.prev_valid,
                                orm_changes,
                                &(
                                    tracked_orm_object.subject_iri.clone(),
                                    tracked_orm_object.graph_iri.clone(),
                                ),
                            );
                        }
                        continue;
                    }

                    // == Subject is valid or has become valid ==

                    // Process predicate changes for this valid subject
                    for (_pred_iri, pred_change) in &change.predicates {
                        let tracked_predicate = pred_change.tracked_predicate.read().unwrap();
                        let Some(schema_arc) = tracked_predicate.schema_arc() else {
                            continue;
                        };
                        let pred_name = schema_arc.readablePredicate.clone();
                        drop(tracked_predicate); // Release lock before calling function

                        // Create patches for this predicate change (handles both objects and literals)
                        let (object_patches, diff_ops) = create_patches_for_predicate_change(
                            pred_change,
                            &tracked_orm_object,
                            &orm_subscription.shape_type.shape,
                            orm_changes,
                        );

                        // Add object patches directly to the main patches list
                        patches.extend(object_patches);

                        // For each diff operation (literals), traverse up to the root to build the path
                        for diff_op in diff_ops {
                            let mut path = vec![escape_json_pointer_segment(&pred_name)];

                            // log_info!(
                            //     "[PATCH TRACE]   Diff op enqueued: subject='{}' graph='{}' op={:?} valType={:?} value_present={} starting_path_segs={:?}",
                            //     tracked_orm_object.subject_iri,
                            //     tracked_orm_object.graph_iri,
                            //     diff_op.op,
                            //     diff_op.val_type,
                            //     diff_op.value.is_some(),
                            //     path
                            // );

                            // Start recursion from this tracked orm object
                            build_path_to_root_and_create_patches(
                                &tracked_orm_object,
                                &orm_subscription.shape_type.shape,
                                &mut path,
                                diff_op,
                                &mut patches,
                                &mut objects_to_create,
                                &change.prev_valid,
                                orm_changes,
                                &(
                                    tracked_orm_object.subject_iri.clone(),
                                    tracked_orm_object.graph_iri.clone(),
                                ),
                            );
                        }
                    }
                }
            }
        }

        // Create patches for objects that need to be created
        let object_create_patches = create_object_and_graph_and_id_patches(&objects_to_create);

        // Reorder patches to improve determinism and avoid duplicates:
        // TODO: Sort them by path length
        // 1) Independent value patches (not under any newly created object)
        // 2) Object creation patches (add object + @graph + @id)
        // 3) Dependent patches (whose path is under a created object),
        //    while dropping duplicate object-add patches at the created object path

        if !object_create_patches.is_empty() || !patches.is_empty() {
            // Build a set of created object JSON pointer paths for prefix checks
            let created_paths: std::collections::HashSet<String> = objects_to_create
                .iter()
                .map(|(segments, _)| format!("/{}", segments.join("/")))
                .collect();

            // log_info!(
            //     "[PATCH TRACE]  Objects to create: {}. Created paths: {:?}",
            //     objects_to_create.len(),
            //     created_paths
            // );

            // Partition patches into independent and dependent
            let mut independent: Vec<OrmPatch> = Vec::new();
            let mut dependent: Vec<OrmPatch> = Vec::new();

            for p in patches.into_iter() {
                // If this patch targets a created object path exactly and is an object-add, drop it (duplicate)
                let is_duplicate_object_add =
                    p.valType == Some(OrmPatchType::object) && created_paths.contains(&p.path);

                if is_duplicate_object_add {
                    continue;
                }

                // Check if under any created path (prefix match)
                let is_dependent = created_paths
                    .iter()
                    .any(|prefix| p.path == *prefix || p.path.starts_with(&format!("{}/", prefix)));

                if is_dependent {
                    dependent.push(p);
                } else {
                    independent.push(p);
                }
            }

            let final_patches: Vec<OrmPatch> = [independent, object_create_patches, dependent]
                .into_iter()
                .flatten()
                .collect();

            // Send response with patches.
            let total_patches = final_patches.len();
            if total_patches > 0 {
                // for p in &final_patches {
                //     log_info!(
                //         "[PATCH TRACE]  Final patch: op={:?} valType={:?} path={} value_present={}",
                //         p.op,
                //         p.valType,
                //         p.path,
                //         p.value.is_some()
                //     );
                // }
                let _ = orm_subscription
                    .sender
                    .clone()
                    .send(AppResponse::V0(AppResponseV0::OrmUpdate(final_patches)))
                    .await;
            }
        }
    }
}

/// Create patches for objects that need to be created from a set of (path, IRI) pairs.
/// Sorts by path length to ensure parent objects are created before children.
/// Path segments are expected to be already escaped.
fn create_object_and_graph_and_id_patches(
    objects_to_create: &HashSet<(Vec<String>, Option<(SubjectIri, GraphIri)>)>,
) -> Vec<OrmPatch> {
    // Sort by path length (shorter first) to ensure parent objects are created before children
    let mut sorted_objects: Vec<_> = objects_to_create.iter().collect();
    sorted_objects.sort_by_key(|(path_segments, _)| path_segments.len());
    let mut patches = vec![];

    for (path_segments, maybe_iri) in sorted_objects {
        let json_pointer = format!("/{}", path_segments.join("/"));

        // log_info!(
        //     "[PATCH TRACE]  Creating object container at path={}",
        //     json_pointer
        // );

        // Always create the object itself.
        patches.push(OrmPatch {
            op: OrmPatchOp::add,
            valType: Some(OrmPatchType::object),
            path: json_pointer.clone(),
            value: None,
        });

        // If this object has an IRI (it's a real subject), add the graph then id fields
        if let Some((subject_iri, graph_iri)) = maybe_iri {
            // log_info!(
            //     "[PATCH TRACE]   Adding @graph/@id for subject='{}' graph='{}' at base={}",
            //     subject_iri,
            //     graph_iri,
            //     json_pointer
            // );
            patches.push(OrmPatch {
                op: OrmPatchOp::add,
                valType: None,
                path: format!("{}/@graph", json_pointer),
                value: Some(json!(graph_iri)),
            });
            patches.push(OrmPatch {
                op: OrmPatchOp::add,
                valType: None,
                path: format!("{}/@id", json_pointer),
                value: Some(json!(subject_iri)),
            });
        }
    }

    patches
}

/// Queue patches for a newly valid tracked orm object.
/// This handles creating object patches and id field patches for subjects that have become valid.
fn queue_objects_to_create(
    current_tormo: &TrackedOrmObject,
    root_shape: &String,
    path: &[String],
    add_object_patches_to_create: &mut HashSet<(Vec<String>, Option<(SubjectIri, GraphIri)>)>,
    orm_changes: &OrmChanges,
    child_subject_graph_iri: &(SubjectIri, GraphIri),
) {
    let shape_iri_opt = current_tormo.shape_iri();
    if current_tormo.parents.is_empty()
        || shape_iri_opt
            .as_ref()
            .map(|s| s == root_shape)
            .unwrap_or(false)
    {
        // We are at the root. Insert the full path to the object itself.
        // For multi-valued predicates, the last segment is the composite key (graph|subject).
        // For single-valued predicates, the last segment is the object container property name.
        // In both cases, we want to create the object at the full path.
        add_object_patches_to_create.insert((path.to_vec(), Some(child_subject_graph_iri.clone())));
    } else {
        // Not at root: traverse to parents and create object patches along the way
        for parent_tracked_orm_object in current_tormo.parents.iter() {
            let Some(parent_arc) = parent_tracked_orm_object.upgrade() else {
                continue;
            };
            let parent_ts = parent_arc.read().unwrap();

            if let Some(new_path) = build_path_segment_for_parent(current_tormo, &parent_ts, path) {
                // Check if the parent's predicate is multi-valued and if no siblings were previously valid
                let should_create_parent_predicate_object =
                    check_should_create_parent_predicate_object(
                        current_tormo,
                        &parent_ts,
                        orm_changes,
                    );

                if should_create_parent_predicate_object {
                    // Need to create an intermediate object for the multi-valued predicate
                    // This is the case for Person -> hasAddress -> (object) -> AddressIri -> AddressObject
                    // The intermediate (object) doesn't have an IRI
                    let mut intermediate_path = new_path.clone();
                    intermediate_path.pop(); // Remove the subject IRI that was added for multi predicates
                    add_object_patches_to_create.insert((intermediate_path, None));
                }

                // Recurse to the parent first
                queue_objects_to_create(
                    &parent_ts,
                    root_shape,
                    &new_path,
                    add_object_patches_to_create,
                    orm_changes,
                    child_subject_graph_iri,
                );

                // Register this object for creation with its IRI
                add_object_patches_to_create.insert((
                    new_path.clone(),
                    Some((
                        current_tormo.subject_iri.clone(),
                        current_tormo.graph_iri.clone(),
                    )),
                ));
            }
        }
    }
}

/// Check if we should create an intermediate object for a multi-valued predicate.
/// Returns true if the parent's predicate is multi-valued and no siblings were previously valid.
fn check_should_create_parent_predicate_object(
    tracked_orm_object: &TrackedOrmObject,
    parent_ts: &TrackedOrmObject,
    orm_changes: &OrmChanges,
) -> bool {
    // Find the predicate schema linking parent to this subject
    if let Some((is_multi, tracked_children)) =
        find_predicate_and_children(tracked_orm_object, parent_ts)
    {
        if is_multi {
            // Check if any siblings were previously valid
            if !any_sibling_was_valid(tracked_orm_object, &tracked_children, orm_changes) {
                // log_info!(
                //     "[PATCH TRACE]   Will create intermediate object container for multi-valued predicate linking parent='{}' -> child='{}'",
                //     parent_ts.subject_iri,
                //     tracked_orm_object.subject_iri
                // );
                return true;
            }
        }
    }
    false
}

/// Finds the predicate linking parent to child and returns if it's multi-valued and the tracked children.
fn find_predicate_and_children(
    tracked_orm_object: &TrackedOrmObject,
    parent_tormo: &TrackedOrmObject,
) -> Option<(bool, Vec<Arc<RwLock<TrackedOrmObject>>>)> {
    let parent_shape = parent_tormo.shape_arc()?;
    for pred_arc in &parent_shape.predicates {
        if let Some(parent_tracked_pred) = parent_tormo.tracked_predicates.get(&pred_arc.iri) {
            let parent_tracked_pred = parent_tracked_pred.read().unwrap();
            let upgraded_children: Vec<_> = parent_tracked_pred
                .tracked_children
                .iter()
                .filter_map(|w| w.upgrade())
                .collect();
            let is_child = upgraded_children.iter().any(|child| {
                let child_read = child.read().unwrap();
                child_read.subject_iri == tracked_orm_object.subject_iri
                    && child_read.graph_iri == tracked_orm_object.graph_iri
            });

            if is_child {
                let is_multi = pred_arc.maxCardinality > 1 || pred_arc.maxCardinality == -1;
                return Some((is_multi, upgraded_children));
            }
        }
    }
    None
}

/// Checks if any sibling of the tracked orm object was previously valid.
fn any_sibling_was_valid(
    tracked_orm_object: &TrackedOrmObject,
    tracked_children: &[Arc<RwLock<TrackedOrmObject>>],
    orm_changes: &OrmChanges,
) -> bool {
    tracked_children.iter().any(|child| {
        let child_read = child.read().unwrap();
        // Skip self
        if child_read.subject_iri == tracked_orm_object.subject_iri
            && child_read.graph_iri == tracked_orm_object.graph_iri
        {
            return false;
        }
        let shape_iri = child_read.shape_iri().unwrap();
        let prev_valid = orm_changes
            .get(&shape_iri)
            .and_then(|graphs| graphs.get(&child_read.graph_iri))
            .and_then(|subjects| subjects.get(&child_read.subject_iri))
            .map(|change| &change.prev_valid)
            .unwrap_or(&TrackedOrmObjectValidity::Valid);

        *prev_valid == TrackedOrmObjectValidity::Valid
    })
}

/// Find the predicate schema linking a parent to a child orm object and build the path segment.
/// Returns the updated path if a linking predicate is found.
fn build_path_segment_for_parent(
    tracked_orm_object: &TrackedOrmObject,
    parent_ts: &TrackedOrmObject,
    base_path: &[String],
) -> Option<Vec<String>> {
    let parent_shape = parent_ts.shape_arc()?;
    for pred_arc in &parent_shape.predicates {
        // Check if this predicate has our subject as a child
        if let Some(tracked_pred) = parent_ts.tracked_predicates.get(&pred_arc.iri) {
            let tp = tracked_pred.read().unwrap();

            // Check if this tracked orm object is in the children
            let is_child = tp.tracked_children.iter().any(|child| {
                let binding = child.upgrade().unwrap();
                let child_read = binding.read().unwrap();
                child_read.subject_iri == tracked_orm_object.subject_iri
                    && child_read.graph_iri == tracked_orm_object.graph_iri
            });

            if is_child {
                // Build the path segment
                let mut new_path = base_path.to_vec();

                let is_multi = pred_arc.maxCardinality > 1 || pred_arc.maxCardinality == -1;

                // For multi-valued predicates, add the composite key (graph|subject) as a key first
                if is_multi {
                    let composite_key = format!(
                        "{}|{}",
                        escape_json_pointer_segment(&tracked_orm_object.graph_iri),
                        escape_json_pointer_segment(&tracked_orm_object.subject_iri)
                    );
                    new_path.insert(0, composite_key);
                }

                // Add the readable predicate name
                new_path.insert(0, escape_json_pointer_segment(&pred_arc.readablePredicate));

                // log_info!(
                //     "[PATCH TRACE]    build_path_segment_for_parent: parent='{}' pred='{}' is_multi={} -> new_path_segs={:?}",
                //     parent_ts.subject_iri,
                //     pred_arc.readablePredicate,
                //     is_multi,
                //     new_path
                // );

                return Some(new_path);
            }
        }
    }
    None
}

/// Recursively build the path from a tracked orm object to the root and create diff operation patches.
/// The function recurses from child to parents down to a root tracked orm object.
/// If multiple parents exist, it adds separate patches for each.
fn build_path_to_root_and_create_patches(
    tracked_orm_object: &TrackedOrmObject,
    root_shape: &String,
    path: &mut Vec<String>,
    diff_op: DiffOperation,
    patches: &mut Vec<OrmPatch>,
    objects_to_create: &mut HashSet<(Vec<String>, Option<(SubjectIri, GraphIri)>)>,
    prev_valid: &TrackedOrmObjectValidity,
    orm_changes: &OrmChanges,
    child_subject_graph_iri: &(SubjectIri, GraphIri),
) {
    let shape_iri = tracked_orm_object
        .shape_iri()
        .unwrap_or("<dropped-shape>".into());
    // log_info!(
    //     "[PATCH TRACE] build_path_to_root: subject='{}' graph='{}' shape='{}' parents={} current_path_segs={:?} op={:?} valType={:?}",
    //     tracked_orm_object.subject_iri,
    //     tracked_orm_object.graph_iri,
    //     shape_iri,
    //     tracked_orm_object.parents.len(),
    //     path,
    //     diff_op.op,
    //     diff_op.val_type
    // );

    // Check if subject is valid for this patch creation
    if !is_valid_for_patch_creation(tracked_orm_object, &diff_op) {
        // log_info!(
        //     "[PATCH TRACE]  Skipping patch creation due to invalid tormo (and not an object remove): subject='{}' graph='{}'",
        //     tracked_orm_object.subject_iri,
        //     tracked_orm_object.graph_iri
        // );
        return;
    }

    // If this subject has no parents or its shape matches the root shape, we've reached the root
    if tracked_orm_object.parents.is_empty()
        || tracked_orm_object
            .shape_iri()
            .as_ref()
            .map(|s| s == root_shape)
            .unwrap_or(false)
    {
        handle_root_reached(
            tracked_orm_object,
            path,
            &diff_op,
            patches,
            objects_to_create,
            prev_valid,
            orm_changes,
            child_subject_graph_iri,
        );
        return;
    }

    // Recurse to parents
    for parent_tracked_orm_object in tracked_orm_object.parents.iter() {
        let Some(parent_arc) = parent_tracked_orm_object.upgrade() else {
            continue;
        };
        let parent_ts = parent_arc.read().unwrap();

        // Build the path segment for this parent
        if let Some(mut new_path) =
            build_path_segment_for_parent(tracked_orm_object, &parent_ts, path)
        {
            // Recurse to the parent
            build_path_to_root_and_create_patches(
                &parent_ts,
                root_shape,
                &mut new_path,
                diff_op.clone(),
                patches,
                objects_to_create,
                prev_valid,
                orm_changes,
                child_subject_graph_iri,
            );
        } else {
            // log_info!(
            //     "[PATCH TRACE]  build_path_segment_for_parent returned None: parent='{}' child='{}'",
            //     parent_ts.subject_iri,
            //     tracked_orm_object.subject_iri
            // );
        }
    }
}

/// Checks if a subject is valid for creating a patch in this context.
fn is_valid_for_patch_creation(
    tracked_orm_object: &TrackedOrmObject,
    diff_op: &DiffOperation,
) -> bool {
    // If the tracked orm object is not valid, we don't create patches for it
    // EXCEPT when we're removing the object itself (indicated by op == remove and valType == object)
    let is_delete_op =
        diff_op.op == OrmPatchOp::remove && diff_op.val_type == Some(OrmPatchType::object);
    tracked_orm_object.valid == TrackedOrmObjectValidity::Valid || is_delete_op
}

/// Handles the case when we've reached the root of the hierarchy.
fn handle_root_reached(
    tracked_orm_object: &TrackedOrmObject,
    path_segments: &[String],
    diff_op: &DiffOperation,
    patches: &mut Vec<OrmPatch>,
    objects_to_create: &mut HashSet<(Vec<String>, Option<(SubjectIri, GraphIri)>)>,
    prev_valid: &TrackedOrmObjectValidity,
    orm_changes: &OrmChanges,
    child_subject_graph_iri: &(SubjectIri, GraphIri),
) {
    // Build the final JSON Pointer path

    // Root key without leading slash for internal path segment usage
    let root_key_segment = format!(
        "{}|{}",
        escape_json_pointer_segment(&tracked_orm_object.graph_iri),
        escape_json_pointer_segment(&tracked_orm_object.subject_iri),
    );
    // Slash-prefixed variant used only for the final JSON Pointer string
    let root_path_segment = format!("/{}", root_key_segment);
    let path_str = if !path_segments.is_empty() {
        format!("{root_path_segment}/{}", path_segments.join("/"))
    } else {
        // root_path_segment already includes a leading '/'. Avoid adding another one.
        root_path_segment.clone()
    };

    // Create the patch for the actual value change
    // log_info!(
    //     "[PATCH TRACE]  handle_root_reached: root='{}|{}' full_path='{}' op={:?} valType={:?} value_present={} prev_valid={:?}",
    //     tracked_orm_object.graph_iri,
    //     tracked_orm_object.subject_iri,
    //     path_str,
    //     diff_op.op,
    //     diff_op.val_type,
    //     diff_op.value.is_some(),
    //     prev_valid
    // );
    patches.push(OrmPatch {
        op: diff_op.op.clone(),
        valType: diff_op.val_type.clone(),
        path: path_str.clone(),
        value: diff_op.value.clone(),
    });

    // If the subject is newly valid, queue creation of the CHILD object at its object path
    if *prev_valid != TrackedOrmObjectValidity::Valid {
        // Derive the object path (exclude the trailing leaf property for non-object/set ops)
        // path_segments is the full path from the root subject down to the leaf property/object.
        // We want to create the child object (subject or container), not the leaf property itself.
        let mut object_path_segments: Vec<String> = path_segments.to_vec();

        // If the operation targets a primitive value or a set, the last segment is a property name.
        // Drop it so we create the object at the subject/composite-key or the container level.
        let is_object_op = diff_op.val_type == Some(OrmPatchType::object);
        // For any non-object operation (including sets and plain values),
        // drop the trailing property segment so we create the object at the
        // subject/composite-key or container level, not at the property path.
        if !is_object_op {
            if let Some(last) = object_path_segments.last() {
                // Only drop if it's not a composite key segment (which contains a '|')
                if !last.contains('|') {
                    object_path_segments.pop();
                }
            }
        }

        // Build final object path segments with the non-slash root key first
        let mut final_path = vec![root_key_segment];
        final_path.extend_from_slice(&object_path_segments);

        // log_info!(
        //     "[PATCH TRACE]   Queue objects to create due to prev_valid={:?}: final_object_path_segs={:?} child_subject='{}' child_graph='{}'",
        //     prev_valid,
        //     final_path,
        //     child_subject_graph_iri.0,
        //     child_subject_graph_iri.1
        // );
        if let Some(shape_iri2) = tracked_orm_object.shape_iri() {
            queue_objects_to_create(
                tracked_orm_object,
                &shape_iri2,
                &final_path,
                objects_to_create,
                orm_changes,
                child_subject_graph_iri,
            );
        }
    }
}

/// Create patches for a predicate change, handling both literals and objects.
/// For object-valued predicates, this generates the full object creation patches.
/// For literal predicates, this returns diff operations to be processed via path building.
/// Returns (object_patches, diff_operations).
fn create_patches_for_predicate_change(
    pred_change: &TrackedOrmPredicateChanges,
    tracked_orm_object: &TrackedOrmObject,
    sub_shape: &String,
    orm_changes: &OrmChanges,
) -> (Vec<OrmPatch>, Vec<DiffOperation>) {
    let tracked_predicate = pred_change.tracked_predicate.read().unwrap();
    let Some(schema_arc) = tracked_predicate.schema_arc() else {
        //log_info!("[PATCH TRACE]   Skipping predicate change: schema dropped");
        return (vec![], vec![]);
    };
    let is_multi = schema_arc.maxCardinality > 1 || schema_arc.maxCardinality == -1;
    let is_object = schema_arc.dataTypes.iter().any(|dt| dt.shape.is_some());

    let mut patches = vec![];
    let mut ops = vec![];

    // TODO: Revisit the code below.

    // Handle object-valued predicates
    if is_object {
        // log_info!(
        //     "[PATCH TRACE] object-valued predicate: parent_subject='{}' parent_graph='{}' pred='{}' is_multi={} additions_count={} tracked_children_count={} readable='{}'",
        //     tracked_orm_object.subject_iri,
        //     tracked_orm_object.graph_iri,
        //     schema_arc.iri,
        //     is_multi,
        //     pred_change.values_added.len(),
        //     tracked_predicate.tracked_children.len(),
        //     schema_arc.readablePredicate
        // );

        for added in &pred_change.values_added {
            if let BasicType::Str(child_subject_iri) = added {
                // Find matching tracked child objects (could be in multiple graphs)
                let mut found_child = false;
                for child_w in &tracked_predicate.tracked_children {
                    let Some(child_arc) = child_w.upgrade() else {
                        continue;
                    };
                    let child = child_arc.read().unwrap();
                    if &child.subject_iri != child_subject_iri {
                        continue;
                    }

                    found_child = true;

                    // log_info!(
                    //     "[PATCH TRACE]  Found tracked child: subject='{}' graph='{}' (parent_subj='{}' pred='{}')",
                    //     child.subject_iri, child.graph_iri, tracked_orm_object.subject_iri, schema_arc.readablePredicate
                    // );

                    // Build patches starting from the child up to the root
                    let mut path: Vec<String> = Vec::new();
                    let diff_op = DiffOperation {
                        op: OrmPatchOp::add,
                        val_type: Some(OrmPatchType::object),
                        value: None,
                    };

                    // Force creation regardless of child's previous validity
                    let forced_prev = TrackedOrmObjectValidity::Invalid;
                    let mut objects_to_create = HashSet::new();

                    build_path_to_root_and_create_patches(
                        &child,
                        sub_shape,
                        &mut path,
                        diff_op,
                        &mut patches,
                        &mut objects_to_create,
                        &forced_prev,
                        orm_changes,
                        &(child.subject_iri.clone(), child.graph_iri.clone()),
                    );
                }

                // Fallback: if the tracked children list did not contain the child (e.g., cross-graph link),
                // construct the object and its @graph/@id patches directly using the child's graph from orm_changes.
                if !found_child {
                    // log_info!(
                    //     "[PATCH TRACE]  Fallback path for child subject='{}' (parent='{}' pred='{}'): attempting to resolve child graph from orm_changes",
                    //     child_subject_iri,
                    //     tracked_orm_object.subject_iri,
                    //     schema_arc.readablePredicate
                    // );
                    // Try to find the child's graph IRI from orm_changes
                    let mut child_graph_opt: Option<String> = None;
                    for (_shape_k, graphs) in orm_changes.iter() {
                        for (g_iri, subjects) in graphs.iter() {
                            if subjects.contains_key(child_subject_iri) {
                                child_graph_opt = Some(g_iri.clone());
                                break;
                            }
                        }
                        if child_graph_opt.is_some() {
                            break;
                        }
                    }
                    // If we didn't find the child's graph, as a last resort fall back to the parent's graph.
                    let child_graph =
                        child_graph_opt.unwrap_or_else(|| tracked_orm_object.graph_iri.clone());
                    if !child_graph.is_empty() {
                        // log_info!(
                        //     "[PATCH TRACE]   Fallback child_graph='{}' for child='{}'",
                        //     child_graph,
                        //     child_subject_iri
                        // );
                        // Build parent root composite key
                        let parent_root_key = format!(
                            "{}|{}",
                            escape_json_pointer_segment(&tracked_orm_object.graph_iri),
                            escape_json_pointer_segment(&tracked_orm_object.subject_iri),
                        );

                        let child_composite = format!(
                            "{}|{}",
                            escape_json_pointer_segment(&child_graph),
                            escape_json_pointer_segment(child_subject_iri),
                        );
                        let pred_seg = escape_json_pointer_segment(&schema_arc.readablePredicate);
                        let final_path =
                            format!("/{}/{}/{}", parent_root_key, pred_seg, child_composite);

                        // Add object creation patch and @graph/@id
                        patches.push(OrmPatch {
                            op: OrmPatchOp::add,
                            valType: Some(OrmPatchType::object),
                            path: final_path.clone(),
                            value: None,
                        });
                        patches.push(OrmPatch {
                            op: OrmPatchOp::add,
                            valType: None,
                            path: format!("{}/@graph", final_path),
                            value: Some(json!(child_graph.clone())),
                        });
                        patches.push(OrmPatch {
                            op: OrmPatchOp::add,
                            valType: None,
                            path: format!("{}/@id", final_path),
                            value: Some(json!(child_subject_iri.clone())),
                        });
                        //log_info!("[PATCH TRACE]   Fallback created object add at path='{}' with @graph/@id", final_path);
                    } else {
                        // child_graph empty. Skipping emitting fallback patches.
                        // log_info!(
                        //     "[PATCH TRACE]   Fallback failed: empty child_graph for child='{}'",
                        //     child_subject_iri
                        // );
                    }
                }
            }
        }

        // For removals of object links, we rely on validity transitions of the child or
        // explicit removal patches generated elsewhere when the link disappears.
        return (patches, ops);
    }

    // Handle literal predicates (non-objects)
    if !is_multi {
        if pred_change.values_added.len() == 1 {
            // A value was added. Another one might have been removed
            // but the add patch overwrites previous values.
            // log_info!(
            //     "[PATCH TRACE]  Literal single-valued add: subject='{}' graph='{}' pred='{}' value={:?}",
            //     tracked_orm_object.subject_iri,
            //     tracked_orm_object.graph_iri,
            //     schema_arc.readablePredicate,
            //     pred_change.values_added[0]
            // );
            ops.push(DiffOperation {
                op: OrmPatchOp::add,
                val_type: None,
                value: Some(json!(pred_change.values_added[0])),
            });
        } else {
            // Since there is only one possible value, removing the path is enough.
            // log_info!(
            //     "[PATCH TRACE]  Literal single-valued remove: subject='{}' graph='{}' pred='{}' (no new value)",
            //     tracked_orm_object.subject_iri,
            //     tracked_orm_object.graph_iri,
            //     schema_arc.readablePredicate
            // );
            ops.push(DiffOperation {
                op: OrmPatchOp::remove,
                val_type: None,
                value: None,
            });
        }
    } else {
        // Multi-valued literals
        if pred_change.values_added.len() > 0 {
            // log_info!(
            //     "[PATCH TRACE]  Literal multi-valued add-set: subject='{}' graph='{}' pred='{}' values={:?}",
            //     tracked_orm_object.subject_iri,
            //     tracked_orm_object.graph_iri,
            //     schema_arc.readablePredicate,
            //     pred_change.values_added
            // );
            ops.push(DiffOperation {
                op: OrmPatchOp::add,
                val_type: Some(OrmPatchType::set),
                value: Some(json!(pred_change.values_added)),
            });
        }
        if pred_change.values_removed.len() > 0 {
            // log_info!(
            //     "[PATCH TRACE]  Literal multi-valued remove-set: subject='{}' graph='{}' pred='{}' values={:?}",
            //     tracked_orm_object.subject_iri,
            //     tracked_orm_object.graph_iri,
            //     schema_arc.readablePredicate,
            //     pred_change.values_removed
            // );
            ops.push(DiffOperation {
                op: OrmPatchOp::remove,
                val_type: Some(OrmPatchType::set),
                value: Some(json!(pred_change.values_removed)),
            });
        }
    }

    (patches, ops)
}
