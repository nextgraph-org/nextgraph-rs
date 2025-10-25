// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use crate::orm::types::*;
use crate::verifier::*;
use ng_net::orm::*;
use ng_repo::log::*;

type NeedsFetchBool = bool;

impl Verifier {
    /// Check the validity of a subject and update affecting tracked subjects' validity.
    /// Might return nested objects that need to be validated.
    /// Assumes all quads to have same subject and graph.
    pub fn update_subject_validity(
        s_change: &mut TrackedOrmObjectChange,
        shape: &OrmSchemaShape,
        orm_subscription: &mut OrmSubscription,
    ) -> Vec<(SubjectIri, ShapeIri, NeedsFetchBool)> {
        let subject_iri = s_change
            .tracked_orm_object
            .read()
            .unwrap()
            .subject_iri
            .clone();
        let Some(tracked_subject) = orm_subscription
            .get_tracked_object_any_graph(&subject_iri, &shape.iri)
        else {
            return vec![];
        };
        let mut tracked_subject = tracked_subject.write().unwrap();
        let previous_validity = s_change.prev_valid.clone();

        // Keep track of objects that need to be validated against a shape to fetch and validate.
        let mut need_evaluation: Vec<(String, String, bool)> = vec![];

        log_debug!(
            "[Validation] for shape {} and subject {}",
            shape.iri,
            subject_iri
        );

        // Check 1) Check if this object is untracked and we need to remove children and ourselves.
        if previous_validity == TrackedOrmObjectValidity::Untracked
        //   If .valid is pending, this part was executed before in this validation round.
            && tracked_subject.valid != TrackedOrmObjectValidity::Pending
        {
            // 1.1) Schedule children for deletion
            // 1.1.1) Set all children to `untracked` that don't have other parents.
            for tracked_predicate in tracked_subject.tracked_predicates.values() {
                for child in &tracked_predicate.write().unwrap().tracked_children {
                    let mut tracked_child = child.write().unwrap();
                    if tracked_child.parents.is_empty()
                        || (tracked_child.parents.len() == 1
                            && tracked_child
                                .parents
                                .contains_key(&tracked_subject.subject_iri))
                    {
                        tracked_child.valid = TrackedOrmObjectValidity::Untracked;
                    }
                }
            }

            // 1.1.2) Add all children to need_evaluation for their cleanup.
            for tracked_predicate in tracked_subject.tracked_predicates.values() {
                for child in &tracked_predicate.write().unwrap().tracked_children {
                    let child = child.read().unwrap();
                    need_evaluation.push((
                        child.subject_iri.clone(),
                        child.shape.iri.clone(),
                        false,
                    ));
                }
            }

            // 1.2) If we don't have parents, we need to remove ourself too.
            if tracked_subject.parents.is_empty() {
                // Drop the guard to release the immutable borrow
                drop(tracked_subject);

                orm_subscription.remove_subject_everywhere(&subject_iri);
            }

            return need_evaluation;
        }

        // Check 2) If there are no changes, there is nothing to do.
        if s_change.predicates.is_empty() {
            return vec![];
        }

        let mut new_validity = TrackedOrmObjectValidity::Valid;
        fn set_validity(current: &mut TrackedOrmObjectValidity, new_val: TrackedOrmObjectValidity) {
            if new_val == TrackedOrmObjectValidity::Invalid {
                *current = TrackedOrmObjectValidity::Invalid;
            } else {
                *current = new_val;
            }
        }

        // Check 3) Validate subject against each predicate in shape.
        for p_schema in shape.predicates.iter() {
            let p_change = s_change.predicates.get(&p_schema.iri);
            let tracked_pred = tracked_subject
                .tracked_predicates
                .get(&p_schema.iri)
                .map(|tp_write_lock| tp_write_lock.read().unwrap());

            let count = tracked_pred
                .as_ref()
                .map_or_else(|| 0, |tp| tp.current_cardinality);

            // Check 3.1) Cardinality
            if count < p_schema.minCardinality {
                log_debug!(
                    "  - Invalid: minCardinality not met | predicate: {:?} | count: {} | min: {} | schema: {:?} | changed: {:?}",
                    p_schema.iri,
                    count,
                    p_schema.minCardinality,
                    shape.iri,
                    p_change
                );
                set_validity(&mut new_validity, TrackedOrmObjectValidity::Invalid);
                if count <= 0 {
                    // If cardinality is 0, we can remove the tracked predicate.
                    // Drop the guard to release the immutable borrow
                    drop(tracked_pred);
                    tracked_subject.tracked_predicates.remove(&p_schema.iri);
                }
                break;
            // Check 3.2) Cardinality too high and extra values not allowed.
            } else if count > p_schema.maxCardinality
                && p_schema.maxCardinality != -1
                && p_schema.extra != Some(true)
            {
                log_debug!(
                    "  - Invalid: maxCardinality exceeded | predicate: {:?} | count: {} | max: {} | schema: {:?} | changed: {:?}",
                    p_schema.iri,
                    count,
                    p_schema.maxCardinality,
                    shape.iri,
                    p_change
                );
                // If cardinality is too high and no extra allowed, invalid.
                set_validity(&mut new_validity, TrackedOrmObjectValidity::Invalid);
                break;
            // Check 3.3) Required literals present.
            } else if p_schema
                .dataTypes
                .iter()
                .any(|dt| dt.valType == OrmSchemaValType::literal)
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
                    log_debug!(
                        "  - Invalid: required literals missing | predicate: {:?} | schema: {:?} | changed: {:?}",
                        p_schema.iri,
                        shape.iri,
                        p_change
                    );
                    set_validity(&mut new_validity, TrackedOrmObjectValidity::Invalid);
                    break;
                }
            // Check 3.4) Nested shape correct.
            } else if p_schema
                .dataTypes
                .iter()
                .any(|dt| dt.valType == OrmSchemaValType::shape)
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
                            if tc.valid == TrackedOrmObjectValidity::Valid {
                                (1, 0, 0, 0)
                            } else if tc.valid == TrackedOrmObjectValidity::Invalid {
                                (0, 1, 0, 0)
                            } else if tc.valid == TrackedOrmObjectValidity::Pending {
                                (0, 0, 1, 0)
                            } else if tc.valid == TrackedOrmObjectValidity::Untracked {
                                (0, 0, 0, 1)
                            } else {
                                (0, 0, 0, 0)
                            }
                        })
                        .fold((0, 0, 0, 0), |(v1, i1, u1, ut1), o| {
                            (v1 + o.0, i1 + o.1, u1 + o.2, ut1 + o.3)
                        })
                });

                log_debug!("  - checking nested - Counts: {:?}", counts);

                if counts.1 > 0 && p_schema.extra != Some(true) {
                    log_debug!(
                        "  - Invalid: nested invalid child | predicate: {:?} | schema: {:?} | changed: {:?}",
                        p_schema.iri,
                        shape.iri,
                        p_change
                    );
                    // If we have at least one invalid nested object
                    // and no extra (in this case this means invalid) allowed, invalid.
                    set_validity(&mut new_validity, TrackedOrmObjectValidity::Invalid);
                    break;
                } else if counts.0 > p_schema.maxCardinality && p_schema.maxCardinality != -1 {
                    log_debug!(
                        "  - Invalid: Too many valid children: | predicate: {:?} | schema: {:?} | changed: {:?}",
                        p_schema.iri,
                        shape.iri,
                        p_change
                    );
                    // If there are more valid children than what's allowed, break.
                    set_validity(&mut new_validity, TrackedOrmObjectValidity::Invalid);
                    break;
                } else if counts.0 + counts.2 + counts.3 < p_schema.minCardinality {
                    log_debug!(
                        "  - Invalid: not enough nested children | predicate: {:?} | valid_count: {} | min: {} | schema: {:?} | changed: {:?}",
                        p_schema.iri,
                        counts.0,
                        p_schema.minCardinality,
                        shape.iri,
                        p_change
                    );
                    // If we don't have enough nested objects, invalid.
                    set_validity(&mut new_validity, TrackedOrmObjectValidity::Invalid);
                    break;
                } else if counts.3 > 0 {
                    // If we have untracked nested objects, we need to fetch them and validate.

                    // Set our own validity to pending and add it to need_evaluation for later.
                    set_validity(&mut new_validity, TrackedOrmObjectValidity::Pending);
                    need_evaluation.push((
                        subject_iri.clone(),
                        shape.iri.clone(),
                        false,
                    ));
                    // Schedule untracked children for fetching and validation.
                    tracked_children.as_ref().map(|children| {
                        for child in children {
                            if child.valid == TrackedOrmObjectValidity::Untracked {
                                need_evaluation.push((
                                    child.subject_iri.clone(),
                                    child.shape.iri.clone(),
                                    true,
                                ));
                            }
                        }
                    });
                } else if counts.2 > 0 {
                    // If we have pending children, we need to wait for their evaluation.
                    set_validity(&mut new_validity, TrackedOrmObjectValidity::Pending);
                    // Schedule pending children for re-evaluation without fetch.
                    tracked_children.as_ref().map(|children| {
                        for child in children {
                            if child.valid == TrackedOrmObjectValidity::Pending {
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
            // Check 3.5) Data types correct.
            } else {
                // Check if the data type is correct.
                let allowed_types: Vec<&OrmSchemaValType> =
                    p_schema.dataTypes.iter().map(|dt| &dt.valType).collect();
                // For each new value, check that data type is in allowed_types.
                for val_added in p_change.iter().map(|pc| &pc.values_added).flatten() {
                    let matches = match val_added {
                        BasicType::Bool(_) => allowed_types
                            .iter()
                            .any(|t| **t == OrmSchemaValType::boolean),
                        BasicType::Num(_) => allowed_types
                            .iter()
                            .any(|t| **t == OrmSchemaValType::number),
                        BasicType::Str(_) => allowed_types.iter().any(|t| {
                            **t == OrmSchemaValType::string || **t == OrmSchemaValType::iri
                        }),
                    };
                    if !matches {
                        log_debug!(
                            "  - Invalid: value type mismatch | predicate: {:?} | value: {:?} | allowed_types: {:?} | schema: {:?} | changed: {:?}",
                            p_schema.iri,
                            val_added,
                            allowed_types,
                            shape.iri,
                            p_change
                        );
                        set_validity(&mut new_validity, TrackedOrmObjectValidity::Invalid);
                        break;
                    }
                }
                // Break again if validity has become invalid.
                if new_validity == TrackedOrmObjectValidity::Invalid {
                    break;
                }
            };
        }

        // == End of validation part. Next, process side-effects ==

        tracked_subject.valid = new_validity.clone();

        // First, if we have a definite decision, we set is_validated to true.
        if new_validity != TrackedOrmObjectValidity::Pending {
            s_change.is_validated = true;
        }

        if new_validity == TrackedOrmObjectValidity::Invalid {
            // For invalid subjects, we schedule cleanup.
            if tracked_subject.parents.len() == 0 {
                tracked_subject.valid = TrackedOrmObjectValidity::Invalid;
            } else {
                tracked_subject.valid = TrackedOrmObjectValidity::ToDelete;
            }

            // Add all children to need_evaluation for their cleanup.
            for tracked_predicate in tracked_subject.tracked_predicates.values() {
                for child in &tracked_predicate.write().unwrap().tracked_children {
                    let child = child.read().unwrap();
                    need_evaluation.push((
                        child.subject_iri.clone(),
                        child.shape.iri.clone(),
                        false,
                    ));
                }
            }
        } else if new_validity == TrackedOrmObjectValidity::Valid
            && previous_validity != TrackedOrmObjectValidity::Valid
        {
            // If this subject became valid, we need to refetch this subject.
            // If the data has already been fetched, the parent function will prevent the refetch.
            need_evaluation.insert(0, (subject_iri.clone(), shape.iri.clone(), true));
        }

        // If validity changed, parents need to be re-evaluated.
        if new_validity != previous_validity {
            // Parents that are not tracking this subject, don't need to be added.
            // Remember that the last elements are evaluated first.
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

        return need_evaluation;
    }
}
