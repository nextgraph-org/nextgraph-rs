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
use std::cmp::min;
use std::collections::HashMap;
use std::collections::HashSet;
use std::sync::Arc;
use std::sync::RwLock;

use crate::orm::graph::types::*;
use crate::orm::graph::utils::{assess_and_rank_children, nuri_to_string};
use crate::types::CancelFn;
use crate::verifier::Verifier;
use ng_net::app_protocol::{AppResponse, AppResponseV0, NuriV0};
use ng_net::orm::OrmSchemaShape;
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
        config: Value,
    ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
        let config =
            OrmConfig::from_json(&config, &shape_type).map_err(|e| NgError::OrmError(e))?;

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

    /// This is still a TODO.
    async fn create_orm_objects_for_ordered(
        &mut self,
        orm_subscription: &mut OrmSubscription,
    ) -> Result<serde_json::Value, NgError> {
        let queried_page = self.query_page(orm_subscription, true).await?;

        if orm_subscription.page_info.is_some() {
            // Return as page when pagination is set.
            Ok(json!({"0": {"items": queried_page}}))
        } else {
            // Return as array when no pagination is set.
            Ok(queried_page)
        }
    }

    /// No pagination, no sorting.
    async fn create_orm_objects_for_unordered(
        &mut self,
        orm_subscription: &mut OrmSubscription,
    ) -> Result<serde_json::Value, NgError> {
        // Changes to tormos which we use for materialization.
        let mut changes: OrmChanges = HashMap::new();
        let root_shape = orm_subscription.root_shape();

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
                    let new_val = materialize_orm_object(
                        change_ref,
                        &changes,
                        &root_shape,
                        &orm_subscription,
                    );
                    obj_map.insert(
                        format!("{}|{}", tormo.graph_iri, tormo.subject_iri),
                        new_val,
                    );
                }
            }
        }

        Ok(materialized_objects)
    }

    /// This is still a TODO.
    pub(crate) async fn orm_load_next_page(
        &mut self,
        subscription_id: u64,
        forward: bool,
    ) -> Result<(), NgError> {
        let mut orm_subscription =
            self.orm_subscriptions
                .remove(&subscription_id)
                .ok_or_else(|| {
                    NgError::OrmError(format!("Subscription {subscription_id} not found"))
                })?;

        // Check if there are any more pages to fetch.
        if orm_subscription.page_info.is_none() {
            self.orm_subscriptions
                .insert(subscription_id, orm_subscription);
            return Err(NgError::OrmError(format!(
                "Cannot load next page. Pagination is not active for subscription {}.",
                subscription_id
            )));
        };

        // A new query is started with an updated range.
        let next_page = self.query_page(&mut orm_subscription, forward).await;

        let page_num = {
            let page_info = orm_subscription.page_info.as_ref().unwrap();
            if forward {
                page_info.highest_active_page.clone()
            } else {
                page_info.lowest_active_page.clone()
            }
        };

        let patch = OrmPatch {
            op: OrmPatchOp::add,
            valType: None,
            value: Some(next_page?),
            path: format!("/{}", page_num),
        };

        // A new, materialized page is sent.
        let _ = orm_subscription
            .sender
            .clone()
            .send(AppResponse::V0(AppResponseV0::GraphOrmUpdate(vec![patch])))
            .await;

        self.orm_subscriptions
            .insert(subscription_id, orm_subscription);

        Ok(())
    }

    async fn query_page(
        &mut self,
        orm_subscription: &mut OrmSubscription,
        forward: bool,
    ) -> Result<Value, NgError> {
        let mut changes: OrmChanges = HashMap::new();
        let root_shape = orm_subscription.root_shape();

        // We query the next page with a greater range to assure that we acquire our desired results.
        // One the one hand, the previous offset might have shifted, on the other, not enough valid graph-subject pairs
        // might be returned with a small query window.
        let mut limit_offset = if forward {
            // For queries of the _next_ page, we adjust the offset by adding to the current window's offset position the number of items in the window.
            // and subtract the potential_offset_shift.
            orm_subscription.page_info.as_ref().map(|page_info| {
                (
                    page_info.limit_heuristic + page_info.potential_offset_shift,
                    (page_info.offset + page_info.items_in_window.len() as u64)
                        .saturating_sub(page_info.potential_offset_shift),
                )
            })
        } else {
            // For queries of the _previous_ page, we subtract from the current window's offset a page limit and the potential offset shift.
            orm_subscription.page_info.as_ref().map(|page_info| {
                (
                    page_info.limit_heuristic + page_info.potential_offset_shift * 2 + 1, // added shift to both sides + 1 for overlap to old value, for offset shift alignment.
                    page_info
                        .offset
                        .saturating_sub(page_info.potential_offset_shift)
                        .saturating_sub(page_info.limit_heuristic),
                )
            })
        };

        let mut n_valid: u64;
        let mut ordered_page = vec![];
        loop {
            // Do order query.
            let mut graph_subject_page =
                self.query_graph_subjects(&orm_subscription, limit_offset.clone())?;

            // In case of shifted offsets, align result with current window.
            if let Some(adjusted_limit_offset) = self.align_offset_shift(
                orm_subscription,
                &mut graph_subject_page,
                &limit_offset,
                forward,
            )? {
                limit_offset = Some(adjusted_limit_offset);
            }

            // Query quads for this shape.
            // TODO: This empty [] should be restructued
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

            // Filter quads (only g-s pairs from page allowed) because the query_quads_for_shape query is more loose.
            let new_page_set: HashSet<_> = graph_subject_page.iter().cloned().collect();
            ordered_page.extend(graph_subject_page);
            let shape_quads = shape_quads
                .into_iter()
                .filter(|q| {
                    let (GraphName::NamedNode(g), Subject::NamedNode(s)) =
                        (&q.graph_name, &q.subject)
                    else {
                        return false;
                    };
                    let key = (g.as_str().to_string(), s.as_str().to_string());
                    new_page_set.contains(&key)
                })
                .collect::<Vec<_>>();

            // Add new quads to tracker.
            self.process_changes_for_subscription(
                orm_subscription,
                &shape_quads,
                &[],
                &mut changes,
                true,
            )?;

            n_valid = orm_subscription.valid_object_count();

            // Determine if we should extend the page-order query (because not enough valid items were returned).
            if let Some((old_limit, old_offset)) = limit_offset {
                if ordered_page.len() as u64 <= old_limit
                    || n_valid >= orm_subscription.config.page_size
                {
                    // No more items retrievable for query
                    // or enough valid ones were returned.
                    break;
                } else {
                    // Not enough items were valid.
                    if forward {
                        limit_offset = Some((
                            // Increase limit exponentially.
                            old_limit * 2,
                            // Update offset (only in the loop so we don't query and apply the same data twice).
                            old_offset + old_limit,
                        ));
                    } else {
                        let new_offset = old_offset.saturating_sub(old_limit * 3);
                        limit_offset = Some((
                            // Increase limit exponentially.
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

        // If pagination is active...
        if orm_subscription.page_info.is_some() {
            // Update limit_heuristic: page_size * (#all+1) / (#valid+1) * 1.5

            let page_info = orm_subscription.page_info.as_mut().unwrap();

            let n_objects = page_info.items_in_window.len();
            page_info.limit_heuristic = (orm_subscription.config.page_size as f64
                * (n_objects + 1) as f64
                / (n_valid + 1) as f64
                * 1.5) as u64;

            // Update the range of active pages present in JS-land.
            if forward {
                page_info.highest_active_page += 1;
            } else {
                page_info.lowest_active_page -= 1;
            }

            // If a previous page was loaded, update the offset.
            if !forward {
                page_info.offset -= ordered_page.len() as u64;
            }

            // Drop last / first page, if we now have more pages than max_active_pages allows.
            let highest_active_page = page_info.highest_active_page;
            let lowest_active_page = page_info.lowest_active_page;

            if orm_subscription.config.max_active_pages > 0
                && highest_active_page - lowest_active_page
                    > orm_subscription.config.max_active_pages as i64
            {
                if forward {
                    let removed_objects: Vec<(GraphIri, SubjectIri)> =
                        self.untrack_page(orm_subscription, forward).await?;

                    // Also add them to the all_up_to_offset (since we don't track them anymore but changes might affect the offset).
                    orm_subscription
                        .page_info
                        .as_mut()
                        .unwrap()
                        .all_up_to_offset
                        .extend(removed_objects);
                } else {
                    let _ = self.untrack_page(orm_subscription, forward).await?;
                }
            }
            let page_info = orm_subscription.page_info.as_mut().unwrap();

            if !forward {
                // Remove the re-fetched page from all_up_to_offset because we now track it again.
                let page_set: HashSet<(GraphIri, SubjectIri)> =
                    HashSet::from_iter(ordered_page.iter().cloned());
                page_info.all_up_to_offset = page_info
                    .all_up_to_offset
                    .difference(&page_set)
                    .cloned()
                    .collect();
            }

            // Remove all items above page_size from ordered_page
            let removed_gs = ordered_page.drain(orm_subscription.config.page_size as usize..);
            // Use the removed items to remove them from tracked orm objects
            for (graph_iri, subject_iri) in removed_gs {
                orm_subscription.remove_tracked_orm_object(
                    &graph_iri,
                    &subject_iri,
                    &root_shape.iri,
                );
            }
        }

        // All data available. Now materialize.
        let mut materialized_objects = json!([]);
        let objects_vec = materialized_objects.as_array_mut().unwrap();

        for (graph, subject) in ordered_page.iter() {
            let tormo =
                orm_subscription.get_or_create_tracked_orm_object(&graph, &subject, &root_shape);
            if tormo.read().unwrap().valid == TrackedOrmObjectValidity::Valid {
                if let Some(change_ref) = changes
                    .get(&orm_subscription.shape_type.shape)
                    .and_then(|g| g.get(graph))
                    .and_then(|s| s.get(subject))
                {
                    let new_val = materialize_orm_object(
                        change_ref,
                        &changes,
                        &root_shape,
                        &orm_subscription,
                    );
                    objects_vec.push(new_val);
                }
            }
        }
        Ok(materialized_objects)
    }

    fn align_offset_shift(
        &self,
        orm_subscription: &mut OrmSubscription,
        graph_subject_page: &mut Vec<(GraphIri, SubjectIri)>,
        used_limit_offset: &Option<(u64, u64)>,
        forward: bool,
    ) -> Result<Option<(u64, u64)>, NgError> {
        let mut res: Option<((u64, u64), i64)> = None;

        if let Some(page_info) = orm_subscription.page_info.as_ref() {
            if page_info.potential_offset_shift > 0
                && graph_subject_page.len() > 0
                && !orm_subscription.is_empty()
            {
                if forward {
                    // Find the right-most item of our window in the graph_subject_page result.
                    if let Some(right_most) = page_info
                        .items_in_window
                        .last()
                        .and_then(|rm| rm.read().ok())
                    {
                        let index_of_rm_in_gs = graph_subject_page
                            .iter()
                            .position(|(g, s)| {
                                *g == right_most.graph_iri && *s == right_most.subject_iri
                            })
                            .ok_or_else(|| {
                                NgError::OrmError(format!(
                                    "Could not find left-most value when fetching next page"
                                ))
                            })?;

                        // Remove all previous items (already tracked) from graph_subject_page.
                        // We only want the new values here.
                        graph_subject_page.drain(..(index_of_rm_in_gs + 1));

                        if let Some((used_limit, used_offset)) = used_limit_offset {
                            // New offset points to the element after the previously active window.
                            let new_offset = used_offset + index_of_rm_in_gs as u64;

                            let adjusted_limit_offset = (*used_limit, new_offset);
                            // Calculate by how much the offset shifted since our last query.
                            let offset_shift =
                                new_offset as i64 - orm_subscription.object_count() as i64;

                            res = Some((adjusted_limit_offset, offset_shift));
                        }
                    }
                } else {
                    // Get the left-most item of our window in graph_subject_page result.
                    if let Some(left_most) = page_info
                        .items_in_window
                        .get(0)
                        .and_then(|lm| lm.read().ok())
                    {
                        // Adjust offset, if necessary.
                        let index_of_lm_in_gs = graph_subject_page
                            .iter()
                            .position(|(g, s)| {
                                *g == left_most.graph_iri && *s == left_most.subject_iri
                            })
                            .ok_or_else(|| {
                                NgError::OrmError(format!(
                                    "Could not find left-most value when fetching next page"
                                ))
                            })?;

                        // We only want new items in the graph_subject page.
                        // Therefore, we cut off all items above the found one.
                        graph_subject_page.truncate(index_of_lm_in_gs);

                        // If we made a backward query, we expect our item to be at the end of the queried page.
                        // We update the limit so that the item with pos. offset+limit + 1 is the current window's left-most item.
                        if let Some((_used_limit, used_offset)) = used_limit_offset {
                            let adjusted_limit_offset = (index_of_lm_in_gs as u64, *used_offset);
                            // Identify the shift of the offset between the previous page query and now.
                            let offset_shift = *used_offset as i64 + index_of_lm_in_gs as i64
                                - page_info.offset as i64;

                            res = Some((adjusted_limit_offset, offset_shift));
                        }
                    }
                }
            }
        }

        // Reset potential offset shift.
        if let Some(page_info) = orm_subscription.page_info.as_mut() {
            page_info.potential_offset_shift = 0;
            if let Some((adjusted_limit_offset, offset_shift)) = res {
                page_info.offset = (page_info.offset as i64 + offset_shift) as u64;
                return Ok(Some(adjusted_limit_offset));
            }
        }

        Ok(None)
    }

    async fn untrack_page(
        &mut self,
        orm_subscription: &mut OrmSubscription,
        forward: bool,
    ) -> Result<Vec<(GraphIri, SubjectIri)>, NgError> {
        // Collect all objects to remove from tracking.
        let Some(page_info) = orm_subscription.page_info.as_mut() else {
            return Err(NgError::OrmError(format!(
                "page_info not found for removing page."
            )));
        };

        let page_size = orm_subscription.config.page_size as usize;
        let lower_pos = if forward {
            0
        } else {
            page_size * (page_info.highest_active_page - page_info.lowest_active_page - 1) as usize
        };
        let upper_pos = if forward {
            min(page_size as usize, page_info.items_in_window.len())
        } else {
            page_info.items_in_window.len() as usize
        };

        let removed_objects: Vec<(String, String)> = page_info
            .items_in_window
            .drain(lower_pos..upper_pos)
            .map(|tormo| {
                let tormo = tormo.read().unwrap();
                (tormo.graph_iri.clone(), tormo.subject_iri.clone())
            })
            .collect();

        // Remove objects from tracking.
        let root_shape = &orm_subscription.root_shape().iri;
        for (rm_graph, rm_subject) in removed_objects.iter() {
            orm_subscription.remove_tracked_orm_object(&rm_graph, &rm_subject, root_shape);
        }

        let page_info = orm_subscription.page_info.as_mut().unwrap();
        let page_num = if forward {
            page_info.lowest_active_page
        } else {
            page_info.highest_active_page
        };

        // Adjust the active page num info.
        if forward {
            page_info.lowest_active_page += 1;
        } else {
            page_info.highest_active_page -= 1;
        }

        // Send a remove patch to frontend that targets whole page.
        let remove_patch: Vec<OrmPatch> = vec![OrmPatch {
            op: OrmPatchOp::remove,
            valType: None,
            path: format!("/{}", page_num),
            value: None,
        }];
        let _ = orm_subscription
            .sender
            .clone()
            .send(AppResponse::V0(AppResponseV0::GraphOrmUpdate(remove_patch)))
            .await;

        Ok(removed_objects)
    }
}

/// Create ORM JSON object from OrmTrackedSubjectChange and shape.
pub(crate) fn materialize_orm_object(
    change: &TrackedOrmObjectChange,
    changes: &OrmChanges,
    shape: &OrmSchemaShape,
    orm_subscription: &OrmSubscription,
) -> Value {
    // TODO: Only materialize select part.

    let tormo = change.tracked_orm_object.read().unwrap();

    let mut orm_obj = json!({"@id": tormo.subject_iri, "@graph": tormo.graph_iri});
    let orm_obj_map = orm_obj.as_object_mut().unwrap();
    for pred_schema in &shape.predicates {
        let property_name = &pred_schema.readablePredicate;
        let is_multi = pred_schema.maxCardinality > 1 || pred_schema.maxCardinality == -1;

        let Some(pred_change) = change.predicates.get(&pred_schema.iri) else {
            // No triples for this property.

            if pred_schema.minCardinality == 0 && is_multi {
                // If this predicate schema is an array though, insert empty array.
                orm_obj_map.insert(property_name.clone(), Value::Array(vec![]));
            }

            continue;
        };

        // Is a nested predicate shape?
        if pred_schema
            .dataTypes
            .iter()
            .any(|dt| dt.valType == OrmSchemaValType::shape)
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
                let shape_iri_for_child = child.shape_iri().unwrap();
                let graph_changes = changes.get(&shape_iri_for_child)?;
                let subj_changes = graph_changes.get(&child.graph_iri)?;
                let nested_change = subj_changes.get(&child.subject_iri)?;
                // Recurse with the child's shape
                let child_shape_arc = orm_subscription
                    .shape_type
                    .schema
                    .get(&shape_iri_for_child)
                    .cloned()?;
                let nested = materialize_orm_object(
                    nested_change,
                    changes,
                    &child_shape_arc,
                    orm_subscription,
                );
                return Some(nested);
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

                        nested_objects_map.insert(
                            format!("{}|{}", child.graph_iri, child.subject_iri),
                            nested_orm_obj,
                        );
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
                            .map(|v| match v {
                                BasicType::Bool(b) => json!(*b),
                                BasicType::Num(n) => json!(*n),
                                BasicType::Str(s) => json!(s),
                            })
                            .collect(),
                    ),
                );
            } else {
                // Add value as primitive, if present.
                if let Some(val) = pred_change.values_added.get(0) {
                    orm_obj_map.insert(
                        property_name.clone(),
                        match val {
                            BasicType::Bool(b) => json!(*b),
                            BasicType::Num(n) => json!(*n),
                            BasicType::Str(s) => json!(s),
                        },
                    );
                }
            }
        }
    }

    return orm_obj;
}
