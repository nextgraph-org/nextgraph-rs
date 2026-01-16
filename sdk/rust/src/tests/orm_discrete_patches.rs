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
        assert_json_eq, await_discrete_patches, create_discrete_doc, create_discrete_subscription,
        create_or_open_wallet::create_or_open_wallet,
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
            valType: None,
            value: Some(json!("root string")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someInteger"),
            valType: None,
            value: Some(json!(-25)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someFloat"),
            valType: None,
            value: Some(json!(0.1)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someBoolean"),
            valType: None,
            value: Some(json!(true)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someObject"),
            valType: None,
            value: Some(json!({})),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someObject/someString"),
            valType: None,
            value: Some(json!("nested string")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray"),
            valType: None,
            value: Some(json!([])),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/0"),
            valType: None,
            value: Some(json!(0)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/-"), // Append
            valType: None,
            value: Some(json!(1)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/2"),
            valType: None,
            value: Some(json!("2")), // Third element of type string
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/3"),
            valType: None,
            value: Some(json!({})), // Object in array
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/3/stringInArrayInObject"),
            valType: None,
            value: Some(json!("in object in array")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/3/someInteger"),
            valType: None,
            value: Some(json!(42)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/4"),
            valType: None,
            value: Some(json!([])), // Array in array
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/4/-"), // Append to array in array
            valType: None,
            value: Some(json!(1)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someArray/0"), // Prepend to all other values in array
            valType: None,
            value: Some(json!(-1)),
        },
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("/someArray/1"), // Remove second element
            valType: None,
            value: None,
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/toOverwrite"),
            valType: None,
            value: Some(json!("overwrite me")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/toOverwrite"),
            valType: None,
            value: Some(json!(42)), // Change data type.
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/toOverwrite"),
            valType: None,
            value: Some(json!("overwritten")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/someNull"),
            valType: None,
            value: Some(Value::Null),
        },
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("/removeMe"),
            valType: None,
            value: Some(json!({})),
        },
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("/removeMe"),
            valType: None,
            value: None,
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
            valType: None,
            value: Some(Value::Null),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/someInteger".into(),
            valType: None,
            value: Some(json!(-25)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/someArray".into(),
            valType: None,
            value: Some(json!([
                -1,
                1,
                "2",
                {"stringInArrayInObject": "in object in array", "someInteger": 42, "@id": origin_id},
                [1]
            ])),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/someBoolean".into(),
            valType: None,
            value: Some(json!(true)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/toOverwrite".into(),
            valType: None,
            value: Some(json!("overwritten")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/someFloat".into(),
            valType: None,
            value: Some(json!(0.1)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/someString".into(),
            valType: None,
            value: Some(json!("root string")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/someObject".into(),
            valType: None,
            value: Some(json!({"someString": "nested string"})),
        },
    ];

    let mut expected_json = serde_json::to_value(&expected_emitted).unwrap();
    let mut got_json = serde_json::to_value(&got_patches).unwrap();
    assert_json_eq(&mut expected_json, &mut got_json);

    let (mut initial_value_3, receiver_3, subscription_id_3) =
        create_discrete_subscription(session_id, &nuri).await;

    let initial_id = initial_value_3
        .get("someArray")
        .and_then(|arr| arr.get(3))
        .and_then(|obj| obj.get("@id"))
        .and_then(|v| v.as_str())
        .expect("@id missing in initial snapshot");
    assert!(initial_id.starts_with("did:ng:o"));

    assert_json_eq(
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
        valType: None,
        value: Some(json!({})),
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
        valType: None,
        value: None,
    })
    .collect::<Vec<_>>();

    let mut expected_patches_json = serde_json::to_value(&expected_patches).unwrap();
    let mut got_patches_json = serde_json::to_value(&got_patches).unwrap();
    assert_json_eq(&mut expected_patches_json, &mut got_patches_json);

    let (mut initial_value_4, receiver_4, subscription_id_4) =
        create_discrete_subscription(session_id, &nuri).await;

    assert_json_eq(&mut json!({}), &mut initial_value_4);
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
            valType: None,
            value: Some(json!(2)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/-"),
            valType: None,
            value: Some(json!(3)),
        },
        // Prepend
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/0"),
            valType: None,
            value: Some(json!(0)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/1"),
            valType: None,
            value: Some(json!(1)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/4"),
            valType: None,
            value: Some(json!("4")), // String in array
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/5"),
            valType: None,
            value: Some(json!({})),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/5/someString"),
            valType: None,
            value: Some(json!("some string")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/5/someNumber"),
            valType: None,
            value: Some(json!(42)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/6"),
            valType: None,
            value: Some(json!([])),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/7"),
            valType: None,
            value: Some(json!(false)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/8"),
            valType: None,
            value: Some(json!("remove me")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("/-"),
            valType: None,
            value: Some(Value::Null),
        },
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("/8"),
            valType: None,
            value: None,
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
            valType: None,
            value: Some(json!(0)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/1".into(),
            valType: None,
            value: Some(json!(1)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/2".into(),
            valType: None,
            value: Some(json!(2)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/3".into(),
            valType: None,
            value: Some(json!(3)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/4".into(),
            valType: None,
            value: Some(json!("4")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/5".into(),
            valType: None,
            value: Some(json!({"someString": "some string", "someNumber": 42, "@id": origin_id})),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/6".into(),
            valType: None,
            value: Some(json!([])),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/7".into(),
            valType: None,
            value: Some(json!(false)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/8".into(),
            valType: None,
            value: Some(Value::Null),
        },
    ];

    let mut expected_patches_json = serde_json::to_value(&expected_patches).unwrap();
    let mut got_patches_json = serde_json::to_value(&got_patches).unwrap();
    assert_json_eq(&mut expected_patches_json, &mut got_patches_json);

    let (mut initial_value_3, receiver_3, subscription_id_3) =
        create_discrete_subscription(session_id, &nuri).await;

    let initial_id = initial_value_3
        .as_array()
        .and_then(|arr| arr.get(5))
        .and_then(|obj| obj.get("@id"))
        .and_then(|v| v.as_str())
        .expect("@id missing in initial snapshot");
    assert!(initial_id.starts_with("did:ng:o"));

    assert_json_eq(
        &mut json!([0,1,2,3,"4", {"someString": "some string", "someNumber": 42, "@id": initial_id}, [], false, Value::Null]),
        &mut initial_value_3,
    );

    log_info!("=== Test replacing YArray at root ===");

    let applied_patches = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!(""),
        valType: None,
        value: Some(json!([])),
    }];

    orm_discrete_update(subscription_id_1, applied_patches.clone(), session_id)
        .await
        .expect("orm_update failed");

    let got_patches = await_discrete_patches(&mut receiver_2).await;

    let expected_emitted = (0..9)
        .map(|_| OrmPatch {
            op: OrmPatchOp::remove,
            path: "/0".into(),
            valType: None,
            value: None,
        })
        .collect::<Vec<_>>();

    let mut expected_json = serde_json::to_value(&expected_emitted).unwrap();
    let mut got_json = serde_json::to_value(&got_patches).unwrap();
    assert_json_eq(&mut expected_json, &mut got_json);

    let (mut initial_value_4, receiver_4, subscription_id_4) =
        create_discrete_subscription(session_id, &nuri).await;

    assert_json_eq(&mut json!([]), &mut initial_value_4);
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
            valType: None,
            value: Some(json!("some string")),
        }],
        session_id,
    )
    .await;

    let (initial_value_1, receiver_2, subscription_id_2) =
        create_discrete_subscription(session_id, &nuri).await;

    let applied_patches = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!(""),
        valType: None,
        value: Some(json!([])), // Illegal value - must be object.
    }];

    let update_res =
        orm_discrete_update(subscription_id_1, applied_patches.clone(), session_id).await;

    assert!(update_res.is_err());

    let (mut initial_value_2, receiver_3, subscription_id_3) =
        create_discrete_subscription(session_id, &nuri).await;

    assert_json_eq(
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
            valType: None,
            value: Some(json!("first value")),
        }],
        session_id,
    )
    .await;

    let (initial_value_1, receiver_2, subscription_id_2) =
        create_discrete_subscription(session_id, &nuri).await;

    let applied_patches = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!(""),
        valType: None,
        value: Some(json!({})), // Illegal value - should be an array.
    }];

    let update_res =
        orm_discrete_update(subscription_id_1, applied_patches.clone(), session_id).await;

    assert!(update_res.is_err());

    let (mut initial_value_2, receiver_3, subscription_id_3) =
        create_discrete_subscription(session_id, &nuri).await;

    // Object should be as before
    assert_json_eq(&mut json!(["first value"]), &mut initial_value_2);
}
