// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0> 
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! A Broker server

use std::collections::HashMap;
use std::collections::HashSet;
use std::pin::Pin;
use std::sync::Arc;
use std::sync::RwLock;

use crate::broker_store::account::Account;
use crate::auth::*;
use crate::broker_store::config::Config;
use crate::broker_store::config::ConfigMode;
use crate::connection_local::BrokerConnectionLocal;
use crate::broker_store::overlay::Overlay;
use crate::broker_store::peer::Peer;
use crate::broker_store::repostoreinfo::RepoStoreId;
use crate::broker_store::repostoreinfo::RepoStoreInfo;
use async_std::task;
use debug_print::*;
use futures::future::BoxFuture;
use futures::future::OptionFuture;
use futures::FutureExt;
use futures::Stream;
use p2p_repo::object::Object;
use p2p_repo::store::RepoStore;
use p2p_repo::store::StorageError;
use p2p_repo::types::*;
use p2p_repo::utils::*;
use p2p_net::errors::*;
use p2p_net::types::*;
use p2p_stores_lmdb::broker_store::LmdbBrokerStore;
use p2p_stores_lmdb::repo_store::LmdbRepoStore;

#[derive(Debug, Eq, PartialEq, Clone)]
pub enum BrokerError {
    CannotStart,
    MismatchedMode,
    OverlayNotFound,
}

impl From<BrokerError> for ProtocolError {
    fn from(e: BrokerError) -> Self {
        match e {
            BrokerError::CannotStart => ProtocolError::OverlayNotFound,
            BrokerError::OverlayNotFound => ProtocolError::OverlayNotFound,
            _ => ProtocolError::BrokerError,
        }
    }
}

impl From<p2p_repo::store::StorageError> for BrokerError {
    fn from(e: p2p_repo::store::StorageError) -> Self {
        match e {
            p2p_repo::store::StorageError::InvalidValue => BrokerError::MismatchedMode,
            _ => BrokerError::CannotStart,
        }
    }
}

#[derive(Debug)]
enum ProtocolType {
    Start,
    Auth,
    Broker,
    Ext,
    Core,
}

pub struct ProtocolHandler {
    broker: Arc<BrokerServer>,
    protocol: ProtocolType,
    auth_protocol: Option<AuthProtocolHandler>,
    broker_protocol: Option<BrokerProtocolHandler>,
    ext_protocol: Option<ExtProtocolHandler>,
    r: Option<async_channel::Receiver<Vec<u8>>>,
    s: async_channel::Sender<Vec<u8>>,
}

impl ProtocolHandler {
    pub fn async_frames_receiver(&mut self) -> async_channel::Receiver<Vec<u8>> {
        self.r.take().unwrap()
    }

    /// Handle incoming message
    pub async fn handle_incoming(
        &mut self,
        frame: Vec<u8>,
    ) -> (
        Result<Vec<u8>, ProtocolError>,
        OptionFuture<BoxFuture<'static, u16>>,
    ) {
        //debug_println!("SERVER PROTOCOL {:?}", &self.protocol);
        match &self.protocol {
            ProtocolType::Start => {
                let message = serde_bare::from_slice::<StartProtocol>(&frame);
                match message {
                    Ok(StartProtocol::Auth(b)) => {
                        self.protocol = ProtocolType::Auth;
                        self.auth_protocol = Some(AuthProtocolHandler::new());
                        return (
                            self.auth_protocol.as_mut().unwrap().handle_init(b),
                            OptionFuture::from(None),
                        );
                    }
                    Ok(StartProtocol::Ext(ext)) => {
                        self.protocol = ProtocolType::Ext;
                        self.ext_protocol = Some(ExtProtocolHandler {});
                        let reply = self.ext_protocol.as_ref().unwrap().handle_incoming(ext);
                        return (
                            Ok(serde_bare::to_vec(&reply).unwrap()),
                            OptionFuture::from(None),
                        );
                    }
                    Err(e) => {
                        return (Err(ProtocolError::SerializationError),OptionFuture::from(None))
                    }
                }
            }
            ProtocolType::Auth => {
                let res = self.auth_protocol.as_mut().unwrap().handle_incoming(frame);
                match res.1.await {
                    None => {
                        // we switch to Broker protocol
                        self.protocol = ProtocolType::Broker;
                        self.broker_protocol = Some(BrokerProtocolHandler {
                            user: self.auth_protocol.as_ref().unwrap().get_user().unwrap(),
                            broker: Arc::clone(&self.broker),
                            async_frames_sender: self.s.clone(),
                        });
                        self.auth_protocol = None;
                        (res.0, OptionFuture::from(None))
                    }
                    Some(e) => (res.0, OptionFuture::from(Some(async move { e }.boxed()))),
                }
            }
            ProtocolType::Broker => {
                let message = serde_bare::from_slice::<BrokerMessage>(&frame);
                match (message) {
                    Ok(message) => {
                        let reply = self
                            .broker_protocol
                            .as_ref()
                            .unwrap()
                            .handle_incoming(message)
                            .await;
                        (Ok(serde_bare::to_vec(&reply.0).unwrap()), reply.1)
                    }
                    Err(e_) => {
                        (Err(ProtocolError::SerializationError),OptionFuture::from(None))
                    }
                }
            }
            ProtocolType::Ext => {
                // Ext protocol is not accepting 2 extrequest in the same connection.
                // closing the connection
                (Err(ProtocolError::InvalidState), OptionFuture::from(None))
            }
            ProtocolType::Core => {
                unimplemented!()
            }
        }
    }
}

pub struct ExtProtocolHandler {}

impl ExtProtocolHandler {
    pub fn handle_incoming(&self, msg: ExtRequest) -> ExtResponse {
        unimplemented!()
    }
}

pub struct BrokerProtocolHandler {
    broker: Arc<BrokerServer>,
    user: PubKey,
    async_frames_sender: async_channel::Sender<Vec<u8>>,
}
use std::{thread, time};

impl BrokerProtocolHandler {
    fn prepare_reply_broker_message(
        res: Result<(), ProtocolError>,
        id: u64,
        padding_size: usize,
    ) -> BrokerMessage {
        let result = match res {
            Ok(_) => 0,
            Err(e) => e.into(),
        };
        let msg = BrokerMessage::V0(BrokerMessageV0 {
            padding: vec![0; padding_size],
            content: BrokerMessageContentV0::BrokerResponse(BrokerResponse::V0(BrokerResponseV0 {
                id,
                result,
            })),
        });
        msg
    }

    fn prepare_reply_broker_overlay_message(
        res: Result<(), ProtocolError>,
        id: u64,
        overlay: OverlayId,
        block: Option<Block>,
        padding_size: usize,
    ) -> BrokerMessage {
        let result = match res {
            Ok(_) => 0,
            Err(e) => e.into(),
        };
        let content = match block {
            Some(b) => Some(BrokerOverlayResponseContentV0::Block(b)),
            None => None,
        };
        let msg = BrokerMessage::V0(BrokerMessageV0 {
            padding: vec![0; padding_size],
            content: BrokerMessageContentV0::BrokerOverlayMessage(BrokerOverlayMessage::V0(
                BrokerOverlayMessageV0 {
                    overlay,
                    content: BrokerOverlayMessageContentV0::BrokerOverlayResponse(
                        BrokerOverlayResponse::V0(BrokerOverlayResponseV0 {
                            id,
                            result,
                            content,
                        }),
                    ),
                },
            )),
        });
        msg
    }

    fn prepare_reply_broker_overlay_message_stream(
        res: Result<Block, ProtocolError>,
        id: u64,
        overlay: OverlayId,
        padding_size: usize,
    ) -> BrokerMessage {
        let result: u16 = match &res {
            Ok(r) => ProtocolError::PartialContent.into(),
            Err(e) => (*e).clone().into(),
        };
        let content = match res {
            Ok(r) => Some(BrokerOverlayResponseContentV0::Block(r)),
            Err(_) => None,
        };
        let msg = BrokerMessage::V0(BrokerMessageV0 {
            padding: vec![0; padding_size],
            content: BrokerMessageContentV0::BrokerOverlayMessage(BrokerOverlayMessage::V0(
                BrokerOverlayMessageV0 {
                    overlay,
                    content: BrokerOverlayMessageContentV0::BrokerOverlayResponse(
                        BrokerOverlayResponse::V0(BrokerOverlayResponseV0 {
                            id,
                            result,
                            content,
                        }),
                    ),
                },
            )),
        });
        msg
    }

    async fn send_block_stream_response_to_client(
        &self,
        res: Result<async_channel::Receiver<Block>, ProtocolError>,
        id: u64,
        overlay: OverlayId,
        padding_size: usize,
    ) -> (BrokerMessage, OptionFuture<BoxFuture<'static, u16>>) {
        // return an error or the first block, and setup a spawner for the remaining blocks to be sent.
        let one_reply: (
            Result<Block, ProtocolError>,
            OptionFuture<BoxFuture<'static, u16>>,
        ) = match res {
            Err(e) => (Err(e), OptionFuture::from(None)),
            Ok(stream) => {
                let one = stream
                    .recv_blocking()
                    .map_err(|e| ProtocolError::EndOfStream);

                if one.is_ok() {
                    let sender = self.async_frames_sender.clone();
                    let a = OptionFuture::from(Some(
                        async move {
                            while let Ok(next) = stream.recv().await {
                                let msg = Self::prepare_reply_broker_overlay_message_stream(
                                    Ok(next),
                                    id,
                                    overlay,
                                    padding_size,
                                );
                                let res = sender.send(serde_bare::to_vec(&msg).unwrap()).await;
                                if res.is_err() {
                                    break;
                                }
                            }
                            // sending end of stream
                            let msg = Self::prepare_reply_broker_overlay_message_stream(
                                Err(ProtocolError::EndOfStream),
                                id,
                                overlay,
                                padding_size,
                            );
                            let _ = sender.send(serde_bare::to_vec(&msg).unwrap()).await;
                            0
                        }
                        .boxed(),
                    ));
                    (one, a)
                } else {
                    (one, OptionFuture::from(None))
                }
            }
        };
        return (
            Self::prepare_reply_broker_overlay_message_stream(
                one_reply.0,
                id,
                overlay,
                padding_size,
            ),
            one_reply.1,
        );
    }

    pub async fn handle_incoming(
        &self,
        msg: BrokerMessage,
    ) -> (BrokerMessage, OptionFuture<BoxFuture<'static, u16>>) {

        let padding_size = 20; // TODO randomize, if config of server contains padding_max

        let id = msg.id();
        let content = msg.content();
        match content {
            BrokerMessageContentV0::BrokerRequest(req) => (
                Self::prepare_reply_broker_message(
                    match req.content_v0() {
                        BrokerRequestContentV0::AddUser(cmd) => {
                            self.broker.add_user(self.user, cmd.user(), cmd.sig())
                        }
                        BrokerRequestContentV0::DelUser(cmd) => {
                            self.broker.del_user(self.user, cmd.user(), cmd.sig())
                        }
                        BrokerRequestContentV0::AddClient(cmd) => {
                            self.broker.add_client(self.user, cmd.client(), cmd.sig())
                        }
                        BrokerRequestContentV0::DelClient(cmd) => {
                            self.broker.del_client(self.user, cmd.client(), cmd.sig())
                        }
                    },
                    id,
                    padding_size,
                ),
                OptionFuture::from(None),
            ),
            BrokerMessageContentV0::BrokerResponse(res) => (
                Self::prepare_reply_broker_message(
                    Err(ProtocolError::InvalidState),
                    id,
                    padding_size,
                ),
                OptionFuture::from(None),
            ),
            BrokerMessageContentV0::BrokerOverlayMessage(omsg) => {
                let overlay = omsg.overlay_id();
                let block = None;
                let mut res = Err(ProtocolError::InvalidState);

                if omsg.is_request() {
                    match omsg.overlay_request().content_v0() {
                        BrokerOverlayRequestContentV0::OverlayConnect(_) => {
                            res = self.broker.connect_overlay(self.user, overlay)
                        }
                        BrokerOverlayRequestContentV0::OverlayJoin(j) => {
                            res = self.broker.join_overlay(
                                self.user,
                                overlay,
                                j.repo_pubkey(),
                                j.secret(),
                                j.peers(),
                            )
                        }
                        BrokerOverlayRequestContentV0::ObjectDel(op) => {
                            res = self.broker.del_object(self.user, overlay, op.id())
                        }
                        BrokerOverlayRequestContentV0::ObjectPin(op) => {
                            res = self.broker.pin_object(self.user, overlay, op.id())
                        }
                        BrokerOverlayRequestContentV0::ObjectUnpin(op) => {
                            res = self.broker.unpin_object(self.user, overlay, op.id())
                        }
                        BrokerOverlayRequestContentV0::BlockPut(b) => {
                            res = self.broker.put_block(self.user, overlay, b.block())
                        }
                        BrokerOverlayRequestContentV0::BranchSyncReq(b) => {
                            let res = self.broker.sync_branch(
                                self.user,
                                &overlay,
                                b.heads(),
                                b.known_heads(),
                                b.known_commits(),
                            );
                            return self
                                .send_block_stream_response_to_client(
                                    res,
                                    id,
                                    overlay,
                                    padding_size,
                                )
                                .await;
                        }
                        BrokerOverlayRequestContentV0::BlockGet(b) => {
                            let res = self.broker.get_block(
                                self.user,
                                overlay,
                                b.id(),
                                b.include_children(),
                                b.topic(),
                            );
                            return self
                                .send_block_stream_response_to_client(
                                    res,
                                    id,
                                    overlay,
                                    padding_size,
                                )
                                .await;
                        }
                        _ => {}
                    }
                }

                (
                    Self::prepare_reply_broker_overlay_message(
                        res,
                        id,
                        overlay,
                        block,
                        padding_size,
                    ),
                    OptionFuture::from(None),
                )
            }
        }
    }
}

const REPO_STORES_SUBDIR: &str = "repos";

pub struct BrokerServer {
    store: LmdbBrokerStore,
    mode: ConfigMode,
    repo_stores: Arc<RwLock<HashMap<RepoStoreId, LmdbRepoStore>>>,
    // only used in ConfigMode::Local
    // try to change it to this version below in order to avoid double hashmap lookup in local mode. but hard to do...
    //overlayid_to_repostore: HashMap<RepoStoreId, &'a LmdbRepoStore>,
    overlayid_to_repostore: Arc<RwLock<HashMap<OverlayId, RepoStoreId>>>,
}

impl BrokerServer {
    pub fn new(store: LmdbBrokerStore, mode: ConfigMode) -> Result<BrokerServer, BrokerError> {
        let mut configmode: ConfigMode;
        {
            let config = Config::get_or_create(&mode, &store)?;
            configmode = config.mode()?;
        }
        Ok(BrokerServer {
            store,
            mode: configmode,
            repo_stores: Arc::new(RwLock::new(HashMap::new())),
            overlayid_to_repostore: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    fn open_or_create_repostore<F, R>(
        &self,
        repostore_id: RepoStoreId,
        f: F,
    ) -> Result<R, ProtocolError>
    where
        F: FnOnce(&LmdbRepoStore) -> Result<R, ProtocolError>,
    {
        // first let's find it in the BrokerStore.repostoreinfo table in order to get the encryption key
        let info = RepoStoreInfo::open(&repostore_id, &self.store)
            .map_err(|e| BrokerError::OverlayNotFound)?;
        let key = info.key()?;
        let mut path = self.store.path();
        path.push(REPO_STORES_SUBDIR);
        path.push::<String>(repostore_id.clone().into());
        std::fs::create_dir_all(path.clone()).map_err(|_e| ProtocolError::WriteError )?;
        println!("path for repo store: {}", path.to_str().unwrap());
        let repo = LmdbRepoStore::open(&path, *key.slice());
        let mut writer = self.repo_stores.write().expect("write repo_store hashmap");
        writer.insert(repostore_id.clone(), repo);

        f(writer.get(&repostore_id).unwrap())
    }

    fn get_repostore_from_overlay_id<F, R>(
        &self,
        overlay_id: &OverlayId,
        f: F,
    ) -> Result<R, ProtocolError>
    where
        F: FnOnce(&LmdbRepoStore) -> Result<R, ProtocolError>,
    {
        if self.mode == ConfigMode::Core {
            let repostore_id = RepoStoreId::Overlay(*overlay_id);
            let reader = self.repo_stores.read().expect("read repo_store hashmap");
            let rep = reader.get(&repostore_id);
            match rep {
                Some(repo) => return f(repo),
                None => {
                    // we need to open/create it
                    // TODO: last_access
                    return self.open_or_create_repostore(repostore_id, |repo| f(repo));
                }
            }
        } else {
            // it is ConfigMode::Local
            {
                let reader = self
                    .overlayid_to_repostore
                    .read()
                    .expect("read overlayid_to_repostore hashmap");
                match reader.get(&overlay_id) {
                    Some(repostoreid) => {
                        let reader = self.repo_stores.read().expect("read repo_store hashmap");
                        match reader.get(repostoreid) {
                            Some(repo) => return f(repo),
                            None => return Err(ProtocolError::BrokerError),
                        }
                    }
                    None => {}
                };
            }

            // we need to open/create it
            // first let's find it in the BrokerStore.overlay table to retrieve its repo_pubkey
            debug_println!("searching for overlayId {}", overlay_id);
            let overlay = Overlay::open(overlay_id, &self.store)?;
            debug_println!("found overlayId {}", overlay_id);
            let repo_id = overlay.repo()?;
            let repostore_id = RepoStoreId::Repo(repo_id);
            let mut writer = self
                .overlayid_to_repostore
                .write()
                .expect("write overlayid_to_repostore hashmap");
            writer.insert(*overlay_id, repostore_id.clone());
            // now opening/creating the RepoStore
            // TODO: last_access
            return self.open_or_create_repostore(repostore_id, |repo| f(repo));
        }
    }

    pub fn local_connection(&mut self, user: PubKey) -> BrokerConnectionLocal {
        BrokerConnectionLocal::new(self, user)
    }

    pub fn protocol_handler(self: Arc<Self>) -> ProtocolHandler {
        let (s, r) = async_channel::unbounded::<Vec<u8>>();
        return ProtocolHandler {
            broker: Arc::clone(&self),
            protocol: ProtocolType::Start,
            auth_protocol: None,
            broker_protocol: None,
            ext_protocol: None,
            r: Some(r),
            s,
        };
    }

    pub fn add_user(
        &self,
        admin_user: PubKey,
        user_id: PubKey,
        sig: Sig,
    ) -> Result<(), ProtocolError> {
        debug_println!("ADDING USER {}", user_id);
        // TODO add is_admin boolean
        // TODO check that admin_user is indeed an admin

        // verify signature
        let op_content = AddUserContentV0 { user: user_id };
        let _ = verify(&serde_bare::to_vec(&op_content).unwrap(), sig, admin_user)?;

        // check user_id is not already present
        let account = Account::open(&user_id, &self.store);
        if account.is_ok() {
            Err(ProtocolError::UserAlreadyExists)
        }
        // if not, add to store
        else {
            let _ = Account::create(&user_id, false, &self.store)?;
            Ok(())
        }
    }

    pub fn del_user(
        &self,
        admin_user: PubKey,
        user_id: PubKey,
        sig: Sig,
    ) -> Result<(), ProtocolError> {
        // TODO implement del_user
        Ok(())
    }
    pub fn add_client(
        &self,
        user: PubKey,
        client_id: PubKey,
        sig: Sig,
    ) -> Result<(), ProtocolError> {
        // TODO implement add_client
        Ok(())
    }

    pub fn del_client(
        &self,
        user: PubKey,
        client_id: PubKey,
        sig: Sig,
    ) -> Result<(), ProtocolError> {
        // TODO implement del_client
        Ok(())
    }

    pub fn connect_overlay(&self, user: PubKey, overlay: OverlayId) -> Result<(), ProtocolError> {
        // TODO check that the broker has already joined this overlay. if not, send OverlayNotJoined
        Err(ProtocolError::OverlayNotJoined)
    }

    pub fn del_object(
        &self,
        user: PubKey,
        overlay: Digest,
        id: ObjectId,
    ) -> Result<(), ProtocolError> {
        self.get_repostore_from_overlay_id(&overlay, |store| {
            // TODO, only admin users can delete on a store on this broker
            let obj = Object::load(id, None, store);
            if obj.is_err() {
                return Err(ProtocolError::NotFound);
            }
            let o = obj.ok().unwrap();
            let mut deduplicated: HashSet<ObjectId> = HashSet::new();
            for block in o.blocks() {
                let id = block.id();
                if deduplicated.get(&id).is_none() {
                    store.del(&id)?;
                    deduplicated.insert(id);
                }
            }
            Ok(())
        })
    }

    pub fn pin_object(
        &self,
        user: PubKey,
        overlay: OverlayId,
        id: ObjectId,
    ) -> Result<(), ProtocolError> {
        self.get_repostore_from_overlay_id(&overlay, |store| {
            // TODO, store the user who pins, and manage reference counting on how many users pin/unpin
            let obj = Object::load(id, None, store);
            if obj.is_err() {
                return Err(ProtocolError::NotFound);
            }
            let o = obj.ok().unwrap();
            let mut deduplicated: HashSet<ObjectId> = HashSet::new();
            for block in o.blocks() {
                let id = block.id();
                if deduplicated.get(&id).is_none() {
                    store.pin(&id)?;
                    deduplicated.insert(id);
                }
            }
            Ok(())
        })
    }

    pub fn unpin_object(
        &self,
        user: PubKey,
        overlay: OverlayId,
        id: ObjectId,
    ) -> Result<(), ProtocolError> {
        self.get_repostore_from_overlay_id(&overlay, |store| {
            // TODO, store the user who pins, and manage reference counting on how many users pin/unpin
            let obj = Object::load(id, None, store);
            if obj.is_err() {
                return Err(ProtocolError::NotFound);
            }
            let o = obj.ok().unwrap();
            let mut deduplicated: HashSet<ObjectId> = HashSet::new();
            for block in o.blocks() {
                let id = block.id();
                if deduplicated.get(&id).is_none() {
                    store.unpin(&id)?;
                    deduplicated.insert(id);
                }
            }
            Ok(())
        })
    }

    pub fn copy_object(
        &self,
        user: PubKey,
        overlay: OverlayId,
        id: ObjectId,
        expiry: Option<Timestamp>,
    ) -> Result<ObjectId, ProtocolError> {
        // self.get_repostore_from_overlay_id(&overlay, |store| {
        //     //let obj = Object::from_store(id, None, store);
        //     //Ok(Object::copy(id, expiry, store)?)
        // });
        todo!();
    }

    pub fn put_block(
        &self,
        user: PubKey,
        overlay: OverlayId,
        block: &Block,
    ) -> Result<(), ProtocolError> {
        self.get_repostore_from_overlay_id(&overlay, |store| {
            let _ = store.put(block)?;
            Ok(())
        })
    }

    pub fn get_block(
        &self,
        user: PubKey,
        overlay: OverlayId,
        id: BlockId,
        include_children: bool,
        topic: Option<PubKey>,
    ) -> Result<async_channel::Receiver<Block>, ProtocolError> {
        self.get_repostore_from_overlay_id(&overlay, |store| {
            let (s, r) = async_channel::unbounded::<Block>();
            if !include_children {
                let block = store.get(&id)?;
                s.send_blocking(block)
                    .map_err(|_e| ProtocolError::WriteError)?;
                Ok(r)
            } else {
                let obj = Object::load(id, None, store);
                // TODO return partial blocks when some are missing ?
                if obj.is_err() {
                    //&& obj.err().unwrap().len() == 1 && obj.err().unwrap()[0] == id {
                    return Err(ProtocolError::NotFound);
                }
                // TODO use a task to send non blocking (streaming)
                let o = obj.ok().unwrap();
                //debug_println!("{} BLOCKS ", o.blocks().len());
                let mut deduplicated: HashSet<BlockId> = HashSet::new();
                for block in o.blocks() {
                    let id = block.id();
                    if deduplicated.get(&id).is_none() {
                        s.send_blocking(block.clone())
                            .map_err(|_e| ProtocolError::WriteError)?;
                        deduplicated.insert(id);
                    }
                }
                Ok(r)
            }
        })
    }

    pub fn sync_branch(
        &self,
        user: PubKey,
        overlay: &OverlayId,
        heads: &Vec<ObjectId>,
        known_heads: &Vec<ObjectId>,
        known_commits: &BloomFilter,
    ) -> Result<async_channel::Receiver<Block>, ProtocolError> {
        //debug_println!("heads {:?}", heads);
        //debug_println!("known_heads {:?}", known_heads);
        //debug_println!("known_commits {:?}", known_commits);

        self.get_repostore_from_overlay_id(&overlay, |store| {
            let (s, r) = async_channel::unbounded::<Block>();

            let res = Branch::sync_req(heads, known_heads, known_commits, store)
                .map_err(|e| ProtocolError::ObjectParseError)?;

            // todo, use a task to send non blocking (streaming)
            debug_println!("SYNCING {} COMMITS", res.len());

            let mut deduplicated: HashSet<BlockId> = HashSet::new();

            for objectid in res {
                let object = Object::load(objectid, None, store)?;

                for block in object.blocks() {
                    let id = block.id();
                    if deduplicated.get(&id).is_none() {
                        s.send_blocking(block.clone())
                            .map_err(|_e| ProtocolError::WriteError)?;
                        deduplicated.insert(id);
                    }
                }
            }
            Ok(r)
        })
    }

    fn compute_repostore_id(&self, overlay: OverlayId, repo_id: Option<PubKey>) -> RepoStoreId {
        match self.mode {
            ConfigMode::Core => RepoStoreId::Overlay(overlay),
            ConfigMode::Local => RepoStoreId::Repo(repo_id.unwrap()),
        }
    }

    pub fn join_overlay(
        &self,
        user: PubKey,
        overlay_id: OverlayId,
        repo_id: Option<PubKey>,
        secret: SymKey,
        peers: &Vec<PeerAdvert>,
    ) -> Result<(), ProtocolError> {
        // check if this overlay already exists
        //debug_println!("SEARCHING OVERLAY");
        let overlay_res = Overlay::open(&overlay_id, &self.store);
        let overlay = match overlay_res {
            Err(StorageError::NotFound) => {
                // we have to add it
                if self.mode == ConfigMode::Local && repo_id.is_none() {
                    return Err(ProtocolError::RepoIdRequired);
                }
                let over = Overlay::create(
                    &overlay_id,
                    &secret,
                    if self.mode == ConfigMode::Local {
                        repo_id
                    } else {
                        None
                    },
                    &self.store,
                )?;
                // we need to add an encryption key for the repostore.
                let mut random_buf = [0u8; 32];
                getrandom::getrandom(&mut random_buf).unwrap();
                let key = SymKey::ChaCha20Key(random_buf);

                let _ = RepoStoreInfo::create(
                    &self.compute_repostore_id(overlay_id, repo_id),
                    &key,
                    &self.store,
                )?; // TODO in case of error, delete the previously created Overlay
                    //debug_println!("KEY ADDED");
                over
            }
            Err(e) => return Err(e.into()),
            Ok(overlay) => overlay,
        };
        //debug_println!("OVERLAY FOUND");
        // add the peers to the overlay
        for advert in peers {
            Peer::update_or_create(advert, &self.store)?;
            overlay.add_peer(&advert.peer())?;
        }
        //debug_println!("PEERS ADDED");

        // now adding the overlay_id to the account
        let account = Account::open(&user, &self.store)?; // TODO in case of error, delete the previously created Overlay
        account.add_overlay(&overlay_id)?;
        //debug_println!("USER <-> OVERLAY");

        //TODO: connect to peers

        Ok(())
    }
}
