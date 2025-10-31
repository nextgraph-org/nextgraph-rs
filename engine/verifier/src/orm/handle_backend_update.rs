// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

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
    pub(crate) async fn orm_backend_update(
        &mut self,
        session_id: u64,
        repo_id: RepoId,
        _overlay_id: OverlayId,
        patch: GraphQuadsPatch,
    ) {
        let inserts = patch.inserts;
        let removes = patch.removes;
        log_info!(
            "[orm_backend_update] called with #adds, #removes: {}, {}",
            inserts.len(),
            removes.len()
        );

        // Collect and filter scopes that are affected by this backend update
        let scopes = self.collect_and_filter_scopes(repo_id, _overlay_id);

        if scopes.is_empty() {
            log_debug!("[orm_backend_update] No affected scopes");
            return;
        }

        log_debug!(
            "[orm_backend_update] Creating patch objects for #scopes {}",
            scopes.len()
        );

        // Apply changes to all affected scopes and send patches to clients
        self.apply_changes_to_all_scopes(scopes, &inserts, &removes, session_id)
            .await;

        log_info!("[orm_backend_update] COMPLETE - processed all scopes");
    }

    /// Collects and filters subscriptions scopes that are affected by this backend update.
    /// Returns a vec of (scope_str, root_shapes_and_tracked_shapes).
    fn collect_and_filter_scopes(
        &mut self,
        repo_id: RepoId,
        overlay_id: OverlayId,
    ) -> Vec<(String, Vec<(Arc<OrmSchemaShape>, Vec<Arc<OrmSchemaShape>>)>)> {
        let overlaylink: OverlayLink = overlay_id.into();
        let mut scopes = vec![];

        log_info!(
            "[orm_backend_update] Total subscriptions scopes: {}",
            self.orm_subscriptions.len()
        );

        for (scope_str, subs) in self.orm_subscriptions.iter_mut() {
            // First: Clean up and remove old subscriptions
            let initial_sub_count = subs.len();
            subs.retain(|sub| !sub.sender.is_closed());
            let retained_sub_count = subs.len();
            log_info!(
                "[orm_backend_update] Scope {:?}: {} subs ({} retained after cleanup)",
                scope_str,
                initial_sub_count,
                retained_sub_count
            );

            // Check if this scope is affected by this backend update
            if !Self::is_scope_affected(&scope_str, repo_id, &overlaylink) {
                log_info!(
                    "[orm_backend_update] SKIPPING scope {:?} - does not match repo_id={:?} or overlay={:?}",
                    scope_str,
                    repo_id,
                    overlay_id
                );
                continue;
            }

            log_info!(
                "[orm_backend_update] PROCESSING scope {:?} - matches criteria",
                scope_str
            );

            // Prepare shapes to track for this scope
            let root_shapes_and_tracked_shapes: Vec<(
                Arc<OrmSchemaShape>,
                Vec<Arc<OrmSchemaShape>>,
            )> = subs
                .iter()
                .map(|sub| {
                    let root_shape = sub
                        .shape_type
                        .schema
                        .get(&sub.shape_type.shape)
                        .unwrap()
                        .clone();
                    let tracked_shapes = sub.shapes_being_tracked();
                    (root_shape, tracked_shapes)
                })
                .collect::<Vec<_>>();

            scopes.push((scope_str.clone(), root_shapes_and_tracked_shapes));
        }

        scopes
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
    }

    /// Applies changes to all affected scopes and sends patches to clients.
    async fn apply_changes_to_all_scopes(
        &mut self,
        scopes: Vec<(String, Vec<(Arc<OrmSchemaShape>, Vec<Arc<OrmSchemaShape>>)>)>,
        inserts: &[Quad],
        removes: &[Quad],
        session_id: u64,
    ) {
        // Iterate over all scopes to apply changes to all tracked orm objects
        for (scope_str, shapes_zip) in scopes {
            let mut orm_changes: OrmChanges = HashMap::new();

            log_info!(
                "[orm_backend_update] Applying changes for scope {} with {} shape entries",
                scope_str,
                shapes_zip.len()
            );

            // Apply the changes to tracked orm objects
            for (root_shape_arc, all_tracked_shapes) in shapes_zip {
                let shape_iri = root_shape_arc.iri.clone();
                log_info!(
                    "[orm_backend_update] Calling process_changes_for_shape_and_session for shape={}, session={}",
                    shape_iri,
                    session_id
                );

                // Process changes for this shape
                let _ = self.process_changes_for_shape_and_session(
                    &NuriV0::new_from(&scope_str).unwrap_or_else(|_| NuriV0::new_empty()),
                    &shape_iri,
                    if all_tracked_shapes.len() > 0 {
                        all_tracked_shapes
                    } else {
                        // If all tracked orm objects are empty, we need to add the root shape manually
                        vec![root_shape_arc]
                    },
                    session_id,
                    inserts,
                    removes,
                    &mut orm_changes,
                    false,
                );
                log_info!(
                    "[orm_backend_update] After process_changes_for_shape_and_session: orm_changes has {} shapes",
                    orm_changes.len()
                );
            }

            // Log summary of changes
            log_info!(
                "[orm_backend_update] Total orm_changes for scope: {} shapes with changes",
                orm_changes.len()
            );
            for (shape_iri, subject_changes) in &orm_changes {
                log_info!(
                    "[orm_backend_update]   Shape {}: {} subjects changed",
                    shape_iri,
                    subject_changes.len()
                );
            }

            // Create and send patches from changes
            self.send_orm_patches_from_changes(&scope_str, &orm_changes, session_id)
                .await;

            log_info!(
                "[orm_backend_update] Finished processing all subscriptions for scope {:?}",
                scope_str
            );
        }
    }

    /// Creates and sends patches to clients from orm changes.
    async fn send_orm_patches_from_changes(
        &mut self,
        scope_str: &str,
        orm_changes: &OrmChanges,
        session_id: u64,
    ) {
        let subs = self.orm_subscriptions.get_mut(scope_str).unwrap();
        log_info!(
            "[orm_backend_update] Processing {} subscriptions for this scope",
            subs.len()
        );

        for sub in subs.iter_mut() {
            log_debug!(
                "Applying changes to subscription with nuri {} and shape {}",
                sub.nuri.repo(),
                sub.shape_type.shape
            );

            // The JSON patches to send to JS land.
            let mut patches: Vec<OrmPatch> = vec![];

            // Keep track of object patches to create: (path, Option<IRI>)
            // The IRI is Some for real subjects, None for intermediate objects
            let mut objects_to_create: HashSet<(Vec<String>, Option<(SubjectIri, GraphIri)>)> =
                HashSet::new();

            // Process changes for this subscription
            log_info!(
                "[orm_backend_update] Iterating over {} shapes in orm_changes",
                orm_changes.len()
            );

            // Process subject changes and build patches (inline to avoid borrow issues)
            for (shape_iri, graph_changes) in orm_changes.iter() {
                for (graph_iri, subject_changes) in graph_changes.iter() {
                    for (subject_iri, change) in subject_changes {
                        log_debug!(
                            "Patch creating for subject change x shape {} x {}. #changed preds: {}",
                            subject_iri,
                            shape_iri,
                            change.predicates.len()
                        );
                        // Get the tracked orm object for this (subject, shape) pair
                        let Some(tracked_orm_object_arc) =
                            sub.get_tracked_orm_object(graph_iri, subject_iri, shape_iri)
                        else {
                            // We might not be tracking this subject x shape combination. Then, there is nothing to do.
                            log_info!(
                            "[orm_backend_update] SKIPPING subject {} x shape {} - not tracked in this subscription",
                            subject_iri,
                            shape_iri
                        );
                            continue;
                        };
                        let tracked_orm_object = tracked_orm_object_arc.read().unwrap();

                        log_debug!(
                            "  - Validity check: prev_valid={:?}, valid={:?}",
                            change.prev_valid,
                            tracked_orm_object.valid
                        );

                        // Handle the subject based on its validity state
                        if change.prev_valid == TrackedOrmObjectValidity::Invalid
                            && tracked_orm_object.valid == TrackedOrmObjectValidity::Invalid
                        {
                            // Is the subject invalid and was it before? There is nothing we need to inform about.
                            log_info!(
                            "[orm_backend_update] SKIPPING subject {} - was and still is Invalid",
                            subject_iri
                        );
                            continue;
                        }

                        if change.prev_valid == TrackedOrmObjectValidity::Valid
                            && tracked_orm_object.valid != TrackedOrmObjectValidity::Valid
                        {
                            // Subject became invalid or untracked
                            log_info!(
                            "[orm_backend_update] Subject {} became invalid or untracked (prev={:?}, now={:?})",
                            subject_iri,
                            change.prev_valid,
                            tracked_orm_object.valid
                        );

                            // Check if any parent is also being deleted
                            let has_parent_being_deleted =
                                tracked_orm_object.parents.iter().any(|parent_arc| {
                                    let parent_ts = parent_arc.read().unwrap();
                                    parent_ts.valid == TrackedOrmObjectValidity::ToDelete
                                });

                            log_info!(
                                "[orm_backend_update] has_parent_being_deleted={}",
                                has_parent_being_deleted
                            );

                            if !has_parent_being_deleted {
                                // Create deletion patch
                                let mut path = vec![];
                                build_path_to_root_and_create_patches(
                                    &tracked_orm_object,
                                    &sub.shape_type.shape,
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

                        // Subject is valid or has become valid
                        log_info!(
                        "[orm_backend_update] Subject {} is valid or became valid (prev={:?}, now={:?}), processing {} predicate changes",
                        subject_iri,
                        change.prev_valid,
                        tracked_orm_object.valid,
                        change.predicates.len()
                    );

                        // Process predicate changes for this valid subject
                        for (_pred_iri, pred_change) in &change.predicates {
                            log_debug!(
                                "  - Predicate changes: {}; #Adds: {}; #Removes {}",
                                _pred_iri,
                                pred_change.values_added.len(),
                                pred_change.values_removed.len()
                            );

                            let tracked_predicate = pred_change.tracked_predicate.read().unwrap();
                            let pred_name = tracked_predicate.schema.readablePredicate.clone();

                            // Get the diff operations for this predicate change
                            let diff_ops = create_diff_ops_from_predicate_change(pred_change);

                            log_info!(
                                "[orm_backend_update] Created {} diff_ops for predicate {}",
                                diff_ops.len(),
                                _pred_iri
                            );

                            // For each diff operation, traverse up to the root to build the path
                            for diff_op in diff_ops {
                                let mut path = vec![escape_json_pointer_segment(&pred_name)];

                                // Start recursion from this tracked orm object
                                build_path_to_root_and_create_patches(
                                    &tracked_orm_object,
                                    &sub.shape_type.shape,
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
            log_info!(
                "[orm_backend_update] Finished iterating shapes. Created {} patches, {} objects_to_create",
                patches.len(),
                objects_to_create.len()
            );

            // Create patches for objects that need to be created
            let object_create_patches = create_object_and_graph_and_id_patches(&objects_to_create);

            log_info!(
                "[orm_backend_update] Created {} object_create_patches",
                object_create_patches.len()
            );

            let total_patches = object_create_patches.len() + patches.len();
            if total_patches > 0 {
                log_info!(
                    "[orm_backend_update] SENDING {} total patches to frontend (session={}, nuri={}, shape={})",
                    total_patches,
                    session_id,
                    sub.nuri.repo(),
                    sub.shape_type.shape
                );

                // Send response with patches.
                let _ = sub
                    .sender
                    .clone()
                    .send(AppResponse::V0(AppResponseV0::OrmUpdate(
                        [object_create_patches, patches].concat(),
                    )))
                    .await;

                log_info!("[orm_backend_update] Patches sent successfully");
            }

            // Cleanup (remove tracked orm objects to be deleted).
            sub.cleanup_tracked_orm_objects();
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

        // Always create the object itself.
        patches.push(OrmPatch {
            op: OrmPatchOp::add,
            valType: Some(OrmPatchType::object),
            path: json_pointer.clone(),
            value: None,
        });

        // If this object has an IRI (it's a real subject), add the id field
        if let Some((subject_iri, graph_iri)) = maybe_iri {
            patches.push(OrmPatch {
                op: OrmPatchOp::add,
                valType: None,
                path: format!("{}/@id", json_pointer),
                value: Some(json!(subject_iri)),
            });
            patches.push(OrmPatch {
                op: OrmPatchOp::add,
                valType: None,
                path: format!("{}/@graph", json_pointer),
                value: Some(json!(graph_iri)),
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
    // Check if we're at a root subject or need to traverse to parents
    if current_tormo.parents.is_empty() || current_tormo.shape.iri == *root_shape {
        // We are at the root. Insert without the last element (which is the property name).
        add_object_patches_to_create.insert((
            path[..path.len() - 1].to_vec(),
            Some(child_subject_graph_iri.clone()),
        ));
    } else {
        // Not at root: traverse to parents and create object patches along the way
        for parent_tracked_orm_object in current_tormo.parents.iter() {
            let parent_ts = parent_tracked_orm_object.read().unwrap();

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
    for pred_arc in &parent_tormo.shape.predicates {
        if let Some(parent_tracked_pred) = parent_tormo.tracked_predicates.get(&pred_arc.iri) {
            let parent_tracked_pred = parent_tracked_pred.read().unwrap();

            // Check if this tracked orm object is a child of this predicate
            let is_child = parent_tracked_pred.tracked_children.iter().any(|child| {
                let child_read = child.read().unwrap();

                child_read.subject_iri == tracked_orm_object.subject_iri
                    && child_read.graph_iri == tracked_orm_object.graph_iri
            });

            if is_child {
                let is_multi = pred_arc.maxCardinality > 1 || pred_arc.maxCardinality == -1;
                return Some((is_multi, parent_tracked_pred.tracked_children.clone()));
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

        // Look up the prev_valid from orm_changes
        let prev_valid = orm_changes
            .get(&child_read.shape.iri)
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
    // Find the predicate schema linking parent to this tracked orm object
    for pred_arc in &parent_ts.shape.predicates {
        // Check if this predicate has our subject as a child
        if let Some(tracked_pred) = parent_ts.tracked_predicates.get(&pred_arc.iri) {
            let tp = tracked_pred.read().unwrap();

            // Check if this tracked orm object is in the children
            let is_child = tp.tracked_children.iter().any(|child| {
                let child_read = child.read().unwrap();
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
    log_debug!(
        "  - build path, ts: {}, path {:?}, #parents: {}, shape: {}",
        tracked_orm_object.subject_iri,
        path,
        tracked_orm_object.parents.len(),
        tracked_orm_object.shape.iri
    );

    // Check if subject is valid for this patch creation
    if !is_valid_for_patch_creation(tracked_orm_object, &diff_op) {
        return;
    }

    // If this subject has no parents or its shape matches the root shape, we've reached the root
    if tracked_orm_object.parents.is_empty() || tracked_orm_object.shape.iri == *root_shape {
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
        let parent_ts = parent_tracked_orm_object.read().unwrap();

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
            log_debug!(
                "  - build_path_segment_for_parent returned None for parent: {}, child: {}",
                parent_ts.subject_iri,
                tracked_orm_object.subject_iri
            );
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

    let root_path_segment = format!(
        "/{}|{}",
        escape_json_pointer_segment(&tracked_orm_object.graph_iri),
        escape_json_pointer_segment(&tracked_orm_object.subject_iri),
    );
    let path_str = if !path_segments.is_empty() {
        format!("{root_path_segment}/{}", path_segments.join("/"))
    } else {
        format!("/{root_path_segment}")
    };

    // Create the patch for the actual value change
    patches.push(OrmPatch {
        op: diff_op.op.clone(),
        valType: diff_op.val_type.clone(),
        path: path_str.clone(),
        value: diff_op.value.clone(),
    });

    // If the subject is newly valid, now we have the full path to queue its creation
    if *prev_valid != TrackedOrmObjectValidity::Valid {
        let mut final_path = vec![root_path_segment];
        final_path.extend_from_slice(path_segments);
        queue_objects_to_create(
            tracked_orm_object,
            &tracked_orm_object.shape.iri,
            &final_path,
            objects_to_create,
            orm_changes,
            child_subject_graph_iri,
        );
    }
}

/// Create diff operations from a predicate change.
/// Returns a vec of DiffOperations.
fn create_diff_ops_from_predicate_change(
    pred_change: &TrackedOrmPredicateChanges,
) -> Vec<DiffOperation> {
    let tracked_predicate = pred_change.tracked_predicate.read().unwrap();

    let is_multi = tracked_predicate.schema.maxCardinality > 1
        || tracked_predicate.schema.maxCardinality == -1;
    let is_object = tracked_predicate
        .schema
        .dataTypes
        .iter()
        .any(|dt| dt.shape.is_some());

    let mut ops = vec![];

    if !is_multi && !is_object {
        if pred_change.values_added.len() == 1 {
            // A value was added. Another one might have been removed
            // but the add patch overwrite previous values.
            return vec![DiffOperation {
                op: OrmPatchOp::add,
                val_type: None,
                value: Some(json!(pred_change.values_added[0])),
            }];
        } else {
            // Since there is only one possible value, removing the path is enough.
            return vec![DiffOperation {
                op: OrmPatchOp::remove,
                val_type: None,
                value: None,
            }];
        }
    } else if is_multi && !is_object {
        if pred_change.values_added.len() > 0 {
            ops.push(DiffOperation {
                op: OrmPatchOp::add,
                val_type: Some(OrmPatchType::set),
                value: Some(json!(pred_change.values_added)),
            });
        }
        if pred_change.values_removed.len() > 0 {
            ops.push(DiffOperation {
                op: OrmPatchOp::remove,
                val_type: Some(OrmPatchType::set),
                value: Some(json!(pred_change.values_removed)),
            });
        }
        return ops;
    }
    // Objects are handled separately.

    ops
}
