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
use async_std::stream::StreamExt;
use async_std::sync::Mutex;
use futures::{channel::mpsc, select, Future, FutureExt, SinkExt};
use noise_protocol::U8Array;
use noise_protocol::{patterns::noise_xk, CipherState, HandshakeState};
use noise_rust_crypto::sensitive::Sensitive;
use noise_rust_crypto::*;
use p2p_repo::log::*;
use p2p_repo::types::{PrivKey, PubKey};
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
        ip: IP,
        peer_privk: Sensitive<[u8; 32]>,
        peer_pubk: PubKey,
        remote_peer: DirectPeerId,
        config: StartConfig,
    ) -> Result<ConnectionBase, NetError>;
}

#[cfg_attr(target_arch = "wasm32", async_trait::async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait::async_trait)]
pub trait IAccept: Send + Sync {
    type Socket;
    async fn accept(
        &self,
        remote_bind_address: BindAddress,
        local_bind_address: BindAddress,
        peer_privk: Sensitive<[u8; 32]>,
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
    Noise0,
    Noise1,
    Noise2,
    Noise3, // unused
    ExtRequest,
    ExtResponse,
    ClientHello,
    ServerHello,
    ClientAuth,
    AuthResult,
}

pub struct NoiseFSM {
    state: FSMstate,
    dir: ConnectionDir,
    sender: Sender<ConnectionCommand>,

    bind_addresses: Option<(BindAddress, BindAddress)>,

    actors: Arc<Mutex<HashMap<i64, Sender<ConnectionCommand>>>>,

    noise_handshake_state: Option<HandshakeState<X25519, ChaCha20Poly1305, Blake2b>>,
    noise_cipher_state_enc: Option<CipherState<ChaCha20Poly1305>>,
    noise_cipher_state_dec: Option<CipherState<ChaCha20Poly1305>>,

    from: Option<Sensitive<[u8; 32]>>,
    to: Option<PubKey>,

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
}

pub struct ClientConfig {
    pub user: PubKey,
    pub client: PubKey,
    pub client_priv: PrivKey,
}

pub struct ExtConfig {}

pub struct CoreConfig {}

pub struct AdminConfig {}

pub enum StartConfig {
    Client(ClientConfig),
    Ext(ExtConfig),
    Core(CoreConfig),
    Admin(AdminConfig),
}

impl NoiseFSM {
    pub fn new(
        bind_addresses: Option<(BindAddress, BindAddress)>,
        tp: TransportProtocol,
        dir: ConnectionDir,
        actors: Arc<Mutex<HashMap<i64, Sender<ConnectionCommand>>>>,
        sender: Sender<ConnectionCommand>,
        from: Sensitive<[u8; 32]>,
        to: Option<PubKey>,
    ) -> Self {
        Self {
            state: if tp == TransportProtocol::Local {
                FSMstate::Local0
            } else {
                FSMstate::Noise0
            },
            dir,
            bind_addresses,
            actors,
            sender,
            noise_handshake_state: None,
            noise_cipher_state_enc: None,
            noise_cipher_state_dec: None,
            from: Some(from),
            to,
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
        log_trace!("SENDING: {:?}", msg);
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
            log_trace!("RECEIVED: {:?}", msg_opt.as_ref().unwrap());
        }
        match self.state {
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
            FSMstate::Noise0 => {
                // CLIENT INITIALIZE NOISE
                if !self.dir.is_server() && msg_opt.is_none() {
                    let mut handshake = HandshakeState::<X25519, ChaCha20Poly1305, Blake2b>::new(
                        noise_xk(),
                        true,
                        &[],
                        Some(from_ed_priv_to_dh_priv(self.from.take().unwrap())),
                        None,
                        Some(*self.to.unwrap().to_dh_from_ed().slice()),
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
                // SERVER INITIALIZE NOISE
                else if let Some(msg) = msg_opt.as_ref() {
                    if self.dir.is_server() {
                        if let ProtocolMessage::Noise(noise) = msg {
                            let mut handshake =
                                HandshakeState::<X25519, ChaCha20Poly1305, Blake2b>::new(
                                    noise_xk(),
                                    false,
                                    &[],
                                    Some(from_ed_priv_to_dh_priv(self.from.take().unwrap())),
                                    None,
                                    None,
                                    None,
                                );

                            let mut payload =
                                handshake.read_message_vec(noise.data()).map_err(|e| {
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
                            let peer_id = PubKey::Ed25519PubKey(handshake.get_rs().unwrap());
                            self.to = Some(peer_id);
                            let (local_bind_address, remote_bind_address) =
                                self.bind_addresses.ok_or(ProtocolError::BrokerError)?;
                            BROKER
                                .write()
                                .await
                                .attach_peer_id(
                                    remote_bind_address,
                                    local_bind_address,
                                    peer_id,
                                    None,
                                )
                                .await
                                .map_err(|_| ProtocolError::BrokerError)?;

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
                                let content = ClientAuthContentV0 {
                                    user: client_config.user,
                                    client: client_config.client,
                                    /// Nonce from ServerHello
                                    nonce: hello.nonce().clone(),
                                };
                                let ser = serde_bare::to_vec(&content)?;
                                let sig =
                                    sign(client_config.client_priv, client_config.client, &ser)?;
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
            FSMstate::ServerHello => {
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

                                // TODO check that the device has been registered for this user. if not, set result = AccessDenied
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
    shutdown: Option<Receiver<NetError>>,
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
            next_request_id: SequenceGenerator::new(1),
            dir,
            tp,
            actors: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn transport_protocol(&self) -> TransportProtocol {
        self.tp
    }

    pub fn take_shutdown(&mut self) -> Receiver<NetError> {
        self.shutdown.take().unwrap()
    }

    pub async fn join_shutdown(&mut self) -> Result<(), NetError> {
        match self.take_shutdown().next().await {
            Some(error) => Err(error),
            None => Ok(()),
        }
    }

    pub fn set_shutdown(&mut self) -> Sender<NetError> {
        let (shutdown_sender, shutdown_receiver) = mpsc::unbounded::<NetError>();
        self.shutdown = Some(shutdown_receiver);
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
        from: Sensitive<[u8; 32]>,
        to: Option<PubKey>,
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
            from,
            to,
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
