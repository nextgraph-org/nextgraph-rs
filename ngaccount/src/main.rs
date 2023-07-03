// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
#[macro_use]
extern crate slice_as_array;

mod types;

use p2p_repo::store::StorageError;
use warp::reply::Response;
use warp::{Filter, Reply};

use rust_embed::RustEmbed;
use serde_bare::{from_slice, to_vec};
use serde_json::json;
use std::sync::Arc;
use std::{env, fs};

use crate::types::*;
use ng_wallet::types::*;
use p2p_net::types::{APP_NG_ONE_URL, NG_ONE_URL};
use p2p_repo::log::*;
use p2p_repo::types::*;
use p2p_repo::utils::{generate_keypair, sign, verify};

#[derive(RustEmbed)]
#[folder = "web/dist"]
struct Static;

struct Server {}

impl Server {}

#[tokio::main]
async fn main() {
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "info"); //trace
    }
    env_logger::init();

    // let (wallet_key, wallet_id) = generate_keypair();
    // let content = BootstrapContentV0 { servers: vec![] };
    // let ser = serde_bare::to_vec(&content).unwrap();
    // let sig = sign(wallet_key, wallet_id, &ser).unwrap();

    // let bootstrap = Bootstrap::V0(BootstrapV0 {
    //     id: wallet_id,
    //     content,
    //     sig,
    // });

    let server = Arc::new(Server {});

    let static_files = warp::get().and(warp_embed::embed(&Static)).boxed();

    let mut cors = warp::cors()
        .allow_methods(vec!["GET", "POST"])
        .allow_headers(vec!["Content-Type"]);

    #[cfg(not(debug_assertions))]
    {
        cors = cors
            .allow_origin(NG_ONE_URL)
            .allow_origin(APP_NG_ONE_URL)
            .allow_origin("https://nextgraph.eu")
            .allow_origin("https://nextgraph.net");
    }
    #[cfg(debug_assertions)]
    {
        log_debug!("CORS: any origin");
        cors = cors.allow_any_origin();
    }
    log::info!("Starting server on http://localhost:3030");
    warp::serve(static_files.with(cors))
        .run(([127, 0, 0, 1], 3031))
        .await;
}
