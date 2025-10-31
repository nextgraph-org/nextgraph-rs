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

use std::sync::{Arc, RwLock};
use std::u64;

use ng_net::app_protocol::*;
pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_repo::log::*;

use crate::orm::types::*;
use crate::orm::utils::{assess_and_rank_children, decode_json_pointer, json_to_sparql_val};
use crate::types::GraphQuadsPatch;
use crate::verifier::*;

impl Verifier {
    ///
    pub(crate) async fn orm_update_self(
        &mut self,
        scope: &NuriV0,
        shape_iri: ShapeIri,
        session_id: u64,
        _skolemnized_blank_nodes: Vec<Quad>,
        revert_inserts: Vec<Quad>,
        revert_removes: Vec<Quad>,
    ) -> Result<(), VerifierError> {
        let (mut sender, _orm_subscription) =
            self.get_first_orm_subscription_sender_for(scope, Some(&shape_iri), Some(&session_id))?;

        log_debug!("[orm_update_self] got subscription");

        // Revert changes, if there.
        if revert_inserts.len() > 0 || revert_removes.len() > 0 {
            let revert_changes = GraphQuadsPatch {
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

        let (doc_nuri, sparql_update) = {
            let orm_subscription =
                self.get_first_orm_subscription_for(scope, Some(&shape_iri), Some(&session_id));
            let doc_nuri = orm_subscription.nuri.clone();

            log_debug!("[orm_frontend_update] got subscription");

            let sparql_update = create_sparql_update_query_for_patches(orm_subscription, patches);
            log_debug!(
                "[orm_frontend_update] created sparql_update query:\n{}",
                sparql_update
            );

            (doc_nuri, sparql_update)
        };

        match self
            .process_sparql_update(
                &doc_nuri,
                &sparql_update,
                &None,
                self.get_peer_id_for_skolem(),
                session_id,
            )
            .await
        {
            Err(e) => {
                log_debug!("[orm_frontend_update] query failed");

                Err(e)
            }
            Ok((_, revert_inserts, revert_removes, skolemnized_blank_nodes)) => {
                log_debug!(
                    "[orm_frontend_update] query successful. Reverts? {}",
                    revert_inserts.len()
                );

                if !revert_inserts.is_empty()
                    || !revert_removes.is_empty()
                    || !skolemnized_blank_nodes.is_empty()
                {
                    self.orm_update_self(
                        scope,
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
    // Pre-resolve new object creations: map from base path to (subject_iri, graph_iri)
    // Example keys: "/graph|parent/childPred" for single-valued children being created
    let mut pre_resolved_children: std::collections::HashMap<String, (String, String)> =
        std::collections::HashMap::new();
    for p in patches.iter() {
        if p.op != OrmPatchOp::add {
            continue;
        }
        // We only consider String values
        let Some(val) = &p.value else {
            continue;
        };
        let Some(str_val) = val.as_str() else {
            continue;
        };
        if p.path.ends_with("/@id") {
            let base = p.path.strip_suffix("/@id").unwrap().to_string();
            pre_resolved_children
                .entry(base)
                .and_modify(|(sid, _gid)| {
                    *sid = str_val.to_string();
                })
                .or_insert((str_val.to_string(), String::new()));
        } else if p.path.ends_with("/@graph") {
            let base = p.path.strip_suffix("/@graph").unwrap().to_string();
            pre_resolved_children
                .entry(base)
                .and_modify(|(_sid, gid)| {
                    *gid = str_val.to_string();
                })
                .or_insert((String::new(), str_val.to_string()));
        }
    }

    log_debug!(
        "[create_sparql_update_query_for_patches] Starting with {} patches",
        patches.len()
    );

    // First sort patches.
    // - Process delete patches first.

    let delete_patches: Vec<_> = patches
        .iter()
        .filter(|patch| patch.op == OrmPatchOp::remove)
        .collect();

    let add_primitive_patches: Vec<_> = patches
        .iter()
        .filter(|patch| {
            patch.op == OrmPatchOp::add
                && match &patch.valType {
                    Some(vt) => *vt != OrmPatchType::object,
                    _ => true,
                }
        })
        .collect();

    // For each diff op, we create a separate INSERT or DELETE block.
    let mut sparql_sub_queries: Vec<String> = vec![];

    // Create delete statements.
    //
    for (idx, del_patch) in delete_patches.iter().enumerate() {
        let mut var_counter: i32 = 0;

        let (where_statements, target, _pred_schema) = create_where_statements_for_patch(
            &del_patch,
            &mut var_counter,
            &orm_subscription,
            Some(&pre_resolved_children),
        );
        let (graph_iri, subject_var, target_predicate, target_object) = target;

        let delete_statement;
        if let Some(target_object) = target_object {
            // Delete the link to exactly one object (IRI referenced in path, i.e. target_object)
            delete_statement = format!(
                "GRAPH <{}> {{  {} {} {} }} .",
                graph_iri, subject_var, target_predicate, target_object
            )
        } else {
            // Delete object or literal referenced by property name.
            let delete_val = match &del_patch.value {
                // No value specified, that means we are deleting all values for the given subject and predicate (multi-value scenario).
                None => {
                    format!("?{}", var_counter)
                    // Note: var_counter is not incremented here as it's only used locally
                }
                // Delete the specific values only.
                Some(val) => json_to_sparql_val(&val), // Can be one or more (joined with ", ").
            };
            delete_statement = format!(
                "GRAPH <{}> {{ {} {} {} }} .",
                graph_iri, subject_var, target_predicate, delete_val
            );
        }

        sparql_sub_queries.push(format!(
            "DELETE {{\n{}\n}}\nWHERE\n{{\n  {}\n}}",
            delete_statement,
            where_statements.join(" .\n  ")
        ));
    }

    // Process primitive add patches
    //
    for (idx, add_patch) in add_primitive_patches.iter().enumerate() {
        let mut var_counter: i32 = 0;

        // Create WHERE statements from path.
        let (where_statements, target, pred_schema) = create_where_statements_for_patch(
            &add_patch,
            &mut var_counter,
            &orm_subscription,
            Some(&pre_resolved_children),
        );
        let (graph_iri, subject_var, target_predicate, target_object) = target;

        if let Some(_target_object) = target_object {
            // Reference to exactly one object found. This is invalid when inserting literals.
            log_debug!("[create_sparql_update_query_for_patches] SKIPPING: target_object found for literal add (invalid)");
            // TODO: Return error?
            continue;
        } else {
            // Add value(s) to <subject> <predicate>
            let add_val = match &add_patch.value {
                // Delete the specific values only.
                Some(val) => json_to_sparql_val(&val), // Can be one or more (joined with ", ").
                None => {
                    // A value must be set. This patch is invalid.
                    log_debug!("[create_sparql_update_query_for_patches] SKIPPING: No value in add patch (invalid)");
                    // TODO: Return error?
                    continue;
                }
            };

            // Add SPARQL statement.

            // If the schema only has max one value,
            // then `add` can also overwrite values, so we need to delete the previous one
            if !pred_schema.unwrap().is_multi() {
                let remove_statement = format!(
                    "GRAPH <{}> {{  {} {} ?o{} }}",
                    graph_iri, subject_var, target_predicate, var_counter
                );

                let mut wheres = where_statements.clone();
                wheres.push(remove_statement.clone());

                sparql_sub_queries.push(format!(
                    "DELETE {{\n{}\n}} WHERE {{\n  {}\n}}",
                    remove_statement,
                    wheres.join(" .\n  ")
                ));
                // var_counter += 1; // Not necessary because not used afterwards.
            }
            // The actual INSERT.
            let add_statement = format!("  {} {} {} .", subject_var, target_predicate, add_val);
            sparql_sub_queries.push(format!(
                "INSERT {{\n{}\n}} WHERE {{\n  {}\n}}",
                add_statement,
                where_statements.join(". \n  ")
            ));
            log_info!("[create_sparql_update_query_for_diff] Added insert query.");
        }
    }

    log_debug!(
        "[create_sparql_update_query_for_patches] Finished. Generated {} sub-queries",
        sparql_sub_queries.len()
    );
    return sparql_sub_queries.join(";\n");
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

/// Creates sparql WHERE statements to navigate to the JSON pointer path in our ORM mapping.
/// Returns tuple of
///  - The WHERE statements as Vec<String>
///  - The graph, subject, predicate, Option<Object> of the path's ending (to be used for DELETE)
///  - The Option predicate schema of the tail of the target property.
fn create_where_statements_for_patch(
    patch: &OrmPatch,
    var_counter: &mut i32,
    orm_subscription: &OrmSubscription,
    pre_resolved_children: Option<&std::collections::HashMap<String, (String, String)>>,
) -> (
    Vec<String>,
    (String, String, String, Option<String>),
    Option<Arc<OrmSchemaPredicate>>,
) {
    log_info!(
        "[create_where_statements_for_patch] Starting. patch.path={}, patch.op={:?}",
        patch.path,
        patch.op
    );

    let mut where_statements: Vec<String> = vec![];

    let mut path: Vec<String> = patch
        .path
        .split("/")
        .map(|s| decode_json_pointer(&s.to_string()))
        .collect();

    log_info!(
        "[create_where_statements_for_patch] Decoded path into {} segments: {:?}",
        path.len(),
        path
    );
    // Drop the leading empty segment from the split("/")
    if !path.is_empty() && path[0].is_empty() {
        path.remove(0);
    }

    // We expect the first path segment to be the composite "graph|subject"
    if path.is_empty() {
        log_err!("[create_where_statements_for_patch] empty path after decoding");
        panic!("Invalid patch path: empty");
    }
    let root = path.remove(0);
    let mut split = root.split('|');
    let graph_iri = split
        .next()
        .unwrap_or_else(|| panic!("Invalid root segment, missing graph: {}", root))
        .to_string();
    let subject_iri = split
        .next()
        .unwrap_or_else(|| panic!("Invalid root segment, missing subject: {}", root))
        .to_string();

    // Handle special case: only the root object segment was present -> delete entire object
    if path.is_empty() {
        where_statements.push(format!(
            "GRAPH <{}> {{ <{}> ?p ?o }}",
            graph_iri, subject_iri
        ));
        return (
            where_statements,
            (
                graph_iri,
                format!("<{}>", subject_iri),
                "?p".to_string(),
                None,
            ),
            None,
        );
    }

    // Get root schema.
    let subj_schema: &Arc<OrmSchemaShape> = orm_subscription
        .shape_type
        .schema
        .get(&orm_subscription.shape_type.shape)
        .unwrap();

    let mut current_subj_schema: Arc<OrmSchemaShape> = subj_schema.clone();
    let mut current_graph = graph_iri.clone();
    let mut subject_ref = format!("<{}>", subject_iri);
    // Accumulate traversed predicate segments for building base keys
    let mut traversed: Vec<String> = vec![];
    log_info!(
        "[create_where_statements_for_patch] Starting traversal from subject_iri={}, remaining path segments={}",
        subject_iri,
        path.len()
    );

    while !path.is_empty() {
        let pred_name = path.remove(0);
        traversed.push(pred_name.clone());

        // Get predicate schema for current path segment.
        let pred_schema = find_pred_schema_by_name(&pred_name, &current_subj_schema);

        // Case: We arrived at a leaf value.
        if path.is_empty() {
            return (
                where_statements,
                (
                    current_graph.clone(),
                    subject_ref.clone(),
                    format!("<{}>", pred_schema.iri.clone()),
                    None,
                ),
                Some(pred_schema),
            );
        }

        // Else, we have a nested object.

        // Default traversal for single-valued object properties will add a WHERE triple
        // For multi-valued properties with an explicit composite key segment, we handle below.

        if !pred_schema.is_object() {
            panic!(
                "Predicate schema is not of type shape. Schema: {}, subject_ref: {}",
                pred_schema.iri, subject_ref
            );
        }

        if pred_schema.is_multi() {
            // Next segment must be a composite child key "graph|subject"
            if path.is_empty() {
                panic!(
                    "Expected composite child key after multi predicate '{}'",
                    pred_name
                );
            }
            let child_key = path.remove(0);
            let mut o_split = child_key.split('|');
            let object_graph_iri = o_split
                .next()
                .unwrap_or_else(|| panic!("Invalid child composite segment: {}", child_key))
                .to_string();
            let object_subject_iri = o_split
                .next()
                .unwrap_or_else(|| panic!("Invalid child composite segment: {}", child_key))
                .to_string();

            // Update current graph to the child's graph for subsequent leaf targeting
            current_graph = object_graph_iri;

            // If path ends here, we're targeting the object link itself
            if path.is_empty() {
                return (
                    where_statements,
                    (
                        current_graph.clone(),
                        subject_ref.clone(),
                        format!("<{}>", pred_schema.iri.clone()),
                        Some(format!("<{}>", object_subject_iri)),
                    ),
                    Some(pred_schema),
                );
            }

            // Otherwise, continue traversal from the concrete child IRI
            current_subj_schema =
                get_first_child_schema(Some(&object_subject_iri), &pred_schema, &orm_subscription);
            subject_ref = format!("<{}>", object_subject_iri);
            // We no longer need previous WHERE bindings since we have a concrete subject
            where_statements.clear();
            log_debug!(
                "[create_where_statements_for_patch] Reset subject_ref to <{}> and cleared where statements",
                object_subject_iri
            );
        } else {
            // Single-valued: leaf-only targeting. If path ends here, use the current subject and predicate.
            if path.len() == 0 {
                return (
                    where_statements,
                    (
                        current_graph.clone(),
                        subject_ref.clone(),
                        format!("<{}>", pred_schema.iri.clone()),
                        None,
                    ),
                    Some(pred_schema),
                );
            }

            // Try pre-resolved child first
            let base_key = format!(
                "/{}|{}/{}",
                crate::orm::utils::escape_json_pointer_segment(&graph_iri),
                crate::orm::utils::escape_json_pointer_segment(&subject_iri),
                traversed.join("/")
            );
            if let Some(pre) = pre_resolved_children.and_then(|m| m.get(&base_key)) {
                let (child_subject, child_graph) = pre.clone();
                if child_subject.is_empty() || child_graph.is_empty() {
                    panic!(
                        "Pre-resolved child requires both @id and @graph: {}",
                        base_key
                    );
                }
                current_graph = child_graph.clone();
                current_subj_schema =
                    get_first_child_schema(Some(&child_subject), &pred_schema, &orm_subscription);
                subject_ref = format!("<{}>", child_subject);
                where_statements.clear();
                log_debug!(
                    "[create_where_statements_for_patch] Pre-resolved single child {} in graph {}",
                    subject_ref,
                    current_graph
                );
                continue;
            }

            // Otherwise, use heuristic on tracked children
            if let Some(parent_obj) = orm_subscription.get_tracked_orm_object(
                &current_graph,
                &subject_iri,
                &current_subj_schema.iri,
            ) {
                // Scope the guard so it drops before we use any borrowed data
                let (parent_graph_guarded, parent_subject_guarded, maybe_tp_children) = {
                    let parent_guard = parent_obj.read().unwrap();
                    let maybe_tp_children = parent_guard
                        .tracked_predicates
                        .get(&pred_schema.iri)
                        .map(|t| t.read().unwrap().tracked_children.clone());
                    (
                        parent_guard.graph_iri.clone(),
                        parent_guard.subject_iri.clone(),
                        maybe_tp_children,
                    )
                };

                if let Some(tp_children) = maybe_tp_children {
                    let assessed = assess_and_rank_children(
                        &parent_graph_guarded,
                        &parent_subject_guarded,
                        &pred_schema,
                        false,
                        pred_schema.minCardinality,
                        pred_schema.maxCardinality,
                        &tp_children,
                    );
                    if let Some(child) = assessed.traversal_pick {
                        let ch = child.read().unwrap();
                        current_graph = ch.graph_iri.clone();
                        subject_ref = format!("<{}>", ch.subject_iri.clone());
                        current_subj_schema = get_first_child_schema(
                            Some(&ch.subject_iri),
                            &pred_schema,
                            &orm_subscription,
                        );
                        where_statements.clear();
                        log_debug!(
                            "[create_where_statements_for_patch] Heuristic-picked single child <{}> in graph {}",
                            ch.subject_iri, current_graph
                        );
                        continue;
                    }
                }
            }

            // TODO: Is that a legitimate use case? We might want to panic or continue instead.
            // Fallback: previous WHERE binding behavior
            where_statements.push(format!(
                "{} <{}> ?o{}",
                subject_ref, pred_schema.iri, var_counter,
            ));
            subject_ref = format!("?o{}", var_counter);
            *var_counter += 1;
        }
    }
    // Can't happen.
    log_err!("[create_where_statements_for_patch] PANIC: Reached end of function unexpectedly (should be impossible)");
    panic!();
}

/// Get the schema for a given subject and predicate schema.
/// It will return the first schema of which the tracked orm object is valid.
/// If there is no subject found, return the first subject schema of the predicate schema.
fn get_first_child_schema(
    subject_iri: Option<&String>,
    pred_schema: &OrmSchemaPredicate,
    orm_subscription: &OrmSubscription,
) -> Arc<OrmSchemaShape> {
    for data_type in pred_schema.dataTypes.iter() {
        let Some(schema_shape) = data_type.shape.as_ref() else {
            continue;
        };

        // ORM prioritization: Find first valid tracked object across all graphs
        let tracked_orm_objects = subject_iri
            .map(|iri| orm_subscription.get_tracked_objects_any_graph(iri, schema_shape))
            .unwrap_or_default();

        // Try to find a valid tracked object
        let valid_obj = tracked_orm_objects
            .iter()
            .find(|obj| obj.read().unwrap().valid == TrackedOrmObjectValidity::Valid);

        if let Some(_tracked_orm_object) = valid_obj {
            // The subject is already being tracked and is valid.
            return orm_subscription
                .shape_type
                .schema
                .get(schema_shape)
                .unwrap()
                .clone();
        } else if !tracked_orm_objects.is_empty() {
            // Subject is tracked but not valid yet - still use this schema
            return orm_subscription
                .shape_type
                .schema
                .get(schema_shape)
                .unwrap()
                .clone();
        } else {
            // New subject, we need to guess the schema, take the first one.
            // TODO: We could do that by looking at a distinct property, e.g. @type which must be non-overlapping.
            return pred_schema
                .dataTypes
                .iter()
                .find_map(|dt| {
                    dt.shape
                        .as_ref()
                        .and_then(|shape_str| orm_subscription.shape_type.schema.get(shape_str))
                })
                .unwrap()
                .clone();
        }
    }
    // TODO: Panicking might be too aggressive.
    panic!("No valid child schema found.");
}
