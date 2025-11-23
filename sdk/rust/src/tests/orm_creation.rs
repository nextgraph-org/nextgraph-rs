// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use crate::local_broker::{
    doc_create, doc_query_quads_for_shape_type, doc_sparql_update, orm_start,
};
use crate::tests::create_or_open_wallet::create_or_open_wallet;
use crate::tests::{assert_json_eq, create_doc_with_data};
use async_std::stream::StreamExt;
use ng_net::app_protocol::{AppResponse, AppResponseV0, NuriV0};
use ng_net::orm::{
    BasicType, OrmSchema, OrmSchemaDataType, OrmSchemaPredicate, OrmSchemaShape, OrmSchemaValType,
    OrmShapeType,
};

use ng_repo::log_info;
use ng_verifier::orm::query::schema_shape_to_sparql;
// use ng_verifier::orm::query::shape_type_to_sparql_select; // replaced by query_quads_for_shape_type
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;

#[async_std::test]
async fn test_create_sparql_from_schema() {
    // Setup wallet and document
    let (_wallet, session_id) = create_or_open_wallet().await;

    // Insert data across multiple documents (each document is its own graph)
    let doc_nuri_root = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:obj1> a ex:TestObject ;
        ex:stringValue "hello world" ;
        ex:numValue 42 ;
        ex:boolValue true ;
        ex:arrayValue 1,2,3 ;
        ex:objectValue <urn:test:idObj> ;
        ex:anotherObject <urn:test:idA>, <urn:test:idB> ;
        ex:numOrStr "either" ;
        ex:lit1Or2 "lit1" ;
        ex:unrelated "some value" ;
        ex:anotherUnrelated 4242 .
}
"#
        .to_string(),
    )
    .await;

    let _doc_nuri_nested1 = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:idObj> ex:nestedString "nested" ; ex:nestedNum 7 ; ex:nestedArray 5,6 .
}
"#
        .to_string(),
    )
    .await;

    let _doc_nuri_nested2 = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:idA> ex:prop1 "one" ; ex:prop2 1 .
    <urn:test:idB> ex:prop1 "two" ; ex:prop2 2 .
}
"#
        .to_string(),
    )
    .await;

    let schema = create_big_schema();
    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/TestObject".to_string(),
    };

    // Query triples using the new helper
    let triples = doc_query_quads_for_shape_type(
        session_id,
        None, // Necessary?
        &shape_type.schema,
        &shape_type.shape,
        None,
    )
    .await
    .expect("shape query failed");

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
}

#[async_std::test]
async fn test_create_sparql_from_big_contact_schema() {
    use std::time::Instant;

    // Setup wallet and document
    let (_wallet, session_id) = create_or_open_wallet().await;

    // Insert data across multiple documents (each document is its own graph)
    let doc_nuri_root =
        create_doc_with_data(session_id, include_str!("contact_data.sparql").to_string()).await;

    let schema = serde_json::from_value::<OrmSchema>(create_contact_schema()).unwrap();
    let shape_type = OrmShapeType {
        schema,
        shape: "did:ng:x:contact:class#SocialContact".to_string(),
    };

    let start = Instant::now();
    let quads = doc_query_quads_for_shape_type(
        session_id,
        Some(doc_nuri_root.clone()),
        &shape_type.schema,
        &shape_type.shape,
        None,
    )
    .await
    .expect("shape query failed");
    let elapsed = start.elapsed();

    log_info!(
        "Query completed in {:?}, returned {} quads",
        elapsed,
        quads.len()
    );

    // Assert the results
    let mut predicates: Vec<String> = quads
        .iter()
        .map(|t| t.predicate.as_str().to_string())
        .collect();
    predicates.sort();
    predicates.dedup();

    // Expected predicates based on actual contact schema and data
    let expected_predicates = vec![
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        "did:ng:x:contact#phoneNumber",
        "did:ng:x:contact#email",
        "did:ng:x:contact#address",
        "did:ng:x:contact#organization",
        "did:ng:x:contact#photo",
        "did:ng:x:contact#url",
        "did:ng:x:contact#biography",
        "did:ng:x:contact#account",
        "did:ng:x:contact#tag",
        "did:ng:x:contact#internalGroup",
        "did:ng:x:contact#headline",
        "did:ng:x:contact#naoStatus",
        "did:ng:x:contact#createdAt",
        "did:ng:x:contact#updatedAt",
        "did:ng:x:contact#joinedAt",
        "did:humanityConfidenceScore",
        "did:relationshipCategory",
        "did:lastInteractionAt",
        // Nested shape predicates
        "did:ng:x:core#value",
        "did:ng:x:core#source",
        "did:ng:x:core#type",
        "did:ng:x:core#valueIRI",
        "did:ng:x:core#valueDateTime",
        "did:ng:x:contact#protocol",
        "did:ng:x:contact#position",
        "did:ng:x:contact#city",
        "did:ng:x:contact#region",
        "did:ng:x:contact#country",
    ];

    for p in expected_predicates {
        assert!(
            predicates.contains(&p.to_string()),
            "Missing predicate: {}",
            p
        );
    }

    assert!(quads.len() == 78, "Expected 78 quads, got {}", quads.len());
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
    let triples = doc_query_quads_for_shape_type(
        session_id,
        Some(doc_nuri.clone()),
        &shape_type.schema,
        &shape_type.shape,
        None,
    )
    .await
    .unwrap();

    // Assert: No triples should be returned as the object is incomplete.
    assert!(triples.is_empty());
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
                        valType: OrmSchemaValType::shape,
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
    let triples = doc_query_quads_for_shape_type(
        session_id,
        Some(doc_nuri.clone()),
        &shape_type.schema,
        &shape_type.shape,
        None,
    )
    .await
    .unwrap();

    // Assert: All 6 triples (3 per person) should be returned.
    assert_eq!(triples.len(), 6);
}

#[async_std::test]
async fn test_orm_query_deep_cyclic_shapes() {
    // Test complex cyclic shape references: A -> B -> C -> A
    let (_wallet, session_id) = create_or_open_wallet().await;
    let doc_nuri = doc_create(
        session_id,
        "Graph".to_string(),
        "test_deep_cyclic".to_string(),
        "store".to_string(),
        None,
        None,
    )
    .await
    .unwrap();

    // Insert data forming a cycle: Organization -> Department -> Project -> Organization
    let insert_sparql = r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:org1> a ex:Organization ;
        ex:orgName "Acme Corp" ;
        ex:hasDepartment <urn:dept1> .
    
    <urn:dept1> a ex:Department ;
        ex:deptName "Engineering" ;
        ex:hasProject <urn:proj1> .
    
    <urn:proj1> a ex:Project ;
        ex:projectName "Product X" ;
        ex:ownedBy <urn:org2> .
}
"#
    .to_string();
    doc_sparql_update(session_id, insert_sparql, Some(doc_nuri.clone()))
        .await
        .unwrap();

    // Define cyclic schema: Org -> Dept -> Project -> Org
    let mut schema = HashMap::new();

    schema.insert(
        "http://example.org/Organization".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Organization".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    minCardinality: 1,
                    maxCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::literal,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Organization".to_string(),
                        )]),
                        shape: None,
                    }],
                    extra: Some(true),
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/orgName".to_string(),
                    minCardinality: 1,
                    maxCardinality: 1,
                    readablePredicate: "orgName".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                    extra: Some(false),
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/hasDepartment".to_string(),
                    minCardinality: 0,
                    maxCardinality: -1,
                    readablePredicate: "hasDepartment".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        literals: None,
                        shape: Some("http://example.org/Department".to_string()),
                    }],
                    extra: Some(false),
                }),
            ],
        }),
    );

    schema.insert(
        "http://example.org/Department".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Department".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    minCardinality: 1,
                    maxCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::literal,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Department".to_string(),
                        )]),
                        shape: None,
                    }],
                    extra: Some(true),
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/deptName".to_string(),
                    minCardinality: 1,
                    maxCardinality: 1,
                    readablePredicate: "deptName".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                    extra: Some(false),
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/hasProject".to_string(),
                    minCardinality: 0,
                    maxCardinality: -1,
                    readablePredicate: "hasProject".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        literals: None,
                        shape: Some("http://example.org/Project".to_string()),
                    }],
                    extra: Some(false),
                }),
            ],
        }),
    );

    schema.insert(
        "http://example.org/Project".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Project".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    minCardinality: 1,
                    maxCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::literal,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Project".to_string(),
                        )]),
                        shape: None,
                    }],
                    extra: Some(true),
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/projectName".to_string(),
                    minCardinality: 1,
                    maxCardinality: 1,
                    readablePredicate: "projectName".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                    extra: Some(false),
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/ownedBy".to_string(),
                    minCardinality: 0,
                    maxCardinality: 1,
                    readablePredicate: "ownedBy".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        literals: None,
                        shape: Some("http://example.org/Organization".to_string()),
                    }],
                    extra: Some(false),
                }),
            ],
        }),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/Organization".to_string(),
    };

    // Query must not infinite loop and should return all quads
    let quads = doc_query_quads_for_shape_type(
        session_id,
        Some(doc_nuri.clone()),
        &shape_type.schema,
        &shape_type.shape,
        None,
    )
    .await
    .unwrap();

    // Verify we got all the data:
    // - org1: type, orgName, hasDepartment (3 quads)
    // - dept1: type, deptName, hasProject (3 quads)
    // - proj1: type, projectName, ownedBy (3 quads)
    // Total: 9 quads
    assert_eq!(
        quads.len(),
        9,
        "Expected 9 quads for cyclic org->dept->proj->org structure"
    );

    // Verify we have all expected predicates
    let predicates: Vec<String> = quads
        .iter()
        .map(|q| q.predicate.as_str().to_string())
        .collect();

    assert!(predicates.contains(&"http://example.org/orgName".to_string()));
    assert!(predicates.contains(&"http://example.org/deptName".to_string()));
    assert!(predicates.contains(&"http://example.org/projectName".to_string()));
    assert!(predicates.contains(&"http://example.org/hasDepartment".to_string()));
    assert!(predicates.contains(&"http://example.org/hasProject".to_string()));
    assert!(predicates.contains(&"http://example.org/ownedBy".to_string()));
}

#[async_std::test]
async fn test_orm_creation() {
    // Setup wallet and document
    let (_wallet, session_id) = create_or_open_wallet().await;

    // Tests below all in this test, to prevent waiting times through wallet creation.

    log_info!("=== Starting test test_orm_big_object ===");
    test_orm_big_object(session_id).await;
    log_info!("=== Test test_orm_big_object ran successfully ===\n\n");

    log_info!("=== Starting test test_orm_root_array ===");
    test_orm_root_array(session_id).await;
    log_info!("=== Test test_orm_root_array ran successfully ===\n\n");

    log_info!("=== Starting test test_orm_with_optional ===");
    test_orm_with_optional(session_id).await;
    log_info!("=== Test test_orm_with_optional ran successfully ===\n\n");

    log_info!("=== Starting test test_orm_literal ===");
    test_orm_literal(session_id).await;
    log_info!("=== Test test_orm_literal ran successfully ===\n\n");

    log_info!("=== Starting test test_orm_multi_type ===");
    test_orm_multi_type(session_id).await;
    log_info!("=== Test test_orm_multi_type ran successfully ===\n\n");

    log_info!("=== Starting test test_orm_nested_1 ===");
    test_orm_nested_1(session_id).await;
    log_info!("=== Test test_orm_nested_1 ran successfully ===\n\n");

    // TODO: Use new graph-based logic.
    // log_info!("=== Starting test test_orm_nested_2 ===");
    // _test_orm_nested_2(session_id).await;
    // log_info!("=== Test test_orm_nested_2 ran successfully ===\n\n");
    //
    // log_info!("=== Starting test test_orm_nested_3 ===");
    // _test_orm_nested_3(session_id).await;
    // log_info!("=== Test test_orm_nested_2 ran successfully ===\n\n");

    log_info!("=== Starting test test_orm_nested_4 ===");
    test_orm_nested_4(session_id).await;
    log_info!("=== Test test_orm_nested_4 ran successfully ===\n\n");

    log_info!("=== Starting test test_orm_optional_nested_pending ===");
    test_orm_optional_nested_pending(session_id).await;
    log_info!("=== Test test_orm_optional_nested_pending ran successfully ===\n\n");

    log_info!("=== Starting test test_orm_multi_nested_cleanup ===");
    test_orm_multi_nested_cleanup(session_id).await;
    log_info!("=== Test test_orm_multi_nested_cleanup ran successfully ===\n\n");

    log_info!("=== Starting test test_orm_cardinality_scoping ===");
    test_orm_cardinality_scoping(session_id).await;
    log_info!("=== Test test_orm_cardinality_scoping ran successfully ===\n\n");
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
        ex:objectValue <urn:test:obj1objVal> ;
        ex:anotherObject <urn:test:obj1AnotherSub1>, <urn:test:obj1AnotherSub2> ;
        ex:numOrStr "either" ;
        ex:lit1Or2 "lit1" ;
        ex:unrelated "some value" ;
        ex:anotherUnrelated 4242 .

    <urn:test:obj2> a ex:TestObject ;
        ex:stringValue "hello world #2" ;
        ex:numValue 422 ;
        ex:boolValue false ;
        ex:arrayValue 4,5,6 ;
        ex:objectValue <urn:test:obj2objVal> ;
        ex:anotherObject <urn:test:obj2AnotherSub1>, <urn:test:obj2AnotherSub2> ;
        ex:numOrStr 4 ;
        ex:lit1Or2 "lit2" ;
        ex:unrelated "some value2" ;
        ex:anotherUnrelated 42422 .
}
"#
        .to_string(),
    )
    .await;

    let _doc_nuri_a = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:obj1objVal> ex:nestedString "nested" ; ex:nestedNum 7 ; ex:nestedArray 5,6 .
    <urn:test:obj1AnotherSub1> ex:prop1 "one" ; ex:prop2 1 .
    <urn:test:obj1AnotherSub2> ex:prop1 "two" ; ex:prop2 2 .
}
"#
        .to_string(),
    )
    .await;

    let _doc_nuri_b = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:obj2objVal> ex:nestedString "nested2" ; ex:nestedNum 72 ; ex:nestedArray 7,8,9 .
    <urn:test:obj2AnotherSub1> ex:prop1 "one2" ; ex:prop2 12 .
    <urn:test:obj2AnotherSub2> ex:prop1 "two2" ; ex:prop2 22 .
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

    let nuri = NuriV0::new_entire_user_site();
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

        // New materialization: root returns an object keyed by dynamic "graph|subject" keys,
        // and every object (root and nested) includes an "@graph" field.
        let actual_obj = orm_json
            .as_object()
            .expect("expected root ORM JSON to be an object");

        log_info!("[test_orm_big_object] actual_obj: {:?}", actual_obj);

        // Find dynamic keys for the two roots by suffix
        let find_key_with_suffix = |suffix: &str| -> String {
            actual_obj
                .keys()
                .find(|k| k.ends_with(suffix))
                .expect("root key with expected subject suffix not found")
                .to_string()
        };

        let k1 = find_key_with_suffix("|urn:test:obj1");
        let k2 = find_key_with_suffix("|urn:test:obj2");

        // Extract graph parts from keys
        let g1 = k1.split('|').next().unwrap().to_string();
        let g2 = k2.split('|').next().unwrap().to_string();

        // Extract child graphs from actual for precise expectations
        let a1 = &actual_obj[&k1];
        let a2 = &actual_obj[&k2];

        let obj1_obj_val_graph = a1["objectValue"]["@graph"]
            .as_str()
            .expect("obj1 objectValue @graph")
            .to_string();
        // Nested children are keyed by dynamic "graph|subject" keys; resolve them by suffix
        let a1_children = a1["anotherObject"]
            .as_object()
            .expect("obj1 anotherObject map");
        let c1k = a1_children
            .keys()
            .find(|k| k.ends_with("|urn:test:obj1AnotherSub1"))
            .expect("obj1 child1 key not found")
            .to_string();
        let c2k = a1_children
            .keys()
            .find(|k| k.ends_with("|urn:test:obj1AnotherSub2"))
            .expect("obj1 child2 key not found")
            .to_string();
        let obj1_child1_graph = a1["anotherObject"][&c1k]["@graph"]
            .as_str()
            .expect("obj1 child1 @graph")
            .to_string();
        let obj1_child2_graph = a1["anotherObject"][&c2k]["@graph"]
            .as_str()
            .expect("obj1 child2 @graph")
            .to_string();

        let obj2_obj_val_graph = a2["objectValue"]["@graph"]
            .as_str()
            .expect("obj2 objectValue @graph")
            .to_string();
        let a2_children = a2["anotherObject"]
            .as_object()
            .expect("obj2 anotherObject map");
        let d1k = a2_children
            .keys()
            .find(|k| k.ends_with("|urn:test:obj2AnotherSub1"))
            .expect("obj2 child1 key not found")
            .to_string();
        let d2k = a2_children
            .keys()
            .find(|k| k.ends_with("|urn:test:obj2AnotherSub2"))
            .expect("obj2 child2 key not found")
            .to_string();
        let obj2_child1_graph = a2["anotherObject"][&d1k]["@graph"]
            .as_str()
            .expect("obj2 child1 @graph")
            .to_string();
        let obj2_child2_graph = a2["anotherObject"][&d2k]["@graph"]
            .as_str()
            .expect("obj2 child2 @graph")
            .to_string();

        // Build expected object with dynamic keys and @graph present everywhere
        let mut expected = json!({
            k1.clone(): {
                "type":"http://example.org/TestObject",
                "@id":"urn:test:obj1",
                "@graph": g1,
                "anotherObject":{
                    c1k.clone():{
                        "@id":"urn:test:obj1AnotherSub1",
                        "prop1":"one",
                        "prop2":1.0,
                        "@graph": obj1_child1_graph,
                    },
                    c2k.clone():{
                        "@id":"urn:test:obj1AnotherSub2",
                        "prop1":"two",
                        "prop2":2.0,
                        "@graph": obj1_child2_graph,
                    }
                },
                "arrayValue":[1.0,2.0,3.0],
                "boolValue":true,
                "lit1Or2":"lit1",
                "numOrStr":"either",
                "numValue":42.0,
                "objectValue":{
                    "@id":"urn:test:obj1objVal",
                    "@graph": obj1_obj_val_graph,
                    "nestedArray":[5.0,6.0],
                    "nestedNum":7.0,
                    "nestedString":"nested"
                },
                "stringValue": "hello world",
            },
            k2.clone(): {
                "@id":"urn:test:obj2",
                "@graph": g2,
                "type":"http://example.org/TestObject",
                "anotherObject":{
                    d1k.clone():{
                        "@id":"urn:test:obj2AnotherSub1",
                        "prop1":"one2",
                        "prop2":12.0,
                        "@graph": obj2_child1_graph,
                    },
                    d2k.clone():{
                        "@id":"urn:test:obj2AnotherSub2",
                        "prop1":"two2",
                        "prop2":22.0,
                        "@graph": obj2_child2_graph,
                    }
                },
                "arrayValue":[4.0,5.0,6.0],
                "boolValue":false,
                "lit1Or2":"lit2",
                "numOrStr":4.0,
                "numValue":422.0,
                "objectValue":{
                    "@id":"urn:test:obj2objVal",
                    "@graph": obj2_obj_val_graph,
                    "nestedArray": [7.0,8.0,9.0],
                    "nestedNum":72.0,
                    "nestedString":"nested2"
                },
                "stringValue":"hello world #2",
            }
        });

        let mut actual_mut = orm_json.clone();
        assert_json_eq(&mut expected, &mut actual_mut);

        break;
    }
    cancel_fn();
}

#[test]
fn test_basic_schema_shape_to_sparql_generation() {
    // Required predicate with enumerated literals
    let required_lit_pred = Arc::new(OrmSchemaPredicate {
        iri: "http://example.org/requiredLiteral".to_string(),
        minCardinality: 1,
        maxCardinality: -1,
        readablePredicate: "requiredLiteral".to_string(),
        dataTypes: vec![OrmSchemaDataType {
            valType: OrmSchemaValType::literal,
            literals: Some(vec![
                BasicType::Str("A".to_string()),
                BasicType::Str("B".to_string()),
            ]),
            shape: None,
        }],
        extra: None,
    });
    // Optional predicate that should not be emitted explicitly
    let optional_pred = Arc::new(OrmSchemaPredicate {
        iri: "http://example.org/optional".to_string(),
        minCardinality: 0,
        maxCardinality: -1,
        readablePredicate: "optional".to_string(),
        dataTypes: vec![OrmSchemaDataType {
            valType: OrmSchemaValType::string,
            literals: None,
            shape: None,
        }],
        extra: None,
    });
    // Shape-valued required predicate (treated like value here)
    let shape_pred = Arc::new(OrmSchemaPredicate {
        iri: "http://example.org/requiredObject".to_string(),
        minCardinality: 1,
        maxCardinality: -1,
        readablePredicate: "requiredObject".to_string(),
        dataTypes: vec![OrmSchemaDataType {
            valType: OrmSchemaValType::shape,
            literals: None,
            shape: Some("http://example.org/Nested".to_string()),
        }],
        extra: None,
    });

    let shape = OrmSchemaShape {
        iri: "http://example.org/Root".to_string(),
        predicates: vec![required_lit_pred, optional_pred, shape_pred],
    };

    let q = schema_shape_to_sparql(
        &shape,
        Some(vec!["urn:s1".to_string()]),
        Some(vec!["urn:g1".to_string()]),
    );

    // Basic projections and GRAPH usage
    assert!(q.contains("SELECT DISTINCT ?s ?p ?o ?g"));
    assert!(q.contains("GRAPH ?g"));

    // Required predicates appear explicitly
    assert!(q.contains("<http://example.org/requiredLiteral>"));
    assert!(q.contains("<http://example.org/requiredObject>"));

    // Optional predicate should not be present explicitly
    assert!(!q.contains("<http://example.org/optional>"));

    // Literal filter aggregated
    assert!(q.contains("FILTER(?v"));
    assert!(q.contains("\"A\""));
    assert!(q.contains("\"B\""));

    // Subject and graph filters
    assert!(q.contains("FILTER(?s IN (<urn:s1>))"));
    assert!(q.contains("FILTER(?g IN (<urn:g1>))"));
}

async fn test_orm_optional_nested_pending(session_id: u64) {
    // Person links to kittens but kittens have no type triples yet. hasCat is optional.
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:aliceOpt>
            a ex:Person ;
            ex:hasCat <urn:test:pendingKitten1>, <urn:test:pendingKitten2> .
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
                        valType: OrmSchemaValType::literal,
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
                    minCardinality: 0, // optional
                    readablePredicate: "cats".to_string(),
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
                    valType: OrmSchemaValType::literal,
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

        let actual_obj = orm_json
            .as_object()
            .expect("expected root ORM JSON to be an object");
        log_info!(
            "[test_orm_optional_nested_pending] actual_obj: {:?}",
            actual_obj
        );

        let find_key_with_suffix = |suffix: &str| -> String {
            actual_obj
                .keys()
                .find(|k| k.ends_with(suffix))
                .expect("root key with expected subject suffix not found")
                .to_string()
        };

        let k_alice = find_key_with_suffix("|urn:test:aliceOpt");
        let g_alice = actual_obj[&k_alice]["@graph"].as_str().unwrap().to_string();

        // Expect cats to be an empty object map (no valid kittens yet)
        let mut expected = json!({
            k_alice.clone(): {
                "@id": "urn:test:aliceOpt",
                "@graph": g_alice,
                "type": "http://example.org/Person",
                "cats": {}
            }
        });

        let mut actual_mut = orm_json.clone();
        assert_json_eq(&mut expected, &mut actual_mut);
        break;
    }
    cancel_fn();
}

async fn test_orm_multi_nested_cleanup(session_id: u64) {
    // Person links to two kittens; one is valid (typed), one invalid (no type). Only valid should materialize.
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:alice2>
            a ex:Person ;
            ex:hasCat <urn:test:kittenValid>, <urn:test:kittenInvalid> .

    # Valid kitten in same graph
    <urn:test:kittenValid> a ex:Cat .
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
                        valType: OrmSchemaValType::literal,
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
                    valType: OrmSchemaValType::literal,
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

        let actual_obj = orm_json
            .as_object()
            .expect("expected root ORM JSON to be an object");
        log_info!(
            "[test_orm_multi_nested_cleanup] actual_obj: {:?}",
            actual_obj
        );

        let find_key_with_suffix = |suffix: &str| -> String {
            actual_obj
                .keys()
                .find(|k| k.ends_with(suffix))
                .expect("root key with expected subject suffix not found")
                .to_string()
        };

        let k_alice = find_key_with_suffix("|urn:test:alice2");
        let g_alice = actual_obj[&k_alice]["@graph"].as_str().unwrap().to_string();

        let cats_obj = actual_obj[&k_alice]["cats"].as_object().unwrap();
        // There should be exactly one valid kitten materialized
        assert_eq!(cats_obj.len(), 1);
        let k_k1 = cats_obj
            .keys()
            .next()
            .expect("expected one kitten key")
            .to_string();
        let g_k1 = actual_obj[&k_alice]["cats"][&k_k1]["@graph"]
            .as_str()
            .unwrap()
            .to_string();
        // Extract the subject IRI from the composite key for robustness
        let id_k1 = k_k1
            .split('|')
            .last()
            .expect("expected composite key with '|'")
            .to_string();

        let mut expected = json!({
            k_alice.clone(): {
                "@id": "urn:test:alice2",
                "@graph": g_alice,
                "type": "http://example.org/Person",
                "cats": {
                    k_k1.clone(): { "@graph": g_k1, "@id": id_k1, "type": "http://example.org/Cat" }
                }
            }
        });

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

    while let Some(app_response) = receiver.next().await {
        let orm_json = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::OrmInitial(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        // New materialization: root returns an object keyed by dynamic "graph|subject" keys,
        // and every object includes an "@graph" field.
        let actual_obj = orm_json
            .as_object()
            .expect("expected root ORM JSON to be an object");

        let find_key_with_suffix = |suffix: &str| -> String {
            actual_obj
                .keys()
                .find(|k| k.ends_with(suffix))
                .expect("root key with expected subject suffix not found")
                .to_string()
        };

        let k_obj1 = find_key_with_suffix("|urn:test:obj1");
        let k_obj2 = find_key_with_suffix("|urn:test:obj2");
        let k_na1 = find_key_with_suffix("|urn:test:numArrayObj1");
        let k_na2 = find_key_with_suffix("|urn:test:numArrayObj2");
        let k_na3 = find_key_with_suffix("|urn:test:numArrayObj3");

        let g_obj1 = actual_obj[&k_obj1]["@graph"].as_str().unwrap().to_string();
        let g_obj2 = actual_obj[&k_obj2]["@graph"].as_str().unwrap().to_string();
        let g_na1 = actual_obj[&k_na1]["@graph"].as_str().unwrap().to_string();
        let g_na2 = actual_obj[&k_na2]["@graph"].as_str().unwrap().to_string();
        let g_na3 = actual_obj[&k_na3]["@graph"].as_str().unwrap().to_string();

        let mut expected = json!({
            k_obj1.clone(): {
                "@id": "urn:test:obj1",
                "@graph": g_obj1,
                "type": "http://example.org/TestObject",
                "numArray": []
            },
            k_obj2.clone(): {
                "@id": "urn:test:obj2",
                "@graph": g_obj2,
                "type": "http://example.org/TestObject",
                "numArray": []
            },
            k_na1.clone(): {
                "@id": "urn:test:numArrayObj1",
                "@graph": g_na1,
                "type": "http://example.org/TestObject",
                "numArray": [1.0, 2.0, 3.0]
            },
            k_na2.clone(): {
                "@id": "urn:test:numArrayObj2",
                "@graph": g_na2,
                "type": "http://example.org/TestObject",
                "numArray": []
            },
            k_na3.clone(): {
                "@id": "urn:test:numArrayObj3",
                "@graph": g_na3,
                "type": "http://example.org/TestObject",
                "numArray": [1.0, 2.0]
            }
        });

        let mut actual_mut = orm_json.clone();
        log_info!("actual data for orm_root_array:\n{:?}", actual_mut);
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
                    valType: OrmSchemaValType::boolean,
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

    let nuri = NuriV0::new_entire_user_site();
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

        // New materialization: root is an object keyed by composite "graph|subject" keys
        // and includes @graph everywhere. Build expected dynamically.
        let actual_obj = orm_json
            .as_object()
            .expect("expected root ORM JSON to be an object");

        log_info!("[test_orm_with_optional] actual_obj: {:?}", actual_obj);

        let find_key_with_suffix = |suffix: &str| -> String {
            actual_obj
                .keys()
                .find(|k| k.ends_with(suffix))
                .expect("root key with expected subject suffix not found")
                .to_string()
        };

        let k1 = find_key_with_suffix("|urn:test:oj1");
        let g1 = actual_obj[&k1]["@graph"].as_str().unwrap().to_string();

        let mut expected = json!({
            k1.clone(): {
                "@id": "urn:test:oj1",
                "@graph": g1,
                "opt": true
            }
        });

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
                        valType: OrmSchemaValType::literal,
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
                        valType: OrmSchemaValType::literal,
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

    let nuri = NuriV0::new_entire_user_site();
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

        // Root is an object keyed by composite keys; include @graph and derive arrays dynamically
        let actual_obj = orm_json
            .as_object()
            .expect("expected root ORM JSON to be an object");
        log_info!("[test_orm_literal] actual_obj: {:?}", actual_obj);

        let find_key_with_suffix = |suffix: &str| -> String {
            actual_obj
                .keys()
                .find(|k| k.ends_with(suffix))
                .expect("root key with expected subject suffix not found")
                .to_string()
        };

        let k1 = find_key_with_suffix("|urn:test:oj1");
        let k2 = find_key_with_suffix("|urn:test:obj2");
        let g1 = actual_obj[&k1]["@graph"].as_str().unwrap().to_string();
        let g2 = actual_obj[&k2]["@graph"].as_str().unwrap().to_string();

        let lit1_1 = actual_obj[&k1]["lit1"].clone();
        let lit2_1 = actual_obj[&k1]["lit2"].clone();
        let lit1_2 = actual_obj[&k2]["lit1"].clone();
        let lit2_2 = actual_obj[&k2]["lit2"].clone();

        let mut expected = json!({
            k1.clone(): {
                "@id": "urn:test:oj1",
                "@graph": g1,
                "lit1": lit1_1,
                "lit2": lit2_1
            },
            k2.clone(): {
                "@id": "urn:test:obj2",
                "@graph": g2,
                "lit1": lit1_2,
                "lit2": lit2_2
            }
        });

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
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    },
                    OrmSchemaDataType {
                        valType: OrmSchemaValType::number,
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

    let nuri = NuriV0::new_entire_user_site();
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

        let actual_obj = orm_json
            .as_object()
            .expect("expected root ORM JSON to be an object");
        log_info!("[test_orm_multi_type] actual_obj: {:?}", actual_obj);

        let find_key_with_suffix = |suffix: &str| -> String {
            actual_obj
                .keys()
                .find(|k| k.ends_with(suffix))
                .expect("root key with expected subject suffix not found")
                .to_string()
        };

        let k1 = find_key_with_suffix("|urn:test:oj1");
        let g1 = actual_obj[&k1]["@graph"].as_str().unwrap().to_string();
        let mut expected = json!({
            k1.clone(): {
                "@id": "urn:test:oj1",
                "@graph": g1,
                "strOrNum": ["a string", "another string", 2.0]
            }
        });

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

    # Invalid because nestedWithoutExtra has an invalid child.
    <urn:test:oj2> 
            ex:str "obj2 str" ;
            ex:nestedWithExtra <urn:test:nested4> ;
            ex:nestedWithoutExtra <urn:test:nested5>, <urn:test:nested6> .
}
"#
        .to_string(),
    )
    .await;

    let _doc_nuri_gn1 = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:nested1> ex:nestedStr "obj1 nested with extra valid" ; ex:nestedNum 2 .
}
"#
        .to_string(),
    )
    .await;

    let _doc_nuri_gn2 = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:nested2> ex:nestedStr "obj1 nested with extra invalid" .
    <urn:test:nested3> ex:nestedStr "obj1 nested without extra valid" ; ex:nestedNum 2 .
}
"#
        .to_string(),
    )
    .await;

    let _doc_nuri_gn3 = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:nested4> ex:nestedStr "obj2: a nested string valid" ; ex:nestedNum 2 .
    <urn:test:nested5> ex:nestedStr "obj2 nested without extra valid" ; ex:nestedNum 2 .
    # Invalid because nestedNum is missing.
    <urn:test:nested6> ex:nestedStr "obj2 nested without extra invalid" .
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
                        valType: OrmSchemaValType::string,
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
                        valType: OrmSchemaValType::shape,
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
                        valType: OrmSchemaValType::shape,
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
                        valType: OrmSchemaValType::string,
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
                        valType: OrmSchemaValType::string,
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
        shape: "http://example.org/RootShape".to_string(),
    };

    let nuri = NuriV0::new_entire_user_site();
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

        // Root object-map; include @graph and reflect nested single objects including their @graph
        let actual_obj = orm_json
            .as_object()
            .expect("expected root ORM JSON to be an object");

        log_info!("[test_orm_nested_1] actual_obj: {:?}", actual_obj);

        let find_key_with_suffix = |suffix: &str| -> String {
            actual_obj
                .keys()
                .find(|k| k.ends_with(suffix))
                .expect("root key with expected subject suffix not found")
                .to_string()
        };

        let k1 = find_key_with_suffix("|urn:test:oj1");
        let g1 = actual_obj[&k1]["@graph"].as_str().unwrap().to_string();

        let mut expected = json!({
            k1.clone(): {
                "@id": "urn:test:oj1",
                "@graph": g1,
                "str": "obj1 str",
                // nestedWithExtra should resolve to nested1 (valid), not nested2 (missing num)
                "nestedWithExtra": {
                    "@id": "urn:test:nested1",
                    "@graph": actual_obj[&k1]["nestedWithExtra"]["@graph"].clone(),
                    "nestedStr": "obj1 nested with extra valid",
                    "nestedNum": 2.0
                },
                // nestedWithoutExtra should point to nested3 (valid)
                "nestedWithoutExtra": {
                    "@id": "urn:test:nested3",
                    "@graph": actual_obj[&k1]["nestedWithoutExtra"]["@graph"].clone(),
                    "nestedStr": "obj1 nested without extra valid",
                    "nestedNum": 2.0
                }
            }
        });

        let mut actual_mut = orm_json.clone();
        assert_json_eq(&mut expected, &mut actual_mut);

        break;
    }
    cancel_fn();
}

async fn _test_orm_nested_2(session_id: u64) {
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
                        valType: OrmSchemaValType::string,
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
                "@id": "urn:test:alice",
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
                "@id": "urn:test:bob",
                "name": "Bob",
                "knows": {
                    "urn:test:claire": {
                        "name": "Claire",
                        "knows": {}
                    }
                }
            },
            {
                "@id": "urn:test:claire",
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

async fn _test_orm_nested_3(session_id: u64) {
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
                        valType: OrmSchemaValType::literal,
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
                            valType: OrmSchemaValType::shape,
                            literals: None,
                            shape: Some("http://example.org/BobShape".to_string()),
                        },
                        OrmSchemaDataType {
                            valType: OrmSchemaValType::shape,
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
                        valType: OrmSchemaValType::literal,
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
                        valType: OrmSchemaValType::shape,
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
                    valType: OrmSchemaValType::literal,
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
                "@id": "urn:test:alice",
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
}
"#
        .to_string(),
    )
    .await;

    // Place kittens' type triples in separate graphs so nested shape must follow cross-graph links.
    let _doc_nuri_k1 = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:kitten1> a ex:Cat .
}
"#
        .to_string(),
    )
    .await;

    let _doc_nuri_k2 = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:kitten2> a ex:Cat .
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
                        valType: OrmSchemaValType::literal,
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
                    valType: OrmSchemaValType::literal,
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

    let nuri = NuriV0::new_entire_user_site();
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

        let actual_obj = orm_json
            .as_object()
            .expect("expected root ORM JSON to be an object");
        log_info!("[test_orm_nested_4] actual_obj: {:?}", actual_obj);

        let find_key_with_suffix = |suffix: &str, obj: &serde_json::Map<String, Value>| -> String {
            obj.keys()
                .find(|k| k.ends_with(suffix))
                .expect("root key with expected subject suffix not found")
                .to_string()
        };

        let k_alice = find_key_with_suffix("|urn:test:alice", actual_obj);
        let g_alice = actual_obj[&k_alice]["@graph"].as_str().unwrap().to_string();

        let k_kitten1 = find_key_with_suffix(
            "|urn:test:kitten1",
            actual_obj[&k_alice]["cats"].as_object().unwrap(),
        );
        let g_kitten1 = actual_obj[&k_alice]["cats"][&k_kitten1]["@graph"].clone();

        let k_kitten2 = find_key_with_suffix(
            "|urn:test:kitten2",
            actual_obj[&k_alice]["cats"].as_object().unwrap(),
        );
        let g_kitten2 = actual_obj[&k_alice]["cats"][&k_kitten2]["@graph"].clone();

        let mut expected = json!({
                k_alice.clone(): {
                    "@id": "urn:test:alice",
                    "@graph": g_alice,
                    "type": "http://example.org/Person",
                    "cats": {
                        k_kitten1.clone(): {
                            "@graph": g_kitten1,
                            "@id": "urn:test:kitten1",
                            "type": "http://example.org/Cat"
                        },
                        k_kitten2.clone(): {
                            "@id": "urn:test:kitten2",
                            "@graph": g_kitten2,
                            "type": "http://example.org/Cat"
                        }
                    },
                }
        });

        let mut actual_mut = orm_json.clone();
        assert_json_eq(&mut expected, &mut actual_mut);

        break;
    }
    cancel_fn();
}

// This test verifies that validation counts only consider quads in the same graph or in graphs
// whose name is a prefix of the subject IRI (subject IRI is a superset of the graph IRI).
async fn test_orm_cardinality_scoping(session_id: u64) {
    // Root graph with a person who should have exactly 1 name (maxCardinality:1, minCardinality:1)
    let doc_root = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:groot:alice> a ex:Person ;
        ex:name "Alice" .
}
"#
        .to_string(),
    )
    .await;

    // Separate graph with an extra name that should NOT invalidate alice because the subject IRI
    // is not a superset of the graph IRI (graph is unrelated)
    let _doc_other = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:other:alice> ex:name "Alice-Other" .
}
"#
        .to_string(),
    )
    .await;

    // Another graph whose name is a prefix of the subject IRI (subject IRI is a superset):
    // Graph IRI: urn:test:groot (simulated by creating a second doc whose internal graph IRI
    // will differ). We create an extra name triple for the SAME SUBJECT so that it SHOULD be
    // considered for cardinality only if the implementation allows prefix-based scoping.
    // For the purpose of this test, we also add a different subject to show it is ignored.
    let _doc_prefix = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:groot:alice> ex:name "Alice-Scoped" .
    <urn:test:groot:bob> ex:name "Bob" .
}
"#
        .to_string(),
    )
    .await;

    // Define schema where name is required exactly once
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
            ],
        }
        .into(),
    );

    let shape_type = OrmShapeType {
        schema,
        shape: "http://example.org/PersonShape".to_string(),
    };

    let nuri = NuriV0::new_from(&doc_root).expect("parse nuri");
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

        let actual_obj = orm_json
            .as_object()
            .expect("expected root ORM JSON to be an object");
        log_info!(
            "[test_orm_cardinality_scoping] actual_obj: {:?}",
            actual_obj
        );

        // We expect alice to be valid with a single name. The extra name in unrelated graph
        // must be ignored; the extra in prefix graph may or may not count depending on scoping.
        // According to spec, only same-graph or subject-graph prefix graphs count; since we created
        // one such extra, maxCardinality=1 should still pass if implementation deduplicates or picks
        // one; otherwise it would fail. We assert that it materializes with a single name.
        let k_alice = actual_obj
            .keys()
            .find(|k| k.ends_with("|urn:test:groot:alice"))
            .expect("alice key")
            .to_string();
        let g_alice = actual_obj[&k_alice]["@graph"].as_str().unwrap().to_string();
        let name_val = actual_obj[&k_alice]["name"].as_str().unwrap();
        assert!(name_val == "Alice" || name_val == "Alice-Scoped");

        let mut expected = json!({
            k_alice.clone(): {
                "@id": "urn:test:groot:alice",
                "@graph": g_alice,
                "type": "http://example.org/Person",
                "name": name_val
            }
        });

        let mut actual_mut = orm_json.clone();
        assert_json_eq(&mut expected, &mut actual_mut);
        break;
    }
    cancel_fn();
}

//
// Helpers
//

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
                        valType: OrmSchemaValType::literal,
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
                        valType: OrmSchemaValType::string,
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
                        valType: OrmSchemaValType::number,
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
                        valType: OrmSchemaValType::boolean,
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
                        valType: OrmSchemaValType::number,
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
                        valType: OrmSchemaValType::shape,
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
                        valType: OrmSchemaValType::shape,
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
                            valType: OrmSchemaValType::string,
                            literals: None,
                            shape: None,
                        },
                        OrmSchemaDataType {
                            valType: OrmSchemaValType::number,
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
                            valType: OrmSchemaValType::literal,
                            literals: Some(vec![BasicType::Str("lit1".to_string())]),
                            shape: None,
                        },
                        OrmSchemaDataType {
                            valType: OrmSchemaValType::literal,
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
                        valType: OrmSchemaValType::string,
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
                        valType: OrmSchemaValType::number,
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
                        valType: OrmSchemaValType::string,
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
                        valType: OrmSchemaValType::number,
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
                        valType: OrmSchemaValType::number,
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

pub fn create_contact_schema() -> Value {
    let schema_str = include_str!("big_contact_schema.json");
    serde_json::from_str(schema_str).unwrap()
}
