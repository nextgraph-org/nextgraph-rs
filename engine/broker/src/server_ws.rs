/*
 * Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
 */

//! WebSocket implementation of the Broker

use std::collections::HashMap;
use std::collections::HashSet;
use std::net::IpAddr;
use std::net::SocketAddr;
use std::path::PathBuf;

use futures::StreamExt;
use ng_async_tungstenite::tungstenite::http::header::REFERER;
use once_cell::sync::OnceCell;
use rust_embed::RustEmbed;
use serde_json::json;
use urlencoding::decode;

use async_std::net::{TcpListener, TcpStream};
use ng_async_tungstenite::accept_hdr_async;
use ng_async_tungstenite::tungstenite::handshake::server::{
    Callback, ErrorResponse, Request, Response,
};
use ng_async_tungstenite::tungstenite::http::{
    header::{CONNECTION, HOST, ORIGIN},
    HeaderValue, Method, StatusCode, Uri, Version,
};

use ng_repo::errors::NgError;
use ng_repo::log::*;
use ng_repo::types::{PrivKey, PubKey, SymKey};

use ng_net::broker::*;
use ng_net::connection::IAccept;
use ng_net::types::*;
use ng_net::utils::{is_private_ip, is_public_ip};
use ng_net::NG_BOOTSTRAP_LOCAL_PATH;

use ng_client_ws::remote_ws::ConnectionWebSocket;

use crate::interfaces::*;
use crate::rocksdb_server_storage::RocksDbServerStorage;
use crate::server_broker::ServerBroker;
use crate::types::*;

static LISTENERS_INFO: OnceCell<(HashMap<String, ListenerInfo>, HashMap<BindAddress, String>)> =
    OnceCell::new();

static BOOTSTRAP_STRING: OnceCell<String> = OnceCell::new();

struct SecurityCallback {
    remote_bind_address: BindAddress,
    local_bind_address: BindAddress,
}

impl SecurityCallback {
    fn new(remote_bind_address: BindAddress, local_bind_address: BindAddress) -> Self {
        Self {
            remote_bind_address,
            local_bind_address,
        }
    }
}

fn make_error(code: StatusCode) -> ErrorResponse {
    Response::builder().status(code).body(None).unwrap()
}

fn check_no_origin(origin: Option<&HeaderValue>) -> Result<(), ErrorResponse> {
    match origin {
        Some(_) => Err(make_error(StatusCode::FORBIDDEN)),
        None => Ok(()),
    }
}

fn check_origin_is_url(
    origin: Option<&HeaderValue>,
    domains: &Vec<String>,
) -> Result<(), ErrorResponse> {
    match origin {
        None => Ok(()),
        Some(val) => {
            for domain in domains {
                if val.to_str().unwrap().starts_with(domain.as_str()) {
                    return Ok(());
                }
            }
            Err(make_error(StatusCode::FORBIDDEN))
        }
    }
}

fn check_xff_is_public_or_private(
    xff: Option<&HeaderValue>,
    none_is_ok: bool,
    public: bool,
) -> Result<(), ErrorResponse> {
    match xff {
        None => {
            if none_is_ok {
                Ok(())
            } else {
                Err(make_error(StatusCode::FORBIDDEN))
            }
        }
        Some(val) => {
            let mut ip_str = val
                .to_str()
                .map_err(|_| make_error(StatusCode::FORBIDDEN))?;
            if ip_str.starts_with("::ffff:") {
                ip_str = ip_str.strip_prefix("::ffff:").unwrap();
            }
            let ip: IpAddr = ip_str
                .parse()
                .map_err(|_| make_error(StatusCode::FORBIDDEN))?;
            if public && !is_public_ip(&ip) || !public && !is_private_ip(&ip) {
                Err(make_error(StatusCode::FORBIDDEN))
            } else {
                Ok(())
            }
        }
    }
}

fn check_no_xff(xff: Option<&HeaderValue>) -> Result<(), ErrorResponse> {
    match xff {
        None => Ok(()),
        Some(_) => Err(make_error(StatusCode::FORBIDDEN)),
    }
}

fn check_host(host: Option<&HeaderValue>, hosts: Vec<String>) -> Result<(), ErrorResponse> {
    match host {
        None => Err(make_error(StatusCode::FORBIDDEN)),
        Some(val) => {
            for hos in hosts {
                if val.to_str().unwrap().starts_with(&hos) {
                    return Ok(());
                }
            }
            Err(make_error(StatusCode::FORBIDDEN))
        }
    }
}

fn check_host_in_addrs(
    host: Option<&HeaderValue>,
    addrs: &Vec<BindAddress>,
) -> Result<(), ErrorResponse> {
    match host {
        None => Err(make_error(StatusCode::FORBIDDEN)),
        Some(val) => {
            for ba in addrs {
                if val.to_str().unwrap().starts_with(&ba.ip.to_string()) {
                    return Ok(());
                }
            }
            Err(make_error(StatusCode::FORBIDDEN))
        }
    }
}

fn prepare_domain_url_and_host(
    accept_forward_for: &AcceptForwardForV0,
) -> (Vec<String>, Vec<String>) {
    let domain_str = accept_forward_for.get_domain();
    let url = ["https://", domain_str].concat();
    let hosts_str = vec![domain_str.to_string()];
    let urls_str = vec![url];
    (hosts_str, urls_str)
}

fn prepare_urls_from_private_addrs(addrs: &Vec<BindAddress>, port: u16) -> Vec<String> {
    let port_str = if port != 80 {
        [":", &port.to_string()].concat()
    } else {
        "".to_string()
    };
    let mut res: Vec<String> = vec![];
    for addr in addrs {
        let url = ["http://", &addr.ip.to_string(), &port_str].concat();
        res.push(url);
    }
    res
}

#[derive(RustEmbed)]
#[folder = "../../app/nextgraph/dist-file/"]
#[include = "*.sha256"]
#[include = "*.gzip"]
struct App;

#[derive(RustEmbed)]
#[folder = "../auth/dist/"]
#[include = "*.sha256"]
#[include = "*.gzip"]

struct AppAuth;

// #[derive(RustEmbed)]
// #[folder = "./static/app/"]
// #[include = "*.sha256"]
// #[include = "*.gzip"]
// struct App;

// #[derive(RustEmbed)]
// #[folder = "./static/app-auth/"]
// #[include = "*.sha256"]
// #[include = "*.gzip"]

// struct AppAuth;

#[derive(RustEmbed)]
#[folder = "src/public/"]
struct AppPublic;

static ROBOTS: &str = "User-agent: *\r\nDisallow: /";

fn upgrade_ws_or_serve_app(
    connection: Option<&HeaderValue>,
    remote: IP,
    serve_app: bool,
    uri: &Uri,
    last_etag: Option<&HeaderValue>,
    cors: Option<&str>,
    referer: Option<&HeaderValue>,
) -> Result<(), ErrorResponse> {
    if connection.is_some()
        && connection
            .unwrap()
            .to_str()
            .unwrap()
            .split(|c| c == ' ' || c == ',')
            .any(|p| p.eq_ignore_ascii_case("Upgrade"))
    {
        return Ok(());
    }

    if serve_app && (remote.is_private() || remote.is_loopback()) {
        if uri == "/" {
            log_debug!("Serving the app");
            let sha_file = App::get("index.sha256").unwrap();
            let sha = format!(
                "\"{}\"",
                std::str::from_utf8(sha_file.data.as_ref()).unwrap()
            );
            if last_etag.is_some() && last_etag.unwrap().to_str().unwrap() == sha {
                // return 304
                let res = Response::builder()
                    .status(StatusCode::NOT_MODIFIED)
                    .header("Cache-Control", "max-age=31536000, must-revalidate")
                    .header("ETag", sha)
                    .body(None)
                    .unwrap();
                return Err(res);
            }
            let file = App::get("index.gzip").unwrap();
            let res = Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", "text/html")
                .header("Cache-Control", "max-age=31536000, must-revalidate")
                .header("Content-Encoding", "gzip")
                .header("ETag", sha)
                .body(Some(file.data.to_vec()))
                .unwrap();
            return Err(res);
        } else if uri.path() == "/auth/" {
            log_debug!("Serving auth app");
            // if referer.is_none() || referer.unwrap().to_str().is_err() || referer.unwrap().to_str().unwrap() != "https://nextgraph.net/" {
            //     return Err(make_error(StatusCode::FORBIDDEN));
            // }
            let webapp_origin = match uri.query() {
                Some(query) => {
                    if query.starts_with("o=") {
                        match decode(&query.chars().skip(2).collect::<String>()) {
                            Err(_) => return Err(make_error(StatusCode::BAD_REQUEST)),
                            Ok(cow) => cow.into_owned(),
                        }
                    } else {
                        return Err(make_error(StatusCode::BAD_REQUEST));
                    }
                }
                None => return Err(make_error(StatusCode::BAD_REQUEST)),
            };
            let sha_file = AppAuth::get("index.sha256").unwrap();
            let sha = format!(
                "\"{}\"",
                std::str::from_utf8(sha_file.data.as_ref()).unwrap()
            );
            if last_etag.is_some() && last_etag.unwrap().to_str().unwrap() == sha {
                // return 304
                let res = Response::builder()
                    .status(StatusCode::NOT_MODIFIED)
                    .header("Cache-Control", "max-age=31536000, must-revalidate")
                    .header("ETag", sha)
                    .header(
                        "Content-Security-Policy",
                        format!("frame-ancestors 'self' https://nextgraph.net {webapp_origin};"),
                    )
                    .header("X-Frame-Options", format!("ALLOW-FROM {webapp_origin}"))
                    .body(None)
                    .unwrap();
                return Err(res);
            }
            let file = AppAuth::get("index.gzip").unwrap();
            let res = Response::builder()
                .status(StatusCode::OK)
                .header(
                    "Content-Security-Policy",
                    format!("frame-ancestors 'self' https://nextgraph.net {webapp_origin};"),
                )
                .header("X-Frame-Options", format!("ALLOW-FROM {webapp_origin}"))
                .header("Content-Type", "text/html")
                .header("Cache-Control", "max-age=31536000, must-revalidate")
                .header("Content-Encoding", "gzip")
                .header("ETag", sha)
                .body(Some(file.data.to_vec()))
                .unwrap();
            return Err(res);
        } else if uri == NG_BOOTSTRAP_LOCAL_PATH {
            log_debug!("Serving bootstrap");

            let mut builder = Response::builder().status(StatusCode::OK);
            if cors.is_some() {
                builder = builder.header("Access-Control-Allow-Origin", cors.unwrap());
            }
            let res = builder
                .header("Content-Type", "text/json")
                .header("Cache-Control", "max-age=0, must-revalidate")
                .body(Some(BOOTSTRAP_STRING.get().unwrap().as_bytes().to_vec()))
                .unwrap();
            return Err(res);
        } else if uri == "/favicon.ico" {
            let file = AppPublic::get("favicon.ico").unwrap();
            let res = Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", "image/x-icon")
                .header("Cache-Control", "max-age=432000, must-revalidate")
                .body(Some(file.data.to_vec()))
                .unwrap();
            return Err(res);
        } else if uri == "/robots.txt" {
            let res = Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", "text/plain")
                .header("Cache-Control", "max-age=3600, must-revalidate")
                .body(Some(ROBOTS.as_bytes().to_vec()))
                .unwrap();
            return Err(res);
        }
    }

    Err(make_error(StatusCode::FORBIDDEN))
}

impl Callback for SecurityCallback {
    fn on_request(self, request: &Request) -> Result<(), ErrorResponse> {
        let local_urls = LOCAL_URLS
            .to_vec()
            .iter()
            .map(ToString::to_string)
            .collect();

        let local_hosts = LOCAL_HOSTS
            .to_vec()
            .iter()
            .map(ToString::to_string)
            .collect();

        let (listeners, bind_addresses) = LISTENERS_INFO.get().ok_or(
            Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(None)
                .unwrap(),
        )?;

        // check that the remote address is allowed to connect on the listener

        let listener_id = bind_addresses
            .get(&self.local_bind_address)
            .ok_or(make_error(StatusCode::FORBIDDEN))?;
        let listener = listeners
            .get(listener_id)
            .ok_or(make_error(StatusCode::FORBIDDEN))?;

        if request.method() != Method::GET {
            return Err(make_error(StatusCode::METHOD_NOT_ALLOWED));
        }
        if request.version() != Version::HTTP_11 {
            return Err(make_error(StatusCode::HTTP_VERSION_NOT_SUPPORTED));
        }

        let xff = request.headers().get("X-Forwarded-For");
        let connection = request.headers().get(CONNECTION);
        let host = request.headers().get(HOST);
        let origin = request.headers().get(ORIGIN);
        let referer = request.headers().get(REFERER);
        let remote = self.remote_bind_address.ip;
        let last_etag = request.headers().get("If-None-Match");
        let uri = request.uri();

        log_debug!(
            "connection:{:?} origin:{:?} host:{:?} xff:{:?} remote:{:?} local:{:?} uri:{:?}",
            connection,
            origin,
            host,
            xff,
            remote,
            self.local_bind_address,
            uri
        );

        match listener.config.if_type {
            InterfaceType::Public => {
                if !remote.is_public() {
                    return Err(make_error(StatusCode::FORBIDDEN));
                }
                check_no_xff(xff)?;
                check_no_origin(origin)?;
                // let mut urls_str = vec![];
                // if !listener.config.refuse_clients {
                //     urls_str.push(NG_APP_URL.to_string());
                // }
                // check_origin_is_url(origin, urls_str)?;

                check_host_in_addrs(host, &listener.addrs)?;
                log_debug!(
                    "accepted core with refuse_clients {}",
                    listener.config.refuse_clients
                );
                return upgrade_ws_or_serve_app(
                    connection,
                    remote,
                    listener.config.serve_app && !listener.config.refuse_clients,
                    uri,
                    last_etag,
                    None,
                    referer,
                );
            }
            InterfaceType::Loopback => {
                if !remote.is_loopback() {
                    return Err(make_error(StatusCode::FORBIDDEN));
                }

                if listener.config.accept_forward_for.is_public_domain() {
                    let (mut hosts_str, mut urls_str) =
                        prepare_domain_url_and_host(&listener.config.accept_forward_for);
                    if listener.config.accept_direct {
                        hosts_str = [hosts_str, local_hosts].concat();
                        // TODO local_urls might need a trailing :port, but it is ok for now as we do starts_with
                        urls_str = [urls_str, local_urls].concat();
                    }
                    check_origin_is_url(origin, &urls_str)?;
                    check_host(host, hosts_str)?;
                    check_xff_is_public_or_private(xff, listener.config.accept_direct, true)?;
                    log_debug!(
                        "accepted loopback PUBLIC_DOMAIN with direct {}",
                        listener.config.accept_direct
                    );
                    return upgrade_ws_or_serve_app(
                        connection,
                        remote,
                        listener.config.serve_app,
                        uri,
                        last_etag,
                        origin.map(|or| or.to_str().unwrap()).and_then(|val| {
                            if listener.config.refuse_clients {
                                None
                            } else {
                                Some(val)
                            }
                        }),
                        referer,
                    );
                } else if listener.config.accept_forward_for.is_private_domain() {
                    let (hosts_str, urls_str) =
                        prepare_domain_url_and_host(&listener.config.accept_forward_for);
                    check_origin_is_url(origin, &urls_str)?;
                    check_host(host, hosts_str)?;
                    check_xff_is_public_or_private(xff, false, false)?;
                    log_debug!("accepted loopback PRIVATE_DOMAIN");
                    return upgrade_ws_or_serve_app(
                        connection,
                        remote,
                        listener.config.serve_app,
                        uri,
                        last_etag,
                        origin.map(|or| or.to_str().unwrap()),
                        referer,
                    );
                } else if listener.config.accept_forward_for == AcceptForwardForV0::No {
                    check_host(host, local_hosts)?;
                    check_no_xff(xff)?;
                    // TODO local_urls might need a trailing :port, but it is ok for now as we do starts_with
                    check_origin_is_url(origin, &local_urls)?;
                    log_debug!("accepted loopback DIRECT");
                    return upgrade_ws_or_serve_app(
                        connection,
                        remote,
                        listener.config.serve_app,
                        uri,
                        last_etag,
                        origin.map(|or| or.to_str().unwrap()),
                        referer,
                    );
                }
            }
            InterfaceType::Private => {
                if listener.config.accept_forward_for.is_public_static()
                    || listener.config.accept_forward_for.is_public_dyn()
                {
                    if !listener.config.accept_direct && !remote.is_public()
                        || listener.config.accept_direct
                            && !remote.is_private()
                            && !remote.is_public()
                    {
                        return Err(make_error(StatusCode::FORBIDDEN));
                    }
                    check_no_xff(xff)?;

                    let mut addrs = listener
                        .config
                        .accept_forward_for
                        .get_public_bind_addresses();
                    let mut urls_str = vec![];
                    // if !listener.config.refuse_clients {
                    //     urls_str.push(NG_APP_URL.to_string());
                    // }
                    if listener.config.accept_direct {
                        addrs.extend(&listener.addrs);
                        urls_str = [
                            urls_str,
                            prepare_urls_from_private_addrs(&listener.addrs, listener.config.port),
                        ]
                        .concat();
                    }
                    check_origin_is_url(origin, &urls_str)?;
                    check_host_in_addrs(host, &addrs)?;
                    log_debug!("accepted private PUBLIC_STATIC or PUBLIC_DYN with direct {} with refuse_clients {}",listener.config.accept_direct, listener.config.refuse_clients);
                    return upgrade_ws_or_serve_app(
                        connection,
                        remote,
                        listener.config.serve_app,
                        uri,
                        last_etag,
                        origin.map(|or| or.to_str().unwrap()),
                        referer,
                    );
                } else if listener.config.accept_forward_for.is_public_domain() {
                    if !remote.is_private() {
                        return Err(make_error(StatusCode::FORBIDDEN));
                    }
                    check_xff_is_public_or_private(xff, listener.config.accept_direct, true)?;

                    let (mut hosts_str, mut urls_str) =
                        prepare_domain_url_and_host(&listener.config.accept_forward_for);
                    if listener.config.accept_direct {
                        for addr in listener.addrs.iter() {
                            let str = addr.ip.to_string();
                            hosts_str.push(str);
                        }
                        urls_str = [
                            urls_str,
                            prepare_urls_from_private_addrs(&listener.addrs, listener.config.port),
                        ]
                        .concat();
                    }
                    check_origin_is_url(origin, &urls_str)?;
                    check_host(host, hosts_str)?;
                    log_debug!(
                        "accepted private PUBLIC_DOMAIN with direct {}",
                        listener.config.accept_direct
                    );
                    return upgrade_ws_or_serve_app(
                        connection,
                        remote,
                        listener.config.serve_app,
                        uri,
                        last_etag,
                        origin.map(|or| or.to_str().unwrap()).and_then(|val| {
                            if listener.config.refuse_clients {
                                None
                            } else {
                                Some(val)
                            }
                        }),
                        referer,
                    );
                } else if listener.config.accept_forward_for == AcceptForwardForV0::No {
                    if !remote.is_private() {
                        return Err(make_error(StatusCode::FORBIDDEN));
                    }

                    check_no_xff(xff)?;

                    check_host_in_addrs(host, &listener.addrs)?;
                    let urls_str =
                        prepare_urls_from_private_addrs(&listener.addrs, listener.config.port);
                    check_origin_is_url(origin, &urls_str)?;
                    log_debug!("accepted private DIRECT");
                    return upgrade_ws_or_serve_app(
                        connection,
                        remote,
                        listener.config.serve_app,
                        uri,
                        last_etag,
                        origin.map(|or| or.to_str().unwrap()),
                        referer,
                    );
                }
            }
            _ => {}
        }

        Err(make_error(StatusCode::FORBIDDEN))
    }
}

pub async fn accept(tcp: TcpStream, peer_priv_key: PrivKey) {
    let remote_addr = tcp.peer_addr().unwrap();
    let remote_bind_address: BindAddress = (&remote_addr).into();

    let local_addr = tcp.local_addr().unwrap();
    let local_bind_address: BindAddress = (&local_addr).into();

    let ws = accept_hdr_async(
        tcp,
        SecurityCallback::new(remote_bind_address, local_bind_address),
    )
    .await;
    if ws.is_err() {
        log_debug!("websocket rejected");
        return;
    }

    log_debug!("websocket accepted");

    let cws = ConnectionWebSocket {};
    let base = cws
        .accept(
            remote_bind_address,
            local_bind_address,
            peer_priv_key,
            ws.unwrap(),
        )
        .await
        .unwrap();

    let res = BROKER
        .write()
        .await
        .accept(base, remote_bind_address, local_bind_address)
        .await;
    if res.is_err() {
        log_warn!("Accept error: {:?}", res.unwrap_err());
    }
}

#[cfg(test)]
pub async fn run_server_accept_one(
    addr: &str,
    port: u16,
    peer_priv_key: PrivKey,
    _peer_pub_key: PubKey,
) -> std::io::Result<()> {
    let addrs = format!("{}:{}", addr, port);
    let _root = tempfile::Builder::new().prefix("ngd").tempdir().unwrap();
    // let master_key: [u8; 32] = [0; 32];
    // std::fs::create_dir_all(root.path()).unwrap();
    // log_debug!("data directory: {}", root.path().to_str().unwrap());
    // let store = RocksDbKCVStorage::open(root.path(), master_key);

    let socket = TcpListener::bind(addrs.as_str()).await?;
    log_debug!("Listening on {}", addrs.as_str());
    let mut connections = socket.incoming();

    let tcp = connections.next().await.unwrap()?;

    {
        //BROKER.write().await.set_my_peer_id(peer_pub_key);
    }

    accept(tcp, peer_priv_key).await;

    Ok(())
}

pub async fn run_server_v0(
    peer_priv_key: PrivKey,
    peer_id: PubKey,
    wallet_master_key: SymKey,
    config: DaemonConfigV0,
    mut path: PathBuf,
    admin_invite: bool,
) -> Result<(), NgError> {
    // check config

    let mut run_core = false;
    let mut run_server = false;
    for overlay_conf in config.overlays_configs.iter() {
        if overlay_conf.core != BrokerOverlayPermission::Nobody {
            run_core = true;
        }
        if overlay_conf.server != BrokerOverlayPermission::Nobody {
            run_server = true;
        }
    }
    if !run_core && !run_server {
        return Err(NgError::BrokerConfigErrorStr(
            "There isn't any overlay_config that should run as core or server. Check your config.",
        ));
    }

    if run_core && !run_server {
        log_warn!("There isn't any overlay_config that should run as server. This is a misconfiguration as a core server that cannot receive client connections is useless");
    }

    let mut listeners: HashSet<String> = HashSet::new();
    for listener in &config.listeners {
        let id: String = listener.to_string();
        if !listeners.insert(id.clone()) {
            return Err(NgError::BrokerConfigError(format!(
                "The listener {} is defined twice. Check your config file.",
                id
            )));
        }
    }

    let interfaces = get_interface();
    log_debug!("interfaces {:?}", interfaces);
    let mut listener_infos: HashMap<String, ListenerInfo> = HashMap::new();
    let mut listeners_addrs: Vec<(Vec<SocketAddr>, String)> = vec![];
    let mut listeners: Vec<TcpListener> = vec![];
    let mut accept_clients = false;
    //let mut serve_app = false;

    // TODO: check that there is only one PublicDyn or one PublicStatic or one Core

    let mut servers: Vec<BrokerServerV0> = vec![];

    let registration_url = config.registration_url;

    // Preparing the listeners addrs and infos
    for listener in config.listeners {
        if !listener.accept_direct && listener.accept_forward_for == AcceptForwardForV0::No {
            log_warn!(
                "The interface {} does not accept direct connections nor is configured to forward. it is therefor disabled",
                listener.interface_name
            );
            continue;
        }

        match find_name(&interfaces, &listener.interface_name) {
            None => {
                return Err(NgError::BrokerConfigError(format!(
                    "The interface {} does not exist on your host. Check your config file.",
                    listener.interface_name
                )));
            }
            Some(interface) => {
                let mut addrs: Vec<SocketAddr> = interface
                    .ipv4
                    .iter()
                    .filter_map(|ip| {
                        if interface.if_type.is_ipv4_valid_for_type(&ip.addr) {
                            Some(SocketAddr::new(IpAddr::V4(ip.addr), listener.port))
                        } else {
                            None
                        }
                    })
                    .collect();
                if addrs.is_empty() {
                    return Err(NgError::BrokerConfigError(format!(
                        "The interface {} does not have any IPv4 address.",
                        listener.interface_name
                    )));
                }
                if listener.ipv6 {
                    let mut ipv6s: Vec<SocketAddr> = interface
                        .ipv6
                        .iter()
                        .filter_map(|ip| {
                            if interface.if_type.is_ipv6_valid_for_type(&ip.addr)
                                || listener.should_bind_public_ipv6_to_private_interface(ip.addr)
                            {
                                Some(SocketAddr::new(IpAddr::V6(ip.addr), listener.port))
                            } else {
                                None
                            }
                        })
                        .collect();
                    addrs.append(&mut ipv6s);
                }

                if !listener.refuse_clients {
                    accept_clients = true;
                }
                if listener.refuse_clients && listener.accept_forward_for.is_public_domain() {
                    log_warn!(
                        "You have disabled accepting connections from clients on {}. This is unusual as --domain and --domain-private listeners are meant to answer to clients only. This will activate the relay_websocket on this listener. Is it really intended?",
                        listener.interface_name
                    );
                }
                // if listener.serve_app {
                //     serve_app = true;
                // }

                let bind_addresses: Vec<BindAddress> =
                    addrs.iter().map(|addr| addr.into()).collect();

                let server_types = listener.get_bootstraps(bind_addresses.clone());
                let common_peer_id = listener.accept_forward_for.domain_with_common_peer_id();
                for server_type in server_types {
                    servers.push(BrokerServerV0 {
                        peer_id: common_peer_id.unwrap_or(peer_id),
                        can_verify: false,
                        can_forward: !run_core,
                        server_type,
                    })
                }

                let listener_id: String = listener.to_string();

                let listener_info = ListenerInfo {
                    config: listener,
                    addrs: bind_addresses,
                };

                listener_infos.insert(listener_id, listener_info);
                listeners_addrs.push((addrs, interface.name));
            }
        }
    }

    if listeners_addrs.is_empty() {
        return Err(NgError::BrokerConfigErrorStr("No listener configured."));
    }

    if !accept_clients {
        log_warn!("There isn't any listener that accept clients. This is a misconfiguration as a core server that cannot receive client connections is useless");
    }
    let bootstrap_v0 = BootstrapContentV0 { servers };
    let local_bootstrap_info = LocalBootstrapInfo::V0(LocalBootstrapInfoV0 {
        bootstrap: bootstrap_v0.clone(),
        registration_url: registration_url.clone(),
    });
    BOOTSTRAP_STRING
        .set(json!(local_bootstrap_info).to_string())
        .unwrap();

    // saving the infos in the broker. This needs to happen before we start listening, as new incoming connections can happen anytime after that.
    // and we need those infos for permission checking.
    {
        //let root = tempfile::Builder::new().prefix("ngd").tempdir().unwrap();
        let mut path_users = path.clone();
        path_users.push("users");
        path.push("storage");
        std::fs::create_dir_all(path.clone()).unwrap();
        std::fs::create_dir_all(path_users.clone()).unwrap();

        // opening the server storage (that contains the encryption keys for each store/overlay )
        let server_storage = RocksDbServerStorage::open(
            &mut path,
            wallet_master_key.clone(),
            if admin_invite {
                Some(bootstrap_v0.clone())
            } else {
                None
            },
        )
        .map_err(|e| {
            NgError::BrokerConfigError(format!("Error while opening server storage: {}", e))
        })?;

        let server_broker = ServerBroker::new(
            server_storage,
            path_users,
            if admin_invite {
                Some(wallet_master_key)
            } else {
                None
            },
        );

        let mut broker = BROKER.write().await;
        broker.set_server_broker(server_broker);

        LISTENERS_INFO
            .set(broker.set_listeners(listener_infos))
            .unwrap();
        let server_config = ServerConfig {
            overlays_configs: config.overlays_configs,
            registration: config.registration,
            admin_user: config.admin_user,
            registration_url,
            peer_id,
            bootstrap: BootstrapContent::V0(bootstrap_v0),
        };
        broker.set_server_config(server_config);
    }

    // Actually starting the listeners
    for addrs in listeners_addrs {
        let addrs_string = addrs
            .0
            .iter()
            .map(SocketAddr::to_string)
            .collect::<Vec<String>>()
            .join(", ");

        for addr in addrs.0 {
            let tcp_listener = TcpListener::bind(addr).await.map_err(|e| {
                NgError::BrokerConfigError(format!(
                    "cannot bind to {} with addresses {} : {}",
                    addrs.1,
                    addrs_string,
                    e.to_string()
                ))
            })?;
            listeners.push(tcp_listener);
        }

        log_info!("Listening on {} {}", addrs.1, addrs_string);
    }

    // select on all listeners
    let mut incoming = futures::stream::select_all(
        listeners
            .into_iter()
            .map(TcpListener::into_incoming)
            .map(Box::pin),
    );

    // Iterate over all incoming connections

    // TODO : select on the shutdown stream too
    while let Some(tcp) = incoming.next().await {
        // TODO select peer_priv_ket according to config. if --domain-peer present and the connection is for that listener (PublicDomainPeer) then use the peer configured there
        let key = peer_priv_key.clone();
        async_std::task::spawn(async move {
            accept(tcp.unwrap(), key).await;
        });
    }

    Ok(())
}
