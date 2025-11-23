// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use ng_net::orm::{OrmPatch, OrmPatchOp, OrmPatchType, OrmSchemaPredicate, OrmSchemaShape};
use ng_oxigraph::oxrdf::Quad;
use ng_repo::errors::VerifierError;

use std::sync::Arc;
use std::u64;

use ng_net::app_protocol::*;
pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_repo::log::*;

use crate::orm::types::*;
use crate::orm::utils::{
    assess_and_rank_children, decode_json_pointer, json_to_sparql_val, nuri_to_string,
};
use crate::types::GraphQuadsPatch;
use crate::verifier::*;

impl Verifier {
    ///
    pub(crate) async fn orm_update_self(
        &mut self,
        scope: &String,
        shape_iri: ShapeIri,
        session_id: u64,
        _skolemnized_blank_nodes: Vec<Quad>,
        revert_inserts: Vec<Quad>,
        revert_removes: Vec<Quad>,
    ) -> Result<(), VerifierError> {
        let (_sender, _orm_subscription) =
            self.get_first_orm_subscription_sender_for(scope, Some(&shape_iri), Some(&session_id))?;

        log_debug!("[orm_update_self] got subscription");

        // Revert changes, if there.
        if revert_inserts.len() > 0 || revert_removes.len() > 0 {
            let _revert_changes = GraphQuadsPatch {
                inserts: revert_removes,
                removes: revert_inserts,
            };
            log_debug!("[orm_update_self] Reverting triples, calling orm_backend_update. TODO");
            // TODO
            // self.orm_backend_update(session_id, scope, "", revert_changes);
            log_debug!("[orm_update_self] Triples reverted.");
        }

        Ok(())
    }

    /// Handles updates coming from JS-land (JSON patches).
    pub(crate) async fn orm_frontend_update(
        &mut self,
        session_id: u64,
        scope: &NuriV0,
        shape_iri: ShapeIri,
        patches: OrmPatches,
    ) -> Result<(), String> {
        log_debug!(
            "[orm_frontend_update] session={} shape={} patches={:?}",
            session_id,
            shape_iri,
            patches
        );

        let nuri_str = nuri_to_string(scope);
        let (doc_nuri, sparql_update) = {
            let orm_subscription =
                self.get_first_orm_subscription_for(&nuri_str, Some(&shape_iri), Some(&session_id));

            // Hack to get any graph used in the patch. We don't need one because all statements are tied to a graph
            // but the subscription.nuri might be a scope, whereas `process_sparql_update` requires a default graph.
            let patch_strs: Vec<String> =
                patches[0].path.split('/').map(|s| s.to_string()).collect();
            let graph_subj: Vec<String> = patch_strs[1].split('|').map(|s| s.to_string()).collect();
            let doc_nuri = graph_subj[0].clone();

            let sparql_update = create_sparql_update_query_for_patches(orm_subscription, patches);

            log_debug!("[orm_frontend_update] SPARQL update:\n{}", sparql_update);

            (doc_nuri, sparql_update)
        };

        match self
            .process_sparql_update(
                &NuriV0::new_from(&doc_nuri).unwrap(),
                &sparql_update,
                &None,
                self.get_peer_id_for_skolem(),
                session_id,
            )
            .await
        {
            Err(e) => {
                //log_info!("[orm_frontend_update] query failed: {:?}", e);

                Err(e)
            }
            Ok((_, revert_inserts, revert_removes, skolemnized_blank_nodes)) => {
                if !revert_inserts.is_empty()
                    || !revert_removes.is_empty()
                    || !skolemnized_blank_nodes.is_empty()
                {
                    self.orm_update_self(
                        &nuri_str,
                        shape_iri,
                        session_id,
                        skolemnized_blank_nodes,
                        revert_inserts,
                        revert_removes,
                    )
                    .await
                    .map_err(|e| e.to_string())?;
                }
                Ok(())
            }
        }
    }
}

fn create_sparql_update_query_for_patches(
    orm_subscription: &OrmSubscription,
    patches: OrmPatches,
) -> String {
    use std::collections::HashMap;

    // ------------------------- Staged Child Collection -----------------------
    let mut staged_children: HashMap<String, (String, String)> = HashMap::new();
    // Sort patches by path depth so that shallower object modifications create or track
    // intermediate objects before deeper nested primitive updates (e.g., companyName before headquarter/street).
    let mut ordered_patches = patches.clone();
    ordered_patches.sort_by_key(|p| p.path.matches('/').count());
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

    // ------------------------- Path Target Struct ----------------------------
    struct PathTarget {
        graph: String,
        subject: String, // IRI string without angle brackets
        predicate_iri: String,
        pred_schema: Arc<OrmSchemaPredicate>,
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

        // root composite
        let mut root_split = segs[0].split('|');
        let raw_graph = root_split.next()?.to_string();
        let raw_subject = root_split.next()?.to_string();
        let graph = decode_json_pointer(&raw_graph);
        let subject = decode_json_pointer(&raw_subject);
        log_debug!(
            "[resolve_path] START path='{}' root='{}|{}' segs={:?}",
            path,
            graph,
            subject,
            segs
        );
        let mut idx = 1;
        let mut current_graph = graph.clone();
        let mut current_subject = subject.clone();
        let mut current_schema = orm_subscription
            .shape_type
            .schema
            .get(&orm_subscription.shape_type.shape)
            .unwrap()
            .clone();

        while idx < segs.len() {
            let pred_name = segs[idx];
            // If path points to staged child base, we might get direct link terminal without extra segment
            let pred_schema_opt = current_schema
                .predicates
                .iter()
                .find(|p| p.readablePredicate == pred_name)
                .cloned();
            let Some(pred_schema) = &pred_schema_opt else {
                log_debug!(
                    "[resolve_path] FAIL no predicate '{}' in schema '{}' subj='{}' graph='{}'",
                    pred_name,
                    current_schema.iri,
                    current_subject,
                    current_graph
                );
                return None;
            };
            log_debug!(
                "[resolve_path] seg[{}]='{}' iri='{}' object={} multi={}",
                idx,
                pred_name,
                pred_schema.iri,
                pred_schema.is_object(),
                pred_schema.is_multi()
            );
            idx += 1;
            if !pred_schema.is_object() {
                // primitive leaf expected
                // If more segments follow -> invalid path for primitives
                if idx != segs.len() {
                    log_debug!(
                        "[resolve_path] extra segments after primitive '{}'",
                        pred_name
                    );
                    return None;
                }
                log_debug!(
                    "[resolve_path] TARGET primitive graph='{}' subj='{}' pred='{}'",
                    current_graph,
                    current_subject,
                    pred_schema.iri
                );
                return Some(PathTarget {
                    graph: current_graph,
                    subject: current_subject,
                    predicate_iri: pred_schema.iri.clone(),
                    pred_schema: pred_schema.clone(),
                    child_iri: None,
                });
            }
            // object predicate
            if pred_schema.is_multi() {
                if idx >= segs.len() {
                    log_debug!("[resolve_path] TARGET multi-object collection graph='{}' subj='{}' pred='{}'", current_graph, current_subject, pred_schema.iri);
                    return Some(PathTarget {
                        graph: current_graph,
                        subject: current_subject,
                        predicate_iri: pred_schema.iri.clone(),
                        pred_schema: pred_schema.clone(),
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
                    log_debug!("[resolve_path] TARGET multi-object link parent='{}|{}' pred='{}' child='{}'", graph, subject, pred_schema.iri, child_iri.as_ref().unwrap());
                    return Some(PathTarget {
                        graph: graph,
                        subject: subject,
                        predicate_iri: pred_schema.iri.clone(),
                        pred_schema: pred_schema.clone(),
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
                    log_debug!(
                        "[resolve_path] TARGET single-object link pred='{}' parent='{}|{}'",
                        pred_schema.iri,
                        graph,
                        subject
                    );
                    return Some(PathTarget {
                        graph: graph,
                        subject: subject,
                        predicate_iri: pred_schema.iri.clone(),
                        pred_schema: pred_schema.clone(),
                        child_iri: None,
                    });
                }

                // Check if there was a new child created for this path.
                let current_key = format!("/{}", segs[..idx].join("/"));
                if let Some((child_subj, child_graph)) = staged_children.get(&current_key) {
                    log_debug!(
                        "[resolve_path] Found path from newly added object {}",
                        current_key
                    );
                    current_schema = select_child_schema(None, pred_schema, orm_subscription);

                    current_subject = decode_json_pointer(child_subj);
                    current_graph = decode_json_pointer(child_graph);
                    continue;
                }

                log_debug!("[resolve_path] looking for current object {}|{} with schema {} in existing tormos: ", current_graph, current_subject, current_schema.iri);

                for tormo in orm_subscription.iter_all_objects() {
                    log_debug!(
                        " - {:?} {:?} {}",
                        tormo.read().unwrap().subject_iri,
                        tormo.read().unwrap().shape_iri(),
                        tormo.read().unwrap().graph_iri,
                    );
                }

                // Check for existing tormos of the linked child.
                if let Some(parent_obj) = orm_subscription.get_tracked_orm_object(
                    &current_graph,
                    &current_subject,
                    &current_schema.iri,
                ) {
                    if let Ok(parent_guard) = parent_obj.read() {
                        log_debug!("[resolve_path] acquired read");

                        if let Some(tracked_pred) =
                            parent_guard.tracked_predicates.get(&pred_schema.iri)
                        {
                            if let Ok(pred_guard) = tracked_pred.read() {
                                log_debug!(
                                    "[resolve_path] tracked pred children: {:?}",
                                    pred_guard.tracked_children
                                );
                                if let Some(child_arc) = pred_guard
                                    .tracked_children
                                    .iter()
                                    .filter_map(|w| w.upgrade())
                                    .next()
                                {
                                    if let Ok(child_guard) = child_arc.read() {
                                        current_subject = child_guard.subject_iri.clone();
                                        current_graph = child_guard.graph_iri.clone();
                                        log_debug!("[resolve_path] HEURISTIC single child -> graph='{}' subj='{}'", current_graph, current_subject);
                                        // Determine child schema now that we have descended.
                                        if let Some(child_shape_iri) = child_guard.shape_iri() {
                                            if let Some(child_schema) = orm_subscription
                                                .shape_type
                                                .schema
                                                .get(&child_shape_iri)
                                            {
                                                current_schema = child_schema.clone();
                                            }
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
        fn remove_all(&mut self, graph: &str, subj: &str, pred: &str) {
            let var = self.next_var();
            let del = format!(
                "DELETE {{\n  GRAPH <{}> {{ <{}> <{}> {} }}\n}} WHERE {{\n  GRAPH <{}> {{ <{}> <{}> {} }}\n}}",
                graph, subj, pred, var, graph, subj, pred, var
            );
            self.queries.push(del);
        }
        fn finish(self) -> String {
            self.queries.join(";\n")
        }
    }

    let mut builder = SparqlBuilder::new();

    // Helper to decode JSON Pointer encoded IRIs that appear in path segments
    // (e.g., http:~1~1example.org~1exampleAddress -> http://example.org/exampleAddress)
    fn decode_json_pointer_iri(iri: &str) -> String {
        iri.replace("~1", "/").replace("~0", "~")
    }

    // ------------------------- Handle staged single children -----------------
    for (base, (child_id, child_graph)) in staged_children.iter() {
        if child_id.is_empty() || child_graph.is_empty() {
            continue;
        }
        if let Some(target) = resolve_path(base, orm_subscription, &staged_children) {
            if target.pred_schema.is_object() && !target.pred_schema.is_multi() {
                let decoded_child = decode_json_pointer_iri(child_id);
                builder.overwrite_link(
                    &target.graph,
                    &target.subject,
                    &target.predicate_iri,
                    &decoded_child,
                );
            }
        }
    }

    // ------------------------- Process patches -------------------------------
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
        let pred = &target.predicate_iri;
        let schema = &target.pred_schema;
        match p.op {
            OrmPatchOp::remove => {
                if schema.is_object() {
                    if let Some(child) = target.child_iri.as_ref() {
                        builder.remove_link(graph, subj, pred, child);
                    } else if p.value.is_none() {
                        builder.remove_all(graph, subj, pred);
                    }
                    // Removing a specific object by value not supported without child IRI
                } else {
                    match &p.value {
                        None => builder.remove_all(graph, subj, pred),
                        Some(val) => {
                            let sparql_val = json_to_sparql_val(val);
                            builder.remove_value(graph, subj, pred, &sparql_val);
                        }
                    }
                }
            }
            OrmPatchOp::add => {
                if schema.is_object() {
                    if let Some(child) = target.child_iri.as_ref() {
                        let decoded_child = decode_json_pointer_iri(child);
                        if schema.is_multi() {
                            builder.add_link(graph, subj, pred, &decoded_child);
                        } else {
                            builder.overwrite_link(graph, subj, pred, &decoded_child);
                        }
                    } else {
                        // For single-valued object predicate without child provided, staging already handled; ignore.
                    }
                } else {
                    if let Some(val) = &p.value {
                        let sparql_val = json_to_sparql_val(val);
                        if schema.is_multi() {
                            builder.add_value(graph, subj, pred, &sparql_val);
                        } else {
                            builder.overwrite_value(graph, subj, pred, &sparql_val);
                        }
                    }
                }
            }
        }
    }

    let result = builder.finish();
    log_debug!(
        "[create_sparql_update_query_for_patches] builder produced {} bytes",
        result.len()
    );
    result
}

fn find_pred_schema_by_name(
    readable_predicate: &String,
    subject_schema: &OrmSchemaShape,
) -> Arc<ng_net::orm::OrmSchemaPredicate> {
    // Find predicate by readable name in subject schema.
    for pred_schema in subject_schema.predicates.iter() {
        if pred_schema.readablePredicate == *readable_predicate {
            return pred_schema.clone();
        }
    }
    panic!("No predicate found in schema for name");
}
