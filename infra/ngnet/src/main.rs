// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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

use std::collections::HashMap;
use std::convert::Infallible;
use std::env;
use std::net::IpAddr;
use std::str::FromStr;
use std::sync::Arc;

use duration_str::parse;
use rust_embed::RustEmbed;
use serde::{Deserialize, Serialize};
use warp::http::header::{HeaderMap, HeaderValue};
use warp::reply::Response;
use warp::{Filter, Reply};

use ng_repo::log::*;
use ng_repo::types::*;
use ng_repo::utils::timestamp_after;

use ng_net::actors::admin::add_invitation::*;
use ng_net::broker::BROKER;
use ng_net::bsps::{BSP_DETAILS, BSP_ORIGINS};
use ng_net::types::{
    AdminResponseContentV0, BindAddress, CreateAccountBSP, Invitation, InvitationCode,
    APP_ACCOUNT_REGISTERED_SUFFIX, NG_APP_URL, NG_NET_URL,
};

use ng_client_ws::remote_ws::ConnectionWebSocket;

#[derive(RustEmbed)]
#[folder = "web/dist"]
struct Static;

#[derive(RustEmbed)]
#[folder = "auth/dist"]
struct AuthStatic;

#[derive(RustEmbed)]
#[folder = "redir/dist"]
struct RedirStatic;

#[derive(RustEmbed)]
#[folder = "bootstrap/dist"]
struct BootstrapStatic;

struct Server {}

// impl Server {
//     pub async fn register(self: Arc<Self>, ca: String) -> Result<Response, Infallible> {
//         let res = self.register_(ca).await;
//         match &res {
//             RegisterResponse { error: None, .. } => {
//                 let response = warp::reply::json(&res).into_response(); //Response::new(redirect_url.into());
//                 let (mut parts, body) = response.into_parts();
//                 parts.status = warp::http::StatusCode::OK;
//                 let response = Response::from_parts(parts, body);
//                 Ok(response)
//             }
//             RegisterResponse {
//                 error: Some(_e),
//                 url: redirect_url,
//                 ..
//             } => {
//                 if redirect_url.is_some() {
//                     let response = warp::reply::json(&res).into_response();
//                     let (mut parts, body) = response.into_parts();
//                     parts.status = warp::http::StatusCode::BAD_REQUEST;
//                     let response = Response::from_parts(parts, body);
//                     Ok(response)
//                 } else {
//                     Ok(warp::http::StatusCode::NOT_ACCEPTABLE.into_response())
//                 }
//             }
//         }
//     }
// }

fn with_server(
    server: Arc<Server>,
) -> impl Filter<Extract = (Arc<Server>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || Arc::clone(&server))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "info"); //trace
    }
    env_logger::init();

    let server = Arc::new(Server {});

    // GET /api/v1/register/ca with the same ?ca= query param => 201 CREATED
    // let register_api = warp::get()
    //     .and(with_server(server))
    //     .and(warp::path!("register" / String))
    //     .and_then(Server::register);

    //let api_v1 = warp::path!("api" / "v1" / ..).and(register_api);

    let static_files = warp::get()
        .and(warp_embed::embed(&Static))
        //.with(warp::reply::with::headers(headers))
        .boxed();

    let static_files_redir = warp::get()
        .and(warp_embed::embed(&RedirStatic))
        //.with(warp::reply::with::headers(headers))
        .boxed();

    // just doing that to lazy load it.
    BSP_DETAILS.len();

    let static_files_bootstrap = warp::get()
        .and(warp::path!("bootstrap" / ..))
        .and(warp_embed::embed(&BootstrapStatic))
        .boxed();

    let static_files_auth = warp::get()
        .and(warp::path!("auth" / ..))
        .and(warp_embed::embed(&AuthStatic))
        .and(warp::query::<HashMap<String, String>>())
        .map(|reply, p: HashMap<String, String>| match p.get("o") {
            Some(obj) => {
                let decoded = obj.trim();
                if BSP_DETAILS.get(decoded).is_none()
                    && decoded != "http://localhost:14400"
                    && decoded != "http://localhost:1421"
                // if decoded.eq("*")
                //     || (!decoded.starts_with("http://") && !decoded.starts_with("https://"))
                //     || decoded.len() < 11
                {
                    warp::http::StatusCode::BAD_REQUEST.into_response()
                } else {
                    let reply = warp::reply::with_header(
                        reply,
                        "Content-Security-Policy",
                        HeaderValue::from_str(&format!("frame-ancestors 'self' {decoded};"))
                            .unwrap(),
                    );
                    warp::reply::with_header(
                        reply,
                        "X-Frame-Options",
                        HeaderValue::from_str(&format!("ALLOW-FROM {decoded}")).unwrap(),
                    )
                    .into_response()
                }
            }
            None => warp::http::StatusCode::BAD_REQUEST.into_response(),
        })
        .boxed();

    let mut cors = warp::cors()
        .allow_methods(vec!["GET"])
        .allow_headers(vec!["Content-Type"]);

    let incoming_log = warp::log::custom(|info| {
        if info.remote_addr().is_some() {
            log_info!(
                "{:?} {} {}",
                info.request_headers()
                    .get("X-Forwarded-For")
                    .map(|x| x.to_str().unwrap())
                    .unwrap_or(info.remote_addr().unwrap().to_string().as_str()),
                //info.remote_addr().unwrap(),
                info.method(),
                info.path()
            );
        }
    });

    #[cfg(not(debug_assertions))]
    {
        cors = cors.allow_origin(NG_NET_URL);
        cors = cors.allow_origin(NG_APP_URL);
        cors = cors.allow_origin("http://localhost:14400");
        cors = cors.allow_origin("http://localhost:1421");
        for bsp in BSP_ORIGINS.iter() {
            cors = cors.allow_origin(*bsp);
        }
        log::info!("Starting production server on http://localhost:3033");
        warp::serve(
            static_files
                .or(static_files_redir)
                .or(static_files_auth.or(static_files_bootstrap))
                .with(cors)
                .with(incoming_log),
        )
        .run(([127, 0, 0, 1], 3033))
        .await;
    }
    #[cfg(debug_assertions)]
    {
        log_debug!("CORS: any origin");
        cors = cors.allow_any_origin();
        log::info!("Starting server on http://localhost:3033");
        warp::serve(
            static_files
                .or(static_files_redir)
                .or(static_files_auth.or(static_files_bootstrap))
                .with(cors)
                .with(incoming_log),
        )
        // TODO: Change this to local network ip?
        .run(([127, 0, 0, 1], 3033))
        .await;
    }

    Ok(())
}
