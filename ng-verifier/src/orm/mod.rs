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
pub mod validation;

use futures::channel::mpsc;
use ng_oxigraph::oxrdf::Subject;
use ng_repo::types::OverlayId;

use std::collections::HashMap;
use std::collections::HashSet;
use std::sync::Arc;
use std::u64;

use futures::SinkExt;
use lazy_static::lazy_static;
pub use ng_net::orm::{OrmDiff, OrmShapeType};
use ng_net::utils::Receiver;
use ng_net::{app_protocol::*, orm::*};
use ng_oxigraph::oxigraph::sparql::{Query, QueryResults};
use ng_oxigraph::oxrdf::Triple;
use ng_repo::errors::NgError;
use ng_repo::errors::VerifierError;
use ng_repo::log::*;
use regex::Regex;
use serde_json::json;
use serde_json::Value;

use crate::orm::add_remove_triples::add_remove_triples;
use crate::orm::types::*;
use crate::types::*;
use crate::verifier::*;

type ShapeIri = String;
type SubjectIri = String;
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

        log_debug!("querying construct\n{}\n\n", query);

        let nuri_str = nuri.as_ref().map(|s| s.as_str());

        let parsed =
            Query::parse(&query, nuri_str).map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        let results = oxistore
            .query(parsed, nuri)
            .map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        match results {
            QueryResults::Graph(triples) => {
                let mut results = vec![];
                for t in triples {
                    match t {
                        Err(e) => {
                            log_err!("{}", e.to_string());
                            return Err(NgError::SparqlError(e.to_string()));
                        }
                        Ok(triple) => results.push(triple),
                    }
                }
                Ok(results)
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
    ) -> Result<OrmChanges, NgError> {
        let mut orm_changes = HashMap::new();

        let shapes: Vec<_> = self
            .orm_subscriptions
            .get(nuri)
            .unwrap()
            .iter()
            .map(|s| {
                s.shape_type
                    .schema
                    .get(&s.shape_type.shape)
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
            )?;
        }

        Ok(orm_changes)
    }

    /// Add and remove the triples from the tracked subjects,
    /// re-validate, and update `changes` containing the updated data.
    fn process_changes_for_shape_and_session(
        self: &mut Self,
        nuri: &NuriV0,
        root_shape: Arc<OrmSchemaShape>,
        session_id: u64,
        triples_added: &[Triple],
        triples_removed: &[Triple],
        orm_changes: &mut OrmChanges,
    ) -> Result<(), NgError> {
        // First in, last out stack to keep track of objects to validate (nested objects first). Strings are object IRIs.
        let mut shape_validation_queue: Vec<(Arc<OrmSchemaShape>, Vec<String>)> = vec![];
        // Add root shape for first validation run.
        shape_validation_queue.push((root_shape, vec![]));

        // Process queue of shapes and subjects to validate.
        // For a given shape, we evaluate every subject against that shape.
        while let Some((shape, objects_to_validate)) = shape_validation_queue.pop() {
            // Collect triples relevant for validation.
            let added_triples_by_subject =
                group_by_subject_for_shape(&shape, triples_added, &objects_to_validate);
            let removed_triples_by_subject =
                group_by_subject_for_shape(&shape, triples_removed, &objects_to_validate);
            let all_modified_subjects: HashSet<&SubjectIri> = added_triples_by_subject
                .keys()
                .chain(removed_triples_by_subject.keys())
                .collect();

            // Variable to collect nested objects that need validation.
            let mut nested_objects_to_eval: HashMap<ShapeIri, Vec<(SubjectIri, bool)>> =
                HashMap::new();

            // For each subject, add/remove triples and validate.

            for subject_iri in all_modified_subjects {
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
                    });

                // Apply all triples for that subject to the tracked (shape, subject) pair.
                // Record the changes.
                {
                    let mut orm_subscription = self
                        .orm_subscriptions
                        .get_mut(nuri)
                        .unwrap()
                        .iter_mut()
                        .find(|s| s.session_id == session_id && s.shape_type.shape == shape.iri)
                        .unwrap();

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

                    let validity = {
                        let tracked_subject_opt = orm_subscription
                            .tracked_subjects
                            .get(subject_iri)
                            .and_then(|m| m.get(&shape.iri));
                        let Some(tracked_subject) = tracked_subject_opt else {
                            continue;
                        }; // skip if missing
                        tracked_subject.valid.clone()
                    };

                    // Validate the subject.
                    let need_eval = Self::update_subject_validity(
                        change,
                        &shape,
                        &mut orm_subscription,
                        validity,
                    );

                    // We add the need_eval to be processed next after loop.
                    for (iri, schema_shape, needs_refetch) in need_eval {
                        // Add to nested_objects_to_validate.
                        nested_objects_to_eval
                            .entry(schema_shape)
                            .or_insert_with(Vec::new)
                            .push((iri.clone(), needs_refetch));
                    }
                }
            }

            // Now, we fetch all un-fetched subjects for re-evaluation.
            for (shape_iri, objects_to_eval) in &nested_objects_to_eval {
                let objects_to_fetch = objects_to_eval
                    .iter()
                    .filter(|(_iri, needs_fetch)| *needs_fetch)
                    .map(|(s, _)| s.clone())
                    .collect();

                let orm_subscription =
                    self.get_first_orm_subscription_for(nuri, Some(&shape.iri), Some(&session_id));

                // Extract schema and shape Arc before mutable borrow
                let schema = orm_subscription.shape_type.schema.clone();
                let shape_arc = schema.get(shape_iri).unwrap().clone();

                // Create sparql query
                let shape_query =
                    shape_type_to_sparql(&schema, &shape_iri, Some(objects_to_fetch))?;
                let new_triples =
                    self.query_sparql_construct(shape_query, Some(nuri_to_string(nuri)))?;

                self.process_changes_for_shape_and_session(
                    nuri,
                    shape_arc.clone(),
                    session_id,
                    &new_triples,
                    &vec![],
                    orm_changes,
                )?;

                let objects_not_to_fetch = objects_to_eval
                    .iter()
                    .filter(|(_iri, needs_fetch)| !*needs_fetch)
                    .map(|(s, _)| s.clone())
                    .collect();
                shape_validation_queue.push((shape_arc, objects_not_to_fetch));
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
    ) -> Vec<&Arc<OrmSubscription>> {
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
    ) -> &Arc<OrmSubscription> {
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
    ) -> Result<OrmChanges, NgError> {
        // If we have a specific session, handle only that subscription.
        if let Some(session_id) = only_for_session_id {
            return self.process_changes_for_nuri_and_session(
                &nuri.clone(),
                session_id,
                triples_added,
                triples_removed,
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
        tracked_subjects: &HashMap<String, HashMap<String, Arc<OrmTrackedSubject>>>,
    ) -> Value {
        let mut orm_obj = json!({"id": change.subject_iri});
        let orm_obj_map = orm_obj.as_object_mut().unwrap();
        for pred_schema in &shape.predicates {
            let Some(pred_change) = change.predicates.get(&pred_schema.iri) else {
                continue;
            };
            let property_name = &pred_schema.readablePredicate;
            let is_multi = pred_schema.maxCardinality > 1 || pred_schema.maxCardinality == -1;

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
            self.apply_triple_changes(&shape_triples, &[], nuri, Some(session_id.clone()))?;

        let orm_subscription =
            self.get_first_orm_subscription_for(nuri, Some(&shape_type.shape), Some(&session_id));

        let schema = &orm_subscription.shape_type.schema;
        let root_shape = schema.get(&shape_type.shape).unwrap();
        let Some(_root_changes) = changes.get(&root_shape.iri).map(|s| s.values()) else {
            return Ok(Value::Array(vec![]));
        };

        let mut return_vals: Value = Value::Array(vec![]);
        let return_val_vec = return_vals.as_array_mut().unwrap();

        // For each valid change struct, we build an orm object.
        // The way we get the changes from the tracked subjects is a bit hacky, sorry.
        for (subject_iri, tracked_subjects_by_shape) in &orm_subscription.tracked_subjects {
            if let Some(tracked_subject) = tracked_subjects_by_shape.get(&shape_type.shape) {
                if tracked_subject.valid == OrmTrackedSubjectValidity::Valid {
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
        subscription: &Arc<OrmSubscription>,
        response: AppResponse,
    ) {
        log_debug!(
            "sending orm response for session {}:\n{:?}",
            subscription.session_id,
            &response
        );

        if subscription.sender.is_closed() {
            log_debug!("closed so removing session {}", subscription.session_id);

            self.orm_subscriptions.remove(&subscription.nuri);
        } else {
            subscription.sender.clone().send(response);
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
        let orm_subscription = Arc::new(OrmSubscription {
            shape_type: shape_type.clone(),
            session_id: session_id,
            sender: tx.clone(),
            tracked_subjects: HashMap::new(),
            nuri: nuri.clone(),
        });
        self.orm_subscriptions
            .entry(nuri.clone())
            .or_insert(vec![])
            .push(orm_subscription);

        let _orm_objects = self.create_orm_object_for_shape(nuri, session_id, &shape_type);

        // TODO integrate response

        //self.push_orm_response().await; (only for requester, not all sessions)

        let close = Box::new(move || {
            //log_debug!("CLOSE_CHANNEL of subscription for branch {}", branch_id);
            if !tx.is_closed() {
                tx.close_channel();
            }
        });
        Ok((rx, close))
    }
}

/// Heuristic:
/// Consider a string an IRI if it contains alphanumeric characters and then a colon within the first 13 characters
fn is_iri(s: &str) -> bool {
    lazy_static! {
        static ref IRI_REGEX: Regex = Regex::new(r"^[A-Za-z][A-Za-z0-9+\.\-]{1,12}:").unwrap();
    }
    IRI_REGEX.is_match(s)
}

fn literal_to_sparql_str(var: OrmSchemaDataType) -> Vec<String> {
    match var.literals {
        None => [].to_vec(),
        Some(literals) => literals
            .iter()
            .map(|literal| match literal {
                BasicType::Bool(val) => {
                    if *val {
                        "true".to_string()
                    } else {
                        "false".to_string()
                    }
                }
                BasicType::Num(number) => number.to_string(),
                BasicType::Str(sting) => {
                    if is_iri(sting) {
                        format!("<{}>", sting)
                    } else {
                        format!("\"{}\"", escape_literal(sting))
                    }
                }
            })
            .collect(),
    }
}

pub fn shape_type_to_sparql(
    schema: &OrmSchema,
    shape: &ShapeIri,
    filter_subjects: Option<Vec<String>>,
) -> Result<String, NgError> {
    // Use a counter to generate unique variable names.
    let mut var_counter = 0;
    fn get_new_var_name(counter: &mut i32) -> String {
        let name = format!("v{}", counter);
        *counter += 1;
        name
    }

    // Collect all statements to be added to the construct and where bodies.
    let mut construct_statements = Vec::new();
    let mut where_statements = Vec::new();

    // Keep track of visited shapes while recursing to prevent infinite loops.
    let mut visited_shapes: HashSet<ShapeIri> = HashSet::new();

    // Recursive function to call for (nested) shapes.
    fn process_shape(
        schema: &OrmSchema,
        shape: &OrmSchemaShape,
        subject_var_name: &str,
        construct_statements: &mut Vec<String>,
        where_statements: &mut Vec<String>,
        var_counter: &mut i32,
        visited_shapes: &mut HashSet<String>,
    ) {
        // Prevent infinite recursion on cyclic schemas.
        // TODO: We could handle this as IRI string reference.
        if visited_shapes.contains(&shape.iri) {
            return;
        }
        visited_shapes.insert(shape.iri.clone());

        // Add statements for each predicate.
        for predicate in &shape.predicates {
            let mut union_branches = Vec::new();
            let mut allowed_literals = Vec::new();

            // Predicate constraints might have more than one acceptable data type. Traverse each.
            // It is assumed that constant literals, nested shapes and regular types are not mixed.
            for datatype in &predicate.dataTypes {
                if datatype.valType == OrmSchemaLiteralType::literal {
                    // Collect allowed literals and as strings
                    // (already in SPARQL-format, e.g. `"a astring"`, `<http:ex.co/>`, `true`, or `42`).
                    allowed_literals.extend(literal_to_sparql_str(datatype.clone()));
                } else if datatype.valType == OrmSchemaLiteralType::shape {
                    let shape_iri = &datatype.shape.clone().unwrap();
                    let nested_shape = schema.get(shape_iri).unwrap();

                    // For the current acceptable shape, add CONSTRUCT, WHERE, and recurse.

                    // Each shape option gets its own var.
                    let obj_var_name = get_new_var_name(var_counter);

                    construct_statements.push(format!(
                        "  ?{} <{}> ?{}",
                        subject_var_name, predicate.iri, obj_var_name
                    ));
                    // Those are later added to a UNION, if there is more than one shape.
                    union_branches.push(format!(
                        "  ?{} <{}> ?{}",
                        subject_var_name, predicate.iri, obj_var_name
                    ));

                    // Recurse to add statements for nested object.
                    process_shape(
                        schema,
                        nested_shape,
                        &obj_var_name,
                        construct_statements,
                        where_statements,
                        var_counter,
                        visited_shapes,
                    );
                }
            }

            // The where statement which might be wrapped in OPTIONAL.
            let where_body: String;

            if !allowed_literals.is_empty()
                && !predicate.extra.unwrap_or(false)
                && predicate.minCardinality > 0
            {
                // If we have literal requirements and they are not optional ("extra"),
                // Add CONSTRUCT, WHERE, and FILTER.

                let pred_var_name = get_new_var_name(var_counter);
                construct_statements.push(format!(
                    "  ?{} <{}> ?{}",
                    subject_var_name, predicate.iri, pred_var_name
                ));
                where_body = format!(
                    "  ?{s} <{p}> ?{o} . \n    FILTER (?{o} IN ({lits}))",
                    s = subject_var_name,
                    p = predicate.iri,
                    o = pred_var_name,
                    lits = allowed_literals.join(", ")
                );
            } else if !union_branches.is_empty() {
                // We have nested shape(s) which were already added to CONSTRUCT above.
                // Join them with UNION.

                where_body = union_branches
                    .into_iter()
                    .map(|b| format!("{{\n{}\n}}", b))
                    .collect::<Vec<_>>()
                    .join(" UNION ");
            } else {
                // Regular predicate data type. Just add basic CONSTRUCT and WHERE statements.

                let pred_var_name = get_new_var_name(var_counter);
                construct_statements.push(format!(
                    "  ?{} <{}> ?{}",
                    subject_var_name, predicate.iri, pred_var_name
                ));
                where_body = format!(
                    "  ?{} <{}> ?{}",
                    subject_var_name, predicate.iri, pred_var_name
                );
            }

            // Wrap in optional, if necessary.
            if predicate.minCardinality < 1 {
                where_statements.push(format!("  OPTIONAL {{\n{}\n  }}", where_body));
            } else {
                where_statements.push(where_body);
            };
        }

        visited_shapes.remove(&shape.iri);
    }

    let root_shape = schema.get(shape).ok_or(VerifierError::InvalidOrmSchema)?;

    // Root subject variable name
    let root_var_name = get_new_var_name(&mut var_counter);

    process_shape(
        schema,
        root_shape,
        &root_var_name,
        &mut construct_statements,
        &mut where_statements,
        &mut var_counter,
        &mut visited_shapes,
    );

    // Filter subjects, if present.
    if let Some(subjects) = filter_subjects {
        let subjects_str = subjects
            .iter()
            .map(|s| format!("<{}>", s))
            .collect::<Vec<_>>()
            .join(", ");
        where_statements.push(format!("    FILTER (?s0 IN ({})", subjects_str));
    }

    // Create query from statements.
    let construct_body = construct_statements.join(" .\n");

    let where_body = where_statements.join(" .\n");

    Ok(format!(
        "CONSTRUCT {{\n{}\n}}\nWHERE {{\n{}\n}}",
        construct_body, where_body
    ))
}

/// SPARQL literal escape: backslash, quotes, newlines, tabs.
fn escape_literal(lit: &str) -> String {
    let mut out = String::with_capacity(lit.len() + 4);
    for c in lit.chars() {
        match c {
            '\\' => out.push_str("\\\\"),
            '\"' => out.push_str("\\\""),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            _ => out.push(c),
        }
    }
    return out;
}

pub fn group_by_subject_for_shape<'a>(
    shape: &OrmSchemaShape,
    triples: &'a [Triple],
    allowed_subjects: &[String],
) -> HashMap<String, Vec<&'a Triple>> {
    let mut triples_by_subject: HashMap<String, Vec<&Triple>> = HashMap::new();
    let allowed_preds_set: HashSet<&str> =
        shape.predicates.iter().map(|p| p.iri.as_str()).collect();
    let allowed_subject_set: HashSet<&str> = allowed_subjects.iter().map(|s| s.as_str()).collect();
    for triple in triples {
        // triple.subject must be in allowed_subjects (or allowed_subjects empty)
        // and triple.predicate must be in allowed_preds.
        if allowed_preds_set.contains(triple.predicate.as_str()) {
            // filter subjects if list provided
            let subj = match &triple.subject {
                Subject::NamedNode(n) => n.as_ref(),
                _ => continue,
            };
            // Subject must be in allowed subjects (or allowed_subjects is empty).
            if allowed_subject_set.is_empty() || allowed_subject_set.contains(subj.as_str()) {
                triples_by_subject
                    .entry(subj.to_string())
                    .or_insert_with(Vec::new)
                    .push(triple);
            }
        }
    }

    return triples_by_subject;
}

fn nuri_to_string(nuri: &NuriV0) -> String {
    // Get repo_id and overlay_id from the nuri
    let repo_id = nuri.target.repo_id();
    let overlay_id = if let Some(overlay_link) = &nuri.overlay {
        overlay_link.clone().try_into().unwrap()
    } else {
        // Default overlay for the repo
        OverlayId::outer(repo_id)
    };
    let graph_name = NuriV0::repo_graph_name(repo_id, &overlay_id);
    graph_name
}
