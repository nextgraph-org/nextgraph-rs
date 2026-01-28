// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use automerge::transaction::{Transactable, Transaction};
use automerge::{
    Automerge, ObjId, ObjType, PatchLog, Prop, ReadDoc, ScalarValue, Value as AmValue, ROOT,
};
use ng_net::app_protocol::NuriV0;
use ng_net::orm::{OrmPatch, OrmPatchOp, OrmPatches};
use ng_repo::{errors::VerifierError, log::*, types::BranchId};
use serde_json;
use serde_json::json;
use serde_json::Value as JsonValue;

use crate::orm::types::DiscreteOrmSubscription;
use crate::orm::utils::{decode_json_pointer, escape_json_pointer_segment};
use crate::{orm::types::BackendDiscreteState, types::DiscreteTransaction, verifier::Verifier};

impl Verifier {
    /// Applies blob batches and generates ORM JSON patches.
    pub(crate) fn apply_discrete_automerge_transaction_gen_orm_patches(
        &mut self,
        branch_id: &BranchId,
        patch: &DiscreteTransaction,
    ) -> Result<(Vec<u8>, Vec<OrmPatch>), VerifierError> {
        // Load current AutoMerge document.
        let (_, backend_state) = self
            .discrete_orm_states
            .get_mut(branch_id)
            .ok_or(VerifierError::OrmStateNotFound)?;
        let doc = if let BackendDiscreteState::Automerge(doc) = backend_state {
            doc
        } else {
            return Err(VerifierError::InvalidBranch);
        };

        let nuri = self
            .discrete_orm_subscriptions
            .values()
            .find(|sub| sub.branch_id == *branch_id && !sub.sender.is_closed())
            .map(|sub| sub.nuri.clone())
            .ok_or(VerifierError::OrmSubscriptionNotFound)?;

        let update_bytes = match patch {
            DiscreteTransaction::Automerge(bytes) => bytes,
            _ => {
                return Err(VerifierError::AutomergeError(
                    "Unexpected discrete patch type".into(),
                ))
            }
        };

        let mut patch_log = PatchLog::new(true, automerge::patches::TextRepresentation::String);
        // Apply update_bytes and record changes in patch_log.
        doc.load_incremental_log_patches(update_bytes, &mut patch_log)
            .map_err(|e| VerifierError::AutomergeError(e.to_string()))?;

        let orm_patches = patch_log_to_orm_patches(&mut patch_log, &doc, &nuri);

        // TODO Do We need this?
        let full_state = doc.save();

        Ok((full_state, orm_patches))
    }
}

/// Convert an automerge PatchLog to OrmPatches.
fn patch_log_to_orm_patches(
    patch_log: &mut PatchLog,
    doc: &Automerge,
    nuri: &NuriV0,
) -> Vec<OrmPatch> {
    doc.make_patches(patch_log)
        .iter()
        .flat_map(|patch| {
            let op: Vec<OrmPatch> = match &patch.action {
                automerge::PatchAction::Conflict { prop } => {
                    // Nothing to do
                    vec![]
                }
                automerge::PatchAction::DeleteMap { key } => vec![OrmPatch {
                    op: OrmPatchOp::remove,
                    path: am_path_to_json_pointer(&patch.path, &key),
                    valType: None,
                    value: None,
                }],
                automerge::PatchAction::Increment { prop, value } => {
                    log_warn!(
                        "[automerge_orm] Skipping incoming patch of type Increment: not supported"
                    );
                    vec![]
                }
                automerge::PatchAction::DeleteSeq { index, length } => (*index..(*index + *length))
                    .into_iter()
                    .map(|_i| OrmPatch {
                        op: OrmPatchOp::remove,
                        // We add the same path for each patch so they are collapsed step by step.
                        path: am_path_to_json_pointer(&patch.path, &index.to_string()),
                        valType: None,
                        value: None,
                    })
                    .collect(),
                automerge::PatchAction::Insert { index, values } => values
                    .iter()
                    .enumerate()
                    .map(|(i, (value, id, b))| OrmPatch {
                        op: OrmPatchOp::add,
                        path: am_path_to_json_pointer(&patch.path, &(index + i).to_string()),
                        valType: None,
                        value: Some(am_value_to_json(value, nuri, true, &id)),
                    })
                    .collect(),
                automerge::PatchAction::PutMap {
                    key,
                    value: (value, id),
                    conflict,
                } => vec![OrmPatch {
                    op: OrmPatchOp::add,
                    path: am_path_to_json_pointer(&patch.path, &key),
                    valType: None,
                    value: Some(am_value_to_json(&value, nuri, false, &id)),
                }],
                automerge::PatchAction::PutSeq {
                    index,
                    value: (value, id),
                    conflict,
                } => vec![OrmPatch {
                    op: OrmPatchOp::add,
                    path: am_path_to_json_pointer(&patch.path, &index.to_string()),
                    valType: None,
                    value: Some(am_value_to_json(&value, nuri, true, &id)),
                }],
                automerge::PatchAction::SpliceText {
                    index,
                    value,
                    marks,
                } => {
                    log_warn!(
                        "[automerge_orm] Skipping incoming patch of type SpliceText: not supported"
                    );
                    vec![]
                }
                automerge::PatchAction::Mark { marks } => {
                    log_warn!(
                        "[automerge_orm] Skipping incoming patch of type Mark: not supported"
                    );
                    vec![]
                }
            };
            op
        })
        .collect()
}

fn am_path_to_json_pointer(path: &Vec<(ObjId, Prop)>, key: &String) -> String {
    if path.is_empty() {
        format!("/{}", escape_json_pointer_segment(key))
    } else {
        format!(
            "/{}/{}",
            path.iter()
                .map(|(_id, prop)| match prop {
                    Prop::Map(k) => escape_json_pointer_segment(k),
                    Prop::Seq(i) => i.to_string(),
                })
                .collect::<Vec<_>>()
                .join("/"),
            escape_json_pointer_segment(key)
        )
    }
}

/// Convert string segment (key) to automerge prop (key).
fn parse_prop(segment: &str, obj_id: &ObjId, doc: &Transaction) -> Result<Prop, VerifierError> {
    let obj_type = doc.object_type(obj_id).unwrap();
    match obj_type {
        ObjType::List => {
            if segment == "-" {
                return Ok(Prop::Seq(doc.length(obj_id)));
            }
            if let Ok(index) = segment.parse::<usize>() {
                Ok(Prop::Seq(index))
            } else {
                Err(VerifierError::AutomergeError("Invalid key".into()))
            }
        }
        ObjType::Map | ObjType::Table => Ok(Prop::Map(segment.to_string())),
        ObjType::Text => Err(VerifierError::AutomergeError(
            "Expected different object type".into(),
        )),
    }
}

/// Convert JSON literal to Automerge scalar.
fn scalar_from_json(value: &serde_json::Value) -> Result<ScalarValue, VerifierError> {
    match value {
        serde_json::Value::Null => Ok(ScalarValue::Null),
        serde_json::Value::Bool(b) => Ok(ScalarValue::Boolean(*b)),
        serde_json::Value::Number(num) => {
            if let Some(i) = num.as_i64() {
                Ok(ScalarValue::Int(i))
            } else if let Some(u) = num.as_u64() {
                Ok(ScalarValue::Uint(u))
            } else if let Some(f) = num.as_f64() {
                Ok(ScalarValue::F64(f))
            } else {
                Err(VerifierError::AutomergeError("Unsupported number".into()))
            }
        }
        serde_json::Value::String(s) => Ok(ScalarValue::Str(s.into())),
        _ => Err(VerifierError::AutomergeError(
            "Expected scalar JSON value".into(),
        )),
    }
}

/// Convert Automerge value to JSON value (used for converting patch automerge PatchLog values).
fn am_value_to_json(value: &AmValue, nuri: &NuriV0, parent_arr: bool, id: &ObjId) -> JsonValue {
    match value {
        AmValue::Scalar(scalar) => json!(scalar),
        AmValue::Object(obj_type) => match obj_type {
            ObjType::Map | ObjType::Table => {
                if parent_arr {
                    if let ObjId::Id(_, actor, counter) = id {
                        json!({"@id": nuri.discrete_resource_automerge(actor.to_bytes(), *counter)})
                    } else {
                        json!({})
                    }
                } else {
                    json!({})
                }
            }
            ObjType::List | ObjType::Text => JsonValue::Array(vec![]),
        },
    }
}

/// Converts an automerge object to JSON for materialization.
fn am_object_to_json(
    doc: &Automerge,
    obj_id: &ObjId,
    nuri: &NuriV0,
    parent_arr: bool,
) -> JsonValue {
    let obj_type = match doc.object_type(obj_id) {
        Ok(t) => t,
        Err(e) => {
            log_warn!("[automerge_orm] failed to get object type: {}", e);
            return JsonValue::Null;
        }
    };

    match obj_type {
        ObjType::Map | ObjType::Table => {
            let mut map = serde_json::Map::new();

            if parent_arr {
                if let ObjId::Id(_, actor, counter) = obj_id {
                    map.insert(
                        "@id".to_string(),
                        json!(nuri.discrete_resource_automerge(actor.to_bytes(), *counter)),
                    );
                }
            }

            for key in doc.keys(obj_id) {
                if let Some((val, child)) = doc.get(obj_id, Prop::Map(key.clone())).unwrap() {
                    let json_val = match val {
                        AmValue::Scalar(scalar) => json!(scalar),
                        AmValue::Object(_obj_type) => am_object_to_json(doc, &child, nuri, false),
                    };
                    map.insert(key.clone(), json_val);
                }
            }

            JsonValue::Object(map)
        }
        ObjType::List => {
            let len = doc.length(obj_id);
            let mut items = Vec::with_capacity(len);
            for idx in 0..len {
                if let Some((val, child)) = doc.get(obj_id, Prop::Seq(idx)).unwrap() {
                    let json_val = match val {
                        AmValue::Scalar(scalar) => json!(&scalar),
                        AmValue::Object(_obj_type) => am_object_to_json(doc, &child, nuri, true),
                    };
                    items.push(json_val);
                }
            }
            JsonValue::Array(items)
        }
        ObjType::Text => match doc.text(obj_id) {
            Ok(text) => JsonValue::String(text),
            Err(e) => {
                log_warn!("[automerge_orm] failed to read text: {}", e);
                JsonValue::String(String::new())
            }
        },
    }
}

pub(crate) fn automerge_doc_to_json(doc: &Automerge, nuri: &NuriV0) -> JsonValue {
    am_object_to_json(doc, &ROOT.into(), nuri, false)
}

fn apply_orm_patch(txn: &mut Transaction, patch: &OrmPatch) -> Result<(), VerifierError> {
    let parsed_path: Vec<String> = patch
        .path
        .split('/')
        .skip(1)
        .map(|segment| decode_json_pointer(&segment.to_string()))
        .collect();

    // If the path is empty, patch.op == add, and patch.value = {},
    // this means we nee to replace the root
    if parsed_path.is_empty()
        && patch.op == OrmPatchOp::add
        && matches!(patch.value, Some(JsonValue::Object(_)))
    {
        let keys: Vec<String> = txn.keys(ROOT).collect();
        for key in keys {
            txn.delete(ROOT, Prop::Map(key))
                .map_err(|e| VerifierError::AutomergeError(e.to_string()))?;
        }
        return Ok(());
    }

    // Get the object (+ key) we need to apply the patch on to.
    let (parent_obj_id, key) = resolve_path(&txn, &parsed_path)?;

    match patch.op {
        OrmPatchOp::add => {
            let value = match &patch.value {
                Some(v) => v,
                None => {
                    log_warn!("Add patch without value, skipping");
                    return Ok(());
                }
            };

            // NOTE: we assume that added json arrays and objects are always empty
            // and that additions to the objects come in subsequent steps
            // (hence no need to deeply inspect patch.value).
            match key {
                // If parent is in array, `insert`.
                Prop::Seq(idx) => match value {
                    JsonValue::Array(_values) => {
                        txn.insert_object(parent_obj_id, idx, ObjType::List)
                            .map_err(|e| VerifierError::AutomergeError(e.to_string()))?;
                    }
                    JsonValue::Object(_obj) => {
                        txn.insert_object(parent_obj_id, idx, ObjType::Map)
                            .map_err(|e| VerifierError::AutomergeError(e.to_string()))?;
                    }
                    _ => {
                        txn.insert(parent_obj_id, idx, scalar_from_json(value)?)
                            .map_err(|e| VerifierError::AutomergeError(e.to_string()))?;
                    }
                },
                // If parent is in object, `put`.
                Prop::Map(_) => match value {
                    JsonValue::Array(_values) => {
                        txn.put_object(parent_obj_id, key, ObjType::List)
                            .map_err(|e| VerifierError::AutomergeError(e.to_string()))?;
                    }
                    JsonValue::Object(_obj) => {
                        txn.put_object(parent_obj_id, key, ObjType::Map)
                            .map_err(|e| VerifierError::AutomergeError(e.to_string()))?;
                    }
                    _ => {
                        txn.put(parent_obj_id, key, scalar_from_json(value)?)
                            .map_err(|e| VerifierError::AutomergeError(e.to_string()))?;
                    }
                },
            };
        }
        OrmPatchOp::remove => {
            txn.delete(parent_obj_id, key).map_err(|e| {
                VerifierError::AutomergeError(format!(
                    "[automerge_orm] error occurred while applying remove patch: {}",
                    e.to_string(),
                ))
            })?;
        }
    };
    Ok(())
}

/// Returns the parent of the leaf object id and the Prop (key) to the leaf.
fn resolve_path(doc: &Transaction, path: &[String]) -> Result<(ObjId, Prop), VerifierError> {
    let mut current_obj: ObjId = ROOT.into();

    // Navigate to the parent element of patch leaf.
    for seg in path.iter().take(path.len().saturating_sub(1)) {
        let key = parse_prop(seg, &current_obj, doc)?;

        let (val, child) = doc
            .get(&current_obj, key)
            .map_err(|e| VerifierError::AutomergeError(e.to_string()))?
            .ok_or_else(|| VerifierError::AutomergeError("Path does not exist".into()))?;

        // Descend if it's not a scalar.
        if let AmValue::Object(_) = val {
            current_obj = child;
        } else {
            return Err(VerifierError::AutomergeError(
                "Path traverses non-object/array".into(),
            ));
        }
    }
    let leaf_key = parse_prop(
        path.last()
            .ok_or_else(|| VerifierError::AutomergeError("Empty path".into()))?,
        &current_obj,
        doc,
    )?;

    Ok((current_obj, leaf_key))
}

pub(crate) fn automerge_handle_frontend_discrete_update(
    patches: OrmPatches,
    orm_subscription: &DiscreteOrmSubscription,
    doc: &mut Automerge,
) -> Result<
    (
        DiscreteTransaction,
        Vec<ng_net::orm::OrmPatch>,
        NuriV0,
        ng_repo::types::PubKey,
        Vec<u8>,
    ),
    VerifierError,
> {
    // Start a transaction on the doc recording the patches.
    let patch_log = PatchLog::new(true, automerge::patches::TextRepresentation::String);
    let mut transaction = doc.transaction_log_patches(patch_log);
    let nuri = orm_subscription.nuri.clone();

    for patch in patches {
        apply_orm_patch(&mut transaction, &patch)?;
    }

    // Commit transaction.
    let (change_hash, mut patch_log) = transaction.commit();

    // Create the patches to send back to the other subscribers.
    let resulting_orm_patches = patch_log_to_orm_patches(&mut patch_log, &doc, &nuri);

    let branch_id = orm_subscription.branch_id;

    let transaction_bytes = if let Some(change_hash) = change_hash {
        let change = doc.get_change_by_hash(&change_hash).unwrap();
        change.to_owned().bytes().into_owned()
    } else {
        vec![]
    };

    let full_state = doc.save();

    Ok((
        DiscreteTransaction::Automerge(transaction_bytes), // consume Cow into owned bytes if the variant is Vec<u8>
        resulting_orm_patches,
        nuri,
        branch_id,
        full_state,
    ))
}
