/*
 * Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
*/

use async_std::task;
// #[cfg(target_arch = "wasm32")]
// use js_sys::Reflect;
use async_std::stream::StreamExt;
#[cfg(target_arch = "wasm32")]
use js_sys::Uint8Array;
use ng_wallet::types::*;
use ng_wallet::*;
#[cfg(target_arch = "wasm32")]
use p2p_client_ws::remote_ws_wasm::ConnectionWebSocket;
use p2p_net::broker::*;
use p2p_net::connection::{ClientConfig, StartConfig};
use p2p_net::types::{
    BootstrapContent, BootstrapContentV0, ClientId, ClientInfo, ClientInfoV0, ClientType,
    CreateAccountBSP, DirectPeerId, UserId, IP,
};
use p2p_net::utils::{
    decode_invitation_string, retrieve_local_bootstrap, retrieve_local_url, spawn_and_log_error,
    Receiver, ResultSend, Sender,
};
use p2p_net::WS_PORT;
use p2p_repo::log::*;
use p2p_repo::types::*;
use p2p_repo::utils::generate_keypair;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::net::IpAddr;
use std::str::FromStr;
use std::sync::Arc;
use wasm_bindgen::prelude::*;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen_futures::{future_to_promise, JsFuture};

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn get_local_bootstrap(location: String, invite: JsValue) -> JsValue {
    let res = retrieve_local_bootstrap(location, invite.as_string(), false).await;
    if res.is_some() {
        serde_wasm_bindgen::to_value(&res.unwrap()).unwrap()
    } else {
        JsValue::FALSE
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn decode_invitation(invite: String) -> JsValue {
    let res = decode_invitation_string(invite);
    if res.is_some() {
        serde_wasm_bindgen::to_value(&res.unwrap()).unwrap()
    } else {
        JsValue::FALSE
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn get_local_url(location: String) -> JsValue {
    let res = retrieve_local_url(location).await;
    if res.is_some() {
        serde_wasm_bindgen::to_value(&res.unwrap()).unwrap()
    } else {
        JsValue::FALSE
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn get_local_bootstrap_with_public(location: String, invite: JsValue) -> JsValue {
    let res = retrieve_local_bootstrap(location, invite.as_string(), true).await;
    if res.is_some() {
        serde_wasm_bindgen::to_value(&res.unwrap()).unwrap()
    } else {
        JsValue::FALSE
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn wallet_gen_shuffle_for_pazzle_opening(pazzle_length: u8) -> JsValue {
    let res = gen_shuffle_for_pazzle_opening(pazzle_length);
    serde_wasm_bindgen::to_value(&res).unwrap()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn wallet_gen_shuffle_for_pin() -> Vec<u8> {
    gen_shuffle_for_pin()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn wallet_open_wallet_with_pazzle(
    js_wallet: JsValue,
    pazzle: Vec<u8>,
    js_pin: JsValue,
) -> Result<JsValue, JsValue> {
    let wallet = serde_wasm_bindgen::from_value::<Wallet>(js_wallet)
        .map_err(|_| "Deserialization error of wallet")?;
    let mut pin = serde_wasm_bindgen::from_value::<[u8; 4]>(js_pin)
        .map_err(|_| "Deserialization error of pin")?;
    let res = open_wallet_with_pazzle(wallet, pazzle, pin);
    match res {
        Ok(r) => Ok(serde_wasm_bindgen::to_value(&r).unwrap()),
        Err(e) => Err(e.to_string().into()),
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn wallet_update(js_wallet_id: JsValue, js_operations: JsValue) -> Result<JsValue, JsValue> {
    let wallet = serde_wasm_bindgen::from_value::<WalletId>(js_wallet_id)
        .map_err(|_| "Deserialization error of WalletId")?;
    let operations = serde_wasm_bindgen::from_value::<Vec<WalletOperation>>(js_operations)
        .map_err(|_| "Deserialization error of operations")?;
    unimplemented!();
    // match res {
    //     Ok(r) => Ok(serde_wasm_bindgen::to_value(&r).unwrap()),
    //     Err(e) => Err(e.to_string().into()),
    // }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct SessionWalletStorageV0 {
    // string is base64_url encoding of userId(pubkey)
    users: HashMap<String, SessionPeerStorageV0>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
enum SessionWalletStorage {
    V0(SessionWalletStorageV0),
}

impl SessionWalletStorageV0 {
    fn new() -> Self {
        SessionWalletStorageV0 {
            users: HashMap::new(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct SessionPeerStorageV0 {
    user: UserId,
    peer_key: PrivKey,
    last_wallet_nonce: u64,
    // string is base64_url encoding of branchId(pubkey)
    branches_last_seq: HashMap<String, u64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct LocalWalletStorageV0 {
    bootstrap: BootstrapContent,
    wallet: Wallet,
    client: ClientId,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
enum LocalWalletStorage {
    V0(HashMap<String, LocalWalletStorageV0>),
}

fn get_local_wallets_v0() -> Result<HashMap<String, LocalWalletStorageV0>, ()> {
    let wallets_string = local_get("ng_wallets".to_string());
    if wallets_string.is_some() {
        let map_ser = base64_url::decode(&wallets_string.unwrap()).unwrap();
        let wallets: LocalWalletStorage = serde_bare::from_slice(&map_ser).unwrap();
        let LocalWalletStorage::V0(v0) = wallets;
        Ok(v0)
    } else {
        Err(())
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn get_wallets_from_localstorage() -> JsValue {
    let res = get_local_wallets_v0();
    if res.is_ok() {
        return serde_wasm_bindgen::to_value(&res.unwrap()).unwrap();
    }
    JsValue::UNDEFINED
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn get_local_session(id: String, key_js: JsValue, user_js: JsValue) -> JsValue {
    let res = session_get(format!("ng_wallet@{}", id));
    if res.is_some() {
        log_debug!("RESUMING SESSION");
        let key = serde_wasm_bindgen::from_value::<PrivKey>(key_js).unwrap();
        let decoded = base64_url::decode(&res.unwrap()).unwrap();
        let session_ser = crypto_box::seal_open(&(*key.to_dh().slice()).into(), &decoded).unwrap();
        let session: SessionWalletStorage = serde_bare::from_slice(&session_ser).unwrap();
        let SessionWalletStorage::V0(v0) = session;
        return serde_wasm_bindgen::to_value(&v0).unwrap();
    } else {
        // create a new session
        let user = serde_wasm_bindgen::from_value::<PubKey>(user_js).unwrap();
        let wallet_id: PubKey = id.as_str().try_into().unwrap();
        let session_v0 = create_new_session(&id, wallet_id, user);
        if session_v0.is_err() {
            return JsValue::UNDEFINED;
        }
        return serde_wasm_bindgen::to_value(&session_v0.unwrap()).unwrap();
    }
    JsValue::UNDEFINED
}

fn create_new_session(
    wallet_name: &String,
    wallet_id: PubKey,
    user: PubKey,
) -> Result<SessionWalletStorageV0, String> {
    let peer = generate_keypair();
    let mut sws = SessionWalletStorageV0::new();
    let sps = SessionPeerStorageV0 {
        user,
        peer_key: peer.0,
        last_wallet_nonce: 0,
        branches_last_seq: HashMap::new(),
    };
    sws.users.insert(user.to_string(), sps);
    let sws_ser = serde_bare::to_vec(&SessionWalletStorage::V0(sws.clone())).unwrap();
    let mut rng = crypto_box::aead::OsRng {};
    let cipher = crypto_box::seal(&mut rng, &wallet_id.to_dh_slice().into(), &sws_ser);
    if cipher.is_ok() {
        let encoded = base64_url::encode(&cipher.unwrap());
        let r = session_save(format!("ng_wallet@{}", wallet_name), encoded);
        if r.is_some() {
            return Err(r.unwrap());
        }
    }
    Ok(sws)
}

fn save_wallet_locally(res: &CreateWalletResultV0) -> Result<SessionWalletStorageV0, String> {
    // let mut sws = SessionWalletStorageV0::new();
    // let sps = SessionPeerStorageV0 {
    //     user: res.user,
    //     peer_key: res.peer_key.clone(),
    //     last_wallet_nonce: res.nonce,
    //     branches_last_seq: HashMap::new(),
    // };
    // sws.users.insert(res.user.to_string(), sps);
    // let sws_ser = serde_bare::to_vec(&SessionWalletStorage::V0(sws.clone())).unwrap();
    // let mut rng = crypto_box::aead::OsRng {};
    // let cipher = crypto_box::seal(&mut rng, &res.wallet.id().to_dh_slice().into(), &sws_ser);
    // if cipher.is_ok() {
    //     let encoded = base64_url::encode(&cipher.unwrap());
    //     let r = session_save(format!("ng_wallet@{}", res.wallet_name), encoded);
    //     if r.is_some() {
    //         return Err(r.unwrap());
    //     }
    // }
    let sws = create_new_session(&res.wallet_name, res.wallet.id(), res.user)?;
    let mut wallets: HashMap<String, LocalWalletStorageV0> =
        get_local_wallets_v0().unwrap_or(HashMap::new());
    // TODO: check that the wallet is not already present in localStorage
    let lws = LocalWalletStorageV0 {
        bootstrap: BootstrapContent::V0(BootstrapContentV0 { servers: vec![] }),
        wallet: res.wallet.clone(),
        client: res.client.priv_key.to_pub(),
    };
    wallets.insert(res.wallet_name.clone(), lws);
    let lws_ser = serde_bare::to_vec(&LocalWalletStorage::V0(wallets)).unwrap();
    let encoded = base64_url::encode(&lws_ser);
    let r = local_save("ng_wallets".to_string(), encoded);
    if r.is_some() {
        return Err(r.unwrap());
    }
    Ok(sws)
}

#[cfg(not(wasmpack_target = "nodejs"))]
#[wasm_bindgen(module = "/js/browser.js")]
extern "C" {
    fn session_save(key: String, value: String) -> Option<String>;
    fn session_get(key: String) -> Option<String>;
    fn local_save(key: String, value: String) -> Option<String>;
    fn local_get(key: String) -> Option<String>;
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen(module = "/js/node.js")]
extern "C" {
    fn session_save(key: String, value: String) -> Option<String>;
    fn session_get(key: String) -> Option<String>;
    fn local_save(key: String, value: String) -> Option<String>;
    fn local_get(key: String) -> Option<String>;
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn wallet_create_wallet(js_params: JsValue) -> Result<JsValue, JsValue> {
    let mut params = serde_wasm_bindgen::from_value::<CreateWalletV0>(js_params)
        .map_err(|_| "Deserialization error of args")?;
    params.result_with_wallet_file = true;
    let res = create_wallet_v0(params).await;
    match res {
        Ok(r) => {
            let session = save_wallet_locally(&r)?;
            Ok(serde_wasm_bindgen::to_value(&(r, session)).unwrap())
        }
        Err(e) => Err(e.to_string().into()),
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn test_create_wallet() -> JsValue {
    let pin = [5, 2, 9, 1];
    let r = CreateWalletV0::new(
        vec![50u8; 20],
        "   know     yourself  ".to_string(),
        pin,
        9,
        false,
        false,
    );
    serde_wasm_bindgen::to_value(&r).unwrap()
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen(module = "/js/node.js")]
extern "C" {
    fn client_details() -> String;
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen(module = "/js/node.js")]
extern "C" {
    fn version() -> String;
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen]
pub fn client_info() -> JsValue {
    let res = ClientInfoV0 {
        client_type: ClientType::NodeService,
        details: client_details(),
        version: version(),
        timestamp_install: 0,
        timestamp_updated: 0,
    };
    //res
    serde_wasm_bindgen::to_value(&res).unwrap()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn encode_create_account(payload: JsValue) -> JsValue {
    log_debug!("{:?}", payload);
    let create_account = serde_wasm_bindgen::from_value::<CreateAccountBSP>(payload).unwrap();
    log_debug!("create_account {:?}", create_account);
    let res = create_account.encode();
    log_debug!("res {:?}", res);
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

#[cfg(all(not(wasmpack_target = "nodejs"), target_arch = "wasm32"))]
#[wasm_bindgen]
pub fn client_info() -> JsValue {
    let res = client_info_();
    serde_wasm_bindgen::to_value(&res).unwrap()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn test() {
    log_debug!("test is {}", BROKER.read().await.test());
    let client_info = client_info();
    log_debug!("{:?}", client_info);
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn doc_get_file_from_store_with_object_ref(
    nuri: String,
    obj_ref_js: JsValue,
) -> Result<JsValue, JsValue> {
    let obj_ref = serde_wasm_bindgen::from_value::<ObjectRef>(obj_ref_js).unwrap();

    log_debug!(
        "doc_get_file {} {:?} {}",
        nuri,
        obj_ref.id,
        BROKER.read().await.test()
    );

    // let vec: Vec<u8> = vec![2; 10];
    // let view = unsafe { Uint8Array::view(&vec) };
    // let x = JsValue::from(Uint8Array::new(view.as_ref()));

    // let ret = ObjectContent::File(File::V0(FileV0 {
    //     content_type: "text/plain".to_string(),
    //     metadata: vec![],
    //     content: vec![45; 20],
    // }));
    let obj_content = BROKER
        .write()
        .await
        .get_object_from_store_with_object_ref(nuri, obj_ref)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_wasm_bindgen::to_value(&obj_content).unwrap())
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn doc_sync_branch(anuri: String, callback: &js_sys::Function) -> JsValue {
    let vec: Vec<u8> = vec![2; 10];
    let view = unsafe { Uint8Array::view(&vec) };
    let x = JsValue::from(Uint8Array::new(view.as_ref()));

    let mut reader;
    let mut sender;
    {
        (reader, sender) = BROKER.write().await.doc_sync_branch(anuri.clone()).await;
    }

    async fn inner_task(
        mut reader: Receiver<Commit>,
        anuri: String,
        callback: js_sys::Function,
    ) -> ResultSend<()> {
        while let Some(commit) = reader.next().await {
            let xx = serde_wasm_bindgen::to_value(&commit).unwrap();
            //let xx = JsValue::from(json!(commit).to_string());
            //let _ = callback.call1(&this, &xx);
            let this = JsValue::null();
            let jsval: JsValue = callback.call1(&this, &xx).unwrap();
            let promise_res: Result<js_sys::Promise, JsValue> = jsval.dyn_into();
            match promise_res {
                Ok(promise) => {
                    JsFuture::from(promise).await;
                }
                Err(_) => {}
            }
        }
        log_debug!("END OF LOOP");
        Ok(())
    }

    spawn_and_log_error(inner_task(reader, anuri, callback.clone()));

    let cb = Closure::once(move || {
        log_debug!("close channel");
        sender.close_channel()
    });
    //Closure::wrap(Box::new(move |sender| sender.close_channel()) as Box<FnMut(Sender<Commit>)>);
    let ret = cb.as_ref().clone();
    cb.forget();
    return ret;
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn probe() {
    let res = BROKER
        .write()
        .await
        .probe(
            Box::new(ConnectionWebSocket {}),
            IP::try_from(&IpAddr::from_str("127.0.0.1").unwrap()).unwrap(),
            WS_PORT,
        )
        .await;
    log_debug!("broker.probe : {:?}", res);

    Broker::join_shutdown_with_timeout(std::time::Duration::from_secs(5)).await;
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn start() {
    async fn inner_task() -> ResultSend<()> {
        let server_key: PubKey = "X0nh-gOTGKSx0yL0LYJviOWRNacyqIzjQW_LKdK6opU".try_into()?;
        log_debug!("server_key:{}", server_key);

        //let keys = p2p_net::utils::gen_dh_keys();
        //let pub_key = PubKey::Ed25519PubKey(keys.1);
        let keys = generate_keypair();
        let x_from_ed = keys.1.to_dh_from_ed();
        log_debug!("Pub from X {}", x_from_ed);

        let (client_priv, client) = generate_keypair();
        let (user_priv, user) = generate_keypair();

        log_debug!("start connecting");

        let res = BROKER
            .write()
            .await
            .connect(
                Box::new(ConnectionWebSocket {}),
                keys.0,
                keys.1,
                server_key,
                StartConfig::Client(ClientConfig {
                    url: format!("ws://127.0.0.1:{}", WS_PORT),
                    user,
                    user_priv,
                    client,
                    client_priv,
                    info: ClientInfo::V0(client_info_()),
                    registration: None,
                }),
            )
            .await;
        log_debug!("broker.connect : {:?}", res);
        if res.is_err() {
            return Ok(());
            //panic!("Cannot connect");
        }
        BROKER.read().await.print_status();

        //res.expect_throw("assume the connection succeeds");

        async fn timer_close(remote_peer_id: DirectPeerId, user: Option<PubKey>) -> ResultSend<()> {
            async move {
                sleep!(std::time::Duration::from_secs(3));
                log_debug!("timeout");
                BROKER
                    .write()
                    .await
                    .close_peer_connection(&remote_peer_id, user)
                    .await;
            }
            .await;
            Ok(())
        }
        spawn_and_log_error(timer_close(server_key, Some(user)));

        //Broker::graceful_shutdown().await;

        Broker::join_shutdown_with_timeout(std::time::Duration::from_secs(5)).await;

        Ok(())
    }
    spawn_and_log_error(inner_task()).await;
}

#[cfg(not(target_arch = "wasm32"))]
#[wasm_bindgen]
pub fn start() {
    //alert(&format!("I say: {}", name));
    task::spawn(async move {});
}

#[wasm_bindgen]
pub fn change(name: &str) -> JsValue {
    let mut random_buf = [0u8; 32];
    getrandom::getrandom(&mut random_buf).unwrap();
    JsValue::from_str(&format!("Hellooo, {}!", name))
}

#[cfg(target_arch = "wasm32")]
#[cfg(test)]
mod test {
    use wasm_bindgen_test::*;
    wasm_bindgen_test_configure!(run_in_browser);
    use crate::probe;
    use crate::start;

    #[wasm_bindgen_test]
    pub async fn test_connection() {
        //probe().await;
        start().await;
    }
}
