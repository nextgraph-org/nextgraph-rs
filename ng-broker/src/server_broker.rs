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

//! Implementation of the Server Broker

use std::collections::{HashMap, HashSet};

use either::Either;
use serde::{Deserialize, Serialize};

use ng_repo::{
    errors::{NgError, ProtocolError, ServerError},
    log::*,
    types::*,
};

use ng_net::{server_broker::IServerBroker, types::*};

use crate::rocksdb_server_storage::RocksDbServerStorage;

pub struct TopicInfo {
    pub repo: RepoHash,

    pub publisher_advert: Option<PublisherAdvert>,

    pub current_heads: HashSet<ObjectId>,

    pub root_commit: Option<ObjectId>,

    /// indicates which users have opened the topic (boolean says if as publisher or not)
    pub users: HashMap<UserId, bool>,
}

pub struct RepoInfo {
    /// set of users that requested the repo to be exposed on the outer overlay
    /// only possible if the user is a publisher
    pub expose_outer: HashSet<UserId>,

    /// set of topics of this repo
    pub topics: HashSet<TopicId>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EventInfo {
    pub event: Event,
    pub blocks: Vec<BlockId>,
}

pub struct CommitInfo {
    pub event: Either<EventInfo, TopicId>,
    pub home_pinned: bool,
    pub acks: HashSet<ObjectId>,
    pub deps: HashSet<ObjectId>,
    pub futures: HashSet<ObjectId>,
    pub files: HashSet<ObjectId>,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum OverlayType {
    OuterOnly,
    Outer(OverlayId), // the ID of the inner overlay corresponding to this outer.
    Inner(OverlayId), // the ID of the outer overlay corresponding to the inner
    InnerOnly,
}

impl OverlayType {
    pub fn is_inner_get_outer(&self) -> Option<&OverlayId> {
        match self {
            Self::Inner(outer) => Some(outer),
            _ => None,
        }
    }
    pub fn is_outer_to_inner(&self) -> bool {
        match self {
            Self::Outer(_) => true,
            _ => false,
        }
    }
    pub fn is_outer_only(&self) -> bool {
        match self {
            Self::OuterOnly => true,
            _ => false,
        }
    }
}

impl From<OverlayAccess> for OverlayType {
    fn from(oa: OverlayAccess) -> OverlayType {
        match oa {
            OverlayAccess::ReadOnly(_) => {
                panic!("cannot create an OverlayType from a ReadOnly OverlayAccess")
            }
            OverlayAccess::ReadWrite((_inner, outer)) => OverlayType::Inner(outer),
            OverlayAccess::WriteOnly(_inner) => OverlayType::InnerOnly,
        }
    }
}

pub struct OverlayInfo {
    pub overlay_type: OverlayType,
    pub overlay_topic: Option<TopicId>,
    pub topics: HashMap<TopicId, TopicInfo>,
    pub repos: HashMap<RepoHash, RepoInfo>,
}

pub struct ServerBroker {
    storage: RocksDbServerStorage,

    #[allow(dead_code)]
    overlays: HashMap<OverlayId, OverlayInfo>,
    #[allow(dead_code)]
    inner_overlays: HashMap<OverlayId, Option<OverlayId>>,

    local_subscriptions: HashMap<(OverlayId, TopicId), HashSet<PubKey>>,
}

impl ServerBroker {
    pub(crate) fn new(storage: RocksDbServerStorage) -> Self {
        ServerBroker {
            storage: storage,
            overlays: HashMap::new(),
            inner_overlays: HashMap::new(),
            local_subscriptions: HashMap::new(),
        }
    }

    pub fn load(&mut self) -> Result<(), NgError> {
        Ok(())
    }

    fn add_subscription(
        &mut self,
        overlay: OverlayId,
        topic: TopicId,
        peer: PubKey,
    ) -> Result<(), ServerError> {
        let peers_set = self
            .local_subscriptions
            .entry((overlay, topic))
            .or_insert(HashSet::with_capacity(1));

        log_debug!(
            "SUBSCRIBING PEER {} TOPIC {} OVERLAY {}",
            peer,
            topic,
            overlay
        );

        if !peers_set.insert(peer) {
            //return Err(ServerError::PeerAlreadySubscribed);
        }
        Ok(())
    }

    #[allow(dead_code)]
    fn remove_subscription(
        &mut self,
        overlay: &OverlayId,
        topic: &TopicId,
        peer: &PubKey,
    ) -> Result<(), ServerError> {
        let peers_set = self
            .local_subscriptions
            .get_mut(&(*overlay, *topic))
            .ok_or(ServerError::SubscriptionNotFound)?;

        if !peers_set.remove(peer) {
            return Err(ServerError::SubscriptionNotFound);
        }
        Ok(())
    }
}

//TODO: the purpose of this trait is to have a level of indirection so we can keep some data in memory (cache) and avoid hitting the storage backend (rocksdb) at every call.
//for now this cache is not implemented, but the structs are ready (see above), and it would just require to change slightly the implementation of the trait functions here below.

impl IServerBroker for ServerBroker {
    fn has_block(&self, overlay_id: &OverlayId, block_id: &BlockId) -> Result<(), ServerError> {
        self.storage.has_block(overlay_id, block_id)
    }

    fn get_block(&self, overlay_id: &OverlayId, block_id: &BlockId) -> Result<Block, ServerError> {
        self.storage.get_block(overlay_id, block_id)
    }

    fn next_seq_for_peer(&self, peer: &PeerId, seq: u64) -> Result<(), ServerError> {
        self.storage.next_seq_for_peer(peer, seq)
    }

    fn put_block(&self, overlay_id: &OverlayId, block: Block) -> Result<(), ServerError> {
        self.storage.add_block(overlay_id, block)?;
        Ok(())
    }

    fn get_user(&self, user_id: PubKey) -> Result<bool, ProtocolError> {
        self.storage.get_user(user_id)
    }
    fn add_user(&self, user_id: PubKey, is_admin: bool) -> Result<(), ProtocolError> {
        self.storage.add_user(user_id, is_admin)
    }
    fn del_user(&self, user_id: PubKey) -> Result<(), ProtocolError> {
        self.storage.del_user(user_id)
    }
    fn list_users(&self, admins: bool) -> Result<Vec<PubKey>, ProtocolError> {
        self.storage.list_users(admins)
    }
    fn list_invitations(
        &self,
        admin: bool,
        unique: bool,
        multi: bool,
    ) -> Result<Vec<(InvitationCode, u32, Option<String>)>, ProtocolError> {
        self.storage.list_invitations(admin, unique, multi)
    }
    fn add_invitation(
        &self,
        invite_code: &InvitationCode,
        expiry: u32,
        memo: &Option<String>,
    ) -> Result<(), ProtocolError> {
        self.storage.add_invitation(invite_code, expiry, memo)
    }
    fn get_invitation_type(&self, invite_code: [u8; 32]) -> Result<u8, ProtocolError> {
        self.storage.get_invitation_type(invite_code)
    }
    fn remove_invitation(&self, invite_code: [u8; 32]) -> Result<(), ProtocolError> {
        self.storage.remove_invitation(invite_code)
    }
    fn get_repo_pin_status(
        &self,
        overlay: &OverlayId,
        repo: &RepoHash,
        user: &UserId,
    ) -> Result<RepoPinStatus, ServerError> {
        self.storage.get_repo_pin_status(overlay, repo, user)
    }

    fn pin_repo_write(
        &mut self,
        overlay: &OverlayAccess,
        repo: &RepoHash,
        user_id: &UserId,
        ro_topics: &Vec<TopicId>,
        rw_topics: &Vec<PublisherAdvert>,
        overlay_root_topic: &Option<TopicId>,
        expose_outer: bool,
        peer: &PubKey,
    ) -> Result<RepoOpened, ServerError> {
        let res = self.storage.pin_repo_write(
            overlay,
            repo,
            user_id,
            ro_topics,
            rw_topics,
            overlay_root_topic,
            expose_outer,
        )?;
        for topic in res.iter() {
            self.add_subscription(
                *overlay.overlay_id_for_client_protocol_purpose(),
                *topic.topic_id(),
                *peer,
            )?;
        }
        Ok(res)
    }

    fn pin_repo_read(
        &mut self,
        overlay: &OverlayId,
        repo: &RepoHash,
        user_id: &UserId,
        ro_topics: &Vec<TopicId>,
        peer: &PubKey,
    ) -> Result<RepoOpened, ServerError> {
        let res = self
            .storage
            .pin_repo_read(overlay, repo, user_id, ro_topics)?;

        for topic in res.iter() {
            // TODO: those outer subscriptions are not handled yet. they will not emit events.
            self.add_subscription(*overlay, *topic.topic_id(), *peer)?;
        }
        Ok(res)
    }

    fn topic_sub(
        &mut self,
        overlay: &OverlayId,
        repo: &RepoHash,
        topic: &TopicId,
        user: &UserId,
        publisher: Option<&PublisherAdvert>,
        peer: &PubKey,
    ) -> Result<TopicSubRes, ServerError> {
        let res = self
            .storage
            .topic_sub(overlay, repo, topic, user, publisher)?;
        self.add_subscription(*overlay, *topic, *peer)?;
        Ok(res)
    }

    fn get_commit(&self, overlay: &OverlayId, id: &ObjectId) -> Result<Vec<Block>, ServerError> {
        self.storage.get_commit(overlay, id)
    }

    fn dispatch_event(
        &self,
        overlay: &OverlayId,
        event: Event,
        user_id: &UserId,
        remote_peer: &PubKey,
    ) -> Result<HashSet<&PubKey>, ServerError> {
        let topic = self.storage.save_event(overlay, event, user_id)?;

        // log_debug!(
        //     "DISPATCH EVENT {} {} {:?}",
        //     overlay,
        //     topic,
        //     self.local_subscriptions
        // );

        let mut set = self
            .local_subscriptions
            .get(&(*overlay, topic))
            .map(|set| set.iter().collect())
            .unwrap_or(HashSet::new());

        set.remove(remote_peer);
        Ok(set)
    }

    fn topic_sync_req(
        &self,
        overlay: &OverlayId,
        topic: &TopicId,
        known_heads: &Vec<ObjectId>,
        target_heads: &Vec<ObjectId>,
    ) -> Result<Vec<TopicSyncRes>, ServerError> {
        self.storage
            .topic_sync_req(overlay, topic, known_heads, target_heads)
    }
}
