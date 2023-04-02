use async_std::task;
#[cfg(target_arch = "wasm32")]
use p2p_client_ws::remote_ws_wasm::ConnectionWebSocket;
use p2p_net::broker::*;
use p2p_net::log;
use p2p_net::types::IP;
use p2p_net::utils::{spawn_and_log_error, ResultSend};
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
pub fn greet(name: &str) {
    log!("I say: {}", name);
    let mut random_buf = [0u8; 32];
    getrandom::getrandom(&mut random_buf).unwrap();
    //spawn_and_log_error(testt("ws://127.0.0.1:3012"));
    async fn method() -> ResultSend<()> {
        log!("start connecting");
        let cnx = Arc::new(ConnectionWebSocket {});
        let (priv_key, pub_key) = generate_keypair();
        let broker = Broker::new();
        let res = broker
            .connect(
                cnx,
                IP::try_from(&IpAddr::from_str("127.0.0.1").unwrap()).unwrap(),
                None,
                priv_key,
                pub_key,
                pub_key,
            )
            .await;
        log!("broker.connect : {:?}", res);
        //res.expect_throw("assume the connection succeeds");
        Ok(())
    }
    spawn_and_log_error(method());
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
        greet("test");
    }
}
