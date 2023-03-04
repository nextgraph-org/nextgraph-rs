// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0> 
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Local Connection to a Broker

use futures::{
    ready,
    stream::Stream,
    task::{Context, Poll},
    Future,
    select, FutureExt,
};
use futures::channel::mpsc;
use std::pin::Pin;
use std::{collections::HashSet, fmt::Debug};

use crate::server::BrokerServer;
use debug_print::*;
use futures::{pin_mut, stream, Sink, SinkExt, StreamExt};
use p2p_repo::object::*;
use p2p_repo::store::*;
use p2p_repo::types::*;
use p2p_repo::utils::*;
use p2p_net::errors::*;
use p2p_net::types::*;
use p2p_net::broker_connection::*;
use std::collections::HashMap;


pub struct BrokerConnectionLocal<'a> {
    broker: &'a mut BrokerServer,
    user: PubKey,
}

#[async_trait::async_trait]
impl<'a> BrokerConnection for BrokerConnectionLocal<'a> {
    type OC = BrokerConnectionLocal<'a>;
    type BlockStream = async_channel::Receiver<Block>;

    async fn close(&mut self) {}

    async fn add_user(
        &mut self,
        user_id: PubKey,
        admin_user_pk: PrivKey,
    ) -> Result<(), ProtocolError> {
        let op_content = AddUserContentV0 { user: user_id };
        let sig = sign(admin_user_pk, self.user, &serde_bare::to_vec(&op_content)?)?;

        self.broker.add_user(self.user, user_id, sig)
    }

    async fn process_overlay_request(
        &mut self,
        overlay: OverlayId,
        request: BrokerOverlayRequestContentV0,
    ) -> Result<(), ProtocolError> {
        match request {
            BrokerOverlayRequestContentV0::OverlayConnect(_) => {
                self.broker.connect_overlay(self.user, overlay)
            }
            BrokerOverlayRequestContentV0::OverlayJoin(j) => {
                self.broker
                    .join_overlay(self.user, overlay, j.repo_pubkey(), j.secret(), j.peers())
            }
            BrokerOverlayRequestContentV0::ObjectPin(op) => {
                self.broker.pin_object(self.user, overlay, op.id())
            }
            BrokerOverlayRequestContentV0::ObjectUnpin(op) => {
                self.broker.unpin_object(self.user, overlay, op.id())
            }
            BrokerOverlayRequestContentV0::ObjectDel(op) => {
                self.broker.del_object(self.user, overlay, op.id())
            }
            BrokerOverlayRequestContentV0::BlockPut(b) => {
                self.broker.put_block(self.user, overlay, b.block())
            }
            _ => Err(ProtocolError::InvalidState),
        }
    }

    async fn process_overlay_request_objectid_response(
        &mut self,
        overlay: OverlayId,
        request: BrokerOverlayRequestContentV0,
    ) -> Result<ObjectId, ProtocolError> {
        match request {
            BrokerOverlayRequestContentV0::ObjectCopy(oc) => {
                self.broker
                    .copy_object(self.user, overlay, oc.id(), oc.expiry())
            }
            _ => Err(ProtocolError::InvalidState),
        }
    }

    async fn process_overlay_request_stream_response(
        &mut self,
        overlay: OverlayId,
        request: BrokerOverlayRequestContentV0,
    ) -> Result<Pin<Box<Self::BlockStream>>, ProtocolError> {
        match request {
           
            BrokerOverlayRequestContentV0::BlockGet(b) => self
                .broker
                .get_block(self.user, overlay, b.id(), b.include_children(), b.topic())
                .map(|r| Box::pin(r)),
            BrokerOverlayRequestContentV0::BranchSyncReq(b) => self
                .broker
                .sync_branch(
                    self.user,
                    &overlay,
                    b.heads(),
                    b.known_heads(),
                    b.known_commits(),
                )
                .map(|r| Box::pin(r)),
            _ => Err(ProtocolError::InvalidState),
        }
    }

    async fn del_user(&mut self, user_id: PubKey, admin_user_pk: PrivKey) {}

    async fn add_client(&mut self, user_id: PubKey, admin_user_pk: PrivKey) {}

    async fn del_client(&mut self, user_id: PubKey, admin_user_pk: PrivKey) {}

    async fn overlay_connect(
        &mut self,
        repo_link: &RepoLink,
        public: bool,
    ) -> Result<OverlayConnectionClient<BrokerConnectionLocal<'a>>, ProtocolError> {
        let overlay = self.process_overlay_connect(repo_link, public).await?;
        Ok(OverlayConnectionClient::create(self,  overlay, repo_link.clone()))
    }
}

impl<'a> BrokerConnectionLocal<'a> {
    pub fn new(broker: &'a mut BrokerServer, user: PubKey) -> BrokerConnectionLocal<'a> {
        BrokerConnectionLocal { broker, user }
    }
}