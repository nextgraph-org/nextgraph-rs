use async_std::task;
use js_sys::Reflect;
#[cfg(target_arch = "wasm32")]
use p2p_client_ws::remote_ws_wasm::ConnectionWebSocket;
use p2p_net::broker::*;
use p2p_net::types::{DirectPeerId, IP};
use p2p_net::utils::{spawn_and_log_error, ResultSend};
use p2p_net::{log, sleep};
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
pub async fn greet(name: &str) {
    log!("I say: {}", name);
    let mut random_buf = [0u8; 32];
    getrandom::getrandom(&mut random_buf).unwrap();
    //spawn_and_log_error(testt("ws://127.0.0.1:3012"));
    async fn method() -> ResultSend<()> {
        log!("start connecting");
        //let cnx = Arc::new();
        let (priv_key, pub_key) = generate_keypair();
        let res = BROKER
            .write()
            .await
            .connect(
                Box::new(ConnectionWebSocket {}),
                IP::try_from(&IpAddr::from_str("127.0.0.1").unwrap()).unwrap(),
                None,
                priv_key,
                pub_key,
                pub_key,
            )
            .await;
        log!("broker.connect : {:?}", res);
        BROKER.read().await.print_status();

        //res.expect_throw("assume the connection succeeds");

        async fn timer_close(remote_peer_id: DirectPeerId) -> ResultSend<()> {
            async move {
                sleep!(std::time::Duration::from_secs(10));
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
        spawn_and_log_error(timer_close(pub_key));

        //Broker::graceful_shutdown().await;

        Broker::join_shutdown_with_timeout(std::time::Duration::from_secs(12)).await;

        Ok(())
    }
    spawn_and_log_error(method()).await;
    //spawn_and_log_error(Arc::clone(&cnx).open("ws://127.0.0.1:3012", priv_key, pub_key));
}

#[cfg(not(target_arch = "wasm32"))]
#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("I say: {}", name));
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
    use crate::greet;

    #[wasm_bindgen_test]
    pub async fn test_greet() {
        greet("test").await;
    }
}
