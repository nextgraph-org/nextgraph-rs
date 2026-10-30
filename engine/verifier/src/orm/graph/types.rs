// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use ng_oxigraph::oxrdf::vocab::xsd;
use ng_oxigraph::oxrdf::{Quad, Term};
use ng_repo::log::*;
use std::cmp::{max, Ordering};
use std::collections::HashSet;
use std::{collections::HashMap, sync::Arc};

use ng_net::app_protocol::AppResponse;
use ng_net::{orm::*, utils::Sender};
use ng_repo::errors::NgError;
use std::sync::{RwLock, RwLockReadGuard, Weak};
use wabi_tree::OSBTreeMap;

/// A struct for recording the state of subjects and its predicates
/// relevant to its shape.
#[derive(Clone, Debug)]
pub struct TrackedOrmObject {
    /// The known predicates (only those relevant to the shape).
    /// If there are no triples with a predicate, they are discarded.
    /// The HashMap key is the predicate schema IRI.
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
    /// Whether the tracked predicates hold every quad the store has for this
    /// (graph, subject). Set once a query has loaded the (shape,graph,subject).
    /// Once complete, incoming diffs do not require a fetch for validation.
    pub is_complete: bool,
    /// In case of closed shapes: The count of quads that do not match any predicate in the schema.
    pub excess_quads: u64,
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
    pub fn schema_arc(&self) -> Arc<OrmSchemaPredicate> {
        self.schema.upgrade().unwrap()
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
    pub fn shape(&self) -> Arc<OrmSchemaShape> {
        self.shape.upgrade().unwrap()
    }
    pub fn shape_iri(&self) -> String {
        self.shape.upgrade().unwrap().iri.clone()
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
    /// If schema is of type literal or the tormos are ordered by this predicate, the currently present ones.
    pub current_literals: Option<Vec<Term>>,
}

// Used only for tracking construction of new objects and diffs
// in parallel to modifying the tracked objects and predicates.
#[derive(Debug)]
pub struct TrackedOrmObjectChange {
    pub tracked_orm_object: Arc<RwLock<TrackedOrmObject>>,
    /// Predicates that were changed.
    pub predicates: HashMap<String, TrackedOrmPredicateChanges>,
    /// If the validation has taken place.
    pub is_validated: bool,
    /// The validity before the new validation.
    pub prev_valid: TrackedOrmObjectValidity,
}
#[derive(Debug)]
pub struct TrackedOrmPredicateChanges {
    /// The tracked predicate for which those changes were recorded.
    pub tracked_predicate: Arc<RwLock<TrackedOrmPredicate>>,
    pub values_added: Vec<Term>,
    pub values_removed: Vec<Term>,
}

impl TrackedOrmPredicateChanges {
    pub fn tracked_predicate(&self) -> RwLockReadGuard<'_, TrackedOrmPredicate> {
        return self.tracked_predicate.read().unwrap();
    }
    pub fn first_tormo_for_subj(&self, subject_iri: &str) -> Option<Arc<RwLock<TrackedOrmObject>>> {
        if let Some(child_tormo) = self
            .tracked_predicate()
            .tracked_children
            .iter()
            .find_map(|tc| {
                let tormo = tc.upgrade().unwrap();
                let tormo_read = tormo.read().unwrap();
                if tormo_read.subject_iri == *subject_iri {
                    drop(tormo_read);
                    Some(tormo)
                } else {
                    None
                }
            })
        {
            Some(Arc::clone(&child_tormo))
        } else {
            None
        }
    }
}

#[derive(Debug)]
pub struct OrmSubscriptionOrderInfo {
    /// In case of pagination:
    /// Element 1: The sparql query limit to use.
    /// Expected to be higher than page_size because there might be invalid graph-subjects returned.
    ///
    /// Element 2: lower offset
    /// The offset used for the sparql query of the lowest page.
    ///
    /// Element 3: higher offset
    /// The offset used for the sparql query of the highest page.
    pub limit_lower_upper_offset: Option<(usize, usize, usize)>,

    /// The valid, ordered, actively tracked objects.
    pub tormos: OSBTreeMap<OrderKey, Arc<RwLock<TrackedOrmObject>>>,

    /// Reverse index of `tormos`: the key each root object is currently stored under.
    /// Kept in sync with `tormos` so that a previous key can be looked up directly
    /// instead of being reconstructed from change data.
    pub key_by_gs: HashMap<(GraphIri, SubjectIri), OrderKey>,
}

impl OrmSubscriptionOrderInfo {
    /// Insert a root object under `key`, keeping the reverse index in sync.
    pub fn insert_tormo(&mut self, key: OrderKey, tormo: Arc<RwLock<TrackedOrmObject>>) {
        let gs = {
            let tormo = tormo.read().unwrap();
            (tormo.graph_iri.clone(), tormo.subject_iri.clone())
        };
        self.tormos.insert(key.clone(), tormo);
        self.key_by_gs.insert(gs, key);
    }

    /// Remove the root object stored under `key`, keeping the reverse index in sync.
    pub fn remove_tormo(&mut self, key: &OrderKey) -> Option<Arc<RwLock<TrackedOrmObject>>> {
        let removed = self.tormos.remove(key);
        if let Some(tormo) = removed.as_ref() {
            let tormo = tormo.read().unwrap();
            self.key_by_gs
                .remove(&(tormo.graph_iri.clone(), tormo.subject_iri.clone()));
        }
        removed
    }

    /// Drop the reverse-index entry for a root object that was already removed from `tormos`
    /// (e.g. via `pop_first` / `pop_last`).
    pub fn forget_tormo(&mut self, tormo: &TrackedOrmObject) {
        self.key_by_gs
            .remove(&(tormo.graph_iri.clone(), tormo.subject_iri.clone()));
    }

    /// The key a root object is currently stored under, if it is in the window.
    pub fn key_of(&self, graph_iri: &str, subject_iri: &str) -> Option<&OrderKey> {
        self.key_by_gs
            .get(&(graph_iri.to_string(), subject_iri.to_string()))
    }
}

#[derive(Debug)]
pub struct OrmSubscription {
    pub shape_type: OrmShapeType,
    pub subscription_id: u64,
    pub graph_scope: QueryScope,
    pub subject_scope: Vec<String>,
    pub config: OrmConfig,

    // Ordering mode and its respective metadata.
    pub ordering_info: Option<OrmSubscriptionOrderInfo>,

    pub sender: Sender<AppResponse>,
    // Keep private: always use the helper methods below to access/modify
    tracked_orm_objects:
        HashMap<GraphIri, HashMap<SubjectIri, HashMap<ShapeIri, Arc<RwLock<TrackedOrmObject>>>>>,

    /// Nested objects refer to subject IRIs (the object in a quad). There might be multiple across graphs
    /// This tracks all references, to know if new tracked orm objects needs to be created and which
    /// tracked orm objects this affects.
    /// The predicate IRI records which parent predicate links the subject, so that
    /// children are only attached to the predicate that actually references them
    /// (multiple predicates of one shape may target the same child shape).
    pub tracked_nested_subjects: HashMap<
        SubjectIri, // The subject being tracked
        HashMap<
            ShapeIri,                                      // The shape being tracked.
            Vec<(PredIri, Arc<RwLock<TrackedOrmObject>>)>, // The linking predicates with their parents.
        >,
    >,

    /// Every predicate IRI any shape of the schema mentions. A quad whose predicate is not in
    /// here cannot affect this subscription.
    schema_predicate_iris: HashSet<String>,

    indexed_predicates: HashMap<ShapeIri, HashMap<String, Arc<OrmSchemaPredicate>>>,
}

pub type ShapeIri = String;
pub type SubjectIri = String;
pub type GraphIri = String;
pub type PredIri = String;

/// Which graphs a query looked into, and therefore which graphs its result can speak for.
#[derive(Clone, Debug, PartialEq)]
pub enum QueryScope {
    /// The query was unrestricted and therefore looked into every graph.
    All,
    /// The query only looked into these graphs.
    Graphs(HashSet<GraphIri>),
    /// No query to be made.
    None,
}

impl<I, T> From<I> for QueryScope
where
    I: IntoIterator<Item = T>,
    T: AsRef<str>,
{
    fn from(query_scope: I) -> Self {
        let query_scope: Vec<String> = query_scope
            .into_iter()
            .map(|iri| iri.as_ref().to_owned())
            .collect();

        if query_scope.is_empty() {
            QueryScope::None
        } else if query_scope.iter().any(|iri| iri == "did:ng:i") {
            QueryScope::All
        } else {
            QueryScope::Graphs(query_scope.iter().cloned().collect())
        }
    }
}

impl QueryScope {
    /// Whether a query under this scope has already looked for `graph`. The empty graph is the
    /// placeholder for "graph not known yet"; only an unrestricted query can resolve it, so a
    /// scoped load never counts as having covered it.
    pub(crate) fn covers(&self, graph: &str) -> bool {
        match self {
            QueryScope::All => true,
            QueryScope::Graphs(graphs) => !graph.is_empty() && graphs.contains(graph),
            QueryScope::None => false,
        }
    }

    pub(crate) fn widen_with(&mut self, other: &QueryScope) {
        match (&mut *self, other) {
            (QueryScope::All, _) => {}
            (_, QueryScope::All) => *self = QueryScope::All,
            (QueryScope::Graphs(mine), QueryScope::Graphs(theirs)) => {
                mine.extend(theirs.iter().cloned())
            }
            (_, QueryScope::None) => {}
            (QueryScope::None, other) => *self = other.clone(),
        }
    }
}

/// The subjects a run has already queried, per shape, with the scope each query ran under.
pub(crate) type LoadedSubjects = HashMap<ShapeIri, HashMap<SubjectIri, QueryScope>>;

/// Structure to store changes in. By shape iri > graph iri > subject iri > OrmTrackedSubjectChange
pub type OrmChanges =
    HashMap<ShapeIri, HashMap<GraphIri, HashMap<SubjectIri, TrackedOrmObjectChange>>>;

impl OrmSubscription {
    /// Constructor to create a new subscription with an empty tracked object store.
    ///
    /// Note that as a heuristic, the page_info.limit is multiplied by 1.5 to account for possibly invalid results
    /// from page-order queries.
    ///
    /// SIDE EFFECT: If a where config is given, the shape type schema is modified to reflect the restrictions.
    pub fn new(
        mut shape_type: OrmShapeType,
        subscription_id: u64,
        graph_scope: &[String],
        subject_scope: Vec<String>,
        sender: Sender<AppResponse>,
        config: OrmConfig,
    ) -> Result<Self, NgError> {
        // Validate that shape_type.shape is present in shape_type.schema
        if shape_type.schema.get(&shape_type.shape).is_none() {
            return Err(NgError::OrmError(
                "shape_type.shape must be present in shape_type.schema".into(),
            ));
        }
        // If a where config is given, modify the shape type accordingly.
        if let Some(where_config) = config.where_.as_ref() {
            OrmSubscription::add_where_config_to_shape(
                &mut shape_type.schema,
                &shape_type.shape,
                &shape_type.shape,
                where_config,
            )?;
        }

        let ordering_info: Option<OrmSubscriptionOrderInfo> = if config.order_by.is_some() {
            Some(OrmSubscriptionOrderInfo {
                tormos: OSBTreeMap::new(),
                key_by_gs: HashMap::new(),
                limit_lower_upper_offset: if config.page_size > 0 {
                    Some(((config.page_size as f64 * 1.5) as usize, 0, 0))
                } else {
                    None
                },
            })
        } else {
            None
        };

        let (schema_predicate_iris, indexed_predicates) =
            OrmSubscription::index_shapes(&shape_type);

        Ok(Self {
            schema_predicate_iris,
            shape_type,
            subscription_id,
            graph_scope: QueryScope::from(graph_scope),
            subject_scope,
            sender,
            tracked_orm_objects: HashMap::new(),
            tracked_nested_subjects: HashMap::new(),
            ordering_info,
            config,
            indexed_predicates,
        })
    }

    fn index_shapes(
        shape_type: &OrmShapeType,
    ) -> (
        HashSet<String>,
        HashMap<ShapeIri, HashMap<PredIri, Arc<OrmSchemaPredicate>>>,
    ) {
        let schema_predicate_iris = shape_type
            .schema
            .values()
            .flat_map(|shape| shape.predicates.iter())
            .map(|predicate| predicate.iri.clone())
            .collect();

        let mut indexed_predicates = HashMap::new();
        for shape in shape_type.schema.values().into_iter() {
            let mut index: HashMap<String, Arc<OrmSchemaPredicate>> = HashMap::new();

            for predicate_schema in shape.predicates.iter() {
                index.insert(
                    predicate_schema.iri.to_string(),
                    Arc::clone(predicate_schema),
                );
            }
            indexed_predicates.insert(shape.iri.clone(), index);
        }
        return (schema_predicate_iris, indexed_predicates);
    }
    pub fn indexed_predicates(
        &self,
        shape_iri: &str,
    ) -> &HashMap<PredIri, Arc<OrmSchemaPredicate>> {
        self.indexed_predicates.get(shape_iri).unwrap()
    }

    /// Modifies the schema so that the restrictions from the where config are added.
    /// Works for nested shapes too: Nested shapes are cloned, to prevent collisions.
    fn add_where_config_to_shape(
        schema: &mut OrmSchema,
        source_shape_iri: &String,
        target_shape_iri: &String,
        where_config: &WhereConfig,
    ) -> Result<(), NgError> {
        let Some(where_obj) = where_config.as_object() else {
            return Ok(());
        };

        let source_shape = schema.get(source_shape_iri).cloned().ok_or_else(|| {
            NgError::OrmError(format!(
                "Shape not found in source schema: {}",
                source_shape_iri
            ))
        })?;

        for (readable_pred, where_val) in where_obj {
            let source_pred_schema = source_shape
                .predicates
                .iter()
                .find(|p| p.readablePredicate == *readable_pred)
                .cloned()
                .ok_or(NgError::OrmError(format!(
                    "Schema error: Could not find where config property {} in schema",
                    readable_pred
                )))?;
            if source_pred_schema.dataTypes.is_empty() {
                return Err(NgError::OrmError(format!(
                    "Invalid schema: No dataTypes specified for {readable_pred}."
                )));
            }

            let pred_allows_string = source_pred_schema
                .dataTypes
                .iter()
                .any(|dt| dt.valType == OrmSchemaValType::string);
            let pred_allows_iri = source_pred_schema
                .dataTypes
                .iter()
                .any(|dt| dt.valType == OrmSchemaValType::iri);

            // Normalize to a slice so we can iterate uniformly.
            let where_values = where_val
                .as_array()
                .map(Vec::as_slice)
                .unwrap_or(std::slice::from_ref(where_val));

            // For each where property...
            Self::mutate_target_predicate(
                schema,
                target_shape_iri,
                readable_pred,
                move |target_pred_schema| {
                    // Remove the original data types (to be replaced by more specific).
                    target_pred_schema.dataTypes.drain(..);

                    // We force a min cardinality of 1 so that no values are not interpreted as match.
                    target_pred_schema.minCardinality = max(1, target_pred_schema.minCardinality);

                    // We _always_ allow extra for literals when filtering because we assume that
                    //  additional values might be present too which we don't want to ignore.
                    if !target_pred_schema.is_object() {
                        target_pred_schema.extra = Some(true);
                    }
                },
            )?;

            for val in where_values {
                match val {
                    serde_json::Value::Number(num) => {
                        let numeric_type = find_first_numeric_type(&source_pred_schema.dataTypes);
                        Self::mutate_target_predicate(
                            schema,
                            target_shape_iri,
                            readable_pred,
                            move |target_pred_schema| {
                                target_pred_schema.dataTypes.push(OrmSchemaDataType {
                                    valType: numeric_type,
                                    literals: Some(vec![num.to_string()]),
                                    shape: None,
                                });
                            },
                        )?;
                    }
                    serde_json::Value::Bool(b) => {
                        Self::mutate_target_predicate(
                            schema,
                            target_shape_iri,
                            readable_pred,
                            move |target_pred_schema| {
                                target_pred_schema.dataTypes.push(OrmSchemaDataType {
                                    valType: OrmSchemaValType::boolean,
                                    literals: Some(vec![b.to_string()]),
                                    shape: None,
                                });
                            },
                        )?;
                    }
                    serde_json::Value::String(str_or_iri) => {
                        let str_or_iri = str_or_iri.clone();
                        // Allow that str_or_iri is added as iri _and_ string,
                        // since we can't tell for sure by the value.
                        Self::mutate_target_predicate(
                            schema,
                            target_shape_iri,
                            readable_pred,
                            move |target_pred_schema| {
                                if pred_allows_iri {
                                    if is_iri(&str_or_iri) {
                                        target_pred_schema.dataTypes.push(OrmSchemaDataType {
                                            valType: OrmSchemaValType::iri,
                                            literals: Some(vec![str_or_iri.clone()]),
                                            shape: None,
                                        });
                                    }
                                }
                                if pred_allows_string {
                                    target_pred_schema.dataTypes.push(OrmSchemaDataType {
                                        valType: OrmSchemaValType::string,
                                        literals: Some(vec![str_or_iri]),
                                        shape: None,
                                    });
                                }
                            },
                        )?;
                    }
                    serde_json::Value::Object(_) => {
                        if let Some(source_child_shape_iri) = source_pred_schema
                            .dataTypes
                            .first()
                            .and_then(|dt| dt.shape.clone())
                        {
                            // We have a nested child restriction.
                            // We clone the child shape and rewrite the dataType.shape to point there.
                            // We need to clone since more than one where child could point to the same shape.

                            // Create a new child shape id for the cloned child.
                            let target_pred_iri = schema
                                .get(target_shape_iri)
                                .and_then(|shape| {
                                    shape
                                        .predicates
                                        .iter()
                                        .find(|p| p.readablePredicate == *readable_pred)
                                        .map(|p| p.iri.clone())
                                })
                                .ok_or(NgError::OrmError(format!(
                                    "Predicate schema not found for property {}",
                                    readable_pred
                                )))?;

                            let target_child_shape_iri =
                                format!("{}|||{}", target_shape_iri, target_pred_iri);

                            let source_child_shape =
                                schema.get(&source_child_shape_iri).ok_or_else(|| {
                                    NgError::OrmError(format!(
                                        "Source child shape {} not found in schema.",
                                        source_child_shape_iri
                                    ))
                                })?;
                            let mut target_child_shape = clone_shape(source_child_shape);
                            target_child_shape.iri = target_child_shape_iri.clone();
                            // Add to target schema.
                            schema
                                .entry(target_child_shape_iri.clone())
                                .insert_entry(Arc::new(target_child_shape));

                            // Set new child shape reference
                            let target_child_shape_iri_for_pred = target_child_shape_iri.clone();
                            Self::mutate_target_predicate(
                                schema,
                                target_shape_iri,
                                readable_pred,
                                move |target_pred_schema| {
                                    target_pred_schema.dataTypes = vec![OrmSchemaDataType {
                                        valType: OrmSchemaValType::shape,
                                        literals: None,
                                        shape: Some(target_child_shape_iri_for_pred),
                                    }];
                                },
                            )?;

                            Self::add_where_config_to_shape(
                                schema,
                                &source_child_shape_iri,
                                &target_child_shape_iri,
                                val,
                            )?
                        } else {
                            // A where config object but not of a nested shape. That means it must be something like
                            // greater than / less than.
                            // We don't handle this in the shape but in SPARQL queries.
                            continue;
                        }
                    }
                    _ => {
                        return Err(NgError::OrmError(format!(
                            "Invalid where config value for key {}.",
                            readable_pred
                        )))
                    }
                }
            }
        }

        Ok(())
    }

    fn mutate_target_predicate<F>(
        schema: &mut OrmSchema,
        target_shape_iri: &str,
        readable_pred: &str,
        mutator: F,
    ) -> Result<(), NgError>
    where
        F: FnOnce(&mut OrmSchemaPredicate),
    {
        let target_shape_arc = schema.get(target_shape_iri).cloned().ok_or_else(|| {
            NgError::OrmError(format!(
                "Shape not found in target schema: {}",
                target_shape_iri
            ))
        })?;

        let mut target_shape = clone_shape(&target_shape_arc);
        let pred_idx = target_shape
            .predicates
            .iter()
            .position(|p| p.readablePredicate == readable_pred)
            .ok_or_else(|| {
                NgError::OrmError(format!(
                    "Predicate schema not found for property {}",
                    readable_pred
                ))
            })?;

        let mut target_pred_schema =
            OrmSchemaPredicate::clone(target_shape.predicates[pred_idx].as_ref());
        mutator(&mut target_pred_schema);
        target_shape.predicates[pred_idx] = Arc::new(target_pred_schema);
        schema.insert(target_shape_iri.to_string(), Arc::new(target_shape));

        Ok(())
    }

    pub fn iter_graphs(&self) -> impl Iterator<Item = &GraphIri> + '_ {
        self.tracked_orm_objects.keys()
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

    /// Whether any of the provided quads could affect this subscription,
    /// i.e. whether any of them has a predicate the schema includes.
    pub fn touches_schema(&self, quads: &[Quad]) -> bool {
        quads
            .iter()
            .any(|quad| self.schema_predicate_iris.contains(quad.predicate.as_str()))
    }

    /// Mark every shape's tracked object of this (graph, subject) as holding complete state.
    /// Record that everything the store holds for this (shape, subject) is tracked, in every
    /// graph the query that read it covered. From here on quad diffs alone keep it up to date.
    pub(crate) fn mark_complete_for_shape(
        &self,
        shape_iri: &str,
        subject_iri: &str,
        scope: &QueryScope,
    ) {
        for tormo in self.get_tracked_objects_any_graph(subject_iri, shape_iri) {
            let mut tormo = tormo.write().unwrap();
            if scope.covers(&tormo.graph_iri) {
                tormo.is_complete = true;
            }
        }
    }

    /// The same for everything one query loaded, all of it read under the same scope.
    pub(crate) fn mark_fetched_complete(
        &self,
        loaded: &HashMap<ShapeIri, HashSet<SubjectIri>>,
        scope: &QueryScope,
    ) {
        for (shape_iri, subjects) in loaded.iter() {
            for subject_iri in subjects.iter() {
                self.mark_complete_for_shape(shape_iri, subject_iri, scope);
            }
        }
    }

    /// The same for the loads of a whole run, where each subject carries the scope of the query
    /// that reached it.
    pub(crate) fn mark_loaded_complete(&self, loaded: &LoadedSubjects) {
        for (shape_iri, subjects) in loaded.iter() {
            for (subject_iri, scope) in subjects.iter() {
                self.mark_complete_for_shape(shape_iri, subject_iri, scope);
            }
        }
    }

    pub fn mark_subject_complete(&self, graph_iri: &str, subject_iri: &str) {
        if let Some(shapes) = self
            .tracked_orm_objects
            .get(graph_iri)
            .and_then(|subjects| subjects.get(subject_iri))
        {
            for obj in shapes.values() {
                obj.write().unwrap().is_complete = true;
            }
        }
    }

    /// Helper to get all tracked orm objects (across all shapes) for a given (graph IRI, subject IRI).
    /// Returns cloned Arcs.
    pub fn get_tracked_orm_objects_for_graph_subject(
        &self,
        graph_iri: &str,
        subject_iri: &str,
    ) -> Vec<Arc<RwLock<TrackedOrmObject>>> {
        self.tracked_orm_objects
            .get(graph_iri)
            .and_then(|subjects| subjects.get(subject_iri))
            .map(|shapes| shapes.values().cloned().collect())
            .unwrap_or_default()
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
                    is_complete: false,
                    excess_quads: 0,
                }))
            })
            .clone()
    }

    /// Remove a tracked object by graph, subject, and shape, returning it if present.
    pub fn remove_tracked_orm_object(
        &mut self,
        graph_iri: &str,
        subject_iri: &str,
        shape_iri: &str,
    ) -> Option<Arc<RwLock<TrackedOrmObject>>> {
        let removed = self
            .tracked_orm_objects
            .get_mut(graph_iri)
            .and_then(|subjects| subjects.get_mut(subject_iri))
            .and_then(|shapes| shapes.remove(shape_iri));

        if removed.is_some() {
            if self
                .tracked_orm_objects
                .get(graph_iri)
                .and_then(|subjects| subjects.get(subject_iri))
                .is_some_and(HashMap::is_empty)
            {
                if let Some(subjects) = self.tracked_orm_objects.get_mut(graph_iri) {
                    subjects.remove(subject_iri);
                }

                if self
                    .tracked_orm_objects
                    .get(graph_iri)
                    .is_some_and(HashMap::is_empty)
                {
                    self.tracked_orm_objects.remove(graph_iri);
                }
            }
        }

        removed
    }

    pub fn remove_tracked_orm_object_recurse(
        &mut self,
        graph_iri: &str,
        subject_iri: &str,
        shape_iri: &str,
    ) {
        let Some(removed) = self.remove_tracked_orm_object(graph_iri, subject_iri, shape_iri)
        else {
            return;
        };

        let children: Vec<(PredIri, Arc<RwLock<TrackedOrmObject>>)> = {
            let removed_obj = removed.read().unwrap();
            let mut children = Vec::new();

            for (pred_iri, tracked_pred) in &removed_obj.tracked_predicates {
                children.extend(
                    tracked_pred
                        .read()
                        .unwrap()
                        .live_children()
                        .into_iter()
                        .map(|child| (pred_iri.clone(), child)),
                );
            }

            children
        };

        for (pred_iri, child) in children {
            let (child_subject, child_shape, child_to_remove) = {
                let mut child = child.write().unwrap();
                let mut detached = false;
                child.parents.retain(|parent| {
                    let Some(parent) = parent.upgrade() else {
                        return false;
                    };
                    if Arc::ptr_eq(&parent, &removed) {
                        detached = true;
                        false
                    } else {
                        true
                    }
                });

                let child_subject = child.subject_iri.clone();
                let child_shape = child.shape_iri();
                let child_to_remove = if detached && child.parents.is_empty() {
                    Some((
                        child.graph_iri.clone(),
                        child_subject.clone(),
                        child_shape.clone(),
                    ))
                } else {
                    None
                };

                (child_subject, child_shape, child_to_remove)
            };

            if let Some(parents) = self
                .tracked_nested_subjects
                .get_mut(&child_subject)
                .and_then(|shapes| shapes.get_mut(&child_shape))
            {
                parents.retain(|(tracked_pred, parent)| {
                    tracked_pred != &pred_iri || !Arc::ptr_eq(parent, &removed)
                });
            }

            if let Some((graph_iri, subject_iri, shape_iri)) = child_to_remove {
                self.remove_tracked_orm_object_recurse(&graph_iri, &subject_iri, &shape_iri);
            }
        }
    }

    /// Collect all currently tracked shapes (may include duplicates)
    pub fn shapes_being_tracked(&self) -> Vec<Weak<OrmSchemaShape>> {
        self.iter_all_objects()
            .map(|obj| obj.read().unwrap().shape.clone())
            .collect()
    }

    pub fn root_shape(&self) -> Arc<OrmSchemaShape> {
        self.shape_type
            .schema
            .get(&self.shape_type.shape)
            .expect("shape_type.shape must be present in shape_type.schema.")
            .clone()
    }

    pub fn valid_object_count(&self) -> usize {
        self.tracked_orm_objects
            .values()
            .flat_map(|subjects| subjects.values())
            .flat_map(|shapes| shapes.values())
            .fold(0, |valids, tormo| {
                if tormo.read().unwrap().valid == TrackedOrmObjectValidity::Valid {
                    valids + 1
                } else {
                    valids
                }
            })
    }

    pub fn object_count(&self) -> usize {
        self.tracked_orm_objects
            .values()
            .flat_map(|subjects| subjects.values())
            .flat_map(|shapes| shapes.values())
            .count()
    }

    /// Returns true if at least one object with the given graph and subject is tracked.
    pub fn has_graph_subject(&self, graph_iri: &str, subject_iri: &str) -> bool {
        self.tracked_orm_objects
            .get(graph_iri)
            .and_then(|subject_to_shape| subject_to_shape.get(subject_iri))
            .is_some()
    }

    /// Returns true if there are no tracked ORM objects in this subscription.
    pub fn is_empty(&self) -> bool {
        self.iter_all_objects().next().is_none()
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

    /// The bounds of the currently loaded page window, taken from the first and last tracked root keys.
    ///
    /// Returns `None` when there is no ordering or the window is still empty — in both cases
    /// every quad is considered relevant.
    pub fn get_page_window_bounds(&self) -> Option<PageWindowBounds> {
        let order_by = self.config.order_by.as_ref()?;
        let order_info = self.ordering_info.as_ref()?;
        let first_key = order_info.tormos.first_key_value()?.0;
        let last_key = order_info.tormos.last_key_value()?.0;

        // A key holds one value per resolved term, followed by graph and subject.
        // An unresolved term shifts the components, so per-term bounds are only used when all resolved.
        let aligned = first_key.val_types.len() == order_by.len() + 2
            && last_key.val_types.len() == order_by.len() + 2;

        let mut intermediate_predicates: HashSet<String> = HashSet::new();
        let mut root_predicates: HashSet<String> = HashSet::new();
        let mut leaves: Vec<LeafBounds> = Vec::with_capacity(order_by.len());
        for (index, term) in order_by.iter().enumerate() {
            let Some((leaf, intermediate_hops)) = term.path.split_last() else {
                continue;
            };
            root_predicates.insert(term.path[0].predicate_schema.iri.clone());
            intermediate_predicates.extend(
                intermediate_hops
                    .iter()
                    .map(|hop| hop.predicate_schema.iri.clone()),
            );

            let (first, last) = if aligned {
                (
                    Some(first_key.val_types[index].0.clone()),
                    Some(last_key.val_types[index].0.clone()),
                )
            } else {
                (None, None)
            };
            leaves.push(LeafBounds {
                pred_iri: leaf.predicate_schema.iri.clone(),
                dir: term.direction,
                first,
                last,
            });
        }

        Some(PageWindowBounds {
            intermediate_predicates,
            root_predicates,
            leaves,
        })
    }
}

fn clone_shape(shape: &OrmSchemaShape) -> OrmSchemaShape {
    OrmSchemaShape {
        iri: shape.iri.clone(),
        predicates: shape
            .predicates
            .iter()
            .map(|p| Arc::new(OrmSchemaPredicate::clone(p)))
            .collect(),
        is_closed: shape.is_closed,
    }
}

#[derive(PartialEq, Debug, Clone, Eq)]
pub struct OrderKey {
    pub val_types: Vec<(Term, OrderDirection)>,
}

/// Window bounds of the loaded page, used to decide whether a quad can affect it.
#[derive(PartialEq, Debug, Clone, Eq)]
pub struct PageWindowBounds {
    /// Predicates of intermediate order-by hops. A quad on one relinks a child, so it is always relevant.
    pub intermediate_predicates: HashSet<String>,
    /// First-hop predicates of all order-by terms. Only quads on these have a root subject.
    pub root_predicates: HashSet<String>,
    /// One entry per order-by term.
    pub leaves: Vec<LeafBounds>,
}

/// Bounds of the leaf value of one order-by term.
#[derive(PartialEq, Debug, Clone, Eq)]
pub struct LeafBounds {
    pub pred_iri: String,
    pub dir: OrderDirection,
    /// `None` if the window keys do not line up with the order-by terms; every value is then in range.
    pub first: Option<Term>,
    pub last: Option<Term>,
}

impl PageWindowBounds {
    /// Whether a quad could affect the loaded page window.
    pub fn is_relevant(&self, quad: &Quad) -> bool {
        let pred = quad.predicate.as_str();
        if self.intermediate_predicates.contains(pred) {
            return true;
        }
        self.leaves
            .iter()
            .any(|leaf| leaf.pred_iri == pred && leaf.contains(&quad.object))
    }
}

impl PageWindowBounds {
    /// Whether a quad's subject is a root, so its g-s can be fetched as a root.
    pub fn is_root_quad(&self, quad: &Quad) -> bool {
        self.root_predicates.contains(quad.predicate.as_str())
    }
}

impl LeafBounds {
    /// Whether a value lies between the first and the last loaded value, inclusive.
    fn contains(&self, value: &Term) -> bool {
        let (Some(first), Some(last)) = (self.first.as_ref(), self.last.as_ref()) else {
            return true;
        };
        let (lower, upper) = match self.dir {
            OrderDirection::Ascending => (first, last),
            OrderDirection::Descending => (last, first),
        };
        matches!(term_cmp(lower, value), Some(Ordering::Less | Ordering::Equal))
            && matches!(term_cmp(value, upper), Some(Ordering::Less | Ordering::Equal))
    }
}

/// Iterate over all items in val_types.
/// Take OrderDirection into consideration (reverses greater / less comparisons).
/// If lengths mismatch but previous values do, the longer one is considered greater.
fn order_key_partial_cmp(first: &OrderKey, other: &OrderKey) -> Option<std::cmp::Ordering> {
    for i in 0..usize::max(first.val_types.len(), other.val_types.len()) {
        let self_current_val_op: Option<&(Term, OrderDirection)> = first.val_types.get(i);
        let other_current_val_op = other.val_types.get(i);

        if let Some(self_current_val) = self_current_val_op {
            if let Some(other_current_val) = other_current_val_op {
                let direction = self_current_val.1.clone();
                if direction != other_current_val.1 {
                    // Conflicting order directions. Not comparable.
                    return None;
                }

                let cmp_res_op = term_cmp(&self_current_val.0, &other_current_val.0);
                if let Some(cmp_res) = cmp_res_op {
                    if cmp_res == Ordering::Equal {
                        // This position is equal, check secondary/next order-by values.
                        continue;
                    } else if direction == OrderDirection::Ascending {
                        return Some(cmp_res);
                    } else {
                        // direction == OrderDirection::Descending
                        if cmp_res == Ordering::Greater {
                            return Some(Ordering::Less);
                        } else {
                            return Some(Ordering::Greater);
                        }
                    }
                } else {
                    // Compared values were of different type.
                    return None;
                }
            } else {
                // Self is longer thus greater.
                return Some(std::cmp::Ordering::Greater);
            }
        } else {
            // other_current_val_op.is_some()
            // Self is shorter thus less.
            return Some(std::cmp::Ordering::Less);
        }
    }

    Some(Ordering::Equal)
}
impl PartialOrd for OrderKey {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        order_key_partial_cmp(self, other)
    }
}
impl Ord for OrderKey {
    fn cmp(&self, other: &Self) -> Ordering {
        if let Some(res) = order_key_partial_cmp(self, other) {
            res
        } else {
            log_err!(
                "Compared two incomparable values:\nself: {:?}\nother: {:?}",
                self,
                other
            );
            panic!("Compared two incomparable values. Either the OrderDirection mismatched in one position of the array or two non-comparable `BasicType`s were compared.")
        }
    }
}

/// Compares two Term objects.
/// If both types are numeric, they are parsed to f64 and compared.
/// If both are named nodes, they are compared by their string value.
/// If both are literals with the same datatype, they are compared by their string value.
/// `None` otherwise.
pub(crate) fn term_cmp(left: &Term, right: &Term) -> Option<Ordering> {
    match (left, right) {
        (Term::NamedNode(left_node), Term::NamedNode(right_node)) => {
            Some(left_node.cmp(right_node))
        }
        (Term::Literal(left_lit), Term::Literal(right_lit)) => {
            let left_dt = left_lit.datatype().as_str();
            let right_dt = right_lit.datatype().as_str();

            // Covers string, boolean, date, etc.
            // Some might not be comparable but we don't use / endorse those RDF types in the ORM.
            if left_dt == right_dt && !is_numeric(left_dt) {
                return Some(left_lit.value().cmp(right_lit.value()));
            }

            if is_numeric(left_dt) && is_numeric(right_dt) {
                return left_lit.value().parse::<f64>().ok().and_then(|left_value| {
                    right_lit
                        .value()
                        .parse::<f64>()
                        .ok()
                        .and_then(|right_value| left_value.partial_cmp(&right_value))
                });
            }

            None
        }
        _ => None,
    }
}

pub(crate) fn is_numeric(datatype: &str) -> bool {
    is_whole_num(datatype)
        || datatype == xsd::DECIMAL.as_str()
        || datatype == xsd::DOUBLE.as_str()
        || datatype == xsd::FLOAT.as_str()
}

#[inline]
pub(crate) fn is_whole_num(datatype: &str) -> bool {
    datatype == xsd::BYTE.as_str()
        || datatype == xsd::INT.as_str()
        || datatype == xsd::INTEGER.as_str()
        || datatype == xsd::LONG.as_str()
        || datatype == xsd::NEGATIVE_INTEGER.as_str()
        || datatype == xsd::NON_NEGATIVE_INTEGER.as_str()
        || datatype == xsd::NON_POSITIVE_INTEGER.as_str()
        || datatype == xsd::SHORT.as_str()
        || datatype == xsd::POSITIVE_INTEGER.as_str()
        || datatype == xsd::UNSIGNED_BYTE.as_str()
        || datatype == xsd::UNSIGNED_INT.as_str()
        || datatype == xsd::UNSIGNED_LONG.as_str()
        || datatype == xsd::UNSIGNED_SHORT.as_str()
}

pub(crate) fn find_first_numeric_type_opt(types: &[OrmSchemaDataType]) -> Option<OrmSchemaValType> {
    types
        .iter()
        .find(|t| t.valType.is_numeric())
        .map(|t| t.valType.clone())
}

pub(crate) fn find_first_numeric_type(types: &[OrmSchemaDataType]) -> OrmSchemaValType {
    find_first_numeric_type_opt(types).unwrap_or_else(|| {
        log_err!("Invalid `where` value: Expected the value to be numeric. Defaulting to decimal. Types: {:?}", types);
        OrmSchemaValType::decimal
    })
}

/// Check for term equality (object and type) with (val and val_type as string)
/// Does not distinguish between numeric types if val_type == OrmSchemaValType::number.
/// Assumes that numeric values are canonicalized as string comparison is used.
pub(crate) fn term_equals_val_type(term: &Term, val_type: &OrmSchemaValType, val: &str) -> bool {
    match term {
        Term::NamedNode(node) => *val_type == OrmSchemaValType::iri && *node.as_str() == *val,
        Term::Literal(lit) => {
            // Data types equal?
            if lit.datatype().as_str() != val_type.as_str() {
                // Data types unequal but one is the deprecated, generic number, the other numeric too.
                if *val_type == OrmSchemaValType::number && is_numeric(lit.datatype().as_str()) {
                    // We try to parse numbers in case their serialization happened to be different.
                    if val_type.is_numeric() && is_numeric(lit.datatype().as_str()) {
                        let term_val = str::parse::<f64>(lit.value());
                        let lit_val = str::parse::<f64>(val);
                        return term_val.is_ok() && term_val == lit_val;
                    }
                } else {
                    // Data type mismatch
                    return false;
                }
            }

            // Values are equal?
            if lit.value() == val {
                return true;
            }

            false
        }
        _ => unreachable!(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ng_oxigraph::oxrdf::{Literal, NamedNode, Subject};

    const PRED: &str = "urn:sortBy";

    fn quad_with(predicate: &str, value: i64) -> Quad {
        Quad {
            subject: Subject::NamedNode(NamedNode::new_unchecked("urn:s")),
            predicate: NamedNode::new_unchecked(predicate),
            object: Term::Literal(Literal::new_typed_literal(
                value.to_string(),
                NamedNode::new_unchecked(xsd::INTEGER.as_str()),
            )),
            graph_name: ng_oxigraph::oxrdf::GraphName::NamedNode(NamedNode::new_unchecked("urn:g")),
        }
    }

    fn int(value: i64) -> Term {
        Term::Literal(Literal::new_typed_literal(
            value.to_string(),
            NamedNode::new_unchecked(xsd::INTEGER.as_str()),
        ))
    }

    fn leaf_bounds(dir: OrderDirection, first: i64, last: i64) -> PageWindowBounds {
        PageWindowBounds {
            intermediate_predicates: HashSet::new(),
            root_predicates: HashSet::from([PRED.to_string()]),
            leaves: vec![LeafBounds {
                pred_iri: PRED.to_string(),
                dir,
                first: Some(int(first)),
                last: Some(int(last)),
            }],
        }
    }

    #[test]
    fn leaf_bounds_ascending_window() {
        let bounds = leaf_bounds(OrderDirection::Ascending, 10, 20);
        // Inside, including both bounds.
        assert!(bounds.is_relevant(&quad_with(PRED, 10)));
        assert!(bounds.is_relevant(&quad_with(PRED, 15)));
        assert!(bounds.is_relevant(&quad_with(PRED, 20)));
        // Outside.
        assert!(!bounds.is_relevant(&quad_with(PRED, 9)));
        assert!(!bounds.is_relevant(&quad_with(PRED, 21)));
    }

    #[test]
    fn leaf_bounds_descending_window() {
        // Descending: the first loaded item is the largest.
        let bounds = leaf_bounds(OrderDirection::Descending, 20, 10);
        assert!(bounds.is_relevant(&quad_with(PRED, 20)));
        assert!(bounds.is_relevant(&quad_with(PRED, 15)));
        assert!(bounds.is_relevant(&quad_with(PRED, 10)));
        assert!(!bounds.is_relevant(&quad_with(PRED, 21)));
        assert!(!bounds.is_relevant(&quad_with(PRED, 9)));
    }

    #[test]
    fn leaf_bounds_ignore_other_predicates() {
        let bounds = leaf_bounds(OrderDirection::Ascending, 10, 20);
        assert!(!bounds.is_relevant(&quad_with("urn:other", 15)));
    }

    #[test]
    fn intermediate_predicates_are_always_relevant() {
        let bounds = PageWindowBounds {
            intermediate_predicates: HashSet::from([PRED.to_string()]),
            root_predicates: HashSet::new(),
            leaves: Vec::new(),
        };
        assert!(bounds.is_relevant(&quad_with(PRED, 0)));
        assert!(bounds.is_relevant(&quad_with(PRED, 999)));
        assert!(!bounds.is_relevant(&quad_with("urn:other", 5)));
    }

    #[test]
    fn root_quad_check_uses_root_predicates_only() {
        let bounds = leaf_bounds(OrderDirection::Ascending, 10, 20);
        assert!(bounds.is_root_quad(&quad_with(PRED, 15)));
        assert!(!bounds.is_root_quad(&quad_with("urn:other", 15)));
    }

    #[test]
    fn unresolved_leaf_bounds_accept_any_value() {
        let bounds = PageWindowBounds {
            intermediate_predicates: HashSet::new(),
            root_predicates: HashSet::new(),
            leaves: vec![LeafBounds {
                pred_iri: PRED.to_string(),
                dir: OrderDirection::Ascending,
                first: None,
                last: None,
            }],
        };
        assert!(bounds.is_relevant(&quad_with(PRED, 999)));
    }
}
