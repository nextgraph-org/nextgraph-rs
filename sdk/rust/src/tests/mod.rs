// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use assert_json_diff::assert_json_matches;
use async_std::future::timeout;
use futures::channel::mpsc::UnboundedReceiver;
use futures::StreamExt;
use ng_net::app_protocol::{AppResponse, AppResponseV0, NuriV0};
use ng_net::orm::{OrmPatch, OrmShapeType};
use ng_oxigraph::oxrdf::{Quad, Subject};
use serde_json::{json, Value};
use std::time::Duration;

use crate::local_broker::{
    doc_create, doc_sparql_select, doc_sparql_update, orm_start_discrete, orm_start_graph,
};

#[doc(hidden)]
pub mod orm_creation;

pub mod orm_apply_patches;
#[doc(hidden)]
pub mod orm_create_patches;
#[doc(hidden)]
pub mod orm_discrete_patches;
#[doc(hidden)]
pub mod sparql_regressions;

#[doc(hidden)]
pub mod create_or_open_wallet;

pub(crate) async fn create_doc_with_data(session_id: u64, sparql_insert: String) -> String {
    let doc_nuri = doc_create(
        session_id,
        "Graph".to_string(),
        "test_orm_query".to_string(),
        "store".to_string(),
        None,
        None,
    )
    .await
    .expect("error creating doc");

    // Insert data
    doc_sparql_update(session_id, sparql_insert, Some(doc_nuri.clone()))
        .await
        .expect("SPARQL update failed");

    return doc_nuri;
}

pub(crate) fn assert_orm_json_eq(expected: &mut Value, actual: &mut Value) {
    sort_arrays(expected);
    sort_arrays(actual);

    assert_json_eq(expected, actual);
}

pub(crate) fn assert_json_eq(expected: &Value, actual: &Value) {
    let json_diff_config = assert_json_diff::Config::new(assert_json_diff::CompareMode::Strict)
        .numeric_mode(assert_json_diff::NumericMode::AssumeFloat);
    assert_json_matches!(actual, expected, json_diff_config);
}

/// Helper to recursively sort all arrays in nested objects into a stable ordering.
/// Arrays are sorted by their JSON string representation.
fn sort_arrays(value: &mut Value) {
    match value {
        Value::Object(map) => {
            for v in map.values_mut() {
                sort_arrays(v);
            }
        }
        Value::Array(arr) => {
            // First, recursively sort nested structures
            for v in arr.iter_mut() {
                sort_arrays(v);
            }
            // Then sort the array itself by JSON string representation
            arr.sort_by(|a, b| {
                let a_str = canonical_json::ser::to_string(a).unwrap_or_default();
                let b_str = canonical_json::ser::to_string(b).unwrap_or_default();
                a_str.cmp(&b_str)
            });
        }
        _ => {}
    }
}

async fn create_orm_connection(
    nuris: Vec<String>,
    subjects: Vec<String>,
    shape_type: OrmShapeType,
    session_id: u64,
) -> (
    UnboundedReceiver<ng_net::app_protocol::AppResponse>,
    Box<dyn FnOnce() + Send + Sync>,
    u64,
    serde_json::Value,
) {
    create_orm_connection_with_conf(nuris, subjects, shape_type, session_id, json!({})).await
}

async fn create_orm_connection_with_conf(
    nuris: Vec<String>,
    subjects: Vec<String>,
    shape_type: OrmShapeType,
    session_id: u64,
    config: Value,
) -> (
    UnboundedReceiver<ng_net::app_protocol::AppResponse>,
    Box<dyn FnOnce() + Send + Sync>,
    u64,
    serde_json::Value,
) {
    let nuris = nuris
        .iter()
        .map(|nuri_str| NuriV0::new_from(&nuri_str).expect("parse nuri"))
        .collect();

    // let (mut receiver, cancel_fn) = orm_start_graph(nuris, subjects, shape_type, session_id, config)
    let (mut receiver, cancel_fn) = orm_start_graph(nuris, subjects, shape_type, session_id)
        .await
        .expect("orm_start_graph failed");

    // Get initial state with timeout
    let (initial_value, subscription_id) = await_app_response(&mut receiver, |res| match res {
        AppResponseV0::GraphOrmInitial(sub, val) => Some((sub, val)),
        _ => None,
    })
    .await;

    return (receiver, cancel_fn, subscription_id, initial_value);
}

async fn await_graph_patches(receiver: &mut UnboundedReceiver<AppResponse>) -> Vec<OrmPatch> {
    await_app_response(receiver, |res| match res {
        AppResponseV0::GraphOrmUpdate(patches) => Some(patches),
        _ => None,
    })
    .await
}

async fn await_app_response<T, F>(
    receiver: &mut UnboundedReceiver<AppResponse>,
    mut matcher: F,
) -> T
where
    F: FnMut(AppResponseV0) -> Option<T>,
{
    loop {
        let res = timeout(Duration::from_secs(10), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for AppResponseV0 (1 second)"),
        };
        match opt {
            Some(app_response) => {
                let AppResponse::V0(v0) = app_response;
                if let Some(val) = matcher(v0) {
                    return val;
                }
            }
            None => panic!("ORM receiver closed before expected response"),
        }
    }
}

async fn create_discrete_doc(
    session_id: u64,
    crdt: String,
) -> (u64, UnboundedReceiver<AppResponse>, NuriV0) {
    let nuri_str = doc_create(
        session_id,
        crdt,
        "test_orm_query".to_string(),
        "store".to_string(),
        None,
        None,
    )
    .await
    .expect("error creating doc");

    let nuri = NuriV0::new_from(&nuri_str).unwrap();

    let (mut receiver, _cancel_fn) = orm_start_discrete(nuri.clone(), session_id)
        .await
        .expect("orm_start_discrete failed");

    let (_initial_value, subscription_id) = await_app_response(&mut receiver, |res| match res {
        AppResponseV0::DiscreteOrmInitial(sub, val) => Some((sub, val)),
        _ => None,
    })
    .await;

    (subscription_id, receiver, nuri)
}

async fn create_discrete_subscription(
    session_id: u64,
    nuri: &NuriV0,
) -> (Value, UnboundedReceiver<AppResponse>, u64) {
    let (mut receiver, _cancel_fn) = orm_start_discrete(nuri.clone(), session_id)
        .await
        .expect("orm_start_discrete failed");

    let (initial_value, subscription_id) = await_app_response(&mut receiver, |res| match res {
        AppResponseV0::DiscreteOrmInitial(sub, val) => Some((sub, val)),
        _ => None,
    })
    .await;

    (initial_value, receiver, subscription_id)
}

async fn await_discrete_patches(receiver: &mut UnboundedReceiver<AppResponse>) -> Vec<OrmPatch> {
    await_app_response(receiver, |res| match res {
        AppResponseV0::DiscreteOrmUpdate(patches) => Some(patches),
        _ => None,
    })
    .await
}

/// Extract the graph IRI from the first patch path in the actual patches JSON array.
pub(crate) fn extract_graph_from_actual_paths(actual: &Value) -> Option<String> {
    // Expecting actual to be an array of objects with a "path" string like "/graph|subject/..."
    let arr = actual.as_array()?;
    for item in arr {
        if let Some(path) = item.get("path").and_then(|v| v.as_str()) {
            let mut segs = path.split('/').filter(|s| !s.is_empty());
            if let Some(root) = segs.next() {
                if let Some((graph, _subject)) = root.split_once('|') {
                    return Some(graph.to_string());
                }
            }
        }
    }
    None
}

/// Prefix every subject segment (urn:...) in an expected JSON path with "{graph}|".
pub(crate) fn prefix_graph_in_path(path: &str, graph: &str) -> String {
    let mut out = String::from("/");
    let mut first = true;
    for seg in path.split('/').filter(|s| !s.is_empty()) {
        if !first {
            out.push('/');
        }
        // Only prefix subject segments, not properties or @-fields
        if (seg.starts_with("urn:") || seg.starts_with("did:")) && !seg.contains('|') {
            out.push_str(graph);
            out.push('|');
        }
        out.push_str(seg);
        first = false;
    }
    out
}

/// Rewrite all "path" fields in the expected JSON with the graph-prefixed subject segments.
pub(crate) fn rewrite_expected_paths_with_graph(expected: &mut Value, graph: &str) {
    if let Some(arr) = expected.as_array_mut() {
        for item in arr.iter_mut() {
            if let Some(path_val) = item.get_mut("path") {
                if let Some(path) = path_val.as_str() {
                    let new_path = prefix_graph_in_path(path, graph);
                    *path_val = Value::String(new_path);
                }
            }
        }
    }
}

/// For each expected entry that sets an @id, also expect a sibling @graph entry with the same base path.
pub(crate) fn augment_expected_with_graph_fields(expected: &mut Value, graph: &str) {
    if let Some(arr) = expected.as_array_mut() {
        let mut to_insert = Vec::new();
        for (index, item) in arr.iter().enumerate() {
            if let (Some(path), Some(op)) = (
                item.get("path").and_then(|v| v.as_str()),
                item.get("op").and_then(|v| v.as_str()),
            ) {
                if path.ends_with("/@id") && op == "add" {
                    let base = path.trim_end_matches("/@id");
                    to_insert.push((
                        index + 1,
                        json!({
                            "op": "add",
                            "path": format!("{}/@graph", base),
                            "value": graph,
                        }),
                    ));
                }
            }
        }
        for (offset, (index, value)) in to_insert.into_iter().enumerate() {
            arr.insert(index + offset, value);
        }
    }
}

/// Find the child graph IRI for a nested entry by inspecting the @graph patch for that child.
/// Looks for a patch whose path contains `/{prop}/...{child}/@graph` and returns its value.
pub(crate) fn extract_child_graph_from_actual(
    actual: &Value,
    prop: &str,
    child_subject: &str,
) -> Option<String> {
    let arr = actual.as_array()?;
    for item in arr {
        let path = item.get("path").and_then(|v| v.as_str());
        if let Some(path) = path {
            if path.contains(&format!("/{}/", prop))
                && path.contains(child_subject)
                && path.ends_with("/@graph")
            {
                if let Some(val) = item.get("value").and_then(|v| v.as_str()) {
                    return Some(val.to_string());
                }
            }
        }
    }
    None
}

/// Given a path that was first rewritten with the root graph for all subjects,
/// fix the specific child segment to use its own child_graph instead of root_graph.
pub(crate) fn fix_child_segment_graph_in_path(
    path: &str,
    prop: &str,
    child_subject: &str,
    root_graph: &str,
    child_graph: &str,
) -> String {
    // Replace `/{prop}/{root_graph}|{child_subject}` with `/{prop}/{child_graph}|{child_subject}`
    let needle = format!("/{}/{root}|{}", prop, child_subject, root = root_graph);
    let replacement = format!("/{}/{child}|{}", prop, child_subject, child = child_graph);
    path.replace(&needle, &replacement)
}

/// Apply child-graph fix on all expected path entries matching the given child under `prop`.
fn fix_child_segment_graph_in_expected(
    expected: &mut Value,
    prop: &str,
    child_subject: &str,
    root_graph: &str,
    child_graph: &str,
) {
    if let Some(arr) = expected.as_array_mut() {
        for item in arr.iter_mut() {
            if let Some(path_val) = item.get_mut("path") {
                if let Some(path) = path_val.as_str() {
                    // After rewrite, paths look like: /root_graph|subject/prop/root_graph|child_subject
                    // So we check for the pattern with the root graph prefixed
                    if path.contains(&format!("/{}/{}|{}", prop, root_graph, child_subject)) {
                        let new_path = fix_child_segment_graph_in_path(
                            path,
                            prop,
                            child_subject,
                            root_graph,
                            child_graph,
                        );
                        *path_val = Value::String(new_path);
                    }
                }
            }
        }
    }
}

pub(crate) async fn assert_has_triples(
    session_id: u64,
    expected: Vec<(&str, &str, &str)>,
    nuri: &String,
) -> Vec<Quad> {
    let quads = doc_sparql_select(
        session_id,
        format!(
            "SELECT ?s ?p ?o ?g WHERE {{ GRAPH <{nuri}> {{ ?s ?p ?o }} BIND(<{nuri}> AS ?g) }}"
        ),
        Some(nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_quad = |subject: &str, predicate: &str, object_contains: &str| {
        quads.iter().any(|q| {
            matches!(&q.subject, Subject::NamedNode(nn) if nn.as_str() == subject)
                && q.predicate.as_str() == predicate
                && q.object.to_string().contains(object_contains)
                && quad_has_graph(q, nuri)
        })
    };

    for (subject, predicate, object_contains) in expected {
        assert!(
            has_quad(subject, predicate, object_contains),
            "Missing quad: subject='{}' predicate='{}' object contains '{}'\nAll quads: {:?}",
            subject,
            predicate,
            object_contains,
            quads
        );
    }

    quads
}

pub(crate) fn quads_to_string(quads: &Vec<Quad>) -> String {
    quads
        .iter()
        .map(|q| {
            format!(
                "{} {} {} {}",
                q.subject, q.predicate, q.object, q.graph_name
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

// Helper: check if a quad's graph matches the expected graph IRI
pub(crate) fn quad_has_graph(q: &ng_oxigraph::oxrdf::Quad, expected_graph: &str) -> bool {
    match &q.graph_name {
        ng_oxigraph::oxrdf::GraphName::NamedNode(n) => n.as_str() == expected_graph,
        _ => false,
    }
}

// Helper: escape a JSON Pointer segment (RFC 6901): ~ -> ~0, / -> ~1
pub(crate) fn escape_pointer_segment(segment: &str) -> String {
    segment.replace('~', "~0").replace('/', "~1")
}

// Helper: build root path prefix "/graph|subject" for a given graph and subject
pub(crate) fn root_path(graph: &str, subject: &str) -> String {
    format!(
        "/{}|{}",
        escape_pointer_segment(graph),
        escape_pointer_segment(subject)
    )
}

// Helper: build a composite key segment "graph|subject" for multi-children
pub(crate) fn composite_key(graph: &str, subject: &str) -> String {
    format!(
        "{}|{}",
        escape_pointer_segment(graph),
        escape_pointer_segment(subject)
    )
}
