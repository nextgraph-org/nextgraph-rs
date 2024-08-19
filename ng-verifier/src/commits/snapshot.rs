// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use crate::verifier::Verifier;
use ng_net::app_protocol::NuriTargetV0;
use ng_oxigraph::oxigraph::sparql::{Query, QueryResults};
use ng_repo::errors::{StorageError, VerifierError};
use ng_repo::types::*;
use serde_json::json;
use yrs::types::ToJson;
use yrs::updates::decoder::Decode;
use yrs::{GetString, Transact};

impl Verifier {
    pub(crate) fn take_snapshot(
        &self,
        crdt: &BranchCrdt,
        branch_id: &BranchId,
        target: &NuriTargetV0,
    ) -> Result<String, VerifierError> {
        let state = match self
            .user_storage
            .as_ref()
            .unwrap()
            .branch_get_discrete_state(branch_id)
        {
            Ok(s) => Ok(s),
            Err(StorageError::NoDiscreteState) => Ok(vec![]),
            Err(e) => Err(e),
        }?;

        let discrete = if state.is_empty() {
            serde_json::Value::Null
        } else {
            match crdt {
                BranchCrdt::Automerge(_) => {
                    let doc = automerge::Automerge::load(&state)
                        .map_err(|e| VerifierError::AutomergeError(e.to_string()))?;

                    serde_json::json!(automerge::AutoSerde::from(&doc))
                }
                BranchCrdt::YText(_) => {
                    let doc = yrs::Doc::new();
                    let text = doc.get_or_insert_text("ng");
                    let mut txn = doc.transact_mut();
                    let update = yrs::Update::decode_v1(&state)
                        .map_err(|e| VerifierError::YrsError(e.to_string()))?;
                    txn.apply_update(update);
                    serde_json::Value::from(text.get_string(&txn))
                }
                BranchCrdt::YArray(_) => {
                    let doc = yrs::Doc::new();
                    let array = doc.get_or_insert_array("ng");
                    let mut txn = doc.transact_mut();
                    let update = yrs::Update::decode_v1(&state)
                        .map_err(|e| VerifierError::YrsError(e.to_string()))?;
                    txn.apply_update(update);
                    let mut json = String::new();
                    array.to_json(&txn).to_json(&mut json);

                    serde_json::from_str(&json).map_err(|_| VerifierError::InvalidJson)?
                }
                BranchCrdt::YMap(_) => {
                    let doc = yrs::Doc::new();
                    let map = doc.get_or_insert_map("ng");
                    let mut txn = doc.transact_mut();
                    let update = yrs::Update::decode_v1(&state)
                        .map_err(|e| VerifierError::YrsError(e.to_string()))?;
                    txn.apply_update(update);
                    let mut json = String::new();
                    map.to_json(&txn).to_json(&mut json);
                    serde_json::from_str(&json).map_err(|_| VerifierError::InvalidJson)?
                }
                BranchCrdt::YXml(_) => {
                    // TODO: if it is markdown, output the markdown instead of XML
                    let doc = yrs::Doc::new();
                    let xml = doc.get_or_insert_xml_fragment("prosemirror");
                    let mut txn = doc.transact_mut();
                    let update = yrs::Update::decode_v1(&state)
                        .map_err(|e| VerifierError::YrsError(e.to_string()))?;
                    txn.apply_update(update);
                    serde_json::json!({"xml":xml.get_string(&txn)})
                }
                _ => return Err(VerifierError::InvalidBranch),
            }
        };

        let store = self.graph_dataset.as_ref().unwrap();
        let parsed = Query::parse("CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }", None).unwrap();
        let results = store
            .query(parsed, self.resolve_target_for_sparql(target, true)?)
            .map_err(|e| VerifierError::OxigraphError(e.to_string()))?;
        let results = if let QueryResults::Graph(quads) = results {
            let mut results = Vec::with_capacity(quads.size_hint().0);
            for quad in quads {
                match quad {
                    Err(e) => return Err(VerifierError::OxigraphError(e.to_string())),
                    Ok(triple) => results.push(triple.to_string()),
                }
            }
            results
        } else {
            return Err(VerifierError::OxigraphError(
                "Invalid Oxigraph query result".to_string(),
            ));
        };

        let res = json!({
           "discrete": discrete,
           "graph": results,
        });

        Ok(serde_json::to_string(&res).unwrap())
    }
}
