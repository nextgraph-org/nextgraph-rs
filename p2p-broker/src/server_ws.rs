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
use async_std::net::{TcpListener, TcpStream};
use async_std::sync::Mutex;
use async_std::task;
use async_tungstenite::accept_async;
use async_tungstenite::tungstenite::protocol::Message;
use futures::{SinkExt, StreamExt};
use p2p_client_ws::remote_ws::ConnectionWebSocket;
use p2p_net::broker::*;
use p2p_net::connection::IAccept;
use p2p_net::types::IP;
use p2p_net::utils::Sensitive;
use p2p_repo::log::*;
use p2p_repo::types::{PrivKey, PubKey};
use p2p_repo::utils::generate_keypair;
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

pub async fn accept(tcp: TcpStream, peer_priv_key: Sensitive<[u8; 32]>, peer_pub_key: PubKey) {
    let sock_addr = tcp.peer_addr().unwrap();
    let ip = sock_addr.ip();
    let mut ws = accept_async(tcp).await.unwrap();

    let cws = ConnectionWebSocket {};
    let base = cws.accept(peer_priv_key, peer_pub_key, ws).await.unwrap();

    //TODO FIXME get remote_peer_id from ConnectionBase (once it is available)
    let (priv_key, pub_key) = generate_keypair();
    let remote_peer_id = pub_key;

    let res = BROKER
        .write()
        .await
        .accept(base, IP::try_from(&ip).unwrap(), None, remote_peer_id)
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

    accept(tcp, peer_priv_key, peer_pub_key).await;

    Ok(())
}
use p2p_net::utils::U8Array;
pub async fn run_server_v0(
    peer_priv_key: Sensitive<[u8; 32]>,
    peer_pub_key: PubKey,
    wallet_master_key: Sensitive<[u8; 32]>,
    config: DaemonConfigV0,
    mut path: PathBuf,
) -> Result<(), ()> {
    // check config

    let mut should_run = false;
    for overlay_conf in config.overlays_configs {
        if overlay_conf.core != BrokerOverlayPermission::Nobody
            || overlay_conf.server != BrokerOverlayPermission::Nobody
        {
            should_run = true;
            break;
        }
    }
    if !should_run {
        log_err!("There isn't any overlay_config that should run as core or server. Check your config. cannot start");
        return Err(());
    }

    let listeners: HashSet<String> = HashSet::new();
    for listener in &config.listeners {
        let mut id = listener.interface_name.clone();
        id.push('@');
        id.push_str(&listener.port.to_string());
        if listeners.contains(&id) {
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
    let mut listeners: Vec<TcpListener> = vec![];
    for listener in config.listeners {
        match find_name(&interfaces, &listener.interface_name) {
            None => {
                log_err!(
                    "The interface {} does not exist on your host. Check your config file. cannot start",
                    listener.interface_name
                );
                return Err(());
            }
            Some(interface) => {
                let mut ips: Vec<SocketAddr> = interface
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
                if ips.len() == 0 {
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
                    ips.append(&mut ipv6s);
                }

                let ips_string = ips
                    .iter()
                    .map(|ip| ip.to_string())
                    .collect::<Vec<String>>()
                    .join(", ");
                let listener = TcpListener::bind(ips.as_slice()).await.map_err(|e| {
                    log_err!(
                        "cannot bind to {} with addresses {} : {}",
                        interface.name,
                        ips_string,
                        e.to_string()
                    )
                })?;
                log_info!("Listening on {} {}", interface.name, ips_string);
                listeners.push(listener);
            }
        }
    }

    // select on all listeners
    let mut incoming = futures::stream::select_all(
        listeners
            .into_iter()
            .map(TcpListener::into_incoming)
            .map(Box::pin),
    );
    // Iterate over all incoming connections
    while let Some(tcp) = incoming.next().await {
        accept(
            tcp.unwrap(),
            Sensitive::<[u8; 32]>::from_slice(peer_priv_key.deref()),
            peer_pub_key,
        )
        .await;
    }

    Ok(())
}
