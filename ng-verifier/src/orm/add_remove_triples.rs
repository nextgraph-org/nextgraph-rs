// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use ng_oxigraph::oxrdf::Triple;
use ng_repo::errors::NgError;
use ng_repo::errors::VerifierError;
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::Weak;

use crate::orm::types::*;
use ng_net::orm::*;
use ng_repo::log::*;

/// Add all triples to `subject_changes`
/// Returns predicates to nested objects that were touched and need processing.
/// Assumes all triples have same subject.
pub fn add_remove_triples(
    shape: Arc<OrmSchemaShape>,
    subject_iri: &str,
    triples_added: &[&Triple],
    triples_removed: &[&Triple],
    orm_subscription: &mut Arc<OrmSubscription>,
    subject_changes: &mut OrmTrackedSubjectChange,
) -> Result<(), VerifierError> {
    fn get_tracked_subject(
        subject_iri: &str,
        shape: &Arc<OrmSchemaShape>,
        tracked_subjects: &HashMap<String, HashMap<String, Arc<OrmTrackedSubject>>>,
    ) -> Result<Weak<OrmTrackedSubject>, VerifierError> {
        let tracked_shapes_for_subject = tracked_subjects
            .get(&subject_iri.to_string())
            .ok_or(VerifierError::OrmSubjectNotFound)?;
        let subject = tracked_shapes_for_subject
            .get(&shape.iri)
            .ok_or(VerifierError::OrmSubjectNotFound)?;
        Ok(Arc::<OrmTrackedSubject>::downgrade(&subject))
    }

    // Helper to get/create tracked subjects
    fn get_or_create_tracked_subject<'a>(
        subject_iri: &str,
        shape: &Arc<OrmSchemaShape>,
        tracked_subjects: &'a mut HashMap<String, HashMap<String, Arc<OrmTrackedSubject>>>,
    ) -> &'a mut Arc<OrmTrackedSubject> {
        let tracked_shapes_for_subject = tracked_subjects
            .entry(subject_iri.to_string())
            .or_insert_with(HashMap::new);

        let subject = tracked_shapes_for_subject
            .entry(shape.iri.clone())
            .or_insert_with(|| {
                Arc::new(OrmTrackedSubject {
                    tracked_predicates: HashMap::new(),
                    parents: HashMap::new(),
                    valid: OrmTrackedSubjectValidity::Pending,
                    subject_iri: subject_iri.to_string(),
                    shape: shape.clone(),
                })
            });
        //let strong = Arc::get_mut(subject).unwrap();
        // log_info!(
        //     "strong {} weak {}",
        //     Arc::<OrmTrackedSubject>::strong_count(&subject),
        //     Arc::<OrmTrackedSubject>::weak_count(&subject)
        // );
        subject
    }

    // Destructure to get separate references and avoid borrowing conflicts
    let orm_sub = Arc::get_mut(orm_subscription).unwrap();
    let schema = &orm_sub.shape_type.schema;
    let tracked_subjects = &mut orm_sub.tracked_subjects;

    // log_info!(
    //     "strong {} weak {}",
    //     Arc::<OrmTrackedSubject>::strong_count(&tracked_subject_strong),
    //     Arc::<OrmTrackedSubject>::weak_count(&tracked_subject_strong)
    // );
    // let tracked_subject_weak = Arc::<OrmTrackedSubject>::downgrade(&tracked_subject_strong);

    // Process added triples.
    // For each triple, check if it matches the shape.
    // In parallel, we record the values added and removed (tracked_changes)
    for triple in triples_added {
        for predicate_schema in &shape.predicates {
            if predicate_schema.iri != triple.predicate.as_str() {
                // Triple does not match predicate.
                continue;
            }
            // Predicate schema constraint matches this triple.

            let mut tracked_subject_upgraded =
                get_or_create_tracked_subject(subject_iri, &shape, tracked_subjects);
            let tracked_subject = Arc::get_mut(&mut tracked_subject_upgraded).unwrap();
            // Add tracked predicate or increase cardinality
            let tracked_predicate_ = tracked_subject
                .tracked_predicates
                .entry(predicate_schema.iri.to_string())
                .or_insert_with(|| {
                    Arc::new(OrmTrackedPredicate {
                        current_cardinality: 0,
                        schema: predicate_schema.clone(),
                        tracked_children: Vec::new(),
                        current_literals: None,
                    })
                });
            let tracked_predicate_weak = Arc::downgrade(&tracked_predicate_);
            let tracked_predicate = Arc::get_mut(tracked_predicate_).unwrap();
            tracked_predicate.current_cardinality += 1;

            let obj_term = oxrdf_term_to_orm_basic_type(&triple.object);

            // Keep track of the changed values too.
            let pred_changes: &mut OrmTrackedPredicateChanges = subject_changes
                .predicates
                .entry(predicate_schema.iri.clone())
                .or_insert_with(|| OrmTrackedPredicateChanges {
                    tracked_predicate: tracked_predicate_weak.clone(), // reference remains inside lifetime of this call
                    values_added: Vec::new(),
                    values_removed: Vec::new(),
                });

            pred_changes.values_added.push(obj_term.clone());

            // If value type is literal, we need to add the current value to the tracked predicate.
            if tracked_predicate
                .schema
                .dataTypes
                .iter()
                .any(|dt| dt.valType == OrmSchemaLiteralType::literal)
            {
                match &mut tracked_predicate.current_literals {
                    Some(lits) => lits.push(obj_term.clone()),
                    None => {
                        tracked_predicate.current_literals = Some(vec![obj_term.clone()]);
                    }
                }
            }

            // If predicate is of type shape, register (parent -> child) links so that
            // nested subjects can later be (lazily) fetched / validated.
            for shape_iri in predicate_schema.dataTypes.iter().filter_map(|dt| {
                if dt.valType == OrmSchemaLiteralType::shape {
                    dt.shape.clone()
                } else {
                    None
                }
            }) {
                if let BasicType::Str(obj_iri) = &obj_term {
                    // Get or create object's tracked subject struct.
                    let child_shape = schema.get(&shape_iri).unwrap();
                    // find the parent
                    let parent = get_tracked_subject(subject_iri, &shape, tracked_subjects)?;

                    // If this actually created a new tracked subject, that's fine and will be removed during validation.
                    let tracked_child =
                        get_or_create_tracked_subject(obj_iri, child_shape, tracked_subjects);

                    // Add self to parent.
                    Arc::get_mut(tracked_child)
                        .unwrap()
                        .parents
                        .insert(subject_iri.to_string(), parent);

                    // Add link to children
                    let mut upgraded = tracked_predicate_weak.upgrade().unwrap();
                    let tracked_predicate = Arc::get_mut(&mut upgraded).unwrap();
                    tracked_predicate
                        .tracked_children
                        .push(Arc::<OrmTrackedSubject>::downgrade(&tracked_child));
                }
            }
        }
    }
    // Process removed triples.
    for triple in triples_removed {
        let pred_iri = triple.predicate.as_str();

        // Only adjust if we had tracked state.
        let tracked_predicate_opt = tracked_subjects
            .get_mut(subject_iri)
            .and_then(|tss| tss.get_mut(&shape.iri))
            .and_then(|ts| {
                Arc::get_mut(ts)
                    .unwrap()
                    .tracked_predicates
                    .get_mut(pred_iri)
            });
        let Some(tracked_predicate_arc) = tracked_predicate_opt else {
            continue;
        };
        let tracked_predicate = Arc::get_mut(tracked_predicate_arc).unwrap();

        // The cardinality might become -1 or 0. We will remove them from the tracked predicates during validation.
        tracked_predicate.current_cardinality =
            tracked_predicate.current_cardinality.saturating_sub(1);

        let Some(pred_changes) = subject_changes.predicates.get_mut(pred_iri) else {
            continue;
        };

        let val_removed = oxrdf_term_to_orm_basic_type(&triple.object);
        pred_changes.values_removed.push(val_removed.clone());

        // If value type is literal, we need to remove the current value from the tracked predicate.
        if tracked_predicate
            .schema
            .dataTypes
            .iter()
            .any(|dt| dt.valType == OrmSchemaLiteralType::literal)
        {
            if let Some(current_literals) = &mut tracked_predicate.current_literals {
                // Remove obj_val from current_literals in-place
                current_literals.retain(|val| *val != val_removed);
            } else {
                tracked_predicate.current_literals = Some(vec![val_removed]);
            }
        } else if tracked_predicate
            .schema
            .dataTypes
            .iter()
            .any(|dt| dt.valType == OrmSchemaLiteralType::shape)
        {
            // Remove parent from child and child from tracked children.
            // If predicate is of type shape, register (parent -> child) links so that
            // nested subjects can later be (lazily) fetched / validated.
            let shapes_to_process: Vec<_> = tracked_predicate
                .schema
                .dataTypes
                .iter()
                .filter_map(|dt| {
                    if dt.valType == OrmSchemaLiteralType::shape {
                        dt.shape.clone()
                    } else {
                        None
                    }
                })
                .collect();

            if let BasicType::Str(obj_iri) = &val_removed {
                // Remove link to children
                tracked_predicate
                    .tracked_children
                    .retain(|c| *obj_iri != c.upgrade().unwrap().subject_iri);

                for shape_iri in shapes_to_process {
                    // Get or create object's tracked subject struct.
                    let child_shape = schema.get(&shape_iri).unwrap();

                    let tracked_child = Arc::get_mut(get_or_create_tracked_subject(
                        &obj_iri,
                        child_shape,
                        tracked_subjects,
                    ))
                    .unwrap();

                    // Remove self from parent
                    tracked_child.parents.remove(obj_iri);
                }
            }
        }
    }
    Ok(())
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
