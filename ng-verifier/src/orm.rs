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
use ng_net::orm::OrmTrackedSubject;
use ng_net::orm::OrmTrackedSubjectChange;
use ng_net::orm::OrmTrackedSubjectValidity;
use ng_net::orm::Term;
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
use ng_oxigraph::oxrdf::Term;
use ng_oxigraph::oxrdf::Triple;
use ng_repo::errors::NgError;
use ng_repo::errors::VerifierError;
use ng_repo::log::*;
use regex::Regex;

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
        shape: &String,
        triples_added: &Vec<Triple>,
        triples_removed: &Vec<Triple>,
    ) {
        let tracked_subjects: HashMap<String, HashMap<String, OrmTrackedSubject>> =
            self.orm_tracked_subjects;
        // Structure to store changes in.
        let mut subject_changes: HashMap<String, OrmTrackedSubjectChange> = HashMap::new();

        // Group triples by predicate (only keep predicates defined in the shape). Drop others.
        let mut added_triples_by_pred: HashMap<String, Vec<Triple>> = HashMap::new();
        let Some(shape_def) = schema.get(shape) else {
            log_err!(
                "Shape {} not found in schema when grouping triples by predicate",
                shape
            );
            return;
        };

        // Collect allowed predicate IRIs for this shape
        let allowed: std::collections::HashSet<&str> = shape_def
            .predicates
            .iter()
            .map(|p| p.iri.as_str())
            .collect();

        for triple in triples_added {
            if allowed.contains(triple.predicate.as_str()) {
                added_triples_by_pred
                    .entry(triple.predicate.as_str().to_string())
                    .or_insert_with(|| vec![])
                    .push(*triple);
            }
        }

        // Based on those triples, group by subject.
        let mut added_triples_by_subject: HashMap<String, Vec<Triple>> = HashMap::new();
        for triple in triples_added {
            let subject_iri = match &triple.subject {
                Subject::NamedNode(node) => node.as_str(),
                _ => continue, // Won't happen.
            };
            added_triples_by_subject
                .entry(subject_iri.to_string())
                .or_insert_with(|| vec![])
                .push(triple.clone());
        }

        // Do the same for removed ones.
        let mut removed_triples_by_pred: HashMap<String, Vec<Triple>> = HashMap::new();
        // Collect allowed predicate IRIs for this shape
        let allowed: std::collections::HashSet<&str> = shape_def
            .predicates
            .iter()
            .map(|p| p.iri.as_str())
            .collect();

        for triple in triples_removed {
            if allowed.contains(triple.predicate.as_str()) {
                removed_triples_by_pred
                    .entry(triple.predicate.as_str().to_string())
                    .or_insert_with(|| vec![])
                    .push(*triple);
            }
        }
        let mut removed_triples_by_subject: HashMap<String, Vec<Triple>> = HashMap::new();
        for triple in triples_removed {
            let subject_iri = match &triple.subject {
                Subject::NamedNode(node) => node.as_str(),
                _ => continue, // Won't happen.
            };
            removed_triples_by_subject
                .entry(subject_iri.to_string())
                .or_insert_with(|| vec![])
                .push(triple.clone());
        }

        // Assumes all triples have same subject.
        fn orm_from_triple_for_level<'a>(
            shape: &OrmSchemaShape,
            subject_iri: &String,
            triples_added: &Vec<Triple>,
            triples_removed: &Vec<Triple>,
            tracked_subjects: &HashMap<String, HashMap<String, OrmTrackedSubject<'a>>>,
            changes: &HashMap<String, OrmTrackedSubjectChange>,
        ) -> (
            Vec<&'a OrmTrackedPredicateChanges<'a>>,
            Vec<&'a OrmTrackedPredicateChanges<'a>>,
        ) {
            let tracked_shapes_for_subject = tracked_subjects
                .entry(subject_iri.clone())
                .or_insert_with(|| HashMap::new());

            let tracked_subject = tracked_shapes_for_subject
                .entry(subject_iri.clone())
                .or_insert_with(|| OrmTrackedSubject {
                    tracked_predicates: HashMap::new(),
                    parents: HashMap::new(),
                    valid: ng_net::orm::OrmTrackedSubjectValidity::Unknown,
                    subj_iri: subject_iri,
                    shape,
                });

            let subject_changes =
                changes
                    .entry(subject_iri.clone())
                    .or_insert_with(|| OrmTrackedSubjectChange {
                        subject_iri: subject_iri.clone(),
                        predicates: HashMap::new(),
                        tracked_subject,
                        valid: OrmTrackedSubjectValidity::Unknown,
                    });

            // Keep track of all children that were spotted or removed.
            let mut children_removed: Vec<&OrmTrackedPredicateChanges> = vec![];
            let mut children_added: Vec<&OrmTrackedPredicateChanges> = vec![];

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
                            validity: OrmTrackedSubjectValidity::Unknown,
                        });

                    pred_changes.values_added.push(obj_term.clone());

                    // If value type is literal, we need to add the current value to the tracked predicate.
                    if tp
                        .schema
                        .dataTypes
                        .iter()
                        .any(|dt| dt.valType == OrmSchemaLiteralType::literal)
                    {
                        if let Some(current_literals) = &mut tp.current_literals {
                            current_literals.push(obj_term);
                        } else {
                            tp.current_literals = Some(vec![obj_term]);
                        }
                    } else if tp
                        .schema
                        .dataTypes
                        .iter()
                        .any(|dt| dt.valType == OrmSchemaLiteralType::shape)
                    {
                        // For nested, add object to tracked predicates and add self as parent.
                        children_added.push(&pred_changes);
                    }
                }
            }

            // Removed triples
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
                } else if tp
                    .schema
                    .dataTypes
                    .iter()
                    .any(|dt| dt.valType == OrmSchemaLiteralType::shape)
                {
                    // For nested, add object to tracked predicates and add self as parent.
                    children_removed.push(&pred_changes);
                }
            }

            return (children_added, children_removed);
        }

        fn check_subject_validity<'a>(
            s_change: &'a OrmTrackedSubjectChange<'a>,
            shape: &String,
            schema: &'a OrmSchema,
            previous_validity: OrmTrackedSubjectValidity,
        ) -> (
            OrmTrackedSubjectValidity,
            HashMap<String, HashMap<String, &'a OrmTrackedSubjectChange<'a>>>,
        ) {
            if s_change.predicates.is_empty() {
                // There has not been any changes. There is nothing to do.
                return (previous_validity, HashMap::new());
            }

            let previous_validity = s_change.valid;
            let mut new_validity = OrmTrackedSubjectValidity::Valid;
            // Helper to set own validity which does not overwrite worse invalids.
            let mut set_validity = |new_val: OrmTrackedSubjectValidity| {
                if new_val == OrmTrackedSubjectValidity::Invalid {
                    new_validity = OrmTrackedSubjectValidity::Invalid;
                    // Remove all tracked predicates
                    s_change.tracked_subject.tracked_predicates = HashMap::new();
                } else if new_val == OrmTrackedSubjectValidity::Unknown
                    && new_validity != OrmTrackedSubjectValidity::Invalid
                {
                    new_validity = OrmTrackedSubjectValidity::Unknown;
                }
            };

            let tracked_subject = s_change.tracked_subject;
            let shape = schema.get(shape).expect("Shape not available");

            // TODO: Check parent validities:
            // If no parent is tracking us, we are untracked.
            // If there is an infinite loop of parents pointing back to use, return invalid.

            // Keep track of objects that need to be validated against a shape to fetch and validate.
            let mut new_unknowns: Vec<(&String, &OrmSchemaShape)> = vec![];

            for p_schema in shape.predicates.iter() {
                let p_change = s_change.predicates.get(&p_schema.iri);
                let tracked_pred = p_change.map(|pc| pc.tracked_predicate);

                let count = tracked_pred
                    .map_or_else(|| 0, |tp: &OrmTrackedPredicate<'_>| tp.current_cardinality);

                if count < p_schema.minCardinality {
                    set_validity(OrmTrackedSubjectValidity::Invalid);
                    if count <= 0 {
                        // If no other parent is tracking, remove all tracked predicates.
                        tracked_subject.tracked_predicates.remove(&p_schema.iri);
                    }
                } else if count > p_schema.maxCardinality
                    && p_schema.maxCardinality != -1
                    && p_schema.extra != Some(true)
                {
                    // If cardinality is too high and no extra allowed, invalid.
                    set_validity(OrmTrackedSubjectValidity::Invalid);
                    break;
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
                                } else if tc.valid == OrmTrackedSubjectValidity::Unknown {
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
                        set_validity(OrmTrackedSubjectValidity::Unknown);
                        // Add them to the list of unknowns to fetch and validate.
                        for o in tracked_pred
                            .iter()
                            .flat_map(|tp| tp.tracked_children.iter())
                        {
                            if let Some(tc) = o.upgrade() {
                                if tc.valid == OrmTrackedSubjectValidity::Untracked {
                                    new_unknowns.push((tc.subj_iri, tc.shape));
                                }
                            }
                        }
                    } else if counts.2 > 0 {
                        // If we have unknown nested objects, we need to wait for their evaluation.
                        set_validity(OrmTrackedSubjectValidity::Unknown);
                    } else {
                        // All nested objects are valid and cardinality is correct.
                        // We are valid with this predicate.
                    }
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

            // TODO
            // If we are invalid, we can discard new unknowns again - they won't be kept in memory.
            if new_validity == OrmTrackedSubjectValidity::Invalid {
                return (OrmTrackedSubjectValidity::Invalid, HashMap::new());
            } else if (new_validity == OrmTrackedSubjectValidity::Valid
                && previous_validity != OrmTrackedSubjectValidity::Valid)
            {
                // If the validity is newly valid, we need to refetch this subject.
                // TODO
            }
            // If validity changed, inform parents (add to new_unknowns).
            if new_validity != previous_validity {
                // TODO
            }

            // TODO
            return (new_validity, new_unknowns);
        }

        let all_subjects: HashSet<&String> = added_triples_by_subject
            .keys()
            .chain(removed_triples_by_subject.keys())
            .collect();

        // Process added/removed triples for each subject.
        for subject_iri in all_subjects {
            let triples_added_for_subj = added_triples_by_subject
                .get(subject_iri)
                .unwrap_or(&vec![])
                .to_vec();
            let triples_removed_for_subj = removed_triples_by_subject
                .get(subject_iri)
                .unwrap_or(&vec![])
                .to_vec();

            let _ = orm_from_triple_for_level(
                &shape_def,
                &subject_iri,
                &triples_added_for_subj,
                &triples_removed_for_subj,
                &tracked_subjects,
                &subject_changes,
            );
        }

        // TODO ====

        // To process validation, we collect all subject changes in one of the buckets.
        // Subjects for which we did not apply triples.
        let un_processed: HashSet<String> = HashSet::new();
        // Subjects that are invalid. No further processing needed.
        let invalids: HashSet<&OrmTrackedSubjectChange> = HashSet::new();
        // Subjects that are valid. Fetch might still be required if newly valid.
        let valids: HashSet<&OrmTrackedSubjectChange> = HashSet::new();
        // Will need re-evaluation
        let unknowns: HashSet<&OrmTrackedSubjectChange> = HashSet::new();
        // Either because it became tracked again or because it's newly valid.
        let needs_fetch: HashSet<&OrmTrackedSubjectChange> = HashSet::new();

        while !unknowns.is_empty() || !needs_fetch.is_empty() {
            // Process buckets by priority and nesting
            // First unknown, then needs fetch (the latter could still become invalid).
            // Start from from the end because nested objects will less likely need further nested eval.

            // Check validity for each modified subject.
            for sc in un_processed {
                let tracked_subject = tracked_subjects
                    .get(sc.tracked_subject.subj_iri)
                    .unwrap()
                    .get(shape)
                    .unwrap();
                let (is_valid, new_unknowns) =
                    check_subject_validity(s_change, &shape, schema, tracked_subject.valid);
            }
            if !unknowns.is_empty() {
                continue;
            }
            for sc in needs_fetch {
                // TODO: fetch and evaluate.
            }
        }
        // ===
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
