// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use std::{collections::HashMap, sync::Arc};

use ng_net::app_protocol::AppResponse;
use ng_net::app_protocol::NuriV0;
use ng_net::{orm::*, utils::Sender};
use ng_repo::types::BranchId;
use std::sync::{RwLock, Weak};

#[derive(Debug)]
pub struct DiscreteOrmSubscription {
    pub nuri: NuriV0,
    pub branch_id: BranchId,
    pub subscription_id: u64,
    pub sender: Sender<AppResponse>,
    pub crdt_details: SubscriptionCrdtDetails,
}

#[derive(Debug)]
pub enum SubscriptionCrdtDetails {
    YRS(yrs::Doc),
    None,
}
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
    pub parents: Vec<Weak<RwLock<TrackedOrmObject>>>,
    /// Validity. When untracked, triple updates are not processed for this tracked orm object.
    pub valid: TrackedOrmObjectValidity,
    /// Subject IRI
    pub subject_iri: String,
    /// Graph IRI
    pub graph_iri: String,
    /// The shape for which the predicates are tracked.
    pub shape: Weak<OrmSchemaShape>,
}

impl TrackedOrmPredicate {
    pub fn add_child(&mut self, child: &Arc<RwLock<TrackedOrmObject>>) {
        let exists = self
            .tracked_children
            .iter()
            .any(|w| w.upgrade().map(|c| Arc::ptr_eq(&c, child)).unwrap_or(false));
        if !exists {
            self.tracked_children.push(Arc::downgrade(child));
        }
        self.tracked_children.retain(|w| w.upgrade().is_some());
    }
    pub fn live_children(&self) -> Vec<Arc<RwLock<TrackedOrmObject>>> {
        self.tracked_children
            .iter()
            .filter_map(|w| w.upgrade())
            .collect()
    }
    pub fn schema_arc(&self) -> Option<Arc<OrmSchemaPredicate>> {
        self.schema.upgrade()
    }
}

impl TrackedOrmObject {
    pub fn add_parent(&mut self, parent: &Arc<RwLock<TrackedOrmObject>>) {
        let exists = self.parents.iter().any(|w| {
            w.upgrade()
                .map(|p| Arc::ptr_eq(&p, parent))
                .unwrap_or(false)
        });
        if !exists {
            self.parents.push(Arc::downgrade(parent));
        }
        self.prune_parents();
    }
    pub fn live_parents(&self) -> Vec<Arc<RwLock<TrackedOrmObject>>> {
        self.parents.iter().filter_map(|w| w.upgrade()).collect()
    }
    pub fn prune_parents(&mut self) {
        self.parents.retain(|w| w.upgrade().is_some());
    }
    pub fn shape_arc(&self) -> Option<Arc<OrmSchemaShape>> {
        self.shape.upgrade()
    }
    pub fn shape_iri(&self) -> Option<String> {
        self.shape.upgrade().map(|s| s.iri.clone())
    }
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
    pub schema: Weak<OrmSchemaPredicate>,
    /// If the schema is a nested object, the children.
    pub tracked_children: Vec<Weak<RwLock<TrackedOrmObject>>>,
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
    pub subscription_id: u64,
    pub graph_scope: Vec<String>,
    pub subject_scope: Vec<String>,
    pub sender: Sender<AppResponse>,
    // Keep private: always use the helper methods below to access/modify
    tracked_orm_objects:
        HashMap<GraphIri, HashMap<SubjectIri, HashMap<ShapeIri, Arc<RwLock<TrackedOrmObject>>>>>,

    /// Nested objects refer to subject IRIs (the object in a quad). There might be multiple across graphs
    /// This tracks all references, to know if new tracked orm objects needs to be created and which
    /// tracked orm objects this affects.
    pub tracked_nested_subjects: HashMap<
        SubjectIri, // The subject being tracked
        HashMap<
            ShapeIri,                           // The shape being tracked.
            Vec<Arc<RwLock<TrackedOrmObject>>>, // The parents tracking them.
        >,
    >,
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
        subscription_id: u64,
        graph_scope: Vec<String>,
        subject_scope: Vec<String>,
        sender: Sender<AppResponse>,
    ) -> Self {
        Self {
            shape_type,
            subscription_id,
            graph_scope,
            subject_scope,
            sender,
            tracked_orm_objects: HashMap::new(),
            tracked_nested_subjects: HashMap::new(),
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

    /// Helper to get a specific tracked orm object by (graph IRI, subject IRI, shape IRI).
    /// Returns a cloned Arc if present.
    pub fn get_tracked_orm_object(
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

    /// Helper to get a specific tracked object (any graph) by subject IRI and shape IRI.
    pub fn get_tracked_objects_any_graph(
        &self,
        subject_iri: &str,
        shape_iri: &str,
    ) -> Vec<Arc<RwLock<TrackedOrmObject>>> {
        let mut ret: Vec<Arc<RwLock<TrackedOrmObject>>> = vec![];
        for (_graph, subjects) in &self.tracked_orm_objects {
            if let Some(shapes) = subjects.get(subject_iri) {
                if let Some(obj) = shapes.get(shape_iri) {
                    ret.push(obj.clone());
                }
            }
        }
        ret
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
                    shape: Arc::downgrade(shape),
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
    pub fn shapes_being_tracked(&self) -> Vec<Weak<OrmSchemaShape>> {
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

                    // Set all children to `untracked` that don't have other parents.
                    // TODO: Actually, they need to be deleted too (unless root).
                    // We should redesign this cleanup.
                    for tracked_predicate in tracked_orm_object.tracked_predicates.values() {
                        let tracked_pred_read = tracked_predicate.read().unwrap();
                        for child_weak in &tracked_pred_read.tracked_children {
                            if let Some(child) = child_weak.upgrade() {
                                let mut tracked_child = child.write().unwrap();
                                if tracked_child.parents.is_empty()
                                    || (tracked_child.parents.len() == 1 && {
                                        if let Some(p) = tracked_child.parents[0].upgrade() {
                                            let p = p.read().unwrap();
                                            p.subject_iri == tracked_orm_object.subject_iri
                                                && p.graph_iri == tracked_orm_object.graph_iri
                                        } else {
                                            false
                                        }
                                    })
                                {
                                    if tracked_child.valid != TrackedOrmObjectValidity::ToDelete {
                                        tracked_child.valid = TrackedOrmObjectValidity::Untracked;
                                    }
                                }
                            }
                        }
                    }

                    // Remove this subject from its children's parent lists
                    // (Only if this is not a root subject - root subjects keep child relationships)
                    if has_parents {
                        for tracked_pred in tracked_orm_object.tracked_predicates.values() {
                            let tracked_pred_read = tracked_pred.read().unwrap();
                            for child_weak in &tracked_pred_read.tracked_children {
                                if let Some(child) = child_weak.upgrade() {
                                    let mut child_w = child.write().unwrap();
                                    child_w.parents.retain(|p| {
                                        if let Some(p_strong) = p.upgrade() {
                                            let pr = p_strong.read().unwrap();
                                            !(pr.subject_iri == *subject_iri
                                                && pr.graph_iri == tracked_orm_object.graph_iri)
                                        } else {
                                            false // Remove dead weak references
                                        }
                                    });
                                }
                            }
                        }
                    }

                    // Also remove this subject from its parents' children lists
                    for parent_weak in &tracked_orm_object.parents {
                        if let Some(parent_tracked_orm_object) = parent_weak.upgrade() {
                            let mut parent_ts = parent_tracked_orm_object.write().unwrap();
                            for tracked_pred in parent_ts.tracked_predicates.values_mut() {
                                let mut tracked_pred_mut = tracked_pred.write().unwrap();
                                tracked_pred_mut.tracked_children.retain(|child_weak| {
                                    if let Some(child) = child_weak.upgrade() {
                                        let cr = child.read().unwrap();
                                        !(cr.subject_iri == *subject_iri
                                            && cr.graph_iri == tracked_orm_object.graph_iri)
                                    } else {
                                        false // Remove dead weak references
                                    }
                                });
                            }
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
