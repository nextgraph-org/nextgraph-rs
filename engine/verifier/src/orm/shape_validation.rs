// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use std::sync::{Arc, RwLock};

use crate::orm::types::*;
use crate::orm::utils::assess_and_rank_children;
use crate::verifier::*;
use ng_net::orm::*;
use ng_repo::log::*;

impl Verifier {
    /// Check the validity of a subject and update affecting tracked orm objects' validity.
    /// Assumes all quads to have same subject and graph.
    /// Returns a triple of
    /// - children to evaluate (each with a bool indicating if the child needs to be fetched).
    /// - parents to evaluate (after children and self)
    /// - if the orm object needs to be re-evaluated (and perhaps fetched) after evaluation of children.
    pub fn update_subject_validity(
        s_change: &mut TrackedOrmObjectChange,
        shape: &OrmSchemaShape,
        orm_subscription: &mut OrmSubscription,
    ) -> (
        Vec<(Arc<RwLock<TrackedOrmObject>>, bool)>,
        Vec<Arc<RwLock<TrackedOrmObject>>>,
        NeedEvalSelf,
    ) {
        let mut tracked_orm_object = s_change.tracked_orm_object.write().unwrap();
        let previous_validity = s_change.prev_valid.clone();

        // log_info!(
        //     "[Validating] {} against shape {}",
        //     tracked_orm_object.subject_iri,
        //     tracked_orm_object.shape.upgrade().unwrap().iri
        // );

        // Keep track of objects that need to be validated against a shape to fetch and validate.
        let mut children_to_eval: Vec<(Arc<RwLock<TrackedOrmObject>>, bool)> = vec![];
        let mut needs_self_reevaluation: NeedEvalSelf = NeedEvalSelf::NoReevaluate;

        // Check 1) Check if this object is untracked and we need to remove children and ourselves.
        if previous_validity == TrackedOrmObjectValidity::Untracked
        //   If .valid is pending, this part was executed before in this validation round.
            && tracked_orm_object.valid != TrackedOrmObjectValidity::Pending
        {
            // 1.1) Schedule children for deletion
            // 1.1.1) Set all children to `untracked` that don't have other parents.
            for tracked_predicate in tracked_orm_object.tracked_predicates.values() {
                let mut tp_guard = tracked_predicate.write().unwrap();
                // prune dead children first
                tp_guard.tracked_children.retain(|w| w.upgrade().is_some());
                for child_w in &tp_guard.tracked_children {
                    if let Some(child_arc) = child_w.upgrade() {
                        let mut tracked_child = child_arc.write().unwrap();
                        // prune dead parents
                        tracked_child.parents.retain(|pw| pw.upgrade().is_some());
                        let live_parents: Vec<_> = tracked_child
                            .parents
                            .iter()
                            .filter_map(|pw| pw.upgrade())
                            .collect();
                        let sole_parent_matches = live_parents.len() == 1 && {
                            let p = live_parents[0].read().unwrap();
                            p.subject_iri == tracked_orm_object.subject_iri
                                && p.graph_iri == tracked_orm_object.graph_iri
                        };
                        if live_parents.is_empty() || sole_parent_matches {
                            tracked_child.valid = TrackedOrmObjectValidity::Untracked;
                        }
                    }
                }
            }

            // 1.1.2) Add all children to need_evaluation for their cleanup.
            for tracked_predicate in tracked_orm_object.tracked_predicates.values() {
                let mut tp_guard = tracked_predicate.write().unwrap();
                tp_guard.tracked_children.retain(|w| w.upgrade().is_some());
                for child_w in &tp_guard.tracked_children {
                    if let Some(child_arc) = child_w.upgrade() {
                        children_to_eval.push((child_arc.clone(), false));
                    }
                }
            }

            // 1.2) If we don't have parents, we need to remove ourself too.
            let live_parents: Vec<_> = tracked_orm_object
                .parents
                .iter()
                .filter_map(|w| w.upgrade())
                .collect();
            if live_parents.is_empty() {
                if let Some(shape_arc) = tracked_orm_object.shape.upgrade() {
                    orm_subscription.remove_tracked_orm_object(
                        &tracked_orm_object.graph_iri,
                        &tracked_orm_object.subject_iri,
                        &shape_arc.iri,
                    );
                }
            }

            return (children_to_eval, vec![], NeedEvalSelf::NoReevaluate);
        }

        // Check 2) If there are no changes and this has been evaluated before, there is nothing to do.
        if s_change.predicates.is_empty() && previous_validity != TrackedOrmObjectValidity::Pending
        {
            return (vec![], vec![], NeedEvalSelf::NoReevaluate);
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
            let tracked_pred = tracked_orm_object
                .tracked_predicates
                .get(&p_schema.iri)
                .map(|tp_write_lock| tp_write_lock.read().unwrap());

            let count = tracked_pred
                .as_ref()
                .map_or_else(|| 0, |tp| tp.current_cardinality);

            // Check 3.1) Cardinality
            if count < p_schema.minCardinality {
                // log_info!(
                //     "  - Invalid: minCardinality not met | predicate: {:?} | count: {} | min: {} | schema: {:?} | changed: {:?}",
                //     p_schema.iri,
                //     count,
                //     p_schema.minCardinality,
                //     shape.iri,
                //     p_change
                // );
                set_validity(&mut new_validity, TrackedOrmObjectValidity::Invalid);
                if count <= 0 {
                    // If cardinality is 0, we can remove the tracked predicate.
                    // Drop the guard to release the immutable borrow
                    drop(tracked_pred);
                    tracked_orm_object.tracked_predicates.remove(&p_schema.iri);
                }
                break;
            // Check 3.2) Cardinality too high and extra values not allowed.
            } else if count > p_schema.maxCardinality
                && p_schema.maxCardinality != -1
                && p_schema.extra != Some(true)
            {
                // log_info!(
                //     "  - Invalid: maxCardinality exceeded | predicate: {:?} | count: {} | max: {} | schema: {:?} | changed: {:?}",
                //     p_schema.iri,
                //     count,
                //     p_schema.maxCardinality,
                //     shape.iri,
                //     p_change
                // );
                // If cardinality is too high and no extra allowed, invalid.
                set_validity(&mut new_validity, TrackedOrmObjectValidity::Invalid);
                break;
            // Check 3.3) Required literals present.
            } else if p_schema
                .dataTypes
                .iter()
                .any(|dt| dt.valType == OrmSchemaValType::literal)
            {
                // If the predicate is optional and has no values, skip literal validation
                if p_schema.minCardinality == 0 && count == 0 {
                    continue;
                }

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
                    // log_info!(
                    //     "  - Invalid: required literals missing | predicate: {:?} | schema: {:?} | changed: {:?}",
                    //     p_schema.iri,
                    //     shape.iri,
                    //     p_change
                    // );
                    // If there are more valid children than what's allowed, break.
                    set_validity(&mut new_validity, TrackedOrmObjectValidity::Invalid);
                    break;
                }
            // Check 3.4) Nested shape correct.
            } else if p_schema
                .dataTypes
                .iter()
                .any(|dt| dt.valType == OrmSchemaValType::shape)
            {
                // If we have a nested shape, assess children using heuristic and cardinality checks
                if let Some(tp) = tracked_pred.as_ref() {
                    let children_upgraded: Vec<_> = tp
                        .tracked_children
                        .iter()
                        .filter_map(|w| w.upgrade())
                        .collect();
                    let assessed = assess_and_rank_children(
                        &tracked_orm_object.graph_iri,
                        &tracked_orm_object.subject_iri,
                        p_schema.minCardinality,
                        p_schema.maxCardinality,
                        &children_upgraded,
                    );

                    // log_info!(
                    //     "  - Nested shape assessment: heuristic={:?}, considered={}, valid={}, pending={}, untracked={}, invalid={}, satisfies={}",
                    //     assessed.heuristic_used,
                    //     assessed.considered.len(),
                    //     assessed.counts.valid,
                    //     assessed.counts.pending,
                    //     assessed.counts.untracked,
                    //     assessed.counts.invalid,
                    //     assessed.satisfies
                    // );

                    if assessed.satisfies {
                        // Cardinality satisfied, predicate is valid
                        continue;
                    }

                    // Check if we have children that need fetching or re-evaluation
                    if !assessed.children_to_fetch.is_empty()
                        || !assessed.children_to_reevaluate.is_empty()
                    {
                        set_validity(&mut new_validity, TrackedOrmObjectValidity::Pending);
                        needs_self_reevaluation = NeedEvalSelf::Reevaluate;

                        // Schedule children for fetching
                        for child in assessed.children_to_fetch {
                            children_to_eval.push((child, true));
                        }

                        // Schedule children for re-evaluation
                        for child in assessed.children_to_reevaluate {
                            // log_info!(
                            //     "  - adding subject {} with graph {} to child evaluation",
                            //     child.read().unwrap().subject_iri,
                            //     child.read().unwrap().graph_iri,
                            // );
                            children_to_eval.push((child, false));
                        }
                        continue;
                    }

                    // Neither satisfied nor pending - invalid
                    // log_info!(
                    //     "  - Invalid: nested shape constraint not met | predicate: {:?} | valid_count: {} | min: {} | schema: {:?}",
                    //     p_schema.iri,
                    //     assessed.counts.valid,
                    //     p_schema.minCardinality,
                    //     shape.iri
                    // );
                    set_validity(&mut new_validity, TrackedOrmObjectValidity::Invalid);
                    break;
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
                        // log_info!(
                        //     "  - Invalid: value type mismatch | predicate: {:?} | value: {:?} | allowed_types: {:?} | schema: {:?} | changed: {:?}",
                        //     p_schema.iri,
                        //     val_added,
                        //     allowed_types,
                        //     shape.iri,
                        //     p_change
                        // );
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

        // === End of validation part. Next, process side-effects ===

        tracked_orm_object.valid = new_validity.clone();

        // First, if we have a definite decision, we set is_validated to true.
        if new_validity != TrackedOrmObjectValidity::Pending {
            s_change.is_validated = true;
        }

        if new_validity == TrackedOrmObjectValidity::Invalid {
            // For invalid subjects, we schedule cleanup.
            if tracked_orm_object.parents.len() == 0 {
                tracked_orm_object.valid = TrackedOrmObjectValidity::Invalid;
            } else {
                tracked_orm_object.valid = TrackedOrmObjectValidity::ToDelete;
            }

            // Add all children to need_evaluation for their cleanup.
            for tracked_predicate in tracked_orm_object.tracked_predicates.values() {
                let mut tp_guard = tracked_predicate.write().unwrap();
                tp_guard.tracked_children.retain(|w| w.upgrade().is_some());
                for child_w in &tp_guard.tracked_children {
                    if let Some(child_arc) = child_w.upgrade() {
                        children_to_eval.push((child_arc.clone(), false));
                    }
                }
            }
        } else if new_validity == TrackedOrmObjectValidity::Valid
            && previous_validity != TrackedOrmObjectValidity::Valid
        {
            // If this subject became valid, we need to refetch this subject.
            // If the data has already been fetched, the parent function will prevent the refetch.
            needs_self_reevaluation = NeedEvalSelf::FetchAndReevaluate;
        }

        // If validity changed, parents need to be re-evaluated.

        if new_validity != previous_validity {
            // Parents that are not tracking this subject, don't need to be added.

            return (
                children_to_eval,
                tracked_orm_object
                    .parents
                    .iter()
                    .filter_map(|w| w.upgrade())
                    .collect(),
                needs_self_reevaluation,
            );
        }

        return (children_to_eval, vec![], needs_self_reevaluation);
    }
}

#[derive(Debug, PartialEq)]
pub enum NeedEvalSelf {
    Reevaluate,
    FetchAndReevaluate,
    NoReevaluate,
}
