// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Repo object (on heap) to handle a Repository

use crate::types::*;
use crate::user_storage::repo::RepoStorage;
use ng_net::actor::SoS;
use ng_net::broker::{Broker, BROKER};
use ng_repo::log::*;
use ng_repo::object::Object;
use ng_repo::{
    block_storage::BlockStorage,
    errors::{NgError, ProtocolError, ServerError, StorageError},
    file::RandomAccessFile,
    repo::Repo,
    store::Store,
    types::*,
    utils::{generate_keypair, sign},
};
use std::cmp::max;
use std::fs::{create_dir_all, read, write, File, OpenOptions};
use std::io::Write;

use core::fmt;
//use oxigraph::io::{RdfFormat, RdfParser, RdfSerializer};
//use oxigraph::store::Store;
//use oxigraph::model::GroundQuad;
#[cfg(not(target_family = "wasm"))]
use crate::rocksdb_user_storage::RocksDbUserStorage;
use crate::user_storage::{InMemoryUserStorage, UserStorage};
use async_std::sync::{Mutex, RwLockWriteGuard};
use std::{collections::HashMap, path::PathBuf, sync::Arc};

use ng_net::{
    connection::NoiseFSM,
    types::*,
    utils::{Receiver, Sender},
};

use serde::{Deserialize, Serialize};
use web_time::SystemTime;
//use yrs::{StateVector, Update};

pub struct Verifier {
    pub config: VerifierConfig,
    pub connected_server_id: Option<PubKey>,
    graph_dataset: Option<oxigraph::store::Store>,
    user_storage: Option<Arc<Box<dyn UserStorage>>>,
    block_storage: Option<Arc<std::sync::RwLock<dyn BlockStorage + Send + Sync>>>,
    last_seq_num: u64,
    peer_id: PubKey,
    max_reserved_seq_num: u64,
    last_reservation: SystemTime,
    stores: HashMap<OverlayId, Arc<Store>>,
    repos: HashMap<RepoId, Repo>,
    topics: HashMap<(OverlayId, TopicId), (RepoId, BranchId)>,
    /// only used for InMemory type, to store the outbox
    in_memory_outbox: Vec<EventOutboxStorage>,
}

impl fmt::Debug for Verifier {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "Verifier\nconfig: {:?}", self.config)?;
        writeln!(f, "connected_server_id: {:?}", self.connected_server_id)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct EventOutboxStorage {
    event: Event,
    overlay: OverlayId,
}

impl Verifier {
    #[allow(deprecated)]
    #[cfg(any(test, feature = "testing"))]
    pub fn new_dummy() -> Self {
        use ng_repo::block_storage::HashMapBlockStorage;
        let (peer_priv_key, peer_id) = generate_keypair();
        let block_storage = Arc::new(std::sync::RwLock::new(HashMapBlockStorage::new()))
            as Arc<std::sync::RwLock<dyn BlockStorage + Send + Sync>>;
        Verifier {
            config: VerifierConfig {
                config_type: VerifierConfigType::Memory,
                user_master_key: [0; 32],
                peer_priv_key,
                user_priv_key: PrivKey::random_ed(),
                private_store_read_cap: None,
                private_store_id: None,
            },
            connected_server_id: None,
            graph_dataset: None,
            user_storage: None,
            block_storage: Some(block_storage),
            last_seq_num: 0,
            peer_id,
            max_reserved_seq_num: 1,
            last_reservation: SystemTime::UNIX_EPOCH,
            stores: HashMap::new(),
            repos: HashMap::new(),
            topics: HashMap::new(),
            in_memory_outbox: vec![],
        }
    }

    pub fn load(&mut self) -> Result<(), NgError> {
        // log_info!(
        //     "SHOULD LOAD? {} {} {}",
        //     self.is_persistent(),
        //     self.user_storage.is_some(),
        //     self.block_storage.is_some()
        // );
        if self.is_persistent() && self.user_storage.is_some() && self.block_storage.is_some() {
            let user_storage = Arc::clone(self.user_storage.as_ref().unwrap());
            //log_info!("LOADING ...");
            let stores = user_storage.get_all_store_and_repo_ids()?;

            for (store, repos) in stores.iter() {
                //log_info!("LOADING STORE: {}", store);
                let repo = user_storage
                    .load_store(store, Arc::clone(self.block_storage.as_ref().unwrap()))?;
                self.stores.insert(
                    store.overlay_id_for_storage_purpose(),
                    Arc::clone(&repo.store),
                );
                let store = Arc::clone(&repo.store);
                self.add_repo_without_saving(repo);

                for repo_id in repos {
                    //log_info!("LOADING REPO: {}", repo_id);
                    let repo = user_storage.load_repo(repo_id, Arc::clone(&store))?;
                    self.add_repo_without_saving(repo);
                }
            }
        }
        Ok(())
    }

    fn is_persistent(&self) -> bool {
        self.config.config_type.is_persistent()
    }

    pub fn get_store_or_load(&mut self, store_repo: &StoreRepo) -> Arc<Store> {
        let overlay_id = store_repo.overlay_id_for_storage_purpose();
        let store = self.stores.entry(overlay_id).or_insert_with(|| {
            // FIXME: get store_readcap and store_overlay_branch_readcap from user storage
            let store_readcap = ReadCap::nil();
            let store_overlay_branch_readcap = ReadCap::nil();
            let store = Store::new(
                *store_repo,
                store_readcap,
                store_overlay_branch_readcap,
                Arc::clone(
                    &self
                        .block_storage
                        .as_ref()
                        .ok_or(core::fmt::Error)
                        .expect("get_store_or_load cannot be called on Remote Verifier"),
                ),
            );
            Arc::new(store)
        });
        Arc::clone(store)
    }

    pub fn complete_site_store(
        &mut self,
        store_repo: &StoreRepo,
        mut repo: Repo,
    ) -> Result<Repo, NgError> {
        let read_cap = repo.read_cap.to_owned().unwrap();
        let overlay_read_cap = repo.overlay_branch_read_cap().cloned();

        let overlay_id = store_repo.overlay_id_for_storage_purpose();
        let store = self
            .stores
            .remove(&overlay_id)
            .ok_or(NgError::StoreNotFound)?;
        // let mut repo = self
        //     .repos
        //     .remove(store_repo.repo_id())
        //     .ok_or(NgError::RepoNotFound)?;
        // log_info!(
        //     "{}",
        //     Arc::<ng_repo::store::Store>::strong_count(&repo.store)
        // );
        drop(repo.store);
        //log_info!("{}", Arc::<ng_repo::store::Store>::strong_count(&store));
        let mut mut_store = Arc::<ng_repo::store::Store>::into_inner(store).unwrap();
        mut_store.set_read_caps(read_cap, overlay_read_cap);
        let new_store = Arc::new(mut_store);
        let _ = self.stores.insert(overlay_id, Arc::clone(&new_store));
        // TODO: store in user_storage
        repo.store = new_store;
        //let _ = self.repos.insert(*store_repo.repo_id(), repo);
        Ok(repo)
    }

    pub fn get_store(&self, store_repo: &StoreRepo) -> Result<Arc<Store>, NgError> {
        let overlay_id = store_repo.overlay_id_for_storage_purpose();
        let store = self.stores.get(&overlay_id).ok_or(NgError::StoreNotFound)?;
        Ok(Arc::clone(store))
    }

    pub fn get_repo_mut(
        &mut self,
        id: &RepoId,
        store_repo: &StoreRepo,
    ) -> Result<&mut Repo, NgError> {
        let store = self.get_store(store_repo);
        let repo_ref = self.repos.get_mut(id).ok_or(NgError::RepoNotFound);
        // .or_insert_with(|| {
        //     // load from storage
        //     Repo {
        //         id: *id,
        //         repo_def: Repository::new(&PubKey::nil(), &vec![]),
        //         read_cap: None,
        //         write_cap: None,
        //         signer: None,
        //         members: HashMap::new(),
        //         branches: HashMap::new(),
        //         store,
        //     }
        // });
        repo_ref
    }

    pub fn get_repo(&self, id: RepoId, store_repo: &StoreRepo) -> Result<&Repo, NgError> {
        //let store = self.get_store(store_repo);
        let repo_ref = self.repos.get(&id).ok_or(NgError::RepoNotFound);
        repo_ref
    }

    pub fn add_store(&mut self, store: Arc<Store>) {
        let overlay_id = store.get_store_repo().overlay_id_for_storage_purpose();
        if self.stores.contains_key(&overlay_id) {
            return;
        }
        // TODO: store in user_storage
        self.stores.insert(overlay_id, store);
    }

    pub(crate) fn update_current_heads(
        &mut self,
        repo_id: &RepoId,
        branch_id: &BranchId,
        current_heads: Vec<ObjectRef>,
    ) -> Result<(), NgError> {
        let repo = self.repos.get_mut(repo_id).ok_or(NgError::RepoNotFound)?;
        let branch = repo
            .branches
            .get_mut(branch_id)
            .ok_or(NgError::BranchNotFound)?;
        branch.current_heads = current_heads;
        Ok(())
    }

    pub(crate) async fn new_event(
        &mut self,
        commit: &Commit,
        additional_blocks: &Vec<BlockId>,
        repo_id: RepoId,
        store_repo: &StoreRepo,
    ) -> Result<(), NgError> {
        if self.last_seq_num + 1 >= self.max_reserved_seq_num {
            self.reserve_more(1)?;
        }
        self.new_event_(commit, additional_blocks, repo_id, store_repo)
            .await
    }

    pub(crate) async fn new_event_with_repo(
        &mut self,
        commit: &Commit,
        additional_blocks: &Vec<BlockId>,
        repo: &Repo,
    ) -> Result<(), NgError> {
        if self.last_seq_num + 1 >= self.max_reserved_seq_num {
            self.reserve_more(1)?;
        }
        self.new_event_with_repo_(commit, additional_blocks, repo)
            .await
    }

    async fn new_event_(
        &mut self,
        commit: &Commit,
        additional_blocks: &Vec<BlockId>,
        repo_id: RepoId,
        store_repo: &StoreRepo,
    ) -> Result<(), NgError> {
        let publisher = self.config.peer_priv_key.clone();
        self.last_seq_num += 1;
        let seq_num = self.last_seq_num;
        let repo = self.get_repo(repo_id, store_repo)?;

        let event = Event::new(&publisher, seq_num, commit, additional_blocks, repo)?;
        self.send_or_save_event_to_outbox(event, repo.store.inner_overlay())
            .await?;
        Ok(())
    }

    async fn new_event_with_repo_(
        &mut self,
        commit: &Commit,
        additional_blocks: &Vec<BlockId>,
        repo: &Repo,
    ) -> Result<(), NgError> {
        let publisher = self.config.peer_priv_key.clone();
        self.last_seq_num += 1;
        let seq_num = self.last_seq_num;

        let event = Event::new(&publisher, seq_num, commit, additional_blocks, repo)?;
        self.send_or_save_event_to_outbox(event, repo.store.inner_overlay())
            .await?;
        Ok(())
    }

    pub(crate) fn last_seq_number(&mut self) -> Result<u64, NgError> {
        if self.available_seq_nums() <= 1 {
            self.reserve_more(1)?;
        }
        self.last_seq_num += 1;
        Ok(self.last_seq_num)
    }

    pub(crate) async fn new_events_with_repo(
        &mut self,
        events: Vec<(Commit, Vec<Digest>)>,
        repo: &Repo,
    ) -> Result<(), NgError> {
        let missing_count = events.len() as i64 - self.available_seq_nums() as i64;
        // this is reducing the capacity of reserver_seq_num by half (cast from u64 to i64)
        // but we will never reach situation where so many seq_nums are reserved, neither such a big list of events to process
        if missing_count >= 0 {
            self.reserve_more(missing_count as u64 + 1)?;
        }
        for event in events {
            self.new_event_with_repo_(&event.0, &event.1, repo).await?;
        }
        Ok(())
    }

    pub(crate) async fn new_events(
        &mut self,
        events: Vec<(Commit, Vec<Digest>)>,
        repo_id: RepoId,
        store_repo: &StoreRepo,
    ) -> Result<(), NgError> {
        let missing_count = events.len() as i64 - self.available_seq_nums() as i64;
        // this is reducing the capacity of reserver_seq_num by half (cast from u64 to i64)
        // but we will never reach situation where so many seq_nums are reserved, neither such a big list of events to process
        if missing_count >= 0 {
            self.reserve_more(missing_count as u64 + 1)?;
        }
        for event in events {
            self.new_event_(&event.0, &event.1, repo_id.clone(), store_repo)
                .await?;
        }
        Ok(())
    }

    fn available_seq_nums(&self) -> u64 {
        self.max_reserved_seq_num - self.last_seq_num
    }

    pub(crate) fn reserve_more(&mut self, at_least: u64) -> Result<(), NgError> {
        // the qty is calculated based on the last_reservation. the closer to now, the higher the qty.
        // below 1 sec, => 100
        // below 5 sec, => 10
        // above 5 sec => 1
        let qty = match self.last_reservation.elapsed().unwrap().as_secs() {
            0..=1 => 100u16,
            2..=5 => 10u16,
            6.. => 1u16,
        };
        self.take_some_peer_last_seq_numbers(max(at_least as u16, qty))
    }

    fn take_events_from_outbox(&mut self) -> Result<Vec<EventOutboxStorage>, NgError> {
        match &self.config.config_type {
            VerifierConfigType::JsSaveSession(js) => {
                let events_ser = (js.outbox_read_function)(self.peer_id)?;
                let mut res = Vec::with_capacity(events_ser.len());
                for event_ser in events_ser {
                    let event = serde_bare::from_slice(&event_ser)?;
                    res.push(event);
                }
                Ok(res)
            }
            VerifierConfigType::RocksDb(path) => {
                let mut path = path.clone();
                path.push(format!("outbox{}", self.peer_id.to_hash_string()));
                let file = read(path.clone());
                let mut res = vec![];
                match file {
                    Ok(ser) => {
                        if ser.len() > 0 {
                            let mut pos: usize = 0;
                            let usize_size = usize::BITS as usize / 8;
                            loop {
                                let size = usize::from_le_bytes(
                                    ser[pos..pos + usize_size]
                                        .try_into()
                                        .map_err(|_| NgError::SerializationError)?,
                                );
                                //log_info!("size={}", size);
                                pos += usize_size;
                                //let buff = &ser[pos..pos + size];
                                //log_info!("EVENT={:?}", buff.len());
                                let event = serde_bare::from_slice(&ser[pos..pos + size])?;
                                //log_info!("EVENT_DESER={:?}", event);
                                res.push(event);
                                pos += size;
                                if pos >= ser.len() {
                                    break;
                                }
                            }
                        }
                    }
                    Err(_) => {}
                }
                let _ = std::fs::remove_file(path);
                Ok(res)
            }
            VerifierConfigType::Memory => {
                let res = self.in_memory_outbox.drain(..).collect();
                Ok(res)
            }
            _ => unimplemented!(),
        }
    }

    async fn send_or_save_event_to_outbox<'a>(
        &'a mut self,
        event: Event,
        overlay: OverlayId,
    ) -> Result<(), NgError> {
        log_debug!("========== EVENT {:03}: {}", event.seq_num(), event);

        if self.connected_server_id.is_some() {
            // send the event to the server already
            let broker = BROKER.write().await;
            let user = self.config.user_priv_key.to_pub();
            let remote = self.connected_server_id.to_owned().unwrap();
            self.send_event(event, &broker, &user, &remote, overlay)
                .await?;
        } else {
            match &self.config.config_type {
                VerifierConfigType::JsSaveSession(js) => {
                    let e = EventOutboxStorage { event, overlay };
                    (js.outbox_write_function)(
                        self.peer_id,
                        e.event.seq_num(),
                        serde_bare::to_vec(&e)?,
                    )?;
                }
                VerifierConfigType::RocksDb(path) => {
                    let mut path = path.clone();
                    std::fs::create_dir_all(path.clone()).unwrap();
                    path.push(format!("outbox{}", self.peer_id.to_hash_string()));
                    let mut file = OpenOptions::new()
                        .append(true)
                        .create(true)
                        .open(path)
                        .map_err(|_| NgError::IoError)?;
                    let e = EventOutboxStorage { event, overlay };
                    let event_ser = serde_bare::to_vec(&e)?;
                    //log_info!("EVENT size={}", event_ser.len());
                    //log_info!("EVENT {:?}", event_ser);
                    let size_ser = event_ser.len().to_le_bytes().to_vec();
                    file.write_all(&size_ser).map_err(|_| NgError::IoError)?;
                    file.flush().map_err(|_| NgError::IoError)?;
                    file.write_all(&event_ser).map_err(|_| NgError::IoError)?;
                    file.flush().map_err(|_| NgError::IoError)?;
                    file.sync_data().map_err(|_| NgError::IoError)?;
                }
                VerifierConfigType::Memory => {
                    self.in_memory_outbox
                        .push(EventOutboxStorage { event, overlay });
                }
                _ => unimplemented!(),
            }
        }
        Ok(())
    }

    async fn send_event<'a>(
        &mut self,
        event: Event,
        broker: &RwLockWriteGuard<'a, Broker<'a>>,
        user: &UserId,
        remote: &DirectPeerId,
        overlay: OverlayId,
    ) -> Result<(), NgError> {
        assert!(overlay.is_inner());
        //log_info!("searching for topic {} {}", overlay, event.topic_id());
        let (repo_id, branch_id) = self
            .topics
            .get(&(overlay, *event.topic_id()))
            .ok_or(NgError::TopicNotFound)?
            .to_owned();
        let opened_as_publisher;
        {
            let repo = self.repos.get(&repo_id).ok_or(NgError::RepoNotFound)?;
            opened_as_publisher = repo.branch_is_opened_as_publisher(&branch_id);
        }
        if !opened_as_publisher {
            let msg = RepoPinStatusReq::V0(RepoPinStatusReqV0 {
                hash: repo_id.into(),
                overlay: Some(overlay),
            });
            match broker
                .request::<RepoPinStatusReq, RepoPinStatus>(user, remote, msg)
                .await
            {
                Err(NgError::ServerError(ServerError::False))
                | Err(NgError::ServerError(ServerError::RepoAlreadyOpened)) => {
                    // pinning the repo on the server broker
                    let pin_req;
                    {
                        let repo = self.repos.get(&repo_id).ok_or(NgError::RepoNotFound)?;
                        pin_req = PinRepo::from_repo(repo, remote);
                    }
                    match broker
                        .request::<PinRepo, RepoOpened>(user, remote, pin_req)
                        .await
                    {
                        Ok(SoS::Single(opened)) => {
                            //log_info!("OPENED {:?}", opened);
                            self.repo_was_opened(&repo_id, &opened)?;
                            //TODO: check that in the returned opened_repo, the branch we are interested in has effectively been subscribed as publisher by the broker.
                        }
                        Ok(_) => return Err(NgError::InvalidResponse),
                        Err(e) => return Err(e),
                    }
                }
                Err(e) => return Err(e),
                Ok(SoS::Single(pin_status)) => {
                    // checking that the branch is subscribed as publisher

                    if !pin_status.is_topic_subscribed_as_publisher(event.topic_id()) {
                        // we need to subscribe as publisher
                        let topic_sub;
                        {
                            let repo = self.repos.get(&repo_id).ok_or(NgError::RepoNotFound)?;
                            let branch_info = repo.branch(&branch_id)?;
                            if branch_info.topic_priv_key.is_none() {
                                return Err(NgError::PermissionDenied);
                            }
                            topic_sub = TopicSub::new(repo, branch_info, Some(remote));
                        }
                        match broker
                            .request::<TopicSub, TopicSubRes>(user, remote, topic_sub)
                            .await
                        {
                            Ok(SoS::Single(sub)) => {
                                // TODO, deal with heads
                                let repo =
                                    self.repos.get_mut(&repo_id).ok_or(NgError::RepoNotFound)?;
                                Self::branch_was_opened(&self.topics, repo, &sub)?;
                            }
                            Ok(_) => return Err(NgError::InvalidResponse),
                            Err(e) => {
                                return Err(e);
                            }
                        }
                    }
                }
                _ => return Err(NgError::InvalidResponse),
            }
            // TODO: deal with received known_heads.
            // DO a TopicSync
        }
        let _ = broker
            .request::<PublishEvent, ()>(user, remote, PublishEvent::new(event, overlay))
            .await?;

        Ok(())
    }

    pub async fn send_outbox(&mut self) -> Result<(), NgError> {
        let events = self.take_events_from_outbox()?;
        let broker = BROKER.write().await;
        let user = self.config.user_priv_key.to_pub();
        let remote = self
            .connected_server_id
            .as_ref()
            .ok_or(NgError::NotConnected)?
            .clone();
        for e in events {
            self.send_event(e.event, &broker, &user, &remote, e.overlay)
                .await?;
        }
        Ok(())
    }

    fn take_some_peer_last_seq_numbers(&mut self, qty: u16) -> Result<(), NgError> {
        match &self.config.config_type {
            VerifierConfigType::JsSaveSession(js) => {
                let res = (js.last_seq_function)(self.peer_id, qty)?;
                self.max_reserved_seq_num = res + qty as u64;
            }
            VerifierConfigType::RocksDb(path) => {
                let mut path = path.clone();
                std::fs::create_dir_all(path.clone()).unwrap();
                path.push(format!("lastseq{}", self.peer_id.to_hash_string()));
                log_debug!("last_seq path {}", path.display());

                let file = read(path.clone());
                let (mut file_save, val) = match file {
                    Ok(ser) => {
                        let old_val = if ser.len() > 0 {
                            match SessionPeerLastSeq::deser(&ser)? {
                                SessionPeerLastSeq::V0(v) => v,
                                _ => unimplemented!(),
                            }
                        } else {
                            0
                        };
                        (
                            OpenOptions::new()
                                .write(true)
                                .open(path)
                                .map_err(|_| NgError::IoError)?,
                            old_val,
                        )
                    }
                    Err(_) => (File::create(path).map_err(|_| NgError::IoError)?, 0),
                };
                if qty > 0 {
                    let new_val = val + qty as u64;
                    let spls = SessionPeerLastSeq::V0(new_val);
                    let ser = spls.ser()?;
                    file_save.write_all(&ser).map_err(|_| NgError::IoError)?;

                    file_save.sync_data().map_err(|_| NgError::IoError)?;
                }
                self.max_reserved_seq_num = val + qty as u64;
            }
            _ => {
                self.max_reserved_seq_num += qty as u64;
            }
        }
        self.last_reservation = SystemTime::now();
        log_debug!(
            "reserving more {qty} seq_nums. now at {}",
            self.max_reserved_seq_num
        );
        Ok(())
    }

    pub fn new(
        config: VerifierConfig,
        block_storage: Arc<std::sync::RwLock<dyn BlockStorage + Send + Sync>>,
    ) -> Result<Self, NgError> {
        let (graph, user, block) = match &config.config_type {
            VerifierConfigType::Memory | VerifierConfigType::JsSaveSession(_) => (
                Some(oxigraph::store::Store::new().unwrap()),
                Some(Box::new(InMemoryUserStorage::new()) as Box<dyn UserStorage>),
                Some(block_storage),
            ),
            #[cfg(not(target_family = "wasm"))]
            VerifierConfigType::RocksDb(path) => {
                let mut path_oxi = path.clone();
                path_oxi.push("graph");
                create_dir_all(path_oxi.clone()).unwrap();
                let mut path_user = path.clone();
                path_user.push("user");
                create_dir_all(path_user.clone()).unwrap();
                (
                    // FIXME BIG TIME: we are reusing the same encryption key here.
                    // this is very temporary, until we remove the code in oxi_rocksdb of oxigraph,
                    // and have oxigraph use directly the UserStorage
                    Some(
                        oxigraph::store::Store::open_with_key(path_oxi, config.user_master_key)
                            .unwrap(),
                    ),
                    Some(Box::new(RocksDbUserStorage::open(
                        &path_user,
                        config.user_master_key,
                    )?) as Box<dyn UserStorage>),
                    Some(block_storage),
                )
            }
            VerifierConfigType::Remote(_) => (None, None, None),
            _ => unimplemented!(), // can be WebRocksDb or RocksDb on wasm platforms
        };
        let peer_id = config.peer_priv_key.to_pub();
        let mut verif = Verifier {
            config,
            connected_server_id: None,
            graph_dataset: graph,
            user_storage: user.map(|u| Arc::new(u)),
            block_storage: block,
            peer_id,
            last_reservation: SystemTime::UNIX_EPOCH, // this is to avoid reserving 100 seq_nums at every start of a new session
            max_reserved_seq_num: 0,
            last_seq_num: 0,
            stores: HashMap::new(),
            repos: HashMap::new(),
            topics: HashMap::new(),
            in_memory_outbox: vec![],
        };
        // this is important as it will load the last seq from storage
        if verif.config.config_type.should_load_last_seq_num() {
            verif.take_some_peer_last_seq_numbers(0)?;
            verif.last_seq_num = verif.max_reserved_seq_num;
            verif.last_reservation = SystemTime::UNIX_EPOCH;
        }
        Ok(verif)
    }

    pub fn doc_fetch(
        &mut self,
        nuri: String,
        payload: Option<AppRequestPayload>,
    ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
        unimplemented!();
    }

    pub async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        unimplemented!();
    }

    fn add_repo_without_saving(&mut self, repo: Repo) {
        self.add_repo_(repo);
    }

    fn add_repo_and_save(&mut self, repo: Repo) -> &Repo {
        let user_storage = self
            .user_storage
            .as_ref()
            .map(|us| Arc::clone(us))
            .and_then(|u| if self.is_persistent() { Some(u) } else { None });
        let repo_ref: &Repo = self.add_repo_(repo);
        // save in user_storage
        if user_storage.is_some() {
            let _ = user_storage.unwrap().save_repo(repo_ref);
        }
        repo_ref
    }

    fn add_repo_(&mut self, repo: Repo) -> &Repo {
        for (branch_id, info) in repo.branches.iter() {
            //log_info!("LOADING BRANCH: {}", branch_id);
            let overlay_id: OverlayId = repo.store.inner_overlay();
            let topic_id = info.topic.clone();
            //log_info!("LOADING TOPIC: {} {}", overlay_id, topic_id);
            let repo_id = repo.id.clone();
            let branch_id = branch_id.clone();
            let res = self
                .topics
                .insert((overlay_id, topic_id), (repo_id, branch_id));
            assert_eq!(res, None);
        }
        let repo_ref = self.repos.entry(repo.id).or_insert(repo);
        repo_ref
    }

    fn branch_was_opened(
        topics: &HashMap<(OverlayId, PubKey), (PubKey, PubKey)>,
        repo: &mut Repo,
        sub: &TopicSubRes,
    ) -> Result<(), NgError> {
        let overlay = repo.store.inner_overlay();
        //log_info!("branch_was_opened searching for topic {}", sub.topic_id());
        let (_, branch_id) = topics
            .get(&(overlay, *sub.topic_id()))
            .ok_or(NgError::TopicNotFound)?;
        repo.opened_branches.insert(*branch_id, sub.is_publisher());
        Ok(())
    }

    fn repo_was_opened(
        &mut self,
        repo_id: &RepoId,
        opened_repo: &RepoOpened,
    ) -> Result<(), NgError> {
        let repo = self.repos.get_mut(repo_id).ok_or(NgError::RepoNotFound)?;
        for sub in opened_repo {
            Self::branch_was_opened(&self.topics, repo, sub)?;
        }
        Ok(())
    }

    pub async fn new_store_default<'a>(
        &'a mut self,
        creator: &UserId,
        creator_priv_key: &PrivKey,
        priv_key: PrivKey,
        store_repo: &StoreRepo,
        private: bool,
    ) -> Result<&'a Repo, NgError> {
        let repo_write_cap_secret = match private {
            false => SymKey::random(),
            true => SymKey::nil(),
        };
        let overlay_id = store_repo.overlay_id_for_storage_purpose();
        let store = self.stores.entry(overlay_id).or_insert_with(|| {
            let store_readcap = ReadCap::nil();
            // temporarily set the store_overlay_branch_readcap to an objectRef that has an empty id, and a key = to the repo_write_cap_secret
            let store_overlay_branch_readcap =
                ReadCap::from_id_key(ObjectId::nil(), repo_write_cap_secret.clone());
            let store = Store::new(
                *store_repo,
                store_readcap,
                store_overlay_branch_readcap,
                Arc::clone(
                    &self
                        .block_storage
                        .as_ref()
                        .ok_or(core::fmt::Error)
                        .expect("get_store_or_load cannot be called on Remote Verifier"),
                ),
            );
            Arc::new(store)
        });
        let (repo, proto_events) = Arc::clone(store).create_repo_with_keys(
            creator,
            creator_priv_key,
            priv_key,
            store_repo.repo_id().clone(),
            repo_write_cap_secret,
            true,
            private,
        )?;
        let repo = self.complete_site_store(store_repo, repo)?;
        self.new_events_with_repo(proto_events, &repo).await?;
        let repo_ref = self.add_repo_and_save(repo);
        Ok(repo_ref)
    }

    /// returns the Repo and the last seq_num of the peer
    pub async fn new_repo_default<'a>(
        &'a mut self,
        creator: &UserId,
        creator_priv_key: &PrivKey,
        store_repo: &StoreRepo,
    ) -> Result<&'a Repo, NgError> {
        let store = self.get_store_or_load(store_repo);
        let repo_write_cap_secret = SymKey::random();
        let (repo, proto_events) = store.create_repo_default(
            creator,
            creator_priv_key,
            repo_write_cap_secret,
            false,
            false,
        )?;
        self.new_events_with_repo(proto_events, &repo).await?;
        let repo_ref = self.add_repo_and_save(repo);
        Ok(repo_ref)
    }
}
#[cfg(test)]
mod test {

    use crate::types::*;
    use crate::verifier::*;
    use ng_repo::log::*;
    use ng_repo::store::Store;

    #[async_std::test]
    pub async fn test_new_repo_default() {
        let (creator_priv_key, creator_pub_key) = generate_keypair();

        let (publisher_privkey, publisher_pubkey) = generate_keypair();
        let publisher_peer = PeerId::Forwarded(publisher_pubkey);

        let store = Store::dummy_public_v0();
        let store_repo = store.get_store_repo().clone();
        let mut verifier = Verifier::new_dummy();
        verifier.add_store(store);

        let repo = verifier
            .new_repo_default(&creator_pub_key, &creator_priv_key, &store_repo)
            .await
            .expect("new_default");

        log_debug!("REPO OBJECT {}", repo);

        assert_eq!(verifier.last_seq_num, 5);
    }
}
