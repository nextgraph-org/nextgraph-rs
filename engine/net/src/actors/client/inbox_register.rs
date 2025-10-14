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
use ng_repo::types::OverlayId;
use ng_repo::utils::verify;

use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};

impl InboxRegister {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<InboxRegister, ()>::new_responder(id)
    }
}

impl TryFrom<ProtocolMessage> for InboxRegister {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let req: ClientRequestContentV0 = msg.try_into()?;
        if let ClientRequestContentV0::InboxRegister(a) = req {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", req);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<InboxRegister> for ProtocolMessage {
    fn from(msg: InboxRegister) -> ProtocolMessage {
        ProtocolMessage::from_client_request_v0(
            ClientRequestContentV0::InboxRegister(msg),
            OverlayId::nil(),
        )
    }
}

impl Actor<'_, InboxRegister, ()> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, InboxRegister, ()> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = InboxRegister::try_from(msg)?;

        // verify registration
        if verify(&req.challenge, req.sig, req.inbox_id).is_err() {
            fsm.lock()
                .await
                .send_in_reply_to(Result::<(), _>::Err(ServerError::InvalidSignature).into(), self.id())
                .await?;
            return Ok(())
        }

        let sb = { BROKER.read().await.get_server_broker()? };

        let user_id = {
            let fsm = fsm.lock().await;
            fsm.user_id()?
        };

        let res: Result<(), ServerError> = sb
            .read()
            .await.inbox_register(user_id, req);

        fsm.lock()
            .await
            .send_in_reply_to(res.into(), self.id())
            .await?;
        Ok(())
    }
}
