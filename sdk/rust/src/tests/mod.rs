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
use ng_net::orm::OrmShapeType;
use ng_repo::log_err;
use serde_json::Value;
use std::time::Duration;

use ng_repo::log::*;

use crate::local_broker::{doc_create, doc_sparql_update, orm_start};

#[doc(hidden)]
pub mod orm_creation;

pub mod orm_apply_patches;
#[doc(hidden)]
pub mod orm_create_patches;

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
    let (mut receiver, cancel_fn) = orm_start(nuris, subjects, shape_type, session_id)
        .await
        .expect("orm_start failed");

    // Get initial state with timeout
    let subscription_id;
    let initial_value;
    loop {
        let res = timeout(Duration::from_secs(1), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for OrmInitial response (1 second)"),
        };
        match opt {
            Some(app_response) => {
                if let AppResponse::V0(AppResponseV0::OrmInitial(init, sid)) = app_response {
                    subscription_id = sid;
                    initial_value = init;
                    break;
                }
            }
            None => panic!("ORM receiver closed before initial response"),
        }
    }

    return (receiver, cancel_fn, subscription_id, initial_value);
}
