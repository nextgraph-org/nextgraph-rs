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
use ng_net::types::OverlayLink;
use ng_oxigraph::oxrdf::Quad;
use ng_repo::errors::VerifierError;
use ng_repo::types::OverlayId;
use ng_repo::types::RepoId;

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
                            log_debug!("Triple fetched: {:?}", triple);
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
            log_debug!(
                "processing modified subjects: {:?} against shape: {}",
                modified_subject_iris,
                shape.iri
            );

            for subject_iri in &modified_subject_iris {
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

                    // Validate the subject.
                    let need_eval =
                        Self::update_subject_validity(change, &shape, &mut orm_subscription);

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
            for subject_iri in modified_subject_iris {
                let validation_key = (shape.iri.clone(), subject_iri.to_string());
                currently_validating.remove(&validation_key);
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

                        // If this is an object being added, record it for object creation
                        if let Some(iri) = &diff_op.3 {
                            if matches!(diff_op.0, OrmDiffOpType::add) {
                                paths_of_objects_to_create
                                    .insert((path.clone(), Some(iri.clone())));
                            }
                        }

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
                                let mut path: Vec<String> = vec![pred_name.clone()];
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
                                    let mut path = vec![pred_name.clone()];

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

    /// After creating new objects (without an id) in JS-land,
    /// we send the generated id for those back.
    /// If something went wrong (revert_inserts / revert_removes not empty),
    /// we send a JSON patch back to revert the made changes.
    pub(crate) async fn orm_update_self(
        &mut self,
        scope: &NuriV0,
        shape_iri: ShapeIri,
        session_id: u64,
        skolemnized_blank_nodes: Vec<Quad>,
        revert_inserts: Vec<Quad>,
        revert_removes: Vec<Quad>,
    ) -> Result<(), VerifierError> {
        let (mut sender, orm_subscription) =
            self.get_first_orm_subscription_sender_for(scope, Some(&shape_iri), Some(&session_id))?;

        // TODO prepare OrmUpdateBlankNodeIds with skolemnized_blank_nodes
        // use orm_subscription if needed
        // note(niko): I think skolemnized blank nodes can still be many, in case of multi-level nested sub-objects.
        let orm_bnids = vec![];
        let _ = sender
            .send(AppResponse::V0(AppResponseV0::OrmUpdateBlankNodeIds(
                orm_bnids,
            )))
            .await;

        // TODO (later) revert the inserts and removes
        // let orm_diff = vec![];
        // let _ = sender.send(AppResponse::V0(AppResponseV0::OrmUpdate(orm_diff))).await;

        Ok(())
    }

    /// Handles updates coming from JS-land (JSON patches).
    pub(crate) async fn orm_frontend_update(
        &mut self,
        session_id: u64,
        scope: &NuriV0,
        shape_iri: ShapeIri,
        diff: OrmDiff,
    ) -> Result<(), String> {
        log_info!(
            "frontend_update_orm session={} scope={:?} shape={} diff={:?}",
            session_id,
            scope,
            shape_iri,
            diff
        );

        let (doc_nuri, sparql_update) = {
            let orm_subscription =
                self.get_first_orm_subscription_for(scope, Some(&shape_iri), Some(&session_id));

            // use orm_subscription as needed
            // do the magic, then, find the doc where the query should start and generate the sparql update
            let doc_nuri = NuriV0::new_empty();
            let sparql_update: String = String::new();
            (doc_nuri, sparql_update)
        };

        match self
            .process_sparql_update(
                &doc_nuri,
                &sparql_update,
                &None,
                self.get_peer_id_for_skolem(),
                session_id,
            )
            .await
        {
            Err(e) => Err(e),
            Ok((_, revert_inserts, revert_removes, skolemnized_blank_nodes)) => {
                if !revert_inserts.is_empty()
                    || !revert_removes.is_empty()
                    || !skolemnized_blank_nodes.is_empty()
                {
                    self.orm_update_self(
                        scope,
                        shape_iri,
                        session_id,
                        skolemnized_blank_nodes,
                        revert_inserts,
                        revert_removes,
                    )
                    .await
                    .map_err(|e| e.to_string())?;
                }
                Ok(())
            }
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
        let (mut tx, rx) = mpsc::unbounded::<AppResponse>();

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

        let orm_objects = self.create_orm_object_for_shape(nuri, session_id, &shape_type)?;
        // log_debug!("create_orm_object_for_shape return {:?}", orm_objects);

        let _ = tx
            .send(AppResponse::V0(AppResponseV0::OrmInitial(orm_objects)))
            .await;

        let close = Box::new(move || {
            log_debug!("closing ORM subscription");
            if !tx.is_closed() {
                tx.close_channel();
            }
        });
        Ok((rx, close))
    }
}

// Btw, orm/mod.rs is exceeding 1200 lines again. Is that a good practice? I have the feeling, we could separate a couple of things..
