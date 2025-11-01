// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use futures::channel::mpsc::UnboundedSender;
use ng_repo::errors::VerifierError;

use std::collections::HashMap;
use std::collections::HashSet;
use std::sync::Arc;
use std::sync::RwLock;
use std::u64;

pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_net::{app_protocol::*, orm::*};
use ng_oxigraph::oxrdf::Quad;
use ng_repo::errors::NgError;
use ng_repo::log::*;

use crate::orm::add_remove_quads::apply_quads_for_subject;
use crate::orm::query::shape_type_to_sparql_select;
use crate::orm::shape_validation::NeedEvalSelf;
use crate::orm::types::*;
use crate::orm::utils::*;
use crate::orm::OrmChanges;
use crate::verifier::*;

impl Verifier {
    /// Apply quads to a nuri's document.
    /// Updates tracked_orm_objects in orm_subscriptions.
    pub(crate) fn apply_quads_changes(
        &mut self,
        quads_added: &[Quad],
        quads_removed: &[Quad],
        nuri: &NuriV0,
        only_for_session_id: Option<u64>,
        data_already_fetched: bool,
    ) -> Result<OrmChanges, NgError> {
        log_debug!("apply_quad_changes {:?}", only_for_session_id);
        // If we have a specific session, handle only that subscription.
        if let Some(session_id) = only_for_session_id {
            return self.process_changes_for_nuri_and_session(
                &nuri.clone(),
                session_id,
                quads_added,
                quads_removed,
                data_already_fetched,
            );
        }

        // Otherwise, iterate all sessions.
        let mut merged: OrmChanges = HashMap::new();

        let session_ids: Vec<_> = self
            .orm_subscriptions
            .get(&nuri_to_string(nuri))
            .unwrap()
            .iter()
            .map(|s| s.session_id.clone())
            .collect();

        for session_id in session_ids {
            let changes = self.process_changes_for_nuri_and_session(
                &nuri,
                session_id,
                quads_added,
                quads_removed,
                data_already_fetched,
            )?;

            for (shape_iri, subj_map) in changes {
                merged
                    .entry(shape_iri)
                    .or_insert_with(HashMap::new)
                    .extend(subj_map);
            }
        }
        Ok(merged)
    }

    /// Link a tracked orm object to all orm objects that reference this object's subject IRI.
    /// This establishes parent-child relationships based on tracked_nested_subjects.
    fn link_to_tracking_parents(
        orm_subscription: &mut OrmSubscription,
        orm_changes: &mut OrmChanges,
        child_arc: &Arc<RwLock<TrackedOrmObject>>,
    ) {
        let (child_graph_iri, child_subject_iri, child_shape_iri) = {
            let r = child_arc.read().unwrap();
            (
                r.graph_iri.clone(),
                r.subject_iri.clone(),
                r.shape.iri.clone(),
            )
        };

        // Check if this subject is in tracked_nested_subjects
        if let Some(tracking_subject) = orm_subscription
            .tracked_nested_subjects
            .get(&child_subject_iri)
        {
            if let Some(tracking_tormos) = tracking_subject.get(&child_shape_iri) {
                // Clone parent arcs to avoid borrowing orm_subscription during mutation
                let parents: Vec<Arc<RwLock<TrackedOrmObject>>> = tracking_tormos.clone();
                for parent_arc in parents.iter() {
                    // Snapshot parent identifiers and shape
                    let (parent_graph_iri, parent_subject_iri, parent_shape_arc) = {
                        let parent_r = parent_arc.read().unwrap();
                        (
                            parent_r.graph_iri.clone(),
                            parent_r.subject_iri.clone(),
                            parent_r.shape.clone(),
                        )
                    };

                    // Ensure a change exists for the parent (to hold predicate changes)
                    let (parent_change, _parent_change_new) = Self::ensure_change_for_subject(
                        orm_subscription,
                        orm_changes,
                        &parent_shape_arc,
                        &parent_graph_iri,
                        &parent_subject_iri,
                    );

                    // For each predicate on the parent shape that targets the child's shape
                    for pred_schema in parent_shape_arc.predicates.iter() {
                        let targets_child_shape = pred_schema.dataTypes.iter().any(|dt| {
                            if let Some(ref pred_child_shape_iri) = dt.shape {
                                *pred_child_shape_iri == child_shape_iri
                            } else {
                                false
                            }
                        });
                        if !targets_child_shape {
                            continue;
                        }

                        // Ensure the parent's tracked_predicate exists for this predicate
                        let pred_iri = pred_schema.iri.clone();
                        let parent_obj_arc = parent_change.tracked_orm_object.clone();
                        let tracked_pred_arc = {
                            let mut parent_w = parent_obj_arc.write().unwrap();
                            if let Some(tp_arc) =
                                parent_w.tracked_predicates.get(&pred_iri).cloned()
                            {
                                tp_arc
                            } else {
                                let tp_arc = Arc::new(RwLock::new(TrackedOrmPredicate {
                                    schema: pred_schema.clone(),
                                    tracked_children: Vec::new(),
                                    current_cardinality: 0,
                                    current_literals: None,
                                }));
                                parent_w
                                    .tracked_predicates
                                    .insert(pred_iri.clone(), tp_arc.clone());
                                tp_arc
                            }
                        };

                        // Ensure a TrackedOrmPredicateChanges exists in the parent's change for this predicate
                        if !parent_change.predicates.contains_key(&pred_iri) {
                            parent_change.predicates.insert(
                                pred_iri.clone(),
                                TrackedOrmPredicateChanges {
                                    tracked_predicate: tracked_pred_arc.clone(),
                                    values_added: Vec::new(),
                                    values_removed: Vec::new(),
                                },
                            );
                        }
                        let pred_change = parent_change.predicates.get_mut(&pred_iri).unwrap();

                        // Finally, perform the bidirectional link

                        Self::link_parent_and_child(
                            parent_arc,
                            child_arc,
                            pred_change,
                            &child_graph_iri,
                            &child_subject_iri,
                            &child_shape_iri,
                        );
                    }
                }
            }
        }
    }

    /// Link a parent and child tracked orm object bidirectionally.
    /// Adds child to parent's tracked_children if not already present.
    /// Adds parent to child's parents if not already present.
    fn link_parent_and_child(
        parent_arc: &Arc<RwLock<TrackedOrmObject>>,
        child_arc: &Arc<RwLock<TrackedOrmObject>>,
        pred_change: &mut TrackedOrmPredicateChanges,
        child_graph: &str,
        child_subject: &str,
        target_shape_iri: &str,
    ) {
        let (parent_graph, parent_subject) = {
            let parent_r = parent_arc.read().unwrap();
            (parent_r.graph_iri.clone(), parent_r.subject_iri.clone())
        };

        // Add child to parent's tracked_children
        {
            let mut tp = pred_change.tracked_predicate.write().unwrap();
            let already = tp.tracked_children.iter().any(|c| {
                let cr = c.read().unwrap();
                cr.subject_iri == child_subject
                    && cr.graph_iri == child_graph
                    && cr.shape.iri == target_shape_iri
            });
            if !already {
                tp.tracked_children.push(child_arc.clone());
            }
        }

        // Ensure back-link in child.parents
        {
            let mut child_w = child_arc.write().unwrap();
            let has_parent = child_w.parents.iter().any(|p| {
                let pr = p.read().unwrap();
                pr.subject_iri == parent_subject && pr.graph_iri == parent_graph
            });
            if !has_parent {
                child_w.parents.push(parent_arc.clone());
            }
        }
    }

    /// Ensures a change object exists for (shape, graph, subject) and returns a mutable reference to it.
    fn ensure_change_for_subject<'a>(
        orm_subscription: &mut OrmSubscription,
        orm_changes: &'a mut OrmChanges,
        shape: &Arc<OrmSchemaShape>,
        graph_iri: &str,
        subject_iri: &str,
    ) -> (&'a mut TrackedOrmObjectChange, bool) {
        let mut change_newly_created = false;

        let change = orm_changes
            .entry(shape.iri.clone())
            .or_insert_with(HashMap::new)
            .entry(graph_iri.to_string())
            .or_insert_with(HashMap::new)
            .entry(subject_iri.to_string())
            .or_insert_with(|| {
                change_newly_created = true;
                // Create a new change record including previous validity
                log_info!("[process_changes_for_shape_and_session] Creating change object.");

                let prev_valid = orm_subscription
                    .get_tracked_orm_object(graph_iri, subject_iri, &shape.iri)
                    .map(|ts| ts.read().unwrap().valid.clone())
                    .unwrap_or(TrackedOrmObjectValidity::Pending);

                let tracked_obj = orm_subscription.get_or_create_tracked_orm_object(
                    graph_iri,
                    subject_iri,
                    shape,
                );

                TrackedOrmObjectChange {
                    tracked_orm_object: tracked_obj,
                    predicates: HashMap::new(),
                    is_validated: false,
                    prev_valid,
                }
            });

        return (change, change_newly_created);
    }

    /// Ensure parent<->child links exist for newly added shape references on this subject.
    /// Returns a map of child shape -> child subject to be merged into the children queue.
    fn reconcile_links_for_subject_additions(
        orm_subscription: &mut OrmSubscription,
        change: &mut TrackedOrmObjectChange,
        added_by_graph_and_subject: &HashMap<(String, String), Vec<&Quad>>,
        removed_by_graph_and_subject: &HashMap<(String, String), Vec<&Quad>>,
    ) -> HashMap<ShapeIri, Vec<SubjectIri>> {
        let mut children_to_queue: HashMap<ShapeIri, Vec<SubjectIri>> = HashMap::new();

        // Parent identifiers
        let (parent_graph, parent_subject, _parent_shape_iri, parent_arc) = {
            let parent_r = change.tracked_orm_object.read().unwrap();
            (
                parent_r.graph_iri.clone(),
                parent_r.subject_iri.clone(),
                parent_r.shape.iri.clone(),
                change.tracked_orm_object.clone(),
            )
        };

        for pred_change in change.predicates.values_mut() {
            let pred_schema = pred_change.tracked_predicate.read().unwrap().schema.clone();
            // Only consider predicates whose dataTypes include shapes
            let target_shape_iri_opt = pred_schema
                .dataTypes
                .iter()
                .find(|dt| dt.valType == OrmSchemaValType::shape)
                .and_then(|dt| dt.shape.clone());
            let Some(ref target_shape_iri) = target_shape_iri_opt else {
                continue;
            };

            // Iterate added values for object IRIs
            for added_val in pred_change.values_added.clone() {
                let child_subject = match added_val {
                    BasicType::Str(s) => s,
                    _ => continue,
                };

                // For all cases: Add to orm_subscription.tracked_nested_subjects
                let nested_entry = orm_subscription
                    .tracked_nested_subjects
                    .entry(child_subject.clone())
                    .or_insert_with(HashMap::new);

                // For this shape, get or insert the Vec of parent_arcs
                let parents_vec = nested_entry
                    .entry(target_shape_iri.clone())
                    .or_insert_with(Vec::new);

                // Add parent_arc if not already present
                let already = parents_vec.iter().any(|p| {
                    let pr = p.read().unwrap();
                    pr.subject_iri == parent_subject && pr.graph_iri == parent_graph
                });
                if !already {
                    parents_vec.push(parent_arc.clone());
                }

                // Collect candidate graphs where this child might live:
                // - Any tracked objects with this subject+shape across graphs
                // - Any graphs present in the current diff maps for this subject
                let mut candidate_graphs: Vec<String> = vec![];
                // From tracked objects any graph
                for (_g, _s, obj) in orm_subscription.iter_objects_by_shape(target_shape_iri) {
                    let or = obj.read().unwrap();
                    if or.subject_iri == child_subject {
                        candidate_graphs.push(or.graph_iri.clone());
                    }
                }
                // From diffs (added first, then removed)
                for (g, s) in added_by_graph_and_subject.keys() {
                    if s == &child_subject {
                        candidate_graphs.push(g.clone());
                    }
                }
                for (g, s) in removed_by_graph_and_subject.keys() {
                    if s == &child_subject {
                        candidate_graphs.push(g.clone());
                    }
                }
                // Always consider the parent's graph last
                candidate_graphs.push(parent_graph.clone());
                // Dedup graphs, preserving order
                let mut seen = HashSet::new();
                candidate_graphs.retain(|g| seen.insert(g.clone()));

                // Try to link/create per candidate graph; mark for queueing
                let mut queued_once = false;
                for child_graph in candidate_graphs {
                    if let Some(child_arc) = orm_subscription.get_tracked_orm_object(
                        &child_graph,
                        &child_subject,
                        target_shape_iri,
                    ) {
                        // Link existing child
                        Self::link_parent_and_child(
                            &parent_arc,
                            &child_arc,
                            pred_change,
                            &child_graph,
                            &child_subject,
                            target_shape_iri,
                        );
                        queued_once = true;
                    } else {
                        // If this graph-subject appears in diffs, we may need to queue the child to be processed first.
                        let key = (child_graph.clone(), child_subject.clone());
                        if added_by_graph_and_subject.contains_key(&key)
                            || removed_by_graph_and_subject.contains_key(&key)
                        {
                            queued_once = true;
                        }
                    }
                }

                // TODO: Should this be scheduled with a graph too?
                if queued_once {
                    children_to_queue
                        .entry(target_shape_iri.clone())
                        .or_insert_with(Vec::new)
                        .push(child_subject.clone());
                }

                // Else: Linked object does not exist in dataset.
            }
        }

        children_to_queue
    }

    /// Add and remove the quads from the tracked orm objects,
    /// re-validate, and update `changes` containing the updated data.
    /// Works by queuing changes by shape and (graph, subjects) on a stack.
    /// Nested objects are added to the stack
    pub(crate) fn process_changes_for_shape_and_session(
        &mut self,
        nuri: &NuriV0,
        root_shape_iri: &String,
        shapes: Vec<Arc<OrmSchemaShape>>,
        session_id: u64,
        quads_added: &[Quad],
        quads_removed: &[Quad],
        orm_changes: &mut OrmChanges,
        data_already_fetched: bool,
    ) -> Result<(), NgError> {
        log_info!(
            "[process_changes_for_shape_and_session] Starting processing for nuri, root_shape: {}, session: {}, {} shapes, {} quads added, {} quads removed, data_already_fetched: {}",
            root_shape_iri,
            session_id,
            shapes.len(),
            quads_added.len(),
            quads_removed.len(),
            data_already_fetched
        );

        // Group quads by (graph,subject) for the given shape.
        let added_by_graph_and_subject: HashMap<(String, String), Vec<&Quad>> =
            group_by_graph_and_subject(&quads_added);
        let removed_by_graph_and_subject: HashMap<(String, String), Vec<&Quad>> =
            group_by_graph_and_subject(&quads_removed);
        // Start with keys from actual quad diffs (owned set)
        let modified_gs: HashSet<GraphSubjectKey> = added_by_graph_and_subject
            .keys()
            .cloned()
            .chain(removed_by_graph_and_subject.keys().cloned())
            .collect();

        // First in, last out stack to keep track of objects to validate (nested objects first).
        let mut shape_validation_stack: Vec<(
            Arc<OrmSchemaShape>, // The shape to validate against
            Vec<(GraphIri, SubjectIri)>,
        )> = Self::init_validation_stack(self, nuri, &root_shape_iri, session_id, &modified_gs);

        // Track (shape_iri, subject_iri) pairs currently being validated to prevent cycles and double evaluation.
        let mut currently_validating: HashSet<(String, String, String)> = HashSet::new();

        let mut loop_counter = 0;
        // Track which (shape, graph, subject) have had quads applied already in this run.
        let mut already_applied: HashSet<(String, String, String)> = HashSet::new();

        // Process queue of shapes and subjects to validate.
        // For a given shape, we evaluate every subject against that shape.
        while let Some((shape, graph_subject_to_validate)) = shape_validation_stack.pop() {
            log_info!(
                "[process_changes_for_shape_and_session] Processing shape from stack: {}, with {} objects to validate: {:?}",
                shape.iri,
                graph_subject_to_validate.len(),
                graph_subject_to_validate
            );

            // Variables to collect nested objects that need validation.
            // Children have highest priority, then SELF, then PARENTS (last).
            let mut child_objects_to_eval: HashMap<ShapeIri, Vec<(SubjectIri, bool)>> =
                HashMap::new();
            let mut self_objects_to_eval: HashMap<ShapeIri, Vec<(SubjectIri, bool)>> =
                HashMap::new();
            let mut parent_objects_to_eval: HashMap<ShapeIri, Vec<(SubjectIri, bool)>> =
                HashMap::new();

            // For each modified subject, apply changes to tracked orm objects, link nested refs, and validate.
            for (graph_iri, subject_iri) in graph_subject_to_validate.iter() {
                // Cycle detection: Check if this (shape, graph, subject) combination is already being validated.
                let validation_key = (shape.iri.clone(), graph_iri.clone(), subject_iri.clone());
                if currently_validating.contains(&validation_key) {
                    log_warn!(
                        "[process_changes_for_shape_and_session] Cycle detected: graph '{graph_iri}' subject '{}' with shape '{}' is already being validated. Marking as invalid.",
                        subject_iri,
                        shape.iri
                    );

                    // Find tracked and mark as invalid.
                    let orm_subscription = &mut self.get_first_orm_subscription_for(
                        nuri,
                        Some(&root_shape_iri),
                        Some(&session_id),
                    );
                    if let Some(tracked_orm_object) =
                        orm_subscription.get_tracked_orm_object(graph_iri, subject_iri, &shape.iri)
                    {
                        let mut ts = tracked_orm_object.write().unwrap();
                        ts.valid = TrackedOrmObjectValidity::Invalid;
                        ts.tracked_predicates.clear();
                    }
                    continue;
                }

                // Mark as currently validating this (shape, graph, subject)
                currently_validating.insert(validation_key);

                let orm_subscription = self
                    .orm_subscriptions
                    .get_mut(&nuri_to_string(nuri))
                    .unwrap()
                    .iter_mut()
                    .find(|sub| {
                        sub.shape_type.shape == *root_shape_iri && sub.session_id == session_id
                    })
                    .unwrap();

                // We'll capture the child's Arc for linking to parents after dropping the mutable borrow to orm_changes
                let mut link_children_to_eval = HashMap::new();

                {
                    // Get or create change object and apply quads
                    let (change, _change_new) = Self::ensure_change_for_subject(
                        orm_subscription,
                        orm_changes,
                        &shape,
                        graph_iri,
                        subject_iri,
                    );

                    // If validation took place already, there's nothing more to do...
                    if change.is_validated {
                        log_info!(
                            "[process_changes_for_shape_and_session] Subject {} already validated for shape {}: {:?}. skipping",
                            subject_iri,
                            shape.iri,
                            change.tracked_orm_object.read().unwrap().valid
                        );

                        continue;
                    }

                    // Capture child arc for later linking
                    let child_arc = change.tracked_orm_object.clone();

                    // Apply quads only once per (shape, graph, subject) in this processing.
                    let applied_key = (shape.iri.clone(), graph_iri.clone(), subject_iri.clone());
                    if !already_applied.contains(&applied_key) {
                        apply_quads_for_subject(
                            &shape,
                            graph_iri,
                            subject_iri,
                            &added_by_graph_and_subject,
                            &removed_by_graph_and_subject,
                            orm_subscription,
                            change,
                        );
                        already_applied.insert(applied_key);

                        // Reconcile parent<->child links for newly added refs and collect children to queue
                        link_children_to_eval = Self::reconcile_links_for_subject_additions(
                            orm_subscription,
                            change,
                            &added_by_graph_and_subject,
                            &removed_by_graph_and_subject,
                        );
                        // Link this tracked orm object to all tracked_nested_subjects that reference it.
                        // Running this once suffices because it will search for all subjects x graph pairs relevant.
                        Self::link_to_tracking_parents(orm_subscription, orm_changes, &child_arc);
                    }
                }

                // Reacquire mutable change for validation stage
                let (change, _change_new) = Self::ensure_change_for_subject(
                    orm_subscription,
                    orm_changes,
                    &shape,
                    graph_iri,
                    subject_iri,
                );

                // === Validate the subject ===

                let mut children_to_eval = vec![];
                let mut parents_to_eval = vec![];
                let mut need_self_eval = NeedEvalSelf::NoReevaluate;

                // If there are no children that we need to link to first, validate.
                if link_children_to_eval.len() == 0 {
                    // Validity evaluation returns children (with fetch flag), parents, and whether SELF needs (re)eval
                    (children_to_eval, parents_to_eval, need_self_eval) =
                        Self::update_subject_validity(change, &shape, orm_subscription);

                    log_info!(
                            "[process_changes_for_shape_and_session] Validation returned {} children, {} parents to eval and self: {:?}",
                            children_to_eval.len(),
                            parents_to_eval.len(),
                            need_self_eval
                        );
                }

                // Merge children discovered by validation with those found during linking
                // into a single map keyed by child shape -> subject -> needs_fetch (OR-reduced)
                let mut child_targets: HashMap<ShapeIri, HashMap<SubjectIri, bool>> =
                    HashMap::new();

                // 1) children discovered during linking (subjects only)
                for (child_shape_iri, entries) in link_children_to_eval.iter() {
                    let entry_map = child_targets
                        .entry(child_shape_iri.clone())
                        .or_insert_with(HashMap::new);
                    for subj in entries.iter() {
                        entry_map.entry(subj.clone()).or_insert(false);
                    }
                }

                // 2) children returned by validation (tormos -> subjects)
                for (child_arc, needs_fetch) in children_to_eval.into_iter() {
                    let child_r = child_arc.read().unwrap();
                    let shape_key = child_r.shape.iri.clone();
                    let subj_key = child_r.subject_iri.clone();
                    child_targets
                        .entry(shape_key)
                        .or_insert_with(HashMap::new)
                        .entry(subj_key)
                        .and_modify(|v| *v = *v || needs_fetch)
                        .or_insert(needs_fetch);
                }

                // Schedule CHILDREN (highest priority). Only queue if either no fetch is needed,
                // or if a fetch will actually be performed in this pass (i.e., data_already_fetched == false).
                // We work from child_targets (subjects only); graphs will be derived later from parents/modified/tracked.
                let mut any_child_queued_this_pass = false;
                for (shape_iri, subj_map) in child_targets.into_iter() {
                    for (subj, needs_fetch) in subj_map.into_iter() {
                        let will_queue = !needs_fetch || !data_already_fetched;
                        if !will_queue {
                            log_info!(
                                "[process_changes_for_shape_and_session] Skipping CHILD (needs fetch but data_already_fetched=true)"
                            );
                            continue;
                        }
                        child_objects_to_eval
                            .entry(shape_iri.clone())
                            .or_insert_with(Vec::new)
                            .push((subj, needs_fetch));
                        any_child_queued_this_pass = true;
                    }
                }

                // Schedule SELF (second priority)
                let (reschedule_self, self_needs_fetch) = match need_self_eval {
                    NeedEvalSelf::NoReevaluate => (false, false),
                    NeedEvalSelf::Reevaluate => (true, false),
                    NeedEvalSelf::FetchAndReevaluate => (true, true),
                };

                // If no explicit self re-eval requested by validation, but we linked children
                // and at least one child will actually be processed in this pass, then re-eval self.
                let (reschedule_self, self_needs_fetch) =
                    if !reschedule_self && any_child_queued_this_pass {
                        (true, false)
                    } else {
                        (reschedule_self, self_needs_fetch)
                    };

                if reschedule_self {
                    log_info!(
                        "[process_changes_for_shape_and_session] Queueing SELF re-eval: {} with shape {}, needs_refetch: {}",
                        subject_iri,
                        shape.iri,
                        self_needs_fetch
                    );
                    self_objects_to_eval
                        .entry(shape.iri.clone())
                        .or_insert_with(Vec::new)
                        .push((subject_iri.clone(), self_needs_fetch));
                }

                // Schedule PARENTS (last priority)
                for parent_arc in parents_to_eval {
                    let parent = parent_arc.read().unwrap();
                    let parent_shape_iri = parent.shape.iri.clone();
                    let parent_subject = parent.subject_iri.clone();
                    // Skip queuing parent if it is currently being validated to avoid loops
                    let parent_key = (
                        parent_shape_iri.clone(),
                        parent.graph_iri.clone(),
                        parent_subject.clone(),
                    );
                    if currently_validating.contains(&parent_key) {
                        log_info!(
                            "[process_changes_for_shape_and_session] Skipping PARENT already in validation: {}",
                            parent_subject
                        );
                        continue;
                    }
                    log_info!(
                        "[process_changes_for_shape_and_session] Queueing PARENT: {} with shape {}",
                        parent_subject,
                        parent_shape_iri
                    );
                    parent_objects_to_eval
                        .entry(parent_shape_iri)
                        .or_insert_with(Vec::new)
                        .push((parent_subject, false));
                }
            }

            // Now, we queue all non-evaluated objects
            log_info!(
                "[process_changes_for_shape_and_session] Processing queued groups: children: {} self: {} parents: {}",
                child_objects_to_eval.len(),
                self_objects_to_eval.len(),
                parent_objects_to_eval.len()
            );

            // Process children shapes first, then SELF, then PARENTS last (by push order)
            // Also: deduplicate subjects per shape (if any appear multiple times, keep needs_refetch=true if any entry requires it)

            // Helper to build groups from a map
            let build_groups =
                |src: HashMap<String, Vec<(String, bool)>>| -> Vec<(String, Vec<(String, bool)>)> {
                    let mut dedup: HashMap<String, HashMap<String, bool>> = HashMap::new();
                    for (shape_iri, objects) in src {
                        let inner = dedup.entry(shape_iri).or_insert_with(HashMap::new);
                        for (subj, needs) in objects {
                            inner
                                .entry(subj)
                                .and_modify(|v| *v = *v || needs)
                                .or_insert(needs);
                        }
                    }
                    dedup
                        .into_iter()
                        .map(|(shape_iri, subjects)| {
                            let vec_pairs =
                                subjects.into_iter().map(|(s, needs)| (s, needs)).collect();
                            (shape_iri, vec_pairs)
                        })
                        .collect()
                };

            let child_groups = build_groups(child_objects_to_eval);
            let self_groups = build_groups(self_objects_to_eval);
            let parent_groups = build_groups(parent_objects_to_eval);

            // Helper to push groups into the stack
            let mut push_groups =
                |groups: Vec<(String, Vec<(String, bool)>)>| -> Result<(), NgError> {
                    for (shape_iri, objects_to_eval) in groups {
                        log_info!(
                        "[process_changes_for_shape_and_session] Processing nested shape: {} with {} objects",
                        shape_iri,
                        objects_to_eval.len()
                    );

                        // Extract schema and shape Arc first (before any borrows)
                        let schema = {
                            let orm_sub = self.get_first_orm_subscription_for(
                                nuri,
                                Some(&root_shape_iri),
                                Some(&session_id),
                            );
                            orm_sub.shape_type.schema.clone()
                        };
                        let shape_arc = schema.get(&shape_iri).unwrap().clone();

                        // Data might need to be fetched (if it has not been during initialization or nested shape fetch).
                        if !data_already_fetched {
                            let objects_to_fetch: Vec<String> = objects_to_eval
                                .iter()
                                .filter(|(_iri, needs_fetch)| *needs_fetch)
                                .map(|(s, _)| s.clone())
                                .collect();

                            log_info!(
                            "[process_changes_for_shape_and_session] Fetching data for {} objects that need refetch",
                            objects_to_fetch.len()
                        );

                            if objects_to_fetch.len() > 0 {
                                // Create sparql query
                                let shape_query = shape_type_to_sparql_select(
                                    &schema,
                                    &shape_iri,
                                    Some(objects_to_fetch),
                                    None,
                                )?;
                                let new_quads = self
                                    .query_sparql_select(shape_query, Some(nuri_to_string(nuri)))?;

                                log_info!(
                                "[process_changes_for_shape_and_session] Fetched {} quads, recursively processing nested objects",
                                new_quads.len()
                            );

                                // Recursively process nested objects.
                                self.process_changes_for_shape_and_session(
                                    nuri,
                                    &root_shape_iri,
                                    vec![shape_arc.clone()],
                                    session_id,
                                    &new_quads,
                                    &vec![],
                                    orm_changes,
                                    true,
                                )?;
                            }
                        }

                        // Add objects that don't need fetching
                        let objects_not_to_fetch: Vec<String> = objects_to_eval
                            .iter()
                            .filter(|(_iri, needs_fetch)| !*needs_fetch)
                            .map(|(s, _)| s.clone())
                            .collect();
                        if objects_not_to_fetch.len() > 0 {
                            log_info!(
                            "[process_changes_for_shape_and_session] Queueing {} objects that don't need fetching for shape {}",
                            objects_not_to_fetch.len(),
                            shape_iri
                        );
                            // Convert Vec<String> subjects into expected (GraphIri, SubjectIri) tuples
                            // We need to derive graphs from tracked objects or use modified_gs
                            let orm_sub = self.get_first_orm_subscription_for(
                                nuri,
                                Some(&root_shape_iri),
                                Some(&session_id),
                            );
                            let tuples: Vec<(String, String)> = objects_not_to_fetch
                                .into_iter()
                                .filter_map(|subject| {
                                    // Try to find graph from tracked object by iterating objects with this shape
                                    for (graph_iri, subj_iri, _) in
                                        orm_sub.iter_objects_by_shape(&shape_iri)
                                    {
                                        if subj_iri == subject {
                                            return Some((graph_iri, subject));
                                        }
                                    }

                                    // If not found in tracked objects, try to use from added_by_graph_and_subject
                                    for ((graph, subj), _) in added_by_graph_and_subject.iter() {
                                        if subj == &subject {
                                            return Some((graph.clone(), subject));
                                        }
                                    }
                                    // Fallback to removed_by_graph_and_subject
                                    for ((graph, subj), _) in removed_by_graph_and_subject.iter() {
                                        if subj == &subject {
                                            return Some((graph.clone(), subject));
                                        }
                                    }
                                    None
                                })
                                .collect();
                            shape_validation_stack.push((shape_arc, tuples));
                        } else {
                            log_info!(
                            "[process_changes_for_shape_and_session] No objects to queue for shape {} (all needed fetching)",
                            shape_iri
                        );
                        }
                    }
                    Ok(())
                };

            // Because the stack is LIFO:
            // To process CHILDREN first, SELF second, PARENTS last, we push in this order:
            // 1) PARENTS first (bottom)
            push_groups(parent_groups)?;
            // 2) SELF next (middle)
            push_groups(self_groups)?;
            // 3) CHILDREN last (top) -> processed first
            push_groups(child_groups)?;

            for (graph_iri, subject_iri) in graph_subject_to_validate {
                let validation_key = (shape.iri.clone(), graph_iri.clone(), subject_iri.clone());
                currently_validating.remove(&validation_key);
            }
            loop_counter += 1;
            if loop_counter > 10 {
                for (is_validated, validity, subject_iri, shape_iri, graph_iri) in
                    orm_changes.values().flat_map(|g| {
                        g.values().flat_map(|s| {
                            s.values().map(|c| {
                                (
                                    c.is_validated,
                                    c.tracked_orm_object.read().unwrap().valid.clone(),
                                    c.tracked_orm_object.read().unwrap().subject_iri.clone(),
                                    c.tracked_orm_object.read().unwrap().shape.iri.clone(),
                                    c.tracked_orm_object.read().unwrap().graph_iri.clone(),
                                )
                            })
                        })
                    })
                {
                    log_debug!("All change objects: {is_validated}, {:?}, {subject_iri}, {shape_iri}, {graph_iri}", validity);
                }
                panic!("DEBUG ONLY: Too many cycles");
            }
        }

        log_info!(
            "[process_changes_for_shape_and_session] Finished processing. Validation stack empty."
        );

        Ok(())
    }

    /// Helper to call process_changes_for_shape for all subscriptions on nuri's document.
    pub(crate) fn process_changes_for_nuri_and_session(
        self: &mut Self,
        nuri: &NuriV0,
        session_id: u64,
        quads_added: &[Quad],
        quads_removed: &[Quad],
        data_already_fetched: bool,
    ) -> Result<OrmChanges, NgError> {
        let mut orm_changes = HashMap::new();

        let shapes: Vec<_> = self
            .orm_subscriptions
            .get(&nuri_to_string(nuri))
            .unwrap()
            .iter()
            .map(|sub| {
                sub.shape_type
                    .schema
                    .get(&sub.shape_type.shape)
                    .unwrap()
                    .clone()
            })
            .collect();

        for root_shape in shapes {
            let shape_iri = root_shape.iri.clone();
            // Now we can safely call the method with self
            self.process_changes_for_shape_and_session(
                nuri,
                &shape_iri,
                vec![root_shape.clone()],
                session_id,
                quads_added,
                quads_removed,
                &mut orm_changes,
                data_already_fetched,
            )?;
        }

        Ok(orm_changes)
    }

    pub fn get_first_orm_subscription_for(
        &self,
        nuri: &NuriV0,
        shape: Option<&ShapeIri>,
        session_id: Option<&u64>,
    ) -> &OrmSubscription {
        self.orm_subscriptions.get(&nuri_to_string(nuri)).unwrap().
        // Filter shapes, if present.
        iter().filter(|s| match shape {
            Some(sh) => *sh == s.shape_type.shape,
            None => true
        // Filter session ids if present.
        }).filter(|s| match session_id {
            Some(id) => *id == s.session_id,
            None => true
        }).next().unwrap()
    }

    pub fn get_first_orm_subscription_sender_for(
        &mut self,
        nuri: &NuriV0,
        shape: Option<&ShapeIri>,
        session_id: Option<&u64>,
    ) -> Result<(UnboundedSender<AppResponse>, &OrmSubscription), VerifierError> {
        let subs = self
            .orm_subscriptions
            .get_mut(&nuri_to_string(nuri))
            .unwrap();
        subs.retain(|sub| !sub.sender.is_closed());
        match subs // Filter shapes, if present.
            .iter()
            .filter(|s| match shape {
                Some(sh) => *sh == s.shape_type.shape,
                None => true, // Filter session ids if present.
            })
            .filter(|s| match session_id {
                Some(id) => *id == s.session_id,
                None => true,
            })
            .next()
        {
            None => Err(VerifierError::OrmSubscriptionNotFound),
            Some(subscription) => Ok((subscription.sender.clone(), subscription)),
        }
    }

    /// Groups modified (graph, subject) pairs by their associated shapes for validation.
    /// Used to initialize the validation stack in `process_changes_for_shape_and_session`.
    /// Returns a vector of (shape, [(graph, subject)]) pairs to process.
    fn init_validation_stack(
        &self,
        nuri: &NuriV0,
        root_shape_iri: &String,
        session_id: u64,
        modified_gs: &HashSet<(String, String)>,
    ) -> Vec<(
        Arc<OrmSchemaShape>, // The shape to validate against
        Vec<(GraphIri, SubjectIri)>,
    )> {
        let orm_subscription =
            self.get_first_orm_subscription_for(nuri, Some(&root_shape_iri), Some(&session_id));

        // Collect all (graph, subject) pairs that are both in modified_gs and tracked_nested_subjects
        let mut shape_to_gs: HashMap<ShapeIri, Vec<(String, String)>> = HashMap::new();

        // For each subject in tracked_nested_subjects, check if it appears in modified_gs
        for (tracked_subject, shape_map) in orm_subscription.tracked_nested_subjects.iter() {
            // Find all (graph, subject) pairs in modified_gs that match this tracked subject
            let matching_gs: Vec<(String, String)> = modified_gs
                .iter()
                .filter(|(_g, s)| s == tracked_subject)
                .cloned()
                .collect();

            // For each shape in the tracked_nested_subjects entry, schedule the matching subjects
            for (shape_iri, _parents) in shape_map.iter() {
                // Get the shape Arc from the schema
                if let Some(shape_arc) = orm_subscription.shape_type.schema.get(shape_iri) {
                    if !matching_gs.is_empty() {
                        shape_to_gs
                            .entry(shape_arc.iri.clone())
                            .or_insert_with(Vec::new)
                            .extend(matching_gs.clone());
                    }
                }
            }
        }

        // Always add the root shape with all modified_gs
        let root_shape_arc = orm_subscription
            .shape_type
            .schema
            .get(&orm_subscription.shape_type.shape)
            .unwrap()
            .clone();
        let root_gs: Vec<(String, String)> = modified_gs.iter().cloned().collect();

        // Remove root shape from the map if present, so we can add it last
        let mut root_gs_from_map = shape_to_gs.remove(root_shape_iri).unwrap_or_default();

        // Merge root_gs into root_gs_from_map, dedup
        root_gs_from_map.extend(root_gs);
        let mut seen = HashSet::new();
        root_gs_from_map.retain(|pair| seen.insert(pair.clone()));

        // Collect all shapes except root, then add root last
        let mut init = Vec::new();
        for (shape_iri, gs_vec) in shape_to_gs.into_iter() {
            // Deduplicate
            let mut seen = HashSet::new();
            let mut deduped = Vec::new();
            for pair in gs_vec {
                if seen.insert(pair.clone()) {
                    deduped.push(pair);
                }
            }
            if !deduped.is_empty() {
                init.push((
                    orm_subscription
                        .shape_type
                        .schema
                        .get(&shape_iri)
                        .unwrap()
                        .clone(),
                    deduped,
                ));
            }
        }
        if !root_gs_from_map.is_empty() {
            init.push((root_shape_arc, root_gs_from_map));
        }

        init
    }
    // cleanup_tracked_orm_objects removed: use OrmSubscription::cleanup_tracked_orm_objects instead
}
