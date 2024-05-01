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

use ng_net::{server_broker::IServerBroker, types::*};
use ng_repo::{
    errors::{NgError, ProtocolError, ServerError},
    types::*,
};
use serde::{Deserialize, Serialize};

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
    pub event: Option<EventInfo>,
    pub home_pinned: bool,
    pub acks: HashSet<ObjectId>,
    pub deps: HashSet<ObjectId>,
    pub futures: HashSet<ObjectId>,
    pub files: HashSet<ObjectId>,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum OverlayType {
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
}

impl From<OverlayAccess> for OverlayType {
    fn from(oa: OverlayAccess) -> OverlayType {
        match oa {
            OverlayAccess::ReadOnly(_) => {
                panic!("cannot create an OverlayType from a ReadOnly OverlayAccess")
            }
            OverlayAccess::ReadWrite((inner, outer)) => OverlayType::Inner(outer),
            OverlayAccess::WriteOnly(inner) => OverlayType::InnerOnly,
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

    overlays: HashMap<OverlayId, OverlayInfo>,
    inner_overlays: HashMap<OverlayId, Option<OverlayId>>,
}

impl ServerBroker {
    pub fn new(storage: RocksDbServerStorage) -> Self {
        ServerBroker {
            storage: storage,
            overlays: HashMap::new(),
            inner_overlays: HashMap::new(),
        }
    }

    pub fn load(&mut self) -> Result<(), NgError> {
        Ok(())
    }
}

//TODO: the purpose of this trait is to have a level of indirection so we can keep some data in memory (cache) and avoid hitting the storage backend (rocksdb) at every call.
//for now this cache is not implemented, but the structs are ready (see above), and it would just require to change slightly the implementation of the trait functions here below.

impl IServerBroker for ServerBroker {
    fn next_seq_for_peer(&self, peer: &PeerId, seq: u64) -> Result<(), ServerError> {
        self.storage.next_seq_for_peer(peer, seq)
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
        &self,
        overlay: &OverlayAccess,
        repo: &RepoHash,
        user_id: &UserId,
        ro_topics: &Vec<TopicId>,
        rw_topics: &Vec<PublisherAdvert>,
        overlay_root_topic: &Option<TopicId>,
        expose_outer: bool,
    ) -> Result<RepoOpened, ServerError> {
        self.storage.pin_repo_write(
            overlay,
            repo,
            user_id,
            ro_topics,
            rw_topics,
            overlay_root_topic,
            expose_outer,
        )
    }

    fn pin_repo_read(
        &self,
        overlay: &OverlayId,
        repo: &RepoHash,
        user_id: &UserId,
        ro_topics: &Vec<TopicId>,
    ) -> Result<RepoOpened, ServerError> {
        self.storage
            .pin_repo_read(overlay, repo, user_id, ro_topics)
    }

    fn topic_sub(
        &self,
        overlay: &OverlayId,
        repo: &RepoHash,
        topic: &TopicId,
        user: &UserId,
        publisher: Option<&PublisherAdvert>,
    ) -> Result<TopicSubRes, ServerError> {
        self.storage
            .topic_sub(overlay, repo, topic, user, publisher)
    }

    fn get_commit(&self, overlay: &OverlayId, id: &ObjectId) -> Result<Vec<Block>, ServerError> {
        self.storage.get_commit(overlay, id)
    }

    fn dispatch_event(
        &self,
        overlay: &OverlayId,
        event: Event,
        user_id: &UserId,
    ) -> Result<(), ServerError> {
        self.storage.save_event(overlay, event, user_id)
    }
}
