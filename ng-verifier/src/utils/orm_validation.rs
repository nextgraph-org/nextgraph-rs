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
use std::sync::Arc;
use std::sync::Weak;

use ng_net::orm::*;
use ng_oxigraph::oxrdf::Subject;
use ng_oxigraph::oxrdf::Triple;
use ng_repo::errors::NgError;

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

/// Add all triples to `subject_changes`
/// Returns predicates to nested objects that were touched and need processing.
/// Assumes all triples have same subject.
pub fn add_remove_triples_mut(
    shape: Arc<OrmSchemaShape>,
    subject_iri: &str,
    triples_added: &[&Triple],
    triples_removed: &[&Triple],
    tracked_subjects: &mut HashMap<String, HashMap<String, Arc<OrmTrackedSubject>>>,
    subject_changes: &mut OrmTrackedSubjectChange,
) -> Result<(), NgError> {
    fn get_or_create_tracked_subject<'a>(
        subject_iri: &str,
        shape: &Arc<OrmSchemaShape>,
        tracked_subjects: &'a mut HashMap<String, HashMap<String, Arc<OrmTrackedSubject>>>,
    ) -> (&'a mut OrmTrackedSubject, Weak<OrmTrackedSubject>) {
        let tracked_shapes_for_subject = tracked_subjects
            .entry(subject_iri.to_string())
            .or_insert_with(HashMap::new);

        let subject = tracked_shapes_for_subject
            .entry(shape.iri.clone())
            .or_insert_with(|| {
                Arc::new(OrmTrackedSubject {
                    tracked_predicates: HashMap::new(),
                    parents: HashMap::new(),
                    valid: ng_net::orm::OrmTrackedSubjectValidity::Pending,
                    subject_iri: subject_iri.to_string(),
                    shape: shape.clone(),
                })
            });
        let weak = Arc::downgrade(&subject);
        (Arc::get_mut(subject).unwrap(), weak)
    }

    let (_, tracked_subject_weak) =
        get_or_create_tracked_subject(subject_iri, &shape, tracked_subjects);

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

            let mut upgraded = tracked_subject_weak.upgrade().unwrap();
            let tracked_subject = Arc::get_mut(&mut upgraded).unwrap();
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
            // FIXME : shape_iri is never used
            for shape_iri in predicate_schema.dataTypes.iter().filter_map(|dt| {
                if dt.valType == OrmSchemaLiteralType::shape {
                    dt.shape.clone()
                } else {
                    None
                }
            }) {
                if let BasicType::Str(obj_iri) = &obj_term {
                    // Get or create object's tracked subject struct.
                    let (tracked_child, tracked_child_weak) = get_or_create_tracked_subject(
                        triple.predicate.as_string(),
                        &shape,
                        tracked_subjects,
                    );

                    // Add self to parent (set tracked to true, preliminary).
                    tracked_child
                        .parents
                        .insert(obj_iri.clone(), tracked_child_weak.clone());

                    // Add link to children
                    let mut upgraded = tracked_predicate_weak.upgrade().unwrap();
                    let tracked_predicate = Arc::get_mut(&mut upgraded).unwrap();
                    tracked_predicate.tracked_children.push(tracked_child_weak);
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
            for shape_iri in tracked_predicate.schema.dataTypes.iter().filter_map(|dt| {
                if dt.valType == OrmSchemaLiteralType::shape {
                    dt.shape.clone()
                } else {
                    None
                }
            }) {
                // Nested shape removal logic disabled (see note above).
            }
        }
    }
    Ok(())
}

/// Check the validity of a subject and update affecting tracked subjects' validity.
/// Might return nested objects that need to be validated.
/// Assumes all triples to be of same subject.
pub fn update_subject_validity(
    s_change: &OrmTrackedSubjectChange,
    shape: &OrmSchemaShape,
    tracked_subjects: &mut HashMap<String, HashMap<String, Arc<OrmTrackedSubject>>>,
    previous_validity: OrmTrackedSubjectValidity,
) -> Vec<(String, String, bool)> {
    let Some(tracked_shapes) = tracked_subjects.get_mut(&s_change.subject_iri) else {
        return vec![];
    };
    let Some(tracked_subject) = tracked_shapes.get_mut(&shape.iri) else {
        return vec![];
    };
    let tracked_subject = Arc::get_mut(tracked_subject).unwrap();
    // Keep track of objects that need to be validated against a shape to fetch and validate.
    let mut need_evaluation: Vec<(String, String, bool)> = vec![];

    // Check 1) Check if we need to fetch this object or all parents are untracked.
    if tracked_subject.parents.len() != 0 {
        let no_parents_tracking =
            tracked_subject
                .parents
                .values()
                .all(|parent| match parent.upgrade() {
                    Some(subject) => {
                        subject.valid == OrmTrackedSubjectValidity::Untracked
                            || subject.valid == OrmTrackedSubjectValidity::Invalid
                    }
                    None => true,
                });

        if no_parents_tracking {
            // Remove tracked predicates and set untracked.
            tracked_subject.tracked_predicates = HashMap::new();
            tracked_subject.valid = OrmTrackedSubjectValidity::Untracked;
            return vec![];
        } else if !no_parents_tracking && previous_validity == OrmTrackedSubjectValidity::Untracked
        {
            // We need to fetch the subject's current state:
            // We have new parents but were previously not recording changes.

            return vec![(s_change.subject_iri.clone(), shape.iri.clone(), true)];
            // TODO
        }
    }

    // Check 2) If there are no changes, there is nothing to do.
    if s_change.predicates.is_empty() {
        return vec![];
    }

    let mut new_validity = OrmTrackedSubjectValidity::Valid;
    fn set_validity(current: &mut OrmTrackedSubjectValidity, new_val: OrmTrackedSubjectValidity) {
        if new_val == OrmTrackedSubjectValidity::Invalid {
            *current = OrmTrackedSubjectValidity::Invalid;
        } else {
            *current = new_val;
        }
    }

    // Check 3) If there is an infinite loop of parents pointing back to us, return invalid.
    // Create a set of visited parents to detect cycles.
    if has_cycle(tracked_subject, &mut HashSet::new()) {
        // Remove tracked predicates and set invalid.
        tracked_subject.tracked_predicates = HashMap::new();
        tracked_subject.valid = OrmTrackedSubjectValidity::Invalid;
        return vec![];
    }

    // Check 4) Validate subject against each predicate in shape.
    for p_schema in shape.predicates.iter() {
        let p_change = s_change.predicates.get(&p_schema.iri);
        let tracked_pred = p_change.and_then(|pc| pc.tracked_predicate.upgrade());

        let count = tracked_pred
            .as_ref()
            .map_or_else(|| 0, |tp| tp.current_cardinality);

        // Check 4.1) Cardinality
        if count < p_schema.minCardinality {
            set_validity(&mut new_validity, OrmTrackedSubjectValidity::Invalid);
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
            set_validity(&mut new_validity, OrmTrackedSubjectValidity::Invalid);
            break;
        // Check 4.3) Required literals present.
        } else if p_schema
            .dataTypes
            .iter()
            .any(|dt| dt.valType == OrmSchemaLiteralType::literal)
        {
            // If we have literals, check if all required literals are present.
            // At least one datatype must match.
            let some_valid =
                p_schema
                    .dataTypes
                    .iter()
                    .flat_map(|dt| &dt.literals)
                    .any(|required_literals| {
                        // Early stop: If no extra values allowed but the sizes
                        // between required and given values mismatches.
                        if !p_schema.extra.unwrap_or(false)
                            && ((required_literals.len() as i32)
                                != tracked_pred.as_ref().map_or(0, |p| p.current_cardinality))
                        {
                            return false;
                        }

                        // Check that each required literal is present.
                        for required_literal in required_literals {
                            // Is tracked predicate present?
                            if !tracked_pred.as_ref().map_or(false, |t| {
                                t.current_literals.as_ref().map_or(false, |tt| {
                                    tt.iter().any(|literal| *literal == *required_literal)
                                })
                            }) {
                                return false;
                            }
                        }
                        // All required literals present.
                        return true;
                    });
            if !some_valid {
                set_validity(&mut new_validity, OrmTrackedSubjectValidity::Invalid);
            }
        // Check 4.4) Nested shape correct.
        } else if p_schema
            .dataTypes
            .iter()
            .any(|dt| dt.valType == OrmSchemaLiteralType::shape)
        {
            // If we have a nested shape, we need to check if the nested objects are tracked and valid.
            let tracked_children = tracked_pred.as_ref().map(|tp| {
                tp.tracked_children
                    .iter()
                    .filter_map(|weak_tc| weak_tc.upgrade())
                    .collect::<Vec<_>>()
            });
            // First, Count valid, invalid, unknowns, and untracked
            let counts = tracked_children.as_ref().map_or((0, 0, 0, 0), |children| {
                children
                    .iter()
                    .map(|tc| {
                        if tc.valid == OrmTrackedSubjectValidity::Valid {
                            (1, 0, 0, 0)
                        } else if tc.valid == OrmTrackedSubjectValidity::Invalid {
                            (0, 1, 0, 0)
                        } else if tc.valid == OrmTrackedSubjectValidity::Pending {
                            (0, 0, 1, 0)
                        } else if tc.valid == OrmTrackedSubjectValidity::Untracked {
                            (0, 0, 0, 1)
                        } else {
                            (0, 0, 0, 0)
                        }
                    })
                    .fold((0, 0, 0, 0), |(v1, i1, u1, ut1), o| {
                        (v1 + o.0, i1 + o.1, u1 + o.2, ut1 + o.3)
                    })
            });

            if counts.1 > 0 && p_schema.extra != Some(true) {
                // If we have at least one invalid nested object and no extra allowed, invalid.
                set_validity(&mut new_validity, OrmTrackedSubjectValidity::Invalid);
                break;
            } else if counts.0 < p_schema.minCardinality {
                // If we have not enough valid nested objects, invalid.
                set_validity(&mut new_validity, OrmTrackedSubjectValidity::Invalid);
                break;
            } else if counts.3 > 0 {
                // If we have untracked nested objects, we need to fetch them and validate.
                set_validity(&mut new_validity, OrmTrackedSubjectValidity::Pending);
                // After that we need to reevaluate this (subject,shape) again.
                need_evaluation.push((s_change.subject_iri.to_string(), shape.iri.clone(), false));
                // Also schedule untracked children for fetching and validation.
                tracked_children.as_ref().map(|children| {
                    for child in children {
                        if child.valid == OrmTrackedSubjectValidity::Untracked {
                            need_evaluation.push((
                                child.subject_iri.clone(),
                                child.shape.iri.clone(),
                                true,
                            ));
                        }
                    }
                });
            } else if counts.2 > 0 {
                // If we have unknown nested objects, we need to wait for their evaluation.
                set_validity(&mut new_validity, OrmTrackedSubjectValidity::Pending);
                // Schedule unknown children (NotEvaluated) for re-evaluation without fetch.
                tracked_children.as_ref().map(|children| {
                    for child in children {
                        if child.valid == OrmTrackedSubjectValidity::Pending {
                            need_evaluation.push((
                                child.subject_iri.clone(),
                                child.shape.iri.clone(),
                                false,
                            ));
                        }
                    }
                });
            } else {
                // All nested objects are valid and cardinality is correct.
                // We are valid with this predicate.
            }
        // Check 4.5) Data types correct.
        } else {
            // Check if the data type is correct.
            let allowed_types: Vec<&OrmSchemaLiteralType> =
                p_schema.dataTypes.iter().map(|dt| &dt.valType).collect();
            // For each new value, check that data type is in allowed_types.
            for val_added in p_change.iter().map(|pc| &pc.values_added).flatten() {
                let matches = match val_added {
                    BasicType::Bool(_) => allowed_types
                        .iter()
                        .any(|t| **t == OrmSchemaLiteralType::boolean),
                    BasicType::Num(_) => allowed_types
                        .iter()
                        .any(|t| **t == OrmSchemaLiteralType::number),
                    BasicType::Str(_) => allowed_types.iter().any(|t| {
                        **t == OrmSchemaLiteralType::string || **t == OrmSchemaLiteralType::iri
                    }),
                };
                if !matches {
                    set_validity(&mut new_validity, OrmTrackedSubjectValidity::Invalid);
                    break;
                }
            }
            // Break again if validity has become invalid.
            if new_validity == OrmTrackedSubjectValidity::Invalid {
                break;
            }
        };
    }

    if new_validity == OrmTrackedSubjectValidity::Invalid {
        // If we are invalid, we can discard new unknowns again - they won't be kept in memory.
        // We need to remove ourself from child objects parents field and
        // remove them if no other is tracking.
        // Child relationship cleanup disabled (nested tracking disabled in this refactor step)

        // Remove tracked predicates and set untracked.
        tracked_subject.tracked_predicates = HashMap::new();

        // Empty list of children that need evaluation.
        need_evaluation.retain(|_| false);
    } else if new_validity == OrmTrackedSubjectValidity::Valid
        && previous_validity != OrmTrackedSubjectValidity::Valid
    {
        // If this subject became valid, we need to refetch this subject;
        // We fetch
        need_evaluation.insert(0, (s_change.subject_iri.clone(), shape.iri.clone(), true));
    }

    // If validity changed, parents need to be re-evaluated.
    if new_validity != previous_validity {
        // We return the tracking parents which need re-evaluation.
        // Remember that the last elements (i.e. children or needs_fetch) are evaluated first.
        return tracked_subject
            .parents
            .values()
            .filter_map(|parent| {
                parent
                    .upgrade()
                    .map(|parent| (parent.subject_iri.clone(), parent.shape.iri.clone(), false))
            })
            // Add `need_evaluation`.
            .chain(need_evaluation)
            .collect();
    }

    tracked_subject.valid = new_validity;

    return need_evaluation;
}

fn oxrdf_term_to_orm_basic_type(term: &ng_oxigraph::oxrdf::Term) -> BasicType {
    match oxrdf_term_to_orm_term(term) {
        ng_net::orm::Term::Str(s) => BasicType::Str(s),
        ng_net::orm::Term::Num(n) => BasicType::Num(n),
        ng_net::orm::Term::Bool(b) => BasicType::Bool(b),
        ng_net::orm::Term::Ref(b) => BasicType::Str(b), // Treat IRIs as strings
    }
}

fn has_cycle(subject: &OrmTrackedSubject, visited: &mut HashSet<String>) -> bool {
    if visited.contains(&subject.subject_iri) {
        return true;
    }
    visited.insert(subject.subject_iri.clone());
    for (_parent_iri, parent_subject) in &subject.parents {
        if let Some(parent_subject) = parent_subject.upgrade() {
            if has_cycle(&parent_subject, visited) {
                return true;
            }
        }
    }
    visited.remove(&subject.subject_iri);
    false
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
