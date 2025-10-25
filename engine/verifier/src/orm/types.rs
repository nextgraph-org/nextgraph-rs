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
    pub parents: HashMap<String, Arc<RwLock<TrackedOrmObject>>>,
    /// Validity. When untracked, triple updates are not processed for this tracked subject.
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
}

pub type ShapeIri = String;
pub type SubjectIri = String;
pub type GraphIri = String;

// Structure to store changes in. By shape iri > subject iri > OrmTrackedSubjectChange
// **NOTE**: In comparison to OrmSubscription.tracked_subjects, the outer hashmap's keys are shape IRIs.
// (shape IRI -> (subject IRI -> OrmTrackedSubjectChange))
pub type OrmChanges = HashMap<ShapeIri, HashMap<SubjectIri, TrackedOrmObjectChange>>;

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
        }
    }

    /// Return a stable graph key bucket for this subscription. For now we scope to the document NURI.
    #[inline]
    pub fn default_graph_key(&self) -> GraphIri {
        // Use the repository/doc nuri as graph bucket
        self.nuri.repo().to_string()
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

    /// Helper to get a specific tracked object by (subject IRI, shape IRI) across any graph.
    pub fn get_tracked_object_any_graph(
        &self,
        subject_iri: &str,
        shape_iri: &str,
    ) -> Option<Arc<RwLock<TrackedOrmObject>>> {
        self.tracked_orm_objects
            .values()
            .filter_map(|subjects| subjects.get(subject_iri))
            .find_map(|shapes| shapes.get(shape_iri).cloned())
    }

    /// Get or create a tracked subject for the given (graph, subject, shape).
    pub fn get_or_create_tracked_subject_with_graph(
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
                    parents: HashMap::new(),
                    valid: TrackedOrmObjectValidity::Pending,
                    subject_iri: subject_iri.to_string(),
                    graph_iri: graph_iri.to_string(),
                    shape: shape.clone(),
                }))
            })
            .clone()
    }

    /// Convenience: use the default graph bucket for this subscription.
    pub fn get_or_create_tracked_subject(
        &mut self,
        subject_iri: &str,
        shape: &Arc<OrmSchemaShape>,
    ) -> Arc<RwLock<TrackedOrmObject>> {
        let graph_key = self.default_graph_key();
        self.get_or_create_tracked_subject_with_graph(&graph_key, subject_iri, shape)
    }

    /// Remove a subject (all of its shapes) across all graphs. Returns true if any removal occurred.
    pub fn remove_subject_everywhere(&mut self, subject_iri: &str) -> bool {
        let mut removed_any = false;
        for (_graph, subjects) in self.tracked_orm_objects.iter_mut() {
            if subjects.remove(subject_iri).is_some() {
                removed_any = true;
            }
        }
        removed_any
    }

    /// Remove a single (subject, shape) across all graphs. Returns true if any removal occurred.
    pub fn remove_subject_shape_any_graph(&mut self, subject_iri: &str, shape_iri: &str) -> bool {
        let mut removed_any = false;
        // First collect which graph buckets end up with empty subject maps to avoid aliasing mutable borrows
        let mut empty_subject_in_graphs: Vec<String> = Vec::new();

        for (graph, subjects) in self.tracked_orm_objects.iter_mut() {
            if let Some(shapes) = subjects.get_mut(subject_iri) {
                if shapes.remove(shape_iri).is_some() {
                    removed_any = true;
                }
                if shapes.is_empty() {
                    empty_subject_in_graphs.push(graph.clone());
                }
            }
        }

        // Now remove the empty subject entries in a separate pass
        for graph in empty_subject_in_graphs {
            if let Some(subj_map) = self.tracked_orm_objects.get_mut(&graph) {
                subj_map.remove(subject_iri);
            }
        }

        removed_any
    }

    /// Collect all currently tracked shapes (may include duplicates)
    pub fn shapes_being_tracked(&self) -> Vec<Arc<OrmSchemaShape>> {
        self.iter_all_objects()
            .map(|obj| obj.read().unwrap().shape.clone())
            .collect()
    }

    /// Cleanup subjects marked for deletion and adjust parent/child relationships accordingly.
    pub fn cleanup_tracked_subjects(&mut self) {
        let tracked_subjects = &mut self.tracked_orm_objects;

        // First pass: Clean up relationships for subjects being deleted
        for (_graph_iri, subjects_for_graph) in tracked_subjects.iter() {
            for (subject_iri, subjects_for_shape) in subjects_for_graph.iter() {
                for (_shape_iri, tracked_subject_lock) in subjects_for_shape.iter() {
                    let tracked_subject = tracked_subject_lock.read().unwrap();

                    // Only process subjects that are marked for deletion
                    if tracked_subject.valid != TrackedOrmObjectValidity::ToDelete {
                        continue;
                    }

                    let has_parents = !tracked_subject.parents.is_empty();

                    // Set all children to `untracked` that don't have other parents
                    for tracked_predicate in tracked_subject.tracked_predicates.values() {
                        let tracked_pred_read = tracked_predicate.read().unwrap();
                        for child in &tracked_pred_read.tracked_children {
                            let mut tracked_child = child.write().unwrap();
                            if tracked_child.parents.is_empty()
                                || (tracked_child.parents.len() == 1
                                    && tracked_child
                                        .parents
                                        .contains_key(&tracked_subject.subject_iri))
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
                        for tracked_pred in tracked_subject.tracked_predicates.values() {
                            let tracked_pred_read = tracked_pred.read().unwrap();
                            for child in &tracked_pred_read.tracked_children {
                                child.write().unwrap().parents.remove(subject_iri);
                            }
                        }
                    }

                    // Also remove this subject from its parents' children lists
                    for (_parent_iri, parent_tracked_subject) in &tracked_subject.parents {
                        let mut parent_ts = parent_tracked_subject.write().unwrap();
                        for tracked_pred in parent_ts.tracked_predicates.values_mut() {
                            let mut tracked_pred_mut = tracked_pred.write().unwrap();
                            tracked_pred_mut
                                .tracked_children
                                .retain(|child| child.read().unwrap().subject_iri != *subject_iri);
                        }
                    }
                }
            }
        }

        // Second pass: Collect subjects to remove (we can't remove while iterating)
        let mut subjects_to_remove: Vec<(String, String, String)> = vec![]; // (graph, subject, shape)

        for (graph_iri, subjects_for_graph) in tracked_subjects.iter() {
            for (subject_iri, subjects_for_shape) in subjects_for_graph.iter() {
                for (shape_iri, tracked_subject) in subjects_for_shape.iter() {
                    let tracked_subject = tracked_subject.read().unwrap();

                    // Only cleanup subjects that are marked for deletion
                    if tracked_subject.valid == TrackedOrmObjectValidity::ToDelete {
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
            if let Some(subjects_map) = tracked_subjects.get_mut(&graph_iri) {
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
