use std::sync::Arc;

use crate::{actor::*, connection::NoiseFSM, errors::ProtocolError, types::ProtocolMessage};
use async_std::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NoiseV0 {
    // contains the handshake messages or the encrypted content of a ProtocolMessage
    pub data: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum Noise {
    V0(NoiseV0),
}

impl BrokerRequest for Noise {
    fn send(&self) -> ProtocolMessage {
        ProtocolMessage::Noise(self.clone())
    }
}

impl TryFrom<ProtocolMessage> for Noise {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::Noise(n) = msg {
            Ok(n)
        } else {
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl Actor<'_, Noise, Noise> {}

// impl IActor for Actor<'_, Noise, Noise> {
//     // fn process_request(&self, req: Box<dyn BrokerRequest>) -> Box<dyn BrokerResponse> {
//     //     //let r = req as Noise;
//     // }
// }

#[async_trait::async_trait]
impl EActor for Actor<'_, Noise, Noise> {
    // fn process_request(&self, req: Box<dyn BrokerRequest>) -> Box<dyn BrokerResponse> {
    //     //let r = req as Noise;
    // }

    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        Ok(())
    }
}
