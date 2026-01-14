// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use crate::local_broker::{doc_sparql_select, orm_update};
use crate::tests::create_or_open_wallet::create_or_open_wallet;
use crate::tests::{
    assert_json_eq, await_app_response, create_doc_with_data, create_orm_connection,
};
use async_std::future::timeout;
use async_std::stream::StreamExt;
use ng_net::app_protocol::{AppResponse, AppResponseV0};
use ng_net::orm::{
    BasicType, OrmPatch, OrmPatchOp, OrmPatchType, OrmSchemaDataType, OrmSchemaPredicate,
    OrmSchemaShape, OrmSchemaValType, OrmShapeType,
};
use ng_repo::log::*;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

// Helper: escape a JSON Pointer segment (RFC 6901): ~ -> ~0, / -> ~1
fn escape_pointer_segment(segment: &str) -> String {
    segment.replace('~', "~0").replace('/', "~1")
}

// Helper: check if a quad's graph matches the expected graph IRI
fn quad_has_graph(q: &ng_oxigraph::oxrdf::Quad, expected_graph: &str) -> bool {
    match &q.graph_name {
        ng_oxigraph::oxrdf::GraphName::NamedNode(n) => n.as_str() == expected_graph,
        _ => false,
    }
}

// Helper: build root path prefix "/graph|subject" for a given graph and subject
fn root_path(graph: &str, subject: &str) -> String {
    format!(
        "/{}|{}",
        escape_pointer_segment(graph),
        escape_pointer_segment(subject)
    )
}

// Helper: build a composite key segment "graph|subject" for multi-children
fn composite_key(graph: &str, subject: &str) -> String {
    format!(
        "{}|{}",
        escape_pointer_segment(graph),
        escape_pointer_segment(subject)
    )
}

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

    // Test 9b: Single-nested object creation (no composite child key in path)
    test_patch_create_single_nested_object(session_id).await;

    // Test 9c: Replace single-nested object (switch link to new child)
    test_patch_replace_single_nested_object(session_id).await;

    // Test 10: Object deleted after invalidating patch.
    test_patch_invalidating_object(session_id).await;

    // Test 11: Multi-valued object link removal
    test_patch_multi_valued_object_link_removal(session_id).await;

    // Test 12: Tilde path decoding nested creation
    test_patch_tilde_path_decoding_creation(session_id).await;

    // Test 13: remove_all multi-valued literal
    test_patch_remove_all_multi_valued_literal(session_id).await;

    // Test 14: Idempotent add literal
    test_patch_idempotent_add_literal(session_id).await;

    // Test 15: No-op remove nonexistent literal
    test_patch_noop_remove_nonexistent_literal(session_id).await;

    // Test 16: Mixed batch operations
    test_patch_mixed_batch_operations(session_id).await;

    // Test 17: Remove_all vs selective remove sequencing
    test_patch_remove_all_vs_selective_remove(session_id).await;

    // Test 18: Duplicate object link add
    test_patch_duplicate_object_link_add(session_id).await;

    // Test 19: Cross-graph object link removal
    test_patch_cross_graph_object_removal(session_id).await;

    // Test 20: Revert patches for invalid schema values
    test_patch_revert_invalid_schema_value(session_id).await;

    // Test 21: Revert patches for multi-valued set invalid value
    test_patch_revert_multi_valued_invalid(session_id).await;

    // Test 22: Allow EXTRA values
    test_patch_add_extra_value(session_id).await;
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
                        valType: OrmSchemaValType::iri,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Apply ORM patch: Add name
    let root = root_path(&doc_nuri, "urn:test:person1");
    let diff = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!("{}/name", root),
        valType: None,
        value: Some(json!("Alice")),
    }];

    orm_update(subscription_id, diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied using SPARQL SELECT to check graph IRI
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_name = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/name"
            && q.object.to_string().contains("Alice")
            && quad_has_graph(q, &doc_nuri)
    });
    assert!(
        has_name,
        "Name was not added to the graph with correct graph IRI"
    );

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
        ex:name "Bob" ;
        ex:isAdult false .
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
                        valType: OrmSchemaValType::iri,
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
                    iri: "http://example.org/isAdult".to_string(),
                    extra: Some(false),
                    readablePredicate: "isAdult".to_string(),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::boolean,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Apply ORM patch: Remove name
    let root = root_path(&doc_nuri, "urn:test:person2");
    let diff = vec![
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("{}/name", root),
            valType: None,
            value: Some(json!("Bob")),
        },
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("{}/isAdult", root),
            valType: None,
            value: None,
        },
    ];

    orm_update(subscription_id, diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied using SPARQL SELECT to check graph IRI
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_name = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/name"
            && q.object.to_string().contains("Bob")
            && quad_has_graph(q, &doc_nuri)
    });
    let has_is_adult = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/isAdult" && quad_has_graph(q, &doc_nuri)
    });

    assert!(!has_name, "Name was not removed from the graph");
    assert!(!has_is_adult, "is_adult was not removed from the graph");

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
        ex:name "Charlie" ;
        ex:isAdult false .
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
                        valType: OrmSchemaValType::iri,
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
                    iri: "http://example.org/isAdult".to_string(),
                    extra: Some(false),
                    readablePredicate: "isAdult".to_string(),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::boolean,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Apply ORM patch: Replace name (remove old, add new)
    let root = root_path(&doc_nuri, "urn:test:person3");
    let diff = vec![
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/name", root),
            valType: None,
            value: Some(json!("Charles")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/isAdult", root),
            valType: None,
            value: Some(json!(true)),
        },
    ];

    orm_update(subscription_id, diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied using SPARQL SELECT to check graph IRI
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_old_name = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/name"
            && q.object.to_string().contains("Charlie")
            && quad_has_graph(q, &doc_nuri)
    });
    let has_new_name = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/name"
            && q.object.to_string().contains("Charles")
            && quad_has_graph(q, &doc_nuri)
    });
    let has_old_adult_value = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/isAdult"
            && q.object.to_string().contains("false")
            && quad_has_graph(q, &doc_nuri)
    });
    let has_new_adult_value = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/isAdult"
            && q.object.to_string().contains("true")
            && quad_has_graph(q, &doc_nuri)
    });

    assert!(!has_old_name, "Old name was not removed");
    assert!(has_new_name, "New name was not added");
    assert!(!has_old_adult_value, "Old isAdult value was not removed");
    assert!(has_new_adult_value, "New isAdult value was not added");

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
                        valType: OrmSchemaValType::iri,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Apply ORM patch: Add hobby
    let root = root_path(&doc_nuri, "urn:test:person4");
    let diff = vec![OrmPatch {
        op: OrmPatchOp::add,
        valType: Some(OrmPatchType::set),
        path: format!("{}/hobby", root),
        value: Some(json!("Swimming")),
    }];

    orm_update(subscription_id, diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied using SPARQL SELECT to check graph IRI
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let hobby_count = quads
        .iter()
        .filter(|q| {
            q.predicate.as_str() == "http://example.org/hobby" && quad_has_graph(q, &doc_nuri)
        })
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
                        valType: OrmSchemaValType::iri,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Apply ORM patch: Remove hobby
    let root = root_path(&doc_nuri, "urn:test:person5");
    let diff = vec![OrmPatch {
        op: OrmPatchOp::remove,
        path: format!("{}/hobby", root),
        valType: None,
        value: Some(json!("Swimming")),
    }];

    orm_update(subscription_id, diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied using SPARQL SELECT to check graph IRI
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let hobby_count = quads
        .iter()
        .filter(|q| {
            q.predicate.as_str() == "http://example.org/hobby" && quad_has_graph(q, &doc_nuri)
        })
        .count();
    let has_swimming = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/hobby"
            && q.object.to_string().contains("Swimming")
            && quad_has_graph(q, &doc_nuri)
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
                        valType: OrmSchemaValType::iri,
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
                        valType: OrmSchemaValType::iri,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;
    // Apply ORM patch: Change city in nested address
    let root = root_path(&doc_nuri, "urn:test:person6");
    let diff = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!("{}/address/city", root),
        valType: None,
        value: Some(json!("Shelbyville")),
    }];

    orm_update(subscription_id, diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied using SPARQL SELECT to check graph IRI
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_old_city = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/city"
            && q.object.to_string().contains("Springfield")
            && quad_has_graph(q, &doc_nuri)
    });
    let has_new_city = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/city"
            && q.object.to_string().contains("Shelbyville")
            && quad_has_graph(q, &doc_nuri)
    });

    assert!(!has_old_city, "Old city should be removed");
    assert!(has_new_city, "New city should be added");

    log_info!("✓ Test passed: Nested literal modification");
}

/// Test multi-level nested object modifications via ORM patch
async fn test_patch_multilevel_nested(session_id: u64) {
    log_info!("\n\n=== TEST: Multi-level Nested Modification ===\n");

    let person_doc_nuri = create_doc_with_data(
        session_id,
        r#"
        PREFIX ex: <http://example-test_patch_multilevel_nested.org/>
        INSERT DATA {
            ex:person7 a ex:Person ;
                ex:name "Eve" ;
                ex:company ex:company1 .
        }
"#
        .to_string(),
    )
    .await;
    let company_doc_nuri = create_doc_with_data(
        session_id,
        r#"
        PREFIX ex: <http://example-test_patch_multilevel_nested.org/>
        INSERT DATA {
            ex:company1 a ex:Company ;
                ex:companyName "Acme-Corp" ;
                ex:headquarter ex:address2 ;
                ex:isMultinational false .
        }
"#
        .to_string(),
    )
    .await;
    let address_doc_nuri = create_doc_with_data(
        session_id,
        r#"
        PREFIX ex: <http://example-test_patch_multilevel_nested.org/>
        INSERT DATA {
            ex:address2 a ex:Address ;
                ex:street "Business Blvd" ;
                ex:city "Metropolis" .
        }
"#
        .to_string(),
    )
    .await;

    let mut schema = HashMap::new();
    schema.insert(
        "http://example-test_patch_multilevel_nested.org/Person".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example-test_patch_multilevel_nested.org/Person".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example-test_patch_multilevel_nested.org/Person".to_string(),
                        )]),
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example-test_patch_multilevel_nested.org/name".to_string(),
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
                    iri: "http://example-test_patch_multilevel_nested.org/company".to_string(),
                    extra: Some(false),
                    readablePredicate: "company".to_string(),
                    minCardinality: 0,
                    maxCardinality: -1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        shape: Some(
                            "http://example-test_patch_multilevel_nested.org/Company".to_string(),
                        ),
                        literals: None,
                    }],
                }),
            ],
        }),
    );
    schema.insert(
        "http://example-test_patch_multilevel_nested.org/Company".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example-test_patch_multilevel_nested.org/Company".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example-test_patch_multilevel_nested.org/Company".to_string(),
                        )]),
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example-test_patch_multilevel_nested.org/companyName".to_string(),
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
                    iri: "http://example-test_patch_multilevel_nested.org/isMultinational"
                        .to_string(),
                    readablePredicate: "isMultinational".to_string(),
                    extra: Some(false),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::boolean,
                        literals: None,
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example-test_patch_multilevel_nested.org/headquarter".to_string(),
                    readablePredicate: "headquarter".to_string(),
                    extra: Some(false),
                    minCardinality: 0,
                    maxCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        shape: Some(
                            "http://example-test_patch_multilevel_nested.org/Address".to_string(),
                        ),
                        literals: None,
                    }],
                }),
            ],
        }),
    );
    schema.insert(
        "http://example-test_patch_multilevel_nested.org/Address".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example-test_patch_multilevel_nested.org/Address".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    readablePredicate: "type".to_string(),
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example-test_patch_multilevel_nested.org/Address".to_string(),
                        )]),
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example-test_patch_multilevel_nested.org/street".to_string(),
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
                    iri: "http://example-test_patch_multilevel_nested.org/city".to_string(),
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
        shape: "http://example-test_patch_multilevel_nested.org/Person".to_string(),
        schema,
    };

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec!["did:ng:i".to_string()], vec![], shape_type, session_id).await;

    // Apply ORM patch: Change street in company's headquarter address (3 levels deep)
    let root = root_path(
        &person_doc_nuri,
        "http://example-test_patch_multilevel_nested.org/person7",
    );
    let child = composite_key(
        &company_doc_nuri,
        "http://example-test_patch_multilevel_nested.org/company1",
    );
    let diff = vec![
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/company/{}/headquarter/street", root, child),
            valType: None,
            value: Some(json!("Rich Street")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/company/{}/companyName", root, child),
            valType: None,
            value: Some(json!("Acme Corp empty isMultinational")),
        },
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("{}/company/{}/isMultinational", root, child),
            valType: None,
            value: None,
        },
    ];

    orm_update(subscription_id, diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied using SPARQL SELECT to check graph IRI
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(person_doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_old_street = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example-test_patch_multilevel_nested.org/street"
            && q.object.to_string().contains("Business Blvd")
            && quad_has_graph(q, &address_doc_nuri)
    });
    let has_new_street = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example-test_patch_multilevel_nested.org/street"
            && q.object.to_string().contains("Rich Street")
            && quad_has_graph(q, &address_doc_nuri)
    });
    let has_old_company_name = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example-test_patch_multilevel_nested.org/companyName"
            && q.object.to_string().contains("Acme-Corp")
            && quad_has_graph(q, &company_doc_nuri)
    });
    let has_new_company_name = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example-test_patch_multilevel_nested.org/companyName"
            && q.object
                .to_string()
                .contains("Acme Corp empty isMultinational")
            && quad_has_graph(q, &company_doc_nuri)
    });
    let has_is_multinational = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example-test_patch_multilevel_nested.org/isMultinational"
            && quad_has_graph(q, &company_doc_nuri)
    });

    assert!(!has_old_street, "Old street should be removed");
    assert!(has_new_street, "New street should be added");
    assert!(!has_old_company_name, "Old company name should be removed");
    assert!(has_new_company_name, "New company name should be added");
    assert!(
        !has_is_multinational,
        "Old isMultinational property should be removed"
    );

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
                        valType: OrmSchemaValType::iri,
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
                    iri: "http://example.org/friend".to_string(),
                    extra: Some(false),
                    readablePredicate: "friend".to_string(),
                    minCardinality: 0,
                    maxCardinality: -1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Apply ORM patch: Create a new object
    let root = root_path(&doc_nuri, "urn:test:person8");
    let diff = vec![
        OrmPatch {
            op: OrmPatchOp::add,
            path: root.clone(),
            valType: Some(OrmPatchType::object),
            value: None,
        },
        OrmPatch {
            // This does nothing as it does not represent a triple.
            // A subject is created when inserting data.
            op: OrmPatchOp::add,
            path: format!("{}/@id", root),
            valType: Some(OrmPatchType::object),
            value: None,
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/type", root),
            valType: None,
            value: Some(json!("http://example.org/Person")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/name", root),
            valType: None,
            value: Some(json!("Alice")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/friend", root),
            valType: None,
            value: Some(json!([])),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/friend", root),
            valType: Some(OrmPatchType::set),
            value: Some(json!([])),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/friend", root),
            valType: Some(OrmPatchType::set),
            value: Some(json!(["http://example.org/Bob"])),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/friend", root),
            valType: Some(OrmPatchType::set),
            value: Some(json!(["http://example.org/Craig"])),
        },
    ];

    orm_update(subscription_id, diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied using SPARQL SELECT to check graph IRI
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_name = quads.iter().any(|q| {
        q.subject.to_string() == "<urn:test:person8>"
            && q.predicate.as_str() == "http://example.org/name"
            && q.object.to_string().contains("Alice")
            && quad_has_graph(q, &doc_nuri)
    });
    let has_type = quads.iter().any(|q| {
        q.predicate.as_str() == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
            && q.object.to_string().contains("http://example.org/Person")
            && quad_has_graph(q, &doc_nuri)
    });
    let has_friend_bob = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/friend"
            && q.object.to_string().contains("http://example.org/Bob")
            && quad_has_graph(q, &doc_nuri)
    });
    let has_friend_craig = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/friend"
            && q.object.to_string().contains("http://example.org/Craig")
            && quad_has_graph(q, &doc_nuri)
    });

    assert!(has_name, "New person should have name");
    assert!(has_type, "New person should have type");
    assert!(has_friend_bob, "New person should have friend Bob");
    assert!(has_friend_craig, "New person should have friend Craig");

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
                        valType: OrmSchemaValType::iri,
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
                        valType: OrmSchemaValType::iri,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Apply ORM patch: Add a second address.
    let root = root_path(&doc_nuri, "urn:test:person9");
    let child = composite_key(&doc_nuri, "http://example.org/exampleAddress");
    let patches = vec![
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/{}", root, child),
            valType: Some(OrmPatchType::object),
            value: None,
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/{}/@graph", root, child),
            valType: None,
            value: Some(json!("http://example.org/Address")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/{}/@id", root, child),
            valType: None,
            value: Some(json!("http://example.org/exampleAddress")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/{}/type", root, child),
            valType: None,
            value: Some(json!("http://example.org/Address")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/{}/street", root, child),
            valType: None,
            value: Some(json!("Heaven Avenue")),
        },
    ];

    orm_update(subscription_id, patches, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied using SPARQL SELECT to check graph IRI
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_new_address_type = quads.iter().any(|q| {
        q.subject
            .to_string()
            .contains("http://example.org/exampleAddress")
            && q.predicate.as_str() == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
            && q.object.to_string().contains("http://example.org/Address")
            && quad_has_graph(q, &doc_nuri)
    });
    let has_new_address_street = quads.iter().any(|q| {
        q.subject
            .to_string()
            .contains("http://example.org/exampleAddress")
            && q.predicate.as_str() == "http://example.org/street"
            && q.object.to_string().contains("Heaven Avenue")
            && quad_has_graph(q, &doc_nuri)
    });
    let has_new_address_link = quads.iter().any(|q| {
        q.subject.to_string().contains("urn:test:person9")
            && q.predicate.as_str() == "http://example.org/address"
            && q.object
                .to_string()
                .contains("http://example.org/exampleAddress")
            && quad_has_graph(q, &doc_nuri)
    });

    assert!(has_new_address_type, "New address type should be added");
    assert!(has_new_address_street, "New street should be added");
    assert!(
        has_new_address_link,
        "Link from user to address should be added."
    );

    log_info!("✓ Test passed: Nested object creation");
}

/// Test creating a single-valued nested object using @id/@graph staging (no composite child key)
async fn test_patch_create_single_nested_object(session_id: u64) {
    log_info!("\n\n=== TEST: Single-nested object creation (no composite key) ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:person10> a ex:Person ;
        ex:name "Eve" .
}
"#
        .to_string(),
    )
    .await;

    // Person with a single-valued address
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
                        valType: OrmSchemaValType::iri,
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
                    maxCardinality: 1, // single-valued
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
                        valType: OrmSchemaValType::iri,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Apply ORM patches to create the single nested Address under person10
    let root = root_path(&doc_nuri, "urn:test:person10");
    let diff = vec![
        // Stage the child identity and location (single-nested => no composite key in path)
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/@id", root),
            valType: None,
            value: Some(json!("http://example.org/exampleAddress2")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/@graph", root),
            valType: None,
            value: Some(json!(doc_nuri.clone())),
        },
        // Now set fields on the child
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/type", root),
            valType: None,
            value: Some(json!("http://example.org/Address")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/street", root),
            valType: None,
            value: Some(json!("Sunrise Boulevard")),
        },
    ];

    orm_update(subscription_id, diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the change was applied using SPARQL SELECT to check graph IRI
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_link = quads.iter().any(|q| {
        q.subject.to_string().contains("urn:test:person10")
            && q.predicate.as_str() == "http://example.org/address"
            && q.object
                .to_string()
                .contains("http://example.org/exampleAddress2")
            && quad_has_graph(q, &doc_nuri)
    });
    let has_type = quads.iter().any(|q| {
        q.subject
            .to_string()
            .contains("http://example.org/exampleAddress2")
            && q.predicate.as_str() == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
            && q.object.to_string().contains("http://example.org/Address")
            && quad_has_graph(q, &doc_nuri)
    });
    let has_street = quads.iter().any(|q| {
        q.subject
            .to_string()
            .contains("http://example.org/exampleAddress2")
            && q.predicate.as_str() == "http://example.org/street"
            && q.object.to_string().contains("Sunrise Boulevard")
            && quad_has_graph(q, &doc_nuri)
    });

    assert!(
        has_link,
        "Person should be linked to the new single address"
    );
    assert!(has_type, "New single address type should be added");
    assert!(has_street, "New single address street should be added");

    log_info!("✓ Test passed: Single-nested object creation (no composite key)");
}

/// Test replacing a single-nested object via @id/@graph staging at the predicate path.
async fn test_patch_replace_single_nested_object(session_id: u64) {
    log_info!("\n\n=== TEST: Replace Single-nested object (no composite key) ===\n");

    // Prepare initial data: person with an existing address A
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:person12> a ex:Person ;
        ex:name "Greg" ;
        ex:address <urn:test:addressA> .
    <urn:test:addressA> a ex:Address ;
        ex:street "Old Road" .
}
"#
        .to_string(),
    )
    .await;

    // Define the ORM schema (Person with single-valued address; Address with street)
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
                        valType: OrmSchemaValType::iri,
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
                        valType: OrmSchemaValType::iri,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Apply patches to replace the single-nested address with a new subject B
    let root = root_path(&doc_nuri, "urn:test:person12");
    let new_address = "http://example.org/exampleAddress3";
    let diff = vec![
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/@id", root),
            valType: None,
            value: Some(json!(new_address)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/@graph", root),
            valType: None,
            value: Some(json!(doc_nuri.clone())),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/type", root),
            valType: None,
            value: Some(json!("http://example.org/Address")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/street", root),
            valType: None,
            value: Some(json!("New Street")),
        },
    ];

    orm_update(subscription_id, diff, session_id)
        .await
        .expect("orm_update failed");

    // Verify the link now points to the new address and not the old one using SPARQL SELECT
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_old_link = quads.iter().any(|q| {
        (match &q.subject {
            ng_oxigraph::oxrdf::Subject::NamedNode(n) => n.as_string() == "urn:test:person12",
            _ => false,
        } && q.predicate.as_str() == "http://example.org/address"
            && q.object.to_string().contains("urn:test:addressA")
            && quad_has_graph(q, &doc_nuri))
    });
    let has_new_link = quads.iter().any(|q| {
        (match &q.subject {
            ng_oxigraph::oxrdf::Subject::NamedNode(n) => n.as_string() == "urn:test:person12",
            _ => false,
        } && q.predicate.as_str() == "http://example.org/address"
            && q.object.to_string().contains(new_address)
            && quad_has_graph(q, &doc_nuri))
    });

    assert!(!has_old_link, "Old address link should have been replaced");
    assert!(has_new_link, "New address link was not set");

    // And the new address properties exist
    let has_new_type = quads.iter().any(|q| {
        (match &q.subject {
            ng_oxigraph::oxrdf::Subject::NamedNode(n) => n.as_str() == new_address,
            _ => false,
        } && q.predicate.as_str() == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
            && q.object.to_string().contains("http://example.org/Address")
            && quad_has_graph(q, &doc_nuri))
    });
    let has_new_street = quads.iter().any(|q| {
        (match &q.subject {
            ng_oxigraph::oxrdf::Subject::NamedNode(n) => n.as_str() == new_address,
            _ => false,
        } && q.predicate.as_str() == "http://example.org/street"
            && q.object.to_string().contains("New Street")
            && quad_has_graph(q, &doc_nuri))
    });
    assert!(
        has_new_type && has_new_street,
        "New nested object was not created correctly"
    );

    log_info!("✓ Test passed: Replace Single-nested object (no composite key)");
}

/// Test replacing object's type invalidating it.
async fn test_patch_invalidating_object(session_id: u64) {
    log_info!("\n\n=== TEST: Patch invalidating object ===\n");

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
                        valType: OrmSchemaValType::iri,
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

    let (receiver, _cancel_fn, subscription_id, initial) = create_orm_connection(
        vec![doc_nuri.clone()],
        vec![],
        shape_type.clone(),
        session_id,
    )
    .await;

    let (mut receiver2, _cancel_fn, subscription_id2, initial2) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Apply ORM patch: Change type to something invalid by schema.
    let root = root_path(&doc_nuri, "urn:test:person2");
    let patch = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!("{}/type", root),
        valType: None,
        value: Some(json!("http://example.org/NotAPerson")),
    }];

    orm_update(subscription_id, patch, session_id)
        .await
        .expect("orm_update failed");

    // Expect delete patch for root object
    while let Some(app_response) = receiver2.next().await {
        let patches = match app_response {
            AppResponse::V0(v) => match v {
                AppResponseV0::OrmUpdate(json) => Some(json),
                _ => None,
            },
        }
        .unwrap();

        log_info!("Patches arrived:\n");
        for patch in patches.iter() {
            log_info!("{:?}", patch);
        }

        let mut expected = json!([
            {
                "op": "remove",
                "valType": "object",
                "path": root,
            },
        ]);

        let mut actual = json!(patches);
        assert_json_eq(&mut expected, &mut actual);

        break;
    }

    log_info!("✓ Test passed: Received object remove patch after patch makes object invalid.");
}

// Test: remove one link from multi-valued object predicate (address) leaving the other intact.
async fn test_patch_multi_valued_object_link_removal(session_id: u64) {
    log_info!("\n\n=== TEST: Multi-valued object link removal ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"PREFIX ex: <http://example.org/>
INSERT DATA {
  <urn:test:personML> a ex:Person ; ex:address <urn:test:a1>, <urn:test:a2> .
  <urn:test:a1> a ex:Address ; ex:street "S1" .
  <urn:test:a2> a ex:Address ; ex:street "S2" .
}"#
        .to_string(),
    )
    .await;

    let mut schema = HashMap::new();
    // Person shape with multi-valued address
    schema.insert(
        "http://example.org/Person".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Person".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    readablePredicate: "type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Person".to_string(),
                        )]),
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/address".to_string(),
                    readablePredicate: "address".to_string(),
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::shape,
                        shape: Some("http://example.org/Address".to_string()),
                        literals: None,
                    }],
                }),
            ],
        }),
    );
    // Address shape
    schema.insert(
        "http://example.org/Address".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Address".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    readablePredicate: "type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
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
                    maxCardinality: 1,
                    minCardinality: 0,
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
    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    let root = root_path(&doc_nuri, "urn:test:personML");
    let child_seg = composite_key(&doc_nuri, "urn:test:a1");
    let diff = vec![OrmPatch {
        op: OrmPatchOp::remove,
        path: format!("{}/address/{}", root, child_seg),
        valType: Some(OrmPatchType::object),
        value: None,
    }];
    orm_update(subscription_id, diff, session_id).await.unwrap();

    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .unwrap();
    let links: Vec<_> = quads
        .iter()
        .filter(|q| {
            q.subject.to_string().contains("urn:test:personML")
                && q.predicate.as_str() == "http://example.org/address"
        })
        .collect();
    assert_eq!(links.len(), 1, "Exactly one address link should remain");
    assert!(
        links
            .iter()
            .any(|q| q.object.to_string().contains("urn:test:a2")),
        "Remaining link should point to a2"
    );

    log_info!("✓ Test passed: Multi-valued object link removal");
}

// Test: tilde path decoding when creating nested object with encoded @id in composite key.
async fn test_patch_tilde_path_decoding_creation(session_id: u64) {
    log_info!("\n\n=== TEST: Tilde path decoding nested creation ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"PREFIX ex: <http://example.org/>
INSERT DATA { <urn:test:personT> a ex:Person . }"#
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
                    readablePredicate: "type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Person".to_string(),
                        )]),
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/address".to_string(),
                    readablePredicate: "address".to_string(),
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
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
                    readablePredicate: "type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
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
                    maxCardinality: 1,
                    minCardinality: 0,
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
    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    let root = root_path(&doc_nuri, "urn:test:personT");
    let encoded_child_key = format!(
        "{}|{}",
        escape_pointer_segment(&doc_nuri),
        escape_pointer_segment("http://example.org/example~Address/seg")
    );
    // Use the document graph for @graph to ensure SPARQL builder applies creation.
    // Order patches so @id precedes @graph similar to other creation tests.
    let patches = vec![
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/{}", root, encoded_child_key),
            valType: Some(OrmPatchType::object),
            value: None,
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/{}/@id", root, encoded_child_key),
            valType: None,
            value: Some(json!("http://example.org/example~Address/seg")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/{}/@graph", root, encoded_child_key),
            valType: None,
            value: Some(json!(doc_nuri)),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/{}/type", root, encoded_child_key),
            valType: None,
            value: Some(json!("http://example.org/Address")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/address/{}/street", root, encoded_child_key),
            valType: None,
            value: Some(json!("not:iri:Lane")),
        },
    ];
    orm_update(subscription_id, patches, session_id)
        .await
        .unwrap();

    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .unwrap();
    let has_street = quads.iter().any(|q| {
        q.subject
            .to_string()
            .contains("http://example.org/example~Address/seg")
            && q.predicate.as_str() == "http://example.org/street"
            && q.object.to_string().contains("not:iri:Lane")
    });
    assert!(
        has_street,
        "Street literal should exist for decoded subject IRI"
    );

    log_info!("✓ Test passed: Tilde path decoding nested creation");
}

// Test 13: remove_all multi-valued literal
async fn test_patch_remove_all_multi_valued_literal(session_id: u64) {
    log_info!("\n\n=== TEST: remove_all multi-valued literal ===\n");
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"PREFIX ex: <http://example.org/>
INSERT DATA { <urn:test:mv1> a ex:Person ; ex:hobby "Reading", "Swimming", "Cooking" . }"#
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
                    readablePredicate: "type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
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
                    maxCardinality: -1,
                    minCardinality: 0,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    let root = root_path(&doc_nuri, "urn:test:mv1");
    let diff = vec![OrmPatch {
        op: OrmPatchOp::remove,
        path: format!("{}/hobby", root),
        valType: None,
        value: None,
    }];
    orm_update(subscription_id, diff, session_id).await.unwrap();
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .unwrap();
    // Limit count to hobbies in the current document graph to avoid spillover from previous tests
    let hobby_remaining = quads
        .iter()
        .filter(|q| {
            q.predicate.as_str() == "http://example.org/hobby" && quad_has_graph(q, &doc_nuri)
        })
        .count();
    assert_eq!(
        hobby_remaining, 0,
        "All hobbies should be removed via remove_all"
    );
    log_info!("✓ Test passed: remove_all multi-valued literal");
}

// Test 14: Idempotent add literal
async fn test_patch_idempotent_add_literal(session_id: u64) {
    log_info!("\n\n=== TEST: Idempotent add literal ===\n");
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"PREFIX ex: <http://example.org/>
INSERT DATA { <urn:test:idem1> a ex:Person ; ex:hobby "Reading" . }"#
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
                    readablePredicate: "type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
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
                    maxCardinality: -1,
                    minCardinality: 0,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    let root = root_path(&doc_nuri, "urn:test:idem1");
    let patch = OrmPatch {
        op: OrmPatchOp::add,
        path: format!("{}/hobby", root),
        valType: Some(OrmPatchType::set),
        value: Some(json!("Reading")),
    };
    orm_update(subscription_id, vec![patch.clone(), patch], session_id)
        .await
        .unwrap();
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .unwrap();
    // Limit to current document graph to avoid spillover and ensure idempotency
    use ng_oxigraph::oxrdf::Subject as OxSubject;
    let hobbies: Vec<_> = quads
        .iter()
        .filter(|q| {
            q.predicate.as_str() == "http://example.org/hobby"
                && quad_has_graph(q, &doc_nuri)
                && match &q.subject {
                    OxSubject::NamedNode(nn) => nn.as_str() == "urn:test:idem1",
                    _ => false,
                }
        })
        .collect();
    assert_eq!(
        hobbies.len(),
        1,
        "Duplicate add should not create extra triple in set semantics"
    );
    log_info!("✓ Test passed: Idempotent add literal");
}

// Test 15: No-op remove nonexistent literal
async fn test_patch_noop_remove_nonexistent_literal(session_id: u64) {
    log_info!("\n\n=== TEST: No-op remove nonexistent literal ===\n");
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"PREFIX ex: <http://example.org/>
INSERT DATA { <urn:test:noopr1> a ex:Person ; ex:hobby "Reading" . }"#
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
                    readablePredicate: "type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
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
                    maxCardinality: -1,
                    minCardinality: 0,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    let root = root_path(&doc_nuri, "urn:test:noopr1");
    let diff = vec![OrmPatch {
        op: OrmPatchOp::remove,
        path: format!("{}/hobby", root),
        valType: None,
        value: Some(json!("Swimming")),
    }];
    orm_update(subscription_id, diff, session_id).await.unwrap();
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .unwrap();
    // Limit to current document graph and subject to avoid spillover from previous tests
    use ng_oxigraph::oxrdf::Subject as OxSubject;
    let hobbies_left: Vec<_> = quads
        .iter()
        .filter(|q| {
            q.predicate.as_str() == "http://example.org/hobby"
                && quad_has_graph(q, &doc_nuri)
                && match &q.subject {
                    OxSubject::NamedNode(nn) => nn.as_str() == "urn:test:noopr1",
                    _ => false,
                }
        })
        .collect();
    assert_eq!(
        hobbies_left.len(),
        1,
        "Nonexistent remove should not alter existing data"
    );
    log_info!("✓ Test passed: No-op remove nonexistent literal");
}

// Test 16: Mixed batch operations
async fn test_patch_mixed_batch_operations(session_id: u64) {
    log_info!("\n\n=== TEST: Mixed batch operations ===\n");
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"PREFIX ex: <http://example.org/>
INSERT DATA { <urn:test:mix1> a ex:Person ; ex:hobby "Reading" ; ex:name "Ann" . }"#
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
                    readablePredicate: "type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
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
                    maxCardinality: 1,
                    minCardinality: 0,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::string,
                        literals: None,
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/hobby".to_string(),
                    readablePredicate: "hobby".to_string(),
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    let root = root_path(&doc_nuri, "urn:test:mix1");
    let patches = vec![
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/hobby", root),
            valType: Some(OrmPatchType::set),
            value: Some(json!("Swimming")),
        },
        OrmPatch {
            op: OrmPatchOp::add,
            path: format!("{}/name", root),
            valType: None,
            value: Some(json!("Anna")),
        },
        OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("{}/hobby", root),
            valType: None,
            value: Some(json!("Reading")),
        },
    ];
    orm_update(subscription_id, patches, session_id)
        .await
        .unwrap();
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .unwrap();
    use ng_oxigraph::oxrdf::Subject as OxSubject;
    let has_new_name = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/name"
            && q.object.to_string().contains("Anna")
            && quad_has_graph(q, &doc_nuri)
            && matches!(&q.subject, OxSubject::NamedNode(nn) if nn.as_str()=="urn:test:mix1")
    });
    let has_swimming = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/hobby"
            && q.object.to_string().contains("Swimming")
            && quad_has_graph(q, &doc_nuri)
            && matches!(&q.subject, OxSubject::NamedNode(nn) if nn.as_str()=="urn:test:mix1")
    });
    let has_reading = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/hobby"
            && q.object.to_string().contains("Reading")
            && quad_has_graph(q, &doc_nuri)
            && matches!(&q.subject, OxSubject::NamedNode(nn) if nn.as_str()=="urn:test:mix1")
    });
    assert!(
        has_new_name && has_swimming && !has_reading,
        "Mixed batch should update name, add Swimming, remove Reading"
    );
    log_info!("✓ Test passed: Mixed batch operations");
}

// Test 17: remove_all vs selective remove sequencing
async fn test_patch_remove_all_vs_selective_remove(session_id: u64) {
    log_info!("\n\n=== TEST: remove_all vs selective remove sequencing ===\n");
    let doc_nuri = create_doc_with_data(
        session_id,
        r#"PREFIX ex: <http://example.org/>
INSERT DATA { <urn:test:rar1> a ex:Person ; ex:hobby "Reading", "Swimming" . }"#
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
                    readablePredicate: "type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
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
                    maxCardinality: -1,
                    minCardinality: 0,
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

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    let root = root_path(&doc_nuri, "urn:test:rar1");
    // selective remove Reading
    orm_update(
        subscription_id,
        vec![OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("{}/hobby", root),
            valType: None,
            value: Some(json!("Reading")),
        }],
        session_id,
    )
    .await
    .unwrap();
    // remove_all remaining
    orm_update(
        subscription_id,
        vec![OrmPatch {
            op: OrmPatchOp::remove,
            path: format!("{}/hobby", root),
            valType: None,
            value: None,
        }],
        session_id,
    )
    .await
    .unwrap();
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .unwrap();
    use ng_oxigraph::oxrdf::Subject as OxSubject;
    // Restrict check to hobbies of the target subject within its document graph
    let any_hobby_rar1 = quads.iter().any(|q| {
        q.predicate.as_str() == "http://example.org/hobby"
            && quad_has_graph(q, &doc_nuri)
            && matches!(&q.subject, OxSubject::NamedNode(nn) if nn.as_str()=="urn:test:rar1")
    });
    assert!(
        !any_hobby_rar1,
        "All hobbies for rar1 should be gone after selective then remove_all"
    );
    log_info!("✓ Test passed: remove_all vs selective remove sequencing");
}

// Test 18: Duplicate object link add
async fn test_patch_duplicate_object_link_add(session_id: u64) {
    log_info!("\n\n=== TEST: Duplicate object link add ===\n");
    let doc_nuri = create_doc_with_data(session_id, r#"PREFIX ex: <http://example.org/>
INSERT DATA { <urn:test:personDL> a ex:Person ; ex:address <urn:test:addr1> . <urn:test:addr1> a ex:Address . }"#.to_string()).await;
    let mut schema = HashMap::new();
    schema.insert(
        "http://example.org/Person".to_string(),
        Arc::new(OrmSchemaShape {
            iri: "http://example.org/Person".to_string(),
            predicates: vec![
                Arc::new(OrmSchemaPredicate {
                    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    readablePredicate: "type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Person".to_string(),
                        )]),
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/address".to_string(),
                    readablePredicate: "address".to_string(),
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
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
            predicates: vec![Arc::new(OrmSchemaPredicate {
                iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                readablePredicate: "type".to_string(),
                extra: Some(false),
                maxCardinality: 1,
                minCardinality: 1,
                dataTypes: vec![OrmSchemaDataType {
                    valType: OrmSchemaValType::iri,
                    literals: Some(vec![BasicType::Str(
                        "http://example.org/Address".to_string(),
                    )]),
                    shape: None,
                }],
            })],
        }),
    );
    let shape_type = OrmShapeType {
        shape: "http://example.org/Person".to_string(),
        schema,
    };

    let (receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    let root = root_path(&doc_nuri, "urn:test:personDL");
    let child_seg = composite_key(&doc_nuri, "urn:test:addr1");
    let patch = OrmPatch {
        op: OrmPatchOp::add,
        path: format!("{}/address/{}", root, child_seg),
        valType: Some(OrmPatchType::object),
        value: None,
    };
    orm_update(subscription_id, vec![patch.clone(), patch], session_id)
        .await
        .unwrap();
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .unwrap();
    let links: Vec<_> = quads
        .iter()
        .filter(|q| {
            q.subject.to_string().contains("urn:test:personDL")
                && q.predicate.as_str() == "http://example.org/address"
                && q.object.to_string().contains("urn:test:addr1")
        })
        .collect();
    assert_eq!(
        links.len(),
        1,
        "Duplicate object link add should not create multiple identical triples"
    );
    log_info!("✓ Test passed: Duplicate object link add");
}

// Test 19: Cross-graph object link removal
async fn test_patch_cross_graph_object_removal(session_id: u64) {
    log_info!("\n\n=== TEST: Cross-graph object link removal ===\n");
    let child_doc = create_doc_with_data(
        session_id,
        r#"PREFIX ex: <http://example.org/>
INSERT DATA { <urn:test:child1> a ex:Address . }"#
            .to_string(),
    )
    .await;
    let parent_doc = create_doc_with_data(
        session_id,
        r#"PREFIX ex: <http://example.org/>
INSERT DATA { <urn:test:personCR> a ex:Person ; ex:address <urn:test:child1> . }"#
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
                    readablePredicate: "type".to_string(),
                    extra: Some(false),
                    maxCardinality: 1,
                    minCardinality: 1,
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Person".to_string(),
                        )]),
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/address".to_string(),
                    readablePredicate: "address".to_string(),
                    extra: Some(false),
                    maxCardinality: -1,
                    minCardinality: 0,
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
            predicates: vec![Arc::new(OrmSchemaPredicate {
                iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                readablePredicate: "type".to_string(),
                extra: Some(false),
                maxCardinality: 1,
                minCardinality: 1,
                dataTypes: vec![OrmSchemaDataType {
                    valType: OrmSchemaValType::iri,
                    literals: Some(vec![BasicType::Str(
                        "http://example.org/Address".to_string(),
                    )]),
                    shape: None,
                }],
            })],
        }),
    );
    let shape_type = OrmShapeType {
        shape: "http://example.org/Person".to_string(),
        schema,
    };

    let (_receiver, _cancel_fn, subscription_id, initial) =
        create_orm_connection(vec!["did:ng:i".to_string()], vec![], shape_type, session_id).await;

    let root = root_path(&parent_doc, "urn:test:personCR");
    let child_seg = composite_key(&child_doc, "urn:test:child1");
    let diff = vec![OrmPatch {
        op: OrmPatchOp::remove,
        path: format!("{}/address/{}", root, child_seg),
        valType: Some(OrmPatchType::object),
        value: None,
    }];
    orm_update(subscription_id, diff, session_id).await.unwrap();
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(parent_doc.clone()),
    )
    .await
    .unwrap();
    let link_exists = quads.iter().any(|q| {
        q.subject.to_string().contains("urn:test:personCR")
            && q.predicate.as_str() == "http://example.org/address"
            && q.object.to_string().contains("urn:test:child1")
    });
    assert!(
        !link_exists,
        "Cross-graph link should be removed in parent graph"
    );
    log_info!("✓ Test passed: Cross-graph object link removal");
}

/// Test that invalid schema values trigger revert patches
/// When a patch contains a value that doesn't match the schema (e.g., non-IRI for IRI-only predicate),
/// the system should send a revert patch back to the frontend.
async fn test_patch_revert_invalid_schema_value(session_id: u64) {
    log_info!("\n\n=== TEST: Revert Patches for Invalid Schema Value ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:personRevert1> a ex:Person ;
        ex:someResource <http://example.org/resource1> .
}
"#
        .to_string(),
    )
    .await;

    // Define schema with an IRI-only predicate (no string allowed)
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
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Person".to_string(),
                        )]),
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/someResource".to_string(),
                    extra: Some(false),
                    readablePredicate: "someResource".to_string(),
                    minCardinality: 0,
                    maxCardinality: 1,
                    // Only IRI allowed, no string
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
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

    let (mut receiver, _cancel_fn, subscription_id, _initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Send a patch with a plain string, not an IRI.
    let root = root_path(&doc_nuri, "urn:test:personRevert1");
    let invalid_diff = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!("{}/someResource", root),
        valType: None,
        value: Some(json!("not a valid IRI")),
    }];

    orm_update(subscription_id, invalid_diff, session_id)
        .await
        .expect("orm_update");

    // Wait for revert patch from the receiver.
    // For single-valued predicates with an existing value, the revert should be
    // an `add` patch that restores the original value.
    let revert_received = timeout(Duration::from_secs(1), async {
        while let Some(response) = receiver.next().await {
            if let AppResponse::V0(AppResponseV0::OrmUpdate(patches)) = response {
                // Should receive a revert patch that restores the original value
                for patch in &patches {
                    if patch.op == OrmPatchOp::add
                        && patch.path.contains("someResource")
                        && patch.value == Some(json!("http://example.org/resource1"))
                    {
                        return true;
                    }
                }
            }
        }
        false
    })
    .await;

    assert!(
        revert_received.unwrap_or(false),
        "Should receive a revert patch for invalid schema value"
    );

    log_info!("✓ Test passed: Revert patches for invalid schema value");
}

/// Test that invalid values in multi-valued sets trigger revert patches
async fn test_patch_revert_multi_valued_invalid(session_id: u64) {
    use async_std::future::timeout;
    use std::time::Duration;

    log_info!("\n\n=== TEST: Revert Patches for Multi-Valued Set Invalid Value ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:personRevert2> a ex:Person ;
        ex:links <http://example.org/link1> ;
        ex:links <http://example.org/link2> .
}
"#
        .to_string(),
    )
    .await;

    // Define schema with multi-valued IRI-only predicate
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
                        valType: OrmSchemaValType::iri,
                        literals: Some(vec![BasicType::Str(
                            "http://example.org/Person".to_string(),
                        )]),
                        shape: None,
                    }],
                }),
                Arc::new(OrmSchemaPredicate {
                    iri: "http://example.org/links".to_string(),
                    extra: Some(false),
                    readablePredicate: "links".to_string(),
                    minCardinality: 0,
                    maxCardinality: -1, // Multi-valued
                    // Only IRI allowed
                    dataTypes: vec![OrmSchemaDataType {
                        valType: OrmSchemaValType::iri,
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

    let (mut receiver, _cancel_fn, subscription_id, _initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Send a batch with one valid and one invalid add
    let root = root_path(&doc_nuri, "urn:test:personRevert2");
    let mixed_diff = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!("{}/links", root),
        valType: Some(OrmPatchType::set),
        value: Some(json!(["http://example.org/link3", "invalid plain text"])),
    }];

    orm_update(subscription_id, mixed_diff, session_id)
        .await
        .expect("orm_update should not fail");

    // Wait for revert patch for the invalid value only
    let revert_received = timeout(Duration::from_secs(1), async {
        while let Some(response) = receiver.next().await {
            if let AppResponse::V0(AppResponseV0::OrmUpdate(patches)) = response {
                log_debug!("got patch: {:?}", patches);
                for patch in &patches {
                    if patch.op == OrmPatchOp::remove
                        && patch.path.contains("links")
                        && patch.value
                            == Some(json!(["http://example.org/link3", "invalid plain text"]))
                    {
                        return true;
                    }
                }
            }
        }
        false
    })
    .await;

    assert!(
        revert_received.unwrap_or(false),
        "Should receive a revert patch for invalid multi-valued set value"
    );

    log_info!("✓ Test passed: Revert patches for multi-valued set invalid value");
}

/// Test adding an extra value to a cardinality restricted literal.
async fn test_patch_add_extra_value(session_id: u64) {
    log_info!("\n\n=== TEST: Add Extra Value ===\n");

    let doc_nuri = create_doc_with_data(
        session_id,
        r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:person1>
        a ex:Person;
        ex:name "Bob" .
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
                    extra: Some(true),
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
                }),
                Arc::new(OrmSchemaPredicate {
                    extra: Some(false),
                    iri: "http://example.org/name".to_string(),
                    readablePredicate: "name".to_string(),
                    minCardinality: 1,
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

    let (receiver, _cancel_fn, subscription_id, initial) = create_orm_connection(
        vec![doc_nuri.clone()],
        vec![],
        shape_type.clone(),
        session_id,
    )
    .await;

    let (mut receiver2, _cancel_fn, subscription_id_2, _initial) =
        create_orm_connection(vec![doc_nuri.clone()], vec![], shape_type, session_id).await;

    // Apply ORM patch: Add name
    let root = root_path(&doc_nuri, "urn:test:person1");
    let patches = vec![OrmPatch {
        op: OrmPatchOp::add,
        path: format!("{}/type", root),
        valType: Some(OrmPatchType::set),
        value: Some(json!("http://example.org/Human")),
    }];

    graph_orm_update(subscription_id, patches, session_id)
        .await
        .expect("graph_orm_update failed");

    let patches = await_app_response(&mut receiver2).await;
    // Only an add patch should be generated. The object is not deleted
    assert!(patches.len() == 1, "Expected single patch");

    // Verify the change was applied using SPARQL SELECT to check graph IRI
    let quads = doc_sparql_select(
        session_id,
        "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }".to_string(),
        Some(doc_nuri.clone()),
    )
    .await
    .expect("SPARQL query failed");

    let has_name = quads.iter().any(|q| {
        q.predicate.as_str() == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
            && q.object.to_string().contains("http://example.org/Human")
            && quad_has_graph(q, &doc_nuri)
    });
    assert!(
        has_name,
        "Name was not added to the graph with correct graph IRI"
    );

    log_info!("✓ Test passed: Add extra value");
}
