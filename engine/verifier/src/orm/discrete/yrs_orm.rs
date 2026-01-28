// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use std::{cell::RefCell, rc::Rc};

use ng_net::app_protocol::*;
use ng_net::orm::{OrmPatch, OrmPatchOp, OrmPatches};

use ng_repo::log::*;
use ng_repo::{errors::VerifierError, types::BranchId};
use serde_json::{json, Value};
use yrs::{updates::decoder::Decode, Any, ArrayPrelim, BranchID, In, MapPrelim, Out};

use serde_json::Map as JsonMap;
use yrs::types::{Change, EntryChange, Events, PathSegment};
use yrs::{Array, DeepObservable, Doc, Map, ReadTxn, Transact};

use crate::orm::types::DiscreteOrmSubscription;
use crate::orm::utils::decode_json_pointer;
use crate::{orm::types::BackendDiscreteState, types::DiscreteTransaction, verifier::Verifier};

impl Verifier {
    /// Applies blob batches and generates ORM JSON patches.
    pub(crate) fn apply_discrete_yjs_transaction_gen_orm_patches(
        &self,
        branch_id: &BranchId,
        patch: &DiscreteTransaction,
    ) -> Result<(Vec<u8>, Vec<OrmPatch>), VerifierError> {
        let (_, backend_state) = self
            .discrete_orm_states
            .get(branch_id)
            .ok_or(VerifierError::OrmStateNotFound)?;

        let nuri = self
            .discrete_orm_subscriptions
            .values()
            .find(|sub| sub.branch_id == *branch_id && !sub.sender.is_closed())
            .map(|sub| sub.nuri.clone())
            .ok_or(VerifierError::OrmSubscriptionNotFound)?;

        let (BackendDiscreteState::YMap(doc) | BackendDiscreteState::YArray(doc)) = backend_state
        else {
            return Err(VerifierError::OrmStateNotFound);
        };

        let is_array = matches!(backend_state, BackendDiscreteState::YArray(_));
        let resulting_orm_patches: Rc<RefCell<Vec<OrmPatch>>> = Rc::new(RefCell::new(vec![]));
        let nuri_clone = nuri.clone();
        let observation = if is_array {
            let array_ref = doc.get_or_insert_array("ng");
            let patches_clone = Rc::clone(&resulting_orm_patches);
            array_ref.observe_deep(move |mut txn, ev| {
                yrs_mutation_callback(&mut txn, ev, &patches_clone, &nuri_clone);
            })
        } else {
            let map_ref = doc.get_or_insert_map("ng");
            let patches_clone = Rc::clone(&resulting_orm_patches);
            map_ref.observe_deep(move |mut tx, ev| {
                yrs_mutation_callback(&mut tx, ev, &patches_clone, &nuri_clone);
            })
        };
        let mut tx = doc.transact_mut();
        let update = yrs::Update::decode_v1(patch.as_slice())
            .map_err(|e| VerifierError::YrsError(e.to_string()))?;
        tx.apply_update(update);
        tx.commit();
        drop(tx);
        drop(observation);

        // obtain the full dump of state
        let empty_state_vector = yrs::StateVector::default();
        let transac = doc.transact();
        let full_state = transac.encode_state_as_update_v1(&empty_state_vector);

        let resulting_orm_patches = Rc::try_unwrap(resulting_orm_patches)
            .expect("reference count should be 1")
            .into_inner();

        Ok((full_state, resulting_orm_patches))
    }
}

/// Converts a serde_json::Value to a yrs::In value.
pub(crate) fn json_value_to_yrs_in(value: &serde_json::Value) -> In {
    match value {
        Value::Null => In::Any(Any::Null),
        Value::Bool(b) => In::Any(Any::Bool(*b)),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                // Use BigInt for integers that fit
                In::Any(Any::BigInt(i))
            } else if let Some(f) = n.as_f64() {
                In::Any(Any::Number(f))
            } else {
                In::Any(Any::Null)
            }
        }
        Value::String(s) => In::Any(Any::String(s.as_str().into())),
        // ATTENTION: We do not support nested values,
        // patches coming from js-land are atomic.
        Value::Array(_arr) => {
            // let prelim_items = _arr.iter().map(json_value_to_yrs_in).collect::<Vec<_>>();
            // In::Array(ArrayPrelim::from(prelim_items))
            In::Array(ArrayPrelim::default())
        }
        Value::Object(_obj) => {
            // let prelim_entries = _obj
            //     .iter()
            //     .map(|(k, v)| (k.clone(), json_value_to_yrs_in(v)));
            // In::Map(MapPrelim::from_iter(prelim_entries))
            In::Map(MapPrelim::default())
        }
    }
}

/// Represents a target location in the YRS document tree.
#[derive(Debug, Clone)]
pub(crate) enum YrsTarget {
    Map(yrs::MapRef),
    Array(yrs::ArrayRef),
}

/// Navigates to the parent container at the given path and returns it along with the final key.
fn navigate_to_parent_from_target(
    txn: &mut yrs::TransactionMut,
    root: &YrsTarget,
    path: &[String],
) -> Result<(YrsTarget, String), VerifierError> {
    if path.is_empty() {
        return Err(VerifierError::YrsError("Empty path".into()));
    }

    let final_key = path.last().unwrap().clone();
    let parent_path = &path[..path.len() - 1];

    if parent_path.is_empty() {
        // The parent is the root.
        return Ok((root.clone(), final_key));
    }

    // Navigate through the path to find the parent container.
    let mut current: Out = match root {
        YrsTarget::Map(m) => Out::YMap(m.clone()),
        YrsTarget::Array(a) => Out::YArray(a.clone()),
    };

    for (i, segment) in parent_path.iter().enumerate() {
        current = match current {
            Out::YMap(map) => match map.get(txn, segment) {
                Some(child) => child,
                None => {
                    return Err(VerifierError::YrsError("Path does not exist".into()));
                    // // Create nested map if it doesn't exist.
                    // let new_map = map.insert(txn, segment.clone(), yrs::MapPrelim::default());
                    // Out::YMap(new_map)
                }
            },
            Out::YArray(arr) => {
                let index: u32 = segment.parse().map_err(|_| {
                    VerifierError::YrsError(format!(
                        "Invalid array index '{}' at path position {}",
                        segment, i
                    ))
                })?;
                match arr.get(txn, index) {
                    Some(child) => child,
                    None => {
                        return Err(VerifierError::YrsError(format!(
                            "Array index {} out of bounds at path position {}",
                            index, i
                        )));
                    }
                }
            }
            _ => {
                return Err(VerifierError::YrsError(format!(
                    "Cannot traverse into non-container at path position {}",
                    i
                )));
            }
        };
    }

    // Convert the final current value to a YrsTarget
    match current {
        Out::YMap(map) => Ok((YrsTarget::Map(map), final_key)),
        Out::YArray(arr) => Ok((YrsTarget::Array(arr), final_key)),
        _ => Err(VerifierError::YrsError(
            "Parent is not a map or array".into(),
        )),
    }
}

/// Applies an add/replace patch to the YRS document.
pub(crate) fn apply_yrs_add_patch(
    txn: &mut yrs::TransactionMut,
    path: &[String],
    value: In,
    is_array: bool,
    root: &YrsTarget,
) -> Result<(), VerifierError> {
    // Handle empty path - replace at root level
    if path.is_empty() {
        if is_array {
            if !matches!(value, In::Array(_)) {
                return Err(VerifierError::YrsError(
                    "Cannot apply non-array to a YArray".into(),
                ));
            }

            if let YrsTarget::Array(arr) = root {
                // Clear existing content.
                let len = arr.len(txn);
                if len > 0 {
                    arr.remove_range(txn, 0, len);
                }
                // Normally, the items should be empty because the frontend
                // sends single value patches.
                // if let In::Array(items) = value {
                //     arr.insert_range(txn, 0, items);
                // }
            } else {
                return Err(VerifierError::YrsError("root is not an array".into()));
            }
        } else {
            if !matches!(value, In::Map(_)) {
                return Err(VerifierError::YrsError(
                    "Cannot apply non-map to a YMap".into(),
                ));
            }

            // Clear all items...
            if let YrsTarget::Map(map) = root {
                map.clear(txn);
                // Normally, the frontend sends single-valued patches,
                // So we don't need to cover the insertion.
                // ...and insert new ones.
                // if let In::Map(entries) = value {
                //     for (k, v) in entries.iter() {
                //         map.insert(txn, k.clone(), v.clone());
                //     }
                // }
            } else {
                return Err(VerifierError::YrsError("root is not a map".into()));
            }
        }
        return Ok(());
    }

    // Get the root container

    let (parent, key) = navigate_to_parent_from_target(txn, root, path)?;

    match parent {
        YrsTarget::Map(map) => {
            // Insert or replace the value in the map.
            map.insert(txn, key, value);
        }
        YrsTarget::Array(arr) => {
            let len = arr.len(txn);
            // If key is `-`, that means that we append.
            let index: u32 = if key == "-" {
                len
            } else {
                key.parse().map_err(|_| {
                    VerifierError::YrsError(format!("Invalid array index '{}'", key))
                })?
            };
            if index > len {
                return Err(VerifierError::YrsError(format!(
                    "Array index {} out of bounds (len: {})",
                    index, len
                )));
            }
            // Insert at the specified index.
            arr.insert(txn, index, value);
        }
    }

    Ok(())
}

/// Applies a remove patch to the YRS document.
pub(crate) fn apply_yrs_remove_patch(
    txn: &mut yrs::TransactionMut,
    path: &[String],
    is_array: bool,
    root: &YrsTarget,
) -> Result<(), VerifierError> {
    // Handle empty path - clear the root
    if path.is_empty() {
        if is_array {
            if let YrsTarget::Array(arr) = root {
                let len = arr.len(txn);
                if len > 0 {
                    arr.remove_range(txn, 0, len);
                }
            } else {
                return Err(VerifierError::YrsError("root is not an array".into()));
            }
        } else {
            if let YrsTarget::Map(map) = root {
                map.clear(txn);
            } else {
                return Err(VerifierError::YrsError("root is not a map".into()));
            }
        }
        return Ok(());
    }

    let (parent, key) = navigate_to_parent_from_target(txn, root, path)?;

    match parent {
        YrsTarget::Map(map) => {
            map.remove(txn, &key);
        }
        YrsTarget::Array(arr) => {
            let index: u32 = key
                .parse()
                .map_err(|_| VerifierError::YrsError(format!("Invalid array index '{}'", key)))?;
            let len = arr.len(txn);
            if index >= len {
                return Err(VerifierError::YrsError(format!(
                    "Array index {} out of bounds for removal (len: {})",
                    index, len
                )));
            }
            arr.remove(txn, index);
        }
    }

    Ok(())
}

pub(crate) fn yrs_out_to_json(
    txn: &yrs::TransactionMut<'_>,
    value: &Out,
    nuri: &NuriV0,
    parent_arr: bool,
) -> serde_json::Value {
    match value {
        Out::Any(value) => json!(value),
        Out::YMap(map) => {
            let mut v_map = JsonMap::new();
            for (k, v) in map.iter(txn) {
                v_map.insert(k.to_string(), yrs_out_to_json(txn, &v, nuri, false));
            }
            if parent_arr {
                let id = if let BranchID::Nested(id) = map.as_ref().id() {
                    Some((id.client, id.clock))
                } else {
                    None
                };
                if let Some((client, clock)) = id {
                    let iri = nuri.discrete_resource_yjs(client, clock);
                    v_map.insert("@id".into(), json!(iri));
                }
            }
            Value::Object(v_map)
        }
        Out::YArray(array) => Value::Array(
            array
                .iter(txn)
                .map(|el| yrs_out_to_json(txn, &el, nuri, true))
                .collect(),
        ),
        _ => {
            log_err!("[yrs_out_to_json] Could not deserialize patch value");
            Value::Null
        }
    }
}

/// Called when changes to a yrs document are made
/// which this callback translates to OrmPatches for sending to the client.
pub(crate) fn yrs_mutation_callback(
    txn: &yrs::TransactionMut<'_>,
    update_event: &Events,
    patches: &Rc<RefCell<Vec<OrmPatch>>>,
    nuri: &NuriV0,
) {
    let mut patches = patches.borrow_mut();
    for event in update_event.iter() {
        let path = event.path();
        let base_path = if path.is_empty() {
            "".to_string() // If path is root, `/` is prepended below already.
        } else {
            format!(
                "/{}",
                event
                    .path()
                    .iter()
                    .map(|p| match p {
                        PathSegment::Index(i) => i.to_string(),
                        PathSegment::Key(key) => key.to_string(),
                    })
                    .collect::<Vec<_>>()
                    .join("/")
            )
        };

        match event {
            yrs::types::Event::Map(map_event) => {
                for (key, change) in map_event.keys(txn).iter() {
                    match change {
                        EntryChange::Inserted(new_val) => {
                            patches.push(OrmPatch {
                                op: OrmPatchOp::add,
                                path: format!("{base_path}/{key}"),
                                valType: None,
                                value: Some(yrs_out_to_json(txn, new_val, nuri, false)),
                            });
                        }
                        EntryChange::Removed(_removed) => {
                            patches.push(OrmPatch {
                                op: OrmPatchOp::remove,
                                path: format!("{base_path}/{key}"),
                                valType: None,
                                value: None,
                            });
                        }
                        EntryChange::Updated(_old_val, new_val) => {
                            patches.push(OrmPatch {
                                op: OrmPatchOp::add,
                                path: format!("{base_path}/{key}"),
                                valType: None,
                                value: Some(yrs_out_to_json(txn, new_val, nuri, false)),
                            });
                        }
                    }
                }
            }
            yrs::types::Event::Array(array_event) => {
                let mut pos = 0;
                for delta in array_event.delta(txn).iter() {
                    match delta {
                        Change::Added(added) => {
                            for new_val in added {
                                patches.push(OrmPatch {
                                    op: OrmPatchOp::add,
                                    path: format!("{base_path}/{pos}"),
                                    value: Some(yrs_out_to_json(txn, new_val, nuri, true)),
                                    valType: None,
                                });
                                pos += 1;
                            }
                        }
                        Change::Removed(removed) => {
                            for _i in pos..(pos + removed) {
                                patches.push(OrmPatch {
                                    op: OrmPatchOp::remove,
                                    path: format!("{base_path}/{pos}"),
                                    valType: None,
                                    value: None,
                                });
                            }
                        }
                        Change::Retain(retain) => {
                            pos += retain;
                        }
                    }
                }
            }
            // TODO: Event::Text ?
            _other => {
                log_err!("[yrs_mutation_callback] Expected map or array change");
            }
        };
    }
}

pub(crate) fn yrs_handle_frontend_discrete_update(
    patches: OrmPatches,
    orm_subscription: &DiscreteOrmSubscription,
    doc: &mut Doc,
    is_array: bool,
) -> Result<
    (
        DiscreteTransaction,
        Vec<ng_net::orm::OrmPatch>,
        ng_net::app_protocol::NuriV0,
        ng_repo::types::PubKey,
        Vec<u8>,
    ),
    VerifierError,
> {
    let resulting_orm_patches: Rc<RefCell<Vec<OrmPatch>>> = Rc::new(RefCell::new(vec![]));
    let nuri_clone = orm_subscription.nuri.clone();
    let (observation, root) = if is_array {
        let array_ref = doc.get_or_insert_array("ng");
        let patches_clone = Rc::clone(&resulting_orm_patches);
        (
            array_ref.observe_deep(move |tx, ev| {
                yrs_mutation_callback(tx, ev, &patches_clone, &nuri_clone);
            }),
            YrsTarget::Array(array_ref),
        )
    } else {
        let map_ref = doc.get_or_insert_map("ng");
        let patches_clone = Rc::clone(&resulting_orm_patches);
        (
            map_ref.observe_deep(move |tx, ev| {
                yrs_mutation_callback(tx, ev, &patches_clone, &nuri_clone);
            }),
            YrsTarget::Map(map_ref),
        )
    };
    let mut tx: yrs::TransactionMut<'_> = doc.transact_mut();
    for patch in patches {
        let parsed_path: Vec<String> = patch
            .path
            .split('/')
            .skip(1)
            .map(|segment| decode_json_pointer(&segment.to_string()))
            .collect();

        if patch.op == OrmPatchOp::add {
            let value = match &patch.value {
                Some(v) => json_value_to_yrs_in(v),
                None => {
                    log_warn!("Add patch without value, skipping");
                    continue;
                }
            };

            // Navigate to parent and insert/update the final key
            apply_yrs_add_patch(&mut tx, &parsed_path, value, is_array, &root)?;
        } else {
            // patch.op == OrmPatchOp::remove
            apply_yrs_remove_patch(&mut tx, &parsed_path, is_array, &root)?;
        }
    }

    // Encode only the changes made in this transaction
    let update_bytes = tx.encode_update_v1();
    drop(tx);
    drop(observation);

    let resulting_orm_patches = Rc::try_unwrap(resulting_orm_patches)
        .expect("reference count should be 1")
        .into_inner();

    // obtain the full dump of state
    let empty_state_vector = yrs::StateVector::default();
    let transac = doc.transact();
    let full_state = transac.encode_state_as_update_v1(&empty_state_vector);

    let transaction = if is_array {
        DiscreteTransaction::YArray(update_bytes)
    } else {
        DiscreteTransaction::YMap(update_bytes)
    };

    let nuri = orm_subscription.nuri.clone();
    let branch_id = orm_subscription.branch_id;

    Ok((
        transaction,
        resulting_orm_patches,
        nuri,
        branch_id,
        full_state,
    ))
}
