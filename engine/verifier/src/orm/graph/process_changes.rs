// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use std::collections::HashMap;
use std::collections::HashSet;
use std::sync::Arc;
use std::sync::RwLock;

use ng_net::orm::*;
pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_oxigraph::oxrdf::Quad;
use ng_repo::errors::NgError;
use ng_repo::log::*;

use crate::orm::graph::add_remove_quads::{apply_quads_for_subject, oxrdf_term_to_orm_basic_type};
use crate::orm::graph::shape_validation::NeedEvalSelf;
use crate::orm::graph::types::*;
use crate::orm::graph::utils::*;
use crate::verifier::*;

/// Which graphs a subject appears in for the given quads.
/// Built once per run for fast lookup.
type GraphsBySubject = HashMap<SubjectIri, Vec<GraphIri>>;

fn index_graphs_by_subject(
    quads_by_graph_and_subject: &HashMap<GraphSubjectKey, Vec<Quad>>,
) -> GraphsBySubject {
    let mut index: GraphsBySubject = HashMap::new();
    for (graph_iri, subject_iri) in quads_by_graph_and_subject.keys() {
        index
            .entry(subject_iri.clone())
            .or_insert_with(Vec::new)
            .push(graph_iri.clone());
    }
    for graphs in index.values_mut() {
        graphs.sort();
        graphs.dedup();
    }
    index
}

type ShapeGraphSubjectKey = (ShapeIri, GraphIri, SubjectIri);

/// The quads of one (graph, subject) that one shape has not applied yet.
#[derive(Default)]
struct PendingQuads {
    added: Vec<Quad>,
    removed: Vec<Quad>,
}

impl PendingQuads {
    fn is_empty(&self) -> bool {
        self.added.is_empty() && self.removed.is_empty()
    }
}

/// Everything one `process_changes_for_subscription` call mutates while it walks its stack.
struct ProcessRun {
    added: HashMap<GraphSubjectKey, Vec<Quad>>,
    removed: HashMap<GraphSubjectKey, Vec<Quad>>,
    added_graphs: GraphsBySubject,
    removed_graphs: GraphsBySubject,
    loaded: LoadedSubjects,
    /// (graph, subject) pairs this update introduced: nothing was tracked for them before.
    /// `load_introduced_subjects` reads them from the store, so from then on the run holds
    /// their entire state and no further query can add to it.
    introduced_by_diff: HashSet<GraphSubjectKey>,
    /// Quads still to be applied, per (graph, subject, shape).
    are_quads_taken: HashSet<(GraphIri, SubjectIri, ShapeIri)>,
    /// LIFO stack of what still has to be validated (nested objects first).
    stack: Vec<(Arc<OrmSchemaShape>, Vec<(GraphIri, SubjectIri)>)>,
}

impl ProcessRun {
    fn new(
        orm_subscription: &OrmSubscription,
        quads_added: &[Quad],
        quads_removed: &[Quad],
    ) -> Self {
        let added = group_by_graph_and_subject(quads_added);
        let removed = group_by_graph_and_subject(quads_removed);
        let added_graphs = index_graphs_by_subject(&added);
        let removed_graphs = index_graphs_by_subject(&removed);

        let modified_gs: HashSet<GraphSubjectKey> = added
            .keys()
            .cloned()
            .chain(removed.keys().cloned())
            .collect();

        // If an object is not being tracked as root object, we consider it to be new and it needs fetching.
        let introduced_by_diff = modified_gs
            .iter()
            .filter(|(graph_iri, subject_iri)| {
                orm_subscription
                    .get_tracked_orm_object(
                        graph_iri,
                        subject_iri,
                        &orm_subscription.shape_type.shape,
                    )
                    .is_none()
            })
            .cloned()
            .collect();

        let stack = Self::init_validation_stack(orm_subscription, &modified_gs);

        ProcessRun {
            added,
            removed,
            added_graphs,
            removed_graphs,
            loaded: HashMap::new(),
            introduced_by_diff,
            are_quads_taken: HashSet::new(),
            stack,
        }
    }

    /// Groups modified (graph, subject) pairs by their associated shapes for validation.
    /// Used to initialize the validation stack in `process_changes_for_shape_and_session`.
    /// Returns a vector of (shape, (graph, subject)[]) pairs to process.
    fn init_validation_stack(
        orm_subscription: &OrmSubscription,
        modified_gs: &HashSet<GraphSubjectKey>,
    ) -> Vec<(
        Arc<OrmSchemaShape>, // The shape to validate against
        Vec<(GraphIri, SubjectIri)>,
    )> {
        // Collect all (graph, subject) pairs that are both in modified_gs and tracked_nested_subjects.
        let mut shape_to_gs: HashMap<ShapeIri, Vec<(String, String)>> = HashMap::new();

        // For each modified (graph, subject), check whether that subject is tracked as a nested
        // one.
        for (graph_iri, subject_iri) in modified_gs.iter() {
            let Some(shape_map) = orm_subscription.tracked_nested_subjects.get(subject_iri) else {
                continue;
            };

            // For each shape in the tracked_nested_subjects entry, schedule this pair.
            for shape_iri in shape_map.keys() {
                // Get the shape Arc from the schema
                if let Some(shape_arc) = orm_subscription.shape_type.schema.get(shape_iri) {
                    shape_to_gs
                        .entry(shape_arc.iri.clone())
                        .or_insert_with(Vec::new)
                        .push((graph_iri.clone(), subject_iri.clone()));
                }
            }
        }

        // Always add the root shape with all modified_gs
        let root_shape_arc = orm_subscription
            .shape_type
            .schema
            .get(&orm_subscription.shape_type.shape)
            .unwrap()
            .clone();
        let root_gs: Vec<(String, String)> = modified_gs.iter().cloned().collect();

        // Remove root shape from the map if present, so we can add it last.
        let mut root_gs_from_map = shape_to_gs
            .remove(&orm_subscription.shape_type.shape)
            .unwrap_or_default();

        // Merge root_gs into root_gs_from_map, dedup.
        root_gs_from_map.extend(root_gs);
        let mut seen = HashSet::new();
        root_gs_from_map.retain(|pair| seen.insert(pair.clone()));

        // Collect all shapes except root, then add root last.
        let mut init = Vec::new();
        for (shape_iri, gs_vec) in shape_to_gs.into_iter() {
            // Deduplicate.
            let mut seen = HashSet::new();
            let mut deduped = Vec::new();
            for pair in gs_vec {
                if seen.insert(pair.clone()) {
                    deduped.push(pair);
                }
            }
            if !deduped.is_empty() {
                init.push((
                    orm_subscription
                        .shape_type
                        .schema
                        .get(&shape_iri)
                        .unwrap()
                        .clone(),
                    deduped,
                ));
            }
        }
        if !root_gs_from_map.is_empty() {
            init.push((root_shape_arc, root_gs_from_map));
        }

        init
    }

    /// Get add/remove quads for a (shape, graph, subject) if `take_pending` wasn't called before.
    /// Otherwise empty.
    fn take_pending(&mut self, gs: &GraphSubjectKey, shape_iri: &str) -> PendingQuads {
        let is_new =
            self.are_quads_taken
                .insert((gs.0.clone(), gs.1.clone(), shape_iri.to_string()));

        if is_new {
            PendingQuads {
                added: self.added.get(gs).cloned().unwrap_or_default(),
                removed: self.removed.get(gs).cloned().unwrap_or_default(),
            }
        } else {
            PendingQuads::default()
        }
    }

    /// Update which (graph, subject, shape) are loaded.
    fn mark_loaded(&mut self, loaded: &HashMap<ShapeIri, HashSet<SubjectIri>>, scope: &QueryScope) {
        for (shape_iri, subjects) in loaded.iter() {
            let per_shape = self
                .loaded
                .entry(shape_iri.clone())
                .or_insert_with(HashMap::new);
            for subject_iri in subjects.iter() {
                per_shape
                    .entry(subject_iri.clone())
                    .and_modify(|known| known.widen_with(scope))
                    .or_insert_with(|| scope.clone());
            }
        }
    }

    /// Merge the quads a load returned into this run and
    /// report which (graph, subject) pairs it contained.
    fn merge_loaded_quads(&mut self, quads: Vec<Quad>) -> HashSet<GraphSubjectKey> {
        let mut touched: HashSet<GraphSubjectKey> = HashSet::new();
        // What each touched (graph, subject) already holds.
        let mut present: HashMap<GraphSubjectKey, HashSet<Quad>> = HashMap::new();
        for quad in quads.into_iter() {
            let gs = (
                graph_iri_of_quad(&quad).to_string(),
                subject_iri_of_quad(&quad).to_string(),
            );
            if !present.contains_key(&gs) {
                let existing: HashSet<Quad> = self
                    .added
                    .get(&gs)
                    .map(|quads| quads.iter().cloned().collect())
                    .unwrap_or_default();
                present.insert(gs.clone(), existing);
            }
            if present.get_mut(&gs).unwrap().insert(quad.clone()) {
                self.added
                    .entry(gs.clone())
                    .or_insert_with(Vec::new)
                    .push(quad);

                let graphs = self
                    .added_graphs
                    .entry(gs.1.clone())
                    .or_insert_with(Vec::new);
                if let Err(position) = graphs.binary_search(&gs.0) {
                    graphs.insert(position, gs.0.clone());
                }
            }
            touched.insert(gs);
        }
        touched
    }

    /// Whether a query in this run already looked for this subject in this graph.
    fn already_looked_for(&self, shape_iri: &str, subject_iri: &str, graph_iri: &str) -> bool {
        self.loaded
            .get(shape_iri)
            .and_then(|subjects| subjects.get(subject_iri))
            .map(|scope| scope.covers(graph_iri))
            .unwrap_or(false)
    }

    /// Whether a queued (graph, subject) still has to be loaded
    /// before this shape can validate it.
    fn needs_loading(
        &self,
        orm_subscription: &OrmSubscription,
        shape_iri: &str,
        graph_iri: &String,
        subject_iri: &String,
    ) -> bool {
        // 1) A query for this shape already looked here during this run.
        if self.already_looked_for(shape_iri, subject_iri, graph_iri) {
            return false;
        }
        // 2) The pair was introduced by this update and read in full when it arrived.
        if self
            .introduced_by_diff
            .contains(&(graph_iri.clone(), subject_iri.clone()))
        {
            return false;
        }
        // 3) An existing tormo is marked complete.
        orm_subscription
            .get_tracked_orm_object(graph_iri, subject_iri, shape_iri)
            .map(|tormo| !tormo.read().unwrap().is_complete)
            .unwrap_or(true)
    }
}

impl Verifier {
    /// Link a tracked orm object to all orm objects that reference this object's subject IRI.
    /// This establishes parent-child relationships based on tracked_nested_subjects.
    fn link_to_tracking_parents(
        orm_subscription: &mut OrmSubscription,
        orm_changes: &mut OrmChanges,
        child_arc: &Arc<RwLock<TrackedOrmObject>>,
    ) {
        let (child_graph_iri, child_subject_iri, child_shape_iri) = {
            let r = child_arc.read().unwrap();
            (
                r.graph_iri.clone(),
                r.subject_iri.clone(),
                r.shape.upgrade().unwrap().iri.clone(),
            )
        };

        // Check if this subject is in tracked_nested_subjects
        if let Some(tracking_subject) = orm_subscription
            .tracked_nested_subjects
            .get(&child_subject_iri)
        {
            if let Some(tracking_tormos) = tracking_subject.get(&child_shape_iri) {
                // Clone parent arcs to avoid borrowing orm_subscription during mutation
                let parents: Vec<(PredIri, Arc<RwLock<TrackedOrmObject>>)> =
                    tracking_tormos.clone();
                for (linking_pred_iri, parent_arc) in parents.iter() {
                    // Snapshot parent identifiers and shape
                    let (parent_graph_iri, parent_subject_iri, parent_shape_weak) = {
                        let parent_r = parent_arc.read().unwrap();
                        (
                            parent_r.graph_iri.clone(),
                            parent_r.subject_iri.clone(),
                            parent_r.shape.clone(),
                        )
                    };

                    // Ensure a change exists for the parent (to hold predicate changes)
                    let (parent_change, _parent_change_new) = Self::ensure_change_for_subject(
                        orm_subscription,
                        orm_changes,
                        &parent_shape_weak.upgrade().unwrap(),
                        &parent_graph_iri,
                        &parent_subject_iri,
                    );

                    // Only link under the predicate that actually references this child.
                    // (Other predicates of the parent shape may target the same child shape
                    // but not reference this subject.)
                    for pred_schema in parent_shape_weak.upgrade().unwrap().predicates.iter() {
                        if pred_schema.iri != *linking_pred_iri {
                            continue;
                        }
                        let targets_child_shape = pred_schema.dataTypes.iter().any(|dt| {
                            if let Some(ref pred_child_shape_iri) = dt.shape {
                                *pred_child_shape_iri == child_shape_iri
                            } else {
                                false
                            }
                        });
                        if !targets_child_shape {
                            continue;
                        }

                        // Ensure the parent's tracked_predicate exists for this predicate
                        let pred_iri = pred_schema.iri.clone();
                        let parent_obj_arc = parent_change.tracked_orm_object.clone();
                        let tracked_pred_arc = {
                            let mut parent_w = parent_obj_arc.write().unwrap();
                            if let Some(tp_arc) =
                                parent_w.tracked_predicates.get(&pred_iri).cloned()
                            {
                                tp_arc
                            } else {
                                let tp_arc = Arc::new(RwLock::new(TrackedOrmPredicate {
                                    schema: Arc::downgrade(pred_schema),
                                    tracked_children: Vec::new(),
                                    current_cardinality: 0,
                                    current_literals: None,
                                }));
                                parent_w
                                    .tracked_predicates
                                    .insert(pred_iri.clone(), tp_arc.clone());
                                tp_arc
                            }
                        };

                        // Ensure a TrackedOrmPredicateChanges exists in the parent's change for this predicate
                        if !parent_change.predicates.contains_key(&pred_iri) {
                            parent_change.predicates.insert(
                                pred_iri.clone(),
                                TrackedOrmPredicateChanges {
                                    tracked_predicate: tracked_pred_arc.clone(),
                                    values_added: Vec::new(),
                                    values_removed: Vec::new(),
                                },
                            );
                        }
                        let pred_change = parent_change.predicates.get_mut(&pred_iri).unwrap();

                        // Finally, perform the bidirectional link

                        let linked_new = Self::link_parent_and_child(
                            parent_arc,
                            child_arc,
                            pred_change,
                            &child_graph_iri,
                            &child_subject_iri,
                            &child_shape_iri,
                        );
                        // If a new link was established, ensure the parent will be revalidated
                        if linked_new {
                            parent_change.is_validated = false;
                        }
                    }
                }
            }
        }
    }

    /// Link a parent and child tracked orm object bidirectionally.
    /// Adds child to parent's tracked_children if not already present.
    /// Adds parent to child's parents if not already present.
    /// Returns true if a new link was created (either side), false if it already existed.
    fn link_parent_and_child(
        parent_arc: &Arc<RwLock<TrackedOrmObject>>,
        child_arc: &Arc<RwLock<TrackedOrmObject>>,
        pred_change: &mut TrackedOrmPredicateChanges,
        child_graph: &str,
        child_subject: &str,
        target_shape_iri: &str,
    ) -> bool {
        let (parent_graph, parent_subject) = {
            let parent_r = parent_arc.read().unwrap();
            (parent_r.graph_iri.clone(), parent_r.subject_iri.clone())
        };

        let mut linked_new = false;

        // Add child to parent's tracked_children
        {
            let mut tp = pred_change.tracked_predicate.write().unwrap();
            let already = tp.tracked_children.iter().any(|c| {
                let tc_arc = c.upgrade().unwrap();
                let tc = tc_arc.read().unwrap();
                tc.subject_iri == child_subject
                    && tc.graph_iri == child_graph
                    && tc.shape.upgrade().unwrap().iri == target_shape_iri
            });
            if !already {
                tp.tracked_children.push(Arc::downgrade(child_arc));
                linked_new = true;
            }
        }

        // Ensure back-link in child.parents
        {
            let mut child_w = child_arc.write().unwrap();
            let has_parent = child_w.parents.iter().any(|p| {
                let tc_arc = p.upgrade().unwrap();
                let tc = tc_arc.read().unwrap();
                tc.subject_iri == parent_subject && tc.graph_iri == parent_graph
            });
            if !has_parent {
                child_w.parents.push(Arc::downgrade(parent_arc));
                linked_new = true;
            }
        }

        linked_new
    }

    /// Ensures a change object exists for (shape, graph, subject) and returns a mutable reference to it.
    #[inline]
    fn ensure_change_for_subject<'a>(
        orm_subscription: &mut OrmSubscription,
        orm_changes: &'a mut OrmChanges,
        shape: &Arc<OrmSchemaShape>,
        graph_iri: &str,
        subject_iri: &str,
    ) -> (&'a mut TrackedOrmObjectChange, bool) {
        let mut change_newly_created = false;

        let change = orm_changes
            .entry(shape.iri.clone())
            .or_insert_with(HashMap::new)
            .entry(graph_iri.to_string())
            .or_insert_with(HashMap::new)
            .entry(subject_iri.to_string())
            .or_insert_with(|| {
                // Create a new change record including previous validity

                change_newly_created = true;

                let prev_valid = orm_subscription
                    .get_tracked_orm_object(graph_iri, subject_iri, &shape.iri)
                    .map(|ts| ts.read().unwrap().valid.clone())
                    .unwrap_or(TrackedOrmObjectValidity::Pending);

                let tracked_obj = orm_subscription.get_or_create_tracked_orm_object(
                    graph_iri,
                    subject_iri,
                    shape,
                );

                TrackedOrmObjectChange {
                    tracked_orm_object: tracked_obj,
                    predicates: HashMap::new(),
                    is_validated: false,
                    prev_valid,
                }
            });

        return (change, change_newly_created);
    }

    /// Ensure parent<->child links exist for newly added shape references on this subject.
    /// Returns a map of child shape -> Vec of (child graph, child subject) to be merged into the children queue.
    fn reconcile_links_for_subject_additions(
        orm_subscription: &mut OrmSubscription,
        change: &mut TrackedOrmObjectChange,
        added_by_graph_and_subject: &HashMap<(String, String), Vec<Quad>>,
        removed_by_graph_and_subject: &HashMap<(String, String), Vec<Quad>>,
        added_graphs_by_subject: &GraphsBySubject,
        removed_graphs_by_subject: &GraphsBySubject,
        data_already_fetched: bool,
    ) -> HashMap<ShapeIri, Vec<(GraphIri, SubjectIri)>> {
        let mut children_to_queue: HashMap<ShapeIri, Vec<(GraphIri, SubjectIri)>> = HashMap::new();

        // Parent identifiers
        let (parent_graph, parent_subject, parent_arc) = {
            let parent_r = change.tracked_orm_object.read().unwrap();
            (
                parent_r.graph_iri.clone(),
                parent_r.subject_iri.clone(),
                change.tracked_orm_object.clone(),
            )
        };

        for pred_change in change.predicates.values_mut() {
            let pred_schema = pred_change.tracked_predicate.read().unwrap().schema.clone();
            let pred_iri = pred_schema.upgrade().unwrap().iri.clone();
            // Only consider predicates whose dataTypes include shapes
            let target_shape_iris: Vec<String> = pred_schema
                .upgrade()
                .unwrap()
                .dataTypes
                .iter()
                .filter(|dt| dt.valType == OrmSchemaValType::shape)
                .flat_map(|dt| dt.shape.clone())
                .collect();
            for target_shape_iri in target_shape_iris {
                // Iterate added values for object IRIs.
                for added_val in pred_change.values_added.clone() {
                    let child_subject = match added_val {
                        BasicType::Str(s) => s,
                        _ => continue,
                    };

                    // For all cases: Add to orm_subscription.tracked_nested_subjects.
                    let nested_entry = orm_subscription
                        .tracked_nested_subjects
                        .entry(child_subject.clone())
                        .or_insert_with(HashMap::new);

                    // For this shape, get or insert the Vec of (linking predicate, parent_arc)
                    let parents_vec = nested_entry
                        .entry(target_shape_iri.clone())
                        .or_insert_with(Vec::new);

                    // Add (pred_iri, parent_arc) if not already present
                    let already = parents_vec.iter().any(|(p_iri, p)| {
                        let pr = p.read().unwrap();
                        *p_iri == pred_iri
                            && pr.subject_iri == parent_subject
                            && pr.graph_iri == parent_graph
                    });
                    if !already {
                        parents_vec.push((pred_iri.clone(), parent_arc.clone()));
                    }

                    // Collect candidate graphs where this child might live in a deterministic order:
                    // categories priority: tracked-objects graphs (sorted) -> added diffs (sorted) -> removed diffs (sorted) -> parent's graph (last)
                    let mut candidate_graphs: Vec<String> = vec![];

                    // 1) From tracked objects (any graph) for this (subject, shape)
                    let mut tracked_graphs: Vec<String> = {
                        orm_subscription
                            .get_tracked_objects_any_graph(&child_subject, &target_shape_iri)
                            .iter()
                            .filter_map(|obj| Some(obj.read().ok()?.graph_iri.clone()))
                            .collect()
                    };
                    tracked_graphs.sort();
                    tracked_graphs.dedup();
                    candidate_graphs.extend(tracked_graphs.into_iter());

                    // 2) From added diffs.
                    if let Some(graphs) = added_graphs_by_subject.get(&child_subject) {
                        candidate_graphs.extend(graphs.iter().cloned());
                    }
                    //  3) from removed diffs.
                    if let Some(graphs) = removed_graphs_by_subject.get(&child_subject) {
                        candidate_graphs.extend(graphs.iter().cloned());
                    }

                    // Dedup graphs, preserving first occurrence (category priority)
                    let mut seen = HashSet::new();
                    candidate_graphs.retain(|g| seen.insert(g.clone()));

                    // Try to link/create per candidate graph; mark for queueing precise (graph,subject)
                    let mut queued_pairs: Vec<(String, String)> = Vec::new();
                    let mut found_child = false;
                    for child_graph in candidate_graphs {
                        if let Some(child_arc) = orm_subscription.get_tracked_orm_object(
                            &child_graph,
                            &child_subject,
                            &target_shape_iri,
                        ) {
                            // Link existing child
                            let linked_new = Self::link_parent_and_child(
                                &parent_arc,
                                &child_arc,
                                pred_change,
                                &child_graph,
                                &child_subject,
                                &target_shape_iri,
                            );

                            if linked_new {
                                // Parent needs reevaluation since effective cardinality may have changed
                                change.is_validated = false;
                            }
                            queued_pairs.push((child_graph.clone(), child_subject.clone()));
                            found_child = true;
                        } else {
                            // Queue child for validation.
                            let key = (child_graph.clone(), child_subject.clone());
                            if added_by_graph_and_subject.contains_key(&key)
                                || removed_by_graph_and_subject.contains_key(&key)
                            {
                                queued_pairs.push(key);
                                found_child = true;
                            }
                        }
                    }

                    // If the child was not found in any candidate graph and we are processing
                    // updates (not the initial load), queue it with an empty graph to trigger a
                    // cross-graph query. During the initial load, unfound children are simply
                    // pending or non-existent and must not trigger a fetch.
                    if !found_child && !data_already_fetched {
                        queued_pairs.push((String::new(), child_subject.clone()));
                    }

                    // Dedup and schedule pairs
                    if !queued_pairs.is_empty() {
                        let mut seen: HashSet<(String, String)> = HashSet::new();
                        let mut uniq: Vec<(String, String)> = Vec::new();
                        for pair in queued_pairs.into_iter() {
                            if seen.insert(pair.clone()) {
                                uniq.push(pair);
                            }
                        }
                        let entry = children_to_queue
                            .entry(target_shape_iri.clone())
                            .or_insert_with(Vec::new);
                        for item in uniq.into_iter() {
                            entry.push(item);
                        }
                    }
                }
            }
        }

        children_to_queue
    }

    /// Queue discovered objects for validation and query them if necessary.
    fn queue_groups(
        &mut self,
        orm_subscription: &mut OrmSubscription,
        orm_changes: &mut OrmChanges,
        run: &mut ProcessRun,
        child_objects_to_eval: HashMap<ShapeIri, Vec<(GraphIri, SubjectIri)>>,
    ) -> Result<(), NgError> {
        // Deduplicate.
        let groups: Vec<(ShapeIri, Vec<(GraphIri, SubjectIri)>)> = child_objects_to_eval
            .into_iter()
            .map(|(shape_iri, objects)| {
                let mut pairs: Vec<(GraphIri, SubjectIri)> = objects;
                pairs.sort();
                pairs.dedup();
                (shape_iri, pairs)
            })
            .collect();

        for (shape_iri, objects_to_eval) in groups {
            let shape_arc = orm_subscription
                .shape_type
                .schema
                .get(&shape_iri)
                .unwrap()
                .clone();

            // Decide once per pair whether it has to be loaded.
            let mut to_load: Vec<(GraphIri, SubjectIri)> = Vec::new();
            let mut to_queue: Vec<(GraphIri, SubjectIri)> = Vec::new();
            for (graph_iri, subject_iri) in objects_to_eval {
                if run.needs_loading(orm_subscription, &shape_iri, &graph_iri, &subject_iri) {
                    to_load.push((graph_iri, subject_iri));
                } else if !graph_iri.is_empty() {
                    to_queue.push((graph_iri, subject_iri));
                } else {
                    // An empty graph is the placeholder for "graph not known yet"; only a load
                    // resolves it into a real one, so it must not become a tracked object.
                }
            }

            if !to_load.is_empty() {
                let scope = if to_load.iter().any(|(graph_iri, _)| graph_iri.is_empty()) {
                    &QueryScope::All
                } else {
                    &orm_subscription.graph_scope
                };

                let mut subjects: Vec<SubjectIri> = to_load
                    .iter()
                    .map(|(_g, subject)| subject.clone())
                    .collect();
                subjects.sort();
                subjects.dedup();

                let fetched = self.query_quads_for_shape(
                    &scope,
                    &orm_subscription.shape_type.schema,
                    &shape_iri,
                    Some(&subjects),
                )?;
                run.mark_loaded(&fetched.loaded, &scope);
                let touched = run.merge_loaded_quads(fetched.quads);

                // Reset is_validated for tormos that we fetched new data about.
                for (graph_iri, subject_iri) in touched.iter() {
                    for shape_changes in orm_changes.values_mut() {
                        if let Some(change) = shape_changes
                            .get_mut(graph_iri)
                            .and_then(|subjects| subjects.get_mut(subject_iri))
                        {
                            change.is_validated = false;
                        }
                    }
                }

                let requested: HashSet<SubjectIri> = subjects.into_iter().collect();
                to_queue.extend(
                    touched
                        .into_iter()
                        .filter(|(_graph_iri, subject_iri)| requested.contains(subject_iri)),
                );
                // A subject the load found nothing for still has to be evaluated, as long as we
                // know which graph to evaluate it in.
                to_queue.extend(
                    to_load
                        .into_iter()
                        .filter(|(graph_iri, _subject_iri)| !graph_iri.is_empty()),
                );
            }

            if !to_queue.is_empty() {
                to_queue.sort();
                to_queue.dedup();
                run.stack.push((shape_arc, to_queue));
            }
        }
        Ok(())
    }

    /// Read the (graph, subject) pairs this update introduced from the store and merge whatever
    /// the diff did not carry into the run.
    fn load_introduced_subjects(&self, run: &mut ProcessRun) -> Result<(), NgError> {
        if run.introduced_by_diff.is_empty() {
            return Ok(());
        }
        let mut graph_subjects: Vec<GraphSubjectKey> =
            run.introduced_by_diff.iter().cloned().collect();
        graph_subjects.sort();

        let quads = self.query_quads_for_graph_subjects(&graph_subjects)?;
        run.merge_loaded_quads(quads);
        Ok(())
    }

    /// Add and remove the quads from the tracked orm objects,
    /// re-validate, and update `changes` containing the updated data.
    /// Works by queuing changes by shape and (graph, subjects) on a stack.
    /// Nested objects are added to the stack
    pub(crate) fn process_changes_for_subscription(
        &mut self,
        orm_subscription: &mut OrmSubscription,
        quads_added: &[Quad],
        quads_removed: &[Quad],
        orm_changes: &mut OrmChanges,
        data_already_fetched: bool,
    ) -> Result<OrmChanges, NgError> {
        let mut run = ProcessRun::new(&orm_subscription, quads_added, quads_removed);

        if !data_already_fetched {
            // A subject the subscription never tracked is not necessarily new to the store: the
            // shape query only ever returned subjects that already satisfied the shape, so anything
            // invalid for it stayed invisible. Read those now.
            self.load_introduced_subjects(&mut run)?;
        }

        // Track (shape_iri, subject_iri) pairs currently being validated to prevent cycles and double evaluation.
        let mut currently_validating: HashSet<ShapeGraphSubjectKey> = HashSet::new();

        let mut loop_counter = 0;

        // Process queue of shapes and subjects to validate.
        // For a given shape, we evaluate every subject against that shape.
        while let Some((shape, graph_subject_to_validate)) = run.stack.pop() {
            // Variables to collect nested objects that need validation.
            // Children have highest priority, then SELF, then PARENTS (last).
            let mut child_objects_to_eval: HashMap<ShapeIri, Vec<(GraphIri, SubjectIri)>> =
                HashMap::new();
            let mut self_objects_to_eval: HashMap<ShapeIri, Vec<(GraphIri, SubjectIri)>> =
                HashMap::new();
            let mut parent_objects_to_eval: HashMap<ShapeIri, Vec<(GraphIri, SubjectIri)>> =
                HashMap::new();

            // For each modified subject, apply changes to tracked orm objects, link nested refs, and validate.
            for (graph_iri, subject_iri) in graph_subject_to_validate.iter() {
                // Cycle detection: Check if this (shape, graph, subject) combination is already being validated.
                let validation_key = (shape.iri.clone(), graph_iri.clone(), subject_iri.clone());
                if currently_validating.contains(&validation_key) {
                    log_warn!(
                        "[process_changes_for_shape_and_session]   Cycle detected: graph '{graph_iri}' subject '{}' with shape '{}' is already being validated. Marking as invalid.",
                        subject_iri,
                        shape.iri
                    );

                    // Find tracked and mark as invalid.
                    if let Some(tracked_orm_object) =
                        orm_subscription.get_tracked_orm_object(graph_iri, subject_iri, &shape.iri)
                    {
                        let mut ts = tracked_orm_object.write().unwrap();
                        ts.valid = TrackedOrmObjectValidity::Invalid;
                        ts.tracked_predicates.clear();
                    }
                    continue;
                }

                // Mark as currently validating this (shape, graph, subject)
                currently_validating.insert(validation_key);

                // We'll capture the child's Arc for linking to parents after dropping the mutable borrow to orm_changes
                let mut link_children_to_eval = HashMap::new();

                {
                    // Get or create change object and apply quads
                    let (change, _change_new) = Self::ensure_change_for_subject(
                        orm_subscription,
                        orm_changes,
                        &shape,
                        graph_iri,
                        subject_iri,
                    );

                    // If validation took place already, there's nothing more to do...
                    if change.is_validated {
                        continue;
                    }

                    // Capture child arc for later linking
                    let child_arc = change.tracked_orm_object.clone();

                    // Apply the quads of this (graph, subject) that this tormo has not seen yet.
                    let gs_key = (graph_iri.clone(), subject_iri.clone());
                    let pending = run.take_pending(&gs_key, &shape.iri);
                    if !pending.is_empty() {
                        apply_quads_for_subject(
                            &shape,
                            graph_iri,
                            subject_iri,
                            &pending.added,
                            &pending.removed,
                            orm_subscription,
                            change,
                        );

                        // Reconcile parent<->child links for newly added refs and collect children to queue
                        link_children_to_eval = Self::reconcile_links_for_subject_additions(
                            orm_subscription,
                            change,
                            &run.added,
                            &run.removed,
                            &run.added_graphs,
                            &run.removed_graphs,
                            data_already_fetched,
                        );
                        // Link this tracked orm object to all tracked_nested_subjects that reference it.
                        // Running this once suffices because it will search for all subjects x graph pairs relevant.
                        Self::link_to_tracking_parents(orm_subscription, orm_changes, &child_arc);
                    }
                }

                // Reacquire mutable change for validation stage
                let (change, _change_new) = Self::ensure_change_for_subject(
                    orm_subscription,
                    orm_changes,
                    &shape,
                    graph_iri,
                    subject_iri,
                );

                // === Validate the subject ===

                let mut children_to_eval = vec![];
                let mut parents_to_eval = vec![];
                let mut need_self_eval = NeedEvalSelf::NoReevaluate;

                // If there are no children that we need to link to first, validate.
                if link_children_to_eval.len() == 0 {
                    // Validity evaluation returns children (with fetch flag), parents, and whether SELF needs (re)eval
                    (children_to_eval, parents_to_eval, need_self_eval) =
                        Self::update_subject_validity(change, &shape, orm_subscription);
                }

                // Merge children discovered by validation with those found during linking
                // into a single map keyed by child shape -> (graph, subject)
                let mut child_targets: HashMap<ShapeIri, HashSet<(GraphIri, SubjectIri)>> =
                    HashMap::new();

                // 1) children discovered during linking
                for (child_shape_iri, entries) in link_children_to_eval.iter() {
                    child_targets
                        .entry(child_shape_iri.clone())
                        .or_insert_with(HashSet::new)
                        .extend(entries.iter().cloned());
                }

                // 2) children returned by validation (tormos -> subjects)
                for child_arc in children_to_eval.into_iter() {
                    let child_r = child_arc.read().unwrap();
                    let shape_key = child_r.shape.upgrade().unwrap().iri.clone();
                    let pair_key = (child_r.graph_iri.clone(), child_r.subject_iri.clone());
                    child_targets
                        .entry(shape_key)
                        .or_insert_with(HashSet::new)
                        .insert(pair_key);
                }

                // Schedule CHILDREN (highest priority).
                let mut any_child_queued_this_pass = false;
                for (shape_iri, pairs) in child_targets.into_iter() {
                    for (graph, subj) in pairs.into_iter() {
                        if data_already_fetched
                            && run.needs_loading(orm_subscription, &shape_iri, &graph, &subj)
                        {
                            continue;
                        }
                        child_objects_to_eval
                            .entry(shape_iri.clone())
                            .or_insert_with(Vec::new)
                            .push((graph, subj));
                        any_child_queued_this_pass = true;
                    }
                }

                // Schedule SELF (second priority)
                let reschedule_self = match need_self_eval {
                    NeedEvalSelf::NoReevaluate => any_child_queued_this_pass,
                    NeedEvalSelf::Reevaluate => true,
                };

                if reschedule_self {
                    self_objects_to_eval
                        .entry(shape.iri.clone())
                        .or_insert_with(Vec::new)
                        .push((graph_iri.clone(), subject_iri.clone()));
                }

                // Schedule PARENTS (last priority)
                for parent_arc in parents_to_eval {
                    let parent = parent_arc.read().unwrap();
                    let parent_shape_iri = parent.shape.upgrade().unwrap().iri.clone();
                    let parent_subject = parent.subject_iri.clone();
                    // Skip queuing parent if it is currently being validated to avoid loops
                    let parent_key = (
                        parent_shape_iri.clone(),
                        parent.graph_iri.clone(),
                        parent_subject.clone(),
                    );
                    if currently_validating.contains(&parent_key) {
                        continue;
                    }

                    parent_objects_to_eval
                        .entry(parent_shape_iri)
                        .or_insert_with(Vec::new)
                        .push((parent.graph_iri.clone(), parent_subject));
                }
            }

            // Now, we queue all non-evaluated objects (push on stack)

            // Parents, scheduled last.
            self.queue_groups(
                orm_subscription,
                orm_changes,
                &mut run,
                parent_objects_to_eval,
            )?;
            // Same shape, scheduled second.
            self.queue_groups(
                orm_subscription,
                orm_changes,
                &mut run,
                self_objects_to_eval,
            )?;
            // Children, scheduled first.
            self.queue_groups(
                orm_subscription,
                orm_changes,
                &mut run,
                child_objects_to_eval,
            )?;

            for (graph_iri, subject_iri) in graph_subject_to_validate {
                let validation_key = (shape.iri.clone(), graph_iri.clone(), subject_iri.clone());
                currently_validating.remove(&validation_key);
            }

            // Assertion: Prevent infinite loop.
            loop_counter += 1;
            if loop_counter > 100 {
                for (is_validated, validity, subject_iri, shape_iri, graph_iri) in
                    orm_changes.values().flat_map(|g| {
                        g.values().flat_map(|s| {
                            s.values().map(|c| {
                                (
                                    c.is_validated,
                                    c.tracked_orm_object.read().unwrap().valid.clone(),
                                    c.tracked_orm_object.read().unwrap().subject_iri.clone(),
                                    c.tracked_orm_object
                                        .read()
                                        .unwrap()
                                        .shape
                                        .upgrade()
                                        .unwrap()
                                        .iri
                                        .clone(),
                                    c.tracked_orm_object.read().unwrap().graph_iri.clone(),
                                )
                            })
                        })
                    })
                {
                    log_err!("Something went wrong during validation: Too many cycles: All change objects: {is_validated}, {:?}, {subject_iri}, {shape_iri}, {graph_iri}", validity);
                }
                return Err(NgError::OrmError(
                    format!("[process_changes_for_subscription] Something went wrong during validation: Too many cycles. Please file a bug report.")
                ));
            }
        }

        // Mark new tormos to hold complete state (from here on
        // they are kept up to date by quad diffs alone).
        for (graph_iri, subject_iri) in run.introduced_by_diff.iter() {
            orm_subscription.mark_subject_complete(graph_iri, subject_iri);
        }
        orm_subscription.mark_loaded_complete(&run.loaded);

        // orm_subscription.cleanup_tracked_orm_objects();

        self.refetch_newly_visible(orm_subscription, orm_changes, &run)
    }

    /// For previously tracked but invalid objects, the diff does not include all quads.
    /// For materialization of newly valid tormos, we need to ensure the data is present.
    /// Creates a separate OrmChanges object (overlay) containing the full data.
    fn refetch_newly_visible(
        &self,
        orm_subscription: &OrmSubscription,
        orm_changes: &OrmChanges,
        run: &ProcessRun,
    ) -> Result<OrmChanges, NgError> {
        // Objects that became visible and whose change cannot already describe them in full.
        let mut stale_by_shape: HashMap<ShapeIri, Vec<SubjectIri>> = HashMap::new();
        for (shape_iri, graph_changes) in orm_changes.iter() {
            for (graph_iri, subject_changes) in graph_changes.iter() {
                for (subject_iri, change) in subject_changes.iter() {
                    if change.prev_valid == TrackedOrmObjectValidity::Valid
                        || change.tracked_orm_object.read().unwrap().valid
                            != TrackedOrmObjectValidity::Valid
                    {
                        continue;
                    }
                    // The update introduced the pair, so all of its quads arrived together; or
                    // a load in this run already put the whole object into the change.
                    if run
                        .introduced_by_diff
                        .contains(&(graph_iri.clone(), subject_iri.clone()))
                        || run.already_looked_for(shape_iri, subject_iri, graph_iri)
                    {
                        continue;
                    }
                    stale_by_shape
                        .entry(shape_iri.clone())
                        .or_insert_with(Vec::new)
                        .push(subject_iri.clone());
                }
            }
        }

        let mut changes_overlay: OrmChanges = HashMap::new();
        for (shape_iri, mut subjects) in stale_by_shape.into_iter() {
            subjects.sort();
            subjects.dedup();
            self.restate_shape_fetch(
                orm_subscription,
                &mut changes_overlay,
                &shape_iri,
                &subjects,
            )?;
        }

        Ok(changes_overlay)
    }

    /// Read `subjects` back from the store under `shape_iri` and restate what the fetch
    /// loaded into `overlay`.
    /// This includes the nested objects too.
    pub(crate) fn restate_shape_fetch(
        &self,
        orm_subscription: &OrmSubscription,
        overlay: &mut OrmChanges,
        shape_iri: &ShapeIri,
        subjects: &Vec<SubjectIri>,
    ) -> Result<(), NgError> {
        let fetched = self.query_quads_for_shape(
            &orm_subscription.graph_scope,
            &orm_subscription.shape_type.schema,
            shape_iri,
            Some(subjects),
        )?;

        let mut shapes_by_subject: HashMap<&SubjectIri, Vec<&ShapeIri>> = HashMap::new();
        for (loaded_shape_iri, loaded_subjects) in fetched.loaded.iter() {
            for loaded_subject in loaded_subjects.iter() {
                shapes_by_subject
                    .entry(loaded_subject)
                    .or_insert_with(Vec::new)
                    .push(loaded_shape_iri);
            }
        }

        let quads_by_gs = group_by_graph_and_subject(&fetched.quads);
        for ((graph_iri, subject_iri), quads) in quads_by_gs.iter() {
            let Some(shape_iris) = shapes_by_subject.get(subject_iri) else {
                continue;
            };
            for loaded_shape_iri in shape_iris.iter() {
                Self::restate_change(
                    orm_subscription,
                    overlay,
                    loaded_shape_iri,
                    graph_iri,
                    subject_iri,
                    quads,
                );
            }
        }

        Ok(())
    }

    /// Put quads into an OrmChanges object without modifying tormos.
    /// Required for materialization of previously existing but invalid tormos only.
    fn restate_change(
        orm_subscription: &OrmSubscription,
        changes_overlay: &mut OrmChanges,
        shape_iri: &str,
        graph_iri: &str,
        subject_iri: &str,
        quads: &[Quad],
    ) {
        let Some(shape) = orm_subscription.shape_type.schema.get(shape_iri) else {
            return;
        };
        let Some(tormo_arc) = orm_subscription.get_tracked_orm_object(
            &graph_iri.to_string(),
            &subject_iri.to_string(),
            shape_iri,
        ) else {
            return;
        };

        let predicates = orm_subscription.indexed_predicates(&shape.iri);

        let mut changes_by_predicate: HashMap<String, TrackedOrmPredicateChanges> = HashMap::new();

        let tormo = tormo_arc.read().unwrap();
        for quad in quads {
            let Some(predicate_schema) = predicates.get(quad.predicate.as_str()) else {
                continue;
            };
            let value = oxrdf_term_to_orm_basic_type(&quad.object);

            // The tracked predicate carries the links to the nested children, which
            // materialization walks; without it the value would be unusable anyway.
            let Some(tracked_predicate) = tormo.tracked_predicates.get(&predicate_schema.iri)
            else {
                continue;
            };
            changes_by_predicate
                .entry(predicate_schema.iri.clone())
                .or_insert_with(|| TrackedOrmPredicateChanges {
                    tracked_predicate: tracked_predicate.clone(),
                    values_added: Vec::new(),
                    values_removed: Vec::new(),
                })
                .values_added
                .push(value.clone());
        }
        drop(tormo);

        changes_overlay
            .entry(shape_iri.to_string())
            .or_insert_with(HashMap::new)
            .entry(graph_iri.to_string())
            .or_insert_with(HashMap::new)
            .insert(
                subject_iri.to_string(),
                TrackedOrmObjectChange {
                    tracked_orm_object: tormo_arc,
                    predicates: changes_by_predicate,
                    // Neither is read when materializing; the overlay is not a delta.
                    is_validated: true,
                    prev_valid: TrackedOrmObjectValidity::Pending,
                },
            );
    }
}
