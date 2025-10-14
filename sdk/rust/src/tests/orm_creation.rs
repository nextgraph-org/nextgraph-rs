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
    BasicType, OrmSchema, OrmSchemaDataType, OrmSchemaLiteralType, OrmSchemaPredicate,
    OrmSchemaShape, OrmShapeType,
};
use ng_verifier::orm::utils::shape_type_to_sparql;

use ng_repo::{log_err, log_info};
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;

#[async_std::test]
async fn test_create_sparql_from_schema() {
    // Setup wallet and document
    let (_wallet, session_id) = create_or_open_wallet().await;
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

    // Insert data with unrelated predicates
    let insert_sparql = r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:obj1> a ex:TestObject ;
      ex:stringValue "hello world" ;
      ex:numValue 42 ;
      ex:boolValue true ;
      ex:arrayValue 1,2,3 ;
      ex:objectValue [
        ex:nestedString "nested" ;
        ex:nestedNum 7 ;
        ex:nestedArray 5,6
      ] ;
      ex:anotherObject [
        ex:prop1 "one" ;
        ex:prop2 1
      ], [
        ex:prop1 "two" ;
        ex:prop2 2
      ] ;
      ex:numOrStr "either" ;
      ex:lit1Or2 "lit1" ;
      ex:unrelated "some value" ;
      ex:anotherUnrelated 4242 .
}
"#
    .to_string();

    doc_sparql_update(session_id, insert_sparql, Some(doc_nuri.clone()))
        .await
        .expect("SPARQL update failed");

    let schema = create_big_schema();
    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/TestObject".to_string(),
    };

    // Generate and execute the CONSTRUCT query
    let query = shape_type_to_sparql(&shape_type.schema, &shape_type.shape, None).unwrap();

    let triples = doc_sparql_construct(session_id, query, Some(doc_nuri.clone()))
        .await
        .expect("SPARQL construct failed");

    // Assert the results
    let predicates: Vec<String> = triples
        .iter()
        .map(|t| t.predicate.as_str().to_string())
        .collect();

    // Expected predicates based on the schema
    let expected_predicates = vec![
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        "http://example.org/stringValue",
        "http://example.org/numValue",
        "http://example.org/boolValue",
        "http://example.org/arrayValue",
        "http://example.org/objectValue",
        "http://example.org/anotherObject",
        "http://example.org/numOrStr",
        "http://example.org/lit1Or2",
        "http://example.org/nestedString",
        "http://example.org/nestedNum",
        "http://example.org/nestedArray",
        "http://example.org/prop1",
        "http://example.org/prop2",
    ];

    for p in expected_predicates {
        assert!(
            predicates.contains(&p.to_string()),
            "Missing predicate: {}",
            p
        );
    }

    // Unrelated predicates should not be in the result
    assert!(
        !predicates.contains(&"http://example.org/unrelated".to_string()),
        "Found unrelated predicate"
    );
    assert!(
        !predicates.contains(&"http://example.org/anotherUnrelated".to_string()),
        "Found another unrelated predicate"
    );
}

#[async_std::test]
async fn test_orm_query_partial_match_missing_required() {
    // Setup
    let (_wallet, session_id) = create_or_open_wallet().await;
    let doc_nuri = doc_create(
        session_id,
        "Graph".to_string(),
        "test_orm_partial_required".to_string(),
        "store".to_string(),
        None,
        None,
    )
    .await
    .unwrap();

    // Insert data missing a required field (`prop2`)
    let insert_sparql = r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:obj1> a ex:TestObject ;
      ex:prop1 "one" .
}
"#
    .to_string();
    doc_sparql_update(session_id, insert_sparql, Some(doc_nuri.clone()))
        .await
        .unwrap();

    // Schema with two required fields
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/TestObject".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/TestObject".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/prop1".to_string(),
                    minCardinality: 1,
                    ..Default::default()
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/prop2".to_string(),
                    minCardinality: 1,
                    ..Default::default()
                }),
            ],
        }),
    );
    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/TestObject".to_string(),
    };

    // Generate and run query
    let query = shape_type_to_sparql(&shape_type.schema, &shape_type.shape, None).unwrap();
    let triples = doc_sparql_construct(session_id, query, Some(doc_nuri.clone()))
        .await
        .unwrap();

    // Assert: No triples should be returned as the object is incomplete.
    assert!(triples.is_empty());
}

#[async_std::test]
async fn test_orm_query_partial_match_missing_optional() {
    // Setup
    let (_wallet, session_id) = create_or_open_wallet().await;
    let doc_nuri = doc_create(
        session_id,
        "Graph".to_string(),
        "test_orm_partial_optional".to_string(),
        "store".to_string(),
        None,
        None,
    )
    .await
    .unwrap();

    // Insert data missing an optional field (`prop2`)
    let insert_sparql = r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:obj1> a ex:TestObject ;
      ex:prop1 "one" .
}
"#
    .to_string();
    doc_sparql_update(session_id, insert_sparql, Some(doc_nuri.clone()))
        .await
        .unwrap();

    // Schema with one required and one optional field
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/TestObject".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/TestObject".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/prop1".to_string(),
                    minCardinality: 1,
                    ..Default::default()
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/prop2".to_string(),
                    minCardinality: 0, // Optional
                    ..Default::default()
                }),
            ],
        }),
    );
    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/TestObject".to_string(),
    };

    // Generate and run query
    let query = shape_type_to_sparql(&shape_type.schema, &shape_type.shape, None).unwrap();
    let triples = doc_sparql_construct(session_id, query, Some(doc_nuri.clone()))
        .await
        .unwrap();

    // Assert: One triple for prop1 should be returned.
    assert_eq!(triples.len(), 1);
    assert_eq!(triples[0].predicate.as_str(), "http://example.org/prop1");
}

#[async_std::test]
async fn test_orm_query_cyclic_schema() {
    // Setup
    let (_wallet, session_id) = create_or_open_wallet().await;
    let doc_nuri = doc_create(
        session_id,
        "Graph".to_string(),
        "test_orm_cyclic".to_string(),
        "store".to_string(),
        None,
        None,
    )
    .await
    .unwrap();

    // Insert cyclic data (two people who know each other)
    let insert_sparql = r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:p1> a ex:Person ; ex:name "Alice" ; ex:knows <urn:p2> .
    <urn:p2> a ex:Person ; ex:name "Bob" ; ex:knows <urn:p1> .
}
"#
    .to_string();
    doc_sparql_update(session_id, insert_sparql, Some(doc_nuri.clone()))
        .await
        .unwrap();

    // Cyclic schema: Person has a `knows` predicate pointing to another Person
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/Person".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Person".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    minCardinality: 1,
                    ..Default::default()
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/name".to_string(),
                    minCardinality: 1,
                    ..Default::default()
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/knows".to_string(),
                    minCardinality: 0,
                    maxCardinality: -1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::shape,
                        shape: Some("http://example.org/Person".to_string()),
                        literals: None,
                    }],
                    ..Default::default()
                }),
            ],
        }),
    );
    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/Person".to_string(),
    };

    // Generate and run query. This must not infinite loop.
    let query = shape_type_to_sparql(&shape_type.schema, &shape_type.shape, None).unwrap();
    let triples = doc_sparql_construct(session_id, query, Some(doc_nuri.clone()))
        .await
        .unwrap();

    // Assert: All 6 triples (3 per person) should be returned.
    assert_eq!(triples.len(), 6);
}

#[async_std::test]
async fn test_orm_creation() {
    // Setup wallet and document
    let (_wallet, session_id) = create_or_open_wallet().await;

    // Tests below all in this test, to prevent waiting times through wallet creation.

    // ===
    test_orm_big_object(session_id).await;

    // ===
    test_orm_root_array(session_id).await;

    // ===
    test_orm_with_optional(session_id).await;

    // ===
    test_orm_literal(session_id).await;

    // ===
    test_orm_multi_type(session_id).await;

    // ===
    test_orm_nested_1(session_id).await;

    // // ===
    // test_orm_nested_2(session_id).await;

    // // ===
    // test_orm_nested_3(session_id).await;

    // ===
    test_orm_nested_4(session_id).await;
}

async fn test_orm_big_object(session_id: u64) {
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:obj1> a ex:TestObject ;
      ex:stringValue "hello world" ;
      ex:numValue 42 ;
      ex:boolValue true ;
      ex:arrayValue 1,2,3 ;
      ex:objectValue <urn:test:id3> ;
      ex:anotherObject <urn:test:id1>, <urn:test:id2> ;
      ex:numOrStr "either" ;
      ex:lit1Or2 "lit1" ;
      ex:unrelated "some value" ;
      ex:anotherUnrelated 4242 .

    <urn:test:id3>
        ex:nestedString "nested" ;
        ex:nestedNum 7 ;
        ex:nestedArray 5,6 .

    <urn:test:id1>
        ex:prop1 "one" ;
        ex:prop2 1 .

    <urn:test:id2>
        ex:prop1 "two" ;
        ex:prop2 2 .

    <urn:test:obj2> a ex:TestObject ;
      ex:stringValue "hello world #2" ;
      ex:numValue 422 ;
      ex:boolValue false ;
      ex:arrayValue 4,5,6 ;
      ex:objectValue <urn:test:id6> ;
      ex:anotherObject <urn:test:id4>, <urn:test:id5> ;
      ex:numOrStr 4 ;
      ex:lit1Or2 "lit2" ;
      ex:unrelated "some value2" ;
      ex:anotherUnrelated 42422 .

    <urn:test:id6>
        ex:nestedString "nested2" ;
        ex:nestedNum 72 ;
        ex:nestedArray 7,8,9 .

    <urn:test:id4>
        ex:prop1 "one2" ;
        ex:prop2 12 .

    <urn:test:id5>
        ex:prop1 "two2" ;
        ex:prop2 22 .
}
"#
        .to_string(),
    )
    .await;

    // Define the ORM schema
    let schema = create_big_schema();

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/TestObject".to_string(),
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

        let mut expected = json!([{
            "type":"http://example.org/TestObject",
            "id":"urn:test:obj1",
            "anotherObject":{
                "urn:test:id1":{
                    "prop1":"one",
                    "prop2":1.0
                },
                "urn:test:id2":{
                    "prop1":"two",
                    "prop2":2.0
                }
            },
            "arrayValue":[3.0,2.0,1.0],
            "boolValue":true,
            "lit1Or2":"lit1",
            "numOrStr":"either",
            "numValue":42.0,
            "objectValue":{
                "id":"urn:test:id3",
                "nestedArray":[5.0,6.0],
                "nestedNum":7.0,
                "nestedString":"nested"
            },
            "stringValue": "hello world",
        },
        {
            "id":"urn:test:obj2",
            "type":"http://example.org/TestObject",
            "anotherObject": {
                "urn:test:id4":{
                    "prop1":"one2",
                    "prop2":12.0
                },
                "urn:test:id5":{
                    "prop1":"two2",
                    "prop2":22.0
                }
            },
            "arrayValue":[6.0,5.0,4.0],
            "boolValue":false,
            "lit1Or2":"lit2",
            "numOrStr":4.0,
            "numValue":422.0,
            "objectValue":{
                "id":"urn:test:id6",
                "nestedArray": [7.0,8.0,9.0],
                "nestedNum":72.0,
                "nestedString":"nested2"
            },
            "stringValue":"hello world #2",
        }]);

        let mut actual_mut = orm_json.clone();
        assert_json_eq(&mut expected, &mut actual_mut);

        break;
    }
    cancel_fn();
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

    # Invalid
    <urn:test:otherObj> a ex:Other ;
        ex:arr 1, 2 .
    
    # Invalid
    <urn:test:numStringArrayObj1> a ex:TestObject ;
        ex:unrelated ex:TestObject ;
        ex:arr 1, "2" .

    # Invalid
    <urn:test:stringArrayObj1> a ex:TestObject ;
        ex:unrelated ex:TestObject ;
        ex:arr "1", "2" .
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
        let orm_json = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::OrmInitial(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

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

        let mut actual_mut = orm_json.clone();
        assert_json_eq(&mut expected, &mut actual_mut);

        break;
    }
    cancel_fn();
}

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

//
// Helpers
fn create_big_schema() -> OrmSchema {
    // Define the ORM schema
    let mut schema: OrmSchema = HashMap::new();

    // Base shape
    schema.insert(
        "http://example.org/TestObject".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/TestObject".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::literal,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/TestObject".to_string(),
                        )]),
                        shape: None,
                    }],
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    readablePredicate: "type".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    extra: Some(true),
                }),
                Arc::new(OrmSchemaPredicate {
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::string,
                        literals: None,
                        shape: None,
                    }],
                    iri: "http://example.org/stringValue".to_string(),
                    readablePredicate: "stringValue".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    extra: None,
                }),
                Arc::new(OrmSchemaPredicate {
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::number,
                        literals: None,
                        shape: None,
                    }],
                    iri: "http://example.org/numValue".to_string(),
                    readablePredicate: "numValue".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    extra: None,
                }),
                Arc::new(OrmSchemaPredicate {
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::boolean,
                        literals: None,
                        shape: None,
                    }],
                    iri: "http://example.org/boolValue".to_string(),
                    readablePredicate: "boolValue".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    extra: None,
                }),
                Arc::new(OrmSchemaPredicate {
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::number,
                        literals: None,
                        shape: None,
                    }],
                    iri: "http://example.org/arrayValue".to_string(),
                    readablePredicate: "arrayValue".to_string(),
                    maxCardinality: -1,
                    minCardinality: 0,
                    extra: None,
                }),
                Arc::new(OrmSchemaPredicate {
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::shape,
                        literals: None,
                        shape: Some(
                            "http://example.org/TestObject||http://example.org/objectValue"
                                .to_string(),
                        ),
                    }],
                    iri: "http://example.org/objectValue".to_string(),
                    readablePredicate: "objectValue".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    extra: None,
                }),
                Arc::new(OrmSchemaPredicate {
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::shape,
                        literals: None,
                        shape: Some(
                            "http://example.org/TestObject||http://example.org/anotherObject"
                                .to_string(),
                        ),
                    }],
                    iri: "http://example.org/anotherObject".to_string(),
                    readablePredicate: "anotherObject".to_string(),
                    maxCardinality: -1,
                    minCardinality: 0,
                    extra: None,
                }),
                Arc::new(OrmSchemaPredicate {
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
                    iri: "http://example.org/numOrStr".to_string(),
                    readablePredicate: "numOrStr".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    extra: None,
                }),
                Arc::new(OrmSchemaPredicate {
                    dataTypes: vec![
                        OrmSchemaDataType {
                            valType: OrmSchemaLiteralType::literal,
                            literals: Some(vec![BasicType::Str("lit1".to_string())]),
                            shape: None,
                        },
                        OrmSchemaDataType {
                            valType: OrmSchemaLiteralType::literal,
                            literals: Some(vec![BasicType::Str("lit2".to_string())]),
                            shape: None,
                        },
                    ],
                    iri: "http://example.org/lit1Or2".to_string(),
                    readablePredicate: "lit1Or2".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    extra: None,
                }),
            ],
        }),
    );

    // a nested shape (http://example.org/anotherObject)
    schema.insert(
        "http://example.org/TestObject||http://example.org/anotherObject".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/TestObject||http://example.org/anotherObject".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::string,
                        literals: None,
                        shape: None,
                    }],
                    iri: "http://example.org/prop1".to_string(),
                    readablePredicate: "prop1".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    extra: None,
                }),
                Arc::new(OrmSchemaPredicate {
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::number,
                        literals: None,
                        shape: None,
                    }],
                    iri: "http://example.org/prop2".to_string(),
                    readablePredicate: "prop2".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    extra: None,
                }),
            ],
        }),
    );

    // another nested shape (http://example.org/objectValue)
    schema.insert(
        "http://example.org/TestObject||http://example.org/objectValue".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/TestObject||http://example.org/objectValue".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::string,
                        literals: None,
                        shape: None,
                    }],
                    iri: "http://example.org/nestedString".to_string(),
                    readablePredicate: "nestedString".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    extra: None,
                }),
                Arc::new(OrmSchemaPredicate {
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::number,
                        literals: None,
                        shape: None,
                    }],
                    iri: "http://example.org/nestedNum".to_string(),
                    readablePredicate: "nestedNum".to_string(),
                    maxCardinality: 1,
                    minCardinality: 1,
                    extra: None,
                }),
                Arc::new(OrmSchemaPredicate {
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaLiteralType::number,
                        literals: None,
                        shape: None,
                    }],
                    iri: "http://example.org/nestedArray".to_string(),
                    readablePredicate: "nestedArray".to_string(),
                    maxCardinality: -1,
                    minCardinality: 0,
                    extra: None,
                }),
            ],
        }),
    );

    return schema;
}
