/*
 * Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
*/

#![allow(non_snake_case)]

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use serde_json::Value;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmShapeType {
    pub schema: OrmSchema,
    pub shape: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum OrmDiffOpType {
    add,
    remove,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum OrmDiffType {
    set,
    object,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmDiffOp {
    pub op: OrmDiffOpType,
    pub valType: Option<OrmDiffType>,
    pub path: String,
    pub value: Option<Value>,
}

pub type OrmDiff = Vec<OrmDiffOp>;

type OrmSchema = HashMap<String, OrmSchemaShape>;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmSchemaShape {
    pub iri: String,
    pub predicates: Vec<OrmSchemaPredicate>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum OrmSchemaLiteralType {
    number,
    string,
    boolean,
    iri,
    literal,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum OrmSchemaPredicateType {
    number,
    string,
    boolean,
    iri,
    literal,
    nested,
    eitherOf,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum OrmLiterals {
    Bool(bool),
    NumArray(Vec<f64>),
    StrArray(Vec<String>),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmSchemaDataType {
    pub valType: OrmSchemaLiteralType,
    pub literals: Option<OrmLiterals>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmSchemaPredicate {
    pub valType: OrmSchemaPredicateType,
    pub iri: String,
    pub readablePredicate: String,
    pub literalValue: Option<Value>, // Strictly speaking, no objects.
    pub nestedShape: Option<String>, // Only by reference.
    pub maxCardinality: i64,         // -1 for infinity
    pub minCardinality: i64,
    pub eitherOf: Option<Vec<OrmSchemaEitherOfOption>>, // Shape references or multi type.
    pub extra: Option<bool>,
}

// TODO: Will this be serialized correctly?
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum OrmSchemaEitherOfOption {
    ShapeRef(String),
    DataType(OrmSchemaDataType),
}
