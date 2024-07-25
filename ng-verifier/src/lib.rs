pub mod types;

pub mod site;

#[doc(hidden)]
pub mod verifier;

mod user_storage;

mod commits;

mod request_processor;

#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
mod rocksdb_user_storage;

use ng_net::app_protocol::*;
use ng_oxigraph::oxrdf::Triple;

fn triples_ser_to_json_ser(ser: &Vec<u8>) -> Result<Vec<u8>, String> {
    let triples: Vec<Triple> = serde_bare::from_slice(ser)
        .map_err(|_| "Deserialization error of Vec<Triple>".to_string())?;

    let mut triples_json: Vec<serde_json::Value> = Vec::with_capacity(triples.len());
    for insert in triples {
        triples_json.push(serde_json::Value::String(insert.to_string()));
    }
    let triples_json = serde_json::Value::Array(triples_json);
    let json = serde_json::to_string(&triples_json)
        .map_err(|_| "Cannot serialize Vec<Triple> to JSON".to_string())?;
    Ok(json.as_bytes().to_vec())
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
