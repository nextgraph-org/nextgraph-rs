/*
 * Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
*/

use std::any::{Any, TypeId};
use std::sync::Arc;

use async_std::sync::Mutex;
use serde::{Deserialize, Serialize};

use ng_repo::errors::*;
use ng_repo::log::*;
use ng_repo::types::UserId;

use crate::actors::noise::Noise;
use crate::connection::NoiseFSM;
use crate::types::{
    AdminRequest, ClientInfo, CoreBrokerConnect, CoreBrokerConnectResponse, CoreMessage,
    CoreMessageV0, CoreResponse, CoreResponseContentV0, CoreResponseV0, ExtRequest,
};
use crate::{actor::*, types::ProtocolMessage};

// pub struct Noise3(Noise);

/// Start chosen protocol
/// First message sent by the connecting peer
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum StartProtocol {
    Client(ClientHello),
    Ext(ExtRequest),
    Core(CoreHello),
    Admin(AdminRequest),
    App(AppHello),
    AppResponse(AppHelloResponse),
}

impl StartProtocol {
    pub fn type_id(&self) -> TypeId {
        match self {
            StartProtocol::Client(a) => a.type_id(),
            StartProtocol::Core(a) => a.type_id(),
            StartProtocol::Ext(a) => a.type_id(),
            StartProtocol::Admin(a) => a.type_id(),
            StartProtocol::App(a) => a.type_id(),
            StartProtocol::AppResponse(a) => a.type_id(),
        }
    }
    pub fn get_actor(&self) -> Box<dyn EActor> {
        match self {
            StartProtocol::Client(a) => a.get_actor(),
            StartProtocol::Core(a) => a.get_actor(),
            StartProtocol::Ext(a) => a.get_actor(),
            StartProtocol::Admin(a) => a.get_actor(),
            StartProtocol::App(a) => a.get_actor(),
            StartProtocol::AppResponse(_) => panic!("AppResponse is not a request"),
        }
    }
}

impl From<StartProtocol> for ProtocolMessage {
    fn from(msg: StartProtocol) -> ProtocolMessage {
        ProtocolMessage::Start(msg)
    }
}

/// Core Hello (finalizes the Noise handshake and sends CoreConnect)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreHello {
    // contains the 3rd Noise handshake message "s,se"
    pub noise: Noise,

    /// Noise encrypted payload (a CoreMessage::CoreRequest::BrokerConnect)
    #[serde(with = "serde_bytes")]
    pub payload: Vec<u8>,
}

impl CoreHello {
    pub fn get_actor(&self) -> Box<dyn EActor> {
        Actor::<CoreBrokerConnect, CoreBrokerConnectResponse>::new_responder(0)
    }
}

impl TryFrom<ProtocolMessage> for CoreBrokerConnectResponse {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::CoreMessage(CoreMessage::V0(CoreMessageV0::Response(
            CoreResponse::V0(CoreResponseV0 {
                content: CoreResponseContentV0::BrokerConnectResponse(a),
                ..
            }),
        ))) = msg
        {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", msg);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<CoreHello> for ProtocolMessage {
    fn from(msg: CoreHello) -> ProtocolMessage {
        ProtocolMessage::Start(StartProtocol::Core(msg))
    }
}

impl From<CoreBrokerConnect> for ProtocolMessage {
    fn from(_msg: CoreBrokerConnect) -> ProtocolMessage {
        unimplemented!();
    }
}

impl Actor<'_, CoreBrokerConnect, CoreBrokerConnectResponse> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, CoreBrokerConnect, CoreBrokerConnectResponse> {
    async fn respond(
        &mut self,
        _msg: ProtocolMessage,
        _fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        //let req = CoreBrokerConnect::try_from(msg)?;
        // let res = CoreBrokerConnectResponse::V0(CoreBrokerConnectResponseV0 {
        //     successes: vec![],
        //     errors: vec![],
        // });
        // fsm.lock().await.send(res.into()).await?;
        Ok(())
    }
}

// /// External Hello (finalizes the Noise handshake and sends first ExtRequest)
// #[derive(Clone, Debug, Serialize, Deserialize)]
// pub struct ExtHello {
//     // contains the 3rd Noise handshake message "s,se"
//     pub noise: Noise,

//     /// Noise encrypted payload (an ExtRequest)
//     #[serde(with = "serde_bytes")]
//     pub payload: Vec<u8>,
// }

// impl ExtHello {
//     pub fn get_actor(&self) -> Box<dyn EActor> {
//         Actor::<ExtHello, ExtResponse>::new_responder(0)
//     }
// }

// impl From<ExtHello> for ProtocolMessage {
//     fn from(msg: ExtHello) -> ProtocolMessage {
//         ProtocolMessage::Start(StartProtocol::Ext(msg))
//     }
// }

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
        Actor::<ClientHello, ServerHello>::new_responder(0)
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
        let _req = ClientHello::try_from(msg)?;
        let res = ServerHello::V0(ServerHelloV0 { nonce: vec![] });
        fsm.lock().await.send(res.into()).await?;
        Ok(())
    }
}

// impl Actor<'_, ExtHello, ExtResponse> {}

// #[async_trait::async_trait]
// impl EActor for Actor<'_, ExtHello, ExtResponse> {
//     async fn respond(
//         &mut self,
//         _msg: ProtocolMessage,
//         _fsm: Arc<Mutex<NoiseFSM>>,
//     ) -> Result<(), ProtocolError> {
//         Ok(())
//     }
// }

// ///////////// APP HELLO ///////////////

/// App Hello (finalizes the Noise handshake and sends info about device, and the user_id.
/// not signing any nonce because anyway, in the next message "AppSessionRequest", the user_priv_key will be sent and checked again)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppHello {
    // contains the 3rd Noise handshake message "s,se"
    pub noise: Noise,

    pub user: Option<UserId>, // None for Headless

    pub info: ClientInfo,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppHelloResponse {
    pub result: u16,
}

impl AppHello {
    pub fn get_actor(&self) -> Box<dyn EActor> {
        Actor::<AppHello, AppHelloResponse>::new_responder(0)
    }
}

impl From<AppHello> for ProtocolMessage {
    fn from(msg: AppHello) -> ProtocolMessage {
        ProtocolMessage::Start(StartProtocol::App(msg))
    }
}

impl From<AppHelloResponse> for ProtocolMessage {
    fn from(msg: AppHelloResponse) -> ProtocolMessage {
        ProtocolMessage::Start(StartProtocol::AppResponse(msg))
    }
}

impl TryFrom<ProtocolMessage> for AppHelloResponse {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::Start(StartProtocol::AppResponse(res)) = msg {
            Ok(res)
        } else {
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl Actor<'_, AppHello, AppHelloResponse> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, AppHello, AppHelloResponse> {
    async fn respond(
        &mut self,
        _msg: ProtocolMessage,
        _fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        Ok(())
    }
}
