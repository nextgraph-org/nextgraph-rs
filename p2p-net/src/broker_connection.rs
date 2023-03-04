/*
 * Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0> 
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
 */

//! Connection to a Broker, can be local or remote.
//! If remote, it will use a Stream and Sink of framed messages
//! This is the trait
//! 

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

use async_broadcast::{broadcast, Receiver};
use debug_print::*;
use futures::{pin_mut, stream, Sink, SinkExt, StreamExt};
use p2p_repo::object::*;
use p2p_repo::store::*;
use p2p_repo::types::*;
use p2p_repo::utils::*;
use crate::errors::*;
use crate::types::*;


#[async_trait::async_trait]
pub trait BrokerConnection {
    type OC: BrokerConnection;
    type BlockStream: Stream<Item = Block>;

    async fn close(&mut self);

    async fn add_user(
        &mut self,
        user_id: PubKey,
        admin_user_pk: PrivKey,
    ) -> Result<(), ProtocolError>;

    async fn del_user(&mut self, user_id: PubKey, admin_user_pk: PrivKey);

    async fn add_client(&mut self, client_id: ClientId, user_pk: PrivKey);

    async fn del_client(&mut self, client_id: ClientId, user_pk: PrivKey);

    async fn overlay_connect(
        &mut self,
        repo: &RepoLink,
        public: bool,
    ) -> Result<OverlayConnectionClient<Self::OC>, ProtocolError>;

    // TODO: remove those 4 functions from trait. they are used internally only. should not be exposed to end-user
    async fn process_overlay_request(
        &mut self,
        overlay: OverlayId,
        request: BrokerOverlayRequestContentV0,
    ) -> Result<(), ProtocolError>;

    async fn process_overlay_request_stream_response(
        &mut self,
        overlay: OverlayId,
        request: BrokerOverlayRequestContentV0,
    ) -> Result<Pin<Box<Self::BlockStream>>, ProtocolError>;

    async fn process_overlay_request_objectid_response(
        &mut self,
        overlay: OverlayId,
        request: BrokerOverlayRequestContentV0,
    ) -> Result<ObjectId, ProtocolError>;

    async fn process_overlay_connect(
        &mut self,
        repo_link: &RepoLink,
        public: bool,
    ) -> Result<OverlayId, ProtocolError> {
        let overlay: OverlayId = match public {
            true => Digest::Blake3Digest32(*blake3::hash(repo_link.id().slice()).as_bytes()),
            false => {
                let key: [u8; blake3::OUT_LEN] =
                    blake3::derive_key("NextGraph OverlayId BLAKE3 key", repo_link.secret().slice());
                let keyed_hash = blake3::keyed_hash(&key, repo_link.id().slice());
                Digest::Blake3Digest32(*keyed_hash.as_bytes())
            }
        };

        let res = self
            .process_overlay_request(
                overlay,
                BrokerOverlayRequestContentV0::OverlayConnect(OverlayConnect::V0()),
            )
            .await;

        match res {
            Err(e) => {
                if e == ProtocolError::OverlayNotJoined {
                    debug_println!("OverlayNotJoined");
                    let res2 = self
                        .process_overlay_request(
                            overlay,
                            BrokerOverlayRequestContentV0::OverlayJoin(OverlayJoin::V0(
                                OverlayJoinV0 {
                                    secret: repo_link.secret(),
                                    peers: repo_link.peers(),
                                    repo_pubkey: Some(repo_link.id()), //TODO if we know we are connecting to a core node, we can pass None here
                                },
                            )),
                        )
                        .await?;
                } else {
                    return Err(e);
                }
            }
            Ok(()) => {}
        }

        debug_println!("OverlayConnectionClient ready");
        Ok(overlay)
    }
}

pub struct OverlayConnectionClient<'a, T>
where
    T: BrokerConnection,
{
    broker: &'a mut T,
    overlay: OverlayId,
    repo_link: RepoLink,
}

impl<'a, T> OverlayConnectionClient<'a, T>
where
    T: BrokerConnection,
{
    pub fn create( broker: &'a mut T,   overlay: OverlayId,   repo_link: RepoLink) -> OverlayConnectionClient<'a, T> {
        OverlayConnectionClient {
            broker,
            repo_link,
            overlay,
        }
    }

    pub fn overlay(repo_link: &RepoLink, public: bool) -> OverlayId {
        let overlay: OverlayId = match public {
            true => Digest::Blake3Digest32(*blake3::hash(repo_link.id().slice()).as_bytes()),
            false => {
                let key: [u8; blake3::OUT_LEN] =
                    blake3::derive_key("NextGraph OverlayId BLAKE3 key", repo_link.secret().slice());
                let keyed_hash = blake3::keyed_hash(&key, repo_link.id().slice());
                Digest::Blake3Digest32(*keyed_hash.as_bytes())
            }
        };
        overlay
    }

    pub async fn sync_branch(
        &mut self,
        heads: Vec<ObjectId>,
        known_heads: Vec<ObjectId>,
        known_commits: BloomFilter,
    ) -> Result<Pin<Box<T::BlockStream>>, ProtocolError> {
        self.broker
            .process_overlay_request_stream_response(
                self.overlay,
                BrokerOverlayRequestContentV0::BranchSyncReq(BranchSyncReq::V0(BranchSyncReqV0 {
                    heads,
                    known_heads,
                    known_commits,
                })),
            )
            .await
    }

    pub fn leave(&self) {}

    pub fn topic_connect(&self, id: TopicId) -> TopicSubscription<T> {
        let (s, mut r1) = broadcast(128); // FIXME this should be done only once, in the Broker
        TopicSubscription {
            id,
            overlay_cnx: self,
            event_stream: r1.clone(),
        }
    }

    pub async fn delete_object(&mut self, id: ObjectId) -> Result<(), ProtocolError> {
        self.broker
            .process_overlay_request(
                self.overlay,
                BrokerOverlayRequestContentV0::ObjectDel(ObjectDel::V0(ObjectDelV0 { id })),
            )
            .await
    }

    pub async fn pin_object(&mut self, id: ObjectId) -> Result<(), ProtocolError> {
        self.broker
            .process_overlay_request(
                self.overlay,
                BrokerOverlayRequestContentV0::ObjectPin(ObjectPin::V0(ObjectPinV0 { id })),
            )
            .await
    }

    pub async fn unpin_object(&mut self, id: ObjectId) -> Result<(), ProtocolError> {
        self.broker
            .process_overlay_request(
                self.overlay,
                BrokerOverlayRequestContentV0::ObjectUnpin(ObjectUnpin::V0(ObjectUnpinV0 { id })),
            )
            .await
    }

    pub async fn copy_object(
        &mut self,
        id: ObjectId,
        expiry: Option<Timestamp>,
    ) -> Result<ObjectId, ProtocolError> {
        self.broker
            .process_overlay_request_objectid_response(
                self.overlay,
                BrokerOverlayRequestContentV0::ObjectCopy(ObjectCopy::V0(ObjectCopyV0 {
                    id,
                    expiry,
                })),
            )
            .await
    }

    pub async fn get_block(
        &mut self,
        id: BlockId,
        include_children: bool,
        topic: Option<PubKey>,
    ) -> Result<Pin<Box<T::BlockStream>>, ProtocolError> {
        self.broker
            .process_overlay_request_stream_response(
                self.overlay,
                BrokerOverlayRequestContentV0::BlockGet(BlockGet::V0(BlockGetV0 {
                    id,
                    include_children,
                    topic,
                })),
            )
            .await
    }

    pub async fn get_object(
        &mut self,
        id: ObjectId,
        topic: Option<PubKey>,
    ) -> Result<Object, ProtocolError> {
        let mut blockstream = self.get_block(id, true, topic).await?;
        let mut store = HashMapRepoStore::new();
        while let Some(block) = blockstream.next().await {
            store.put(&block).unwrap();
        }
        Object::load(id, None, &store).map_err(|e| match e {
            ObjectParseError::MissingBlocks(_missing) => ProtocolError::MissingBlocks,
            _ => ProtocolError::ObjectParseError,
        })
    }

    pub async fn put_block(&mut self, block: &Block) -> Result<BlockId, ProtocolError> {
        self.broker
            .process_overlay_request(
                self.overlay,
                BrokerOverlayRequestContentV0::BlockPut(BlockPut::V0(block.clone())),
            )
            .await?;
        Ok(block.id())
    }

    // TODO maybe implement a put_block_with_children ? that would behave like put_object, but taking in a parent Blockk instead of a content

    pub async fn put_object(
        &mut self,
        content: ObjectContent,
        deps: Vec<ObjectId>,
        expiry: Option<Timestamp>,
        max_object_size: usize,
        repo_pubkey: PubKey,
        repo_secret: SymKey,
    ) -> Result<ObjectId, ProtocolError> {
        let obj = Object::new(
            content,
            deps,
            expiry,
            max_object_size,
            repo_pubkey,
            repo_secret,
        );
        debug_println!("object has {} blocks", obj.blocks().len());
        let mut deduplicated: HashSet<ObjectId> = HashSet::new();
        for block in obj.blocks() {
            let id = block.id();
            if deduplicated.get(&id).is_none() {
                let _ = self.put_block(block).await?;
                deduplicated.insert(id);
            }
        }
        Ok(obj.id())
    }
}

pub struct TopicSubscription<'a, T>
where
    T: BrokerConnection,
{
    id: TopicId,
    overlay_cnx: &'a OverlayConnectionClient<'a, T>,
    event_stream: Receiver<Event>,
}

impl<'a, T> TopicSubscription<'a, T>
where
    T: BrokerConnection,
{
    pub fn unsubscribe(&self) {}

    pub fn disconnect(&self) {}

    pub fn get_branch_heads(&self) {}

    pub fn get_event_stream(&self) -> &Receiver<Event> {
        &self.event_stream
    }
}