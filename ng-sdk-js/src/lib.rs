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
#[cfg(target_arch = "wasm32")]
use p2p_client_ws::remote_ws_wasm::ConnectionWebSocket;
use p2p_net::broker::*;
use p2p_net::connection::{ClientConfig, StartConfig};
use p2p_net::types::{DirectPeerId, IP};
use p2p_net::utils::{spawn_and_log_error, Receiver, ResultSend, Sender};
use p2p_net::{log, sleep};
use p2p_repo::types::*;
use p2p_repo::utils::generate_keypair;
use serde_json::json;
use std::net::IpAddr;
use std::str::FromStr;
use std::sync::Arc;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::{future_to_promise, JsFuture};

#[wasm_bindgen]
extern "C" {
    pub fn alert(s: &str);
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
pub async fn create_wallet(s: String) -> String {
    log!("create wallet {} {}", s, BROKER.read().await.test());
    format!("create wallet from js {}", s)
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn test() {
    log!("test is {}", BROKER.read().await.test());
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn doc_get_file_from_store_with_object_ref(
    nuri: String,
    obj_ref_js: JsValue,
) -> Result<JsValue, JsValue> {
    let obj_ref = serde_wasm_bindgen::from_value::<ObjectRef>(obj_ref_js).unwrap();

    log!(
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
        log!("END OF LOOP");
        Ok(())
    }

    spawn_and_log_error(inner_task(reader, anuri, callback.clone()));

    let cb = Closure::once(move || {
        log!("close channel");
        sender.close_channel()
    });
    //Closure::wrap(Box::new(move |sender| sender.close_channel()) as Box<FnMut(Sender<Commit>)>);
    let ret = cb.as_ref().clone();
    cb.forget();
    return ret;
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn start() {
    log!("random {}", random(10));

    // let mut random_buf = [0u8; 32];
    // getrandom::getrandom(&mut random_buf).unwrap();

    async fn inner_task() -> ResultSend<()> {
        let server_key = PubKey::Ed25519PubKey([
            95, 155, 249, 202, 41, 105, 71, 51, 206, 126, 9, 84, 132, 92, 60, 7, 74, 179, 46, 21,
            21, 242, 171, 27, 249, 79, 76, 176, 168, 43, 83, 2,
        ]);

        let keys = p2p_net::utils::gen_keys();
        let pub_key = PubKey::Ed25519PubKey(keys.1);

        let (client_priv_key, client_pub_key) = generate_keypair();
        let (user_priv_key, user_pub_key) = generate_keypair();

        log!("start connecting");

        let res = BROKER
            .write()
            .await
            .connect(
                Box::new(ConnectionWebSocket {}),
                IP::try_from(&IpAddr::from_str("127.0.0.1").unwrap()).unwrap(),
                None,
                keys.0,
                pub_key,
                server_key,
                StartConfig::Client(ClientConfig {
                    user: user_pub_key,
                    client: client_pub_key,
                    client_priv: client_priv_key,
                }),
            )
            .await;
        log!("broker.connect : {:?}", res);
        if res.is_err() {
            return Ok(());
            //panic!("Cannot connect");
        }
        BROKER.read().await.print_status();

        //res.expect_throw("assume the connection succeeds");

        async fn timer_close(remote_peer_id: DirectPeerId) -> ResultSend<()> {
            async move {
                sleep!(std::time::Duration::from_secs(3));
                log!("timeout");
                BROKER
                    .write()
                    .await
                    .close_peer_connection(&remote_peer_id)
                    .await;
            }
            .await;
            Ok(())
        }
        spawn_and_log_error(timer_close(server_key));

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
    use crate::start;

    #[wasm_bindgen_test]
    pub async fn test_connection() {
        start().await;
    }
}
