// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use async_once_cell::OnceCell;
use async_std::sync::{Arc, Mutex, RwLock};
use core::fmt;
use ng_net::actor::EActor;
use ng_net::connection::{ClientConfig, IConnect, NoiseFSM, StartConfig};
use ng_net::errors::ProtocolError;
use ng_net::types::{ClientInfo, ClientType, ProtocolMessage};
use ng_net::utils::{Receiver, Sender};
use ng_repo::block_storage::HashMapBlockStorage;
use ng_repo::os_info::get_os_info;
use ng_verifier::types::*;
use ng_verifier::verifier::Verifier;
use ng_wallet::emojis::encode_pazzle;
use once_cell::sync::Lazy;
use serde_bare::to_vec;
use serde_json::json;
use std::collections::HashMap;
use std::fs::{read, write, File, OpenOptions};
use std::path::PathBuf;
use zeroize::{Zeroize, ZeroizeOnDrop};

use ng_net::broker::*;
use ng_repo::block_storage::BlockStorage;
use ng_repo::errors::NgError;
use ng_repo::log::*;
use ng_repo::types::*;
use ng_repo::utils::derive_key;
use ng_wallet::{create_wallet_v0, types::*};

#[cfg(not(target_arch = "wasm32"))]
use ng_client_ws::remote_ws::ConnectionWebSocket;
#[cfg(target_arch = "wasm32")]
use ng_client_ws::remote_ws_wasm::ConnectionWebSocket;
#[cfg(not(target_arch = "wasm32"))]
use ng_storage_rocksdb::block_storage::RocksDbBlockStorage;

type JsStorageReadFn = dyn Fn(String) -> Result<String, NgError> + 'static + Sync + Send;
type JsStorageWriteFn = dyn Fn(String, String) -> Result<(), NgError> + 'static + Sync + Send;
type JsStorageDelFn = dyn Fn(String) -> Result<(), NgError> + 'static + Sync + Send;
type JsCallback = dyn Fn() + 'static + Sync + Send;

#[doc(hidden)]
pub struct JsStorageConfig {
    pub local_read: Box<JsStorageReadFn>,
    pub local_write: Box<JsStorageWriteFn>,
    pub session_read: Arc<Box<JsStorageReadFn>>,
    pub session_write: Arc<Box<JsStorageWriteFn>>,
    pub session_del: Arc<Box<JsStorageDelFn>>,
    pub is_browser: bool,
}

impl JsStorageConfig {
    fn get_js_storage_config(&self) -> JsSaveSessionConfig {
        let session_read2 = Arc::clone(&self.session_read);
        let session_write2 = Arc::clone(&self.session_write);
        let session_read3 = Arc::clone(&self.session_read);
        let session_write3 = Arc::clone(&self.session_write);
        let session_read4 = Arc::clone(&self.session_read);
        let session_del = Arc::clone(&self.session_del);
        JsSaveSessionConfig {
            last_seq_function: Box::new(move |peer_id: PubKey, qty: u16| -> Result<u64, NgError> {
                let res = (session_read2)(format!("ng_peer_last_seq@{}", peer_id));
                let val = match res {
                    Ok(old_str) => {
                        let decoded = base64_url::decode(&old_str)
                            .map_err(|_| NgError::SerializationError)?;
                        match serde_bare::from_slice(&decoded)? {
                            SessionPeerLastSeq::V0(old_val) => old_val,
                            _ => unimplemented!(),
                        }
                    }
                    Err(_) => 0,
                };
                let new_val = val + qty as u64;
                let spls = SessionPeerLastSeq::V0(new_val);
                let ser = serde_bare::to_vec(&spls)?;
                //saving the new val
                let encoded = base64_url::encode(&ser);
                let r = (session_write2)(format!("ng_peer_last_seq@{}", peer_id), encoded);
                if r.is_ok() {
                    return Err(NgError::SerializationError);
                }
                Ok(val)
            }),
            outbox_write_function: Box::new(
                move |peer_id: PubKey, seq: u64, event: Vec<u8>| -> Result<(), NgError> {
                    let seq_str = format!("{}", seq);
                    let res = (session_read3)(format!("ng_outboxes@{}@start", peer_id));
                    let start = match res {
                        Err(_) => {
                            (session_write3)(format!("ng_outboxes@{}@start", peer_id), seq_str)?;
                            seq
                        }
                        Ok(start_str) => start_str
                            .parse::<u64>()
                            .map_err(|_| NgError::InvalidFileFormat)?,
                    };
                    let idx = seq - start;
                    let idx_str = format!("{:05}", idx);
                    let encoded = base64_url::encode(&event);
                    (session_write3)(format!("ng_outboxes@{}@{idx_str}", peer_id), encoded)
                },
            ),
            outbox_read_function: Box::new(
                move |peer_id: PubKey| -> Result<Vec<Vec<u8>>, NgError> {
                    let res = (session_read4)(format!("ng_outboxes@{}@start", peer_id));
                    let mut start = match res {
                        Err(_) => return Err(NgError::NotFound),
                        Ok(start_str) => start_str
                            .parse::<u64>()
                            .map_err(|_| NgError::InvalidFileFormat)?,
                    };
                    let mut result = vec![];
                    loop {
                        let idx_str = format!("{:05}", start);
                        let str = format!("ng_outboxes@{}@{idx_str}", peer_id);
                        let res = (session_read4)(str.clone());
                        let res = match res {
                            Err(_) => break,
                            Ok(res) => res,
                        };
                        (session_del)(str)?;
                        let decoded =
                            base64_url::decode(&res).map_err(|_| NgError::SerializationError)?;
                        result.push(decoded);
                        start += 1;
                    }
                    Ok(result)
                },
            ),
        }
    }
}

impl fmt::Debug for JsStorageConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "JsStorageConfig. is_browser {}", self.is_browser)
    }
}

/// Configuration for the LocalBroker. must be returned by a function or closure passed to [init_local_broker]
#[derive(Debug)]
pub enum LocalBrokerConfig {
    /// Local broker will not save any wallet, session or user's data
    InMemory,
    /// Local broker will save all wallets, sessions and user's data on disk, in the provided `Path`
    BasePath(PathBuf),
    #[doc(hidden)]
    /// used internally for the JS SDK
    JsStorage(JsStorageConfig),
}

impl LocalBrokerConfig {
    pub fn is_in_memory(&self) -> bool {
        match self {
            Self::InMemory => true,
            _ => false,
        }
    }
    #[doc(hidden)]
    pub fn is_js(&self) -> bool {
        match self {
            Self::JsStorage(_) => true,
            _ => false,
        }
    }
    #[doc(hidden)]
    pub fn js_config(&self) -> Option<&JsStorageConfig> {
        match self {
            Self::JsStorage(c) => Some(c),
            _ => None,
        }
    }
    fn compute_path(&self, dir: &String) -> Result<PathBuf, NgError> {
        match self {
            Self::BasePath(path) => {
                let mut new_path = path.clone();
                new_path.push(dir);
                Ok(new_path)
            }
            _ => Err(NgError::InvalidArgument),
        }
    }
}

#[derive(Debug)]
/// used to initiate a session at a local broker V0
pub struct SessionConfigV0 {
    pub user_id: UserId,
    pub wallet_name: String,
    pub verifier_type: VerifierType,
}
#[derive(Debug)]
/// used to initiate a session at a local broker
pub enum SessionConfig {
    V0(SessionConfigV0),
}

#[derive(Debug)]
struct Session {
    config: SessionConfig,
    peer_key: PrivKey,
    last_wallet_nonce: u64,
    verifier: Verifier,
}

impl SessionConfig {
    pub fn user_id(&self) -> UserId {
        match self {
            Self::V0(v0) => v0.user_id,
        }
    }
    pub fn wallet_name(&self) -> String {
        match self {
            Self::V0(v0) => v0.wallet_name.clone(),
        }
    }
    pub fn verifier_type(&self) -> &VerifierType {
        match self {
            Self::V0(v0) => &v0.verifier_type,
        }
    }
    /// Creates a new in_memory SessionConfig with a UserId and a wallet name
    ///
    /// that should be passed to [session_start]
    pub fn new_in_memory(user_id: &UserId, wallet_name: &String) -> Self {
        SessionConfig::V0(SessionConfigV0 {
            user_id: user_id.clone(),
            wallet_name: wallet_name.clone(),
            verifier_type: VerifierType::Memory,
        })
    }

    /// Creates a new SessionConfig backed by RocksDb, with a UserId and a wallet name
    ///
    /// that should be passed to [session_start]
    pub fn new_rocksdb(user_id: &UserId, wallet_name: &String) -> Self {
        SessionConfig::V0(SessionConfigV0 {
            user_id: user_id.clone(),
            wallet_name: wallet_name.clone(),
            verifier_type: VerifierType::RocksDb,
        })
    }

    /// Creates a new remote SessionConfig, with a UserId, a wallet name and optional remote peer_id
    ///
    /// that should be passed to [session_start]
    pub fn new_remote(
        user_id: &UserId,
        wallet_name: &String,
        remote_verifier_peer_id: Option<PubKey>,
    ) -> Self {
        SessionConfig::V0(SessionConfigV0 {
            user_id: user_id.clone(),
            wallet_name: wallet_name.clone(),
            verifier_type: VerifierType::Remote(remote_verifier_peer_id),
        })
    }

    fn valid_verifier_config_for_local_broker_config(
        &mut self,
        local_broker_config: &LocalBrokerConfig,
    ) -> Result<(), NgError> {
        if match self {
            Self::V0(v0) => match local_broker_config {
                LocalBrokerConfig::InMemory => {
                    v0.verifier_type = VerifierType::Memory;
                    true
                }
                LocalBrokerConfig::JsStorage(js_config) => match v0.verifier_type {
                    VerifierType::Memory | VerifierType::Remote(_) => true,
                    VerifierType::RocksDb => false,
                    VerifierType::WebRocksDb => js_config.is_browser,
                },
                LocalBrokerConfig::BasePath(_) => match v0.verifier_type {
                    VerifierType::RocksDb | VerifierType::Remote(_) => true,
                    //VerifierType::Memory => true,
                    _ => false,
                },
            },
        } {
            Ok(())
        } else {
            Err(NgError::InvalidArgument)
        }
    }
}

// impl fmt::Debug for SessionConfigV0 {
//     fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
//         write!(
//             f,
//             "SessionConfigV0 user={} wallet={}",
//             self.user_id, self.wallet_name
//         )
//     }
// }

// impl fmt::Debug for SessionConfig {
//     fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
//         match self {
//             SessionConfig::V0(v0) => v0.fmt(f),
//         }
//     }
// }

struct OpenedWallet {
    wallet: SensitiveWallet,
    block_storage: Arc<std::sync::RwLock<dyn BlockStorage + Send + Sync>>,
}

impl fmt::Debug for OpenedWallet {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "OpenedWallet.\nwallet {:?}", self.wallet)
    }
}

#[derive(Debug)]
struct LocalBroker {
    pub config: LocalBrokerConfig,

    pub wallets: HashMap<String, LocalWalletStorageV0>,

    pub opened_wallets: HashMap<String, OpenedWallet>,

    pub sessions: HashMap<UserId, SessionPeerStorageV0>,

    pub opened_sessions: HashMap<UserId, u8>,

    pub opened_sessions_list: Vec<Option<Session>>,
}

// used to deliver events to the verifier on Clients, or Core that have Verifiers attached.
#[async_trait::async_trait]
impl ILocalBroker for LocalBroker {
    async fn deliver(&mut self, event: Event) {}
}

// this is used if an Actor does a BROKER.local_broker.respond
// it happens when a remote peer is doing a request on the verifier
#[async_trait::async_trait]
impl EActor for LocalBroker {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        // search opened_sessions by user_id of fsm
        let session = match fsm.lock().await.user_id() {
            Some(user) => self
                .get_mut_session_for_user(&user)
                .ok_or(ProtocolError::ActorError)?,
            None => return Err(ProtocolError::ActorError),
        };
        session.verifier.respond(msg, fsm).await
    }
}

impl LocalBroker {
    fn storage_path_for_user(&self, user_id: &UserId) -> Option<PathBuf> {
        match &self.config {
            LocalBrokerConfig::InMemory | LocalBrokerConfig::JsStorage(_) => None,
            LocalBrokerConfig::BasePath(base) => {
                let mut path = base.clone();
                path.push(user_id.to_hash_string());
                Some(path)
            }
        }
    }

    fn get_mut_session_for_user(&mut self, user: &UserId) -> Option<&mut Session> {
        match self.opened_sessions.get(user) {
            Some(idx) => self.opened_sessions_list[*idx as usize].as_mut(),
            None => None,
        }
    }

    fn verifier_config_type_from_session_config(
        &self,
        config: &SessionConfig,
    ) -> VerifierConfigType {
        match (config.verifier_type(), &self.config) {
            (VerifierType::Memory, LocalBrokerConfig::InMemory) => VerifierConfigType::Memory,
            (VerifierType::RocksDb, LocalBrokerConfig::BasePath(base)) => {
                let mut path = base.clone();
                path.push(config.user_id().to_hash_string());
                VerifierConfigType::RocksDb(path)
            }
            (VerifierType::Remote(to), _) => VerifierConfigType::Remote(*to),
            (VerifierType::WebRocksDb, _) => VerifierConfigType::WebRocksDb,
            (VerifierType::Memory, LocalBrokerConfig::JsStorage(js)) => {
                VerifierConfigType::JsSaveSession(js.get_js_storage_config())
            }
            (_, _) => panic!("invalid combination in verifier_config_type_from_session_config"),
        }
    }

    fn get_wallet_and_session(
        &mut self,
        user_id: &UserId,
    ) -> Result<(&SensitiveWallet, &mut Session), NgError> {
        let session_idx = self
            .opened_sessions
            .get(user_id)
            .ok_or(NgError::SessionNotFound)?;
        let session = self.opened_sessions_list[*session_idx as usize]
            .as_mut()
            .ok_or(NgError::SessionNotFound)?;
        let wallet = &match &session.config {
            SessionConfig::V0(v0) => self
                .opened_wallets
                .get(&v0.wallet_name)
                .ok_or(NgError::WalletNotFound),
        }?
        .wallet;

        Ok((wallet, session))
    }
    async fn disconnect_session(&mut self, user_id: &PubKey) -> Result<(), NgError> {
        match self.opened_sessions.get(user_id) {
            Some(session) => {
                // TODO: change the logic here once it will be possible to have several users connected at the same time
                Broker::close_all_connections().await;
                let session = self.opened_sessions_list[*session as usize]
                    .as_mut()
                    .ok_or(NgError::SessionNotFound)?;
                session.verifier.connected_server_id = None;
            }
            None => {}
        }
        Ok(())
    }
}

static LOCAL_BROKER: OnceCell<Result<Arc<RwLock<LocalBroker>>, NgError>> = OnceCell::new();

pub type ConfigInitFn = dyn Fn() -> LocalBrokerConfig + 'static + Sync + Send;

async fn init_(config: LocalBrokerConfig) -> Result<Arc<RwLock<LocalBroker>>, NgError> {
    let wallets = match &config {
        LocalBrokerConfig::InMemory => HashMap::new(),
        LocalBrokerConfig::BasePath(base_path) => {
            // load the wallets and sessions from disk
            let mut path = base_path.clone();
            path.push("wallets");
            let map_ser = read(path);
            if map_ser.is_ok() {
                let wallets = LocalWalletStorage::v0_from_vec(&map_ser.unwrap())?;
                let LocalWalletStorage::V0(wallets) = wallets;
                wallets
            } else {
                HashMap::new()
            }
        }
        LocalBrokerConfig::JsStorage(js_storage_config) => {
            // load the wallets from JsStorage
            match (js_storage_config.local_read)("ng_wallets".to_string()) {
                Err(_) => HashMap::new(),
                Ok(wallets_string) => {
                    let map_ser = base64_url::decode(&wallets_string)
                        .map_err(|_| NgError::SerializationError)?;
                    let wallets: LocalWalletStorage = serde_bare::from_slice(&map_ser)?;
                    let LocalWalletStorage::V0(v0) = wallets;
                    v0
                }
            }
        }
    };

    let local_broker = LocalBroker {
        config,
        wallets,
        opened_wallets: HashMap::new(),
        sessions: HashMap::new(),
        opened_sessions: HashMap::new(),
        opened_sessions_list: vec![],
    };
    //log_debug!("{:?}", &local_broker);

    let broker = Arc::new(RwLock::new(local_broker));

    BROKER.write().await.set_local_broker(Arc::clone(
        &(Arc::clone(&broker) as Arc<RwLock<dyn ILocalBroker>>),
    ));

    Ok(broker)
}

#[doc(hidden)]
pub async fn init_local_broker_with_lazy(config_fn: &Lazy<Box<ConfigInitFn>>) {
    LOCAL_BROKER
        .get_or_init(async {
            let config = (&*config_fn)();
            init_(config).await
        })
        .await;
}

/// Initialize the configuration of your local broker
///
/// , by passing in a function (or closure) that returns a `LocalBrokerConfig`.
/// You must call `init_local_broker` at least once before you can start to use the broker.
/// After the first call, all subsequent calls will have no effect.
pub async fn init_local_broker(config_fn: Box<ConfigInitFn>) {
    LOCAL_BROKER
        .get_or_init(async {
            let config = (config_fn)();
            init_(config).await
        })
        .await;
}

/// Retrieves a HashMap of wallets known to the LocalBroker. The name of the Wallet is used as key
pub async fn wallets_get_all() -> Result<HashMap<String, LocalWalletStorageV0>, NgError> {
    let broker = match LOCAL_BROKER.get() {
        Some(Err(e)) => {
            log_err!("LocalBrokerNotInitialized: {}", e);
            return Err(NgError::LocalBrokerNotInitialized);
        }
        None => {
            log_err!("Not initialized");
            return Err(NgError::LocalBrokerNotInitialized);
        }
        Some(Ok(broker)) => broker.read().await,
    };
    Ok(broker.wallets.clone())
}

/// Creates a new Wallet for the user. Each user should create only one Wallet.
///
/// See [CreateWalletV0] for a list of parameters.
///
/// Wallets are transferable to to other devices (see [wallet_get_file] and [wallet_import])
pub async fn wallet_create_v0(params: CreateWalletV0) -> Result<CreateWalletResultV0, NgError> {
    {
        // entering sub-block to release the lock asap
        let broker = match LOCAL_BROKER.get() {
            None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
            Some(Ok(broker)) => broker.read().await,
        };
        if params.local_save && broker.config.is_in_memory() {
            return Err(NgError::CannotSaveWhenInMemoryConfig);
        }
    }
    let res = create_wallet_v0(params)?;
    let lws: LocalWalletStorageV0 = (&res).into();
    wallet_add(lws).await?;

    Ok(res)
}

#[doc(hidden)]
/// Only used by JS SDK when the localStorage changes and brings out of sync for the Rust side copy of the wallets
pub async fn wallets_reload() -> Result<(), NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };
    match &broker.config {
        LocalBrokerConfig::JsStorage(js_config) => {
            // load the wallets from JsStorage
            let wallets_string = (js_config.local_read)("ng_wallets".to_string())?;
            let map_ser =
                base64_url::decode(&wallets_string).map_err(|_| NgError::SerializationError)?;
            let wallets: LocalWalletStorage = serde_bare::from_slice(&map_ser)?;
            let LocalWalletStorage::V0(v0) = wallets;
            broker.wallets.extend(v0);
        }
        _ => {}
    }
    Ok(())
}

#[doc(hidden)]
/// This should not be used by programmers. Only here because the JS SDK needs it.
///
/// It will throw and error if you use it.
pub async fn wallet_add(lws: LocalWalletStorageV0) -> Result<(), NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };
    if !lws.in_memory && broker.config.is_in_memory() {
        return Err(NgError::CannotSaveWhenInMemoryConfig);
    }
    if broker.wallets.get(&lws.wallet.name()).is_some() {
        return Err(NgError::WalletAlreadyAdded);
    }
    let in_memory = lws.in_memory;
    broker.wallets.insert(lws.wallet.name(), lws);
    if in_memory {
        // if broker.config.is_js() {
        //     (broker.config.js_config().unwrap().wallets_in_mem_changed)();
        // }
    } else {
        match &broker.config {
            LocalBrokerConfig::JsStorage(js_config) => {
                // JS save
                let lws_ser = LocalWalletStorage::v0_to_vec(&broker.wallets);
                let encoded = base64_url::encode(&lws_ser);
                (js_config.local_write)("ng_wallets".to_string(), encoded)?;
            }
            LocalBrokerConfig::BasePath(base_path) => {
                // save on disk
                // TODO: use https://lib.rs/crates/keyring instead of AppLocalData on Tauri apps
                let mut path = base_path.clone();
                std::fs::create_dir_all(path.clone()).unwrap();
                path.push("wallets");

                let lws_ser = LocalWalletStorage::v0_to_vec(&broker.wallets);
                let r = write(path.clone(), &lws_ser);
                if r.is_err() {
                    log_debug!("write {:?} {}", path, r.unwrap_err());
                    return Err(NgError::IoError);
                }
            }
            _ => panic!("wrong LocalBrokerConfig"),
        }
    }
    Ok(())
}

/// Reads a binary Wallet File and decodes it to a Wallet object.
///
/// This object can be used to import the wallet into a new Device
/// with the help of the function [wallet_open_with_pazzle_words]
/// followed by [wallet_import]
pub async fn wallet_read_file(file: Vec<u8>) -> Result<Wallet, NgError> {
    let ngf: NgFile = file.try_into()?;
    if let NgFile::V0(NgFileV0::Wallet(wallet)) = ngf {
        let broker = match LOCAL_BROKER.get() {
            None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
            Some(Ok(broker)) => broker.read().await,
        };
        // check that the wallet is not already present in local_broker
        let wallet_name = wallet.name();
        if broker.wallets.get(&wallet_name).is_none() {
            Ok(wallet)
        } else {
            Err(NgError::WalletAlreadyAdded)
        }
    } else {
        Err(NgError::InvalidFileFormat)
    }
}

/// Retrieves the binary content of a Wallet File for the Wallet identified by its name
pub async fn wallet_get_file(wallet_name: &String) -> Result<Vec<u8>, NgError> {
    let broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.read().await,
    };
    // check that the wallet exists
    match broker.wallets.get(wallet_name) {
        None => Err(NgError::WalletNotFound),
        Some(lws) => Ok(to_vec(&NgFile::V0(NgFileV0::Wallet(lws.wallet.clone()))).unwrap()),
    }
}

#[doc(hidden)]
/// This is a bit hard to use as the pazzle words are encoded in unsigned bytes.
/// prefer the function wallet_open_with_pazzle_words
pub fn wallet_open_with_pazzle(
    wallet: &Wallet,
    pazzle: Vec<u8>,
    pin: [u8; 4],
) -> Result<SensitiveWallet, NgError> {
    let opened_wallet = ng_wallet::open_wallet_with_pazzle(wallet, pazzle, pin)?;

    Ok(opened_wallet)
}

/// Opens a wallet by providing an ordered list of words, and the pin.
///
/// If you are opening a wallet that is already known to the LocalBroker, you must then call [wallet_was_opened].
/// Otherwise, if you are importing, then you must call [wallet_import].
///
/// For a list of words, see [list_all_words](crate::wallet::emojis::list_all_words)
pub fn wallet_open_with_pazzle_words(
    wallet: &Wallet,
    pazzle_words: &Vec<String>,
    pin: [u8; 4],
) -> Result<SensitiveWallet, NgError> {
    wallet_open_with_pazzle(wallet, encode_pazzle(pazzle_words)?, pin)
}

/// Imports a wallet into the LocalBroker so the user can then access its content.
///
/// the wallet should have been previous opened with [wallet_open_with_pazzle_words].
/// Once import is done, the wallet is already marked as opened, and the user can start a new session right away.
/// There is no need to call wallet_was_opened.
pub async fn wallet_import(
    encrypted_wallet: Wallet,
    mut opened_wallet: SensitiveWallet,
    in_memory: bool,
) -> Result<ClientV0, NgError> {
    {
        // in a block to release lock before calling wallet_add
        let broker = match LOCAL_BROKER.get() {
            None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
            Some(Ok(broker)) => broker.read().await,
        };

        let wallet_name = encrypted_wallet.name();
        if broker.wallets.get(&wallet_name).is_some() {
            return Err(NgError::WalletAlreadyAdded);
        }
    }

    let lws = opened_wallet.import_v0(encrypted_wallet, in_memory)?;

    wallet_add(lws).await?;

    wallet_was_opened(opened_wallet).await
}

/// Must be called after [wallet_open_with_pazzle_words] if you are not importing.
///
/// this is a separate step because in JS webapp, the opening of a wallet takes time and freezes the GUI.
/// We need to run it in the background in a WebWorker. but there, the LocalBroker cannot access localStorage...
/// So a separate function must be called, once the WebWorker is done.
pub async fn wallet_was_opened(mut wallet: SensitiveWallet) -> Result<ClientV0, NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    if broker.opened_wallets.get(&wallet.id()).is_some() {
        return Err(NgError::WalletAlreadyOpened);
    }
    let wallet_id = wallet.id();

    let lws = match broker.wallets.get(&wallet_id) {
        Some(lws) => {
            if wallet.client().is_none() {
                // this case happens when the wallet is opened and not when it is imported (as the client is already there)
                wallet.set_client(lws.to_client_v0(wallet.privkey())?);
            }
            lws
        }
        None => {
            return Err(NgError::WalletNotFound);
        }
    };
    let block_storage = if lws.in_memory {
        Arc::new(std::sync::RwLock::new(HashMapBlockStorage::new()))
            as Arc<std::sync::RwLock<dyn BlockStorage + Send + Sync + 'static>>
    } else {
        #[cfg(not(target_family = "wasm"))]
        {
            let mut key_material = wallet
                .client()
                .as_ref()
                .unwrap()
                .sensitive_client_storage
                .priv_key
                .slice();
            let path = broker
                .config
                .compute_path(&wallet.client().as_ref().unwrap().id.to_hash_string())?;
            let mut key: [u8; 32] =
                derive_key("NextGraph Client BlockStorage BLAKE3 key", key_material);
            Arc::new(std::sync::RwLock::new(RocksDbBlockStorage::open(
                &path, key,
            )?)) as Arc<std::sync::RwLock<dyn BlockStorage + Send + Sync + 'static>>
        }
        #[cfg(target_family = "wasm")]
        {
            panic!("no RocksDB in WASM");
        }
    };
    let client = wallet.client().as_ref().unwrap().clone();
    let opened_wallet = OpenedWallet {
        wallet,
        block_storage,
    };

    broker.opened_wallets.insert(wallet_id, opened_wallet);
    Ok(client)
}

/// Starts a session with the LocalBroker. The type of verifier is selected at this moment.
///
/// The session is valid even if there is no internet. The local data will be used in this case.
/// Return value is the index of the session, will be used in all the doc_* API calls.
pub async fn session_start(mut config: SessionConfig) -> Result<SessionInfo, NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    config.valid_verifier_config_for_local_broker_config(&broker.config)?;

    let wallet_name: String = config.wallet_name();
    let wallet_id: PubKey = (*wallet_name).try_into()?;
    let user_id = config.user_id();

    match broker.opened_wallets.get(&wallet_name) {
        None => return Err(NgError::WalletNotFound),
        Some(opened_wallet) => {
            let block_storage = Arc::clone(&opened_wallet.block_storage);
            let credentials = match opened_wallet.wallet.individual_site(&user_id) {
                Some(creds) => creds.clone(),
                None => return Err(NgError::NotFound),
            };

            let client_storage_master_key = serde_bare::to_vec(
                &opened_wallet
                    .wallet
                    .client()
                    .as_ref()
                    .unwrap()
                    .sensitive_client_storage
                    .storage_master_key,
            )
            .unwrap();

            let session = match broker.sessions.get(&user_id) {
                Some(session) => session,
                None => {
                    // creating the session now
                    let closed_wallet = broker.wallets.get(&wallet_name).unwrap();
                    if closed_wallet.in_memory {
                        let session = SessionPeerStorageV0::new(user_id);
                        broker.sessions.insert(user_id, session);
                        broker.sessions.get(&user_id).unwrap()
                    } else {
                        // first check if there is a saved SessionWalletStorage
                        let mut sws = match &broker.config {
                            LocalBrokerConfig::InMemory => panic!("cannot open saved session"),
                            LocalBrokerConfig::JsStorage(js_config) => {
                                // read session wallet storage from JsStorage
                                let res =
                                    (js_config.session_read)(format!("ng_wallet@{}", wallet_name));
                                match res {
                                    Ok(string) => {
                                        let decoded = base64_url::decode(&string)
                                            .map_err(|_| NgError::SerializationError)?;
                                        Some(SessionWalletStorageV0::dec_session(
                                            opened_wallet.wallet.privkey(),
                                            &decoded,
                                        )?)
                                    }
                                    Err(_) => None,
                                }
                            }
                            LocalBrokerConfig::BasePath(base_path) => {
                                // read session wallet storage from disk
                                let mut path = base_path.clone();
                                path.push("sessions");
                                path.push(wallet_name.clone());
                                let res = read(path);
                                if res.is_ok() {
                                    Some(SessionWalletStorageV0::dec_session(
                                        opened_wallet.wallet.privkey(),
                                        &res.unwrap(),
                                    )?)
                                } else {
                                    None
                                }
                            }
                        };
                        let (session, new_sws) = match &mut sws {
                            None => {
                                let (s, sws_ser) = SessionWalletStorageV0::create_new_session(
                                    &wallet_id, user_id,
                                )?;
                                broker.sessions.insert(user_id, s);
                                (broker.sessions.get(&user_id).unwrap(), sws_ser)
                            }
                            Some(sws) => {
                                match sws.users.get(&user_id.to_string()) {
                                    Some(sps) => {
                                        broker.sessions.insert(user_id, sps.clone());
                                        (broker.sessions.get(&user_id).unwrap(), vec![])
                                    }
                                    None => {
                                        // the user was not found in the SWS. we need to create a SPS, add it, encrypt and serialize the new SWS,
                                        // add the SPS to broker.sessions, and return the newly created SPS and the new SWS encrypted serialization
                                        let sps = SessionPeerStorageV0::new(user_id);
                                        sws.users.insert(user_id.to_string(), sps.clone());
                                        let encrypted = sws.enc_session(&wallet_id)?;
                                        broker.sessions.insert(user_id, sps);
                                        (broker.sessions.get(&user_id).unwrap(), encrypted)
                                    }
                                }
                            }
                        };
                        // save the new sws
                        if new_sws.len() > 0 {
                            match &broker.config {
                                LocalBrokerConfig::InMemory => {
                                    panic!("cannot save session when InMemory mode")
                                }
                                LocalBrokerConfig::JsStorage(js_config) => {
                                    // save session wallet storage to JsStorage
                                    let encoded = base64_url::encode(&new_sws);
                                    (js_config.session_write)(
                                        format!("ng_wallet@{}", wallet_name),
                                        encoded,
                                    )?;
                                }
                                LocalBrokerConfig::BasePath(base_path) => {
                                    // save session wallet storage to disk
                                    let mut path = base_path.clone();
                                    path.push("sessions");
                                    std::fs::create_dir_all(path.clone()).unwrap();
                                    path.push(wallet_name);
                                    //log_debug!("{}", path.clone().display());
                                    write(path.clone(), &new_sws).map_err(|_| NgError::IoError)?;
                                }
                            }
                        }
                        session
                    }
                }
            };
            let session = session.clone();

            // derive user_master_key from client's storage_master_key
            let user_id_ser = serde_bare::to_vec(&user_id).unwrap();
            let mut key_material = [user_id_ser, client_storage_master_key].concat(); //
            let mut key: [u8; 32] = derive_key(
                "NextGraph user_master_key BLAKE3 key",
                key_material.as_slice(),
            );
            key_material.zeroize();
            let verifier = Verifier::new(
                VerifierConfig {
                    config_type: broker.verifier_config_type_from_session_config(&config),
                    user_master_key: key,
                    peer_priv_key: session.peer_key.clone(),
                    user_priv_key: credentials.0,
                    private_store_read_cap: credentials.1,
                },
                block_storage,
            )?;
            key.zeroize();
            broker.opened_sessions_list.push(Some(Session {
                config,
                peer_key: session.peer_key.clone(),
                last_wallet_nonce: session.last_wallet_nonce,
                verifier,
            }));
            let idx = broker.opened_sessions_list.len() - 1;
            broker.opened_sessions.insert(user_id, idx as u8);
            Ok(SessionInfo {
                session_id: idx as u8,
                user: user_id,
            })
        }
    }
}

use web_time::SystemTime;
fn get_unix_time() -> f64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_millis() as f64
}

/// Attempts a TCP connection to the Server Broker of the User.
///
/// The configuration about which Server to contact is stored in the Wallet.
/// The LocalBroker will be in charge of maintaining this connection alive,
/// cycling through optional alternative servers to contact in case of failure,
/// and will notify the user if connection is lost permanently.
/// Result is a list of (user_id, server_id, server_ip, error, since_date)
/// If error is None, it means the connection is successful
///
/// Once the connection is established, the user can sync data, open documents, etc.. with the Verifier API
///
/// In a future version, it will be possible to be connected to several brokers at the same time
/// (for different users/identities opened concurrently on the same Client)
// TODO: improve this return value
// TODO: give public access to the API for subscribing to disconnections
pub async fn user_connect(
    user_id: &UserId,
) -> Result<Vec<(String, String, String, Option<String>, f64)>, NgError> {
    let os_info = get_os_info();
    let info = json!({
        "platform": {
            "type": "program",
            "arch": os_info.get("rust").unwrap().get("arch"),
            "debug": os_info.get("rust").unwrap().get("debug"),
            "target": os_info.get("rust").unwrap().get("target"),
            "arch_uname": os_info.get("uname").unwrap().get("arch"),
            "bitness": os_info.get("uname").unwrap().get("bitness"),
            "codename": os_info.get("uname").unwrap().get("codename"),
            "edition": os_info.get("uname").unwrap().get("edition"),
        },
        "os": {
            "name": os_info.get("uname").unwrap().get("os_name"),
            "family": os_info.get("rust").unwrap().get("family"),
            "version": os_info.get("uname").unwrap().get("version"),
            "name_rust": os_info.get("rust").unwrap().get("os_name"),
        }
    });

    let client_info = ClientInfo::new(
        ClientType::NativeService,
        info.to_string(),
        env!("CARGO_PKG_VERSION").to_string(),
    );

    user_connect_with_device_info(client_info, &user_id, None).await
}

/// Used internally by JS SDK and Tauri Apps. Do not use "as is". See [user_connect] instead.
#[doc(hidden)]
pub async fn user_connect_with_device_info(
    info: ClientInfo,
    user_id: &UserId,
    location: Option<String>,
) -> Result<Vec<(String, String, String, Option<String>, f64)>, NgError> {
    //FIXME: release this write lock much sooner than at the end of the loop of all tries to connect to some servers ?
    // or maybe it is good to block as we dont want concurrent connection attempts potentially to the same server
    let mut local_broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    let (wallet, session) = local_broker.get_wallet_and_session(user_id)?;

    let mut result: Vec<(String, String, String, Option<String>, f64)> = Vec::new();
    let arc_cnx: Arc<Box<dyn IConnect>> = Arc::new(Box::new(ConnectionWebSocket {}));

    match wallet {
        SensitiveWallet::V0(wallet) => {
            let client = wallet.client.as_ref().unwrap();
            let client_priv = &client.sensitive_client_storage.priv_key;
            let client_name = &client.name;
            let auto_open = &client.auto_open;
            // log_info!(
            //     "XXXX {} name={:?} auto_open={:?} {:?}",
            //     client_id.to_string(),
            //     client_name,
            //     auto_open,
            //     wallet
            // );
            for user in auto_open {
                let user_id = user.to_string();
                let peer_key = &session.peer_key;
                let peer_id = peer_key.to_pub();
                let site = wallet.sites.get(&user_id);
                if site.is_none() {
                    result.push((
                        user_id,
                        "".into(),
                        "".into(),
                        Some("Site is missing".into()),
                        get_unix_time(),
                    ));
                    continue;
                }
                let site = site.unwrap();
                let user_priv = site.get_individual_user_priv_key().unwrap();
                let core = site.cores[0]; //TODO: cycle the other cores if failure to connect (failover)
                let server_key = core.0;
                let broker = wallet.brokers.get(&core.0.to_string());
                if broker.is_none() {
                    result.push((
                        user_id,
                        core.0.to_string(),
                        "".into(),
                        Some("Broker is missing".into()),
                        get_unix_time(),
                    ));
                    continue;
                }
                let brokers = broker.unwrap();
                let mut tried: Option<(String, String, String, Option<String>, f64)> = None;
                //TODO: on tauri (or forward in local broker, or CLI), prefer a Public to a Domain. Domain always comes first though, so we need to reorder the list
                //TODO: use site.bootstraps to order the list of brokerInfo.
                for broker_info in brokers {
                    match broker_info {
                        BrokerInfoV0::ServerV0(server) => {
                            let url = server.get_ws_url(&location).await;
                            log_debug!("URL {:?}", url);
                            //Option<(String, Vec<BindAddress>)>
                            if url.is_some() {
                                let url = url.unwrap();
                                if url.1.len() == 0 {
                                    // TODO deal with Box(Dyn)Public -> tunnel, and on tauri/forward/CLIs, deal with all Box -> direct connections (when url.1.len is > 0)
                                    let res = BROKER
                                        .write()
                                        .await
                                        .connect(
                                            arc_cnx.clone(),
                                            peer_key.clone(),
                                            peer_id,
                                            server_key,
                                            StartConfig::Client(ClientConfig {
                                                url: url.0.clone(),
                                                name: client_name.clone(),
                                                user_priv: user_priv.clone(),
                                                client_priv: client_priv.clone(),
                                                info: info.clone(),
                                                registration: Some(core.1),
                                            }),
                                        )
                                        .await;
                                    log_debug!("broker.connect : {:?}", res);

                                    tried = Some((
                                        user_id.clone(),
                                        core.0.to_string(),
                                        url.0.into(),
                                        match &res {
                                            Ok(_) => None,
                                            Err(e) => Some(e.to_string()),
                                        },
                                        get_unix_time(),
                                    ));
                                }
                                if tried.is_some() && tried.as_ref().unwrap().3.is_none() {
                                    session.verifier.connected_server_id = Some(server_key);
                                    // successful. we can stop here
                                    break;
                                } else {
                                    log_debug!("Failed connection {:?}", tried);
                                }
                            }
                        }
                        // Core information is discarded
                        _ => {}
                    }
                }
                if tried.is_none() {
                    tried = Some((
                        user_id,
                        core.0.to_string(),
                        "".into(),
                        Some("No broker found".into()),
                        get_unix_time(),
                    ));
                }
                result.push(tried.unwrap());
            }
        }
    }
    Ok(result)
}

/// Stops the session, that can be resumed later on. All the local data is flushed from RAM.
pub async fn session_stop(user_id: &UserId) -> Result<(), NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    match broker.opened_sessions.remove(user_id) {
        Some(id) => {
            broker.opened_sessions_list[id as usize].take();
            // TODO: change the logic here once it will be possible to have several users connected at the same time
            Broker::close_all_connections().await;
        }
        None => {}
    }

    Ok(())
}

/// Disconnects the user from the Server Broker(s), but keep all the local data opened and ready.
pub async fn user_disconnect(user_id: &UserId) -> Result<(), NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    broker.disconnect_session(user_id).await
}

/// Closes a wallet, which means that the pazzle will have to be entered again if the user wants to use it
pub async fn wallet_close(wallet_name: &String) -> Result<(), NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    match broker.opened_wallets.remove(wallet_name) {
        Some(mut opened_wallet) => {
            for user in opened_wallet.wallet.sites() {
                let key: PubKey = (user.as_str()).try_into().unwrap();
                match broker.opened_sessions.remove(&key) {
                    Some(id) => {
                        broker.opened_sessions_list[id as usize].take();
                    }
                    None => {}
                }
            }
            opened_wallet.wallet.zeroize();
        }
        None => return Err(NgError::WalletNotFound),
    }

    Broker::close_all_connections().await;

    Ok(())
}

/// (not implemented yet)
pub async fn wallet_remove(wallet_name: String) -> Result<(), NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    todo!();
    // should close the wallet, then remove all the saved sessions and remove the wallet

    Ok(())
}

/// fetches a document's content, or performs a mutation on the document.
pub async fn doc_fetch(
    session_id: u8,
    nuri: String,
    payload: Option<AppRequestPayload>,
) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };
    if session_id as usize >= broker.opened_sessions_list.len() {
        return Err(NgError::InvalidArgument);
    }
    let session = broker.opened_sessions_list[session_id as usize]
        .as_mut()
        .ok_or(NgError::SessionNotFound)?;

    session.verifier.doc_fetch(nuri, payload)
}

#[cfg(test)]
mod test {
    use super::*;
    use super::{
        init_local_broker, session_start, session_stop, user_connect, user_disconnect,
        wallet_close, wallet_create_v0, wallet_get_file, wallet_import,
        wallet_open_with_pazzle_words, wallet_read_file, wallet_was_opened, LocalBrokerConfig,
        SessionConfig,
    };
    use ng_net::types::BootstrapContentV0;
    use ng_wallet::{display_mnemonic, emojis::display_pazzle};
    use std::fs::{create_dir_all, File};
    use std::io::BufReader;
    use std::io::Read;
    use std::io::Write;
    use std::path::Path;

    #[async_std::test]
    async fn gen_wallet_for_test() {
        if Path::new("tests/wallet.ngw").exists() {
            println!("test files already generated. skipping");
            return;
        }

        // loading an image file from disk
        let f = File::open("examples/wallet-security-image-demo.png")
            .expect("open of examples/wallet-security-image-demo.png");
        let mut reader = BufReader::new(f);
        let mut security_img = Vec::new();
        // Read file into vector.
        reader
            .read_to_end(&mut security_img)
            .expect("read of valid_security_image.jpg");

        init_local_broker(Box::new(|| LocalBrokerConfig::InMemory)).await;

        #[allow(deprecated)]
        let peer_id_of_server_broker = PubKey::nil();

        let wallet_result = wallet_create_v0(CreateWalletV0 {
            security_img,
            security_txt: "know yourself".to_string(),
            pin: [1, 2, 1, 2],
            pazzle_length: 9,
            send_bootstrap: false,
            send_wallet: false,
            result_with_wallet_file: true,
            local_save: false,
            // we default to localhost:14400. this is just for the sake of an example
            core_bootstrap: BootstrapContentV0::new_localhost(peer_id_of_server_broker),
            core_registration: None,
            additional_bootstrap: None,
        })
        .await
        .expect("wallet_create_v0");

        let pazzle = display_pazzle(&wallet_result.pazzle);
        let mut pazzle_words = vec![];
        println!("Your pazzle is: {:?}", wallet_result.pazzle);
        for emoji in pazzle {
            println!("    {}:\t{}", emoji.0, emoji.1);
            pazzle_words.push(emoji.1.to_string());
        }

        create_dir_all("tests").expect("create test file");

        let mut file = File::create("tests/wallet.pazzle").expect("open for write pazzle file");
        file.write_all(pazzle_words.join(" ").as_bytes())
            .expect("write of pazzle");

        println!("Your mnemonic is:");

        let mut mnemonic_words = vec![];
        display_mnemonic(&wallet_result.mnemonic)
            .iter()
            .for_each(|word| {
                mnemonic_words.push(word.clone());
                print!("{} ", word.as_str());
            });
        println!("");
        let mut file = File::create("tests/wallet.mnemonic").expect("open for write mnemonic file");
        file.write_all(mnemonic_words.join(" ").as_bytes())
            .expect("write of mnemonic");

        let opened_wallet =
            wallet_open_with_pazzle_words(&wallet_result.wallet, &pazzle_words, [1, 2, 1, 2])
                .expect("opening of wallet");

        let mut file = File::create("tests/wallet.ngw").expect("open for write wallet file");
        let ser_wallet =
            to_vec(&NgFile::V0(NgFileV0::Wallet(wallet_result.wallet.clone()))).unwrap();
        file.write_all(&ser_wallet).expect("write of wallet file");

        let mut file =
            File::create("tests/opened_wallet.ngw").expect("open for write opened_wallet file");
        let ser = serde_bare::to_vec(&opened_wallet).expect("serialization of opened wallet");

        file.write_all(&ser).expect("write of opened_wallet file");
    }

    async fn init_session_for_test() -> (UserId, String) {
        let wallet_file = read("tests/wallet.ngw").expect("read wallet file");
        let opened_wallet_file = read("tests/opened_wallet.ngw").expect("read opened_wallet file");
        let opened_wallet: SensitiveWallet =
            serde_bare::from_slice(&opened_wallet_file).expect("deserialization of opened_wallet");

        init_local_broker(Box::new(|| LocalBrokerConfig::InMemory)).await;

        let wallet = wallet_read_file(wallet_file)
            .await
            .expect("wallet_read_file");

        let wallet_name = wallet.name();
        let user_id = opened_wallet.personal_identity();

        let _client = wallet_import(wallet, opened_wallet, true)
            .await
            .expect("wallet_import");

        let _session = session_start(SessionConfig::new_in_memory(&user_id, &wallet_name))
            .await
            .expect("");

        (user_id, wallet_name)
    }

    #[async_std::test]
    async fn import_wallet() {
        let (user_id, wallet_name) = init_session_for_test().await;

        let status = user_connect(&user_id).await.expect("user_connect");

        let error_reason = status[0].3.as_ref().unwrap();
        assert!(error_reason == "NoiseHandshakeFailed" || error_reason == "ConnectionError");

        // Then we should disconnect
        user_disconnect(&user_id).await.expect("user_disconnect");

        // stop the session
        session_stop(&user_id).await.expect("session_stop");

        // closes the wallet
        wallet_close(&wallet_name).await.expect("wallet_close");
    }
}
