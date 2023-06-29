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
use p2p_net::types::{DirectPeerId, IP};
use p2p_net::utils::{spawn_and_log_error, Receiver, ResultSend, Sender};
use p2p_net::WS_PORT;
use p2p_repo::log::*;
use p2p_repo::types::*;
use p2p_repo::utils::generate_keypair;
use serde_json::json;
use std::net::IpAddr;
use std::str::FromStr;
use std::sync::Arc;
use wasm_bindgen::prelude::*;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen_futures::{future_to_promise, JsFuture};

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
pub async fn wallet_create_wallet(js_params: JsValue) -> Result<JsValue, JsValue> {
    let mut params = serde_wasm_bindgen::from_value::<CreateWalletV0>(js_params)
        .map_err(|_| "Deserialization error of args")?;
    params.result_with_wallet_file = true;
    let res = create_wallet_v0(params).await;
    match res {
        Ok(r) => Ok(serde_wasm_bindgen::to_value(&r).unwrap()),
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
        None,
        false,
        PubKey::Ed25519PubKey([
            119, 251, 253, 29, 135, 199, 254, 50, 134, 67, 1, 208, 117, 196, 167, 107, 2, 113, 98,
            243, 49, 90, 7, 0, 157, 58, 14, 187, 14, 3, 116, 86,
        ]),
        0,
    );
    serde_wasm_bindgen::to_value(&r).unwrap()
}

#[cfg(wasmpack_target = "nodejs")]
#[wasm_bindgen(module = "/js/node.js")]
extern "C" {
    fn random(max: usize) -> usize;
}

#[cfg(not(wasmpack_target = "nodejs"))]
#[wasm_bindgen(module = "/js/browser.js")]
extern "C" {
    fn random(max: usize) -> usize;
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn test() {
    log_info!("test is {}", BROKER.read().await.test());
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn doc_get_file_from_store_with_object_ref(
    nuri: String,
    obj_ref_js: JsValue,
) -> Result<JsValue, JsValue> {
    let obj_ref = serde_wasm_bindgen::from_value::<ObjectRef>(obj_ref_js).unwrap();

    log_info!(
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
        log_info!("END OF LOOP");
        Ok(())
    }

    spawn_and_log_error(inner_task(reader, anuri, callback.clone()));

    let cb = Closure::once(move || {
        log_info!("close channel");
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
    log_info!("broker.probe : {:?}", res);

    Broker::join_shutdown_with_timeout(std::time::Duration::from_secs(5)).await;
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn start() {
    log_info!("random {}", random(10));

    // let mut random_buf = [0u8; 32];
    // getrandom::getrandom(&mut random_buf).unwrap();

    async fn inner_task() -> ResultSend<()> {
        let server_key: PubKey = "X0nh-gOTGKSx0yL0LYJviOWRNacyqIzjQW_LKdK6opU".try_into()?;
        log_debug!("server_key:{}", server_key);

        //let keys = p2p_net::utils::gen_dh_keys();
        //let pub_key = PubKey::Ed25519PubKey(keys.1);
        let keys = generate_keypair();
        let x_from_ed = keys.1.to_dh_from_ed();
        log_info!("Pub from X {}", x_from_ed);

        let (client_priv, client) = generate_keypair();
        let (user_priv, user) = generate_keypair();

        log_info!("start connecting");

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
                }),
            )
            .await;
        log_info!("broker.connect : {:?}", res);
        if res.is_err() {
            return Ok(());
            //panic!("Cannot connect");
        }
        BROKER.read().await.print_status();

        //res.expect_throw("assume the connection succeeds");

        async fn timer_close(remote_peer_id: DirectPeerId, user: Option<PubKey>) -> ResultSend<()> {
            async move {
                sleep!(std::time::Duration::from_secs(3));
                log_info!("timeout");
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
