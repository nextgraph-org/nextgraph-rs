// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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

use std::convert::Infallible;
use std::net::IpAddr;
use std::str::FromStr;
use std::sync::Arc;
use std::{env};

use duration_str::parse;
use serde::{Deserialize, Serialize};
use warp::http::header::{HeaderMap, HeaderValue};
use warp::reply::Response;
use warp::{Filter, Reply};
use rust_embed::RustEmbed;

use ng_repo::log::*;
use ng_repo::types::*;
use ng_repo::utils::timestamp_after;

use ng_net::actors::admin::add_invitation::*;
use ng_net::broker::BROKER;
use ng_net::types::{
    AdminResponseContentV0, BindAddress, CreateAccountBSP, Invitation, InvitationCode,
     APP_ACCOUNT_REGISTERED_SUFFIX, 
};

use ng_client_ws::remote_ws::ConnectionWebSocket;


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

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
struct RegisterResponse {
    url: Option<String>,
    invite: Option<String>,
    error: Option<String>,
}

impl Server {
    async fn register_(&self, ca: String) -> RegisterResponse {
        log_debug!("registering {}", ca);

        let cabsp = TryInto::<CreateAccountBSP>::try_into(ca);
        if cabsp.is_err() {
            return RegisterResponse {
                error: Some("invalid request".into()),
                invite: None,
                url: None,
            };
        }
        let cabsp = cabsp.unwrap();

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

        let redirect_url = cabsp.redirect_url().clone().unwrap_or(format!(
            "https://{}{}",
            self.domain, APP_ACCOUNT_REGISTERED_SUFFIX
        ));

        match res {
            Err(e) => {
                log_err!("error while registering: {e} {:?}", cabsp);
                RegisterResponse {
                    url: Some(format!("{}?re={}", redirect_url, e)),
                    invite: None,
                    error: Some(e.to_string()),
                }
            }
            Ok(AdminResponseContentV0::Invitation(Invitation::V0(mut invitation))) => {
                log_info!("invitation created successfully {:?}", invitation);
                invitation.name = Some(self.domain.clone());
                let inv = Invitation::V0(invitation);
                RegisterResponse {
                    url: Some(format!("{}?i={}&rs={}", redirect_url, inv, self.domain)),
                    invite: Some(format!("{inv}")),
                    error: None,
                }
            }
            _ => {
                log_err!(
                    "error while registering: invalid response from add_invitation {:?}",
                    cabsp
                );
                let e = "add_invitation_failed";
                RegisterResponse {
                    url: Some(format!("{}?re={}", redirect_url, e)),
                    invite: None,
                    error: Some(e.to_string()),
                }
            }
        }
    }

    pub async fn register(self: Arc<Self>, ca: String) -> Result<Response, Infallible> {
        let res = self.register_(ca).await;
        match &res {
            RegisterResponse { error: None, .. } => {
                let response = warp::reply::json(&res).into_response(); //Response::new(redirect_url.into());
                let (mut parts, body) = response.into_parts();
                parts.status = warp::http::StatusCode::OK;
                let response = Response::from_parts(parts, body);
                Ok(response)
            }
            RegisterResponse {
                error: Some(_e),
                url: redirect_url,
                ..
            } => {
                if redirect_url.is_some() {
                    let response = warp::reply::json(&res).into_response();
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
            "NG_ACCOUNT_ADMIN is invalid. It should be a base64-url encoded serde serialization of PrivKey for an admin user. cannot start"
        )
    })?;

    let local_peer_privkey = env::var("NG_ACCOUNT_LOCAL_PEER_KEY")
        .map_err(|_| anyhow!("NG_ACCOUNT_LOCAL_PEER_KEY must be set"))?;

    let local_peer_key: PrivKey = local_peer_privkey.as_str().try_into().map_err(|_| {
        anyhow!(
            "NG_ACCOUNT_LOCAL_PEER_KEY is invalid. It should be a base64-url encoded serde serialization of PrivKey for the peerId. cannot start"
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
            The PEER_ID is invalid. It should be a base64-url encoded serde serialization of a PubKey. cannot start"
        )
    })?;

    log::info!("domain {}", domain);

    let server = Arc::new(Server {
        admin_key,
        local_peer_key,
        ip,
        port,
        peer_id,
        domain: domain.clone(),
    });

    // GET /api/v1/register/ca with the same ?ca= query param => 201 CREATED
    let register_api = warp::get()
        .and(with_server(server))
        .and(warp::path!("register" / String))
        .and_then(Server::register);

    let api_v1 = warp::path!("api" / "v1" / ..).and(register_api);

    let mut headers = HeaderMap::new();
    headers.insert(
        "Content-Security-Policy",
        HeaderValue::from_static(
            #[cfg(debug_assertions)]
            "default-src 'self' data:; connect-src ipc: https://ipc.localhost 'self' http://192.168.192.2:3031",
            #[cfg(not(debug_assertions))]
            "default-src 'self' data:; connect-src ipc: https://ipc.localhost 'self'",
            
        ),
    );

    let static_files = warp::get()
        .and(warp_embed::embed(&Static))
        //.with(warp::reply::with::headers(headers))
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
        let origin = format!("https://{}", domain);
        let origin2 = format!("https://account.{}", domain);
        cors = cors.allow_origin(origin.as_str());
        cors = cors.allow_origin(origin2.as_str());
        log::info!("Starting server on http://localhost:3031");
        warp::serve(api_v1.or(static_files).with(cors).with(incoming_log))
            .run(([127, 0, 0, 1], 3031))
            .await;
    }
    #[cfg(debug_assertions)]
    {
        log_debug!("CORS: any origin");
        cors = cors.allow_any_origin();
        log::info!("Starting server on http://192.168.192.2:3031");
        warp::serve(api_v1.or(static_files).with(cors).with(incoming_log))
            .run(([192, 168, 192, 2], 3031))
            .await;
    }

    Ok(())
}
