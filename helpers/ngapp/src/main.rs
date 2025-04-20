// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

mod store;
mod types;

use std::sync::Arc;
use std::{env, fs};

use rust_embed::RustEmbed;
use serde_bare::{from_slice, to_vec};
use serde_json::json;
use warp::reply::Response;
use warp::{Filter, Reply};

use ng_repo::errors::StorageError;
use ng_repo::log::*;
use ng_repo::types::*;
use ng_repo::utils::verify;

#[cfg(not(debug_assertions))]
use ng_net::types::{NG_APP_URL, NG_NET_URL};

use ng_wallet::types::*;

use ng_storage_rocksdb::kcv_storage::RocksDbKCVStorage;

use crate::store::wallet_record::*;
use crate::types::*;

#[derive(RustEmbed)]
#[folder = "../../ng-app/dist-file"]
struct Static;


#[tokio::main]
async fn main() {
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "info"); //trace
    }
    env_logger::init();

   

    let static_files = warp::get().and(warp_embed::embed(&Static)).boxed();

    let mut cors = warp::cors()
        .allow_methods(vec!["GET", "POST"])
        .allow_headers(vec!["Content-Type"]);

    #[cfg(not(debug_assertions))]
    {
        cors = cors
            .allow_origin(NG_NET_URL)
            .allow_origin(NG_APP_URL)
            .allow_origin("https://nextgraph.eu")
            .allow_origin("https://nextgraph.net");
    }
    #[cfg(debug_assertions)]
    {
        log_debug!("CORS: any origin");
        cors = cors.allow_any_origin();
    }
    log::info!("Starting server on http://localhost:3032");
    warp::serve(static_files.with(cors))
        .run(([127, 0, 0, 1], 3032))
        .await;
}
