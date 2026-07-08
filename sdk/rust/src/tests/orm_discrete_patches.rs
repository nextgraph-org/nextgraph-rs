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
use ng_repo::log::*;
use serde_json::{json, Value};

use crate::{
    local_broker::orm_discrete_update,
    tests::{
        assert_orm_json_eq, await_discrete_patches, create_discrete_doc,
        create_discrete_subscription, create_or_open_wallet::create_or_open_wallet,
    },
};

#[async_std::test]
async fn test_orm_apply_patches() {
    // Setup wallet and document
    let (_wallet, session_id) = create_or_open_wallet().await;

    // Tests below all in this test, to prevent waiting times through wallet creation.
    log_info!("=== Testing YMap ===");
    test_y_map(session_id).await;

    log_info!("=== Testing YArray ===");
    test_y_array(session_id).await;

    log_info!("=== Testing YArray wrong assignment ===");
    test_y_map_wrong_assignment(session_id).await;

    log_info!("=== Testing YMap wrong assignment ===");
    test_y_array_wrong_assignment(session_id).await;

    log_info!("=== Testing Automerge ===");
    test_automerge(session_id).await;

    log_info!("=== Testing Automerge wrong assignment ===");
    test_automerge_wrong_assignment(session_id).await;
}

async fn test_y_map(session_id: u64) {
    let (subscription_id_1, mut receiver_1, nuri) =
        create_discrete_doc(session_id, "YMap".into()).await;

    let (initial_value_1, mut receiver_2, subscription_id_2) =
        create_discrete_subscription(session_id, &nuri).await;

    // Should be an empty object
    assert!(initial_value_1
        .as_object()
        .map(|val| val.keys().len() == 0)
        .unwrap_or(false));

    let applied_patches = vec![
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someString"),
            value: Some(json!("root string")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someInteger"),
            value: Some(json!(-25)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someFloat"),
            value: Some(json!(0.1)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someBoolean"),
            value: Some(json!(true)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someObject"),
            value: Some(json!({})),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someObject/someString"),
            value: Some(json!("nested string")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray"),
            value: Some(json!([])),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/0"),
            value: Some(json!(0)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/-"), // Append
            value: Some(json!(1)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/2"),
            value: Some(json!("2")), // Third element of type string
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/3"),
            value: Some(json!({})), // Object in array
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/3/stringInArrayInObject"),
            value: Some(json!("in object in array")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/3/someInteger"),
            value: Some(json!(42)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/4"),
            value: Some(json!([])), // Array in array
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/4/-"), // Append to array in array
            value: Some(json!(1)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/0"), // Prepend to all other values in array
            value: Some(json!(-1)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("/someArray/1"), // Remove second element
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/toOverwrite"),
            value: Some(json!("overwrite me")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/toOverwrite"),
            value: Some(json!(42)), // Change data type.
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/toOverwrite"),
            value: Some(json!("overwritten")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someNull"),
            value: Some(Value::Null),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("/removeMe"),
            value: Some(json!({})),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("/removeMe"),
            ..Default::default()
        },
    ];

    orm_discrete_update(subscription_id_1, applied_patches.clone(), session_id)
        .await
        .expect("orm_update failed");

    let got_patches = await_discrete_patches(&mut receiver_2).await;

    // Patch creator should get only the enriched @id patch back.
    let origin_id_patches = await_discrete_patches(&mut receiver_1).await;
    assert_eq!(origin_id_patches.len(), 1);
    assert_eq!(origin_id_patches[0].path, "/someArray/3/@id");
    let origin_id = origin_id_patches[0]
        .value
        .as_ref()
        .and_then(|v| v.as_str())
        .expect("@id missing in origin patch");
    assert!(origin_id.starts_with("did:ng:o"));

    let expected_emitted = vec![
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/someNull".into(),
            value: Some(Value::Null),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/someInteger".into(),
            value: Some(json!(-25)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/someArray".into(),
            value: Some(json!([
                -1,
                1,
                "2",
                {"stringInArrayInObject": "in object in array", "someInteger": 42, "@id": origin_id},
                [1]
            ])),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/someBoolean".into(),
            value: Some(json!(true)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/toOverwrite".into(),
            value: Some(json!("overwritten")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/someFloat".into(),
            value: Some(json!(0.1)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/someString".into(),
            value: Some(json!("root string")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/someObject".into(),
            value: Some(json!({"someString": "nested string"})),
            ..Default::default()
        },
    ];

    let mut expected_json = serde_json::to_value(&expected_emitted).unwrap();
    let mut got_json = serde_json::to_value(&got_patches).unwrap();
    assert_orm_json_eq(&mut expected_json, &mut got_json);

    let (mut initial_value_3, receiver_3, subscription_id_3) =
        create_discrete_subscription(session_id, &nuri).await;

    let initial_id = initial_value_3
        .get("someArray")
        .and_then(|arr| arr.get(3))
        .and_then(|obj| obj.get("@id"))
        .and_then(|v| v.as_str())
        .expect("@id missing in initial snapshot");
    assert!(initial_id.starts_with("did:ng:o"));

    assert_orm_json_eq(
        &mut json!({
          "someString": "root string",
          "someInteger": -25,
          "someFloat": 0.1,
          "someBoolean": true,
          "someObject": {
            "someString": "nested string"
          },
        "someArray": [
            -1,
            1,
            "2",
            {
                "stringInArrayInObject": "in object in array",
                "someInteger": 42,
                "@id": initial_id
            },
            [
                1
            ]
        ],
          "toOverwrite": "overwritten",
          "someNull": null
        }),
        &mut initial_value_3,
    );

    //
    log_info!("=== Test replacing YMap at root ===");
    //

    let applied_patches = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!(""),
        value: Some(json!({})),
        ..Default::default()
    }];

    orm_discrete_update(subscription_id_1, applied_patches.clone(), session_id)
        .await
        .expect("orm_update failed");

    let got_patches = await_discrete_patches(&mut receiver_2).await;
    let expected_patches = vec![
        "/someArray",
        "/someBoolean",
        "/someFloat",
        "/someInteger",
        "/someNull",
        "/someObject",
        "/someString",
        "/toOverwrite",
    ]
    .into_iter()
    .map(|path| OrmPatch {
        op: OrmPatchOp::remove,
        path: path.into(),
        ..Default::default()
    })
    .collect::<Vec<_>>();

    let mut expected_patches_json = serde_json::to_value(&expected_patches).unwrap();
    let mut got_patches_json = serde_json::to_value(&got_patches).unwrap();
    assert_orm_json_eq(&mut expected_patches_json, &mut got_patches_json);

    let (mut initial_value_4, receiver_4, subscription_id_4) =
        create_discrete_subscription(session_id, &nuri).await;

    assert_orm_json_eq(&mut json!({}), &mut initial_value_4);
}

async fn test_y_array(session_id: u64) {
    let (subscription_id_1, mut receiver_1, nuri) =
        create_discrete_doc(session_id, "YArray".into()).await;

    let (initial_value_1, mut receiver_2, subscription_id_2) =
        create_discrete_subscription(session_id, &nuri).await;

    // Should be an empty array.
    assert!(initial_value_1
        .as_array()
        .map(|val| val.len() == 0)
        .unwrap_or(false));

    let applied_patches = vec![
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/-"),
            value: Some(json!(2)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/-"),
            value: Some(json!(3)),
            ..Default::default()
        },
        // Prepend
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/0"),
            value: Some(json!(0)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/1"),
            value: Some(json!(1)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/4"),
            value: Some(json!("4")), // String in array
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/5"),
            value: Some(json!({})),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/5/someString"),
            value: Some(json!("some string")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/5/someNumber"),
            value: Some(json!(42)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/6"),
            value: Some(json!([])),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/7"),
            value: Some(json!(false)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/8"),
            value: Some(json!("remove me")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/-"),
            value: Some(Value::Null),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("/8"),
            ..Default::default()
        },
    ];

    orm_discrete_update(subscription_id_1, applied_patches.clone(), session_id)
        .await
        .expect("orm_update failed");

    let got_patches = await_discrete_patches(&mut receiver_2).await;

    let origin_id_patches = await_discrete_patches(&mut receiver_1).await;
    assert_eq!(origin_id_patches.len(), 1);
    assert_eq!(origin_id_patches[0].path, "/5/@id");
    let origin_id = origin_id_patches[0]
        .value
        .as_ref()
        .and_then(|v| v.as_str())
        .expect("@id missing in origin patch");
    assert!(origin_id.starts_with("did:ng:o"));

    let expected_patches = vec![
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/0".into(),
            value: Some(json!(0)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/1".into(),
            value: Some(json!(1)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/2".into(),
            value: Some(json!(2)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/3".into(),
            value: Some(json!(3)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/4".into(),
            value: Some(json!("4")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/5".into(),
            value: Some(json!({"someString": "some string", "someNumber": 42, "@id": origin_id})),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/6".into(),
            value: Some(json!([])),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/7".into(),
            value: Some(json!(false)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/8".into(),
            value: Some(Value::Null),
            ..Default::default()
        },
    ];

    let mut expected_patches_json = serde_json::to_value(&expected_patches).unwrap();
    let mut got_patches_json = serde_json::to_value(&got_patches).unwrap();
    assert_orm_json_eq(&mut expected_patches_json, &mut got_patches_json);

    let (mut initial_value_3, receiver_3, subscription_id_3) =
        create_discrete_subscription(session_id, &nuri).await;

    let initial_id = initial_value_3
        .as_array()
        .and_then(|arr| arr.get(5))
        .and_then(|obj| obj.get("@id"))
        .and_then(|v| v.as_str())
        .expect("@id missing in initial snapshot");
    assert!(initial_id.starts_with("did:ng:o"));

    assert_orm_json_eq(
        &mut json!([0,1,2,3,"4", {"someString": "some string", "someNumber": 42, "@id": initial_id}, [], false, Value::Null]),
        &mut initial_value_3,
    );

    log_info!("=== Test replacing YArray at root ===");

    let applied_patches = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!(""),
        value: Some(json!([])),
        ..Default::default()
    }];

    orm_discrete_update(subscription_id_1, applied_patches.clone(), session_id)
        .await
        .expect("orm_update failed");

    let got_patches = await_discrete_patches(&mut receiver_2).await;

    let expected_emitted = (0..9)
        .map(|_| OrmPatch {
            op: OrmPatchOp::remove,
            path: "/0".into(),
            ..Default::default()
        })
        .collect::<Vec<_>>();

    let mut expected_json = serde_json::to_value(&expected_emitted).unwrap();
    let mut got_json = serde_json::to_value(&got_patches).unwrap();
    assert_orm_json_eq(&mut expected_json, &mut got_json);

    let (mut initial_value_4, receiver_4, subscription_id_4) =
        create_discrete_subscription(session_id, &nuri).await;

    assert_orm_json_eq(&mut json!([]), &mut initial_value_4);
}

async fn test_y_map_wrong_assignment(session_id: u64) {
    let (subscription_id_1, receiver_1, nuri) =
        create_discrete_doc(session_id, "YMap".into()).await;

    // Initialize object with `{someString: "some string"}`.
    orm_discrete_update(
        subscription_id_1,
        vec![OrmPatch {
            op: OrmPatchOp::add,
            path: "/someString".into(),
            value: Some(json!("some string")),
            ..Default::default()
        }],
        session_id,
    )
    .await;

    let (initial_value_1, receiver_2, subscription_id_2) =
        create_discrete_subscription(session_id, &nuri).await;

    let applied_patches = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!(""),
        value: Some(json!([])), // Illegal value - must be object.
        ..Default::default()
    }];

    let update_res =
        orm_discrete_update(subscription_id_1, applied_patches.clone(), session_id).await;

    assert!(update_res.is_err());

    let (mut initial_value_2, receiver_3, subscription_id_3) =
        create_discrete_subscription(session_id, &nuri).await;

    assert_orm_json_eq(
        &mut json!({"someString": "some string"}),
        &mut initial_value_2,
    );
}

async fn test_y_array_wrong_assignment(session_id: u64) {
    let (subscription_id_1, receiver_1, nuri) =
        create_discrete_doc(session_id, "YArray".into()).await;

    // Initialize object with {someString: "some string"}.
    orm_discrete_update(
        subscription_id_1,
        vec![OrmPatch {
            op: OrmPatchOp::add,
            path: "/0".into(),
            value: Some(json!("first value")),
            ..Default::default()
        }],
        session_id,
    )
    .await;

    let (initial_value_1, receiver_2, subscription_id_2) =
        create_discrete_subscription(session_id, &nuri).await;

    let applied_patches = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!(""),
        value: Some(json!({})), // Illegal value - should be an array.
        ..Default::default()
    }];

    let update_res =
        orm_discrete_update(subscription_id_1, applied_patches.clone(), session_id).await;

    assert!(update_res.is_err());

    let (mut initial_value_2, receiver_3, subscription_id_3) =
        create_discrete_subscription(session_id, &nuri).await;

    // Object should be as before
    assert_orm_json_eq(&mut json!(["first value"]), &mut initial_value_2);
}

async fn test_automerge(session_id: u64) {
    let (subscription_id_1, mut receiver_1, nuri) =
        create_discrete_doc(session_id, "Automerge".into()).await;

    let (initial_value_1, mut receiver_2, subscription_id_2) =
        create_discrete_subscription(session_id, &nuri).await;

    // Should be an empty object
    assert!(initial_value_1
        .as_object()
        .map(|val| val.keys().len() == 0)
        .unwrap_or(false));

    let applied_patches = vec![
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someString"),
            value: Some(json!("root string")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someInteger"),
            value: Some(json!(-25)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someFloat"),
            value: Some(json!(0.1)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someBoolean"),
            value: Some(json!(true)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someObject"),
            value: Some(json!({})),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someObject/someString"),
            value: Some(json!("nested string")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray"),
            value: Some(json!([])),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/0"),
            value: Some(json!(0)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/-"), // Append
            value: Some(json!(1)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/2"),
            value: Some(json!("2")), // Third element of type string
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/3"),
            value: Some(json!({})), // Object in array
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/3/stringInArrayInObject"),
            value: Some(json!("in object in array")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/3/someInteger"),
            value: Some(json!(42)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/4"),
            value: Some(json!([])), // Array in array
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/4/-"), // Append to array in array
            value: Some(json!(1)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/0"), // Prepend to all other values in array
            value: Some(json!(-1)),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("/someArray/1"), // Remove second element
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/toOverwrite"),
            value: Some(json!("overwrite me")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/toOverwrite"),
            value: Some(json!(42)), // Change data type.
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/toOverwrite"),
            value: Some(json!("overwritten")),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someNull"),
            value: Some(Value::Null),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("/removeMe"),
            value: Some(json!({})),
            ..Default::default()
        },
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("/removeMe"),
            ..Default::default()
        },
    ];

    orm_discrete_update(subscription_id_1, applied_patches.clone(), session_id)
        .await
        .expect("orm_update failed");

    let got_patches = await_discrete_patches(&mut receiver_2).await;

    // Patch creator should get only the enriched @id patch back.
    let origin_id_patches = await_discrete_patches(&mut receiver_1).await;
    assert_eq!(origin_id_patches.len(), 1);
    assert_eq!(origin_id_patches[0].path, "/someArray/3/@id");
    let origin_id = origin_id_patches[0]
        .value
        .as_ref()
        .and_then(|v| v.as_str())
        .expect("@id missing in origin patch");
    assert!(origin_id.starts_with("did:ng:o"));

    let mut expected_json = json!([
        { "op": "add", "path": "/someString", "value": "root string" },
        { "op": "add", "path": "/someInteger", "value": -25 },
        { "op": "add", "path": "/someFloat", "value": 0.1 },
        { "op": "add", "path": "/someBoolean", "value": true },
        { "op": "add", "path": "/someObject", "value": {} },
        { "op": "add", "path": "/someArray", "value": [] },
        { "op": "add", "path": "/toOverwrite", "value": "overwrite me" },
        { "op": "add", "path": "/toOverwrite", "value": 42 },
        { "op": "add", "path": "/toOverwrite", "value": "overwritten" },
        { "op": "add", "path": "/someNull", "value": null },
        { "op": "add", "path": "/someObject/someString", "value": "nested string" },
        { "op": "add", "path": "/someArray/0", "value": -1 },
        { "op": "add", "path": "/someArray/1", "value": 1 },
        { "op": "add", "path": "/someArray/2", "value": "2" },
        {
            "op": "add",
            "path": "/someArray/3",
            "value": {
            "@id": origin_id
            }
        },
        { "op": "add", "path": "/someArray/4", "value": [] },
        {
            "op": "add",
            "path": "/someArray/3/stringInArrayInObject",
            "value": "in object in array"
        },
        { "op": "add", "path": "/someArray/3/someInteger", "value": 42 },
        { "op": "add", "path": "/someArray/4/0", "value": 1 }
    ]);
    let mut got_json = serde_json::to_value(&got_patches).unwrap();

    assert_orm_json_eq(&mut expected_json, &mut got_json);

    let (mut initial_value_3, receiver_3, subscription_id_3) =
        create_discrete_subscription(session_id, &nuri).await;

    let initial_id = initial_value_3
        .get("someArray")
        .and_then(|arr| arr.get(3))
        .and_then(|obj| obj.get("@id"))
        .and_then(|v| v.as_str())
        .expect("@id missing in initial snapshot");
    assert!(initial_id.starts_with("did:ng:o"));

    assert_orm_json_eq(
        &mut json!({
          "someString": "root string",
          "someInteger": -25,
          "someFloat": 0.1,
          "someBoolean": true,
          "someObject": {
            "someString": "nested string"
          },
        "someArray": [
            -1,
            1,
            "2",
            {
                "stringInArrayInObject": "in object in array",
                "someInteger": 42,
                "@id": initial_id
            },
            [
                1
            ]
        ],
          "toOverwrite": "overwritten",
          "someNull": null
        }),
        &mut initial_value_3,
    );

    //
    log_info!("=== Test replacing Automerge at root ===");
    //

    let applied_patches = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!(""),
        value: Some(json!({})),
        ..Default::default()
    }];

    orm_discrete_update(subscription_id_1, applied_patches.clone(), session_id)
        .await
        .expect("orm_update failed");

    let got_patches = await_discrete_patches(&mut receiver_2).await;
    let expected_patches = vec![
        "/someArray",
        "/someBoolean",
        "/someFloat",
        "/someInteger",
        "/someNull",
        "/someObject",
        "/someString",
        "/toOverwrite",
    ]
    .into_iter()
    .map(|path| OrmPatch {
        op: OrmPatchOp::remove,
        path: path.into(),
        ..Default::default()
    })
    .collect::<Vec<_>>();

    let mut expected_patches_json = serde_json::to_value(&expected_patches).unwrap();
    let mut got_patches_json = serde_json::to_value(&got_patches).unwrap();
    assert_orm_json_eq(&mut expected_patches_json, &mut got_patches_json);

    let (mut initial_value_4, receiver_4, subscription_id_4) =
        create_discrete_subscription(session_id, &nuri).await;

    assert_orm_json_eq(&mut json!({}), &mut initial_value_4);
}

async fn test_automerge_wrong_assignment(session_id: u64) {
    let (subscription_id_1, receiver_1, nuri) =
        create_discrete_doc(session_id, "Automerge".into()).await;

    // Initialize object with `{someString: "some string"}`.
    orm_discrete_update(
        subscription_id_1,
        vec![OrmPatch {
            op: OrmPatchOp::add,
            path: "/someString".into(),
            value: Some(json!("some string")),
            ..Default::default()
        }],
        session_id,
    )
    .await;

    let (initial_value_1, receiver_2, subscription_id_2) =
        create_discrete_subscription(session_id, &nuri).await;

    let applied_patches = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!(""),
        value: Some(json!([])), // Illegal value - must be object.
        ..Default::default()
    }];

    let update_res =
        orm_discrete_update(subscription_id_1, applied_patches.clone(), session_id).await;

    assert!(update_res.is_err());

    let (mut initial_value_2, receiver_3, subscription_id_3) =
        create_discrete_subscription(session_id, &nuri).await;

    assert_orm_json_eq(
        &mut json!({"someString": "some string"}),
        &mut initial_value_2,
    );
}
