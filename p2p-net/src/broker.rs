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

use crate::actor::*;
use crate::connection::*;
use crate::errors::*;
use crate::types::*;
use crate::utils::spawn_and_log_error;
use crate::utils::{Receiver, ResultSend, Sender};
use crate::{log, sleep};
use async_std::stream::StreamExt;
use async_std::sync::{Arc, RwLock};
use futures::channel::mpsc;
use futures::SinkExt;
use noise_protocol::U8Array;
use noise_rust_crypto::sensitive::Sensitive;
use once_cell::sync::Lazy;
use p2p_repo::types::{PrivKey, PubKey};
use p2p_repo::utils::generate_keypair;
use std::collections::HashMap;
use std::net::IpAddr;
use std::ops::Deref;

#[derive(Debug)]
pub enum PeerConnection {
    Core(IP),
    Client(ConnectionBase),
    NONE,
}

#[derive(Debug)]
pub struct BrokerPeerInfo {
    lastPeerAdvert: Option<PeerAdvert>, //FIXME: remove Option
    connected: PeerConnection,
}

#[derive(Debug)]
pub struct DirectConnection {
    ip: IP,
    interface: String,
    remote_peer_id: DirectPeerId,
    tp: TransportProtocol,
    //dir: ConnectionDir,
    cnx: ConnectionBase,
}

pub static BROKER: Lazy<Arc<RwLock<Broker>>> = Lazy::new(|| Arc::new(RwLock::new(Broker::new())));

pub struct Broker {
    direct_connections: HashMap<IP, DirectConnection>,
    peers: HashMap<DirectPeerId, BrokerPeerInfo>,
    shutdown: Option<Receiver<ProtocolError>>,
    shutdown_sender: Sender<ProtocolError>,
    closing: bool,
}

impl Broker {
    pub fn reconnecting(&mut self, peer_id: &DirectPeerId) {
        let peerinfo = self.peers.get_mut(peer_id);
        match peerinfo {
            Some(info) => match &info.connected {
                PeerConnection::NONE => {}
                PeerConnection::Client(cb) => {
                    info.connected = PeerConnection::NONE;
                }
                PeerConnection::Core(ip) => {
                    self.direct_connections.remove(&ip);
                    info.connected = PeerConnection::NONE;
                }
            },
            None => {}
        }
    }
    pub fn remove(&mut self, peer_id: &DirectPeerId) {
        let removed = self.peers.remove(peer_id);
        match removed {
            Some(info) => match info.connected {
                PeerConnection::NONE => {}
                PeerConnection::Client(cb) => {}
                PeerConnection::Core(ip) => {
                    self.direct_connections.remove(&ip);
                }
            },
            None => {}
        }
    }

    pub fn new() -> Self {
        let (shutdown_sender, shutdown_receiver) = mpsc::unbounded::<ProtocolError>();
        Broker {
            shutdown: Some(shutdown_receiver),
            shutdown_sender,
            direct_connections: HashMap::new(),
            peers: HashMap::new(),
            closing: false,
        }
    }

    fn take_shutdown(&mut self) -> Receiver<ProtocolError> {
        self.shutdown.take().unwrap()
    }

    pub async fn join_shutdown() -> Result<(), ProtocolError> {
        let mut shutdown_join: Receiver<ProtocolError>;
        {
            shutdown_join = BROKER.write().await.take_shutdown();
        }
        match shutdown_join.next().await {
            Some(ProtocolError::Closing) => Ok(()),
            Some(error) => Err(error),
            None => Ok(()),
        }
    }

    /// Used in tests mostly
    pub async fn join_shutdown_with_timeout(
        timeout: std::time::Duration,
    ) -> Result<(), ProtocolError> {
        async fn timer_shutdown(timeout: std::time::Duration) -> ResultSend<()> {
            async move {
                sleep!(timeout);
                log!("timeout for shutdown");
                let _ = BROKER
                    .write()
                    .await
                    .shutdown_sender
                    .send(ProtocolError::Timeout)
                    .await;
            }
            .await;
            Ok(())
        }
        spawn_and_log_error(timer_shutdown(timeout));
        Broker::join_shutdown().await
    }

    pub async fn graceful_shutdown() {
        let keys;
        {
            let mut broker = BROKER.write().await;
            if broker.closing {
                return;
            }
            broker.closing = true;
            keys = Vec::from_iter(broker.peers.keys().cloned());
        }
        for peer_id in keys {
            BROKER.write().await.close_peer_connection(&peer_id).await;
        }
        let _ = BROKER
            .write()
            .await
            .shutdown_sender
            .send(ProtocolError::Closing)
            .await;
    }

    pub async fn shutdown(&mut self) {
        if self.closing {
            return;
        }
        self.closing = true;

        let _ = self.shutdown_sender.send(ProtocolError::Closing).await;
    }

    pub async fn accept(
        &mut self,
        mut connection: ConnectionBase,
        ip: IP,
        core: Option<String>,
        remote_peer_id: DirectPeerId,
    ) -> Result<(), NetError> {
        if self.closing {
            return Err(NetError::Closing);
        }

        let join = connection.take_shutdown();

        let connected = if core.is_some() {
            let dc = DirectConnection {
                ip,
                interface: core.clone().unwrap(),
                remote_peer_id,
                tp: connection.transport_protocol(),
                cnx: connection,
            };
            self.direct_connections.insert(ip, dc);
            PeerConnection::Core(ip)
        } else {
            PeerConnection::Client(connection)
        };
        let bpi = BrokerPeerInfo {
            lastPeerAdvert: None,
            connected,
        };
        self.peers.insert(remote_peer_id, bpi);

        async fn watch_close(
            mut join: Receiver<NetError>,
            remote_peer_id: DirectPeerId,
        ) -> ResultSend<()> {
            async move {
                let res = join.next().await;
                log!("SOCKET IS CLOSED {:?} {:?}", res, &remote_peer_id);
                log!("REMOVED");
                BROKER.write().await.remove(&remote_peer_id);
            }
            .await;
            Ok(())
        }
        spawn_and_log_error(watch_close(join, remote_peer_id));
        Ok(())
    }

    pub async fn connect(
        &mut self,
        cnx: Box<dyn IConnect>,
        ip: IP,
        core: Option<String>, // the interface used as egress for this connection
        peer_privk: Sensitive<[u8; 32]>,
        peer_pubk: PubKey,
        remote_peer_id: DirectPeerId,
        config: StartConfig,
    ) -> Result<(), NetError> {
        if self.closing {
            return Err(NetError::Closing);
        }

        // TODO check that not already connected to peer
        // IpAddr::from_str("127.0.0.1");

        log!("CONNECTING");
        let mut connection = cnx
            .open(
                ip,
                Sensitive::<[u8; 32]>::from_slice(peer_privk.deref()),
                peer_pubk,
                remote_peer_id,
                config,
            )
            .await?;

        let join = connection.take_shutdown();

        let connected = if core.is_some() {
            let dc = DirectConnection {
                ip,
                interface: core.clone().unwrap(),
                remote_peer_id,
                tp: connection.transport_protocol(),
                cnx: connection,
            };
            self.direct_connections.insert(ip, dc);
            PeerConnection::Core(ip)
        } else {
            PeerConnection::Client(connection)
        };
        let bpi = BrokerPeerInfo {
            lastPeerAdvert: None,
            connected,
        };
        self.peers.insert(remote_peer_id, bpi);

        async fn watch_close(
            mut join: Receiver<NetError>,
            cnx: Box<dyn IConnect>,
            ip: IP,
            core: Option<String>, // the interface used as egress for this connection
            peer_privk: Sensitive<[u8; 32]>,
            peer_pubkey: PubKey,
            remote_peer_id: DirectPeerId,
        ) -> ResultSend<()> {
            async move {
                let res = join.next().await;
                log!("SOCKET IS CLOSED {:?} {:?}", res, &remote_peer_id);
                if res.is_some() {
                    // we intend to reconnect
                    let mut broker = BROKER.write().await;
                    broker.reconnecting(&remote_peer_id);
                    // TODO: deal with cycle error https://users.rust-lang.org/t/recursive-async-method-causes-cycle-error/84628/5
                    // let result = broker
                    //     .connect(cnx, ip, core, peer_pubk, peer_privk, remote_peer_id)
                    //     .await;
                    // log!("SOCKET RECONNECTION {:?} {:?}", result, &remote_peer_id);
                    // TODO: deal with error and incremental backoff
                } else {
                    log!("REMOVED");
                    BROKER.write().await.remove(&remote_peer_id);
                }
            }
            .await;
            Ok(())
        }
        spawn_and_log_error(watch_close(
            join,
            cnx,
            ip,
            core,
            peer_privk,
            peer_pubk,
            remote_peer_id,
        ));
        Ok(())
    }

    pub async fn close_peer_connection(&mut self, peer_id: &DirectPeerId) {
        if let Some(peer) = self.peers.get_mut(peer_id) {
            match &mut peer.connected {
                PeerConnection::Core(_) => {
                    //TODO
                    unimplemented!();
                }
                PeerConnection::Client(cb) => {
                    cb.close().await;
                }
                PeerConnection::NONE => {}
            }
            //self.peers.remove(peer_id); // this is done in the watch_close instead
        }
    }

    pub fn print_status(&self) {
        self.peers.iter().for_each(|(peerId, peerInfo)| {
            log!("PEER in BROKER {:?} {:?}", peerId, peerInfo);
        });
        self.direct_connections.iter().for_each(|(ip, directCnx)| {
            log!("direct_connection in BROKER {:?} {:?}", ip, directCnx)
        });
    }
}
