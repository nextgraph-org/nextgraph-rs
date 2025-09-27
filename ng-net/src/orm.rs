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

/* == Diff Types == */
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
    pub value: Option<Value>, // TODO: Improve type
}

pub type OrmDiff = Vec<OrmDiffOp>;

/* == ORM Schema == */
pub type OrmSchema = HashMap<String, OrmSchemaShape>;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmSchemaShape {
    pub iri: String,
    pub predicates: Vec<OrmSchemaPredicate>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Eq, PartialEq)]
#[allow(non_camel_case_types)]
pub enum OrmSchemaLiteralType {
    number,
    string,
    boolean,
    iri,
    literal,
    shape,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum OrmSchemaLiterals {
    Bool(bool),
    NumArray(Vec<f64>),
    StrArray(Vec<String>),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmSchemaDataType {
    pub valType: OrmSchemaLiteralType,
    pub literals: Option<OrmSchemaLiterals>,
    pub shape: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmSchemaPredicate {
    pub dataTypes: Vec<OrmSchemaDataType>,
    pub iri: String,
    pub readablePredicate: String,
    /// `-1` for infinity
    pub maxCardinality: i64,
    pub minCardinality: i64,
    pub extra: Option<bool>,
}

impl Default for OrmSchemaDataType {
    fn default() -> Self {
        Self {
            literals: None,
            shape: None,
            valType: OrmSchemaLiteralType::string,
        }
    }
}

impl Default for OrmSchemaPredicate {
    fn default() -> Self {
        Self {
            dataTypes: Vec::new(),
            iri: String::new(),
            readablePredicate: String::new(),
            maxCardinality: -1,
            minCardinality: 0,
            extra: None,
        }
    }
}

/** == Internal data types == */
#[derive(Clone, Debug)]
pub struct OrmShapeTypeRef {
    ref_count: u64,
    shape_type: OrmShapeType,
}
