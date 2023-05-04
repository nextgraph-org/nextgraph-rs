// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use p2p_broker::server_ws::run_server;
use p2p_net::utils::{gen_keys, Sensitive, U8Array};
use p2p_net::WS_PORT;
use p2p_repo::{
    types::{PrivKey, PubKey},
    utils::generate_keypair,
};

#[async_std::main]
async fn main() -> std::io::Result<()> {
    println!("Starting NextGraph daemon...");
    // let keys = generate_keypair();
    // let keys = gen_keys();
    // println!("Public key of node: {:?}", keys.1);
    // println!("Private key of node: {:?}", keys.0.as_slice());
    let pubkey = PubKey::Ed25519PubKey([
        22, 140, 190, 111, 82, 151, 27, 133, 83, 121, 71, 36, 209, 53, 53, 114, 52, 254, 218, 241,
        52, 155, 231, 83, 188, 189, 47, 135, 105, 213, 39, 91,
    ]);
    let privkey = Sensitive::<[u8; 32]>::from_slice(&[
        160, 133, 237, 116, 151, 53, 156, 151, 21, 227, 226, 35, 1, 224, 44, 207, 148, 33, 79, 160,
        115, 173, 154, 118, 251, 146, 34, 204, 40, 190, 155, 112,
    ]);

    //let keys = gen_keys();
    println!("Public key of node: {:?}", pubkey);
    println!("Private key of node: {:?}", privkey.as_slice());
    run_server(format!("127.0.0.1:{}", WS_PORT).as_str(), privkey, pubkey).await?;

    Ok(())
}
