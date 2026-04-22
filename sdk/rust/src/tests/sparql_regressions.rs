// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use crate::local_broker::{doc_create, doc_sparql_update, orm_discrete_update, orm_start_discrete};
use crate::tests::create_or_open_wallet::create_or_open_wallet;
use crate::tests::{assert_has_triples, await_app_response, create_doc_with_data, quads_to_string};
use ng_net::app_protocol::{AppResponseV0, NuriV0};
use ng_net::orm::{OrmPatch, OrmPatchOp};
use ng_repo::log::*;
use serde_json::json;

#[async_std::test]
async fn test_sparql_regressions() {
    let (_wallet, session_id) = create_or_open_wallet().await;

    test_ineffective_delete_followed_by_add(session_id).await;
    test_consecutive_delete_insert_where_multi_insert_queries(session_id).await;
    test_overlap_delete_insert_where_multi_insert_queries(session_id).await;
    test_delete_insert_where_after_y_map_commit(session_id).await;
}

async fn setup_status_category_doc(
    session_id: u64,
) -> (String, &'static str, &'static str, &'static str) {
    let subject = "urn:test:item1";
    let status_predicate = "http://example.org/status";
    let category_predicate = "http://example.org/category";

    let doc_nuri = create_doc_with_data(
        session_id,
        format!(
            "INSERT DATA {{ <{subject}> <{status_predicate}> \"old\" . <{subject}> <{category_predicate}> \"init\" . }}"
        ),
    )
    .await;

    (doc_nuri, subject, status_predicate, category_predicate)
}

async fn test_ineffective_delete_followed_by_add(session_id: u64) {
    let subject = "urn:test:item1";
    let status_predicate = "http://example.org/status";
    let category_predicate = "http://example.org/category";

    let doc_nuri = create_doc_with_data(
        session_id,
        format!(
            "DELETE DATA {{ <{subject}> <{status_predicate}> \"old\" }}; INSERT DATA {{ <{subject}> <{status_predicate}> \"old\" }}"
        ),
    )
    .await;
}

async fn test_consecutive_delete_insert_where_multi_insert_queries(session_id: u64) {
    let (doc_nuri, subject, status_predicate, category_predicate) =
        setup_status_category_doc(session_id).await;

    let first_update = format!(
        "DELETE {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{status_predicate}> ?o }}\n}} INSERT {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{status_predicate}> \"first\" }}\n}} WHERE {{\n  OPTIONAL {{ GRAPH <{doc_nuri}> {{ <{subject}> <{status_predicate}> ?o }} }}\n}};\nDELETE {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{category_predicate}> ?c }}\n}} INSERT {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{category_predicate}> \"alpha\" }}\n}} WHERE {{\n  OPTIONAL {{ GRAPH <{doc_nuri}> {{ <{subject}> <{category_predicate}> ?c }} }}\n}}"
    );
    doc_sparql_update(session_id, first_update, Some(doc_nuri.clone()))
        .await
        .expect("first multi-INSERT DELETE/INSERT/WHERE update failed");

    let second_update = format!(
        "DELETE {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{status_predicate}> ?o }}\n}} INSERT {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{status_predicate}> \"second\" }}\n}} WHERE {{\n  OPTIONAL {{ GRAPH <{doc_nuri}> {{ <{subject}> <{status_predicate}> ?o }} }}\n}};\nDELETE {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{category_predicate}> ?c }}\n}} INSERT {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{category_predicate}> \"beta\" }}\n}} WHERE {{\n  OPTIONAL {{ GRAPH <{doc_nuri}> {{ <{subject}> <{category_predicate}> ?c }} }}\n}}"
    );
    doc_sparql_update(session_id, second_update, Some(doc_nuri.clone()))
        .await
        .expect("second multi-INSERT DELETE/INSERT/WHERE update failed");

    let expected: Vec<(&str, &str, &str)> = vec![
        (subject, status_predicate, "second"),
        (subject, category_predicate, "beta"),
    ];
    let quads_after_second = assert_has_triples(session_id, expected, &doc_nuri).await;

    assert!(
        quads_after_second.len() == 2,
        "Expected only final values after consecutive multi-INSERT updates.\n{}",
        quads_to_string(&quads_after_second)
    );
}

async fn test_overlap_delete_insert_where_multi_insert_queries(session_id: u64) {
    let (doc_nuri, subject, status_predicate, category_predicate) =
        setup_status_category_doc(session_id).await;

    let seed_update = format!(
        "DELETE {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{status_predicate}> ?o }}\n}} INSERT {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{status_predicate}> \"second\" }}\n}} WHERE {{\n  OPTIONAL {{ GRAPH <{doc_nuri}> {{ <{subject}> <{status_predicate}> ?o }} }}\n}};\nDELETE {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{category_predicate}> ?c }}\n}} INSERT {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{category_predicate}> \"beta\" }}\n}} WHERE {{\n  OPTIONAL {{ GRAPH <{doc_nuri}> {{ <{subject}> <{category_predicate}> ?c }} }}\n}}"
    );
    doc_sparql_update(session_id, seed_update, Some(doc_nuri.clone()))
        .await
        .expect("seed multi-INSERT DELETE/INSERT/WHERE update failed");

    let overlap_update = format!(
        "DELETE {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{status_predicate}> \"second\" }}\n}} INSERT {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{status_predicate}> \"second\" }}\n}} WHERE {{\n  OPTIONAL {{ GRAPH <{doc_nuri}> {{ <{subject}> <{status_predicate}> \"second\" }} }}\n}};\nDELETE {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{category_predicate}> \"beta\" }}\n}} INSERT {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{category_predicate}> \"beta\" }}\n}} WHERE {{\n  OPTIONAL {{ GRAPH <{doc_nuri}> {{ <{subject}> <{category_predicate}> \"beta\" }} }}\n}}"
    );
    doc_sparql_update(session_id, overlap_update, Some(doc_nuri.clone()))
        .await
        .expect("overlap multi-INSERT DELETE/INSERT/WHERE update failed");

    let expected: Vec<(&str, &str, &str)> = vec![
        (subject, status_predicate, "second"),
        (subject, category_predicate, "beta"),
    ];
    let quads_after_overlap = assert_has_triples(session_id, expected, &doc_nuri).await;

    assert!(
        quads_after_overlap.len() == 2,
        "Expected values to remain after same-triple multi-INSERT DELETE+INSERT update.\n{}",
        quads_to_string(&quads_after_overlap)
    );
}

/// Regression test for the `prepare_sparql_update` graph-heads fix when the
/// branch receives a discrete Yrs commit between two SPARQL graph updates.
///
/// Sequence:
/// 1. Create a `YMap` document.
/// 2. Insert RDF data via SPARQL.
/// 3. Create a discrete Yrs commit via `orm_discrete_update`.
/// 4. Run a single `DELETE ... INSERT ... WHERE` statement to replace the RDF value.
///
/// Without the transaction.rs fix, `previous_heads` would come from
/// `commit.direct_causal_past_ids()`, which now points at the discrete commit
/// rather than the last graph head. The delete phase would then fail to find the
/// old triple in graph history, leaving both old and new values behind.
async fn test_delete_insert_where_after_y_map_commit(session_id: u64) {
    let doc_nuri = doc_create(
        session_id,
        "YMap".to_string(),
        "test_orm_query".to_string(),
        "store".to_string(),
        None,
        None,
    )
    .await
    .expect("error creating YMap doc");

    let subject = "urn:test:ymap1";
    let predicate = "http://example.org/name";

    let commits = doc_sparql_update(
        session_id,
        format!("INSERT DATA {{ GRAPH <{doc_nuri}> {{ <{subject}> <{predicate}> \"old\" }} }}"),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("initial SPARQL insert failed");

    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, _cancel_fn) = orm_start_discrete(nuri, session_id)
        .await
        .expect("orm_start_discrete failed");

    let subscription_id = await_app_response(&mut receiver, |res| match res {
        AppResponseV0::DiscreteOrmInitial(_initial, sub) => Some(sub),
        _ => None,
    })
    .await;

    orm_discrete_update(
        subscription_id,
        vec![OrmPatch {
            op: OrmPatchOp::add,
            path: "/someDiscreteKey".to_string(),
            valType: None,
            value: Some(json!("yrs commit marker")),
        }],
        session_id,
    )
    .await
    .expect("orm_discrete_update failed");

    let commits = doc_sparql_update(
        session_id,
        format!(
            "DELETE {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{predicate}> ?o }}\n}} INSERT {{\n  GRAPH <{doc_nuri}> {{ <{subject}> <{predicate}> \"new\" }}\n}} WHERE {{\n  OPTIONAL {{ GRAPH <{doc_nuri}> {{ <{subject}> <{predicate}> ?o }} }}\n}}"
        ),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("DELETE INSERT WHERE after YMap commit failed");

    let expected: Vec<(&str, &str, &str)> = vec![(subject, predicate, "new")];
    let quads = assert_has_triples(session_id, expected, &doc_nuri).await;

    assert!(
        quads.len() == 1,
        "Expected DELETE INSERT WHERE to replace the value after a YMap commit.\n{}",
        quads_to_string(&quads)
    );
}
