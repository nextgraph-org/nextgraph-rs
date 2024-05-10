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
use ng_repo::types::*;

#[cfg(not(target_arch = "wasm32"))]
use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};

impl PublishEvent {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<PublishEvent, ()>::new_responder(id)
    }

    pub fn new(event: Event, overlay: OverlayId) -> PublishEvent {
        PublishEvent(event, Some(overlay))
    }
    pub fn set_overlay(&mut self, overlay: OverlayId) {
        self.1 = Some(overlay);
    }

    pub fn overlay(&self) -> &OverlayId {
        self.1.as_ref().unwrap()
    }
    pub fn event(&self) -> &Event {
        &self.0
    }
    pub fn take_event(self) -> Event {
        self.0
    }
}

impl TryFrom<ProtocolMessage> for PublishEvent {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let req: ClientRequestContentV0 = msg.try_into()?;
        if let ClientRequestContentV0::PublishEvent(a) = req {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", req);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<PublishEvent> for ProtocolMessage {
    fn from(msg: PublishEvent) -> ProtocolMessage {
        let overlay = msg.1.unwrap();
        ProtocolMessage::from_client_request_v0(ClientRequestContentV0::PublishEvent(msg), overlay)
    }
}

impl Actor<'_, PublishEvent, ()> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, PublishEvent, ()> {
    async fn respond(
        &mut self,
        _msg: ProtocolMessage,
        _fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        #[cfg(not(target_arch = "wasm32"))]
        {
            let req = PublishEvent::try_from(_msg)?;

            // send a ProtocolError if invalid signatures (will disconnect the client)
            req.event().verify()?;

            let broker = BROKER.read().await;
            let overlay = req.overlay().clone();
            let (user_id, remote_peer) = {
                let fsm = _fsm.lock().await;
                (
                    fsm.user_id()?,
                    fsm.remote_peer().ok_or(ProtocolError::ActorError)?,
                )
            };
            let res = broker
                .dispatch_event(&overlay, req.take_event(), &user_id, &remote_peer)
                .await;

            _fsm.lock()
                .await
                .send_in_reply_to(res.into(), self.id())
                .await?;
        }
        Ok(())
    }
}
