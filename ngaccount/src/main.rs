// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
#[macro_use]
extern crate anyhow;

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
use p2p_net::types::{CreateAccountBSP, APP_NG_ONE_URL, NG_ONE_URL};
use p2p_repo::log::*;
use p2p_repo::types::*;
use p2p_repo::utils::{generate_keypair, sign, verify};

#[derive(RustEmbed)]
#[folder = "web/dist"]
struct Static;

struct Server {}

impl Server {
    fn register_(&self, ca: String) -> Result<(), NgHttpError> {
        log_debug!("registering {}", ca);

        let cabsp: CreateAccountBSP = ca.try_into().map_err(|_| NgHttpError::InvalidParams)?;

        log_debug!("{:?}", cabsp);

        Ok(())
    }

    pub fn register(&self, ca: String) -> Response {
        match self.register_(ca) {
            Ok(_) => warp::http::StatusCode::CREATED.into_response(),
            Err(e) => e.into_response(),
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "info"); //trace
    }
    env_logger::init();

    let server = Arc::new(Server {});

    let domain =
        env::var("NG_ACCOUNT_DOMAIN").map_err(|_| anyhow!("NG_ACCOUNT_DOMAIN must be set"))?;

    let admin_user =
        env::var("NG_ACCOUNT_ADMIN").map_err(|_| anyhow!("NG_ACCOUNT_ADMIN must be set"))?;

    // format is IP,PORT,PEERID
    let server_address =
        env::var("NG_ACCOUNT_SERVER").map_err(|_| anyhow!("NG_ACCOUNT_SERVER must be set"))?;

    let addr: Vec<&str> = server_address.split(',').collect();
    if addr.len() != 3 {
        return Err(anyhow!(
            "NG_ACCOUNT_SERVER is invalid. format is IP,PORT,PEERID"
        ));
    }
    let ip: IP = addr[0].into();

    log::info!("{}", domain);

    // GET /api/v1/register/ca with the same ?ca= query param => 201 CREATED
    let server_for_move = Arc::clone(&server);
    let register_api = warp::get()
        .and(warp::path!("register" / String))
        .map(move |ca| server_for_move.register(ca));

    let api_v1 = warp::path!("api" / "v1" / ..).and(register_api);

    let static_files = warp::get().and(warp_embed::embed(&Static)).boxed();

    let mut cors = warp::cors()
        .allow_methods(vec!["GET"])
        .allow_headers(vec!["Content-Type"]);

    #[cfg(not(debug_assertions))]
    {
        cors = cors.allow_origin(format!("https://{}", domain));
    }
    #[cfg(debug_assertions)]
    {
        log_debug!("CORS: any origin");
        cors = cors.allow_any_origin();
    }
    log::info!("Starting server on http://localhost:3031");
    warp::serve(api_v1.or(static_files).with(cors))
        .run(([127, 0, 0, 1], 3031))
        .await;

    Ok(())
}
