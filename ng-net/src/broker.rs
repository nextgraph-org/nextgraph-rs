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

//! Broker singleton present in every instance of NextGraph (Client, Server, Core node)

use std::collections::HashMap;
#[cfg(not(target_arch = "wasm32"))]
use std::collections::HashSet;

use async_std::stream::StreamExt;
#[cfg(not(target_arch = "wasm32"))]
use async_std::sync::Mutex;
use async_std::sync::{Arc, RwLock};
use either::Either;
use futures::channel::mpsc;
use futures::SinkExt;
use once_cell::sync::Lazy;

use ng_repo::errors::*;
use ng_repo::log::*;
use ng_repo::types::*;

use crate::actor::EActor;
use crate::actor::SoS;
use crate::connection::*;
use crate::server_broker::IServerBroker;
use crate::types::*;
use crate::utils::spawn_and_log_error;
use crate::utils::{Receiver, ResultSend, Sender};

#[doc(hidden)]
#[derive(Debug, Clone)]
pub enum ClientPeerId {
    Local((UserId, DirectPeerId)),
    Remote(DirectPeerId),
}

impl ClientPeerId {
    pub fn key(&self) -> &DirectPeerId {
        match self {
            Self::Remote(dpi) => dpi,
            Self::Local((_user, dpi)) => dpi,
        }
    }
    pub fn value(&self) -> Option<UserId> {
        match self {
            Self::Remote(_) => None,
            Self::Local((user, _)) => Some(*user),
        }
    }
    pub fn new_from(peer: &DirectPeerId, local_user: &Option<UserId>) -> Self {
        match local_user {
            Some(user) => ClientPeerId::Local((*user, *peer)),
            None => ClientPeerId::Remote(*peer),
        }
    }
}

#[derive(Debug)]
enum PeerConnection {
    Core(BindAddress),
    Client(ConnectionBase),
    Local(LocalTransport),
    NONE,
}

#[derive(Debug)]
struct LocalTransport {
    #[allow(dead_code)]
    client_peer_id: DirectPeerId,
    client_cnx: ConnectionBase,
    server_cnx: ConnectionBase,
}

impl LocalTransport {
    async fn close(&mut self) {
        self.client_cnx.close().await;
        self.server_cnx.close().await;
    }
}

#[derive(Debug)]
struct BrokerPeerInfo {
    #[allow(dead_code)]
    last_peer_advert: Option<PeerAdvert>, //FIXME: remove Option
    connected: PeerConnection,
}

#[derive(Debug)]
#[allow(dead_code)]
struct DirectConnection {
    addr: BindAddress,
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

#[doc(hidden)]
#[async_trait::async_trait]
pub trait ILocalBroker: Send + Sync + EActor {
    async fn deliver(&mut self, event: Event, overlay: OverlayId, user: UserId);

    async fn user_disconnected(&mut self, user_id: UserId);
}

pub static BROKER: Lazy<Arc<RwLock<Broker>>> = Lazy::new(|| Arc::new(RwLock::new(Broker::new())));

pub struct Broker {
    direct_connections: HashMap<BindAddress, DirectConnection>,
    /// tuple of optional userId and peer key in montgomery form. userId is always None on the server side (except for local transport).
    peers: HashMap<(Option<PubKey>, Option<X25519PubKey>), BrokerPeerInfo>,
    /// (local,remote) -> ConnectionBase
    anonymous_connections: HashMap<(BindAddress, BindAddress), ConnectionBase>,

    config: Option<ServerConfig>,
    shutdown: Option<Receiver<ProtocolError>>,
    shutdown_sender: Sender<ProtocolError>,
    closing: bool,
    server_broker: Option<Arc<RwLock<dyn IServerBroker + Send + Sync>>>,

    //local_broker: Option<Box<dyn ILocalBroker + Send + Sync + 'a>>,
    local_broker: Option<Arc<RwLock<dyn ILocalBroker>>>,

    #[cfg(not(target_arch = "wasm32"))]
    listeners: HashMap<String, ListenerInfo>,
    #[cfg(not(target_arch = "wasm32"))]
    bind_addresses: HashMap<BindAddress, String>,
    #[cfg(not(target_arch = "wasm32"))]
    users_peers: HashMap<UserId, HashSet<Option<X25519PubKey>>>,
}

impl Broker {
    // pub fn init_local_broker(
    //     &mut self,
    //     base_path: Option<PathBuf>,
    //     in_memory: bool,
    // ) -> Result<(), NgError> {
    //     if in_memory && base_path.is_some() {
    //         return Err(NgError::InvalidArgument);
    //     }
    //     self.base_path = base_path;
    //     self.in_memory = in_memory;
    //     Ok(())
    // }

    // pub fn register_last_seq_function(&mut self, function: Box<LastSeqFn>) {
    //     if self.last_seq_function.is_none() {
    //         self.last_seq_function = Some(function);
    //     }
    // }

    pub fn get_server_peer_id(&self) -> DirectPeerId {
        self.config.as_ref().unwrap().peer_id
    }

    pub(crate) fn get_config(&self) -> Option<&ServerConfig> {
        self.config.as_ref()
    }

    pub(crate) fn get_registration_url(&self) -> Option<&String> {
        self.config
            .as_ref()
            .and_then(|c| c.registration_url.as_ref())
    }

    pub(crate) fn get_bootstrap(&self) -> Result<&BootstrapContent, ProtocolError> {
        self.config
            .as_ref()
            .map(|c| &c.bootstrap)
            .ok_or(ProtocolError::BrokerError)
    }

    #[doc(hidden)]
    pub fn set_server_broker(&mut self, broker: impl IServerBroker + 'static) {
        //log_debug!("set_server_broker");
        self.server_broker = Some(Arc::new(RwLock::new(broker)));
    }

    #[doc(hidden)]
    pub fn set_local_broker(&mut self, broker: Arc<RwLock<dyn ILocalBroker>>) {
        //log_debug!("set_local_broker");
        self.local_broker = Some(broker);
    }

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

    #[doc(hidden)]
    pub fn get_server_broker(
        &self,
    ) -> Result<Arc<RwLock<dyn IServerBroker + Send + Sync>>, ProtocolError> {
        //log_debug!("GET STORAGE {:?}", self.server_storage);
        Ok(Arc::clone(
            self.server_broker
                .as_ref()
                .ok_or(ProtocolError::BrokerError)?,
        ))
    }

    // pub(crate) fn get_server_broker_mut(
    //     &mut self,
    // ) -> Result<&mut Box<dyn IServerBroker + Send + Sync>, ProtocolError> {
    //     //log_debug!("GET STORAGE {:?}", self.server_storage);
    //     self.server_broker
    //         .as_mut()
    //         .ok_or(ProtocolError::BrokerError)
    // }

    //Option<Arc<RwLock<dyn ILocalBroker>>>,
    pub(crate) fn get_local_broker(&self) -> Result<Arc<RwLock<dyn ILocalBroker>>, ProtocolError> {
        Ok(Arc::clone(
            self.local_broker
                .as_ref()
                .ok_or(ProtocolError::NoLocalBrokerFound)?,
        ))
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub(crate) async fn authorize(
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
                    let lock = self.get_server_broker()?;
                    let storage = lock.read().await;
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
                                storage.add_user(user_and_registration.0, is_admin)?;
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
                    let found = self.get_server_broker()?.read().await.get_user(admin_user);
                    if found.is_ok() && found.unwrap() {
                        return Ok(());
                    }
                }
                Err(ProtocolError::AccessDenied)
            }
            Authorization::OverlayJoin(_) => Err(ProtocolError::AccessDenied),
        }
    }

    fn reconnecting(&mut self, peer_id: X25519PrivKey, user: Option<PubKey>) {
        let peerinfo = self.peers.get_mut(&(user, Some(peer_id)));
        match peerinfo {
            Some(info) => match &info.connected {
                PeerConnection::NONE => {}
                PeerConnection::Client(_cb) => {
                    info.connected = PeerConnection::NONE;
                }
                PeerConnection::Core(ip) => {
                    self.direct_connections.remove(&ip);
                    info.connected = PeerConnection::NONE;
                }
                PeerConnection::Local(_) => {
                    panic!("local transport connections cannot disconnect. shouldn't reconnect")
                }
            },
            None => {}
        }
    }

    async fn remove_peer_id(&mut self, peer_id: X25519PrivKey, user: Option<PubKey>) {
        self.remove_peer_id_(Some(peer_id), user).await
    }

    #[allow(dead_code)]
    async fn remove_local_transport(&mut self, user: PubKey) {
        self.remove_peer_id_(None, Some(user)).await
    }

    async fn remove_peer_id_(&mut self, peer_id: Option<X25519PrivKey>, user: Option<PubKey>) {
        let removed = self.peers.remove(&(user, peer_id));
        match removed {
            Some(info) => match info.connected {
                PeerConnection::NONE => {}
                PeerConnection::Client(mut _cb) => {
                    #[cfg(not(target_arch = "wasm32"))]
                    if user.is_none() {
                        _cb.release_shutdown();
                        // server side
                        if let Some(fsm) = _cb.fsm {
                            if let Ok(user) = fsm.lock().await.user_id() {
                                let _ = self
                                    .remove_user_peer(&user, &Some(peer_id.to_owned().unwrap()));
                            }
                        }
                        let peer = PubKey::X25519PubKey(peer_id.unwrap());
                        log_debug!("unsubscribing peer {}", peer);
                        self.get_server_broker()
                            .unwrap()
                            .read()
                            .await
                            .remove_all_subscriptions_of_client(&ClientPeerId::new_from(
                                &peer, &user,
                            ))
                            .await;
                    }
                }
                PeerConnection::Core(ip) => {
                    self.direct_connections.remove(&ip);
                }
                PeerConnection::Local(_lt) => {
                    #[cfg(not(target_arch = "wasm32"))]
                    if peer_id.is_none() && user.is_some() {
                        // server side
                        let _ = self.remove_user_peer(user.as_ref().unwrap(), &None);

                        log_debug!("unsubscribing local peer {}", _lt.client_peer_id);
                        self.get_server_broker()
                            .unwrap()
                            .read()
                            .await
                            .remove_all_subscriptions_of_client(&ClientPeerId::new_from(
                                &_lt.client_peer_id,
                                &user,
                            ))
                            .await;
                    }
                }
            },
            None => {}
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    fn remove_anonymous(
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

    // #[cfg(not(target_arch = "wasm32"))]
    // pub fn test_storage(&self, path: PathBuf) {
    //     use ng_storage_rocksdb::kcv_store::RocksDbKCVStorage;

    //     let key: [u8; 32] = [0; 32];
    //     let test_storage = RocksDbKCVStorage::open(&path, key);
    //     match test_storage {
    //         Err(e) => {
    //             log_debug!("storage error {}", e);
    //         }
    //         Ok(_) => {
    //             log_debug!("storage ok");
    //         }
    //     }
    // }

    fn new() -> Self {
        let (shutdown_sender, shutdown_receiver) = mpsc::unbounded::<ProtocolError>();
        let mut random_buf = [0u8; 4];
        getrandom::getrandom(&mut random_buf).unwrap();

        Broker {
            anonymous_connections: HashMap::new(),
            config: None,
            shutdown: Some(shutdown_receiver),
            shutdown_sender,
            direct_connections: HashMap::new(),
            peers: HashMap::new(),
            closing: false,
            server_broker: None,
            local_broker: None,

            #[cfg(not(target_arch = "wasm32"))]
            listeners: HashMap::new(),
            #[cfg(not(target_arch = "wasm32"))]
            bind_addresses: HashMap::new(),
            #[cfg(not(target_arch = "wasm32"))]
            users_peers: HashMap::new(),
        }
    }

    fn take_shutdown(&mut self) -> Result<Receiver<ProtocolError>, ProtocolError> {
        self.shutdown.take().ok_or(ProtocolError::BrokerError)
    }

    pub async fn join_shutdown() -> Result<(), ProtocolError> {
        let mut shutdown_join: Receiver<ProtocolError>;
        {
            shutdown_join = BROKER.write().await.take_shutdown()?;
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
            if peer_id.1.is_some() {
                BROKER
                    .write()
                    .await
                    .close_peer_connection_x(peer_id.1, peer_id.0)
                    .await;
            }
        }
        for anon in anonymous {
            BROKER.write().await.close_anonymous(anon.1, anon.0).await;
        }
    }

    #[allow(dead_code)]
    #[cfg(not(target_arch = "wasm32"))]
    async fn shutdown(&mut self) {
        if self.closing {
            return;
        }
        self.closing = true;

        let _ = self.shutdown_sender.send(ProtocolError::Closing).await;
    }

    #[doc(hidden)]
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

                        // if res.is_some()
                        //     && res.as_ref().unwrap().as_ref().unwrap_left() == &NetError::Closing
                        // {
                        //     return;
                        // }
                        log_debug!("SOCKET IS CLOSED {:?} peer_id: {:?}", res, remote_peer_id);
                        BROKER
                            .write()
                            .await
                            .remove_peer_id(remote_peer_id, None)
                            .await;
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
    fn add_user_peer(
        &mut self,
        user: UserId,
        peer: Option<X25519PrivKey>,
    ) -> Result<(), ProtocolError> {
        let peers_set = self
            .users_peers
            .entry(user)
            .or_insert(HashSet::with_capacity(1));

        if !peers_set.insert(peer) {
            //return Err(ProtocolError::PeerAlreadyConnected);
        }
        Ok(())
    }

    #[cfg(not(target_arch = "wasm32"))]
    fn remove_user_peer(
        &mut self,
        user: &UserId,
        peer: &Option<X25519PrivKey>,
    ) -> Result<(), ProtocolError> {
        let peers_set = self
            .users_peers
            .get_mut(user)
            .ok_or(ProtocolError::UserNotConnected)?;

        if !peers_set.remove(peer) {
            return Err(ProtocolError::PeerNotConnected);
        }
        if peers_set.is_empty() {
            let _ = self.users_peers.remove(user);
        }
        Ok(())
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub(crate) async fn attach_and_authorize_app(
        &mut self,
        remote_bind_address: BindAddress,
        local_bind_address: BindAddress,
        remote_peer_id: X25519PrivKey,
        user: &Option<UserId>,
        _info: &ClientInfo,
    ) -> Result<(), ProtocolError> {
        let already = self.peers.get(&(None, Some(remote_peer_id)));
        if already.is_some() {
            match already.unwrap().connected {
                PeerConnection::NONE => {}
                _ => {
                    return Err(ProtocolError::PeerAlreadyConnected);
                }
            };
        }

        //TODO: check permissions for user/remote_bind_address or headless if no user

        //TODO: keep the info

        let mut connection = self
            .anonymous_connections
            .remove(&(local_bind_address, remote_bind_address))
            .ok_or(ProtocolError::BrokerError)?;

        connection.reset_shutdown(remote_peer_id).await;

        if user.is_some() {
            self.add_user_peer(user.unwrap(), Some(remote_peer_id))?;
        }

        let connected = PeerConnection::Client(connection);

        let bpi = BrokerPeerInfo {
            last_peer_advert: None,
            connected,
        };
        self.peers.insert((None, Some(remote_peer_id)), bpi);

        Ok(())
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub(crate) async fn attach_and_authorize_peer_id(
        &mut self,
        remote_bind_address: BindAddress,
        local_bind_address: BindAddress,
        remote_peer_id: X25519PrivKey,
        // if client is None it means we are Core mode
        client: Option<ClientAuthContentV0>,
        fsm: &mut NoiseFSM,
    ) -> Result<(), ProtocolError> {
        log_debug!("ATTACH PEER_ID {:?}", remote_peer_id);

        let already = self.peers.remove(&(None, Some(remote_peer_id)));
        if already.is_some() {
            match already.unwrap().connected {
                PeerConnection::NONE => {}
                PeerConnection::Client(mut cnx) => {
                    cnx.close_silently().await;
                }
                _ => {}
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
            let client = client.as_ref().unwrap();
            self.authorize(
                &(local_bind_address, remote_bind_address),
                Authorization::Client((client.user.clone(), client.registration.clone())),
            )
            .await?;

            // TODO add client to storage
            false
        };

        let mut connection = self
            .anonymous_connections
            .remove(&(local_bind_address, remote_bind_address))
            .ok_or(ProtocolError::BrokerError)?;

        connection.reset_shutdown(remote_peer_id).await;
        let connected = if !is_core {
            let user = client.unwrap().user;
            fsm.set_user_id(user);
            self.add_user_peer(user, Some(remote_peer_id))?;

            PeerConnection::Client(connection)
        } else {
            let dc = DirectConnection {
                addr: remote_bind_address,
                remote_peer_id,
                tp: connection.transport_protocol(),
                cnx: connection,
            };
            self.direct_connections.insert(remote_bind_address, dc);
            PeerConnection::Core(remote_bind_address)
        };
        let bpi = BrokerPeerInfo {
            last_peer_advert: None,
            connected,
        };
        self.peers.insert((None, Some(remote_peer_id)), bpi);

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

    pub async fn ext<
        A: Into<ProtocolMessage> + Into<ExtRequestContentV0> + std::fmt::Debug + Sync + Send + 'static,
        B: TryFrom<ProtocolMessage, Error = ProtocolError> + std::fmt::Debug + Sync + Send + 'static,
    >(
        cnx: Box<dyn IConnect>,
        peer_privk: PrivKey,
        peer_pubk: PubKey,
        remote_peer_id: DirectPeerId,
        url: String,
        request: A,
    ) -> Result<B, NgError> {
        let config = StartConfig::Ext(ExtConfig {
            url,
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
        connection.ext::<A, B>().await
    }

    #[doc(hidden)]
    pub fn connect_local(&mut self, peer_pubk: PubKey, user: UserId) -> Result<(), ProtocolError> {
        if self.closing {
            return Err(ProtocolError::Closing);
        }

        let (client_cnx, server_cnx) = ConnectionBase::create_local_transport_pipe(user, peer_pubk);

        let bpi = BrokerPeerInfo {
            last_peer_advert: None,
            connected: PeerConnection::Local(LocalTransport {
                client_peer_id: peer_pubk,
                client_cnx,
                server_cnx,
            }),
        };

        self.peers.insert((Some(user), None), bpi);
        Ok(())
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
                .get(&(config.get_user(), Some(*remote_peer_id_dh.slice())));
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
                let dc = DirectConnection {
                    addr: config.addr,
                    remote_peer_id: *remote_peer_id_dh.slice(),
                    tp: connection.transport_protocol(),
                    cnx: connection,
                };
                self.direct_connections.insert(config.addr, dc);
                PeerConnection::Core(config.addr)
            }
            StartConfig::Client(_) | StartConfig::App(_) => PeerConnection::Client(connection),
            _ => unimplemented!(),
        };

        let bpi = BrokerPeerInfo {
            last_peer_advert: None,
            connected,
        };

        self.peers
            .insert((config.get_user(), Some(*remote_peer_id_dh.slice())), bpi);

        async fn watch_close(
            mut join: Receiver<Either<NetError, X25519PrivKey>>,
            _cnx: Arc<Box<dyn IConnect>>,
            _peer_privk: PrivKey,
            _peer_pubkey: PubKey,
            remote_peer_id: [u8; 32],
            config: StartConfig,
            local_broker: Arc<async_std::sync::RwLock<dyn ILocalBroker>>,
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
                    // there is async_recursion now. use that
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
                        local_broker.write().await.user_disconnected(user).await;
                    }
                } else {
                    log_debug!("REMOVED");
                    BROKER
                        .write()
                        .await
                        .remove_peer_id(remote_peer_id, config.get_user())
                        .await;
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
            self.get_local_broker()?,
        ));
        Ok(())
    }

    pub async fn request<
        A: Into<ProtocolMessage> + std::fmt::Debug + Sync + Send + 'static,
        B: TryFrom<ProtocolMessage, Error = ProtocolError> + std::fmt::Debug + Sync + Send + 'static,
    >(
        &self,
        user: &Option<UserId>,
        remote_peer_id: &Option<DirectPeerId>, // None means local
        msg: A,
    ) -> Result<SoS<B>, NgError> {
        let bpi = self
            .peers
            .get(&(*user, remote_peer_id.map(|rpi| rpi.to_dh_slice())))
            .ok_or(NgError::ConnectionNotFound)?;
        match &bpi.connected {
            PeerConnection::Client(cnx) => cnx.request(msg).await,
            PeerConnection::Local(lt) => lt.client_cnx.request(msg).await,
            _ => Err(NgError::BrokerError),
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    fn get_fsm_for_client(&self, client: &ClientPeerId) -> Option<Arc<Mutex<NoiseFSM>>> {
        match client {
            ClientPeerId::Local((user, _)) => {
                if let Some(BrokerPeerInfo {
                    connected:
                        PeerConnection::Local(LocalTransport {
                            server_cnx: ConnectionBase { fsm: Some(fsm), .. },
                            ..
                        }),
                    ..
                }) = self.peers.get(&(Some(*user), None))
                {
                    Some(Arc::clone(fsm))
                } else {
                    None
                }
            }
            ClientPeerId::Remote(peer) => {
                if let Some(BrokerPeerInfo {
                    connected: PeerConnection::Client(ConnectionBase { fsm: Some(fsm), .. }),
                    ..
                }) = self.peers.get(&(None, Some(peer.to_dh())))
                {
                    Some(Arc::clone(fsm))
                } else {
                    None
                }
            }
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub(crate) async fn dispatch_event(
        &self,
        overlay: &OverlayId,
        event: Event,
        user_id: &UserId,
        remote_peer: &PubKey,
    ) -> Result<Vec<ClientPeerId>, ServerError> {
        // TODO: deal with subscriptions on the outer overlay. for now we assume everything is on the inner overlay

        let mut clients_to_remove = vec![];

        let peers_for_local_dispatch = {
            self.get_server_broker()?
                .read()
                .await
                .dispatch_event(overlay, event.clone(), user_id, remote_peer)
                .await?
        };

        for client in peers_for_local_dispatch {
            log_debug!("dispatch_event peer {:?}", client);
            if let Some(fsm) = self.get_fsm_for_client(&client) {
                log_debug!("ForwardedEvent peer {:?}", client);
                let _ = fsm
                    .lock()
                    .await
                    .send(ProtocolMessage::ClientMessage(ClientMessage::V0(
                        ClientMessageV0 {
                            overlay: *overlay,
                            padding: vec![],
                            content: ClientMessageContentV0::ForwardedEvent(event.clone()),
                        },
                    )))
                    .await;
            } else {
                // we remove the peer from all local_subscriptions
                clients_to_remove.push(client);
            }
        }

        Ok(clients_to_remove)
    }

    #[doc(hidden)]
    pub async fn close_peer_connection_x(
        &mut self,
        peer_id: Option<X25519PubKey>,
        user: Option<PubKey>,
    ) {
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
                PeerConnection::Local(lt) => {
                    assert!(peer_id.is_none());
                    assert!(user.is_some());
                    lt.close().await;
                    if self.peers.remove(&(user, None)).is_some() {
                        log_debug!(
                            "Local transport connection closed ! {}",
                            user.unwrap().to_string()
                        );
                    }
                }
            }
            //self.peers.remove(peer_id); // this is done in the watch_close instead
        }
    }

    pub async fn close_peer_connection(&mut self, peer_id: &DirectPeerId, user: Option<PubKey>) {
        self.close_peer_connection_x(Some(peer_id.to_dh_slice()), user)
            .await
    }

    async fn close_anonymous(
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

    #[doc(hidden)]
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
