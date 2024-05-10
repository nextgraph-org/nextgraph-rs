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

use std::sync::Arc;

use async_std::sync::Mutex;

use ng_repo::errors::*;
use ng_repo::log::*;

use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};

impl BlocksExist {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<BlocksExist, BlocksFound>::new_responder(id)
    }
}

impl TryFrom<ProtocolMessage> for BlocksExist {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let req: ClientRequestContentV0 = msg.try_into()?;
        if let ClientRequestContentV0::BlocksExist(a) = req {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", req);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<BlocksExist> for ProtocolMessage {
    fn from(msg: BlocksExist) -> ProtocolMessage {
        let overlay = *msg.overlay();
        ProtocolMessage::from_client_request_v0(ClientRequestContentV0::BlocksExist(msg), overlay)
    }
}

impl TryFrom<ProtocolMessage> for BlocksFound {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let res: ClientResponseContentV0 = msg.try_into()?;
        if let ClientResponseContentV0::BlocksFound(a) = res {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", res);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<BlocksFound> for ProtocolMessage {
    fn from(b: BlocksFound) -> ProtocolMessage {
        ClientResponseContentV0::BlocksFound(b).into()
    }
}

impl Actor<'_, BlocksExist, BlocksFound> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, BlocksExist, BlocksFound> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = BlocksExist::try_from(msg)?;
        let broker = BROKER.read().await;

        let overlay = req.overlay().clone();
        let mut found = vec![];
        let mut missing = vec![];
        match req {
            BlocksExist::V0(v0) => {
                for block_id in v0.blocks {
                    let r = broker.get_server_broker()?.has_block(&overlay, &block_id);
                    if r.is_err() {
                        missing.push(block_id);
                    } else {
                        found.push(block_id);
                    }
                }
            }
        }
        let res = Ok(BlocksFound::V0(BlocksFoundV0 { found, missing }));

        fsm.lock()
            .await
            .send_in_reply_to(res.into(), self.id())
            .await?;
        Ok(())
    }
}
