// Copyright (c) 2026 Laurin Weger, Niko Bonnieure, Par le Peuple, NextGraph.org developers
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
use ng_net::utils::Receiver;
use ng_net::{app_protocol::*, orm::OrmPatch};
use ng_repo::errors::{StorageError, VerifierError};
use ng_repo::log::*;
use ng_repo::types::*;
use serde_json::{json, Map as JsonMap, Value};
use yrs::types::{Change, EntryChange, Events, PathSegment};
use yrs::updates::decoder::Decode;
use yrs::{DeepObservable, Out, ReadTxn, Transact};

use crate::orm::discrete::automerge_orm::{
    apply_automerge_add_patch, apply_automerge_remove_patch, automerge_doc_to_json,
    json_diff_to_orm_patches,
};
use crate::orm::discrete::yrs_orm::{
    apply_yrs_add_patch, apply_yrs_remove_patch, json_value_to_yrs_in,
    yrs_handle_frontend_discrete_update, yrs_mutation_callback, yrs_out_to_json, YrsTarget,
};
use crate::orm::types::{BackendDiscreteState, DiscreteOrmSubscription};
use crate::types::{CancelFn, DiscreteTransaction};

use crate::verifier::Verifier;

impl Verifier {
    /// Opens a new discrete orm subscription for the document of the given NURI.
    /// The document is expected to have a CRDT type and otherwise fails.
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
            // If there is a subscription for this document already, we only need to materialize the loaded discrete state.
            convert_discrete_state_to_orm_object(state, &orm_subscription.nuri)?
        } else {
            // Create a new session.
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
                // Materialize state.
                convert_discrete_blob_to_orm_object(discrete_state, &orm_subscription.nuri)?
            } else {
                // No data yet. Create a new CRDT state (and empty JSON object).
                match crdt {
                    BranchCrdt::YMap(_) => (
                        serde_json::Value::Object(serde_json::map::Map::new()),
                        BackendDiscreteState::YMap(yrs::Doc::new()),
                    ),
                    BranchCrdt::YArray(_) => (
                        serde_json::Value::Array(vec![]),
                        BackendDiscreteState::YArray(yrs::Doc::new()),
                    ),
                    BranchCrdt::Automerge(_) => (
                        serde_json::Value::Object(serde_json::map::Map::new()),
                        BackendDiscreteState::Automerge(automerge::Automerge::new()),
                    ),
                    BranchCrdt::YText(_) | BranchCrdt::YXml(_) => {
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

    /// Sends patches to frontend if they don't originate from the same subscriber.
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

        // We create patches for the frontend so they can use IDs for objects in arrays.
        // This is handy, if you want to refer to objects in a different array somewhere.
        let mut orm_patches_for_ids: Option<Vec<OrmPatch>> = if subscription_id != 0 {
            let mut patches: Vec<_> = vec![];
            // orm_patches
            //     .iter()
            //     .filter(|p| p.op == OrmPatchOp::add && p.path.ends_with("/@id"))
            //     .cloned()
            //     .collect();

            for p in orm_patches.iter() {
                if p.op == OrmPatchOp::add && p.value.is_some() {
                    let v = p.value.as_ref().unwrap();
                    if v.is_array() {
                        for (index, o) in v.as_array().unwrap().iter().enumerate() {
                            if o.is_object() {
                                if let Some(id) = o.as_object().unwrap().get("@id") {
                                    patches.push(OrmPatch {
                                        op: OrmPatchOp::add,
                                        valType: None,
                                        path: format!("{}/{}/@id", p.path, index),
                                        value: Some(id.clone()),
                                    })
                                }
                            }
                        }
                    } else if v.is_object() {
                        if let Some(id) = v.as_object().unwrap().get("@id") {
                            patches.push(OrmPatch {
                                op: OrmPatchOp::add,
                                valType: None,
                                path: format!("{}/@id", p.path),
                                value: Some(id.clone()),
                            })
                        }
                    }
                }
            }
            Some(patches)
        } else {
            None
        };

        let update = AppResponse::V0(AppResponseV0::DiscreteOrmUpdate(orm_patches));

        // Iterate over all subscriptions to send updates to.
        for (id, sub) in self.discrete_orm_subscriptions.iter_mut() {
            if *id == subscription_id {
                // Send auto-generated @id patches back to the origin subscriber.
                let orm_patches = orm_patches_for_ids.take();
                if orm_patches.is_some() && !orm_patches.as_ref().unwrap().is_empty() {
                    let update =
                        AppResponse::V0(AppResponseV0::DiscreteOrmUpdate(orm_patches.unwrap()));
                    let _ = sub.sender.send(update.clone()).await;
                }
            } else if sub.branch_id == *branch_id {
                let _ = sub.sender.send(update.clone()).await;
            }
        }
        Ok(())
    }

    /// Handles JS-land (JSON) patches.
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
                .get_mut(&orm_subscription.branch_id)
                .ok_or(VerifierError::OrmStateNotFound)?;

            match backend_state {
                BackendDiscreteState::YMap(doc) | BackendDiscreteState::YArray(doc) => {
                    yrs_handle_frontend_discrete_update(
                        patches,
                        orm_subscription,
                        doc,
                        matches!(backend_state, BackendDiscreteState::YArray(_)),
                    )?
                }
                BackendDiscreteState::Automerge(doc) => {
                    automerge_handle_frontend_discrete_update(patches, orm_subscription, doc)?
                }
            }
        };

        // == Send updates to other subscribers ==
        self.push_orm_discrete_update(resulting_orm_patches, subscription_id, &branch_id)
            .await?;

        //TODO: deal with cases when the resulting_orm_patches is different from patches (received). We need to send the diff to subscription_id

        // == Record change (create a Commit, and process it) ==
        self.create_discrete_transaction(transaction, &nuri, Some(full_state))
            .await?;

        Ok(())
    }

    /// Handles changes coming from CRDT transaction.
    pub(crate) fn apply_discrete_transaction_gen_orm_patches(
        &mut self,
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
                self.apply_discrete_automerge_transaction_gen_orm_patches(branch_id, patch)
            }
        }
    }
}

/// Creates a JSON object from an existing discrete state.
fn convert_discrete_state_to_orm_object(
    discrete_state: &BackendDiscreteState,
    nuri: &NuriV0,
) -> Result<Value, VerifierError> {
    match discrete_state {
        BackendDiscreteState::YArray(doc) => {
            let root = doc.get_or_insert_array("ng");
            let txn = doc.transact_mut();
            let val = yrs_out_to_json(&txn, &Out::YArray(root), nuri, false);
            drop(txn);
            Ok(val)
        }
        BackendDiscreteState::YMap(doc) => {
            let root = doc.get_or_insert_map("ng");
            let txn = doc.transact_mut();
            let val = yrs_out_to_json(&txn, &Out::YMap(root), nuri, false);
            drop(txn);
            Ok(val)
        }
        BackendDiscreteState::Automerge(doc) => automerge_doc_to_json(doc),
    }
}

/// Materializes blob to json
fn convert_discrete_blob_to_orm_object(
    blob: DiscreteState,
    nuri: &NuriV0,
) -> Result<(Value, BackendDiscreteState), VerifierError> {
    match blob {
        DiscreteState::YMap(bytes) => {
            let doc = yrs::Doc::new();
            let root = doc.get_or_insert_map("ng"); // Ref is always stored under "ng".

            let update = yrs::Update::decode_v1(&bytes)
                .map_err(|e| VerifierError::YrsError(e.to_string()))?;
            let mut txn = doc.transact_mut();
            txn.apply_update(update);

            let root_json = yrs_out_to_json(&txn, &Out::YMap(root), nuri, false);
            drop(txn);

            return Ok((root_json, BackendDiscreteState::YMap(doc)));
        }
        DiscreteState::YArray(bytes) => {
            let doc = yrs::Doc::new();
            let root = doc.get_or_insert_array("ng");
            let update = yrs::Update::decode_v1(&bytes)
                .map_err(|e| VerifierError::YrsError(e.to_string()))?;
            let mut txn = doc.transact_mut();
            txn.apply_update(update);

            let root_json = yrs_out_to_json(&txn, &Out::YArray(root), nuri, false);
            drop(txn);

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
            let mut doc = automerge::Automerge::load(&bytes)
                .map_err(|e| VerifierError::AutomergeError(e.to_string()))?;
            let root_json = automerge_doc_to_json(&doc)?;
            return Ok((root_json, BackendDiscreteState::Automerge(doc)));
        }
    }
}
