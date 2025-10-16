// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use crate::local_broker::{doc_sparql_update, orm_start};
use crate::tests::create_or_open_wallet::create_or_open_wallet;
use crate::tests::{assert_json_eq, create_doc_with_data};
use async_std::stream::StreamExt;
use ng_net::app_protocol::{AppResponse, AppResponseV0, NuriV0};
use ng_net::orm::{
    BasicType, OrmSchemaDataType, OrmSchemaLiteralType, OrmSchemaPredicate, OrmSchemaShape,
    OrmShapeType,
};

use ng_repo::log_info;
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;

#[async_std::test]
async fn test_orm_patch_creation() {
    // Setup wallet and document
    let (_wallet, session_id) = create_or_open_wallet().await;

    // Tests below all in this test, to prevent waiting times through wallet creation.

    // // ===
    // test_patch_add_array(session_id).await;
    // test_patch_remove_array(session_id).await;

    // // ===
    // test_patch_add_nested_1(session_id).await;

    // ===
    test_patch_nested_house_inhabitants(session_id).await;

    // // ===
    // test_orm_literal(session_id).await;

    // // ===
    // test_orm_multi_type(session_id).await;

    // // ===
    // test_orm_nested_1(session_id).await;

    // // // ===
    // // test_orm_nested_2(session_id).await;

    // // // ===
    // // test_orm_nested_3(session_id).await;

    // // ===
    // test_orm_nested_4(session_id).await;
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
                        valType: OrmSchemaLiteralType::literal,
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
                        valType: OrmSchemaLiteralType::number,
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

    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, cancel_fn) = orm_start(nuri, shape_type, session_id)
        .await
        .expect("orm_start");

    while let Some(app_response) = receiver.next().await {
        let _ = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::OrmInitial(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        break;
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

    while let Some(app_response) = receiver.next().await {
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
                "value": Value::Null
            },
            {
                "op": "add",
                "value": "urn:test:numArrayObj4",
                "path": "/urn:test:numArrayObj4/id",
                "valType": Value::Null,
            },
            {
                "op": "add",
                "value": "http://example.org/TestObject",
                "path": "/urn:test:numArrayObj4/type",
                "valType": Value::Null,
            },
            {
                "op": "add",
                "valType": "set",
                "value": [0.0],
                "path": "/urn:test:numArrayObj4/numArray",
            },
        ]);

        let mut actual = json!(patches);
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
                        valType: OrmSchemaLiteralType::literal,
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
                        valType: OrmSchemaLiteralType::number,
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

    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, cancel_fn) = orm_start(nuri, shape_type, session_id)
        .await
        .expect("orm_start");

    while let Some(app_response) = receiver.next().await {
        let _ = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::OrmInitial(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        break;
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

    while let Some(app_response) = receiver.next().await {
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
                            valType: OrmSchemaLiteralType::shape,
                            literals: None,
                            shape: Some("http://example.org/MultiNestShape1".to_string()),
                        },
                        OrmSchemaDataType {
                            valType: OrmSchemaLiteralType::shape,
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
                        valType: OrmSchemaLiteralType::shape,
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
                    valType: OrmSchemaLiteralType::string,
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
                    valType: OrmSchemaLiteralType::string,
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
                    valType: OrmSchemaLiteralType::string,
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

    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, cancel_fn) = orm_start(nuri, shape_type, session_id)
        .await
        .expect("orm_start");

    while let Some(app_response) = receiver.next().await {
        let orm_json = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::OrmInitial(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        break;
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

    while let Some(app_response) = receiver.next().await {
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
                // "valType": None,
                // "value": None,
            },
            {
                "op": "add",
                // "valType": None,
                "value": "replacing object shape view",
                "path": "/urn:test:oj1/multiNest/urn:test:multiNested2/string1",
            },
            {
                "op": "add",
                "valType": "object",
                // "value": None,
                "path": "/urn:test:oj1/multiNest/urn:test:multiNested4",
            },
            {
                "op": "add",
                // "valType": None,
                "value": "urn:test:multiNested4",
                "path": "/urn:test:oj1/multiNest/urn:test:multiNested4/id",
            },
            {
                "op": "add",
                // "valType": None,
                "value": "multi 4 added",
                "path": "/urn:test:oj1/multiNest/urn:test:multiNested4/string2",
            },
            {
                "op": "remove",
                // "valType": None,
                // "value": None,
                "path": "/urn:test:oj1/singleNest/str",
            },
            {
                "op": "add",
                // "valType": None,
                "value": "Different nested val",
                "path": "/urn:test:oj1/singleNest/str",
            },
        ]);

        let mut actual = json!(patches);
        assert_json_eq(&mut expected, &mut actual);

        break;
    }
}

// Temporary file - content to be appended to orm_patches.rs

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
                        valType: OrmSchemaLiteralType::literal,
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
                        valType: OrmSchemaLiteralType::string,
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
                        valType: OrmSchemaLiteralType::shape,
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
                        valType: OrmSchemaLiteralType::literal,
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
                        valType: OrmSchemaLiteralType::string,
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
                        valType: OrmSchemaLiteralType::shape,
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
                        valType: OrmSchemaLiteralType::literal,
                        literals: Some(vec![BasicType::Str("http://example.org/Cat".to_string())]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/catName".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "name".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::string,
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

    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, cancel_fn) = orm_start(nuri, shape_type, session_id)
        .await
        .expect("orm_start");

    // Get initial state
    while let Some(app_response) = receiver.next().await {
        let _ = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::OrmInitial(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        break;
    }

    log_info!(
        "\n=== TEST 1: INSERT - Adding new person with cat, modifying existing properties ===\n"
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
        ex:catName "Mittens" .

    <urn:test:cat3>
        a ex:Cat ;
        ex:catName "Fluffy" .
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
                "path": "/urn:test:house1/inhabitants/urn:test:person2/cat/id",
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
            // New person Charlie with cat
            {
                "op": "add",
                "valType": "object",
                "path": "/urn:test:house1/inhabitants/urn:test:person3",
            },
            {
                "op": "add",
                "value": "urn:test:person3",
                "path": "/urn:test:house1/inhabitants/urn:test:person3/id",
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
                "path": "/urn:test:house1/inhabitants/urn:test:person3/cat/id",
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
        ]);

        let mut actual = json!(patches);
        assert_json_eq(&mut expected, &mut actual);

        break;
    }

    log_info!("\n=== TEST 2: DELETE - Removing cat, person, and modifying properties ===\n");

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

    <urn:test:cat3>
        a ex:Cat ;
        ex:catName "Fluffy" .
}
;
INSERT DATA {
    <urn:test:cat2>
        ex:catName "Mr. Mittens" .
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
                "op": "remove",
                "path": "/urn:test:house1/inhabitants/urn:test:person2/cat/name",
            },
            {
                "op": "add",
                "value": "Mr. Mittens",
                "path": "/urn:test:house1/inhabitants/urn:test:person2/cat/name",
            },
            // Charlie and his cat are removed
            {
                "op": "remove",
                "valType": "object",
                "path": "/urn:test:house1/inhabitants/urn:test:person3",
            },
        ]);

        let mut actual = json!(patches);
        assert_json_eq(&mut expected, &mut actual);

        break;
    }
}
