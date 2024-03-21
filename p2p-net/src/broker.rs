/*
 * Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
*/

use crate::connection::*;
use crate::errors::*;
use crate::server_storage::ServerStorage;
use crate::types::*;
use crate::utils::spawn_and_log_error;
use crate::utils::{Receiver, ResultSend, Sender};
use async_std::stream::StreamExt;
use async_std::sync::{Arc, RwLock};
use either::Either;
use futures::channel::mpsc;
use futures::SinkExt;
use once_cell::sync::Lazy;
use p2p_repo::log::*;
use p2p_repo::object::Object;
use p2p_repo::object::ObjectParseError;
use p2p_repo::store::HashMapRepoStore;
use p2p_repo::types::*;
use p2p_repo::utils::generate_keypair;
use std::collections::HashMap;

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
    remote_peer_id: X25519PrivKey,
    tp: TransportProtocol,
    //dir: ConnectionDir,
    cnx: ConnectionBase,
}

#[derive(Debug)]
pub struct ServerConfig {
    pub overlays_configs: Vec<BrokerOverlayConfigV0>,
    pub registration: RegistrationConfig,
    pub admin_user: Option<PubKey>,
    pub peer_id: PubKey,
    // when creating invitation links, an optional url to redirect the user to can be used, for accepting ToS and making payment, if any.
    pub registration_url: Option<String>,
    pub bootstrap: BootstrapContent,
}

pub static BROKER: Lazy<Arc<RwLock<Broker>>> = Lazy::new(|| Arc::new(RwLock::new(Broker::new())));

pub struct Broker<'a> {
    direct_connections: HashMap<IP, DirectConnection>,
    /// tuple of optional userId and peer key in montgomery form. userId is always None on the server side.
    peers: HashMap<(Option<PubKey>, X25519PubKey), BrokerPeerInfo>,
    /// (local,remote) -> ConnectionBase
    anonymous_connections: HashMap<(BindAddress, BindAddress), ConnectionBase>,
    #[cfg(not(target_arch = "wasm32"))]
    listeners: HashMap<String, ListenerInfo>,
    bind_addresses: HashMap<BindAddress, String>,
    config: Option<ServerConfig>,
    shutdown: Option<Receiver<ProtocolError>>,
    shutdown_sender: Sender<ProtocolError>,
    closing: bool,
    server_storage: Option<Box<dyn ServerStorage + Send + Sync + 'a>>,

    test: u32,
    tauri_streams: HashMap<String, Sender<Commit>>,
    disconnections_sender: Sender<String>,
    disconnections_receiver: Option<Receiver<String>>,
}

impl<'a> Broker<'a> {
    /// helper function to store the sender of a tauri stream in order to be able to cancel it later on
    /// only used in Tauri, not used in the JS SDK
    pub fn tauri_stream_add(&mut self, stream_id: String, sender: Sender<Commit>) {
        self.tauri_streams.insert(stream_id, sender);
    }

    /// helper function to cancel a tauri stream
    /// only used in Tauri, not used in the JS SDK
    pub fn tauri_stream_cancel(&mut self, stream_id: String) {
        let s = self.tauri_streams.remove(&stream_id);
        if let Some(sender) = s {
            sender.close_channel();
        }
    }

    pub fn get_config(&self) -> Option<&ServerConfig> {
        self.config.as_ref()
    }

    pub fn get_registration_url(&self) -> Option<&String> {
        self.config
            .as_ref()
            .and_then(|c| c.registration_url.as_ref())
    }

    pub fn get_bootstrap(&self) -> Result<&BootstrapContent, ProtocolError> {
        self.config
            .as_ref()
            .map(|c| &c.bootstrap)
            .ok_or(ProtocolError::BrokerError)
    }

    pub fn set_server_storage(&mut self, storage: impl ServerStorage + 'a) {
        //log_debug!("set_storage");
        self.server_storage = Some(Box::new(storage));
    }

    // pub fn set_local_storage(&mut self, storage: impl LocalStorage + 'a) {
    //     //log_debug!("set_storage");
    //     self.local_storage = Some(Box::new(storage));
    // }

    pub fn set_server_config(&mut self, config: ServerConfig) {
        self.config = Some(config);
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub fn set_listeners(
        &mut self,
        listeners: HashMap<String, ListenerInfo>,
    ) -> (HashMap<String, ListenerInfo>, HashMap<BindAddress, String>) {
        for entry in listeners.iter() {
            for ba in entry.1.addrs.iter() {
                self.bind_addresses.insert(ba.clone(), entry.0.clone());
            }
        }
        self.listeners.extend(listeners);
        let mut copy_listeners: HashMap<String, ListenerInfo> = HashMap::new();
        let mut copy_bind_addresses: HashMap<BindAddress, String> = HashMap::new();
        copy_listeners.clone_from(&self.listeners);
        copy_bind_addresses.clone_from(&self.bind_addresses);
        (copy_listeners, copy_bind_addresses)
    }

    pub fn get_server_storage(
        &self,
    ) -> Result<&Box<dyn ServerStorage + Send + Sync + 'a>, ProtocolError> {
        //log_debug!("GET STORAGE {:?}", self.server_storage);
        self.server_storage
            .as_ref()
            .ok_or(ProtocolError::BrokerError)
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub fn authorize(
        &self,
        bind_addresses: &(BindAddress, BindAddress),
        auth: Authorization,
    ) -> Result<(), ProtocolError> {
        let listener_id = self
            .bind_addresses
            .get(&bind_addresses.0)
            .ok_or(ProtocolError::BrokerError)?;
        let listener = self
            .listeners
            .get(listener_id)
            .ok_or(ProtocolError::BrokerError)?;
        match auth {
            Authorization::Discover => {
                if listener.config.discoverable
                    && bind_addresses.1.ip.is_private()
                    && listener.config.accept_forward_for.is_no()
                {
                    Ok(())
                } else {
                    Err(ProtocolError::AccessDenied)
                }
            }
            Authorization::ExtMessage => Err(ProtocolError::AccessDenied),
            Authorization::Client(user_and_registration) => {
                if user_and_registration.1.is_some() {
                    // user wants to register
                    let storage = self.get_server_storage()?;
                    if storage.get_user(user_and_registration.0).is_ok() {
                        return Ok(());
                    }
                    if let Some(ServerConfig {
                        registration: reg, ..
                    }) = &self.config
                    {
                        return match reg {
                            RegistrationConfig::Closed => return Err(ProtocolError::AccessDenied),
                            RegistrationConfig::Invitation => {
                                // registration is only possible with an invitation code
                                if user_and_registration.1.unwrap().is_none() {
                                    Err(ProtocolError::InvitationRequired)
                                } else {
                                    let mut is_admin = false;
                                    let code = user_and_registration.1.unwrap().unwrap();
                                    let inv_type = storage.get_invitation_type(code)?;
                                    if inv_type == 2u8 {
                                        // admin
                                        is_admin = true;
                                        storage.remove_invitation(code)?;
                                    } else if inv_type == 1u8 {
                                        storage.remove_invitation(code)?;
                                    }
                                    storage.add_user(user_and_registration.0, is_admin)?;
                                    Ok(())
                                }
                            }
                            RegistrationConfig::Open => {
                                // registration is open (no need for invitation. anybody can register)
                                let mut is_admin = false;
                                if user_and_registration.1.unwrap().is_some() {
                                    // but if there is an invitation code and it says the user should be admin, then we take that into account
                                    let code = user_and_registration.1.unwrap().unwrap();
                                    let inv_type = storage.get_invitation_type(code)?;
                                    if inv_type == 2u8 {
                                        // admin
                                        is_admin = true;
                                        storage.remove_invitation(code)?;
                                    } else if inv_type == 1u8 {
                                        storage.remove_invitation(code)?;
                                    }
                                }
                                self.get_server_storage()?
                                    .add_user(user_and_registration.0, is_admin)?;
                                Ok(())
                            }
                        };
                    } else {
                        return Err(ProtocolError::BrokerError);
                    }
                }
                // if user doesn't want to register, we accept everything, as perms will be checked later on, once the overlayId is known
                Ok(())
            }
            Authorization::Core => Err(ProtocolError::AccessDenied),
            Authorization::Admin(admin_user) => {
                if listener.config.accepts_client() {
                    if let Some(ServerConfig {
                        admin_user: Some(admin),
                        ..
                    }) = self.config
                    {
                        if admin == admin_user {
                            return Ok(());
                        }
                    }
                    let found = self.get_server_storage()?.get_user(admin_user);
                    if found.is_ok() && found.unwrap() {
                        return Ok(());
                    }
                }
                Err(ProtocolError::AccessDenied)
            }
            Authorization::OverlayJoin(_) => Err(ProtocolError::AccessDenied),
        }
    }

    // pub fn add_user(&self, user: PubKey, is_admin: bool) -> Result<(), ProtocolError> {
    //     self.get_server_storage()?.add_user(user, is_admin)
    // }

    // pub fn list_users(&self, admins: bool) -> Result<Vec<PubKey>, ProtocolError> {
    //     self.get_server_storage()?.list_users(admins)
    // }

    pub async fn get_block_from_store_with_block_id(
        &mut self,
        nuri: String,
        id: BlockId,
        include_children: bool,
    ) -> Result<Receiver<Block>, ProtocolError> {
        // TODO
        let (mut tx, rx) = mpsc::unbounded::<Block>();

        //log_debug!("cur {}", std::env::current_dir().unwrap().display());

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
        let store = Box::new(HashMapRepoStore::from_block_stream(blockstream).await);

        Object::load(obj_ref.id, Some(obj_ref.key), &store)
            .map_err(|e| match e {
                ObjectParseError::MissingBlocks(_missing) => ProtocolError::MissingBlocks,
                _ => ProtocolError::ObjectParseError,
            })?
            .content()
            .map_err(|_| ProtocolError::ObjectParseError)
    }

    pub async fn doc_sync_branch(&mut self, anuri: String) -> (Receiver<Commit>, Sender<Commit>) {
        let (tx, rx) = mpsc::unbounded::<Commit>();

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
        let refs = vec![obj_ref.clone()];
        let metadata = vec![5u8; 55];

        let (member_privkey, member_pubkey) = generate_keypair();

        let commit = Commit::new(
            member_privkey,
            member_pubkey,
            1,
            PubKey::nil(),
            QuorumType::NoSigning,
            vec![],
            vec![],
            vec![],
            vec![],
            refs,
            vec![],
            metadata,
            obj_ref.clone(),
        )
        .unwrap();
        async fn send(mut tx: Sender<Commit>, commit: Commit) -> ResultSend<()> {
            while let Ok(_) = tx.send(commit.clone()).await {
                log_debug!("sending");
                sleep!(std::time::Duration::from_secs(3));
            }
            log_debug!("end of sending");
            Ok(())
        }
        spawn_and_log_error(send(tx.clone(), commit));

        (rx, tx.clone())
    }

    pub fn reconnecting(&mut self, peer_id: X25519PrivKey, user: Option<PubKey>) {
        let peerinfo = self.peers.get_mut(&(user, peer_id));
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
    pub fn remove_peer_id(&mut self, peer_id: X25519PrivKey, user: Option<PubKey>) {
        let removed = self.peers.remove(&(user, peer_id));
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

    pub fn remove_anonymous(
        &mut self,
        remote_bind_address: BindAddress,
        local_bind_address: BindAddress,
    ) {
        let removed = self
            .anonymous_connections
            .remove(&(local_bind_address, remote_bind_address));
        if removed.is_some() {
            removed.unwrap().release_shutdown();
        }
    }

    pub fn test(&self) -> u32 {
        self.test
    }

    // #[cfg(not(target_arch = "wasm32"))]
    // pub fn test_storage(&self, path: PathBuf) {
    //     use stores_rocksdb::kcv_store::RocksdbKCVStore;

    //     let key: [u8; 32] = [0; 32];
    //     let test_storage = RocksdbKCVStore::open(&path, key);
    //     match test_storage {
    //         Err(e) => {
    //             log_debug!("storage error {}", e);
    //         }
    //         Ok(_) => {
    //             log_debug!("storage ok");
    //         }
    //     }
    // }

    pub fn new() -> Self {
        let (shutdown_sender, shutdown_receiver) = mpsc::unbounded::<ProtocolError>();
        let mut random_buf = [0u8; 4];
        getrandom::getrandom(&mut random_buf).unwrap();
        let (disconnections_sender, disconnections_receiver) = mpsc::unbounded::<String>();
        Broker {
            anonymous_connections: HashMap::new(),
            #[cfg(not(target_arch = "wasm32"))]
            listeners: HashMap::new(),
            bind_addresses: HashMap::new(),
            config: None,
            shutdown: Some(shutdown_receiver),
            shutdown_sender,
            direct_connections: HashMap::new(),
            peers: HashMap::new(),
            tauri_streams: HashMap::new(),
            closing: false,
            test: u32::from_be_bytes(random_buf),
            server_storage: None,
            disconnections_sender,
            disconnections_receiver: Some(disconnections_receiver),
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
                log_debug!("timeout for shutdown");
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
        let peer_ids;
        let anonymous;
        {
            let mut broker = BROKER.write().await;
            if broker.closing {
                return;
            }
            broker.closing = true;
            peer_ids = Vec::from_iter(broker.peers.keys().cloned());
            anonymous = Vec::from_iter(broker.anonymous_connections.keys().cloned());
        }
        for peer_id in peer_ids {
            BROKER
                .write()
                .await
                .close_peer_connection_x(peer_id.1, peer_id.0)
                .await;
        }
        for anon in anonymous {
            BROKER.write().await.close_anonymous(anon.1, anon.0).await;
        }
        let _ = BROKER
            .write()
            .await
            .shutdown_sender
            .send(ProtocolError::Closing)
            .await;
    }

    pub async fn close_all_connections() {
        let peer_ids;
        let anonymous;
        {
            let broker = BROKER.write().await;
            if broker.closing {
                return;
            }
            peer_ids = Vec::from_iter(broker.peers.keys().cloned());
            anonymous = Vec::from_iter(broker.anonymous_connections.keys().cloned());
        }
        for peer_id in peer_ids {
            BROKER
                .write()
                .await
                .close_peer_connection_x(peer_id.1, peer_id.0)
                .await;
        }
        for anon in anonymous {
            BROKER.write().await.close_anonymous(anon.1, anon.0).await;
        }
    }

    pub async fn shutdown(&mut self) {
        if self.closing {
            return;
        }
        self.closing = true;

        let _ = self.shutdown_sender.send(ProtocolError::Closing).await;
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub async fn accept(
        &mut self,
        mut connection: ConnectionBase,
        remote_bind_address: BindAddress,
        local_bind_address: BindAddress,
    ) -> Result<(), NetError> {
        if self.closing {
            return Err(NetError::Closing);
        }

        let join: mpsc::UnboundedReceiver<Either<NetError, X25519PrivKey>> =
            connection.take_shutdown();
        if self
            .anonymous_connections
            .insert((local_bind_address, remote_bind_address), connection)
            .is_some()
        {
            log_err!(
                "internal error. duplicate connection {:?} {:?}",
                local_bind_address,
                remote_bind_address
            );
        }

        async fn watch_close(
            mut join: Receiver<Either<NetError, X25519PrivKey>>,
            remote_bind_address: BindAddress,
            local_bind_address: BindAddress,
        ) -> ResultSend<()> {
            async move {
                let res = join.next().await;
                match res {
                    Some(Either::Right(remote_peer_id)) => {
                        let res = join.next().await;
                        log_debug!("SOCKET IS CLOSED {:?} peer_id: {:?}", res, remote_peer_id);
                        BROKER.write().await.remove_peer_id(remote_peer_id, None);
                    }
                    _ => {
                        log_debug!(
                            "SOCKET IS CLOSED {:?} remote: {:?} local: {:?}",
                            res,
                            remote_bind_address,
                            local_bind_address
                        );
                        BROKER
                            .write()
                            .await
                            .remove_anonymous(remote_bind_address, local_bind_address);
                    }
                }
            }
            .await;
            Ok(())
        }
        spawn_and_log_error(watch_close(join, remote_bind_address, local_bind_address));

        Ok(())
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub async fn attach_and_authorize_peer_id(
        &mut self,
        remote_bind_address: BindAddress,
        local_bind_address: BindAddress,
        remote_peer_id: X25519PrivKey,
        // if client is None it means we are Core mode
        client: Option<ClientAuthContentV0>,
    ) -> Result<(), ProtocolError> {
        log_debug!("ATTACH PEER_ID {:?}", remote_peer_id);

        let already = self.peers.get(&(None, remote_peer_id));
        if already.is_some() {
            match already.unwrap().connected {
                PeerConnection::NONE => {}
                _ => {
                    return Err(ProtocolError::PeerAlreadyConnected);
                }
            };
        }

        // find the listener
        let listener_id = self
            .bind_addresses
            .get(&local_bind_address)
            .ok_or(ProtocolError::AccessDenied)?;
        let listener = self
            .listeners
            .get(listener_id)
            .ok_or(ProtocolError::AccessDenied)?;

        // authorize
        let is_core = if client.is_none() {
            // it is a Core connection
            if !listener.config.is_core() {
                return Err(ProtocolError::AccessDenied);
            }
            true
        } else {
            if !listener.config.accepts_client() {
                return Err(ProtocolError::AccessDenied);
            }
            let client = client.unwrap();
            self.authorize(
                &(local_bind_address, remote_bind_address),
                Authorization::Client((client.user, client.registration)),
            )?;

            // TODO add client to storage
            false
        };

        let mut connection = self
            .anonymous_connections
            .remove(&(local_bind_address, remote_bind_address))
            .ok_or(ProtocolError::BrokerError)?;

        connection.reset_shutdown(remote_peer_id).await;
        let ip = remote_bind_address.ip;
        let connected = if !is_core {
            PeerConnection::Client(connection)
        } else {
            let dc = DirectConnection {
                ip,
                remote_peer_id,
                tp: connection.transport_protocol(),
                cnx: connection,
            };
            self.direct_connections.insert(ip, dc);
            PeerConnection::Core(ip)
        };
        let bpi = BrokerPeerInfo {
            lastPeerAdvert: None,
            connected,
        };
        self.peers.insert((None, remote_peer_id), bpi);

        Ok(())
    }

    pub async fn probe(
        &mut self,
        cnx: Box<dyn IConnect>,
        ip: IP,
        port: u16,
    ) -> Result<Option<PubKey>, ProtocolError> {
        if self.closing {
            return Err(ProtocolError::Closing);
        }
        cnx.probe(ip, port).await
    }

    pub async fn admin<
        A: Into<ProtocolMessage>
            + Into<AdminRequestContentV0>
            + std::fmt::Debug
            + Sync
            + Send
            + 'static,
    >(
        &mut self,
        cnx: Box<dyn IConnect>,
        peer_privk: PrivKey,
        peer_pubk: PubKey,
        remote_peer_id: DirectPeerId,
        user: PubKey,
        user_priv: PrivKey,
        addr: BindAddress,
        request: A,
    ) -> Result<AdminResponseContentV0, ProtocolError> {
        let config = StartConfig::Admin(AdminConfig {
            user,
            user_priv,
            addr,
            request: request.into(),
        });
        let remote_peer_id_dh = remote_peer_id.to_dh_from_ed();

        let mut connection = cnx
            .open(
                config.get_url(),
                peer_privk.clone(),
                peer_pubk,
                remote_peer_id_dh,
                config.clone(),
            )
            .await?;

        connection.admin::<A>().await
    }

    pub async fn connect(
        &mut self,
        cnx: Arc<Box<dyn IConnect>>,
        peer_privk: PrivKey,
        peer_pubk: PubKey,
        remote_peer_id: DirectPeerId,
        config: StartConfig,
    ) -> Result<(), ProtocolError> {
        if self.closing {
            return Err(ProtocolError::Closing);
        }

        log_debug!("CONNECTING");
        let remote_peer_id_dh = remote_peer_id.to_dh_from_ed();

        // checking if already connected
        if config.is_keep_alive() {
            let already = self
                .peers
                .get(&(config.get_user(), *remote_peer_id_dh.slice()));
            if already.is_some() {
                match already.unwrap().connected {
                    PeerConnection::NONE => {}
                    _ => {
                        return Err(ProtocolError::PeerAlreadyConnected);
                    }
                };
            }
            //TODO, if Core, check that IP is not in self.direct_connections
        }

        let mut connection = cnx
            .open(
                config.get_url(),
                peer_privk.clone(),
                peer_pubk,
                remote_peer_id_dh,
                config.clone(),
            )
            .await?;

        if !config.is_keep_alive() {
            return Ok(());
        }

        let join = connection.take_shutdown();

        let connected = match &config {
            StartConfig::Core(config) => {
                let ip = config.addr.ip.clone();
                let dc = DirectConnection {
                    ip,
                    remote_peer_id: *remote_peer_id_dh.slice(),
                    tp: connection.transport_protocol(),
                    cnx: connection,
                };
                self.direct_connections.insert(ip, dc);
                PeerConnection::Core(ip)
            }
            StartConfig::Client(_config) => PeerConnection::Client(connection),
            _ => unimplemented!(),
        };

        let bpi = BrokerPeerInfo {
            lastPeerAdvert: None,
            connected,
        };

        self.peers
            .insert((config.get_user(), *remote_peer_id_dh.slice()), bpi);

        async fn watch_close(
            mut join: Receiver<Either<NetError, X25519PrivKey>>,
            cnx: Arc<Box<dyn IConnect>>,
            peer_privk: PrivKey,
            peer_pubkey: PubKey,
            remote_peer_id: [u8; 32],
            config: StartConfig,
            mut disconnections_sender: Sender<String>,
        ) -> ResultSend<()> {
            async move {
                let res = join.next().await;
                log_info!("SOCKET IS CLOSED {:?} {:?}", res, remote_peer_id);
                if res.is_some()
                    && res.as_ref().unwrap().is_left()
                    && res.unwrap().unwrap_left() != NetError::Closing
                {
                    // we intend to reconnect
                    let mut broker = BROKER.write().await;
                    broker.reconnecting(remote_peer_id, config.get_user());
                    // TODO: deal with cycle error https://users.rust-lang.org/t/recursive-async-method-causes-cycle-error/84628/5
                    // use a channel and send the reconnect job to it.
                    // create a spawned loop to read the channel and process the reconnection requests.
                    // let result = broker
                    //     .connect(cnx, ip, core, peer_pubk, peer_privk, remote_peer_id)
                    //     .await;
                    // log_debug!("SOCKET RECONNECTION {:?} {:?}", result, &remote_peer_id);
                    // TODO: deal with error and incremental backoff

                    // TODO: incremental reconnections: after 5sec, +10sec, +20sec, +30sec

                    // if all attempts fail :
                    if let Some(user) = config.get_user() {
                        disconnections_sender.send(user.to_string()).await;
                    }
                } else {
                    log_info!("REMOVED");
                    BROKER
                        .write()
                        .await
                        .remove_peer_id(remote_peer_id, config.get_user());
                }
            }
            .await;
            Ok(())
        }
        spawn_and_log_error(watch_close(
            join,
            cnx,
            peer_privk,
            peer_pubk,
            *remote_peer_id_dh.slice(),
            config,
            self.disconnections_sender.clone(),
        ));
        Ok(())
    }

    pub fn take_disconnections_receiver(&mut self) -> Option<Receiver<String>> {
        self.disconnections_receiver.take()
    }

    pub async fn close_peer_connection_x(&mut self, peer_id: X25519PubKey, user: Option<PubKey>) {
        if let Some(peer) = self.peers.get_mut(&(user, peer_id)) {
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

    pub async fn close_peer_connection(&mut self, peer_id: &DirectPeerId, user: Option<PubKey>) {
        self.close_peer_connection_x(peer_id.to_dh_slice(), user)
            .await
    }

    pub async fn close_anonymous(
        &mut self,
        remote_bind_address: BindAddress,
        local_bind_address: BindAddress,
    ) {
        if let Some(cb) = self
            .anonymous_connections
            .get_mut(&(local_bind_address, remote_bind_address))
        {
            cb.close().await;
        }
    }

    pub fn print_status(&self) {
        self.peers.iter().for_each(|(peer_id, peer_info)| {
            log_info!("PEER in BROKER {:?} {:?}", peer_id, peer_info);
        });
        self.direct_connections.iter().for_each(|(ip, direct_cnx)| {
            log_info!("direct_connection in BROKER {:?} {:?}", ip, direct_cnx);
        });
        self.anonymous_connections.iter().for_each(|(binds, cb)| {
            log_info!(
                "ANONYMOUS remote {:?} local {:?} {:?}",
                binds.1,
                binds.0,
                cb
            );
        });
    }
}
