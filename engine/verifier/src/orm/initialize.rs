// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use futures::SinkExt;
use ng_net::orm::*;
pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_net::utils::Receiver;
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::RwLock;

use crate::orm::types::*;
use crate::orm::utils::{assess_and_rank_children, nuri_to_string};
use crate::types::CancelFn;
use crate::verifier::Verifier;
use ng_net::app_protocol::{AppResponse, AppResponseV0, NuriV0};
use ng_net::orm::OrmSchemaShape;
use ng_repo::errors::NgError;
use ng_repo::log::*;
use std::u64;

use futures::channel::mpsc;

use crate::orm::{types::TrackedOrmObjectChange, OrmChanges};

impl Verifier {
    /// Entry point to create a new orm subscription.
    /// Triggers the creation of an orm object which is sent back to the receiver.
    pub(crate) async fn start_orm(
        &mut self,
        nuri: &NuriV0,
        shape_type: &OrmShapeType,
        session_id: u64,
    ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
        let (mut tx, rx) = mpsc::unbounded::<AppResponse>();

        // TODO: Validate schema:
        // If multiple data types are present for the same predicate, they must be of of the same type.
        // All referenced shapes must be available.

        // Create new subscription and add to self.orm_subscriptions
        let orm_subscription =
            OrmSubscription::new(shape_type.clone(), session_id, nuri.clone(), tx.clone());

        self.orm_subscriptions
            .entry(nuri_to_string(nuri))
            .or_insert(vec![])
            .push(orm_subscription);

        let orm_objects = self.create_orm_object_for_shape(nuri, session_id, &shape_type)?;

        let _ = tx
            .send(AppResponse::V0(AppResponseV0::OrmInitial(orm_objects)))
            .await;

        let close = Box::new(move || {
            log_debug!("closing ORM subscription");
            if !tx.is_closed() {
                tx.close_channel();
            }
        });
        Ok((rx, close))
    }

    /// For a nuri, session, and shape, create an ORM JSON object.
    fn create_orm_object_for_shape(
        &mut self,
        nuri: &NuriV0,
        session_id: u64,
        shape_type: &OrmShapeType,
    ) -> Result<Value, NgError> {
        // Query triples for this shape
        let shape_quads = self.query_quads_for_shape_type(
            Some(nuri_to_string(nuri)),
            &shape_type.schema,
            &shape_type.shape,
            None,
        )?;

        let changes: OrmChanges =
            self.apply_quads_changes(&shape_quads, &[], nuri, Some(session_id.clone()), true)?;

        let orm_subscription =
            self.get_first_orm_subscription_for(nuri, Some(&shape_type.shape), Some(&session_id));

        let schema: &HashMap<String, Arc<OrmSchemaShape>> = &orm_subscription.shape_type.schema;
        let root_shape = schema.get(&shape_type.shape).unwrap();
        let Some(_root_changes) = changes.get(&root_shape.iri).map(|s| s.values()) else {
            return Ok(Value::Array(vec![]));
        };

        let mut return_vals: Value = Value::Array(vec![]);
        let return_val_vec = return_vals.as_array_mut().unwrap();

        log_debug!("\nMaterializing: {}", shape_type.shape);
        // For each valid change struct, we build an orm object.
        for (graph_iri, subject_iri, tracked_orm_object) in
            orm_subscription.iter_objects_by_shape(&shape_type.shape)
        {
            let tormo = tracked_orm_object.read().unwrap();
            log_info!(
                " - changes for: {:?} valid: {:?}",
                tormo.subject_iri,
                tormo.valid
            );

            if tormo.valid == TrackedOrmObjectValidity::Valid {
                if let Some(change_ref) = changes
                    .get(&shape_type.shape)
                    .and_then(|g| g.get(&graph_iri))
                    .and_then(|s| s.get(&subject_iri))
                {
                    let new_val =
                        materialize_orm_object(change_ref, &changes, root_shape, orm_subscription);
                    return_val_vec.push(new_val);
                }
            }
        }

        Ok(return_vals)
    }
}

/// Create ORM JSON object from OrmTrackedSubjectChange and shape.
pub(crate) fn materialize_orm_object(
    change: &TrackedOrmObjectChange,
    changes: &OrmChanges,
    shape: &OrmSchemaShape,
    orm_subscription: &OrmSubscription,
) -> Value {
    let subject_iri = change
        .tracked_orm_object
        .read()
        .unwrap()
        .subject_iri
        .clone();
    let mut orm_obj = json!({"@id": subject_iri});
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
            let assessed = assess_and_rank_children(
                &parent_guard.graph_iri,
                &parent_guard.subject_iri,
                &pred_schema,
                is_multi,
                pred_schema.minCardinality,
                pred_schema.maxCardinality,
                &tracked_predicate_guard.tracked_children,
            );
            drop(tracked_predicate_guard);
            drop(parent_guard);

            // Helper to materialize a specific child TrackedOrmObject using its shape from tracked state.
            let materialize_child =
                |child_obj: &Arc<RwLock<TrackedOrmObject>>| -> Option<(String, Value)> {
                    let child = child_obj.read().unwrap();
                    if child.valid != TrackedOrmObjectValidity::Valid {
                        return None;
                    }
                    let shape_iri_for_child = child.shape.iri.clone();
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
                    Some((child.subject_iri.clone(), nested))
                };

            if is_multi {
                // Represent nested objects with more than one child
                // as a map/object of <IRI of nested object> -> nested object,
                // since there is no conceptual ordering of the children.
                let mut nested_objects_map = serde_json::Map::new();

                // Add each considered, valid nested object.
                for child_arc in assessed.considered.iter() {
                    if let Some((iri, nested_orm_obj)) = materialize_child(child_arc) {
                        nested_objects_map.insert(iri, nested_orm_obj);
                    }
                }
                orm_obj_map.insert(property_name.clone(), Value::Object(nested_objects_map));
            } else {
                // Pick the first valid nested object among the added values.
                // There may be multiple values (extras), but for single-cardinality
                // predicates we materialize just one valid nested object.
                if let Some(child_arc) = assessed.traversal_pick.as_ref() {
                    if let Some((_, nested_orm_obj)) = materialize_child(child_arc) {
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
