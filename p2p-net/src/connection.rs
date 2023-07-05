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

//static NOISE_CONFIG: &'static str = "Noise_XK_25519_ChaChaPoly_BLAKE2b";

use std::collections::HashMap;
use std::fmt;
use std::sync::Arc;

use crate::actor::{Actor, SoS};
use crate::actors::*;
use crate::broker::BROKER;
use crate::errors::NetError;
use crate::errors::ProtocolError;
use crate::types::*;
use crate::utils::*;
use async_std::future::TimeoutError;
use async_std::stream::StreamExt;
use async_std::sync::Mutex;
use either::Either;
use futures::{channel::mpsc, select, Future, FutureExt, SinkExt};
use noise_protocol::U8Array;
use noise_protocol::{patterns::noise_xk, CipherState, HandshakeState};
use noise_rust_crypto::sensitive::Sensitive;
use noise_rust_crypto::*;
use p2p_repo::log::*;
use p2p_repo::types::{PrivKey, PubKey, X25519PrivKey};
use p2p_repo::utils::{sign, verify};
use serde_bare::from_slice;
use unique_id::sequence::SequenceGenerator;
use unique_id::Generator;
use unique_id::GeneratorFromSeed;

#[derive(Debug, Clone)]
pub enum ConnectionCommand {
    Msg(ProtocolMessage),
    Error(NetError),
    ProtocolError(ProtocolError),
    Close,
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
    ) -> Result<ConnectionBase, NetError>;

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
    Noise3, // unused
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
    bind_addresses: Option<(BindAddress, BindAddress)>,

    actors: Arc<Mutex<HashMap<i64, Sender<ConnectionCommand>>>>,

    noise_handshake_state: Option<HandshakeState<X25519, ChaCha20Poly1305, Blake2b>>,
    noise_cipher_state_enc: Option<CipherState<ChaCha20Poly1305>>,
    noise_cipher_state_dec: Option<CipherState<ChaCha20Poly1305>>,

    local: Option<PrivKey>,
    remote: Option<PubKey>,

    nonce_for_hello: Vec<u8>,
    config: Option<StartConfig>,
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
}

#[derive(PartialEq, Debug, Clone)]
pub struct ClientConfig {
    pub url: String,
    pub user: PubKey,
    pub user_priv: PrivKey,
    pub client: PubKey,
    pub client_priv: PrivKey,
    pub info: ClientInfo,
}

#[derive(PartialEq, Debug, Clone)]
pub struct ExtConfig {}

#[derive(PartialEq, Debug, Clone)]
pub struct CoreConfig {
    pub addr: BindAddress,
    pub interface: String,
}

#[derive(PartialEq, Debug, Clone)]
pub struct AdminConfig {}

#[derive(PartialEq, Debug, Clone)]
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
            Self::Core(config) => format!("ws://{}:{}", config.addr.ip, config.addr.port),
            _ => unimplemented!(),
        }
    }
    pub fn get_user(&self) -> Option<PubKey> {
        match self {
            Self::Client(config) => Some(config.user),
            _ => None,
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
        }
    }

    fn decrypt(&mut self, ciphertext: &Noise) -> Result<ProtocolMessage, ProtocolError> {
        let ser = self
            .noise_cipher_state_dec
            .as_mut()
            .unwrap()
            .decrypt_vec(ciphertext.data())
            .map_err(|e| ProtocolError::DecryptionError)?;

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
        log_debug!("SENDING: {:?}", msg);
        if self.noise_cipher_state_enc.is_some() {
            let cipher = self.encrypt(msg)?;
            self.sender
                .send(ConnectionCommand::Msg(ProtocolMessage::Noise(cipher)))
                .await
                .map_err(|e| ProtocolError::IoError)?;
            return Ok(());
        } else {
            self.sender
                .send(ConnectionCommand::Msg(msg))
                .await
                .map_err(|e| ProtocolError::IoError)?;
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

        let mut payload = handshake.read_message_vec(noise.data()).map_err(|e| {
            log_debug!("{:?}", e);
            ProtocolError::NoiseHandshakeFailed
        })?;

        payload = handshake.write_message_vec(&payload).map_err(|e| {
            log_debug!("{:?}", e);
            ProtocolError::NoiseHandshakeFailed
        })?;

        let noise = Noise::V0(NoiseV0 { data: payload });
        self.send(noise.into()).await?;

        self.noise_handshake_state = Some(handshake);

        self.state = FSMstate::Noise2;

        return Ok(StepReply::NONE);
    }

    pub async fn step(
        &mut self,
        mut msg_opt: Option<ProtocolMessage>,
    ) -> Result<StepReply, ProtocolError> {
        if self.noise_cipher_state_dec.is_some() {
            if let Some(ProtocolMessage::Noise(noise)) = msg_opt.as_ref() {
                let new = self.decrypt(noise)?;
                msg_opt.replace(new);
            } else {
                return Err(ProtocolError::MustBeEncrypted);
            }
        }
        if msg_opt.is_some() {
            log_debug!("RECEIVED: {:?}", msg_opt.as_ref().unwrap());
        }
        match self.state {
            FSMstate::Closing => {}
            // TODO verify that ID is zero
            FSMstate::Local0 => {
                // CLIENT LOCAL
                if !self.dir.is_server() && msg_opt.is_none() {
                    self.state = FSMstate::ClientHello;
                    Box::new(Actor::<ClientHello, ServerHello>::new(0, true));
                    return Ok(StepReply::NONE);
                }
                // SERVER LOCAL
                else if let Some(msg) = msg_opt.as_ref() {
                    if self.dir.is_server() && msg.type_id() == ClientHello::Local.type_id() {
                        self.state = FSMstate::ServerHello;
                        Box::new(Actor::<ClientHello, ServerHello>::new(msg.id(), false));
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
                        StartConfig::Relay(relay_to) => {
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
                                .map_err(|e| ProtocolError::NoiseHandshakeFailed)?;

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
                                                .ok_or(ProtocolError::BrokerError)?
                                                .1,
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
                    if id != 0 {
                        return Err(ProtocolError::InvalidState);
                    }
                    if let ProtocolMessage::ProbeResponse(probe_res) = &msg {
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
                                .map_err(|e| ProtocolError::NoiseHandshakeFailed)?;

                            payload = handshake.write_message_vec(&payload).map_err(|e| {
                                log_debug!("{:?}", e);
                                ProtocolError::NoiseHandshakeFailed
                            })?;

                            if !handshake.completed() {
                                return Err(ProtocolError::NoiseHandshakeFailed);
                            }

                            let ciphers = handshake.get_ciphers();

                            match self.config.as_ref().unwrap() {
                                StartConfig::Client(client_config) => {
                                    let noise3 =
                                        ClientHello::Noise3(Noise::V0(NoiseV0 { data: payload }));
                                    self.send(noise3.into()).await?;
                                    self.state = FSMstate::ClientHello;
                                }
                                StartConfig::Ext(ext_config) => {
                                    todo!();
                                }
                                StartConfig::Core(core_config) => {
                                    todo!();
                                }
                                StartConfig::Admin(admin_config) => {
                                    todo!();
                                }
                                _ => return Err(ProtocolError::InvalidState),
                            }

                            self.noise_cipher_state_enc = Some(ciphers.0);
                            self.noise_cipher_state_dec = Some(ciphers.1);

                            self.noise_handshake_state = None;

                            return Ok(StepReply::NONE);
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
                            let handshake = self.noise_handshake_state.as_mut().unwrap();

                            let _ = handshake
                                .read_message_vec(noise.data())
                                .map_err(|e| ProtocolError::NoiseHandshakeFailed)?;

                            if !handshake.completed() {
                                return Err(ProtocolError::NoiseHandshakeFailed);
                            }
                            let peer_id = handshake.get_rs().unwrap();
                            self.remote = Some(PubKey::X25519PubKey(peer_id));

                            let ciphers = handshake.get_ciphers();
                            self.noise_cipher_state_enc = Some(ciphers.1);
                            self.noise_cipher_state_dec = Some(ciphers.0);

                            self.noise_handshake_state = None;

                            let mut nonce_buf = [0u8; 32];
                            getrandom::getrandom(&mut nonce_buf).unwrap();

                            self.nonce_for_hello = nonce_buf.to_vec();

                            let server_hello = ServerHello::V0(ServerHelloV0 {
                                nonce: self.nonce_for_hello.clone(),
                            });

                            self.state = FSMstate::ServerHello;
                            self.send(server_hello.into()).await?;

                            return Ok(StepReply::NONE);
                        }
                    }
                }
            }
            FSMstate::Noise3 => {}
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
                                let content = ClientAuthContentV0 {
                                    user: client_config.user,
                                    client: client_config.client,
                                    /// Nonce from ServerHello
                                    nonce: hello.nonce().clone(),
                                    info: info.clone(),
                                };
                                let ser = serde_bare::to_vec(&content)?;
                                let sig =
                                    sign(&client_config.client_priv, &client_config.client, &ser)?;
                                let client_auth = ClientAuth::V0(ClientAuthV0 {
                                    content,
                                    /// Signature by client key
                                    sig,
                                });

                                self.state = FSMstate::ClientAuth;
                                self.send(client_auth.into()).await?;

                                return Ok(StepReply::NONE);
                            }
                        }
                    }
                }
            }
            FSMstate::ServerHello =>
            {
                #[cfg(not(target_arch = "wasm32"))]
                if let Some(msg) = msg_opt.as_ref() {
                    if self.dir.is_server() {
                        if let ProtocolMessage::ClientAuth(client_auth) = msg {
                            if *client_auth.nonce() != self.nonce_for_hello {
                                return Err(ProtocolError::InvalidNonce);
                            }

                            let ser = serde_bare::to_vec(&client_auth.content_v0())?;

                            let mut result = ProtocolError::NoError;
                            let verif = verify(&ser, client_auth.sig(), client_auth.client());
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

                            if (result.is_err()) {
                                return Err(result);
                            }
                            log_info!("AUTHENTICATION SUCCESSFUL ! waiting for requests on the server side");
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
                            if let StartConfig::Client(client_config) =
                                self.config.as_ref().unwrap()
                            {
                                if auth_res.result() != 0 {
                                    return Err(ProtocolError::AccessDenied);
                                }

                                self.state = FSMstate::AuthResult;

                                log_info!("AUTHENTICATION SUCCESSFUL ! waiting for requests on the client side");

                                return Ok(StepReply::NONE);
                            }
                        }
                    }
                }
            }
            FSMstate::AuthResult => {
                if let Some(msg) = msg_opt {
                    let id = msg.id();
                    if self.dir.is_server() && id > 0 || !self.dir.is_server() && id < 0 {
                        return Ok(StepReply::Responder(msg));
                    } else if id != 0 {
                        return Ok(StepReply::Response(msg));
                    }
                }
            }
        }
        Err(ProtocolError::InvalidState)
    }
}

#[derive(Debug)]
pub struct ConnectionBase {
    fsm: Option<Arc<Mutex<NoiseFSM>>>,

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
                    log_info!("EXIT READ LOOP because : {:?}", msg);
                    break;
                }
                ConnectionCommand::Msg(proto_msg) => {
                    let res;
                    {
                        let mut locked_fsm = fsm.lock().await;
                        res = locked_fsm.step(Some(proto_msg)).await;
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
                            let exists = lock.get_mut(&response.id());
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
        log_info!("END OF READ LOOP");
        Ok(())
    }

    pub async fn request<
        A: Into<ProtocolMessage> + std::fmt::Debug + Sync + Send + 'static,
        B: TryFrom<ProtocolMessage, Error = ProtocolError> + std::fmt::Debug + Sync + Send + 'static,
    >(
        &self,
        msg: A,
    ) -> Result<SoS<B>, ProtocolError> {
        if self.fsm.is_none() {
            return Err(ProtocolError::FsmNotReady);
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
        log_info!("closing...");
        self.send(ConnectionCommand::Close).await;
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
                r = shutdown.next().fuse() => {
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

    pub async fn start(&mut self, config: StartConfig) {
        // BOOTSTRAP the protocol from client-side
        if !self.dir.is_server() {
            let res;
            {
                let mut fsm = self.fsm.as_ref().unwrap().lock().await;
                fsm.config = Some(config);
                res = fsm.step(None).await;
            }
            if let Err(err) = res {
                self.send(ConnectionCommand::ProtocolError(err)).await;
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
        self.receiver_tx = Some(receiver_tx);

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
            receiver_rx,
            sender_tx,
            Arc::clone(&self.actors),
            fsm,
        ));
    }
}

mod test {

    use crate::actor::*;
    use crate::actors::*;
    use crate::types::*;
    use p2p_repo::log::*;
    use std::any::{Any, TypeId};

    #[async_std::test]
    pub async fn test_connection() {}

    #[async_std::test]
    pub async fn test_typeid() {
        log_info!(
            "{:?}",
            ClientHello::Noise3(Noise::V0(NoiseV0 { data: vec![] })).type_id()
        );
        let a = Noise::V0(NoiseV0 { data: [].to_vec() });
        log_info!("{:?}", a.type_id());
        log_info!("{:?}", TypeId::of::<Noise>());
        log_info!("{:?}", ClientHello::Local.type_id());
        log_info!("{:?}", TypeId::of::<ClientHello>());
    }
}
