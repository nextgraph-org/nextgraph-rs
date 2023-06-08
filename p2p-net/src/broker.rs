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
use p2p_repo::object::Object;
use p2p_repo::object::ObjectParseError;
use p2p_repo::store::HashMapRepoStore;
use p2p_repo::types::*;
use p2p_repo::utils::generate_keypair;
use std::collections::HashMap;
use std::net::IpAddr;
use std::ops::Deref;

use std::io::BufReader;
use std::io::Read;

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

    test: u32,
    tauri_streams: HashMap<String, Sender<Commit>>,
}

impl Broker {
    /// helper function to store the sender of a tauri stream in order to be able to cancel it later on
    /// only used in Tauri, not used in the JS SDK
    pub fn tauri_stream_add(&mut self, stream_id: String, sender: Sender<Commit>) {
        self.tauri_streams.insert(stream_id, sender);
    }

    /// helper function to cancel a tauri stream
    /// /// only used in Tauri, not used in the JS SDK
    pub fn tauri_stream_cancel(&mut self, stream_id: String) {
        let s = self.tauri_streams.remove(&stream_id);
        if let Some(sender) = s {
            sender.close_channel();
        }
    }

    pub async fn get_block_from_store_with_block_id(
        &mut self,
        nuri: String,
        id: BlockId,
        include_children: bool,
    ) -> Result<Receiver<Block>, ProtocolError> {
        // TODO
        let (mut tx, rx) = mpsc::unbounded::<Block>();

        //log!("cur {}", std::env::current_dir().unwrap().display());

        //Err(ProtocolError::AccessDenied)
        // let f = std::fs::File::open(
        //     "../p2p-repo/tests/e4e4b57524ce29df826055c368894e912ab03af46f61f6270b4c8796bc6f4221.ng",
        // )
        // .expect("open of block.ng");
        // let mut reader = BufReader::new(f);
        // let mut block_buffer: Vec<u8> = Vec::new();
        // reader
        //     .read_to_end(&mut block_buffer)
        //     .expect("read of test.ng");

        let block = serde_bare::from_slice::<Block>(&crate::tests::file::test).unwrap();

        tx.send(block).await;
        Ok(rx)
    }

    pub async fn get_object_from_store_with_object_ref(
        &mut self,
        nuri: String,
        obj_ref: ObjectRef,
    ) -> Result<ObjectContent, ProtocolError> {
        let blockstream = self
            .get_block_from_store_with_block_id(nuri, obj_ref.id, true)
            .await?;
        let store = HashMapRepoStore::from_block_stream(blockstream).await;

        Object::load(obj_ref.id, Some(obj_ref.key), &store)
            .map_err(|e| match e {
                ObjectParseError::MissingBlocks(_missing) => ProtocolError::MissingBlocks,
                _ => ProtocolError::ObjectParseError,
            })?
            .content()
            .map_err(|_| ProtocolError::ObjectParseError)
    }

    pub async fn doc_sync_branch(&mut self, anuri: String) -> (Receiver<Commit>, Sender<Commit>) {
        let (mut tx, rx) = mpsc::unbounded::<Commit>();

        let obj_ref = ObjectRef {
            id: ObjectId::Blake3Digest32([
                228, 228, 181, 117, 36, 206, 41, 223, 130, 96, 85, 195, 104, 137, 78, 145, 42, 176,
                58, 244, 111, 97, 246, 39, 11, 76, 135, 150, 188, 111, 66, 33,
            ]),
            key: SymKey::ChaCha20Key([
                100, 243, 39, 242, 203, 131, 102, 50, 9, 54, 248, 113, 4, 160, 28, 45, 73, 56, 217,
                112, 95, 150, 144, 137, 9, 57, 106, 5, 39, 202, 146, 94,
            ]),
        };
        let refs = vec![obj_ref];
        let metadata = vec![5u8; 55];
        let expiry = None;

        let (member_privkey, member_pubkey) = generate_keypair();

        let commit = Commit::new(
            member_privkey,
            member_pubkey,
            1,
            obj_ref,
            vec![],
            vec![],
            refs,
            metadata,
            obj_ref,
            expiry,
        )
        .unwrap();
        async fn send(mut tx: Sender<Commit>, commit: Commit) -> ResultSend<()> {
            while let Ok(_) = tx.send(commit.clone()).await {
                log!("sending");
                sleep!(std::time::Duration::from_secs(3));
            }
            log!("end of sending");
            Ok(())
        }
        spawn_and_log_error(send(tx.clone(), commit));

        (rx, tx.clone())
    }

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

    pub fn test(&self) -> u32 {
        self.test
    }

    pub fn new() -> Self {
        let (shutdown_sender, shutdown_receiver) = mpsc::unbounded::<ProtocolError>();
        let mut random_buf = [0u8; 4];
        getrandom::getrandom(&mut random_buf).unwrap();
        Broker {
            shutdown: Some(shutdown_receiver),
            shutdown_sender,
            direct_connections: HashMap::new(),
            peers: HashMap::new(),
            tauri_streams: HashMap::new(),
            closing: false,
            test: u32::from_be_bytes(random_buf),
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
