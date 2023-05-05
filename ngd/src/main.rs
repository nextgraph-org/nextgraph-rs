// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use p2p_broker::server_ws::run_server;
use p2p_net::utils::{gen_keys, Dual25519Keys, Sensitive, U8Array};
use p2p_net::WS_PORT;
use p2p_repo::{
    types::{PrivKey, PubKey},
    utils::{generate_keypair, keypair_from_ed, sign, verify},
};

#[async_std::main]
async fn main() -> std::io::Result<()> {
    println!("Starting NextGraph daemon...");

    // let keys = gen_keys();
    // let pub_key = PubKey::Ed25519PubKey(keys.1);
    // let (ed_priv_key, ed_pub_key) = generate_keypair();

    // let duals = Dual25519Keys::generate();
    // let eds = keypair_from_ed(duals.ed25519_priv, duals.ed25519_pub);
    // let test_vector: Vec<u8> = vec![71, 51, 206, 126, 9, 84, 132];
    // let sig = sign(eds.0, eds.1, &test_vector).unwrap();
    // verify(&test_vector, sig, eds.1).unwrap();

    // let privkey = duals.x25519_priv;
    // let pubkey = PubKey::Ed25519PubKey(duals.x25519_public);

    // println!("Public key of node: {:?}", keys.1);
    // println!("Private key of node: {:?}", keys.0.as_slice());
    let pubkey = PubKey::Ed25519PubKey([
        95, 155, 249, 202, 41, 105, 71, 51, 206, 126, 9, 84, 132, 92, 60, 7, 74, 179, 46, 21, 21,
        242, 171, 27, 249, 79, 76, 176, 168, 43, 83, 2,
    ]);
    let privkey = Sensitive::<[u8; 32]>::from_slice(&[
        56, 86, 36, 0, 109, 59, 152, 66, 166, 71, 201, 20, 119, 64, 173, 99, 215, 52, 40, 189, 96,
        142, 3, 134, 167, 187, 235, 4, 39, 26, 31, 119,
    ]);

    println!("Public key of node: {:?}", pubkey);
    println!("Private key of node: {:?}", privkey.as_slice());
    run_server("127.0.0.1", WS_PORT, privkey, pubkey).await?;

    Ok(())
}
