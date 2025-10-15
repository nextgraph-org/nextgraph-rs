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
pub use ng_net::orm::{OrmDiff, OrmShapeType};
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

        // let mut updates = Vec::new();

        let mut scopes = vec![];
        for (scope, subs) in self.orm_subscriptions.iter_mut() {
            // Remove old subscriptions
            subs.retain(|sub| !sub.sender.is_closed());

            if !(scope.target == NuriTargetV0::UserSite
                || scope
                    .overlay
                    .as_ref()
                    .map_or(false, |ol| overlaylink == *ol)
                || scope.target == NuriTargetV0::Repo(repo_id))
            {
                continue;
            }

            // prepare to apply updates to tracked subjects and record the changes.
            let root_shapes = subs
                .iter()
                .map(|sub| {
                    sub.shape_type
                        .schema
                        .get(&sub.shape_type.shape)
                        .unwrap()
                        .clone()
                })
                .collect::<Vec<_>>();

            scopes.push((scope.clone(), root_shapes));
        }

        log_debug!(
            "[orm_backend_update], creating patch objects for scopes:\n{}",
            scopes.len()
        );
        for (scope, shapes) in scopes {
            let mut orm_changes: OrmChanges = HashMap::new();

            // Apply the changes to tracked subjects.
            for shape_arc in shapes {
                let _ = self.process_changes_for_shape_and_session(
                    &scope,
                    shape_arc,
                    session_id,
                    &triple_inserts,
                    &triple_removes,
                    &mut orm_changes,
                    false,
                );
            }

            let subs = self.orm_subscriptions.get(&scope).unwrap();
            for sub in subs.iter() {
                log_debug!(
                    "Applying changes to subscription with nuri {} and shape {}",
                    sub.nuri.repo(),
                    sub.shape_type.shape
                );

                // The JSON patches to send to JS land.
                let mut patches: Vec<OrmDiffOp> = vec![];

                // Keep track of created objects by path and if they need an id.
                // Later we created patches from them to ensure the objects exist.
                let mut paths_of_objects_to_create: HashSet<(Vec<String>, Option<SubjectIri>)> =
                    HashSet::new();

                // Function to create diff objects from a given change.
                // The function recurses from child to parents down to a root tracked subject.
                // If multiple parents exist, it adds separate patches for each.
                fn add_diff_ops_for_tracked_subject(
                    tracked_subject: &OrmTrackedSubject,
                    tracked_subjects: &HashMap<
                        String,
                        HashMap<String, Arc<RwLock<OrmTrackedSubject>>>,
                    >,
                    root_shape: &String,
                    path: &mut Vec<String>,
                    diff_op: (
                        OrmDiffOpType,
                        Option<OrmDiffType>,
                        Option<Value>,  // The value added / removed
                        Option<String>, // The IRI, if change is an added / removed object.
                    ),
                    patches: &mut Vec<OrmDiffOp>,
                    paths_of_objects_to_create: &mut HashSet<(Vec<String>, Option<SubjectIri>)>,
                ) {
                    // If this subject has no parents or its shape matches the root shape, we've reached the root
                    if tracked_subject.parents.is_empty()
                        || tracked_subject.shape.iri == *root_shape
                    {
                        // Build the final JSON Pointer path
                        let escaped_path: Vec<String> =
                            path.iter().map(|seg| escape_json_pointer(seg)).collect();
                        let json_pointer = format!("/{}", escaped_path.join("/"));

                        // Create the patch
                        let patch = OrmDiffOp {
                            op: diff_op.0.clone(),
                            valType: diff_op.1.clone(),
                            path: json_pointer,
                            value: diff_op.2.clone(),
                        };
                        patches.push(patch);

                        return;
                    }

                    // Recurse to parents
                    for (parent_iri, parent_tracked_subject) in tracked_subject.parents.iter() {
                        // Get predicate schema linking parent with tracked_subject

                        // Use predicate schema readable_predicate to add to path.
                        // If predicate schema is multi, add our own subject iri to path first.

                        // If parent is root, we don't need to recurse.
                        // Instead we add new patches based on the path (we need to escape segments before)
                        // and the diff_op content

                        let parent_ts = parent_tracked_subject.read().unwrap();

                        // Find the predicate schema linking parent to this tracked subject
                        for pred_arc in &parent_ts.shape.predicates {
                            // Check if this predicate has our subject as a child
                            if let Some(tracked_pred) =
                                parent_ts.tracked_predicates.get(&pred_arc.iri)
                            {
                                let tp = tracked_pred.read().unwrap();

                                // Check if this tracked subject is in the children
                                let is_child = tp.tracked_children.iter().any(|child| {
                                    let child_read = child.read().unwrap();
                                    child_read.subject_iri == tracked_subject.subject_iri
                                });

                                if is_child {
                                    // Build the path segment
                                    let mut new_path = path.clone();

                                    let is_multi = pred_arc.maxCardinality > 1
                                        || pred_arc.maxCardinality == -1;

                                    // For multi-valued predicates, add the object IRI as a key first
                                    if is_multi {
                                        new_path.insert(0, tracked_subject.subject_iri.clone());
                                    }

                                    // Add the readable predicate name
                                    new_path.insert(0, pred_arc.readablePredicate.clone());

                                    // Recurse to the parent
                                    add_diff_ops_for_tracked_subject(
                                        &parent_ts,
                                        tracked_subjects,
                                        root_shape,
                                        &mut new_path,
                                        diff_op.clone(),
                                        patches,
                                        paths_of_objects_to_create,
                                    );

                                    break;
                                }
                            }
                        }
                    }
                }

                fn diff_op_from_pred_change(
                    pred_change: &OrmTrackedPredicateChanges,
                ) -> Vec<(
                    OrmDiffOpType,
                    Option<OrmDiffType>,
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

                    if !is_multi && !is_object {
                        if pred_change.values_added.len() == 1 {
                            // A value was added. Another one might have been removed
                            // but the add patch overwrite previous values.
                            return [(
                                OrmDiffOpType::add,
                                None,
                                Some(json!(pred_change.values_added[0])),
                                None,
                            )]
                            .to_vec();
                        } else {
                            // Since there is only one possible value, removing the path is enough.
                            return [(OrmDiffOpType::remove, None, None, None)].to_vec();
                        }
                    } else if is_multi && !is_object {
                        let mut ops = vec![];
                        if pred_change.values_added.len() > 0 {
                            ops.push((
                                OrmDiffOpType::add,
                                Some(OrmDiffType::set),
                                Some(json!(pred_change.values_added)),
                                None,
                            ));
                        }
                        if pred_change.values_removed.len() > 0 {
                            ops.push((
                                OrmDiffOpType::remove,
                                Some(OrmDiffType::set),
                                Some(json!(pred_change.values_removed)),
                                None,
                            ));
                        }
                        return ops;
                    }
                    // objects are not handled here because objects to create
                    // are registered during path traversal.
                    return vec![];
                }

                // Helper function to determine the highest-priority valid shape for a subject
                // given the allowed shapes in a predicate's dataTypes.
                // Returns (current_valid_shape, previous_valid_shape)
                #[allow(dead_code)]
                fn get_highest_priority_valid_shapes(
                    subject_iri: &SubjectIri,
                    allowed_shapes: &[OrmSchemaDataType], // From predicate.dataTypes (in priority order)
                    tracked_subjects: &HashMap<
                        String,
                        HashMap<String, Arc<RwLock<OrmTrackedSubject>>>,
                    >,
                ) -> (Option<String>, Option<String>) {
                    let Some(shapes_for_subject) = tracked_subjects.get(subject_iri) else {
                        return (None, None);
                    };

                    // Find current highest-priority valid shape
                    let current_valid = allowed_shapes
                        .iter()
                        .filter_map(|dt| dt.shape.as_ref())
                        .find_map(|shape_iri| {
                            shapes_for_subject.get(shape_iri).and_then(|ts| {
                                let tracked = ts.read().unwrap();
                                if tracked.valid == OrmTrackedSubjectValidity::Valid {
                                    Some(shape_iri.clone())
                                } else {
                                    None
                                }
                            })
                        });

                    // Find previous highest-priority valid shape
                    let previous_valid = allowed_shapes
                        .iter()
                        .filter_map(|dt| dt.shape.as_ref())
                        .find_map(|shape_iri| {
                            shapes_for_subject.get(shape_iri).and_then(|ts| {
                                let tracked = ts.read().unwrap();
                                if tracked.prev_valid == OrmTrackedSubjectValidity::Valid {
                                    Some(shape_iri.clone())
                                } else {
                                    None
                                }
                            })
                        });

                    (current_valid, previous_valid)
                }

                // Helper function to handle validity changes when highest-priority shape changes
                #[allow(dead_code)]
                fn handle_shape_priority_change(
                    subject_iri: &SubjectIri,
                    shape_iri: &ShapeIri,
                    tracked_subjects: &HashMap<
                        String,
                        HashMap<String, Arc<RwLock<OrmTrackedSubject>>>,
                    >,
                    root_shape: &String,
                    orm_changes: &OrmChanges,
                    patches: &mut Vec<OrmDiffOp>,
                    paths_of_objects_to_create: &mut HashSet<(Vec<String>, Option<SubjectIri>)>,
                ) {
                    // Step 1: Check if this subject has multiple tracked shapes
                    let Some(shapes_for_subject) = tracked_subjects.get(subject_iri) else {
                        return;
                    };

                    if shapes_for_subject.len() <= 1 {
                        // Only one shape, no priority conflict possible
                        return;
                    }

                    // Step 2: Get the current tracked subject
                    let Some(tracked_subject_arc) = shapes_for_subject.get(shape_iri) else {
                        return;
                    };
                    let tracked_subject = tracked_subject_arc.read().unwrap();

                    // Step 3: For each parent, check if the highest-priority valid shape changed
                    for (parent_iri, parent_tracked_subject_arc) in tracked_subject.parents.iter() {
                        let parent_ts = parent_tracked_subject_arc.read().unwrap();

                        // Find the predicate linking parent to this subject
                        for pred_arc in &parent_ts.shape.predicates {
                            if let Some(tracked_pred) =
                                parent_ts.tracked_predicates.get(&pred_arc.iri)
                            {
                                let tp = tracked_pred.read().unwrap();

                                // Check if this tracked subject is a child of this predicate
                                let is_child = tp.tracked_children.iter().any(|child| {
                                    let child_read = child.read().unwrap();
                                    child_read.subject_iri == *subject_iri
                                });

                                if !is_child {
                                    continue;
                                }

                                // Get the allowed shapes for this predicate (in priority order)
                                let allowed_shapes: Vec<_> = pred_arc
                                    .dataTypes
                                    .iter()
                                    .filter(|dt| dt.shape.is_some())
                                    .collect();

                                if allowed_shapes.len() <= 1 {
                                    // No priority conflict possible with single shape
                                    continue;
                                }

                                // Determine current and previous highest-priority valid shapes
                                let (current_valid, previous_valid) =
                                    get_highest_priority_valid_shapes(
                                        subject_iri,
                                        &pred_arc.dataTypes,
                                        tracked_subjects,
                                    );

                                // Step 4: Create patches based on what changed
                                if current_valid != previous_valid {
                                    let is_multi = pred_arc.maxCardinality > 1
                                        || pred_arc.maxCardinality == -1;

                                    // Case A: Shape switch (ShapeA -> ShapeB)
                                    if let (Some(new_shape), Some(old_shape)) =
                                        (&current_valid, &previous_valid)
                                    {
                                        // Remove the old object
                                        if let Some(old_ts) = shapes_for_subject.get(old_shape) {
                                            let old_tracked = old_ts.read().unwrap();
                                            let mut path = vec![];
                                            let diff_op = (
                                                OrmDiffOpType::remove,
                                                Some(OrmDiffType::object),
                                                None,
                                                Some(subject_iri.clone()),
                                            );

                                            add_diff_ops_for_tracked_subject(
                                                &old_tracked,
                                                tracked_subjects,
                                                root_shape,
                                                &mut path,
                                                diff_op,
                                                patches,
                                                paths_of_objects_to_create,
                                            );
                                        }

                                        // Add the new object (need to materialize it)
                                        if let Some(new_ts) = shapes_for_subject.get(new_shape) {
                                            let new_tracked = new_ts.read().unwrap();

                                            // TODO: Materialize the object with current triples
                                            // This requires access to the change data or re-querying
                                            // For now, we'll just create an object placeholder patch
                                            let mut path = vec![];
                                            let diff_op = (
                                                OrmDiffOpType::add,
                                                Some(OrmDiffType::object),
                                                Some(Value::Null),
                                                Some(subject_iri.clone()),
                                            );

                                            add_diff_ops_for_tracked_subject(
                                                &new_tracked,
                                                tracked_subjects,
                                                root_shape,
                                                &mut path,
                                                diff_op,
                                                patches,
                                                paths_of_objects_to_create,
                                            );
                                        }
                                    }
                                    // Case B: Object became valid (None -> ShapeX)
                                    else if let (Some(new_shape), None) =
                                        (&current_valid, &previous_valid)
                                    {
                                        if let Some(new_ts) = shapes_for_subject.get(new_shape) {
                                            let new_tracked = new_ts.read().unwrap();
                                            let mut path = vec![];
                                            let diff_op = (
                                                OrmDiffOpType::add,
                                                Some(OrmDiffType::object),
                                                Some(Value::Null),
                                                Some(subject_iri.clone()),
                                            );

                                            add_diff_ops_for_tracked_subject(
                                                &new_tracked,
                                                tracked_subjects,
                                                root_shape,
                                                &mut path,
                                                diff_op,
                                                patches,
                                                paths_of_objects_to_create,
                                            );
                                        }
                                    }
                                    // Case C: Object became invalid (ShapeX -> None)
                                    else if let (None, Some(old_shape)) =
                                        (&current_valid, &previous_valid)
                                    {
                                        if let Some(old_ts) = shapes_for_subject.get(old_shape) {
                                            let old_tracked = old_ts.read().unwrap();
                                            let mut path = vec![];
                                            let diff_op = (
                                                OrmDiffOpType::remove,
                                                Some(OrmDiffType::object),
                                                None,
                                                Some(subject_iri.clone()),
                                            );

                                            add_diff_ops_for_tracked_subject(
                                                &old_tracked,
                                                tracked_subjects,
                                                root_shape,
                                                &mut path,
                                                diff_op,
                                                patches,
                                                paths_of_objects_to_create,
                                            );
                                        }
                                    }
                                }

                                break; // Found the predicate, no need to check others
                            }
                        }
                    }
                }

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
                // Iterate through all changes and create patches
                for (shape_iri, subject_changes) in &orm_changes {
                    for (subject_iri, change) in subject_changes {
                        // Get the tracked subject for this (subject, shape) pair
                        let tracked_subject_opt = sub
                            .tracked_subjects
                            .get(subject_iri)
                            .and_then(|shapes| shapes.get(shape_iri))
                            .map(|ts| ts.read().unwrap());

                        let Some(tracked_subject) = tracked_subject_opt else {
                            continue;
                        };

                        // Process each predicate change
                        for (pred_iri, pred_change) in &change.predicates {
                            let tracked_predicate = pred_change.tracked_predicate.read().unwrap();
                            let pred_name = tracked_predicate.schema.readablePredicate.clone();
                            // Check validity changes
                            if tracked_subject.prev_valid == OrmTrackedSubjectValidity::Invalid
                                && tracked_subject.valid == OrmTrackedSubjectValidity::Invalid
                            {
                                // Is the subject invalid and was it before? There is nothing we need to inform about.
                                return;
                            } else if tracked_subject.prev_valid == OrmTrackedSubjectValidity::Valid
                                && tracked_subject.valid == OrmTrackedSubjectValidity::Invalid
                                || tracked_subject.valid == OrmTrackedSubjectValidity::Untracked
                            {
                                // Has the subject become invalid or untracked?
                                // We add a patch, deleting the object at its root.
                                let mut path: Vec<String> =
                                    vec![subject_iri.clone(), pred_name.clone()];
                                add_diff_ops_for_tracked_subject(
                                    &tracked_subject,
                                    &sub.tracked_subjects,
                                    &sub.shape_type.shape,
                                    &mut path,
                                    (OrmDiffOpType::remove, Some(OrmDiffType::object), None, None),
                                    &mut patches,
                                    &mut paths_of_objects_to_create,
                                );
                            } else {
                                // The subject is valid or has become valid.

                                // Get the diff operations for this predicate change
                                let diff_ops = diff_op_from_pred_change(pred_change);

                                // For each diff operation, traverse up to the root to build the path
                                for diff_op in diff_ops {
                                    let mut path = vec![subject_iri.clone(), pred_name.clone()];

                                    // Start recursion from this tracked subject
                                    add_diff_ops_for_tracked_subject(
                                        &tracked_subject,
                                        &sub.tracked_subjects,
                                        &sub.shape_type.shape,
                                        &mut path,
                                        diff_op,
                                        &mut patches,
                                        &mut paths_of_objects_to_create,
                                    );
                                }
                            }
                        }
                    }
                }

                // Create patches for objects that need to be created
                // These are patches with {op: add, valType: object, value: Null, path: ...}
                // Sort by path length (shorter first) to ensure parent objects are created before children
                let mut sorted_object_paths: Vec<_> = paths_of_objects_to_create.iter().collect();
                sorted_object_paths.sort_by_key(|(path_segments, _)| path_segments.len());

                for (path_segments, maybe_iri) in sorted_object_paths {
                    let escaped_path: Vec<String> = path_segments
                        .iter()
                        .map(|seg| escape_json_pointer(seg))
                        .collect();
                    let json_pointer = format!("/{}", escaped_path.join("/"));

                    patches.push(OrmDiffOp {
                        op: OrmDiffOpType::add,
                        valType: Some(OrmDiffType::object),
                        path: json_pointer.clone(),
                        value: None,
                    });
                    if let Some(iri) = maybe_iri {
                        patches.push(OrmDiffOp {
                            op: OrmDiffOpType::add,
                            valType: Some(OrmDiffType::object),
                            path: format!("{}/id", json_pointer),
                            value: Some(json!(iri)),
                        });
                    }
                }

                // Send response with patches.
                let _ = sub
                    .sender
                    .clone()
                    .send(AppResponse::V0(AppResponseV0::OrmUpdate(patches.to_vec())))
                    .await;
            }
        }
    }
}
