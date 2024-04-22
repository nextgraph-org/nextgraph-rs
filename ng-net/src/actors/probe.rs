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

use crate::connection::NoiseFSM;
use crate::types::{ProbeResponse, MAGIC_NG_REQUEST};
use crate::{actor::*, types::ProtocolMessage};
use async_std::sync::Mutex;
use ng_repo::errors::*;
use serde::{Deserialize, Serialize};
use std::any::{Any, TypeId};
use std::sync::Arc;

/// Send to probe if the server is a NextGraph broker.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Probe {}

impl TryFrom<ProtocolMessage> for ProbeResponse {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::ProbeResponse(res) = msg {
            Ok(res)
        } else {
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl TryFrom<ProtocolMessage> for Probe {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::Probe(magic) = msg {
            if magic == MAGIC_NG_REQUEST {
                Ok(Probe {})
            } else {
                Err(ProtocolError::InvalidValue)
            }
        } else {
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<Probe> for ProtocolMessage {
    fn from(msg: Probe) -> ProtocolMessage {
        ProtocolMessage::Probe(MAGIC_NG_REQUEST)
    }
}

impl Actor<'_, Probe, ProbeResponse> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, Probe, ProbeResponse> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = Probe::try_from(msg)?;
        //let res = ProbeResponse()
        //fsm.lock().await.send(res.into()).await?;
        Ok(())
    }
}
