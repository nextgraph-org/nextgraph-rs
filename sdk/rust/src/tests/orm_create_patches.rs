// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use crate::local_broker::doc_sparql_update;
use crate::tests::create_or_open_wallet::create_or_open_wallet;
use crate::tests::{
    add_graph_fields, assert_json_eq, assert_orm_json_eq, augment_expected_with_graph_fields,
    await_graph_patches, create_doc_with_data, create_orm_connection,
    create_orm_connection_with_conf, extract_graph_from_actual_paths,
    rewrite_expected_paths_with_graph,
};
use async_std::future::timeout;
use async_std::stream::StreamExt;
use ng_net::app_protocol::{AppResponse, AppResponseV0};
use ng_net::orm::{
    BasicType, OrmSchemaDataType, OrmSchemaPredicate, OrmSchemaShape, OrmSchemaValType,
    OrmShapeType,
};
use std::time::Duration;

use ng_repo::log::*;
use serde_json::json;
use std::collections::HashMap;

#[async_std::test]
async fn test_orm_patch_creation() {
    // Setup wallet and document
    let (_wallet, session_id) = create_or_open_wallet().await;

    test_patch_nested_house_inhabitants(session_id).await;

    test_patch_add_array(session_id).await;

    test_patch_remove_array(session_id).await;

    test_cross_graph_child_in_separate_graph(session_id).await;

    // _test_patch_add_nested_1(session_id).await;  // TODO: Edge case not yet fully implemented

    test_patch_scope_correct(session_id).await;

    test_add_root_in_separate_graph(session_id).await;

    test_add_remove_in_sorted(session_id).await;
}

/// Test that when a root object references a child object that lives in a different graph,
/// the emitted patches use `childGraph|childSubject` for the child segment and include @graph.
async fn test_cross_graph_child_in_separate_graph(session_id: u64) {
    // Create a second document holding the child object (ensures a different graph)
    let _child_doc_nuri = create_doc_with_data(
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
                "path": "/",
                "valType": "set",
                "value": {
                    "@id": "urn:test:personX",
                    "@shape": "http://example.org/PersonShape",
                    "name": "Xavier",
                    "type": "http://example.org/Person"
                }
            },
            {
                "op": "add",
                "path": "/urn:test:project1|http:~1~1example.org~1ProjectShape/members",
                "valType": "set",
                "value": {
                    "@id": "urn:test:personX",
                    "@shape": "http://example.org/PersonShape"
                }
            },
        ]);

        let mut actual = json!(patches);

        let child_graph = actual.as_array().and_then(|arr| {
            arr.iter().find_map(|item| {
                (item.get("path").and_then(|v| v.as_str()) == Some("/"))
                    .then(|| {
                        item.get("value")
                            .and_then(|v| v.get("@graph"))
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string())
                    })
                    .flatten()
            })
        });

        // Rewrite paths with the root graph from actual.
        if let Some(root_graph) = extract_graph_from_actual_paths(&actual) {
            rewrite_expected_paths_with_graph(&mut expected, &root_graph);
        }
        if let Some(child_graph) = child_graph {
            add_graph_fields(&mut expected, &child_graph);
        }

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

        log_info!("Diff ops arrived:\n");
        for patch in patches.iter() {
            log_info!("{:?}", patch);
        }

        let mut expected = json!([
            {
                "op": "add",
                "path": "/",
                "valType": "set",
                "value": {
                    "@id": "urn:test:numArrayObj4",
                    "@shape": "http://example.org/TestShape",
                    "numArray": [0.0],
                    "type": "http://example.org/TestObject"
                }
            },
            {
                "op": "add",
                "valType": "set",
                "value": [4.0],
                "path": "/urn:test:numArrayObj1|http:~1~1example.org~1TestShape/numArray",

            },
            {
                "op": "add",
                "valType": "set",
                "value": [1.0,2.0],
                "path": "/urn:test:numArrayObj2|http:~1~1example.org~1TestShape/numArray",
            },
            {
                "op": "add",
                "valType": "set",
                "value": [3.0],
                "path": "/urn:test:numArrayObj3|http:~1~1example.org~1TestShape/numArray",
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

        log_info!("Diff ops arrived:\n");
        for patch in patches.iter() {
            log_info!("{:?}", patch);
        }

        let mut expected = json!([
            {
                "op": "remove",
                "valType": "set",
                "value": [1.0],
                "path": "/urn:test:numArrayObj1|http:~1~1example.org~1TestShape/numArray",

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

        log_info!("Diff ops arrived:\n");
        for patch in patches.iter() {
            log_info!("{:?}", patch);
        }

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

    // Define the ORM schema
    let mut schema = HashMap::new();

    // House shape
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
                    minCardinality: 0,
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

    // Person shape
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
                    minCardinality: 1,
                    readablePredicate: "name".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/hasCat".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 0,
                    readablePredicate: "cat".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        literals: None,
                        shape: Some("http://example.org/CatShape".to_string()),
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );

    // Cat shape
    schema.insert(
        "http://example.org/CatShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/CatShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str("http://example.org/Cat".to_string())]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/catName".to_string(),
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
                // New nested layer: Cat -> Toy
                OrmSchemaPredicate {
                    iri: "http://example.org/hasToy".to_string(),
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
                    readablePredicate: "toy".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        literals: None,
                        shape: Some("http://example.org/ToyShape".to_string()),
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );

    // Toy shape
    schema.insert(
        "http://example.org/ToyShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/ToyShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str("http://example.org/Toy".to_string())]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/toyName".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
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
        shape: "http://example.org/HouseShape".to_string(),
    };

    let (mut receiver, cancel_fn, subscription_id, initial) =
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
            "path": "/",
            "valType": "set",
            "value": {
              "@id": "urn:test:cat3",
              "@shape": "http://example.org/CatShape",
              "name": "Fluffy",
              "toy": {
                "urn:test:toy3|http:~1~1example.org~1ToyShape": {
                  "@id": "urn:test:toy3",
                  "@shape": "http://example.org/ToyShape"
                }
              },
              "type": "http://example.org/Cat"
            }
          },
          {
            "op": "add",
            "path": "/",
            "valType": "set",
            "value": {
              "@id": "urn:test:cat2",
              "@shape": "http://example.org/CatShape",
              "name": "Mittens",
              "toy": {
                "urn:test:toy2|http:~1~1example.org~1ToyShape": {
                  "@id": "urn:test:toy2",
                  "@shape": "http://example.org/ToyShape"
                }
              },
              "type": "http://example.org/Cat"
            }
          },
          {
            "op": "add",
            "path": "/",
            "valType": "set",
            "value": {
              "@id": "urn:test:toy3",
              "@shape": "http://example.org/ToyShape",
              "name": "Ball",
              "type": "http://example.org/Toy"
            }
          },
          {
            "op": "add",
            "path": "/",
            "valType": "set",
            "value": {
              "@id": "urn:test:toy2",
              "@shape": "http://example.org/ToyShape",
              "name": "Mouse",
              "type": "http://example.org/Toy"
            }
          },
          {
            "op": "add",
            "path": "/",
            "valType": "set",
            "value": {
              "@id": "urn:test:person3",
              "@shape": "http://example.org/PersonShape",
              "cat": {
                "@id": "urn:test:cat3",
                "@shape": "http://example.org/CatShape"
              },
              "name": "Charlie",
              "type": "http://example.org/Person"
            }
          },
          {
            "op": "add",
            "path": "/urn:test:house1|http:~1~1example.org~1HouseShape/inhabitants",
            "valType": "set",
            "value": {
              "@id": "urn:test:person3",
              "@shape": "http://example.org/PersonShape"
            }
          },
          {
            "op": "add",
            "path": "/urn:test:house1|http:~1~1example.org~1HouseShape/rootColor",
            "value": "red"
          },
          {
            "op": "add",
            "path": "/urn:test:person1|http:~1~1example.org~1PersonShape/name",
            "value": "Alicia"
          },
          {
            "op": "add",
            "path": "/urn:test:person2|http:~1~1example.org~1PersonShape/cat",
            "value": {
              "@id": "urn:test:cat2",
              "@shape": "http://example.org/CatShape"
            }
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
                "path": "/urn:test:house1|http:~1~1example.org~1HouseShape/rootColor",
            },
            // Alice loses her cat
            {
                "op": "remove",
                "path": "/urn:test:person1|http:~1~1example.org~1PersonShape/cat",
            },
            // Bob's cat name changes
            {
                "op": "add",
                "value": "Mr. Mittens",
                "path": "/urn:test:cat2|http:~1~1example.org~1CatShape/name",
            },
            // Bob's cat toy name changes
            {
                "op": "add",
                "value": "Laser",
                "path": "/urn:test:toy2|http:~1~1example.org~1ToyShape/name",
            },
            // Charlie is removed from inhabitants.
            {
                "op": "remove",
                "value": {},
                "path": "/urn:test:house1|http:~1~1example.org~1HouseShape/inhabitants",
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
                "path": "/urn:test:name1|did:ng:x:contact:class#SocialContact||did:ng:x:contact#name/value",
                "value": "Admin's friend - change5"
            },
            {
                "op": "add",
                "path": "/urn:test:upd1|did:ng:x:contact:class#SocialContact||did:ng:x:contact#updatedAt/valueDateTime",
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

        log_info!("Cross-graph patches arrived:\n");
        log_info!("{:?}", json!(patches).to_string());

        // We expect a full child object materialization plus members set-add reference.
        let mut expected = json!([
            {
                "op": "add",
                "path": "/",
                "valType": "set",
                "value": {
                    "@id": "urn:test:personX0",
                    "@shape": "http://example.org/PersonShape",
                    "name": "Xavier",
                    "type": "http://example.org/Person"
                }
            },
            {
                "op": "add",
                "path": "/urn:test:project1|http:~1~1example.org~1ProjectShape/members",
                "valType": "set",
                "value": {
                    "@id": "urn:test:personX0",
                    "@shape": "http://example.org/PersonShape"
                }
            },
        ]);

        let mut actual = json!(patches);

        let child_graph = actual.as_array().and_then(|arr| {
            arr.iter().find_map(|item| {
                (item.get("path").and_then(|v| v.as_str()) == Some("/"))
                    .then(|| {
                        item.get("value")
                            .and_then(|v| v.get("@graph"))
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string())
                    })
                    .flatten()
            })
        });

        // Rewrite paths with the root graph from actual.
        if let Some(root_graph) = extract_graph_from_actual_paths(&actual) {
            rewrite_expected_paths_with_graph(&mut expected, &root_graph);
        }
        if let Some(child_graph) = child_graph {
            add_graph_fields(&mut expected, &child_graph);
        }

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
                "@shape": "http://example.org/PersonShape",
                "name": "Person 2",
                "type": "http://example.org/AddSeparateGraphTestPerson1"
            }
        },

    ]);

    let mut actual = json!(patches);

    add_graph_fields(&mut expected, &person2_doc_nuri);

    assert_orm_json_eq(&mut expected, &mut actual);
}

async fn test_add_remove_in_sorted(session_id: u64) {
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
        json!({"orderBy": [{"sortBy": "desc"}, {"sortBy2": "asc"}]}),
    )
    .await;

    assert_json_eq(
        &json!([
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj51", "@shape": "did:ng:z:SortShape", "type": "did:ng:z:SortObject", "sortBy": 5, "sortBy2": 1},
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj52", "@shape": "did:ng:z:SortShape", "type": "did:ng:z:SortObject", "sortBy": 5, "sortBy2": 2},
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj4",  "@shape": "did:ng:z:SortShape", "type": "did:ng:z:SortObject", "sortBy": 4, "sortBy2": 4},
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj3",  "@shape": "did:ng:z:SortShape", "type": "did:ng:z:SortObject", "sortBy": 3, "sortBy2": 3},
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj2",  "@shape": "did:ng:z:SortShape", "type": "did:ng:z:SortObject", "sortBy": 2, "sortBy2": 2},
            {"@graph": doc_nuri, "@id": "did:ng:z:sortObj1",  "@shape": "did:ng:z:SortShape", "type": "did:ng:z:SortObject", "sortBy": 1, "sortBy2": 1},
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
    let patches = await_graph_patches(&mut receiver).await;

    // We expect a full child object materialization plus members set-add reference.
    let mut expected = json!([
        // New object patches.
        {
            "op": "add",
            "path": "/",
            "valType": "set",
            "value": {
                "@id": "did:ng:z:sortObj0",
                "@shape": "did:ng:z:SortShape",
                "sortBy": 0,
                "sortBy2": 6,
                "type": "did:ng:z:SortObject"
            }
        },
        {
            "op": "add",
            "path": "/",
            "valType": "set",
            "value": {
                "@id": "did:ng:z:sortObj515",
                "@shape": "did:ng:z:SortShape",
                "sortBy": 5,
                "sortBy2": 1.5,
                "type": "did:ng:z:SortObject"
            }
        },
        {
            "op": "add",
            "path": "/",
            "valType": "set",
            "value": {
                "@id": "did:ng:z:sortObj6",
                "@shape": "did:ng:z:SortShape",
                "sortBy": 6,
                "sortBy2": 1,
                "type": "did:ng:z:SortObject"
            }
        },

        // Structural patches
        {
            "op": "add",
            "path": "/0",
            "value": {
                "@id": "did:ng:z:sortObj6",
                "@shape": "did:ng:z:SortShape",
            }
        },
        {
            "op": "add",
            "path": "/2",
            "value": {
                "@id": "did:ng:z:sortObj515",
                "@shape": "did:ng:z:SortShape",
            }
        },
        {
            "op": "remove",
            "path": "/4",
        },
        {
            "op": "add",
            "path": "/9",
            "value": {
                "@id": "did:ng:z:sortObj0",
                "@shape": "did:ng:z:SortShape",
            }
        },
    ]);

    // TODO: remove of set value not necessary in ordered
    let mut actual = json!(patches);

    add_graph_fields(&mut expected, &doc_nuri);

    assert_orm_json_eq(&mut expected, &mut actual);
}
