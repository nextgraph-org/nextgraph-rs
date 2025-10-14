// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use crate::local_broker::{doc_create, doc_sparql_construct, doc_sparql_update, orm_start};
use crate::tests::create_or_open_wallet::create_or_open_wallet;
use crate::tests::{assert_json_eq, create_doc_with_data};
use async_std::stream::StreamExt;
use ng_net::app_protocol::{AppResponse, AppResponseV0, NuriV0};
use ng_net::orm::{
    self, BasicType, OrmSchema, OrmSchemaDataType, OrmSchemaLiteralType, OrmSchemaPredicate,
    OrmSchemaShape, OrmShapeType,
};
use ng_verifier::orm::utils::shape_type_to_sparql;

use ng_repo::{log_debug, log_info};
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;

#[async_std::test]
async fn test_orm_path_creation() {
    // Setup wallet and document
    let (_wallet, session_id) = create_or_open_wallet().await;

    // Tests below all in this test, to prevent waiting times through wallet creation.

    // ===
    test_orm_root_array(session_id).await;

    // // ===
    // test_orm_with_optional(session_id).await;

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

async fn test_orm_root_array(session_id: u64) {
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
        ex:arr 1 .

    <urn:test:numArrayObj3>
        ex:arr 3 .
}
"#
        .to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("2nd SPARQL update failed");

    cancel_fn();
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
                "id": "urn:test:numArrayObj1",
                "type": "http://example.org/TestObject",
                "numArray": [1.0, 2.0, 3.0]
            },
            {
                "id": "urn:test:numArrayObj2",
                "type": "http://example.org/TestObject",
                "numArray": []
            },
            {
                "id": "urn:test:numArrayObj3",
                "type": "http://example.org/TestObject",
                "numArray": [1.0, 2.0]
            }
        ]);

        let mut actual_mut = patches.clone();
        // assert_json_eq(&mut expected, actual_mut);

        break;
    }
}

/*






*/
//
async fn test_orm_with_optional(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:oj1> 
        ex:opt true ;
        ex:str "s1" .

    # Contains no matching data
    <urn:test:oj2> 
        ex:str "s2" .
}
"#
        .to_string(),
    )
    .await;

    // Define the ORM schema
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/OptionShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/OptionShape".to_string(),
            predicates: vec![OrmSchemaPredicate {
                iri: "http://example.org/opt".to_string(),
                extra: Some(false),
                maxCardinality: 1,
                minCardinality: 1,
                readablePredicate: "opt".to_string(),
                dataTypes: vec![OrmSchemaDataType {
                    valType: OrmSchemaLiteralType::boolean,
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
        shape: "http://example.org/OptionShape".to_string(),
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

        let mut expected = json!([
            {
                "id": "urn:test:oj1",
                "opt": true
            }
        ]);

        let mut actual_mut = orm_json.clone();
        assert_json_eq(&mut expected, &mut actual_mut);

        break;
    }
    cancel_fn();
}

async fn test_orm_literal(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:oj1> 
        ex:lit1 "lit 1" ;
        ex:lit2 "lit 2" .   

    # Valid because ex:lit1 allows extra.
    <urn:test:obj2> 
        ex:lit1 "lit 1", "lit 1 extra" ;
        ex:lit2 "lit 2" .

    # Invalid because ex:lit2 does not allow extra.
    <urn:test:obj3> 
        ex:lit1 "lit 1" ;
        ex:lit2 "lit 2", "lit 2 extra" .
}
"#
        .to_string(),
    )
    .await;

    // Define the ORM schema
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/OptionShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/OptionShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://example.org/lit1".to_string(),
                    extra: Some(true),
                    maxCardinality: -1,
                    minCardinality: 1,
                    readablePredicate: "lit1".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::literal,
                        literals: Some(vec![BasicType::Str("lit 1".to_string())]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/lit2".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "lit2".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::literal,
                        literals: Some(vec![BasicType::Str("lit 2".to_string())]),
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
        shape: "http://example.org/OptionShape".to_string(),
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

        let mut expected = json!([
            {
                "id": "urn:test:oj1",
                "lit1": ["lit 1"],
                "lit2": "lit 2"
            },
            {
                "id": "urn:test:obj2",
                "lit1": ["lit 1", "lit 1 extra"],
                "lit2": "lit 2"
            }
        ]);

        let mut actual_mut = orm_json.clone();
        assert_json_eq(&mut expected, &mut actual_mut);

        break;
    }
    cancel_fn();
}

async fn test_orm_multi_type(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:oj1> 
        ex:strOrNum "a string" ;
        ex:strOrNum "another string" ;
        ex:strOrNum 2 .

    # Invalid because false is not string or number.
    <urn:test:obj2> 
        ex:strOrNum "a string2" ;
        ex:strOrNum 2 ;
        ex:strOrNum false .
}
"#
        .to_string(),
    )
    .await;

    // Define the ORM schema
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/MultiTypeShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/MultiTypeShape".to_string(),
            predicates: vec![OrmSchemaPredicate {
                iri: "http://example.org/strOrNum".to_string(),
                extra: Some(true),
                maxCardinality: -1,
                minCardinality: 1,
                readablePredicate: "strOrNum".to_string(),
                dataTypes: vec![
                    OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::string,
                        literals: None,
                        shape: None,
                    },
                    OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::number,
                        literals: None,
                        shape: None,
                    },
                ],
            }
            .into()],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/MultiTypeShape".to_string(),
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

        let mut expected = json!([
            {
                "id": "urn:test:oj1",
                "strOrNum": ["a string", "another string", 2.0]
            }
        ]);

        let mut actual_mut = orm_json.clone();
        assert_json_eq(&mut expected, &mut actual_mut);

        break;
    }
    cancel_fn();
}

async fn test_orm_nested_1(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    # Valid
    <urn:test:oj1> 
        ex:str "obj1 str" ;
        ex:nestedWithExtra <urn:test:nested1>, <urn:test:nested2> ;
        ex:nestedWithoutExtra <urn:test:nested3> .

    <urn:test:nested1>
        ex:nestedStr "obj1 nested with extra valid" ;
        ex:nestedNum 2 .

    <urn:test:nested2>
        ex:nestedStr "obj1 nested with extra invalid" .

    <urn:test:nested3>
        ex:nestedStr "obj1 nested without extra valid" ;
        ex:nestedNum 2 .

    # Invalid because nestedWithoutExtra has an invalid child.
    <urn:test:oj2> 
        ex:str "obj2 str" ;
        ex:nestedWithExtra <urn:test:nested4> ;
        ex:nestedWithoutExtra <urn:test:nested5>, <urn:test:nested6> .

    <urn:test:nested4>
        ex:nestedStr "obj2: a nested string valid" ;
        ex:nestedNum 2 .

    <urn:test:nested5>
        ex:nestedStr "obj2 nested without extra valid" ;
        ex:nestedNum 2 .

    # Invalid because nestedNum is missing.
    <urn:test:nested6>
        ex:nestedStr "obj2 nested without extra invalid" .
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
                    iri: "http://example.org/str".to_string(),
                    extra: None,
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "str".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::string,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/nestedWithExtra".to_string(),
                    extra: Some(true),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "nestedWithExtra".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::shape,
                        literals: None,
                        shape: Some("http://example.org/NestedShapeWithExtra".to_string()),
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/nestedWithoutExtra".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "nestedWithoutExtra".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::shape,
                        literals: None,
                        shape: Some("http://example.org/NestedShapeWithoutExtra".to_string()),
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );
    schema.insert(
        "http://example.org/NestedShapeWithExtra".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/NestedShapeWithExtra".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://example.org/nestedStr".to_string(),
                    extra: None,
                    readablePredicate: "nestedStr".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::string,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/nestedNum".to_string(),
                    extra: None,
                    readablePredicate: "nestedNum".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::number,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );
    schema.insert(
        "http://example.org/NestedShapeWithoutExtra".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/NestedShapeWithoutExtra".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://example.org/nestedStr".to_string(),
                    extra: None,
                    readablePredicate: "nestedStr".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::string,
                        literals: None,
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/nestedNum".to_string(),
                    extra: None,
                    readablePredicate: "nestedNum".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::number,
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

        let mut expected = json!([
            {
                "id": "urn:test:oj1",
                "str": "obj1 str",
                "nestedWithExtra": {
                    "nestedStr": "obj1 nested with extra valid",
                    "nestedNum": 2.0
                },
                "nestedWithoutExtra": {
                    "nestedStr": "obj1 nested without extra valid",
                    "nestedNum": 2.0
                }
            }
        ]);

        let mut actual_mut = orm_json.clone();
        assert_json_eq(&mut expected, &mut actual_mut);

        break;
    }
    cancel_fn();
}

async fn test_orm_nested_2(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    # Valid
    <urn:test:alice> 
        ex:knows <urn:test:bob>, <urn:test:claire> ;
        ex:name "Alice" .
    <urn:test:bob>
        ex:knows <urn:test:claire> ;
        ex:name "Bob" .
    <urn:test:claire>
        ex:name "Claire" .

    # Invalid because claire2 is invalid
    <urn:test:alice2> 
        ex:knows <urn:test:bob2>, <urn:test:claire2> ;
        ex:name "Alice" .
    # Invalid because claire2 is invalid
    <urn:test:bob2>
        ex:knows <urn:test:claire2> ;
        ex:name "Bob" .
    # Invalid because name is missing.
    <urn:test:claire2>
        ex:missingName "Claire missing" .
}
"#
        .to_string(),
    )
    .await;

    // Define the ORM schema
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/PersonShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/PersonShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://example.org/name".to_string(),
                    extra: None,
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
                    iri: "http://example.org/knows".to_string(),
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
                    readablePredicate: "knows".to_string(),
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

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/PersonShape".to_string(),
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

        log_info!(
            "ORM JSON arrived for nested2 (person) test\n: {:?}",
            orm_json
        );

        // Expected: alice and bob with their nested knows relationships
        // claire2 is invalid (missing name), so alice2's knows chain is incomplete
        let mut expected = json!([
            {
                "id": "urn:test:alice",
                "name": "Alice",
                "knows": {
                    "urn:test:bob": {
                        "name": "Bob",
                        "knows": {
                            "urn:test:claire": {
                                "name": "Claire",
                                "knows": {}
                            }
                        }
                    },
                    "urn:test:claire": {
                        "name": "Claire",
                        "knows": {}
                    }
                }
            },
            {
                "id": "urn:test:bob",
                "name": "Bob",
                "knows": {
                    "urn:test:claire": {
                        "name": "Claire",
                        "knows": {}
                    }
                }
            },
            {
                "id": "urn:test:claire",
                "name": "Claire",
                "knows": {}
            }
        ]);

        let mut actual_mut = orm_json.clone();
        log_info!(
            "JSON for nested2\n{}",
            serde_json::to_string(&actual_mut).unwrap()
        );
        assert_json_eq(&mut expected, &mut actual_mut);

        break;
    }
    cancel_fn();
}

async fn test_orm_nested_3(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    # Valid
    <urn:test:alice> 
        a ex:Alice ;
        ex:knows <urn:test:bob>, <urn:test:claire> .
    <urn:test:bob>
        a ex:Bob ;
        ex:knows <urn:test:claire> .
    <urn:test:claire>
        a ex:Claire .

    # Invalid because claire is invalid
    <urn:test:alice2> 
        a ex:Alice ;
        ex:knows <urn:test:bob2>, <urn:test:claire2> .
    # Invalid because claire is invalid
    <urn:test:bob2>
        a ex:Bob ;
        ex:knows <urn:test:claire2> .
    # Invalid, wrong type.
    <urn:test:claire2>
        a ex:Claire2 .
}
"#
        .to_string(),
    )
    .await;

    // Define the ORM schema
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/AliceShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/AliceShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: None,
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::literal,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Alice".to_string(),
                        )]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/knows".to_string(),
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
                    readablePredicate: "knows".to_string(),
                    dataTypes: vec![
                        OrmSchemaDataType {
                            valType: OrmSchemaLiteralType::shape,
                            literals: None,
                            shape: Some("http://example.org/BobShape".to_string()),
                        },
                        OrmSchemaDataType {
                            valType: OrmSchemaLiteralType::shape,
                            literals: None,
                            shape: Some("http://example.org/ClaireShape".to_string()),
                        },
                    ],
                }
                .into(),
            ],
        }
        .into(),
    );
    schema.insert(
        "http://example.org/BobShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/BobShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(true),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::literal,
                        literals: Some(vec![BasicType::Str("http://example.org/Bob".to_string())]),
                        shape: None,
                    }],
                }
                .into(),
                OrmSchemaPredicate {
                    iri: "http://example.org/knows".to_string(),
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
                    readablePredicate: "knows".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::shape,
                        literals: None,
                        shape: Some("http://example.org/ClaireShape".to_string()),
                    }],
                }
                .into(),
            ],
        }
        .into(),
    );
    schema.insert(
        "http://example.org/ClaireShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/ClaireShape".to_string(),
            predicates: vec![OrmSchemaPredicate {
                iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                extra: None,
                maxCardinality: 1,
                minCardinality: 1,
                readablePredicate: "type".to_string(),
                dataTypes: vec![OrmSchemaDataType {
                    valType: OrmSchemaLiteralType::literal,
                    literals: Some(vec![BasicType::Str(
                        "http://example.org/Claire".to_string(),
                    )]),
                    shape: None,
                }],
            }
            .into()],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/AliceShape".to_string(),
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

        log_info!(
            "ORM JSON arrived for nested3 (person) test\n: {:?}",
            serde_json::to_string(&orm_json).unwrap()
        );

        // Expected: alice with knows relationships to bob and claire
        // alice2 is incomplete because claire2 has wrong type
        let mut expected = json!([
            {
                "id": "urn:test:alice",
                "type": "http://example.org/Alice",
                "knows": {
                    "urn:test:bob": {
                        "type": "http://example.org/Bob",
                        "knows": {
                            "urn:test:claire": {
                                "type": "http://example.org/Claire"
                            }
                        }
                    },
                    "urn:test:claire": {
                        "type": "http://example.org/Claire"
                    }
                }
            }
        ]);

        let mut actual_mut = orm_json.clone();
        assert_json_eq(&mut expected, &mut actual_mut);

        break;
    }
    cancel_fn();
}

async fn test_orm_nested_4(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    # Valid
    <urn:test:alice>
        a ex:Person ;
        ex:hasCat <urn:test:kitten1>, <urn:test:kitten2> .
    <urn:test:kitten1>
        a ex:Cat .
    <urn:test:kitten2>
        a ex:Cat .
}
"#
        .to_string(),
    )
    .await;

    // Define the ORM schema
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/PersonShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/PersonShape".to_string(),
            predicates: vec![
                OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: None,
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
                    iri: "http://example.org/hasCat".to_string(),
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
                    readablePredicate: "cats".to_string(),
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
    schema.insert(
        "http://example.org/CatShape".to_string(),
        OrmSchemaShape {
            iri: "http://example.org/CatShape".to_string(),
            predicates: vec![OrmSchemaPredicate {
                iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                extra: Some(true),
                maxCardinality: 1,
                minCardinality: 1,
                readablePredicate: "type".to_string(),
                dataTypes: vec![OrmSchemaDataType {
                    valType: OrmSchemaLiteralType::literal,
                    literals: Some(vec![BasicType::Str("http://example.org/Cat".to_string())]),
                    shape: None,
                }],
            }
            .into()],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/PersonShape".to_string(),
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

        let mut expected = json!([
            {
                "id": "urn:test:alice",
                "type": "http://example.org/Person",
                "cats": {
                    "urn:test:kitten1": {
                        "type": "http://example.org/Cat"
                    },
                    "urn:test:kitten2": {
                        "type": "http://example.org/Cat"
                    }
                },
            }
        ]);

        let mut actual_mut = orm_json.clone();

        assert_json_eq(&mut expected, &mut actual_mut);

        break;
    }
    cancel_fn();
}
