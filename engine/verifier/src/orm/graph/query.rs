// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use ng_repo::errors::VerifierError;
use ng_repo::log::*;

use std::collections::{HashMap, HashSet, VecDeque};

pub use ng_net::orm::{OrmPatches, OrmShapeType};

use crate::orm::graph::types::*;
use crate::orm::graph::utils::{escape_sparql_string, is_iri};
use crate::verifier::*;
use ng_net::orm::*;
use ng_oxigraph::oxigraph::sparql::{Query, QueryResults};
use ng_oxigraph::oxrdf::{GraphNameRef, NamedNode, Quad, SubjectRef, Term};
use ng_repo::errors::NgError;

/// Outcome of a shape fetch.
pub struct ShapeFetch {
    /// Every quad the traversal collected.
    pub quads: Vec<Quad>,
    /// The subjects the traversal loaded in full, keyed by the shape they were queried for.
    /// Their complete state (for that shape) is contained in `quads`.
    pub loaded: HashMap<ShapeIri, HashSet<SubjectIri>>,
}

impl Verifier {
    /// Query all quads for a shape and its nested shapes using a breadth-first queue.
    ///
    /// - scope: The graphs to include for the query.
    /// - schema: The ORM schema map.
    /// - root_shape: IRI of the root shape to start from.
    /// - filter_subjects: Optional list of subject IRIs to restrict the root query. If None, the root query is unfiltered to discover all matching root subjects.
    ///
    /// Returns all quads collected across the root shape and all reachable nested shapes,
    /// together with the subjects the traversal loaded in full.
    ///
    /// Note: If the shape is closed, this will query **all quads** within the scope and filter_subject (if any).
    /// So it is advisable to provide a narrow scope or filter_subjects.
    pub fn query_quads_for_shape(
        &self,
        scope: &QueryScope,
        schema: &OrmSchema,
        root_shape: &ShapeIri,
        filter_subjects: Option<&Vec<String>>,
    ) -> Result<ShapeFetch, NgError> {
        if *scope == QueryScope::None {
            return Ok(ShapeFetch {
                loaded: HashMap::new(),
                quads: vec![],
            });
        }

        // Helper to get a shape by IRI
        let get_shape = |iri: &str| -> Result<std::sync::Arc<OrmSchemaShape>, NgError> {
            schema.get(iri).cloned().ok_or_else(|| {
                log_err!("Shape not found in schema: {}", iri);
                VerifierError::InvalidOrmSchema.into()
            })
        };

        // Queue management: pending subjects per shape, processed subjects per shape,
        // and a FIFO order of shapes to process.
        let mut pending: HashMap<ShapeIri, HashSet<SubjectIri>> = HashMap::new();
        let mut processed: HashMap<ShapeIri, HashSet<SubjectIri>> = HashMap::new();
        let mut processed_all: HashSet<ShapeIri> = HashSet::new(); // shapes queried globally (no subject filter)
        let mut in_queue: HashSet<ShapeIri> = HashSet::new(); // Track shapes currently in the queue
        let mut order: VecDeque<ShapeIri> = VecDeque::new();

        // Seed root
        in_queue.insert(root_shape.clone());
        order.push_back(root_shape.clone());
        if let Some(subs) = filter_subjects {
            let set: HashSet<String> = subs.iter().cloned().collect();
            pending.insert(root_shape.clone(), set);
        }

        // Results accumulator
        let mut all_quads: HashSet<Quad> = HashSet::new();

        // Helper to build predicate -> nested shapes mapping for a shape
        fn build_nested_shapes_map(shape: &OrmSchemaShape) -> HashMap<String, Vec<ShapeIri>> {
            let mut pred_to_nested: HashMap<String, Vec<String>> = HashMap::new();
            for pred in &shape.predicates {
                let mut list: Vec<String> = Vec::new();
                for dt in &pred.dataTypes {
                    if dt.valType == OrmSchemaValType::shape {
                        if let Some(ref s) = dt.shape {
                            list.push(s.clone());
                        }
                    }
                }
                if !list.is_empty() {
                    pred_to_nested.insert(pred.iri.clone(), list);
                }
            }
            pred_to_nested
        }

        // Helper to add nested subjects to pending without duplication
        fn add_pending(
            order: &mut VecDeque<String>,
            pending: &mut HashMap<String, HashSet<String>>,
            processed: &HashMap<String, HashSet<String>>,
            in_queue: &mut HashSet<String>,
            shape_iri: &str,
            subj: &str,
        ) {
            // Allow a shape to be re-queued if a NEW subject (not yet processed) is found
            // even when the shape was previously globally processed (unfiltered root query).
            // This covers edge cases like: root -> child -> grandchild -> child (new subject)
            // where the second appearance of `child` introduces a subject not in the first pass.
            //
            // Skip only if the subject was already processed for that shape.
            if processed
                .get(shape_iri)
                .map(|s| s.contains(subj))
                .unwrap_or(false)
            {
                return; // subject already handled
            }
            // If the shape was globally processed (all subjects at that time), we still permit
            // enqueueing a newly discovered subject because it was not known earlier.
            let entry = pending.entry(shape_iri.to_string()).or_default();
            if entry.insert(subj.to_string()) {
                // Only enqueue if not already in queue
                if in_queue.insert(shape_iri.to_string()) {
                    order.push_back(shape_iri.to_string());
                }
            }
        }

        while let Some(current_shape_iri) = order.pop_front() {
            // Remove from in_queue since we're processing it now
            in_queue.remove(&current_shape_iri);

            let shape_arc = get_shape(&current_shape_iri)?;
            let shape_ref: &OrmSchemaShape = &shape_arc;

            // Determine subject filter for this shape
            let subjects_vec_opt = pending
                .remove(&current_shape_iri)
                .map(|set| set.into_iter().collect::<Vec<String>>())
                .filter(|v| !v.is_empty());

            let is_root = current_shape_iri == *root_shape;

            // Skip if queried for all
            if processed_all.contains(&current_shape_iri) {
                // Already globally processed and no new subjects
                continue;
            }
            if !is_root && subjects_vec_opt.is_none() {
                // Non-root shape with no subjects to query
                continue;
            }

            // Build and run the SELECT for this shape
            let sparql = schema_shape_to_sparql(
                shape_ref,
                subjects_vec_opt.as_ref(),
                &scope,
                None,
                None,
                None,
                false,
            );

            let quads = self.query_sparql_select(sparql, None)?;

            // Build nested shapes mapping once for this shape
            let pred_to_nested = build_nested_shapes_map(shape_ref);

            // First pass: collect nested subjects to enqueue
            let mut nested_to_enqueue: Vec<(String, String)> = Vec::new();
            if !pred_to_nested.is_empty() {
                for q in &quads {
                    let pred_iri = q.predicate.as_str();
                    if let Some(nested_shapes) = pred_to_nested.get(pred_iri) {
                        if let Term::NamedNode(obj_node) = &q.object {
                            let obj_iri = obj_node.as_str();
                            for ns in nested_shapes.iter() {
                                nested_to_enqueue.push((ns.clone(), obj_iri.to_string()));
                            }
                        }
                    }
                }
            }

            // Update processed subjects tracking
            let proc_entry = processed.entry(current_shape_iri.clone()).or_default();
            if subjects_vec_opt.is_none() {
                // Global (root) query: mark all seen subjects as processed
                processed_all.insert(current_shape_iri.clone());
                for q in &quads {
                    if let ng_oxigraph::oxrdf::Subject::NamedNode(n) = &q.subject {
                        proc_entry.insert(n.as_str().to_string());
                    }
                }
            } else if let Some(v) = subjects_vec_opt {
                // Mark explicitly queried subjects as processed
                for s in v {
                    proc_entry.insert(s);
                }
            }

            // Second pass: enqueue nested subjects.
            for (ns, obj_iri) in nested_to_enqueue {
                add_pending(
                    &mut order,
                    &mut pending,
                    &processed,
                    &mut in_queue,
                    &ns,
                    &obj_iri,
                );
            }

            // Append to results
            all_quads.extend(quads);
        }

        Ok(ShapeFetch {
            quads: all_quads.into_iter().collect(),
            loaded: processed,
        })
    }

    /// Get every quad the store holds for the given (graph, subject) pairs.
    /// Uses `store.quads_for_pattern` for fast query.
    pub fn query_quads_for_graph_subjects(
        &self,
        graph_subjects: &[(GraphIri, SubjectIri)],
    ) -> Result<Vec<Quad>, NgError> {
        if graph_subjects.is_empty() {
            return Ok(Vec::new());
        }

        let store = self.graph_dataset.as_ref().unwrap();
        let mut quads: Vec<Quad> = Vec::new();

        for (graph_iri, subject_iri) in graph_subjects.iter() {
            let graph =
                NamedNode::new(graph_iri).map_err(|e| NgError::OxiGraphError(e.to_string()))?;
            let subject =
                NamedNode::new(subject_iri).map_err(|e| NgError::OxiGraphError(e.to_string()))?;

            for found in store.quads_for_pattern(
                Some(SubjectRef::NamedNode(subject.as_ref())),
                None,
                None,
                Some(GraphNameRef::NamedNode(graph.as_ref())),
            ) {
                let found = found.map_err(|e| NgError::OxiGraphError(e.to_string()))?;
                quads.push(found);
            }
        }

        Ok(quads)
    }

    /// Expects the select to return 4 variables only: ?s, ?p, ?o, ?g
    /// Returns quads
    pub fn query_sparql_select(
        &self,
        query: String,
        nuri: Option<String>,
    ) -> Result<Vec<Quad>, NgError> {
        let oxistore = self.graph_dataset.as_ref().unwrap();

        let parsed = Query::parse(&query, nuri.as_deref())
            .map_err(|e| NgError::OxiGraphError(e.to_string()))?;

        let results = oxistore
            .query(parsed, nuri)
            .map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        match results {
            QueryResults::Solutions(solutions) => {
                let mut result_quads: Vec<Quad> = vec![];
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
                            let g = solution.get("g");

                            let quad = Quad {
                                subject: match s {
                                    Term::NamedNode(n) => {
                                        ng_oxigraph::oxrdf::Subject::NamedNode(n.clone())
                                    }
                                    _ => panic!("Expected NamedNode for subject"),
                                },
                                predicate: match p {
                                    Term::NamedNode(n) => n.clone(),
                                    _ => panic!(),
                                },
                                object: o.clone(),
                                graph_name: match g {
                                    Some(Term::NamedNode(n)) => {
                                        ng_oxigraph::oxrdf::GraphName::NamedNode(n.clone())
                                    }
                                    _ => panic!("Expected NamedNode for graph_name"),
                                },
                            };

                            result_quads.push(quad);
                        }
                    }
                }
                Ok(Vec::from_iter(result_quads))
            }
            _ => return Err(NgError::InvalidResponse),
        }
    }

    /// Expects the select to return 2 variables only: ?g and ?s
    fn query_sparql_graph_subject(
        &self,
        query: &String,
        nuri: Option<String>,
    ) -> Result<Vec<(GraphIri, SubjectIri)>, NgError> {
        let oxistore = self.graph_dataset.as_ref().unwrap();

        let parsed = Query::parse(&query, nuri.as_deref())
            .map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        let results = oxistore
            .query(parsed, nuri)
            .map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        match results {
            QueryResults::Solutions(solutions) => {
                let mut results: Vec<(GraphIri, SubjectIri)> = vec![];
                for s in solutions {
                    match s {
                        Err(e) => {
                            log_err!("{}", e.to_string());
                            return Err(NgError::SparqlError(e.to_string()));
                        }
                        Ok(solution) => {
                            let s: String = match solution.get("s") {
                                Some(Term::NamedNode(node)) => node.as_string().clone(),
                                _ => return Err(NgError::InvalidResponse),
                            };
                            let g = match solution.get("g") {
                                Some(Term::NamedNode(node)) => node.as_string().clone(),
                                _ => return Err(NgError::InvalidResponse),
                            };

                            results.push((g, s));
                        }
                    }
                }
                Ok(results)
            }
            _ => return Err(NgError::InvalidResponse),
        }
    }

    /// Makes a (page)-order query that returns all graph-subject pairs
    /// for the shape type and orm_subscription.page_info.limit/offset (if any).
    pub fn query_graph_subjects(
        &self,
        orm_subscription: &OrmSubscription,
        limit_offset: Option<(usize, usize)>,
    ) -> Result<Vec<(GraphIri, SubjectIri)>, NgError> {
        // Parse order by config object to link to actual predicate schema objects?
        let sparql_query = schema_shape_to_sparql(
            orm_subscription
                .shape_type
                .schema
                .get(&orm_subscription.shape_type.shape)
                .unwrap(),
            Some(&orm_subscription.subject_scope),
            &orm_subscription.graph_scope,
            orm_subscription.config.where_.as_ref(),
            orm_subscription.config.order_by.as_ref(),
            limit_offset,
            true,
        );

        let res = self.query_sparql_graph_subject(&sparql_query, None);

        res
    }
}

/// Build a simple, non-recursive SELECT for a given shape.
///
/// Contract
/// - Input: OrmSchemaShape, optional subject and graph filters (as IRI strings), optional where config
/// - Output: "SPARQL SELECT DISTINCT ?s ?p ?o ?g" - or only with "?s ?g". of subject_and_graph_only
/// - Semantics:
///   - Always include a generic triple pattern to return all triples: GRAPH ?g { ?s ?p ?o }
///   - For required predicates (minCardinality >= 1), add explicit triples (?s <pred> ?vN)
///     inside the GRAPH block so they are guaranteed to be present for matching rows.
///   - Optional predicates (minCardinality < 1) are not added explicitly; they will still
///     be returned via the generic ?s ?p ?o pattern.
///   - If a predicate has enumerated literal values across its dataTypes, aggregate and
///     add a FILTER on the predicate’s object variable (?vN IN (...)).
///   - Shape-valued predicates are treated like value predicates here (no recursion).
///   - If a where config is provided, greater than and less than restrictions are added too.
pub fn schema_shape_to_sparql(
    shape: &OrmSchemaShape,
    // subject IRIs to include
    filter_subjects: Option<&Vec<String>>,
    // graphs to include
    scope: &QueryScope,
    _where_config: Option<&WhereConfig>,
    order_by_config: Option<&OrderByConfig>,
    limit_offset: Option<(usize, usize)>,
    // Query quads or only (g,s) pairs?
    subject_and_graph_only: bool,
) -> String {
    // Variable counter for internal object vars (avoid clashing with ?s ?p ?o ?g).
    let mut var_counter: i32 = 0;
    let mut next_var = || {
        let v = format!("v{}", var_counter);
        var_counter += 1;
        v
    };

    // Build GRAPH block body: generic triple + explicit required predicates.
    let mut graph_lines: Vec<String> = vec!["  ?s ?p ?o .".to_string()];

    let mut post_graph_filters: Vec<String> = vec![];

    // Add constraints for mandatory predicates and literals.
    // If the shape is closed though, we need to track the existence/count of all quads.
    if !shape.is_closed {
        for pred in &shape.predicates {
            // Only add constraint for mandatory predicates.
            if pred.minCardinality == 0 {
                continue;
            }
            let obj_var = next_var();
            graph_lines.push(format!("  ?s <{}> ?{} .", pred.iri, obj_var));

            // Aggregate enumerated literal constraints across dataTypes.
            let mut allowed_literals: Vec<String> = vec![];
            for dt in &pred.dataTypes {
                if let Some(lits) = &dt.literals {
                    for lit in lits {
                        // Convert literal value to SPARQL syntax
                        allowed_literals.push(match lit {
                            BasicType::Bool(b) => {
                                if *b {
                                    "true".to_string()
                                } else {
                                    "false".to_string()
                                }
                            }
                            BasicType::Num(n) => n.to_string(),
                            BasicType::Str(s) => {
                                let schema_has_string = pred
                                    .dataTypes
                                    .iter()
                                    .any(|dt| dt.valType == OrmSchemaValType::string);
                                let schema_has_iri = pred
                                    .dataTypes
                                    .iter()
                                    .any(|dt| dt.valType == OrmSchemaValType::iri);

                                if schema_has_iri && schema_has_string {
                                    match is_iri(s) {
                                        true => format!("<{}>", s),
                                        false => format!("\"{}\"", escape_sparql_string(s)),
                                    }
                                } else if schema_has_iri {
                                    format!("<{}>", s)
                                } else {
                                    format!("\"{}\"", escape_sparql_string(s))
                                }
                            }
                        });
                    }
                }
            }
            // Add possible literal constraints (like rdfs:type).
            // At least one must match (we can't "AND" this because we need to track incomplete results too).
            if !allowed_literals.is_empty() {
                post_graph_filters.push(format!(
                    "  FILTER(?{} IN ({}))",
                    obj_var,
                    allowed_literals.join(", ")
                ));
            }
        }
    }

    // Assemble WHERE body.
    let mut where_lines: Vec<String> = vec![];

    // Build a `VALUES ?var { <iri> ... }` line.
    let values_line = |var: &str, iris: &Vec<String>| -> String {
        let list = iris
            .iter()
            .map(|iri| format!("<{}>", iri))
            .collect::<Vec<_>>()
            .join(" ");
        format!("  VALUES ?{} {{ {} }}", var, list)
    };

    // Subject filter
    if let Some(subjects) = filter_subjects {
        if !subjects.is_empty() {
            where_lines.push(values_line("s", subjects));
        }
    }

    // Graph scope filter
    match scope {
        QueryScope::Graphs(graphs) => {
            where_lines.push(values_line("g", &graphs.iter().cloned().collect()));
        }
        _ => {}
    }

    where_lines.push("  GRAPH ?g {".to_string());
    where_lines.push(graph_lines.join("\n"));
    where_lines.push("  }".to_string());

    // Filters that depend on internal object vars should come after GRAPH block
    where_lines.extend(post_graph_filters);

    // Add order by config by adding where statements `?s <order by pred 1> ?order_by_var1`
    // and ORDER BY string from the new oder_by_vars.
    let mut order_by_str: String = "".to_string();
    if let Some(order_by_preds) = order_by_config {
        let mut order_by_vars: Vec<(String, OrderDirection)> = vec![];

        // add order_by_vars to where.
        for (order_by_p, order_dir) in order_by_preds {
            let sparql_var = next_var();
            // Keep order-by lookup in the same named graph scope as the main shape query.
            where_lines.push(format!(
                "  GRAPH ?g {{ ?s <{}> ?{} . }}",
                order_by_p.iri, sparql_var
            ));
            order_by_vars.push((sparql_var, *order_dir));
        }

        // Add order_by_str with ASC or DESC for each var.
        order_by_str = format!(
            "ORDER BY {}",
            order_by_vars
                .iter()
                .map(
                    |(v, order_dir)| if *order_dir == OrderDirection::Ascending {
                        format!("ASC(?{})", v)
                    } else {
                        format!("DESC(?{})", v)
                    }
                )
                .collect::<Vec<String>>()
                .join(" ")
        );
    }

    // Pagination
    let pagination_str = if let Some((limit, offset)) = limit_offset {
        &format!("LIMIT {} OFFSET {}", limit, offset)
    } else {
        ""
    };

    if subject_and_graph_only {
        format!(
            "SELECT DISTINCT ?s ?g\nWHERE {{\n{}\n}}\n{}\n{}",
            where_lines.join("\n"),
            order_by_str,
            pagination_str
        )
    } else {
        format!(
            "SELECT DISTINCT ?s ?p ?o ?g\nWHERE {{\n{}\n}}\n{}\n{}",
            where_lines.join("\n"),
            order_by_str,
            pagination_str
        )
    }
}
