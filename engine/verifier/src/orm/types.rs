// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::{collections::HashMap, sync::Arc};

use ng_net::app_protocol::{AppResponse, NuriV0};
use ng_net::{orm::*, utils::Sender};
use std::sync::RwLock;

/// A struct for recording the state of subjects and its predicates
/// relevant to its shape.
#[derive(Clone, Debug)]
pub struct OrmTrackedSubject {
    /// The known predicates (only those relevant to the shape).
    /// If there are no triples with a predicate, they are discarded
    pub tracked_predicates: HashMap<String, Arc<RwLock<OrmTrackedPredicate>>>,
    /// If this is a nested subject, this records the parents
    /// and if they are currently tracking this subject.
    pub parents: HashMap<String, Arc<RwLock<OrmTrackedSubject>>>,
    /// Validity. When untracked, triple updates are not processed for this tracked subject.
    pub valid: OrmTrackedSubjectValidity,
    /// Previous validity. Used for validation and creating JSON Patch diffs from changes.
    pub prev_valid: OrmTrackedSubjectValidity,
    /// Subject IRI
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
    pub tracked_children: Vec<Arc<RwLock<OrmTrackedSubject>>>,
    /// The count of triples for this subject and predicate.
    pub current_cardinality: i32,
    /// If schema is of type literal, the currently present ones.
    pub current_literals: Option<Vec<BasicType>>,
}

// Used only for tracking construction of new objects and diffs
// in parallel to modifying the tracked objects and predicates.
#[derive(Debug)]
pub struct OrmTrackedSubjectChange {
    pub subject_iri: String,
    /// Predicates that were changed.
    pub predicates: HashMap<String, OrmTrackedPredicateChanges>,
    /// If the new triples have been added to the tracked predicates
    /// (values_added / values_removed) already. This is to prevent
    /// double-application.
    pub data_applied: bool,
}
#[derive(Debug)]
pub struct OrmTrackedPredicateChanges {
    /// The tracked predicate for which those changes were recorded.
    pub tracked_predicate: Arc<RwLock<OrmTrackedPredicate>>,
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

#[derive(Debug)]
pub struct OrmSubscription {
    pub shape_type: OrmShapeType,
    pub session_id: u64,
    pub nuri: NuriV0,
    pub sender: Sender<AppResponse>,
    pub tracked_subjects: HashMap<SubjectIri, HashMap<ShapeIri, Arc<RwLock<OrmTrackedSubject>>>>,
}
pub type ShapeIri = String;
pub type SubjectIri = String;

// Structure to store changes in. By shape iri > subject iri > OrmTrackedSubjectChange
// **NOTE**: In comparison to OrmSubscription.tracked_subjects, the outer hashmap's keys are shape IRIs.
// (shape IRI -> (subject IRI -> OrmTrackedSubjectChange))
pub type OrmChanges = HashMap<ShapeIri, HashMap<SubjectIri, OrmTrackedSubjectChange>>;
