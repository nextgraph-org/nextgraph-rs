// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use automerge::transaction::Transactable;
use automerge::{
    Automerge, ObjId, ObjType, PatchLog, Prop, ReadDoc, ScalarValue, Value as AmValue, ROOT,
};
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
        let backend_state = self
            .discrete_orm_states
            .get_mut(branch_id)
            .ok_or(VerifierError::OrmStateNotFound)?;
        let doc = if let BackendDiscreteState::Automerge(doc) = backend_state {
            doc
        } else {
            return Err(VerifierError::InvalidBranch);
        };

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

        let orm_patches = patch_log_to_orm_patches(&patch_log, &doc);

        // TODO Do We need this?
        let full_state = doc.save();

        Ok((full_state, orm_patches))
    }
}

fn patch_log_to_orm_patches(patch_log: &mut PatchLog, doc: &Automerge) -> Vec<OrmPatch> {
    doc.make_patches(patch_log)
        .iter()
        .flat_map(|patch| {
            let op: Vec<OrmPatch> = match patch.action {
                automerge::PatchAction::Conflict { prop } => {
                    // Nothing to do
                    vec![]
                }
                automerge::PatchAction::DeleteMap { key } => vec![OrmPatch {
                    op: OrmPatchOp::remove,
                    path: a_path_to_json_pointer(&patch.path, &key),
                    valType: None,
                    value: None,
                }],
                automerge::PatchAction::Increment { prop, value } => {
                    log_warn!(
                        "[automerge_orm] Skipping incoming patch of type Increment: not supported"
                    );
                    vec![]
                }
                automerge::PatchAction::DeleteSeq { index, length } => (index..(index + length))
                    .into_iter()
                    .map(|_i| OrmPatch {
                        op: OrmPatchOp::remove,
                        // We add the same path for each patch so they are collapsed step by step.
                        path: a_path_to_json_pointer(&patch.path, &index.to_string()),
                        valType: None,
                        value: None,
                    })
                    .collect(),
                automerge::PatchAction::Insert { index, values } => values
                    .iter()
                    .enumerate()
                    .map(|(i, (value, id, b))| OrmPatch {
                        op: OrmPatchOp::add,
                        path: a_path_to_json_pointer(&patch.path, &i.to_string()),
                        valType: None,
                        value: Some(am_value_to_json(value)),
                    })
                    .collect(),
                automerge::PatchAction::PutMap {
                    key,
                    value: (value, _id),
                    conflict,
                } => vec![OrmPatch {
                    op: OrmPatchOp::add,
                    path: a_path_to_json_pointer(&patch.path, &key),
                    valType: None,
                    value: Some(am_value_to_json(&value)),
                }],
                automerge::PatchAction::PutSeq {
                    index,
                    value: (value, _id),
                    conflict,
                } => vec![OrmPatch {
                    op: OrmPatchOp::add,
                    path: a_path_to_json_pointer(&patch.path, &index.to_string()),
                    valType: None,
                    value: Some(am_value_to_json(&value)),
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

fn a_path_to_json_pointer(path: &Vec<(ObjId, Prop)>, key: &String) -> String {
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

fn parse_prop(segment: &str) -> Result<Prop, VerifierError> {
    if let Ok(index) = segment.parse::<usize>() {
        Ok(Prop::Seq(index))
    } else {
        Ok(Prop::Map(segment.to_string()))
    }
}

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

fn am_value_to_json(value: &AmValue) -> JsonValue {
    match value {
        AmValue::Scalar(scalar) => json!(scalar),
        AmValue::Object(obj_type) => match obj_type {
            ObjType::Map | ObjType::Table => JsonValue::Object(Default::default()),
            ObjType::List | ObjType::Text => JsonValue::Array(vec![]),
        },
    }
}

pub(crate) fn apply_automerge_add_patch(
    doc: &mut Automerge,
    path: &[String],
    value: &Value,
) -> Result<(), VerifierError> {
    todo!();

    Ok(())
}

pub(crate) fn apply_automerge_remove_patch(
    doc: &mut Automerge,
    path: &[String],
) -> Result<(), VerifierError> {
    todo!();
    Ok(())
}

pub(crate) fn automerge_handle_fronted_discrete_update(
    patches: OrmPatches,
    orm_subscription: &DiscreteOrmSubscription,
    doc: &mut Automerge,
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
    // Start a transaction on the doc recording the patches.
    let mut patch_log = PatchLog::new(true, automerge::patches::TextRepresentation::String);
    let transaction = doc.transaction_log_patches(patch_log);

    for patch in patches {
        let parsed_path: Vec<String> = patch
            .path
            .split('/')
            .skip(1)
            .map(|segment| decode_json_pointer(&segment.to_string()))
            .collect();

        if patch.op == OrmPatchOp::add {
            let value = match &patch.value {
                Some(v) => v,
                None => {
                    log_warn!("Add patch without value, skipping");
                    continue;
                }
            };

            apply_automerge_add_patch(doc, &parsed_path, value)?;
        } else {
            apply_automerge_remove_patch(doc, &parsed_path)?;
        }
    }

    // Commit transaction.
    let (_change_hash, patch_log) = transaction.commit();

    // Create the patches to send back to the other subscribers.
    let resulting_orm_patches = patch_log_to_orm_patches(&patch_log, &doc);

    let nuri = orm_subscription.nuri.clone();
    let branch_id = orm_subscription.branch_id;

    Ok((
        DiscreteTransaction::Automerge(transaction_bytes),
        resulting_orm_patches,
        nuri,
        branch_id,
        full_state,
    ))
}
