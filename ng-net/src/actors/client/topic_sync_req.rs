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
use ng_repo::repo::Repo;
use ng_repo::types::*;

use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};

impl TopicSyncReq {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<TopicSyncReq, TopicSyncRes>::new_responder(id)
    }

    pub fn new_empty(topic: TopicId, overlay: &OverlayId) -> Self {
        TopicSyncReq::V0(TopicSyncReqV0 {
            topic,
            known_heads: vec![],
            target_heads: vec![],
            overlay: Some(*overlay),
            known_commits: None,
        })
    }

    pub fn new(
        repo: &Repo,
        topic_id: &TopicId,
        known_heads: Vec<ObjectId>,
        target_heads: Vec<ObjectId>,
        known_commits: Option<BloomFilter>,
    ) -> TopicSyncReq {
        TopicSyncReq::V0(TopicSyncReqV0 {
            topic: *topic_id,
            known_heads,
            target_heads,
            overlay: Some(repo.store.get_store_repo().overlay_id_for_read_purpose()),
            known_commits,
        })
    }
}

impl TryFrom<ProtocolMessage> for TopicSyncReq {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let req: ClientRequestContentV0 = msg.try_into()?;
        if let ClientRequestContentV0::TopicSyncReq(a) = req {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", req);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<TopicSyncReq> for ProtocolMessage {
    fn from(msg: TopicSyncReq) -> ProtocolMessage {
        let overlay = *msg.overlay();
        ProtocolMessage::from_client_request_v0(ClientRequestContentV0::TopicSyncReq(msg), overlay)
    }
}

impl TryFrom<ProtocolMessage> for TopicSyncRes {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let res: ClientResponseContentV0 = msg.try_into()?;
        if let ClientResponseContentV0::TopicSyncRes(a) = res {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", res);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<TopicSyncRes> for ProtocolMessage {
    fn from(b: TopicSyncRes) -> ProtocolMessage {
        let mut cr: ClientResponse = ClientResponseContentV0::TopicSyncRes(b).into();
        cr.set_result(ServerError::PartialContent.into());
        cr.into()
    }
}

impl Actor<'_, TopicSyncReq, TopicSyncRes> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, TopicSyncReq, TopicSyncRes> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = TopicSyncReq::try_from(msg)?;

        let sb = { BROKER.read().await.get_server_broker()? };

        let res = {
            sb.read().await.topic_sync_req(
                req.overlay(),
                req.topic(),
                req.known_heads(),
                req.target_heads(),
                req.known_commits(),
            )
        };

        // IF NEEDED, the topic_sync_req could be changed to return a stream, and then the send_in_reply_to would be also totally async
        match res {
            Ok(blocks) => {
                if blocks.is_empty() {
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
