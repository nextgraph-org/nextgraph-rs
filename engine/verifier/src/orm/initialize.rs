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

use crate::orm::query::shape_type_to_sparql;
use crate::orm::types::*;
use crate::orm::utils::nuri_to_string;
use crate::types::CancelFn;
use crate::verifier::Verifier;
use ng_net::app_protocol::{AppResponse, AppResponseV0, NuriV0};
use ng_net::orm::OrmSchemaShape;
use ng_repo::errors::NgError;
use ng_repo::log::*;
use std::u64;

use futures::channel::mpsc;

use crate::orm::{types::OrmTrackedSubjectChange, OrmChanges};

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
        let orm_subscription = OrmSubscription {
            shape_type: shape_type.clone(),
            session_id: session_id,
            sender: tx.clone(),
            tracked_subjects: HashMap::new(),
            nuri: nuri.clone(),
        };

        self.orm_subscriptions
            .entry(nuri.clone())
            .or_insert(vec![])
            .push(orm_subscription);

        let orm_objects = self.create_orm_object_for_shape(nuri, session_id, &shape_type)?;
        // log_debug!("create_orm_object_for_shape return {:?}", orm_objects);

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
        let shape_query = shape_type_to_sparql(&shape_type.schema, &shape_type.shape, None)?;
        let shape_triples = self.query_sparql_construct(shape_query, Some(nuri_to_string(nuri)))?;

        let changes: OrmChanges =
            self.apply_triple_changes(&shape_triples, &[], nuri, Some(session_id.clone()), true)?;

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
        // The way we get the changes from the tracked subjects is a bit hacky, sorry.
        for (subject_iri, tracked_subjects_by_shape) in &orm_subscription.tracked_subjects {
            if let Some(tracked_subject) = tracked_subjects_by_shape.get(&shape_type.shape) {
                let ts = tracked_subject.read().unwrap();
                log_info!(" - changes for: {:?} valid: {:?}", ts.subject_iri, ts.valid);

                if ts.valid == OrmTrackedSubjectValidity::Valid {
                    if let Some(change) = changes
                        .get(&shape_type.shape)
                        .and_then(|subject_iri_to_ts| subject_iri_to_ts.get(subject_iri).clone())
                    {
                        let new_val = materialize_orm_object(
                            change,
                            &changes,
                            root_shape,
                            &orm_subscription.tracked_subjects,
                        );
                        // TODO: For some reason, this log statement causes a panic.
                        // log_debug!("Materialized change:\n{:?}\ninto:\n{:?}", change, new_val);
                        return_val_vec.push(new_val);
                    }
                }
            }
        }

        return Ok(return_vals);
    }
}

/// Create ORM JSON object from OrmTrackedSubjectChange and shape.
pub(crate) fn materialize_orm_object(
    change: &OrmTrackedSubjectChange,
    changes: &OrmChanges,
    shape: &OrmSchemaShape,
    tracked_subjects: &HashMap<String, HashMap<String, Arc<RwLock<OrmTrackedSubject>>>>,
) -> Value {
    let mut orm_obj = json!({"@id": change.subject_iri});
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

        if pred_schema
            .dataTypes
            .iter()
            .any(|dt| dt.valType == OrmSchemaValType::shape)
        {
            // We have a nested type.

            // Helper closure to create Value structs from a nested object_iri.
            let get_nested_orm_obj = |object_iri: &SubjectIri| {
                // Find allowed schemas for the predicate's datatype.
                let shape_iris: Vec<ShapeIri> = pred_schema
                    .dataTypes
                    .iter()
                    .flat_map(|dt| dt.shape.clone())
                    .collect();

                // Find subject_change for this subject. There exists at least one (shape, subject) pair.
                // If multiple allowed shapes exist, the first one is chosen.
                let nested = shape_iris.iter().find_map(|shape_iri| {
                    changes
                        .get(shape_iri)
                        .and_then(|subject_changes| subject_changes.get(object_iri))
                        .map(|ch| (shape_iri, ch))
                });

                if let Some((matched_shape_iri, nested_subject_change)) = nested {
                    if let Some(nested_tracked_subject) = tracked_subjects
                        .get(&nested_subject_change.subject_iri)
                        .and_then(|shape_to_tracked_orm| {
                            shape_to_tracked_orm.get(matched_shape_iri)
                        })
                    {
                        let nested_tracked_subject = nested_tracked_subject.read().unwrap();
                        if nested_tracked_subject.valid == OrmTrackedSubjectValidity::Valid {
                            // Recurse
                            return Some(materialize_orm_object(
                                nested_subject_change,
                                changes,
                                &nested_tracked_subject.shape,
                                tracked_subjects,
                            ));
                        }
                    }
                }
                None
            };

            if is_multi {
                // Represent nested objects with more than one child
                // as a map/object of <IRI of nested object> -> nested object,
                // since there is no conceptual ordering of the children.
                let mut nested_objects_map = serde_json::Map::new();

                // Add each nested objects.
                for new_val in &pred_change.values_added {
                    if let BasicType::Str(object_iri) = new_val {
                        if let Some(nested_orm_obj) = get_nested_orm_obj(object_iri) {
                            nested_objects_map.insert(object_iri.clone(), nested_orm_obj);
                        }
                    }
                }
                orm_obj_map.insert(property_name.clone(), Value::Object(nested_objects_map));
            } else {
                if let Some(BasicType::Str(object_iri)) = pred_change.values_added.get(0) {
                    if let Some(nested_orm_obj) = get_nested_orm_obj(object_iri) {
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
