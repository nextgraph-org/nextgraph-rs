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

use std::sync::Arc;

use async_std::sync::Mutex;

use ng_repo::errors::*;
use ng_repo::log::*;

use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};

impl RepoPinStatusReq {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<RepoPinStatusReq, RepoPinStatus>::new_responder(id)
    }
}

impl TryFrom<ProtocolMessage> for RepoPinStatusReq {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let req: ClientRequestContentV0 = msg.try_into()?;
        if let ClientRequestContentV0::RepoPinStatusReq(a) = req {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", req);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<RepoPinStatusReq> for ProtocolMessage {
    fn from(msg: RepoPinStatusReq) -> ProtocolMessage {
        let overlay = *msg.overlay();
        ProtocolMessage::from_client_request_v0(
            ClientRequestContentV0::RepoPinStatusReq(msg),
            overlay,
        )
    }
}

impl TryFrom<ProtocolMessage> for RepoPinStatus {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let res: ClientResponseContentV0 = msg.try_into()?;
        if let ClientResponseContentV0::RepoPinStatus(a) = res {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", res);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<RepoPinStatus> for ProtocolMessage {
    fn from(res: RepoPinStatus) -> ProtocolMessage {
        ClientResponseContentV0::RepoPinStatus(res).into()
    }
}

impl Actor<'_, RepoPinStatusReq, RepoPinStatus> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, RepoPinStatusReq, RepoPinStatus> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = RepoPinStatusReq::try_from(msg)?;
        let sb = { BROKER.read().await.get_server_broker()? };
        let res = {
            sb.read().await.get_repo_pin_status(
                req.overlay(),
                req.hash(),
                &fsm.lock().await.user_id()?,
            )
        };
        fsm.lock()
            .await
            .send_in_reply_to(res.into(), self.id())
            .await?;
        Ok(())
    }
}
