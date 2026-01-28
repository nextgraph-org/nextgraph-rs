// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use futures::channel::mpsc::UnboundedSender;
use futures::SinkExt;
use ng_net::orm::*;
pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_net::utils::Receiver;
use ng_repo::log::*;
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;
use std::collections::HashSet;
use std::sync::Arc;
use std::sync::RwLock;

use crate::orm::types::*;
use crate::orm::utils::{assess_and_rank_children, nuri_to_string};
use crate::types::CancelFn;
use crate::verifier::Verifier;
use ng_net::app_protocol::{AppResponse, AppResponseV0, NuriV0};
use ng_net::orm::OrmSchemaShape;
use ng_repo::errors::NgError;

use futures::channel::mpsc;

use crate::orm::{types::TrackedOrmObjectChange, OrmChanges};

impl Verifier {
    /// Entry point to create a new orm subscription.
    /// Triggers the creation of an orm object which is sent back to the receiver.
    pub(crate) async fn start_orm(
        &mut self,
        graph_scope: Vec<NuriV0>,
        subject_scope: Vec<String>,
        shape_type: OrmShapeType,
    ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
        let (mut tx, rx) = mpsc::unbounded::<AppResponse>();

        // TODO: Validate schema:
        // If multiple data types are present for the same predicate, they must be of of the same type.
        // All referenced shapes must be available.
        // All shapes must have predicate

        self.orm_subscription_counter += 1;
        // Create new subscription and add to self.orm_subscriptions
        let orm_subscription = OrmSubscription::new(
            shape_type,
            self.orm_subscription_counter,
            graph_scope
                .iter()
                .map(|nuri| nuri_to_string(nuri))
                .collect(),
            subject_scope,
            tx.clone(),
        );

        if let Err(error) = self
            .create_orm_object_for_shape_and_insert_subscription(orm_subscription, &mut tx)
            .await
        {
            log_err!(
                "Error occurred while creating orm subscription: {:?}",
                error
            );
            return Err(error);
        };

        let close = Box::new(move || {
            if !tx.is_closed() {
                tx.close_channel();
            }
        });
        Ok((rx, close))
    }

    /// For a nuri, session, and shape, create an ORM JSON object.
    async fn create_orm_object_for_shape_and_insert_subscription(
        &mut self,
        mut orm_subscription: OrmSubscription,
        tx: &mut UnboundedSender<AppResponse>,
    ) -> Result<(), NgError> {
        // Query quads for this shape
        let shape_quads = if orm_subscription.graph_scope.is_empty() {
            vec![]
        } else {
            self.query_quads_for_shape(
                &orm_subscription.graph_scope,
                &orm_subscription.shape_type.schema,
                &orm_subscription.shape_type.shape,
                Some(&orm_subscription.subject_scope),
            )?
        };

        let mut changes: OrmChanges = HashMap::new();

        self.process_changes_for_subscription(
            &mut orm_subscription,
            &shape_quads,
            &[],
            &mut changes,
            true,
        )?;

        let schema: &HashMap<String, Arc<OrmSchemaShape>> = &orm_subscription.shape_type.schema;
        let root_shape = schema.get(&orm_subscription.shape_type.shape).unwrap();

        let mut orm_objects = json!({});
        let obj_map = orm_objects.as_object_mut().unwrap();

        let mut graphs: HashSet<String> = HashSet::new();

        // For each valid change struct, we build an orm object.
        for (graph_iri, subject_iri, tracked_orm_object) in
            orm_subscription.iter_objects_by_shape(&orm_subscription.shape_type.shape)
        {
            let tormo = tracked_orm_object.read().unwrap();

            if tormo.valid == TrackedOrmObjectValidity::Valid {
                if let Some(change_ref) = changes
                    .get(&orm_subscription.shape_type.shape)
                    .and_then(|g| g.get(&graph_iri))
                    .and_then(|s| s.get(&subject_iri))
                {
                    let new_val =
                        materialize_orm_object(change_ref, &changes, root_shape, &orm_subscription);
                    obj_map.insert(
                        format!("{}|{}", tormo.graph_iri, tormo.subject_iri),
                        new_val,
                    );
                    graphs.insert(graph_iri);
                }
            }
        }

        let _ = tx
            .send(AppResponse::V0(AppResponseV0::GraphOrmInitial(
                orm_objects,
                orm_subscription.subscription_id,
            )))
            .await;

        self.orm_subscriptions
            .insert(orm_subscription.subscription_id, orm_subscription);

        // sync and subscribe to all the graphs found by ORM.
        // This can have the side effect of sending more AppResponses to the stream
        // (in case some new updates have been received while we were building the initial values).
        // For this reason, it happens AFTER the GraphOrmInitial is sent (just above) because
        // the client cannot apply OrmPatches if it didn't receive the GraphOrmInitial first.
        for graph in graphs.iter() {
            let nuri = NuriV0::new_from_repo_graph(graph)?;
            self.open_for_target(&nuri.target, true).await?;
        }

        Ok(())
    }
}

/// Create ORM JSON object from OrmTrackedSubjectChange and shape.
pub(crate) fn materialize_orm_object(
    change: &TrackedOrmObjectChange,
    changes: &OrmChanges,
    shape: &OrmSchemaShape,
    orm_subscription: &OrmSubscription,
) -> Value {
    let tormo = change.tracked_orm_object.read().unwrap();

    let mut orm_obj = json!({"@id": tormo.subject_iri, "@graph": tormo.graph_iri});
    let orm_obj_map = orm_obj.as_object_mut().unwrap();
    for pred_schema in &shape.predicates {
        let property_name = &pred_schema.readablePredicate;
        let is_multi = pred_schema.maxCardinality > 1 || pred_schema.maxCardinality == -1;

        let Some(pred_change) = change.predicates.get(&pred_schema.iri) else {
            // No triples for this property.

            if pred_schema.minCardinality == 0 && is_multi {
                // If this predicate schema is an array though, insert empty array.
                orm_obj_map.insert(property_name.clone(), Value::Array(vec![]));
            }

            continue;
        };

        // Is a nested predicate shape?
        if pred_schema
            .dataTypes
            .iter()
            .any(|dt| dt.valType == OrmSchemaValType::shape)
        {
            // We have a nested type.

            // Use tracked children and assessment to determine which children to materialize.
            let parent_guard = change.tracked_orm_object.read().unwrap();
            let tracked_predicate_guard = pred_change.tracked_predicate.read().unwrap();
            let upgraded_children: Vec<_> = tracked_predicate_guard
                .tracked_children
                .iter()
                .filter_map(|w| w.upgrade())
                .collect();
            let assessed = assess_and_rank_children(
                &parent_guard.graph_iri,
                &parent_guard.subject_iri,
                pred_schema.minCardinality,
                pred_schema.maxCardinality,
                &upgraded_children,
            );
            drop(tracked_predicate_guard);
            drop(parent_guard);

            // Helper to materialize a specific child TrackedOrmObject using its shape from tracked state.
            let materialize_child = |child_obj: &Arc<RwLock<TrackedOrmObject>>| -> Option<Value> {
                let child = child_obj.read().unwrap();
                if child.valid != TrackedOrmObjectValidity::Valid {
                    return None;
                }
                let shape_iri_for_child = child.shape_iri().unwrap();
                let graph_changes = changes.get(&shape_iri_for_child)?;
                let subj_changes = graph_changes.get(&child.graph_iri)?;
                let nested_change = subj_changes.get(&child.subject_iri)?;
                // Recurse with the child's shape
                let child_shape_arc = orm_subscription
                    .shape_type
                    .schema
                    .get(&shape_iri_for_child)
                    .cloned()?;
                let nested = materialize_orm_object(
                    nested_change,
                    changes,
                    &child_shape_arc,
                    orm_subscription,
                );
                return Some(nested);
            };

            if is_multi {
                // Represent nested objects with more than one child
                // as a map/object of <child_graph_iri|child_subject_iri> -> nested object,
                // since there is no conceptual ordering of the children.
                let mut nested_objects_map = serde_json::Map::new();

                // Add each considered, valid nested object.
                for child_arc in assessed.considered.iter() {
                    if let Some(nested_orm_obj) = materialize_child(child_arc) {
                        let child = child_arc.read().unwrap();

                        nested_objects_map.insert(
                            format!("{}|{}", child.graph_iri, child.subject_iri),
                            nested_orm_obj,
                        );
                    }
                }
                orm_obj_map.insert(property_name.clone(), Value::Object(nested_objects_map));
            } else {
                // Pick the first valid nested object among the considered children.
                // There may be multiple values (extras), but for single-cardinality
                // predicates we materialize just one valid nested object.
                if let Some(child_arc) = assessed.considered.first() {
                    if let Some(nested_orm_obj) = materialize_child(child_arc) {
                        orm_obj_map.insert(property_name.clone(), nested_orm_obj);
                    }
                }
            }
        } else {
            // We have a basic type (string, number, bool, literal).

            if is_multi {
                // Add values as array.
                orm_obj_map.insert(
                    property_name.clone(),
                    Value::Array(
                        pred_change
                            .values_added
                            .iter()
                            .map(|v| match v {
                                BasicType::Bool(b) => json!(*b),
                                BasicType::Num(n) => json!(*n),
                                BasicType::Str(s) => json!(s),
                            })
                            .collect(),
                    ),
                );
            } else {
                // Add value as primitive, if present.
                if let Some(val) = pred_change.values_added.get(0) {
                    orm_obj_map.insert(
                        property_name.clone(),
                        match val {
                            BasicType::Bool(b) => json!(*b),
                            BasicType::Num(n) => json!(*n),
                            BasicType::Str(s) => json!(s),
                        },
                    );
                }
            }
        }
    }

    return orm_obj;
}
