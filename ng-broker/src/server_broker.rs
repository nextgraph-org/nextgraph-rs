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

use crate::rocksdb_server_storage::RocksDbServerStorage;

struct TopicInfo {
    /// can be None if the Broker is not currently serving this topic for its clients.
    repo: Option<RepoHash>,

    publisher_advert: Option<PublisherAdvert>,

    current_heads: Vec<ObjectId>,

    expose_outer: bool,

    /// indicates which users have subscribed to topic (boolean says if as publisher or not)
    users: HashMap<UserId, bool>,
}

struct RepoInfo {
    /// set of users that requested the repo to be exposed on the outer overlay
    /// only possible if the user is a publisher
    expose_outer: HashSet<UserId>,

    /// set of topics of this repo
    topics: HashSet<TopicId>,
}

struct OverlayInfo {
    inner: Option<OverlayId>,

    topics: HashMap<TopicId, TopicInfo>,

    repos: HashMap<RepoHash, RepoInfo>,
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
    ) -> Result<RepoPinStatus, ServerError> {
        Err(ServerError::False)
        //TODO: implement correctly !
        // Ok(RepoPinStatus::V0(RepoPinStatusV0 {
        //     hash: repo.clone(),

        //     // only possible for RW overlays
        //     expose_outer: false,

        //     // list of topics that are subscribed to
        //     topics: vec![],
        // }))
    }

    fn pin_repo(
        &self,
        overlay: &OverlayId,
        repo: &RepoHash,
        ro_topics: &Vec<TopicId>,
        rw_topics: &Vec<PublisherAdvert>,
    ) -> Result<RepoOpened, ServerError> {
        //TODO: implement correctly !
        let mut opened = Vec::with_capacity(ro_topics.len() + rw_topics.len());
        for topic in ro_topics {
            opened.push((*topic).into());
        }
        for topic in rw_topics {
            opened.push((*topic).into());
        }
        Ok(opened)
    }

    fn topic_sub(
        &self,
        overlay: &OverlayId,
        repo: &RepoHash,
        topic: &TopicId,
        publisher: Option<&PublisherAdvert>,
    ) -> Result<TopicSubRes, ServerError> {
        //TODO: implement correctly !
        Ok(TopicSubRes::V0(TopicSubResV0 {
            topic: topic.clone(),
            known_heads: vec![],
            publisher: publisher.is_some(),
        }))
    }

    fn get_commit(&self, overlay: &OverlayId, id: &ObjectId) -> Result<Vec<Block>, ServerError> {
        //TODO: implement correctly !
        Ok(vec![Block::dummy()])
    }
}
