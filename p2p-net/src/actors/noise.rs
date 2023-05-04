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

use std::sync::Arc;

use crate::{actor::*, connection::NoiseFSM, errors::ProtocolError, types::ProtocolMessage};
use async_std::sync::Mutex;
use serde::{Deserialize, Serialize};
use std::any::{Any, TypeId};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NoiseV0 {
    // contains the handshake messages or the encrypted content of a ProtocolMessage
    pub data: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum Noise {
    V0(NoiseV0),
}

impl Noise {
    pub fn data(&self) -> &[u8] {
        match self {
            Noise::V0(v0) => v0.data.as_slice(),
        }
    }
}

impl From<Noise> for ProtocolMessage {
    fn from(msg: Noise) -> ProtocolMessage {
        ProtocolMessage::Noise(msg)
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

#[async_trait::async_trait]
impl EActor for Actor<'_, Noise, Noise> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        Ok(())
    }
}
