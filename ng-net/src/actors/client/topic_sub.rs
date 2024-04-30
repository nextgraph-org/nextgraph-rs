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
use ng_repo::types::*;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

impl TopicSub {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<TopicSub, TopicSubRes>::new_responder(id)
    }
    /// only set broker_id if you want to be a publisher
    pub fn new(repo: &Repo, branch: &BranchInfo, broker_id: Option<&DirectPeerId>) -> TopicSub {
        let (overlay, publisher) = if broker_id.is_some() && branch.topic_priv_key.is_some() {
            (
                repo.store.inner_overlay(),
                Some(PublisherAdvert::new(
                    branch.topic,
                    branch.topic_priv_key.to_owned().unwrap(),
                    *broker_id.unwrap(),
                )),
            )
        } else {
            (repo.store.outer_overlay(), None)
        };

        TopicSub::V0(TopicSubV0 {
            repo_hash: repo.id.into(),
            overlay: Some(overlay),
            topic: branch.topic,
            publisher,
        })
    }
}

impl TryFrom<ProtocolMessage> for TopicSub {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let req: ClientRequestContentV0 = msg.try_into()?;
        if let ClientRequestContentV0::TopicSub(a) = req {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", req);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<TopicSub> for ProtocolMessage {
    fn from(msg: TopicSub) -> ProtocolMessage {
        let overlay = *msg.overlay();
        ProtocolMessage::from_client_request_v0(ClientRequestContentV0::TopicSub(msg), overlay)
    }
}

impl TryFrom<ProtocolMessage> for TopicSubRes {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let res: ClientResponseContentV0 = msg.try_into()?;
        if let ClientResponseContentV0::TopicSubRes(a) = res {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", res);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<TopicSubRes> for ProtocolMessage {
    fn from(res: TopicSubRes) -> ProtocolMessage {
        ClientResponseContentV0::TopicSubRes(res).into()
    }
}

impl Actor<'_, TopicSub, TopicSubRes> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, TopicSub, TopicSubRes> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = TopicSub::try_from(msg)?;

        //TODO implement all the server side logic
        let broker = BROKER.read().await;
        let res = broker.get_server_broker()?.topic_sub(
            req.overlay(),
            req.hash(),
            req.topic(),
            &fsm.lock().await.user_id_or_err()?,
            req.publisher(),
        );

        fsm.lock()
            .await
            .send_in_reply_to(res.into(), self.id())
            .await?;
        Ok(())
    }
}
