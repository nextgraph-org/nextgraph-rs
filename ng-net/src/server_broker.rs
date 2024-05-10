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

//! Trait for ServerBroker

use std::collections::HashSet;

use ng_repo::errors::*;
use ng_repo::types::*;

use crate::types::*;

pub trait IServerBroker: Send + Sync {
    fn put_block(&self, overlay_id: &OverlayId, block: Block) -> Result<(), ServerError>;
    fn has_block(&self, overlay_id: &OverlayId, block_id: &BlockId) -> Result<(), ServerError>;
    fn get_block(&self, overlay_id: &OverlayId, block_id: &BlockId) -> Result<Block, ServerError>;
    fn get_user(&self, user_id: PubKey) -> Result<bool, ProtocolError>;
    fn add_user(&self, user_id: PubKey, is_admin: bool) -> Result<(), ProtocolError>;
    fn del_user(&self, user_id: PubKey) -> Result<(), ProtocolError>;
    fn list_users(&self, admins: bool) -> Result<Vec<PubKey>, ProtocolError>;
    fn list_invitations(
        &self,
        admin: bool,
        unique: bool,
        multi: bool,
    ) -> Result<Vec<(InvitationCode, u32, Option<String>)>, ProtocolError>;
    fn add_invitation(
        &self,
        invite_code: &InvitationCode,
        expiry: u32,
        memo: &Option<String>,
    ) -> Result<(), ProtocolError>;
    fn get_invitation_type(&self, invite: [u8; 32]) -> Result<u8, ProtocolError>;
    fn remove_invitation(&self, invite: [u8; 32]) -> Result<(), ProtocolError>;

    fn next_seq_for_peer(&self, peer: &PeerId, seq: u64) -> Result<(), ServerError>;

    fn get_repo_pin_status(
        &self,
        overlay: &OverlayId,
        repo: &RepoHash,
        user_id: &UserId,
    ) -> Result<RepoPinStatus, ServerError>;

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
    ) -> Result<RepoOpened, ServerError>;

    fn pin_repo_read(
        &mut self,
        overlay: &OverlayId,
        repo: &RepoHash,
        user_id: &UserId,
        ro_topics: &Vec<TopicId>,
        peer: &PubKey,
    ) -> Result<RepoOpened, ServerError>;

    fn topic_sub(
        &mut self,
        overlay: &OverlayId,
        repo: &RepoHash,
        topic: &TopicId,
        user_id: &UserId,
        publisher: Option<&PublisherAdvert>,
        peer: &PubKey,
    ) -> Result<TopicSubRes, ServerError>;

    fn get_commit(&self, overlay: &OverlayId, id: &ObjectId) -> Result<Vec<Block>, ServerError>;

    fn dispatch_event(
        &self,
        overlay: &OverlayId,
        event: Event,
        user_id: &UserId,
        remote_peer: &PubKey,
    ) -> Result<HashSet<&PubKey>, ServerError>;

    fn topic_sync_req(
        &self,
        overlay: &OverlayId,
        topic: &TopicId,
        known_heads: &Vec<ObjectId>,
        target_heads: &Vec<ObjectId>,
    ) -> Result<Vec<TopicSyncRes>, ServerError>;
}
