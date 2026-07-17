// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use std::collections::HashMap;

use std::sync::Arc;
use std::sync::RwLock;

use futures::SinkExt;
pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_net::{app_protocol::*, orm::*};
use ng_oxigraph::oxrdf::graph;
use ng_oxigraph::oxrdf::Quad;
use ng_repo::errors::NgError;
use ng_repo::log::*;
use wabi_tree::OSBTreeMap;

use crate::orm::graph::add_remove_quads::oxrdf_term_to_orm_basic_type;
use crate::orm::graph::initialize::materialize_orm_object;
use crate::orm::graph::types::*;
use crate::orm::graph::utils::basic_type_to_json;
use crate::orm::graph::utils::order_key_before_change;
use crate::orm::graph::utils::order_key_from;
use crate::orm::graph::utils::GraphSubjectKey;
use crate::orm::utils::composite_key;
use crate::orm::utils::escape_json_pointer_segment;
use crate::types::*;
use crate::verifier::*;
use ng_net::types::OverlayLink;
use ng_repo::types::OverlayId;
use ng_repo::types::RepoId;
use serde_json::json;
use serde_json::Value;
use std::borrow::Cow;
use std::collections::HashSet;

impl Verifier {
    /// Applies quad patches and
    /// generates and sends JSON patches to JS-land.
    ///
    /// TODO: How to prevent duplicate application of change data?
    pub(crate) async fn orm_backend_update(
        &mut self,
        subscription_id: u64,
        repo_id: RepoId,
        overlay_id: OverlayId,
        patch: GraphQuadsPatch,
    ) {
        let inserts = patch.inserts;
        let removes = patch.removes;

        // Apply changes to all affected scopes and send patches to clients
        let res = self
            .apply_changes_to_all_scopes(repo_id, overlay_id, &inserts, &removes, subscription_id)
            .await;

        if let Some(err) = res.err() {
            log_err!(
                "Error occurred while applying backend update to orm: {:?}",
                err
            );
        }
    }

    /// Processes database quad updates. For each subscription, whose scope is affected:
    /// - Updates TORMOs
    /// - Creates and sends patches to the subscribing clients
    async fn apply_changes_to_all_scopes(
        &mut self,
        repo_id: RepoId,
        overlay_id: OverlayId,
        inserts: &[Quad],
        removes: &[Quad],
        origin_subscription_id: u64,
    ) -> Result<(), NgError> {
        let overlaylink: OverlayLink = overlay_id.into();

        // First: Clean up and remove old subscriptions
        self.orm_subscriptions
            .retain(|_k, sub| !sub.sender.is_closed());

        // Collect keys first to avoid holding a borrow on the map while mutating it
        let subscription_ids: Vec<_> = self.orm_subscriptions.keys().cloned().collect();

        for subscription_id in subscription_ids {
            // Temporarily take ownership of the subscription to avoid borrowing self twice mutably
            let Some(mut orm_subscription) = self.orm_subscriptions.remove(&subscription_id) else {
                continue;
            };

            // Check if this scope is affected by this backend update
            if !Self::is_scope_affected(&orm_subscription, repo_id, &overlaylink) {
                self.orm_subscriptions
                    .insert(subscription_id, orm_subscription);
                continue;
            }

            // Filter quads by subject scope and only if within page (if either is set)..
            let (inserts, removes, gs_to_fetch) =
                filter_quads_for_scope_and_page_bounds(&orm_subscription, inserts, removes);

            // If we have an ordered page, it might be that new quads arrived whose value is within the window bounds.
            // In that case we have to add the graph+subject to the tormo and query the related quads.
            let inserts = if gs_to_fetch.len() > 0 {
                let graphs = gs_to_fetch
                    .iter()
                    .map(|gs_key| gs_key.0.clone())
                    .collect::<HashSet<_>>()
                    .into_iter()
                    .collect();
                let subjects = gs_to_fetch
                    .iter()
                    .map(|gs_key| gs_key.1.clone())
                    .collect::<HashSet<_>>()
                    .into_iter()
                    .collect();
                let mut new_quads: HashSet<Quad> = HashSet::from_iter(self
                    .query_quads_for_shape(
                        &graphs,
                        &orm_subscription.shape_type.schema,
                        &orm_subscription.shape_type.shape,
                        Some(&subjects),
                    )
                    .unwrap_or_else(|e| {
                        log_err!(
                            "Error occurred when processing changes for subscription {origin_subscription_id} while querying new items from quads in window: {:?}",
                            e
                        );
                        vec![]
                    }));
                new_quads.extend(inserts.into_owned());
                new_quads
            } else {
                HashSet::from_iter(inserts.into_owned())
            };

            // No quads to apply for this subscription?
            if inserts.is_empty() && removes.is_empty() {
                self.orm_subscriptions
                    .insert(subscription_id, orm_subscription);
                continue;
            }

            // Process changes for this shape
            let mut orm_changes: OrmChanges = HashMap::new();
            let res = self.process_changes_for_subscription(
                &mut orm_subscription,
                &Vec::from_iter(inserts),
                &removes,
                &mut orm_changes,
                false,
            );
            if let Err(error) = res {
                log_err!("Error occurred when processing changes for subscription {origin_subscription_id}: {:?}", error);
            }

            // If order_by (and possibly pagination) is active: Updates the orm_subscription ordering metadata
            // and create order-related patches in that process.
            let root_order_patches = if orm_subscription.config.order_by.is_some() {
                root_patches_for_ordered(&mut orm_subscription, &orm_changes)
            } else {
                Vec::new()
            };

            // Create & send patches if the subscription's session is different to the origin's session.
            if origin_subscription_id != subscription_id {
                let root_unordered_patches = if orm_subscription.config.order_by.is_none() {
                    root_patches_for_non_ordered(&orm_subscription, &orm_changes)
                } else {
                    Vec::new()
                };

                let object_and_atomic_patches =
                    create_update_patches(&orm_subscription, &orm_changes);

                let all_patches: Vec<OrmPatch> = root_order_patches
                    .into_iter()
                    .map(|p| p.to_patch())
                    .chain(root_unordered_patches.into_iter())
                    .chain(object_and_atomic_patches.into_iter().map(|p| p.to_patch()))
                    .collect();

                // Send response with patches.
                if all_patches.len() > 0 {
                    let _ = orm_subscription
                        .sender
                        .clone()
                        .send(AppResponse::V0(AppResponseV0::GraphOrmUpdate(all_patches)))
                        .await;
                }
            }

            // Put the subscription back.
            self.orm_subscriptions
                .insert(subscription_id, orm_subscription);
        }

        Ok(())
    }

    /// Checks if a scope is affected by this backend update.
    fn is_scope_affected(
        orm_subscription: &OrmSubscription,
        repo_id: RepoId,
        overlaylink: &OverlayLink,
    ) -> bool {
        // TODO: Also check page

        // For each scope in graph...
        for scope in orm_subscription.graph_scope.iter() {
            let scope_nuri = NuriV0::new_from(scope).unwrap_or_else(|_| NuriV0::new_empty());
            if scope_nuri.target == NuriTargetV0::UserSite
                || scope_nuri
                    .overlay
                    .as_ref()
                    .map_or(false, |ol| overlaylink == ol)
                || scope_nuri.target == NuriTargetV0::Repo(repo_id)
                // Listens to all (entire user site).
                || scope == "did:ng:i"
            {
                return true;
            }
        }
        return false;
    }
}

/// Find the predicate schema linking a parent to a child orm object and build the path segment.
/// Returns the escaped readable predicate. If the predicate is of type multi-object, appends the composite <graph>|<subjet> key in the returned vec.
fn path_segment_to_parent(
    tracked_orm_object: &TrackedOrmObject,
    parent_tormo: &TrackedOrmObject,
) -> Option<Vec<String>> {
    // Check if this predicate has our subject as a child
    for (_pred_iri, tracked_pred) in parent_tormo.tracked_predicates.iter() {
        let tp = tracked_pred.read().unwrap();

        // Check if this tracked orm object is in the children
        let is_child = tp.tracked_children.iter().any(|child| {
            let binding = child.upgrade().unwrap();
            let child_read = binding.read().unwrap();
            child_read.subject_iri == tracked_orm_object.subject_iri
                && child_read.graph_iri == tracked_orm_object.graph_iri
        });

        if is_child {
            let pred_arc = tp.schema_arc();

            let readable_predicate_escaped =
                escape_json_pointer_segment(&pred_arc.readablePredicate);

            let is_multi = pred_arc.maxCardinality > 1 || pred_arc.maxCardinality == -1;

            // For multi-valued predicates, add the composite key (graph|subject) as a key first
            if is_multi {
                let composite_key = composite_key(tracked_orm_object);
                return Some(vec![readable_predicate_escaped, composite_key]);
            } else {
                return Some(vec![readable_predicate_escaped]);
            }
        }
    }

    None
}

/// Recursively build the path from a tracked orm object to the root and create diff operation patches.
/// The function recurses from child to parents down to a root tracked orm object.
/// If multiple parents exist, it adds separate patches for each.
/// Does not create paths to invalid parents.
fn get_paths_for_tormo(
    tormo: &TrackedOrmObject,
    ordered_tormos: Option<(
        &OrderByConfig,
        &OSBTreeMap<OrderKey, Arc<RwLock<TrackedOrmObject>>>,
    )>,
) -> Vec<Vec<String>> {
    // let shape_iri = tracked_orm_object
    //     .shape().iri
    //     .unwrap_or("<dropped-shape>".into());
    // log_info!(
    //     "[PATCH TRACE] build_path_to_root: subject='{}' graph='{}' shape='{}' parents={} current_path_segs={:?} op={:?} valType={:?}",
    //     tracked_orm_object.subject_iri,
    //     tracked_orm_object.graph_iri,
    //     shape_iri,
    //     tracked_orm_object.parents.len(),
    //     path,
    //     diff_op.op,
    //     diff_op.val_type
    // );

    // If this subject has no parents, we've reached the root.
    if tormo.parents.is_empty() {
        if let Some((order_by_conf, ordered_tormos)) = ordered_tormos.as_ref() {
            // Case ordering -> return position of tormo in window.
            let tormo_key = order_key_from(order_by_conf, tormo);
            if let Some(tormo_position) = ordered_tormos.rank_of(&tormo_key) {
                return vec![vec![format!("{tormo_position}")]];
            } else {
                // Mhh, tormo is not inserted? How do we deal with add patch paths?
                // Ensure that root objects are inserted first.
            }
        } else {
            // Case no ordering -> Return composite key.
            return vec![vec![composite_key(tormo)]];
        }
    }

    let mut paths: Vec<Vec<String>> = Vec::with_capacity(tormo.parents.len());

    // Recurse to parents
    for parent_tracked_orm_object in tormo.parents.iter() {
        let Some(parent_arc) = parent_tracked_orm_object.upgrade() else {
            continue;
        };
        let parent = parent_arc.read().unwrap();
        if parent.valid != TrackedOrmObjectValidity::Valid {
            continue;
        }

        // Build the path segment for this parent
        if let Some(segment_to_parent) = path_segment_to_parent(tormo, &parent) {
            // Recurse to the parent.
            // If paths are returned, return them with this segment attached.
            let mut child_paths = get_paths_for_tormo(&parent, ordered_tormos);

            for child_path in child_paths.iter_mut() {
                child_path.extend(segment_to_parent.clone());
            }
            paths.extend(child_paths);
        } else {
            log_info!(
                "[PATCH TRACE]  build_path_segment_for_parent returned None: parent='{}' child='{}'",
                parent.subject_iri,
                tormo.subject_iri
            );
        }
    }

    return paths;
}

fn create_update_patches(
    orm_subscription: &OrmSubscription,
    orm_changes: &OrmChanges,
) -> Vec<PrelimOrmPatch> {
    let mut patches: Vec<PrelimOrmPatch> = Vec::new();

    // Create patches to tormos from orm_changes.
    for (shape_iri, graph_changes) in orm_changes.iter() {
        for (graph_iri, subject_changes) in graph_changes.iter() {
            for (subject_iri, change) in subject_changes {
                // Get the tracked orm object for this (subject, shape) pair
                let Some(tracked_orm_object_arc) =
                    orm_subscription.get_tracked_orm_object(graph_iri, subject_iri, shape_iri)
                else {
                    // We might not be tracking this subject x shape combination. Then, there is nothing to do.
                    continue;
                };
                let tracked_orm_object = tracked_orm_object_arc.read().unwrap();

                // JUST UPDATES? Create individual patches.
                if change.prev_valid == TrackedOrmObjectValidity::Valid
                    && tracked_orm_object.valid == TrackedOrmObjectValidity::Valid
                {
                    let paths = get_paths_for_tormo(
                        &tracked_orm_object,
                        orm_subscription.config.order_by.as_ref().map(|conf| {
                            (
                                conf,
                                &orm_subscription.ordering_info.as_ref().unwrap().tormos,
                            )
                        }),
                    );

                    // Process predicate changes for this valid subject
                    patches.extend(create_patches_for_object_change(
                        &paths,
                        &change,
                        orm_changes,
                    ));
                }
            }
        }
    }

    // patches.sort_by(|p1, p2| p2.path.len().cmp(&p1.path.len()));

    patches
}

fn create_patches_for_object_change(
    paths: &Vec<Vec<String>>,
    tormo_change: &TrackedOrmObjectChange,
    all_changes: &OrmChanges,
) -> Vec<PrelimOrmPatch> {
    let mut ret: Vec<PrelimOrmPatch> = Vec::new();

    for (_pred_iri, pred_change) in tormo_change.predicates.iter() {
        let pred_schema = pred_change.tracked_predicate().schema_arc();
        let property_name = escape_json_pointer_segment(&pred_schema.readablePredicate);
        // TODO: Does the compiler see that the loop can be optimized?
        for path in paths {
            let mut path = path.clone();
            path.push(property_name.clone());

            let is_basic_type = !pred_schema
                .dataTypes
                .iter()
                .any(|dt| dt.valType == OrmSchemaValType::shape);
            let is_multi = pred_schema.is_multi();

            if is_basic_type {
                if is_multi {
                    // Add & remove values as array.
                    if !pred_change.values_removed.is_empty() {
                        let remove_patch = PrelimOrmPatch {
                            op: OrmPatchOp::remove,
                            val_type: Some(OrmPatchType::set),
                            path: path.clone(),
                            value: Some(Value::Array(
                                pred_change
                                    .values_removed
                                    .iter()
                                    .map(|v| basic_type_to_json(v))
                                    .collect(),
                            )),
                            ..Default::default()
                        };
                        ret.push(remove_patch);
                    }
                    if !pred_change.values_added.is_empty() {
                        let add_patch = PrelimOrmPatch {
                            op: OrmPatchOp::add,
                            val_type: Some(OrmPatchType::set),
                            path: path.clone(),
                            value: Some(Value::Array(
                                pred_change
                                    .values_added
                                    .iter()
                                    .map(|v| basic_type_to_json(v))
                                    .collect(),
                            )),
                            ..Default::default()
                        };
                        ret.push(add_patch);
                    }
                } else {
                    // Add / remove value as primitive, if present.

                    if let Some(val) = pred_change.values_added.get(0) {
                        let add_patch = PrelimOrmPatch {
                            op: OrmPatchOp::add,
                            path: path.clone(),
                            value: Some(basic_type_to_json(val)),
                            ..Default::default()
                        };
                        ret.push(add_patch)
                    } else if !pred_change.values_removed.is_empty() {
                        // Only add a remove patch if no overwriting add patch is created.
                        let remove_patch = PrelimOrmPatch {
                            op: OrmPatchOp::remove,
                            path: path.clone(),
                            ..Default::default()
                        };
                        ret.push(remove_patch)
                    }
                }
            } else {
                // Nested object

                if !is_multi {
                    if !pred_change.values_removed.is_empty() {
                        let remove_patch = PrelimOrmPatch {
                            op: OrmPatchOp::remove,
                            path: path.clone(),
                            ..Default::default()
                        };
                        ret.push(remove_patch);
                    }

                    if let Some(BasicType::Str(child_subj_iri)) = pred_change.values_added.get(0) {
                        if let Some(child_tormo) = pred_change.first_tormo_for_subj(&child_subj_iri)
                        {
                            let child_tormo = child_tormo.read().unwrap();
                            let materialized_child =
                                materialize_orm_object_from_tormo(&child_tormo, all_changes);
                            let add_patch = PrelimOrmPatch {
                                op: OrmPatchOp::add,
                                path: path.clone(),
                                value: Some(materialized_child),
                                ..Default::default()
                            };
                            ret.push(add_patch);
                        }
                    }
                } else {
                    // multi object
                    // Add materialized object(s).

                    for removed_val in pred_change.values_removed.iter() {
                        let BasicType::Str(removed_iri) = removed_val else {
                            continue;
                        };
                        let remove_patch = PrelimOrmPatch {
                            op: OrmPatchOp::remove,
                            val_type: Some(OrmPatchType::set),
                            path: path.clone(),
                            value: Some(json!({"@id": removed_iri})), // Enough to identify removed object(s).
                            ..Default::default()
                        };
                        ret.push(remove_patch);
                    }

                    for added_val in pred_change.values_added.iter() {
                        let BasicType::Str(child_subj_iri) = added_val else {
                            continue;
                        };
                        if let Some(child_tormo) = pred_change.first_tormo_for_subj(&child_subj_iri)
                        {
                            let child_tormo = child_tormo.read().unwrap();
                            let materialized_child =
                                materialize_orm_object_from_tormo(&child_tormo, all_changes);

                            let add_patch = PrelimOrmPatch {
                                op: OrmPatchOp::add,
                                val_type: Some(OrmPatchType::set),
                                path: path.clone(),
                                value: Some(materialized_child),
                                ..Default::default()
                            };
                            ret.push(add_patch);
                        }
                    }
                }
            }
        }
    }

    return ret;
}

fn materialize_orm_object_from_tormo(tormo: &TrackedOrmObject, all_changes: &OrmChanges) -> Value {
    // First, try to find the data in tormo changes (it that is new).
    let maybe_change = all_changes
        .get(&tormo.shape_iri())
        .and_then(|v| v.get(&tormo.graph_iri))
        .and_then(|v| v.get(&tormo.subject_iri));
    if let Some(change) = maybe_change {
        materialize_orm_object(change, true, all_changes)
    } else {
        // TODO
        // We arrive in this case when grafting:
        // Either an @id only was attached as a nested object and the dev expects to receive the materialized object back -> we need to fetch
        // or the whole object was attached that was materialized already in a different place of the subscription (we received the link patch only).
        // A third case: The developer grafts with an @id only but the object is materialized somewhere already -> copy patch or frontend does its job.
        json!({
            "@graph": tormo.graph_iri,
            "@id": tormo.subject_iri,
            "@shape": tormo.shape_iri(),
            "NOTE": "GRAFTING NOT IMPLEMENTED"
        })
    }
}

/// Only call if order_by config is set.
/// Create patches that effect the position of objects in ordered/paginated subscriptions.
/// For ordered, unpaginated subscriptions, this includes adds, removes, moves.
/// For pagination, this includes moving between pages to ensure page size remains stable as well.
fn root_patches_for_ordered(
    orm_subscription: &mut OrmSubscription,
    orm_changes: &OrmChanges,
) -> Vec<PrelimOrmPatch> {
    let Some(order_by_conf) = orm_subscription.config.order_by.as_ref() else {
        return Vec::new();
    };

    enum OrderOperation {
        Add(OrderKey, Arc<RwLock<TrackedOrmObject>>),
        Remove(OrderKey),
        Move(OrderKey, OrderKey),
    }

    let mut change_ops: Vec<OrderOperation> = Vec::new();

    let order_by_props = order_by_conf
        .iter()
        .map(|(pred, order_dir)| (&pred.iri, order_dir))
        .collect::<Vec<_>>();

    let root_shape_iri = orm_subscription.shape_type.shape.clone();

    // Collect the patch changes to be done.
    let graph_changes = orm_changes.get(&root_shape_iri);
    if let Some(graph_changes) = graph_changes {
        for (graph_iri, subject_changes) in graph_changes.iter() {
            for (subject_iri, change) in subject_changes {
                // Get the tracked orm object for this (subject, shape) pair
                let Some(tracked_orm_object_arc) = orm_subscription.get_tracked_orm_object(
                    graph_iri,
                    subject_iri,
                    &root_shape_iri,
                ) else {
                    // We might not be tracking this subject x shape combination. Then, there is nothing to do.
                    continue;
                };
                let arc2 = Arc::clone(&tracked_orm_object_arc);
                let tormo = arc2.read().unwrap();

                // Skip if tormo is invalid and was so before.
                if change.prev_valid == TrackedOrmObjectValidity::Invalid
                    && (tormo.valid == TrackedOrmObjectValidity::Invalid
                        || tormo.valid == TrackedOrmObjectValidity::ToDelete)
                {
                    continue;
                }

                // DELETEd
                if change.prev_valid == TrackedOrmObjectValidity::Valid
                    && tormo.valid != TrackedOrmObjectValidity::Valid
                    && *tormo.shape().iri == orm_subscription.root_shape().iri
                {
                    let previous_key = order_key_before_change(order_by_conf, &tormo, change);
                    change_ops.push(OrderOperation::Remove(previous_key));

                    continue;
                }

                let new_key: OrderKey = order_key_from(order_by_conf, &tormo);

                // ADDs
                if change.prev_valid != TrackedOrmObjectValidity::Valid
                    && tormo.valid == TrackedOrmObjectValidity::Valid
                {
                    change_ops.push(OrderOperation::Add(new_key, tracked_orm_object_arc));

                    continue;
                }

                // MOVEs
                if change.prev_valid == TrackedOrmObjectValidity::Valid
                    && tormo.valid == TrackedOrmObjectValidity::Valid
                {
                    if order_by_props
                        .iter()
                        .any(|(order_by_pred, _)| change.predicates.contains_key(*order_by_pred))
                    {
                        let previous_key = order_key_before_change(order_by_conf, &tormo, change);
                        change_ops.push(OrderOperation::Move(previous_key, new_key));
                    }
                }
            }
        }
    }

    // REMOVE when moved to pos 0 or end

    // Rolling (multiple active pages)
    // Simple pagination (single active page)
    // Growing pagination (no prev(), everything kept)

    // Sort the changes to be done: makes testing easier.
    change_ops.sort_unstable_by(|op1, op2| {
        let key1 = match op1 {
            OrderOperation::Add(new_key, _) => new_key,
            OrderOperation::Remove(old_key) => old_key,
            OrderOperation::Move(old_key, _new_key) => old_key,
        };
        let key2 = match op2 {
            OrderOperation::Add(new_key, _) => new_key,
            OrderOperation::Remove(old_key) => old_key,
            OrderOperation::Move(old_key, _new_key) => old_key,
        };
        return key1.cmp(key2);
    });

    let mut patches: Vec<PrelimOrmPatch> = Vec::new();
    let mut out_of_bounds_tormos: Vec<(GraphIri, SubjectIri)> = Vec::new();
    let mut upper_offset_shift: i32 = 0;
    let is_paginated = orm_subscription.config.page_size > 0;
    let in_grow_mode = is_paginated && orm_subscription.config.max_active_pages == 0;

    // If in pagination and an item is inserted at the very beginning or end,
    // we assume that it went out of bounds and we remove / untrack it.
    let should_skip_insert = |at_start: bool, at_end: bool| -> bool {
        if !is_paginated {
            return false;
        }
        if in_grow_mode && at_start {
            return false;
        }

        at_end || at_end
    };

    // Create JSON patches from change_ops and update ordering.tormos.
    let ordering = orm_subscription.ordering_info.as_mut().unwrap();
    for op in change_ops {
        match op {
            OrderOperation::Add(new_key, tormo) => {
                ordering.tormos.insert(new_key.clone(), tormo.clone());
                let insert_index = ordering.tormos.rank_of(&new_key).unwrap();
                let graph_iri = &tormo.read().unwrap().graph_iri;
                let subject_iri = &tormo.read().unwrap().subject_iri;

                if should_skip_insert(insert_index == 0, insert_index == ordering.tormos.len() - 1)
                    && !ordering.tormos.is_empty()
                {
                    ordering.tormos.remove(&new_key);
                    out_of_bounds_tormos.push((graph_iri.clone(), subject_iri.clone()));
                } else {
                    let change = orm_changes
                        .get(&root_shape_iri)
                        .unwrap()
                        .get(graph_iri)
                        .unwrap()
                        .get(subject_iri)
                        .unwrap();
                    let materialized = materialize_orm_object(change, false, orm_changes);

                    patches.push(PrelimOrmPatch {
                        op: OrmPatchOp::add,
                        path: vec![format!("{insert_index}")],
                        value: Some(materialized),
                        ..Default::default()
                    });
                    // Increase SPARQL offset value.
                    upper_offset_shift += 1;
                }
            }
            OrderOperation::Remove(old_key) => {
                let remove_index = ordering.tormos.rank_of(&old_key).unwrap();
                ordering.tormos.remove(&old_key);

                patches.push(PrelimOrmPatch {
                    op: OrmPatchOp::remove,
                    path: vec![format!("{remove_index}")],
                    ..Default::default()
                });
                // Decrease SPARQL offset value.
                upper_offset_shift -= 1;
            }
            OrderOperation::Move(old_key, new_key) => {
                let remove_index = ordering.tormos.rank_of(&old_key).unwrap();
                let tormo = ordering.tormos.remove(&old_key).unwrap();
                ordering.tormos.insert(new_key.clone(), tormo);
                let insert_index = ordering.tormos.rank_of(&new_key).unwrap();

                // If the item was inserted at the very beginning or end,
                // we assume that it went out of bounds and we remove / untrack it.
                if should_skip_insert(insert_index == 0, insert_index == ordering.tormos.len() - 1)
                    && !ordering.tormos.is_empty()
                {
                    // Removed because moved out of bounds.
                    let removed_tormo = ordering.tormos.remove(&new_key).unwrap();
                    out_of_bounds_tormos.push((
                        removed_tormo.read().unwrap().graph_iri.clone(),
                        removed_tormo.read().unwrap().subject_iri.clone(),
                    ));

                    patches.push(PrelimOrmPatch {
                        op: OrmPatchOp::remove,
                        path: vec![format!("{remove_index}")],
                        ..Default::default()
                    });
                    // Decrease SPARQL offset value.
                    upper_offset_shift -= 1;
                } else {
                    // Move to new position.
                    patches.push(PrelimOrmPatch {
                        op: OrmPatchOp::move_,
                        from: Some(format!("/{remove_index}")),
                        path: vec![format!("{insert_index}")],
                        ..Default::default()
                    });
                }
            }
        }
    }

    if let Some((_limit, _lower_offset, upper_offset)) = ordering.limit_lower_upper_offset.as_mut()
    {
        *upper_offset =
            usize::try_from(*upper_offset as i32 + upper_offset_shift).unwrap_or(*upper_offset)
    }
    // Remove tormos that were added/moved out of bounds.
    for (graph_iri, subject_iri) in out_of_bounds_tormos {
        orm_subscription.remove_tracked_orm_object(&graph_iri, &subject_iri, &root_shape_iri);
    }

    patches
}

/// Create patches for new root objects and deleted root objects.
fn root_patches_for_non_ordered(
    orm_subscription: &OrmSubscription,
    orm_changes: &OrmChanges,
) -> Vec<OrmPatch> {
    let mut patches: Vec<OrmPatch> = Vec::new();
    let root_shape_iri = &orm_subscription.shape_type.shape;

    // Collect the patch changes to be done.
    let graph_changes = orm_changes.get(root_shape_iri);
    if let Some(graph_changes) = graph_changes {
        for (_graph_iri, subject_changes) in graph_changes.iter() {
            for (_subject_iri, change) in subject_changes {
                let tracked_orm_object_arc = &change.tracked_orm_object;

                let arc2 = Arc::clone(&tracked_orm_object_arc);
                let tormo = arc2.read().unwrap();

                // Delete
                if change.prev_valid == TrackedOrmObjectValidity::Valid
                    && tormo.valid != TrackedOrmObjectValidity::Valid
                    && *tormo.shape().iri == orm_subscription.root_shape().iri
                {
                    patches.push(OrmPatch {
                        op: OrmPatchOp::remove,
                        path: format!("/{}", composite_key(&tormo)),
                        valType: Some(OrmPatchType::set),
                        ..Default::default()
                    });
                    continue;
                }

                // Add
                if change.prev_valid != TrackedOrmObjectValidity::Valid
                    && tormo.valid == TrackedOrmObjectValidity::Valid
                {
                    let materialized_root = materialize_orm_object(change, true, orm_changes);

                    patches.push(OrmPatch {
                        op: OrmPatchOp::add,
                        path: "/".into(),
                        valType: Some(OrmPatchType::set),
                        value: Some(materialized_root),
                        ..Default::default()
                    });

                    continue;
                }
            }
        }
    }

    return patches;
}

/// Filters quads by subject scope (and page if present). If the subscription has no subject scope and no ordering,
/// returns borrowed references to the original slices (no allocation).
/// Otherwise, returns owned filtered vectors and a set of g-s pairs that need fetching.
fn filter_quads_for_scope_and_page_bounds<'a>(
    subscription: &OrmSubscription,
    inserts: &'a [Quad],
    removes: &'a [Quad],
) -> (Cow<'a, [Quad]>, Cow<'a, [Quad]>, HashSet<GraphSubjectKey>) {
    let has_pagination = subscription.config.page_size != 0;
    if subscription.subject_scope.is_empty() && !has_pagination {
        (
            Cow::Borrowed(inserts),
            Cow::Borrowed(removes),
            HashSet::with_capacity(0),
        )
    } else {
        // Relevant subjects consist of all tormos plus the explicit subject scope.
        let subjects_in_scope: HashSet<String> =
            subscription.subject_scope.iter().cloned().collect();
        let graphs_in_scope: HashSet<String> = subscription.graph_scope.iter().cloned().collect();

        let page_window_bounds = subscription.get_page_window_bounds();

        let mut graph_subject_needs_fetch: HashSet<GraphSubjectKey> = HashSet::new();

        let mut should_keep_quad = |quad: &Quad, is_insert: bool| -> bool {
            let graph_subject = (
                graph_of_quad(quad).to_owned(),
                subject_of_quad(quad).to_owned(),
            );
            let predicate = quad.predicate.as_str();

            // Check if graph, subject is present in a tormo already.
            if subscription.has_graph_subject(&graph_subject.0, &graph_subject.1) {
                return true;
            }

            // Are we tracking this scope explicitly?
            let is_in_graph_scope =
                graphs_in_scope.is_empty() || graphs_in_scope.contains(&graph_subject.0);
            let is_in_subject_scope =
                subjects_in_scope.is_empty() || subjects_in_scope.contains(&graph_subject.1);
            if !is_in_subject_scope && !is_in_graph_scope {
                return false;
            }

            if !is_insert {
                return false;
            }

            // Now, if this is a new quad with the order_by predicate and a value that is within the current window,
            // the quad is of relevance and we schedule it's g-s for fetching.
            let in_grow_mode =
                subscription.config.max_active_pages == 0 && subscription.config.page_size > 0;

            // ... but only when we are tracking all items or all loaded pages (no max_active_pages).
            if !in_grow_mode && has_pagination {
                return false;
            } else {
                let in_range = page_window_bounds.as_ref().map_or(
                    true,
                    |(order_by_pred, is_asc, first, last)| {
                        predicate == *order_by_pred
                            && is_order_value_in_window_range(
                                &oxrdf_term_to_orm_basic_type(&quad.object),
                                first,
                                last,
                                *is_asc,
                                in_grow_mode,
                            )
                    },
                );
                if in_range {
                    if subscription.subject_scope.is_empty()
                        || subscription.subject_scope.contains(&graph_subject.1)
                    {
                        // This is a subject that we didn't track before because it was out of range.
                        // Now it is and we need to fetch and validate it.
                        graph_subject_needs_fetch.insert(graph_subject);
                    }
                }

                in_range
            }
        };

        let filtered_inserts: Vec<Quad> = inserts
            .iter()
            .filter(|quad| should_keep_quad(quad, true))
            .cloned()
            .collect();

        let filtered_removes: Vec<Quad> = removes
            .iter()
            .filter(|quad| should_keep_quad(quad, false))
            .cloned()
            .collect();

        (
            Cow::Owned(filtered_inserts),
            Cow::Owned(filtered_removes),
            graph_subject_needs_fetch,
        )
    }
}

#[inline]
fn graph_of_quad(quad: &Quad) -> &str {
    match &quad.graph_name {
        ng_oxigraph::oxrdf::GraphName::NamedNode(iri) => iri.as_str(),
        _ => panic!("Quads must have NamedNode as graph"), // Cannot happen
    }
}
#[inline]
fn subject_of_quad(quad: &Quad) -> &str {
    match &quad.subject {
        ng_oxigraph::oxrdf::Subject::NamedNode(iri) => iri.as_str(),
        _ => panic!("Quads must have NamedNode as subject"), // Cannot happen
    }
}

fn is_order_value_in_window_range(
    value: &BasicType,
    first_window_value: &BasicType,
    last_window_value: &BasicType,
    order_direction: OrderDirection,
    checker_upper_bound_only: bool,
) -> bool {
    if !checker_upper_bound_only {
        if order_direction == OrderDirection::Ascending {
            first_window_value <= value && value <= last_window_value
        } else {
            last_window_value <= value && value <= first_window_value
        }
    } else {
        if order_direction == OrderDirection::Ascending {
            value <= last_window_value
        } else {
            value >= last_window_value
        }
    }
}

/// Holds patches to be converted to proper ORM patches but does not join the path yet.
struct PrelimOrmPatch {
    pub op: OrmPatchOp,
    pub val_type: Option<OrmPatchType>,
    pub path: Vec<String>,
    pub from: Option<String>,
    pub value: Option<serde_json::Value>,
}
impl PrelimOrmPatch {
    pub fn to_patch(self) -> OrmPatch {
        OrmPatch {
            op: self.op,
            path: format!("/{}", self.path.join("/")),
            from: self.from,
            valType: self.val_type,
            value: self.value,
        }
    }
}
impl Default for PrelimOrmPatch {
    fn default() -> Self {
        Self {
            op: OrmPatchOp::remove,
            path: Vec::new(),
            val_type: None,
            from: None,
            value: None,
        }
    }
}
