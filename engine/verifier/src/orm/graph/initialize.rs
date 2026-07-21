// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use futures::channel::mpsc::UnboundedSender;
use futures::SinkExt;
use ng_net::orm::*;
pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_net::utils::Receiver;
use ng_oxigraph::oxrdf::GraphName;
use ng_oxigraph::oxrdf::Subject;
use ng_repo::log::*;
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;
use std::collections::HashSet;
use std::sync::Arc;
use std::sync::RwLock;

use crate::orm::graph::types::*;
use crate::orm::graph::utils::basic_type_to_json;
use crate::orm::graph::utils::order_key_from;
use crate::orm::graph::utils::{assess_and_rank_children, nuri_to_string};
use crate::orm::utils::composite_key;
use crate::types::CancelFn;
use crate::verifier::Verifier;
use ng_net::app_protocol::{AppResponse, AppResponseV0, NuriV0};
use ng_repo::errors::NgError;

use futures::channel::mpsc;

use crate::orm::graph::types::TrackedOrmObjectChange;

impl Verifier {
    /// Entry point to create a new orm subscription.
    /// Triggers the creation of an orm object which is sent back to the receiver.
    pub(crate) async fn start_orm(
        &mut self,
        graph_scope: Vec<NuriV0>,
        subject_scope: Vec<String>,
        shape_type: OrmShapeType,
        config: OrmConfig,
    ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
        let (mut tx, rx) = mpsc::unbounded::<AppResponse>();

        self.orm_subscription_counter += 1;
        // Create new subscription and add to self.orm_subscriptions
        let orm_subscription = match OrmSubscription::new(
            shape_type,
            self.orm_subscription_counter,
            graph_scope
                .iter()
                .map(|nuri| nuri_to_string(nuri))
                .collect(),
            subject_scope,
            tx.clone(),
            config,
        ) {
            Ok(r) => r,
            Err(error) => {
                log_err!(
                    "Error occurred while creating orm subscription: {:?}",
                    error
                );
                return Err(error);
            }
        };

        if let Err(error) = self
            .create_orm_objects_and_insert_subscription(orm_subscription, &mut tx)
            .await
        {
            log_err!(
                "Error occurred while creating orm subscription: {:?}",
                error
            );
            return Err(error);
        };

        let close = Box::new(move || {
            if !tx.is_closed() {
                tx.close_channel();
            }
        });
        Ok((rx, close))
    }

    /// For a nuri, session, and shape, create an ORM JSON object.
    async fn create_orm_objects_and_insert_subscription(
        &mut self,
        mut orm_subscription: OrmSubscription,
        tx: &mut UnboundedSender<AppResponse>,
    ) -> Result<(), NgError> {
        let materialized_objects = if orm_subscription.config.order_by.is_some() {
            // If ordering is active, make an additional query that queries ordered graph-subject pairs first.
            // If pagination is activated, not all graph-subject pairs are fetched.

            self.create_orm_objects_for_ordered(&mut orm_subscription)
                .await?
        } else {
            self.create_orm_objects_for_unordered(&mut orm_subscription)
                .await?
        };

        let _ = tx
            .send(AppResponse::V0(AppResponseV0::GraphOrmInitial(
                materialized_objects,
                orm_subscription.subscription_id,
            )))
            .await;

        // sync and subscribe to all the graphs found by ORM.
        // This can have the side effect of sending more AppResponses to the stream
        // (in case some new updates have been received while we were building the initial values).
        // For this reason, it happens AFTER the GraphOrmInitial is sent (just above) because
        // the client cannot apply OrmPatches if it didn't receive the GraphOrmInitial first.
        for graph in orm_subscription.iter_graphs() {
            let nuri = NuriV0::new_from_repo_graph(graph)?;
            self.open_for_target(&nuri.target, true).await?;
        }

        // Add to verifier's map of subscriptions.
        self.orm_subscriptions
            .insert(orm_subscription.subscription_id, orm_subscription);

        Ok(())
    }

    async fn create_orm_objects_for_ordered(
        &mut self,
        orm_subscription: &mut OrmSubscription,
    ) -> Result<serde_json::Value, NgError> {
        let (materialized_objects, _) = self
            .query_items_ordered(orm_subscription, true, false)
            .await?;

        Ok(json!(materialized_objects.unwrap()))
    }

    /// No pagination, no sorting.
    async fn create_orm_objects_for_unordered(
        &mut self,
        orm_subscription: &mut OrmSubscription,
    ) -> Result<serde_json::Value, NgError> {
        // Changes to tormos which we use for materialization.
        let mut changes: OrmChanges = HashMap::new();

        // Query quads for this shape
        let shape_quads = if orm_subscription.graph_scope.is_empty() {
            vec![]
        } else {
            self.query_quads_for_shape(
                &orm_subscription.graph_scope,
                &orm_subscription.shape_type.schema,
                &orm_subscription.shape_type.shape,
                Some(&orm_subscription.subject_scope),
            )?
        };

        self.process_changes_for_subscription(
            orm_subscription,
            &shape_quads,
            &[],
            &mut changes,
            true,
        )?;

        // === Materialization ===
        let mut materialized_objects: serde_json::Value;

        // If the query was not ordered. We insert all materialized objects in a root map.

        materialized_objects = json!({});
        let obj_map = materialized_objects.as_object_mut().unwrap();

        // For each valid change struct, we build an orm object.
        for (graph_iri, subject_iri, tracked_orm_object) in
            orm_subscription.iter_objects_by_shape(&orm_subscription.shape_type.shape)
        {
            let tormo = tracked_orm_object.read().unwrap();

            if tormo.valid == TrackedOrmObjectValidity::Valid {
                if let Some(change_ref) = changes
                    .get(&orm_subscription.shape_type.shape)
                    .and_then(|g| g.get(&graph_iri))
                    .and_then(|s| s.get(&subject_iri))
                {
                    let new_val = materialize_orm_object(change_ref, true, &changes);
                    obj_map.insert(composite_key(&tormo), new_val);
                }
            }
        }

        Ok(materialized_objects)
    }

    pub(crate) async fn orm_load_next_page(&mut self, subscription_id: u64) -> Result<(), NgError> {
        self.orm_load_page(subscription_id, true).await
    }

    pub(crate) async fn orm_load_previous_page(
        &mut self,
        subscription_id: u64,
    ) -> Result<(), NgError> {
        self.orm_load_page(subscription_id, false).await
    }

    pub(crate) async fn orm_load_page(
        &mut self,
        subscription_id: u64,
        forward: bool,
    ) -> Result<(), NgError> {
        log_warn!("[orm_load_page] In orm_load_page for subscription_id {subscription_id}");

        let mut orm_subscription =
            self.orm_subscriptions
                .remove(&subscription_id)
                .ok_or_else(|| {
                    NgError::OrmError(format!("Subscription {subscription_id} not found"))
                })?;

        if orm_subscription.ordering_info.is_none() {
            self.orm_subscriptions
                .insert(subscription_id, orm_subscription);
            return Err(NgError::OrmError(format!(
                "Cannot load next page. Pagination is not active for subscription {}.",
                subscription_id
            )));
        };

        // A new query is started with an updated range.
        let (_, new_objects) = self
            .query_items_ordered(&mut orm_subscription, forward, true)
            .await?;

        let page_info = orm_subscription.ordering_info.as_mut().unwrap();
        let mut patches: Vec<OrmPatch> = Vec::new();

        // Create add patches for new objects.
        for (i, new_object) in new_objects.unwrap().into_iter() {
            patches.push(OrmPatch {
                op: OrmPatchOp::add,
                value: Some(new_object),
                path: format!("/{}", i),
                ..Default::default()
            });
        }

        // If more items are now loaded than allowed, remove them from ordering_info.tormos, untrack, and create remove patches.
        if let Some(max_allowed_items) = orm_subscription.config.max_allowed_items() {
            let n_current_valid = page_info.tormos.len();
            let excess_items = n_current_valid as i32 - max_allowed_items as i32;
            let mut removes: Vec<(GraphIri, SubjectIri)> =
                Vec::with_capacity(i32::max(0, excess_items) as usize);

            // Remove items from page_info.tormos.
            if forward {
                // Remove first items.
                for _i in 0..excess_items {
                    let (_, removed) = page_info.tormos.pop_first().unwrap();
                    let g = removed.read().unwrap().graph_iri.clone();
                    let s = removed.read().unwrap().subject_iri.clone();
                    removes.push((g, s));

                    patches.push(OrmPatch {
                        op: OrmPatchOp::remove,
                        path: format!("/0"),
                        ..Default::default()
                    });
                }
            } else {
                // Remove last items.
                for i in (0..excess_items).rev() {
                    let (_, removed) = page_info.tormos.pop_last().unwrap();
                    let g = removed.read().unwrap().graph_iri.clone();
                    let s = removed.read().unwrap().subject_iri.clone();
                    removes.push((g, s));

                    let remove_index = n_current_valid as i32 - i - 1;
                    patches.push(OrmPatch {
                        op: OrmPatchOp::remove,
                        path: format!("/{remove_index}"),
                        ..Default::default()
                    });
                }
            }
            // Untrack.
            for (graph_iri, subject_iri) in removes {
                orm_subscription.remove_tracked_orm_object(
                    &graph_iri,
                    &subject_iri,
                    &orm_subscription.root_shape().iri,
                );
            }
        }

        // Send patches.
        let _ = orm_subscription
            .sender
            .clone()
            .send(AppResponse::V0(AppResponseV0::GraphOrmUpdate(patches)))
            .await;

        self.orm_subscriptions
            .insert(subscription_id, orm_subscription);

        Ok(())
    }

    /// Queries the next page or all items if pagination is not enabled.
    /// Updates orm_subscription in that process.
    /// Returns the JSON-serialized items / page.
    async fn query_items_ordered(
        &mut self,
        orm_subscription: &mut OrmSubscription,
        forward: bool,
        get_with_insert_pos: bool,
    ) -> Result<(Option<Vec<Value>>, Option<Vec<(usize, Value)>>), NgError> {
        let mut changes: OrmChanges = HashMap::new();
        let root_shape = orm_subscription.root_shape();

        // Case pagination:
        // We query the next page with a greater range to assure that we acquire our desired results.
        // On the one side, the previous offset might have shifted. On the other, not enough valid graph-subject pairs
        // might be returned with a small query window.
        let mut limit_offset = if let Some((limit, lower_offset, upper_offset)) = orm_subscription
            .ordering_info
            .as_mut()
            .unwrap()
            .limit_lower_upper_offset
            .clone()
        {
            if forward {
                Some((limit, upper_offset))
            } else {
                Some((limit, lower_offset))
            }
        } else {
            None
        };

        let page_size = orm_subscription.config.page_size;
        let previously_valid = orm_subscription.valid_object_count();
        let max_allowed_items = orm_subscription.config.max_allowed_items();

        let mut ordered_gs_results: Vec<(GraphIri, SubjectIri)> = vec![];

        // Query database and process results (potentially more than one query when in pagination).
        loop {
            // Do order query.
            // Query everything if limit_offset is None, else restrict to that.
            let graph_subject_page = self.query_graph_subjects(&orm_subscription, limit_offset)?;
            let returned_gs_items = graph_subject_page.len();

            // Query quads for this shape.
            let shape_quads = if orm_subscription.graph_scope.is_empty() {
                vec![]
            } else {
                // Query scoped to items from ordered_page.
                self.query_quads_for_shape(
                    &graph_subject_page.iter().map(|(g, _s)| g.clone()).collect(),
                    &orm_subscription.shape_type.schema,
                    &orm_subscription.shape_type.shape,
                    Some(&graph_subject_page.iter().map(|(_g, s)| s.clone()).collect()),
                )?
            };

            let graph_subject_page_new_only: Vec<(GraphIri, SubjectIri)> = graph_subject_page
                .iter()
                .filter(|(g, s)| {
                    // If the corresponding tormo exists already (overlap, we have the tormo already), there is nothing to do.
                    orm_subscription
                        .get_tracked_orm_object(g, s, &root_shape.iri)
                        .is_none()
                })
                .cloned()
                .collect();
            let new_page_set: HashSet<(String, String)> =
                HashSet::from_iter(graph_subject_page_new_only.clone());
            let shape_quads = shape_quads
                .into_iter()
                .filter(|q| {
                    let (GraphName::NamedNode(g), Subject::NamedNode(s)) =
                        (&q.graph_name, &q.subject)
                    else {
                        return false;
                    };

                    // Check if the (g,s) is in the gs-query result.
                    let key = (g.as_str().to_string(), s.as_str().to_string());
                    new_page_set.contains(&key)
                })
                .collect::<Vec<_>>();

            if let Some(limit_offset) = limit_offset {
                log_warn!(
                    "[query_items_ordered]\n(Offset, Limit:) ({}, {})\nreturned {} items\nthereof new: {}\nnew in total {}",
                    limit_offset.1,
                    limit_offset.0,
                    returned_gs_items,
                    graph_subject_page_new_only.len(),
                    ordered_gs_results.len() + graph_subject_page_new_only.len()
                );
            }

            // Add gs results to existing results.
            ordered_gs_results.extend(graph_subject_page_new_only);

            // Add new quads to tracker and validate
            self.process_changes_for_subscription(
                orm_subscription,
                &shape_quads,
                &[],
                &mut changes,
                true,
            )?;

            // Determine if we should extend the page-order query (because not enough valid items were returned).
            if let Some((old_limit, old_offset)) = limit_offset {
                if returned_gs_items < old_limit
                    || ordered_gs_results.len() >= page_size
                    || (!forward && old_offset == 0)
                {
                    // No more items retrievable for query
                    // or enough valid ones were returned.
                    break;
                } else {
                    // Not enough items were valid.
                    if forward {
                        limit_offset = Some((
                            // Increase limit exponentially.
                            (old_limit as f32 * 1.5) as usize,
                            // Update offset (only in the loop so we don't query and apply the same data twice).
                            old_offset + old_limit,
                        ));
                    } else {
                        // Increase limit exponentially.
                        let new_offset =
                            old_offset.saturating_sub((old_limit as f32 * 1.5) as usize);
                        limit_offset = Some((
                            old_offset - new_offset,
                            // Update offset (only in the loop so we don't query and apply the same data twice).
                            new_offset,
                        ));
                    }
                }
            } else {
                break;
            }
        }

        // If pagination is active: ensure that not more than max allowed is loaded.
        if page_size > 0 {
            // There might be too many new valid items. Remove them now.
            let mut new_tormos_ordered = Vec::with_capacity(ordered_gs_results.len());

            // Put <page_size> valid ones in new_tormos ordered.
            if forward {
                let mut n_iterated_results = 0;
                for (g, s) in ordered_gs_results.iter() {
                    n_iterated_results += 1;
                    let tormo = orm_subscription
                        .get_tracked_orm_object(g, s, &root_shape.iri)
                        .unwrap();

                    let order_by = orm_subscription.config.order_by.as_ref().unwrap();
                    if tormo.read().unwrap().valid == TrackedOrmObjectValidity::Valid {
                        let order_key = order_key_from(order_by, &tormo.read().unwrap());
                        new_tormos_ordered.push((order_key, tormo.clone()));

                        if new_tormos_ordered.len() == page_size {
                            break;
                        }
                    }
                }

                // Remove everything above.
                let to_remove = ordered_gs_results.split_off(n_iterated_results);
                for (graph_iri, subject_iri) in to_remove {
                    orm_subscription.remove_tracked_orm_object(
                        &graph_iri,
                        &subject_iri,
                        &root_shape.iri,
                    );
                }
            } else {
                let mut n_iterated_results = 0;
                for (g, s) in ordered_gs_results.iter().rev() {
                    n_iterated_results += 1;
                    let tormo = orm_subscription
                        .get_tracked_orm_object(g, s, &root_shape.iri)
                        .unwrap();

                    let order_by = orm_subscription.config.order_by.as_ref().unwrap();
                    let order_key = order_key_from(order_by, &tormo.read().unwrap());
                    if tormo.read().unwrap().valid == TrackedOrmObjectValidity::Valid {
                        new_tormos_ordered.push((order_key, tormo.clone()));

                        if new_tormos_ordered.len() == page_size {
                            break;
                        }
                    }
                }

                // Remove everything below.
                let keep =
                    ordered_gs_results.split_off(ordered_gs_results.len() - n_iterated_results);
                for (graph_iri, subject_iri) in ordered_gs_results {
                    orm_subscription.remove_tracked_orm_object(
                        &graph_iri,
                        &subject_iri,
                        &root_shape.iri,
                    );
                }
                ordered_gs_results = keep;
            }

            let n_tormos = orm_subscription.object_count();

            // Update subscription's limit and offset heuristic.
            let page_info = orm_subscription.ordering_info.as_mut().unwrap();
            {
                let (limit, lower_offset, upper_offset) =
                    page_info.limit_lower_upper_offset.as_mut().unwrap();

                // Update limit_heuristic: page_size * (#all+1) / (#valid+1) * 1.3
                *limit = (page_size as f64 * (n_tormos + 1) as f64
                    / (previously_valid + ordered_gs_results.len() + 1) as f64
                    * 1.3) as usize;

                // If a previous page was loaded, update the offset (keeping some overlap).
                if forward {
                    *upper_offset += (ordered_gs_results.len() as f32 * 0.8) as usize;
                } else {
                    *lower_offset = lower_offset.saturating_sub(ordered_gs_results.len());
                }
                // If max amount of pages reached, we shift the other offset as well.
                if let Some(max_allowed_items) = max_allowed_items {
                    let excess_elements = (ordered_gs_results.len() + previously_valid)
                        .saturating_sub(max_allowed_items);
                    let page_fraction: f32 = excess_elements as f32 / page_size as f32;
                    if forward {
                        // Only start increasing when page offset is far enough to the right.
                        *lower_offset = upper_offset
                            .saturating_sub((n_tormos as f32 + *limit as f32 * 0.8) as usize);
                    } else {
                        *upper_offset = (*lower_offset
                            + n_tormos // This includes invalid ones too and is before the next-page cutoff is made.
                            + (ordered_gs_results.len() as f32 * page_fraction) as usize)
                            .saturating_sub(page_size)
                    }
                }
                log_warn!(
                    "[query_items_ordered]\nNew (limit, lower, upper): ({}, {}, {})",
                    limit,
                    lower_offset,
                    upper_offset
                )
            }
        }

        // Insert all valid objects in ordered tormos.
        {
            let mut inserts: Vec<(usize, Value)> = Vec::new();

            let mut with_keys = Vec::new();
            for (graph_iri, subject_iri) in ordered_gs_results.iter() {
                let tormo = orm_subscription
                    .get_tracked_orm_object(graph_iri, subject_iri, &root_shape.iri)
                    .unwrap();
                if tormo.read().unwrap().valid != TrackedOrmObjectValidity::Valid {
                    continue;
                }
                let order_by = orm_subscription.config.order_by.as_ref().unwrap();
                let order_key = order_key_from(order_by, &tormo.read().unwrap());
                with_keys.push((order_key, tormo));
            }

            let order_info = orm_subscription.ordering_info.as_mut().unwrap();
            for (order_key, tormo) in with_keys {
                if order_info.tormos.get(&order_key).is_some() {
                    // TODO REMOVE
                    log_warn!(
                        "[query_items_ordered]: TRYING TO INSERT new item but it already existed."
                    );
                }

                order_info.tormos.insert(order_key.clone(), tormo.clone());

                // If we are doing pagination, we record where we inserted to create patches from that data.
                if get_with_insert_pos && page_size > 0 {
                    let change_ref = changes
                        .get(&orm_subscription.shape_type.shape)
                        .and_then(|g| g.get(&tormo.read().unwrap().graph_iri))
                        .and_then(|s| s.get(&tormo.read().unwrap().subject_iri))
                        .unwrap();
                    let new_val = materialize_orm_object(change_ref, true, &changes);
                    let insert_pos = order_info.tormos.rank_of(&order_key).unwrap();
                    inserts.push((insert_pos, new_val));
                }
            }
            if get_with_insert_pos && page_size > 0 {
                return Ok((None, Some(inserts)));
            }
        }

        // All data available. Now materialize.
        let mut objects_vec: Vec<Value> = Vec::with_capacity(ordered_gs_results.len());

        for (graph_iri, subject_iri) in ordered_gs_results.iter() {
            let tormo = orm_subscription
                .get_tracked_orm_object(graph_iri, subject_iri, &root_shape.iri)
                .unwrap();
            if tormo.read().unwrap().valid == TrackedOrmObjectValidity::Valid {
                if let Some(change_ref) = changes
                    .get(&orm_subscription.shape_type.shape)
                    .and_then(|g| g.get(graph_iri))
                    .and_then(|s| s.get(subject_iri))
                {
                    let new_val = materialize_orm_object(change_ref, true, &changes);
                    objects_vec.push(new_val);
                }
            }
        }

        Ok((Some(objects_vec), None))
    }
}

/// Create ORM JSON object from OrmTrackedSubjectChange and shape.
pub(crate) fn materialize_orm_object(
    change: &TrackedOrmObjectChange,
    materialize_nested: bool,
    all_changes: &OrmChanges,
) -> Value {
    // TODO (future): Only materialize select part.

    let shape = change.tracked_orm_object.read().unwrap().shape();
    let tormo = change.tracked_orm_object.read().unwrap();

    let mut orm_obj = json!({
        "@id": tormo.subject_iri,
        "@graph": tormo.graph_iri,
    });
    let orm_obj_map = orm_obj.as_object_mut().unwrap();
    for pred_schema in &shape.predicates {
        let property_name = &pred_schema.readablePredicate;
        let is_multi = pred_schema.maxCardinality > 1 || pred_schema.maxCardinality == -1;

        let Some(pred_change) = change.predicates.get(&pred_schema.iri) else {
            // No triples for this property.

            if pred_schema.minCardinality == 0 && is_multi {
                // If this predicate schema is multi though, insert empty array (converted to set by js-land).
                orm_obj_map.insert(property_name.clone(), Value::Array(vec![]));
            }

            continue;
        };

        // Is a nested predicate shape and should materialize nested?
        if pred_schema
            .dataTypes
            .iter()
            .any(|dt| dt.valType == OrmSchemaValType::shape)
            && materialize_nested
        {
            // We have a nested type.

            // Use tracked children and assessment to determine which children to materialize.
            let parent_guard = change.tracked_orm_object.read().unwrap();
            let tracked_predicate_guard = pred_change.tracked_predicate.read().unwrap();
            let upgraded_children: Vec<_> = tracked_predicate_guard
                .tracked_children
                .iter()
                .filter_map(|w| w.upgrade())
                .collect();
            let assessed = assess_and_rank_children(
                &parent_guard.graph_iri,
                &parent_guard.subject_iri,
                pred_schema.minCardinality,
                pred_schema.maxCardinality,
                &upgraded_children,
            );
            drop(tracked_predicate_guard);
            drop(parent_guard);

            // Helper to materialize a specific child TrackedOrmObject using its shape from tracked state.
            let materialize_child = |child_obj: &Arc<RwLock<TrackedOrmObject>>| -> Option<Value> {
                let child = child_obj.read().unwrap();
                if child.valid != TrackedOrmObjectValidity::Valid {
                    return None;
                }
                let shape_iri_for_child = child.shape_iri();
                let graph_changes = all_changes.get(&shape_iri_for_child)?;
                let subj_changes = graph_changes.get(&child.graph_iri)?;

                let nested_change = subj_changes.get(&child.subject_iri)?;
                // Recurse with the child's shape
                let nested = materialize_orm_object(nested_change, true, all_changes);
                Some(nested)
            };

            if is_multi {
                // Represent nested objects with more than one child
                // as a map/object of <child_graph_iri|child_subject_iri> -> nested object,
                // since there is no conceptual ordering of the children.
                let mut nested_objects_map = serde_json::Map::new();

                // Add each considered, valid nested object.
                for child_arc in assessed.considered.iter() {
                    if let Some(nested_orm_obj) = materialize_child(child_arc) {
                        let child = child_arc.read().unwrap();

                        nested_objects_map.insert(composite_key(&child), nested_orm_obj);
                    }
                }
                orm_obj_map.insert(property_name.clone(), Value::Object(nested_objects_map));
            } else {
                // Pick the first valid nested object among the considered children.
                // There may be multiple values (extras), but for single-cardinality
                // predicates we materialize just one valid nested object.
                if let Some(child_arc) = assessed.considered.first() {
                    if let Some(nested_orm_obj) = materialize_child(child_arc) {
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
                            .map(|v| basic_type_to_json(v))
                            .collect(),
                    ),
                );
            } else {
                // Add value as primitive, if present.
                if let Some(val) = pred_change.values_added.get(0) {
                    orm_obj_map.insert(property_name.clone(), basic_type_to_json(val));
                }
            }
        }
    }

    return orm_obj;
}
