static NOISE_CONFIG: &'static str = "Noise_XK_25519_ChaChaPoly_BLAKE2b";

use std::sync::Arc;

use crate::actors::*;
use crate::errors::NetError;
use crate::errors::ProtocolError;
use crate::log;
use crate::types::*;
use crate::utils::*;
use async_std::stream::StreamExt;
use futures::{channel::mpsc, select, Future, FutureExt, SinkExt};
use p2p_repo::types::{PrivKey, PubKey};
use unique_id::sequence::SequenceGenerator;
use unique_id::Generator;
use unique_id::GeneratorFromSeed;

pub type Sender<T> = mpsc::UnboundedSender<T>;
pub type Receiver<T> = mpsc::UnboundedReceiver<T>;

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

#[derive(PartialEq, Debug)]
pub enum ConnectionDir {
    Server,
    Client,
}

#[derive(Debug)]
pub struct ConnectionBase {
    sender: Option<Receiver<ConnectionCommand>>,
    receiver: Option<Sender<ConnectionCommand>>,
    sender_tx: Option<Sender<ConnectionCommand>>,
    receiver_tx: Option<Sender<ConnectionCommand>>,
    shutdown: Option<Receiver<NetError>>,
    dir: ConnectionDir,
    next_request_id: SequenceGenerator,
    tp: TransportProtocol,
}

impl ConnectionBase {
    pub fn new(dir: ConnectionDir, tp: TransportProtocol) -> Self {
        Self {
            receiver: None,
            sender: None,
            sender_tx: None,
            receiver_tx: None,
            shutdown: None,
            next_request_id: SequenceGenerator::new(1),
            dir,
            tp,
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
    ) -> ResultSend<()> {
        while let Some(msg) = receiver.next().await {
            log!("RECEIVED: {:?}", msg);

            // sender
            //     .send(ConnectionCommand::Close)
            //     .await
            //     .map_err(|e| "channel send error")?

            if let ConnectionCommand::Close = msg {
                log!("EXIT READ LOOP");
                break;
            }
        }
        Ok(())
    }

    pub async fn request(&mut self) {
        let mut id = self.next_request_id.next_id();
        if self.dir == ConnectionDir::Server {
            id = !id + 1;
        }
        // id
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

        spawn_and_log_error(Self::read_loop(receiver_rx, sender_tx));
    }
}
