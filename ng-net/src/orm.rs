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

use std::{
    collections::HashMap,
    sync::{Arc, Weak},
};

use serde::{Deserialize, Serialize};

use serde_json::Value;

use crate::app_protocol::{AppResponse, NuriV0};
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

/// A struct for recording the state of subjects and its predicates
/// relevant to its shape.
#[derive(Clone, Debug)]
pub struct OrmTrackedSubject {
    /// The known predicates (only those relevant to the shape).
    /// If there are no triples with a predicate, they are discarded
    pub tracked_predicates: HashMap<String, OrmTrackedPredicate>,
    /// If this is a nested subject, this records the parents
    /// and if they are currently tracking this subject.
    pub parents: HashMap<String, OrmTrackedSubject>,
    /// Validity. When untracked, triple updates are not processed here.
    pub valid: OrmTrackedSubjectValidity,
    pub subject_iri: String,
    /// The shape for which the predicates are tracked.
    pub shape: Arc<OrmSchemaShape>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OrmTrackedSubjectValidity {
    Valid,
    Invalid,
    Pending,
    Untracked,
}

#[derive(Clone, Debug)]
pub struct OrmTrackedPredicate {
    /// The predicate schema
    pub schema: Arc<OrmSchemaPredicate>,
    /// If the schema is a nested object, the children.
    pub tracked_children: Vec<Weak<OrmTrackedSubject>>,
    /// The count of triples for this subject and predicate.
    pub current_cardinality: i32,
    /// If schema is of type literal, the currently present ones.
    pub current_literals: Option<Vec<BasicType>>,
}

// Used only for tracking construction of new objects and diffs
// in parallel to modifying the tracked objects and predicates.
pub struct OrmTrackedSubjectChange<'a> {
    pub subject_iri: String,
    /// Predicates that were changed.
    pub predicates: HashMap<String, OrmTrackedPredicateChanges<'a>>,
}
pub struct OrmTrackedPredicateChanges<'a> {
    /// The tracked predicate for which those changes were recorded.
    pub tracked_predicate: &'a OrmTrackedPredicate,
    pub values_added: Vec<BasicType>,
    pub values_removed: Vec<BasicType>,
}

#[derive(Clone, Debug)]
pub enum Term {
    Str(String),
    Num(f64),
    Bool(bool),
    Ref(String),
}

#[derive(Clone, Debug)]
pub struct OrmSubscription {
    pub shape_type: OrmShapeType,
    pub session_id: u64,
    pub nuri: NuriV0,
    pub sender: Sender<AppResponse>,
    pub tracked_subjects: HashMap<SubjectIri, HashMap<ShapeIri, OrmTrackedSubject>>,
}
type ShapeIri = String;
type SubjectIri = String;

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
