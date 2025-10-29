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
use crate::orm::utils::{decode_json_pointer, json_to_sparql_val};
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

        let (where_statements, target, _pred_schema) =
            create_where_statements_for_patch(&del_patch, &mut var_counter, &orm_subscription);
        let (graph_iri, subject_var, target_predicate, target_object) = target;

        let delete_statement;
        if let Some(target_object) = target_object {
            // Delete the link to exactly one object (IRI referenced in path, i.e. target_object)
            delete_statement = format!(
                "GRAPH <{0}> {{  {} {} {} }} .",
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
        let (where_statements, target, pred_schema) =
            create_where_statements_for_patch(&add_patch, &mut var_counter, &orm_subscription);
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

    let mut body_statements: Vec<String> = vec![];
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
    path.remove(0);

    // Handle special case: The whole object is deleted.
    if path.len() == 1 {
        body_statements.push(format!(
            "GRAPH <{}> {{ <{}> ?p ?o }}",
            graph_iri, subject_iri
        ));
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

    // The root IRI might change, if the parent path segment was an IRI.
    let root_iri = path.remove(0);
    let mut subject_ref = format!("<{}>", root_iri);
    log_info!(
        "[create_where_statements_for_patch] Starting traversal from root_iri={}, remaining path segments={}",
        root_iri,
        path.len()
    );

    while path.len() > 0 {
        let pred_name = path.remove(0);

        // Get predicate schema for current path segment.
        let pred_schema = find_pred_schema_by_name(&pred_name, &current_subj_schema);

        // Case: We arrived at a leaf value.
        if path.len() == 0 {
            return (
                where_statements,
                (subject_ref, format!("<{}>", pred_schema.iri.clone()), None),
                Some(pred_schema),
            );
        }

        // Else, we have a nested object.

        where_statements.push(format!(
            "{} <{}> ?o{}",
            subject_ref, pred_schema.iri, var_counter,
        ));

        // Update the subject_ref for traversal (e.g. <bob> <hasCat> ?o1 . ?o1 <type> Cat);
        subject_ref = format!("?o{}", var_counter);
        *var_counter = *var_counter + 1;

        if !pred_schema.is_object() {
            panic!(
                "Predicate schema is not of type shape. Schema: {}, subject_ref: {}",
                pred_schema.iri, subject_ref
            );
        }

        if pred_schema.is_multi() {
            let object_split = path.remove(0).split("|");
            let object_graph_iri = object_split[0];
            let object_subject_iri = object_split[1];

            // Path ends on an object IRI, which we return here as well.
            if path.len() == 0 {
                return (
                    where_statements,
                    (
                        object_graph_iri,
                        object_subject_iri,
                        format!("<{}>", pred_schema.iri.clone()),
                        Some(format!("<{}>", object_iri)),
                    ),
                    Some(pred_schema),
                );
            }

            current_subj_schema =
                get_first_child_schema(Some(&object_iri), &pred_schema, &orm_subscription);

            // Since we have new IRIs that we can use as root, we replace the current one with it.
            current_graph = object_graph_iri;
            subject_ref = format!("<{}>", object_subject_iri);

            // Since we have new IRI that we can use as root, we replace the current one with it.
            subject_ref = format!("<{object_iri}>");
            // And can clear all, now unnecessary where statements.
            where_statements.clear();
            log_debug!(
                "[create_where_statements_for_patch] Reset subject_ref to <{}> and cleared where statements",
                object_iri
            );
        } else {
            // Set to child subject schema.
            // TODO: Actually, we should get the tracked orm object and check for the correct shape there.
            // As long as there is only one allowed shape or the first one is valid, this is fine.
            log_debug!("[create_where_statements_for_patch] Predicate is single-valued, getting child schema");

            current_subj_schema = get_first_child_schema(None, &pred_schema, &orm_subscription);
            log_debug!("[create_where_statements_for_patch] Child schema found");
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

        // TODO: ORM prioritization.
        let tracked_orm_object_opt = subject_iri
            .and_then(|iri| orm_subscription.get_tracked_object_any_graph(iri, schema_shape));

        if let Some(tracked_orm_object) = tracked_orm_object_opt {
            // The subject is already being tracked (it's not new).
            if tracked_orm_object.read().unwrap().valid == TrackedOrmObjectValidity::Valid {
                return orm_subscription
                    .shape_type
                    .schema
                    .get(schema_shape)
                    .unwrap()
                    .clone();
            }
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
