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
#[cfg(target_arch = "wasm32")]
use p2p_client_ws::remote_ws_wasm::ConnectionWebSocket;
use p2p_net::broker::*;
use p2p_net::connection::{ClientConfig, StartConfig};
use p2p_net::types::{DirectPeerId, IP};
use p2p_net::utils::{spawn_and_log_error, ResultSend};
use p2p_net::{log, sleep};
use p2p_repo::types::PubKey;
use p2p_repo::utils::generate_keypair;
use std::net::IpAddr;
use std::str::FromStr;
use std::sync::Arc;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    pub fn alert(s: &str);
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn start() {
    // let mut random_buf = [0u8; 32];
    // getrandom::getrandom(&mut random_buf).unwrap();

    async fn inner_task() -> ResultSend<()> {
        let server_key = PubKey::Ed25519PubKey([
            22, 140, 190, 111, 82, 151, 27, 133, 83, 121, 71, 36, 209, 53, 53, 114, 52, 254, 218,
            241, 52, 155, 231, 83, 188, 189, 47, 135, 105, 213, 39, 91,
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
            panic!("Cannot connect");
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
