// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

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
    log_debug!(
        "[add_quads_for_subject] Applying quads to subject: {}, shape: {}, graph: {}",
        subject_iri,
        shape.iri,
        graph_iri,
    );

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
                    .any(|dt| dt.valType == OrmSchemaValType::literal)
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
            .any(|dt| dt.valType == OrmSchemaValType::literal)
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

mod tests {
    use super::*;
    use futures::channel::mpsc::unbounded;
    use ng_net::app_protocol::NuriV0;
    use ng_oxigraph::oxrdf::{Literal, NamedNode, NamedNodeRef, Quad as OxQuad, Subject, Term};

    fn mk_schema() -> OrmShapeType {
        // child shape
        let child_shape = Arc::new(OrmSchemaShape {
            iri: "S_child".to_string(),
            predicates: vec![],
        });

        // predicates for parent
        let p_lit = Arc::new(OrmSchemaPredicate {
            iri: "http://example.org/p_lit".into(),
            readablePredicate: "p_lit".into(),
            dataTypes: vec![OrmSchemaDataType {
                valType: OrmSchemaValType::literal,
                literals: None,
                shape: None,
            }],
            maxCardinality: -1,
            minCardinality: 0,
            extra: None,
        });

        let p_obj = Arc::new(OrmSchemaPredicate {
            iri: "http://example.org/p_obj".into(),
            readablePredicate: "p_obj".into(),
            dataTypes: vec![OrmSchemaDataType {
                valType: OrmSchemaValType::shape,
                literals: None,
                shape: Some("S_child".into()),
            }],
            maxCardinality: -1,
            minCardinality: 0,
            extra: None,
        });

        let parent_shape = Arc::new(OrmSchemaShape {
            iri: "S_parent".to_string(),
            predicates: vec![p_lit.clone(), p_obj.clone()],
        });

        let mut schema: OrmSchema = HashMap::new();
        schema.insert("S_parent".into(), parent_shape);
        schema.insert("S_child".into(), child_shape);

        OrmShapeType {
            schema,
            shape: "S_parent".into(),
        }
    }

    fn mk_literal_quad(subj: &str, pred: &str, value: &str) -> OxQuad {
        let s = Subject::NamedNode(NamedNode::new(subj).unwrap());
        let p = NamedNode::new(pred).unwrap();
        let o = Term::Literal(Literal::new_typed_literal(
            value,
            NamedNodeRef::new("http://www.w3.org/2001/XMLSchema#string").unwrap(),
        ));
        OxQuad::new(s, p, o, ng_oxigraph::oxrdf::GraphName::DefaultGraph)
    }

    fn mk_ref_quad(subj: &str, pred: &str, obj_iri: &str) -> OxQuad {
        let s = Subject::NamedNode(NamedNode::new(subj).unwrap());
        let p = NamedNode::new(pred).unwrap();
        let o = Term::NamedNode(NamedNode::new(obj_iri).unwrap());
        OxQuad::new(s, p, o, ng_oxigraph::oxrdf::GraphName::DefaultGraph)
    }

    fn mk_subscription() -> OrmSubscription {
        let shape_type = mk_schema();
        let (tx, _rx) = unbounded();
        OrmSubscription::new(shape_type, 1, "did:ng:i".to_string(), tx)
    }

    #[test]
    fn add_then_remove_literal_and_object_updates_predicates() {
        let mut sub = mk_subscription();

        let graph = "g1";
        let subj = "http://example.org/s1";
        let child1 = "http://example.org/c1";
        let p_lit = "http://example.org/p_lit";
        let p_obj = "http://example.org/p_obj";

        let q_add_lit = mk_literal_quad(subj, p_lit, "abc");
        let q_add_obj = mk_ref_quad(subj, p_obj, child1);
        let added_vec = vec![q_add_lit, q_add_obj];
        let added_refs: Vec<&OxQuad> = added_vec.iter().collect();

        let parent_shape_arc = sub.shape_type.schema.get("S_parent").unwrap().clone();
        let mut change = TrackedOrmObjectChange {
            tracked_orm_object: sub.get_or_create_tracked_orm_object(
                graph,
                subj,
                &parent_shape_arc,
            ),
            predicates: HashMap::new(),
            is_validated: false,
            prev_valid: TrackedOrmObjectValidity::Pending,
        };

        // ADDS
        add_quads_for_subject(
            sub.shape_type.schema.get("S_parent").unwrap().clone(),
            graph,
            subj,
            &added_refs,
            &mut sub,
            &mut change,
        );

        {
            let parent_r = change.tracked_orm_object.read().unwrap();
            // Both predicates should be tracked
            assert!(parent_r.tracked_predicates.contains_key(p_lit));
            assert!(parent_r.tracked_predicates.contains_key(p_obj));
            // Literal value present
            let tp_lit = parent_r
                .tracked_predicates
                .get(p_lit)
                .unwrap()
                .read()
                .unwrap();
            assert_eq!(tp_lit.current_cardinality, 1);
            assert_eq!(tp_lit.current_literals.as_ref().unwrap().len(), 1);
            // Object predicate increments cardinality but does not link here
            let tp_obj = parent_r
                .tracked_predicates
                .get(p_obj)
                .unwrap()
                .read()
                .unwrap();
            assert_eq!(tp_obj.current_cardinality, 1);
            assert!(tp_obj.current_literals.is_none());
        }
        // Change captures values_added
        assert!(change
            .predicates
            .get(p_lit)
            .unwrap()
            .values_added
            .iter()
            .any(|v| matches!(v, BasicType::Str(s) if s == "abc")));
        assert!(change
            .predicates
            .get(p_obj)
            .unwrap()
            .values_added
            .iter()
            .any(|v| matches!(v, BasicType::Str(s) if s == child1)));

        // REMOVES
        let q_rem_lit = mk_literal_quad(subj, p_lit, "abc");
        let q_rem_obj = mk_ref_quad(subj, p_obj, child1);
        let removed_vec = vec![q_rem_lit, q_rem_obj];
        let _removed_refs: Vec<&OxQuad> = removed_vec.iter().collect();

        remove_quads_for_subject(
            sub.shape_type.schema.get("S_parent").unwrap().clone(),
            graph,
            subj,
            &_removed_refs,
            &mut sub,
            &mut change,
        );

        // Change captures values_removed
        assert!(change
            .predicates
            .get(p_lit)
            .unwrap()
            .values_removed
            .iter()
            .any(|v| matches!(v, BasicType::Str(s) if s == "abc")));
        assert!(change
            .predicates
            .get(p_obj)
            .unwrap()
            .values_removed
            .iter()
            .any(|v| matches!(v, BasicType::Str(s) if s == child1)));
    }

    #[test]
    fn apply_wrapper_filters_and_updates() {
        let mut sub = mk_subscription();

        let graph = "g1".to_string();
        let subj = "http://example.org/s1".to_string();
        let child1 = "http://example.org/c1";
        let p_lit = "http://example.org/p_lit";
        let p_obj = "http://example.org/p_obj";

        let unrelated_pred = "http://example.org/ignored";

        // Build quads including one unrelated predicate (should be filtered out)
        let q_add_lit = mk_literal_quad(&subj, p_lit, "abc");
        let q_add_obj = mk_ref_quad(&subj, p_obj, child1);
        let q_unrelated = mk_ref_quad(&subj, unrelated_pred, "http://example.org/x");
        let add_vec = vec![q_add_lit, q_add_obj, q_unrelated];
        let add_refs: Vec<&OxQuad> = add_vec.iter().collect();

        let removed_vec: Vec<OxQuad> = vec![];
        let _removed_refs: Vec<&OxQuad> = removed_vec.iter().collect();

        // grouped maps
        let mut added_grouped: HashMap<(String, String), Vec<&OxQuad>> = HashMap::new();
        added_grouped.insert((graph.clone(), subj.clone()), add_refs);
        let removed_grouped: HashMap<(String, String), Vec<&OxQuad>> = HashMap::new();

        let parent_shape_arc = sub.shape_type.schema.get("S_parent").unwrap().clone();
        let mut change = TrackedOrmObjectChange {
            tracked_orm_object: sub.get_or_create_tracked_orm_object(
                &graph,
                &subj,
                &parent_shape_arc,
            ),
            predicates: HashMap::new(),
            is_validated: false,
            prev_valid: TrackedOrmObjectValidity::Pending,
        };

        let parent_shape_arc2 = sub.shape_type.schema.get("S_parent").unwrap().clone();
        apply_quads_for_subject(
            &parent_shape_arc2,
            &graph,
            &subj,
            &added_grouped,
            &removed_grouped,
            &mut sub,
            &mut change,
        );

        // Only the two schema predicates should have changes, the unrelated one must be ignored
        assert!(change.predicates.contains_key(p_lit));
        assert!(change.predicates.contains_key(p_obj));
        assert_eq!(change.predicates.len(), 2);
    }
}
