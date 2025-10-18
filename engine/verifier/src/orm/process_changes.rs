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
use ng_oxigraph::oxrdf::Triple;
use ng_repo::errors::NgError;
use ng_repo::log::*;

use crate::orm::add_remove_triples::add_remove_triples;
use crate::orm::query::shape_type_to_sparql;
use crate::orm::types::*;
use crate::orm::utils::*;
use crate::orm::OrmChanges;
use crate::verifier::*;

impl Verifier {
    /// Apply triples to a nuri's document.
    /// Updates tracked_subjects in orm_subscriptions.
    pub(crate) fn apply_triple_changes(
        &mut self,
        triples_added: &[Triple],
        triples_removed: &[Triple],
        nuri: &NuriV0,
        only_for_session_id: Option<u64>,
        data_already_fetched: bool,
    ) -> Result<OrmChanges, NgError> {
        log_debug!("apply_triple_changes {:?}", only_for_session_id);
        // If we have a specific session, handle only that subscription.
        if let Some(session_id) = only_for_session_id {
            return self.process_changes_for_nuri_and_session(
                &nuri.clone(),
                session_id,
                triples_added,
                triples_removed,
                data_already_fetched,
            );
        }

        // Otherwise, iterate all sessions.
        let mut merged: OrmChanges = HashMap::new();

        let session_ids: Vec<_> = self
            .orm_subscriptions
            .get(nuri)
            .unwrap()
            .iter()
            .map(|s| s.session_id.clone())
            .collect();

        for session_id in session_ids {
            let changes = self.process_changes_for_nuri_and_session(
                &nuri,
                session_id,
                triples_added,
                triples_removed,
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

    /// Add and remove the triples from the tracked subjects,
    /// re-validate, and update `changes` containing the updated data.
    /// Works by queuing changes by shape and subjects on a stack.
    /// Nested objects are added to the stack
    pub(crate) fn process_changes_for_shape_and_session(
        &mut self,
        nuri: &NuriV0,
        root_shape_iri: &String,
        shapes: Vec<Arc<OrmSchemaShape>>,
        session_id: u64,
        triples_added: &[Triple],
        triples_removed: &[Triple],
        orm_changes: &mut OrmChanges,
        data_already_fetched: bool,
    ) -> Result<(), NgError> {
        // First in, last out stack to keep track of objects to validate (nested objects first). Strings are object IRIs.
        let mut shape_validation_stack: Vec<(Arc<OrmSchemaShape>, Vec<String>)> = vec![];
        // Track (shape_iri, subject_iri) pairs currently being validated to prevent cycles and double evaluation.
        let mut currently_validating: HashSet<(String, String)> = HashSet::new();
        // Add root shape for first validation run.
        for shape in shapes {
            shape_validation_stack.push((shape, vec![]));
        }

        // Process queue of shapes and subjects to validate.
        // For a given shape, we evaluate every subject against that shape.
        while let Some((shape, objects_to_validate)) = shape_validation_stack.pop() {
            // Collect triples relevant for validation.
            let added_triples_by_subject =
                group_by_subject_for_shape(&shape, triples_added, &objects_to_validate);
            let removed_triples_by_subject =
                group_by_subject_for_shape(&shape, triples_removed, &objects_to_validate);
            let modified_subject_iris: HashSet<&SubjectIri> = added_triples_by_subject
                .keys()
                .chain(removed_triples_by_subject.keys())
                .collect();

            // Variable to collect nested objects that need validation.
            let mut nested_objects_to_eval: HashMap<ShapeIri, Vec<(SubjectIri, bool)>> =
                HashMap::new();

            // For each subject, add/remove triples and validate.
            log_debug!(
                "processing modified subjects: {:?} against shape: {}",
                modified_subject_iris,
                shape.iri
            );

            // For each modified subject, apply changes to tracked subjects and validate.
            for subject_iri in &modified_subject_iris {
                let validation_key = (shape.iri.clone(), subject_iri.to_string());

                // Cycle detection: Check if this (shape, subject) pair is already being validated
                if currently_validating.contains(&validation_key) {
                    log_warn!(
                        "Cycle detected: subject '{}' with shape '{}' is already being validated. Marking as invalid.",
                        subject_iri,
                        shape.iri
                    );

                    // Find tracked and mark as invalid.
                    let orm_subscription = &mut self.get_first_orm_subscription_for(
                        nuri,
                        Some(&root_shape_iri),
                        Some(&session_id),
                    );
                    if let Some(tracked_shapes) =
                        orm_subscription.tracked_subjects.get(*subject_iri)
                    {
                        if let Some(tracked_subject) = tracked_shapes.get(&shape.iri) {
                            let mut ts = tracked_subject.write().unwrap();
                            ts.valid = OrmTrackedSubjectValidity::Invalid;
                            ts.tracked_predicates.clear();
                        }
                    }
                    continue;
                }

                // Mark as currently validating
                currently_validating.insert(validation_key.clone());

                // Get triples of subject (added & removed).
                let triples_added_for_subj = added_triples_by_subject
                    .get(*subject_iri)
                    .map(|v| v.as_slice())
                    .unwrap_or(&[]);
                let triples_removed_for_subj = removed_triples_by_subject
                    .get(*subject_iri)
                    .map(|v| v.as_slice())
                    .unwrap_or(&[]);

                // Get or create change object for (shape, subject) pair.
                let change = orm_changes
                    .entry(shape.iri.clone())
                    .or_insert_with(HashMap::new)
                    .entry((*subject_iri).clone())
                    .or_insert_with(|| OrmTrackedSubjectChange {
                        subject_iri: (*subject_iri).clone(),
                        predicates: HashMap::new(),
                        data_applied: false,
                    });

                // Apply all triples for that subject to the tracked (shape, subject) pair.
                // Record the changes.
                {
                    let orm_subscription = self
                        .orm_subscriptions
                        .get_mut(nuri)
                        .unwrap()
                        .iter_mut()
                        .find(|sub| {
                            sub.shape_type.shape == *root_shape_iri && sub.session_id == session_id
                        })
                        .unwrap();

                    // Update tracked subjects and modify change objects.
                    if !change.data_applied {
                        log_debug!(
                            "Adding triples to change tracker for subject {}",
                            subject_iri
                        );

                        if let Err(e) = add_remove_triples(
                            shape.clone(),
                            subject_iri,
                            triples_added_for_subj,
                            triples_removed_for_subj,
                            orm_subscription,
                            change,
                        ) {
                            log_err!("apply_changes_from_triples add/remove error: {:?}", e);
                            panic!();
                        }
                        change.data_applied = true;
                    }

                    // Check if this is the first evaluation round - In that case, set old validity to new one.
                    // if the object was already validated, don't do so again.
                    {
                        let tracked_subject = &mut orm_subscription
                            .tracked_subjects
                            .get(*subject_iri)
                            .unwrap()
                            .get(&shape.iri)
                            .unwrap()
                            .write()
                            .unwrap();

                        // First run
                        if !change.data_applied
                            && tracked_subject.valid != OrmTrackedSubjectValidity::Pending
                        {
                            tracked_subject.prev_valid = tracked_subject.valid.clone();
                        }

                        if change.data_applied {
                            log_debug!("not applying triples again for subject {subject_iri}");

                            // Has this subject already been validated?
                            if change.data_applied
                                && tracked_subject.valid != OrmTrackedSubjectValidity::Pending
                            {
                                log_debug!("Not evaluating subject again {subject_iri}");

                                continue;
                            }
                        }
                    }

                    // Validate the subject.
                    // need_eval contains elements in reverse priority (last element to be validated first)
                    // TODO: Improve order by distinguishing between parents, children and self to be re-evaluated.
                    let need_eval = Self::update_subject_validity(change, &shape, orm_subscription);

                    // We add the need_eval to be processed next after loop.
                    // Filter out subjects already in the validation stack to prevent double evaluation.
                    for (iri, schema_shape, needs_refetch) in need_eval {
                        let eval_key = (schema_shape.clone(), iri.clone());
                        if !currently_validating.contains(&eval_key) {
                            // Only add if not currently being validated
                            nested_objects_to_eval
                                .entry(schema_shape)
                                .or_insert_with(Vec::new)
                                .push((iri.clone(), needs_refetch));
                        }
                    }
                }
            }

            // Now, we queue all non-evaluated objects
            for (shape_iri, objects_to_eval) in &nested_objects_to_eval {
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
                    let objects_to_fetch = objects_to_eval
                        .iter()
                        .filter(|(_iri, needs_fetch)| *needs_fetch)
                        .map(|(s, _)| s.clone())
                        .collect();

                    // Create sparql query
                    let shape_query =
                        shape_type_to_sparql(&schema, &shape_iri, Some(objects_to_fetch))?;
                    let new_triples =
                        self.query_sparql_construct(shape_query, Some(nuri_to_string(nuri)))?;

                    // Recursively process nested objects.
                    self.process_changes_for_shape_and_session(
                        nuri,
                        &root_shape_iri,
                        [shape_arc.clone()].to_vec(),
                        session_id,
                        &new_triples,
                        &vec![],
                        orm_changes,
                        true,
                    )?;
                }

                // Add objects
                let objects_not_to_fetch: Vec<String> = objects_to_eval
                    .iter()
                    .filter(|(_iri, needs_fetch)| !*needs_fetch)
                    .map(|(s, _)| s.clone())
                    .collect();
                if objects_not_to_fetch.len() > 0 {
                    // Queue all objects that don't need fetching.
                    shape_validation_stack.push((shape_arc, objects_not_to_fetch));
                }
            }
            for subject_iri in modified_subject_iris {
                let validation_key = (shape.iri.clone(), subject_iri.to_string());
                currently_validating.remove(&validation_key);
            }
        }

        Ok(())
    }

    /// Helper to call process_changes_for_shape for all subscriptions on nuri's document.
    fn process_changes_for_nuri_and_session(
        self: &mut Self,
        nuri: &NuriV0,
        session_id: u64,
        triples_added: &[Triple],
        triples_removed: &[Triple],
        data_already_fetched: bool,
    ) -> Result<OrmChanges, NgError> {
        let mut orm_changes = HashMap::new();

        let shapes: Vec<_> = self
            .orm_subscriptions
            .get(nuri)
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
                triples_added,
                triples_removed,
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
        self.orm_subscriptions.get(nuri).unwrap().
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
        let subs = self.orm_subscriptions.get_mut(nuri).unwrap();
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
}
