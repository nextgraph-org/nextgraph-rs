// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::collections::HashMap;
use std::u64;

use futures::SinkExt;
pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_net::{app_protocol::*, orm::*};
use ng_repo::log::*;

use crate::orm::types::*;
use crate::orm::utils::*;
use crate::orm::OrmChanges;
use crate::types::*;
use crate::verifier::*;
use ng_net::types::OverlayLink;
use ng_oxigraph::oxrdf::Triple;
use ng_repo::types::OverlayId;
use ng_repo::types::RepoId;
use serde_json::json;
use serde_json::Value;
use std::collections::HashSet;
use std::sync::Arc;
use std::sync::RwLock;

impl Verifier {
    /// Generate and send JSON patches from GraphQuadsPatch (quad inserts and removes) to JS-land.
    pub(crate) async fn orm_backend_update(
        &mut self,
        session_id: u64,
        repo_id: RepoId,
        overlay_id: OverlayId,
        patch: GraphQuadsPatch,
    ) {
        let overlaylink: OverlayLink = overlay_id.into();

        // We need to apply the patches to all subscriptions we have. We can use process_changes_for_*
        // That updates the tracked subjects, validates them, and returns a set of changes structured
        // by the respective schema.

        let triple_inserts: Vec<Triple> = patch
            .inserts
            .iter()
            .map(|quad| {
                Triple::new(
                    quad.subject.clone(),
                    quad.predicate.clone(),
                    quad.object.clone(),
                )
            })
            .collect();
        let triple_removes: Vec<Triple> = patch
            .removes
            .iter()
            .map(|quad| {
                Triple::new(
                    quad.subject.clone(),
                    quad.predicate.clone(),
                    quad.object.clone(),
                )
            })
            .collect();

        log_info!(
            "[orm_backend_update] called with #adds, #removes: {}, {}",
            triple_inserts.len(),
            triple_removes.len()
        );

        log_info!(
            "[orm_backend_update] Total subscriptions scopes: {}",
            self.orm_subscriptions.len()
        );

        let mut scopes = vec![];
        for (scope, subs) in self.orm_subscriptions.iter_mut() {
            // Remove old subscriptions
            let initial_sub_count = subs.len();
            subs.retain(|sub| !sub.sender.is_closed());
            let retained_sub_count = subs.len();
            log_info!(
                "[orm_backend_update] Scope {:?}: {} subs ({} retained after cleanup)",
                scope,
                initial_sub_count,
                retained_sub_count
            );

            if !(scope.target == NuriTargetV0::UserSite
                || scope
                    .overlay
                    .as_ref()
                    .map_or(false, |ol| overlaylink == *ol)
                || scope.target == NuriTargetV0::Repo(repo_id))
            {
                log_info!(
                    "[orm_backend_update] SKIPPING scope {:?} - does not match repo_id={:?} or overlay={:?}",
                    scope,
                    repo_id,
                    overlay_id
                );
                continue;
            }

            log_info!(
                "[orm_backend_update] PROCESSING scope {:?} - matches criteria",
                scope
            );

            // prepare to apply updates to tracked subjects and record the changes.
            let root_shapes_and_tracked_shapes = subs
                .iter()
                .map(|sub| {
                    (
                        sub.shape_type
                            .schema
                            .get(&sub.shape_type.shape)
                            .unwrap()
                            .clone(),
                        shapes_in_tracked_subjects(&sub.tracked_subjects),
                    )
                })
                .collect::<Vec<_>>();

            scopes.push((scope.clone(), root_shapes_and_tracked_shapes));
        }

        log_debug!(
            "[orm_backend_update], creating patch objects for #scopes {}",
            scopes.len()
        );

        if scopes.is_empty() {
            log_info!("[orm_backend_update] NO SCOPES MATCHED - returning early without patches");
            return;
        }

        for (scope, shapes_zip) in scopes {
            let mut orm_changes: OrmChanges = HashMap::new();

            log_info!(
                "[orm_backend_update] Processing scope {:?} with {} shape types",
                scope,
                shapes_zip.len()
            );

            // Apply the changes to tracked subjects.
            for (root_shape_arc, all_tracked_shapes) in shapes_zip {
                let shape_iri = root_shape_arc.iri.clone();
                log_info!(
                    "[orm_backend_update] Calling process_changes_for_shape_and_session for shape={}, session={}",
                    shape_iri,
                    session_id
                );
                let _ = self.process_changes_for_shape_and_session(
                    &scope,
                    &shape_iri,
                    if all_tracked_shapes.len() > 0 {
                        all_tracked_shapes
                    } else {
                        // If all tracked subjects are empty, wee need to add the root shape manually.
                        vec![root_shape_arc]
                    },
                    session_id,
                    &triple_inserts,
                    &triple_removes,
                    &mut orm_changes,
                    false,
                );
                log_info!(
                    "[orm_backend_update] After process_changes_for_shape_and_session: orm_changes has {} shapes",
                    orm_changes.len()
                );
            }

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

            let subs = self.orm_subscriptions.get_mut(&scope).unwrap();
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

                // Keep track of objects to create: (path, Option<IRI>)
                // The IRI is Some for real subjects, None for intermediate objects (e.g., multi-valued predicate containers)
                let mut objects_to_create: HashSet<(Vec<String>, Option<SubjectIri>)> =
                    HashSet::new();

                // We construct object patches from a change (which is associated with a shape type). {op: add, valType: object, value: Null, path: ...}
                // For each change that has a subject tracked in this subscription,
                //   - Get change operation (calling diff_op_from_pred_change).
                //      - case not object, single --> either add or remove (must be one of each at max)
                //      - case not object, multi  --> just add and or set patch
                //      - case object, multi --> create object patch + nested object patch (will be handled when recursing paths to add primitive values)
                //      - case object, single --> just object patch (will be handled when recursing paths to add primitive values)
                //   - Add patches for each change operation for the path of the change in the schema.
                //     We find the path by traversing the schema up to the parents (add_diff_ops_for_tracked_subject).

                //   TODO: Special edge case: An object with parents changed and the parents' predicate schema has multiple allowed shapes.
                //   Now, there are multiple tracked subjects with the same subject IRI but different shapes of which some
                //   are valid or invalid. The first valid (subject, shape) pair must used for materialization.
                //     - if a higher-priority shape became invalid but a lower priority shape is valid, delete and new add.
                //     - if a higher-priority shape became valid, delete and add new valid.
                //   Problem: We might not have the triples present to materialize the newly valid object so we need to fetch them.

                // Process changes for this subscription
                // Iterate over all changes and create patches
                log_info!(
                    "[orm_backend_update] Iterating over {} shapes in orm_changes",
                    orm_changes.len()
                );

                for (shape_iri, subject_changes) in &orm_changes {
                    log_info!(
                        "[orm_backend_update] Processing shape {}: {} subject changes",
                        shape_iri,
                        subject_changes.len()
                    );

                    for (subject_iri, change) in subject_changes {
                        log_debug!(
                            "Patch creating for subject change x shape {} x {}. #changed preds: {}",
                            subject_iri,
                            shape_iri,
                            change.predicates.len()
                        );
                        // Get the tracked subject for this (subject, shape) pair
                        let Some(tracked_subject) = sub
                            .tracked_subjects
                            .get(subject_iri)
                            .and_then(|shapes| shapes.get(shape_iri))
                            .map(|ts| ts.read().unwrap())
                        else {
                            // We might not be tracking this subject x shape combination. Then, there is nothing to do.
                            log_info!(
                                "[orm_backend_update] SKIPPING subject {} x shape {} - not tracked in this subscription",
                                subject_iri,
                                shape_iri
                            );
                            continue;
                        };

                        log_debug!(
                            "  - Validity check: prev_valid={:?}, valid={:?}",
                            change.prev_valid,
                            tracked_subject.valid
                        );

                        // Now we have the tracked predicate (containing the shape) and the change.
                        // Check validity changes
                        if change.prev_valid == OrmTrackedSubjectValidity::Invalid
                            && tracked_subject.valid == OrmTrackedSubjectValidity::Invalid
                        {
                            // Is the subject invalid and was it before? There is nothing we need to inform about.
                            log_info!(
                                "[orm_backend_update] SKIPPING subject {} - was and still is Invalid",
                                subject_iri
                            );
                            continue;
                        } else if change.prev_valid == OrmTrackedSubjectValidity::Valid
                            && tracked_subject.valid != OrmTrackedSubjectValidity::Valid
                        {
                            log_info!(
                                "[orm_backend_update] Subject {} became invalid or untracked (prev={:?}, now={:?})",
                                subject_iri,
                                change.prev_valid,
                                tracked_subject.valid
                            );

                            // Has the subject become invalid or untracked?
                            // Check if any parent is also being deleted - if so, skip this deletion patch
                            // because the parent deletion will implicitly delete the children
                            let has_parent_being_deleted =
                                tracked_subject.parents.values().any(|parent_arc| {
                                    let parent_ts = parent_arc.read().unwrap();
                                    parent_ts.valid == OrmTrackedSubjectValidity::ToDelete
                                });

                            log_info!(
                                "[orm_backend_update] has_parent_being_deleted={}",
                                has_parent_being_deleted
                            );

                            if !has_parent_being_deleted {
                                // We add a patch, deleting the object at its root.
                                // Start with an empty path - the subject IRI will be added in build_path_to_root_and_create_patches
                                let mut path = vec![];

                                build_path_to_root_and_create_patches(
                                    &tracked_subject,
                                    &sub.tracked_subjects,
                                    &sub.shape_type.shape,
                                    &mut path,
                                    (OrmPatchOp::remove, Some(OrmPatchType::object), None, None),
                                    &mut patches,
                                    &mut objects_to_create,
                                    &change.prev_valid,
                                    &orm_changes,
                                    &tracked_subject.subject_iri,
                                );
                            }
                        } else {
                            log_info!(
                                "[orm_backend_update] Subject {} is valid or became valid (prev={:?}, now={:?}), processing {} predicate changes",
                                subject_iri,
                                change.prev_valid,
                                tracked_subject.valid,
                                change.predicates.len()
                            );

                            // The subject is valid or has become valid.
                            // Process each predicate change
                            for (_pred_iri, pred_change) in &change.predicates {
                                log_debug!(
                                    "  - Predicate changes: {}; #Adds: {}; #Removes {}",
                                    _pred_iri,
                                    pred_change.values_added.len(),
                                    pred_change.values_removed.len()
                                );

                                let tracked_predicate =
                                    pred_change.tracked_predicate.read().unwrap();
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
                                    let mut path = vec![pred_name.clone()];

                                    // Start recursion from this tracked subject
                                    build_path_to_root_and_create_patches(
                                        &tracked_subject,
                                        &sub.tracked_subjects,
                                        &sub.shape_type.shape,
                                        &mut path,
                                        diff_op,
                                        &mut patches,
                                        &mut objects_to_create,
                                        &change.prev_valid,
                                        &orm_changes,
                                        &tracked_subject.subject_iri,
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
                // These are patches with {op: add, valType: object, value: Null, path: ...}
                // Sort by path length (shorter first) to ensure parent objects are created before children
                let mut sorted_objects: Vec<_> = objects_to_create.iter().collect();
                sorted_objects.sort_by_key(|(path_segments, _)| path_segments.len());
                let mut object_create_patches = vec![];
                for (path_segments, maybe_iri) in sorted_objects {
                    let escaped_path: Vec<String> = path_segments
                        .iter()
                        .map(|seg| escape_json_pointer(seg))
                        .collect();
                    let json_pointer = format!("/{}", escaped_path.join("/"));

                    // Always create the object itself.
                    object_create_patches.push(OrmPatch {
                        op: OrmPatchOp::add,
                        valType: Some(OrmPatchType::object),
                        path: json_pointer.clone(),
                        value: None,
                    });

                    // If this object has an IRI (it's a real subject), add the id field
                    if let Some(iri) = maybe_iri {
                        object_create_patches.push(OrmPatch {
                            op: OrmPatchOp::add,
                            valType: None,
                            path: format!("{}/@id", json_pointer),
                            value: Some(json!(iri)),
                        });
                    }
                }

                log_info!(
                    "[orm_backend_update] Created {} object_create_patches",
                    object_create_patches.len()
                );

                let total_patches = object_create_patches.len() + patches.len();
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

                // Cleanup (remove tracked subjects to be deleted).
                Verifier::cleanup_tracked_subjects(sub);
            }

            log_info!(
                "[orm_backend_update] Finished processing all subscriptions for scope {:?}",
                scope
            );
        }

        log_info!("[orm_backend_update] COMPLETE - processed all scopes");
    }
}

/// Queue patches for a newly valid tracked subject.
/// This handles creating object patches and id field patches for subjects that have become valid.
fn queue_objects_to_create(
    current_ts: &OrmTrackedSubject,
    tracked_subjects: &HashMap<String, HashMap<String, Arc<RwLock<OrmTrackedSubject>>>>,
    root_shape: &String,
    path: &[String],
    objects_to_create: &mut HashSet<(Vec<String>, Option<SubjectIri>)>,
    orm_changes: &OrmChanges,
    child_iri: &String,
) {
    // Check if we're at a root subject or need to traverse to parents
    if current_ts.parents.is_empty() || current_ts.shape.iri == *root_shape {
        // We are at the root. Insert without the last element (which is the property name).
        objects_to_create.insert((path[..path.len() - 1].to_vec(), Some(child_iri.clone())));
    } else {
        // Not at root: traverse to parents and create object patches along the way
        for (_parent_iri, parent_tracked_subject) in current_ts.parents.iter() {
            let parent_ts = parent_tracked_subject.read().unwrap();

            if let Some(new_path) = build_path_segment_for_parent(current_ts, &parent_ts, path) {
                // Check if the parent's predicate is multi-valued and if no siblings were previously valid
                let should_create_parent_predicate_object =
                    check_should_create_parent_predicate_object(
                        current_ts,
                        &parent_ts,
                        orm_changes,
                    );

                if should_create_parent_predicate_object {
                    // Need to create an intermediate object for the multi-valued predicate
                    // This is the case for Person -> hasAddress -> (object) -> AddressIri -> AddressObject
                    // The intermediate (object) doesn't have an IRI
                    let mut intermediate_path = new_path.clone();
                    intermediate_path.pop(); // Remove the subject IRI that was added for multi predicates
                    objects_to_create.insert((intermediate_path, None));
                }

                // Recurse to the parent first
                queue_objects_to_create(
                    &parent_ts,
                    tracked_subjects,
                    root_shape,
                    &new_path,
                    objects_to_create,
                    orm_changes,
                    child_iri,
                );

                // Register this object for creation with its IRI
                objects_to_create.insert((new_path.clone(), Some(current_ts.subject_iri.clone())));
            }
        }
    }
}

/// Check if we should create an intermediate object for a multi-valued predicate.
/// Returns true if the parent's predicate is multi-valued and no siblings were previously valid.
fn check_should_create_parent_predicate_object(
    tracked_subject: &OrmTrackedSubject,
    parent_ts: &OrmTrackedSubject,
    orm_changes: &OrmChanges,
) -> bool {
    // Find the predicate schema linking parent to this subject
    for pred_arc in &parent_ts.shape.predicates {
        if let Some(tracked_pred) = parent_ts.tracked_predicates.get(&pred_arc.iri) {
            let tp = tracked_pred.read().unwrap();

            // Check if this tracked subject is a child of this predicate
            let is_child = tp.tracked_children.iter().any(|child| {
                let child_read = child.read().unwrap();
                child_read.subject_iri == tracked_subject.subject_iri
            });

            if is_child {
                let is_multi = pred_arc.maxCardinality > 1 || pred_arc.maxCardinality == -1;

                if is_multi {
                    // Check if any siblings were previously valid.
                    // If not, the intermediate object does not exist yet.
                    let any_sibling_was_valid = tp.tracked_children.iter().any(|child| {
                        let child_read = child.read().unwrap();
                        if child_read.subject_iri == tracked_subject.subject_iri {
                            return false;
                        }

                        // Look up the prev_valid from orm_changes
                        let prev_valid = orm_changes
                            .get(&child_read.shape.iri)
                            .and_then(|subjects| subjects.get(&child_read.subject_iri))
                            .map(|change| &change.prev_valid)
                            .unwrap_or(&OrmTrackedSubjectValidity::Valid);

                        *prev_valid == OrmTrackedSubjectValidity::Valid
                    });

                    return !any_sibling_was_valid;
                }

                return false;
            }
        }
    }
    false
}

/// Find the predicate schema linking a parent to a child tracked subject and build the path segment.
/// Returns the updated path if a linking predicate is found.
fn build_path_segment_for_parent(
    tracked_subject: &OrmTrackedSubject,
    parent_ts: &OrmTrackedSubject,
    base_path: &[String],
) -> Option<Vec<String>> {
    // Find the predicate schema linking parent to this tracked subject
    for pred_arc in &parent_ts.shape.predicates {
        // Check if this predicate has our subject as a child
        if let Some(tracked_pred) = parent_ts.tracked_predicates.get(&pred_arc.iri) {
            let tp = tracked_pred.read().unwrap();

            // Check if this tracked subject is in the children
            let is_child = tp.tracked_children.iter().any(|child| {
                let child_read = child.read().unwrap();
                child_read.subject_iri == tracked_subject.subject_iri
            });

            if is_child {
                // Build the path segment
                let mut new_path = base_path.to_vec();

                let is_multi = pred_arc.maxCardinality > 1 || pred_arc.maxCardinality == -1;

                // For multi-valued predicates, add the object IRI as a key first
                if is_multi {
                    new_path.insert(0, tracked_subject.subject_iri.clone());
                }

                // Add the readable predicate name
                new_path.insert(0, pred_arc.readablePredicate.clone());

                return Some(new_path);
            }
        }
    }
    None
}

/// Recursively build the path from a tracked subject to the root and create diff operation patches.
/// The function recurses from child to parents down to a root tracked subject.
/// If multiple parents exist, it adds separate patches for each.
fn build_path_to_root_and_create_patches(
    tracked_subject: &OrmTrackedSubject,
    tracked_subjects: &HashMap<String, HashMap<String, Arc<RwLock<OrmTrackedSubject>>>>,
    root_shape: &String,
    path: &mut Vec<String>,
    diff_op: (
        OrmPatchOp,
        Option<OrmPatchType>,
        Option<Value>,  // The value added / removed
        Option<String>, // The IRI, if change is an added / removed object.
    ),
    patches: &mut Vec<OrmPatch>,
    objects_to_create: &mut HashSet<(Vec<String>, Option<SubjectIri>)>,
    prev_valid: &OrmTrackedSubjectValidity,
    orm_changes: &OrmChanges,
    child_iri: &String,
) {
    log_debug!(
        "  - build path, ts: {}, path {:?}, #parents: {}, shape: {}",
        tracked_subject.subject_iri,
        path,
        tracked_subject.parents.len(),
        tracked_subject.shape.iri
    );
    // If the tracked subject is not valid, we don't create patches for it
    // EXCEPT when we're removing the object itself (indicated by op == remove and valType == object)
    let is_delete_op = diff_op.0 == OrmPatchOp::remove && diff_op.1 == Some(OrmPatchType::object);
    if tracked_subject.valid != OrmTrackedSubjectValidity::Valid && !is_delete_op {
        return;
    }

    // If this subject has no parents or its shape matches the root shape, we've reached the root
    if tracked_subject.parents.is_empty() || tracked_subject.shape.iri == *root_shape {
        // Build the final JSON Pointer path
        let escaped_path: Vec<String> = path.iter().map(|seg| escape_json_pointer(seg)).collect();

        // Create the JSON pointer path
        let json_pointer = if escaped_path.is_empty() {
            // For root object operations (no path elements), just use the subject IRI
            format!("/{}", escape_json_pointer(&tracked_subject.subject_iri))
        } else {
            // For nested operations, include both subject and path
            format!(
                "/{}/{}",
                escape_json_pointer(&tracked_subject.subject_iri),
                escaped_path.join("/")
            )
        };

        // Create the patch for the actual value change
        patches.push(OrmPatch {
            op: diff_op.0.clone(),
            valType: diff_op.1.clone(),
            path: json_pointer.clone(),
            value: diff_op.2.clone(),
        });

        // If the subject is newly valid, now we have the full path to queue its creation.
        if *prev_valid != OrmTrackedSubjectValidity::Valid {
            let mut final_path = vec![tracked_subject.subject_iri.clone()];
            final_path.extend_from_slice(path);
            queue_objects_to_create(
                tracked_subject,
                tracked_subjects,
                root_shape,
                &final_path,
                objects_to_create,
                orm_changes,
                child_iri,
            );
        }

        return;
    }

    // Recurse to parents
    for (_parent_iri, parent_tracked_subject) in tracked_subject.parents.iter() {
        let parent_ts = parent_tracked_subject.read().unwrap();

        // Build the path segment for this parent
        if let Some(mut new_path) = build_path_segment_for_parent(tracked_subject, &parent_ts, path)
        {
            // Recurse to the parent
            build_path_to_root_and_create_patches(
                &parent_ts,
                tracked_subjects,
                root_shape,
                &mut new_path,
                diff_op.clone(),
                patches,
                objects_to_create,
                prev_valid,
                orm_changes,
                child_iri,
            );
        } else {
            log_debug!(
                "  - build_path_segment_for_parent returned None for parent: {}, child: {}",
                parent_ts.subject_iri,
                tracked_subject.subject_iri
            );
        }
    }
}

/// Create diff operations from a predicate change.
/// Returns a list of (op_type, value_type, value, iri) tuples.
fn create_diff_ops_from_predicate_change(
    pred_change: &OrmTrackedPredicateChanges,
) -> Vec<(
    OrmPatchOp,
    Option<OrmPatchType>,
    Option<Value>,  // The value added / removed
    Option<String>, // The IRI, if change is an added / removed object.
)> {
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
            return [(
                OrmPatchOp::add,
                None,
                Some(json!(pred_change.values_added[0])),
                None,
            )]
            .to_vec();
        } else {
            // Since there is only one possible value, removing the path is enough.
            return [(OrmPatchOp::remove, None, None, None)].to_vec();
        }
    } else if is_multi && !is_object {
        if pred_change.values_added.len() > 0 {
            ops.push((
                OrmPatchOp::add,
                Some(OrmPatchType::set),
                Some(json!(pred_change.values_added)),
                None,
            ));
        }
        if pred_change.values_removed.len() > 0 {
            ops.push((
                OrmPatchOp::remove,
                Some(OrmPatchType::set),
                Some(json!(pred_change.values_removed)),
                None,
            ));
        }
        return ops;
    }
    //  else if !is_multi && is_object {
    //     if pred_change.values_added.len() > 0 {
    //         ops.push((OrmDiffOpType::add, Some(OrmDiffType::object), None, None));
    //     } else if pred_change.values_removed.len() > 0 {
    //         ops.push((OrmDiffOpType::remove, Some(OrmDiffType::object), None, None));
    //     }
    // } else if is_multi && is_object {
    //     for val_added in pred_change.values_added.iter() {
    //         let iri = match val_added {
    //             BasicType::Str(s) => s,
    //             _ => {
    //                 continue;
    //             }
    //         };
    //         ops.push((
    //             OrmDiffOpType::add,
    //             Some(OrmDiffType::object),
    //             None,
    //             Some(iri.clone()),
    //         ));
    //     }
    //     for val_removed in pred_change.values_added.iter() {
    //         let iri = match val_removed {
    //             BasicType::Str(s) => s,
    //             _ => {
    //                 continue;
    //             }
    //         };
    //         ops.push((
    //             OrmDiffOpType::remove,
    //             Some(OrmDiffType::object),
    //             None,
    //             Some(iri.clone()),
    //         ));
    //     }
    // }
    return ops;
}

fn shapes_in_tracked_subjects(
    tracked_subjects: &HashMap<String, HashMap<String, Arc<RwLock<OrmTrackedSubject>>>>,
) -> Vec<Arc<OrmSchemaShape>> {
    let mut shapes = vec![];
    for (_subject_iri, tss) in tracked_subjects.iter() {
        for (_shape_iri, ts) in tss.iter() {
            shapes.push(ts.read().unwrap().shape.clone());
        }
    }
    shapes
}
