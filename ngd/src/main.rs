// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use p2p_broker::server_ws::run_server;
use p2p_net::WS_PORT;
use p2p_repo::{
    types::{PrivKey, PubKey},
    utils::generate_keypair,
};

#[async_std::main]
async fn main() -> std::io::Result<()> {
    println!("Starting NextGraph daemon...");
    //let keys = generate_keypair();
    //println!("Public key of node: {:?}", keys.1);
    //println!("Private key of node: {:?}", keys.0);
    let pubkey = PubKey::Ed25519PubKey([
        158, 209, 118, 156, 133, 101, 241, 72, 91, 80, 160, 184, 201, 66, 245, 2, 91, 16, 10, 143,
        50, 206, 222, 187, 24, 122, 51, 59, 214, 132, 169, 154,
    ]);
    let privkey = PrivKey::Ed25519PrivKey([
        254, 127, 162, 204, 53, 25, 141, 12, 4, 118, 23, 42, 52, 246, 37, 52, 76, 11, 176, 219, 31,
        241, 25, 73, 199, 118, 209, 85, 159, 234, 31, 206,
    ]);
    run_server(format!("127.0.0.1:{}", WS_PORT).as_str(), privkey, pubkey).await?;

    Ok(())
}
