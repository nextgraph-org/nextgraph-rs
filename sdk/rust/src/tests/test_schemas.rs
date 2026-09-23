use std::{collections::HashMap, sync::Arc};

use ng_net::orm::{
    BasicType, OrmSchemaDataType, OrmSchemaPredicate, OrmSchemaShape, OrmSchemaValType,
};

pub(crate) fn create_house_schema() -> HashMap<String, Arc<OrmSchemaShape>> {
    let mut house_schema = HashMap::new();

    // House shape
    house_schema.insert(
        "http://example.org/HouseShape".to_string(),
        OrmSchemaShape {
            is_closed: false,
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
    house_schema.insert(
        "http://example.org/PersonShape".to_string(),
        OrmSchemaShape {
            is_closed: false,
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
    house_schema.insert(
        "http://example.org/CatShape".to_string(),
        OrmSchemaShape {
            is_closed: false,
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
    house_schema.insert(
        "http://example.org/ToyShape".to_string(),
        OrmSchemaShape {
            is_closed: false,
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
    house_schema
}
