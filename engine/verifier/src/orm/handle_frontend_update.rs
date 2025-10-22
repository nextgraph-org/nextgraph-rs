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
    /// After creating new objects (without an id) in JS-land,
    /// we send the generated id for those back.
    /// If something went wrong (revert_inserts / revert_removes not empty),
    /// we send a JSON patch back to revert the made changes.
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

        log_info!("[orm_update_self] got subscription");

        // Revert changes, if there.
        if revert_inserts.len() > 0 || revert_removes.len() > 0 {
            let revert_changes = GraphQuadsPatch {
                inserts: revert_removes,
                removes: revert_inserts,
            };
            log_info!("[orm_frontend_update] Reverting");

            // TODO: Call with correct params.
            // self.orm_backend_update(session_id, scope, "", revert_changes)
        }

        Ok(())
    }

    /// Handles updates coming from JS-land (JSON patches).
    pub(crate) async fn orm_frontend_update(
        &mut self,
        session_id: u64,
        scope: &NuriV0,
        shape_iri: ShapeIri,
        diff: OrmPatches,
    ) -> Result<(), String> {
        log_info!(
            "[orm_frontend_update] session={} shape={} diff={:?}",
            session_id,
            shape_iri,
            diff
        );

        let (doc_nuri, sparql_update) = {
            let orm_subscription =
                self.get_first_orm_subscription_for(scope, Some(&shape_iri), Some(&session_id));
            let doc_nuri = orm_subscription.nuri.clone();

            log_info!("[orm_frontend_update] got subscription");

            let sparql_update = create_sparql_update_query_for_diff(orm_subscription, diff);
            log_info!(
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
                log_info!("[orm_frontend_update] query failed");

                Err(e)
            }
            Ok((_, revert_inserts, revert_removes, skolemnized_blank_nodes)) => {
                log_info!(
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

fn create_sparql_update_query_for_diff(
    orm_subscription: &OrmSubscription,
    diff: OrmPatches,
) -> String {
    log_info!(
        "[create_sparql_update_query_for_diff] Starting with {} patches",
        diff.len()
    );

    // First sort patches.
    // - Process delete patches first.
    // - Process object creation add operations before rest, to ensure potential blank nodes are created.
    let delete_patches: Vec<_> = diff
        .iter()
        .filter(|patch| patch.op == OrmPatchOp::remove)
        .collect();
    log_info!(
        "[create_sparql_update_query_for_diff] Found {} delete patches",
        delete_patches.len()
    );

    let add_object_patches: Vec<_> = diff
        .iter()
        .filter(|patch| {
            patch.op == OrmPatchOp::add
                && match &patch.valType {
                    Some(vt) => *vt == OrmPatchType::object,
                    _ => false,
                }
        })
        .collect();
    log_info!(
        "[create_sparql_update_query_for_diff] Found {} add object patches",
        add_object_patches.len()
    );

    let add_primitive_patches: Vec<_> = diff
        .iter()
        .filter(|patch| {
            patch.op == OrmPatchOp::add
                && match &patch.valType {
                    Some(vt) => *vt != OrmPatchType::object,
                    _ => true,
                }
        })
        .collect();
    log_info!(
        "[create_sparql_update_query_for_diff] Found {} add primitive patches",
        add_primitive_patches.len()
    );

    // For each diff op, we create a separate INSERT or DELETE block.
    let mut sparql_sub_queries: Vec<String> = vec![];

    // Create delete statements.
    //
    for (idx, del_patch) in delete_patches.iter().enumerate() {
        log_info!(
            "[create_sparql_update_query_for_diff] Processing delete patch {}/{}: path={}",
            idx + 1,
            delete_patches.len(),
            del_patch.path
        );

        let mut var_counter: i32 = 0;

        let (where_statements, target, _pred_schema) =
            create_where_statements_for_patch(&del_patch, &mut var_counter, &orm_subscription);
        let (subject_var, target_predicate, target_object) = target;

        log_info!("[create_sparql_update_query_for_diff] Delete patch where_statements: {:?}, subject_var={}, target_predicate={}, target_object={:?}", 
            where_statements, subject_var, target_predicate, target_object);

        let delete_statement;
        if let Some(target_object) = target_object {
            // Delete the link to exactly one object (IRI referenced in path, i.e. target_object)
            delete_statement = format!(
                "  {} <{}> <{}> .",
                subject_var, target_predicate, target_object
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
            delete_statement = format!("  {} <{}> {} .", subject_var, target_predicate, delete_val);
        }

        sparql_sub_queries.push(format!(
            "DELETE {{\n{}\n}}\nWHERE\n{{\n  {}\n}}",
            delete_statement,
            where_statements.join(" .\n  ")
        ));
        log_info!(
            "[create_sparql_update_query_for_diff] Added delete query #{}",
            sparql_sub_queries.len()
        );
    }

    // Process add object patches (might need blank nodes)
    //
    for (idx, _add_obj_patch) in add_object_patches.iter().enumerate() {
        log_info!("[create_sparql_update_query_for_diff] Processing add object patch {}/{} (NOT YET IMPLEMENTED)", idx + 1, add_object_patches.len());
        // Creating objects without an id field is only supported in one circumstance:
        // An object is added to a property which has a max cardinality of one, e.g. `painting.artist`.
        // In that case, we create a blank node.
        // TODO: We need to set up a list of created blank nodes and where they belong to.
        // POTENTIAL PANIC SOURCE: This is not implemented yet
    }

    // Process primitive add patches
    //
    for (idx, add_patch) in add_primitive_patches.iter().enumerate() {
        log_info!(
            "[create_sparql_update_query_for_diff] Processing add primitive patch {}/{}: path={}",
            idx + 1,
            add_primitive_patches.len(),
            add_patch.path
        );

        let mut var_counter: i32 = 0;

        // Create WHERE statements from path.
        // POTENTIAL PANIC SOURCE: create_where_statements_for_patch can panic in several places
        let (where_statements, target, pred_schema) =
            create_where_statements_for_patch(&add_patch, &mut var_counter, &orm_subscription);
        let (subject_var, target_predicate, target_object) = target;

        log_info!("[create_sparql_update_query_for_diff] Add patch where_statements: {:?}, subject_var={}, target_predicate={}, target_object={:?}", 
            where_statements, subject_var, target_predicate, target_object);

        if let Some(_target_object) = target_object {
            // Reference to exactly one object found. This is invalid when inserting literals.
            log_info!("[create_sparql_update_query_for_diff] SKIPPING: target_object found for literal add (invalid)");
            // TODO: Return error?
            continue;
        } else {
            // Add value(s) to <subject> <predicate>
            let add_val = match &add_patch.value {
                // Delete the specific values only.
                Some(val) => json_to_sparql_val(&val), // Can be one or more (joined with ", ").
                None => {
                    // A value must be set. This patch is invalid.
                    log_info!("[create_sparql_update_query_for_diff] SKIPPING: No value in add patch (invalid)");
                    // TODO: Return error?
                    continue;
                }
            };

            // Add SPARQL statement.

            // If the schema only has max one value,
            // then `add` can also overwrite values, so we need to delete the previous one
            if !pred_schema.unwrap().is_multi() {
                log_info!("[create_sparql_update_query_for_diff] Single-value predicate, adding DELETE before INSERT");
                let remove_statement =
                    format!("  {} <{}> ?o{}", subject_var, target_predicate, var_counter);

                let mut wheres = where_statements.clone();
                wheres.push(remove_statement.clone());

                sparql_sub_queries.push(format!(
                    "DELETE {{\n{}\n}} WHERE {{\n  {}\n}}",
                    remove_statement,
                    wheres.join(" .\n  ")
                ));
                log_info!("[create_sparql_update_query_for_diff] Added delete query.");
                // var_counter += 1; // Not necessary because not used afterwards.
            }
            // The actual INSERT.
            let add_statement = format!("  {} <{}> {} .", subject_var, target_predicate, add_val);
            sparql_sub_queries.push(format!(
                "INSERT {{\n{}\n}} WHERE {{\n  {}\n}}",
                add_statement,
                where_statements.join(". \n  ")
            ));
            log_info!("[create_sparql_update_query_for_diff] Added insert query.");
        }
    }

    log_info!(
        "[create_sparql_update_query_for_diff] Finished. Generated {} sub-queries",
        sparql_sub_queries.len()
    );
    return sparql_sub_queries.join(";\n");
}

fn _get_tracked_subject_from_diff_op(
    subject_iri: &String,
    orm_subscription: &OrmSubscription,
) -> Arc<RwLock<OrmTrackedSubject>> {
    let tracked_subject = orm_subscription
        .tracked_subjects
        .get(subject_iri)
        .unwrap()
        .get(&orm_subscription.shape_type.shape)
        .unwrap();

    return tracked_subject.clone();
}

/// Removes the current predicate from the path stack and returns the corresponding IRI.
/// If the
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
///  - The Option subject, predicate, Option<Object> of the path's ending (to be used for DELETE)
///  - The Option predicate schema of the tail of the target property.
fn create_where_statements_for_patch(
    patch: &OrmPatch,
    var_counter: &mut i32,
    orm_subscription: &OrmSubscription,
) -> (
    Vec<String>,
    (String, String, Option<String>),
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
        let root_iri = &path[0];
        log_info!(
            "[create_where_statements_for_patch] Special case: whole object deletion for root_iri={}",
            root_iri
        );
        body_statements.push(format!("<{}> ?p ?o", root_iri));
        where_statements.push(format!("<{}> ?p ?o", root_iri));
        return (
            where_statements,
            (format!("<{}>", root_iri), "?p".to_string(), None),
            None,
        );
    }

    log_info!(
        "[create_where_statements_for_patch] Getting root schema for shape={}",
        orm_subscription.shape_type.shape
    );
    let subj_schema: &Arc<OrmSchemaShape> = orm_subscription
        .shape_type
        .schema
        .get(&orm_subscription.shape_type.shape)
        .unwrap();
    log_info!("[create_where_statements_for_patch] Root schema found");

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
        log_info!(
            "[create_where_statements_for_patch] Processing path segment: pred_name={}, remaining={}",
            pred_name,
            path.len()
        );

        // POTENTIAL PANIC SOURCE: find_pred_schema_by_name can panic
        log_info!(
            "[create_where_statements_for_patch] Looking up predicate schema for name={}",
            pred_name
        );
        let pred_schema = find_pred_schema_by_name(&pred_name, &current_subj_schema);
        log_info!(
            "[create_where_statements_for_patch] Found predicate schema: iri={}, is_object={}, is_multi={}",
            pred_schema.iri,
            pred_schema.is_object(),
            pred_schema.is_multi()
        );

        // Case: We arrived at a leaf value.
        if path.len() == 0 {
            log_info!(
                "[create_where_statements_for_patch] Reached leaf value. Returning target: subject_ref={}, predicate={}",
                subject_ref,
                pred_schema.iri
            );
            return (
                where_statements,
                (subject_ref, pred_schema.iri.clone(), None),
                Some(pred_schema),
            );
        }

        // Else, we have a nested object.

        where_statements.push(format!(
            "{} <{}> ?o{}",
            subject_ref, pred_schema.iri, var_counter,
        ));
        log_info!(
            "[create_where_statements_for_patch] Added where statement for nested object: {} <{}> ?o{}",
            subject_ref,
            pred_schema.iri,
            var_counter
        );

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
            log_info!("[create_where_statements_for_patch] Predicate is multi-valued, expecting object IRI in path");
            let object_iri = path.remove(0);
            log_info!(
                "[create_where_statements_for_patch] Got object_iri={}, remaining path={}",
                object_iri,
                path.len()
            );
            // Path ends on an object IRI, which we return here as well.
            if path.len() == 0 {
                log_info!(
                    "[create_where_statements_for_patch] Path ends on object IRI. Returning target with object={}",
                    object_iri
                );
                return (
                    where_statements,
                    (subject_ref, pred_schema.iri.clone(), Some(object_iri)),
                    Some(pred_schema),
                );
            }

            // POTENTIAL PANIC SOURCE: get_first_child_schema can panic
            log_info!(
                "[create_where_statements_for_patch] Getting child schema for object_iri={}",
                object_iri
            );
            current_subj_schema =
                get_first_child_schema(Some(&object_iri), &pred_schema, &orm_subscription);
            log_info!("[create_where_statements_for_patch] Child schema found");

            // Since we have new IRI that we can use as root, we replace the current one with it.
            subject_ref = format!("<{object_iri}>");
            // And can clear all, now unnecessary where statements.
            where_statements.clear();
            log_info!(
                "[create_where_statements_for_patch] Reset subject_ref to <{}> and cleared where statements",
                object_iri
            );
        } else {
            // Set to child subject schema.
            // TODO: Actually, we should get the tracked subject and check for the correct shape there.
            // As long as there is only one allowed shape or the first one is valid, this is fine.
            log_info!("[create_where_statements_for_patch] Predicate is single-valued, getting child schema");

            // POTENTIAL PANIC SOURCE: get_first_child_schema can panic
            current_subj_schema = get_first_child_schema(None, &pred_schema, &orm_subscription);
            log_info!("[create_where_statements_for_patch] Child schema found");
        }
    }
    // Can't happen.
    log_err!("[create_where_statements_for_patch] PANIC: Reached end of function unexpectedly (should be impossible)");
    panic!();
}

/// Get the schema for a given subject and predicate schema.
/// It will return the first schema of which the tracked subject is valid.
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

        let tracked_subject_opt = subject_iri
            .and_then(|iri| orm_subscription.tracked_subjects.get(iri))
            .and_then(|ts_shapes| ts_shapes.get(schema_shape));

        if let Some(tracked_subject) = tracked_subject_opt {
            // The subject is already being tracked (it's not new).
            if tracked_subject.read().unwrap().valid == OrmTrackedSubjectValidity::Valid {
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
