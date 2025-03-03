/*
 * Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
*/

#![cfg(target_arch = "wasm32")]
#![allow(unused_imports)]

mod model;

use std::collections::HashMap;
use std::net::IpAddr;
use std::str::FromStr;
use std::sync::Arc;

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
// use js_sys::Reflect;
use async_std::stream::StreamExt;
use futures::channel::mpsc;
use futures::SinkExt;
use js_sys::{Array, Object};
use oxrdf::Triple;
use sys_locale::get_locales;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::future_to_promise;
use wasm_bindgen_futures::JsFuture;

use ng_repo::errors::{NgError, ProtocolError};
use ng_repo::log::*;
use ng_repo::types::*;
use ng_repo::utils::{decode_key, decode_priv_key};

use ng_net::app_protocol::*;
use ng_net::broker::*;
use ng_net::types::{BindAddress, ClientInfo, ClientInfoV0, ClientType, CreateAccountBSP, IP};
use ng_net::utils::{
    decode_invitation_string, parse_ip_and_port_for, retrieve_local_bootstrap, retrieve_local_url,
    spawn_and_log_error, Receiver, ResultSend, Sender,
};
use ng_net::{actor::*, actors::admin::*};
use ng_net::{WS_PORT, WS_PORT_REVERSE_PROXY};

use ng_client_ws::remote_ws_wasm::ConnectionWebSocket;

use ng_wallet::types::*;
use ng_wallet::*;

use nextgraph::local_broker::*;
use nextgraph::verifier::CancelFn;

use crate::model::*;

#[wasm_bindgen]
pub async fn locales() -> Result<JsValue, JsValue> {
    Ok(serde_wasm_bindgen::to_value(&get_locales().collect::<Vec<_>>()).unwrap())
}

#[wasm_bindgen]
pub async fn get_device_name() -> Result<JsValue, JsValue> {
    Ok(serde_wasm_bindgen::to_value(&nextgraph::get_device_name()).unwrap())
}

#[wasm_bindgen]
pub async fn get_local_bootstrap(location: String, invite: JsValue) -> JsValue {
    let res = retrieve_local_bootstrap(location, invite.as_string(), false).await;
    if res.is_some() {
        serde_wasm_bindgen::to_value(&res.unwrap()).unwrap()
    } else {
        JsValue::FALSE
    }
}

#[wasm_bindgen]
pub async fn get_local_bootstrap_and_domain(location: String) -> JsValue {
    let res = retrieve_local_bootstrap(location, None, false).await;
    if res.is_some() {
        let domain = res.as_ref().unwrap().get_domain();
        serde_wasm_bindgen::to_value(&(res.unwrap(), domain)).unwrap()
    } else {
        serde_wasm_bindgen::to_value(&(false, false)).unwrap()
    }
}

#[wasm_bindgen]
pub async fn get_local_bootstrap_with_public(
    location: String,
    invite: JsValue,
    must_be_public: bool,
) -> JsValue {
    let res = retrieve_local_bootstrap(location, invite.as_string(), must_be_public).await;
    if res.is_some() {
        serde_wasm_bindgen::to_value(&res.unwrap()).unwrap()
    } else {
        JsValue::FALSE
    }
}

#[wasm_bindgen]
pub async fn decode_invitation(invite: String) -> JsValue {
    let res = decode_invitation_string(invite);
    if res.is_some() {
        serde_wasm_bindgen::to_value(&res.unwrap()).unwrap()
    } else {
        JsValue::FALSE
    }
}

#[wasm_bindgen]
pub async fn get_local_url(location: String) -> JsValue {
    let res = retrieve_local_url(location).await;
    if res.is_some() {
        serde_wasm_bindgen::to_value(&res.unwrap()).unwrap()
    } else {
        JsValue::FALSE
    }
}

#[wasm_bindgen]
pub async fn get_ngone_url_of_invitation(invitation_string: String) -> JsValue {
    let res = decode_invitation_string(invitation_string);
    if res.is_some() {
        serde_wasm_bindgen::to_value(&res.unwrap().get_urls()[0]).unwrap()
    } else {
        JsValue::FALSE
    }
}

#[wasm_bindgen]
pub fn wallet_gen_shuffle_for_pazzle_opening(pazzle_length: u8) -> JsValue {
    let res = gen_shuffle_for_pazzle_opening(pazzle_length);
    serde_wasm_bindgen::to_value(&res).unwrap()
}

#[wasm_bindgen]
pub fn wallet_gen_shuffle_for_pin() -> Vec<u8> {
    gen_shuffle_for_pin()
}

#[wasm_bindgen]
pub fn privkey_to_string(privkey: JsValue) -> Result<String, JsValue> {
    let p = serde_wasm_bindgen::from_value::<PrivKey>(privkey)
        .map_err(|_| "Deserialization error of privkey")?;
    Ok(format!("{p}"))
}

#[wasm_bindgen]
pub fn wallet_open_with_pazzle(
    wallet: JsValue,
    pazzle: Vec<u8>,
    pin: JsValue,
) -> Result<JsValue, JsValue> {
    let encrypted_wallet = serde_wasm_bindgen::from_value::<Wallet>(wallet)
        .map_err(|_| "Deserialization error of wallet")?;
    let pin = serde_wasm_bindgen::from_value::<[u8; 4]>(pin)
        .map_err(|_| "Deserialization error of pin")?;
    let res = nextgraph::local_broker::wallet_open_with_pazzle(&encrypted_wallet, pazzle, pin);
    match res {
        Ok(r) => Ok(r
            .serialize(&serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true))
            .unwrap()),
        Err(e) => Err(e.to_string().into()),
    }
}

#[wasm_bindgen]
pub fn wallet_open_with_mnemonic(
    wallet: JsValue,
    mnemonic: JsValue,
    pin: JsValue,
) -> Result<JsValue, JsValue> {
    let encrypted_wallet = serde_wasm_bindgen::from_value::<Wallet>(wallet)
        .map_err(|_| "Deserialization error of wallet")?;
    let pin = serde_wasm_bindgen::from_value::<[u8; 4]>(pin)
        .map_err(|_| "Deserialization error of pin")?;
    let mnemonic = serde_wasm_bindgen::from_value::<[u16; 12]>(mnemonic)
        .map_err(|_| "Deserialization error of mnemonic")?;
    let res = ng_wallet::open_wallet_with_mnemonic(&encrypted_wallet, mnemonic, pin);
    match res {
        Ok(r) => Ok(r
            .serialize(&serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true))
            .unwrap()),
        Err(e) => Err(e.to_string().into()),
    }
}

#[wasm_bindgen]
pub fn wallet_open_with_mnemonic_words(
    wallet: JsValue,
    mnemonic_words: Array,
    pin: JsValue,
) -> Result<JsValue, JsValue> {
    let encrypted_wallet = serde_wasm_bindgen::from_value::<Wallet>(wallet)
        .map_err(|_| "Deserialization error of wallet")?;
    let pin = serde_wasm_bindgen::from_value::<[u8; 4]>(pin)
        .map_err(|_| "Deserialization error of pin")?;
    let mnemonic_vec: Vec<String> = mnemonic_words
        .iter()
        .map(|word| word.as_string().unwrap())
        .collect();

    let res = nextgraph::local_broker::wallet_open_with_mnemonic_words(
        &encrypted_wallet,
        &mnemonic_vec,
        pin,
    );
    match res {
        Ok(r) => Ok(r
            .serialize(&serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true))
            .unwrap()),
        Err(e) => Err(e.to_string().into()),
    }
}

#[wasm_bindgen]
pub fn wallet_update(wallet_id: JsValue, operations: JsValue) -> Result<JsValue, JsValue> {
    let _wallet = serde_wasm_bindgen::from_value::<WalletId>(wallet_id)
        .map_err(|_| "Deserialization error of WalletId")?;
    let _operations = serde_wasm_bindgen::from_value::<Vec<WalletOperation>>(operations)
        .map_err(|_| "Deserialization error of operations")?;
    unimplemented!();
    // match res {
    //     Ok(r) => Ok(serde_wasm_bindgen::to_value(&r).unwrap()),
    //     Err(e) => Err(e.to_string().into()),
    // }
}

#[wasm_bindgen]
pub async fn get_wallets() -> Result<JsValue, JsValue> {
    init_local_broker_with_lazy(&INIT_LOCAL_BROKER).await;

    let res = wallets_get_all().await.map_err(|e| {
        log_err!("wallets_get_all error {}", e.to_string());
    });
    if res.is_ok() {
        return Ok(serde_wasm_bindgen::to_value(&res.unwrap()).unwrap());
    }
    Ok(JsValue::UNDEFINED)
}

#[wasm_bindgen]
pub async fn session_start(wallet_name: String, user_js: JsValue) -> Result<JsValue, String> {
    let user_id = serde_wasm_bindgen::from_value::<PubKey>(user_js)
        .map_err(|_| "Deserialization error of user_id")?;

    let config = SessionConfig::new_save(&user_id, &wallet_name);
    let res: SessionInfoString = nextgraph::local_broker::session_start(config)
        .await
        .map_err(|e: NgError| e.to_string())?
        .into();

    Ok(serde_wasm_bindgen::to_value(&res).unwrap())
}

#[wasm_bindgen]
pub async fn session_in_memory_start(
    wallet_name: String,
    user_js: JsValue,
) -> Result<JsValue, String> {
    let user_id = serde_wasm_bindgen::from_value::<PubKey>(user_js)
        .map_err(|_| "Deserialization error of user_id")?;

    let config = SessionConfig::new_in_memory(&user_id, &wallet_name);
    let res: SessionInfoString = nextgraph::local_broker::session_start(config)
        .await
        .map_err(|e: NgError| e.to_string())?
        .into();

    Ok(serde_wasm_bindgen::to_value(&res).unwrap())
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen]
pub async fn session_headless_start(user_js: String) -> Result<JsValue, String> {
    let user_id = decode_key(&user_js).map_err(|_| "Invalid user_id")?;

    let config = SessionConfig::new_headless(user_id);
    let res: SessionInfoString = nextgraph::local_broker::session_start(config)
        .await
        .map_err(|e: NgError| e.to_string())?
        .into();

    Ok(serde_wasm_bindgen::to_value(&res).unwrap())
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen]
pub async fn session_headless_stop(session_id: JsValue, force_close: bool) -> Result<(), String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Invalid session_id".to_string())?;

    let _ = nextgraph::local_broker::session_headless_stop(session_id, force_close)
        .await
        .map_err(|e: NgError| e.to_string())?;

    Ok(())
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen]
pub async fn sparql_query(
    session_id: JsValue,
    sparql: String,
    base: JsValue,
    nuri: JsValue,
) -> Result<JsValue, JsValue> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Invalid session_id".to_string())?;
    let nuri = if nuri.is_string() {
        NuriV0::new_from(&nuri.as_string().unwrap()).map_err(|e| e.to_string())?
    } else {
        NuriV0::new_entire_user_site()
    };

    let base_opt = if base.is_string() {
        Some(base.as_string().unwrap())
    } else {
        None
    };

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_read_query(),
        nuri,
        payload: Some(AppRequestPayload::new_sparql_query(sparql, base_opt)),
        session_id,
    });

    let response = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    let AppResponse::V0(res) = response;
    match res {
        AppResponseV0::False => return Ok(JsValue::FALSE),
        AppResponseV0::True => return Ok(JsValue::TRUE),
        AppResponseV0::Graph(graph) => {
            let triples: Vec<Triple> = serde_bare::from_slice(&graph)
                .map_err(|_| "Deserialization error of graph".to_string())?;

            let results = Array::new();
            for triple in triples {
                results.push(&JsQuad::from(triple).into());
            }
            Ok(results.into())
        }
        AppResponseV0::QueryResult(buf) => {
            let string = String::from_utf8(buf)
                .map_err(|_| "Deserialization error of JSON QueryResult String".to_string())?;

            js_sys::JSON::parse(&string)
        }
        AppResponseV0::Error(e) => Err(e.to_string().into()),
        _ => Err("invalid response".to_string().into()),
    }
}

#[wasm_bindgen]
pub async fn discrete_update(
    session_id: JsValue,
    update: JsValue,
    heads: Array,
    crdt: String,
    nuri: String,
) -> Result<(), String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Invalid session_id".to_string())?;
    let nuri = NuriV0::new_from(&nuri).map_err(|e| e.to_string())?;
    let mut head_strings = Vec::with_capacity(heads.length() as usize);
    for head in heads.iter() {
        if let Some(s) = head.as_string() {
            head_strings.push(s)
        } else {
            return Err("Invalid HEADS".to_string());
        }
    }
    let update: serde_bytes::ByteBuf =
        serde_wasm_bindgen::from_value::<serde_bytes::ByteBuf>(update)
            .map_err(|_| "Deserialization error of update".to_string())?;

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_update(),
        nuri,
        payload: Some(
            AppRequestPayload::new_discrete_update(head_strings, crdt, update.into_vec())
                .map_err(|e| format!("Deserialization error of heads: {e}"))?,
        ),
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;
    if let AppResponse::V0(AppResponseV0::Error(e)) = res {
        Err(e)
    } else {
        Ok(())
    }
}

#[wasm_bindgen]
pub async fn sparql_update(
    session_id: JsValue,
    sparql: String,
    nuri: JsValue,
) -> Result<(), String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Invalid session_id".to_string())?;

    let (nuri, base) = if nuri.is_string() {
        let n = nuri.as_string().unwrap();
        let nuri = NuriV0::new_from(&n).map_err(|e| e.to_string())?;
        let b = nuri.repo();
        (nuri, Some(b))
    } else {
        (NuriV0::new_private_store_target(), None)
    };

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_write_query(),
        nuri,
        payload: Some(AppRequestPayload::new_sparql_query(sparql, base)),
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;
    if let AppResponse::V0(AppResponseV0::Error(e)) = res {
        Err(e)
    } else {
        Ok(())
    }
}

#[wasm_bindgen]
pub async fn update_header(
    session_id: JsValue,
    nuri: String,
    title: JsValue,
    about: JsValue,
) -> Result<(), String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Invalid session_id".to_string())?;

    let nuri = NuriV0::new_from(&nuri).map_err(|e| e.to_string())?;

    let title = if title.is_string() {
        Some(title.as_string().unwrap())
    } else {
        None
    };

    let about = if about.is_string() {
        Some(about.as_string().unwrap())
    } else {
        None
    };

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_header(),
        nuri,
        payload: Some(AppRequestPayload::new_header(title, about)),
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;
    if let AppResponse::V0(AppResponseV0::Error(e)) = res {
        Err(e)
    } else {
        Ok(())
    }
}

#[wasm_bindgen]
pub async fn fetch_header(session_id: JsValue, nuri: String) -> Result<JsValue, String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Invalid session_id".to_string())?;

    let nuri = NuriV0::new_from(&nuri).map_err(|e| e.to_string())?;

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_fetch_header(),
        nuri,
        payload: None,
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;
    match res {
        AppResponse::V0(AppResponseV0::Error(e)) => Err(e),
        AppResponse::V0(AppResponseV0::Header(h)) => Ok(serde_wasm_bindgen::to_value(&h).unwrap()),
        _ => Err("invalid response".to_string()),
    }
}

#[cfg(not(wasmpack_target = "nodejs"))]
#[wasm_bindgen]
pub async fn sparql_query(
    session_id: JsValue,
    sparql: String,
    base: JsValue,
    nuri: JsValue,
) -> Result<JsValue, JsValue> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Invalid session_id".to_string())?;

    let nuri = if nuri.is_string() {
        NuriV0::new_from(&nuri.as_string().unwrap()).map_err(|e| e.to_string())?
    } else {
        NuriV0::new_entire_user_site()
    };
    let base_opt = if base.is_string() {
        Some(base.as_string().unwrap())
    } else {
        None
    };

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_read_query(),
        nuri,
        payload: Some(AppRequestPayload::new_sparql_query(sparql, base_opt)),
        session_id,
    });

    let response = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    let AppResponse::V0(res) = response;
    match res {
        AppResponseV0::False => return Ok(JsValue::FALSE),
        AppResponseV0::True => return Ok(JsValue::TRUE),
        AppResponseV0::Graph(graph) => {
            let triples: Vec<Triple> = serde_bare::from_slice(&graph)
                .map_err(|_| "Deserialization error of Vec<Triple>".to_string())?;

            Ok(JsValue::from(
                triples
                    .into_iter()
                    .map(|x| JsValue::from_str(&x.to_string()))
                    .collect::<Array>(),
            ))
        }
        AppResponseV0::QueryResult(buf) => {
            let string = String::from_utf8(buf)
                .map_err(|_| "Deserialization error of JSON QueryResult String".to_string())?;
            js_sys::JSON::parse(&string)
        }
        AppResponseV0::Error(e) => Err(e.to_string().into()),
        _ => Err("invalid response".to_string().into()),
    }
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen]
pub async fn rdf_dump(session_id: JsValue) -> Result<String, String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Invalid session_id".to_string())?;

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_rdf_dump(),
        nuri: NuriV0::new_entire_user_site(),
        payload: None,
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    let AppResponse::V0(res) = res;
    match res {
        AppResponseV0::Text(s) => Ok(s),
        _ => Err("invalid response".to_string()),
    }
}

#[wasm_bindgen]
pub async fn branch_history(session_id: JsValue, nuri: JsValue) -> Result<JsValue, String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Invalid session_id".to_string())?;

    let nuri = if nuri.is_string() {
        NuriV0::new_from(&nuri.as_string().unwrap()).map_err(|e| e.to_string())?
    } else {
        NuriV0::new_private_store_target()
    };

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_history(),
        nuri,
        payload: None,
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    let AppResponse::V0(res) = res;
    //log_debug!("{:?}", res);
    match res {
        AppResponseV0::History(s) => Ok(serde_wasm_bindgen::to_value(&s.to_js()).unwrap()),
        _ => Err("invalid response".to_string()),
    }
}

#[wasm_bindgen]
pub async fn signature_status(session_id: JsValue, nuri: JsValue) -> Result<JsValue, String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Invalid session_id".to_string())?;

    let nuri = if nuri.is_string() {
        NuriV0::new_from(&nuri.as_string().unwrap()).map_err(|e| e.to_string())?
    } else {
        NuriV0::new_private_store_target()
    };

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_signature_status(),
        nuri,
        payload: None,
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    let AppResponse::V0(res) = res;
    //log_debug!("{:?}", res);
    match res {
        AppResponseV0::SignatureStatus(s) => Ok(serde_wasm_bindgen::to_value(&s).unwrap()),
        _ => Err("invalid response".to_string()),
    }
}

#[wasm_bindgen]
pub async fn signed_snapshot_request(
    session_id: JsValue,
    nuri: JsValue,
) -> Result<JsValue, String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Invalid session_id".to_string())?;

    let nuri = if nuri.is_string() {
        NuriV0::new_from(&nuri.as_string().unwrap()).map_err(|e| e.to_string())?
    } else {
        NuriV0::new_private_store_target()
    };

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_signed_snapshot_request(),
        nuri,
        payload: None,
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    let AppResponse::V0(res) = res;
    //log_debug!("{:?}", res);
    match res {
        AppResponseV0::True => Ok(JsValue::TRUE),
        AppResponseV0::False => Ok(JsValue::FALSE),
        AppResponseV0::Error(e) => Err(e),
        _ => Err("invalid response".to_string()),
    }
}

#[wasm_bindgen]
pub async fn signature_request(session_id: JsValue, nuri: JsValue) -> Result<JsValue, String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Invalid session_id".to_string())?;

    let nuri = if nuri.is_string() {
        NuriV0::new_from(&nuri.as_string().unwrap()).map_err(|e| e.to_string())?
    } else {
        NuriV0::new_private_store_target()
    };

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_signature_request(),
        nuri,
        payload: None,
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    let AppResponse::V0(res) = res;
    //log_debug!("{:?}", res);
    match res {
        AppResponseV0::True => Ok(JsValue::TRUE),
        AppResponseV0::False => Ok(JsValue::FALSE),
        AppResponseV0::Error(e) => Err(e),
        _ => Err("invalid response".to_string()),
    }
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen]
pub async fn admin_create_user(config: JsValue) -> Result<JsValue, String> {
    let config = HeadLessConfigStrings::load(config)?;
    let admin_user_key = config
        .admin_user_key
        .ok_or("No admin_user_key found in config nor env var.".to_string())?;

    let res = nextgraph::local_broker::admin_create_user(
        config.server_peer_id,
        admin_user_key,
        config.server_addr,
    )
    .await
    .map_err(|e: ProtocolError| e.to_string())?;

    Ok(serde_wasm_bindgen::to_value(&res.to_string()).unwrap())
}

#[wasm_bindgen]
pub async fn session_start_remote(
    wallet_name: String,
    user_js: JsValue,
    peer_id_js: JsValue,
) -> Result<JsValue, String> {
    let user_id = serde_wasm_bindgen::from_value::<PubKey>(user_js)
        .map_err(|_| "Deserialization error of user_id")?;

    let peer_id = serde_wasm_bindgen::from_value::<Option<PubKey>>(peer_id_js)
        .map_err(|_| "Deserialization error of peer_id")?;

    let config = SessionConfig::new_remote(&user_id, &wallet_name, peer_id);
    let res: SessionInfoString = nextgraph::local_broker::session_start(config)
        .await
        .map_err(|e: NgError| e.to_string())?
        .into();

    Ok(serde_wasm_bindgen::to_value(&res).unwrap())
}

#[wasm_bindgen]
pub async fn wallets_reload() -> Result<(), String> {
    init_local_broker_with_lazy(&INIT_LOCAL_BROKER).await;
    nextgraph::local_broker::wallets_reload()
        .await
        .map_err(|e: NgError| e.to_string())
}

#[wasm_bindgen]
pub async fn add_in_memory_wallet(lws_js: JsValue) -> Result<(), String> {
    let lws = serde_wasm_bindgen::from_value::<LocalWalletStorageV0>(lws_js)
        .map_err(|_| "Deserialization error of lws")?;
    if !lws.in_memory {
        return Err("This is not an in memory wallet".to_string());
    }
    match nextgraph::local_broker::wallet_add(lws).await {
        Ok(_) => Ok(()),
        Err(NgError::WalletAlreadyAdded) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(not(wasmpack_target = "nodejs"))]
#[wasm_bindgen(module = "/js/browser.js")]
extern "C" {
    fn session_save(key: String, value: String) -> Option<String>;
    fn session_get(key: String) -> Option<String>;
    fn session_remove(key: String);
    fn local_save(key: String, value: String) -> Option<String>;
    fn local_get(key: String) -> Option<String>;
    fn is_browser() -> bool;
    fn storage_clear();
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen(module = "/js/node.js")]
extern "C" {
    fn session_save(key: String, value: String) -> Option<String>;
    fn session_get(key: String) -> Option<String>;
    fn session_remove(key: String);
    fn local_save(key: String, value: String) -> Option<String>;
    fn local_get(key: String) -> Option<String>;
    fn is_browser() -> bool;
    fn storage_clear();
    #[wasm_bindgen(catch)]
    async fn upload_file(
        filename: String,
        cb_chunk: &Closure<dyn Fn(JsValue) -> js_sys::Promise>,
        cb_end: &Closure<dyn Fn(String) -> js_sys::Promise>,
    ) -> Result<JsValue, JsValue>;
}

fn local_read(key: String) -> Result<String, NgError> {
    local_get(key).ok_or(NgError::JsStorageReadError)
}

fn local_write(key: String, value: String) -> Result<(), NgError> {
    match local_save(key, value) {
        Some(err) => Err(NgError::JsStorageWriteError(err)),
        None => Ok(()),
    }
}

fn session_read(key: String) -> Result<String, NgError> {
    session_get(key).ok_or(NgError::JsStorageReadError)
}

fn session_write(key: String, value: String) -> Result<(), NgError> {
    match session_save(key, value) {
        Some(err) => Err(NgError::JsStorageWriteError(err)),
        None => Ok(()),
    }
}

fn session_del(key: String) -> Result<(), NgError> {
    session_remove(key);
    Ok(())
}

fn clear() {
    storage_clear();
}

static INIT_LOCAL_BROKER: Lazy<Box<ConfigInitFn>> = Lazy::new(|| {
    Box::new(|| {
        LocalBrokerConfig::JsStorage(JsStorageConfig {
            local_read: Box::new(local_read),
            local_write: Box::new(local_write),
            session_read: Arc::new(Box::new(session_read)),
            session_write: Arc::new(Box::new(session_write)),
            session_del: Arc::new(Box::new(session_del)),
            clear: Arc::new(Box::new(clear)),
            is_browser: is_browser(),
        })
    })
});

#[wasm_bindgen]
pub async fn wallet_create(params: JsValue) -> Result<JsValue, JsValue> {
    init_local_broker_with_lazy(&INIT_LOCAL_BROKER).await;
    let mut params = serde_wasm_bindgen::from_value::<CreateWalletV0>(params)
        .map_err(|_| "Deserialization error of args")?;
    params.result_with_wallet_file = true;
    let res = nextgraph::local_broker::wallet_create_v0(params).await;
    match res {
        Ok(r) => Ok(serde_wasm_bindgen::to_value(&r).unwrap()),
        Err(e) => Err(e.to_string().into()),
    }
}

#[wasm_bindgen]
pub async fn wallet_get_file(wallet_name: String) -> Result<JsValue, JsValue> {
    init_local_broker_with_lazy(&INIT_LOCAL_BROKER).await;

    let res = nextgraph::local_broker::wallet_get_file(&wallet_name).await;
    match res {
        Ok(r) => Ok(serde_wasm_bindgen::to_value(&serde_bytes::ByteBuf::from(r)).unwrap()),
        Err(e) => Err(e.to_string().into()),
    }
}

#[wasm_bindgen]
pub async fn wallet_read_file(file: JsValue) -> Result<JsValue, String> {
    init_local_broker_with_lazy(&INIT_LOCAL_BROKER).await;
    let file = serde_wasm_bindgen::from_value::<serde_bytes::ByteBuf>(file)
        .map_err(|_| "Deserialization error of file".to_string())?;

    let wallet = nextgraph::local_broker::wallet_read_file(file.into_vec())
        .await
        .map_err(|e: NgError| e.to_string())?;

    Ok(serde_wasm_bindgen::to_value(&wallet).unwrap())
}

#[wasm_bindgen]
pub async fn wallet_import_from_code(code: JsValue) -> Result<JsValue, String> {
    init_local_broker_with_lazy(&INIT_LOCAL_BROKER).await;
    let code = serde_wasm_bindgen::from_value::<String>(code)
        .map_err(|_| "Deserialization error of code".to_string())?;

    let wallet = nextgraph::local_broker::wallet_import_from_code(code)
        .await
        .map_err(|e: NgError| e.to_string())?;

    Ok(serde_wasm_bindgen::to_value(&wallet).unwrap())
}

#[wasm_bindgen]
pub async fn wallet_import_rendezvous(size: JsValue) -> Result<JsValue, String> {
    init_local_broker_with_lazy(&INIT_LOCAL_BROKER).await;
    let size: u32 = serde_wasm_bindgen::from_value::<u32>(size)
        .map_err(|_| "Deserialization error of size".to_string())?;

    let res = nextgraph::local_broker::wallet_import_rendezvous(size)
        .await
        .map_err(|e: NgError| e.to_string())?;

    Ok(serde_wasm_bindgen::to_value(&res).unwrap())
}

#[wasm_bindgen]
pub async fn wallet_export_get_qrcode(
    session_id: JsValue,
    size: JsValue,
) -> Result<JsValue, String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Deserialization error of session_id".to_string())?;
    let size: u32 = serde_wasm_bindgen::from_value::<u32>(size)
        .map_err(|_| "Deserialization error of size".to_string())?;

    init_local_broker_with_lazy(&INIT_LOCAL_BROKER).await;

    let res = nextgraph::local_broker::wallet_export_get_qrcode(session_id, size)
        .await
        .map_err(|e: NgError| e.to_string())?;

    Ok(serde_wasm_bindgen::to_value(&res).unwrap())
}

#[wasm_bindgen]
pub async fn wallet_export_get_textcode(session_id: JsValue) -> Result<JsValue, String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Deserialization error of session_id".to_string())?;

    init_local_broker_with_lazy(&INIT_LOCAL_BROKER).await;

    let res = nextgraph::local_broker::wallet_export_get_textcode(session_id)
        .await
        .map_err(|e: NgError| e.to_string())?;

    Ok(serde_wasm_bindgen::to_value(&res).unwrap())
}

#[wasm_bindgen]
pub async fn wallet_export_rendezvous(session_id: JsValue, code: JsValue) -> Result<(), String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Deserialization error of session_id".to_string())?;
    let code = serde_wasm_bindgen::from_value::<String>(code)
        .map_err(|_| "Deserialization error of code".to_string())?;

    init_local_broker_with_lazy(&INIT_LOCAL_BROKER).await;

    nextgraph::local_broker::wallet_export_rendezvous(session_id, code)
        .await
        .map_err(|e: NgError| e.to_string())?;

    Ok(())
}

#[wasm_bindgen]
pub async fn wallet_was_opened(
    opened_wallet: JsValue, //SensitiveWallet
) -> Result<JsValue, String> {
    let opened_wallet = serde_wasm_bindgen::from_value::<SensitiveWallet>(opened_wallet)
        .map_err(|_| "Deserialization error of SensitiveWallet".to_string())?;

    let client = nextgraph::local_broker::wallet_was_opened(opened_wallet)
        .await
        .map_err(|e: NgError| e.to_string())?;

    Ok(serde_wasm_bindgen::to_value(&client).unwrap())
}

#[wasm_bindgen]
pub async fn wallet_import(
    encrypted_wallet: JsValue, //Wallet,
    opened_wallet: JsValue,    //SensitiveWallet
    in_memory: bool,
) -> Result<JsValue, String> {
    let encrypted_wallet = serde_wasm_bindgen::from_value::<Wallet>(encrypted_wallet)
        .map_err(|_| "Deserialization error of Wallet".to_string())?;
    let opened_wallet = serde_wasm_bindgen::from_value::<SensitiveWallet>(opened_wallet)
        .map_err(|_| "Deserialization error of SensitiveWallet".to_string())?;

    let client = nextgraph::local_broker::wallet_import(encrypted_wallet, opened_wallet, in_memory)
        .await
        .map_err(|e: NgError| e.to_string())?;

    Ok(serde_wasm_bindgen::to_value(&client).unwrap())
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen(module = "/js/node.js")]
extern "C" {
    fn client_details() -> String;
    fn version() -> String;
    fn get_env_vars() -> JsValue;
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen]
pub fn client_info() -> JsValue {
    let res = ClientInfo::V0(client_info_());
    //res
    serde_wasm_bindgen::to_value(&res).unwrap()
}

#[wasm_bindgen]
pub fn encode_create_account(payload: JsValue) -> JsValue {
    //log_debug!("{:?}", payload);
    let create_account = serde_wasm_bindgen::from_value::<CreateAccountBSP>(payload).unwrap();
    //log_debug!("create_account {:?}", create_account);
    let res = create_account.encode();
    //log_debug!("res {:?}", res);
    serde_wasm_bindgen::to_value(&res).unwrap()
}

#[cfg(not(wasmpack_target = "nodejs"))]
#[wasm_bindgen(module = "/js/browser.js")]
extern "C" {
    fn client_details() -> String;
}

#[cfg(not(wasmpack_target = "nodejs"))]
#[wasm_bindgen(module = "/js/bowser.js")]
extern "C" {
    type Bowser;
    #[wasm_bindgen(static_method_of = Bowser)]
    fn parse(UA: String) -> JsValue;
}

#[cfg(not(wasmpack_target = "nodejs"))]
#[wasm_bindgen(module = "/js/browser.js")]
extern "C" {
    fn client_details2(val: JsValue, version: String) -> String;
}

#[cfg(all(not(wasmpack_target = "nodejs"), target_arch = "wasm32"))]
pub fn client_info_() -> ClientInfoV0 {
    let ua = client_details();

    let bowser = Bowser::parse(ua);
    //log_debug!("{:?}", bowser);

    let details_string = client_details2(bowser, env!("CARGO_PKG_VERSION").to_string());

    let res = ClientInfoV0 {
        client_type: ClientType::Web,
        details: details_string,
        version: "".to_string(),
        timestamp_install: 0,
        timestamp_updated: 0,
    };
    res
    //serde_wasm_bindgen::to_value(&res).unwrap()
}

#[cfg(all(wasmpack_target = "nodejs", target_arch = "wasm32"))]
pub fn client_info_() -> ClientInfoV0 {
    let res = ClientInfoV0 {
        client_type: ClientType::NodeService,
        details: client_details(),
        version: version(),
        timestamp_install: 0,
        timestamp_updated: 0,
    };
    res
    //serde_wasm_bindgen::to_value(&res).unwrap()
}

#[cfg(all(not(wasmpack_target = "nodejs"), target_arch = "wasm32"))]
#[wasm_bindgen]
pub fn client_info() -> JsValue {
    let res = ClientInfo::V0(client_info_());
    serde_wasm_bindgen::to_value(&res).unwrap()
}

#[wasm_bindgen]
pub async fn test() {
    init_local_broker_with_lazy(&INIT_LOCAL_BROKER).await;
    //log_debug!("test is {}", BROKER.read().await.test());
    #[cfg(debug_assertions)]
    let client_info = client_info();
    log_debug!("{:?}", client_info);
}

// #[wasm_bindgen]
// pub async fn app_request_stream_with_nuri_command(
//     nuri: String,
//     command: JsValue,
//     session_id: JsValue,
//     callback: &js_sys::Function,
//     payload: JsValue,
// ) -> Result<JsValue, String> {
//     let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
//         .map_err(|_| "Deserialization error of session_id".to_string())?;
//     let nuri = NuriV0::new_from(&nuri).map_err(|e| e.to_string())?;

//     let command = serde_wasm_bindgen::from_value::<AppRequestCommandV0>(command)
//         .map_err(|_| "Deserialization error of AppRequestCommandV0".to_string())?;

//     let payload = if !payload.is_undefined() && payload.is_object() {
//         Some(AppRequestPayload::V0(
//             serde_wasm_bindgen::from_value::<AppRequestPayloadV0>(payload)
//                 .map_err(|_| "Deserialization error of AppRequestPayloadV0".to_string())?,
//         ))
//     } else {
//         None
//     };

//     let request = AppRequest::V0(AppRequestV0 {
//         session_id,
//         command,
//         nuri,
//         payload,
//     });
//     app_request_stream_(request, callback).await
// }

// #[wasm_bindgen]
// pub async fn app_request_stream(
//     // js_session_id: JsValue,
//     request: JsValue,
//     callback: &js_sys::Function,
// ) -> Result<JsValue, String> {
//     let request = serde_wasm_bindgen::from_value::<AppRequest>(request)
//         .map_err(|_| "Deserialization error of AppRequest".to_string())?;

//     app_request_stream_(request, callback).await
// }
#[wasm_bindgen]
pub async fn app_request_stream(
    // js_session_id: JsValue,
    request: JsValue,
    callback: &js_sys::Function,
) -> Result<JsValue, String> {
    let request = serde_wasm_bindgen::from_value::<AppRequest>(request)
        .map_err(|_| "Deserialization error of AppRequest".to_string())?;

    app_request_stream_(request, callback).await
}

async fn app_request_stream_(
    request: AppRequest,
    callback: &js_sys::Function,
) -> Result<JsValue, String> {
    let (reader, cancel) = nextgraph::local_broker::app_request_stream(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    let (canceller_tx, canceller_rx) = mpsc::unbounded();

    async fn inner_task(
        mut reader: Receiver<AppResponse>,
        callback: js_sys::Function,
        mut canceller_tx: Sender<()>,
    ) -> ResultSend<()> {
        while let Some(app_response) = reader.next().await {
            let app_response = nextgraph::verifier::prepare_app_response_for_js(app_response)?;
            //let mut graph_triples_js: Option<JsValue> = None;
            // if let AppResponse::V0(AppResponseV0::State(AppState { ref mut graph, .. })) =
            //     app_response
            // {
            //     if graph.is_some() {
            //         let graph_state = graph.take().unwrap();
            //         let triples: Vec<Triple> = serde_bare::from_slice(&graph_state.triples)
            //             .map_err(|_| "Deserialization error of graph".to_string())?;

            //         let results = Array::new();
            //         for triple in triples {
            //             results.push(&JsQuad::from(triple).into());
            //         }
            //         let list:JsValue = results.into();
            //         list.
            //     };
            // };
            let response_js = serde_wasm_bindgen::to_value(&app_response).unwrap();
            // if let Some(graph_triples) = graph_triples_js {
            //     let response: Object = response_js.try_into().map_err(|_| {
            //         "Error while adding triples to AppResponse.V0.State".to_string()
            //     })?;
            //     let v0 = Object::get_own_property_descriptor(&response, &JsValue::from_str("V0"));
            //     let v0_obj: Object = v0.try_into().map_err(|_| {
            //         "Error while adding triples to AppResponse.V0.State".to_string()
            //     })?;
            //     let state =
            //         Object::get_own_property_descriptor(&v0_obj, &JsValue::from_str("State"));
            //     let state_obj: Object = state.try_into().map_err(|_| {
            //         "Error while adding triples to AppResponse.V0.State".to_string()
            //     })?;
            //     let kv = Array::new_with_length(2);
            //     kv.push(&JsValue::from_str("triples"));
            //     kv.push(&graph_triples);
            //     let entries = Array::new_with_length(1);
            //     entries.push(&kv.into());
            //     let graph = Object::from_entries(&entries).map_err(|_| {
            //         "Error while creating the triples for AppResponse.V0.State.graph".to_string()
            //     })?;
            //     let response =
            //         Object::define_property(&state_obj, &JsValue::from_str("graph"), &graph);
            //     response_js = response.into();
            // };
            let this = JsValue::null();
            match callback.call1(&this, &response_js) {
                Ok(jsval) => {
                    let promise_res: Result<js_sys::Promise, JsValue> = jsval.dyn_into();
                    match promise_res {
                        Ok(promise) => match JsFuture::from(promise).await {
                            Ok(js_value) => {
                                if js_value == JsValue::TRUE {
                                    //log_debug!("cancel because true");
                                    reader.close();
                                    let _ = canceller_tx.send(()).await;
                                    canceller_tx.close_channel();
                                    break;
                                }
                            }
                            Err(_) => {}
                        },
                        Err(returned_val) => {
                            if returned_val == JsValue::TRUE {
                                //log_debug!("cancel because true");
                                reader.close();
                                let _ = canceller_tx.send(()).await;
                                canceller_tx.close_channel();
                                break;
                            }
                        }
                    }
                }
                Err(e) => {
                    log_err!("JS callback for app_request_stream failed with {:?}", e);
                }
            }
        }
        Ok(())
    }

    async fn inner_canceller(mut canceller_rx: Receiver<()>, cancel: CancelFn) -> ResultSend<()> {
        if let Some(_) = canceller_rx.next().await {
            //log_info!("cancelling");
            cancel();
        }
        Ok(())
    }

    spawn_and_log_error(inner_canceller(canceller_rx, cancel));

    spawn_and_log_error(inner_task(reader, callback.clone(), canceller_tx.clone()));

    let cb = Closure::once(move || {
        log_debug!("trying to cancel");
        //sender.close_channel()
        let _ = canceller_tx.unbounded_send(());
        canceller_tx.close_channel();
    });
    //Closure::wrap(Box::new(move |sender| sender.close_channel()) as Box<FnMut(Sender<Commit>)>);
    let ret = cb.as_ref().clone();
    cb.forget();
    Ok(ret)
}

#[wasm_bindgen]
pub async fn app_request(request: JsValue) -> Result<JsValue, String> {
    // let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(js_session_id)
    //     .map_err(|_| "Deserialization error of session_id".to_string())?;
    let request = serde_wasm_bindgen::from_value::<AppRequest>(request)
        .map_err(|_| "Deserialization error of AppRequest".to_string())?;

    let response = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    Ok(serde_wasm_bindgen::to_value(&response).unwrap())
}

#[wasm_bindgen]
pub async fn app_request_with_nuri_command(
    nuri: String,
    command: JsValue,
    session_id: JsValue,
    payload: JsValue,
) -> Result<JsValue, String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Deserialization error of session_id".to_string())?;
    let nuri = NuriV0::new_from(&nuri).map_err(|e| e.to_string())?;

    let command = serde_wasm_bindgen::from_value::<AppRequestCommandV0>(command)
        .map_err(|_| "Deserialization error of AppRequestCommandV0".to_string())?;

    let payload = if !payload.is_undefined() && payload.is_object() {
        Some(AppRequestPayload::V0(
            serde_wasm_bindgen::from_value::<AppRequestPayloadV0>(payload)
                .map_err(|_| "Deserialization error of AppRequestPayloadV0".to_string())?,
        ))
    } else {
        None
    };

    let request = AppRequest::V0(AppRequestV0 {
        session_id,
        command,
        nuri,
        payload,
    });

    let response = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    Ok(serde_wasm_bindgen::to_value(&response).unwrap())
}

#[cfg(not(wasmpack_target = "nodejs"))]
#[wasm_bindgen]
pub async fn doc_create(
    session_id: JsValue,
    crdt: String,
    class_name: String,
    store_repo: JsValue,
    destination: String,
) -> Result<JsValue, String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Deserialization error of session_id".to_string())?;

    let class = BranchCrdt::from(crdt, class_name).map_err(|e| e.to_string())?;

    let store = serde_wasm_bindgen::from_value::<StoreRepo>(store_repo)
        .map_err(|_| "Deserialization error of store_repo".to_string())?;

    let destination = DocCreateDestination::from(destination).map_err(|e| e.to_string())?;

    let request = AppRequest::V0(AppRequestV0 {
        session_id,
        command: AppRequestCommandV0::new_create(),
        nuri: NuriV0::new_empty(),
        payload: Some(AppRequestPayload::V0(AppRequestPayloadV0::Create(
            DocCreate {
                store,
                class,
                destination,
            },
        ))),
    });

    let response = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    if let AppResponse::V0(AppResponseV0::Nuri(nuri)) = response {
        Ok(serde_wasm_bindgen::to_value(&nuri).unwrap())
    } else {
        Err("invalid response".to_string())
    }
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen]
pub async fn doc_create(
    session_id: JsValue,
    crdt: String,
    class_name: String,
    store_type: String,
    store_repo: String,
    destination: String,
) -> Result<JsValue, String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Deserialization error of session_id".to_string())?;

    let class = BranchCrdt::from(crdt, class_name).map_err(|e| e.to_string())?;

    let store = StoreRepo::from_type_and_repo(&store_type, &store_repo)
        .map_err(|_| "invalid store_repo".to_string())?;

    let destination = DocCreateDestination::from(destination).map_err(|e| e.to_string())?;

    let request = AppRequest::V0(AppRequestV0 {
        session_id,
        command: AppRequestCommandV0::new_create(),
        nuri: NuriV0::new_empty(),
        payload: Some(AppRequestPayload::V0(AppRequestPayloadV0::Create(
            DocCreate {
                store,
                class,
                destination,
            },
        ))),
    });

    let response = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    if let AppResponse::V0(AppResponseV0::Nuri(nuri)) = response {
        Ok(serde_wasm_bindgen::to_value(&nuri).unwrap())
    } else {
        Err("invalid response".to_string())
    }
}

#[wasm_bindgen]
pub async fn file_get_from_private_store(
    session_id: JsValue,
    nuri: String,
    callback: &js_sys::Function,
) -> Result<JsValue, String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Deserialization error of session_id".to_string())?;

    let nuri = NuriV0::new_from(&nuri).map_err(|e| format!("nuri: {}", e.to_string()))?;

    let branch_nuri = NuriV0::new_private_store_target();

    file_get_(session_id, nuri, branch_nuri, callback).await
}

#[wasm_bindgen]
pub async fn file_get(
    session_id: JsValue,
    reference: JsValue,
    branch_nuri: String,
    callback: &js_sys::Function,
) -> Result<JsValue, String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Deserialization error of session_id".to_string())?;
    let reference: BlockRef = serde_wasm_bindgen::from_value::<BlockRef>(reference)
        .map_err(|_| "Deserialization error of file reference".to_string())?;

    let branch_nuri =
        NuriV0::new_from(&branch_nuri).map_err(|e| format!("branch_nuri: {}", e.to_string()))?;

    file_get_(
        session_id,
        NuriV0::new_from_obj_ref(&reference),
        branch_nuri,
        callback,
    )
    .await
}

async fn file_get_(
    session_id: u64,
    mut nuri: NuriV0,
    branch_nuri: NuriV0,
    callback: &js_sys::Function,
) -> Result<JsValue, String> {
    nuri.copy_target_from(&branch_nuri);

    let mut request = AppRequest::new(AppRequestCommandV0::FileGet, nuri, None);
    request.set_session_id(session_id);

    app_request_stream_(request, callback).await
}

async fn do_upload_done(
    upload_id: u32,
    session_id: u64,
    nuri: NuriV0,
    filename: String,
) -> Result<ObjectRef, String> {
    let mut request = AppRequest::new(
        AppRequestCommandV0::FilePut,
        nuri.clone(),
        Some(AppRequestPayload::V0(
            AppRequestPayloadV0::RandomAccessFilePutChunk((upload_id, serde_bytes::ByteBuf::new())),
        )),
    );
    request.set_session_id(session_id);

    let response = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    let reference = match response {
        AppResponse::V0(AppResponseV0::FileUploaded(refe)) => refe,
        _ => return Err("invalid response".to_string()),
    };

    let mut request = AppRequest::new(
        AppRequestCommandV0::FilePut,
        nuri,
        Some(AppRequestPayload::V0(AppRequestPayloadV0::AddFile(
            DocAddFile {
                filename: Some(filename),
                object: reference.clone(),
            },
        ))),
    );
    request.set_session_id(session_id);

    nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    Ok(reference)
}

#[cfg(wasmpack_target = "nodejs")]
async fn do_upload_done_(
    upload_id: u32,
    session_id: u64,
    nuri: NuriV0,
    filename: String,
) -> Result<JsValue, JsValue> {
    let response = do_upload_done(upload_id, session_id, nuri, filename)
        .await
        .map_err(|e| {
            let ee: JsValue = e.into();
            ee
        })?;

    Ok(serde_wasm_bindgen::to_value(&response).unwrap())
}

#[wasm_bindgen]
pub async fn upload_done(
    upload_id: JsValue,
    session_id: JsValue,
    nuri: JsValue,
    filename: String,
) -> Result<JsValue, String> {
    let upload_id: u32 = serde_wasm_bindgen::from_value::<u32>(upload_id)
        .map_err(|_| "Deserialization error of upload_id".to_string())?;
    let nuri: NuriV0 = serde_wasm_bindgen::from_value::<NuriV0>(nuri)
        .map_err(|_| "Deserialization error of nuri".to_string())?;
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Deserialization error of session_id".to_string())?;

    let reference = do_upload_done(upload_id, session_id, nuri, filename).await?;

    Ok(serde_wasm_bindgen::to_value(&reference).unwrap())
}

async fn do_upload_start(session_id: u64, nuri: NuriV0, mimetype: String) -> Result<u32, String> {
    let mut request = AppRequest::new(
        AppRequestCommandV0::FilePut,
        nuri,
        Some(AppRequestPayload::V0(
            AppRequestPayloadV0::RandomAccessFilePut(mimetype),
        )),
    );
    request.set_session_id(session_id);

    let response = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    match response {
        AppResponse::V0(AppResponseV0::FileUploading(upload_id)) => Ok(upload_id),
        _ => Err("invalid response".to_string()),
    }
}

#[wasm_bindgen]
pub async fn upload_start(
    session_id: JsValue,
    nuri: String,
    mimetype: String,
) -> Result<JsValue, String> {
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Deserialization error of session_id".to_string())?;
    let nuri: NuriV0 = NuriV0::new_from(&nuri).map_err(|e| e.to_string())?;

    let upload_id = do_upload_start(session_id, nuri, mimetype).await?;

    Ok(serde_wasm_bindgen::to_value(&upload_id).unwrap())
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen]
pub async fn file_put_to_private_store(
    session_id: JsValue,
    filename: String,
    mimetype: String,
) -> Result<String, String> {
    let target = NuriV0::new_private_store_target();

    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Deserialization error of session_id".to_string())?;

    let upload_id = do_upload_start(session_id, target.clone(), mimetype).await?;
    let target_for_chunk = target.clone();
    let cb_chunk = Closure::new(move |chunk| {
        let chunk_res = serde_wasm_bindgen::from_value::<serde_bytes::ByteBuf>(chunk);
        match chunk_res {
            Err(_e) => {
                js_sys::Promise::reject(&JsValue::from_str("Deserialization error of chunk"))
            }
            Ok(chunk) => future_to_promise(do_upload_chunk_(
                session_id,
                upload_id,
                chunk,
                target_for_chunk.clone(),
            )),
        }
    });

    let cb_end = Closure::new(move |file| {
        future_to_promise(do_upload_done_(upload_id, session_id, target.clone(), file))
    });

    let reference = upload_file(filename, &cb_chunk, &cb_end)
        .await
        .map_err(|e| e.as_string().unwrap())?;
    let reference = serde_wasm_bindgen::from_value::<ObjectRef>(reference)
        .map_err(|_| "Deserialization error of reference".to_string())?;
    let nuri = format!("did:ng:{}", reference.object_nuri());
    Ok(nuri)
}

async fn do_upload_chunk(
    session_id: u64,
    upload_id: u32,
    chunk: serde_bytes::ByteBuf,
    nuri: NuriV0,
) -> Result<AppResponse, String> {
    let mut request = AppRequest::new(
        AppRequestCommandV0::FilePut,
        nuri,
        Some(AppRequestPayload::V0(
            AppRequestPayloadV0::RandomAccessFilePutChunk((upload_id, chunk)),
        )),
    );
    request.set_session_id(session_id);

    nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[cfg(wasmpack_target = "nodejs")]
async fn do_upload_chunk_(
    session_id: u64,
    upload_id: u32,
    chunk: serde_bytes::ByteBuf,
    nuri: NuriV0,
) -> Result<JsValue, JsValue> {
    let response = do_upload_chunk(session_id, upload_id, chunk, nuri)
        .await
        .map_err(|e| {
            let ee: JsValue = e.into();
            ee
        })?;

    Ok(serde_wasm_bindgen::to_value(&response).unwrap())
}

#[wasm_bindgen]
pub async fn upload_chunk(
    session_id: JsValue,
    upload_id: JsValue,
    chunk: JsValue,
    nuri: String,
) -> Result<JsValue, String> {
    //log_debug!("upload_chunk {:?}", js_nuri);
    let session_id: u64 = serde_wasm_bindgen::from_value::<u64>(session_id)
        .map_err(|_| "Deserialization error of session_id".to_string())?;
    let upload_id: u32 = serde_wasm_bindgen::from_value::<u32>(upload_id)
        .map_err(|_| "Deserialization error of upload_id".to_string())?;
    let chunk: serde_bytes::ByteBuf = serde_wasm_bindgen::from_value::<serde_bytes::ByteBuf>(chunk)
        .map_err(|_| "Deserialization error of chunk".to_string())?;
    let nuri: NuriV0 = NuriV0::new_from(&nuri).map_err(|e| e.to_string())?;

    let response = do_upload_chunk(session_id, upload_id, chunk, nuri).await?;

    Ok(serde_wasm_bindgen::to_value(&response).unwrap())
}

#[wasm_bindgen]
pub async fn doc_fetch_private_subscribe() -> Result<JsValue, String> {
    let request = AppRequest::new(
        AppRequestCommandV0::Fetch(AppFetchContentV0::get_or_subscribe(true)),
        NuriV0::new_private_store_target(),
        None,
    );
    Ok(serde_wasm_bindgen::to_value(&request).unwrap())
}

#[wasm_bindgen]
pub async fn doc_fetch_repo_subscribe(repo_o: String) -> Result<JsValue, String> {
    Ok(serde_wasm_bindgen::to_value(
        &AppRequest::doc_fetch_repo_subscribe(repo_o).map_err(|e| e.to_string())?,
    )
    .unwrap())
}

// // #[wasm_bindgen]
// pub async fn get_readcap() -> Result<JsValue, String> {
//     let request = ObjectRef::nil();
//     Ok(serde_wasm_bindgen::to_value(&request).unwrap())
// }

#[wasm_bindgen]
pub async fn disconnections_subscribe(callback: &js_sys::Function) -> Result<JsValue, JsValue> {
    init_local_broker_with_lazy(&INIT_LOCAL_BROKER).await;

    let reader = nextgraph::local_broker::take_disconnections_receiver()
        .await
        .map_err(|_e: NgError| false)?;

    async fn inner_task(
        mut reader: Receiver<String>,
        callback: js_sys::Function,
    ) -> ResultSend<()> {
        while let Some(user_id) = reader.next().await {
            let this = JsValue::null();
            let user_id_js = serde_wasm_bindgen::to_value(&user_id).unwrap();
            match callback.call1(&this, &user_id_js) {
                Ok(jsval) => {
                    let promise_res: Result<js_sys::Promise, JsValue> = jsval.dyn_into();
                    match promise_res {
                        Ok(promise) => {
                            let _ = JsFuture::from(promise).await;
                        }
                        Err(_) => {}
                    }
                }
                Err(e) => {
                    log_err!(
                        "JS callback for disconnections_subscribe failed with {:?}",
                        e
                    );
                }
            }
        }
        log_debug!("END OF disconnections reader");
        Ok(())
    }

    spawn_and_log_error(inner_task(reader, callback.clone()));
    Ok(true.into())
}

#[wasm_bindgen]
pub async fn probe() {
    let _res = BROKER
        .write()
        .await
        .probe(
            Box::new(ConnectionWebSocket {}),
            IP::try_from(&IpAddr::from_str("127.0.0.1").unwrap()).unwrap(),
            WS_PORT,
        )
        .await;
    log_debug!("broker.probe : {:?}", _res);

    let _ = Broker::join_shutdown_with_timeout(std::time::Duration::from_secs(5)).await;
}

#[cfg(wasmpack_target = "nodejs")]
#[derive(Serialize, Deserialize)]
struct HeadLessConfigStrings {
    server_addr: Option<String>,
    server_peer_id: Option<String>,
    client_peer_key: Option<String>,
    admin_user_key: Option<String>,
}

#[cfg(wasmpack_target = "nodejs")]
impl HeadLessConfigStrings {
    fn load(config: JsValue) -> Result<HeadlessConfig, String> {
        let string_config = if config.is_object() {
            serde_wasm_bindgen::from_value::<HeadLessConfigStrings>(config)
                .map_err(|_| "Deserialization error of config object".to_string())?
        } else {
            HeadLessConfigStrings {
                server_addr: None,
                server_peer_id: None,
                client_peer_key: None,
                admin_user_key: None,
            }
        };
        let var_env_config =
            serde_wasm_bindgen::from_value::<HeadLessConfigStrings>(get_env_vars())
                .map_err(|_| "Deserialization error of env vars".to_string())?;

        let server_addr = if let Some(s) = string_config.server_addr {
            parse_ip_and_port_for(s, "server_addr").map_err(|e: NgError| e.to_string())?
        } else {
            if let Some(s) = var_env_config.server_addr {
                parse_ip_and_port_for(s, "server_addr from var env")
                    .map_err(|e: NgError| e.to_string())?
            } else {
                BindAddress::new_localhost_with_port(WS_PORT_REVERSE_PROXY)
            }
        };

        let server_peer_id = if let Some(s) = string_config.server_peer_id {
            Some(decode_key(&s).map_err(|e: NgError| e.to_string())?)
        } else {
            if let Some(s) = var_env_config.server_peer_id {
                Some(decode_key(&s).map_err(|e: NgError| e.to_string())?)
            } else {
                None
            }
        }
        .ok_or("No server_peer_id found in config nor env var.".to_string())?;

        let client_peer_key = if let Some(s) = string_config.client_peer_key {
            Some(decode_priv_key(&s).map_err(|e: NgError| e.to_string())?)
        } else {
            if let Some(s) = var_env_config.client_peer_key {
                Some(decode_priv_key(&s).map_err(|e: NgError| e.to_string())?)
            } else {
                None
            }
        };

        let admin_user_key = if let Some(s) = string_config.admin_user_key {
            Some(decode_priv_key(&s).map_err(|e: NgError| e.to_string())?)
        } else {
            if let Some(s) = var_env_config.admin_user_key {
                Some(decode_priv_key(&s).map_err(|e: NgError| e.to_string())?)
            } else {
                None
            }
        };

        Ok(HeadlessConfig {
            server_addr,
            server_peer_id,
            client_peer_key,
            admin_user_key,
        })
    }
}
/*
#[doc(hidden)]
#[derive(Debug)]
pub struct HeadlessConfig {
    // parse_ip_and_port_for(string, "verifier_server")
    pub server_addr: Option<BindAddress>,
    // decode_key(string)
    pub server_peer_id: PubKey,
    // decode_priv_key(string)
    pub client_peer_key: PrivKey,
}*/

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen]
pub async fn init_headless(config: JsValue) -> Result<(), String> {
    //log_info!("{:?}", js_config);

    let config = HeadLessConfigStrings::load(config)?;
    let _ = config
        .client_peer_key
        .as_ref()
        .ok_or("No client_peer_key found in config nor env var.".to_string())?;

    init_local_broker(Box::new(move || {
        LocalBrokerConfig::Headless(config.clone())
    }))
    .await;

    Ok(())
}

#[wasm_bindgen]
pub async fn start() {
    async fn inner_task() -> ResultSend<()> {
        Ok(())
    }
    spawn_and_log_error(inner_task()).await;
}

#[wasm_bindgen]
pub async fn session_stop(user_id_js: String) -> Result<(), String> {
    let user_id = decode_key(&user_id_js).map_err(|_| "Invalid user_id")?;

    nextgraph::local_broker::session_stop(&user_id)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[wasm_bindgen]
pub async fn user_disconnect(user_id_js: String) -> Result<(), String> {
    let user_id = decode_key(&user_id_js).map_err(|_| "Invalid user_id")?;

    nextgraph::local_broker::user_disconnect(&user_id)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[wasm_bindgen]
pub async fn wallet_close(wallet_name: String) -> Result<(), String> {
    nextgraph::local_broker::wallet_close(&wallet_name)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[wasm_bindgen]
pub async fn user_connect(
    client_info_js: JsValue,
    user_id_js: String,
    location: Option<String>,
) -> Result<JsValue, String> {
    let info = serde_wasm_bindgen::from_value::<ClientInfo>(client_info_js)
        .map_err(|_| "serde error on info")?;
    let user_id = decode_key(&user_id_js).map_err(|_| "Invalid user_id")?;

    #[derive(Serialize, Deserialize)]
    struct ConnectionInfo {
        pub server_id: String,
        pub server_ip: String,
        pub error: Option<String>,
        #[serde(with = "serde_wasm_bindgen::preserve")]
        pub since: js_sys::Date,
    }

    let mut opened_connections: HashMap<String, ConnectionInfo> = HashMap::new();

    let results = nextgraph::local_broker::user_connect_with_device_info(info, &user_id, location)
        .await
        .map_err(|e: NgError| e.to_string())?;

    log_debug!("{:?}", results);

    for result in results {
        let date = js_sys::Date::new_0();
        date.set_time(result.4);
        opened_connections.insert(
            result.0,
            ConnectionInfo {
                server_id: result.1,
                server_ip: result.2,
                error: result.3,
                since: date,
            },
        );
    }

    //BROKER.read().await.print_status();

    Ok(opened_connections
        .serialize(&serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true))
        .unwrap())
}

#[cfg(test)]
mod test {
    use wasm_bindgen_test::*;
    wasm_bindgen_test_configure!(run_in_browser);
    //use crate::probe;
    use crate::start;

    #[wasm_bindgen_test]
    pub async fn test_connection() {
        //probe().await;
        start().await;
    }
}
