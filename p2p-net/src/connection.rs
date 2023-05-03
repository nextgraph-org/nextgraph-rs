static NOISE_CONFIG: &'static str = "Noise_XK_25519_ChaChaPoly_BLAKE2b";

use std::collections::HashMap;
use std::fmt;
use std::sync::Arc;

use crate::actor::{Actor, SoS};
use crate::actors::*;
use crate::errors::NetError;
use crate::errors::ProtocolError;
use crate::log;
use crate::types::*;
use crate::utils::*;
use async_std::stream::StreamExt;
use async_std::sync::Mutex;
use futures::{channel::mpsc, select, Future, FutureExt, SinkExt};
use noise_protocol::{CipherState, HandshakeState};
use noise_rust_crypto::*;
use p2p_repo::types::{PrivKey, PubKey};
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
pub trait IConnection: Send + Sync {
    async fn open(
        &self,
        ip: IP,
        peer_pubk: PrivKey,
        peer_privk: PubKey,
        remote_peer: DirectPeerId,
    ) -> Result<ConnectionBase, NetError>;
    async fn accept(&self) -> Result<ConnectionBase, NetError>;
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
    Noise3,
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

    actors: Arc<Mutex<HashMap<i64, Sender<ConnectionCommand>>>>,

    noise_handshake_state: Option<HandshakeState<X25519, ChaCha20Poly1305, Blake2b>>,
    noise_cipher_state: Option<CipherState<ChaCha20Poly1305>>,
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

impl NoiseFSM {
    pub fn new(
        tp: TransportProtocol,
        dir: ConnectionDir,
        actors: Arc<Mutex<HashMap<i64, Sender<ConnectionCommand>>>>,
        sender: Sender<ConnectionCommand>,
    ) -> Self {
        Self {
            state: if tp == TransportProtocol::Local {
                FSMstate::Local0
            } else {
                FSMstate::Noise0
            },
            dir,
            actors,
            sender,
            noise_handshake_state: None,
            noise_cipher_state: None,
        }
    }

    fn decrypt(&mut self, ciphertext: &Noise) -> ProtocolMessage {
        unimplemented!();
    }

    fn encrypt(&mut self, plaintext: ProtocolMessage) -> Noise {
        unimplemented!();
    }

    pub async fn remove_actor(&self, id: i64) {
        self.actors.lock().await.remove(&id);
    }

    pub async fn send(&mut self, msg: ProtocolMessage) -> Result<(), ProtocolError> {
        if self.state == FSMstate::AuthResult && self.noise_cipher_state.is_some() {
            let cipher = self.encrypt(msg);
            self.sender
                .send(ConnectionCommand::Msg(ProtocolMessage::Noise(cipher)))
                .await;
            return Ok(());
        } else {
            return Err(ProtocolError::InvalidState);
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

    pub fn step(
        &mut self,
        mut msg_opt: Option<ProtocolMessage>,
    ) -> Result<StepReply, ProtocolError> {
        if self.noise_cipher_state.is_some() {
            if let Some(ProtocolMessage::Noise(noise)) = msg_opt.as_ref() {
                let new = self.decrypt(noise);
                msg_opt.replace(new);
            } else {
                return Err(ProtocolError::MustBeEncrypted);
            }
        }
        match self.state {
            // TODO verify that ID is zero
            FSMstate::Local0 => {
                if let Some(msg) = msg_opt.as_ref() {
                    if self.dir.is_server() && msg.type_id() == ClientHello::Local.type_id() {
                        self.state = FSMstate::ServerHello;
                        Box::new(Actor::<ClientHello, ServerHello>::new(msg.id(), false));
                        return Ok(StepReply::NONE);
                    }
                } else if !self.dir.is_server() && msg_opt.is_none() {
                    self.state = FSMstate::ClientHello;
                    Box::new(Actor::<ClientHello, ServerHello>::new(0, true));
                    return Ok(StepReply::NONE);
                }
            }
            FSMstate::Noise0 => {}
            FSMstate::Noise1 => {}
            FSMstate::Noise2 => {}
            FSMstate::Noise3 => {} //set noise_handshake_state to none
            FSMstate::ExtRequest => {}
            FSMstate::ExtResponse => {}
            FSMstate::ClientHello => {}
            FSMstate::ServerHello => {}
            FSMstate::ClientAuth => {}
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
            log!("RECEIVED: {:?}", msg);

            if let ConnectionCommand::Close = msg {
                log!("EXIT READ LOOP");
                break;
            } else if let ConnectionCommand::Msg(proto_msg) = msg {
                let res;
                {
                    let mut locked_fsm = fsm.lock().await;
                    res = locked_fsm.step(Some(proto_msg));
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
        Ok(())
    }

    pub async fn request<
        A: Into<ProtocolMessage> + std::fmt::Debug + Sync + Send + 'static,
        B: TryFrom<ProtocolMessage, Error = ProtocolError> + std::fmt::Debug + Sync + Send + 'static,
    >(
        &self,
        msg: A,
        //stream: Option<A>,
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
        log!("closing...");
        self.send(ConnectionCommand::Close).await;
    }

    pub fn start_read_loop(&mut self) {
        let (sender_tx, sender_rx) = mpsc::unbounded();
        let (receiver_tx, receiver_rx) = mpsc::unbounded();
        self.sender = Some(sender_rx);
        self.receiver = Some(receiver_tx.clone());
        self.sender_tx = Some(sender_tx.clone());
        self.receiver_tx = Some(receiver_tx);

        let fsm = Arc::new(Mutex::new(NoiseFSM::new(
            self.tp,
            self.dir.clone(),
            Arc::clone(&self.actors),
            sender_tx.clone(),
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
    use crate::log;
    use crate::types::*;
    use std::any::{Any, TypeId};

    #[async_std::test]
    pub async fn test_connection() {}

    #[async_std::test]
    pub async fn test_typeid() {
        log!(
            "{:?}",
            ClientHello::Noise3(Noise::V0(NoiseV0 { data: vec![] })).type_id()
        );
        let a = Noise::V0(NoiseV0 { data: [].to_vec() });
        log!("{:?}", a.type_id());
        log!("{:?}", TypeId::of::<Noise>());
        log!("{:?}", ClientHello::Local.type_id());
        log!("{:?}", TypeId::of::<ClientHello>());
    }
}
