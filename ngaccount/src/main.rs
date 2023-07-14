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

use duration_str::parse;
use p2p_client_ws::remote_ws::ConnectionWebSocket;
use p2p_net::actors::add_invitation::*;
use p2p_net::broker::BROKER;
use p2p_repo::store::StorageError;
use warp::reply::Response;
use warp::{Filter, Reply};

use rust_embed::RustEmbed;
use serde_bare::{from_slice, to_vec};
use serde_json::json;
use std::convert::Infallible;
use std::net::IpAddr;
use std::str::FromStr;
use std::sync::Arc;
use std::{env, fs};

use crate::types::*;
use ng_wallet::types::*;
use p2p_net::types::{
    AdminResponseContentV0, BindAddress, CreateAccountBSP, Invitation, InvitationCode,
    InvitationV0, APP_ACCOUNT_REGISTERED_SUFFIX, APP_NG_ONE_URL, NG_ONE_URL,
};
use p2p_repo::log::*;
use p2p_repo::types::*;
use p2p_repo::utils::{generate_keypair, sign, timestamp_after, verify};

#[derive(RustEmbed)]
#[folder = "web/dist"]
struct Static;

struct Server {
    admin_key: PrivKey,
    local_peer_key: PrivKey,
    ip: IpAddr,
    port: u16,
    peer_id: PubKey,
    domain: String,
}

impl Server {
    async fn register_(&self, ca: String) -> Result<String, Option<String>> {
        log_debug!("registering {}", ca);

        let mut cabsp: CreateAccountBSP = ca.try_into().map_err(|_| None)?;

        log_debug!("{:?}", cabsp);

        // if needed, proceed with payment and verify it here. once validated, add the user

        let duration = parse("1d").unwrap();
        let expiry = timestamp_after(duration);
        let symkey = SymKey::random();
        let invite_code = InvitationCode::Unique(symkey.clone());

        let local_peer_pubk = self.local_peer_key.to_pub();
        let res = BROKER
            .write()
            .await
            .admin(
                Box::new(ConnectionWebSocket {}),
                self.local_peer_key.clone(),
                local_peer_pubk,
                self.peer_id,
                self.admin_key.to_pub(),
                self.admin_key.clone(),
                BindAddress {
                    port: self.port,
                    ip: (&self.ip).into(),
                },
                AddInvitation::V0(AddInvitationV0 {
                    invite_code,
                    expiry,
                    memo: None,
                    tos_url: false,
                }),
            )
            .await;

        let redirect_url = cabsp
            .redirect_url()
            .clone()
            .unwrap_or(format!("{}{}", self.domain, APP_ACCOUNT_REGISTERED_SUFFIX));

        match res {
            Err(e) => {
                log_err!("error while registering: {e} {:?}", cabsp);
                Err(Some(format!("{}?re={}", redirect_url, e)))
            }
            Ok(AdminResponseContentV0::Invitation(Invitation::V0(mut invitation))) => {
                log_info!("invitation created successfully {:?}", invitation);
                invitation.name = Some(self.domain.clone());
                Ok(format!(
                    "{}?i={}&rs={}",
                    redirect_url,
                    Invitation::V0(invitation),
                    self.domain
                ))
            }
            _ => {
                log_err!(
                    "error while registering: invalid response from add_invitation {:?}",
                    cabsp
                );
                Err(Some(format!(
                    "{}?re={}",
                    redirect_url, "add_invitation_failed"
                )))
            }
        }
    }

    pub async fn register(self: Arc<Self>, ca: String) -> Result<Response, Infallible> {
        match self.register_(ca).await {
            Ok(redirect_url) => {
                let response = Response::new(redirect_url.into());
                let (mut parts, body) = response.into_parts();
                parts.status = warp::http::StatusCode::OK;
                let response = Response::from_parts(parts, body);
                Ok(response)
            }
            Err(redirect_url) => {
                if redirect_url.is_some() {
                    let response = Response::new(redirect_url.unwrap().into());
                    let (mut parts, body) = response.into_parts();
                    parts.status = warp::http::StatusCode::BAD_REQUEST;
                    let response = Response::from_parts(parts, body);
                    Ok(response)
                } else {
                    Ok(warp::http::StatusCode::NOT_ACCEPTABLE.into_response())
                }
            }
        }
    }
}

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

    let domain =
        env::var("NG_ACCOUNT_DOMAIN").map_err(|_| anyhow!("NG_ACCOUNT_DOMAIN must be set"))?;

    let admin_user = env::var("NG_ACCOUNT_ADMIN")
        .map_err(|_| anyhow!("NG_ACCOUNT_ADMIN must be set (with private key)"))?;

    let admin_key: PrivKey = admin_user.as_str().try_into().map_err(|_| {
        anyhow!(
            "NG_ACCOUNT_ADMIN is invalid. It should be a base64-url encoded serde serialization of a [u8; 32] of the private key for an admin user. cannot start"
        )
    })?;

    let local_peer_privkey = env::var("NG_ACCOUNT_LOCAL_PEER_KEY")
        .map_err(|_| anyhow!("NG_ACCOUNT_LOCAL_PEER_KEY must be set"))?;

    let local_peer_key: PrivKey = local_peer_privkey.as_str().try_into().map_err(|_| {
        anyhow!(
            "NG_ACCOUNT_LOCAL_PEER_KEY is invalid. It should be a base64-url encoded serde serialization of a [u8; 32] of the private key for the peerId. cannot start"
        )
    })?;

    // format is IP,PORT,PEERID
    let server_address =
        env::var("NG_ACCOUNT_SERVER").map_err(|_| anyhow!("NG_ACCOUNT_SERVER must be set"))?;

    let addr: Vec<&str> = server_address.split(',').collect();
    if addr.len() != 3 {
        return Err(anyhow!(
            "NG_ACCOUNT_SERVER is invalid. format is IP,PORT,PEER_ID"
        ));
    }
    let ip = IpAddr::from_str(addr[0]).map_err(|_| {
        anyhow!("NG_ACCOUNT_SERVER is invalid. format is IP,PORT,PEER_ID. The first part is not an IP address. cannot start")
    })?;

    let port = match addr[1].parse::<u16>() {
        Err(_) => {
            return Err(anyhow!("NG_ACCOUNT_SERVER is invalid. format is IP,PORT,PEER_ID. The port is invalid. It should be a number. cannot start"));
        }
        Ok(val) => val,
    };
    let peer_id: PubKey = addr[2].try_into().map_err(|_| {
        anyhow!(
            "NG_ACCOUNT_SERVER is invalid. format is IP,PORT,PEER_ID.
            The PEER_ID is invalid. It should be a base64-url encoded serde serialization of a [u8; 32]. cannot start"
        )
    })?;

    log::info!("domain {}", domain);

    let server = Arc::new(Server {
        admin_key,
        local_peer_key,
        ip,
        port,
        peer_id,
        domain,
    });

    // GET /api/v1/register/ca with the same ?ca= query param => 201 CREATED
    let register_api = warp::get()
        .and(with_server(server))
        .and(warp::path!("register" / String))
        .and_then(Server::register);

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
