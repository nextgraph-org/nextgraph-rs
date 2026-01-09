// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use ng_oxigraph::oxrdf::Quad;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};

use crate::orm::types::*;
use ng_net::orm::*;
use ng_repo::log::*;

/// Add/remove quads to `subject_changes` for a single (graph,subject) and shape.
/// Assumes all quads have the same subject and graph in a call.
/// Returns tracked predicates and subjects they link to (for later linking).
///
/// TODO: Iteration could be more efficient.
/// Also, the parent function already filtered out all quads not belonging to the shape.
pub fn add_quads_for_subject(
    shape: Arc<OrmSchemaShape>,
    graph_iri: &str,
    subject_iri: &str,
    quads_added: &[&Quad],
    orm_subscription: &mut OrmSubscription,
    orm_object_changes: &mut TrackedOrmObjectChange,
) {
    // Ensure the parent tracked orm object exists for this (graph, subject, shape)
    let parent_arc =
        orm_subscription.get_or_create_tracked_orm_object(graph_iri, subject_iri, &shape);

    // Process added quads.
    // For each quad, check if it matches the shape.
    // In parallel, we record the values added and removed (tracked_changes)
    for quad in quads_added {
        let obj_term = oxrdf_term_to_orm_basic_type(&quad.object);
        // log_debug!("  - processing quad {quad}");
        for predicate_schema in &shape.predicates {
            if predicate_schema.iri != quad.predicate.as_str() {
                // Triple does not match predicate.
                continue;
            }

            // Predicate schema constraint matches this quad.
            // Get or create the tracked predicate on the parent.
            let mut tracked_orm_object = parent_arc.write().unwrap();
            // log_debug!("lock acquired on tracked_orm_object");
            // Add get tracked predicate.
            let tracked_predicate_lock = tracked_orm_object
                .tracked_predicates
                .entry(predicate_schema.iri.clone())
                .or_insert_with(|| {
                    Arc::new(RwLock::new(TrackedOrmPredicate {
                        current_cardinality: 0,
                        schema: Arc::downgrade(predicate_schema),
                        tracked_children: Vec::new(),
                        current_literals: None,
                    }))
                })
                .clone();
            {
                let mut tracked_predicate = tracked_predicate_lock.write().unwrap();
                tracked_predicate.current_cardinality += 1;

                // Keep track of the added values here.
                let pred_changes: &mut TrackedOrmPredicateChanges = orm_object_changes
                    .predicates
                    .entry(predicate_schema.iri.clone())
                    .or_insert_with(|| TrackedOrmPredicateChanges {
                        tracked_predicate: tracked_predicate_lock.clone(),
                        values_added: Vec::new(),
                        values_removed: Vec::new(),
                    });

                pred_changes.values_added.push(obj_term.clone());

                // If value type is literal, we need to add the current value to the tracked predicate.
                if tracked_predicate
                    .schema
                    .upgrade()
                    .unwrap()
                    .dataTypes
                    .iter()
                    .any(|dt| dt.literals.is_some())
                {
                    match &mut tracked_predicate.current_literals {
                        Some(lits) => lits.push(obj_term.clone()),
                        None => {
                            tracked_predicate.current_literals = Some(vec![obj_term.clone()]);
                        }
                    }
                }
            }
        }
    }
}

pub fn remove_quads_for_subject(
    shape: Arc<OrmSchemaShape>,
    graph_iri: &str,
    subject_iri: &str,
    quads_removed: &[&Quad],
    orm_subscription: &mut OrmSubscription,
    orm_object_changes: &mut TrackedOrmObjectChange,
) {
    // Process removed quads.
    for quad in quads_removed {
        let pred_iri = quad.predicate.as_str();

        // Only adjust if we had tracked state.
        let tracked_predicate_opt = orm_subscription
            .get_tracked_orm_object(graph_iri, subject_iri, &shape.iri)
            .and_then(|ts| {
                let guard = ts.read().ok()?;
                guard.tracked_predicates.get(pred_iri).cloned()
            });
        let Some(tracked_predicate_rc) = tracked_predicate_opt else {
            continue;
        };
        let mut tracked_predicate = tracked_predicate_rc.write().unwrap();

        // The cardinality might become -1 or 0. We will remove them from the tracked predicates during validation.
        tracked_predicate.current_cardinality =
            tracked_predicate.current_cardinality.saturating_sub(1);

        // Keep track of removed values here.
        let pred_changes: &mut TrackedOrmPredicateChanges = orm_object_changes
            .predicates
            .entry(tracked_predicate.schema.upgrade().unwrap().iri.clone())
            .or_insert_with(|| TrackedOrmPredicateChanges {
                tracked_predicate: tracked_predicate_rc.clone(),
                values_added: Vec::new(),
                values_removed: Vec::new(),
            });

        let val_removed = oxrdf_term_to_orm_basic_type(&quad.object);
        pred_changes.values_removed.push(val_removed.clone());

        // If value type is literal, we need to remove the current value from the tracked predicate.
        if tracked_predicate
            .schema
            .upgrade()
            .unwrap()
            .dataTypes
            .iter()
            .any(|dt| dt.literals.is_some())
        {
            if let Some(current_literals) = &mut tracked_predicate.current_literals {
                // Remove obj_val from current_literals in-place
                current_literals.retain(|val| *val != val_removed);
            } else {
                panic!("tracked_predicate.current_literals must not be None.");
            }
        }
        // Parent-child link removal is handled during validation/cleanup; do not unlink here.
    }
}

/// Filters grouped quads for a specific (graph,subject) and shape and applies them (add+remove) to the tracked object and change.
pub fn apply_quads_for_subject(
    shape: &Arc<OrmSchemaShape>,
    graph_iri: &str,
    subject_iri: &str,
    added_by_graph_and_subject: &HashMap<(String, String), Vec<&Quad>>,
    removed_by_graph_and_subject: &HashMap<(String, String), Vec<&Quad>>,
    orm_subscription: &mut OrmSubscription,
    change: &mut TrackedOrmObjectChange,
) {
    let key = (graph_iri.to_string(), subject_iri.to_string());
    let added_vec_raw = added_by_graph_and_subject
        .get(&key)
        .cloned()
        .unwrap_or_default();
    let removed_vec_raw = removed_by_graph_and_subject
        .get(&key)
        .cloned()
        .unwrap_or_default();

    // Filter quads for shape's predicates
    let allowed: HashSet<&str> = shape.predicates.iter().map(|p| p.iri.as_str()).collect();
    let quads_added_for_gs: Vec<&Quad> = added_vec_raw
        .iter()
        .copied()
        .filter(|q| allowed.contains(q.predicate.as_str()))
        .collect();
    let quads_removed_for_gs: Vec<&Quad> = removed_vec_raw
        .iter()
        .copied()
        .filter(|q| allowed.contains(q.predicate.as_str()))
        .collect();

    // Apply adds first, then removes
    add_quads_for_subject(
        shape.clone(),
        graph_iri,
        subject_iri,
        &quads_added_for_gs,
        orm_subscription,
        change,
    );

    remove_quads_for_subject(
        shape.clone(),
        graph_iri,
        subject_iri,
        &quads_removed_for_gs,
        orm_subscription,
        change,
    );
}

fn oxrdf_term_to_orm_basic_type(term: &ng_oxigraph::oxrdf::Term) -> BasicType {
    match oxrdf_term_to_orm_term(term) {
        Term::Str(s) => BasicType::Str(s),
        Term::Num(n) => BasicType::Num(n),
        Term::Bool(b) => BasicType::Bool(b),
        Term::Ref(b) => BasicType::Str(b), // Treat IRIs as strings
    }
}

/// Converts an oxrdf::Term to an orm::Term
fn oxrdf_term_to_orm_term(term: &ng_oxigraph::oxrdf::Term) -> Term {
    match term {
        ng_oxigraph::oxrdf::Term::NamedNode(node) => Term::Ref(node.as_str().to_string()),
        ng_oxigraph::oxrdf::Term::BlankNode(node) => Term::Ref(node.as_str().to_string()),
        ng_oxigraph::oxrdf::Term::Literal(literal) => {
            // Check the datatype to determine how to convert
            match literal.datatype().as_str() {
                // Check for string first, this is the most common.
                "http://www.w3.org/2001/XMLSchema#string" => Term::Str(literal.value().to_string()),
                "http://www.w3.org/2001/XMLSchema#boolean" => {
                    match literal.value().parse::<bool>() {
                        Ok(b) => Term::Bool(b),
                        Err(_) => Term::Str(literal.value().to_string()),
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
                        Ok(n) => Term::Num(n),
                        Err(_) => Term::Str(literal.value().to_string()),
                    }
                }
                _ => Term::Str(literal.value().to_string()),
            }
        }
        ng_oxigraph::oxrdf::Term::Triple(triple) => {
            // For RDF-star triples, convert to string representation
            Term::Str(triple.to_string())
        }
    }
}
