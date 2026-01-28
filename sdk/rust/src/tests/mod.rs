// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use async_std::future::timeout;
use futures::channel::mpsc::UnboundedReceiver;
use futures::StreamExt;
use ng_net::app_protocol::{AppResponse, AppResponseV0, NuriV0};
use ng_net::orm::{OrmPatch, OrmShapeType};
use serde_json::Value;
use std::time::Duration;

use ng_repo::log::*;

use crate::local_broker::{doc_create, doc_sparql_update, orm_start_discrete, orm_start_graph};

#[doc(hidden)]
pub mod orm_creation;

pub mod orm_apply_patches;
#[doc(hidden)]
pub mod orm_create_patches;
#[doc(hidden)]
pub mod orm_discrete_patches;

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

pub(crate) fn assert_json_eq(expected: &mut Value, actual: &mut Value) {
    sort_arrays(expected);
    sort_arrays(actual);

    let diff = serde_json_diff::values(expected.clone(), actual.clone());
    if let Some(diff_) = diff {
        log_err!(
            "Expected and actual JSON mismatch.\nDiff: {:?}\nExpected: {}\nActual: {}",
            diff_,
            expected,
            actual
        );
        assert!(false);
    }
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
    let nuris = nuris
        .iter()
        .map(|nuri_str| NuriV0::new_from(&nuri_str).expect("parse nuri"))
        .collect();
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
