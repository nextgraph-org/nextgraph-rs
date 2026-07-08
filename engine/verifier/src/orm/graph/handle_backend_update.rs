// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use std::cmp;
use std::cmp::Ordering;
use std::collections::BTreeMap;
use std::collections::HashMap;
use std::ops::Index;
use std::sync::Arc;
use std::sync::RwLock;
use std::sync::RwLockReadGuard;

use futures::SinkExt;
pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_net::{app_protocol::*, orm::*};
use ng_oxigraph::oxrdf::Quad;
use ng_repo::errors::NgError;
use ng_repo::log::*;

use crate::orm::graph::add_remove_quads::oxrdf_term_to_orm_basic_type;
use crate::orm::graph::initialize::materialize_orm_object;
use crate::orm::graph::types::*;
use crate::orm::graph::utils::basic_type_to_json;
use crate::orm::graph::utils::GraphSubjectKey;
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

        // log_info!(
        //     "inserts\n{}",
        //     inserts
        //         .iter()
        //         .map(|q| format!("{q}",))
        //         .collect::<Vec<_>>()
        //         .join("\n")
        // );
        // log_info!(
        //     "removes\n{}",
        //     removes
        //         .iter()
        //         .map(|q| format!("{q}",))
        //         .collect::<Vec<_>>()
        //         .join("\n")
        // );

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

            // If subscription is paginated, this will increase the count of potential shifts
            // to the SPARQL OFFSET of the page order query.
            update_potential_offset_shift_count(&mut orm_subscription, inserts, removes);

            // Filter quads by subject scope if applicable
            let (inserts, removes, gs_to_fetch) =
                filter_quads_by_subject_scope_if_necessary(&orm_subscription, inserts, removes);

            // If we have an ordered page, it might be that new quads arrived whose value is within the window bounds.
            // In that case we have to add the graph+subject to the tormo and query the related quads.
            let inserts: Cow<'_, [Quad]> = if gs_to_fetch.len() > 0 {
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
                let mut new_quads = self
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
                    });
                new_quads.extend(inserts.iter().cloned());
                Cow::Owned(new_quads)
            } else {
                Cow::Borrowed(&inserts)
            };

            // No quads to apply for this subscription?
            if inserts.is_empty() && removes.is_empty() {
                self.orm_subscriptions
                    .insert(subscription_id, orm_subscription);
                continue;
            }

            // TODO: Now ensure that processing is handled correctly
            // Collect adds, removes, moves from orm_changes.
            // Then: Apply adds, removes, moves to window
            // Calculate page/position where to send patches to
            // Strategy depends on whether we make a pagination or just keep all items in root array.
            // In the former case, we can calculate the page using the following algorithm:
            // - create object window as enumeration of current window: Vec<(page_num, (valid)tormo)>
            // - add items in to that window, assign the page num that the neighbor item has.
            //   - Record operation, the patch, based on page number of neighbor and position in page
            // - then go over window and adjust the page numbers so that they fit the page_size. Record modifications (moves)
            //

            // Process changes for this shape
            let mut orm_changes: OrmChanges = HashMap::new();
            let res = self.process_changes_for_subscription(
                &mut orm_subscription,
                &inserts,
                &removes,
                &mut orm_changes,
                false,
            );
            if let Err(error) = res {
                log_err!("Error occurred when processing changes for subscription {origin_subscription_id}: {:?}", error);
            }

            // Send patches if the subscription's session is different to the origin's session.
            if origin_subscription_id != subscription_id {
                // send patches from changes
                Verifier::send_orm_patches_from_changes(&orm_subscription, &orm_changes).await;
            }

            // Put the subscription back
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

    /// Creates and sends patches to clients from orm changes.
    ///
    ///
    /// # New approach
    /// - Patches are relative to object.
    ///   Idea: Separate two kinds of patches
    ///     - object structure patches (add object to object or array / page; move, create object)
    ///     - value patches (add, remove, overwrite literal or set values, remove objects)
    /// - Either:
    ///     - `/0/items/1` <- paginated, ordered root array
    ///     - `<g>|<s>|<shape>/pred/1` <- ordered array
    ///     - `<g>|<s>|<shape>` <- pointer to any nested object or root objects if they are not ordered
    ///     - `/` with valType `set` for creating objects
    ///     - if only a value is added or removed, the path ends with `/<readable predicate>`
    ///     - if an object is attached to another object, the object contains {@id, @graph, @shape} only.
    ///         If it is a set, valType `set` is present.
    ///
    /// ## TODOs
    /// - send_orm_patches_from_changes simplified
    ///   - for each tormo change: Needs object creation | Needs value update? Needs object attachment (@s,g,sh)?
    /// - js-land: support for new patch semantic
    ///   - support for multiple values in add patch of valType set
    ///   - linking of objects, handling central object registry
    ///   - adding orm objects to other orm object properties with same shape
    ///   - tbd
    /// - handle frontend update
    ///   - tbd
    async fn send_orm_patches_from_changes(
        orm_subscription: &OrmSubscription,
        orm_changes: &OrmChanges,
    ) {
        // TODO:
        // - adjust to `select` config

        let mut create_object_patches: Vec<OrmPatch> = Vec::new();
        // Includes deleting root objects and linking to nested objects.
        let mut atomic_patches: Vec<OrmPatch> = Vec::new();

        // Create patches to tormos from orm_changes.
        for (shape_iri, graph_changes) in orm_changes.iter() {
            let escaped_shape = escape_json_pointer_segment(shape_iri);
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

                    // Skip if tormo is invalid and was so before.
                    if change.prev_valid == TrackedOrmObjectValidity::Invalid
                        && (tracked_orm_object.valid == TrackedOrmObjectValidity::Invalid
                            || tracked_orm_object.valid == TrackedOrmObjectValidity::ToDelete)
                    {
                        continue;
                    }

                    let escaped_subject = escape_json_pointer_segment(subject_iri);

                    // DELETE? A root tormo became invalid or untracked?
                    // send delete object patch. Nested object deletion does not need patches.
                    // js-land will take care of un-referenced objects.
                    // BUT: only when not in sorted subscription (those will be addressed at their position below).
                    if change.prev_valid == TrackedOrmObjectValidity::Valid
                        && tracked_orm_object.valid != TrackedOrmObjectValidity::Valid
                        && *tracked_orm_object.shape().iri == orm_subscription.root_shape().iri
                    {
                        atomic_patches.push(OrmPatch {
                            op: OrmPatchOp::remove,
                            valType: Some(OrmPatchType::set),
                            path: format!("/{graph_iri}|{escaped_subject}|{escaped_shape}"),
                            ..Default::default()
                        });
                        continue;
                    }

                    // NEWLY VALID? Create a new, materialized object patch.
                    if change.prev_valid != TrackedOrmObjectValidity::Valid
                        && tracked_orm_object.valid == TrackedOrmObjectValidity::Valid
                    {
                        let new_object = materialize_orm_object(change);

                        create_object_patches.push(OrmPatch {
                            op: OrmPatchOp::add,
                            valType: Some(OrmPatchType::set),
                            // New objects can be attached / registered like this.
                            // This includes nested objects, JS-land will take care of the nesting hierarchy.
                            path: "/".into(),
                            value: Some(new_object),
                            ..Default::default()
                        });
                        continue;
                    }

                    // JUST UPDATES? Create individual patches.
                    if change.prev_valid == TrackedOrmObjectValidity::Valid
                        && tracked_orm_object.valid == TrackedOrmObjectValidity::Valid
                    {
                        // Process predicate changes for this valid subject
                        atomic_patches.extend(patches_for_changes(
                            graph_iri,
                            &escaped_subject,
                            &escaped_shape,
                            &change.predicates,
                        ));
                    }
                }
            }
        }

        let mut order_patches = Vec::with_capacity(0);
        // Create structural patches (for sorted subscriptions): insert at, delete at, move
        if let Some(order_by) = orm_subscription.config.order_by.as_ref() {
            order_patches = order_patches_for_changes(orm_subscription, orm_changes, order_by);
        }

        // Send patches.
        let final_patches: Vec<OrmPatch> = [create_object_patches, atomic_patches, order_patches]
            .into_iter()
            .flatten()
            .collect();

        // Send response with patches.
        if final_patches.len() > 0 {
            let _ = orm_subscription
                .sender
                .clone()
                .send(AppResponse::V0(AppResponseV0::GraphOrmUpdate(
                    final_patches,
                )))
                .await;
        }
    }
}
fn patches_for_changes(
    graph: &String,
    escaped_subject: &String,
    escaped_shape: &String,
    pred_changes: &HashMap<String, TrackedOrmPredicateChanges>,
) -> Vec<OrmPatch> {
    let mut ret: Vec<OrmPatch> = Vec::new();

    for (_pred_iri, pred_change) in pred_changes {
        let pred_schema = pred_change.tracked_predicate().schema_arc();
        let property_name = escape_json_pointer_segment(&pred_schema.readablePredicate);
        let path = format!("/{graph}|{escaped_subject}|{escaped_shape}/{property_name}");
        let is_basic_type = !pred_schema
            .dataTypes
            .iter()
            .any(|dt| dt.valType == OrmSchemaValType::shape);
        let is_multi = pred_schema.is_multi();

        if is_basic_type {
            if is_multi {
                // Add & remove values as array.
                if !pred_change.values_removed.is_empty() {
                    let remove_patch = OrmPatch {
                        op: OrmPatchOp::remove,
                        valType: Some(OrmPatchType::set),
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
                    let add_patch = OrmPatch {
                        op: OrmPatchOp::add,
                        valType: Some(OrmPatchType::set),
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
                    let add_patch = OrmPatch {
                        op: OrmPatchOp::add,
                        path: path.clone(),
                        value: Some(basic_type_to_json(val)),
                        ..Default::default()
                    };
                    ret.push(add_patch)
                } else if !pred_change.values_removed.is_empty() {
                    // Only add a remove patch if no overwriting add patch is created.
                    let remove_patch = OrmPatch {
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
                    let remove_patch = OrmPatch {
                        op: OrmPatchOp::remove,
                        path: path.clone(),
                        ..Default::default()
                    };
                    ret.push(remove_patch);
                }

                if let Some(BasicType::Str(child_subj_iri)) = pred_change.values_added.get(0) {
                    if let Some(child_tormo) = pred_change.first_tormo_for_subj(&child_subj_iri) {
                        let child_tormo = child_tormo.read().unwrap();
                        let add_patch = OrmPatch {
                            op: OrmPatchOp::add,
                            path: path.clone(),
                            value: Some(
                                json!({"@graph": child_tormo.graph_iri, "@id": child_tormo.subject_iri, "@shape": child_tormo.shape().iri}),
                            ),
                            ..Default::default()
                        };
                        ret.push(add_patch);
                    }
                }
            } else {
                for removed_val in pred_change.values_removed.iter() {
                    let BasicType::Str(removed_iri) = removed_val else {
                        continue;
                    };
                    let remove_patch = OrmPatch {
                        op: OrmPatchOp::remove,
                        valType: Some(OrmPatchType::set),
                        path: path.clone(),
                        value: Some(json!({"@id": removed_iri})), // There can be only one object with that id.
                        ..Default::default()
                    };
                    ret.push(remove_patch);
                }

                if let Some(BasicType::Str(child_subj_iri)) = pred_change.values_added.get(0) {
                    if let Some(child_tormo) = pred_change.first_tormo_for_subj(&child_subj_iri) {
                        let child_tormo = child_tormo.read().unwrap();
                        let add_patch = OrmPatch {
                            op: OrmPatchOp::add,
                            valType: Some(OrmPatchType::set),
                            path: path.clone(),
                            value: Some(
                                json!({"@graph": child_tormo.graph_iri, "@id": child_tormo.subject_iri, "@shape": child_tormo.shape().iri}),
                            ),
                            ..Default::default()
                        };
                        ret.push(add_patch);
                    }
                }
            }
        }
    }

    return ret;
}

fn sort_vals(
    order_by_props: &[(&String, &bool)],
    tracked_predicates: &HashMap<String, Arc<RwLock<TrackedOrmPredicate>>>,
) -> Vec<BasicType> {
    order_by_props
        .iter()
        .filter_map(|(order_by_pred, _is_asc)| {
            tracked_predicates
                .get(*order_by_pred)?
                .read()
                .ok()?
                .current_literals
                .clone()?
                .first()
                .cloned()
        })
        .collect()
}

/// Create patches that effect the position of objects in ordered/paginated subscriptions.
/// For ordered, unpaginated subscriptions, this includes adds, removes, moves.
/// For pagination, this includes moving between pages to ensure page size remains stable as well.
fn order_patches_for_changes(
    orm_subscription: &OrmSubscription,
    orm_changes: &OrmChanges,
    order_by: &Vec<(Arc<OrmSchemaPredicate>, IsAscending)>,
) -> Vec<OrmPatch> {
    enum OrderOperation {
        Add((GraphIri, SubjectIri)),
        Remove,
        Move(Vec<BasicType>, bool), // bool: is_previous_val
        NoOp,
    }
    type CurrentValue = BasicType;
    let mut order_changes: Vec<(Vec<CurrentValue>, OrderOperation)> = Vec::new();

    let order_by_props = order_by
        .iter()
        .map(|(pred, is_asc)| (&pred.iri, is_asc))
        .collect::<Vec<_>>();

    let compare_vals = |vals1: &[BasicType], vals2: &[BasicType]| -> Ordering {
        for i in 0..vals1.len() {
            if let Some(val2) = vals2.get(i) {
                // Ascending?
                let res = if *order_by_props[i].1 == true {
                    vals1[i].partial_cmp(val2)
                } else {
                    val2.partial_cmp(&vals1[i])
                };
                if let Some(cmp_res) = res {
                    if cmp_res != Ordering::Equal {
                        return cmp_res;
                    }
                } else {
                    // Not comparable (shouldn't happen)..
                }
            }
        }
        Ordering::Equal
    };

    let mut n_adds: usize = 0;
    let mut n_removes: usize = 0;
    let mut n_moves: usize = 0;

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

                // Skip if tormo is invalid and was so before.
                if change.prev_valid == TrackedOrmObjectValidity::Invalid
                    && (tracked_orm_object.valid == TrackedOrmObjectValidity::Invalid
                        || tracked_orm_object.valid == TrackedOrmObjectValidity::ToDelete)
                {
                    continue;
                }

                let current_order_by_vals: Vec<BasicType> =
                    sort_vals(&order_by_props, &tracked_orm_object.tracked_predicates);

                // DELETEd
                if change.prev_valid == TrackedOrmObjectValidity::Valid
                    && tracked_orm_object.valid != TrackedOrmObjectValidity::Valid
                    && *tracked_orm_object.shape().iri == orm_subscription.root_shape().iri
                {
                    order_changes.push((current_order_by_vals, OrderOperation::Remove));
                    n_removes += 1;
                    continue;
                }

                // ADDs
                if change.prev_valid != TrackedOrmObjectValidity::Valid
                    && tracked_orm_object.valid == TrackedOrmObjectValidity::Valid
                {
                    order_changes.push((
                        current_order_by_vals,
                        OrderOperation::Add((graph_iri.clone(), subject_iri.clone())),
                    ));
                    n_adds += 1;
                    continue;
                }

                // MOVEs
                if change.prev_valid == TrackedOrmObjectValidity::Valid
                    && tracked_orm_object.valid == TrackedOrmObjectValidity::Valid
                {
                    if order_by_props
                        .iter()
                        .any(|(order_by_pred, _)| change.predicates.contains_key(*order_by_pred))
                    {
                        let previous_order_by_vals: Vec<BasicType> = order_by_props
                            .iter()
                            .enumerate()
                            .map(|(i, (pred, _))| {
                                // Get the removed value or if none there, the current one.
                                change
                                    .predicates
                                    .get(*pred)
                                    .and_then(|change_pred| change_pred.values_removed.first())
                                    .unwrap_or(&current_order_by_vals[i])
                                    .clone()
                            })
                            .collect();

                        // We put the higher value in the first tuple. And indicate which one we put in the Move enum.
                        // That allows us to iterate all patches in a way that makes modifications only in one direction of the
                        // iterating index.
                        match compare_vals(&current_order_by_vals, &previous_order_by_vals) {
                            Ordering::Greater | Ordering::Equal => {
                                order_changes.push((
                                    current_order_by_vals,
                                    OrderOperation::Move(previous_order_by_vals, true),
                                ));
                            }

                            Ordering::Less => {
                                order_changes.push((
                                    previous_order_by_vals,
                                    OrderOperation::Move(current_order_by_vals, false),
                                ));
                            }
                        }
                        n_moves += 1;
                    }
                }
            }
        }
    }

    order_changes.sort_unstable_by(|(vals1, op1), (vals2, op2)| compare_vals(vals1, vals2));

    let current_len = orm_subscription.tormos_ordered.as_ref().unwrap().len();
    let new_len = current_len + n_adds - n_removes;
    let mut new_tormos_ordered: Vec<Arc<RwLock<TrackedOrmObject>>> = Vec::with_capacity(new_len);
    let mut patches: Vec<OrmPatch> = Vec::with_capacity(n_adds + n_removes + n_moves);
    // The usize is the index of the patch in patches (the patch's `from` field will be added).
    let mut unresolved_moves: Vec<(Arc<RwLock<TrackedOrmObject>>, usize)> =
        Vec::with_capacity(n_moves);

    let mut patch_path_index = current_len - 1;
    let mut order_changes_index = order_changes.len() - 1;
    let mut old_tormos_ordered_index = current_len - 1;
    for new_tormo_index in (0..new_len).rev() {
        let (ordered_changes_vals, operation) = &order_changes[order_changes_index];
        let old_vals = sort_vals(
            &order_by_props,
            &orm_subscription.tormos_ordered.as_ref().unwrap()[old_tormos_ordered_index]
                .read()
                .unwrap()
                .tracked_predicates,
        );
        let move_source = unresolved_moves.last();
        if let Some(move_source) = move_source {
            if Arc::ptr_eq(
                &move_source.0,
                &orm_subscription.tormos_ordered.as_ref().unwrap()[old_tormos_ordered_index],
            ) {
                // Found the moved object. Modify the patch.
                let move_val_is_previous_val; // = TODO
            }
        }

        match operation {
            OrderOperation::Remove => {
                patches.push(OrmPatch {
                    op: OrmPatchOp::remove,
                    path: format!("/{patch_path_index}"),
                    ..Default::default()
                });
                order_changes[new_tormo_index].1 = offset - 1;
            }

            OrderOperation::Add((g, s)) => {
                patches.push(OrmPatch {
                    op: OrmPatchOp::add,
                    path: format!("/{patch_path_index}"),
                    value: Some(json!({
                        "@graph": g,
                        "@id": s,
                        "@shape": orm_subscription.shape_type.shape
                    })),
                    ..Default::default()
                });
                order_changes[new_tormo_index].1 = offset + 1;
            }

            OrderOperation::Move(previous_vals) => {
                // First: Find the previous index.
                let origin_index = order_changes
                    .binary_search_by(|(probe, _, _)| compare_vals(probe, previous_vals));
                let Ok(origin_index) = origin_index else {
                    continue;
                };
                // Decrease the offset at the current position (since the item is added here).
                order_changes[new_tormo_index].1 = offset + 1;

                let patch_target = patch_path_index;
                let mut patch_origin = 0;
                // TODO: Optimization: If origin index is behind offset_index, we can start from offset_index
                for j in 0..origin_index {
                    patch_origin += order_changes[j].1;
                }
                order_changes[patch_origin as usize].1 -= 1;

                if patch_origin != patch_target {
                    patches.push(OrmPatch {
                        op: OrmPatchOp::move_,
                        from: Some(format!("/{}", patch_origin)),
                        path: format!("/{}", patch_target),
                        ..Default::default()
                    });
                }
            }
            OrderOperation::NoOp => {}
        }
    }

    // TODO: pagination: offset_index needs to be modified to target pages. 🫠
    // then, move patches need to ensure that all pages have the same size (moved between pages).

    patches
}

/// Filters quads by subject scope. If the subscription has no subject scope and no ordering,
/// returns borrowed references to the original slices (no allocation).
/// Otherwise, returns owned filtered vectors.
fn filter_quads_by_subject_scope_if_necessary<'a>(
    subscription: &OrmSubscription,
    inserts: &'a [Quad],
    removes: &'a [Quad],
) -> (Cow<'a, [Quad]>, Cow<'a, [Quad]>, HashSet<GraphSubjectKey>) {
    if subscription.subject_scope.is_empty() && subscription.page_info.is_none() {
        (
            Cow::Borrowed(inserts),
            Cow::Borrowed(removes),
            HashSet::with_capacity(0),
        )
    } else {
        // Relevant subjects consist of all tormos plus the explicit subject scope.
        let relevant_subjects: HashSet<String> = subscription
            .iter_all_objects()
            .map(|tormo| tormo.read().unwrap().subject_iri.clone())
            .chain(subscription.subject_scope.iter().cloned())
            .collect();

        let page_window_bounds = subscription.get_page_window_bounds();

        let mut graph_subject_needs_fetch: HashSet<GraphSubjectKey> = HashSet::new();

        let mut should_keep_quad = |quad: &Quad, quad_inserted: bool| -> bool {
            let graph_subject = (
                graph_of_quad(quad).to_owned(),
                subject_of_quad(quad).to_owned(),
            );
            let predicate = quad.predicate.as_str();

            // Check if subject is present in a tormo or a scope subject.
            let is_relevant_subject = relevant_subjects.contains(&graph_subject.1);
            // For ordered subscriptions: Check if graph+subject is in current window.
            let is_in_tormo_window = subscription.page_info.as_ref().map_or(true, |page_info| {
                page_info.tormo_graph_subject_set.contains(&graph_subject)
            });
            if is_relevant_subject && is_in_tormo_window {
                return true;
            }

            if !quad_inserted {
                return false;
            }

            // Now, if this is a new quad with the order_by predicate and a value that is within the current window,
            // the quad is of relevance and we schedule it for fetching.
            let is_order_by_quad_in_window_range = page_window_bounds.as_ref().map_or(
                false,
                |(order_by_pred, is_asc, first, last)| {
                    predicate == *order_by_pred
                        && is_order_value_in_window_range(
                            &oxrdf_term_to_orm_basic_type(&quad.object),
                            first,
                            last,
                            *is_asc,
                        )
                },
            );

            if is_order_by_quad_in_window_range {
                if subscription.subject_scope.is_empty()
                    || subscription.subject_scope.contains(&graph_subject.1)
                {
                    // This is a subject that we didn't track before because it was out of range.
                    // Now it is and we need to fetch it.
                    graph_subject_needs_fetch.insert(graph_subject);
                }
            }

            is_order_by_quad_in_window_range
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
    is_ascending: bool,
) -> bool {
    if is_ascending {
        first_window_value <= value && value <= last_window_value
    } else {
        last_window_value <= value && value <= first_window_value
    }
}

/// Updates page_info.potential_offset_shift if the the inserts or removes
/// might affect the SPARQL query offset of currently active page.
fn update_potential_offset_shift_count(
    subscription: &mut OrmSubscription,
    inserts: &[Quad],
    removes: &[Quad],
) {
    let Some((pred, asc, left, _right)) = subscription.get_page_window_bounds() else {
        return;
    };
    let order_by_pred = pred.to_owned();

    let Some(page_info) = subscription.page_info.as_mut() else {
        return;
    };

    let delta = inserts
        .iter()
        .chain(removes.iter())
        .filter(|q| {
            let key = (graph_of_quad(q).to_owned(), subject_of_quad(q).to_owned());
            if page_info.all_up_to_offset.contains(&key) {
                return true;
            }

            // Check if predicate is the (primary) order_by predicate and the value is below window.
            if order_by_pred != q.predicate.as_str() {
                return false;
            }
            let obj = oxrdf_term_to_orm_basic_type(&q.object);
            if asc {
                left < obj
            } else {
                left > obj
            }
        })
        .count() as u64;

    page_info.potential_offset_shift += delta;
}
