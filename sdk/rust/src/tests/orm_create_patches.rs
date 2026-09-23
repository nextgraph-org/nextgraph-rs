// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use crate::local_broker::{doc_sparql_update, orm_update};
use crate::tests::create_or_open_wallet::create_or_open_wallet;
use crate::tests::test_schemas::create_house_schema;
use crate::tests::{
    add_graph_fields, assert_json_eq, assert_orm_json_eq, assert_orm_json_eq_exact,
    augment_expected_with_graph_fields, await_graph_patches, await_graph_patches_empty_if_timeout,
    composite_key, create_doc_with_data, create_orm_connection, create_orm_connection_with_conf,
    extract_graph_from_actual_paths, rewrite_expected_paths_with_graph, root_path,
};
use async_std::future::timeout;
use async_std::stream::StreamExt;
use ng_net::app_protocol::{AppResponse, AppResponseV0};
use ng_net::orm::{
    BasicType, OrmPatch, OrmPatchOp, OrmSchemaDataType, OrmSchemaPredicate, OrmSchemaShape,
    OrmSchemaValType, OrmShapeType,
};
use std::hint;
use std::time::{Duration, Instant};

use ng_repo::log::*;
use serde_json::json;
use std::collections::HashMap;

// #![feature(test)]
// extern crate test;
// use test::Bencher
// #[bench]
// async fn test_orm_patch_creation(b: &mut Bencher) {
// #[async_std::test]
async fn _bench_orm_patch_creation() {
    let (_wallet, session_id) = create_or_open_wallet().await;

    bench_test_add_remove_move_in_plain_sorted(session_id).await;
    // bench_test_add_remove_move_in_plain_sorted(session_id, &mut b).await;

    bench_nested(session_id).await;

    bench_apply_patches(session_id).await;

    bench_initialization(session_id).await;

    // Do this so the actually printed lines are written to stdio.
    print!("dividing by zero");
    let m = 1 / 0;
}

#[async_std::test]
async fn test_orm_patch_creation() {
    // Setup wallet and document
    let (_wallet, session_id) = create_or_open_wallet().await;

    test_nested_inserted_before_root(session_id).await;

    test_invalid_root_becomes_valid(session_id).await;

    test_invalid_child_becomes_valid(session_id).await;

    test_patch_nested_house_inhabitants(session_id).await;

    test_patch_add_array(session_id).await;

    test_patch_remove_array(session_id).await;

    test_cross_graph_child_in_separate_graph(session_id).await;

    // _test_patch_add_nested_1(session_id).await;  // TODO: Edge case not yet fully implemented

    test_patch_scope_correct(session_id).await;

    test_add_root_in_separate_graph(session_id).await;

    test_ordered_with_nested_children(session_id).await;

    test_add_remove_move_in_plain_sorted(session_id).await;

    test_add_remove_move_in_pagination(session_id).await;

    test_add_remove_move_in_pagination_grow_mode(session_id).await;
}

/// An object that fails validation is not reported to the client. When a later update makes it
/// valid, the patch sends the whole object
async fn test_invalid_root_becomes_valid(session_id: u64) {
    log_info!("\n\n=== TEST: an object assembled over updates is materialized in full ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                ex:placeholder ex:bar 0 .
            }
        "#
        .to_string(),
    )
    .await;

    let shape_type = OrmShapeType {
        schema: create_house_schema(),
        shape: "http://example.org/HouseShape".to_string(),
    };

    let (mut receiver, _cancel_fn, _subscription_id, _initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Add house with no inhabitants (invalid).
    doc_sparql_update(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:assembledHouse>
                    a ex:House ;
                    ex:rootColor "blue" .
            }
            "#
        .to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("INSERT of the incomplete house failed");

    let patches = await_graph_patches_empty_if_timeout(&mut receiver).await;
    assert!(
        patches.is_empty(),
        "a house without inhabitants is invalid and must not be reported, got: {:?}",
        patches
    );

    // Add inhabitant to house -> house turns valid.
    doc_sparql_update(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:assembledPerson>
                    a ex:Person ;
                    ex:name "Grace" .

                <urn:test:assembledHouse>
                    ex:inhabitants <urn:test:assembledPerson> .
            }
            "#
        .to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("INSERT of the inhabitant failed");

    let patches = await_graph_patches(&mut receiver).await;

    // `type` and `rootColor` arrived while the house was invalid, so they are part of this
    // patch: the client has never been told about them.
    let mut expected = json!([
        {
            "op": "add",
            "path": "/",
            "valType": "set",
            "value": {
                "@id": "urn:test:assembledHouse",
                "type": "http://example.org/House",
                "rootColor": "blue",
                "inhabitants": {
                    "urn:test:assembledPerson": {
                        "@id": "urn:test:assembledPerson",
                        "type": "http://example.org/Person",
                        "name": "Grace"
                    }
                }
            }
        }
    ]);
    rewrite_expected_paths_with_graph(&mut expected, &doc_nuri);
    add_graph_fields(&mut expected, &doc_nuri);

    let mut actual = json!(patches);
    assert_orm_json_eq(&mut expected, &mut actual);

    log_info!("Test passed: object assembled over updates materialized in full");
}

/// When a reference to a valid child is added, the child materializes.
async fn test_invalid_child_becomes_valid(session_id: u64) {
    log_info!("\n\n=== TEST: an unreferenced child is materialized when linked ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                ex:placeholder ex:bar 0 .
            }
        "#
        .to_string(),
    )
    .await;

    let shape_type = OrmShapeType {
        schema: create_house_schema(),
        shape: "http://example.org/HouseShape".to_string(),
    };

    let (mut receiver, _cancel_fn, _subscription_id, _initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // 1) A valid house with one inhabitant.
    doc_sparql_update(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:childValidHouse>
                    a ex:House ;
                    ex:inhabitants <urn:test:childValidAnna> .

                <urn:test:childValidAnna>
                    a ex:Person ;
                    ex:name "Anna" .
            }
            "#
        .to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("INSERT of the house failed");

    let patches = await_graph_patches(&mut receiver).await;
    assert!(
        !patches.is_empty(),
        "the house is valid and should have been reported"
    );

    // 2) and 3) Bob is assembled over two updates while nothing references him.
    for statement in [
        "<urn:test:childValidBob> a ex:Person .",
        r#"<urn:test:childValidBob> ex:name "Bob" ."#,
    ] {
        doc_sparql_update(
            session_id,
            format!("PREFIX ex: <http://example.org/>\nINSERT DATA {{ {statement} }}"),
            Some(doc_nuri.clone()),
        )
        .await
        .expect("INSERT of the unreferenced person failed");

        let patches = await_graph_patches_empty_if_timeout(&mut receiver).await;
        assert!(
            patches.is_empty(),
            "a person nobody references is not a result, got: {:?}",
            patches
        );
    }

    // 4) The house takes him in.
    doc_sparql_update(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:childValidHouse> ex:inhabitants <urn:test:childValidBob> .
            }
            "#
        .to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("INSERT of the reference failed");

    let patches = await_graph_patches(&mut receiver).await;

    let mut expected = json!([
        {
            "op": "add",
            "path": "/urn:test:childValidHouse/inhabitants",
            "valType": "set",
            "value": {
                "@id": "urn:test:childValidBob",
                "type": "http://example.org/Person",
                "name": "Bob"
            }
        }
    ]);
    add_graph_fields(&mut expected, &doc_nuri);
    rewrite_expected_paths_with_graph(&mut expected, &doc_nuri);

    let mut actual = json!(patches);
    assert_orm_json_eq(&mut expected, &mut actual);

    log_info!("Test passed: unreferenced child materialized when linked");
}

/// Test nested objects inserted before the root that links them (in another graph) materializes.
async fn test_nested_inserted_before_root(session_id: u64) {
    log_info!("\n\n=== TEST: nested objects inserted before the root that links them ===\n");
    let doc_nuri: String = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:nestedFirstPerson>
                    a ex:Person ;
                    ex:name "Nina" ;
                    ex:hasCat <urn:test:nestedFirstCat> .

                <urn:test:nestedFirstCat>
                    a ex:Cat ;
                    ex:catName "Smokey" ;
                    ex:hasToy <urn:test:nestedFirstToy> .

                <urn:test:nestedFirstToy>
                    a ex:Toy ;
                    ex:toyName "Feather" .
            }
        "#
        .to_string(),
    )
    .await;

    let shape_type = OrmShapeType {
        schema: create_house_schema(),
        shape: "http://example.org/HouseShape".to_string(),
    };

    let (mut receiver, _cancel_fn, _subscription_id, _initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Insert root linking the person inserted above.
    doc_sparql_update(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:nestedFirstHouse>
                    a ex:House ;
                    ex:rootColor "green" ;
                    ex:inhabitants <urn:test:nestedFirstPerson> .
            }
            "#
        .to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("INSERT of root failed");

    let patches = await_graph_patches(&mut receiver).await;

    // Object must come in full.
    let mut expected = json!([
        {
            "op": "add",
            "path": "/",
            "valType": "set",
            "value": {
                "@id": "urn:test:nestedFirstHouse",
                "type": "http://example.org/House",
                "rootColor": "green",
                "inhabitants": {
                    "urn:test:nestedFirstPerson": {
                        "@id": "urn:test:nestedFirstPerson",
                        "type": "http://example.org/Person",
                        "name": "Nina",
                        "cat": {
                            "@id": "urn:test:nestedFirstCat",
                            "type": "http://example.org/Cat",
                            "name": "Smokey",
                            "toy": {
                                "urn:test:nestedFirstToy": {
                                    "@id": "urn:test:nestedFirstToy",
                                    "type": "http://example.org/Toy",
                                    "name": "Feather"
                                }
                            }
                        }
                    }
                }
            }
        }
    ]);
    add_graph_fields(&mut expected, &doc_nuri);
    rewrite_expected_paths_with_graph(&mut expected, &doc_nuri);

    let mut actual = json!(patches);
    assert_orm_json_eq(&mut expected, &mut actual);

    log_info!("Test passed: nested objects inserted before the root");
}

/// Test that when a root object references a child object that lives in a different graph,
/// the emitted patches use `childGraph|childSubject` for the child segment and include @graph.
async fn test_cross_graph_child_in_separate_graph(session_id: u64) {
    // Create a second document holding the child object (ensures a different graph)
    let child_doc_nuri = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:personX>
                    a ex:Person ;
                    ex:name "Xavier" .
            }
            "#
        .to_string(),
    )
    .await;

    // Create the root document with a Project that will reference the person in the other graph
    let parent_doc_nuri = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:project1>
                    a ex:Project .
            }
            "#
        .to_string(),
    )
    .await;

    // Define ORM schema: Project has members -> Person
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/ProjectShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/ProjectShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Project".to_string(),
                        )]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/members".to_string(),
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
                    readablePredicate: "members".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        literals: None,
                        shape: Some("http://example.org/PersonShape".to_string()),
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );

    schema.insert(
        "http://example.org/PersonShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/PersonShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Person".to_string(),
                        )]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/name".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 0,
                    readablePredicate: "name".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/ProjectShape".to_string(),
    };

    let (mut receiver, _cancel_fn, _subscription_id, _initial) =
        create_orm_connection(vec!["did:ng:i".to_string()], vec![], shape_type, session_id).await;

    // Link the person from the other document into the project's members (in the parent graph)
    doc_sparql_update(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:project1> ex:members <urn:test:personX> .
            }
            "#
        .to_string(),
        Some(parent_doc_nuri.clone()),
    )
    .await
    .expect("SPARQL update failed");

    loop {
        let res = timeout(Duration::from_secs(10), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for cross-graph GraphOrmUpdate"),
        };
        let app_response = match opt {
            Some(a) => a,
            None => panic!("ORM receiver closed before cross-graph GraphOrmUpdate"),
        };
        let patches = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::GraphOrmUpdate(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        // We expect a full child object materialization plus members set-add reference.
        let mut expected = json!([
            {
                "op": "add",
                "path": "/urn:test:project1/members",
                "valType": "set",
                "value": {
                    "@id": "urn:test:personX",
                    "@graph": child_doc_nuri,
                    "name": "Xavier",
                    "type": "http://example.org/Person"
                }
            },

        ]);

        let mut actual = json!(patches);

        // Rewrite paths with the root graph from actual.
        rewrite_expected_paths_with_graph(&mut expected, &parent_doc_nuri);

        assert_orm_json_eq(&mut expected, &mut actual);
        break;
    }
}

async fn test_patch_add_array(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:numArrayObj1> a ex:TestObject ;
                    ex:arr 1, 2, 3 .

                <urn:test:numArrayObj2> a ex:TestObject .

                <urn:test:numArrayObj3> a ex:TestObject ;
                    ex:unrelated ex:TestObject ;
                    ex:arr 1, 2 .
            }
            "#
        .to_string(),
    )
    .await;

    // Define the ORM schema
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/TestShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/TestShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/TestObject".to_string(),
                        )]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/arr".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::number,
                        literals: None,
                        shape: None,
                    }],
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
                    readablePredicate: "numArray".to_string(),
                }
                .into(),
            ],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/TestShape".to_string(),
    };

    let (mut receiver, cancel_fn, subscription_id, initial) =
        create_orm_connection(vec!["did:ng:i".to_string()], vec![], shape_type, session_id).await;

    // Add more data, remove some
    doc_sparql_update(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:numArrayObj1>
                    ex:arr 4 .

                <urn:test:numArrayObj2>
                    ex:arr 1, 2 .

                <urn:test:numArrayObj3>
                    ex:arr 3 .

                <urn:test:numArrayObj4>
                    a ex:TestObject ;
                    ex:arr 0 .
            }
            "#
        .to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("2nd SPARQL update failed");

    loop {
        let res = timeout(Duration::from_secs(10), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for GraphOrmUpdate in add_array test"),
        };
        let app_response = match opt {
            Some(a) => a,
            None => panic!("ORM receiver closed before GraphOrmUpdate in add_array test"),
        };
        let patches = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::GraphOrmUpdate(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        let mut expected = json!([
            {
                "op": "add",
                "path": "/",
                "valType": "set",
                "value": {
                    "@id": "urn:test:numArrayObj4",
                    "numArray": [0.0],
                    "type": "http://example.org/TestObject"
                }
            },
            {
                "op": "add",
                "valType": "set",
                "value": [4.0],
                "path": "/urn:test:numArrayObj1/numArray",

            },
            {
                "op": "add",
                "valType": "set",
                "value": [1.0,2.0],
                "path": "/urn:test:numArrayObj2/numArray",
            },
            {
                "op": "add",
                "valType": "set",
                "value": [3.0],
                "path": "/urn:test:numArrayObj3/numArray",
            },
        ]);

        let mut actual = json!(patches);
        if let Some(graph) = extract_graph_from_actual_paths(&actual) {
            rewrite_expected_paths_with_graph(&mut expected, &graph);
            add_graph_fields(&mut expected, &graph);
            augment_expected_with_graph_fields(&mut expected, &graph);
        }
        assert_orm_json_eq(&mut expected, &mut actual);

        break;
    }
}

async fn test_patch_remove_array(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:numArrayObj1> a ex:TestObject ;
                    ex:arr 1, 2, 3 .

                <urn:test:numArrayObj2> a ex:TestObject .

                <urn:test:numArrayObj3> a ex:TestObject ;
                    ex:unrelated ex:TestObject ;
                    ex:arr 1, 2 .
            }
            "#
        .to_string(),
    )
    .await;

    // Define the ORM schema
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/TestShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/TestShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/TestObject".to_string(),
                        )]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/arr".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::number,
                        literals: None,
                        shape: None,
                    }],
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
                    readablePredicate: "numArray".to_string(),
                }
                .into(),
            ],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/TestShape".to_string(),
    };

    let (mut receiver, cancel_fn, subscription_id, initial) =
        create_orm_connection(vec!["did:ng:i".to_string()], vec![], shape_type, session_id).await;

    // Add more data, remove some
    doc_sparql_update(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            DELETE DATA {
                <urn:test:numArrayObj1>
                    ex:arr 1 .
            }
            "#
        .to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("2nd SPARQL update failed");

    loop {
        let res = timeout(Duration::from_secs(10), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for GraphOrmUpdate in remove_array test"),
        };
        let app_response = match opt {
            Some(a) => a,
            None => panic!("ORM receiver closed before GraphOrmUpdate in remove_array test"),
        };
        let patches = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::GraphOrmUpdate(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        let mut expected = json!([
            {
                "op": "remove",
                "valType": "set",
                "value": [1.0],
                "path": "/urn:test:numArrayObj1/numArray",

            }
        ]);

        let mut actual = json!(patches);
        if let Some(graph) = extract_graph_from_actual_paths(&actual) {
            rewrite_expected_paths_with_graph(&mut expected, &graph);
        }
        assert_orm_json_eq(&mut expected, &mut actual);

        break;
    }
}

/// Tests edge case that is an open TODO about a modified nested object
/// that changes so that another allowed shape becomes valid.
/// See handle_backend_update's TODO comment.
async fn _test_patch_add_nested_1(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:oj1> 
                    ex:multiNest <urn:test:multiNested1>, <urn:test:multiNested2> ;
                    ex:singleNest <urn:test:nested3> .

                <urn:test:multiNested1>
                    ex:multiNest1Str "a multi 1 string" .

                <urn:test:multiNested2>
                    ex:multiNest2Str "a multi 2 string" .

                <urn:test:nested3>
                    ex:singleNestStr "a single nest string" .
            }
            "#
        .to_string(),
    )
    .await;

    // Define the ORM schema
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/RootShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/RootShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://example.org/multiNest".to_string(),
                    extra: None,
                    maxCardinality: 6,
                    minCardinality: 1,
                    readablePredicate: "multiNest".to_string(),
                    dataTypes: vec![
                        OrmSchemaDataType {
                            valType: OrmSchemaValType::shape,
                            literals: None,
                            shape: Some("http://example.org/MultiNestShape1".to_string()),
                        },
                        OrmSchemaDataType {
                            valType: OrmSchemaValType::shape,
                            literals: None,
                            shape: Some("http://example.org/MultiNestShape2".to_string()),
                        },
                    ],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/singleNest".to_string(),
                    extra: Some(true),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "singleNest".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        literals: None,
                        shape: Some("http://example.org/SingleNestShape".to_string()),
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );
    schema.insert(
        "http://example.org/SingleNestShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/SingleNestShape".to_string(),
            predicates: vec![OrmSchemaPredicate {
                iri: "http://example.org/singleNestStr".to_string(),
                extra: None,
                readablePredicate: "str".to_string(),
                maxCardinality: 1,
                minCardinality: 1,
                dataTypes: vec![OrmSchemaDataType {
                    valType: OrmSchemaValType::string,
                    literals: None,
                    shape: None,
                }],
            }
            .into()],
        }
        .into(),
    );
    schema.insert(
        "http://example.org/MultiNestShape1".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/MultiNestShape1".to_string(),
            predicates: vec![OrmSchemaPredicate {
                iri: "http://example.org/multiNest1Str".to_string(),
                extra: None,
                readablePredicate: "string1".to_string(),
                maxCardinality: 1,
                minCardinality: 1,
                dataTypes: vec![OrmSchemaDataType {
                    valType: OrmSchemaValType::string,
                    literals: None,
                    shape: None,
                }],
            }
            .into()],
        }
        .into(),
    );
    schema.insert(
        "http://example.org/MultiNestShape2".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/MultiNestShape2".to_string(),
            predicates: vec![OrmSchemaPredicate {
                iri: "http://example.org/multiNest2Str".to_string(),
                extra: None,
                readablePredicate: "string2".to_string(),
                maxCardinality: 1,
                minCardinality: 1,
                dataTypes: vec![OrmSchemaDataType {
                    valType: OrmSchemaValType::string,
                    literals: None,
                    shape: None,
                }],
            }
            .into()],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/RootShape".to_string(),
    };

    let (mut receiver, cancel_fn, subscription_id, initial) =
        create_orm_connection(vec!["did:ng:i".to_string()], vec![], shape_type, session_id).await;
    loop {
        let res = timeout(Duration::from_secs(10), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for GraphOrmInitial in nested_house test"),
        };
        match opt {
            Some(app_response) => {
                let _ = match app_response {
                    AppResponse::V0(v) => match v {
                        AppResponseV0::GraphOrmInitial(json, sid) => Some(json),
                        _ => None,
                    },
                }
                .unwrap();
                break;
            }
            None => panic!("ORM receiver closed before GraphOrmInitial in nested_house test"),
        }
    }

    // Add more data, remove some
    doc_sparql_update(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:multiNested2>
        ex:multiNest1Str "replacing object shape view" .

    <urn:test:multiNested4>
        ex:multiNest2Str "multi 4 added" .

    <urn:test:nested3>
        ex:singleNestStr "Different nested val" .
}
"#
        .to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("2nd SPARQL update failed");

    loop {
        let res = timeout(Duration::from_secs(10), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for GraphOrmUpdate in nested_house test"),
        };
        let app_response = match opt {
            Some(a) => a,
            None => panic!("ORM receiver closed before GraphOrmUpdate in nested_house test"),
        };
        let patches = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::GraphOrmUpdate(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        let mut expected = json!([
            {
                "op": "remove",
                "path": "/urn:test:oj1/multiNest/urn:test:multiNested2/string2",
            },
            {
                "op": "add",
                "value": "replacing object shape view",
                "path": "/urn:test:oj1/multiNest/urn:test:multiNested2/string1",
            },
            {
                "op": "add",
                "value": {},
                "path": "/urn:test:oj1/multiNest/urn:test:multiNested4",
            },
            {
                "op": "add",
                "value": "urn:test:multiNested4",
                "path": "/urn:test:oj1/multiNest/urn:test:multiNested4/@id",
            },
            {
                "op": "add",
                "value": "multi 4 added",
                "path": "/urn:test:oj1/multiNest/urn:test:multiNested4/string2",
            },
            {
                "op": "add",
                "value": "Different nested val",
                "path": "/urn:test:oj1/singleNest/str",
            },
        ]);

        let mut actual = json!(patches);
        assert_orm_json_eq(&mut expected, &mut actual);

        break;
    }
}

/// Test nested modifications with House -> Person -> Cat hierarchy
async fn test_patch_nested_house_inhabitants(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:house1> 
        a ex:House ;
        ex:rootColor "blue" ;
        ex:inhabitants <urn:test:person1>, <urn:test:person2> .

    <urn:test:person1>
        a ex:Person ;
        ex:name "Alice" ;
        ex:hasCat <urn:test:cat1> .

    <urn:test:person2>
        a ex:Person ;
        ex:name "Bob" .

    <urn:test:cat1>
        a ex:Cat ;
        ex:catName "Whiskers" .
}

"#
        .to_string(),
    )
    .await;

    let house_schema = create_house_schema();

    let shape_type = OrmShapeType {
        schema: house_schema,
        shape: "http://example.org/HouseShape".to_string(),
    };

    let (mut receiver, _cancel_fn, _subscription_id, _initial) =
        create_orm_connection(vec!["did:ng:i".to_string()], vec![], shape_type, session_id).await;

    log_info!(
        "\n\n=== TEST 1: INSERT - Adding new person with cat, modifying existing properties ===\n"
    );

    // INSERT: Add a new person with a cat, modify house color, modify existing person's name, add cat to Bob
    doc_sparql_update(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
DELETE DATA {
    <urn:test:house1> ex:rootColor "blue" .
    <urn:test:person1> ex:name "Alice" .
}
;
INSERT DATA {
    <urn:test:house1> 
        ex:rootColor "red" ;
        ex:inhabitants <urn:test:person3> .

    <urn:test:person1>
        ex:name "Alicia" .

    <urn:test:person2>
        ex:hasCat <urn:test:cat2> .

    <urn:test:person3>
        a ex:Person ;
        ex:name "Charlie" ;
        ex:hasCat <urn:test:cat3> .

    <urn:test:cat2>
        a ex:Cat ;
        ex:catName "Mittens" ;
        ex:hasToy <urn:test:toy2> .

    <urn:test:toy2>
        a ex:Toy ;
        ex:toyName "Mouse" .

    <urn:test:cat3>
        a ex:Cat ;
        ex:catName "Fluffy" ;
        ex:hasToy <urn:test:toy3> .

    <urn:test:toy3>
        a ex:Toy ;
        ex:toyName "Ball" .
}
"#
        .to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("INSERT SPARQL update failed");

    while let Some(app_response) = receiver.next().await {
        let patches = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::GraphOrmUpdate(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        let mut expected = json!([
            {
                "op": "add",
                "path": "/urn:test:house1/inhabitants",
                "valType": "set",
                "value": {
                    "@id": "urn:test:person3",
                    "cat": {
                        "@id": "urn:test:cat3",
                        "name": "Fluffy",
                        "toy": {
                            "urn:test:toy3": {
                                "@id": "urn:test:toy3",
                                "name": "Ball",
                                "type": "http://example.org/Toy"
                            }
                        },
                        "type": "http://example.org/Cat"
                    },
                    "name": "Charlie",
                    "type": "http://example.org/Person"
                },
            },
            {
                "op": "add",
                "path": "/urn:test:house1/inhabitants/urn:test:person1/name",
                "value": "Alicia"
            },
            {
                "op": "add",
                "path": "/urn:test:house1/inhabitants/urn:test:person2/cat",
                "value": {
                "@id": "urn:test:cat2",
                "name": "Mittens",
                "toy": {
                    "urn:test:toy2": {
                        "@id": "urn:test:toy2",
                        "name": "Mouse",
                        "type": "http://example.org/Toy"
                    }
                },
                "type": "http://example.org/Cat"
                }
            },
            {
                "op": "add",
                "path": "/urn:test:house1/rootColor",
                "value": "red"
            }
        ]);

        let mut actual = json!(patches);
        if let Some(graph) = extract_graph_from_actual_paths(&actual) {
            rewrite_expected_paths_with_graph(&mut expected, &graph);
            add_graph_fields(&mut expected, &graph);
        }
        assert_orm_json_eq(&mut expected, &mut actual);

        break;
    }

    // DELETE: Remove Whiskers, remove Charlie and his cat, modify cat name, remove house color
    doc_sparql_update(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
DELETE DATA {
    <urn:test:house1> 
        ex:rootColor "red" ;
        ex:inhabitants <urn:test:person3> .

    <urn:test:person1>
        ex:hasCat <urn:test:cat1> .

    <urn:test:person3>
        a ex:Person ;
        ex:name "Charlie" ;
        ex:hasCat <urn:test:cat3> .

    <urn:test:cat1>
        a ex:Cat ;
        ex:catName "Whiskers" .

    <urn:test:cat2>
        ex:catName "Mittens" .

    <urn:test:toy2>
        ex:toyName "Mouse" .

    <urn:test:cat3>
        a ex:Cat ;
        ex:catName "Fluffy" ;
        ex:hasToy <urn:test:toy3> .

    <urn:test:toy3>
        a ex:Toy ;
        ex:toyName "Ball" .
}
;
INSERT DATA {
    <urn:test:cat2>
        ex:catName "Mr. Mittens" .
    <urn:test:toy2>
        ex:toyName "Laser" .
}
"#
        .to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("DELETE SPARQL update failed");

    while let Some(app_response) = receiver.next().await {
        let patches = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::GraphOrmUpdate(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        let mut expected = json!([
            // Remove house color
            {
                "op": "remove",
                "path": "/urn:test:house1/rootColor",
            },
            // Alice loses her cat
            {
                "op": "remove",
                "path": "/urn:test:house1/inhabitants/urn:test:person1/cat"
            },
            // Bob's cat name changes
            {
                "op": "add",
                "value": "Mr. Mittens",
                "path": "/urn:test:house1/inhabitants/urn:test:person2/cat/name",
            },
            // Bob's cat toy name changes
            {
                "op": "add",
                "value": "Laser",
                "path": "/urn:test:house1/inhabitants/urn:test:person2/cat/toy/urn:test:toy2/name",
            },
            // Charlie is removed from inhabitants.
            {
                "op": "remove",
                "value": {},
                "path": "/urn:test:house1/inhabitants",
                "value": {"@id": "urn:test:person3"},
                "valType": "set"
            },
        ]);

        let mut actual = json!(patches);
        if let Some(graph) = extract_graph_from_actual_paths(&actual) {
            rewrite_expected_paths_with_graph(&mut expected, &graph);
        }
        assert_orm_json_eq(&mut expected, &mut actual);

        break;
    }
}

/// Test that replacing a SocialContact's name.value and updatedAt.valueDateTime emits add patches
/// without removing the name object (multi-valued child) and uses correct pathing.
#[async_std::test]
async fn test_contact_name_replacement_patches() {
    let (_wallet, session_id) = create_or_open_wallet().await;

    // Initial data: one contact with name and updatedAt objects
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
INSERT DATA {
    <urn:test:contact1>
        a <http://www.w3.org/2006/vcard/ns#Individual> ;
        <did:ng:x:contact#name> <urn:test:name1> ;
        <did:ng:x:contact#updatedAt> <urn:test:upd1> .

    <urn:test:name1>
        <did:ng:x:core#value> "Admin's friend - change4" .

    <urn:test:upd1>
        <did:ng:x:core#valueDateTime> "2025-11-13T15:42:18.332Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
}
"#
        .to_string(),
    )
    .await;

    // Define the ORM schema (only the necessary parts)
    let mut schema = HashMap::new();

    // SocialContact
    schema.insert(
        "did:ng:x:contact:class#SocialContact".to_string(),
        OrmSchemaShape {
            iri: "did:ng:x:contact:class#SocialContact".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(true),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "@type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://www.w3.org/2006/vcard/ns#Individual".to_string(),
                        )]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "did:ng:x:contact#name".to_string(),
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
                    readablePredicate: "name".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        literals: None,
                        shape: Some(
                            "did:ng:x:contact:class#SocialContact||did:ng:x:contact#name"
                                .to_string(),
                        ),
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "did:ng:x:contact#updatedAt".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 0,
                    readablePredicate: "updatedAt".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        literals: None,
                        shape: Some(
                            "did:ng:x:contact:class#SocialContact||did:ng:x:contact#updatedAt"
                                .to_string(),
                        ),
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );

    // Name shape
    schema.insert(
        "did:ng:x:contact:class#SocialContact||did:ng:x:contact#name".to_string(),
        OrmSchemaShape {
            iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#name".to_string(),
            predicates: vec![OrmSchemaPredicate {
                iri: "did:ng:x:core#value".to_string(),
                extra: Some(false),
                maxCardinality: 1,
                minCardinality: 0,
                readablePredicate: "value".to_string(),
                dataTypes: vec![OrmSchemaDataType {
                    valType: OrmSchemaValType::string,
                    literals: None,
                    shape: None,
                }],
            }
            .into()],
        }
        .into(),
    );

    // UpdatedAt shape (minimal)
    schema.insert(
        "did:ng:x:contact:class#SocialContact||did:ng:x:contact#updatedAt".to_string(),
        OrmSchemaShape {
            iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#updatedAt".to_string(),
            predicates: vec![OrmSchemaPredicate {
                iri: "did:ng:x:core#valueDateTime".to_string(),
                extra: Some(false),
                maxCardinality: 1,
                minCardinality: 0,
                readablePredicate: "valueDateTime".to_string(),
                dataTypes: vec![OrmSchemaDataType {
                    valType: OrmSchemaValType::string,
                    literals: None,
                    shape: None,
                }],
            }
            .into()],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "did:ng:x:contact:class#SocialContact".to_string(),
    };

    let (mut receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec!["did:ng:i".to_string()], vec![], shape_type, session_id).await;

    // Replace name.value and updatedAt.valueDateTime
    doc_sparql_update(
        session_id,
        r#"
DELETE DATA {
    <urn:test:name1> <did:ng:x:core#value> "Admin's friend - change4" .
    <urn:test:upd1> <did:ng:x:core#valueDateTime> "2025-11-13T15:42:18.332Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
} ;
INSERT DATA {
    <urn:test:name1> <did:ng:x:core#value> "Admin's friend - change5" .
    <urn:test:upd1> <did:ng:x:core#valueDateTime> "2025-11-13T15:49:41.013Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
}
"#
        .to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL update failed");

    // Expect two add patches (no object removal for name)
    loop {
        let res = timeout(Duration::from_secs(10), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for GraphOrmUpdate"),
        };
        let app_response = match opt {
            Some(a) => a,
            None => panic!("ORM receiver closed before GraphOrmUpdate"),
        };
        let patches = match app_response {
            AppResponse::V0(AppResponseV0::GraphOrmUpdate(json)) => json,
            _ => continue,
        };

        let mut expected = json!([
            {
                "op": "add",
                "path": "/urn:test:contact1/name/urn:test:name1/value",
                "value": "Admin's friend - change5"
            },
            {
                "op": "add",
                "path": "/urn:test:contact1/updatedAt/valueDateTime",
                "value": "2025-11-13T15:49:41.013Z"
            }
        ]);

        let mut actual = json!(patches);
        if let Some(graph) = extract_graph_from_actual_paths(&actual) {
            rewrite_expected_paths_with_graph(&mut expected, &graph);
        }

        assert_orm_json_eq(&mut expected, &mut actual);
        break;
    }
}

async fn test_patch_scope_correct(session_id: u64) {
    // Create a second document holding the child object (ensures a different graph)
    let child_doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:personX0>
        a ex:Person ;
        ex:name "Xavier" .
}
"#
        .to_string(),
    )
    .await;

    // Create the root document with a Project that will reference the person in the other graph
    let parent_doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:project1>
        a ex:Project .
    
    <urn:test:project2>
        a ex:Project .
    
}
"#
        .to_string(),
    )
    .await;

    // Create a root document that's not in the scope
    let unrelated_doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:project1>
        ex:members <urn:test:personX1> ;
        a ex:Project .
    <urn:test:personX1>
        a ex:Person ;
        ex:name "Xavier2" .
}
"#
        .to_string(),
    )
    .await;

    // Define ORM schema: Project has members -> Person
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/ProjectShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/ProjectShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Project".to_string(),
                        )]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/members".to_string(),
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
                    readablePredicate: "members".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        literals: None,
                        shape: Some("http://example.org/PersonShape".to_string()),
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );

    schema.insert(
        "http://example.org/PersonShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/PersonShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Person".to_string(),
                        )]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/name".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 0,
                    readablePredicate: "name".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/ProjectShape".to_string(),
    };

    let (mut receiver, _cancel_fn, subscription_id, initial) = create_orm_connection(
        vec![parent_doc_nuri.clone()],
        vec!["urn:test:project1".to_string()],
        shape_type,
        session_id,
    )
    .await;

    // We expect one object, urn:test:project1
    assert!(
        initial
            .as_object()
            .expect("initial not object")
            .keys()
            .len()
            == 1
    );

    // Link the person from the other document into the project's members (in the parent graph)
    doc_sparql_update(
        session_id,
        format!(
            r#"
                PREFIX ex: <http://example.org/>
                INSERT DATA {{
                    GRAPH <{}> {{ <urn:test:project1> ex:members <urn:test:personX0> . }}
                }} ;
                DELETE DATA {{
                    GRAPH <{}> {{ <urn:test:project2> ex:members <urn:test:personX0> . }}
                }}
                "#,
            parent_doc_nuri, unrelated_doc_nuri
        ),
        Some(parent_doc_nuri.clone()),
    )
    .await
    .expect("SPARQL update failed");

    loop {
        let res = timeout(Duration::from_secs(10), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for cross-graph GraphOrmUpdate"),
        };
        let app_response = match opt {
            Some(a) => a,
            None => panic!("ORM receiver closed before cross-graph GraphOrmUpdate"),
        };
        let patches = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::GraphOrmUpdate(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        // log_info!("Cross-graph patches arrived:\n");
        // log_info!("{:?}", json!(patches).to_string());

        // We expect a full child object materialization plus members set-add reference.
        let mut expected = json!([
            {
                "op": "add",
                "path": "/urn:test:project1/members",
                "valType": "set",
                "value": {
                    "@id": "urn:test:personX0",
                    "name": "Xavier",
                    "type": "http://example.org/Person"

                }
            },
        ]);

        let mut actual = json!(patches);

        // Rewrite paths with the root graph from actual.
        rewrite_expected_paths_with_graph(&mut expected, &parent_doc_nuri);
        add_graph_fields(&mut expected, &child_doc_nuri);

        assert_orm_json_eq(&mut expected, &mut actual);
        break;
    }
}

/// Test that if scope is the whole document, add patches are received.
async fn test_add_root_in_separate_graph(session_id: u64) {
    // Create first person document.
    let _person1_doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:person1>
        a ex:AddSeparateGraphTestPerson1 ;
        ex:name "Person 1" .
}
"#
        .to_string(),
    )
    .await;

    // Define ORM schema: Project has members -> Person
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/PersonShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/PersonShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/AddSeparateGraphTestPerson1".to_string(),
                        )]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/name".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 0,
                    readablePredicate: "name".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/PersonShape".to_string(),
    };

    let (mut receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec!["did:ng:i".into()], vec![], shape_type, session_id).await;

    // We expect one object, urn:test:person1
    assert!(
        initial
            .as_object()
            .expect("initial not object")
            .keys()
            .len()
            == 1
    );

    // Link the person from the other document into the project's members (in the parent graph)
    let person2_doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:person2>
        a ex:AddSeparateGraphTestPerson1 ;
        ex:name "Person 2" .
}
"#
        .to_string(),
    )
    .await;

    let patches = await_graph_patches(&mut receiver).await;

    // We expect a full child object materialization plus members set-add reference.
    let mut expected = json!([
        {
            "op": "add",
            "path": "/",
            "valType": "set",
            "value": {
                "@id": "urn:test:person2",
                "name": "Person 2",
                "type": "http://example.org/AddSeparateGraphTestPerson1"
            }
        },

    ]);

    let mut actual = json!(patches);

    add_graph_fields(&mut expected, &person2_doc_nuri);

    assert_orm_json_eq(&mut expected, &mut actual);
}

/// An ordered subscription over a shape with nested objects.
async fn test_ordered_with_nested_children(session_id: u64) {
    log_info!("\n\n=== TEST: an ordered page carries its nested objects ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:orderedHouseB>
                    a ex:House ;
                    ex:rootColor "blue" ;
                    ex:inhabitants <urn:test:orderedBob> .

                <urn:test:orderedBob>
                    a ex:Person ;
                    ex:name "Bob" .

                <urn:test:orderedHouseA>
                    a ex:House ;
                    ex:rootColor "amber" ;
                    ex:inhabitants <urn:test:orderedAda> .

                <urn:test:orderedAda>
                    a ex:Person ;
                    ex:name "Ada" .
            }
        "#
        .to_string(),
    )
    .await;

    // Use regular house schema but with `rootColor` made mandatory (for ordering).
    let mut schema = create_house_schema();
    schema.insert(
        "http://example.org/HouseShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/HouseShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/House".to_string(),
                        )]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/rootColor".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "rootColor".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/inhabitants".to_string(),
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 1,
                    readablePredicate: "inhabitants".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        literals: None,
                        shape: Some("http://example.org/PersonShape".to_string()),
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/HouseShape".to_string(),
    };

    let (_receiver, _cancel_fn, _subscription_id, initial) = create_orm_connection_with_conf(
        vec![doc_nuri.clone()],
        vec![], // All objects
        shape_type,
        session_id,
        json!({"orderBy": [{"rootColor": "asc"}]}),
    )
    .await;

    let mut expected = json!([
        {
            "@id": "urn:test:orderedHouseA",
            "type": "http://example.org/House",
            "rootColor": "amber",
            "inhabitants": {
                "urn:test:orderedAda": {
                    "@id": "urn:test:orderedAda",
                    "type": "http://example.org/Person",
                    "name": "Ada"
                }
            }
        },
        {
            "@id": "urn:test:orderedHouseB",
            "type": "http://example.org/House",
            "rootColor": "blue",
            "inhabitants": {
                "urn:test:orderedBob": {
                    "@id": "urn:test:orderedBob",
                    "type": "http://example.org/Person",
                    "name": "Bob"
                }
            }
        }
    ]);
    add_graph_fields(&mut expected, &doc_nuri);
    rewrite_expected_paths_with_graph(&mut expected, &doc_nuri);

    assert_json_eq(&expected, &initial);

    log_info!("Test passed: ordered page carries its nested objects");
}

async fn test_add_remove_move_in_plain_sorted(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <did:ng:z:>
            INSERT DATA {
                <did:ng:z:sortObj2> a ex:SortObject ;
                                    ex:sortBy 2 ;
                                    ex:sortBy2 2 .
                <did:ng:z:sortObj1AndThen23> a ex:SortObject ;
                                    ex:sortBy 1 ;
                                    ex:sortBy2 1 .
                <did:ng:z:sortObj4> a ex:SortObject ;
                                    ex:sortBy 4 ;
                                    ex:sortBy2 4 .
                <did:ng:z:sortObj3> a ex:SortObject ;
                                    ex:sortBy 3 ;
                                    ex:sortBy2 3 .
                <did:ng:z:sortObj51> a ex:SortObject ;
                                    ex:sortBy 5 ;
                                    ex:sortBy2 1 .
                <did:ng:z:sortObj52> a ex:SortObject ;
                                    ex:sortBy 5 ;
                                    ex:sortBy2 2 .
            }
    "#
        .to_string(),
    )
    .await;

    let mut schema = HashMap::new();
    schema.insert(
        "did:ng:z:SortShape".to_string(),
        OrmSchemaShape {
            iri: "did:ng:z:SortShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: None,
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str("did:ng:z:SortObject".to_string())]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "did:ng:z:sortBy".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "sortBy".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::number,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "did:ng:z:sortBy2".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "sortBy2".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::number,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "did:ng:z:SortShape".to_string(),
    };

    // Sort by two predicates.
    let (mut receiver, _cancel_fn, _subscription_id, initial) = create_orm_connection_with_conf(
        vec![doc_nuri.clone()],
        vec![], // All objects
        shape_type.clone(),
        session_id,
        json!({"orderBy": [{"sortBy": "desc"}, {"sortBy2": "asc"}]}),
    )
    .await;

    assert_json_eq(
        &json!([
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj51", "type": "did:ng:z:SortObject", "sortBy": 5, "sortBy2": 1},
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj52", "type": "did:ng:z:SortObject", "sortBy": 5, "sortBy2": 2},
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj4",  "type": "did:ng:z:SortObject", "sortBy": 4, "sortBy2": 4},
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj3",  "type": "did:ng:z:SortObject", "sortBy": 3, "sortBy2": 3},
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj2",  "type": "did:ng:z:SortObject", "sortBy": 2, "sortBy2": 2},
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj1AndThen23",  "type": "did:ng:z:SortObject", "sortBy": 1, "sortBy2": 1},
        ]),
        &initial,
    );

    doc_sparql_update(
        session_id,
        format!(
            r#"
                PREFIX ex: <did:ng:z:>
                INSERT DATA {{
                    GRAPH <{}> {{
                        ex:sortObj515 a ex:SortObject ;
                                    ex:sortBy 5 ;
                                    ex:sortBy2 1.5 .
                        ex:sortObj0 a ex:SortObject ;
                                    ex:sortBy 0 ;
                                    ex:sortBy2 5 .
                        ex:sortObj6 a ex:SortObject ;
                                    ex:sortBy 6 ;
                                    ex:sortBy2 1 .
                        ex:sortObj1AndThen23 ex:sortBy 2.3 .

                    }}
                }} ;
                DELETE WHERE {{
                    GRAPH <{}> {{
                        ex:sortObj3 ?p ?o .
                        ex:sortObj1AndThen23 ex:sortBy 1 .

                    }}
                }}
                "#,
            doc_nuri, doc_nuri
        ),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL update failed");

    //
    let received_patches = await_graph_patches(&mut receiver).await;

    let mut expected_patches = json!([
        // Order patches
        {
            "op": "add",
            "path": "/0",
            "value": {
                "@id": "did:ng:z:sortObj6",
                "sortBy": 6,
                "sortBy2": 1,
                "type": "did:ng:z:SortObject"
            }
        },
        {
            "op": "add",
            "path": "/2",
            "value": {
                "@id": "did:ng:z:sortObj515",
                "sortBy": 5,
                "sortBy2": 1.5,
                "type": "did:ng:z:SortObject"
            }
        },
        {
            "op": "remove",
            "path": "/5",
        },
        {
            "op": "move",
            "from": "/6",
            "path": "/5"
        },
        {
            "op": "add",
            "path": "/7",
            "value": {
                "@id": "did:ng:z:sortObj0",
                "sortBy": 0,
                "sortBy2": 5,
                "type": "did:ng:z:SortObject"
            }
        },
        {
            "op": "add",
            "path": "/5/sortBy",
            "value": 2.3
        },
    ]);

    add_graph_fields(&mut expected_patches, &doc_nuri);

    assert_orm_json_eq_exact(&expected_patches, &json!(received_patches));
}

/// Applying frontend patches: root literal, nested literal, and a nested object add/remove.
async fn bench_apply_patches(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                <urn:test:benchHouse>
                    a ex:House ;
                    ex:rootColor "start" ;
                    ex:inhabitants <urn:test:benchPerson> .

                <urn:test:benchPerson>
                    a ex:Person ;
                    ex:name "start" ;
                    ex:hasCat <urn:test:benchCat> .

                <urn:test:benchCat>
                    a ex:Cat ;
                    ex:catName "start" .
            }
            "#
        .to_string(),
    )
    .await;

    let shape_type = OrmShapeType {
        schema: create_house_schema(),
        shape: "http://example.org/HouseShape".to_string(),
    };

    let (_receiver, _cancel_fn, subscription_id, _initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    let house = root_path(
        &doc_nuri,
        "urn:test:benchHouse",
        "http://example.org/HouseShape",
    );
    let person = format!(
        "{}/inhabitants/{}",
        house,
        composite_key(&doc_nuri, "urn:test:benchPerson")
    );

    let iters = 1000;
    let now = Instant::now();

    for i in 0..iters {
        let diff = vec![
            OrmPatch {
                op: OrmPatchOp::add,
                path: format!("{}/rootColor", house),
                value: Some(json!(format!("color_{}", i))),
                ..Default::default()
            },
            OrmPatch {
                op: OrmPatchOp::add,
                path: format!("{}/cat/name", person),
                value: Some(json!(format!("cat_{}", i))),
                ..Default::default()
            },
        ];

        orm_update(subscription_id, diff, session_id)
            .await
            .expect("orm_update failed");
    }

    println!(
        "[bench_apply_patches] Elapsed time for {} iters, 2 patches each: {:?}",
        iters,
        now.elapsed()
    );
}

/// Subscribing to a document: the initial query plus building every tracked object.
async fn bench_initialization(session_id: u64) {
    let objects_per_insert = 25;
    let inserts = 8;
    let roots = objects_per_insert * inserts;

    let doc_nuri = create_doc_with_data(
        session_id,
        "PREFIX ex: <http://example.org/> INSERT DATA { ex:placeholder ex:bar 0 . }".to_string(),
    )
    .await;

    for batch in 0..inserts {
        let mut body = String::from("PREFIX ex: <http://example.org/>\nINSERT DATA {\n");
        for offset in 0..objects_per_insert {
            let i = batch * objects_per_insert + offset;
            body.push_str(&format!(
                r#"
                    <urn:test:initHouse{i}> a ex:House ; ex:rootColor "color_{i}" ; ex:inhabitants <urn:test:initPerson{i}> .
                    <urn:test:initPerson{i}> a ex:Person ; ex:name "name_{i}" ; ex:hasCat <urn:test:initCat{i}> .
                    <urn:test:initCat{i}> a ex:Cat ; ex:catName "cat_{i}" ; ex:hasToy <urn:test:initToy{i}> .
                    <urn:test:initToy{i}> a ex:Toy ; ex:toyName "toy_{i}" .
                "#,
                i = i
            ));
        }
        body.push_str("}\n");
        doc_sparql_update(session_id, body, Some(doc_nuri.clone()))
            .await
            .expect("INSERT for initialization benchmark failed");
    }

    let iters = 20;
    let now = Instant::now();

    for _ in 0..iters {
        let shape_type = OrmShapeType {
            schema: create_house_schema(),
            shape: "http://example.org/HouseShape".to_string(),
        };
        let (_receiver, cancel_fn, _subscription_id, initial) =
            create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;
        hint::black_box(&initial);
        cancel_fn();
    }

    println!(
        "[bench_initialization] Elapsed time for {} subscriptions over {} root objects \
         ({} tracked objects each): {:?}",
        iters,
        roots,
        roots * 4,
        now.elapsed()
    );
}

async fn bench_nested(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {
                ex:foo ex:bar 0 .
            }
        "#
        .to_string(),
    )
    .await;

    let house_schema = create_house_schema();

    let shape_type = OrmShapeType {
        schema: house_schema,
        shape: "http://example.org/HouseShape".to_string(),
    };

    let (mut receiver, _cancel_fn, _subscription_id, _initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    let now = Instant::now();
    let mut chunk_start = Instant::now();
    let mut update_total = Duration::ZERO;
    let mut patch_total = Duration::ZERO;

    let iters = 1000;
    for i in 0..iters {
        let sparql_query = format!(
            r#"
            PREFIX ex: <http://example.org/>
            INSERT DATA {{
                <urn:test:house{}> 
                    a ex:House ;
                    ex:rootColor "color_{}" ;
                    ex:inhabitants <urn:test:person{}> .

                <urn:test:person{}>
                    a ex:Person ;
                    ex:name "name_{}" ;
                    ex:hasCat <urn:test:cat{}> .

                <urn:test:cat{}>
                    a ex:Cat ;
                    ex:catName "cat_{}" ;
                    ex:hasToy <urn:test:toy1_{}> ;
                    ex:hasToy <urn:test:toy2_{}> .

                <urn:test:toy1_{}>
                    a ex:Toy ;
                    ex:toyName "toy1_{}" .

                <urn:test:toy2_{}>
                    a ex:Toy ;
                    ex:toyName "toy2_{}" .
            }}
            "#,
            i, i, i, i, i, i, i, i, i, i, i, i, i, i
        );
        // INSERT: Add a new person with a cat, modify house color, modify existing person's name, add cat to Bob
        let update_start = Instant::now();
        doc_sparql_update(session_id, sparql_query, Some(doc_nuri.clone()))
            .await
            .expect("INSERT SPARQL update failed");
        update_total += update_start.elapsed();

        let patch_start = Instant::now();
        let received_patches = await_graph_patches(&mut receiver).await;
        patch_total += patch_start.elapsed();

        hint::black_box(received_patches);

        // Print the trend, so a super-linear slowdown is visible while it happens.
        if (i + 1) % 10 == 0 {
            println!(
                "[bench_nested] iters {:>3}-{:<3}: {:?} (total {:?})",
                i - 8,
                i + 1,
                chunk_start.elapsed(),
                now.elapsed()
            );
            chunk_start = Instant::now();
        }
    }

    println!(
        "[bench_nested] Elapsed time for {} iters, 5 (partly nested) objects each: {:?} (sparql update: {:?}, waiting for patches: {:?})",
        iters,
        now.elapsed(),
        update_total,
        patch_total
    );
}

async fn bench_test_add_remove_move_in_plain_sorted(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <did:ng:z:>
            INSERT DATA {
                <did:ng:z:sortObj2> a ex:SortObject ;
                                    ex:sortBy 2 ;
                                    ex:sortBy2 2 .
                <did:ng:z:sortObj1AndThen23> a ex:SortObject ;
                                    ex:sortBy 1 ;
                                    ex:sortBy2 1 .
                <did:ng:z:sortObj4> a ex:SortObject ;
                                    ex:sortBy 4 ;
                                    ex:sortBy2 4 .
                <did:ng:z:sortObj3> a ex:SortObject ;
                                    ex:sortBy 3 ;
                                    ex:sortBy2 3 .
                <did:ng:z:sortObj51> a ex:SortObject ;
                                    ex:sortBy 5 ;
                                    ex:sortBy2 1 .
                <did:ng:z:sortObj52> a ex:SortObject ;
                                    ex:sortBy 5 ;
                                    ex:sortBy2 2 .
            }
    "#
        .to_string(),
    )
    .await;

    let mut schema = HashMap::new();
    schema.insert(
        "did:ng:z:SortShape".to_string(),
        OrmSchemaShape {
            iri: "did:ng:z:SortShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: None,
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str("did:ng:z:SortObject".to_string())]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "did:ng:z:sortBy".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "sortBy".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::number,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "did:ng:z:sortBy2".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "sortBy2".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::number,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "did:ng:z:SortShape".to_string(),
    };

    // Sort by two predicates.
    let (mut receiver, _cancel_fn, _subscription_id, initial) = create_orm_connection_with_conf(
        vec![doc_nuri.clone()],
        vec![], // All objects
        shape_type.clone(),
        session_id,
        json!({"orderBy": [{"sortBy": "desc"}, {"sortBy2": "asc"}]}),
    )
    .await;
    use std::time::Instant;
    let now = Instant::now();

    let mut bench_index = 7;
    for _i in 0..200 {
        doc_sparql_update(
            session_id,
            format!(
                r#"
                    PREFIX ex: <did:ng:z:>
                    INSERT DATA {{
                        GRAPH <{}> {{
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .
                            ex:sortObj{} a ex:SortObject ;
                                        ex:sortBy {} ;
                                        ex:sortBy2 1.5 .

                        }}
                    }}
                    "#,
                doc_nuri,
                bench_index,
                bench_index,
                bench_index + 1,
                bench_index + 1,
                bench_index + 2,
                bench_index + 2,
                bench_index + 3,
                bench_index + 3,
                bench_index + 4,
                bench_index + 4,
                bench_index + 5,
                bench_index + 5,
                bench_index + 6,
                bench_index + 6,
                bench_index + 7,
                bench_index + 7,
                bench_index + 8,
                bench_index + 8,
                bench_index + 9,
                bench_index + 9,
                bench_index + 10,
                bench_index + 10,
                bench_index + 11,
                bench_index + 11,
                bench_index + 12,
                bench_index + 12,
                bench_index + 13,
                bench_index + 13,
                bench_index + 14,
                bench_index + 14,
                bench_index + 15,
                bench_index + 15,
            ),
            Some(doc_nuri.clone()),
        )
        .await
        .expect("SPARQL update failed");
        //
        let received_patches = await_graph_patches(&mut receiver).await;

        hint::black_box(received_patches);
        bench_index += 4;
    }

    println!(
        "[bench_plain] Elapsed time for 200 iters, 16 entries each: {:?}",
        now.elapsed()
    );
}

async fn test_add_remove_move_in_pagination(session_id: u64) {
    // Things to test:
    // Object in window get's invalid
    // page becomes empty

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <did:ng:z:>
            INSERT DATA {
                <did:ng:z:sortObj2> a ex:SortObject ;
                                    ex:sortBy 2 ;
                                    ex:sortBy2 2 .
                <did:ng:z:sortObj1> a ex:SortObject ;
                                    ex:sortBy 1 ;
                                    ex:sortBy2 1 .
                <did:ng:z:sortObj4> a ex:SortObject ;
                                    ex:sortBy 4 ;
                                    ex:sortBy2 4 .
                <did:ng:z:sortObj3> a ex:SortObject ;
                                    ex:sortBy 3 ;
                                    ex:sortBy2 3 .
                <did:ng:z:sortObj51> a ex:SortObject ;
                                    ex:sortBy 5 ;
                                    ex:sortBy2 1 .
                <did:ng:z:sortObj52> a ex:SortObject ;
                                    ex:sortBy 5 ;
                                    ex:sortBy2 2 .
            }
    "#
        .to_string(),
    )
    .await;

    let mut schema = HashMap::new();
    schema.insert(
        "did:ng:z:SortShape".to_string(),
        OrmSchemaShape {
            iri: "did:ng:z:SortShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: None,
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str("did:ng:z:SortObject".to_string())]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "did:ng:z:sortBy".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "sortBy".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::number,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "did:ng:z:sortBy2".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "sortBy2".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::number,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "did:ng:z:SortShape".to_string(),
    };

    // Sort by two predicates.
    let (mut receiver, _cancel_fn, _subscription_id, initial) = create_orm_connection_with_conf(
        vec![doc_nuri.clone()],
        vec![], // All objects
        shape_type.clone(),
        session_id,
        json!({"orderBy": [{"sortBy": "desc"}, {"sortBy2": "asc"}], "pageSize": 3, "maxActivePages": 2}),
    )
    .await;

    assert_json_eq(
        &json!([
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj51", "type": "did:ng:z:SortObject", "sortBy": 5, "sortBy2": 1},
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj52", "type": "did:ng:z:SortObject", "sortBy": 5, "sortBy2": 2},
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj4", "type": "did:ng:z:SortObject", "sortBy": 4, "sortBy2": 4},
        ]),
        &initial,
    );

    // Make modifications above, below and in between (move).
    // None should have an effect.
    doc_sparql_update(
        session_id,
        format!(
            r#"
                PREFIX ex: <did:ng:z:>
                INSERT DATA {{
                    GRAPH <{}> {{
                        ex:sortObj515 a ex:SortObject ;
                                    ex:sortBy 5 ;
                                    ex:sortBy2 1.5 .
                        ex:sortObj0 a ex:SortObject ;
                                    ex:sortBy 0 ;
                                    ex:sortBy2 5 .
                        ex:sortObj6 a ex:SortObject ;
                                    ex:sortBy 6 ;
                                    ex:sortBy2 1 .
                    }}
                }} ;
                DELETE WHERE {{
                    GRAPH <{}> {{
                        ex:sortObj3 ?p ?o .
                    }}
                }}
                "#,
            doc_nuri, doc_nuri
        ),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL update failed");

    // We expect nothing to happen (non-growing pagination does not track inserted elements).
    let received_patches = await_graph_patches_empty_if_timeout(&mut receiver).await;

    assert!(received_patches.is_empty());

    // Move 3rd item to 2nd item.
    doc_sparql_update(
        session_id,
        format!(
            r#"
                PREFIX ex: <did:ng:z:>
                INSERT DATA {{
                    GRAPH <{}> {{
                        ex:sortObj4 a ex:SortObject ;
                                    ex:sortBy 5 ;
                                    ex:sortBy2 1.6 .
                    }}
                }} ;
                DELETE WHERE {{
                    GRAPH <{}> {{
                        ex:sortObj4 ?p ?o .
                    }}
                }}
                "#,
            doc_nuri, doc_nuri
        ),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL update failed");

    let mut received_patches = json!(await_graph_patches(&mut receiver).await);
    let expected_structural_patches = json!([
    { "from": "/2", "op": "move", "path": "/1" }
    ]);
    let mut expected_object_patches = json!([
        // New object patches and atomic changes.
        {
            "op": "add",
            "path": "/1/sortBy",
            "value": 5
        },
        {
            "op": "add",
            "path": "/1/sortBy2",
            "value": 1.6
        },
    ]);

    log_info!("Patches received: {}", received_patches.to_string());

    let received_object_patches = received_patches
        .as_array_mut()
        .unwrap()
        .split_off(expected_structural_patches.as_array().unwrap().len());

    assert_orm_json_eq(
        &mut expected_object_patches,
        &mut json!(received_object_patches),
    );
    assert_orm_json_eq_exact(&expected_structural_patches, &json!(received_patches));

    //
    // Remove 2nd item on page.
    doc_sparql_update(
        session_id,
        format!(
            r#"
                PREFIX ex: <did:ng:z:>
                DELETE WHERE {{
                    GRAPH <{}> {{
                        ex:sortObj52 ?p ?o .
                    }}
                }}
                "#,
            doc_nuri
        ),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL update failed");

    let received_patches = await_graph_patches(&mut receiver).await;
    let expected_patches = json!([
        {
            "op": "remove",
            "path": "/2"
        },
    ]);

    assert_orm_json_eq_exact(&expected_patches, &json!(received_patches));

    // All items are removed
    doc_sparql_update(
        session_id,
        format!(
            r#"
                PREFIX ex: <did:ng:z:>
                DELETE WHERE {{
                    GRAPH <{}> {{
                        ?s ?p ?o .
                    }}
                }}
                "#,
            doc_nuri
        ),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL update failed");

    let received_patches = await_graph_patches(&mut receiver).await;
    let expected_patches = json!([
        {
            "op": "remove",
            "path": "/0"
        },
                {
            "op": "remove",
            "path": "/0"
        },
    ]);
    assert_orm_json_eq_exact(&expected_patches, &json!(received_patches));
}

async fn test_add_remove_move_in_pagination_grow_mode(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
            PREFIX ex: <did:ng:z:>
            INSERT DATA {
                <did:ng:z:sortObj2> a ex:SortObject ;
                                    ex:sortBy 2 ;
                                    ex:sortBy2 2 .
                <did:ng:z:sortObj1> a ex:SortObject ;
                                    ex:sortBy 1 ;
                                    ex:sortBy2 1 .
                <did:ng:z:sortObj4> a ex:SortObject ;
                                    ex:sortBy 4 ;
                                    ex:sortBy2 4 .
                <did:ng:z:sortObj3> a ex:SortObject ;
                                    ex:sortBy 3 ;
                                    ex:sortBy2 3 .
                <did:ng:z:sortObj51> a ex:SortObject ;
                                    ex:sortBy 5 ;
                                    ex:sortBy2 1 .
                <did:ng:z:sortObj52> a ex:SortObject ;
                                    ex:sortBy 5 ;
                                    ex:sortBy2 2 .
            }
    "#
        .to_string(),
    )
    .await;

    let mut schema = HashMap::new();
    schema.insert(
        "did:ng:z:SortShape".to_string(),
        OrmSchemaShape {
            iri: "did:ng:z:SortShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: None,
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str("did:ng:z:SortObject".to_string())]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "did:ng:z:sortBy".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "sortBy".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::number,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "did:ng:z:sortBy2".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "sortBy2".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::number,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "did:ng:z:SortShape".to_string(),
    };

    // Sort by two predicates.
    let (mut receiver, _cancel_fn, _subscription_id, initial) = create_orm_connection_with_conf(
        vec![doc_nuri.clone()],
        vec![], // All objects
        shape_type.clone(),
        session_id,
        json!({"orderBy": [{"sortBy": "desc"}, {"sortBy2": "asc"}], "pageSize": 2}),
    )
    .await;

    assert_orm_json_eq_exact(
        &json!([
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj51", "type": "did:ng:z:SortObject", "sortBy": 5, "sortBy2": 1},
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj52", "type": "did:ng:z:SortObject", "sortBy": 5, "sortBy2": 2},
        ]),
        &initial,
    );

    // Make modifications above, below and in between (move).
    doc_sparql_update(
        session_id,
        format!(
            r#"
                PREFIX ex: <did:ng:z:>
                INSERT DATA {{
                    GRAPH <{}> {{
                        ex:sortObj515 a ex:SortObject ;
                                    ex:sortBy 5 ;
                                    ex:sortBy2 1.5 .
                        ex:sortObj0 a ex:SortObject ;
                                    ex:sortBy 0 ;
                                    ex:sortBy2 5 .
                        ex:sortObj6 a ex:SortObject ;
                                    ex:sortBy 6 ;
                                    ex:sortBy2 1 .
                    }}
                }} ;
                DELETE WHERE {{
                    GRAPH <{}> {{
                        ex:sortObj3 ?p ?o .
                    }}
                }}
                "#,
            doc_nuri, doc_nuri
        ),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL update failed");

    //

    let received_patches = await_graph_patches(&mut receiver).await;

    let mut expected_patches = json!([
        // Insert new item in page
        {
            "op": "add",
            "path": "/0",
            "value": {
                "@id": "did:ng:z:sortObj6",
                "sortBy": 6,
                "sortBy2": 1,
                "type": "did:ng:z:SortObject"
            }
        },
        {
            "op": "add",
            "path": "/2",
            "value": {
                "@id": "did:ng:z:sortObj515",
                "sortBy": 5,
                "sortBy2": 1.5,
                "type": "did:ng:z:SortObject"
            }
        },
    ]);

    add_graph_fields(&mut expected_patches, &doc_nuri);

    assert_orm_json_eq_exact(&expected_patches, &json!(received_patches));
}
