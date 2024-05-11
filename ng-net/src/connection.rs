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

//! Finite State Machine of the connection/protocol/Noise channel

//static NOISE_CONFIG: &'static str = "Noise_XK_25519_ChaChaPoly_BLAKE2b";

use std::any::TypeId;
use std::collections::HashMap;
use std::fmt;
use std::sync::Arc;

use async_std::stream::StreamExt;
use async_std::sync::Mutex;
use either::Either;
use futures::{channel::mpsc, select, FutureExt, SinkExt};
use noise_protocol::{patterns::noise_xk, CipherState, HandshakeState};
use noise_rust_crypto::*;
use serde_bare::from_slice;
use unique_id::sequence::SequenceGenerator;
use unique_id::Generator;
use unique_id::GeneratorFromSeed;

use ng_repo::errors::*;
use ng_repo::log::*;
use ng_repo::types::{DirectPeerId, PrivKey, PubKey, UserId, X25519PrivKey};
use ng_repo::utils::sign;
#[cfg(not(target_arch = "wasm32"))]
use ng_repo::utils::verify;

use crate::actor::{Actor, SoS};
use crate::actors::*;
use crate::broker::BROKER;
use crate::types::*;
use crate::utils::*;

#[derive(Debug, Clone)]
pub enum ConnectionCommand {
    Msg(ProtocolMessage),
    Error(NetError),
    ProtocolError(ProtocolError),
    Close,
    ReEnter,
}

impl ConnectionCommand {
    pub fn is_re_enter(&self) -> bool {
        match self {
            Self::ReEnter => true,
            _ => false,
        }
    }
}

#[cfg_attr(target_arch = "wasm32", async_trait::async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait::async_trait)]
pub trait IConnect: Send + Sync {
    async fn open(
        &self,
        url: String,
        peer_privk: PrivKey,
        peer_pubk: PubKey,
        remote_peer: DirectPeerId,
        config: StartConfig,
    ) -> Result<ConnectionBase, ProtocolError>;

    async fn probe(&self, ip: IP, port: u16) -> Result<Option<PubKey>, ProtocolError>;
}

#[cfg_attr(target_arch = "wasm32", async_trait::async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait::async_trait)]
pub trait IAccept: Send + Sync {
    type Socket;
    async fn accept(
        &self,
        remote_bind_address: BindAddress,
        local_bind_address: BindAddress,
        peer_privk: PrivKey,
        socket: Self::Socket,
    ) -> Result<ConnectionBase, NetError>;
}

#[derive(PartialEq, Debug, Clone)]
pub enum ConnectionDir {
    Server,
    Client,
}

impl ConnectionDir {
    pub fn is_server(&self) -> bool {
        *self == ConnectionDir::Server
    }
}

#[derive(Debug, PartialEq)]
pub enum FSMstate {
    Local0,
    Start,
    Probe,
    Relay,
    Noise0, // unused
    Noise1,
    Noise2,
    Noise3,
    AdminRequest,
    ExtRequest,
    ExtResponse,
    ClientHello,
    ServerHello,
    ClientAuth,
    AuthResult,
    Closing,
}

pub struct NoiseFSM {
    state: FSMstate,
    dir: ConnectionDir,
    sender: Sender<ConnectionCommand>,

    /// first is local, second is remote
    #[allow(dead_code)]
    bind_addresses: Option<(BindAddress, BindAddress)>,

    actors: Arc<Mutex<HashMap<i64, Sender<ConnectionCommand>>>>,

    noise_handshake_state: Option<HandshakeState<X25519, ChaCha20Poly1305, Blake2b>>,
    noise_cipher_state_enc: Option<CipherState<ChaCha20Poly1305>>,
    noise_cipher_state_dec: Option<CipherState<ChaCha20Poly1305>>,

    local: Option<PrivKey>,
    remote: Option<PubKey>,

    nonce_for_hello: Vec<u8>,
    config: Option<StartConfig>,

    user: Option<UserId>,
}

impl fmt::Debug for NoiseFSM {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("NoiseFSM")
            .field("state", &self.state)
            .field("dir", &self.dir)
            .finish()
    }
}

pub enum StepReply {
    Responder(ProtocolMessage),
    Response(ProtocolMessage),
    NONE,
    CloseNow,
    ReEnter,
}

#[derive(Debug, Clone)]
pub struct ClientConfig {
    pub url: String,
    //pub user: PubKey,
    pub user_priv: PrivKey,
    pub client_priv: PrivKey,
    pub info: ClientInfo,
    pub name: Option<String>,
    //pub peer_advert: PeerAdvert,
    pub registration: Option<Option<[u8; 32]>>,
}

#[derive(Debug, Clone)]
pub struct ExtConfig {}

#[derive(Debug, Clone)]
pub struct CoreConfig {
    pub addr: BindAddress,
    //pub interface: String,
    pub overlays_config: CoreBrokerConnect,
}

#[derive(Debug, Clone)]
pub struct AdminConfig {
    pub user: PubKey,
    pub user_priv: PrivKey,
    pub addr: BindAddress,
    pub request: AdminRequestContentV0,
}

#[derive(Debug, Clone)]
pub enum StartConfig {
    Probe,
    Relay(BindAddress),
    Client(ClientConfig),
    Ext(ExtConfig),
    Core(CoreConfig),
    Admin(AdminConfig),
}

impl StartConfig {
    pub fn get_url(&self) -> String {
        match self {
            Self::Client(config) => config.url.clone(),
            Self::Admin(config) => format!("ws://{}:{}", config.addr.ip, config.addr.port),
            Self::Core(config) => format!("ws://{}:{}", config.addr.ip, config.addr.port),
            _ => unimplemented!(),
        }
    }
    pub fn get_user(&self) -> Option<PubKey> {
        match self {
            Self::Client(config) => Some(config.user_priv.to_pub()),
            _ => None,
        }
    }
    pub fn is_keep_alive(&self) -> bool {
        match self {
            StartConfig::Core(_) | StartConfig::Client(_) => true,
            _ => false,
        }
    }
    pub fn is_admin(&self) -> bool {
        match self {
            StartConfig::Admin(_) => true,
            _ => false,
        }
    }
}

impl NoiseFSM {
    pub fn new(
        bind_addresses: Option<(BindAddress, BindAddress)>,
        tp: TransportProtocol,
        dir: ConnectionDir,
        actors: Arc<Mutex<HashMap<i64, Sender<ConnectionCommand>>>>,
        sender: Sender<ConnectionCommand>,
        local: Option<PrivKey>,
        remote: Option<PubKey>,
    ) -> Self {
        Self {
            state: if tp == TransportProtocol::Local {
                FSMstate::Local0
            } else {
                FSMstate::Start
            },
            dir,
            bind_addresses,
            actors,
            sender,
            noise_handshake_state: None,
            noise_cipher_state_enc: None,
            noise_cipher_state_dec: None,
            local,
            remote,
            nonce_for_hello: vec![],
            config: None,
            user: None,
        }
    }

    pub fn user_id(&self) -> Result<UserId, ProtocolError> {
        match &self.config {
            Some(start_config) => start_config.get_user().ok_or(ProtocolError::ActorError),
            _ => self.user.ok_or(ProtocolError::ActorError),
        }
    }

    pub fn remote_peer(&self) -> &Option<PubKey> {
        &self.remote
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub(crate) fn set_user_id(&mut self, user: UserId) {
        if self.user.is_none() {
            self.user = Some(user);
        }
    }

    fn decrypt(&mut self, ciphertext: &Noise) -> Result<ProtocolMessage, ProtocolError> {
        let ser = self
            .noise_cipher_state_dec
            .as_mut()
            .unwrap()
            .decrypt_vec(ciphertext.data())
            .map_err(|_e| ProtocolError::DecryptionError)?;

        Ok(from_slice::<ProtocolMessage>(&ser)?)
    }

    fn encrypt(&mut self, plaintext: ProtocolMessage) -> Result<Noise, ProtocolError> {
        let ser = serde_bare::to_vec(&plaintext)?;

        let cipher = self
            .noise_cipher_state_enc
            .as_mut()
            .unwrap()
            .encrypt_vec(&ser);

        Ok(Noise::V0(NoiseV0 { data: cipher }))
    }

    pub async fn remove_actor(&self, id: i64) {
        self.actors.lock().await.remove(&id);
    }

    pub async fn send(&mut self, msg: ProtocolMessage) -> Result<(), ProtocolError> {
        self.send_in_reply_to(msg, 0).await
    }

    pub async fn send_in_reply_to(
        &mut self,
        mut msg: ProtocolMessage,
        in_reply_to: i64,
    ) -> Result<(), ProtocolError> {
        if in_reply_to != 0 {
            msg.set_id(in_reply_to);
        }
        #[cfg(debug_assertions)]
        if msg.is_block() {
            log_debug!("SENDING BLOCK");
        } else {
            log_debug!("SENDING: {:?}", msg);
        }
        if self.noise_cipher_state_enc.is_some() {
            let cipher = self.encrypt(msg)?;
            self.sender
                .send(ConnectionCommand::Msg(ProtocolMessage::Noise(cipher)))
                .await
                .map_err(|_e| ProtocolError::IoError)?;
            return Ok(());
        } else {
            self.sender
                .send(ConnectionCommand::Msg(msg))
                .await
                .map_err(|_e| ProtocolError::IoError)?;
            return Ok(());
        }
    }

    // pub async fn receive(
    //     &mut self,
    //     msg: ProtocolMessage,
    // ) -> Result<ProtocolMessage, ProtocolError> {
    //     if self.state == FSMstate::AuthResult && self.noise_cipher_state.is_some() {
    //         if let ProtocolMessage::Noise(noise) = msg {
    //             let new = self.decrypt(&noise);
    //             Ok(new)
    //         } else {
    //             Err(ProtocolError::MustBeEncrypted)
    //         }
    //     } else {
    //         Err(ProtocolError::InvalidState)
    //     }
    // }

    async fn process_server_noise0(&mut self, noise: &Noise) -> Result<StepReply, ProtocolError> {
        let mut handshake = HandshakeState::<X25519, ChaCha20Poly1305, Blake2b>::new(
            noise_xk(),
            false,
            &[],
            Some(sensitive_from_privkey(self.local.take().unwrap().to_dh())),
            None,
            None,
            None,
        );

        let mut payload = handshake.read_message_vec(noise.data()).map_err(|_e| {
            log_debug!("{:?}", _e);
            ProtocolError::NoiseHandshakeFailed
        })?;

        payload = handshake.write_message_vec(&payload).map_err(|_e| {
            log_debug!("{:?}", _e);
            ProtocolError::NoiseHandshakeFailed
        })?;

        let noise = Noise::V0(NoiseV0 { data: payload });
        self.send(noise.into()).await?;

        self.noise_handshake_state = Some(handshake);

        self.state = FSMstate::Noise2;

        return Ok(StepReply::NONE);
    }

    fn process_server_noise3(&mut self, noise: &Noise) -> Result<(), ProtocolError> {
        let handshake = self.noise_handshake_state.as_mut().unwrap();

        let _ = handshake
            .read_message_vec(noise.data())
            .map_err(|_e| ProtocolError::NoiseHandshakeFailed)?;

        if !handshake.completed() {
            return Err(ProtocolError::NoiseHandshakeFailed);
        }
        let peer_id = handshake.get_rs().unwrap();
        self.remote = Some(PubKey::X25519PubKey(peer_id));

        let ciphers = handshake.get_ciphers();
        self.noise_cipher_state_enc = Some(ciphers.1);
        self.noise_cipher_state_dec = Some(ciphers.0);

        self.noise_handshake_state = None;

        Ok(())
    }

    pub async fn step(
        &mut self,
        mut msg_opt: Option<ProtocolMessage>,
    ) -> Result<StepReply, ProtocolError> {
        if self.noise_cipher_state_dec.is_some() && msg_opt.is_some() {
            if let Some(ProtocolMessage::Noise(noise)) = msg_opt.as_ref() {
                let new = self.decrypt(noise)?;
                msg_opt.replace(new);
            } else {
                return Err(ProtocolError::MustBeEncrypted);
            }
        }
        if msg_opt.is_some() {
            #[cfg(debug_assertions)]
            if msg_opt.as_ref().unwrap().is_block() {
                log_debug!("RECEIVED BLOCK");
            } else {
                log_debug!(
                    "RECEIVED: {:?} in state {:?}",
                    msg_opt.as_ref().unwrap(),
                    self.state
                );
            }
        }
        match self.state {
            FSMstate::Closing => {}
            // TODO verify that ID is zero
            FSMstate::Local0 => {
                // CLIENT LOCAL
                if !self.dir.is_server() && msg_opt.is_none() {
                    self.state = FSMstate::ClientHello;
                    //Box::new(Actor::<ClientHello, ServerHello>::new(0, true));
                    return Ok(StepReply::NONE);
                }
                // SERVER LOCAL
                else if let Some(msg) = msg_opt.as_ref() {
                    if self.dir.is_server() && msg.type_id() == ClientHello::Local.type_id() {
                        self.state = FSMstate::ServerHello;
                        //Box::new(Actor::<ClientHello, ServerHello>::new(msg.id(), false));
                        return Ok(StepReply::NONE);
                    }
                }
            }
            FSMstate::Start => {
                if !self.dir.is_server() && msg_opt.is_none() {
                    // CLIENT START
                    match self.config.as_ref().unwrap() {
                        StartConfig::Probe => {
                            // PROBE REQUEST
                            let request = ProtocolMessage::Probe(MAGIC_NG_REQUEST);
                            self.send(request).await?;
                            self.state = FSMstate::Probe;
                            return Ok(StepReply::NONE);
                        }
                        StartConfig::Relay(_relay_to) => {
                            // RELAY REQUEST
                            //self.state
                            todo!();
                        }
                        _ => {
                            // CLIENT INITIALIZE NOISE
                            let mut handshake =
                                HandshakeState::<X25519, ChaCha20Poly1305, Blake2b>::new(
                                    noise_xk(),
                                    true,
                                    &[],
                                    Some(sensitive_from_privkey(
                                        self.local.take().unwrap().to_dh(),
                                    )),
                                    None,
                                    Some(*self.remote.unwrap().slice()),
                                    None,
                                );

                            let payload = handshake
                                .write_message_vec(&[])
                                .map_err(|_e| ProtocolError::NoiseHandshakeFailed)?;

                            let noise = Noise::V0(NoiseV0 { data: payload });
                            self.send(noise.into()).await?;

                            self.noise_handshake_state = Some(handshake);

                            self.state = FSMstate::Noise1;

                            return Ok(StepReply::NONE);
                        }
                    }
                } else {
                    #[cfg(not(target_arch = "wasm32"))]
                    if let Some(msg) = msg_opt.as_ref() {
                        if self.dir.is_server() {
                            // SERVER START
                            match msg {
                                ProtocolMessage::Probe(magic) => {
                                    // PROBE REQUEST
                                    if *magic != MAGIC_NG_REQUEST {
                                        return Err(ProtocolError::WhereIsTheMagic);
                                    }
                                    let mut probe_response = ProbeResponse {
                                        magic: MAGIC_NG_RESPONSE.to_vec(),
                                        peer_id: None,
                                    };
                                    if BROKER
                                        .read()
                                        .await
                                        .authorize(
                                            &self
                                                .bind_addresses
                                                .ok_or(ProtocolError::BrokerError)?,
                                            Authorization::Discover,
                                        )
                                        .is_ok()
                                    {
                                        probe_response.peer_id = Some(
                                            self.local
                                                .as_ref()
                                                .ok_or(ProtocolError::BrokerError)?
                                                .to_pub(),
                                        );
                                    }
                                    self.send(ProtocolMessage::ProbeResponse(probe_response))
                                        .await?;
                                    self.state = FSMstate::Closing;
                                    sleep!(std::time::Duration::from_secs(2));
                                    return Ok(StepReply::CloseNow);
                                }
                                ProtocolMessage::Relay(_) => {
                                    todo!();
                                }
                                ProtocolMessage::Tunnel(_) => {
                                    self.state = FSMstate::Noise1;
                                    todo!();
                                }
                                ProtocolMessage::Noise(noise) => {
                                    // SERVER INITIALIZE NOISE
                                    return self.process_server_noise0(noise).await;
                                }
                                _ => return Err(ProtocolError::InvalidState),
                            }
                        }
                    }
                }
            }
            FSMstate::Probe => {
                // CLIENT side receiving probe response
                if let Some(msg) = msg_opt {
                    let id = msg.id();
                    if id.is_some() {
                        return Err(ProtocolError::InvalidState);
                    }
                    if let ProtocolMessage::ProbeResponse(_probe_res) = &msg {
                        return Ok(StepReply::Response(msg));
                    }
                }
            }
            FSMstate::Relay => {}

            FSMstate::Noise0 => {
                if let Some(ProtocolMessage::Noise(noise)) = msg_opt.as_ref() {
                    if self.dir.is_server() {
                        return self.process_server_noise0(noise).await;
                    }
                }
            }
            FSMstate::Noise1 => {
                // CLIENT second round NOISE
                if let Some(msg) = msg_opt.as_ref() {
                    if !self.dir.is_server() {
                        if let ProtocolMessage::Noise(noise) = msg {
                            let handshake = self.noise_handshake_state.as_mut().unwrap();

                            let mut payload = handshake
                                .read_message_vec(noise.data())
                                .map_err(|_e| ProtocolError::NoiseHandshakeFailed)?;

                            payload = handshake.write_message_vec(&payload).map_err(|_e| {
                                log_debug!("{:?}", _e);
                                ProtocolError::NoiseHandshakeFailed
                            })?;

                            if !handshake.completed() {
                                return Err(ProtocolError::NoiseHandshakeFailed);
                            }

                            let ciphers = handshake.get_ciphers();

                            let mut next_step = StepReply::NONE;
                            match self.config.as_ref().unwrap() {
                                StartConfig::Client(_client_config) => {
                                    let noise3 =
                                        ClientHello::Noise3(Noise::V0(NoiseV0 { data: payload }));
                                    self.send(noise3.into()).await?;
                                    self.state = FSMstate::ClientHello;
                                }
                                StartConfig::Ext(_ext_config) => {
                                    todo!();
                                }
                                StartConfig::Core(_core_config) => {
                                    todo!();
                                }
                                StartConfig::Admin(_admin_config) => {
                                    let noise = Noise::V0(NoiseV0 { data: payload });
                                    self.send(noise.into()).await?;
                                    self.state = FSMstate::Noise3;
                                    next_step = StepReply::ReEnter;
                                }
                                _ => return Err(ProtocolError::InvalidState),
                            }

                            self.noise_cipher_state_enc = Some(ciphers.0);
                            self.noise_cipher_state_dec = Some(ciphers.1);

                            self.noise_handshake_state = None;

                            return Ok(next_step);
                        }
                    }
                }
            }
            FSMstate::Noise2 => {
                // SERVER second round NOISE
                if let Some(msg) = msg_opt.as_ref() {
                    if self.dir.is_server() {
                        if let ProtocolMessage::Start(StartProtocol::Client(ClientHello::Noise3(
                            noise,
                        ))) = msg
                        {
                            self.process_server_noise3(noise)?;

                            let mut nonce_buf = [0u8; 32];
                            getrandom::getrandom(&mut nonce_buf).unwrap();

                            self.nonce_for_hello = nonce_buf.to_vec();

                            let server_hello = ServerHello::V0(ServerHelloV0 {
                                nonce: self.nonce_for_hello.clone(),
                            });

                            self.state = FSMstate::ServerHello;
                            self.send(server_hello.into()).await?;

                            return Ok(StepReply::NONE);
                        } else if let ProtocolMessage::Noise(noise) = msg {
                            self.process_server_noise3(noise)?;

                            self.state = FSMstate::Noise3;

                            return Ok(StepReply::NONE);
                        }
                    }
                }
            }
            FSMstate::Noise3 => {
                // CLIENT after Noise3, sending StartProtocol
                if msg_opt.is_none() && !self.dir.is_server() {
                    match self.config.as_ref().unwrap() {
                        StartConfig::Client(_) => {
                            return Err(ProtocolError::InvalidState);
                        }
                        StartConfig::Ext(_ext_config) => {
                            todo!();
                        }
                        StartConfig::Core(_core_config) => {
                            todo!();
                        }
                        StartConfig::Admin(admin_config) => {
                            let ser = serde_bare::to_vec(&admin_config.request)?;
                            let sig = sign(&admin_config.user_priv, &admin_config.user, &ser)?;
                            let admin_req = AdminRequestV0 {
                                content: admin_config.request.clone(),
                                id: 0,
                                sig,
                                admin_user: admin_config.user,
                                padding: vec![],
                            };
                            let protocol_start = StartProtocol::Admin(AdminRequest::V0(admin_req));

                            self.send(protocol_start.into()).await?;
                            self.state = FSMstate::AdminRequest;

                            return Ok(StepReply::NONE);
                        }
                        _ => return Err(ProtocolError::InvalidState),
                    }
                } else if self.dir.is_server() {
                    // SERVER after Noise3, receives StartProtocol
                    #[cfg(not(target_arch = "wasm32"))]
                    if let Some(ProtocolMessage::Start(start_msg)) = msg_opt.as_ref() {
                        match start_msg {
                            StartProtocol::Client(_) => {
                                return Err(ProtocolError::InvalidState);
                            }
                            StartProtocol::Ext(_ext_config) => {
                                todo!();
                            }
                            // StartProtocol::Core(core_config) => {
                            //     todo!();
                            // }
                            StartProtocol::Admin(AdminRequest::V0(req)) => {
                                BROKER.read().await.authorize(
                                    &self.bind_addresses.ok_or(ProtocolError::BrokerError)?,
                                    Authorization::Admin(req.admin_user),
                                )?;

                                // PROCESS AdminRequest and send back AdminResponse
                                let ser = serde_bare::to_vec(&req.content)?;

                                let verif = verify(&ser, req.sig, req.admin_user);
                                if verif.is_err() {
                                    let result: ProtocolError = verif.unwrap_err().into();
                                    return Err(result);
                                } else {
                                    self.state = FSMstate::Closing;
                                    return Ok(StepReply::Responder(msg_opt.unwrap()));
                                }
                            }
                            _ => return Err(ProtocolError::InvalidState),
                        }
                    }
                }
            }
            FSMstate::AdminRequest => {
                // CLIENT side receiving AdminResponse
                if let Some(msg) = msg_opt {
                    if self.dir.is_server() || msg.type_id() != TypeId::of::<AdminResponse>() {
                        return Err(ProtocolError::InvalidState);
                    }
                    return Ok(StepReply::Response(msg));
                }
            }
            FSMstate::ExtRequest => {}
            FSMstate::ExtResponse => {}
            FSMstate::ClientHello => {
                if let Some(msg) = msg_opt.as_ref() {
                    if !self.dir.is_server() {
                        if let ProtocolMessage::ServerHello(hello) = msg {
                            if let StartConfig::Client(client_config) =
                                self.config.as_ref().unwrap()
                            {
                                let ClientInfo::V0(info) = &client_config.info;
                                let user_pub = client_config.user_priv.to_pub();
                                let client_pub = client_config.client_priv.to_pub();
                                let content = ClientAuthContentV0 {
                                    user: user_pub,
                                    client: client_pub,
                                    // Nonce from ServerHello
                                    nonce: hello.nonce().clone(),
                                    info: info.clone(),
                                    registration: client_config.registration,
                                };
                                let ser = serde_bare::to_vec(&content)?;
                                let sig = sign(&client_config.user_priv, &user_pub, &ser)?;
                                let client_sig =
                                    sign(&client_config.client_priv, &client_pub, &ser)?;
                                let client_auth = ClientAuth::V0(ClientAuthV0 {
                                    content,
                                    // Signature by user key
                                    sig,
                                    client_sig,
                                });

                                self.state = FSMstate::ClientAuth;
                                self.send(client_auth.into()).await?;

                                return Ok(StepReply::NONE);
                            }
                        }
                    }
                }
            }
            FSMstate::ServerHello => {
                #[cfg(not(target_arch = "wasm32"))]
                if let Some(msg) = msg_opt.as_ref() {
                    if self.dir.is_server() {
                        if let ProtocolMessage::ClientAuth(client_auth) = msg {
                            if *client_auth.nonce() != self.nonce_for_hello {
                                return Err(ProtocolError::InvalidNonce);
                            }

                            let ser = serde_bare::to_vec(&client_auth.content_v0())?;

                            let result; //= ProtocolError::NoError;
                            let verif = verify(&ser, client_auth.sig(), client_auth.user());
                            if verif.is_err() {
                                result = verif.unwrap_err().into();
                            } else {
                                let (local_bind_address, remote_bind_address) =
                                    self.bind_addresses.ok_or(ProtocolError::BrokerError)?;
                                result = BROKER
                                    .write()
                                    .await
                                    .attach_and_authorize_peer_id(
                                        remote_bind_address,
                                        local_bind_address,
                                        *self.remote.unwrap().slice(),
                                        Some(client_auth.content_v0()),
                                        self,
                                    )
                                    .await
                                    .err()
                                    .unwrap_or(ProtocolError::NoError);
                            }
                            let auth_result = AuthResult::V0(AuthResultV0 {
                                result: result.clone() as u16,
                                metadata: vec![],
                            });
                            self.send(auth_result.into()).await?;

                            if result.is_err() {
                                return Err(result);
                            }
                            log_debug!("AUTHENTICATION SUCCESSFUL ! waiting for requests on the server side");
                            self.state = FSMstate::AuthResult;
                            return Ok(StepReply::NONE);
                        }
                    }
                }
            }
            FSMstate::ClientAuth => {
                if let Some(msg) = msg_opt.as_ref() {
                    if !self.dir.is_server() {
                        if let ProtocolMessage::AuthResult(auth_res) = msg {
                            if let StartConfig::Client(_client_config) =
                                self.config.as_ref().unwrap()
                            {
                                if auth_res.result() != 0 {
                                    return Err(ProtocolError::AccessDenied);
                                }

                                self.state = FSMstate::AuthResult;

                                log_debug!("AUTHENTICATION SUCCESSFUL ! waiting for requests on the client side");

                                // we notify the actor "Connecting" that the connection is ready
                                let mut lock = self.actors.lock().await;
                                let exists = lock.remove(&0);
                                match exists {
                                    Some(mut actor_sender) => {
                                        let _ = actor_sender.send(ConnectionCommand::ReEnter).await;
                                    }
                                    _ => {}
                                }

                                return Ok(StepReply::NONE);
                            }
                        }
                    }
                }
            }
            FSMstate::AuthResult => {
                if let Some(msg) = msg_opt {
                    if msg.type_id() != TypeId::of::<ClientMessage>() {
                        return Err(ProtocolError::AccessDenied);
                    }
                    match msg.id() {
                        Some(id) => {
                            if self.dir.is_server() && id > 0 || !self.dir.is_server() && id < 0 {
                                return Ok(StepReply::Responder(msg));
                            } else if id != 0 {
                                return Ok(StepReply::Response(msg));
                            }
                        }
                        None => {
                            if let ProtocolMessage::ClientMessage(cm) = msg {
                                if let Some((event, overlay)) = cm.forwarded_event() {
                                    BROKER
                                        .read()
                                        .await
                                        .get_local_broker()?
                                        .write()
                                        .await
                                        .deliver(event, overlay, self.user_id()?)
                                        .await;
                                    return Ok(StepReply::NONE);
                                }
                            }
                        }
                    }
                }
            }
        }
        Err(ProtocolError::InvalidState)
    }
}

#[derive(Debug)]
pub struct ConnectionBase {
    pub(crate) fsm: Option<Arc<Mutex<NoiseFSM>>>,

    sender: Option<Receiver<ConnectionCommand>>,
    receiver: Option<Sender<ConnectionCommand>>,
    sender_tx: Option<Sender<ConnectionCommand>>,
    receiver_tx: Option<Sender<ConnectionCommand>>,
    shutdown: Option<Receiver<Either<NetError, X25519PrivKey>>>,
    shutdown_sender: Option<Sender<Either<NetError, X25519PrivKey>>>,
    dir: ConnectionDir,
    next_request_id: SequenceGenerator,
    tp: TransportProtocol,

    actors: Arc<Mutex<HashMap<i64, Sender<ConnectionCommand>>>>,
}

impl ConnectionBase {
    pub fn new(dir: ConnectionDir, tp: TransportProtocol) -> Self {
        Self {
            fsm: None,
            receiver: None,
            sender: None,
            sender_tx: None,
            receiver_tx: None,
            shutdown: None,
            shutdown_sender: None,
            next_request_id: SequenceGenerator::new(1),
            dir,
            tp,
            actors: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn transport_protocol(&self) -> TransportProtocol {
        self.tp
    }

    pub fn take_shutdown(&mut self) -> Receiver<Either<NetError, X25519PrivKey>> {
        self.shutdown.take().unwrap()
    }

    pub async fn join_shutdown(&mut self) -> Result<(), NetError> {
        match self.take_shutdown().next().await {
            Some(Either::Left(error)) => Err(error),
            Some(Either::Right(_)) => Ok(()),
            None => Ok(()),
        }
    }

    pub fn release_shutdown(&mut self) {
        self.shutdown_sender = None;
    }

    // only used by accept
    pub async fn reset_shutdown(&mut self, remote_peer_id: X25519PrivKey) {
        let _ = self
            .shutdown_sender
            .take()
            .unwrap()
            .send(Either::Right(remote_peer_id))
            .await;
    }

    pub fn set_shutdown(&mut self) -> Sender<Either<NetError, X25519PrivKey>> {
        let (shutdown_sender, shutdown_receiver) =
            mpsc::unbounded::<Either<NetError, X25519PrivKey>>();
        self.shutdown = Some(shutdown_receiver);
        self.shutdown_sender = Some(shutdown_sender.clone());
        shutdown_sender
    }

    pub fn take_sender(&mut self) -> Receiver<ConnectionCommand> {
        self.sender.take().unwrap()
    }

    pub fn take_receiver(&mut self) -> Sender<ConnectionCommand> {
        self.receiver.take().unwrap()
    }

    pub fn guard(&mut self, dir: ConnectionDir) -> Result<(), NetError> {
        if self.dir == dir {
            Ok(())
        } else {
            Err(NetError::DirectionAlreadySet)
        }
    }

    async fn read_loop(
        mut receiver_tx: Sender<ConnectionCommand>,
        mut receiver: Receiver<ConnectionCommand>,
        mut sender: Sender<ConnectionCommand>,
        actors: Arc<Mutex<HashMap<i64, Sender<ConnectionCommand>>>>,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> ResultSend<()> {
        while let Some(msg) = receiver.next().await {
            match msg {
                ConnectionCommand::Close
                | ConnectionCommand::Error(_)
                | ConnectionCommand::ProtocolError(_) => {
                    log_debug!("EXIT READ LOOP because : {:?}", msg);
                    let mut lock = actors.lock().await;
                    for actor in lock.values_mut() {
                        _ = actor.send(msg.clone()).await;
                    }
                    break;
                }
                _ => {
                    let res;
                    if let ConnectionCommand::Msg(proto_msg) = msg {
                        {
                            let mut locked_fsm = fsm.lock().await;
                            res = locked_fsm.step(Some(proto_msg)).await;
                        }
                    } else if msg.is_re_enter() {
                        {
                            let mut locked_fsm = fsm.lock().await;
                            res = locked_fsm.step(None).await;
                        }
                    } else {
                        panic!("shouldn't be here. ConnectionCommand in read_loop can only have 5 different variants")
                    }

                    match res {
                        Err(e) => {
                            if sender
                                .send(ConnectionCommand::ProtocolError(e))
                                .await
                                .is_err()
                            {
                                break; //TODO test that sending a ProtocolError effectively closes the connection (with ConnectionCommand::Close)
                            }
                        }
                        Ok(StepReply::CloseNow) => {
                            let _ = sender.send(ConnectionCommand::Close).await;
                            break;
                        }
                        Ok(StepReply::ReEnter) => {
                            let _ = receiver_tx.send(ConnectionCommand::ReEnter).await;
                        }
                        Ok(StepReply::NONE) => {}
                        Ok(StepReply::Responder(responder)) => {
                            let r = responder
                                .get_actor()
                                .respond(responder, Arc::clone(&fsm))
                                .await;
                            if r.is_err() {
                                if sender
                                    .send(ConnectionCommand::ProtocolError(r.unwrap_err()))
                                    .await
                                    .is_err()
                                {
                                    break;
                                }
                            }
                        }
                        Ok(StepReply::Response(response)) => {
                            let mut lock = actors.lock().await;
                            let exists = lock.get_mut(&response.id().unwrap_or(0));
                            match exists {
                                Some(actor_sender) => {
                                    if actor_sender
                                        .send(ConnectionCommand::Msg(response))
                                        .await
                                        .is_err()
                                    {
                                        break;
                                    }
                                }
                                None => {
                                    if sender
                                        .send(ConnectionCommand::ProtocolError(
                                            ProtocolError::ActorError,
                                        ))
                                        .await
                                        .is_err()
                                    {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        log_debug!("END OF READ LOOP");
        let mut lock = actors.lock().await;
        for actor in lock.drain() {
            actor.1.close_channel();
        }
        Ok(())
    }

    pub async fn request<
        A: Into<ProtocolMessage> + std::fmt::Debug + Sync + Send + 'static,
        B: TryFrom<ProtocolMessage, Error = ProtocolError> + std::fmt::Debug + Sync + Send + 'static,
    >(
        &self,
        msg: A,
    ) -> Result<SoS<B>, NgError> {
        if self.fsm.is_none() {
            return Err(NgError::ProtocolError(ProtocolError::FsmNotReady));
        }

        let mut id = self.next_request_id.next_id();
        if self.dir == ConnectionDir::Server {
            id = !id + 1;
        }
        let mut actor = Box::new(Actor::<A, B>::new(id, true));
        self.actors.lock().await.insert(id, actor.get_receiver_tx());
        let mut proto_msg: ProtocolMessage = msg.into();
        proto_msg.set_id(id);
        let res = actor
            .request(proto_msg, Arc::clone(self.fsm.as_ref().unwrap()))
            .await;
        res
    }

    // FIXME: why not use the FSm instead? looks like this is sending messages to the wire, unencrypted.
    // Only final errors are sent this way. but it looks like even those error should be encrypted
    pub async fn send(&mut self, cmd: ConnectionCommand) {
        let _ = self.sender_tx.as_mut().unwrap().send(cmd).await;
    }

    // pub async fn inject(&mut self, cmd: ConnectionCommand) {
    //     let _ = self.receiver_tx.as_mut().unwrap().send(cmd).await;
    // }

    // pub async fn close_streams(&mut self) {
    //     let _ = self.receiver_tx.as_mut().unwrap().close_channel();
    //     let _ = self.sender_tx.as_mut().unwrap().close_channel();
    // }

    pub async fn close(&mut self) {
        log_debug!("closing...");
        self.send(ConnectionCommand::Close).await;
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
    ) -> Result<AdminResponseContentV0, ProtocolError> {
        if !self.dir.is_server() {
            let mut actor = Box::new(Actor::<A, AdminResponse>::new(0, true));
            self.actors.lock().await.insert(0, actor.get_receiver_tx());

            let mut receiver = actor.detach_receiver();
            match receiver.next().await {
                Some(ConnectionCommand::Msg(msg)) => {
                    self.fsm
                        .as_ref()
                        .unwrap()
                        .lock()
                        .await
                        .remove_actor(0)
                        .await;
                    let response: AdminResponse = msg.try_into()?;
                    self.close().await;
                    if response.result() == 0 {
                        return Ok(response.content_v0());
                    }
                    Err(ProtocolError::try_from(response.result()).unwrap())
                }
                Some(ConnectionCommand::ProtocolError(e)) => Err(e),
                Some(ConnectionCommand::Error(e)) => Err(e.into()),
                Some(ConnectionCommand::Close) => Err(ProtocolError::Closing),
                _ => Err(ProtocolError::ActorError),
            }
        } else {
            panic!("cannot call admin on a server-side connection");
        }
    }

    pub async fn probe(&mut self) -> Result<Option<PubKey>, ProtocolError> {
        if !self.dir.is_server() {
            let config = StartConfig::Probe;
            let mut actor = Box::new(Actor::<Probe, ProbeResponse>::new(0, true));
            self.actors.lock().await.insert(0, actor.get_receiver_tx());
            let res;
            {
                let mut fsm = self.fsm.as_ref().unwrap().lock().await;
                fsm.config = Some(config);
                res = fsm.step(None).await;
            }
            if let Err(err) = res {
                self.send(ConnectionCommand::ProtocolError(err.clone()))
                    .await;
                return Err(err);
            }
            let mut receiver = actor.detach_receiver();
            let mut shutdown = self.take_shutdown();
            select! {

                res = async_std::future::timeout(std::time::Duration::from_secs(2),receiver.next()).fuse() => {
                    self.fsm
                        .as_mut()
                        .unwrap()
                        .lock()
                        .await
                        .remove_actor(0)
                        .await;
                    match res {
                        Ok(Some(ConnectionCommand::Msg(ProtocolMessage::ProbeResponse(res)))) => {
                            if res.magic == MAGIC_NG_RESPONSE {
                                self.close().await;
                                return Ok(res.peer_id);
                            }
                        }
                        Err(_) => {}
                        _ => {}
                    }
                    self.close().await;
                    return Err(ProtocolError::WhereIsTheMagic);
                },
                _r = shutdown.next().fuse() => {
                    self.fsm
                        .as_mut()
                        .unwrap()
                        .lock()
                        .await
                        .remove_actor(0)
                        .await;
                    return Err(ProtocolError::Closing);
                }
            }
        } else {
            panic!("cannot call probe on a server-side connection");
        }
    }

    pub async fn start(&mut self, config: StartConfig) -> Result<(), ProtocolError> {
        // BOOTSTRAP the protocol from client-side
        if !self.dir.is_server() {
            let is_admin = config.is_admin();
            let res;
            {
                let mut fsm = self.fsm.as_ref().unwrap().lock().await;
                fsm.config = Some(config);
                res = fsm.step(None).await;
            }
            if let Err(err) = res {
                self.send(ConnectionCommand::ProtocolError(err.clone()))
                    .await;
                Err(err)
            } else if !is_admin {
                let mut actor = Box::new(Actor::<Connecting, ()>::new(0, true));
                self.actors.lock().await.insert(0, actor.get_receiver_tx());

                let mut receiver = actor.detach_receiver();
                match receiver.next().await {
                    Some(ConnectionCommand::ReEnter) => Ok(()),
                    Some(ConnectionCommand::ProtocolError(e)) => Err(e),
                    Some(ConnectionCommand::Error(e)) => Err(e.into()),
                    Some(ConnectionCommand::Close) => Err(ProtocolError::Closing),
                    _ => Err(ProtocolError::ActorError),
                }
            } else {
                Ok(())
            }
        } else {
            panic!("cannot call start on a server-side connection");
        }
    }

    pub fn start_read_loop(
        &mut self,
        bind_addresses: Option<(BindAddress, BindAddress)>,
        local: Option<PrivKey>,
        remote: Option<PubKey>,
    ) {
        let (sender_tx, sender_rx) = mpsc::unbounded();
        let (receiver_tx, receiver_rx) = mpsc::unbounded();
        self.sender = Some(sender_rx);
        self.receiver = Some(receiver_tx.clone());
        self.sender_tx = Some(sender_tx.clone());
        self.receiver_tx = Some(receiver_tx.clone());

        let fsm = Arc::new(Mutex::new(NoiseFSM::new(
            bind_addresses,
            self.tp,
            self.dir.clone(),
            Arc::clone(&self.actors),
            sender_tx.clone(),
            local,
            remote,
        )));
        self.fsm = Some(Arc::clone(&fsm));

        spawn_and_log_error(Self::read_loop(
            receiver_tx,
            receiver_rx,
            sender_tx,
            Arc::clone(&self.actors),
            fsm,
        ));
    }
}

#[cfg(test)]
mod test {

    use crate::actors::*;

    use ng_repo::log::*;
    use std::any::{Any, TypeId};

    #[async_std::test]
    pub async fn test_connection() {}

    #[async_std::test]
    pub async fn test_typeid() {
        log_debug!(
            "{:?}",
            ClientHello::Noise3(Noise::V0(NoiseV0 { data: vec![] })).type_id()
        );
        let a = Noise::V0(NoiseV0 { data: [].to_vec() });
        log_debug!("{:?}", a.type_id());
        log_debug!("{:?}", TypeId::of::<Noise>());
        log_debug!("{:?}", ClientHello::Local.type_id());
        log_debug!("{:?}", TypeId::of::<ClientHello>());
    }
}
