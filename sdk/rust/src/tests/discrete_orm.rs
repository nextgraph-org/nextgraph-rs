// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use ng_net::orm::{OrmPatch, OrmPatchOp};
use serde_json::{json, Value};

use crate::{
    local_broker::orm_discrete_update,
    tests::{
        assert_json_eq, await_discrete_patches, create_discrete_subscription,
        create_or_open_wallet::create_or_open_wallet, create_ymap_doc,
    },
};

#[async_std::test]
async fn test_orm_apply_patches() {
    // Setup wallet and document
    let (_wallet, session_id) = create_or_open_wallet().await;

    // Tests below all in this test, to prevent waiting times through wallet creation.

    test_one(session_id).await;
}

async fn test_one(session_id: u64) {
    let (subscription_id, mut _receiver, nuri) = create_ymap_doc(session_id).await;

    let (initial_value, mut receiver_other, _other_subscription_id) =
        create_discrete_subscription(session_id, &nuri).await;
    assert!(initial_value.is_null());

    let applied_patches = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!("/name"),
        valType: None,
        value: Some(json!("Alice")),
    }];

    orm_discrete_update(subscription_id, applied_patches.clone(), session_id)
        .await
        .expect("orm_update failed");

    let got_patches = await_discrete_patches(&mut receiver_other).await;

    let mut expected_json = serde_json::to_value(&applied_patches).unwrap();
    let mut got_json = serde_json::to_value(&got_patches).unwrap();
    assert_json_eq(&mut expected_json, &mut got_json);

    let (final_state, _receiver_after, _subscription_after) =
        create_discrete_subscription(session_id, &nuri).await;
    let name_value: Option<Value> = final_state
        .pointer("/name")
        .or_else(|| final_state.pointer("/name"))
        .cloned();

    assert_eq!(name_value, Some(json!("Alice")));
}
