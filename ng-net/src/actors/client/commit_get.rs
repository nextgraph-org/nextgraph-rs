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
use crate::broker::{ServerConfig, BROKER};
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};
use async_std::sync::Mutex;
use ng_repo::errors::*;
use ng_repo::log::*;
use ng_repo::types::{Block, OverlayId, PubKey};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

impl CommitGet {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<CommitGet, Block>::new_responder(id)
    }

    pub fn overlay(&self) -> &OverlayId {
        match self {
            Self::V0(v0) => v0.overlay.as_ref().unwrap(),
        }
    }
    pub fn set_overlay(&mut self, overlay: OverlayId) {
        match self {
            Self::V0(v0) => v0.overlay = Some(overlay),
        }
    }
}

impl TryFrom<ProtocolMessage> for CommitGet {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let req: ClientRequestContentV0 = msg.try_into()?;
        if let ClientRequestContentV0::CommitGet(a) = req {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", req);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<CommitGet> for ProtocolMessage {
    fn from(msg: CommitGet) -> ProtocolMessage {
        let overlay = *msg.overlay();
        ProtocolMessage::from_client_request_v0(ClientRequestContentV0::CommitGet(msg), overlay)
    }
}

impl TryFrom<ProtocolMessage> for Block {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let res: ClientResponseContentV0 = msg.try_into()?;
        if let ClientResponseContentV0::Block(a) = res {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", res);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<Block> for ProtocolMessage {
    fn from(b: Block) -> ProtocolMessage {
        let mut cr: ClientResponse = ClientResponseContentV0::Block(b).into();
        cr.set_result(ServerError::PartialContent.into());
        cr.into()
    }
}

impl Actor<'_, CommitGet, Block> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, CommitGet, Block> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = CommitGet::try_from(msg)?;
        log_info!("GOT CommitGet {:?}", req);
        let broker = BROKER.read().await;
        let blocks_res = broker
            .get_server_broker()?
            .get_commit(req.overlay(), req.id());
        // IF NEEDED, the get_commit could be changed to be async, and then the send_in_reply_to would be also totally async
        match blocks_res {
            Ok(blocks) => {
                if blocks.len() == 0 {
                    let re: Result<(), ServerError> = Err(ServerError::EmptyStream);
                    fsm.lock()
                        .await
                        .send_in_reply_to(re.into(), self.id())
                        .await?;
                    return Ok(());
                }
                let mut lock = fsm.lock().await;

                for block in blocks {
                    lock.send_in_reply_to(block.into(), self.id()).await?;
                }
                let re: Result<(), ServerError> = Err(ServerError::EndOfStream);
                lock.send_in_reply_to(re.into(), self.id()).await?;
            }
            Err(e) => {
                let re: Result<(), ServerError> = Err(e);
                fsm.lock()
                    .await
                    .send_in_reply_to(re.into(), self.id())
                    .await?;
            }
        }

        Ok(())
    }
}
