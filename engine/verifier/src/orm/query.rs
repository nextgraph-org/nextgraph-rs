// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use ng_repo::errors::VerifierError;

use std::collections::HashSet;

pub use ng_net::orm::{OrmPatches, OrmShapeType};

use crate::orm::types::*;
use crate::orm::utils::{escape_literal, is_iri};
use crate::verifier::*;
use ng_net::orm::*;
use ng_oxigraph::oxigraph::sparql::{Query, QueryResults};
use ng_oxigraph::oxrdf::Triple;
use ng_repo::errors::NgError;
use ng_repo::log::*;

impl Verifier {
    pub fn query_sparql_construct(
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
        log_debug!("querying construct\n{}\n{}\n", nuri_str.unwrap(), query);

        let parsed =
            Query::parse(&query, nuri_str).map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        let results = oxistore
            .query(parsed, nuri)
            .map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        match results {
            QueryResults::Graph(triples) => {
                let mut result_triples: Vec<Triple> = vec![];
                for t in triples {
                    match t {
                        Err(e) => {
                            log_err!("{}", e.to_string());
                            return Err(NgError::SparqlError(e.to_string()));
                        }
                        Ok(triple) => {
                            log_debug!("Triple fetched: {:?}", triple);
                            result_triples.push(triple);
                        }
                    }
                }
                Ok(result_triples)
            }
            _ => return Err(NgError::InvalidResponse),
        }
    }
}

pub fn literal_to_sparql_str(var: OrmSchemaDataType) -> Vec<String> {
    match var.literals {
        None => [].to_vec(),
        Some(literals) => literals
            .iter()
            .map(|literal| match literal {
                BasicType::Bool(val) => {
                    if *val {
                        "true".to_string()
                    } else {
                        "false".to_string()
                    }
                }
                BasicType::Num(number) => number.to_string(),
                BasicType::Str(sting) => {
                    if is_iri(sting) {
                        format!("<{}>", sting)
                    } else {
                        format!("\"{}\"", escape_literal(sting))
                    }
                }
            })
            .collect(),
    }
}

pub fn shape_type_to_sparql(
    schema: &OrmSchema,
    shape: &ShapeIri,
    filter_subjects: Option<Vec<String>>,
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
    let mut visited_shapes: HashSet<ShapeIri> = HashSet::new();

    // Recursive function to call for (nested) shapes.
    // Returns nested WHERE statements that should be included with this shape's binding.
    fn process_shape(
        schema: &OrmSchema,
        shape: &OrmSchemaShape,
        subject_var_name: &str,
        construct_statements: &mut Vec<String>,
        where_statements: &mut Vec<String>,
        var_counter: &mut i32,
        visited_shapes: &mut HashSet<String>,
        in_recursion: bool,
    ) -> Vec<String> {
        // Prevent infinite recursion on cyclic schemas.
        // TODO: We could handle this as IRI string reference.
        if visited_shapes.contains(&shape.iri) {
            return vec![];
        }

        let mut new_where_statements: Vec<String> = vec![];
        let mut new_construct_statements: Vec<String> = vec![];

        visited_shapes.insert(shape.iri.clone());

        // Add statements for each predicate.
        // If we are in recursion, we want to get all triples.
        // That's why we add a "<subject> ?p ?o" statement afterwards
        // and the extra construct statements are skipped.
        for predicate in &shape.predicates {
            let mut union_branches = Vec::new();
            let mut nested_where_statements = Vec::new();

            // Predicate constraints might have more than one acceptable nested shape. Traverse each.
            for datatype in &predicate.dataTypes {
                if datatype.valType == OrmSchemaValType::shape {
                    let shape_iri = &datatype.shape.clone().unwrap();
                    let nested_shape = schema.get(shape_iri).unwrap();

                    // For the current acceptable shape, add CONSTRUCT, WHERE, and recurse.

                    // Each shape option gets its own var.
                    let obj_var_name = get_new_var_name(var_counter);

                    if !in_recursion {
                        new_construct_statements.push(format!(
                            "  ?{} <{}> ?{}",
                            subject_var_name, predicate.iri, obj_var_name
                        ));
                    }
                    // Those are later added to a UNION, if there is more than one shape.
                    union_branches.push(format!(
                        "  ?{} <{}> ?{}",
                        subject_var_name, predicate.iri, obj_var_name
                    ));

                    // Recurse to add statements for nested object.
                    // Collect nested WHERE statements to include within this predicate's scope.
                    let nested_stmts = process_shape(
                        schema,
                        nested_shape,
                        &obj_var_name,
                        construct_statements,
                        where_statements,
                        var_counter,
                        visited_shapes,
                        true,
                    );
                    nested_where_statements.extend(nested_stmts);
                }
            }

            // The where statement (which may be wrapped in OPTIONAL).
            let where_body: String;

            if !union_branches.is_empty() {
                // We have nested shape(s) which were already added to CONSTRUCT above.
                // Join them with UNION and include nested WHERE statements.

                let union_body = union_branches
                    .into_iter()
                    .map(|b| format!("{{\n{}\n}}", b))
                    .collect::<Vec<_>>()
                    .join(" UNION ");

                // Combine the parent binding with nested statements
                if !nested_where_statements.is_empty() {
                    let nested_joined = nested_where_statements.join(" .\n");
                    where_body = format!("{} .\n{}", union_body, nested_joined);
                } else {
                    where_body = union_body;
                }
            } else {
                // Regular predicate data type. Just add basic CONSTRUCT and WHERE statements.

                let obj_var_name = get_new_var_name(var_counter);
                if !in_recursion {
                    // Only add construct, if we don't have catch-all statement already.
                    new_construct_statements.push(format!(
                        "  ?{} <{}> ?{}",
                        subject_var_name, predicate.iri, obj_var_name
                    ));
                }
                where_body = format!(
                    "  ?{} <{}> ?{}",
                    subject_var_name, predicate.iri, obj_var_name
                );
            }

            // Wrap in optional, if predicate is optional
            if predicate.minCardinality < 1 {
                new_where_statements.push(format!("  OPTIONAL {{\n{}\n  }}", where_body));
            } else {
                new_where_statements.push(where_body);
            };
        }

        if in_recursion {
            // All statements in recursive objects need to be optional
            // because we want to fetch _all_ nested objects,
            // invalid ones too, for later validation.
            let pred_var_name = get_new_var_name(var_counter);
            let obj_var_name = get_new_var_name(var_counter);

            // The "catch any triple in subject" construct statement
            construct_statements.push(format!(
                "  ?{} ?{} ?{}",
                subject_var_name, pred_var_name, obj_var_name
            ));

            let joined_where_statements = new_where_statements.join(" .\n");

            // Return nested statements to be included in parent's scope
            // Combine catch-all with specific predicates in a UNION
            let nested_block = format!(
                "  {{\n    {{?{} ?{} ?{}}}\n    UNION {{\n    {}\n    }}\n  }}",
                subject_var_name, pred_var_name, obj_var_name, joined_where_statements
            );
            visited_shapes.remove(&shape.iri);
            return vec![nested_block];
        } else {
            where_statements.append(&mut new_where_statements);
            construct_statements.append(&mut new_construct_statements);
        }
        visited_shapes.remove(&shape.iri);
        vec![]
    }

    let root_shape = schema.get(shape).ok_or(VerifierError::InvalidOrmSchema)?;

    // Root subject variable name
    let root_var_name = get_new_var_name(&mut var_counter);

    process_shape(
        schema,
        root_shape,
        &root_var_name,
        &mut construct_statements,
        &mut where_statements,
        &mut var_counter,
        &mut visited_shapes,
        false,
    );

    // Filter subjects, if present.
    if let Some(subjects) = filter_subjects {
        // log_debug!("filter_subjects: {:?}", subjects);
        let subjects_str = subjects
            .iter()
            .map(|s| format!("<{}>", s))
            .collect::<Vec<_>>()
            .join(", ");
        where_statements.push(format!("    FILTER(?v0 IN ({}))", subjects_str));
    }

    // Create query from statements.
    let construct_body = construct_statements.join(" .\n");

    let where_body = where_statements.join(" .\n");

    Ok(format!(
        "CONSTRUCT {{\n{}\n}}\nWHERE {{\n{}\n}}",
        construct_body, where_body
    ))
}
