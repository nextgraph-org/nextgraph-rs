// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use crate::local_broker::{doc_sparql_construct, orm_start, orm_update};
use crate::tests::create_doc_with_data;
use crate::tests::create_or_open_wallet::create_or_open_wallet;
use async_std::stream::StreamExt;
use ng_net::app_protocol::{AppResponse, AppResponseV0, NuriV0};
use ng_net::orm::{
    BasicType, OrmPatch, OrmPatchOp, OrmPatchType, OrmSchemaDataType, OrmSchemaPredicate,
    OrmSchemaShape, OrmSchemaValType, OrmShapeType,
};

use ng_repo::log_info;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;

#[async_std::test]
async fn test_orm_apply_patches() {
    // Setup wallet and document
    let (_wallet, session_id) = create_or_open_wallet().await;

    // Tests below all in this test, to prevent waiting times through wallet creation.

    // Test 1: Add single literal value
    test_patch_add_single_literal(session_id).await;

    // Test 2: Remove single literal value
    test_patch_remove_single_literal(session_id).await;

    // Test 3: Replace single literal value
    test_patch_replace_single_literal(session_id).await;

    // Test 4: Add to multi-value literal array
    test_patch_add_to_array(session_id).await;

    // Test 5: Remove from multi-value literal array
    test_patch_remove_from_array(session_id).await;

    // Test 6: Nested object - modify nested literal
    test_patch_nested_literal(session_id).await;

    // Test 7: Multi-level nesting
    test_patch_multilevel_nested(session_id).await;

    // Test 8: Root object creation
    test_patch_create_root_object(session_id).await;

    // Test 9: Nested object creation
    test_patch_create_nested_object(session_id).await;
}

/// Test adding a single literal value via ORM patch
async fn test_patch_add_single_literal(session_id: u64) {
    log_info!("\n\n=== TEST: Add Single Literal ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:person1> a ex:Person .
}
"#
        .to_string(),
    )
    .await;

    // Define the ORM schema
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/Person".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Person".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
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
                }),
                Arc::new(OrmSchemaPredicate {
                    extra: Some(false),
                    iri: "http://example.org/name".to_string(),
                    readablePredicate: "name".to_string(),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
            ],
        }),
    );

    let shape_type = OrmShapeType {
        shape: "http://example.org/Person".to_string(),
        schema,
    };

    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, _cancel_fn) = orm_start(nuri.clone(), shape_type.clone(), session_id)
        .await
        .expect("orm_start failed");

    // Get initial state (person without name)
    while let Some(app_response) = receiver.next().await {
        if let AppResponse::V0(AppResponseV0::OrmInitial(initial)) = app_response {
            break;
        }
    }

    // Apply ORM patch: Add name
    let diff = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: "/urn:test:person1/name".to_string(),
        valType: None,
        value: Some(json!("Alice")),
    }];

    orm_update(nuri.clone(), shape_type.shape.clone(), diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied
    let triples = doc_sparql_construct(
        session_id,
        "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_name = triples.iter().any(|t| {
        t.predicate.as_str() == "http://example.org/name" && t.object.to_string().contains("Alice")
    });
    assert!(has_name, "Name was not added to the graph");

    log_info!("✓ Test passed: Add single literal");
}

/// Test removing a single literal value via ORM patch
async fn test_patch_remove_single_literal(session_id: u64) {
    log_info!("\n\n=== TEST: Remove Single Literal ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:person2> a ex:Person ;
        ex:name "Bob" .
}
"#
        .to_string(),
    )
    .await;

    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/Person".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Person".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
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
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/name".to_string(),
                    extra: Some(false),
                    readablePredicate: "name".to_string(),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
            ],
        }),
    );

    let shape_type = OrmShapeType {
        shape: "http://example.org/Person".to_string(),
        schema,
    };

    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, _cancel_fn) = orm_start(nuri.clone(), shape_type.clone(), session_id)
        .await
        .expect("orm_start failed");

    // Get initial state (person without name)
    while let Some(app_response) = receiver.next().await {
        if let AppResponse::V0(AppResponseV0::OrmInitial(initial)) = app_response {
            break;
        }
    }

    // Apply ORM patch: Remove name
    let diff = vec![OrmPatch {
        op: OrmPatchOp::remove,
        path: "/urn:test:person2/name".to_string(),
        valType: None,
        value: Some(json!("Bob")),
    }];

    orm_update(nuri.clone(), shape_type.shape.clone(), diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied
    let triples = doc_sparql_construct(
        session_id,
        "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_name = triples.iter().any(|t| {
        t.predicate.as_str() == "http://example.org/name" && t.object.to_string().contains("Bob")
    });
    assert!(!has_name, "Name was not removed from the graph");

    log_info!("✓ Test passed: Remove single literal");
}

/// Test replacing a single literal value via ORM patch (remove + add)
async fn test_patch_replace_single_literal(session_id: u64) {
    log_info!("\n\n=== TEST: Replace Single Literal ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:person3> a ex:Person ;
        ex:name "Charlie" .
}
"#
        .to_string(),
    )
    .await;

    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/Person".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Person".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
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
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/name".to_string(),
                    extra: Some(false),
                    readablePredicate: "name".to_string(),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
            ],
        }),
    );

    let shape_type = OrmShapeType {
        shape: "http://example.org/Person".to_string(),
        schema,
    };

    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, _cancel_fn) = orm_start(nuri.clone(), shape_type.clone(), session_id)
        .await
        .expect("orm_start failed");

    // Get initial state (person without name)
    while let Some(app_response) = receiver.next().await {
        if let AppResponse::V0(AppResponseV0::OrmInitial(initial)) = app_response {
            break;
        }
    }

    // Apply ORM patch: Replace name (remove old, add new)
    let diff = vec![
        // OrmDiffOp {
        //     op: OrmDiffOpType::remove,
        //     path: "/urn:test:person3/name".to_string(),
        //     valType: None,
        //     value: Some(json!("Charlie")),
        // },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/urn:test:person3/name".to_string(),
            valType: None,
            value: Some(json!("Charles")),
        },
    ];

    orm_update(nuri.clone(), shape_type.shape.clone(), diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied
    let triples = doc_sparql_construct(
        session_id,
        "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_old_name = triples.iter().any(|t| {
        t.predicate.as_str() == "http://example.org/name"
            && t.object.to_string().contains("Charlie")
    });
    let has_new_name = triples.iter().any(|t| {
        t.predicate.as_str() == "http://example.org/name"
            && t.object.to_string().contains("Charles")
    });

    assert!(!has_old_name, "Old name was not removed");
    assert!(has_new_name, "New name was not added");

    log_info!("✓ Test passed: Replace single literal");
}

/// Test adding to a multi-value array via ORM patch
async fn test_patch_add_to_array(session_id: u64) {
    log_info!("\n\n=== TEST: Add to Array ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:person4> a ex:Person ;
        ex:hobby "Reading" .
}
"#
        .to_string(),
    )
    .await;

    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/Person".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Person".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
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
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/hobby".to_string(),
                    extra: Some(false),
                    readablePredicate: "hobby".to_string(),
                    minCardinality: 0,
                    maxCardinality: -1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
            ],
        }),
    );

    let shape_type = OrmShapeType {
        shape: "http://example.org/Person".to_string(),
        schema,
    };

    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, _cancel_fn) = orm_start(nuri.clone(), shape_type.clone(), session_id)
        .await
        .expect("orm_start failed");

    // Get initial state (person without name)
    while let Some(app_response) = receiver.next().await {
        if let AppResponse::V0(AppResponseV0::OrmInitial(initial)) = app_response {
            break;
        }
    }

    // Apply ORM patch: Add hobby
    let diff = vec![OrmPatch {
        op: OrmPatchOp::add,
        valType: Some(OrmPatchType::set),
        path: "/urn:test:person4/hobby".to_string(),
        value: Some(json!("Swimming")),
    }];

    orm_update(nuri.clone(), shape_type.shape.clone(), diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied
    let triples = doc_sparql_construct(
        session_id,
        "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let hobby_count = triples
        .iter()
        .filter(|t| t.predicate.as_str() == "http://example.org/hobby")
        .count();

    assert_eq!(hobby_count, 2, "Should have 2 hobbies");

    log_info!("✓ Test passed: Add to array");
}

/// Test removing from a multi-value array via ORM patch
async fn test_patch_remove_from_array(session_id: u64) {
    log_info!("\n\n=== TEST: Remove from Array ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:person5> a ex:Person ;
        ex:hobby "Reading", "Swimming", "Cooking" .
}
"#
        .to_string(),
    )
    .await;

    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/Person".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Person".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
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
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/hobby".to_string(),
                    readablePredicate: "hobby".to_string(),
                    extra: Some(false),
                    minCardinality: 0,
                    maxCardinality: -1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
            ],
        }),
    );

    let shape_type = OrmShapeType {
        shape: "http://example.org/Person".to_string(),
        schema,
    };

    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, _cancel_fn) = orm_start(nuri.clone(), shape_type.clone(), session_id)
        .await
        .expect("orm_start failed");

    // Get initial state
    while let Some(app_response) = receiver.next().await {
        if let AppResponse::V0(AppResponseV0::OrmInitial(initial)) = app_response {
            break;
        }
    }

    // Apply ORM patch: Remove hobby
    let diff = vec![OrmPatch {
        op: OrmPatchOp::remove,
        path: "/urn:test:person5/hobby".to_string(),
        valType: None,
        value: Some(json!("Swimming")),
    }];

    orm_update(nuri.clone(), shape_type.shape.clone(), diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied
    let triples = doc_sparql_construct(
        session_id,
        "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let hobby_count = triples
        .iter()
        .filter(|t| t.predicate.as_str() == "http://example.org/hobby")
        .count();
    let has_swimming = triples.iter().any(|t| {
        t.predicate.as_str() == "http://example.org/hobby"
            && t.object.to_string().contains("Swimming")
    });

    assert_eq!(hobby_count, 2, "Should have 2 hobbies left");
    assert!(!has_swimming, "Swimming should be removed");

    log_info!("✓ Test passed: Remove from array");
}

/// Test modifying a nested object's literal via ORM patch
async fn test_patch_nested_literal(session_id: u64) {
    log_info!("\n\n=== TEST: Nested Literal Modification ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:person6> a ex:Person ;
        ex:name "Dave" ;
        ex:address <urn:test:address1> .
    
    <urn:test:address1> a ex:Address ;
        ex:street "Main St" ;
        ex:city "Springfield" .
}
"#
        .to_string(),
    )
    .await;

    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/Person".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Person".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
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
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/name".to_string(),
                    readablePredicate: "name".to_string(),
                    extra: Some(false),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/address".to_string(),
                    readablePredicate: "address".to_string(),
                    extra: Some(false),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        shape: Some("http://example.org/Address".to_string()),
                        literals: None,
                    }],
                }),
            ],
        }),
    );
    schema.insert(
        "http://example.org/Address".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Address".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::literal,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Address".to_string(),
                        )]),
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/street".to_string(),
                    extra: Some(false),
                    readablePredicate: "street".to_string(),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/city".to_string(),
                    readablePredicate: "city".to_string(),
                    extra: Some(false),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
            ],
        }),
    );

    let shape_type = OrmShapeType {
        shape: "http://example.org/Person".to_string(),
        schema,
    };

    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, _cancel_fn) = orm_start(nuri.clone(), shape_type.clone(), session_id)
        .await
        .expect("orm_start failed");

    // Get initial state
    while let Some(app_response) = receiver.next().await {
        if let AppResponse::V0(AppResponseV0::OrmInitial(initial)) = app_response {
            break;
        }
    }

    // Apply ORM patch: Change city in nested address
    let diff = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: "/urn:test:person6/address/city".to_string(),
        valType: None,
        value: Some(json!("Shelbyville")),
    }];

    orm_update(nuri.clone(), shape_type.shape.clone(), diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied
    let triples = doc_sparql_construct(
        session_id,
        "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_old_city = triples.iter().any(|t| {
        t.predicate.as_str() == "http://example.org/city"
            && t.object.to_string().contains("Springfield")
    });
    let has_new_city = triples.iter().any(|t| {
        t.predicate.as_str() == "http://example.org/city"
            && t.object.to_string().contains("Shelbyville")
    });

    assert!(!has_old_city, "Old city should be removed");
    assert!(has_new_city, "New city should be added");

    log_info!("✓ Test passed: Nested literal modification");
}

/// Test multi-level nested object modifications via ORM patch
async fn test_patch_multilevel_nested(session_id: u64) {
    log_info!("\n\n=== TEST: Multi-level Nested Modification ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:person7> a ex:Person ;
        ex:name "Eve" ;
        ex:company <urn:test:company1> .
    
    <urn:test:company1> a ex:Company ;
        ex:companyName "Acme Corp" ;
        ex:headquarter <urn:test:address2> .
    
    <urn:test:address2> a ex:Address ;
        ex:street "Business Blvd" ;
        ex:city "Metropolis" .
}
"#
        .to_string(),
    )
    .await;

    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/Person".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Person".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
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
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/name".to_string(),
                    extra: Some(false),
                    readablePredicate: "name".to_string(),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/company".to_string(),
                    extra: Some(false),
                    readablePredicate: "company".to_string(),
                    minCardinality: 0,
                    maxCardinality: -1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        shape: Some("http://example.org/Company".to_string()),
                        literals: None,
                    }],
                }),
            ],
        }),
    );
    schema.insert(
        "http://example.org/Company".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Company".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::literal,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Company".to_string(),
                        )]),
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/companyName".to_string(),
                    readablePredicate: "companyName".to_string(),
                    extra: Some(false),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/headquarter".to_string(),
                    readablePredicate: "headquarter".to_string(),
                    extra: Some(false),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        shape: Some("http://example.org/Address".to_string()),
                        literals: None,
                    }],
                }),
            ],
        }),
    );
    schema.insert(
        "http://example.org/Address".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Address".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::literal,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Address".to_string(),
                        )]),
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/street".to_string(),
                    readablePredicate: "street".to_string(),
                    extra: Some(false),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/city".to_string(),
                    readablePredicate: "city".to_string(),
                    extra: Some(false),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
            ],
        }),
    );

    let shape_type = OrmShapeType {
        shape: "http://example.org/Person".to_string(),
        schema,
    };

    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, _cancel_fn) = orm_start(nuri.clone(), shape_type.clone(), session_id)
        .await
        .expect("orm_start failed");

    // Get initial state
    while let Some(app_response) = receiver.next().await {
        if let AppResponse::V0(AppResponseV0::OrmInitial(initial)) = app_response {
            break;
        }
    }

    // Apply ORM patch: Change street in company's headquarter address (3 levels deep)
    let diff = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: "/urn:test:person7/company/urn:test:company1/headquarter/street".to_string(),
        valType: None,
        value: Some(json!("Rich Street")),
    }];

    orm_update(nuri.clone(), shape_type.shape.clone(), diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied
    let triples = doc_sparql_construct(
        session_id,
        "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_old_street = triples.iter().any(|t| {
        t.predicate.as_str() == "http://example.org/street"
            && t.object.to_string().contains("Business Blvd")
    });
    let has_new_street = triples.iter().any(|t| {
        t.predicate.as_str() == "http://example.org/street"
            && t.object.to_string().contains("Rich Street")
    });

    assert!(!has_old_street, "Old street should be removed");
    assert!(has_new_street, "New street should be added");

    log_info!("✓ Test passed: Multi-level nested modification");
}

/// Test multi-level nested object modifications via ORM patch
async fn test_patch_create_root_object(session_id: u64) {
    log_info!("\n\n=== TEST: Creation of root object ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:person7> a ex:Person ;
        ex:name "Eve" .
}
"#
        .to_string(),
    )
    .await;

    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/PersonShape".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/PersonShape".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
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
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/name".to_string(),
                    extra: Some(false),
                    readablePredicate: "name".to_string(),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
            ],
        }),
    );

    let shape_type = OrmShapeType {
        shape: "http://example.org/PersonShape".to_string(),
        schema,
    };

    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, _cancel_fn) = orm_start(nuri.clone(), shape_type.clone(), session_id)
        .await
        .expect("orm_start failed");

    // Get initial state
    while let Some(app_response) = receiver.next().await {
        if let AppResponse::V0(AppResponseV0::OrmInitial(initial)) = app_response {
            break;
        }
    }

    // Apply ORM patch: Create a new object
    let diff = vec![
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/urn:test:person8".to_string(),
            valType: Some(OrmPatchType::object),
            value: None,
        },
        OrmPatch {
            // This does nothing as it does not represent a triple.
            // A subject is created when inserting data.
            op: OrmPatchOp::add,
            path: "/urn:test:person8/@id".to_string(),
            valType: Some(OrmPatchType::object),
            value: None,
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/urn:test:person8/type".to_string(),
            valType: None,
            value: Some(json!("http://example.org/Person")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/urn:test:person8/name".to_string(),
            valType: None,
            value: Some(json!("Alice")),
        },
    ];

    orm_update(nuri.clone(), shape_type.shape.clone(), diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied
    let triples = doc_sparql_construct(
        session_id,
        "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_name = triples.iter().any(|t| {
        t.to_string() == "urn:test:person8"
            && t.predicate.as_str() == "http://example.org/name"
            && t.object.to_string().contains("Alice")
    });
    let has_type = triples.iter().any(|t| {
        t.predicate.as_str() == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
            && t.object.to_string().contains("http://example.org/Person")
    });

    assert!(!has_name, "New person has name");
    assert!(has_type, "New person has type");

    log_info!("✓ Test passed: Creation of root object");
}

/// Test adding a second address object.
async fn test_patch_create_nested_object(session_id: u64) {
    log_info!("\n\n=== TEST: Nested object creation ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:person9> a ex:Person ;
        ex:name "Dave" ;
        ex:address <urn:test:address1> .
    
    <urn:test:address1> a ex:Address ;
        ex:street "Main St" ;
        ex:city "Springfield" .
}
"#
        .to_string(),
    )
    .await;

    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/Person".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Person".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
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
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/name".to_string(),
                    readablePredicate: "name".to_string(),
                    extra: Some(false),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/address".to_string(),
                    readablePredicate: "address".to_string(),
                    extra: Some(false),
                    minCardinality: 0,
                    maxCardinality: 2,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        shape: Some("http://example.org/Address".to_string()),
                        literals: None,
                    }],
                }),
            ],
        }),
    );
    schema.insert(
        "http://example.org/Address".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Address".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::literal,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Address".to_string(),
                        )]),
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/street".to_string(),
                    extra: Some(false),
                    readablePredicate: "street".to_string(),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
            ],
        }),
    );

    let shape_type = OrmShapeType {
        shape: "http://example.org/Person".to_string(),
        schema,
    };

    let nuri = NuriV0::new_from(&doc_nuri).expect("parse nuri");
    let (mut receiver, _cancel_fn) = orm_start(nuri.clone(), shape_type.clone(), session_id)
        .await
        .expect("orm_start failed");

    // Get initial state
    while let Some(app_response) = receiver.next().await {
        if let AppResponse::V0(AppResponseV0::OrmInitial(initial)) = app_response {
            break;
        }
    }

    // Apply ORM patch: Add a second address.
    let diff = vec![
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/urn:test:person9/address/http:~1~1example.org~1exampleAddress/type".to_string(),
            valType: None,
            value: Some(json!("http://example.org/Address")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: "/urn:test:person9/address/http:~1~1example.org~1exampleAddress/street"
                .to_string(),
            valType: None,
            value: Some(json!("Heaven Avenue")),
        },
    ];

    orm_update(nuri.clone(), shape_type.shape.clone(), diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied
    let triples = doc_sparql_construct(
        session_id,
        "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_new_address_type = triples.iter().any(|t| {
        t.subject
            .to_string()
            .contains("http://example.org/exampleAddress")
            && t.predicate.as_str() == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
            && t.object.to_string().contains("http://example.org/Address")
    });
    let has_new_address_street = triples.iter().any(|t| {
        t.subject
            .to_string()
            .contains("http://example.org/exampleAddress")
            && t.predicate.as_str() == "http://example.org/street"
            && t.object.to_string().contains("Heaven Avenue")
    });

    assert!(has_new_address_type, "New address type should be added");
    assert!(has_new_address_street, "New street should be added");

    log_info!("✓ Test passed: Nested object creation");
}
