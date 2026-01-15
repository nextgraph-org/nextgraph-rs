// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use std::cell::RefCell;
use std::rc::Rc;

use futures::channel::mpsc;
use futures::SinkExt;
use ng_net::orm::{OrmPatchOp, OrmPatches};
use ng_net::types;
use ng_net::utils::Receiver;
use ng_net::{app_protocol::*, orm::OrmPatch};
use ng_repo::errors::{StorageError, VerifierError};
use ng_repo::log::*;
use ng_repo::types::*;
use serde_json::{json, Value};
use yrs::types::{Change, EntryChange, Events, PathSegment, ToJson};
use yrs::updates::decoder::Decode;
use yrs::{Any, Array, DeepObservable, Map, Out, Transact};

use crate::orm::types::{DiscreteOrmSubscription, SubscriptionCrdtDetails};
use crate::orm::utils::decode_json_pointer;
use crate::types::{CancelFn, DiscreteTransaction};

use crate::verifier::Verifier;

impl Verifier {
    pub(crate) async fn start_discrete_orm(
        &mut self,
        nuri: NuriV0,
    ) -> Result<(Receiver<AppResponse>, CancelFn), VerifierError> {
        let (repo_id, branch_id, store_repo) = self.open_for_target(&nuri.target, false).await?;
        let repo = self.get_repo(&repo_id, &store_repo)?;
        let branch = repo.branch(&branch_id)?;

        let crdt = branch.crdt.clone();

        if crdt.is_graph() {
            return Err(VerifierError::NotDiscrete);
        }

        let (mut tx, rx) = mpsc::unbounded::<AppResponse>();

        self.discrete_orm_subscription_counter += 1;

        let mut orm_subscription = DiscreteOrmSubscription {
            nuri,
            branch_id,
            subscription_id: self.discrete_orm_subscription_counter,
            sender: tx.clone(),
            crdt_details: SubscriptionCrdtDetails::None,
        };

        let state = match self
            .user_storage
            .as_ref()
            .unwrap()
            .branch_get_discrete_state(&branch_id)
        {
            Ok(state) => Some(match crdt {
                BranchCrdt::Automerge(_) => DiscreteState::Automerge(state),
                BranchCrdt::YArray(_) => DiscreteState::YArray(state),
                BranchCrdt::YMap(_) => DiscreteState::YMap(state),
                BranchCrdt::YText(_) => DiscreteState::YText(state),
                BranchCrdt::YXml(_) => DiscreteState::YXml(state),
                _ => return Err(VerifierError::InvalidBranch),
            }),
            Err(StorageError::NoDiscreteState) => None,
            Err(e) => return Err(e.into()),
        };

        // do your magic here, depending on state.
        let orm_object = if let Some(discrete_state) = state {
            let (value, crdt_details) = convert_discrete_blob_to_orm_object(discrete_state)?;
            orm_subscription.crdt_details = crdt_details;
            value
        } else {
            serde_json::Value::Null
        };

        let _ = tx
            .send(AppResponse::V0(AppResponseV0::DiscreteOrmInitial(
                orm_object,
                orm_subscription.subscription_id,
            )))
            .await;

        self.discrete_orm_subscriptions
            .insert(orm_subscription.subscription_id, orm_subscription);

        let close = Box::new(move || {
            if !tx.is_closed() {
                tx.close_channel();
            }
        });
        Ok((rx, close))
    }

    pub(crate) async fn push_orm_discrete_update(
        &mut self,
        patch: &DiscretePatch,
        subscription_id: u64,
        branch_id: &BranchId,
    ) -> Result<(), VerifierError> {
        // then: Clean up and remove old subscriptions
        self.discrete_orm_subscriptions
            .retain(|_k, sub| !sub.sender.is_closed());

        for (id, sub) in self.discrete_orm_subscriptions.iter_mut() {
            let orm_patches = convert_and_apply_discrete_blob_patches(patch, &sub.crdt_details)?;

            if *id != subscription_id && sub.branch_id == *branch_id && orm_patches.len() > 0 {
                let update = AppResponse::V0(AppResponseV0::DiscreteOrmUpdate(orm_patches));
                let _ = sub.sender.send(update.clone()).await;
            }
        }
        Ok(())
    }

    /// Handles discrete updates coming from JS-land (JSON patches).
    pub(crate) async fn orm_frontend_discrete_update(
        &mut self,
        subscription_id: u64,
        patches: OrmPatches,
    ) -> Result<(), VerifierError> {
        if patches.is_empty() {
            return Ok(());
        };

        let orm_subscription = if let Some(orm_subscription) =
            self.discrete_orm_subscriptions.get_mut(&subscription_id)
        {
            orm_subscription
        } else {
            return Err(VerifierError::OrmSubscriptionNotFound);
        };

        let (update_bytes, is_array) = match &orm_subscription.crdt_details {
            SubscriptionCrdtDetails::YMap(doc) | SubscriptionCrdtDetails::YArray(doc) => {
                let is_array = matches!(
                    &orm_subscription.crdt_details,
                    SubscriptionCrdtDetails::YArray(_)
                );
                let mut tx = doc.transact_mut();

                for patch in patches {
                    let parsed_path: Vec<String> = patch
                        .path
                        .split('/')
                        .skip(1)
                        .map(|segment| decode_json_pointer(&segment.to_string()))
                        .collect();

                    if patch.op == OrmPatchOp::add {
                        let value = match &patch.value {
                            Some(v) => json_value_to_yrs_any(v),
                            None => {
                                log_warn!("Add patch without value, skipping");
                                continue;
                            }
                        };

                        // Navigate to parent and insert/update the final key
                        apply_yrs_add_patch(&mut tx, doc, &parsed_path, value, is_array)?;
                    } else {
                        // patch.op == OrmPatchOp::remove
                        apply_yrs_remove_patch(&mut tx, doc, &parsed_path, is_array)?;
                    }
                }

                // Encode only the changes made in this transaction
                (tx.encode_update_v1(), is_array)
            }
            SubscriptionCrdtDetails::None => return Err(VerifierError::NotImplemented),
        };

        let transaction = if is_array {
            DiscreteTransaction::YArray(update_bytes)
        } else {
            DiscreteTransaction::YMap(update_bytes)
        };

        let nuri = orm_subscription.nuri.clone();
        drop(orm_subscription);

        self.process_discrete_transaction(transaction, &nuri, subscription_id)
            .await?;

        Ok(())
    }
}

/// Converts a serde_json::Value to a yrs::Any value.
fn json_value_to_yrs_any(value: &serde_json::Value) -> Any {
    match value {
        Value::Null => Any::Null,
        Value::Bool(b) => Any::Bool(*b),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                // Use BigInt for integers that fit
                Any::BigInt(i)
            } else if let Some(f) = n.as_f64() {
                Any::Number(f)
            } else {
                Any::Null
            }
        }
        Value::String(s) => Any::String(s.as_str().into()),
        Value::Array(arr) => {
            let items: Vec<Any> = arr.iter().map(json_value_to_yrs_any).collect();
            Any::Array(items.into())
        }
        Value::Object(obj) => {
            let map: std::collections::HashMap<String, Any> = obj
                .iter()
                .map(|(k, v)| (k.clone(), json_value_to_yrs_any(v)))
                .collect();
            Any::Map(std::sync::Arc::new(map))
        }
    }
}

/// Represents a target location in the YRS document tree.
enum YrsTarget {
    Map(yrs::MapRef),
    Array(yrs::ArrayRef),
}

/// Navigates to the parent container at the given path and returns it along with the final key.
fn navigate_to_parent_from_target(
    txn: &mut yrs::TransactionMut,
    root: YrsTarget,
    path: &[String],
) -> Result<(YrsTarget, String), VerifierError> {
    if path.is_empty() {
        return Err(VerifierError::YrsError("Empty path".into()));
    }

    let final_key = path.last().unwrap().clone();
    let parent_path = &path[..path.len() - 1];

    if parent_path.is_empty() {
        // The parent is the root.
        return Ok((root, final_key));
    }

    // Navigate through the path to find the parent container.
    let mut current: Out = match root {
        YrsTarget::Map(m) => Out::YMap(m),
        YrsTarget::Array(a) => Out::YArray(a),
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
fn apply_yrs_add_patch(
    txn: &mut yrs::TransactionMut,
    doc: &yrs::Doc,
    path: &[String],
    value: Any,
    is_array: bool,
) -> Result<(), VerifierError> {
    // Handle empty path - replace at root level
    if path.is_empty() {
        if is_array {
            if !matches!(value, Any::Array(_)) {
                return Err(VerifierError::YrsError(
                    "Cannot apply non-array to a YArray".into(),
                ));
            }

            let arr = doc.get_or_insert_array("ng");
            // Clear existing content.
            let len = arr.len(txn);
            if len > 0 {
                arr.remove_range(txn, 0, len);
            }
            if let Any::Array(items) = value {
                arr.insert_range(txn, 0, items.iter().cloned());
            }
        } else {
            if !matches!(value, Any::Map(_)) {
                return Err(VerifierError::YrsError(
                    "Cannot apply non-array to a YArray".into(),
                ));
            }

            // Clear all items...
            let map = doc.get_or_insert_map("ng");
            map.clear(txn);
            // ...and insert new ones.
            if let Any::Map(entries) = value {
                for (k, v) in entries.iter() {
                    map.insert(txn, k.clone(), v.clone());
                }
            }
        }
        return Ok(());
    }

    // Get the root container
    let root_ref = if is_array {
        YrsTarget::Array(doc.get_or_insert_array("ng"))
    } else {
        YrsTarget::Map(doc.get_or_insert_map("ng"))
    };

    let (parent, key) = navigate_to_parent_from_target(txn, root_ref, path)?;

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
fn apply_yrs_remove_patch(
    txn: &mut yrs::TransactionMut,
    doc: &yrs::Doc,
    path: &[String],
    is_array: bool,
) -> Result<(), VerifierError> {
    // Handle empty path - clear the root
    if path.is_empty() {
        if is_array {
            let arr = doc.get_or_insert_array("ng");
            let len = arr.len(txn);
            if len > 0 {
                arr.remove_range(txn, 0, len);
            }
        } else {
            let map = doc.get_or_insert_map("ng");
            map.clear(txn);
        }
        return Ok(());
    }

    // Get the root container
    let root_ref = if is_array {
        YrsTarget::Array(doc.get_or_insert_array("ng"))
    } else {
        YrsTarget::Map(doc.get_or_insert_map("ng"))
    };

    let (parent, key) = navigate_to_parent_from_target(txn, root_ref, path)?;

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

fn convert_and_apply_discrete_blob_patches(
    patch: &DiscretePatch,
    crdt_details: &SubscriptionCrdtDetails,
) -> Result<Vec<OrmPatch>, VerifierError> {
    match patch {
        DiscretePatch::YMap(bytes) => {
            convert_and_apply_discrete_blob_patches_yrs(patch, crdt_details)
        }
        DiscretePatch::YArray(bytes) => {
            convert_and_apply_discrete_blob_patches_yrs(patch, crdt_details)
        }
        DiscretePatch::YXml(bytes) => {
            log_warn!("Discrete patch type YXml not implemented.");
            return Err(VerifierError::NotImplemented);
        }
        DiscretePatch::YText(bytes) => {
            log_warn!("Discrete patch type YText not implemented.");
            return Err(VerifierError::NotImplemented);
        }
        DiscretePatch::Automerge(bytes) => {
            log_warn!("Discrete patch type Automerge not implemented.");
            return Err(VerifierError::NotImplemented);
        }
    }
}

fn convert_discrete_blob_to_orm_object(
    discrete_state: DiscreteState,
) -> Result<(Value, SubscriptionCrdtDetails), VerifierError> {
    match discrete_state {
        DiscreteState::YMap(bytes) => {
            let doc = yrs::Doc::new();

            let update = yrs::Update::decode_v1(&bytes).or(Err(VerifierError::YrsError(
                "Could not decode_v1 YRS document".into(),
            )))?;
            let mut txn = doc.transact_mut();
            txn.apply_update(update);

            let root = doc.get_or_insert_map("ng");
            let root_json = json!(root.to_json(&txn));
            drop(txn);

            return Ok((root_json, SubscriptionCrdtDetails::YMap(doc)));
        }
        DiscreteState::YArray(bytes) => {
            let doc = yrs::Doc::new();

            let update = yrs::Update::decode_v1(&bytes).or(Err(VerifierError::YrsError(
                "Could not decode_v1 YRS document".into(),
            )))?;
            let mut tx = doc.transact_mut();
            tx.apply_update(update);

            let parsed = doc.to_json(&tx);
            drop(tx);

            return Ok((json!(parsed), SubscriptionCrdtDetails::YArray(doc)));
        }
        DiscreteState::YXml(bytes) => {
            log_warn!("YXml not implemented.");
            return Err(VerifierError::NotImplemented);
        }
        DiscreteState::YText(bytes) => {
            log_warn!("YText not implemented.");
            return Err(VerifierError::NotImplemented);
        }
        DiscreteState::Automerge(bytes) => {
            log_warn!("Automerge not implemented.");
            return Err(VerifierError::NotImplemented);
        }
    }
}

fn yrs_out_to_json(value: &Out) -> serde_json::Value {
    match value {
        Out::Any(value) => json!(value),
        _ => {
            log_err!("[yrs_out_to_json] Could not deserialize patch value");
            Value::Null
        }
    }
}

fn convert_and_apply_discrete_blob_patches_yrs(
    patch: &DiscretePatch,
    crdt_details: &SubscriptionCrdtDetails,
) -> Result<Vec<OrmPatch>, VerifierError> {
    let doc = match crdt_details {
        SubscriptionCrdtDetails::YArray(doc) | SubscriptionCrdtDetails::YMap(doc) => doc,
        _ => return Err(VerifierError::InternalError),
    };
    let patches: Rc<RefCell<Vec<OrmPatch>>> = Rc::new(RefCell::new(vec![]));

    fn mutation_callback(
        tx: &yrs::TransactionMut<'_>,
        update_event: &Events,
        patches: &Rc<RefCell<Vec<OrmPatch>>>,
    ) {
        let mut patches = patches.borrow_mut();
        for event in update_event.iter() {
            let base_path = format!(
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
            );

            match event {
                yrs::types::Event::Map(map_event) => {
                    for (key, change) in map_event.keys(tx).iter() {
                        match change {
                            EntryChange::Inserted(new_val) => {
                                patches.push(OrmPatch {
                                    op: OrmPatchOp::add,
                                    path: format!("{base_path}/{key}"),
                                    valType: None,
                                    value: Some(yrs_out_to_json(new_val)),
                                });
                            }
                            EntryChange::Removed(removed) => {
                                patches.push(OrmPatch {
                                    op: OrmPatchOp::remove,
                                    path: format!("{base_path}/{key}"),
                                    valType: None,
                                    value: None,
                                });
                            }
                            EntryChange::Updated(old_val, new_val) => {
                                patches.push(OrmPatch {
                                    op: OrmPatchOp::add,
                                    path: format!("{base_path}/{key}"),
                                    valType: None,
                                    value: Some(yrs_out_to_json(new_val)),
                                });
                            }
                        }
                    }
                }
                yrs::types::Event::Array(array_event) => {
                    let mut pos = 0;
                    for delta in array_event.delta(tx).iter() {
                        match delta {
                            Change::Added(added) => {
                                for new_val in added {
                                    patches.push(OrmPatch {
                                        op: OrmPatchOp::add,
                                        path: format!("{base_path}/{pos}"),
                                        value: Some(yrs_out_to_json(new_val)),
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
                    // return VerifierError::YrsError("Expected map or array change".into());
                }
            };
        }
    }

    match patch {
        DiscretePatch::YMap(bytes) => {
            let map_ref = doc.get_or_insert_map("ng");
            let update = yrs::Update::decode_v1(bytes).or(Err(VerifierError::YrsError(
                "Could not decode_v1 YRS patch".into(),
            )))?;

            let patches_clone = Rc::clone(&patches);
            let observation_key = map_ref.observe_deep(move |tx, ev| {
                mutation_callback(tx, ev, &patches_clone);
            });
            let mut tx = doc.transact_mut();

            // Apply update (triggering the callback that creates the orm patches).
            tx.apply_update(update);
            map_ref.unobserve_deep(observation_key);
        }
        DiscretePatch::YArray(bytes) => {
            let array_ref = doc.get_or_insert_array("ng");
            let update = yrs::Update::decode_v1(bytes).or(Err(VerifierError::YrsError(
                "Could not decode_v1 YRS patch".into(),
            )))?;
            let patches_clone = Rc::clone(&patches);
            array_ref.observe_deep(move |tx, ev| {
                mutation_callback(tx, ev, &patches_clone);
            });
            let mut tx = doc.transact_mut();
            tx.apply_update(update);
        }
        _ => unreachable!(),
    };

    return Ok(Rc::try_unwrap(patches)
        .expect("reference count should be 1")
        .into_inner());
}
