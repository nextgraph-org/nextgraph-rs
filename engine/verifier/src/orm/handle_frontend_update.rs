// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use ng_net::orm::{OrmDiffOp, OrmDiffOpType, OrmDiffType, OrmSchemaPredicate, OrmSchemaShape};
use ng_oxigraph::oxrdf::Quad;
use ng_repo::errors::VerifierError;

use std::cmp::Ordering;
use std::fmt::format;
use std::sync::{Arc, RwLock};
use std::u64;

use futures::SinkExt;
use ng_net::app_protocol::*;
pub use ng_net::orm::{OrmDiff, OrmShapeType};
use ng_repo::log::*;

use crate::orm::types::*;
use crate::orm::utils::{decode_json_pointer, json_to_sparql_val};
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
        skolemnized_blank_nodes: Vec<Quad>,
        revert_inserts: Vec<Quad>,
        revert_removes: Vec<Quad>,
    ) -> Result<(), VerifierError> {
        let (mut sender, orm_subscription) =
            self.get_first_orm_subscription_sender_for(scope, Some(&shape_iri), Some(&session_id))?;

        // TODO prepare OrmUpdateBlankNodeIds with skolemnized_blank_nodes
        // use orm_subscription if needed
        // note(niko): I think skolemnized blank nodes can still be many, in case of multi-level nested sub-objects.
        let orm_bnids = vec![];
        let _ = sender
            .send(AppResponse::V0(AppResponseV0::OrmUpdateBlankNodeIds(
                orm_bnids,
            )))
            .await;

        // TODO (later) revert the inserts and removes
        // let orm_diff = vec![];
        // let _ = sender.send(AppResponse::V0(AppResponseV0::OrmUpdate(orm_diff))).await;

        Ok(())
    }

    /// Handles updates coming from JS-land (JSON patches).
    pub(crate) async fn orm_frontend_update(
        &mut self,
        session_id: u64,
        scope: &NuriV0,
        shape_iri: ShapeIri,
        diff: OrmDiff,
    ) -> Result<(), String> {
        log_info!(
            "frontend_update_orm session={} scope={:?} shape={} diff={:?}",
            session_id,
            scope,
            shape_iri,
            diff
        );

        let (doc_nuri, sparql_update) = {
            let orm_subscription =
                self.get_first_orm_subscription_for(scope, Some(&shape_iri), Some(&session_id));
            let doc_nuri = orm_subscription.nuri.clone();

            let sparql_update = create_sparql_update_query_for_diff(orm_subscription, diff);

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
            Err(e) => Err(e),
            Ok((_, revert_inserts, revert_removes, skolemnized_blank_nodes)) => {
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
    diff: OrmDiff,
) -> String {
    // First sort patches.
    // - Process delete patches first.
    // - Process object creation add operations before rest, to ensure potential blank nodes are created.
    let mut delete_patches: Vec<_> = diff
        .iter()
        .filter(|patch| patch.op == OrmDiffOpType::remove)
        .collect();
    let mut add_patches: Vec<_> = diff
        .iter()
        .filter(|patch| patch.op == OrmDiffOpType::add)
        .collect();

    // Put Object creations first and...
    add_patches.sort_by(|patch1, patch2| match patch1.valType {
        Some(OrmDiffType::object) => Ordering::Less,
        _ => Ordering::Equal,
    });
    // ...shorter paths first
    add_patches.sort_by(|patch1, patch2| {
        patch1
            .path
            .split("/")
            .count()
            .cmp(&patch2.path.split("/").count())
    });

    // Use a counter to generate unique variable names.
    fn get_new_var_name(counter: &mut i32) -> String {
        let name = format!("v{}", counter);
        *counter += 1;
        name
    }

    // For each diff op, we create a separate INSERT or DELETE block.
    let sparql_sub_queries: Vec<String> = vec![];

    // Create delete statements.
    let delete_statements: Vec<String> = vec![]; // The parts in the Delete block.
    for del_patch in delete_patches.iter() {
        let mut var_counter: i32 = 0;

        let (where_statements, target) =
            create_where_statements_for_patch(&del_patch, &mut var_counter, &orm_subscription);
        let (subject_var, target_predicate, target_object) = target;

        let delete_statement;
        if let Some(target_object) = target_object {
            delete_statement = format!(
                "  {} <{}> <{}> .",
                subject_var, target_predicate, target_object
            )
        } else {
            let delete_val = match del_patch.value {
                None => {
                    let val = format!("?{}", var_counter);
                    var_counter += 1;
                    val
                }
                Some(val) => json_to_sparql_val(&val),
            };
            delete_statement = format!("  {} <{}> {} .", subject_var, target_predicate, delete_val)
        }

        sparql_sub_queries.push(format!(
            "DELETE DATA {{\n{}\nWHERE\n{{\n{}\n}}",
            delete_statement,
            where_statements.join("\n  ")
        ));
    }

    return "None";
}

fn get_tracked_subject_from_diff_op(
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
/// Returns the statements as Vec<String>
/// and the subject, predicate, Option<Object> of the path's ending (to be used for DELETE / DELETE).
fn create_where_statements_for_patch(
    patch: &OrmDiffOp,
    var_counter: &mut i32,
    orm_subscription: &OrmSubscription,
) -> (Vec<String>, (String, String, Option<String>)) {
    let mut body_statements: Vec<String> = vec![];
    let mut where_statements: Vec<String> = vec![];

    let mut path: Vec<String> = patch
        .path
        .split("/")
        .map(|s| decode_json_pointer(&s.to_string()))
        .collect();

    // Handle special case: The whole object is deleted.
    if path.len() == 0 {
        let mut root_iri = path.remove(0);
        body_statements.push(format!("<{}> ?p ?o .", root_iri));
        where_statements.push(format!("<{}> ?p ?o .", root_iri));
    }

    let mut subj_schema: &Arc<OrmSchemaShape> = orm_subscription
        .shape_type
        .schema
        .get(&orm_subscription.shape_type.shape)
        .unwrap();

    let mut current_subj_schema: Arc<OrmSchemaShape> = subj_schema.clone();

    // The root IRI might change, if the parent path segment was an IRI.
    let root_iri = path.remove(0);
    let mut subject_ref = format!("<{}>", root_iri);

    while path.len() > 0 {
        let pred_name = path.remove(0);
        let pred_schema = find_pred_schema_by_name(&pred_name, &current_subj_schema);

        where_statements.push(format!(
            "{} <{}> ?o{} .",
            subject_ref, pred_schema.iri, var_counter,
        ));
        subject_ref = format!("?o{}", var_counter);
        *var_counter = *var_counter + 1;

        if pred_schema.is_multi() && pred_schema.is_object() {
            let object_iri = path.remove(0);
            // Path ends on an object IRI, which we return here as well.
            if path.len() == 0 {
                return (
                    where_statements,
                    (subject_ref, pred_schema.iri.clone(), Some(object_iri)),
                );
            }

            current_subj_schema =
                get_first_valid_subject_schema(&object_iri, &pred_schema, &orm_subscription);

            // Since we have new IRI that we can use as root, we replace the current one with it.
            subject_ref = format!("<{object_iri}>");
            // And can clear all now unnecessary where statements.
            where_statements.clear();
        }

        if path.len() == 0 {
            return (
                where_statements,
                (subject_ref, pred_schema.iri.clone(), None),
            );
        }
    }
    // Can't happen.
    panic!();
}

fn get_first_valid_subject_schema(
    subject_iri: &String,
    pred_schema: &OrmSchemaPredicate,
    orm_subscription: &OrmSubscription,
) -> Arc<OrmSchemaShape> {
    for data_type in pred_schema.dataTypes.iter() {
        let Some(schema_shape) = data_type.shape.as_ref() else {
            continue;
        };

        let tracked_subject = orm_subscription
            .tracked_subjects
            .get(subject_iri)
            .unwrap()
            .get(schema_shape)
            .unwrap();

        if tracked_subject.read().unwrap().valid == OrmTrackedSubjectValidity::Valid {
            return orm_subscription
                .shape_type
                .schema
                .get(schema_shape)
                .unwrap()
                .clone();
        }
    }
    // TODO: Panicking might be too aggressive.
    panic!();
}
