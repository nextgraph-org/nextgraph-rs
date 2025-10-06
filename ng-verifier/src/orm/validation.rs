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

use crate::orm::types::*;
use crate::verifier::*;
use ng_net::orm::*;

impl Verifier {
    /// Check the validity of a subject and update affecting tracked subjects' validity.
    /// Might return nested objects that need to be validated.
    /// Assumes all triples to be of same subject.
    pub fn update_subject_validity(
        s_change: &OrmTrackedSubjectChange,
        shape: &OrmSchemaShape,
        orm_subscription: &mut OrmSubscription,
        previous_validity: OrmTrackedSubjectValidity,
    ) -> Vec<(String, String, bool)> {
        let tracked_subjects = &mut orm_subscription.tracked_subjects;

        let Some(tracked_shapes) = tracked_subjects.get(&s_change.subject_iri) else {
            return vec![];
        };
        let Some(tracked_subject) = tracked_shapes.get(&shape.iri) else {
            return vec![];
        };
        let mut tracked_subject = tracked_subject.write().unwrap();
        // Keep track of objects that need to be validated against a shape to fetch and validate.
        let mut need_evaluation: Vec<(String, String, bool)> = vec![];

        // Check 1) Check if we need to fetch this object or all parents are untracked.
        if tracked_subject.parents.len() != 0 {
            let no_parents_tracking = tracked_subject.parents.values().all(|parent| {
                let subject = parent.read().unwrap();
                subject.valid == OrmTrackedSubjectValidity::Untracked
                    || subject.valid == OrmTrackedSubjectValidity::Invalid
            });

            if no_parents_tracking {
                // Remove tracked predicates and set untracked.
                tracked_subject.tracked_predicates = HashMap::new();
                tracked_subject.valid = OrmTrackedSubjectValidity::Untracked;
                return vec![];
            } else if !no_parents_tracking
                && previous_validity == OrmTrackedSubjectValidity::Untracked
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
        fn set_validity(
            current: &mut OrmTrackedSubjectValidity,
            new_val: OrmTrackedSubjectValidity,
        ) {
            if new_val == OrmTrackedSubjectValidity::Invalid {
                *current = OrmTrackedSubjectValidity::Invalid;
            } else {
                *current = new_val;
            }
        }

        // Check 3) If there is an infinite loop of parents pointing back to us, return invalid.
        // Create a set of visited parents to detect cycles.
        if has_cycle(&tracked_subject, &mut HashSet::new()) {
            // Remove tracked predicates and set invalid.
            tracked_subject.tracked_predicates = HashMap::new();
            tracked_subject.valid = OrmTrackedSubjectValidity::Invalid;
            return vec![];
        }

        // Check 4) Validate subject against each predicate in shape.
        for p_schema in shape.predicates.iter() {
            let p_change = s_change.predicates.get(&p_schema.iri);
            let tracked_pred = p_change.map(|pc| pc.tracked_predicate.read().unwrap());

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
                let some_valid = p_schema.dataTypes.iter().flat_map(|dt| &dt.literals).any(
                    |required_literals| {
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
                    },
                );
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
                        .map(|tc| tc.read().unwrap())
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

                    // Set our own validity to pending and add it to need_evaluation for later.
                    set_validity(&mut new_validity, OrmTrackedSubjectValidity::Pending);
                    need_evaluation.push((
                        s_change.subject_iri.to_string(),
                        shape.iri.clone(),
                        false,
                    ));
                    // Schedule untracked children for fetching and validation.
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
                    // If we have pending nested objects, we need to wait for their evaluation.
                    set_validity(&mut new_validity, OrmTrackedSubjectValidity::Pending);
                    // Schedule pending children for re-evaluation without fetch.
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
                .map(|parent| {
                    let p = parent.read().unwrap();
                    (p.subject_iri.clone(), p.shape.iri.clone(), false)
                })
                // Add `need_evaluation`.
                .chain(need_evaluation)
                .collect();
        }

        tracked_subject.valid = new_validity;

        return need_evaluation;
    }
}

fn has_cycle(subject: &OrmTrackedSubject, visited: &mut HashSet<String>) -> bool {
    if visited.contains(&subject.subject_iri) {
        return true;
    }
    visited.insert(subject.subject_iri.clone());
    for (_parent_iri, parent_subject) in &subject.parents {
        if has_cycle(&parent_subject.read().unwrap(), visited) {
            return true;
        }
    }
    visited.remove(&subject.subject_iri);
    false
}
