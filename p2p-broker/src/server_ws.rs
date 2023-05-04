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

use crate::broker_store::config::ConfigMode;
use async_std::net::{TcpListener, TcpStream};
use async_std::sync::Mutex;
use async_std::task;
use async_tungstenite::accept_async;
use async_tungstenite::tungstenite::protocol::Message;
use debug_print::*;
use futures::{SinkExt, StreamExt};
use p2p_client_ws::remote_ws::ConnectionWebSocket;
use p2p_net::broker::*;
use p2p_net::connection::IAccept;
use p2p_net::types::IP;
use p2p_net::utils::Sensitive;
use p2p_repo::types::{PrivKey, PubKey};
use p2p_repo::utils::generate_keypair;
use p2p_stores_lmdb::broker_store::LmdbBrokerStore;
use p2p_stores_lmdb::repo_store::LmdbRepoStore;
use std::fs;
use std::ops::Deref;
use std::sync::Arc;
use std::{thread, time};
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
    addrs: &str,
    peer_priv_key: Sensitive<[u8; 32]>,
    peer_pub_key: PubKey,
) -> std::io::Result<()> {
    let root = tempfile::Builder::new().prefix("ngd").tempdir().unwrap();
    let master_key: [u8; 32] = [0; 32];
    std::fs::create_dir_all(root.path()).unwrap();
    println!("{}", root.path().to_str().unwrap());
    let store = LmdbBrokerStore::open(root.path(), master_key);

    // TODO: remove this part
    // let server: BrokerServer =
    //     BrokerServer::new(store, ConfigMode::Local).expect("starting broker");
    // let server_arc = Arc::new(server);

    let socket = TcpListener::bind(addrs).await?;
    debug_println!("Listening on {}", addrs);
    let mut connections = socket.incoming();

    let tcp = connections.next().await.unwrap()?;

    accept(tcp, peer_priv_key, peer_pub_key).await;

    Ok(())
}
use p2p_net::utils::U8Array;
pub async fn run_server(
    addrs: &str,
    peer_priv_key: Sensitive<[u8; 32]>,
    peer_pub_key: PubKey,
) -> std::io::Result<()> {
    let root = tempfile::Builder::new().prefix("ngd").tempdir().unwrap();
    let master_key: [u8; 32] = [0; 32];
    std::fs::create_dir_all(root.path()).unwrap();
    println!("{}", root.path().to_str().unwrap());
    let store = LmdbBrokerStore::open(root.path(), master_key);

    // TODO: remove this part
    // let server: BrokerServer =
    //     BrokerServer::new(store, ConfigMode::Local).expect("starting broker");
    // let server_arc = Arc::new(server);

    let socket = TcpListener::bind(addrs).await?;
    debug_println!("Listening on {}", addrs);
    let mut connections = socket.incoming();

    while let Some(tcp) = connections.next().await {
        accept(
            tcp.unwrap(),
            Sensitive::<[u8; 32]>::from_slice(peer_priv_key.deref()),
            peer_pub_key,
        )
        .await;
    }
    Ok(())
}
