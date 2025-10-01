// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::collections::HashMap;
use std::collections::HashSet;
use std::hash::Hash;
use std::rc::Weak;

use async_std::task::current;
use futures::channel::mpsc;

use futures::SinkExt;
use lazy_static::lazy_static;
use ng_net::orm::BasicType;
pub use ng_net::orm::OrmDiff;
use ng_net::orm::OrmSchemaLiteralType;
pub use ng_net::orm::OrmShapeType;
use ng_net::orm::OrmShapeTypeRef;
use ng_net::orm::OrmSubscription;
use ng_net::orm::OrmTrackedPredicate;
use ng_net::orm::OrmTrackedPredicateChanges;
use ng_net::orm::OrmTrackedSubjectAndShape;
use ng_net::orm::OrmTrackedSubjectChange;
use ng_net::orm::OrmTrackedSubjectValidity;
use ng_net::orm::{OrmSchemaDataType, OrmSchemaShape};
use ng_net::{app_protocol::*, orm::OrmSchema};
use ng_net::{
    types::*,
    utils::{Receiver, Sender},
};
use ng_oxigraph::oxigraph::sparql::{results::*, Query, QueryResults};
use ng_oxigraph::oxrdf::LiteralRef;
use ng_oxigraph::oxrdf::NamedNode;
use ng_oxigraph::oxrdf::Subject;
use ng_oxigraph::oxrdf::Triple;
use ng_repo::errors::NgError;
use ng_repo::errors::VerifierError;
use ng_repo::log::*;
use regex::Regex;
use serde::de::IntoDeserializer;
use serde_json::json;
use serde_json::Value;

use crate::types::*;
use crate::verifier::*;

impl Verifier {
    pub fn sparql_construct(
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

    fn apply_changes_from_triples(
        &mut self,
        scope: &NuriV0,
        schema: &OrmSchema,
        root_shape: &OrmSchemaShape,
        triples_added: &Vec<Triple>,
        triples_removed: &Vec<Triple>,
    ) -> HashMap<String, HashMap<String, OrmTrackedSubjectChange>> {
        let tracked_subjects = self.orm_tracked_subjects;

        // === Helper functions ===

        fn group_by_subject_for_shape<'a>(
            shape: &'a OrmSchemaShape,
            triples: &'a Vec<Triple>,
            allowed_subjects: &Vec<String>,
        ) -> HashMap<String, Vec<&'a Triple>> {
            let mut triples_by_pred: HashMap<String, Vec<&Triple>> = HashMap::new();
            let allowed_preds: HashSet<&str> =
                shape.predicates.iter().map(|p| p.iri.as_str()).collect();
            let allowed_objs: HashSet<&String> = allowed_subjects.iter().collect();
            for triple in triples {
                // triple.subject must be in allowed_subjects (or allowed_subjects empty)
                // and triple.predicate must be in allowed_preds.
                if (allowed_objs.is_empty() || allowed_objs.contains(&triple.subject.to_string()))
                    && allowed_preds.contains(triple.predicate.as_str())
                {
                    triples_by_pred
                        .entry(triple.predicate.as_str().to_string())
                        .or_insert_with(|| vec![])
                        .push(triple);
                }
            }
            // Based on those triples, group by subject.
            let mut triples_by_subject: HashMap<String, Vec<&Triple>> = HashMap::new();
            for triple in triples {
                let subject_iri = match &triple.subject {
                    Subject::NamedNode(node) => node.as_str(),
                    _ => continue, // Won't happen.
                };
                triples_by_subject
                    .entry(subject_iri.to_string())
                    .or_insert_with(|| vec![])
                    .push(&triple);
            }
            return triples_by_subject;
        }

        /// Add all triples to `changes`
        /// Returns predicates to nested objects that were touched and need processing.
        /// Assumes all triples have same subject.
        fn add_remove_triples(
            shape: &OrmSchemaShape,
            subject_iri: &String,
            triples_added: &Vec<&Triple>,
            triples_removed: &Vec<&Triple>,
            tracked_subjects: &HashMap<String, HashMap<String, OrmTrackedSubjectAndShape>>,
            subject_changes: &OrmTrackedSubjectChange,
        ) {
            let tracked_shapes_for_subject = tracked_subjects
                .entry(subject_iri.clone())
                .or_insert_with(|| HashMap::new());

            let tracked_subject = tracked_shapes_for_subject
                .entry(subject_iri.clone())
                .or_insert_with(|| OrmTrackedSubjectAndShape {
                    tracked_predicates: HashMap::new(),
                    parents: HashMap::new(),
                    valid: ng_net::orm::OrmTrackedSubjectValidity::NotEvaluated,
                    subject_iri,
                    shape,
                });

            // Process added triples.
            // For each triple, check matching predicates in shape.
            // keeping track of value count (for later validations).
            // In parallel, we keep track of the values added (tracked_changes)
            for triple in triples_added {
                for schema_predicate in &shape.predicates {
                    if schema_predicate.iri != triple.predicate.as_str() {
                        // Triple does not match predicate.
                        continue;
                    }
                    // Predicate schema constraint matches this triple.

                    // Add tracked predicate or increase cardinality
                    let tp = tracked_subject
                        .tracked_predicates
                        .entry(schema_predicate.iri.to_string())
                        .or_insert_with(|| OrmTrackedPredicate {
                            current_cardinality: 0,
                            schema: schema_predicate,
                            tracked_children: Vec::new(),
                            current_literals: None,
                        });
                    tp.current_cardinality += 1;

                    let obj_term = oxrdf_term_to_orm_basic_type(&triple.object);

                    // Keep track of the changed values too.
                    let pred_changes = subject_changes
                        .predicates
                        .entry(schema_predicate.iri.clone())
                        .or_insert_with(|| OrmTrackedPredicateChanges {
                            tracked_predicate: &tp,
                            values_added: Vec::new(),
                            values_removed: Vec::new(),
                        });

                    pred_changes.values_added.push(obj_term.clone());

                    // If value type is literal, we need to add the current value to the tracked predicate.
                    if tp
                        .schema
                        .dataTypes
                        .iter()
                        .any(|dt| dt.valType == OrmSchemaLiteralType::literal)
                    {
                        if let Some(current_literals) = tp.current_literals {
                            current_literals.push(obj_term);
                        } else {
                            tp.current_literals.insert(vec![obj_term]);
                        }
                    }
                }
            }

            // Process removed triples.
            for triple in triples_removed {
                let pred_iri = triple.predicate.as_str();

                // Only adjust if we had tracked state.
                let Some(tp) = tracked_subjects
                    .get_mut(subject_iri)
                    .map(|tss| tss.get(&shape.iri))
                    .flatten()
                    .map(|ts| ts.tracked_predicates.get(pred_iri))
                    .flatten()
                else {
                    continue;
                };

                // The cardinality might become -1 or 0. We will remove them from the tracked predicates during validation.
                tp.current_cardinality -= 1;

                let Some(pred_changes) = subject_changes.predicates.get(pred_iri) else {
                    continue;
                };

                let val_removed = oxrdf_term_to_orm_basic_type(&triple.object);
                pred_changes.values_removed.push(val_removed.clone());

                // If value type is literal, we need to remove the current value from the tracked predicate.
                if tp
                    .schema
                    .dataTypes
                    .iter()
                    .any(|dt| dt.valType == OrmSchemaLiteralType::literal)
                {
                    if let Some(current_literals) = &mut tp.current_literals {
                        // Remove obj_val from current_literals in-place
                        current_literals.retain(|val| *val != val_removed);
                    } else {
                        tp.current_literals = Some(vec![val_removed]);
                    }
                }
            }
        }

        /// Check the validity of a subject.
        /// Might return nested objects that need to be validated.
        /// Assumes all triples to be of same subject.
        fn check_subject_validity<'a>(
            s_change: &'a OrmTrackedSubjectChange<'a>,
            shape: &OrmSchemaShape,
            schema: &'a OrmSchema,
            tracked_subjects: &HashMap<String, HashMap<String, OrmTrackedSubjectAndShape<'a>>>,
            previous_validity: OrmTrackedSubjectValidity,
        ) -> (
            OrmTrackedSubjectValidity,
            // Vec<subject_iri, shape, needs_refetch>
            Vec<(&'a String, &'a OrmSchemaShape, bool)>,
        ) {
            // Check 1) If there are no changes, there is nothing to do.
            if s_change.predicates.is_empty() {
                return (previous_validity, vec![]);
            }

            let previous_validity = s_change.valid;
            let mut new_validity = OrmTrackedSubjectValidity::Valid;
            // Helper to set own validity which does not overwrite worse invalids.
            let mut set_validity = |new_val: OrmTrackedSubjectValidity| {
                if new_val == OrmTrackedSubjectValidity::Invalid {
                    new_validity = OrmTrackedSubjectValidity::Invalid;
                    // Remove all tracked predicates
                    s_change.tracked_subjects.tracked_predicates = HashMap::new();
                } else if new_val == OrmTrackedSubjectValidity::NotEvaluated
                    && new_validity != OrmTrackedSubjectValidity::Invalid
                {
                    new_validity = OrmTrackedSubjectValidity::NotEvaluated;
                }
            };

            let tracked_subject = tracked_subjects
                .get(&s_change.subject_iri)
                .unwrap()
                .get(&shape.iri)
                .unwrap();

            // Check 2) If all parents are untracked, return untracked.
            if tracked_subject
                .parents
                .values()
                .all(|(parent, tracked)| !tracked)
            {
                // Remove tracked predicates and set untracked.
                tracked_subject.tracked_predicates = HashMap::new();
                tracked_subject.valid = OrmTrackedSubjectValidity::Untracked;
                return (OrmTrackedSubjectValidity::Untracked, vec![]);
            }

            // Check 3) If there is an infinite loop of parents pointing back to us, return invalid.
            // Create a set of visited parents to detect cycles.
            if has_cycle(tracked_subject, &mut HashSet::new()) {
                // Remove tracked predicates and set invalid.
                tracked_subject.tracked_predicates = HashMap::new();
                tracked_subject.valid = OrmTrackedSubjectValidity::Invalid;
                return (OrmTrackedSubjectValidity::Invalid, vec![]);
            }

            // Keep track of objects that need to be validated against a shape to fetch and validate.
            let mut new_unknowns: Vec<(&String, &OrmSchemaShape, bool)> = vec![];

            // Check 4) Validate subject against each predicate in shape.
            for p_schema in shape.predicates.iter() {
                let p_change = s_change.predicates.get(&p_schema.iri);
                let tracked_pred = p_change.map(|pc| pc.tracked_predicate);

                let count = tracked_pred
                    .map_or_else(|| 0, |tp: &OrmTrackedPredicate<'_>| tp.current_cardinality);

                // Check 4.1) Cardinality
                if count < p_schema.minCardinality {
                    set_validity(OrmTrackedSubjectValidity::Invalid);
                    if count <= 0 {
                        // If cardinality is 0, we can remove the tracked predicate.
                        tracked_subject.tracked_predicates.remove(&p_schema.iri);
                    }
                    break;
                // Check 4.2) Cardinality too high and extra values not allowed.
                } else if count > p_schema.maxCardinality
                    && p_schema.maxCardinality != -1
                    && p_schema.extra != Some(true)
                {
                    // If cardinality is too high and no extra allowed, invalid.
                    set_validity(OrmTrackedSubjectValidity::Invalid);
                    break;
                // Check 4.3) Literal present types and valid.
                } else if p_schema
                    .dataTypes
                    .iter()
                    .any(|dt| dt.valType == OrmSchemaLiteralType::literal)
                {
                    // If we have literals, check if all required literals are present.
                    let required_literals: Vec<BasicType> = p_schema
                        .dataTypes
                        .iter()
                        .flat_map(|dt| dt.literals)
                        .flatten()
                        .collect();

                    // Early stop: If no extra values allowed but the sizes
                    // between required and given values mismatches.
                    if !p_schema.extra.unwrap_or(false)
                        && (required_literals.len().into()
                            != tracked_pred.map_or(0, |p| p.current_cardinality))
                    {
                        set_validity(OrmTrackedSubjectValidity::Invalid);
                        break;
                    }

                    // Check that each required literal is present.
                    for required_literal in required_literals {
                        // Is tracked predicate present?
                        if !tracked_pred
                            .iter()
                            .flat_map(|tp| tp.current_literals)
                            .flatten()
                            .any(|literal| literal == required_literal)
                        {
                            set_validity(OrmTrackedSubjectValidity::Invalid);
                            break;
                        }
                    }
                // Check 4.4) Nested shape correct.
                } else if p_schema
                    .dataTypes
                    .iter()
                    .any(|dt| dt.valType == OrmSchemaLiteralType::shape)
                {
                    // If we have a nested shape, we need to check if the nested object is tracked and valid.

                    // First, Count valid, invalid, unknowns, and untracked
                    let counts = tracked_pred
                        .iter()
                        .flat_map(|tp| tp.tracked_children)
                        .map(|tc| {
                            tc.upgrade().map(|tc| {
                                if tc.valid == OrmTrackedSubjectValidity::Valid {
                                    (1, 0, 0, 0)
                                } else if tc.valid == OrmTrackedSubjectValidity::Invalid {
                                    (0, 1, 0, 0)
                                } else if tc.valid == OrmTrackedSubjectValidity::NotEvaluated {
                                    (0, 0, 1, 0)
                                } else if tc.valid == OrmTrackedSubjectValidity::Untracked {
                                    (0, 0, 0, 1)
                                } else {
                                    (0, 0, 0, 0)
                                }
                            })
                        })
                        .flatten()
                        .fold((0, 0, 0, 0), |(v1, i1, u1, ut1), o| {
                            (v1 + o.0, i1 + o.1, u1 + o.2, ut1 + o.3)
                        });

                    if counts.1 > 0 && p_schema.extra != Some(true) {
                        // If we have at least one invalid nested object and no extra allowed, invalid.
                        set_validity(OrmTrackedSubjectValidity::Invalid);
                        break;
                    } else if counts.0 < p_schema.minCardinality {
                        // If we have not enough valid nested objects, invalid.
                        set_validity(OrmTrackedSubjectValidity::Invalid);
                        break;
                    } else if counts.3 > 0 {
                        // If we have untracked nested objects, we need to fetch them and validate.
                        set_validity(OrmTrackedSubjectValidity::NotEvaluated);
                        // Add them to the list of unknowns to fetch and validate.
                        for o in tracked_pred
                            .iter()
                            .flat_map(|tp| tp.tracked_children.iter())
                        {
                            if let Some(tc) = o.upgrade() {
                                if tc.valid == OrmTrackedSubjectValidity::Untracked {
                                    new_unknowns.push((tc.subject_iri, tc.shape, true));
                                }
                            }
                        }
                    } else if counts.2 > 0 {
                        // If we have unknown nested objects, we need to wait for their evaluation.
                        set_validity(OrmTrackedSubjectValidity::NotEvaluated);
                    } else {
                        // All nested objects are valid and cardinality is correct.
                        // We are valid with this predicate.
                    }
                // Check 4.5) Data types correct.
                } else {
                    // Check if the data type is correct.
                    let allowed_types: Vec<OrmSchemaLiteralType> =
                        p_schema.dataTypes.iter().map(|dt| dt.valType).collect();
                    // For each new value, check that data type is in allowed_types.
                    for val_added in p_change.iter().map(|pc| pc.values_added).flatten() {
                        let matches = match val_added {
                            BasicType::Bool(_) => allowed_types
                                .iter()
                                .any(|t| *t == OrmSchemaLiteralType::boolean),
                            BasicType::Num(_) => allowed_types
                                .iter()
                                .any(|t| *t == OrmSchemaLiteralType::number),
                            BasicType::Str(_) => allowed_types.iter().any(|t| {
                                *t == OrmSchemaLiteralType::string
                                    || *t == OrmSchemaLiteralType::iri
                            }),
                        };
                        if !matches {
                            set_validity(OrmTrackedSubjectValidity::Invalid);
                            break;
                        }
                    }
                    // Break if validity has become invalid.
                    if new_validity == OrmTrackedSubjectValidity::Invalid {
                        break;
                    }
                };
            }

            // If we are invalid, we can discard new unknowns again - they won't be kept in memory.
            // We need to inform all children (by returning them for later evaluation), to untrack them.
            // TODO: Collect info about all children to untrack them.
            if new_validity == OrmTrackedSubjectValidity::Invalid {
                return (OrmTrackedSubjectValidity::Invalid, vec![]);
            } else if new_validity == OrmTrackedSubjectValidity::Valid
                && previous_validity != OrmTrackedSubjectValidity::Valid
            {
                // TODO
                // If this subject became valid, we need to refetch this subject.
            }
            // TODO...
            // If validity changed, parents need to be re-evaluated.
            if new_validity != previous_validity {
                // TODO
            }

            // TODO
            return (new_validity, new_unknowns);
        }

        // === Validation ===

        // FILO queue: To validate object changes (nested objects first). Strings are object IRIs.
        let mut shape_validation_queue: Vec<(&OrmSchemaShape, Vec<String>)> = vec![];
        // Add root shape for first validation run.
        shape_validation_queue.push((&root_shape, vec![]));

        // Structure to store changes in. By shape iri > subject iri > OrmTrackedSubjectChange
        let mut shape_and_subject_changes: HashMap<
            String,
            HashMap<String, OrmTrackedSubjectChange>,
        > = HashMap::new();

        // Process queue of shapes and subjects to validate.
        while let Some((shape, objects_to_validate)) = shape_validation_queue.pop() {
            // For a given shape, we evaluate every subject against that shape.

            // Collect triples relevant for validation.
            let added_triples_by_subject =
                group_by_subject_for_shape(shape, triples_added, &objects_to_validate);
            let removed_triples_by_subject =
                group_by_subject_for_shape(shape, triples_removed, &objects_to_validate);
            let all_modified_subjects: HashSet<&String> = added_triples_by_subject
                .keys()
                .chain(removed_triples_by_subject.keys())
                .collect();

            // Use to collect nested objects that need validation.
            // First string is shape IRI, second are object IRIs.
            let nested_objects_to_validate: HashMap<String, Vec<String>> = HashMap::new();

            // For each subject, add/remove triples and validate.
            for subject_iri in all_modified_subjects {
                let triples_added_for_subj = added_triples_by_subject
                    .get(subject_iri)
                    .unwrap_or(&vec![])
                    .to_vec();
                let triples_removed_for_subj = removed_triples_by_subject
                    .get(subject_iri)
                    .unwrap_or(&vec![])
                    .to_vec();

                // Get or create change object for (shape, subject) pair.
                let change = shape_and_subject_changes
                    .entry(shape.iri.clone())
                    .or_insert_with(|| HashMap::new())
                    .entry(subject_iri.clone())
                    .or_insert_with(|| OrmTrackedSubjectChange {
                        subject_iri: subject_iri.clone(),
                        predicates: HashMap::new(),
                        valid: OrmTrackedSubjectValidity::NeedsFetch,
                    });

                // Apply all triples for that subject to the tracked (shape, subject) pair.
                // Record the changes.
                add_remove_triples(
                    shape,
                    &subject_iri,
                    &triples_added_for_subj,
                    &triples_removed_for_subj,
                    &tracked_subjects,
                    &change,
                );

                let tracked_subject = tracked_subjects.get(subject_iri).unwrap();
                // Validate the subject.
                let (new_validity, new_unknowns) = check_subject_validity(
                    &change,
                    shape,
                    schema,
                    tracked_subjects,
                    tracked_subject,
                );

                // TODO: Add logic to fetch un-fetched objects after validation.
                // and return logic to add unprocessed nested objects after validation.

                // We add the new_unknowns to be processed next
                for (iri, schema) in new_unknowns {
                    // Add to nested_objects_to_validate.
                    nested_objects_to_validate
                        .entry(schema.iri.clone())
                        .or_insert_with(|| vec![])
                        .push(iri.clone());
                }
            }

            // Now, we add all objects that need re-evaluation to the queue.
            for (shape_iri, objects) in nested_objects_to_validate {
                shape_validation_queue.push((schema.get(&shape_iri).unwrap(), objects));
            }
        }

        return shape_and_subject_changes;
    }

    fn create_orm_from_triples(
        &mut self,
        scope: &NuriV0,
        schema: &OrmSchema,
        shape: &OrmSchemaShape,
        triples: &Vec<Triple>,
    ) -> Result<Value, NgError> {
        let changes = self.apply_changes_from_triples(scope, schema, shape, triples, &vec![]);

        let root_changes = changes.get(&shape.iri).unwrap().values();
        let valid_roots = root_changes.filter(|v| v.valid == OrmTrackedSubjectValidity::Valid);

        let mut return_vals: Value = Value::Array(vec![]);
        let return_val_vec = return_vals.as_array_mut().unwrap();

        fn create_value_from_change(
            change: &OrmTrackedSubjectChange,
            changes: &HashMap<String, HashMap<String, OrmTrackedSubjectChange<'_>>>,
            shape: &OrmSchemaShape,
            schema: &OrmSchema,
        ) -> Value {
            let mut new_val = json!({"id": change.subject_iri});
            let new_val_map = new_val.as_object_mut().unwrap();
            for pred_schema in &shape.predicates {
                let property_name = pred_schema.readablePredicate.clone();
                let is_multi = pred_schema.maxCardinality > 1;
                let pred_change = change.predicates.get(&pred_schema.iri).unwrap();

                if pred_schema
                    .dataTypes
                    .iter()
                    .any(|dt| dt.valType == OrmSchemaLiteralType::shape)
                {
                    // Helper to create nested objects.
                    let get_nested_value = |object_iri: &String| {
                        let shape_iris: Vec<String> = pred_schema
                            .dataTypes
                            .iter()
                            .flat_map(|dt| dt.shape.clone())
                            .collect();

                        // Find subject_change for this subject. There exists at least one (shape, subject).
                        let nested_subject_change = shape_iris
                            .iter()
                            .find_map(|shape_iri| {
                                changes
                                    .get(shape_iri)
                                    .and_then(|subject_changes| subject_changes.get(object_iri))
                            })
                            .unwrap();

                        // Recurse
                        create_value_from_change(
                            nested_subject_change,
                            changes,
                            schema.get(&nested_subject_change.subject_iri).unwrap(),
                            schema,
                        )
                    };

                    if is_multi {
                        // Add each value to a new object (predicate being object IRIs).
                        let mut nested_objects = json!({"id": change.subject_iri});
                        let nested_objects_map = nested_objects.as_object_mut().unwrap();

                        for new_val in &pred_change.values_added {
                            if let BasicType::Str(object_iri) = new_val {
                                new_val_map
                                    .insert(object_iri.clone(), get_nested_value(&object_iri));
                            }
                        }
                    } else {
                        if let Some(BasicType::Str(object_iri)) = pred_change.values_added.get(0) {
                            new_val_map.insert(property_name.clone(), get_nested_value(object_iri));
                        }
                    }
                } else {
                    if is_multi {
                        // Add values as array.
                        new_val_map.insert(
                            property_name,
                            Value::Array(
                                pred_change.values_added.iter().map(|v| json!(v)).collect(),
                            ),
                        );
                    } else {
                        // Add value as primitive, if present.
                        if let Some(val) = pred_change.values_added.get(0) {
                            new_val_map.insert(
                                property_name,
                                match val {
                                    BasicType::Bool(b) => json!(b),
                                    BasicType::Num(n) => json!(n),
                                    BasicType::Str(s) => json!(s),
                                },
                            );
                        }
                    }
                }
            }
            return new_val;
        }

        for root_change in valid_roots {
            let new_val = create_value_from_change(root_change, &changes, shape, schema);
            return_val_vec.push(new_val);
        }

        return Ok(return_vals);
        //
    }

    // Collect result
    // For all valid tracked_subjects, build an object from the tracked_subject_changes.

    pub(crate) async fn orm_update(&mut self, scope: &NuriV0, patch: GraphTransaction) {}

    pub(crate) async fn orm_frontend_update(
        &mut self,
        scope: &NuriV0,
        shape_id: String,
        diff: OrmDiff,
    ) {
        log_info!("frontend_update_orm {:?} {} {:?}", scope, shape_id, diff);
    }

    pub(crate) async fn push_orm_response(
        &mut self,
        scope: &NuriV0,
        schema_iri: &String,
        response: AppResponse,
    ) {
        log_info!(
            "push_orm_response {:?} {} {:?}",
            scope,
            schema_iri,
            self.orm_tracked_subjects
        );
        if let Some(shapes) = self.orm_tracked_subjects.get_mut(scope) {
            if let Some(sessions) = shapes.get_mut(schema_iri) {
                let mut sessions_to_close: Vec<u64> = vec![];
                for (session_id, subscription) in sessions.iter_mut() {
                    if subscription.sender.is_closed() {
                        log_debug!("closed so removing session {}", session_id);
                        sessions_to_close.push(*session_id);
                    } else {
                        let _ = subscription.sender.send(response.clone()).await;
                    }
                }
                for session_id in sessions_to_close.iter() {
                    sessions.remove(session_id);
                }
            }
        }
    }

    pub(crate) async fn start_orm(
        &mut self,
        nuri: &NuriV0,
        shape_type: OrmShapeType,
        session_id: u64,
    ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
        let (tx, rx) = mpsc::unbounded::<AppResponse>();

        // TODO: Validate schema:
        // If multiple data types are present for the same predicate, they must be of of the same type.
        // All referenced shapes must be available.

        // Keep track of connections here.
        self.orm_tracked_subjects.insert(
            nuri.clone(),
            HashMap::from([(
                shape_type.shape.clone(),
                HashMap::from([(
                    session_id,
                    OrmSubscription {
                        sender: tx.clone(),
                        tracked_objects: HashMap::new(),
                    },
                )]),
            )]),
        );

        // Add shape to registry or increase ref count.
        if let Some(shape_ref) = self.orm_shape_types.get_mut(&shape_type.shape) {
            shape_ref.ref_count += 1;
        } else {
            self.orm_shape_types.insert(
                shape_type.shape.clone(),
                OrmShapeTypeRef {
                    ref_count: 1,
                    shape_type,
                },
            );
        }

        let shape_query =
            sparql_construct_from_orm_shape_type(&shape_type.schema, &shape_type.shape, None)?;
        let shape_triples = self.sparql_construct(shape_query, Some(nuri))?;
        let orm_object = self.create_orm_from_triples(
            nuri,
            &shape_type.schema,
            &shape_type.shape,
            &shape_triples,
        );

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
                        format!("<{}>", escape_iri(sting))
                    } else {
                        format!("\"{}\"", escape_literal(sting))
                    }
                }
            })
            .collect(),
    }
}

pub fn sparql_construct_from_orm_shape_type(
    schema: &OrmSchema,
    shape: &String,
    // TODO: Remove max_recursion
    max_recursion: Option<u8>,
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
    // TODO: Update type
    let mut visited_shapes: HashMap<String, u8> = HashMap::new();

    // Recursive function to call for (nested) shapes.
    fn process_shape(
        schema: &OrmSchema,
        shape: &OrmSchemaShape,
        subject_var_name: &str,
        construct_statements: &mut Vec<String>,
        where_statements: &mut Vec<String>,
        var_counter: &mut i32,
        visited_shapes: &mut HashMap<String, u8>,
        max_recursion: u8,
    ) {
        // Prevent infinite recursion on cyclic schemas.
        // Keep track of the number of shape occurrences and return if it's larger than max_recursion.
        // For the last recursion, we could use by-reference queries but that could be for the future.
        let current_self_recursion_depth = visited_shapes.get(&shape.iri).unwrap_or(&0);
        if *current_self_recursion_depth > max_recursion {
            return;
        } else {
            visited_shapes.insert(shape.iri.clone(), current_self_recursion_depth + 1);
        }

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
                    if let Some(shape_id) = &datatype.shape {
                        if let Some(nested_shape) = schema.get(shape_id) {
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
                                max_recursion,
                            );
                        }
                    }
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
        max_recursion.unwrap_or(1),
    );

    // Create query from statements.
    let construct_body = construct_statements.join(" .\n");
    let where_body = where_statements.join(" .\n");
    Ok(format!(
        "CONSTRUCT {{\n{}\n}}\nWHERE {{\n{}\n}}",
        construct_body, where_body
    ))
}

/// Escape an IRI fragment if needed (very conservative, only wrap with <...>). Assumes input already a full IRI.
fn escape_iri(iri: &str) -> String {
    format!("<{}>", iri)
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

/// Converts an oxrdf::Term to an orm::Term
fn oxrdf_term_to_orm_term(term: &ng_oxigraph::oxrdf::Term) -> ng_net::orm::Term {
    match term {
        ng_oxigraph::oxrdf::Term::NamedNode(node) => {
            ng_net::orm::Term::Ref(node.as_str().to_string())
        }
        ng_oxigraph::oxrdf::Term::BlankNode(node) => {
            ng_net::orm::Term::Ref(node.as_str().to_string())
        }
        ng_oxigraph::oxrdf::Term::Literal(literal) => {
            // Check the datatype to determine how to convert
            match literal.datatype().as_str() {
                // Check for string first, this is the most common.
                "http://www.w3.org/2001/XMLSchema#string" => {
                    ng_net::orm::Term::Str(literal.value().to_string())
                }
                "http://www.w3.org/2001/XMLSchema#boolean" => {
                    match literal.value().parse::<bool>() {
                        Ok(b) => ng_net::orm::Term::Bool(b),
                        Err(_) => ng_net::orm::Term::Str(literal.value().to_string()),
                    }
                }
                "http://www.w3.org/2001/XMLSchema#integer"
                | "http://www.w3.org/2001/XMLSchema#decimal"
                | "http://www.w3.org/2001/XMLSchema#double"
                | "http://www.w3.org/2001/XMLSchema#float"
                | "http://www.w3.org/2001/XMLSchema#int"
                | "http://www.w3.org/2001/XMLSchema#long"
                | "http://www.w3.org/2001/XMLSchema#short"
                | "http://www.w3.org/2001/XMLSchema#byte"
                | "http://www.w3.org/2001/XMLSchema#unsignedInt"
                | "http://www.w3.org/2001/XMLSchema#unsignedLong"
                | "http://www.w3.org/2001/XMLSchema#unsignedShort"
                | "http://www.w3.org/2001/XMLSchema#unsignedByte" => {
                    match literal.value().parse::<f64>() {
                        Ok(n) => ng_net::orm::Term::Num(n),
                        Err(_) => ng_net::orm::Term::Str(literal.value().to_string()),
                    }
                }
                _ => ng_net::orm::Term::Str(literal.value().to_string()),
            }
        }
        ng_oxigraph::oxrdf::Term::Triple(triple) => {
            // For RDF-star triples, convert to string representation
            ng_net::orm::Term::Str(triple.to_string())
        }
    }
}

fn oxrdf_term_to_orm_basic_type(term: &ng_oxigraph::oxrdf::Term) -> BasicType {
    match oxrdf_term_to_orm_term(term) {
        ng_net::orm::Term::Str(s) => BasicType::Str(s),
        ng_net::orm::Term::Num(n) => BasicType::Num(n),
        ng_net::orm::Term::Bool(b) => BasicType::Bool(b),
        ng_net::orm::Term::Ref(b) => BasicType::Str(b), // Treat IRIs as strings
    }
}

fn has_cycle(subject: &OrmTrackedSubjectAndShape, visited: &mut HashSet<String>) -> bool {
    if visited.contains(subject.subject_iri) {
        return true;
    }
    visited.insert(subject.subject_iri.clone());
    for (_parent_iri, (parent_subject, _)) in &subject.parents {
        if has_cycle(parent_subject, visited) {
            return true;
        }
    }
    visited.remove(subject.subject_iri);
    false
}
