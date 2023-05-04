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
use crate::server::*;
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

async fn connection_loop(tcp: TcpStream, mut handler: ProtocolHandler) -> std::io::Result<()> {
    let addr = tcp.peer_addr().unwrap();
    handler.register(addr);

    let mut ws = accept_async(tcp).await.unwrap();
    let (mut tx, mut rx) = ws.split();

    let mut tx_mutex = Arc::new(Mutex::new(tx));

    // setup the async frames task
    let receiver = handler.async_frames_receiver();
    let ws_in_task = Arc::clone(&tx_mutex);
    task::spawn(async move {
        while let Ok(frame) = receiver.recv().await {
            let mut sink = ws_in_task.lock().await;
            if sink.send(Message::binary(frame)).await.is_err() {
                break;
            }
        }
        debug_println!("end of async frames loop");

        let mut sink = ws_in_task.lock().await;
        let _ = sink.send(Message::Close(None)).await;
        let _ = sink.close().await;
    });

    while let Some(msg) = rx.next().await {
        //debug_println!("RCV: {:?}", msg);
        let msg = match msg {
            Err(e) => {
                debug_println!("Error on server stream: {:?}", e);
                // Errors returned directly through the AsyncRead/Write API are fatal, generally an error on the underlying
                // transport. closing connection
                break;
            }
            Ok(m) => m,
        };
        //TODO implement PING messages
        if msg.is_close() {
            debug_println!("CLOSE from CLIENT");
            if let Message::Close(Some(cf)) = msg {
                debug_println!("CLOSE FRAME {:?}", cf);
            } else if let Message::Close(None) = msg {
                debug_println!("without CLOSE FRAME");
            }
            break;
        } else if msg.is_binary() {
            //debug_println!("server received binary: {:?}", msg);

            let replies = handler.handle_incoming(msg.into_data()).await;

            match replies.0 {
                Err(e) => {
                    debug_println!("Protocol Error: {:?}", e);
                    // dealing with ProtocolErrors (closing the connection)
                    break;
                }
                Ok(r) => {
                    if tx_mutex
                        .lock()
                        .await
                        .send(Message::binary(r))
                        .await
                        .is_err()
                    {
                        //dealing with sending errors (closing the connection)
                        break;
                    }
                }
            }
            match replies.1.await {
                Some(errcode) => {
                    if errcode > 0 {
                        debug_println!("Close due to error code : {:?}", errcode);
                        //closing connection
                        break;
                    }
                }
                None => {}
            }
        }
    }
    handler.deregister();
    let mut sink = tx_mutex.lock().await;
    let _ = sink.send(Message::Close(None)).await;
    let _ = sink.close().await;
    debug_println!("end of sync read+write loop");
    Ok(())
}

pub async fn run_server_accept_one(addrs: &str) -> std::io::Result<()> {
    let root = tempfile::Builder::new()
        .prefix("node-daemon")
        .tempdir()
        .unwrap();
    let master_key: [u8; 32] = [0; 32];
    std::fs::create_dir_all(root.path()).unwrap();
    println!("{}", root.path().to_str().unwrap());
    let store = LmdbBrokerStore::open(root.path(), master_key);

    let server: BrokerServer =
        BrokerServer::new(store, ConfigMode::Local).expect("starting broker");

    let socket = TcpListener::bind(addrs).await?;
    debug_println!("Listening on {}", addrs);
    let mut connections = socket.incoming();
    let server_arc = Arc::new(server);
    let tcp = connections.next().await.unwrap()?;
    let proto_handler = Arc::clone(&server_arc).protocol_handler();
    let _handle = task::spawn(connection_loop(tcp, proto_handler));

    Ok(())
}
use p2p_net::utils::U8Array;
pub async fn run_server(
    addrs: &str,
    peer_priv_key: Sensitive<[u8; 32]>,
    peer_pub_key: PubKey,
) -> std::io::Result<()> {
    let root = tempfile::Builder::new()
        .prefix("node-daemon")
        .tempdir()
        .unwrap();
    let master_key: [u8; 32] = [0; 32];
    std::fs::create_dir_all(root.path()).unwrap();
    println!("{}", root.path().to_str().unwrap());
    let store = LmdbBrokerStore::open(root.path(), master_key);

    let server: BrokerServer =
        BrokerServer::new(store, ConfigMode::Local).expect("starting broker");

    let socket = TcpListener::bind(addrs).await?;
    debug_println!("Listening on {}", addrs);
    let mut connections = socket.incoming();
    let server_arc = Arc::new(server);
    while let Some(tcp) = connections.next().await {
        let tcp = tcp.unwrap();
        let sock_addr = tcp.peer_addr().unwrap();
        let ip = sock_addr.ip();
        let mut ws = accept_async(tcp).await.unwrap();

        let cws = ConnectionWebSocket {};
        let base = cws
            .accept(
                Sensitive::<[u8; 32]>::from_slice(peer_priv_key.deref()),
                peer_pub_key,
                ws,
            )
            .await
            .unwrap();

        //TODO FIXME get remote_peer_id from ConnectionBase (once it is available)
        let (priv_key, pub_key) = generate_keypair();
        let remote_peer_id = pub_key;

        let res = BROKER
            .write()
            .await
            .accept(base, IP::try_from(&ip).unwrap(), None, remote_peer_id)
            .await;
    }
    Ok(())
}
