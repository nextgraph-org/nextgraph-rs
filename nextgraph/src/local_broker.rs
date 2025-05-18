// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use core::fmt;
use std::collections::{BTreeMap, HashMap};
use std::fs::{read, remove_file, write};
use std::path::PathBuf;

use async_once_cell::OnceCell;
use async_std::sync::{Arc, Condvar, Mutex, RwLock};
use futures::channel::mpsc;
use futures::{SinkExt, StreamExt};
use lazy_static::lazy_static;
use once_cell::sync::Lazy;
use pdf_writer::{Content, Finish, Name, Pdf, Rect, Ref, Str};
use qrcode::{render::svg, QrCode};
use serde_bare::to_vec;
use serde_json::json;
use svg2pdf::ConversionOptions;
use zeroize::Zeroize;

use ng_repo::block_storage::BlockStorage;
use ng_repo::block_storage::HashMapBlockStorage;
use ng_repo::errors::{NgError, ProtocolError};
use ng_repo::log::*;
use ng_repo::os_info::get_os_info;
use ng_repo::types::*;
use ng_repo::utils::{derive_key, encrypt_in_place, generate_keypair};

use ng_net::app_protocol::*;
use ng_net::broker::*;
use ng_net::connection::{AppConfig, ClientConfig, IConnect, NoiseFSM, StartConfig};
use ng_net::types::*;
use ng_net::utils::{spawn_and_log_error, Receiver, ResultSend, Sender};
use ng_net::{actor::*, actors::admin::*};

use ng_verifier::types::*;
use ng_verifier::verifier::Verifier;

use ng_wallet::bip39::encode_mnemonic;
use ng_wallet::emojis::{display_pazzle, encode_pazzle};
use ng_wallet::{
    create_wallet_first_step_v0, create_wallet_second_step_v0, display_mnemonic, types::*,
};

#[cfg(not(target_family = "wasm"))]
use ng_client_ws::remote_ws::ConnectionWebSocket;
#[cfg(target_family = "wasm")]
use ng_client_ws::remote_ws_wasm::ConnectionWebSocket;
#[cfg(not(any(target_family = "wasm", docsrs)))]
use ng_storage_rocksdb::block_storage::RocksDbBlockStorage;

#[doc(hidden)]
#[derive(Debug, Clone)]
pub struct HeadlessConfig {
    // parse_ip_and_port_for(string, "verifier_server")
    pub server_addr: BindAddress,
    // decode_key(string)
    pub server_peer_id: PubKey,
    // decode_priv_key(string)
    pub client_peer_key: Option<PrivKey>,
    pub admin_user_key: Option<PrivKey>,
}

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
    pub clear: Arc<Box<JsCallback>>,
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
                if qty > 0 {
                    let new_val = val + qty as u64;
                    let spls = SessionPeerLastSeq::V0(new_val);
                    let ser = serde_bare::to_vec(&spls)?;
                    //saving the new val
                    let encoded = base64_url::encode(&ser);
                    (session_write2)(format!("ng_peer_last_seq@{}", peer_id), encoded)?;
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
                    let start_key = format!("ng_outboxes@{}@start", peer_id);
                    //log_info!("search start key {}", start_key);
                    let res = (session_read4)(start_key.clone());
                    let _start = match res {
                        Err(_) => return Err(NgError::JsStorageKeyNotFound),
                        Ok(start_str) => start_str
                            .parse::<u64>()
                            .map_err(|_| NgError::InvalidFileFormat)?,
                    };
                    let mut idx: u64 = 0;
                    let mut result = vec![];
                    loop {
                        let idx_str = format!("{:05}", idx);
                        let str = format!("ng_outboxes@{}@{idx_str}", peer_id);
                        //log_info!("search key {}", str);
                        let res = (session_read4)(str.clone());
                        let res = match res {
                            Err(_) => break,
                            Ok(res) => res,
                        };
                        (session_del)(str)?;
                        let decoded =
                            base64_url::decode(&res).map_err(|_| NgError::SerializationError)?;
                        result.push(decoded);
                        idx += 1;
                    }
                    (session_del)(start_key)?;
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
    /// Does not handle wallet and will only create remote sessions from credentials.
    /// Only one websocket connection will be established to a predefined verifier (given in config)
    #[doc(hidden)]
    Headless(HeadlessConfig),
}

impl LocalBrokerConfig {
    pub fn is_in_memory(&self) -> bool {
        match self {
            Self::InMemory => true,
            _ => false,
        }
    }
    pub fn is_persistent(&self) -> bool {
        match self {
            Self::BasePath(_) => true,
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
    pub fn headless_config(&self) -> &HeadlessConfig {
        match self {
            Self::Headless(c) => &c,
            _ => panic!("dont call headless_config if not in HeadlessConfig"),
        }
    }
    #[doc(hidden)]
    pub fn js_config(&self) -> Option<&JsStorageConfig> {
        match self {
            Self::JsStorage(c) => Some(c),
            _ => None,
        }
    }
    #[cfg(not(target_family = "wasm"))]
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
    WithCredentialsV0(WithCredentialsV0),
    HeadlessV0(UserId),
}

#[derive(Debug)]
/// used to initiate a session at a local broker with credentials
pub struct WithCredentialsV0 {
    pub credentials: Credentials,
    pub verifier_type: VerifierType,
    pub detach: bool, // only used if remote verifier
}

//trait ISession {}

#[derive(Debug)]
struct RemoteSession {
    #[allow(dead_code)]
    config: SessionConfig,
    remote_peer_id: DirectPeerId,
    user_id: UserId,
}

impl RemoteSession {
    pub(crate) async fn send_request(&self, req: AppRequest) -> Result<AppResponse, NgError> {
        match BROKER
            .read()
            .await
            .request::<AppRequest, AppResponse>(
                &Some(self.user_id),
                &Some(self.remote_peer_id),
                req,
            )
            .await
        {
            Err(e) => Err(e),
            Ok(SoS::Stream(_)) => Err(NgError::InvalidResponse),
            Ok(SoS::Single(res)) => Ok(res),
        }
    }

    pub(crate) async fn send_request_stream(
        &self,
        req: AppRequest,
    ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
        match BROKER
            .read()
            .await
            .request::<AppRequest, AppResponse>(
                &Some(self.user_id),
                &Some(self.remote_peer_id),
                req,
            )
            .await
        {
            Err(e) => Err(e),
            Ok(SoS::Single(_)) => Err(NgError::InvalidResponse),
            Ok(SoS::Stream(stream)) => {
                let fnonce = Box::new(move || {
                    // stream.close();
                    //TODO: implement CancelStream in AppRequest
                });
                Ok((stream, fnonce))
            }
        }
    }
}

#[derive(Debug)]
struct HeadlessSession {
    user_id: UserId,
}

impl HeadlessSession {}

#[derive(Debug)]
struct Session {
    config: SessionConfig,
    peer_key: PrivKey,
    #[allow(dead_code)]
    last_wallet_nonce: u64,
    verifier: Verifier,
}

impl SessionConfig {
    pub fn user_id(&self) -> UserId {
        match self {
            Self::V0(v0) => v0.user_id,
            Self::WithCredentialsV0(creds) => creds.credentials.user_key.to_pub(),
            Self::HeadlessV0(hl) => hl.clone(),
        }
    }
    pub fn wallet_name(&self) -> String {
        match self {
            Self::V0(v0) => v0.wallet_name.clone(),
            Self::WithCredentialsV0(_) => panic!("dont call wallet_name on a WithCredentialsV0"),
            Self::HeadlessV0(_) => panic!("dont call wallet_name on a HeadlessV0"),
        }
    }
    pub fn verifier_type(&self) -> &VerifierType {
        match self {
            Self::V0(v0) => &v0.verifier_type,
            Self::WithCredentialsV0(creds) => &creds.verifier_type,
            Self::HeadlessV0(_) => panic!("dont call verifier_type on a HeadlessV0"),
        }
    }
    pub fn is_remote(&self) -> bool {
        match self {
            Self::V0(v0) => v0.verifier_type.is_remote(),
            Self::WithCredentialsV0(creds) => creds.verifier_type.is_remote(),
            Self::HeadlessV0(_) => true,
        }
    }
    pub fn set_verifier_type(&mut self, vt: VerifierType) {
        match self {
            Self::V0(v0) => v0.verifier_type = vt,
            Self::WithCredentialsV0(creds) => creds.verifier_type = vt,
            Self::HeadlessV0(_) => panic!("dont call verifier_type on a HeadlessV0"),
        }
    }

    pub fn is_with_credentials(&self) -> bool {
        match self {
            Self::WithCredentialsV0(_) => true,
            Self::HeadlessV0(_) | Self::V0(_) => false,
        }
    }

    pub fn is_memory(&self) -> bool {
        match self {
            Self::V0(v0) => v0.verifier_type.is_memory(),
            Self::WithCredentialsV0(creds) => creds.verifier_type.is_memory(),
            Self::HeadlessV0(_) => true,
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

    /// Creates a new SessionConfig that tentatively saves data and/or session, with a UserId and a wallet name
    ///
    /// the session might be downgraded to in_memory if the wallet was added with the in_memory option
    /// that should be passed to [session_start]
    pub fn new_save(user_id: &UserId, wallet_name: &String) -> Self {
        SessionConfig::V0(SessionConfigV0 {
            user_id: user_id.clone(),
            wallet_name: wallet_name.clone(),
            verifier_type: VerifierType::Save,
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

    #[doc(hidden)]
    pub fn new_headless(user_id: UserId) -> Self {
        SessionConfig::HeadlessV0(user_id)
    }

    fn force_in_memory(&mut self) {
        match self {
            Self::V0(v0) => v0.verifier_type = VerifierType::Memory,
            Self::WithCredentialsV0(_) | Self::HeadlessV0(_) => {
                panic!("dont call force_in_memory on a WithCredentialsV0 or HeadlessV0")
            }
        }
    }

    pub fn new_for_local_broker_config(
        user_id: &UserId,
        wallet_name: &String,
        local_broker_config: &LocalBrokerConfig,
        in_memory: bool,
    ) -> Result<SessionConfig, NgError> {
        Ok(SessionConfig::V0(SessionConfigV0 {
            user_id: user_id.clone(),
            wallet_name: wallet_name.clone(),
            verifier_type: match local_broker_config {
                LocalBrokerConfig::InMemory => {
                    if !in_memory {
                        return Err(NgError::CannotSaveWhenInMemoryConfig);
                    }
                    VerifierType::Memory
                }
                LocalBrokerConfig::BasePath(_) | LocalBrokerConfig::JsStorage(_) => match in_memory
                {
                    true => VerifierType::Memory,
                    false => VerifierType::Save,
                },
                LocalBrokerConfig::Headless(_) => {
                    panic!("don't call wallet_create on a Headless LocalBroker")
                }
            },
        }))
    }

    fn valid_verifier_config_for_local_broker_config(
        &mut self,
        local_broker_config: &LocalBrokerConfig,
    ) -> Result<(), NgError> {
        if match self {
            Self::HeadlessV0(_) => {
                panic!("don't call session_start on a Headless LocalBroker")
            }
            _ => match local_broker_config {
                LocalBrokerConfig::InMemory => {
                    self.set_verifier_type(VerifierType::Memory);
                    true
                }
                LocalBrokerConfig::JsStorage(js_config) => match self.verifier_type() {
                    VerifierType::Memory | VerifierType::Remote(_) => true,
                    VerifierType::Save => true,
                    VerifierType::WebRocksDb => js_config.is_browser,
                },
                LocalBrokerConfig::BasePath(_) => match self.verifier_type() {
                    VerifierType::Save | VerifierType::Remote(_) => true,
                    VerifierType::Memory => true,
                    _ => false,
                },
                LocalBrokerConfig::Headless(_) => {
                    panic!("don't call session_start on a Headless LocalBroker")
                }
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

struct LocalBroker {
    pub config: LocalBrokerConfig,

    pub wallets: HashMap<String, LocalWalletStorageV0>,

    pub opened_wallets: HashMap<String, OpenedWallet>,

    pub sessions: HashMap<UserId, SessionPeerStorageV0>,

    // use even session_ids for remote_session, odd session_ids for opened_sessions
    pub opened_sessions: HashMap<UserId, u64>,

    pub opened_sessions_list: Vec<Option<Session>>,
    pub remote_sessions_list: Vec<Option<RemoteSession>>,

    pub headless_sessions: BTreeMap<u64, HeadlessSession>,
    pub headless_connected_to_remote_broker: bool,

    tauri_streams: HashMap<String, CancelFn>,

    disconnections_sender: Sender<String>,
    disconnections_receiver: Option<Receiver<String>>,
    pump_cond: Option<Arc<(Mutex<bool>, Condvar)>>,
}

impl fmt::Debug for LocalBroker {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "LocalBroker.\nconfig {:?}", self.config)?;
        writeln!(f, "wallets {:?}", self.wallets)?;
        writeln!(f, "opened_wallets {:?}", self.opened_wallets)?;
        writeln!(f, "sessions {:?}", self.sessions)?;
        writeln!(f, "opened_sessions {:?}", self.opened_sessions)?;
        writeln!(f, "opened_sessions_list {:?}", self.opened_sessions_list)
    }
}

#[doc(hidden)]
#[cfg_attr(target_arch = "wasm32", async_trait::async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait::async_trait)]
pub trait ILocalBroker: Send + Sync + EActor {
    async fn deliver(&mut self, event: Event, overlay: OverlayId, user: UserId);
    async fn inbox(&mut self, user_id: UserId, msg: InboxMsg, from_queue: bool);
    async fn user_disconnected(&mut self, user_id: UserId);
}

// used to deliver events to the verifier on Clients, or on Cores that have Verifiers attached.
#[cfg_attr(target_arch = "wasm32", async_trait::async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait::async_trait)]
impl ILocalBroker for LocalBroker {
    async fn deliver(&mut self, event: Event, overlay: OverlayId, user_id: UserId) {
        if let Some(session) = self.get_mut_session_for_user(&user_id) {
            session.verifier.deliver(event, overlay).await;
        }
    }
    async fn inbox(&mut self, user_id: UserId, msg: InboxMsg, from_queue: bool) {
        if let Some(session) = self.get_mut_session_for_user(&user_id) {
            session.verifier.inbox(msg, from_queue).await;
        }
    }
    async fn user_disconnected(&mut self, user_id: UserId) {
        if let Some(session) = self.get_mut_session_for_user(&user_id) {
            session.verifier.connection_lost();
            let _ = self.disconnections_sender.send(user_id.to_string()).await;
        }
    }
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
        let user = fsm.lock().await.user_id()?;
        let session = self
            .get_mut_session_for_user(&user)
            .ok_or(ProtocolError::ActorError)?;
        session.verifier.respond(msg, fsm).await
    }
}

async fn pump(
    mut reader: Receiver<LocalBrokerMessage>,
    pair: Arc<(Mutex<bool>, Condvar)>,
) -> ResultSend<()> {
    while let Some(message) = reader.next().await {
        let (lock, cvar) = &*pair;
        let mut running = lock.lock().await;
        while !*running {
            running = cvar.wait(running).await;
        }

        let mut broker = match LOCAL_BROKER.get() {
            None | Some(Err(_)) => return Err(Box::new(NgError::LocalBrokerNotInitialized)),
            Some(Ok(broker)) => broker.write().await,
        };
        match message {
            LocalBrokerMessage::Deliver {
                event,
                overlay,
                user,
            } => broker.deliver(event, overlay, user).await,
            LocalBrokerMessage::Inbox {msg, user_id, from_queue} => {
                broker.inbox(user_id, msg, from_queue).await
            },
            LocalBrokerMessage::Disconnected { user_id } => broker.user_disconnected(user_id).await,
        }
    }

    log_debug!("END OF PUMP");
    Ok(())
}

impl LocalBroker {
    async fn stop_pump(&self) {
        let (lock, cvar) = self.pump_cond.as_deref().as_ref().unwrap();
        let mut running = lock.lock().await;
        *running = false;
        cvar.notify_one();
    }

    async fn start_pump(&self) {
        let (lock, cvar) = self.pump_cond.as_deref().as_ref().unwrap();
        let mut running = lock.lock().await;
        *running = true;
        cvar.notify_one();
    }

    fn init_pump(&mut self, broker_pump_receiver: Receiver<LocalBrokerMessage>) {
        let pair = Arc::new((Mutex::new(false), Condvar::new()));
        let pair2 = Arc::clone(&pair);
        self.pump_cond = Some(pair);
        spawn_and_log_error(pump(broker_pump_receiver, pair2));
    }
    // fn storage_path_for_user(&self, user_id: &UserId) -> Option<PathBuf> {
    //     match &self.config {
    //         LocalBrokerConfig::InMemory | LocalBrokerConfig::JsStorage(_) => None,
    //         LocalBrokerConfig::BasePath(base) => {
    //             let mut path = base.clone();
    //             path.push(format!("user{}", user_id.to_hash_string()));
    //             Some(path)
    //         }
    //     }
    // }

    /// helper function to store the sender of a tauri stream in order to be able to cancel it later on
    /// only used in Tauri, not used in the JS SDK
    fn tauri_stream_add(&mut self, stream_id: String, cancel: CancelFn) {
        self.tauri_streams.insert(stream_id, cancel);
    }

    /// helper function to cancel a tauri stream
    /// only used in Tauri, not used in the JS SDK
    fn tauri_stream_cancel(&mut self, stream_id: String) {
        let s = self.tauri_streams.remove(&stream_id);
        if let Some(cancel) = s {
            cancel();
        }
    }

    async fn connect_remote_broker(&mut self) -> Result<(), NgError> {
        self.err_if_not_headless()?;

        if self.headless_connected_to_remote_broker {
            return Ok(());
        }

        let info = get_client_info(ClientType::NodeService);

        let config = self.config.headless_config();

        BROKER
            .write()
            .await
            .connect(
                Arc::new(Box::new(ConnectionWebSocket {})),
                config.client_peer_key.to_owned().unwrap(),
                config.client_peer_key.as_ref().unwrap().to_pub(),
                config.server_peer_id,
                StartConfig::App(AppConfig {
                    user_priv: None,
                    info,
                    addr: config.server_addr,
                }),
            )
            .await?;

        self.headless_connected_to_remote_broker = true;

        Ok(())
    }

    pub(crate) async fn send_request_headless<
        A: Into<ProtocolMessage> + std::fmt::Debug + Sync + Send + 'static,
        B: TryFrom<ProtocolMessage, Error = ProtocolError> + std::fmt::Debug + Sync + Send + 'static,
    >(
        &self,
        req: A,
    ) -> Result<B, NgError> {
        self.err_if_not_headless()?;

        match BROKER
            .read()
            .await
            .request::<A, B>(
                &None,
                &Some(self.config.headless_config().server_peer_id),
                req,
            )
            .await
        {
            Err(e) => Err(e),
            Ok(SoS::Stream(_)) => Err(NgError::InvalidResponse),
            Ok(SoS::Single(res)) => Ok(res),
        }
    }

    #[allow(dead_code)]
    pub(crate) async fn send_request_stream_headless<
        A: Into<ProtocolMessage> + std::fmt::Debug + Sync + Send + 'static,
        B: TryFrom<ProtocolMessage, Error = ProtocolError> + std::fmt::Debug + Sync + Send + 'static,
    >(
        &self,
        req: A,
    ) -> Result<(Receiver<B>, CancelFn), NgError> {
        self.err_if_not_headless()?;

        match BROKER
            .read()
            .await
            .request::<A, B>(
                &None,
                &Some(self.config.headless_config().server_peer_id),
                req,
            )
            .await
        {
            Err(e) => Err(e),
            Ok(SoS::Single(_)) => Err(NgError::InvalidResponse),
            Ok(SoS::Stream(stream)) => {
                let fnonce = Box::new(move || {
                    // stream.close();
                    //TODO: implement CancelStream in AppRequest
                });
                Ok((stream, fnonce))
            }
        }
    }

    fn err_if_headless(&self) -> Result<(), NgError> {
        match self.config {
            LocalBrokerConfig::Headless(_) => Err(NgError::LocalBrokerIsHeadless),
            _ => Ok(()),
        }
    }

    fn err_if_not_headless(&self) -> Result<(), NgError> {
        match self.config {
            LocalBrokerConfig::Headless(_) => Ok(()),
            _ => Err(NgError::LocalBrokerIsHeadless),
        }
    }

    fn get_mut_session_for_user(&mut self, user: &UserId) -> Option<&mut Session> {
        match self.opened_sessions.get(user) {
            Some(idx) => {
                let idx = Self::to_real_session_id(*idx);
                if self.opened_sessions_list.len() > idx as usize {
                    self.opened_sessions_list[idx as usize].as_mut()
                } else {
                    None
                }
            }
            None => None,
        }
    }

    fn is_remote_session(session_id: u64) -> bool {
        (session_id & 1) == 0
    }

    fn is_local_session(session_id: u64) -> bool {
        !Self::is_remote_session(session_id)
    }

    fn to_real_session_id(session_id: u64) -> u64 {
        (session_id) >> 1
    }

    #[allow(dead_code)]
    fn to_external_session_id(session_id: u64, is_remote: bool) -> u64 {
        let mut ext = (session_id) << 1;
        if !is_remote {
            ext += 1;
        }
        ext
    }

    fn user_to_local_session_id_for_mut(&self, user_id: &UserId) -> Result<usize, NgError> {
        let session_id = self
            .opened_sessions
            .get(user_id)
            .ok_or(NgError::SessionNotFound)?;
        self.get_local_session_id_for_mut(*session_id)
    }

    fn get_local_session_id_for_mut(&self, session_id: u64) -> Result<usize, NgError> {
        let _ = Self::is_local_session(session_id)
            .then_some(true)
            .ok_or(NgError::SessionNotFound)?;
        let session_id = Self::to_real_session_id(session_id) as usize;
        if session_id >= self.opened_sessions_list.len() {
            return Err(NgError::InvalidArgument);
        }
        Ok(session_id)
    }

    fn get_real_session_id_for_mut(&self, session_id: u64) -> Result<(usize, bool), NgError> {
        let is_remote = Self::is_remote_session(session_id);
        let session_id = Self::to_real_session_id(session_id) as usize;
        if is_remote {
            if session_id >= self.remote_sessions_list.len() {
                return Err(NgError::InvalidArgument);
            }
        } else {
            if session_id >= self.opened_sessions_list.len() {
                return Err(NgError::InvalidArgument);
            }
        }
        Ok((session_id, is_remote))
    }

    fn get_session(&self, session_id: u64) -> Result<&Session, NgError> {
        let _ = Self::is_local_session(session_id)
            .then_some(true)
            .ok_or(NgError::SessionNotFound)?;
        let session_id = Self::to_real_session_id(session_id);
        if session_id as usize >= self.opened_sessions_list.len() {
            return Err(NgError::InvalidArgument);
        }
        self.opened_sessions_list[session_id as usize]
            .as_ref()
            .ok_or(NgError::SessionNotFound)
    }

    #[allow(dead_code)]
    fn get_headless_session(&self, session_id: u64) -> Result<&HeadlessSession, NgError> {
        self.err_if_not_headless()?;

        self.headless_sessions
            .get(&session_id)
            .ok_or(NgError::SessionNotFound)
    }

    #[allow(dead_code)]
    fn get_headless_session_by_user(&self, user_id: &UserId) -> Result<&HeadlessSession, NgError> {
        self.err_if_not_headless()?;

        let session_id = self
            .opened_sessions
            .get(user_id)
            .ok_or(NgError::SessionNotFound)?;

        self.get_headless_session(*session_id)
    }

    fn remove_headless_session(
        &mut self,
        user_id: &UserId,
    ) -> Result<(u64, HeadlessSession), NgError> {
        self.err_if_not_headless()?;

        let session_id = self
            .opened_sessions
            .remove(user_id)
            .ok_or(NgError::SessionNotFound)?;

        let session = self
            .headless_sessions
            .remove(&session_id)
            .ok_or(NgError::SessionNotFound)?;
        Ok((session_id, session))
    }

    #[allow(dead_code)]
    fn get_remote_session(&self, session_id: u64) -> Result<&RemoteSession, NgError> {
        let _ = Self::is_remote_session(session_id)
            .then_some(true)
            .ok_or(NgError::SessionNotFound)?;
        let session_id = Self::to_real_session_id(session_id);
        if session_id as usize >= self.remote_sessions_list.len() {
            return Err(NgError::InvalidArgument);
        }
        self.remote_sessions_list[session_id as usize]
            .as_ref()
            .ok_or(NgError::SessionNotFound)
    }

    pub fn get_site_store_of_session(
        &self,
        session: &Session,
        store_type: SiteStoreType,
    ) -> Result<PubKey, NgError> {
        self.err_if_headless()?;

        match self.opened_wallets.get(&session.config.wallet_name()) {
            Some(opened_wallet) => {
                let user_id = session.config.user_id();
                let site = opened_wallet.wallet.site(&user_id)?;
                Ok(site.get_site_store_id(store_type))
            }
            None => Err(NgError::WalletNotFound),
        }
    }

    async fn verifier_config_type_from_session_config(
        &self,
        config: &SessionConfig,
    ) -> Result<VerifierConfigType, NgError> {
        Ok(match config {
            SessionConfig::HeadlessV0(_) => {
                panic!("don't call verifier_config_type_from_session_config with a SessionConfig::HeadlessV0");
            }
            _ => match (config.verifier_type(), &self.config) {
                (VerifierType::Memory, LocalBrokerConfig::InMemory) => VerifierConfigType::Memory,
                (VerifierType::Memory, LocalBrokerConfig::BasePath(_)) => {
                    VerifierConfigType::Memory
                }
                #[cfg(all(not(target_family = "wasm")))]
                (VerifierType::Save, LocalBrokerConfig::BasePath(base)) => {
                    let mut path = base.clone();
                    path.push(format!("user{}", config.user_id().to_hash_string()));
                    VerifierConfigType::RocksDb(path)
                }
                (VerifierType::Remote(to), _) => VerifierConfigType::Remote(*to),
                (VerifierType::WebRocksDb, _) => VerifierConfigType::WebRocksDb,
                (VerifierType::Memory, LocalBrokerConfig::JsStorage(_)) => {
                    VerifierConfigType::Memory
                }
                (VerifierType::Save, LocalBrokerConfig::JsStorage(js)) => {
                    VerifierConfigType::JsSaveSession(js.get_js_storage_config())
                }
                (_, _) => panic!("invalid combination in verifier_config_type_from_session_config"),
            },
        })
    }

    fn get_wallet_and_session(
        &self,
        user_id: &UserId,
    ) -> Result<(&SensitiveWallet, &Session), NgError> {
        let session_idx = self.user_to_local_session_id_for_mut(user_id)?;
        let session = self.opened_sessions_list[session_idx]
            .as_ref()
            .ok_or(NgError::SessionNotFound)?;
        let wallet = &match &session.config {
            SessionConfig::WithCredentialsV0(_) | SessionConfig::HeadlessV0(_) => {
                panic!("don't call get_wallet_and_session on a Headless or WithCredentials config")
            }
            SessionConfig::V0(v0) => self
                .opened_wallets
                .get(&v0.wallet_name)
                .ok_or(NgError::WalletNotFound),
        }?
        .wallet;

        Ok((wallet, session))
    }

    fn get_session_mut(&mut self, user_id: &UserId) -> Result<&mut Session, NgError> {
        let session_idx = self.user_to_local_session_id_for_mut(user_id)?;
        self.opened_sessions_list[session_idx]
            .as_mut()
            .ok_or(NgError::SessionNotFound)
    }

    async fn disconnect_session(&mut self, user_id: &PubKey) -> Result<(), NgError> {
        match self.opened_sessions.get(user_id) {
            Some(session) => {
                let session = self.get_local_session_id_for_mut(*session)?;
                // TODO: change the logic here once it will be possible to have several users connected at the same time
                Broker::close_all_connections().await;
                let session = self.opened_sessions_list[session]
                    .as_mut()
                    .ok_or(NgError::SessionNotFound)?;
                session.verifier.connection_lost();
            }
            None => {}
        }
        Ok(())
    }

    async fn wallet_was_opened(
        &mut self,
        mut wallet: SensitiveWallet,
    ) -> Result<ClientV0, NgError> {
        let broker = self;

        //log_info!("wallet_was_opened {}", wallet.id());

        match broker.opened_wallets.get(&wallet.id()) {
            Some(opened_wallet) => {
                return Ok(opened_wallet.wallet.client().to_owned().unwrap());
            }
            None => {} //Err(NgError::WalletAlreadyOpened);
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
            #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
            {
                let key_material = wallet
                    .client()
                    .as_ref()
                    .unwrap()
                    .sensitive_client_storage
                    .priv_key
                    .slice();
                let path = broker.config.compute_path(&format!(
                    "block{}",
                    wallet.client().as_ref().unwrap().id.to_hash_string()
                ))?;
                let key: [u8; 32] =
                    derive_key("NextGraph Client BlockStorage BLAKE3 key", key_material);

                Arc::new(std::sync::RwLock::new(RocksDbBlockStorage::open(
                    &path, key,
                )?))
                    as Arc<std::sync::RwLock<dyn BlockStorage + Send + Sync + 'static>>
            }
            #[cfg(any(target_family = "wasm", docsrs))]
            {
                Arc::new(std::sync::RwLock::new(HashMapBlockStorage::new()))
                    as Arc<std::sync::RwLock<dyn BlockStorage + Send + Sync + 'static>>
            }
        };
        let client = wallet.client().to_owned().unwrap();
        let opened_wallet = OpenedWallet {
            wallet,
            block_storage,
        };
        //log_info!("inserted wallet_was_opened {}", wallet_id);
        broker.opened_wallets.insert(wallet_id, opened_wallet);
        Ok(client)
    }

    fn add_session(&mut self, session: Session) -> Result<SessionInfo, NgError> {
        let private_store_id = NuriV0::to_store_nuri_string(
            &self.get_site_store_of_session(&session, SiteStoreType::Private)?,
        );
        let protected_store_id = NuriV0::to_store_nuri_string(
            &self.get_site_store_of_session(&session, SiteStoreType::Protected)?,
        );
        let public_store_id = NuriV0::to_store_nuri_string(
            &self.get_site_store_of_session(&session, SiteStoreType::Public)?,
        );

        let user_id = session.config.user_id();

        self.opened_sessions_list.push(Some(session));
        let mut idx = self.opened_sessions_list.len() - 1;
        idx = idx << 1;
        idx += 1;
        self.opened_sessions.insert(user_id, idx as u64);

        Ok(SessionInfo {
            session_id: idx as u64,
            user: user_id,
            private_store_id,
            protected_store_id,
            public_store_id,
        })
    }

    fn add_headless_session(&mut self, session: HeadlessSession) -> Result<SessionInfo, NgError> {
        let user_id = session.user_id;

        let mut first_available: u64 = 0;
        for sess in self.headless_sessions.keys() {
            if *sess != first_available + 1 {
                break;
            } else {
                first_available += 1;
            }
        }
        first_available += 1;

        let ret = self.headless_sessions.insert(first_available, session);
        assert!(ret.is_none());

        self.opened_sessions.insert(user_id, first_available);

        Ok(SessionInfo {
            session_id: first_available,
            user: user_id,
            private_store_id: String::new(), // will be updated when the AppSessionStart reply arrives from broker
            protected_store_id: String::new(),
            public_store_id: String::new(),
        })
    }

    async fn session_start(
        &mut self,
        mut config: SessionConfig,
        user_priv_key: Option<PrivKey>,
    ) -> Result<Session, NgError> {
        let broker = self;

        let wallet_name: String = config.wallet_name();

        {
            match broker.wallets.get(&wallet_name) {
                Some(closed_wallet) => {
                    if closed_wallet.in_memory {
                        config.force_in_memory();
                    }
                }
                None => return Err(NgError::WalletNotFound),
            }
        }

        config.valid_verifier_config_for_local_broker_config(&broker.config)?;

        let wallet_id: PubKey = (*wallet_name).try_into()?;
        let user_id = config.user_id();

        // log_info!("wallet_name {} {:?}", wallet_name, broker.opened_wallets);
        match broker.opened_wallets.get(&wallet_name) {
            None => return Err(NgError::WalletNotFound),
            Some(opened_wallet) => {
                let block_storage = Arc::clone(&opened_wallet.block_storage);
                let credentials = match opened_wallet.wallet.individual_site(&user_id) {
                    Some(creds) => creds,
                    None => match user_priv_key {
                        Some(user_pk) => (user_pk, None, None, None, None),
                        None => return Err(NgError::NotFound),
                    },
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
                        if config.is_memory() {
                            let session = SessionPeerStorageV0::new(user_id);
                            broker.sessions.insert(user_id, session);
                            broker.sessions.get(&user_id).unwrap()
                        } else {
                            // first check if there is a saved SessionWalletStorage
                            let mut sws = match &broker.config {
                                LocalBrokerConfig::InMemory => {
                                    panic!("cannot open saved session")
                                }
                                LocalBrokerConfig::JsStorage(js_config) => {
                                    // read session wallet storage from JsStorage
                                    let res = (js_config.session_read)(format!(
                                        "ng_wallet@{}",
                                        wallet_name
                                    ));
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
                                    path.push(format!("session{}", wallet_name.clone()));
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
                                LocalBrokerConfig::Headless(_) => {
                                    panic!("don't call session_start on a Headless LocalBroker")
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
                                        path.push(format!("session{}", wallet_name));
                                        //log_debug!("{}", path.clone().display());
                                        write(path.clone(), &new_sws)
                                            .map_err(|_| NgError::IoError)?;
                                    }
                                    LocalBrokerConfig::Headless(_) => {
                                        panic!("don't call session_start on a Headless LocalBroker")
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
                // log_info!(
                //     "USER MASTER KEY {user_id} {} {:?}",
                //     user_id.to_hash_string(),
                //     key
                // );

                let locator = if let Ok(site) = opened_wallet.wallet.site(&user_id) {
                    let core = site.cores[0]; //TODO: cycle the other cores if failure to connect (failover)
                    let brokers = opened_wallet.wallet.broker(core.0)?;
                    BrokerInfoV0::vec_into_locator(brokers)
                } else {
                    Locator::empty()
                };

                key_material.zeroize();
                let mut verifier = Verifier::new(
                    VerifierConfig {
                        config_type: broker
                            .verifier_config_type_from_session_config(&config)
                            .await?,
                        user_master_key: key,
                        peer_priv_key: session.peer_key.clone(),
                        user_priv_key: credentials.0,
                        private_store_read_cap: credentials.1,
                        private_store_id: credentials.2,
                        protected_store_id: credentials.3,
                        public_store_id: credentials.4,
                        locator,
                    },
                    block_storage,
                )?;
                key.zeroize();

                //load verifier from local_storage (if rocks_db)
                let _ = verifier.load();
                let session = Session {
                    config,
                    peer_key: session.peer_key.clone(),
                    last_wallet_nonce: session.last_wallet_nonce,
                    verifier,
                };
                Ok(session)
            }
        }
    }

    pub(crate) fn wallet_save(broker: &mut Self) -> Result<(), NgError> {
        let wallets_to_be_saved = broker
            .wallets
            .iter()
            .filter(|(_, w)| !w.in_memory)
            .map(|(a, b)| (a.clone(), b.clone()))
            .collect();
        match &broker.config {
            LocalBrokerConfig::JsStorage(js_config) => {
                // JS save
                let lws_ser = LocalWalletStorage::v0_to_vec(&wallets_to_be_saved);
                let encoded = base64_url::encode(&lws_ser);
                (js_config.local_write)("ng_wallets".to_string(), encoded)?;
            }
            LocalBrokerConfig::BasePath(base_path) => {
                // save on disk
                // TODO: use https://lib.rs/crates/keyring instead of AppLocalData on Tauri apps
                let mut path = base_path.clone();
                std::fs::create_dir_all(path.clone()).unwrap();
                path.push("wallets");

                let lws_ser = LocalWalletStorage::v0_to_vec(&wallets_to_be_saved);
                let r = write(path.clone(), &lws_ser);
                if r.is_err() {
                    log_err!("write error {:?} {}", path, r.unwrap_err());
                    return Err(NgError::IoError);
                }
            }
            _ => return Err(NgError::CannotSaveWhenInMemoryConfig),
        }
        Ok(())
    }
}

static LOCAL_BROKER: OnceCell<Result<Arc<RwLock<LocalBroker>>, NgError>> = OnceCell::new();

pub type ConfigInitFn = dyn Fn() -> LocalBrokerConfig + 'static + Sync + Send;

async fn init_(config: LocalBrokerConfig) -> Result<Arc<RwLock<LocalBroker>>, NgError> {
    let wallets = match &config {
        LocalBrokerConfig::InMemory | LocalBrokerConfig::Headless(_) => HashMap::new(),
        LocalBrokerConfig::BasePath(base_path) => {
            // load the wallets and sessions from disk
            let mut path = base_path.clone();
            path.push("wallets");
            let map_ser = read(path.clone());
            if map_ser.is_ok() {
                let wallets = LocalWalletStorage::v0_from_vec(&map_ser.unwrap());
                if wallets.is_err() {
                    log_err!(
                        "Load BasePath LocalWalletStorage error: {:?}",
                        wallets.unwrap_err()
                    );
                    let _ = remove_file(path);
                    HashMap::new()
                } else {
                    let LocalWalletStorage::V0(wallets) = wallets.unwrap();
                    wallets
                }
            } else {
                HashMap::new()
            }
        }
        LocalBrokerConfig::JsStorage(js_storage_config) => {
            // load the wallets from JsStorage
            match (js_storage_config.local_read)("ng_wallets".to_string()) {
                Err(_) => HashMap::new(),
                Ok(wallets_string) => {
                    match base64_url::decode(&wallets_string)
                        .map_err(|_| NgError::SerializationError)
                    {
                        Err(e) => {
                            log_err!("Load wallets error: {:?}", e);
                            (js_storage_config.clear)();
                            HashMap::new()
                        }
                        Ok(map_ser) => match serde_bare::from_slice(&map_ser) {
                            Err(e) => {
                                log_err!("Load JS LocalWalletStorage error: {:?}", e);
                                (js_storage_config.clear)();
                                HashMap::new()
                            }
                            Ok(wallets) => {
                                let LocalWalletStorage::V0(v0) = wallets;
                                v0
                            }
                        },
                    }
                }
            }
        }
    };
    let (disconnections_sender, disconnections_receiver) = mpsc::unbounded::<String>();

    let (localbroker_pump_sender, broker_pump_receiver) = mpsc::unbounded::<LocalBrokerMessage>();

    let mut local_broker = LocalBroker {
        config,
        wallets,
        opened_wallets: HashMap::new(),
        sessions: HashMap::new(),
        opened_sessions: HashMap::new(),
        opened_sessions_list: vec![],
        remote_sessions_list: vec![],
        headless_sessions: BTreeMap::new(),
        tauri_streams: HashMap::new(),
        disconnections_sender,
        disconnections_receiver: Some(disconnections_receiver),
        headless_connected_to_remote_broker: false,
        pump_cond: None,
    };

    local_broker.init_pump(broker_pump_receiver);
    //log_debug!("{:?}", &local_broker);

    let broker = Arc::new(RwLock::new(local_broker));

    BROKER
        .write()
        .await
        .set_local_broker(localbroker_pump_sender);

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

#[doc(hidden)]
pub async fn tauri_stream_add(stream_id: String, cancel: CancelFn) -> Result<(), NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    broker.tauri_stream_add(stream_id, cancel);
    Ok(())
}

#[doc(hidden)]
pub async fn tauri_stream_cancel(stream_id: String) -> Result<(), NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    broker.tauri_stream_cancel(stream_id);
    Ok(())
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
/// Wallets are transferable to other devices (see [wallet_get_file] and [wallet_import])
pub async fn wallet_create_v0(params: CreateWalletV0) -> Result<CreateWalletResultV0, NgError> {
    // TODO: entering sub-block to release the lock asap
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };
    if params.local_save && broker.config.is_in_memory() {
        return Err(NgError::CannotSaveWhenInMemoryConfig);
    }
    let in_memory = !params.local_save;

    let intermediate = create_wallet_first_step_v0(params)?;
    let lws: LocalWalletStorageV0 = (&intermediate).into();

    let wallet_name = intermediate.wallet_name.clone();
    broker.wallets.insert(wallet_name, lws);

    let sensitive_wallet: SensitiveWallet = (&intermediate).into();

    let _client = broker.wallet_was_opened(sensitive_wallet).await?;

    let session_config = SessionConfig::new_for_local_broker_config(
        &intermediate.user_privkey.to_pub(),
        &intermediate.wallet_name,
        &broker.config,
        intermediate.in_memory,
    )?;

    let mut session = broker
        .session_start(session_config, Some(intermediate.user_privkey.clone()))
        .await?;

    // let session = broker.opened_sessions_list[session_info.session_id as usize]
    //     .as_mut()
    //     .unwrap();
    let with_pdf = intermediate.pdf;
    let pin = intermediate.pin;
    let (mut res, site, brokers) =
        create_wallet_second_step_v0(intermediate, &mut session.verifier).await?;

    if with_pdf {
        let wallet_recovery =
            wallet_to_wallet_recovery(&res.wallet, res.pazzle.clone(), res.mnemonic, pin);

        if let Ok(pdf_buffer) = wallet_recovery_pdf(wallet_recovery, 600).await {
            res.pdf_file = pdf_buffer;
        };
    }

    //log_info!("VERIFIER DUMP {:?}", session.verifier);

    broker.wallets.get_mut(&res.wallet_name).unwrap().wallet = res.wallet.clone();
    if !in_memory {
        LocalBroker::wallet_save(&mut broker)?;
    }
    broker
        .opened_wallets
        .get_mut(&res.wallet_name)
        .unwrap()
        .wallet
        .complete_with_site_and_brokers(site, brokers);

    let session_info = broker.add_session(session)?;

    res.session_id = session_info.session_id;
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
            //log_info!("adding wallet {:?}", v0);
            broker.wallets.extend(v0);
        }
        _ => {}
    }
    Ok(())
}

#[doc(hidden)]
/// This should not be used by programmers. Only here because the JS SDK needs it.
///
/// It will throw an error if you use it.
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
        LocalBroker::wallet_save(&mut broker)?;
    }
    Ok(())
}

pub fn wallet_to_wallet_recovery(
    wallet: &Wallet,
    pazzle: Vec<u8>,
    mnemonic: [u16; 12],
    pin: [u8; 4],
) -> NgQRCodeWalletRecoveryV0 {
    match wallet {
        Wallet::V0(v0) => {
            let mut content = v0.content.clone();
            content.security_img = vec![];
            content.security_txt = String::new();
            NgQRCodeWalletRecoveryV0 {
                wallet: serde_bare::to_vec(&content).unwrap(),
                pazzle,
                mnemonic,
                pin,
            }
        }
        _ => unimplemented!(),
    }
}

/// Generates the Recovery PDF containing the Wallet, PIN, Pazzle and Mnemonic.
pub async fn wallet_recovery_pdf(
    recovery: NgQRCodeWalletRecoveryV0,
    size: u32,
) -> Result<Vec<u8>, NgError> {
    let ser = serde_bare::to_vec(&recovery)?;
    if ser.len() > 2_953 {
        return Err(NgError::InvalidPayload);
    }
    let recovery_str = base64_url::encode(&ser);
    let wallet_svg = match QrCode::with_error_correction_level(&ser, qrcode::EcLevel::M) {
        Ok(qr) => {
            let svg = qr
                .render()
                .max_dimensions(size, size)
                .dark_color(svg::Color("#000000"))
                .light_color(svg::Color("#ffffff"))
                .build();
            svg
        }
        Err(_e) => return Err(NgError::BrokerError),
    };

    let options = svg2pdf::usvg::Options::default();
    let tree = svg2pdf::usvg::Tree::from_str(&wallet_svg, &options)
        .map_err(|e| NgError::WalletError(e.to_string()))?;

    let (chunk, qrcode_ref) = svg2pdf::to_chunk(&tree, ConversionOptions::default());
    //let pdf_buf = svg2pdf::to_pdf(&tree, ConversionOptions::default(), PageOptions::default());

    // Define some indirect reference ids we'll use.
    let catalog_id = Ref::new(1000);
    let page_tree_id = Ref::new(1001);
    let page_id = Ref::new(1002);
    let font_id = Ref::new(1003);
    let content_id = Ref::new(1004);
    let font_name = Name(b"F1");
    let qrcode_name = Name(b"Im1");

    let chunks = recovery_str
        .as_bytes()
        .chunks(92)
        .map(|buf| buf)
        .collect::<Vec<&[u8]>>();

    let mut content = Content::new();

    for (line, string) in chunks.iter().enumerate() {
        content.begin_text();
        content.set_font(font_name, 10.0);
        content.next_line(20.0, 810.0 - line as f32 * 15.0);
        content.show(Str(*string));
        content.end_text();
    }

    let pazzle: Vec<String> = display_pazzle(&recovery.pazzle)
        .iter()
        .map(|p| p.1.to_string())
        .collect();
    let mnemonic = display_mnemonic(&recovery.mnemonic);

    let credentials = format!(
        "PIN:{}{}{}{} PAZZLE:{} MNEMONIC:{}",
        recovery.pin[0],
        recovery.pin[1],
        recovery.pin[2],
        recovery.pin[3],
        pazzle.join(" "),
        mnemonic.join(" ")
    );

    let chunks = credentials
        .as_bytes()
        .chunks(92)
        .map(|buf| buf)
        .collect::<Vec<&[u8]>>();

    for (line, string) in chunks.iter().enumerate() {
        content.begin_text();
        content.set_font(font_name, 10.0);
        content.next_line(20.0, 630.0 - line as f32 * 15.0);
        content.show(Str(*string));
        content.end_text();
    }

    content.save_state();
    content.transform([595.0, 0.0, 0.0, 595.0, 0.0, 0.0]);
    content.x_object(qrcode_name);
    content.restore_state();

    // Write a document catalog and a page tree with one A4 page .
    let mut pdf = Pdf::new();
    pdf.stream(content_id, &content.finish());
    pdf.catalog(catalog_id).pages(page_tree_id);
    pdf.pages(page_tree_id).kids([page_id]).count(1);
    {
        let mut page = pdf.page(page_id);
        let mut page_resources = page
            .parent(page_tree_id)
            .media_box(Rect::new(0.0, 0.0, 595.0, 842.0))
            .resources();
        page_resources.fonts().pair(font_name, font_id);
        page_resources.x_objects().pair(qrcode_name, qrcode_ref);
        page_resources.finish();

        page.contents(content_id);
        page.finish();
    }
    pdf.type1_font(font_id).base_font(Name(b"Courier"));
    pdf.extend(&chunk);
    let pdf_buf = pdf.finish();

    Ok(pdf_buf)
}

#[cfg(debug_assertions)]
lazy_static! {
    static ref NEXTGRAPH_EU: BrokerServerV0 = BrokerServerV0 {
        server_type: BrokerServerTypeV0::Localhost(14400),
        can_verify: false,
        can_forward: false,
        peer_id: ng_repo::utils::decode_key({
            use crate::local_broker_dev_env::PEER_ID;
            PEER_ID
        })
        .unwrap(),
    };
}

#[cfg(not(debug_assertions))]
lazy_static! {
    static ref NEXTGRAPH_EU: BrokerServerV0 = BrokerServerV0 {
        server_type: BrokerServerTypeV0::Domain("nextgraph.eu".to_string()),
        can_verify: false,
        can_forward: false,
        peer_id: ng_repo::utils::decode_key("LZn-rQD_NUNxrWT_hBXeHk6cjI6WAy-knRVOdovIjwsA")
            .unwrap(),
    };
}

/// Obtains a Wallet object from a QRCode or a TextCode.
///
/// The returned object can be used to import the wallet into a new Device
/// with the help of the function [wallet_open_with_pazzle_words]
/// followed by [wallet_import]
pub async fn wallet_import_from_code(code: String) -> Result<Wallet, NgError> {
    let qr = NgQRCode::from_code(code.trim().to_string())?;
    match qr {
        NgQRCode::WalletTransferV0(NgQRCodeWalletTransferV0 {
            broker,
            rendezvous,
            secret_key,
            is_rendezvous,
        }) => {
            let wallet: ExportedWallet = do_ext_call(
                &broker,
                ExtWalletGetExportV0 {
                    id: rendezvous,
                    is_rendezvous,
                },
            )
            .await?;

            let mut buf = wallet.0.into_vec();
            encrypt_in_place(&mut buf, *secret_key.slice(), [0; 12]);
            let wallet: Wallet = serde_bare::from_slice(&buf)?;

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
        }
        _ => Err(NgError::IncompatibleQrCode),
    }
}

/// Starts a rendez-vous to obtain a wallet from other device.
///
/// A rendezvous is used when the device that is importing, doesn't have a camera.
/// The QRCode is displayed on that device, and another device (with camera, and with the wallet) will scan it.
///
/// Returns the QRcode in SVG format, and the code (a string) to be used with [wallet_import_from_code]
pub async fn wallet_import_rendezvous(size: u32) -> Result<(String, String), NgError> {
    let code = NgQRCode::WalletTransferV0(NgQRCodeWalletTransferV0 {
        broker: NEXTGRAPH_EU.clone(),
        rendezvous: SymKey::random(),
        secret_key: SymKey::random(),
        is_rendezvous: true,
    });
    let code_string = code.to_code();

    let code_svg = match QrCode::with_error_correction_level(&code_string, qrcode::EcLevel::M) {
        Ok(qr) => {
            let svg = qr
                .render()
                .max_dimensions(size, size)
                .dark_color(svg::Color("#000000"))
                .light_color(svg::Color("#ffffff"))
                .build();
            svg
        }
        Err(_e) => return Err(NgError::BrokerError),
    };

    Ok((code_svg, code_string))
}

/// Gets the TextCode to display in order to export the wallet of the current session ID
///
/// The ExportedWallet is valid for 5 min.
///
/// Returns the TextCode
pub async fn wallet_export_get_textcode(session_id: u64) -> Result<String, NgError> {
    let broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.read().await,
    };

    match &broker.config {
        LocalBrokerConfig::Headless(_) => return Err(NgError::LocalBrokerIsHeadless),
        _ => {
            let (real_session_id, is_remote) = broker.get_real_session_id_for_mut(session_id)?;

            if is_remote {
                return Err(NgError::NotImplemented);
            } else {
                let session = broker.opened_sessions_list[real_session_id]
                    .as_ref()
                    .ok_or(NgError::SessionNotFound)?;
                let wallet_name = session.config.wallet_name();

                match broker.wallets.get(&wallet_name) {
                    None => Err(NgError::WalletNotFound),
                    Some(lws) => {
                        //let broker = lws.bootstrap.servers().first().unwrap();
                        let wallet = &lws.wallet;
                        let secret_key = SymKey::random();
                        let rendezvous = SymKey::random();
                        let code = NgQRCode::WalletTransferV0(NgQRCodeWalletTransferV0 {
                            broker: NEXTGRAPH_EU.clone(),
                            rendezvous: rendezvous.clone(),
                            secret_key: secret_key.clone(),
                            is_rendezvous: false,
                        });
                        let code_string = code.to_code();
                        let mut wallet_ser = serde_bare::to_vec(wallet)?;
                        encrypt_in_place(&mut wallet_ser, *secret_key.slice(), [0; 12]);
                        let exported_wallet =
                            ExportedWallet(serde_bytes::ByteBuf::from(wallet_ser));
                        match session
                            .verifier
                            .client_request::<WalletPutExport, ()>(WalletPutExport::V0(
                                WalletPutExportV0 {
                                    wallet: exported_wallet,
                                    rendezvous_id: rendezvous,
                                    is_rendezvous: false,
                                },
                            ))
                            .await
                        {
                            Err(e) => Err(e),
                            Ok(SoS::Stream(_)) => Err(NgError::InvalidResponse),
                            Ok(SoS::Single(_)) => Ok(code_string),
                        }
                    }
                }
            }
        }
    }
}

/// Gets the QRcode to display in order to export a wallet of the current session ID
///
/// The ExportedWallet is valid for 5 min.
///
/// Returns the QRcode in SVG format
pub async fn wallet_export_get_qrcode(session_id: u64, size: u32) -> Result<String, NgError> {
    let code_string = wallet_export_get_textcode(session_id).await?;

    let code_svg = match QrCode::with_error_correction_level(&code_string, qrcode::EcLevel::M) {
        Ok(qr) => {
            let svg = qr
                .render()
                .max_dimensions(size, size)
                .dark_color(svg::Color("#000000"))
                .light_color(svg::Color("#ffffff"))
                .build();
            svg
        }
        Err(_e) => return Err(NgError::BrokerError),
    };

    Ok(code_svg)
}

/// Puts the Wallet to the rendezvous ID that was scanned
///
/// The rendezvous ID is valid for 5 min.
pub async fn wallet_export_rendezvous(session_id: u64, code: String) -> Result<(), NgError> {
    let qr = NgQRCode::from_code(code)?;
    match qr {
        NgQRCode::WalletTransferV0(NgQRCodeWalletTransferV0 {
            broker: _,
            rendezvous,
            secret_key,
            is_rendezvous,
        }) => {
            if !is_rendezvous {
                return Err(NgError::NotARendezVous);
            }

            let broker = match LOCAL_BROKER.get() {
                None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
                Some(Ok(broker)) => broker.read().await,
            };

            match &broker.config {
                LocalBrokerConfig::Headless(_) => return Err(NgError::LocalBrokerIsHeadless),
                _ => {
                    let (real_session_id, is_remote) =
                        broker.get_real_session_id_for_mut(session_id)?;

                    if is_remote {
                        return Err(NgError::NotImplemented);
                    } else {
                        let session = broker.opened_sessions_list[real_session_id]
                            .as_ref()
                            .ok_or(NgError::SessionNotFound)?;
                        let wallet_name = session.config.wallet_name();

                        match broker.wallets.get(&wallet_name) {
                            None => Err(NgError::WalletNotFound),
                            Some(lws) => {
                                //let broker = lws.bootstrap.servers().first().unwrap();
                                let wallet = &lws.wallet;

                                let mut wallet_ser = serde_bare::to_vec(wallet)?;
                                encrypt_in_place(&mut wallet_ser, *secret_key.slice(), [0; 12]);
                                let exported_wallet =
                                    ExportedWallet(serde_bytes::ByteBuf::from(wallet_ser));

                                // TODO: send the WalletPutExport client request to the broker received from QRcode. for now it is cheer luck that all clients are connected to nextgraph.eu.
                                // if the user doesn't have an account with nextgraph.eu, their broker should relay the request (core protocol ?)

                                match session
                                    .verifier
                                    .client_request::<WalletPutExport, ()>(WalletPutExport::V0(
                                        WalletPutExportV0 {
                                            wallet: exported_wallet,
                                            rendezvous_id: rendezvous,
                                            is_rendezvous: true,
                                        },
                                    ))
                                    .await
                                {
                                    Err(e) => Err(e),
                                    Ok(SoS::Stream(_)) => Err(NgError::InvalidResponse),
                                    Ok(SoS::Single(_)) => Ok(()),
                                }
                            }
                        }
                    }
                }
            }
        }
        _ => Err(NgError::IncompatibleQrCode),
    }
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

/// Retrieves the the Wallet by its name, to be used for opening it
pub async fn wallet_get(wallet_name: &String) -> Result<Wallet, NgError> {
    let broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.read().await,
    };
    // check that the wallet exists
    match broker.wallets.get(wallet_name) {
        None => Err(NgError::WalletNotFound),
        Some(lws) => Ok(lws.wallet.clone()),
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

/// Opens a wallet by providing an ordered list of mnemonic words, and the pin.
///
/// If you are opening a wallet that is already known to the LocalBroker, you must then call [wallet_was_opened].
/// Otherwise, if you are importing, then you must call [wallet_import].
pub fn wallet_open_with_mnemonic_words(
    wallet: &Wallet,
    mnemonic: &Vec<String>,
    pin: [u8; 4],
) -> Result<SensitiveWallet, NgError> {
    Ok(ng_wallet::open_wallet_with_mnemonic(
        wallet,
        encode_mnemonic(mnemonic)?,
        pin,
    )?)
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
pub async fn wallet_was_opened(wallet: SensitiveWallet) -> Result<ClientV0, NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    broker.wallet_was_opened(wallet).await
}

/// Starts a session with the LocalBroker. The type of verifier is selected at this moment.
///
/// The session is valid even if there is no internet. The local data will be used in this case.
/// wallet_creation_events should be the list of events that was returned by wallet_create_v0
/// Return value is the index of the session, will be used in all the doc_* API calls.
pub async fn session_start(config: SessionConfig) -> Result<SessionInfo, NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    match &broker.config {
        LocalBrokerConfig::Headless(_) => {
            match config {
                SessionConfig::HeadlessV0(user_id) => {

                    broker.err_if_not_headless()?;
                    // establish the connection if not already there?

                    broker.connect_remote_broker().await?;

                    let session = HeadlessSession { user_id: user_id.clone() };
                    let mut session_info = broker.add_headless_session(session)?;

                    let request = AppSessionStart::V0(AppSessionStartV0{
                        session_id: session_info.session_id,
                        credentials: None,
                        user_id,
                        detach: true
                    });

                    let res = broker.send_request_headless(request).await;

                    if res.is_err() {
                        let _ = broker.remove_headless_session(&session_info.user);
                        return Err(res.unwrap_err())
                    }

                    if let Ok(AppResponse::V0(AppResponseV0::SessionStart(AppSessionStartResponse::V0(response)))) = res {
                        session_info.private_store_id = NuriV0::to_store_nuri_string(&response.private_store);
                        session_info.protected_store_id = NuriV0::to_store_nuri_string(&response.protected_store);
                        session_info.public_store_id = NuriV0::to_store_nuri_string(&response.public_store);
                    }

                    Ok(session_info)
                },
                _ => panic!("don't call session_start with a SessionConfig different from HeadlessV0 when the LocalBroker is configured for Headless")
            }
        }
        // TODO: implement SessionConfig::WithCredentials . VerifierType::Remote => it needs to establish a connection to remote here, then send the AppSessionStart in it.
        // also, it is using broker.remote_sessions.get
        _ => {
            if config.is_remote() || config.is_with_credentials() {
                unimplemented!();
            }

            let user_id = config.user_id();
            match broker.opened_sessions.get(&user_id) {
                Some(idx) => {
                    let ses = broker.get_session(*idx);
                    match ses {
                        Ok(sess) => {
                            if !sess.config.is_memory() && config.is_memory() {
                                return Err(NgError::SessionAlreadyStarted); // already started with a different config.
                            } else {
                                return Ok(SessionInfo {
                                    session_id: *idx,
                                    user: user_id,
                                    private_store_id: NuriV0::to_store_nuri_string(
                                        &broker.get_site_store_of_session(
                                            sess,
                                            SiteStoreType::Private,
                                        )?,
                                    ),
                                    protected_store_id: NuriV0::to_store_nuri_string(
                                        &broker.get_site_store_of_session(
                                            sess,
                                            SiteStoreType::Protected,
                                        )?,
                                    ),
                                    public_store_id: NuriV0::to_store_nuri_string(
                                        &broker.get_site_store_of_session(
                                            sess,
                                            SiteStoreType::Public,
                                        )?,
                                    ),
                                });
                            }
                        }
                        Err(_) => {}
                    }
                }
                None => {}
            };

            let session = broker.session_start(config, None).await?;
            broker.add_session(session)
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
    let client_info = get_client_info(ClientType::NativeService);
    user_connect_with_device_info(client_info, &user_id, None).await
}

fn get_client_info(client_type: ClientType) -> ClientInfo {
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

    ClientInfo::new(
        client_type,
        info.to_string(),
        env!("CARGO_PKG_VERSION").to_string(),
    )
}

/// Used internally by JS SDK and Tauri Apps. Do not use "as is". See [user_connect] instead.
#[doc(hidden)]
pub async fn user_connect_with_device_info(
    info: ClientInfo,
    original_user_id: &UserId,
    location: Option<String>,
) -> Result<Vec<(String, String, String, Option<String>, f64)>, NgError> {
    //FIXME: release this write lock much sooner than at the end of the loop of all tries to connect to some servers ?
    // or maybe it is good to block as we dont want concurrent connection attempts potentially to the same server
    let mut local_broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    local_broker.err_if_headless()?;

    let (client, sites, brokers, peer_key) = {
        let (wallet, session) = local_broker.get_wallet_and_session(original_user_id)?;
        match wallet {
            SensitiveWallet::V0(wallet) => (
                wallet.client.clone().unwrap(),
                wallet.sites.clone(),
                wallet.brokers.clone(),
                session.peer_key.clone(),
            ),
        }
    };

    let mut result: Vec<(String, String, String, Option<String>, f64)> = Vec::new();
    let arc_cnx: Arc<Box<dyn IConnect>> = Arc::new(Box::new(ConnectionWebSocket {}));

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
        let peer_id = peer_key.to_pub();
        log_info!(
            "connecting with local peer_id {} for user {}",
            peer_id,
            user_id
        );
        let site = sites.get(&user_id);
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
        let broker = brokers.get(&core.0.to_string());
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
        local_broker.stop_pump().await;
        for broker_info in brokers {
            match broker_info {
                BrokerInfoV0::ServerV0(server) => {
                    let url = server.get_ws_url(&location).await;
                    log_debug!("URL {:?}", url);
                    //Option<(String, Vec<BindAddress>)>
                    if url.is_some() {
                        let url = url.unwrap();
                        if url.1.is_empty() {
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
                            let res = {
                                let session = local_broker.get_session_mut(original_user_id)?;
                                session.verifier.connection_opened(server_key).await
                            };
                            if res.is_err() {
                                let e = res.unwrap_err();
                                log_err!("got error while processing opened connection {:?}", e);
                                Broker::close_all_connections().await;
                                tried.as_mut().unwrap().3 = Some(e.to_string());
                            } else {
                                local_broker.start_pump().await;

                                // try to pop inbox msg
                                let broker = BROKER.read().await;
                                broker
                                    .send_client_event(&Some(*user), &Some(server_key), ClientEvent::InboxPopRequest)
                                    .await?;
                            }
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

    Ok(result)
}

/// Stops the session, that can be resumed later on. All the local data is flushed from RAM.
pub async fn session_stop(user_id: &UserId) -> Result<(), NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    match broker.config {
        LocalBrokerConfig::Headless(_) => {
            let (session_id, _) = broker.remove_headless_session(user_id)?;

            let request = AppSessionStop::V0(AppSessionStopV0 {
                session_id,
                force_close: false,
            });

            broker.send_request_headless::<_, EmptyAppResponse>(request).await?;
        }
        _ => {
            // TODO implement for Remote
            match broker.opened_sessions.remove(user_id) {
                Some(id) => {
                    let _ = broker.get_session(id)?;
                    let real_id = LocalBroker::to_real_session_id(id);
                    broker.opened_sessions_list[real_id as usize].take();
                    // TODO: change the logic here once it will be possible to have several users connected at the same time
                    Broker::close_all_connections().await;
                }
                None => {}
            }
        }
    }

    Ok(())
}

/// Stops the session, that can be resumed later on. All the local data is flushed from RAM.
#[doc(hidden)]
pub async fn session_headless_stop(session_id: u64, force_close: bool) -> Result<(), NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    match broker.config {
        LocalBrokerConfig::Headless(_) => {
            let session = broker
                .headless_sessions
                .remove(&session_id)
                .ok_or(NgError::SessionNotFound)?;

            let _ = broker
                .opened_sessions
                .remove(&session.user_id)
                .ok_or(NgError::SessionNotFound)?;

            let request = AppSessionStop::V0(AppSessionStopV0 {
                session_id,
                force_close,
            });

            broker.send_request_headless::<_, EmptyAppResponse>(request).await?;
        }
        _ => {
            return Err(NgError::LocalBrokerIsNotHeadless);
        }
    }

    Ok(())
}

/// Disconnects the user from the Server Broker(s), but keep all the local data opened and ready.
pub async fn user_disconnect(user_id: &UserId) -> Result<(), NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };
    broker.err_if_headless()?;

    broker.disconnect_session(user_id).await
}

/// Closes a wallet, which means that the pazzle will have to be entered again if the user wants to use it
pub async fn wallet_close(wallet_name: &String) -> Result<(), NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    broker.err_if_headless()?;

    match broker.opened_wallets.remove(wallet_name) {
        Some(mut opened_wallet) => {
            for user in opened_wallet.wallet.site_names() {
                let key: PubKey = (user.as_str()).try_into().unwrap();
                match broker.opened_sessions.remove(&key) {
                    Some(id) => {
                        let session = broker.get_local_session_id_for_mut(id)?;
                        broker.opened_sessions_list[session].take();
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
pub async fn wallet_remove(_wallet_name: String) -> Result<(), NgError> {
    let _broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    _broker.err_if_headless()?;

    todo!();
    // should close the wallet, then remove all the saved sessions and remove the wallet
}

/// fetches a document's content.
pub async fn doc_fetch_repo_subscribe(
    session_id: u64,
    repo_o: String,
) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
    let mut app_req = AppRequest::doc_fetch_repo_subscribe(repo_o)?;
    app_req.set_session_id(session_id);
    app_request_stream(app_req).await
}

// /// fetches the private store home page and subscribes to its updates.
// pub async fn doc_fetch_private(
//     session_id: u64,
// ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
//     let mut broker = match LOCAL_BROKER.get() {
//         None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
//         Some(Ok(broker)) => broker.write().await,
//     };
//     let session_id = self.get_local_session_id_for_mut(session_id)?;
//     let session = broker.opened_sessions_list[session_id]
//         .as_mut()
//         .ok_or(NgError::SessionNotFound)?;

//     session.verifier.doc_fetch_private(true).await
// }

pub async fn doc_sparql_update(
    session_id: u64,
    sparql: String,
    nuri: Option<String>,
) -> Result<Vec<String>, String> {
    let (nuri, base) = if let Some(n) = nuri {
        let nuri = NuriV0::new_from(&n).map_err(|e| e.to_string())?;
        let b = nuri.repo();
        (nuri, Some(b))
    } else {
        (NuriV0::new_private_store_target(), None)
    };

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_write_query(),
        nuri,
        payload: Some(AppRequestPayload::new_sparql_query(sparql, base)),
        session_id,
    });

    let res = app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;
    match res {
        AppResponse::V0(AppResponseV0::Error(e)) => Err(e),
        AppResponse::V0(AppResponseV0::Commits(commits)) => Ok(commits),
        _ => Err(NgError::InvalidResponse.to_string())
    }
}

pub async fn doc_create(
    session_id: u64,
    crdt: String,
    class_name: String,
    destination: String,
    store_type: Option<String>,
    store_repo: Option<String>,
) -> Result<String, NgError> {

    let store_repo = if store_type.is_none() || store_repo.is_none() {
        None
    } else {
        Some(StoreRepo::from_type_and_repo(&store_type.unwrap(), &store_repo.unwrap())?)
    };

    doc_create_with_store_repo(session_id,crdt,class_name,destination,store_repo).await
}

pub async fn doc_create_with_store_repo(
    session_id: u64,
    crdt: String,
    class_name: String,
    destination: String,
    store_repo: Option<StoreRepo>,
) -> Result<String, NgError> {

    let class = BranchCrdt::from(crdt, class_name)?;

    let nuri = if store_repo.is_none() {
        NuriV0::new_private_store_target()
    } else {
        NuriV0::from_store_repo(&store_repo.unwrap())
    };

    let destination = DocCreateDestination::from(destination)?;

    let request = AppRequest::V0(AppRequestV0 {
        session_id,
        command: AppRequestCommandV0::new_create(),
        nuri,
        payload: Some(AppRequestPayload::V0(AppRequestPayloadV0::Create(
            DocCreate {
                class,
                destination,
            },
        ))),
    });

    let response = app_request(request).await?;

    if let AppResponse::V0(AppResponseV0::Nuri(nuri)) = response {
        Ok(nuri)
    } else {
        Err(NgError::InvalidResponse)
    }
}

/// process any type of app request that returns a single value
pub async fn app_request(request: AppRequest) -> Result<AppResponse, NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };
    match &broker.config {
        LocalBrokerConfig::Headless(_) => broker.send_request_headless(request).await,
        _ => {
            let (real_session_id, is_remote) =
                broker.get_real_session_id_for_mut(request.session_id())?;

            if is_remote {
                let session = broker.remote_sessions_list[real_session_id]
                    .as_ref()
                    .ok_or(NgError::SessionNotFound)?;
                session.send_request(request).await
            } else {
                let session = broker.opened_sessions_list[real_session_id]
                    .as_mut()
                    .ok_or(NgError::SessionNotFound)?;
                session.verifier.app_request(request).await
            }
        }
    }
}

/// process any type of app request that returns a stream of values
pub async fn app_request_stream(
    request: AppRequest,
) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };
    match &broker.config {
        LocalBrokerConfig::Headless(_) => broker.send_request_stream_headless(request).await,
        _ => {
            let (real_session_id, is_remote) =
                broker.get_real_session_id_for_mut(request.session_id())?;

            if is_remote {
                let session = broker.remote_sessions_list[real_session_id]
                    .as_ref()
                    .ok_or(NgError::SessionNotFound)?;
                session.send_request_stream(request).await
            } else {
                let session = broker.opened_sessions_list[real_session_id]
                    .as_mut()
                    .ok_or(NgError::SessionNotFound)?;
                session.verifier.app_request_stream(request).await
            }
        }
    }
}

/// retrieves the ID of one of the 3 stores of a the personal Site (3P: public, protected, or private)
pub async fn personal_site_store(
    session_id: u64,
    store_type: SiteStoreType,
) -> Result<PubKey, NgError> {
    let broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.read().await,
    };
    let session = broker.get_session(session_id)?;

    broker.get_site_store_of_session(session, store_type)
}

#[doc(hidden)]
pub async fn take_disconnections_receiver() -> Result<Receiver<String>, NgError> {
    let mut broker = match LOCAL_BROKER.get() {
        None | Some(Err(_)) => return Err(NgError::LocalBrokerNotInitialized),
        Some(Ok(broker)) => broker.write().await,
    };

    broker
        .disconnections_receiver
        .take()
        .ok_or(NgError::BrokerError)
}

async fn do_admin_call<
    A: Into<ProtocolMessage> + Into<AdminRequestContentV0> + std::fmt::Debug + Sync + Send + 'static,
>(
    server_peer_id: DirectPeerId,
    admin_user_key: PrivKey,
    bind_address: BindAddress,
    cmd: A,
) -> Result<AdminResponseContentV0, ProtocolError> {
    let (peer_privk, peer_pubk) = generate_keypair();
    BROKER
        .write()
        .await
        .admin(
            Box::new(ConnectionWebSocket {}),
            peer_privk,
            peer_pubk,
            server_peer_id,
            admin_user_key.to_pub(),
            admin_user_key.clone(),
            bind_address,
            cmd,
        )
        .await
}

async fn do_ext_call<
    A: Into<ProtocolMessage> + Into<ExtRequestContentV0> + std::fmt::Debug + Sync + Send + 'static,
    B: TryFrom<ProtocolMessage, Error = ProtocolError> + std::fmt::Debug + Sync + Send + 'static,
>(
    broker_server: &BrokerServerV0,
    cmd: A,
) -> Result<B, NgError> {
    let (peer_privk, peer_pubk) = generate_keypair();
    Broker::ext(
        Box::new(ConnectionWebSocket {}),
        peer_privk,
        peer_pubk,
        broker_server.peer_id,
        broker_server.get_ws_url(&None).await.unwrap().0, // for now we are only connecting to NextGraph SaaS cloud (nextgraph.eu) so it is safe.
        cmd,
    )
    .await
}

#[doc(hidden)]
pub async fn admin_create_user(
    server_peer_id: DirectPeerId,
    admin_user_key: PrivKey,
    server_addr: BindAddress,
) -> Result<UserId, ProtocolError> {
    let res = do_admin_call(
        server_peer_id,
        admin_user_key,
        server_addr,
        CreateUser::V0(CreateUserV0 {}),
    )
    .await?;

    match res {
        AdminResponseContentV0::UserId(id) => Ok(id),
        _ => Err(ProtocolError::InvalidValue),
    }
}

#[allow(unused_imports)]
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
    use std::env::current_dir;
    use std::fs::read_to_string;
    use std::fs::{create_dir_all, File};
    use std::io::BufReader;
    use std::io::Read;
    use std::io::Write;
    use std::path::Path;

    #[async_std::test]
    async fn output_image_for_test_white() {
        let f = File::open("examples/wallet-security-image-white.png")
            .expect("open of examples/wallet-security-image-white.png");
        let mut reader = BufReader::new(f);
        let mut security_img = Vec::new();
        // Read file into vector.
        reader
            .read_to_end(&mut security_img)
            .expect("read of valid_security_image.jpg");

        log_info!("{:?}", security_img);
    }

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

        //let peer_id = "X0nh-gOTGKSx0yL0LYJviOWRNacyqIzjQW_LKdK6opU";
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
            pdf: false,
            device_name: "test".to_string(),
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

    #[async_std::test]
    async fn gen_opened_wallet_file_for_test() {
        let wallet_file = read("tests/wallet.ngw").expect("read wallet file");

        init_local_broker(Box::new(|| LocalBrokerConfig::InMemory)).await;

        let wallet = wallet_read_file(wallet_file)
            .await
            .expect("wallet_read_file");

        let pazzle_string = read_to_string("tests/wallet.pazzle").expect("read pazzle file");
        let pazzle_words = pazzle_string.split(' ').map(|s| s.to_string()).collect();

        let opened_wallet = wallet_open_with_pazzle_words(&wallet, &pazzle_words, [1, 2, 1, 2])
            .expect("opening of wallet");

        let mut file =
            File::create("tests/opened_wallet.ngw").expect("open for write opened_wallet file");
        let ser = serde_bare::to_vec(&opened_wallet).expect("serialization of opened wallet");

        file.write_all(&ser).expect("write of opened_wallet file");
    }

    #[ignore]
    #[async_std::test]
    async fn gen_opened_wallet_file_for_test_with_pazzle_array() {
        let wallet_file = read("tests/wallet.ngw").expect("read wallet file");

        init_local_broker(Box::new(|| LocalBrokerConfig::InMemory)).await;

        let wallet = wallet_read_file(wallet_file)
            .await
            .expect("wallet_read_file");

        let pazzle = vec![8, 21, 135, 65, 123, 52, 0, 35, 108];
        let opened_wallet = wallet_open_with_pazzle(&wallet, pazzle, [1, 2, 1, 2]);

        assert_eq!(opened_wallet.unwrap_err(), NgError::EncryptionError);

        // let mut file =
        //     File::create("tests/opened_wallet.ngw").expect("open for write opened_wallet file");
        // let ser = serde_bare::to_vec(&opened_wallet).expect("serialization of opened wallet");

        // file.write_all(&ser).expect("write of opened_wallet file");
    }

    #[ignore]
    #[async_std::test]
    async fn import_session_for_test_to_disk() {
        let wallet_file = read("tests/wallet.ngw").expect("read wallet file");
        let opened_wallet_file = read("tests/opened_wallet.ngw").expect("read opened_wallet file");
        let opened_wallet: SensitiveWallet =
            serde_bare::from_slice(&opened_wallet_file).expect("deserialization of opened_wallet");

        let mut current_path = current_dir().expect("cur_dir");
        current_path.push("..");
        current_path.push(".ng");
        current_path.push("example");
        create_dir_all(current_path.clone()).expect("create_dir");

        // initialize the local_broker with config to save to disk in a folder called `.ng/example` in the current directory
        init_local_broker(Box::new(move || {
            LocalBrokerConfig::BasePath(current_path.clone())
        }))
        .await;

        let wallet = wallet_read_file(wallet_file)
            .await
            .expect("wallet_read_file");

        let wallet_name = wallet.name();
        let user_id = opened_wallet.personal_identity();

        let _client = wallet_import(wallet, opened_wallet, false)
            .await
            .expect("wallet_import");

        let _session = session_start(SessionConfig::new_in_memory(&user_id, &wallet_name))
            .await
            .expect("");
    }

    async fn import_session_for_test() -> (UserId, String) {
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
        let (user_id, wallet_name) = import_session_for_test().await;

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

    #[async_std::test]
    async fn recovery_pdf() {
        let wallet_file = read("tests/wallet.ngw").expect("read wallet file");

        init_local_broker(Box::new(|| LocalBrokerConfig::InMemory)).await;

        let wallet = wallet_read_file(wallet_file)
            .await
            .expect("wallet_read_file");

        let pazzle_string = read_to_string("tests/wallet.pazzle").expect("read pazzle file");
        let pazzle_words = pazzle_string.split(' ').map(|s| s.to_string()).collect();

        let mnemonic_string = read_to_string("tests/wallet.mnemonic").expect("read mnemonic file");
        let mnemonic_words = mnemonic_string.split(' ').map(|s| s.to_string()).collect();

        let pin: [u8; 4] = [1, 2, 1, 2];

        let pazzle = encode_pazzle(&pazzle_words).expect("encode_pazzle");
        let mnemonic = encode_mnemonic(&mnemonic_words).expect("encode_mnemonic");

        let wallet_recovery = wallet_to_wallet_recovery(&wallet, pazzle, mnemonic, pin);
        let pdf_buffer = wallet_recovery_pdf(wallet_recovery, 600)
            .await
            .expect("wallet_recovery_pdf");
        let mut file =
            File::create("tests/recovery.pdf").expect("open for write recovery.pdf file");
        file.write_all(&pdf_buffer).expect("write of recovery.pdf");
    }
}
