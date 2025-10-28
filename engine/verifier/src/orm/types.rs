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
pub struct TrackedOrmObject {
    /// The known predicates (only those relevant to the shape).
    /// If there are no triples with a predicate, they are discarded
    pub tracked_predicates: HashMap<String, Arc<RwLock<TrackedOrmPredicate>>>,
    /// If this is a nested subject, this records the parents
    /// and if they are currently tracking this subject.
    /// Note: We keep a list of parent tracked objects. Multiple parents
    /// may point to the same child (across different graphs).
    pub parents: Vec<Arc<RwLock<TrackedOrmObject>>>,
    /// Validity. When untracked, triple updates are not processed for this tracked orm object.
    pub valid: TrackedOrmObjectValidity,
    /// Subject IRI
    pub subject_iri: String,
    /// Graph IRI
    pub graph_iri: String,
    /// The shape for which the predicates are tracked.
    pub shape: Arc<OrmSchemaShape>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TrackedOrmObjectValidity {
    Valid,
    Invalid,
    Pending,
    Untracked,
    ToDelete,
}

#[derive(Clone, Debug)]
pub struct TrackedOrmPredicate {
    /// The predicate schema
    pub schema: Arc<OrmSchemaPredicate>,
    /// If the schema is a nested object, the children.
    pub tracked_children: Vec<Arc<RwLock<TrackedOrmObject>>>,
    /// The count of triples for this subject and predicate.
    pub current_cardinality: i32,
    /// If schema is of type literal, the currently present ones.
    pub current_literals: Option<Vec<BasicType>>,
}

// Used only for tracking construction of new objects and diffs
// in parallel to modifying the tracked objects and predicates.
#[derive(Debug)]
pub struct TrackedOrmObjectChange {
    pub tracked_orm_object: Arc<RwLock<TrackedOrmObject>>,
    /// Predicates that were changed.
    pub predicates: HashMap<String, TrackedOrmPredicateChanges>,
    /// If the validation has taken place
    pub is_validated: bool,
    /// The validity before the new validation.
    pub prev_valid: TrackedOrmObjectValidity,
}
#[derive(Debug)]
pub struct TrackedOrmPredicateChanges {
    /// The tracked predicate for which those changes were recorded.
    pub tracked_predicate: Arc<RwLock<TrackedOrmPredicate>>,
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
    // Keep private: always use the helper methods below to access/modify
    tracked_orm_objects:
        HashMap<GraphIri, HashMap<SubjectIri, HashMap<ShapeIri, Arc<RwLock<TrackedOrmObject>>>>>,

    /// Nested objects refer to subject IRIs (the object in a quad). There might be multiple across graphs
    /// This tracks all references, to know if new tracked orm objects need to be created and where to add them to.
    pub referenced_children: HashMap<(SubjectIri, ShapeIri), Vec<Arc<RwLock<TrackedOrmPredicate>>>>,
}

pub type ShapeIri = String;
pub type SubjectIri = String;
pub type GraphIri = String;

// Structure to store changes in. By shape iri > graph iri > subject iri > OrmTrackedSubjectChange
pub type OrmChanges =
    HashMap<ShapeIri, HashMap<GraphIri, HashMap<SubjectIri, TrackedOrmObjectChange>>>;

impl OrmSubscription {
    /// Constructor to create a new subscription with an empty tracked object store.
    pub fn new(
        shape_type: OrmShapeType,
        session_id: u64,
        nuri: NuriV0,
        sender: Sender<AppResponse>,
    ) -> Self {
        Self {
            shape_type,
            session_id,
            nuri,
            sender,
            tracked_orm_objects: HashMap::new(),
            referenced_children: HashMap::new(),
        }
    }

    /// Iterate lazily over all tracked ORM objects across all graphs, subjects, and shapes.
    /// Returns cloned Arcs for convenient usage without lifetime constraints.
    pub fn iter_all_objects(&self) -> impl Iterator<Item = Arc<RwLock<TrackedOrmObject>>> + '_ {
        self.tracked_orm_objects
            .values()
            .flat_map(|subjects| subjects.values())
            .flat_map(|shapes| shapes.values().cloned())
    }

    /// Iterate lazily over all tracked ORM objects that match a given shape IRI.
    /// Yields a tuple of (graph_iri, subject_iri, tracked_object).
    /// The strings and object are cloned to simplify usage and avoid borrow issues.
    pub fn iter_objects_by_shape(
        &self,
        shape_iri: &str,
    ) -> impl Iterator<Item = (GraphIri, SubjectIri, Arc<RwLock<TrackedOrmObject>>)> + '_ {
        // Capture shape_iri by value into a String to avoid tying the iterator to its borrow lifetime
        let shape_iri_owned = shape_iri.to_string();
        self.tracked_orm_objects
            .iter()
            .flat_map(move |(graph, subjects)| {
                let graph_key: String = graph.clone();
                subjects.iter().filter_map({
                    let shape_iri_inner = shape_iri_owned.clone();
                    move |(subject, shapes)| {
                        shapes
                            .get(&shape_iri_inner)
                            .cloned()
                            .map(|obj| (graph_key.clone(), subject.clone(), obj))
                    }
                })
            })
    }

    /// Helper to get a specific tracked object by (graph IRI, subject IRI, shape IRI).
    /// Returns a cloned Arc if present.
    pub fn get_tracked_object(
        &self,
        graph_iri: &str,
        subject_iri: &str,
        shape_iri: &str,
    ) -> Option<Arc<RwLock<TrackedOrmObject>>> {
        self.tracked_orm_objects
            .get(graph_iri)
            .and_then(|subjects| subjects.get(subject_iri))
            .and_then(|shapes| shapes.get(shape_iri))
            .cloned()
    }

    /// Get or create a tracked orm object for the given (graph, subject, shape).
    pub fn get_or_create_tracked_orm_object(
        &mut self,
        graph_iri: &str,
        subject_iri: &str,
        shape: &Arc<OrmSchemaShape>,
    ) -> Arc<RwLock<TrackedOrmObject>> {
        let subjects_map = self
            .tracked_orm_objects
            .entry(graph_iri.to_string())
            .or_insert_with(HashMap::new);

        let shapes_for_subject = subjects_map
            .entry(subject_iri.to_string())
            .or_insert_with(HashMap::new);

        shapes_for_subject
            .entry(shape.iri.clone())
            .or_insert_with(|| {
                Arc::new(RwLock::new(TrackedOrmObject {
                    tracked_predicates: HashMap::new(),
                    parents: Vec::new(),
                    valid: TrackedOrmObjectValidity::Pending,
                    subject_iri: subject_iri.to_string(),
                    graph_iri: graph_iri.to_string(),
                    shape: shape.clone(),
                }))
            })
            .clone()
    }

    /// Remove a single (graph, subject shape) across all graphs. Returns true if any removal occurred.
    pub fn remove_tracked_orm_object(
        &mut self,
        graph_iri: &str,
        subject_iri: &str,
        shape_iri: &str,
    ) -> bool {
        let mut removed_any = false;
        // First collect which graph buckets end up with empty subject maps to avoid aliasing mutable borrows
        let mut empty_subject_in_graphs: Vec<String> = Vec::new();

        let removed = self
            .tracked_orm_objects
            .get_mut(graph_iri)
            .unwrap()
            .get_mut(subject_iri)
            .unwrap()
            .remove(shape_iri);

        // Remove parents map(s), if they are now empty.
        if removed.is_some() {
            if self
                .tracked_orm_objects
                .get_mut(graph_iri)
                .unwrap()
                .get_mut(subject_iri)
                .unwrap()
                .is_empty()
            {
                self.tracked_orm_objects
                    .get_mut(graph_iri)
                    .unwrap()
                    .remove(subject_iri);

                if self
                    .tracked_orm_objects
                    .get_mut(graph_iri)
                    .unwrap()
                    .is_empty()
                {
                    self.tracked_orm_objects.remove(graph_iri);
                }
            }
        }

        removed.is_some()
    }

    /// Collect all currently tracked shapes (may include duplicates)
    pub fn shapes_being_tracked(&self) -> Vec<Arc<OrmSchemaShape>> {
        self.iter_all_objects()
            .map(|obj| obj.read().unwrap().shape.clone())
            .collect()
    }

    /// Cleanup subjects marked for deletion and adjust parent/child relationships accordingly.
    /// TODO: Performance could probably be improved (not iterating all tracked orm objects every time).
    pub fn cleanup_tracked_orm_objects(&mut self) {
        let tracked_orm_objects = &mut self.tracked_orm_objects;

        // First pass: Clean up relationships for subjects being deleted
        for (_graph_iri, subjects_for_graph) in tracked_orm_objects.iter() {
            for (subject_iri, subjects_for_shape) in subjects_for_graph.iter() {
                for (_shape_iri, tracked_orm_object_lock) in subjects_for_shape.iter() {
                    let tracked_orm_object = tracked_orm_object_lock.read().unwrap();

                    // Only process subjects that are marked for deletion
                    if tracked_orm_object.valid != TrackedOrmObjectValidity::ToDelete {
                        continue;
                    }

                    let has_parents = !tracked_orm_object.parents.is_empty();

                    // Set all children to `untracked` that don't have other parents
                    for tracked_predicate in tracked_orm_object.tracked_predicates.values() {
                        let tracked_pred_read = tracked_predicate.read().unwrap();
                        for child in &tracked_pred_read.tracked_children {
                            let mut tracked_child = child.write().unwrap();
                            if tracked_child.parents.is_empty()
                                || (tracked_child.parents.len() == 1 && {
                                    let p = &tracked_child.parents[0];
                                    let p = p.read().unwrap();
                                    p.subject_iri == tracked_orm_object.subject_iri
                                        && p.graph_iri == tracked_orm_object.graph_iri
                                })
                            {
                                if tracked_child.valid != TrackedOrmObjectValidity::ToDelete {
                                    tracked_child.valid = TrackedOrmObjectValidity::Untracked;
                                }
                            }
                        }
                    }

                    // Remove this subject from its children's parent lists
                    // (Only if this is not a root subject - root subjects keep child relationships)
                    if has_parents {
                        for tracked_pred in tracked_orm_object.tracked_predicates.values() {
                            let tracked_pred_read = tracked_pred.read().unwrap();
                            for child in &tracked_pred_read.tracked_children {
                                let mut child_w = child.write().unwrap();
                                child_w.parents.retain(|p| {
                                    let pr = p.read().unwrap();
                                    !(pr.subject_iri == *subject_iri
                                        && pr.graph_iri == tracked_orm_object.graph_iri)
                                });
                            }
                        }
                    }

                    // Also remove this subject from its parents' children lists
                    for parent_tracked_orm_object in &tracked_orm_object.parents {
                        let mut parent_ts = parent_tracked_orm_object.write().unwrap();
                        for tracked_pred in parent_ts.tracked_predicates.values_mut() {
                            let mut tracked_pred_mut = tracked_pred.write().unwrap();
                            tracked_pred_mut.tracked_children.retain(|child| {
                                let cr = child.read().unwrap();
                                !(cr.subject_iri == *subject_iri
                                    && cr.graph_iri == tracked_orm_object.graph_iri)
                            });
                        }
                    }
                }
            }
        }

        // Second pass: Collect subjects to remove (we can't remove while iterating)
        let mut subjects_to_remove: Vec<(String, String, String)> = vec![]; // (graph, subject, shape)

        for (graph_iri, subjects_for_graph) in tracked_orm_objects.iter() {
            for (subject_iri, subjects_for_shape) in subjects_for_graph.iter() {
                for (shape_iri, tracked_orm_object) in subjects_for_shape.iter() {
                    let tracked_orm_object = tracked_orm_object.read().unwrap();

                    // Only cleanup subjects that are marked for deletion
                    if tracked_orm_object.valid == TrackedOrmObjectValidity::ToDelete {
                        subjects_to_remove.push((
                            graph_iri.clone(),
                            subject_iri.clone(),
                            shape_iri.clone(),
                        ));
                    }
                }
            }
        }

        // Third pass: Remove the subjects marked for deletion
        for (graph_iri, subject_iri, shape_iri) in subjects_to_remove {
            if let Some(subjects_map) = tracked_orm_objects.get_mut(&graph_iri) {
                if let Some(shapes_map) = subjects_map.get_mut(&subject_iri) {
                    shapes_map.remove(&shape_iri);

                    // If this was the last shape for this subject, remove the subject entry entirely
                    if shapes_map.is_empty() {
                        subjects_map.remove(&subject_iri);
                    }
                }
            }
        }
    }
}
