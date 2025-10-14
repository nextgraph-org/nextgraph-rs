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

use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};

impl ClientEvent {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<ClientEvent, ()>::new_responder(id)
    }
}

impl TryFrom<ProtocolMessage> for ClientEvent {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::ClientMessage(ClientMessage::V0(ClientMessageV0 {
            content: ClientMessageContentV0::ClientEvent(e),
            ..
        })) = msg
        {
            Ok(e)
        } else {
            log_debug!("INVALID {:?}", msg);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<ClientEvent> for ProtocolMessage {
    fn from(e: ClientEvent) -> ProtocolMessage {
        ProtocolMessage::ClientMessage(ClientMessage::V0(ClientMessageV0 {
            content: ClientMessageContentV0::ClientEvent(e),
            overlay: OverlayId::nil(),
            padding: vec![],
        }))
    }
}

impl Actor<'_, ClientEvent, ()> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, ClientEvent, ()> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = ClientEvent::try_from(msg)?;
        match req {
            ClientEvent::InboxPopRequest => {
                let sb = { BROKER.read().await.get_server_broker()? };
                let user = { fsm.lock().await.user_id()? };
                let res: Result<InboxMsg, ServerError> =
                    { sb.read().await.inbox_pop_for_user(user).await };

                if let Ok(msg) = res {
                    let _ = fsm
                        .lock()
                        .await
                        .send(ProtocolMessage::ClientMessage(ClientMessage::V0(
                            ClientMessageV0 {
                                overlay: msg.body.to_overlay.clone(),
                                padding: vec![],
                                content: ClientMessageContentV0::InboxReceive {
                                    msg,
                                    from_queue: true,
                                },
                            },
                        )))
                        .await;
                }
            }
        }

        Ok(())
    }
}
