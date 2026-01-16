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
use std::collections::HashMap;
use std::rc::Rc;

use futures::channel::mpsc;
use futures::SinkExt;
use ng_net::orm::{OrmPatchOp, OrmPatches};
use ng_net::utils::Receiver;
use ng_net::{app_protocol::*, orm::OrmPatch};
use ng_repo::errors::{StorageError, VerifierError};
use ng_repo::log::*;
use ng_repo::types::*;
use serde_json::{json, Value};
use yrs::types::{Change, EntryChange, Events, PathSegment, ToJson};
use yrs::updates::decoder::Decode;
use yrs::{Any, Array, ArrayPrelim, DeepObservable, In, Map, MapPrelim, Out, ReadTxn, Transact};

use crate::orm::types::{BackendDiscreteState, DiscreteOrmSubscription};
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

        let orm_subscription = DiscreteOrmSubscription {
            nuri,
            branch_id,
            subscription_id: self.discrete_orm_subscription_counter,
            sender: tx.clone(),
        };

        let orm_object = if let Some(state) = self.discrete_orm_states.get(&branch_id) {
            convert_discrete_state_to_orm_object(state)
        } else {
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

            let (orm_object, backend_state) = if let Some(discrete_state) = state {
                convert_discrete_blob_to_orm_object(discrete_state)?
            } else {
                match crdt {
                    BranchCrdt::YMap(_) => (
                        serde_json::Value::Object(serde_json::map::Map::new()),
                        BackendDiscreteState::YMap(yrs::Doc::new()),
                    ),
                    BranchCrdt::YArray(_) => (
                        serde_json::Value::Array(vec![]),
                        BackendDiscreteState::YArray(yrs::Doc::new()),
                    ),
                    BranchCrdt::Automerge(_) | BranchCrdt::YText(_) | BranchCrdt::YXml(_) => {
                        return Err(VerifierError::NotImplemented)
                    }
                    _ => return Err(VerifierError::InvalidBranch),
                }
            };

            self.discrete_orm_states.insert(branch_id, backend_state);
            orm_object
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

    /// Sends patches to fronend if they don't originate from the same subscriber.
    pub(crate) async fn push_orm_discrete_update(
        &mut self,
        orm_patches: Vec<OrmPatch>,
        subscription_id: u64,
        branch_id: &BranchId,
    ) -> Result<(), VerifierError> {
        // Clean up and remove old subscriptions
        self.discrete_orm_subscriptions
            .retain(|_k, sub| !sub.sender.is_closed());

        if orm_patches.is_empty() {
            return Ok(());
        }

        let update = AppResponse::V0(AppResponseV0::DiscreteOrmUpdate(orm_patches));

        for (id, sub) in self.discrete_orm_subscriptions.iter_mut() {
            if *id != subscription_id && sub.branch_id == *branch_id {
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

        let (transaction, resulting_orm_patches, nuri, branch_id, full_state) = {
            let orm_subscription = self
                .discrete_orm_subscriptions
                .get_mut(&subscription_id)
                .ok_or(VerifierError::OrmSubscriptionNotFound)?;

            let backend_state = self
                .discrete_orm_states
                .get(&orm_subscription.branch_id)
                .ok_or(VerifierError::OrmStateNotFound)?;

            let (BackendDiscreteState::YMap(doc) | BackendDiscreteState::YArray(doc)) =
                backend_state;

            let is_array = matches!(backend_state, BackendDiscreteState::YArray(_));

            let resulting_orm_patches: Rc<RefCell<Vec<OrmPatch>>> = Rc::new(RefCell::new(vec![]));
            let (observation, root) = if is_array {
                let array_ref = doc.get_or_insert_array("ng");
                let patches_clone = Rc::clone(&resulting_orm_patches);
                (
                    array_ref.observe_deep(move |tx, ev| {
                        yrs_mutation_callback(tx, ev, &patches_clone);
                    }),
                    YrsTarget::Array(array_ref),
                )
            } else {
                let map_ref = doc.get_or_insert_map("ng");
                let patches_clone = Rc::clone(&resulting_orm_patches);
                (
                    map_ref.observe_deep(move |tx, ev| {
                        yrs_mutation_callback(tx, ev, &patches_clone);
                    }),
                    YrsTarget::Map(map_ref),
                )
            };
            let mut tx: yrs::TransactionMut<'_> = doc.transact_mut();
            for patch in patches {
                log_info!("*** processing patch {:?}", patch);
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

            log_info!("resulting_orm_patches {:?}", resulting_orm_patches);

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

            (
                transaction,
                resulting_orm_patches,
                nuri,
                branch_id,
                full_state,
            )
        };
        log_info!("pushing to {} {}", subscription_id, branch_id);
        self.push_orm_discrete_update(resulting_orm_patches, subscription_id, &branch_id)
            .await?;
        //TODO: deal with cases when the resulting_orm_patches is different from patches (received). We need to send the diff to subscription_id

        self.create_discrete_transaction(transaction, &nuri, Some(full_state))
            .await?;

        Ok(())
    }

    /// Handles changes coming from CRDT transaction.
    pub(crate) fn apply_discrete_transaction_gen_orm_patches(
        &self,
        branch_id: &BranchId,
        patch: &DiscreteTransaction,
    ) -> Result<(Vec<u8>, Vec<OrmPatch>), VerifierError> {
        match patch {
            DiscreteTransaction::YMap(_) => {
                self.apply_discrete_yjs_transaction_gen_orm_patches(branch_id, patch)
            }
            DiscreteTransaction::YArray(_) => {
                self.apply_discrete_yjs_transaction_gen_orm_patches(branch_id, patch)
            }
            DiscreteTransaction::YXml(_) => {
                log_warn!("Discrete patch type YXml not implemented.");
                return Err(VerifierError::NotImplemented);
            }
            DiscreteTransaction::YText(_) => {
                log_warn!("Discrete patch type YText not implemented.");
                return Err(VerifierError::NotImplemented);
            }
            DiscreteTransaction::Automerge(_) => {
                log_warn!("Discrete patch type Automerge not implemented.");
                return Err(VerifierError::NotImplemented);
            }
        }
    }

    fn apply_discrete_yjs_transaction_gen_orm_patches(
        &self,
        branch_id: &BranchId,
        patch: &DiscreteTransaction,
    ) -> Result<(Vec<u8>, Vec<OrmPatch>), VerifierError> {
        let backend_state = self
            .discrete_orm_states
            .get(branch_id)
            .ok_or(VerifierError::OrmStateNotFound)?;

        let (BackendDiscreteState::YMap(doc) | BackendDiscreteState::YArray(doc)) = backend_state;

        let is_array = matches!(backend_state, BackendDiscreteState::YArray(_));
        let resulting_orm_patches: Rc<RefCell<Vec<OrmPatch>>> = Rc::new(RefCell::new(vec![]));
        let observation = if is_array {
            let array_ref = doc.get_or_insert_array("ng");
            let patches_clone = Rc::clone(&resulting_orm_patches);
            array_ref.observe_deep(move |tx, ev| {
                yrs_mutation_callback(tx, ev, &patches_clone);
            })
        } else {
            let map_ref = doc.get_or_insert_map("ng");
            let patches_clone = Rc::clone(&resulting_orm_patches);
            map_ref.observe_deep(move |tx, ev| {
                yrs_mutation_callback(tx, ev, &patches_clone);
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

/// Converts a serde_json::Value to a yrs::Any value.
fn json_value_to_yrs_any(value: &serde_json::Value) -> In {
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
            // let prelim_items = _arr.iter().map(json_value_to_yrs_any).collect::<Vec<_>>();
            // In::Array(ArrayPrelim::from(prelim_items))
            In::Array(ArrayPrelim::default())
        }
        Value::Object(_obj) => {
            // let prelim_entries = _obj
            //     .iter()
            //     .map(|(k, v)| (k.clone(), json_value_to_yrs_any(v)));
            // In::Map(MapPrelim::from_iter(prelim_entries))
            In::Map(MapPrelim::default())
        }
    }
}

/// Represents a target location in the YRS document tree.
#[derive(Debug)]
enum YrsTarget {
    Map(yrs::MapRef),
    Array(yrs::ArrayRef),
}

impl Clone for YrsTarget {
    fn clone(&self) -> Self {
        match self {
            Self::Map(m) => Self::Map(m.clone()),
            Self::Array(m) => Self::Array(m.clone()),
        }
    }
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

    log_info!("parent_path {:?}", parent_path);
    for (i, segment) in parent_path.iter().enumerate() {
        log_info!("processing path {segment}");
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
    log_info!("end of loop {:?}", current);
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
                // if let In::Array(items) = value {
                //     arr.insert_range(txn, 0, items.iter().cloned());
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
                // ...and insert new ones.
                if let In::Map(entries) = value {
                    for (k, v) in entries.iter() {
                        map.insert(txn, k.clone(), v.clone());
                    }
                }
            } else {
                return Err(VerifierError::YrsError("root is not a map".into()));
            }
        }
        return Ok(());
    }

    // Get the root container

    let (parent, key) = navigate_to_parent_from_target(txn, root, path)?;

    log_info!("found {:?} {}", parent, key);

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

fn convert_discrete_state_to_orm_object(discrete_state: &BackendDiscreteState) -> Value {
    match discrete_state {
        BackendDiscreteState::YArray(doc) => {
            let root = doc.get_or_insert_array("ng");
            let txn = doc.transact();
            json!(root.to_json(&txn))
        }
        BackendDiscreteState::YMap(doc) => {
            let root = doc.get_or_insert_map("ng");
            let txn = doc.transact();
            json!(root.to_json(&txn))
        }
    }
}

fn convert_discrete_blob_to_orm_object(
    discrete_state: DiscreteState,
) -> Result<(Value, BackendDiscreteState), VerifierError> {
    match discrete_state {
        DiscreteState::YMap(bytes) => {
            let doc = yrs::Doc::new();
            let root = doc.get_or_insert_map("ng");
            let update = yrs::Update::decode_v1(&bytes)
                .map_err(|e| VerifierError::YrsError(e.to_string()))?;
            let mut txn = doc.transact_mut();
            txn.apply_update(update);

            let root_json = json!(root.to_json(&txn));
            drop(txn);

            return Ok((root_json, BackendDiscreteState::YMap(doc)));
        }
        DiscreteState::YArray(bytes) => {
            let doc = yrs::Doc::new();
            let root = doc.get_or_insert_array("ng");
            let update = yrs::Update::decode_v1(&bytes)
                .map_err(|e| VerifierError::YrsError(e.to_string()))?;
            let mut tx = doc.transact_mut();
            tx.apply_update(update);

            let root_json = json!(root.to_json(&tx));
            drop(tx);

            return Ok((root_json, BackendDiscreteState::YArray(doc)));
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

fn yrs_out_to_json(tx: &yrs::TransactionMut<'_>, value: &Out) -> serde_json::Value {
    match value {
        Out::Any(value) => json!(value),
        Out::YMap(map) => json!(map.to_json(tx)),
        Out::YArray(array) => json!(array.to_json(tx)),
        _ => {
            log_err!("[yrs_out_to_json] Could not deserialize patch value");
            Value::Null
        }
    }
}

pub(crate) fn yrs_mutation_callback(
    tx: &yrs::TransactionMut<'_>,
    update_event: &Events,
    patches: &Rc<RefCell<Vec<OrmPatch>>>,
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
                for (key, change) in map_event.keys(tx).iter() {
                    match change {
                        EntryChange::Inserted(new_val) => {
                            patches.push(OrmPatch {
                                op: OrmPatchOp::add,
                                path: format!("{base_path}/{key}"),
                                valType: None,
                                value: Some(yrs_out_to_json(tx, new_val)),
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
                                value: Some(yrs_out_to_json(tx, new_val)),
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
                                    value: Some(yrs_out_to_json(tx, new_val)),
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
