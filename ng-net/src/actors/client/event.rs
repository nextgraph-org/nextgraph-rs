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
use ng_repo::repo::{BranchInfo, Repo};
use ng_repo::store::Store;
use ng_repo::types::*;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

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

    // pub fn overlay(&self) -> &OverlayId {
    //     self.1.as_ref().unwrap()
    // }
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
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = PublishEvent::try_from(msg)?;

        //TODO implement all the server side logic

        let res: Result<(), ServerError> = Ok(());

        fsm.lock()
            .await
            .send_in_reply_to(res.into(), self.id())
            .await?;
        Ok(())
    }
}
