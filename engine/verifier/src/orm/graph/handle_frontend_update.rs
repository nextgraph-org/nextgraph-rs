// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use ng_net::orm::{OrmPatch, OrmPatchOp, OrmPatchType, OrmSchemaPredicate, OrmSchemaShape};
use ng_oxigraph::oxrdf::{NamedNode, Quad, Term};

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use futures::SinkExt;
use ng_net::app_protocol::*;
pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_repo::log::*;
use serde_json::json;

use crate::orm::graph::add_remove_quads::oxrdf_term_to_orm_basic_type;
use crate::orm::graph::handle_backend_update::get_paths_for_tormo;
use crate::orm::graph::initialize::materialize_orm_object;
use crate::orm::graph::types::*;
use crate::orm::graph::utils::{
    graph_iri_of_quad, json_to_sparql_val, quad_graph_subject, subject_iri_of_quad,
};
use crate::orm::utils::{decode_json_pointer, escape_json_pointer_segment};
use crate::verifier::*;

impl Verifier {
    /// Handles updates coming from JS-land (JSON patches).
    pub(crate) async fn orm_frontend_update(
        &mut self,
        subscription_id: u64,
        patches: OrmPatches,
    ) -> Result<(), String> {
        if patches.len() == 0 {
            return Ok(());
        }

        // Prepare SPARQL query from patches and schema.
        let (doc_nuri, sparql_update_query_str, schema_failed_patches, invalidated_roots) = {
            let orm_subscription = self
                .orm_subscriptions
                .get(&subscription_id)
                .ok_or_else(|| format!("Subscription {subscription_id} not found"))?;

            // Hack to get a graph Nuri that's used in the patch. We don't need one because all statements are tied to a graph
            // but the subscription.nuri might be a scope, whereas `process_sparql_update` requires a default graph.
            let patch_strs: Vec<String> =
                patches[0].path.split('/').map(|s| s.to_string()).collect();
            let graph_subj: Vec<String> = patch_strs[1].split('|').map(|s| s.to_string()).collect();
            let doc_nuri = graph_subj[0].clone();

            let (sparql_update, failed_patches, invalidated_roots) =
                create_sparql_update_query_for_patches(orm_subscription, &patches)?;

            (doc_nuri, sparql_update, failed_patches, invalidated_roots)
        };

        // Try to parse the graph nuri.
        let nuri = match NuriV0::new_from(&doc_nuri) {
            Ok(nuri) => nuri,
            Err(e) => {
                let _ = self
                    .revert_entire_update(subscription_id, &patches, &invalidated_roots)
                    .await;
                return Err(format!(
                    "Cannot parse graph nuri {doc_nuri}: {e}. All patches were reverted."
                ));
            }
        };

        // Run the query
        let sparql_result = match self
            .process_sparql_update(
                &nuri,
                &sparql_update_query_str,
                &None,
                self.get_peer_id_for_skolem(),
                subscription_id,
            )
            .await
        {
            Err(error_msg) => {
                let _ = self
                    .revert_entire_update(subscription_id, &patches, &invalidated_roots)
                    .await;

                Err(format!(
                    "SPARQL query failed, all patches were reverted. Error: {error_msg}\nQuery: {sparql_update_query_str}",
                ))
            }
            Ok((_, revert_inserts, revert_removes, _skolemnized_blank_nodes)) => {
                // Some reverts might occur due to missing permissions.
                if revert_inserts.is_empty() && revert_removes.is_empty() {
                    Ok(())
                } else {
                    // Send revert patches for the quads with missing write-permissions.
                    self.revert_rejected_quads(
                        subscription_id,
                        &patches,
                        &revert_inserts,
                        &revert_removes,
                        &invalidated_roots,
                    )
                    .await?;

                    Err(format!(
                        "Write-permission error: violating patches were reverted."
                    ))
                }
            }
        };

        // If there were schema-related patch errors but the sparql query is okay
        // (which means not all patches were reverted), send partial revert patches.
        let had_failed_schema_related_patches = schema_failed_patches.len() > 0;
        if had_failed_schema_related_patches && sparql_result.is_ok() {
            // Send revert patches for any failed patches (outside the borrow scope so we can query)
            let _ = self
                .revert_patches(subscription_id, schema_failed_patches, vec![])
                .await;
        }

        match (sparql_result, had_failed_schema_related_patches) {
            (Ok(()), false) => Ok(()),
            (Ok(()), true) => {
                Err("Some patches were invalid due to incorrect modifications to the schema and were reverted.".into())
            }
            (Err(sparql_err), false) => Err(sparql_err),
            (Err(sparql_err), true) => Err(format!("Two errors occurred:\n- Some patches were invalid due to incorrect modifications to the schema and were reverted.\n- {}", sparql_err)),
        }
    }

    /// Partial revert: the update ran, but the store rejected some of its quads for missing
    /// write permissions. Sends the frontend the patches that undo exactly those.
    async fn revert_rejected_quads(
        &self,
        subscription_id: u64,
        patches: &OrmPatches,
        revert_inserts: &Vec<Quad>,
        revert_removes: &Vec<Quad>,
        invalidated_roots: &Vec<Arc<std::sync::RwLock<TrackedOrmObject>>>,
    ) -> Result<(), String> {
        let Some(orm_subscription) = self.orm_subscriptions.get(&subscription_id) else {
            return Ok(());
        };

        let ordering = orm_subscription.config.order_by.as_ref().map(|conf| {
            (
                conf,
                &orm_subscription.ordering_info.as_ref().unwrap().tormos,
            )
        });

        let mut fix_patches: Vec<OrmPatch> = vec![];
        // (graph, subject) pairs of objects created by the failed update, to be removed entirely.
        let mut untracked_object_removes: HashSet<(String, String)> = HashSet::new();
        // Single-valued literal predicates whose previous value must be fetched from the store:
        // (path, graph, subject, predicate).
        let mut single_value_restores: Vec<(String, GraphIri, SubjectIri, PredIri)> = vec![];
        // Paths whose previous single value is already restored via a reverted remove quad.
        let mut restored_single_paths: HashSet<String> = HashSet::new();

        // Collect all (tormo, pred_schema, path) combinations a triple addresses.
        type QuadTarget = (
            Arc<std::sync::RwLock<TrackedOrmObject>>,
            Arc<OrmSchemaPredicate>,
            String,
        );

        // Helper to find the quad targets (tormo, pred schema, paths pointing to a (graph, subject) + readable predicate)
        // for a graph, subject, predicate.
        let paths_for_triple = |graph: &str, subject: &str, pred_iri: &str| -> Vec<QuadTarget> {
            let mut ret = vec![];
            for tormo_arc in
                orm_subscription.get_tracked_orm_objects_for_graph_subject(graph, subject)
            {
                let tormo = tormo_arc.read().unwrap();
                if tormo.valid != TrackedOrmObjectValidity::Valid {
                    continue;
                }
                let Some(pred_schema) = tormo
                    .shape()
                    .predicates
                    .iter()
                    .find(|p| p.iri == pred_iri)
                    .cloned()
                else {
                    continue;
                };
                for mut path in get_paths_for_tormo(&tormo, ordering) {
                    path.push(escape_json_pointer_segment(&pred_schema.readablePredicate));
                    ret.push((
                        tormo_arc.clone(),
                        pred_schema.clone(),
                        format!("/{}", path.join("/")),
                    ));
                }
            }
            ret
        };

        // Returns true if there is a valid tracked orm object for (graph, subject).
        let has_valid_tormo = |graph: &str, subject: &str| -> bool {
            orm_subscription
                .get_tracked_orm_objects_for_graph_subject(graph, subject)
                .iter()
                .any(|tormo| tormo.read().unwrap().valid == TrackedOrmObjectValidity::Valid)
        };

        // Root objects that were invalidated for a remove patch whose removal was then
        // reverted: the store still holds them, so restore their validity and re-add them
        // below. Their individual quads are covered by the full re-add.
        let mut restored_roots: Vec<(
            Arc<std::sync::RwLock<TrackedOrmObject>>,
            GraphIri,
            SubjectIri,
        )> = vec![];
        for tormo_arc in invalidated_roots {
            let (graph, subject) = {
                let tormo = tormo_arc.read().unwrap();
                (tormo.graph_iri.clone(), tormo.subject_iri.clone())
            };
            let removal_reverted = revert_removes
                .iter()
                .any(|quad| quad_graph_subject(quad) == (graph.as_str(), subject.as_str()));
            if removal_reverted {
                // Set to valid again -- they were invalidated early.
                tormo_arc.write().unwrap().valid = TrackedOrmObjectValidity::Valid;
                restored_roots.push((tormo_arc.clone(), graph, subject));
            }
        }
        let is_restored_root = |graph: &str, subject: &str| -> bool {
            restored_roots
                .iter()
                .any(|(_, g, s)| g == graph && s == subject)
        };

        // Process invalid inserts (create patches to remove optimistic adds).
        for insert_quad in revert_inserts {
            let (graph, subject) = quad_graph_subject(insert_quad);
            if is_restored_root(graph, subject) {
                // Covered by a full re-add of the restored root object.
                continue;
            }

            if !has_valid_tormo(graph, subject) {
                // The failed update created this object; it is not tracked (or only
                // tracked as invalid). Remove it entirely (one patch per graph-subject).
                untracked_object_removes.insert((graph.to_string(), subject.to_string()));
                continue;
            }

            for (_tormo_arc, pred_schema, path) in
                paths_for_triple(graph, subject, insert_quad.predicate.as_str())
            {
                if pred_schema.is_object() {
                    // A link insert was reverted -> remove the link again.
                    let child_iri = match &insert_quad.object {
                        Term::NamedNode(n) => n.as_str().to_string(),
                        _ => continue,
                    };
                    if pred_schema.is_multi() {
                        fix_patches.push(OrmPatch {
                            op: OrmPatchOp::remove,
                            valType: Some(OrmPatchType::set),
                            path,
                            value: Some(json!({"@id": child_iri})),
                            ..Default::default()
                        });
                    } else {
                        // If the link overwrote a previous one, the reverted remove quad
                        // of the old link restores it below.
                        fix_patches.push(OrmPatch {
                            op: OrmPatchOp::remove,
                            path,
                            ..Default::default()
                        });
                    }
                } else {
                    let val = json!(oxrdf_term_to_orm_basic_type(&insert_quad.object));
                    if pred_schema.is_multi() {
                        fix_patches.push(OrmPatch {
                            op: OrmPatchOp::remove,
                            valType: Some(OrmPatchType::set),
                            path,
                            value: Some(json!([val])),
                            ..Default::default()
                        });
                    } else {
                        // The previous value (if any) is unknown here; fetch it from the store below.
                        single_value_restores.push((
                            path,
                            graph.to_string(),
                            subject.to_string(),
                            pred_schema.iri.clone(),
                        ));
                    }
                }
            }
        }

        // Process invalid removes (create re-add patches for optimistic removes).
        for remove_quad in revert_removes {
            let (graph, subject) = quad_graph_subject(remove_quad);
            if is_restored_root(graph, subject) {
                // Covered by the full re-add of the restored root object.
                continue;
            }
            // If (graph, subject) is untracked, the object is not part of the frontend state
            // and there is nothing to restore.
            for (tormo_arc, pred_schema, path) in
                paths_for_triple(graph, subject, remove_quad.predicate.as_str())
            {
                if pred_schema.is_object() {
                    // A link removal was reverted -> add the link back.
                    let child_iri = match &remove_quad.object {
                        Term::NamedNode(n) => n.as_str().to_string(),
                        _ => continue,
                    };

                    // The store was not modified, so the child is still tracked on this
                    // predicate. Materialize it, since the frontend dropped the child object.
                    let child_arc = {
                        let tormo = tormo_arc.read().unwrap();
                        tormo
                            .tracked_predicates
                            .get(&pred_schema.iri)
                            .and_then(|tp| {
                                tp.read()
                                    .unwrap()
                                    .tracked_children
                                    .iter()
                                    .filter_map(|w| w.upgrade())
                                    .find(|child_arc| {
                                        let child = child_arc.read().unwrap();
                                        child.subject_iri == child_iri
                                            && child.valid == TrackedOrmObjectValidity::Valid
                                    })
                            })
                    };
                    let child_value = child_arc
                        .and_then(|child_arc| {
                            self.materialize_tormo_from_store(orm_subscription, &child_arc)
                        })
                        .ok_or(format!(
                            "Error while re-materializing child for permission-related revert."
                        ))?;
                    fix_patches.push(OrmPatch {
                        op: OrmPatchOp::add,
                        valType: pred_schema.is_multi().then_some(OrmPatchType::set),
                        path,
                        value: Some(child_value),
                        ..Default::default()
                    });
                } else {
                    // The removed quad carries the previous value; restore it directly.
                    let val = json!(oxrdf_term_to_orm_basic_type(&remove_quad.object));
                    if pred_schema.is_multi() {
                        fix_patches.push(OrmPatch {
                            op: OrmPatchOp::add,
                            valType: Some(OrmPatchType::set),
                            path,
                            value: Some(json!([val])),
                            ..Default::default()
                        });
                    } else {
                        restored_single_paths.insert(path.clone());
                        fix_patches.push(OrmPatch {
                            op: OrmPatchOp::add,
                            path,
                            value: Some(val),
                            ..Default::default()
                        });
                    }
                }
            }
        }

        // Restore previous values of overwritten single-valued literals by querying the store.
        for (path, graph_iri, subject_iri, pred_iri) in single_value_restores {
            if restored_single_paths.contains(&path) {
                // Already restored from a reverted remove quad.
                continue;
            }
            let mut quad_pattern_iter = self.graph_dataset.as_ref().unwrap().quads_for_pattern(
                Some((&NamedNode::new(&subject_iri).unwrap()).into()),
                Some((&NamedNode::new(&pred_iri).unwrap()).into()),
                None,
                Some((&NamedNode::new(&graph_iri).unwrap()).into()),
            );
            let current_object_val = quad_pattern_iter
                .next()
                .and_then(|r| r.ok())
                .map(|q| json!(oxrdf_term_to_orm_basic_type(&q.object)));

            if let Some(prev_val) = current_object_val {
                // Restore the previous value.
                fix_patches.push(OrmPatch {
                    op: OrmPatchOp::add,
                    path,
                    value: Some(prev_val),
                    ..Default::default()
                });
            } else {
                // No previous value existed, so remove the inserted one.
                fix_patches.push(OrmPatch {
                    op: OrmPatchOp::remove,
                    path,
                    ..Default::default()
                });
            };
        }

        // Remove objects that were created by the failed update.
        {
            let object_pred_iris: HashSet<&str> = orm_subscription
                .shape_type
                .schema
                .values()
                .flat_map(|shape| shape.predicates.iter())
                .filter(|pred| pred.is_object())
                .map(|pred| pred.iri.as_str())
                .collect();
            let linked_child_subjects: HashSet<&str> = revert_inserts
                .iter()
                .filter(|quad| object_pred_iris.contains(quad.predicate.as_str()))
                .filter_map(|quad| match &quad.object {
                    Term::NamedNode(n) => Some(n.as_str()),
                    _ => None,
                })
                .collect();

            for (graph, subject) in untracked_object_removes {
                let root_path = format!("/{}|{}", graph, escape_json_pointer_segment(&subject));

                if !linked_child_subjects.contains(subject.as_str()) {
                    // The link to the object was applied (writable parent graph) while its own
                    // quads were reverted. Check the store for applied links from tracked
                    // parents to this object and remove the nested object there.
                    // If the link was reverted too, the parent's own link removal covers it.

                    let quad_pattern_iter = self.graph_dataset.as_ref().unwrap().quads_for_pattern(
                        None,
                        None,
                        Some((&NamedNode::new(&subject).unwrap()).into()),
                        // TODO: scope?
                        None,
                    );
                    for term_res in quad_pattern_iter {
                        let quad = term_res.map_err(|e| e.to_string())?;
                        let parent_graph = graph_iri_of_quad(&quad);
                        let parent_subject = subject_iri_of_quad(&quad);
                        let pred_iri = quad.predicate.as_str();
                        for (_tormo_arc, pred_schema, path) in
                            paths_for_triple(parent_graph, parent_subject, pred_iri)
                        {
                            if !pred_schema.is_object() {
                                continue;
                            }
                            if pred_schema.is_multi() {
                                fix_patches.push(OrmPatch {
                                    op: OrmPatchOp::remove,
                                    valType: Some(OrmPatchType::set),
                                    path,
                                    value: Some(json!({"@id": subject})),
                                    ..Default::default()
                                });
                            } else {
                                fix_patches.push(OrmPatch {
                                    op: OrmPatchOp::remove,
                                    path,
                                    ..Default::default()
                                });
                            }
                        }
                    }
                }

                // The object might have been added as root object, check the patches.
                let has_root_entry = patches.iter().any(|p| {
                    p.op == OrmPatchOp::add
                        && (p.path == root_path || p.path.starts_with(&format!("{root_path}/")))
                });
                if has_root_entry {
                    // Drop patches addressing paths inside the removed object.
                    fix_patches.retain(|p| !p.path.starts_with(&format!("{root_path}/")));

                    fix_patches.push(OrmPatch {
                        op: OrmPatchOp::remove,
                        valType: Some(OrmPatchType::set),
                        path: root_path,
                        ..Default::default()
                    });
                }
            }
        }

        // Re-add root objects whose removal was reverted.
        for (tormo_arc, graph, subject) in &restored_roots {
            let root_path = format!("/{}|{}", graph, escape_json_pointer_segment(subject));
            let value = self
                .materialize_tormo_from_store(orm_subscription, tormo_arc)
                .ok_or(format!(
                    "Error while re-materializing object for permission-related revert."
                ))?;

            // Patches addressing paths inside the object are superseded by the full re-add.
            fix_patches.retain(|p| !p.path.starts_with(&format!("{root_path}/")));

            fix_patches.push(OrmPatch {
                op: OrmPatchOp::add,
                valType: Some(OrmPatchType::set),
                path: root_path,
                value: Some(value),
                ..Default::default()
            });
        }

        // Deduplicate (e.g. a single-value overwrite yields the same restore patch twice:
        // once from the reverted insert and once from the reverted remove).
        let mut seen: HashSet<String> = HashSet::new();
        fix_patches.retain(|p| {
            serde_json::to_string(p)
                .map(|key| seen.insert(key))
                .unwrap_or(true)
        });

        // Send the fix patches to the frontend.
        if !fix_patches.is_empty() {
            let _ = orm_subscription
                .sender
                .clone()
                .send(AppResponse::V0(AppResponseV0::GraphOrmUpdate(fix_patches)))
                .await;
        }

        Ok(())
    }

    /// Materialize a tormo by reading its subtree from the store.
    fn materialize_tormo_from_store(
        &self,
        orm_subscription: &OrmSubscription,
        tormo_arc: &Arc<std::sync::RwLock<TrackedOrmObject>>,
    ) -> Option<serde_json::Value> {
        let (shape_iri, graph_iri, subject_iri) = {
            let tormo = tormo_arc.read().unwrap();
            (
                tormo.shape_iri(),
                tormo.graph_iri.clone(),
                tormo.subject_iri.clone(),
            )
        };

        let mut overlay: OrmChanges = HashMap::new();
        if let Err(e) = self.restate_shape_fetch(
            orm_subscription,
            &mut overlay,
            &shape_iri,
            &vec![subject_iri.clone()],
        ) {
            log_err!(
                "[materialize_tormo_from_store] Failed to query subtree quads: {:?}",
                e
            );
            return None;
        }

        let change = overlay
            .get(&shape_iri)?
            .get(&graph_iri)?
            .get(&subject_iri)?;
        Some(materialize_orm_object(change, true, &overlay))
    }

    /// Full revert. Sends the frontend the patches that undo all it sent.
    async fn revert_entire_update(
        &self,
        subscription_id: u64,
        patches: &OrmPatches,
        invalidated_roots: &Vec<Arc<std::sync::RwLock<TrackedOrmObject>>>,
    ) -> Result<(), String> {
        // Handle root object-related reverts here.
        let (revertable_patches, premade_fix_patches) = {
            let orm_subscription = self
                .orm_subscriptions
                .get(&subscription_id)
                .ok_or_else(|| format!("Subscription {subscription_id} not found"))?;

            let mut premade_fix_patches: Vec<OrmPatch> = vec![];

            // Restore roots that were optimistically invalidated for a remove patch
            // and re-add them in full from store.
            let mut restored_roots: HashSet<(String, String)> = HashSet::new();
            for tormo_arc in invalidated_roots {
                let (graph, subject) = {
                    let tormo = tormo_arc.read().unwrap();
                    (tormo.graph_iri.clone(), tormo.subject_iri.clone())
                };
                tormo_arc.write().unwrap().valid = TrackedOrmObjectValidity::Valid;
                let value = self
                    .materialize_tormo_from_store(orm_subscription, tormo_arc)
                    .ok_or(format!("Error while re-materializing object for revert."))?;
                premade_fix_patches.push(OrmPatch {
                    op: OrmPatchOp::add,
                    valType: Some(OrmPatchType::set),
                    path: format!("/{}|{}", graph, escape_json_pointer_segment(&subject)),
                    value: Some(value),
                    ..Default::default()
                });
                restored_roots.insert((graph, subject));
            }

            // Remove new root objects.
            let staged_children = collect_staged_children(patches);
            let mut revertable_patches: Vec<(OrmPatch, PathTarget)> = vec![];
            let mut removed_roots: HashSet<String> = HashSet::new();
            for patch in patches.iter() {
                // Skip metadata staging patches
                if patch.path.ends_with("/@id") || patch.path.ends_with("/@graph") {
                    continue;
                }
                let Some(root_seg) = patch.path.split('/').find(|s| !s.is_empty()) else {
                    continue;
                };
                let mut root_split = root_seg.split('|');
                let (Some(raw_graph), Some(raw_subject)) = (root_split.next(), root_split.next())
                else {
                    continue;
                };
                let root_graph = decode_json_pointer(&raw_graph.to_string());
                let root_subject = decode_json_pointer(&raw_subject.to_string());

                if !orm_subscription.has_graph_subject(&root_graph, &root_subject) {
                    // The root object was created by this update: remove it entirely
                    // (one patch per root).
                    if removed_roots.insert(root_seg.to_string()) {
                        premade_fix_patches.push(OrmPatch {
                            op: OrmPatchOp::remove,
                            valType: Some(OrmPatchType::set),
                            path: format!("/{root_seg}"),
                            ..Default::default()
                        });
                    }
                    continue;
                }
                if restored_roots.contains(&(root_graph, root_subject)) {
                    // Covered by the full re-add of the restored root object.
                    continue;
                }
                let Some(target) = resolve_path(&patch.path, orm_subscription, &staged_children)
                else {
                    continue;
                };
                if target.pred_schema.is_none()
                    || !orm_subscription.has_graph_subject(&target.graph, &target.subject)
                {
                    // Reverts on roots and untracked nested objects are
                    // covered above.
                    continue;
                }
                revertable_patches.push((patch.clone(), target));
            }
            (revertable_patches, premade_fix_patches)
        };

        // Handle all other reverts.
        self.revert_patches(subscription_id, revertable_patches, premade_fix_patches)
            .await
    }

    /// Inverts literal patches and sends the result to the frontend,
    /// `premade_fix_patches` are sent along as-is (in the same message).
    async fn revert_patches(
        &self,
        subscription_id: u64,
        failed_patches: Vec<(OrmPatch, PathTarget)>,
        premade_fix_patches: Vec<OrmPatch>,
    ) -> Result<(), String> {
        if failed_patches.is_empty() && premade_fix_patches.is_empty() {
            return Ok(());
        }

        let mut fix_patches: Vec<OrmPatch> = premade_fix_patches;

        for (failed_patch, target) in failed_patches {
            let pred_schema = match target.pred_schema.clone() {
                Some(pred_schema) => pred_schema,
                None => {
                    // Only reachable through root object patches which we don't handle here.
                    continue;
                }
            };

            if pred_schema.is_multi() {
                // Multi-valued: simply invert the operation.
                if failed_patch.op == OrmPatchOp::add {
                    fix_patches.push(OrmPatch {
                        op: OrmPatchOp::remove,
                        valType: Some(OrmPatchType::set),
                        path: failed_patch.path,
                        value: failed_patch.value,
                        ..Default::default()
                    });
                } else {
                    // failed_patch.op == OrmPatchOp::remove

                    if failed_patch.value.is_some() {
                        fix_patches.push(OrmPatch {
                            op: OrmPatchOp::add,
                            valType: Some(OrmPatchType::set),
                            path: failed_patch.path,
                            value: failed_patch.value,
                            ..Default::default()
                        });
                    } else {
                        // All values from set were deleted and we need to fetch them.
                        let quad_pattern_iter =
                            self.graph_dataset.as_ref().unwrap().quads_for_pattern(
                                Some((&NamedNode::new(&target.subject).unwrap()).into()),
                                Some((&NamedNode::new(&pred_schema.iri).unwrap()).into()),
                                None,
                                Some((&NamedNode::new(&target.graph).unwrap()).into()),
                            );
                        let current_object_vals: Vec<serde_json::Value> = quad_pattern_iter
                            .into_iter()
                            .flat_map(|r| r.ok())
                            .map(|q| json!(oxrdf_term_to_orm_basic_type(&q.object)))
                            .collect();

                        fix_patches.push(OrmPatch {
                            op: OrmPatchOp::add,
                            valType: Some(OrmPatchType::set),
                            path: failed_patch.path.clone(),
                            value: Some(json!(current_object_vals)),
                            ..Default::default()
                        });
                    }
                }
            } else {
                // Single-valued: need to fetch current value.

                let mut quad_pattern_iter = self.graph_dataset.as_ref().unwrap().quads_for_pattern(
                    Some((&NamedNode::new(&target.subject).unwrap()).into()),
                    Some((&NamedNode::new(&pred_schema.iri).unwrap()).into()),
                    None,
                    Some((&NamedNode::new(&target.graph).unwrap()).into()),
                );
                // Get the first (and should be only) value.
                let current_value = quad_pattern_iter
                    .next()
                    .and_then(|r| r.ok())
                    .map(|q| json!(oxrdf_term_to_orm_basic_type(&q.object)));

                if failed_patch.op == OrmPatchOp::add {
                    // An add (overwrite) failed - restore the previous value.
                    if let Some(prev_val) = current_value {
                        fix_patches.push(OrmPatch {
                            op: OrmPatchOp::add,
                            path: failed_patch.path,
                            value: Some(prev_val),
                            ..Default::default()
                        });
                    } else {
                        // No previous value existed, so remove the failed add.
                        fix_patches.push(OrmPatch {
                            op: OrmPatchOp::remove,
                            path: failed_patch.path,
                            value: failed_patch.value,
                            ..Default::default()
                        });
                    }
                } else {
                    // Remove failed.
                    if let Some(curr_val) = current_value {
                        fix_patches.push(OrmPatch {
                            op: OrmPatchOp::add,
                            path: failed_patch.path,
                            value: Some(curr_val),
                            ..Default::default()
                        });
                    }
                }
            }
        }

        // Send the fix patches to the frontend
        if !fix_patches.is_empty() {
            if let Some(orm_subscription) = self.orm_subscriptions.get(&subscription_id) {
                let _ = orm_subscription
                    .sender
                    .clone()
                    .send(AppResponse::V0(AppResponseV0::GraphOrmUpdate(fix_patches)))
                    .await;
            }
        }

        Ok(())
    }
}

struct PathTarget {
    graph: String,
    subject: String,                              // IRI string without angle brackets
    pred_schema: Option<Arc<OrmSchemaPredicate>>, // Empty for root object deletion
    child_iri: Option<String>, // IRI of object referenced directly (for link ops)
}

// ------------------------- Schema Selection Helper ----------------------
fn select_child_schema(
    subject_iri: Option<&String>,
    pred_schema: &OrmSchemaPredicate,
    orm_subscription: &OrmSubscription,
) -> Arc<OrmSchemaShape> {
    for data_type in pred_schema.dataTypes.iter() {
        let Some(shape_iri) = data_type.shape.as_ref() else {
            continue;
        };
        let tracked = subject_iri
            .map(|iri| orm_subscription.get_tracked_objects_any_graph(iri, shape_iri))
            .unwrap_or_default();
        if let Some(obj) = tracked
            .iter()
            .find(|o| o.read().unwrap().valid == TrackedOrmObjectValidity::Valid)
        {
            let _ = obj; // we found a valid object; choose this schema
            return orm_subscription
                .shape_type
                .schema
                .get(shape_iri)
                .unwrap()
                .clone();
        } else if !tracked.is_empty() {
            return orm_subscription
                .shape_type
                .schema
                .get(shape_iri)
                .unwrap()
                .clone();
        } else {
            return orm_subscription
                .shape_type
                .schema
                .get(shape_iri)
                .unwrap()
                .clone();
        }
    }
    panic!(
        "No child schema selectable for predicate {}",
        pred_schema.iri
    );
}

// ------------------------- Path Resolver ---------------------------------
fn resolve_path(
    path: &str,
    orm_subscription: &OrmSubscription,
    staged_children: &HashMap<String, (String, String)>,
) -> Option<PathTarget> {
    let segs: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
    if segs.is_empty() {
        return None;
    }

    // root composite (<graph>|<subject>)
    let mut root_split = segs[0].split('|');
    let mut current_graph = decode_json_pointer(&root_split.next()?.to_string());
    let mut current_subject = decode_json_pointer(&root_split.next()?.to_string());
    let mut current_schema = orm_subscription.root_shape();

    let mut idx = 1;

    // Path points to root object?
    if segs.len() == 1 {
        return Some(PathTarget {
            graph: current_graph,
            subject: current_subject,
            child_iri: None,
            pred_schema: None,
        });
    }

    while idx < segs.len() {
        let pred_name = segs[idx];
        // If path points to staged child base, we might get direct link terminal without extra segment
        let pred_schema_opt = current_schema
            .predicates
            .iter()
            .find(|p| p.readablePredicate == pred_name)
            .cloned();
        let Some(pred_schema) = &pred_schema_opt else {
            return None;
        };

        idx += 1;
        if !pred_schema.is_object() {
            // primitive leaf expected
            // If more segments follow -> invalid path for primitives
            if idx != segs.len() {
                return None;
            }

            return Some(PathTarget {
                graph: current_graph,
                subject: current_subject,
                pred_schema: Some(pred_schema.clone()),
                child_iri: None,
            });
        }
        // object predicate
        if pred_schema.is_multi() {
            if idx >= segs.len() {
                return Some(PathTarget {
                    graph: current_graph,
                    subject: current_subject,
                    pred_schema: Some(pred_schema.clone()),
                    child_iri: None,
                });
            }
            let composite = segs[idx];
            if !composite.contains('|') {
                log_debug!(
                    "[resolve_path] invalid composite '{}' for multi-object pred='{}'",
                    composite,
                    pred_schema.iri
                );
                return None;
            }
            let parent_graph = current_graph.clone();
            let parent_subject = current_subject.clone();
            let mut cs = composite.split('|');
            let raw_child_graph = cs.next()?.to_string();
            let raw_child_subj = cs.next()?.to_string();
            let child_graph = decode_json_pointer(&raw_child_graph);
            let child_subj_decoded = decode_json_pointer(&raw_child_subj);
            current_graph = child_graph.clone();
            current_subject = child_subj_decoded.clone();
            idx += 1;
            if idx == segs.len() {
                // link to child object itself
                let child_iri = Some(child_subj_decoded);
                return Some(PathTarget {
                    graph: parent_graph,
                    subject: parent_subject,
                    pred_schema: Some(pred_schema.clone()),
                    child_iri,
                });
            } else {
                // continue traversal inside child
                current_schema =
                    select_child_schema(Some(&current_subject), pred_schema, orm_subscription);
                continue;
            }
        } else {
            // single-valued object predicate, like `/root/pred/<object>`
            if idx == segs.len() {
                return Some(PathTarget {
                    graph: current_graph.clone(),
                    subject: current_subject.clone(),
                    pred_schema: Some(pred_schema.clone()),
                    child_iri: None,
                });
            }

            // Check if there was a new child created for this path.
            let current_key = format!("/{}", segs[..idx].join("/"));
            if let Some((child_subj, child_graph)) = staged_children.get(&current_key) {
                current_schema = select_child_schema(None, pred_schema, orm_subscription);

                current_subject = decode_json_pointer(child_subj);
                current_graph = decode_json_pointer(child_graph);
                continue;
            }

            // Check for existing tormos of the linked child.
            if let Some(parent_obj) = orm_subscription.get_tracked_orm_object(
                &current_graph,
                &current_subject,
                &current_schema.iri,
            ) {
                if let Ok(parent_guard) = parent_obj.read() {
                    if let Some(tracked_pred) =
                        parent_guard.tracked_predicates.get(&pred_schema.iri)
                    {
                        if let Ok(pred_guard) = tracked_pred.read() {
                            if let Some(child_arc) = pred_guard
                                .tracked_children
                                .iter()
                                .filter_map(|w| w.upgrade())
                                .next()
                            {
                                if let Ok(child_guard) = child_arc.read() {
                                    current_subject = child_guard.subject_iri.clone();
                                    current_graph = child_guard.graph_iri.clone();

                                    // Determine child schema now that we have descended.
                                    let child_shape_iri = &child_guard.shape().iri;
                                    if let Some(child_schema) =
                                        orm_subscription.shape_type.schema.get(child_shape_iri)
                                    {
                                        current_schema = child_schema.clone();
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                log_debug!(
                    "[resolve_path] WARNING: Could not find object for path: {} at segment {}",
                    path,
                    segs[idx - 1]
                );
                return None;
            }
        }
    }
    // If we exit loop without return and have predicate schema -> treat as leaf primitive reached earlier.
    None
}

/// Collect newly generated objects staged via `@id` / `@graph` metadata patches,
/// keyed by their base path.
fn collect_staged_children(patches: &OrmPatches) -> HashMap<String, (SubjectIri, GraphIri)> {
    let mut staged_children: HashMap<String, (SubjectIri, GraphIri)> = HashMap::new();
    // Sort patches by path depth so that shallower object modifications create or track
    // intermediate objects before deeper nested primitive updates (e.g., companyName before headquarter/street).
    let mut ordered_patches = patches.clone();
    ordered_patches.sort_by_key(|p| p.path.matches('/').count());
    // Collect newly generated objects.
    // Store them in staged_children with key being the path.
    for p in ordered_patches.iter() {
        if p.op != OrmPatchOp::add {
            continue;
        }
        let Some(val) = &p.value else {
            continue;
        };
        let Some(str_val) = val.as_str() else {
            continue;
        };
        if p.path.ends_with("/@id") {
            let base = p.path.trim_end_matches("/@id").to_string();
            staged_children
                .entry(base)
                .and_modify(|(sid, _)| *sid = str_val.to_string())
                .or_insert((str_val.to_string(), String::new()));
        } else if p.path.ends_with("/@graph") {
            let base = p.path.trim_end_matches("/@graph").to_string();
            staged_children
                .entry(base)
                .and_modify(|(_, gid)| *gid = str_val.to_string())
                .or_insert((String::new(), str_val.to_string()));
        }
    }
    staged_children
}

fn create_sparql_update_query_for_patches(
    orm_subscription: &OrmSubscription,
    patches: &OrmPatches,
) -> Result<
    (
        String,
        Vec<(OrmPatch, PathTarget)>,
        Vec<Arc<std::sync::RwLock<TrackedOrmObject>>>,
    ),
    String,
> {
    // Cases to cover:
    // Possibles paths:
    // - `/g|s/` <- remove object
    // - `/g|s/prop` <- add/remove single/multiple literals, add object, remove object
    // - Support patches by array index?

    // ------------------------- Builder ---------------------------------------
    struct SparqlBuilder {
        queries: Vec<String>,
        var_counter: usize,
    }
    impl SparqlBuilder {
        fn new() -> Self {
            Self {
                queries: vec![],
                var_counter: 0,
            }
        }
        fn next_var(&mut self) -> String {
            let v = format!("?o{}", self.var_counter);
            self.var_counter += 1;
            v
        }
        fn overwrite_link(&mut self, graph: &str, subj: &str, pred: &str, child: &str) {
            let var = self.next_var();
            let combined = format!(
                "DELETE {{\n  GRAPH <{}> {{ <{}> <{}> {} }}\n}} INSERT {{\n  GRAPH <{}> {{ <{}> <{}> <{}> }}\n}} WHERE {{\n  OPTIONAL {{ GRAPH <{}> {{ <{}> <{}> {} }} }}\n}}",
                graph, subj, pred, var,
                graph, subj, pred, child,
                graph, subj, pred, var
            );
            self.queries.push(combined);
        }
        fn add_link(&mut self, graph: &str, subj: &str, pred: &str, child: &str) {
            // Use INSERT DATA for unconditional addition (engine appears to ignore plain INSERT without WHERE)
            let insert = format!(
                "INSERT DATA {{\n  GRAPH <{}> {{ <{}> <{}> <{}> }}\n}}",
                graph, subj, pred, child
            );
            self.queries.push(insert);
        }
        fn remove_link(&mut self, graph: &str, subj: &str, pred: &str, child: &str) {
            let del = format!(
                "DELETE DATA {{\n  GRAPH <{}> {{ <{}> <{}> <{}> }}\n}}",
                graph, subj, pred, child
            );
            self.queries.push(del);
        }
        fn overwrite_value(&mut self, graph: &str, subj: &str, pred: &str, value: &str) {
            let var = self.next_var();
            let combined = format!(
                "DELETE {{\n  GRAPH <{}> {{ <{}> <{}> {} }}\n}} INSERT {{\n  GRAPH <{}> {{ <{}> <{}> {} }}\n}} WHERE {{\n  OPTIONAL {{ GRAPH <{}> {{ <{}> <{}> {} }} }}\n}}",
                graph, subj, pred, var,
                graph, subj, pred, value,
                graph, subj, pred, var
            );
            self.queries.push(combined);
        }
        fn add_value(&mut self, graph: &str, subj: &str, pred: &str, value: &str) {
            // Use INSERT DATA to reliably add multi-valued literal/object without needing a WHERE pattern
            let insert = format!(
                "INSERT DATA {{\n  GRAPH <{}> {{ <{}> <{}> {} }}\n}}",
                graph, subj, pred, value
            );
            self.queries.push(insert);
        }
        fn remove_value(&mut self, graph: &str, subj: &str, pred: &str, value: &str) {
            let del = format!(
                "DELETE DATA {{\n  GRAPH <{}> {{ <{}> <{}> {} }}\n}}",
                graph, subj, pred, value
            );
            self.queries.push(del);
        }
        fn remove_all_values(&mut self, graph: &str, subj: &str, pred: &str) {
            let var = self.next_var();
            let del = format!(
                "DELETE {{\n  GRAPH <{}> {{ <{}> <{}> {} }}\n}} WHERE {{\n  GRAPH <{}> {{ <{}> <{}> {} }}\n}}",
                graph, subj, pred, var, graph, subj, pred, var
            );
            self.queries.push(del);
        }
        fn remove_object(&mut self, graph: &str, subj: &str, schema: &OrmSchemaShape) {
            for pred_schema in schema.predicates.iter() {
                self.remove_all_values(graph, subj, &pred_schema.iri);
            }
        }
        fn finish(self) -> String {
            self.queries.join(";\n")
        }
    }

    let mut builder = SparqlBuilder::new();
    let mut failed_patches: Vec<(OrmPatch, PathTarget)> = vec![];
    // Root objects marked invalid because a patch removes them. If the removal is
    // later reverted (missing permissions), their validity must be restored.
    let mut invalidated_root_tormos: Vec<Arc<std::sync::RwLock<TrackedOrmObject>>> = vec![];

    // ------------------------- Staged Child Collection -----------------------
    let staged_children = collect_staged_children(patches);

    // --------------------- Handle staged single children linking to parents ----------------
    for (base, (child_id, child_graph)) in staged_children.iter() {
        if child_id.is_empty() || child_graph.is_empty() {
            continue;
        }
        if let Some(target) = resolve_path(base, orm_subscription, &staged_children) {
            if let Some(pred_schema) = target.pred_schema {
                if pred_schema.is_object() && !pred_schema.is_multi() {
                    let decoded_child = decode_json_pointer(child_id);
                    builder.overwrite_link(
                        &target.graph,
                        &target.subject,
                        &pred_schema.iri,
                        &decoded_child,
                    );
                }
            }
        }
    }

    // ------------------------- Process patches -------------------------------
    let root_shape = orm_subscription.root_shape();

    for p in patches.iter() {
        // Skip metadata staging patches
        if p.path.ends_with("/@id") || p.path.ends_with("/@graph") {
            continue;
        }
        let Some(target) = resolve_path(&p.path, orm_subscription, &staged_children) else {
            continue;
        };
        let graph = &target.graph;
        let subj = &target.subject;
        let pred_schema = if let Some(pred_schema) = target.pred_schema.clone() {
            pred_schema
        } else {
            // No predicate schema -> We only have the root as target (to be deleted).
            if p.op == OrmPatchOp::remove {
                builder.remove_object(graph, subj, &root_shape);
                // We manually set this tormo to invalid already (if existing), so that no "became invalid" warning is logged.
                if let Some(tormo_arc) =
                    orm_subscription.get_tracked_orm_object(&graph, &subj, &root_shape.iri)
                {
                    tormo_arc.write().unwrap().valid = TrackedOrmObjectValidity::Invalid;
                    invalidated_root_tormos.push(tormo_arc);
                }
            }
            continue;
        };
        let pred = &pred_schema.iri;

        match p.op {
            OrmPatchOp::remove => {
                if pred_schema.is_object() {
                    if let Some(child) = target.child_iri.as_ref() {
                        builder.remove_link(graph, subj, pred, child);
                    } else if p.value.is_none() {
                        builder.remove_all_values(graph, subj, pred);
                    }
                    // Removing a specific object by value not supported without child IRI
                } else {
                    match &p.value {
                        None => builder.remove_all_values(graph, subj, pred),
                        Some(val) => match json_to_sparql_val(val, &pred_schema) {
                            Ok(sparql_str) => builder.remove_value(graph, subj, pred, &sparql_str),
                            Err(err) => {
                                log_err!("Reverting patch {:?} due to error: {err}", p);
                                failed_patches.push((p.clone(), target))
                            }
                        },
                    }
                }
            }
            OrmPatchOp::add => {
                if pred_schema.is_object() {
                    if let Some(child) = target.child_iri.as_ref() {
                        let decoded_child = decode_json_pointer(child);
                        if pred_schema.is_multi() {
                            builder.add_link(graph, subj, pred, &decoded_child);
                        } else {
                            builder.overwrite_link(graph, subj, pred, &decoded_child);
                        }
                    } else {
                        // For single-valued object predicate without child provided, staging already handled; ignore.
                    }
                } else {
                    if let Some(val) = &p.value {
                        match json_to_sparql_val(val, &pred_schema) {
                            Ok(sparql_str) => {
                                if sparql_str.len() > 0 {
                                    if pred_schema.is_multi() {
                                        builder.add_value(graph, subj, pred, &sparql_str);
                                    } else {
                                        builder.overwrite_value(graph, subj, pred, &sparql_str);
                                    }
                                }
                            }
                            Err(err) => {
                                log_err!("Reverting patch {:?} due to error: {err}", p);
                                failed_patches.push((p.clone(), target))
                            }
                        }
                    }
                }
            }
            OrmPatchOp::move_ => {
                // Does not happen.
                log_err!("Received move patch which is not supported. Skipping.");
            }
        }
    }

    let result = builder.finish();

    Ok((result, failed_patches, invalidated_root_tormos))
}
