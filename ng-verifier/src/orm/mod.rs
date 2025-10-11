// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

pub mod add_remove_triples;
pub mod types;
pub mod utils;
pub mod validation;

use futures::channel::mpsc;
use futures::channel::mpsc::UnboundedSender;

use std::collections::HashMap;
use std::collections::HashSet;
use std::sync::Arc;
use std::sync::RwLock;
use std::u64;

use futures::SinkExt;
pub use ng_net::orm::{OrmDiff, OrmShapeType};
use ng_net::utils::Receiver;
use ng_net::{app_protocol::*, orm::*};
use ng_oxigraph::oxigraph::sparql::{Query, QueryResults};
use ng_oxigraph::oxrdf::Triple;
use ng_repo::errors::NgError;
use ng_repo::log::*;
use serde_json::json;
use serde_json::Value;

use crate::orm::add_remove_triples::add_remove_triples;
use crate::orm::types::*;
use crate::orm::utils::*;
use crate::types::*;
use crate::verifier::*;

// Structure to store changes in. By shape iri > subject iri > OrmTrackedSubjectChange
// **NOTE**: In comparison to OrmSubscription.tracked_subjects, the outer hashmap's keys are shape IRIs.
// (shape IRI -> (subject IRI -> OrmTrackedSubjectChange))
type OrmChanges = HashMap<ShapeIri, HashMap<SubjectIri, OrmTrackedSubjectChange>>;

impl Verifier {
    pub fn query_sparql_construct(
        &self,
        query: String,
        nuri: Option<String>,
    ) -> Result<Vec<Triple>, NgError> {
        let oxistore = self.graph_dataset.as_ref().unwrap();

        // let graph_nuri = NuriV0::repo_graph_name(
        //     &update.repo_id,
        //     &update.overlay_id,
        // );
        //let base = NuriV0::repo_id(&repo.id);

        let nuri_str = nuri.as_ref().map(|s| s.as_str());
        log_debug!("querying construct\n{}\n{}\n", nuri_str.unwrap(), query);

        let parsed =
            Query::parse(&query, nuri_str).map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        let results = oxistore
            .query(parsed, nuri)
            .map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        match results {
            QueryResults::Graph(triples) => {
                let mut result_triples: Vec<Triple> = vec![];
                for t in triples {
                    match t {
                        Err(e) => {
                            log_err!("{}", e.to_string());
                            return Err(NgError::SparqlError(e.to_string()));
                        }
                        Ok(triple) => {
                            result_triples.push(triple);
                        }
                    }
                }
                Ok(result_triples)
            }
            _ => return Err(NgError::InvalidResponse),
        }
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
            self.process_changes_for_shape_and_session(
                nuri,
                root_shape,
                session_id,
                triples_added,
                triples_removed,
                &mut orm_changes,
                data_already_fetched,
            )?;
        }

        Ok(orm_changes)
    }

    /// Add and remove the triples from the tracked subjects,
    /// re-validate, and update `changes` containing the updated data.
    /// Works by queuing changes by shape and subjects on a stack.
    /// Nested objects are added to the stack
    fn process_changes_for_shape_and_session(
        self: &mut Self,
        nuri: &NuriV0,
        root_shape: Arc<OrmSchemaShape>,
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
        let root_shape_iri = root_shape.iri.clone();
        shape_validation_stack.push((root_shape, vec![]));

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

            let mut orm_subscription = self
                .orm_subscriptions
                .get_mut(nuri)
                .unwrap()
                .iter_mut()
                .find(|sub| sub.session_id == session_id && sub.shape_type.shape == root_shape_iri)
                .unwrap();

            // Variable to collect nested objects that need validation.
            let mut nested_objects_to_eval: HashMap<ShapeIri, Vec<(SubjectIri, bool)>> =
                HashMap::new();

            // For each subject, add/remove triples and validate.
            log_debug!("all_modified_subjects: {:?}", modified_subject_iris);

            for subject_iri in modified_subject_iris {
                let validation_key = (shape.iri.clone(), subject_iri.to_string());

                // Cycle detection: Check if this (shape, subject) pair is already being validated
                if currently_validating.contains(&validation_key) {
                    log_warn!(
                        "Cycle detected: subject '{}' with shape '{}' is already being validated. Marking as invalid.",
                        subject_iri,
                        shape.iri
                    );
                    // Mark as invalid due to cycle
                    // TODO: We could handle this by handling nested references as IRIs.
                    if let Some(tracked_shapes) = orm_subscription.tracked_subjects.get(subject_iri)
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

                let triples_added_for_subj = added_triples_by_subject
                    .get(subject_iri)
                    .map(|v| v.as_slice())
                    .unwrap_or(&[]);
                let triples_removed_for_subj = removed_triples_by_subject
                    .get(subject_iri)
                    .map(|v| v.as_slice())
                    .unwrap_or(&[]);

                // Get or create change object for (shape, subject) pair.
                let change = orm_changes
                    .entry(shape.iri.clone())
                    .or_insert_with(HashMap::new)
                    .entry(subject_iri.clone())
                    .or_insert_with(|| OrmTrackedSubjectChange {
                        subject_iri: subject_iri.clone(),
                        predicates: HashMap::new(),
                        data_applied: false,
                    });

                // Apply all triples for that subject to the tracked (shape, subject) pair.
                // Record the changes.
                {
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
                            &mut orm_subscription,
                            change,
                        ) {
                            log_err!("apply_changes_from_triples add/remove error: {:?}", e);
                            panic!();
                        }
                        change.data_applied = true;
                    } else {
                        log_debug!("not applying triples again for subject {subject_iri}");
                    }

                    let validity = {
                        let tracked_subject_opt = orm_subscription
                            .tracked_subjects
                            .get(subject_iri)
                            .and_then(|m| m.get(&shape.iri));
                        let Some(tracked_subject) = tracked_subject_opt else {
                            continue;
                        }; // skip if missing
                        tracked_subject.read().unwrap().valid.clone()
                    };

                    // Validate the subject.
                    let need_eval = Self::update_subject_validity(
                        change,
                        &shape,
                        &mut orm_subscription,
                        validity,
                    );

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

                // Remove from validation stack after processing this subject
                currently_validating.remove(&validation_key);
            }

            // TODO: Currently, all shape <-> nested subject combinations are queued for re-evaluation.
            // Is that okay?

            // Now, we queue all non-evaluated objects
            for (shape_iri, objects_to_eval) in &nested_objects_to_eval {
                let orm_subscription = self.get_first_orm_subscription_for(
                    nuri,
                    Some(&root_shape_iri),
                    Some(&session_id),
                );
                // Extract schema and shape Arc before mutable borrow
                let schema = orm_subscription.shape_type.schema.clone();
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
                        shape_arc.clone(),
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
        }

        Ok(())
    }

    /// Helper to get orm subscriptions for nuri, shapes and sessions.
    pub fn get_orm_subscriptions_for(
        &self,
        nuri: &NuriV0,
        shape: Option<&ShapeIri>,
        session_id: Option<&u64>,
    ) -> Vec<&OrmSubscription> {
        self.orm_subscriptions.get(nuri).unwrap().
        // Filter shapes, if present.
        iter().filter(|s| match shape {
            Some(sh) => *sh == s.shape_type.shape,
            None => true
        // Filter session ids if present.
        }).filter(|s| match session_id {
            Some(id) => *id == s.session_id,
            None => true
        }).collect()
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

    /// Apply triples to a nuri's document.
    /// Updates tracked_subjects in orm_subscriptions.
    fn apply_triple_changes(
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

    /// Create ORM JSON object from OrmTrackedSubjectChange and shape.
    fn materialize_orm_object(
        change: &OrmTrackedSubjectChange,
        changes: &OrmChanges,
        shape: &OrmSchemaShape,
        tracked_subjects: &HashMap<String, HashMap<String, Arc<RwLock<OrmTrackedSubject>>>>,
    ) -> Value {
        let mut orm_obj = json!({"id": change.subject_iri});
        let orm_obj_map = orm_obj.as_object_mut().unwrap();
        for pred_schema in &shape.predicates {
            let property_name = &pred_schema.readablePredicate;
            let is_multi = pred_schema.maxCardinality > 1 || pred_schema.maxCardinality == -1;

            let Some(pred_change) = change.predicates.get(&pred_schema.iri) else {
                // No triples for this property.

                if pred_schema.minCardinality == 0 && is_multi {
                    // If this predicate schema is an array though, insert empty array.
                    orm_obj_map.insert(property_name.clone(), Value::Array(vec![]));
                }

                continue;
            };

            if pred_schema
                .dataTypes
                .iter()
                .any(|dt| dt.valType == OrmSchemaLiteralType::shape)
            {
                // We have a nested type.

                // Helper closure to create Value structs from a nested object_iri.
                let get_nested_orm_obj = |object_iri: &SubjectIri| {
                    // Find allowed schemas for the predicate's datatype.
                    let shape_iris: Vec<ShapeIri> = pred_schema
                        .dataTypes
                        .iter()
                        .flat_map(|dt| dt.shape.clone())
                        .collect();

                    // Find subject_change for this subject. There exists at least one (shape, subject) pair.
                    // If multiple allowed shapes exist, the first one is chosen.
                    let nested = shape_iris.iter().find_map(|shape_iri| {
                        changes
                            .get(shape_iri)
                            .and_then(|subject_changes| subject_changes.get(object_iri))
                            .map(|ch| (shape_iri, ch))
                    });

                    if let Some((matched_shape_iri, nested_subject_change)) = nested {
                        if let Some(nested_tracked_subject) = tracked_subjects
                            .get(&nested_subject_change.subject_iri)
                            .and_then(|shape_to_tracked_orm| {
                                shape_to_tracked_orm.get(matched_shape_iri)
                            })
                        {
                            let nested_tracked_subject = nested_tracked_subject.read().unwrap();
                            if nested_tracked_subject.valid == OrmTrackedSubjectValidity::Valid {
                                // Recurse
                                return Some(Self::materialize_orm_object(
                                    nested_subject_change,
                                    changes,
                                    &nested_tracked_subject.shape,
                                    tracked_subjects,
                                ));
                            }
                        }
                    }
                    None
                };

                if is_multi {
                    // Represent nested objects with more than one child
                    // as a map/object of <IRI of nested object> -> nested object,
                    // since there is no conceptual ordering of the children.
                    let mut nested_objects_map = serde_json::Map::new();

                    // Add each nested objects.
                    for new_val in &pred_change.values_added {
                        if let BasicType::Str(object_iri) = new_val {
                            if let Some(nested_orm_obj) = get_nested_orm_obj(object_iri) {
                                nested_objects_map.insert(object_iri.clone(), nested_orm_obj);
                            }
                        }
                    }
                    orm_obj_map.insert(property_name.clone(), Value::Object(nested_objects_map));
                } else {
                    if let Some(BasicType::Str(object_iri)) = pred_change.values_added.get(0) {
                        if let Some(nested_orm_obj) = get_nested_orm_obj(object_iri) {
                            orm_obj_map.insert(property_name.clone(), nested_orm_obj);
                        }
                    }
                }
            } else {
                // We have a basic type (string, number, bool, literal).

                if is_multi {
                    // Add values as array.
                    orm_obj_map.insert(
                        property_name.clone(),
                        Value::Array(
                            pred_change
                                .values_added
                                .iter()
                                .map(|v| match v {
                                    BasicType::Bool(b) => json!(*b),
                                    BasicType::Num(n) => json!(*n),
                                    BasicType::Str(s) => json!(s),
                                })
                                .collect(),
                        ),
                    );
                } else {
                    // Add value as primitive, if present.
                    if let Some(val) = pred_change.values_added.get(0) {
                        orm_obj_map.insert(
                            property_name.clone(),
                            match val {
                                BasicType::Bool(b) => json!(*b),
                                BasicType::Num(n) => json!(*n),
                                BasicType::Str(s) => json!(s),
                            },
                        );
                    }
                }
            }
        }

        return orm_obj;
    }

    /// For a nuri, session, and shape, create an ORM JSON object.
    fn create_orm_object_for_shape(
        &mut self,
        nuri: &NuriV0,
        session_id: u64,
        shape_type: &OrmShapeType,
    ) -> Result<Value, NgError> {
        // Query triples for this shape
        let shape_query = shape_type_to_sparql(&shape_type.schema, &shape_type.shape, None)?;
        let shape_triples = self.query_sparql_construct(shape_query, Some(nuri_to_string(nuri)))?;

        let changes: OrmChanges =
            self.apply_triple_changes(&shape_triples, &[], nuri, Some(session_id.clone()), true)?;

        let orm_subscription =
            self.get_first_orm_subscription_for(nuri, Some(&shape_type.shape), Some(&session_id));

        let schema: &HashMap<String, Arc<OrmSchemaShape>> = &orm_subscription.shape_type.schema;
        let root_shape = schema.get(&shape_type.shape).unwrap();
        let Some(_root_changes) = changes.get(&root_shape.iri).map(|s| s.values()) else {
            return Ok(Value::Array(vec![]));
        };

        let mut return_vals: Value = Value::Array(vec![]);
        let return_val_vec = return_vals.as_array_mut().unwrap();

        // log_debug!(
        //     "Tracked subjects:\n{:?}\n",
        //     orm_subscription.tracked_subjects,
        // );
        // For each valid change struct, we build an orm object.
        // The way we get the changes from the tracked subjects is a bit hacky, sorry.
        for (subject_iri, tracked_subjects_by_shape) in &orm_subscription.tracked_subjects {
            if let Some(tracked_subject) = tracked_subjects_by_shape.get(&shape_type.shape) {
                let ts = tracked_subject.read().unwrap();
                log_info!("changes for: {:?} valid: {:?}\n", ts.subject_iri, ts.valid);

                if ts.valid == OrmTrackedSubjectValidity::Valid {
                    if let Some(change) = changes
                        .get(&shape_type.shape)
                        .and_then(|subject_iri_to_ts| subject_iri_to_ts.get(subject_iri).clone())
                    {
                        let new_val = Self::materialize_orm_object(
                            change,
                            &changes,
                            root_shape,
                            &orm_subscription.tracked_subjects,
                        );
                        // TODO: For some reason, this log statement causes a panic.
                        // log_debug!("Materialized change:\n{:?}\ninto:\n{:?}", change, new_val);
                        return_val_vec.push(new_val);
                    }
                }
            }
        }

        return Ok(return_vals);
    }

    pub(crate) async fn orm_update(&mut self, scope: &NuriV0, patch: GraphQuadsPatch) {}

    pub(crate) async fn orm_frontend_update(
        &mut self,
        scope: &NuriV0,
        shape_iri: ShapeIri,
        diff: OrmDiff,
    ) {
        log_info!("frontend_update_orm {:?} {} {:?}", scope, shape_iri, diff);
    }

    pub(crate) async fn push_orm_response(
        &mut self,
        nuri: &NuriV0,
        session_id: u64,
        sender: UnboundedSender<AppResponse>,
        response: AppResponse,
    ) {
        log_debug!("sending orm response for session {}:", session_id);

        if sender.is_closed() {
            log_debug!("closed so removing session {}", session_id);

            self.orm_subscriptions.remove(&nuri);
        } else {
            let _ = sender.clone().send(response).await;
        }
    }

    pub(crate) fn clean_orm_subscriptions(&mut self) {
        self.orm_subscriptions.retain(|_, subscriptions| {
            subscriptions.retain(|sub| !sub.sender.is_closed());
            !subscriptions.is_empty()
        });
    }

    /// Entry point to create a new orm subscription.
    /// Triggers the creation of an orm object which is sent back to the receiver.
    pub(crate) async fn start_orm(
        &mut self,
        nuri: &NuriV0,
        shape_type: &OrmShapeType,
        session_id: u64,
    ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
        let (tx, rx) = mpsc::unbounded::<AppResponse>();

        // TODO: Validate schema:
        // If multiple data types are present for the same predicate, they must be of of the same type.
        // All referenced shapes must be available.

        // Create new subscription and add to self.orm_subscriptions
        let orm_subscription = OrmSubscription {
            shape_type: shape_type.clone(),
            session_id: session_id,
            sender: tx.clone(),
            tracked_subjects: HashMap::new(),
            nuri: nuri.clone(),
        };

        self.orm_subscriptions
            .entry(nuri.clone())
            .or_insert(vec![])
            .push(orm_subscription);

        let _orm_objects = self.create_orm_object_for_shape(nuri, session_id, &shape_type)?;
        // log_debug!("create_orm_object_for_shape return {:?}", _orm_objects);

        self.push_orm_response(
            &nuri.clone(),
            session_id,
            tx.clone(),
            AppResponse::V0(AppResponseV0::OrmInitial(_orm_objects)),
        )
        .await;

        let close = Box::new(move || {
            log_debug!("CLOSE_CHANNEL of subscription");
            if !tx.is_closed() {
                tx.close_channel();
            }
        });
        Ok((rx, close))
    }
}
