use crate::actors::noise::Noise;
use crate::connection::NoiseFSM;
use crate::types::ExtResponse;
use crate::{actor::*, errors::ProtocolError, types::ProtocolMessage};
use async_std::sync::Mutex;
use serde::{Deserialize, Serialize};
use std::any::{Any, TypeId};
use std::sync::Arc;

// pub struct Noise3(Noise);

/// Start chosen protocol
/// First message sent by the client
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum StartProtocol {
    Client(ClientHello),
    Ext(ExtHello),
}

impl StartProtocol {
    pub fn type_id(&self) -> TypeId {
        match self {
            StartProtocol::Client(a) => a.type_id(),
            StartProtocol::Ext(a) => a.type_id(),
        }
    }
    pub fn get_actor(&self) -> Box<dyn EActor> {
        match self {
            StartProtocol::Client(a) => a.get_actor(),
            StartProtocol::Ext(a) => a.get_actor(),
        }
    }
}

/// External Hello (finalizes the Noise handshake and send first ExtRequest)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExtHello {
    // contains the 3rd Noise handshake message "s,se"
    pub noise: Noise,

    /// Noise encrypted payload (an ExtRequest)
    pub payload: Vec<u8>,
}

impl ExtHello {
    pub fn get_actor(&self) -> Box<dyn EActor> {
        Actor::<ExtHello, ExtResponse>::new_responder()
    }
}

// impl BrokerRequest for ExtHello {
//     fn send(&self) -> ProtocolMessage {
//         ProtocolMessage::Start(StartProtocol::Ext(self.clone()))
//     }
// }

impl From<ExtHello> for ProtocolMessage {
    fn from(msg: ExtHello) -> ProtocolMessage {
        ProtocolMessage::Start(StartProtocol::Ext(msg))
    }
}

/// Client Hello
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ClientHello {
    // contains the 3rd Noise handshake message "s,se"
    Noise3(Noise),
    Local,
}

impl ClientHello {
    pub fn type_id(&self) -> TypeId {
        match self {
            ClientHello::Noise3(a) => a.type_id(),
            ClientHello::Local => TypeId::of::<ClientHello>(),
        }
    }
    pub fn get_actor(&self) -> Box<dyn EActor> {
        Actor::<ClientHello, ServerHello>::new_responder()
    }
}

/// Server hello sent upon a client connection
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServerHelloV0 {
    /// Nonce for ClientAuth
    #[serde(with = "serde_bytes")]
    pub nonce: Vec<u8>,
}

/// Server hello sent upon a client connection
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ServerHello {
    V0(ServerHelloV0),
}

impl ServerHello {
    pub fn nonce(&self) -> &Vec<u8> {
        match self {
            ServerHello::V0(o) => &o.nonce,
        }
    }
}

// impl BrokerRequest for ClientHello {
//     fn send(&self) -> ProtocolMessage {
//         ProtocolMessage::Start(StartProtocol::Client(ClientHello::Local))
//     }
// }

impl From<ClientHello> for ProtocolMessage {
    fn from(msg: ClientHello) -> ProtocolMessage {
        ProtocolMessage::Start(StartProtocol::Client(msg))
    }
}

impl TryFrom<ProtocolMessage> for ClientHello {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::Start(StartProtocol::Client(a)) = msg {
            Ok(a)
        } else {
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl TryFrom<ProtocolMessage> for ServerHello {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::ServerHello(server_hello) = msg {
            Ok(server_hello)
        } else {
            Err(ProtocolError::InvalidValue)
        }
    }
}

// impl BrokerRequest for ServerHello {
//     fn send(&self) -> ProtocolMessage {
//         ProtocolMessage::ServerHello(self.clone())
//     }
// }

impl From<ServerHello> for ProtocolMessage {
    fn from(msg: ServerHello) -> ProtocolMessage {
        ProtocolMessage::ServerHello(msg)
    }
}

impl Actor<'_, ClientHello, ServerHello> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, ClientHello, ServerHello> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = ClientHello::try_from(msg)?;
        let res = ServerHello::V0(ServerHelloV0 { nonce: vec![] });
        fsm.lock().await.send(res.into()).await?;
        Ok(())
    }
}

impl Actor<'_, ExtHello, ExtResponse> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, ExtHello, ExtResponse> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        Ok(())
    }
}
