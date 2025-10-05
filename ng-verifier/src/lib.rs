// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

pub mod types;

pub mod site;

#[doc(hidden)]
pub mod verifier;

mod user_storage;

mod commits;

pub(crate) mod orm;

mod request_processor;

mod inbox_processor;

#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
mod rocksdb_user_storage;

use ng_net::app_protocol::*;
use ng_oxigraph::oxrdf::Triple;
use ng_repo::errors::NgError;

pub fn triples_ser_to_json_string(ser: &Vec<u8>) -> Result<String, String> {
    let triples: Vec<Triple> = serde_bare::from_slice(ser)
        .map_err(|_| "Deserialization error of Vec<Triple>".to_string())?;

    let mut triples_json: Vec<serde_json::Value> = Vec::with_capacity(triples.len());
    for insert in triples {
        triples_json.push(serde_json::Value::String(insert.to_string()));
    }
    let triples_json = serde_json::Value::Array(triples_json);
    serde_json::to_string(&triples_json)
        .map_err(|_| "Cannot serialize Vec<Triple> to JSON".to_string())
}

fn triples_ser_to_json_ser(ser: &Vec<u8>) -> Result<Vec<u8>, String> {
    let json = triples_ser_to_json_string(ser)?;
    Ok(json.as_bytes().to_vec())
}

pub fn read_triples_in_app_response_from_rust(
    mut app_response: AppResponse,
) -> Result<(Vec<Triple>, Vec<Triple>), NgError> {
    let mut inserts: Vec<Triple> = vec![];
    let mut removes: Vec<Triple> = vec![];
    if let AppResponse::V0(AppResponseV0::State(AppState { ref mut graph, .. })) = app_response {
        if graph.is_some() {
            let graph_state = graph.take().unwrap();
            inserts = serde_bare::from_slice(&graph_state.triples)?;
        };
    } else if let AppResponse::V0(AppResponseV0::Patch(AppPatch { ref mut graph, .. })) =
        app_response
    {
        if graph.is_some() {
            let graph_patch = graph.take().unwrap();
            inserts = serde_bare::from_slice(&graph_patch.inserts)?;
            removes = serde_bare::from_slice(&graph_patch.removes)?;
        };
    }
    Ok((inserts, removes))
}

pub fn prepare_app_response_for_js(mut app_response: AppResponse) -> Result<AppResponse, String> {
    if let AppResponse::V0(AppResponseV0::State(AppState { ref mut graph, .. })) = app_response {
        if graph.is_some() {
            let graph_state = graph.take().unwrap();
            *graph = Some(GraphState {
                triples: triples_ser_to_json_ser(&graph_state.triples)?,
            });
        };
    } else if let AppResponse::V0(AppResponseV0::Patch(AppPatch { ref mut graph, .. })) =
        app_response
    {
        if graph.is_some() {
            let mut graph_patch = graph.take().unwrap();
            graph_patch.inserts = triples_ser_to_json_ser(&graph_patch.inserts)?;
            graph_patch.removes = triples_ser_to_json_ser(&graph_patch.removes)?;
            *graph = Some(graph_patch);
        };
    }

    Ok(app_response)
}
