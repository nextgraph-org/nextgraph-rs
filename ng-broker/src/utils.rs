// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

// use ng_repo::log::*;

// pub fn gen_broker_keys(key: Option<[u8; 32]>) -> [[u8; 32]; 4] {
//     let key = match key {
//         None => {
//             let mut master_key = [0u8; 32];
//             log_warn!("gen_broker_keys: No key provided, generating one");
//             getrandom::getrandom(&mut master_key).expect("getrandom failed");
//             master_key
//         }
//         Some(k) => k,
//     };
//     let peerid: [u8; 32];
//     let wallet: [u8; 32];
//     let sig: [u8; 32];

//     peerid = blake3::derive_key("NextGraph Broker BLAKE3 key PeerId privkey", &key);
//     wallet = blake3::derive_key("NextGraph Broker BLAKE3 key wallet encryption", &key);
//     sig = blake3::derive_key("NextGraph Broker BLAKE3 key config signature", &key);

//     [key, peerid, wallet, sig]
// }
