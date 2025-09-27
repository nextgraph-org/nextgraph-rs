// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::collections::HashMap;

use futures::channel::mpsc;

use futures::SinkExt;
use lazy_static::lazy_static;
pub use ng_net::orm::OrmDiff;
pub use ng_net::orm::OrmShapeType;
use ng_net::orm::{OrmSchemaDataType, OrmSchemaShape};
use ng_net::orm::{OrmSchemaLiteralType, OrmSchemaLiterals};
use ng_net::{app_protocol::*, orm::OrmSchema};
use ng_net::{
    types::*,
    utils::{Receiver, Sender},
};
use ng_oxigraph::oxigraph::sparql::{results::*, Query, QueryResults};
use ng_oxigraph::oxrdf::Term;
use ng_oxigraph::oxrdf::Triple;
use ng_repo::errors::NgError;
use ng_repo::errors::VerifierError;
use ng_repo::log::*;
use regex::Regex;

use crate::types::*;
use crate::verifier::*;

impl Verifier {
    pub fn sparql_construct(
        &self,
        query: String,
        nuri: Option<String>,
    ) -> Result<Vec<Triple>, NgError> {
        let oxistore = self.graph_dataset.as_ref().unwrap();

        // let graph_nuri = NuriV0::repo_graph_name(
        //     &update.repo_id,
        //     &update.overlay_id,
        // );
        //let base = NuriV0::repo_id(&repo.id);

        let nuri_str = nuri.as_ref().map(|s| s.as_str());

        let parsed =
            Query::parse(&query, nuri_str).map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        let results = oxistore
            .query(parsed, nuri)
            .map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        match results {
            QueryResults::Graph(triples) => {
                let mut results = vec![];
                for t in triples {
                    match t {
                        Err(e) => {
                            log_err!("{}", e.to_string());
                            return Err(NgError::SparqlError(e.to_string()));
                        }
                        Ok(triple) => results.push(triple),
                    }
                }
                Ok(results)
            }
            _ => return Err(NgError::InvalidResponse),
        }
    }

    pub fn sparql_select(
        &self,
        query: String,
        nuri: Option<String>,
    ) -> Result<Vec<Vec<Option<Term>>>, NgError> {
        let oxistore = self.graph_dataset.as_ref().unwrap();

        // let graph_nuri = NuriV0::repo_graph_name(
        //     &update.repo_id,
        //     &update.overlay_id,
        // );

        //let base = NuriV0::repo_id(&repo.id);
        let nuri_str = nuri.as_ref().map(|s| s.as_str());

        let parsed =
            Query::parse(&query, nuri_str).map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        let results = oxistore
            .query(parsed, None)
            .map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        let sols = match results {
            QueryResults::Solutions(sols) => {
                let mut results = vec![];
                for t in sols {
                    match t {
                        Err(e) => {
                            log_err!("{}", e.to_string());
                            return Err(NgError::SparqlError(e.to_string()));
                        }
                        Ok(querysol) => results.push(querysol.values().to_vec()),
                    }
                }
                Ok(results)
            }
            _ => return Err(NgError::InvalidResponse),
        };
        sols
    }

    fn create_orm_from_triples(&mut self, scope: &NuriV0, shape_type: &OrmShapeType) {}

    pub(crate) async fn orm_update(&mut self, scope: &NuriV0, patch: GraphQuadsPatch) {}

    pub(crate) async fn orm_frontend_update(
        &mut self,
        scope: &NuriV0,
        shape_id: String,
        diff: OrmDiff,
    ) {
        log_info!("frontend_update_orm {:?} {} {:?}", scope, shape_id, diff);
    }

    pub(crate) async fn push_orm_response(
        &mut self,
        scope: &NuriV0,
        schema_iri: &String,
        response: AppResponse,
    ) {
        log_info!(
            "push_orm_response {:?} {} {:?}",
            scope,
            schema_iri,
            self.orm_subscriptions
        );
        if let Some(shapes) = self.orm_subscriptions.get_mut(scope) {
            if let Some(sessions) = shapes.get_mut(schema_iri) {
                let mut sessions_to_close: Vec<u64> = vec![];
                for (session_id, sender) in sessions.iter_mut() {
                    if sender.is_closed() {
                        log_debug!("closed so removing session {}", session_id);
                        sessions_to_close.push(*session_id);
                    } else {
                        let _ = sender.send(response.clone()).await;
                    }
                }
                for session_id in sessions_to_close.iter() {
                    sessions.remove(session_id);
                }
            }
        }
    }

    pub(crate) async fn start_orm(
        &mut self,
        nuri: &NuriV0,
        shape_type: &OrmShapeType,
        session_id: u64,
    ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
        let (tx, rx) = mpsc::unbounded::<AppResponse>();

        self.orm_subscriptions.insert(
            nuri.clone(),
            HashMap::from([(
                shape_type.shape.clone(),
                HashMap::from([(session_id, tx.clone())]),
            )]),
        );

        //self.push_orm_response().await; (only for requester, not all sessions)

        let close = Box::new(move || {
            //log_debug!("CLOSE_CHANNEL of subscription for branch {}", branch_id);
            if !tx.is_closed() {
                tx.close_channel();
            }
        });
        Ok((rx, close))
    }
}

fn is_iri(s: &str) -> bool {
    lazy_static! {
        static ref IRI_REGEX: Regex = Regex::new(r"^[A-Za-z][A-Za-z0-9+\.\-]{1,12}:").unwrap();
    }
    IRI_REGEX.is_match(s)
}

fn literal_to_sparql_str(var: OrmSchemaDataType) -> Vec<String> {
    match var.literals {
        None => [].to_vec(),
        Some(literals) => match literals {
            OrmSchemaLiterals::Bool(val) => {
                if val == true {
                    ["true".to_string()].to_vec()
                } else {
                    ["false".to_string()].to_vec()
                }
            }
            OrmSchemaLiterals::NumArray(numbers) => {
                numbers.iter().map(|num| num.to_string()).collect()
            }
            OrmSchemaLiterals::StrArray(stings) => stings
                .iter()
                .map(|str| {
                    // We assume that strings can be IRIs (currently no support for typed literals).
                    if is_iri(str) {
                        format!("<{}>", escape_iri(str))
                    } else {
                        format!("\"{}\"", escape_literal(str))
                    }
                })
                .collect(),
        },
    }
}

pub fn sparql_construct_from_orm_shape_type(
    shape_type: &OrmShapeType,
    max_recursion: Option<u8>,
) -> Result<String, NgError> {
    // Use a counter to generate unique variable names.
    let mut var_counter = 0;
    fn get_new_var_name(counter: &mut i32) -> String {
        let name = format!("v{}", counter);
        *counter += 1;
        name
    }

    // Collect all statements to be added to the construct and where bodies.
    let mut construct_statements = Vec::new();
    let mut where_statements = Vec::new();

    // Keep track of visited shapes while recursing to prevent infinite loops.
    // TODO: Update type
    let mut visited_shapes: HashMap<String, u8> = HashMap::new();

    // Recursive function to call for (nested) shapes.
    fn process_shape(
        schema: &OrmSchema,
        shape: &OrmSchemaShape,
        subject_var_name: &str,
        construct_statements: &mut Vec<String>,
        where_statements: &mut Vec<String>,
        var_counter: &mut i32,
        visited_shapes: &mut HashMap<String, u8>,
        max_recursion: u8,
    ) {
        // Prevent infinite recursion on cyclic schemas.
        // Keep track of the number of shape occurrences and return if it's larger than max_recursion.
        // For the last recursion, we could use by-reference queries but that could be for the future.
        let current_self_recursion_depth = visited_shapes.get(&shape.iri).unwrap_or(&0);
        if *current_self_recursion_depth > max_recursion {
            return;
        } else {
            visited_shapes.insert(shape.iri.clone(), current_self_recursion_depth + 1);
        }

        // Add statements for each predicate.
        for predicate in &shape.predicates {
            let mut union_branches = Vec::new();
            let mut allowed_literals = Vec::new();

            // Predicate constraints might have more than one acceptable data type. Traverse each.
            // It is assumed that constant literals, nested shapes and regular types are not mixed.
            for datatype in &predicate.dataTypes {
                if datatype.valType == OrmSchemaLiteralType::literal {
                    // Collect allowed literals and as strings
                    // (already in SPARQL-format, e.g. `"a astring"`, `<http:ex.co/>`, `true`, or `42`).
                    allowed_literals.extend(literal_to_sparql_str(datatype.clone()));
                } else if datatype.valType == OrmSchemaLiteralType::shape {
                    if let Some(shape_id) = &datatype.shape {
                        if let Some(nested_shape) = schema.get(shape_id) {
                            // For the current acceptable shape, add CONSTRUCT, WHERE, and recurse.

                            // Each shape option gets its own var.
                            let obj_var_name = get_new_var_name(var_counter);

                            construct_statements.push(format!(
                                "  ?{} <{}> ?{}",
                                subject_var_name, predicate.iri, obj_var_name
                            ));
                            // Those are later added to a UNION, if there is more than one shape.
                            union_branches.push(format!(
                                "  ?{} <{}> ?{}",
                                subject_var_name, predicate.iri, obj_var_name
                            ));

                            // Recurse to add statements for nested object.
                            process_shape(
                                schema,
                                nested_shape,
                                &obj_var_name,
                                construct_statements,
                                where_statements,
                                var_counter,
                                visited_shapes,
                                max_recursion,
                            );
                        }
                    }
                }
            }

            // The where statement which might be wrapped in OPTIONAL.
            let where_body: String;

            if !allowed_literals.is_empty()
                && !predicate.extra.unwrap_or(false)
                && predicate.minCardinality > 0
            {
                // If we have literal requirements and they are not optional ("extra"),
                // Add CONSTRUCT, WHERE, and FILTER.

                let pred_var_name = get_new_var_name(var_counter);
                construct_statements.push(format!(
                    "  ?{} <{}> ?{}",
                    subject_var_name, predicate.iri, pred_var_name
                ));
                where_body = format!(
                    "  ?{s} <{p}> ?{o} . \n    FILTER (?{o} IN ({lits}))",
                    s = subject_var_name,
                    p = predicate.iri,
                    o = pred_var_name,
                    lits = allowed_literals.join(", ")
                );
            } else if !union_branches.is_empty() {
                // We have nested shape(s) which were already added to CONSTRUCT above.
                // Join them with UNION.

                where_body = union_branches
                    .into_iter()
                    .map(|b| format!("{{\n{}\n}}", b))
                    .collect::<Vec<_>>()
                    .join(" UNION ");
            } else {
                // Regular predicate data type. Just add basic CONSTRUCT and WHERE statements.

                let pred_var_name = get_new_var_name(var_counter);
                construct_statements.push(format!(
                    "  ?{} <{}> ?{}",
                    subject_var_name, predicate.iri, pred_var_name
                ));
                where_body = format!(
                    "  ?{} <{}> ?{}",
                    subject_var_name, predicate.iri, pred_var_name
                );
            }

            // Wrap in optional, if necessary.
            if predicate.minCardinality < 1 {
                where_statements.push(format!("  OPTIONAL {{\n{}\n  }}", where_body));
            } else {
                where_statements.push(where_body);
            };
        }

        visited_shapes.remove(&shape.iri);
    }

    let root_shape = shape_type
        .schema
        .get(&shape_type.shape)
        .ok_or(VerifierError::InvalidOrmSchema)?;

    // Root subject variable name
    let root_var_name = get_new_var_name(&mut var_counter);

    process_shape(
        &shape_type.schema,
        root_shape,
        &root_var_name,
        &mut construct_statements,
        &mut where_statements,
        &mut var_counter,
        &mut visited_shapes,
        max_recursion.unwrap_or(1),
    );

    // Create query from statements.
    let construct_body = construct_statements.join(" .\n");
    let where_body = where_statements.join(" .\n");
    Ok(format!(
        "CONSTRUCT {{\n{}\n}}\nWHERE {{\n{}\n}}",
        construct_body, where_body
    ))
}

// Escape an IRI fragment if needed (very conservative, only wrap with <...>). Assumes input already a full IRI.
fn escape_iri(iri: &str) -> String {
    format!("<{}>", iri)
}

// SPARQL literal escape: backslash, quotes, newlines, tabs.
fn escape_literal(lit: &str) -> String {
    let mut out = String::with_capacity(lit.len() + 4);
    for c in lit.chars() {
        match c {
            '\\' => out.push_str("\\\\"),
            '\"' => out.push_str("\\\""),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            _ => out.push(c),
        }
    }
    return out;
}
