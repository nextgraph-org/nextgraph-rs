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
use ng_oxigraph::oxrdf::{NamedNode, Triple};
use ng_repo::errors::NgError;
use ng_repo::log::*;

impl Verifier {
    pub fn query_quads_for_shape_type(
        &self,
        nuri: Option<String>,
        schema: &OrmSchema,
        shape: &ShapeIri,
        filter_subjects: Option<Vec<String>>,
    ) -> Result<Vec<Triple>, NgError> {
        // If nuri is present and it is not the whole graph (did:ng:i), use limit_to_graph.
        let limit_to_graph = match nuri {
            Some(nuri) => {
                if nuri == "did:ng:i" {
                    None
                } else {
                    Some(nuri)
                }
            }
            None => None,
        };

        let select_query =
            shape_type_to_sparql_select(schema, shape, filter_subjects, limit_to_graph)?;

        return self.query_sparql_select(select_query, None);
    }

    pub fn query_sparql_select(
        &self,
        query: String,
        nuri: Option<String>,
    ) -> Result<Vec<Triple>, NgError> {
        let oxistore = self.graph_dataset.as_ref().unwrap();

        // Log base IRI safely even when None
        let nuri_dbg = nuri.as_deref().unwrap_or("");
        log_debug!("querying select\n{}\n{}\n", nuri_dbg, query);

        let parsed = Query::parse(&query, nuri.as_deref())
            .map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        let results = oxistore
            .query(parsed, nuri)
            .map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        match results {
            QueryResults::Solutions(solutions) => {
                let mut result_triples: HashSet<Triple> = HashSet::new();
                for s in solutions {
                    match s {
                        Err(e) => {
                            log_err!("{}", e.to_string());
                            return Err(NgError::SparqlError(e.to_string()));
                        }
                        Ok(solution) => {
                            let s = solution.get("s").unwrap();
                            let p = solution.get("p").unwrap();
                            let o = solution.get("o").unwrap();
                            // let g = solution.get("g"); // Optional
                            let triple = Triple {
                                subject: match s {
                                    ng_oxigraph::oxrdf::Term::NamedNode(n) => {
                                        ng_oxigraph::oxrdf::Subject::NamedNode(n.clone())
                                    }
                                    _ => panic!("Expected NamedNode for subject"),
                                },
                                predicate: match p {
                                    ng_oxigraph::oxrdf::Term::NamedNode(n) => n.clone(),
                                    _ => panic!(),
                                },
                                object: o.clone(),
                            };
                            log_debug!("triple fetched: {:?}", triple);
                            result_triples.insert(triple);
                        }
                    }
                }
                Ok(Vec::from_iter(result_triples))
            }
            _ => return Err(NgError::InvalidResponse),
        }
    }

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

pub fn shape_type_to_sparql_construct(
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

pub fn shape_type_to_sparql_select(
    schema: &OrmSchema,
    shape: &ShapeIri,
    filter_subjects: Option<Vec<String>>,
    limit_to_graph: Option<String>,
) -> Result<String, NgError> {
    // NOTE FOR MAINTAINERS
    // This function generates a SELECT query that mirrors the WHERE semantics of
    // `shape_type_to_sparql_construct`, but instead of returning a graph it projects
    // triples as rows binding the following variables:
    // - ?s: subject
    // - ?p: predicate
    // - ?o: object
    // - ?g: graph name (bound per recursion "layer")
    //
    // Key ideas:
    // - Each shape layer is wrapped in a GRAPH block with its own graph variable (?gN).
    //   We attribute triples to the layer in which they logically belong by binding ?g
    //   to that layer’s graph variable when projecting rows.
    // - We preserve OPTIONAL, UNION, and the recursive catch-all pattern from the
    //   CONSTRUCT builder so that validation logic downstream sees the same data surface.
    // - We generate two kinds of WHERE content:
    //   1) Constraint blocks per layer (GRAPH ?gN { ... }) that ensure the shape matches.
    //   2) Projection branches (a UNION of small blocks) that BIND ?s/?p/?o/?g for each
    //      triple to return. This keeps the constraints readable and separates them from
    //      the output mapping.
    //
    // Variable conventions:
    // - Term vars:  ?v0, ?v1, ... (opaque; used for intermediate subjects/objects)
    // - Graph vars: ?g0, ?g1, ... (one per recursion layer, used to bind ?g)
    //
    // Recursion and cycles:
    // - We track visited shapes by IRI to avoid infinite recursion on cyclic schemas.
    // - Nested shapes get their own graph var (?gX). We also add a "catch-all" branch
    //   within that nested layer so that all triples for the nested subject are returned
    //   for later validation (even if some predicates are optional or missing).
    //
    // Readability:
    // - The generated SPARQL includes comments that "guide through" the query structure
    //   to make manual inspection and debugging easier.

    // Use a counter to generate unique variable names.
    let mut var_counter = 0;
    fn get_new_var_name(counter: &mut i32) -> String {
        let name = format!("v{}", counter);
        *counter += 1;
        name
    }
    fn get_new_graph_var_name(counter: &mut i32) -> String {
        let name = format!("g{}", counter);
        *counter += 1;
        name
    }
    // Small helper to indent multi-line strings by n spaces for cleaner output.
    fn indent(s: &str, n: usize) -> String {
        let pad = " ".repeat(n);
        s.lines()
            .map(|l| format!("{}{}", pad, l))
            .collect::<Vec<_>>()
            .join("\n")
    }

    // no-op: graph token computed within process_shape where needed

    // Collect SELECT branches (each produces bindings for ?s ?p ?o ?g) and shared WHERE constraints.
    let mut select_branches: Vec<String> = Vec::new();
    let mut where_statements: Vec<String> = Vec::new();

    // Keep track of visited shapes while recursing to prevent infinite loops.
    let mut visited_shapes: HashSet<ShapeIri> = HashSet::new();

    // Recursive function to build constraints and output branches per shape layer.
    // Returns nested WHERE blocks (already wrapped in appropriate GRAPH clauses) to be included at the parent scope.
    fn process_shape(
        schema: &OrmSchema,
        shape: &OrmSchemaShape,
        subject_var_name: &str,
        current_graph_var_name: &str,
        // If this shape is reached via a parent predicate, we pass the link to bind nested subject even when optional
        link_from_parent: Option<(
            &str, /* parent subj var */
            &str, /* predicate IRI */
            &str, /* parent graph var */
            &str, /* this subj var */
        )>,
        select_branches: &mut Vec<String>,
        where_statements: &mut Vec<String>,
        var_counter: &mut i32,
        visited_shapes: &mut HashSet<String>,
        in_recursion: bool,
        limit_to_graph: Option<&str>,
    ) -> Vec<String> {
        // Helper to render a graph token: either a variable (?gN) or a fixed graph IRI <...>
        let graph_token = |graph_var: &str| -> String {
            if let Some(g) = limit_to_graph {
                format!("<{}>", g)
            } else {
                format!("?{}", graph_var)
            }
        };
        // Prevent infinite recursion on cyclic schemas.
        // TODO: We could handle this as IRI string reference.
        if visited_shapes.contains(&shape.iri) {
            return vec![];
        }

        let mut new_where_statements: Vec<String> = vec![];

        visited_shapes.insert(shape.iri.clone());

        // Add statements for each predicate of the current shape layer.
        for predicate in &shape.predicates {
            let mut union_triples: Vec<String> = Vec::new();
            let mut nested_where_blocks: Vec<String> = Vec::new();

            // Traverse acceptable nested shapes, if any.
            for datatype in &predicate.dataTypes {
                if datatype.valType == OrmSchemaValType::shape {
                    let shape_iri = &datatype.shape.clone().unwrap();
                    let nested_shape = schema.get(shape_iri).unwrap();

                    // Var for object at this branch
                    let obj_var_name = get_new_var_name(var_counter);

                    // This triple binds the nested subject for this branch (in current layer's graph)
                    let triple = format!(
                        "  ?{} <{}> ?{}",
                        subject_var_name, predicate.iri, obj_var_name
                    );
                    union_triples.push(triple.clone());

                    // Output branch for the parent link triple itself (belongs to current layer) when not in recursive catch-all
                    if !in_recursion {
                        let branch = format!(
                            "  # Output: parent link triple at layer graph {}\n  GRAPH {} {{\n{}\n  }}\n  # Bind row variables\n  BIND(?{} AS ?s)\n  BIND(<{}> AS ?p)\n  BIND(?{} AS ?o)\n  BIND({} AS ?g)",
                            graph_token(current_graph_var_name).as_str(),
                            graph_token(current_graph_var_name).as_str(),
                            triple,
                            subject_var_name,
                            predicate.iri,
                            obj_var_name,
                            graph_token(current_graph_var_name).as_str()
                        );
                        select_branches.push(format!("{{\n{}\n}}", branch));
                    }

                    // Recurse for nested shape: it has its own graph layer
                    let nested_graph_var = get_new_graph_var_name(var_counter);
                    let nested_blocks = process_shape(
                        schema,
                        nested_shape,
                        &obj_var_name,
                        &nested_graph_var,
                        Some((
                            subject_var_name,
                            &predicate.iri,
                            current_graph_var_name,
                            &obj_var_name,
                        )),
                        select_branches,
                        where_statements,
                        var_counter,
                        visited_shapes,
                        true,
                        limit_to_graph,
                    );
                    nested_where_blocks.extend(nested_blocks);
                }
            }

            // Build the WHERE part for this predicate in the current layer
            let where_body: String;
            if !union_triples.is_empty() {
                let union_body = union_triples
                    .iter()
                    .map(|b| format!("{{\n{}\n}}", b))
                    .collect::<Vec<_>>()
                    .join(" UNION ");

                if !nested_where_blocks.is_empty() {
                    let nested_joined = nested_where_blocks.join(" .\n");
                    where_body = format!(
                        "# Predicate <{}> with nested shapes in shape <{}>\n{} .\n{}",
                        predicate.iri, shape.iri, union_body, nested_joined
                    );
                } else {
                    where_body = format!(
                        "# Predicate <{}> in shape <{}>\n{}",
                        predicate.iri, shape.iri, union_body
                    );
                }
            } else {
                // Value predicate (non-shape)
                let obj_var_name = get_new_var_name(var_counter);
                let triple = format!(
                    "  ?{} <{}> ?{}",
                    subject_var_name, predicate.iri, obj_var_name
                );
                where_body = format!(
                    "# Value predicate <{}> in shape <{}>\n{}",
                    predicate.iri, shape.iri, triple
                );

                // Output branch for this value triple in current graph layer
                if !in_recursion {
                    let branch = format!(
                        "  # Output: value triple at layer graph {}\n  GRAPH {} {{\n{}\n  }}\n  # Bind row variables\n  BIND(?{} AS ?s)\n  BIND(<{}> AS ?p)\n  BIND(?{} AS ?o)\n  BIND({} AS ?g)",
                        graph_token(current_graph_var_name).as_str(),
                        graph_token(current_graph_var_name).as_str(),
                        triple,
                        subject_var_name,
                        predicate.iri,
                        obj_var_name,
                        graph_token(current_graph_var_name).as_str()
                    );
                    select_branches.push(format!("{{\n{}\n}}", branch));
                }
            }

            // Optional wrapper, if needed
            if predicate.minCardinality < 1 {
                new_where_statements.push(format!(
                    "  # OPTIONAL predicate <{}>\n  OPTIONAL {{\n{}\n  }}",
                    predicate.iri, where_body
                ));
            } else {
                new_where_statements.push(where_body);
            }
        }

        if in_recursion {
            // In recursion, add a catch-all triple for this nested subject within its graph layer
            let pred_var_name = get_new_var_name(var_counter);
            let obj_var_name = get_new_var_name(var_counter);
            let catch_all = format!(
                "  ?{} ?{} ?{}",
                subject_var_name, pred_var_name, obj_var_name
            );

            // Output branch for nested triples: include the parent link triple to bind nested subject even when optional
            if let Some((parent_subj, parent_pred, parent_graph, this_subj)) = link_from_parent {
                let parent_link = format!(
                    "  # Bind nested subject via parent link (optional-safe)\n  GRAPH {} {{\n    ?{} <{}> ?{}\n  }}",
                    graph_token(parent_graph).as_str(),
                    parent_subj,
                    parent_pred,
                    this_subj
                );
                let nested_graph_block = format!(
                    "  # Nested layer catch-all in graph {}\n  GRAPH {} {{\n{}\n  }}",
                    graph_token(current_graph_var_name).as_str(),
                    graph_token(current_graph_var_name).as_str(),
                    catch_all
                );
                let branch = format!(
                    "{}\n{}\n  # Bind row variables\n  BIND(?{} AS ?s)\n  BIND(?{} AS ?p)\n  BIND(?{} AS ?o)\n  BIND({} AS ?g)",
                    parent_link,
                    nested_graph_block,
                    subject_var_name,
                    pred_var_name,
                    obj_var_name,
                    graph_token(current_graph_var_name).as_str()
                );
                select_branches.push(format!("{{\n{}\n}}", branch));
            } else {
                // Fallback: no explicit parent link (shouldn't happen for nested shapes), still output within graph
                let branch = format!(
                    "  # Nested layer catch-all in graph {}\n  GRAPH {} {{\n{}\n  }}\n  # Bind row variables\n  BIND(?{} AS ?s)\n  BIND(?{} AS ?p)\n  BIND(?{} AS ?o)\n  BIND({} AS ?g)",
                    graph_token(current_graph_var_name).as_str(),
                    graph_token(current_graph_var_name).as_str(),
                    catch_all,
                    subject_var_name,
                    pred_var_name,
                    obj_var_name,
                    graph_token(current_graph_var_name).as_str()
                );
                select_branches.push(format!("{{\n{}\n}}", branch));
            }

            // Combine catch-all with specific predicates of this nested shape inside its graph
            let joined_where_statements = new_where_statements.join(" .\n");
            let inner_union = if joined_where_statements.is_empty() {
                format!("{{\n{}\n  }}", catch_all)
            } else {
                format!(
                    "{{\n{}\n  }} UNION {{\n{}\n  }}",
                    catch_all,
                    indent(&joined_where_statements, 2)
                )
            };
            let nested_block = format!(
                "  # Nested shape <{}> constraints in graph {}\n  GRAPH {} {{\n    {}\n  }}",
                shape.iri,
                graph_token(current_graph_var_name).as_str(),
                graph_token(current_graph_var_name).as_str(),
                inner_union
            );
            visited_shapes.remove(&shape.iri);
            return vec![nested_block];
        } else {
            // Add current layer constraints wrapped in its graph
            if !new_where_statements.is_empty() {
                let body = new_where_statements.join(" .\n");
                where_statements.push(format!(
                    "  # Shape <{}> constraints in graph {}\n  GRAPH {} {{\n{}\n  }}",
                    shape.iri,
                    graph_token(current_graph_var_name).as_str(),
                    graph_token(current_graph_var_name).as_str(),
                    body
                ));
            }
        }

        visited_shapes.remove(&shape.iri);
        vec![]
    }

    let root_shape = schema.get(shape).ok_or(VerifierError::InvalidOrmSchema)?;

    // Root subject and graph variable names
    let root_var_name = get_new_var_name(&mut var_counter);
    let root_graph_var = get_new_graph_var_name(&mut var_counter);

    process_shape(
        schema,
        root_shape,
        &root_var_name,
        &root_graph_var,
        None,
        &mut select_branches,
        &mut where_statements,
        &mut var_counter,
        &mut visited_shapes,
        false,
        limit_to_graph.as_deref(),
    );

    // Filter subjects, if present (applies to the root subject var)
    if let Some(subjects) = filter_subjects {
        let subjects_str = subjects
            .iter()
            .map(|s| format!("<{}>", s))
            .collect::<Vec<_>>()
            .join(", ");
        where_statements.push(format!(
            "  # Root subject filter\n  FILTER(?v0 IN ({}))",
            subjects_str
        ));
    }

    // Assemble final query body with a guided walkthrough as comments
    let mut where_body = String::new();
    if !where_statements.is_empty() {
        where_body.push_str("  # 1) Shape constraints per layer (wrapped in GRAPH ?gN)\n");
        where_body.push_str(&where_statements.join(" .\n"));
        where_body.push_str("\n\n");
    }
    if !select_branches.is_empty() {
        where_body.push_str(
            "  # 2) Output projection: one UNION branch per triple (binds ?s ?p ?o ?g)\n",
        );
        where_body.push_str(&select_branches.join(" UNION "));
        where_body.push_str("\n");
    }

    // Header comments providing context for the generated query
    let header = if let Some(ref g) = limit_to_graph {
        format!(
            "# NextGraph ORM auto-generated SELECT over shape <{}>\n# Returns (?s ?p ?o) with per-layer graph binding (?g)\n# Limited to graph <{}>\n",
            shape, g
        )
    } else {
        format!(
            "# NextGraph ORM auto-generated SELECT over shape <{}>\n# Returns (?s ?p ?o) with per-layer graph binding (?g)\n",
            shape
        )
    };

    Ok(format!(
        "{}SELECT DISTINCT ?s ?p ?o ?g\nWHERE {{\n{}\n}}",
        header, where_body
    ))
}
