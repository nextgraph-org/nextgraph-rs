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

use std::{collections::HashMap, rc::Weak};

use serde::{Deserialize, Serialize};

use serde_json::Value;

use crate::app_protocol::AppResponse;
use crate::utils::Sender;

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

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
pub enum BasicType {
    Bool(bool),
    Num(f64),
    Str(String),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmSchemaDataType {
    pub valType: OrmSchemaLiteralType,
    pub literals: Option<Vec<BasicType>>,
    pub shape: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmSchemaPredicate {
    pub dataTypes: Vec<OrmSchemaDataType>,
    pub iri: String,
    pub readablePredicate: String,
    /// `-1` for infinity
    pub maxCardinality: i32,
    pub minCardinality: i32,
    pub extra: Option<bool>,
}

#[derive(Clone, Debug)]
pub struct OrmSubscription<'a> {
    pub sender: Sender<AppResponse>,
    pub tracked_objects: HashMap<String, OrmTrackedSubject<'a>>,
}

#[derive(Clone, Debug)]
pub struct OrmTrackedSubject<'a> {
    pub tracked_predicates: HashMap<String, OrmTrackedPredicate<'a>>,
    // Parents and if they are currently tracking us.
    pub parents: HashMap<String, (OrmTrackedSubject<'a>, bool)>,
    pub valid: OrmTrackedSubjectValidity,
    pub subj_iri: &'a String,
    pub shape: &'a OrmSchemaShape,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OrmTrackedSubjectValidity {
    Valid,
    Invalid,
    Unknown,
    Untracked,
}

#[derive(Clone, Debug)]
pub struct OrmTrackedPredicate<'a> {
    pub schema: &'a OrmSchemaPredicate,
    pub tracked_children: Vec<Weak<OrmTrackedSubject<'a>>>,
    pub current_cardinality: i32,
    pub current_literals: Option<Vec<BasicType>>,
}

// Used only for tracking construction of new objects and diffs
// in parallel to modifying the tracked objects and predicates.
pub struct OrmTrackedSubjectChange<'a> {
    pub subject_iri: String,
    pub predicates: HashMap<String, OrmTrackedPredicateChanges<'a>>,
    pub valid: OrmTrackedSubjectValidity,
    pub tracked_subject: &'a OrmTrackedSubject<'a>,
}
pub struct OrmTrackedPredicateChanges<'a> {
    pub tracked_predicate: &'a OrmTrackedPredicate<'a>,
    pub values_added: Vec<BasicType>,
    pub values_removed: Vec<BasicType>,
    pub validity: OrmTrackedSubjectValidity,
}

#[derive(Clone, Debug)]
pub enum Term {
    Str(String),
    Num(f64),
    Bool(bool),
    Ref(String),
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
    pub ref_count: u64,
    pub shape_type: OrmShapeType,
}
