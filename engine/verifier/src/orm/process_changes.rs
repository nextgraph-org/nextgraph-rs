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
        let mut currently_validating: HashSet<(String, String)> = HashSet::new();
        // Add root shape for first validation run.
        for shape in shapes {
            log_info!(
                "[process_changes_for_shape_and_session] Adding root shape to validation stack: {}",
                shape.iri
            );
            shape_validation_stack.push((shape, vec![]));
        }

        // Process queue of shapes and subjects to validate.
        // For a given shape, we evaluate every subject against that shape.
        while let Some((shape, objects_to_validate)) = shape_validation_stack.pop() {
            log_info!(
                "[process_changes_for_shape_and_session] Processing shape from stack: {}, with {} objects to validate: {:?}",
                shape.iri,
                objects_to_validate.len(),
                objects_to_validate
            );

            // Collect triples relevant for validation (temporary: drop graph component for grouping)
            let added_triples: Vec<ng_oxigraph::oxrdf::Triple> = quad_added
                .iter()
                .map(|q| ng_oxigraph::oxrdf::Triple {
                    subject: q.subject.clone(),
                    predicate: q.predicate.clone(),
                    object: q.object.clone(),
                })
                .collect();
            let removed_triples: Vec<ng_oxigraph::oxrdf::Triple> = quad_removed
                .iter()
                .map(|q| ng_oxigraph::oxrdf::Triple {
                    subject: q.subject.clone(),
                    predicate: q.predicate.clone(),
                    object: q.object.clone(),
                })
                .collect();
            let added_quads_by_subject =
                group_by_subject_for_shape(&shape, &added_triples, &objects_to_validate);
            let removed_quads_by_subject =
                group_by_subject_for_shape(&shape, &removed_triples, &objects_to_validate);
            let modified_subject_iris: HashSet<&SubjectIri> = added_quads_by_subject
                .keys()
                .chain(removed_quads_by_subject.keys())
                .collect();

            log_info!(
                "[process_changes_for_shape_and_session] Found {} modified subjects for shape {}: {:?}",
                modified_subject_iris.len(),
                shape.iri,
                modified_subject_iris
            );

            // Variable to collect nested objects that need validation.
            let mut nested_objects_to_eval: HashMap<ShapeIri, Vec<(SubjectIri, bool)>> =
                HashMap::new();

            // For each subject, add/remove quads and validate.
            log_info!(
                "[process_changes_for_shape_and_session] processing modified subjects: {:?} against shape: {}",
                modified_subject_iris,
                shape.iri
            );

            // For each modified subject, apply changes to tracked subjects and validate.
            for subject_iri in &modified_subject_iris {
                let validation_key = (shape.iri.clone(), subject_iri.to_string());

                // Cycle detection: Check if this (shape, subject) pair is already being validated
                if currently_validating.contains(&validation_key) {
                    log_warn!(
                        "[process_changes_for_shape_and_session] Cycle detected: subject '{}' with shape '{}' is already being validated. Marking as invalid.",
                        subject_iri,
                        shape.iri
                    );

                    // Find tracked and mark as invalid.
                    let orm_subscription = &mut self.get_first_orm_subscription_for(
                        nuri,
                        Some(&root_shape_iri),
                        Some(&session_id),
                    );
                    if let Some(tracked_subject) = orm_subscription
                        .get_tracked_object_any_graph(subject_iri, &shape.iri)
                    {
                        let mut ts = tracked_subject.write().unwrap();
                        ts.valid = TrackedOrmObjectValidity::Invalid;
                        ts.tracked_predicates.clear();
                    }
                    continue;
                }

                // Mark as currently validating
                currently_validating.insert(validation_key.clone());

                // Get quad changes for subject (added & removed).
                let quads_added_for_subj = added_quads_by_subject
                    .get(*subject_iri)
                    .map(|v| v.as_slice())
                    .unwrap_or(&[]);
                let quads_removed_for_subj = removed_quads_by_subject
                    .get(*subject_iri)
                    .map(|v| v.as_slice())
                    .unwrap_or(&[]);

                // Get or create change object for (shape, subject) pair.
                let change = orm_changes
                    .entry(shape.iri.clone())
                    .or_insert_with(HashMap::new)
                    .entry((*subject_iri).clone())
                    .or_insert_with(|| {
                        // Create a new change record.
                        // This includes the previous validity and quad changes.
                        let orm_subscription = self
                            .orm_subscriptions
                            .get_mut(&nuri_to_string(nuri))
                            .unwrap()
                            .iter_mut()
                            .find(|sub| {
                                sub.shape_type.shape == *root_shape_iri
                                    && sub.session_id == session_id
                            })
                            .unwrap();

                        log_info!("[process_changes_for_shape_and_session] Creating change object for {}, {}", subject_iri, shape.iri);
                        let prev_valid = orm_subscription
                            .get_tracked_object_any_graph(subject_iri, &shape.iri)
                            .map(|ts| ts.read().unwrap().valid.clone())
                            .unwrap_or(TrackedOrmObjectValidity::Pending);

                        let tracked_obj = orm_subscription
                            .get_or_create_tracked_subject(subject_iri, &shape);

                        let mut change = TrackedOrmObjectChange {
                            tracked_orm_object: tracked_obj,
                            predicates: HashMap::new(),
                            is_validated: false,
                            prev_valid,
                        };

                        if let Err(e) = add_remove_quads(
                            shape.clone(),
                            subject_iri,
                            quads_added_for_subj,
                            quads_removed_for_subj,
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
                        "[process_changes_for_shape_and_session] Subject {} already validated for shape {}, skipping",
                        subject_iri,
                        shape.iri
                    );
                    continue;
                }

                log_info!(
                    "[process_changes_for_shape_and_session] Running validation for subject {} against shape {}",
                    subject_iri,
                    shape.iri
                );

                // Run validation and record objects that need to be re-evaluated.
                {
                    let orm_subscription = self
                        .orm_subscriptions
                        .get_mut(&nuri_to_string(nuri))
                        .unwrap()
                        .iter_mut()
                        .find(|sub| {
                            sub.shape_type.shape == *root_shape_iri && sub.session_id == session_id
                        })
                        .unwrap();

                    // Validate the subject.
                    // need_eval contains elements in reverse priority (last element to be validated first)
                    // TODO: Improve order by distinguishing between parents, children and self to be re-evaluated.
                    let need_eval = Self::update_subject_validity(change, &shape, orm_subscription);

                    // We add the need_eval to be processed next after loop.
                    // Filter out subjects already in the validation stack to prevent double evaluation.
                    log_info!(
                        "[process_changes_for_shape_and_session] Validation returned {} objects that need evaluation",
                        need_eval.len()
                    );
                    for (iri, schema_shape, needs_refetch) in need_eval {
                        let eval_key = (schema_shape.clone(), iri.clone());
                        if !currently_validating.contains(&eval_key) {
                            log_info!(
                                "[process_changes_for_shape_and_session] Adding nested object to eval: {} with shape {}, needs_refetch: {}",
                                iri,
                                schema_shape,
                                needs_refetch
                            );
                            // Only add if not currently being validated
                            nested_objects_to_eval
                                .entry(schema_shape)
                                .or_insert_with(Vec::new)
                                .push((iri.clone(), needs_refetch));
                        } else {
                            log_info!(
                                "[process_changes_for_shape_and_session] Skipping nested object {} with shape {} - already validating",
                                iri,
                                schema_shape
                            );
                        }
                    }
                }
            }

            // Now, we queue all non-evaluated objects
            log_info!(
                "[process_changes_for_shape_and_session] Processing {} nested shape groups",
                nested_objects_to_eval.len()
            );
            for (shape_iri, objects_to_eval) in &nested_objects_to_eval {
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
                let shape_arc = schema.get(shape_iri).unwrap().clone();

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
                        let new_quads =
                            self.query_sparql_select(shape_query, Some(nuri_to_string(nuri)))?;

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

                // Add objects
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
                    // Queue all objects that don't need fetching.
                    shape_validation_stack.push((shape_arc, objects_not_to_fetch));
                } else {
                    log_info!(
                        "[process_changes_for_shape_and_session] No objects to queue for shape {} (all needed fetching)",
                        shape_iri
                    );
                }
            }

            log_info!(
                "[process_changes_for_shape_and_session] Cleaning up validation tracking for {} modified subjects",
                modified_subject_iris.len()
            );
            for subject_iri in modified_subject_iris {
                let validation_key = (shape.iri.clone(), subject_iri.to_string());
                currently_validating.remove(&validation_key);
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
    let subs = self.orm_subscriptions.get_mut(&nuri_to_string(nuri)).unwrap();
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
