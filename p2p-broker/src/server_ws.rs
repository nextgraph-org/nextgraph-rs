/*
 * Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
 */

//! WebSocket implementation of the Broker

use crate::interfaces::*;
use crate::types::*;
use async_std::io::ReadExt;
use async_std::net::{TcpListener, TcpStream};
use async_std::sync::Mutex;
use async_std::task;
use async_tungstenite::accept_hdr_async;
use async_tungstenite::tungstenite::handshake::server::{
    Callback, ErrorResponse, Request, Response,
};
use async_tungstenite::tungstenite::http::header::{CONNECTION, HOST, ORIGIN, UPGRADE};
use async_tungstenite::tungstenite::http::HeaderValue;
use async_tungstenite::tungstenite::http::StatusCode;
use async_tungstenite::tungstenite::protocol::Message;
use futures::{SinkExt, StreamExt};
use once_cell::sync::OnceCell;
use p2p_client_ws::remote_ws::ConnectionWebSocket;
use p2p_net::broker::*;
use p2p_net::connection::IAccept;
use p2p_net::types::*;
use p2p_net::utils::is_private_ip;
use p2p_net::utils::is_public_ip;
use p2p_net::utils::{get_domain_without_port, Sensitive, U8Array};
use p2p_repo::log::*;
use p2p_repo::types::{PrivKey, PubKey};
use p2p_repo::utils::generate_keypair;
use std::collections::HashMap;
use std::collections::HashSet;
use std::fs;
use std::net::SocketAddr;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::ops::Deref;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::{thread, time};
use stores_lmdb::kcv_store::LmdbKCVStore;
use stores_lmdb::repo_store::LmdbRepoStore;
use tempfile::Builder;

static LISTENERS_INFO: OnceCell<(HashMap<String, ListenerInfo>, HashMap<BindAddress, String>)> =
    OnceCell::new();
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

fn check_origin_is_url(
    origin: Option<&HeaderValue>,
    domains: Vec<String>,
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
            let ip_str = val
                .to_str()
                .map_err(|_| make_error(StatusCode::FORBIDDEN))?;
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

fn upgrade_ws_or_serve_app(
    upgrade: Option<&HeaderValue>,
    remote: IP,
    serve_app: bool,
    response: Response,
) -> Result<Response, ErrorResponse> {
    if upgrade.is_some()
        && upgrade
            .unwrap()
            .to_str()
            .unwrap()
            .split(|c| c == ' ' || c == ',')
            .any(|p| p.eq_ignore_ascii_case("Upgrade"))
    {
        return Ok(response);
    }

    if serve_app && (remote.is_private() || remote.is_loopback()) {
        return Err(make_error(StatusCode::OK));
    }

    Err(make_error(StatusCode::FORBIDDEN))
}

const LOCAL_HOSTS: [&str; 3] = ["localhost", "127.0.0.1", "::1"];
const LOCAL_URLS: [&str; 3] = ["http://localhost", "http://127.0.0.1", "http://::1"];
const APP_NG_ONE_URL: &str = "https://app.nextgraph.one";

impl Callback for SecurityCallback {
    fn on_request(self, request: &Request, response: Response) -> Result<Response, ErrorResponse> {
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

        let xff = request.headers().get("X-Forwarded-For");
        let upgrade = request.headers().get(CONNECTION);
        let host = request.headers().get(HOST);
        let origin = request.headers().get(ORIGIN);
        let remote = self.remote_bind_address.ip;
        let xff = request.headers().get("X-Forwarded-For");

        log_debug!(
            "upgrade:{:?} origin:{:?} host:{:?} xff:{:?} remote:{:?} local:{:?}",
            upgrade,
            origin,
            host,
            xff,
            remote,
            self.local_bind_address
        );

        match listener.config.if_type {
            InterfaceType::Public => {
                if !remote.is_public() {
                    return Err(make_error(StatusCode::FORBIDDEN));
                }
                check_no_xff(xff)?;
                let mut urls_str = vec![];
                if !listener.config.refuse_clients {
                    urls_str.push(APP_NG_ONE_URL.to_string());
                }
                check_origin_is_url(origin, urls_str)?;

                check_host_in_addrs(host, &listener.addrs)?;
                log_debug!(
                    "accepted core with refuse_clients {}",
                    listener.config.refuse_clients
                );
                return Ok(response);
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
                    check_origin_is_url(origin, urls_str)?;
                    check_host(host, hosts_str)?;
                    check_xff_is_public_or_private(xff, listener.config.accept_direct, true)?;
                    log_debug!(
                        "accepted loopback PUBLIC_DOMAIN with direct {}",
                        listener.config.accept_direct
                    );
                    return upgrade_ws_or_serve_app(
                        upgrade,
                        remote,
                        listener.config.serve_app,
                        response,
                    );
                } else if listener.config.accept_forward_for.is_private_domain() {
                    let (hosts_str, urls_str) =
                        prepare_domain_url_and_host(&listener.config.accept_forward_for);
                    check_origin_is_url(origin, urls_str)?;
                    check_host(host, hosts_str)?;
                    check_xff_is_public_or_private(xff, false, false)?;
                    log_debug!("accepted loopback PRIVATE_DOMAIN");
                    return Ok(response);
                } else if listener.config.accept_forward_for == AcceptForwardForV0::No {
                    check_host(host, local_hosts)?;
                    check_no_xff(xff)?;
                    // TODO local_urls might need a trailing :port, but it is ok for now as we do starts_with
                    check_origin_is_url(origin, local_urls)?;
                    log_debug!("accepted loopback DIRECT");
                    return Ok(response);
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
                    if !listener.config.refuse_clients {
                        urls_str.push(APP_NG_ONE_URL.to_string());
                    }
                    if listener.config.accept_direct {
                        addrs.extend(&listener.addrs);
                        urls_str = [
                            urls_str,
                            prepare_urls_from_private_addrs(&listener.addrs, listener.config.port),
                        ]
                        .concat();
                    }
                    check_origin_is_url(origin, urls_str)?;
                    check_host_in_addrs(host, &addrs)?;
                    log_debug!("accepted private PUBLIC_STATIC or PUBLIC_DYN with direct {} with refuse_clients {}",listener.config.accept_direct, listener.config.refuse_clients);
                    return Ok(response);
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
                    check_origin_is_url(origin, urls_str)?;
                    check_host(host, hosts_str)?;
                    log_debug!(
                        "accepted private PUBLIC_DOMAIN with direct {}",
                        listener.config.accept_direct
                    );
                    return Ok(response);
                } else if listener.config.accept_forward_for == AcceptForwardForV0::No {
                    if !remote.is_private() {
                        return Err(make_error(StatusCode::FORBIDDEN));
                    }

                    check_no_xff(xff)?;

                    check_host_in_addrs(host, &listener.addrs)?;
                    check_origin_is_url(
                        origin,
                        prepare_urls_from_private_addrs(&listener.addrs, listener.config.port),
                    )?;
                    log_debug!("accepted private DIRECT");
                    return Ok(response);
                }
            }
            _ => {}
        }

        Err(make_error(StatusCode::FORBIDDEN))
    }
}

pub async fn accept(tcp: TcpStream, peer_priv_key: Sensitive<[u8; 32]>) {
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
        log_debug!("websocket rejected {:?}", ws.err());
        //let mut buffer = Vec::new();
        //tcp.read_to_end(&mut buffer).await;
        //log_debug!("{:?}", buffer);
        return;
    }

    log_debug!("websocket accepted");

    let cws = ConnectionWebSocket {};
    let base = cws.accept(peer_priv_key, ws.unwrap()).await.unwrap();

    let res = BROKER
        .write()
        .await
        .accept(base, remote_bind_address, local_bind_address)
        .await;
}

pub async fn run_server_accept_one(
    addr: &str,
    port: u16,
    peer_priv_key: Sensitive<[u8; 32]>,
    peer_pub_key: PubKey,
) -> std::io::Result<()> {
    let addrs = format!("{}:{}", addr, port);
    let root = tempfile::Builder::new().prefix("ngd").tempdir().unwrap();
    let master_key: [u8; 32] = [0; 32];
    std::fs::create_dir_all(root.path()).unwrap();
    log_debug!("data directory: {}", root.path().to_str().unwrap());
    let store = LmdbKCVStore::open(root.path(), master_key);

    let socket = TcpListener::bind(addrs.as_str()).await?;
    log_debug!("Listening on {}", addrs.as_str());
    let mut connections = socket.incoming();

    let tcp = connections.next().await.unwrap()?;

    {
        BROKER.write().await.set_my_peer_id(peer_pub_key);
    }

    accept(tcp, peer_priv_key).await;

    Ok(())
}

pub async fn run_server_v0(
    peer_priv_key: Sensitive<[u8; 32]>,
    peer_pub_key: PubKey,
    wallet_master_key: Sensitive<[u8; 32]>,
    config: DaemonConfigV0,
    mut path: PathBuf,
) -> Result<(), ()> {
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
        log_err!("There isn't any overlay_config that should run as core or server. Check your config. cannot start");
        return Err(());
    }

    if run_core && !run_server {
        log_warn!("There isn't any overlay_config that should run as server. This is a misconfiguration as a core server that cannot receive client connections is useless");
    }

    let mut listeners: HashSet<String> = HashSet::new();
    for listener in &config.listeners {
        let id: String = listener.to_string();
        if !listeners.insert(id.clone()) {
            log_err!(
                "The listener {} is defined twice. Check your config file. cannot start",
                id
            );
            return Err(());
        }
    }
    //let root = tempfile::Builder::new().prefix("ngd").tempdir().unwrap();

    path.push("storage");
    std::fs::create_dir_all(path.clone()).unwrap();
    //log::info!("Home directory is {}");

    // TODO: open wallet
    let master_key: [u8; 32] = [0; 32];

    let store = LmdbKCVStore::open(&path, master_key);

    let interfaces = get_interface();
    let mut listener_infos: HashMap<String, ListenerInfo> = HashMap::new();
    let mut listeners_addrs: Vec<(Vec<SocketAddr>, String)> = vec![];
    let mut listeners: Vec<TcpListener> = vec![];
    let mut accept_clients = false;

    // TODO: check that there is only one PublicDyn or one PublicStatic or one Core

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
                log_err!(
                    "The interface {} does not exist on your host. Check your config file. cannot start",
                    listener.interface_name
                );
                return Err(());
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
                if addrs.len() == 0 {
                    log_err!(
                        "The interface {} does not have any IPv4 address. cannot start",
                        listener.interface_name
                    );
                    return Err(());
                }
                if listener.ipv6 {
                    let mut ipv6s: Vec<SocketAddr> = interface
                        .ipv6
                        .iter()
                        .filter_map(|ip| {
                            if interface.if_type.is_ipv6_valid_for_type(&ip.addr) {
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

                let listener_id: String = listener.to_string();
                let listener_info = ListenerInfo {
                    config: listener,
                    addrs: addrs.iter().map(|addr| addr.into()).collect(),
                };

                listener_infos.insert(listener_id, listener_info);
                listeners_addrs.push((addrs, interface.name));
            }
        }
    }

    if listeners_addrs.len() == 0 {
        log_err!("No listener configured. cannot start",);
        return Err(());
    }

    if !accept_clients {
        log_warn!("There isn't any listener that accept clients. This is a misconfiguration as a core server that cannot receive client connections is useless");
    }

    // saving the infos in the broker. This needs to happen before we start listening, as new incoming connections can happen anytime after that.
    // and we need those infos for permission checking.
    {
        let mut broker = BROKER.write().await;
        broker.set_my_peer_id(peer_pub_key);
        LISTENERS_INFO
            .set(broker.set_listeners(listener_infos))
            .unwrap();
        broker.set_overlays_configs(config.overlays_configs);
    }

    // Actually starting the listeners
    for addrs in listeners_addrs {
        let addrs_string = addrs
            .0
            .iter()
            .map(SocketAddr::to_string)
            .collect::<Vec<String>>()
            .join(", ");
        let tcp_listener = TcpListener::bind(addrs.0.as_slice()).await.map_err(|e| {
            log_err!(
                "cannot bind to {} with addresses {} : {}",
                addrs.1,
                addrs_string,
                e.to_string()
            )
        })?;
        log_info!("Listening on {} {}", addrs.1, addrs_string);

        listeners.push(tcp_listener);
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
        accept(
            tcp.unwrap(),
            Sensitive::<[u8; 32]>::from_slice(peer_priv_key.deref()),
        )
        .await;
    }

    Ok(())
}
