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
use std::u64;

pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_net::{app_protocol::*, orm::*};
use ng_oxigraph::oxrdf::Quad;
use ng_repo::errors::NgError;
use ng_repo::log::*;

use crate::orm::add_remove_quads::add_remove_quads;
use crate::orm::query::shape_type_to_sparql_select;
use crate::orm::shape_validation::NeedEvalSelf;
use crate::orm::types::*;
use crate::orm::utils::*;
use crate::orm::OrmChanges;
use crate::verifier::*;

impl Verifier {
    /// Apply quads to a nuri's document.
    /// Updates tracked_subjects in orm_subscriptions.
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

    /// Add and remove the quads from the tracked subjects,
    /// re-validate, and update `changes` containing the updated data.
    /// Works by queuing changes by shape and subjects on a stack.
    /// Nested objects are added to the stack
    pub(crate) fn process_changes_for_shape_and_session(
        &mut self,
        nuri: &NuriV0,
        root_shape_iri: &String,
        shapes: Vec<Arc<OrmSchemaShape>>,
        session_id: u64,
        quad_added: &[Quad],
        quad_removed: &[Quad],
        orm_changes: &mut OrmChanges,
        data_already_fetched: bool,
    ) -> Result<(), NgError> {
        log_info!(
            "[process_changes_for_shape_and_session] Starting processing for nuri, root_shape: {}, session: {}, {} shapes, {} quads added, {} quads removed, data_already_fetched: {}",
            root_shape_iri,
            session_id,
            shapes.len(),
            quad_added.len(),
            quad_removed.len(),
            data_already_fetched
        );

        // First in, last out stack to keep track of objects to validate (nested objects first). Strings are object IRIs.
        let mut shape_validation_stack: Vec<(Arc<OrmSchemaShape>, Vec<String>)> = vec![];
        // Track (shape_iri, subject_iri) pairs currently being validated to prevent cycles and double evaluation.
        let mut currently_validating: HashSet<(String, String, String)> = HashSet::new();
        // Add root shape for first validation run.
        for shape in shapes {
            log_info!(
                "[process_changes_for_shape_and_session] Adding root shape to validation stack: {}",
                shape.iri
            );
            shape_validation_stack.push((shape, vec![]));
        }

        let mut counter = 0;
        // Process queue of shapes and subjects to validate.
        // For a given shape, we evaluate every subject against that shape.
        while let Some((shape, objects_to_validate)) = shape_validation_stack.pop() {
            log_info!(
                "[process_changes_for_shape_and_session] Processing shape from stack: {}, with {} objects to validate: {:?}",
                shape.iri,
                objects_to_validate.len(),
                objects_to_validate
            );

            // Group quads by (graph,subject) for the given shape.
            let added_by_gs =
                group_filter_quads_for_shape_and_subjects(&shape, quad_added, &objects_to_validate);
            let removed_by_gs = group_filter_quads_for_shape_and_subjects(
                &shape,
                quad_removed,
                &objects_to_validate,
            );
            // Start with keys from actual quad diffs (owned set)
            let modified_gs: HashSet<GraphSubjectKey> = added_by_gs
                .keys()
                .cloned()
                .chain(removed_by_gs.keys().cloned())
                .collect();

            log_info!(
                "[process_changes_for_shape_and_session] Found {} modified subjects for shape {}: {:?}",
                added_by_gs.len(),
                shape.iri,
                modified_gs
            );

            // Variables to collect nested objects that need validation.
            // Children have highest priority, then SELF, then PARENTS (last).
            let mut child_objects_to_eval: HashMap<ShapeIri, Vec<(SubjectIri, bool)>> =
                HashMap::new();
            let mut self_objects_to_eval: HashMap<ShapeIri, Vec<(SubjectIri, bool)>> =
                HashMap::new();
            let mut parent_objects_to_eval: HashMap<ShapeIri, Vec<(SubjectIri, bool)>> =
                HashMap::new();

            // For each subject, add/remove quads and validate.
            log_info!(
                "[process_changes_for_shape_and_session] processing modified (graph,subject) keys: {:?} against shape: {}",
                modified_gs,
                shape.iri
            );

            // For each modified subject, apply changes to tracked subjects and validate.
            for (graph_iri, subject_iri) in modified_gs.iter() {
                let validation_key = (shape.iri.clone(), graph_iri.clone(), subject_iri.clone());

                // Cycle detection: Check if this (shape, graph, subject) combination is already being validated.
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
                    if let Some(tracked_subject) =
                        orm_subscription.get_tracked_object(graph_iri, subject_iri, &shape.iri)
                    {
                        let mut ts = tracked_subject.write().unwrap();
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

                // Get or create change object.
                let change = orm_changes
                    .entry(shape.iri.clone())
                    .or_insert_with(HashMap::new)
                    .entry(subject_iri.clone())
                    .or_insert_with(|| {
                        // Create a new change record including previous validity

                        log_info!(
                            "[process_changes_for_shape_and_session] Creating change object."
                        );

                        let prev_valid = orm_subscription
                            .get_tracked_object(graph_iri, subject_iri, &shape.iri)
                            .map(|ts| ts.read().unwrap().valid.clone())
                            .unwrap_or(TrackedOrmObjectValidity::Pending);

                        let tracked_obj = orm_subscription.get_or_create_tracked_orm_object(
                            graph_iri,
                            subject_iri,
                            &shape,
                        );

                        let mut change = TrackedOrmObjectChange {
                            tracked_orm_object: tracked_obj,
                            predicates: HashMap::new(),
                            is_validated: false,
                            prev_valid,
                        };

                        // === Apply data to tracked subjects (filling up change object too).

                        // Get relevant quad changes (affecting graph and subject).
                        let gs_key = (graph_iri.clone(), subject_iri.clone());
                        let quads_added_for_gs = added_by_gs
                            .get(&gs_key)
                            .map(|v| v.as_slice())
                            .unwrap_or(&[]);
                        let quads_removed_for_gs = removed_by_gs
                            .get(&gs_key)
                            .map(|v| v.as_slice())
                            .unwrap_or(&[]);

                        // Apply quads.
                        if let Err(e) = add_remove_quads(
                            shape.clone(),
                            graph_iri,
                            subject_iri,
                            quads_added_for_gs,
                            quads_removed_for_gs,
                            orm_subscription,
                            &mut change,
                        ) {
                            log_err!("apply_changes_from_quads add/remove error: {:?}", e);
                            panic!();
                        }

                        change
                    });

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

                // === Validate the subject ===

                // Evaluate validity -> returns children (with fetch flag), parents, and whether SELF needs (re)eval
                let (children_to_eval, parents_to_eval, need_self_eval) =
                    Self::update_subject_validity(change, &shape, orm_subscription);

                // We add the need_eval to be processed next after loop.
                // Filter out subjects already in the validation stack to prevent double evaluation.
                log_info!(
                        "[process_changes_for_shape_and_session] Validation returned {} children, {} parents to eval and self: {:?}",
                        children_to_eval.len(),
                        parents_to_eval.len(),
                        need_self_eval
                    );

                // Schedule CHILDREN (highest priority). Only queue if either no fetch is needed,
                // or if a fetch will actually be performed in this pass (i.e., data_already_fetched == false).
                for (child_arc, needs_fetch) in children_to_eval {
                    let will_queue = !needs_fetch || !data_already_fetched;
                    if !will_queue {
                        log_info!(
                            "[process_changes_for_shape_and_session] Skipping CHILD (needs fetch but data_already_fetched=true)"
                        );
                        continue;
                    }
                    let child = child_arc.read().unwrap();
                    let child_shape_iri = child.shape.iri.clone();
                    let child_subject = child.subject_iri.clone();
                    log_info!(
                        "[process_changes_for_shape_and_session] Queueing CHILD: {} with shape {}, needs_refetch: {}",
                        child_subject,
                        child_shape_iri,
                        needs_fetch
                    );
                    // Skip if the child is currently being validated with the same (shape,graph,subject) key
                    let child_key = (
                        child_shape_iri.clone(),
                        child.graph_iri.clone(),
                        child_subject.clone(),
                    );
                    if !currently_validating.contains(&child_key) {
                        child_objects_to_eval
                            .entry(child_shape_iri)
                            .or_insert_with(Vec::new)
                            .push((child_subject, needs_fetch));
                    } else {
                        log_info!(
                            "[process_changes_for_shape_and_session] Skipping CHILD already in validation: {}",
                            child_subject
                        );
                    }
                }

                // Schedule SELF (second priority)
                let (self_needs_eval, self_needs_fetch) = match need_self_eval {
                    NeedEvalSelf::NoReevaluate => (false, false),
                    NeedEvalSelf::Reevaluate => (true, false),
                    NeedEvalSelf::FetchAndReevaluate => (true, true),
                };

                if self_needs_eval {
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
                                    [shape_arc.clone()].to_vec(),
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
                            shape_validation_stack.push((shape_arc, objects_not_to_fetch));
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

            log_info!(
                "[process_changes_for_shape_and_session] Removing {} tormos from currently_validating",
                modified_gs.len()
            );
            for (graph_iri, subject_iri) in modified_gs {
                let validation_key = (shape.iri.clone(), graph_iri.clone(), subject_iri.clone());
                currently_validating.remove(&validation_key);
            }
            counter += 1;
            if counter > 200 {
                panic!("DEBUG ONLY: To many cycles");
            }
        }

        log_info!(
            "[process_changes_for_shape_and_session] Finished processing. Validation stack empty."
        );

        Ok(())
    }

    /// Helper to call process_changes_for_shape for all subscriptions on nuri's document.
    fn process_changes_for_nuri_and_session(
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
                [root_shape].to_vec(),
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

    // cleanup_tracked_subjects removed: use OrmSubscription::cleanup_tracked_subjects instead
}
