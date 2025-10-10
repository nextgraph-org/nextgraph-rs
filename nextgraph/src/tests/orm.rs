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
use async_std::stream::StreamExt;
use ng_net::app_protocol::{AppResponse, AppResponseV0, NuriV0};
use ng_net::orm::{
    BasicType, OrmSchema, OrmSchemaDataType, OrmSchemaLiteralType, OrmSchemaPredicate,
    OrmSchemaShape, OrmShapeType,
};
use ng_verifier::orm::utils::shape_type_to_sparql;

use ng_repo::log_info;
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


    <urn:test:obj2> a ex:TestObject ;
      ex:stringValue "hello world #2" ;
      ex:numValue 422 ;
      ex:boolValue false ;
      ex:arrayValue 4,5,6 ;
      ex:objectValue [
        ex:nestedString "nested2" ;
        ex:nestedNum 72 ;
        ex:nestedArray 7,8,9
      ] ;
      ex:anotherObject [
        ex:prop1 "one2" ;
        ex:prop2 12
      ], [
        ex:prop1 "two2" ;
        ex:prop2 22
      ] ;
      ex:numOrStr 4 ;
      ex:lit1Or2 "lit2" ;
      ex:unrelated "some value2" ;
      ex:anotherUnrelated 42422 .
}
"#
    .to_string();

    doc_sparql_update(session_id, insert_sparql, Some(doc_nuri.clone()))
        .await
        .expect("SPARQL update failed");

    // Define the ORM schema
    let schema = create_big_schema();

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/TestObject".to_string(),
    };

    log_info!("starting orm test");
    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, cancel_fn) = orm_start(nuri, shape_type, session_id)
        .await
        .expect("orm_start");

    log_info!("orm_start called");

    // TODO: remove this call to cancel_fn()
    cancel_fn();

    // TODO : change the data with sparql_query

    while let Some(app_response) = receiver.next().await {
        let orm_json = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::OrmInitial(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        log_info!("ORM JSON arrived\n: {:?}", orm_json);

        // TODO: after we got what we wanted, call cancel_fn, otherwise the test never ends.
    }
    //
}

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
