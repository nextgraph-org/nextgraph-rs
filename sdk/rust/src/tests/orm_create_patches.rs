// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use crate::local_broker::{doc_sparql_update, orm_start};
use crate::tests::create_or_open_wallet::create_or_open_wallet;
use crate::tests::{assert_json_eq, create_doc_with_data};
use async_std::future::timeout;
use async_std::stream::StreamExt;
use ng_net::app_protocol::{AppResponse, AppResponseV0, NuriV0};
use ng_net::orm::{
    BasicType, OrmSchemaDataType, OrmSchemaPredicate, OrmSchemaShape, OrmSchemaValType,
    OrmShapeType,
};
use std::time::Duration;

use ng_repo::log_info;
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;

#[async_std::test]
async fn test_orm_patch_creation() {
    // Setup wallet and document
    let (_wallet, session_id) = create_or_open_wallet().await;

    test_patch_nested_house_inhabitants(session_id).await;

    test_patch_add_array(session_id).await;

    test_patch_remove_array(session_id).await;

    test_cross_graph_child_in_separate_graph(session_id).await;

    // test_patch_add_nested_1(session_id).await;  // TODO: Edge case not yet fully implemented
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
                        valType: OrmSchemaValType::literal,
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
                        valType: OrmSchemaValType::literal,
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

    let nuri = NuriV0::new_entire_user_site();
    let (mut receiver, _cancel_fn) = orm_start(nuri, shape_type, session_id)
        .await
        .expect("orm_start");

    // Drain initial (with timeout)
    loop {
        let res = timeout(Duration::from_secs(10), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for OrmInitial response"),
        };
        match opt {
            Some(app_response) => {
                if let AppResponse::V0(AppResponseV0::OrmInitial(_)) = app_response {
                    break;
                }
            }
            None => panic!("ORM receiver closed before initial response"),
        }
    }

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
            Err(_) => panic!("Timed out waiting for cross-graph OrmUpdate"),
        };
        let app_response = match opt {
            Some(a) => a,
            None => panic!("ORM receiver closed before cross-graph OrmUpdate"),
        };
        let patches = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::OrmUpdate(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        log_info!("Cross-graph patches arrived:\n");
        for patch in patches.iter() {
            log_info!("{:?}", patch);
        }

        // We expect at least the object creation and its @id and @graph under members
        let mut expected = json!([
            { "op": "add", "valType": "object", "path": "/urn:test:project1/members/urn:test:personX" },
            { "op": "add", "path": "/urn:test:project1/members/urn:test:personX/@id", "value": "urn:test:personX" },
        ]);

        let mut actual = json!(patches);

        // Rewrite with root graph first
        if let Some(root_graph) = extract_graph_from_actual_paths(&actual) {
            rewrite_expected_paths_with_graph(&mut expected, &root_graph);

            // Find the child graph from the @graph patch in actual
            if let Some(child_graph) =
                extract_child_graph_from_actual(&actual, "members", "urn:test:personX")
            {
                // Ensure we also expect the @graph patch
                expected.as_array_mut().unwrap().push(json!({
                    "op": "add",
                    "path": format!("/{}|urn:test:project1/members/{}|urn:test:personX/@graph", root_graph, child_graph),
                    "value": child_graph
                }));
                // Fix the child segment to use its own graph (not the root one)
                fix_child_segment_graph_in_expected(
                    &mut expected,
                    "members",
                    "urn:test:personX",
                    &root_graph,
                    &child_graph,
                );
            }
        }

        assert_json_eq(&mut expected, &mut actual);
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
                        valType: OrmSchemaValType::literal,
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

    let nuri = NuriV0::new_entire_user_site();
    let (mut receiver, cancel_fn) = orm_start(nuri, shape_type, session_id)
        .await
        .expect("orm_start");

    // Wait for initial with timeout
    loop {
        let res = timeout(Duration::from_secs(10), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for OrmInitial in add_array test"),
        };
        match opt {
            Some(app_response) => {
                let _ = match app_response {
                    AppResponse::V0(v) => match v {
                        AppResponseV0::OrmInitial(json) => Some(json),
                        _ => None,
                    },
                }
                .unwrap();
                break;
            }
            None => panic!("ORM receiver closed before OrmInitial in add_array test"),
        }
    }

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
            Err(_) => panic!("Timed out waiting for OrmUpdate in add_array test"),
        };
        let app_response = match opt {
            Some(a) => a,
            None => panic!("ORM receiver closed before OrmUpdate in add_array test"),
        };
        let patches = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::OrmUpdate(json) => Some(json),
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
            {
                "op": "add",
                "valType": "object",
                "path": "/urn:test:numArrayObj4",
            },
            {
                "op": "add",
                "value": "urn:test:numArrayObj4",
                "path": "/urn:test:numArrayObj4/@id",
            },
            {
                "op": "add",
                "valType": "set",
                "value": [0.0],
                "path": "/urn:test:numArrayObj4/numArray",
            },
            {
                "op": "add",
                "value": "http://example.org/TestObject",
                "path": "/urn:test:numArrayObj4/type",
            },
        ]);

        let mut actual = json!(patches);
        if let Some(graph) = extract_graph_from_actual_paths(&actual) {
            rewrite_expected_paths_with_graph(&mut expected, &graph);
            augment_expected_with_graph_fields(&mut expected, &graph);
        }
        assert_json_eq(&mut expected, &mut actual);

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
                        valType: OrmSchemaValType::literal,
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

    let nuri = NuriV0::new_entire_user_site();
    let (mut receiver, cancel_fn) = orm_start(nuri, shape_type, session_id)
        .await
        .expect("orm_start");

    loop {
        let res = timeout(Duration::from_secs(10), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for OrmInitial in remove_array test"),
        };
        match opt {
            Some(app_response) => {
                if let AppResponse::V0(AppResponseV0::OrmInitial(_)) = app_response {
                    break;
                }
            }
            None => panic!("ORM receiver closed before OrmInitial in remove_array test"),
        }
    }

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
            Err(_) => panic!("Timed out waiting for OrmUpdate in remove_array test"),
        };
        let app_response = match opt {
            Some(a) => a,
            None => panic!("ORM receiver closed before OrmUpdate in remove_array test"),
        };
        let patches = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::OrmUpdate(json) => Some(json),
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
                "path": "/urn:test:numArrayObj1/numArray",

            }
        ]);

        let mut actual = json!(patches);
        if let Some(graph) = extract_graph_from_actual_paths(&actual) {
            rewrite_expected_paths_with_graph(&mut expected, &graph);
        }
        assert_json_eq(&mut expected, &mut actual);

        break;
    }
}

/// Tests edge case that is an open TODO about a modified nested object
/// that changes so that another allowed shape becomes valid.
/// See handle_backend_update's TODO comment.
async fn test_patch_add_nested_1(session_id: u64) {
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

    let nuri = NuriV0::new_entire_user_site();
    let (mut receiver, cancel_fn) = orm_start(nuri, shape_type, session_id)
        .await
        .expect("orm_start");
    loop {
        let res = timeout(Duration::from_secs(10), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for OrmInitial in nested_house test"),
        };
        match opt {
            Some(app_response) => {
                let _ = match app_response {
                    AppResponse::V0(v) => match v {
                        AppResponseV0::OrmInitial(json) => Some(json),
                        _ => None,
                    },
                }
                .unwrap();
                break;
            }
            None => panic!("ORM receiver closed before OrmInitial in nested_house test"),
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
            Err(_) => panic!("Timed out waiting for OrmUpdate in nested_house test"),
        };
        let app_response = match opt {
            Some(a) => a,
            None => panic!("ORM receiver closed before OrmUpdate in nested_house test"),
        };
        let patches = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::OrmUpdate(json) => Some(json),
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
                "valType": "object",
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
        assert_json_eq(&mut expected, &mut actual);

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
                        valType: OrmSchemaValType::literal,
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
                        valType: OrmSchemaValType::literal,
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
                        valType: OrmSchemaValType::literal,
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
                        valType: OrmSchemaValType::literal,
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

    let nuri = NuriV0::new_entire_user_site();
    let (mut receiver, cancel_fn) = orm_start(nuri, shape_type, session_id)
        .await
        .expect("orm_start");

    // Get initial state
    loop {
        let res = timeout(Duration::from_secs(10), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for OrmInitial in cross-graph test (final)"),
        };
        match opt {
            Some(app_response) => {
                if let AppResponse::V0(AppResponseV0::OrmInitial(_)) = app_response {
                    break;
                }
            }
            None => panic!("ORM receiver closed before final OrmInitial in cross-graph test"),
        }
    }

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
                AppResponseV0::OrmUpdate(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        log_info!("INSERT patches arrived:\n");
        for patch in patches.iter() {
            log_info!("{:?}", patch);
        }

        let mut expected = json!([
            // Modified house color
            {
                "op": "add",
                "value": "red",
                "path": "/urn:test:house1/rootColor",
            },
            // Modified Alice's name
            {
                "op": "add",
                "value": "Alicia",
                "path": "/urn:test:house1/inhabitants/urn:test:person1/name",
            },
            // Bob gets a cat
            {
                "op": "add",
                "valType": "object",
                "path": "/urn:test:house1/inhabitants/urn:test:person2/cat",
            },
            {
                "op": "add",
                "value": "urn:test:cat2",
                "path": "/urn:test:house1/inhabitants/urn:test:person2/cat/@id",
            },
            {
                "op": "add",
                "value": "http://example.org/Cat",
                "path": "/urn:test:house1/inhabitants/urn:test:person2/cat/type",
            },
            {
                "op": "add",
                "value": "Mittens",
                "path": "/urn:test:house1/inhabitants/urn:test:person2/cat/name",
            },
            // Bob's cat gets a toy (multi-valued): object container for specific toy subject
            {
                "op": "add",
                "valType": "object",
                "path": "/urn:test:house1/inhabitants/urn:test:person2/cat/toy/urn:test:toy2",
            },
            {
                "op": "add",
                "value": "urn:test:toy2",
                "path": "/urn:test:house1/inhabitants/urn:test:person2/cat/toy/urn:test:toy2/@id",
            },
            {
                "op": "add",
                "value": "http://example.org/Toy",
                "path": "/urn:test:house1/inhabitants/urn:test:person2/cat/toy/urn:test:toy2/type",
            },
            {
                "op": "add",
                "value": "Mouse",
                "path": "/urn:test:house1/inhabitants/urn:test:person2/cat/toy/urn:test:toy2/name",
            },
            // New person Charlie with cat
            {
                "op": "add",
                "valType": "object",
                "path": "/urn:test:house1/inhabitants/urn:test:person3",
            },
            {
                "op": "add",
                "value": "urn:test:person3",
                "path": "/urn:test:house1/inhabitants/urn:test:person3/@id",
            },
            {
                "op": "add",
                "value": "http://example.org/Person",
                "path": "/urn:test:house1/inhabitants/urn:test:person3/type",
            },
            {
                "op": "add",
                "value": "Charlie",
                "path": "/urn:test:house1/inhabitants/urn:test:person3/name",
            },
            {
                "op": "add",
                "valType": "object",
                "path": "/urn:test:house1/inhabitants/urn:test:person3/cat",
            },
            {
                "op": "add",
                "value": "urn:test:cat3",
                "path": "/urn:test:house1/inhabitants/urn:test:person3/cat/@id",
            },
            {
                "op": "add",
                "value": "http://example.org/Cat",
                "path": "/urn:test:house1/inhabitants/urn:test:person3/cat/type",
            },
            {
                "op": "add",
                "value": "Fluffy",
                "path": "/urn:test:house1/inhabitants/urn:test:person3/cat/name",
            },
            // Charlie's cat gets a toy (multi-valued)
            {
                "op": "add",
                "valType": "object",
                "path": "/urn:test:house1/inhabitants/urn:test:person3/cat/toy/urn:test:toy3",
            },
            {
                "op": "add",
                "value": "urn:test:toy3",
                "path": "/urn:test:house1/inhabitants/urn:test:person3/cat/toy/urn:test:toy3/@id",
            },
            {
                "op": "add",
                "value": "http://example.org/Toy",
                "path": "/urn:test:house1/inhabitants/urn:test:person3/cat/toy/urn:test:toy3/type",
            },
            {
                "op": "add",
                "value": "Ball",
                "path": "/urn:test:house1/inhabitants/urn:test:person3/cat/toy/urn:test:toy3/name",
            },
        ]);

        let mut actual = json!(patches);
        if let Some(graph) = extract_graph_from_actual_paths(&actual) {
            rewrite_expected_paths_with_graph(&mut expected, &graph);
            augment_expected_with_graph_fields(&mut expected, &graph);
        }
        assert_json_eq(&mut expected, &mut actual);

        break;
    }

    log_info!("\n\n=== TEST 2: DELETE - Removing cat, person, and modifying properties ===\n");

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
                AppResponseV0::OrmUpdate(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        log_info!("DELETE patches arrived:\n");
        for patch in patches.iter() {
            log_info!("{:?}", patch);
        }

        let mut expected = json!([
            // Remove house color
            {
                "op": "remove",
                "path": "/urn:test:house1/rootColor",
            },
            // Alice loses her cat
            {
                "op": "remove",
                "valType": "object",
                "path": "/urn:test:house1/inhabitants/urn:test:person1/cat",
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
            // Charlie and his cat are removed
            {
                "op": "remove",
                "valType": "object",
                "path": "/urn:test:house1/inhabitants/urn:test:person3",
            },
        ]);

        let mut actual = json!(patches);
        if let Some(graph) = extract_graph_from_actual_paths(&actual) {
            rewrite_expected_paths_with_graph(&mut expected, &graph);
        }
        assert_json_eq(&mut expected, &mut actual);

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
                        valType: OrmSchemaValType::literal,
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

    let nuri = NuriV0::new_entire_user_site();
    let (mut receiver, _cancel_fn) = orm_start(nuri, shape_type, session_id)
        .await
        .expect("orm_start");

    // Drain initial
    loop {
        let res = timeout(Duration::from_secs(10), receiver.next()).await;
        let opt = match res {
            Ok(o) => o,
            Err(_) => panic!("Timed out waiting for OrmInitial"),
        };
        match opt {
            Some(AppResponse::V0(AppResponseV0::OrmInitial(_))) => break,
            Some(_) => continue,
            None => panic!("ORM receiver closed before initial response"),
        }
    }

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
            Err(_) => panic!("Timed out waiting for OrmUpdate"),
        };
        let app_response = match opt {
            Some(a) => a,
            None => panic!("ORM receiver closed before OrmUpdate"),
        };
        let patches = match app_response {
            AppResponse::V0(AppResponseV0::OrmUpdate(json)) => json,
            _ => continue,
        };

        log_info!("Name replacement patches arrived:\n");
        for p in patches.iter() {
            log_info!("{:?}", p);
        }

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

        assert_json_eq(&mut expected, &mut actual);
        break;
    }
}

//
// =============== HELPERS ================
//

/// Extract the graph IRI from the first patch path in the actual patches JSON array.
fn extract_graph_from_actual_paths(actual: &Value) -> Option<String> {
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
fn prefix_graph_in_path(path: &str, graph: &str) -> String {
    let mut out = String::from("/");
    let mut first = true;
    for seg in path.split('/').filter(|s| !s.is_empty()) {
        if !first {
            out.push('/');
        }
        // Only prefix subject segments, not properties or @-fields
        if seg.starts_with("urn:") && !seg.contains('|') {
            out.push_str(graph);
            out.push('|');
        }
        out.push_str(seg);
        first = false;
    }
    out
}

/// Rewrite all "path" fields in the expected JSON with the graph-prefixed subject segments.
fn rewrite_expected_paths_with_graph(expected: &mut Value, graph: &str) {
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
fn augment_expected_with_graph_fields(expected: &mut Value, graph: &str) {
    if let Some(arr) = expected.as_array_mut() {
        let mut to_add: Vec<Value> = Vec::new();
        for item in arr.iter() {
            if let (Some(path), Some(op)) = (
                item.get("path").and_then(|v| v.as_str()),
                item.get("op").and_then(|v| v.as_str()),
            ) {
                if path.ends_with("/@id") && op == "add" {
                    let base = path.trim_end_matches("/@id");
                    to_add.push(json!({
                        "op": "add",
                        "path": format!("{}/@graph", base),
                        "value": graph,
                    }));
                }
            }
        }
        arr.extend(to_add);
    }
}

/// Find the child graph IRI for a nested entry by inspecting the @graph patch for that child.
/// Looks for a patch whose path contains `/{prop}/...{child}/@graph` and returns its value.
fn extract_child_graph_from_actual(
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
fn fix_child_segment_graph_in_path(
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
                    if path.contains(&format!("/{}/{}", prop, child_subject)) {
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
