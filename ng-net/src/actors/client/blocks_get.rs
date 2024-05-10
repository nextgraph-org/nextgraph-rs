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

use async_recursion::async_recursion;
use async_std::sync::{Mutex, MutexGuard};

use ng_repo::errors::*;
use ng_repo::log::*;
use ng_repo::types::{Block, BlockId, OverlayId};

use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::server_broker::IServerBroker;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};

impl BlocksGet {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<BlocksGet, Block>::new_responder(id)
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

impl TryFrom<ProtocolMessage> for BlocksGet {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let req: ClientRequestContentV0 = msg.try_into()?;
        if let ClientRequestContentV0::BlocksGet(a) = req {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", req);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<BlocksGet> for ProtocolMessage {
    fn from(msg: BlocksGet) -> ProtocolMessage {
        let overlay = *msg.overlay();
        ProtocolMessage::from_client_request_v0(ClientRequestContentV0::BlocksGet(msg), overlay)
    }
}

impl Actor<'_, BlocksGet, Block> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, BlocksGet, Block> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = BlocksGet::try_from(msg)?;
        let broker = BROKER.read().await;
        let server = broker.get_server_broker()?;
        let mut lock = fsm.lock().await;
        let mut something_was_sent = false;

        #[async_recursion]
        async fn process_children(
            children: &Vec<BlockId>,
            server: &Box<dyn IServerBroker + Send + Sync>,
            overlay: &OverlayId,
            lock: &mut MutexGuard<'_, NoiseFSM>,
            req_id: i64,
            include_children: bool,
            something_was_sent: &mut bool,
        ) {
            for block_id in children {
                if let Ok(block) = server.get_block(overlay, block_id) {
                    let grand_children = block.children().to_vec();
                    if let Err(_) = lock.send_in_reply_to(block.into(), req_id).await {
                        break;
                    }
                    *something_was_sent = true;
                    if include_children {
                        process_children(
                            &grand_children,
                            server,
                            overlay,
                            lock,
                            req_id,
                            include_children,
                            something_was_sent,
                        )
                        .await;
                    }
                }
            }
        }
        process_children(
            req.ids(),
            server,
            req.overlay(),
            &mut lock,
            self.id(),
            req.include_children(),
            &mut something_was_sent,
        )
        .await;

        if !something_was_sent {
            let re: Result<(), ServerError> = Err(ServerError::NotFound);
            lock.send_in_reply_to(re.into(), self.id()).await?;
        } else {
            let re: Result<(), ServerError> = Err(ServerError::EndOfStream);
            lock.send_in_reply_to(re.into(), self.id()).await?;
        }

        Ok(())
    }
}
