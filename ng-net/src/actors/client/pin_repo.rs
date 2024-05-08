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
use ng_repo::repo::Repo;
use ng_repo::types::*;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

impl PinRepo {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<PinRepo, RepoOpened>::new_responder(id)
    }
    pub fn from_repo(repo: &Repo, broker_id: &DirectPeerId) -> PinRepo {
        let overlay = OverlayAccess::new_write_access_from_store(&repo.store);
        let mut rw_topics = Vec::with_capacity(repo.branches.len());
        let mut ro_topics = vec![];
        for (_, branch) in repo.branches.iter() {
            if let Some(privkey) = &branch.topic_priv_key {
                rw_topics.push(PublisherAdvert::new(
                    branch.topic,
                    privkey.clone(),
                    *broker_id,
                ));
            } else {
                ro_topics.push(branch.topic);
            }
        }
        PinRepo::V0(PinRepoV0 {
            hash: repo.id.into(),
            overlay,
            // TODO: overlay_root_topic
            overlay_root_topic: None,
            expose_outer: false,
            peers: vec![],
            max_peer_count: 0,
            //allowed_peers: vec![],
            ro_topics,
            rw_topics,
        })
    }
}

impl TryFrom<ProtocolMessage> for PinRepo {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let req: ClientRequestContentV0 = msg.try_into()?;
        if let ClientRequestContentV0::PinRepo(a) = req {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", req);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<PinRepo> for ProtocolMessage {
    fn from(msg: PinRepo) -> ProtocolMessage {
        let overlay = match msg {
            PinRepo::V0(ref v0) => v0.overlay.overlay_id_for_client_protocol_purpose().clone(),
        };
        ProtocolMessage::from_client_request_v0(ClientRequestContentV0::PinRepo(msg), overlay)
    }
}

impl TryFrom<ProtocolMessage> for RepoOpened {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let res: ClientResponseContentV0 = msg.try_into()?;
        if let ClientResponseContentV0::RepoOpened(a) = res {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", res);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<RepoOpened> for ProtocolMessage {
    fn from(res: RepoOpened) -> ProtocolMessage {
        ClientResponseContentV0::RepoOpened(res).into()
    }
}

impl Actor<'_, RepoPinStatusReq, RepoPinStatus> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, PinRepo, RepoOpened> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = PinRepo::try_from(msg)?;

        let mut broker = BROKER.write().await;

        // check the validity of the PublisherAdvert(s). this will return a ProtocolError (will close the connection)
        let server_peer_id = broker.get_config().unwrap().peer_id;
        for pub_ad in req.rw_topics() {
            pub_ad.verify_for_broker(&server_peer_id)?;
        }

        let (user_id, remote_peer) = {
            let fsm = fsm.lock().await;
            (
                fsm.user_id()?,
                fsm.remote_peer().ok_or(ProtocolError::ActorError)?,
            )
        };

        let result = {
            match req.overlay_access() {
                OverlayAccess::ReadOnly(r) => {
                    if r.is_inner()
                        || req.overlay() != r
                        || req.rw_topics().len() > 0
                        || req.overlay_root_topic().is_some()
                    {
                        Err(ServerError::InvalidRequest)
                    } else {
                        broker.get_server_broker_mut()?.pin_repo_read(
                            req.overlay(),
                            req.hash(),
                            &user_id,
                            req.ro_topics(),
                            &remote_peer,
                        )
                    }
                }
                OverlayAccess::ReadWrite((w, r)) => {
                    if req.overlay() != w
                        || !w.is_inner()
                        || r.is_inner()
                        || req.expose_outer() && req.rw_topics().len() == 0
                    {
                        // we do not allow to expose_outer if not a publisher for at least one topic
                        // TODO add a check on "|| overlay_root_topic.is_none()"  because it should be mandatory to have one (not sent by client at the moment)
                        Err(ServerError::InvalidRequest)
                    } else {
                        broker.get_server_broker_mut()?.pin_repo_write(
                            req.overlay_access(),
                            req.hash(),
                            &user_id,
                            req.ro_topics(),
                            req.rw_topics(),
                            req.overlay_root_topic(),
                            req.expose_outer(),
                            &remote_peer,
                        )
                    }
                }
                OverlayAccess::WriteOnly(w) => {
                    if !w.is_inner() || req.overlay() != w || req.expose_outer() {
                        Err(ServerError::InvalidRequest)
                    } else {
                        broker.get_server_broker_mut()?.pin_repo_write(
                            req.overlay_access(),
                            req.hash(),
                            &user_id,
                            req.ro_topics(),
                            req.rw_topics(),
                            req.overlay_root_topic(),
                            false,
                            &remote_peer,
                        )
                    }
                }
            }
        };
        fsm.lock()
            .await
            .send_in_reply_to(result.into(), self.id())
            .await?;
        Ok(())
    }
}
