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
use wabi_tree::OSBTreeMap;

use crate::orm::graph::types::*;
use crate::orm::graph::utils::basic_type_to_json;
use crate::orm::graph::utils::order_key_from;
use crate::orm::graph::utils::{assess_and_rank_children, nuri_to_string};
use crate::orm::utils::escape_json_pointer_segment;
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
        let queried_page = self.query_items_ordered(orm_subscription, true).await?;

        if matches!(
            orm_subscription.ordering_info,
            OrmSubscriptionOrderInfo::Pagination(_)
        ) {
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
                    obj_map.insert(
                        format!(
                            "{}|{}|{}",
                            tormo.graph_iri, tormo.subject_iri, orm_subscription.shape_type.shape
                        ),
                        new_val,
                    );
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
        let mut orm_subscription =
            self.orm_subscriptions
                .remove(&subscription_id)
                .ok_or_else(|| {
                    NgError::OrmError(format!("Subscription {subscription_id} not found"))
                })?;

        // Check if there are any more pages to fetch.
        if matches!(
            orm_subscription.ordering_info,
            OrmSubscriptionOrderInfo::None
        ) {
            self.orm_subscriptions
                .insert(subscription_id, orm_subscription);
            return Err(NgError::OrmError(format!(
                "Cannot load next page. Pagination is not active for subscription {}.",
                subscription_id
            )));
        };

        // A new query is started with an updated range.
        let next_page = self
            .query_items_ordered(&mut orm_subscription, forward)
            .await?;

        let page_info = match &orm_subscription.ordering_info {
            OrmSubscriptionOrderInfo::Pagination(page_info) => page_info,
            _ => {
                return Err(NgError::OrmError(
                    "No page info available when loading page.".into(),
                ))
            }
        };
        let mut patches: Vec<OrmPatch> = Vec::with_capacity(2);

        // If more pages exist now than max_active_page, remove the last.
        if orm_subscription.config.max_active_pages > 0
            && page_info.highest_active_page() - page_info.lowest_active_page() + 1
                > orm_subscription.config.max_active_pages as i32
        {
            let removed_page = self.untrack_page(&mut orm_subscription, forward).await?;
            // Add a remove patch that targets whole page removal.
            patches.push(OrmPatch {
                op: OrmPatchOp::remove,
                path: format!("/{}", removed_page),
                ..Default::default()
            });
        }

        let page_info = match &orm_subscription.ordering_info {
            OrmSubscriptionOrderInfo::Pagination(page_info) => page_info,
            _ => panic!("unreachable"),
        };
        // page_info.highest|lowest_active_page was updated. Use it for patch to send to JS-land.
        let new_page_num = {
            if forward {
                page_info.highest_active_page()
            } else {
                page_info.lowest_active_page()
            }
        };

        patches.push(OrmPatch {
            op: OrmPatchOp::add,
            value: Some(json!({"items": next_page})),
            path: format!("/{}", new_page_num),
            ..Default::default()
        });

        // A new, materialized page is sent.
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
    ) -> Result<Value, NgError> {
        let mut changes: OrmChanges = HashMap::new();
        let root_shape = orm_subscription.root_shape();

        // Case pagination:
        // We query the next page with a greater range to assure that we acquire our desired results.
        // On the one side, the previous offset might have shifted. On the other, not enough valid graph-subject pairs
        // might be returned with a small query window.
        let mut limit_offset = match &orm_subscription.ordering_info {
            // For queries of the _next_ page, we adjust the offset by adding to the current window's offset position the number of items in the window.
            // and subtract the potential_offset_shift.
            OrmSubscriptionOrderInfo::Pagination(page_info) => {
                if forward {
                    let n_loaded_tormos = orm_subscription.object_count();
                    Some((
                        page_info.limit_heuristic + page_info.potential_offset_shift,
                        (page_info.offset + n_loaded_tormos as u64)
                            .saturating_sub(page_info.potential_offset_shift),
                    ))
                } else {
                    // For queries of the _previous_ page, we subtract from the current window's offset a page limit and the potential offset shift.
                    Some((
                        page_info.limit_heuristic + page_info.potential_offset_shift * 2 + 1, // Added shift to both sides + 1, to overlap with old object for offset shift alignment.
                        page_info
                            .offset
                            .saturating_sub(page_info.potential_offset_shift)
                            .saturating_sub(page_info.limit_heuristic),
                    ))
                }
            }
            _ => None,
        };

        let mut n_valid: usize;
        let mut ordered_gs_results = vec![];
        loop {
            // Do order query.
            // Query everything if limit_offset is None, else restrict to that.
            let mut graph_subject_page =
                self.query_graph_subjects(&orm_subscription, limit_offset.clone())?;

            // TODO: Handle empty result

            // In case of shifted page offsets, align result with current window.
            if let Some(adjusted_limit_offset) = self.align_offset_shift(
                orm_subscription,
                &mut graph_subject_page,
                &limit_offset,
                forward,
            )? {
                limit_offset = Some(adjusted_limit_offset);
            }

            // Query quads for this shape.
            // TODO: This empty [] should be restructured
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
            ordered_gs_results.extend(graph_subject_page);
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
                if ordered_gs_results.len() as u64 <= old_limit
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

        // If pagination is active: limit the window and tracked objects in size.
        let order_by = orm_subscription.config.order_by.as_ref().unwrap();
        let page_size = orm_subscription.config.page_size;

        let pagination_update = if matches!(
            orm_subscription.ordering_info,
            OrmSubscriptionOrderInfo::Pagination(_)
        ) {
            // There might be too many new valid items. Remove them now.
            let mut new_tormos_ordered = Vec::with_capacity(ordered_gs_results.len());
            // Put <page_size> valid ones in new_tormos ordered.
            let mut n_iterated_results = 0;
            for (g, s) in ordered_gs_results.iter() {
                n_iterated_results += 1;
                let tormo = orm_subscription
                    .get_tracked_orm_object(g, s, &root_shape.iri)
                    .unwrap();
                let order_key = order_key_from(order_by, &tormo.read().unwrap());
                if tormo.read().unwrap().valid == TrackedOrmObjectValidity::Valid {
                    new_tormos_ordered.push((order_key, tormo.clone()));

                    if new_tormos_ordered.len() == page_size {
                        break;
                    }
                }
            }

            let new_page = OSBTreeMap::from_iter(new_tormos_ordered);
            let new_page_num: i32 = match &orm_subscription.ordering_info {
                OrmSubscriptionOrderInfo::Pagination(page_info) if forward => {
                    page_info
                        .pages
                        .last_key_value()
                        .map(|(page, _)| *page)
                        .unwrap_or(-1)
                        + 1
                }
                OrmSubscriptionOrderInfo::Pagination(page_info) => {
                    page_info
                        .pages
                        .first_key_value()
                        .map(|(page, _)| *page)
                        .unwrap_or(1)
                        - 1
                }
                _ => unreachable!(),
            };

            Some((n_iterated_results, new_page_num, new_page))
        } else {
            None
        };

        if let Some((n_iterated_results, new_page_num, new_page)) = pagination_update {
            // Remove everything above.
            let to_remove = ordered_gs_results.split_off(n_iterated_results);
            for (graph_iri, subject_iri) in to_remove {
                orm_subscription.remove_tracked_orm_object(
                    &graph_iri,
                    &subject_iri,
                    &root_shape.iri,
                );
            }

            let n_objects = orm_subscription.object_count();

            if let OrmSubscriptionOrderInfo::Pagination(ref mut page_info) =
                orm_subscription.ordering_info
            {
                // Attach new page.
                page_info.pages.insert(new_page_num, new_page);

                // Update limit_heuristic: page_size * (#all+1) / (#valid+1) * 1.5
                page_info.limit_heuristic =
                    (page_size as f64 * (n_objects + 1) as f64 / (n_valid + 1) as f64 * 1.5) as u64;

                // If a previous page was loaded, update the offset.
                if !forward {
                    page_info.offset -= ordered_gs_results.len() as u64;
                }

                if !forward {
                    // Remove the re-fetched page from all_up_to_offset because we now track it again.
                    let page_set: HashSet<(GraphIri, SubjectIri)> =
                        HashSet::from_iter(ordered_gs_results.iter().cloned());
                    page_info.all_up_to_offset = page_info
                        .all_up_to_offset
                        .difference(&page_set)
                        .cloned()
                        .collect();
                }
            }
        } else if matches!(
            orm_subscription.ordering_info,
            OrmSubscriptionOrderInfo::Plain(_)
        ) {
            // No pagination: collect all valid to ordered first.
            let mut plain_ordered = Vec::new();
            for (g, s) in ordered_gs_results.iter() {
                let tormo = orm_subscription
                    .get_tracked_orm_object(g, s, &root_shape.iri)
                    .unwrap();
                if tormo.read().unwrap().valid != TrackedOrmObjectValidity::Valid {
                    continue;
                }
                let order_key = order_key_from(order_by, &tormo.read().unwrap());
                plain_ordered.push((order_key, tormo));
            }

            if let OrmSubscriptionOrderInfo::Plain(ref mut order_info) =
                orm_subscription.ordering_info
            {
                for (order_key, tormo) in plain_ordered {
                    order_info.tormos_ordered.insert(order_key, tormo);
                }
            }
        }

        // All data available. Now materialize.
        let mut materialized_objects = json!([]);
        let objects_vec = materialized_objects.as_array_mut().unwrap();

        for (graph, subject) in ordered_gs_results.iter() {
            let tormo =
                orm_subscription.get_or_create_tracked_orm_object(&graph, &subject, &root_shape);
            if tormo.read().unwrap().valid == TrackedOrmObjectValidity::Valid {
                if let Some(change_ref) = changes
                    .get(&orm_subscription.shape_type.shape)
                    .and_then(|g| g.get(graph))
                    .and_then(|s| s.get(subject))
                {
                    let new_val = materialize_orm_object(change_ref, true, &changes);
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

        let tormo_count = orm_subscription.object_count();
        if let OrmSubscriptionOrderInfo::Pagination(page_info) = &mut orm_subscription.ordering_info
        {
            if page_info.potential_offset_shift > 0
                && graph_subject_page.len() > 0
                && tormo_count > 0
            {
                if forward {
                    // Find the right-most item of our window in the graph_subject_page result.
                    if let Some(right_most) = &page_info
                        .pages
                        .last_key_value()
                        .and_then(|(_, first_page)| first_page.last_key_value())
                        .and_then(|(_, tormo)| tormo.read().ok())
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
                            let offset_shift = new_offset as i64 - tormo_count as i64;

                            res = Some((adjusted_limit_offset, offset_shift));
                        }
                    }
                } else {
                    // Get the left-most item of our window in graph_subject_page result.
                    if let Some(left_most) = &page_info
                        .pages
                        .first_key_value()
                        .and_then(|(_, first_page)| first_page.first_key_value())
                        .and_then(|(_, tormo)| tormo.read().ok())
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

            // Reset potential offset shift.

            page_info.potential_offset_shift = 0;
            if let Some((adjusted_limit_offset, offset_shift)) = res {
                page_info.offset = (page_info.offset as i64 + offset_shift) as u64;
                return Ok(Some(adjusted_limit_offset));
            }
        }
        Ok(None)
    }

    /// Remove first/last page of current window from tormos and page_info.
    /// Returns the page number removed. Does not send a remove patch.
    async fn untrack_page(
        &mut self,
        orm_subscription: &mut OrmSubscription,
        forward: bool,
    ) -> Result<i32, NgError> {
        let root_shape = orm_subscription.shape_type.shape.clone();
        // Collect all objects to remove from tracking.
        let (removed_gs, removed_page_num) =
            if let OrmSubscriptionOrderInfo::Pagination(page_info) =
                &mut orm_subscription.ordering_info
            {
                let removed_page_num = if forward {
                    page_info.lowest_active_page()
                } else {
                    page_info.highest_active_page()
                };

                let removed_page = page_info.pages.remove(&removed_page_num).unwrap();

                let removed_gs: Vec<(GraphIri, SubjectIri)> = removed_page
                    .iter()
                    .map(|(_key, tormo_arc)| {
                        (
                            tormo_arc.read().unwrap().graph_iri.clone(),
                            tormo_arc.read().unwrap().subject_iri.clone(),
                        )
                    })
                    .collect();

                (removed_gs, removed_page_num)
            } else {
                return Err(NgError::OrmError(
                    "Can't untrack page: no page info available".into(),
                ));
            };

        for (graph_iri, subject_iri) in &removed_gs {
            orm_subscription.remove_tracked_orm_object(graph_iri, subject_iri, &root_shape);
        }
        Ok(removed_page_num)
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
        "@shape": shape.iri
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
                if materialize_nested {
                    let shape_iri_for_child = child.shape_iri();
                    let graph_changes = all_changes.get(&shape_iri_for_child)?;
                    let subj_changes = graph_changes.get(&child.graph_iri)?;

                    let nested_change = subj_changes.get(&child.subject_iri)?;
                    // Recurse with the child's shape
                    let nested = materialize_orm_object(nested_change, true, all_changes);
                    return Some(nested);
                } else {
                    // Return reference to object only.
                    let nested = json!({
                        "@id": child.subject_iri,
                        "@graph": child.graph_iri,
                        "@shape": child.shape().iri
                    });
                    return Some(nested);
                }
            };

            if is_multi {
                // Represent nested objects with more than one child
                // as a map/object of <child_graph_iri|child_subject_iri|shape_iri> -> nested object,
                // since there is no conceptual ordering of the children.
                let mut nested_objects_map = serde_json::Map::new();

                // Add each considered, valid nested object.
                for child_arc in assessed.considered.iter() {
                    if let Some(nested_orm_obj) = materialize_child(child_arc) {
                        let child = child_arc.read().unwrap();

                        nested_objects_map.insert(
                            format!(
                                "{}|{}|{}",
                                child.graph_iri,
                                escape_json_pointer_segment(&child.subject_iri),
                                escape_json_pointer_segment(&child.shape().iri)
                            ),
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
