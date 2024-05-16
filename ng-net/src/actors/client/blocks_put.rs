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

impl BlocksPut {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<BlocksPut, ()>::new_responder(id)
    }
}

impl TryFrom<ProtocolMessage> for BlocksPut {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let req: ClientRequestContentV0 = msg.try_into()?;
        if let ClientRequestContentV0::BlocksPut(a) = req {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", req);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<BlocksPut> for ProtocolMessage {
    fn from(msg: BlocksPut) -> ProtocolMessage {
        let overlay = *msg.overlay();
        ProtocolMessage::from_client_request_v0(ClientRequestContentV0::BlocksPut(msg), overlay)
    }
}

impl Actor<'_, BlocksPut, ()> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, BlocksPut, ()> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = BlocksPut::try_from(msg)?;
        let sb = { BROKER.read().await.get_server_broker()? };
        let mut res: Result<(), ServerError> = Ok(());
        let overlay = req.overlay().clone();
        match req {
            BlocksPut::V0(v0) => {
                for block in v0.blocks {
                    let r = sb.read().await.put_block(&overlay, block);
                    if r.is_err() {
                        res = r;
                        break;
                    }
                }
            }
        }

        fsm.lock()
            .await
            .send_in_reply_to(res.into(), self.id())
            .await?;
        Ok(())
    }
}
