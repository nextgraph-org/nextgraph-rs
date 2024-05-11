// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Repo object (on heap) to handle a Repository

use core::fmt;
use std::cmp::max;
use std::collections::BTreeMap;
use std::collections::HashSet;
#[cfg(not(target_arch = "wasm32"))]
use std::fs::create_dir_all;
use std::fs::{read, File, OpenOptions};
use std::io::Write;
use std::{collections::HashMap, sync::Arc};

use async_std::stream::StreamExt;
use async_std::sync::{Mutex, RwLockReadGuard};
use fastbloom_rs::{BloomFilter as Filter, FilterBuilder, Hashes, Membership};
use futures::channel::mpsc;
use futures::SinkExt;
use ng_repo::object::Object;
use serde::{Deserialize, Serialize};
use web_time::SystemTime;

//use oxigraph::io::{RdfFormat, RdfParser, RdfSerializer};
//use oxigraph::store::Store;
//use oxigraph::model::GroundQuad;
//use yrs::{StateVector, Update};

use ng_repo::file::ReadFile;
use ng_repo::log::*;
#[cfg(any(test, feature = "testing"))]
use ng_repo::utils::generate_keypair;
use ng_repo::{
    block_storage::{store_max_value_size, BlockStorage, HashMapBlockStorage},
    errors::{NgError, ProtocolError, ServerError, StorageError, VerifierError},
    file::RandomAccessFile,
    repo::{BranchInfo, Repo},
    store::Store,
    types::*,
};

use ng_net::actor::SoS;
use ng_net::broker::{Broker, BROKER};
use ng_net::{
    connection::NoiseFSM,
    types::*,
    utils::{Receiver, Sender},
};

use crate::commits::*;
#[cfg(not(target_family = "wasm"))]
use crate::rocksdb_user_storage::RocksDbUserStorage;
use crate::types::*;
use crate::user_storage::InMemoryUserStorage;
use crate::user_storage::UserStorage;

// pub trait IVerifier {
//     fn add_branch_and_save(
//         &mut self,
//         repo_id: &RepoId,
//         branch_info: BranchInfo,
//         store_repo: &StoreRepo,
//     ) -> Result<(), VerifierError>;

//     fn add_repo_and_save(&mut self, repo: Repo) -> &Repo;

//     fn get_repo(&self, id: &RepoId, store_repo: &StoreRepo) -> Result<&Repo, NgError>;
// }

pub struct Verifier {
    pub config: VerifierConfig,
    pub connected_server_id: Option<PubKey>,
    #[allow(dead_code)]
    graph_dataset: Option<oxigraph::store::Store>,
    pub(crate) user_storage: Option<Arc<Box<dyn UserStorage>>>,
    block_storage: Option<Arc<std::sync::RwLock<dyn BlockStorage + Send + Sync>>>,
    last_seq_num: u64,
    peer_id: PubKey,
    max_reserved_seq_num: u64,
    last_reservation: SystemTime,
    stores: HashMap<OverlayId, Arc<Store>>,
    inner_to_outer: HashMap<OverlayId, OverlayId>,
    pub(crate) repos: HashMap<RepoId, Repo>,
    // TODO: deal with collided repo_ids. self.repos should be a HashMap<RepoId,Collision> enum Collision {Yes, No(Repo)}
    // add a collided_repos: HashMap<(OverlayId, RepoId), Repo>
    // only use get_repo() everywhere in the code (always passing the overlay) so that collisions can be handled.
    // also do the same in RocksdbStorage
    /// (OverlayId, TopicId), (RepoId, BranchId)
    pub(crate) topics: HashMap<(OverlayId, TopicId), (RepoId, BranchId)>,
    /// only used for InMemory type, to store the outbox
    in_memory_outbox: Vec<EventOutboxStorage>,
    uploads: BTreeMap<u32, RandomAccessFile>,
    branch_subscriptions: HashMap<BranchId, Sender<AppResponse>>,
}

impl fmt::Debug for Verifier {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "Verifier\nconfig: {:?}", self.config)?;
        writeln!(f, "connected_server_id: {:?}", self.connected_server_id)?;
        writeln!(f, "stores: {:?}", self.stores)?;
        writeln!(f, "repos: {:?}", self.repos)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct EventOutboxStorage {
    event: Event,
    overlay: OverlayId,
}

impl Verifier {
    pub fn user_privkey(&self) -> &PrivKey {
        &self.config.user_priv_key
    }

    pub(crate) fn start_upload(&mut self, content_type: String, store: Arc<Store>) -> u32 {
        let mut first_available: u32 = 0;
        for upload in self.uploads.keys() {
            if *upload != first_available + 1 {
                break;
            } else {
                first_available += 1;
            }
        }
        first_available += 1;

        let ret = self.uploads.insert(
            first_available,
            RandomAccessFile::new_empty(store_max_value_size(), content_type, vec![], store),
        );
        assert!(ret.is_none());
        first_available
    }

    pub(crate) fn continue_upload(
        &mut self,
        upload_id: u32,
        data: &Vec<u8>,
    ) -> Result<(), NgError> {
        let file = self
            .uploads
            .get_mut(&upload_id)
            .ok_or(NgError::WrongUploadId)?;
        Ok(file.write(data)?)
    }

    pub(crate) fn finish_upload(&mut self, upload_id: u32) -> Result<ObjectRef, NgError> {
        let mut file = self
            .uploads
            .remove(&upload_id)
            .ok_or(NgError::WrongUploadId)?;
        let _id = file.save()?;
        Ok(file.reference().unwrap())
    }

    pub(crate) async fn put_all_blocks_of_file(
        &self,
        file_ref: &ObjectRef,
        repo_id: &RepoId,
        store_repo: &StoreRepo,
    ) -> Result<(), NgError> {
        let repo = self.get_repo(&repo_id, &store_repo)?;
        // check that the referenced object exists locally.
        repo.store.has(&file_ref.id)?;
        // we send all the blocks to the broker.
        let file = RandomAccessFile::open(
            file_ref.id.clone(),
            file_ref.key.clone(),
            Arc::clone(&repo.store),
        )?;
        let blocks = file.get_all_blocks_ids()?;
        let found = self.has_blocks(blocks, repo).await?;
        for block_id in found.missing() {
            let block = repo.store.get(block_id)?;
            self.put_blocks(vec![block], repo).await?;
        }
        Ok(())
    }

    pub(crate) async fn push_app_response(&mut self, branch: &BranchId, response: AppResponse) {
        // log_info!(
        //     "push_app_response {} {:?}",
        //     branch,
        //     self.branch_subscriptions
        // );
        if let Some(sender) = self.branch_subscriptions.get_mut(branch) {
            if sender.is_closed() {
                log_info!("closed so removed {}", branch);
                self.branch_subscriptions.remove(branch);
            } else {
                let _ = sender.send(response).await;
            }
        }
    }

    pub(crate) async fn create_branch_subscription(
        &mut self,
        branch: BranchId,
    ) -> Result<(Receiver<AppResponse>, CancelFn), VerifierError> {
        //log_info!("#### create_branch_subscription {}", branch);
        let (tx, rx) = mpsc::unbounded::<AppResponse>();
        //log_info!("SUBSCRIBE");
        if let Some(returned) = self.branch_subscriptions.insert(branch, tx.clone()) {
            //log_info!("RESUBSCRIBE");
            if !returned.is_closed() {
                //log_info!("FORCE CLOSE");
                returned.close_channel();
                //return Err(VerifierError::DoubleBranchSubscription);
            }
        }

        //let tx = self.branch_subscriptions.entry(branch).or_insert_with(|| {});
        for file in self
            .user_storage
            .as_ref()
            .unwrap()
            .branch_get_all_files(&branch)?
        {
            self.push_app_response(&branch, AppResponse::V0(AppResponseV0::File(file)))
                .await;
        }

        let fnonce = Box::new(move || {
            log_info!("CLOSE_CHANNEL of subscription for branch {}", branch);
            if !tx.is_closed() {
                tx.close_channel();
            }
        });
        Ok((rx, fnonce))
    }

    #[allow(deprecated)]
    #[cfg(any(test, feature = "testing"))]
    pub fn new_dummy() -> Self {
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
                protected_store_id: None,
                public_store_id: None,
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
            inner_to_outer: HashMap::new(),
            uploads: BTreeMap::new(),
            branch_subscriptions: HashMap::new(),
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
                self.populate_topics(&repo);
                self.add_repo_without_saving(repo);

                for repo_id in repos {
                    //log_info!("LOADING REPO: {}", repo_id);
                    let repo = user_storage.load_repo(repo_id, Arc::clone(&store))?;
                    self.populate_topics(&repo);
                    self.add_repo_without_saving(repo);
                }
            }
        }
        Ok(())
    }

    fn is_persistent(&self) -> bool {
        self.config.config_type.is_persistent()
    }

    #[allow(dead_code)]
    fn is_in_memory(&self) -> bool {
        self.config.config_type.is_in_memory()
    }

    fn need_bootstrap(&self) -> bool {
        self.stores.is_empty()
    }

    fn get_arc_block_storage(
        &self,
    ) -> Result<Arc<std::sync::RwLock<dyn BlockStorage + Send + Sync>>, VerifierError> {
        Ok(Arc::clone(
            self.block_storage
                .as_ref()
                .ok_or(VerifierError::NoBlockStorageAvailable)?,
        ))
    }

    pub fn get_store_or_load(&mut self, store_repo: &StoreRepo) -> Arc<Store> {
        let overlay_id = store_repo.overlay_id_for_storage_purpose();
        let block_storage = self
            .get_arc_block_storage()
            .expect("get_store_or_load cannot be called on Remote Verifier");
        let store = self.stores.entry(overlay_id).or_insert_with(|| {
            // FIXME: get store_readcap and store_overlay_branch_readcap from user storage
            let store_readcap = ReadCap::nil();
            let store_overlay_branch_readcap = ReadCap::nil();
            let store = Store::new(
                *store_repo,
                store_readcap,
                store_overlay_branch_readcap,
                block_storage,
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
        // if repo_already_inserted {
        //     let mut repo = self
        //         .repos
        //         .remove(store_repo.repo_id())
        //         .ok_or(NgError::RepoNotFound)?;
        //     log_info!(
        //         "{}",
        //         Arc::<ng_repo::store::Store>::strong_count(&repo.store)
        //     );
        // }
        drop(repo.store);
        //log_info!("{}", Arc::<ng_repo::store::Store>::strong_count(&store));
        let mut mut_store = Arc::<ng_repo::store::Store>::into_inner(store).unwrap();
        mut_store.set_read_caps(read_cap, overlay_read_cap);
        let new_store = Arc::new(mut_store);
        let _ = self.stores.insert(overlay_id, Arc::clone(&new_store));
        repo.store = new_store;
        // if repo_already_inserted {
        //     let _ = self.repos.insert(*store_repo.repo_id(), repo);
        // }

        Ok(repo)
    }

    pub fn complete_site_store_already_inserted(
        &mut self,
        store_repo: StoreRepo,
    ) -> Result<(), NgError> {
        let overlay_id = store_repo.overlay_id_for_storage_purpose();
        let store = self
            .stores
            .remove(&overlay_id)
            .ok_or(NgError::StoreNotFound)?;

        let mut repo = self.repos.remove(store.id()).ok_or(NgError::RepoNotFound)?;
        // log_info!(
        //     "{}",
        //     Arc::<ng_repo::store::Store>::strong_count(&repo.store)
        // );
        let read_cap = repo.read_cap.to_owned().unwrap();
        let overlay_read_cap = repo.overlay_branch_read_cap().cloned();

        drop(repo.store);
        //log_info!("{}", Arc::<ng_repo::store::Store>::strong_count(&store));
        let mut mut_store = Arc::<ng_repo::store::Store>::into_inner(store).unwrap();
        mut_store.set_read_caps(read_cap, overlay_read_cap);
        let new_store = Arc::new(mut_store);
        let _ = self.stores.insert(overlay_id, Arc::clone(&new_store));
        repo.store = new_store;

        let _ = self.repos.insert(*store_repo.repo_id(), repo);

        Ok(())
    }

    pub fn get_store(&self, store_repo: &StoreRepo) -> Result<Arc<Store>, VerifierError> {
        let overlay_id = store_repo.overlay_id_for_storage_purpose();
        let store = self
            .stores
            .get(&overlay_id)
            .ok_or(VerifierError::StoreNotFound)?;
        Ok(Arc::clone(store))
    }

    pub fn get_repo_mut(
        &mut self,
        id: &RepoId,
        _store_repo: &StoreRepo,
    ) -> Result<&mut Repo, VerifierError> {
        //let store = self.get_store(store_repo);
        let repo_ref = self.repos.get_mut(id).ok_or(VerifierError::RepoNotFound);
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

    pub fn add_store(&mut self, store: Arc<Store>) {
        let overlay_id = store.get_store_repo().overlay_id_for_storage_purpose();
        if self.stores.contains_key(&overlay_id) {
            return;
        }
        // TODO: store in user_storage
        self.stores.insert(overlay_id, store);
    }

    // pub(crate) fn update_current_heads(
    //     &mut self,
    //     repo_id: &RepoId,
    //     branch_id: &BranchId,
    //     current_heads: Vec<ObjectRef>,
    // ) -> Result<(), VerifierError> {
    //     let repo = self
    //         .repos
    //         .get_mut(repo_id)
    //         .ok_or(VerifierError::RepoNotFound)?;
    //     let branch = repo
    //         .branches
    //         .get_mut(branch_id)
    //         .ok_or(VerifierError::BranchNotFound)?;
    //     branch.current_heads = current_heads;
    //     Ok(())
    // }

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
        let repo = self.get_repo(&repo_id, store_repo)?;

        let event = Event::new(&publisher, seq_num, commit, additional_blocks, repo)?;
        let past = commit.direct_causal_past();
        self.send_or_save_event_to_outbox(
            commit.reference().unwrap(),
            past,
            event,
            repo.store.inner_overlay(),
        )
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
        self.send_or_save_event_to_outbox(
            commit.reference().unwrap(),
            commit.direct_causal_past(),
            event,
            repo.store.inner_overlay(),
        )
        .await?;
        Ok(())
    }

    #[allow(dead_code)]
    pub(crate) fn last_seq_number(&mut self) -> Result<u64, NgError> {
        if self.available_seq_nums() <= 1 {
            self.reserve_more(1)?;
        }
        self.last_seq_num += 1;
        Ok(self.last_seq_num)
    }

    pub(crate) async fn new_commit(
        &mut self,
        commit_body: CommitBodyV0,
        repo_id: &RepoId,
        branch_id: &BranchId,
        store_repo: &StoreRepo,
        additional_blocks: &Vec<BlockId>,
        deps: Vec<ObjectRef>,
        files: Vec<ObjectRef>,
    ) -> Result<(), NgError> {
        let commit = {
            let repo = self.get_repo(repo_id, &store_repo)?;
            let branch = repo.branch(branch_id)?;
            let commit = Commit::new_with_body_and_save(
                self.user_privkey(),
                &self.user_privkey().to_pub(),
                *branch_id,
                QuorumType::NoSigning,
                deps,
                vec![],
                branch.current_heads.clone(),
                vec![],
                files,
                vec![],
                vec![],
                CommitBody::V0(commit_body),
                0,
                &repo.store,
            )?;
            self.verify_commit_(&commit, branch_id, repo_id, Arc::clone(&repo.store), true)
                .await?;
            commit
        };
        //log_info!("{}", commit);

        self.new_event(&commit, additional_blocks, *repo_id, store_repo)
            .await
    }

    #[allow(dead_code)]
    pub(crate) async fn new_commit_simple(
        &mut self,
        commit_body: CommitBodyV0,
        repo_id: &RepoId,
        branch_id: &BranchId,
        store_repo: &StoreRepo,
        additional_blocks: &Vec<BlockId>,
    ) -> Result<(), NgError> {
        self.new_commit(
            commit_body,
            repo_id,
            branch_id,
            store_repo,
            additional_blocks,
            vec![],
            vec![],
        )
        .await
    }

    #[allow(dead_code)]
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
        commit_ref: ObjectRef,
        past: Vec<ObjectRef>,
        event: Event,
        overlay: OverlayId,
    ) -> Result<(), NgError> {
        //log_info!("========== EVENT {:03}: {}", event.seq_num(), event);

        let (repo_id, branch_id) = self
            .topics
            .get(&(overlay, *event.topic_id()))
            .ok_or(NgError::TopicNotFound)?
            .to_owned();

        self.update_branch_current_heads(&repo_id, &branch_id, past, commit_ref)?;

        if self.connected_server_id.is_some() {
            // send the event to the server already
            let broker = BROKER.read().await;
            let user = self.config.user_priv_key.to_pub();
            let remote = self.connected_server_id.to_owned().unwrap();
            self.send_event(event, &broker, &user, &remote, overlay)
                .await?;
        } else {
            match &self.config.config_type {
                VerifierConfigType::JsSaveSession(js) => {
                    //log_info!("========== SAVING EVENT {:03}", event.seq_num());
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

    pub fn connection_lost(&mut self) {
        self.connected_server_id = None;
        // for (_, repo) in self.repos.iter_mut() {
        //     repo.opened_branches = HashMap::new();
        // }
    }

    pub async fn connection_opened(&mut self, peer: DirectPeerId) -> Result<(), NgError> {
        self.connected_server_id = Some(peer);
        if let Err(e) = self.bootstrap().await {
            self.connected_server_id = None;
            return Err(e);
        }

        let mut branches = vec![];
        {
            for (id, repo) in self.repos.iter_mut() {
                for (branch, publisher) in repo.opened_branches.iter() {
                    branches.push((*id, *branch, *publisher));
                }
                repo.opened_branches = HashMap::new();
            }
        }

        let res = self.send_outbox().await;
        log_info!("SENDING EVENTS FROM OUTBOX RETURNED: {:?}", res);

        let user = self.config.user_priv_key.to_pub();
        let broker = BROKER.read().await;
        for (repo, branch, publisher) in branches {
            let _ = self
                .open_branch_(&repo, &branch, publisher, &broker, &user, &peer, false)
                .await;
            // discarding error.
        }
        Ok(())
    }

    pub(crate) async fn open_branch(
        &mut self,
        repo_id: &RepoId,
        branch: &BranchId,
        as_publisher: bool,
    ) -> Result<(), NgError> {
        let remote = match self.connected_server_id.as_ref() {
            Some(r) => r.clone(),
            None => {
                let repo = self.repos.get_mut(repo_id).ok_or(NgError::RepoNotFound)?;
                repo.opened_branches.insert(*branch, as_publisher);
                return Ok(());
            }
        };

        let user = self.config.user_priv_key.to_pub();

        self.open_branch_(
            repo_id,
            branch,
            as_publisher,
            &BROKER.read().await,
            &user,
            &remote,
            false,
        )
        .await
    }

    pub(crate) async fn put_blocks(&self, blocks: Vec<Block>, repo: &Repo) -> Result<(), NgError> {
        let overlay = repo.store.overlay_for_read_on_client_protocol();

        let broker = BROKER.read().await;
        let user = self.config.user_priv_key.to_pub();
        let remote = self
            .connected_server_id
            .to_owned()
            .ok_or(NgError::NotConnected)?;

        let msg = BlocksPut::V0(BlocksPutV0 {
            blocks,
            overlay: Some(overlay),
        });
        broker.request::<BlocksPut, ()>(&user, &remote, msg).await?;
        Ok(())
    }

    pub(crate) async fn has_blocks(
        &self,
        blocks: Vec<BlockId>,
        repo: &Repo,
    ) -> Result<BlocksFound, NgError> {
        let overlay = repo.store.overlay_for_read_on_client_protocol();

        let broker = BROKER.read().await;
        let user = self.config.user_priv_key.to_pub();
        let remote = self
            .connected_server_id
            .to_owned()
            .ok_or(NgError::NotConnected)?;

        let msg = BlocksExist::V0(BlocksExistV0 {
            blocks,
            overlay: Some(overlay),
        });
        if let SoS::Single(found) = broker
            .request::<BlocksExist, BlocksFound>(&user, &remote, msg)
            .await?
        {
            Ok(found)
        } else {
            Err(NgError::InvalidResponse)
        }
    }

    async fn open_branch_<'a>(
        &mut self,
        repo_id: &RepoId,
        branch: &BranchId,
        as_publisher: bool,
        broker: &RwLockReadGuard<'static, Broker>,
        user: &UserId,
        remote: &DirectPeerId,
        force: bool,
    ) -> Result<(), NgError> {
        let (need_open, mut need_sub, overlay) = {
            let repo = self.repos.get(repo_id).ok_or(NgError::RepoNotFound)?;
            let overlay = repo.store.overlay_for_read_on_client_protocol();
            if force {
                (true, true, overlay)
            } else {
                match repo.opened_branches.get(branch) {
                    Some(val) => (false, as_publisher && !val, overlay),
                    None => (repo.opened_branches.is_empty(), true, overlay),
                }
            }
        };
        //log_info!("need_open {} need_sub {}", need_open, need_sub);

        if need_open {
            // TODO: implement OpenRepo. for now we always do a Pinning because OpenRepo is not implemented on the broker.
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
                    let (pin_req, topic_id) = {
                        let repo = self.repos.get(repo_id).ok_or(NgError::RepoNotFound)?;
                        let topic_id = repo.branch(branch).unwrap().topic;
                        //TODO: only pin the requested branch.
                        let pin_req = PinRepo::from_repo(repo, remote);
                        (pin_req, topic_id)
                    };

                    match broker
                        .request::<PinRepo, RepoOpened>(user, remote, pin_req)
                        .await
                    {
                        Ok(SoS::Single(opened)) => {
                            self.repo_was_opened(repo_id, &opened)?;
                            //TODO: check that in the returned opened_repo, the branch we are interested in has effectively been subscribed as publisher by the broker.

                            for topic in opened {
                                if topic.topic_id() == &topic_id {
                                    self.do_sync_req_if_needed(
                                        broker,
                                        user,
                                        remote,
                                        branch,
                                        repo_id,
                                        topic.known_heads(),
                                        topic.commits_nbr(),
                                    )
                                    .await?;
                                    break;
                                }
                            }
                        }
                        Ok(_) => return Err(NgError::InvalidResponse),
                        Err(e) => return Err(e),
                    }
                }
                Err(e) => return Err(e),
                Ok(SoS::Single(pin_status)) => {
                    // checking that the branch is subscribed as publisher

                    let repo = self.repos.get(repo_id).ok_or(NgError::RepoNotFound)?;
                    let branch_info = repo.branch(branch)?;
                    let topic_id = &branch_info.topic;
                    // log_info!(
                    //     "as_publisher {} {}",
                    //     as_publisher,
                    //     pin_status.is_topic_subscribed_as_publisher(topic_id)
                    // );
                    if as_publisher && !pin_status.is_topic_subscribed_as_publisher(topic_id) {
                        need_sub = true;
                    } else {
                        for topic in pin_status.topics() {
                            if topic.topic_id() == topic_id {
                                self.do_sync_req_if_needed(
                                    broker,
                                    user,
                                    remote,
                                    branch,
                                    repo_id,
                                    topic.known_heads(),
                                    topic.commits_nbr(),
                                )
                                .await?;
                                break;
                            }
                        }
                    }
                }
                _ => return Err(NgError::InvalidResponse),
            }
        }
        if need_sub {
            // we subscribe

            let repo = self.repos.get(repo_id).ok_or(NgError::RepoNotFound)?;
            let branch_info = repo.branch(branch)?;

            let broker_id = if as_publisher {
                if branch_info.topic_priv_key.is_none() {
                    // we need to subscribe as publisher, but we cant
                    return Err(NgError::PermissionDenied);
                }
                Some(remote)
            } else {
                None
            };

            let topic_sub = TopicSub::new(repo, branch_info, broker_id);

            match broker
                .request::<TopicSub, TopicSubRes>(user, remote, topic_sub)
                .await
            {
                Ok(SoS::Single(sub)) => {
                    let repo = self.repos.get_mut(&repo_id).ok_or(NgError::RepoNotFound)?;
                    Self::branch_was_opened(&self.topics, repo, &sub)?;

                    self.do_sync_req_if_needed(
                        broker,
                        user,
                        remote,
                        branch,
                        repo_id,
                        sub.known_heads(),
                        sub.commits_nbr(),
                    )
                    .await?;
                }
                Ok(_) => return Err(NgError::InvalidResponse),
                Err(e) => {
                    return Err(e);
                }
            }
        }
        Ok(())
    }

    async fn send_event(
        &mut self,
        event: Event,
        broker: &RwLockReadGuard<'static, Broker>,
        user: &UserId,
        remote: &DirectPeerId,
        overlay: OverlayId,
    ) -> Result<(), NgError> {
        assert!(overlay.is_inner());
        let (repo_id, branch_id) = self
            .topics
            .get(&(overlay, *event.topic_id()))
            .ok_or(NgError::TopicNotFound)?
            .to_owned();

        self.open_branch_(&repo_id, &branch_id, true, broker, user, remote, false)
            .await?;

        let _ = broker
            .request::<PublishEvent, ()>(user, remote, PublishEvent::new(event, overlay))
            .await?;

        Ok(())
    }

    pub async fn deliver(&mut self, event: Event, overlay: OverlayId) {
        let event_str = event.to_string();
        if let Err(e) = self.deliver_(event, overlay).await {
            log_err!("DELIVERY ERROR {} {}", e, event_str);
        }
    }

    async fn deliver_(&mut self, event: Event, overlay: OverlayId) -> Result<(), NgError> {
        let (repo_id, branch_id) = self
            .topics
            .get(&(overlay, *event.topic_id()))
            .ok_or(NgError::TopicNotFound)?
            .to_owned();

        // let outer = self
        //     .inner_to_outer
        //     .get(&overlay)
        //     .ok_or(VerifierError::OverlayNotFound)?;
        // let store = self
        //     .stores
        //     .get(outer)
        //     .ok_or(VerifierError::OverlayNotFound)?;
        let repo = self
            .repos
            .get(&repo_id)
            .ok_or(VerifierError::RepoNotFound)?;
        repo.branch_is_opened(&branch_id)
            .then_some(true)
            .ok_or(VerifierError::BranchNotOpened)?;
        let branch = repo.branch(&branch_id)?;

        let commit = event.open(&repo.store, &repo_id, &branch_id, &branch.read_cap.key)?;

        self.verify_commit(&commit, &branch_id, &repo_id, Arc::clone(&repo.store))
            .await?;

        Ok(())
    }

    pub async fn verify_commit(
        &mut self,
        commit: &Commit,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        self.verify_commit_(commit, branch_id, repo_id, store, false)
            .await
    }

    async fn verify_commit_(
        &mut self,
        commit: &Commit,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
        skip_heads_update: bool,
    ) -> Result<(), VerifierError> {
        //let quorum_type = commit.quorum_type();
        // log_info!(
        //     "VERIFYING {} {} {:?}",
        //     store.get_store_repo(),
        //     commit,
        //     store
        // );
        //log_info!("{}", commit);
        // TODO: check that DAG is well formed. check the heads

        let res = match commit.body().ok_or(VerifierError::CommitBodyNotFound)? {
            CommitBody::V0(v0) => match v0 {
                CommitBodyV0::Repository(a) => a.verify(commit, self, branch_id, repo_id, store),
                CommitBodyV0::RootBranch(a) => a.verify(commit, self, branch_id, repo_id, store),
                CommitBodyV0::Branch(a) => a.verify(commit, self, branch_id, repo_id, store),
                CommitBodyV0::SyncSignature(a) => a.verify(commit, self, branch_id, repo_id, store),
                CommitBodyV0::AddBranch(a) => a.verify(commit, self, branch_id, repo_id, store),
                CommitBodyV0::StoreUpdate(a) => a.verify(commit, self, branch_id, repo_id, store),
                CommitBodyV0::AddSignerCap(a) => a.verify(commit, self, branch_id, repo_id, store),
                CommitBodyV0::AddFile(a) => a.verify(commit, self, branch_id, repo_id, store),
                _ => {
                    log_err!("unimplemented verifier {}", commit);
                    return Err(VerifierError::NotImplemented);
                }
            },
        };
        let res = res.await;
        if res.is_ok() && !skip_heads_update {
            let commit_ref = commit.reference().unwrap();
            let past = commit.direct_causal_past();
            self.update_branch_current_heads(repo_id, branch_id, past, commit_ref)?;
            Ok(())
        } else {
            res
        }
    }

    fn update_branch_current_heads(
        &mut self,
        repo_id: &RepoId,
        branch: &BranchId,
        direct_past: Vec<ObjectRef>,
        commit_ref: ObjectRef,
    ) -> Result<(), VerifierError> {
        if let Some(repo) = self.repos.get_mut(repo_id) {
            let new_heads = repo.update_branch_current_heads(branch, commit_ref, direct_past)?;

            //log_info!("NEW HEADS {} {:?}", branch, new_heads);
            if let Some(user_storage) = self.user_storage_if_persistent() {
                let _ = user_storage.update_branch_current_heads(repo_id, branch, new_heads);
            }
        }
        Ok(())
    }

    fn user_storage_if_persistent(&self) -> Option<Arc<Box<dyn UserStorage>>> {
        if self.is_persistent() {
            if let Some(us) = self.user_storage.as_ref() {
                Some(Arc::clone(us))
            } else {
                None
            }
        } else {
            None
        }
    }

    pub(crate) fn add_branch_and_save(
        &mut self,
        repo_id: &RepoId,
        branch_info: BranchInfo,
        store_repo: &StoreRepo,
    ) -> Result<(), VerifierError> {
        if let Some(user_storage) = self.user_storage_if_persistent() {
            user_storage.add_branch(repo_id, &branch_info)?;
        }
        let branch_id = branch_info.id.clone();
        let topic_id = branch_info.topic.clone();
        let repo = self.get_repo_mut(repo_id, store_repo)?;
        let res = repo.branches.insert(branch_info.id.clone(), branch_info);
        assert!(res.is_none());

        let overlay_id: OverlayId = repo.store.inner_overlay();
        let repo_id = repo_id.clone();
        let res = self
            .topics
            .insert((overlay_id, topic_id), (repo_id, branch_id));
        assert_eq!(res, None);

        Ok(())
    }

    pub(crate) fn update_branch(
        &self,
        repo_id: &RepoId,
        branch_id: &BranchId,
        store_repo: &StoreRepo,
    ) -> Result<(), VerifierError> {
        if let Some(user_storage) = self.user_storage_if_persistent() {
            let repo = self.get_repo(repo_id, store_repo)?;
            user_storage.add_branch(repo_id, repo.branch(branch_id)?)?;
        }
        Ok(())
    }

    pub(crate) fn update_signer_cap(&self, signer_cap: &SignerCap) -> Result<(), VerifierError> {
        if let Some(user_storage) = self.user_storage_if_persistent() {
            user_storage.update_signer_cap(signer_cap)?;
        }
        Ok(())
    }

    pub(crate) fn add_repo_and_save(&mut self, repo: Repo) -> &Repo {
        let us = self.user_storage_if_persistent();
        let repo_ref: &Repo = self.add_repo_(repo);
        // save in user_storage
        if let Some(user_storage) = us {
            let _ = user_storage.save_repo(repo_ref);
        }
        repo_ref
    }

    pub(crate) fn get_repo(
        &self,
        id: &RepoId,
        _store_repo: &StoreRepo,
    ) -> Result<&Repo, VerifierError> {
        //let store = self.get_store(store_repo);
        let repo_ref: Result<&Repo, VerifierError> =
            self.repos.get(id).ok_or(VerifierError::RepoNotFound);
        repo_ref
    }

    pub async fn bootstrap(&mut self) -> Result<(), NgError> {
        if let Err(e) = self.bootstrap_from_remote().await {
            log_warn!("bootstrap_from_remote failed with {}", e);
            // maybe it failed because the 3P stores are still in the outbox and haven't been sent yet.
            // we immediately try to send the events present in the outbox
            let res = self.send_outbox().await;
            log_info!("SENDING 3P EVENTS FROM OUTBOX RETURNED: {:?}", res);

            return res;
        }
        Ok(())
    }

    async fn do_sync_req_if_needed(
        &mut self,
        broker: &RwLockReadGuard<'static, Broker>,
        user: &UserId,
        remote: &DirectPeerId,
        branch_id: &BranchId,
        repo_id: &RepoId,
        remote_heads: &Vec<ObjectId>,
        remote_commits_nbr: u64,
    ) -> Result<(), NgError> {
        let (store, msg, branch_secret) = {
            if remote_commits_nbr == 0 || remote_heads.is_empty() {
                log_info!("branch is new on the broker. doing nothing");
                return Ok(());
            }

            let repo = self.repos.get(repo_id).unwrap();
            let branch_info = repo.branch(branch_id)?;

            let store = Arc::clone(&repo.store);

            let ours = branch_info.current_heads.iter().map(|refe| refe.id);
            let ours_set: HashSet<Digest> = HashSet::from_iter(ours.clone());

            let theirs = HashSet::from_iter(remote_heads.clone().into_iter());

            if ours_set.difference(&theirs).count() == 0
                && theirs.difference(&ours_set).count() == 0
            {
                // no need to sync
                log_info!("branch {} is up to date", branch_id);
                return Ok(());
            }

            let mut theirs_found = HashSet::new();
            let mut visited = HashMap::new();
            for our in ours_set.iter() {
                if let Ok(cobj) = Object::load(*our, None, &repo.store) {
                    let _ = Branch::load_causal_past(
                        &cobj,
                        &repo.store,
                        &theirs,
                        &mut visited,
                        &mut None,
                        None,
                        &mut Some(&mut theirs_found),
                        &None,
                    );
                }
            }

            let theirs_not_found: Vec<ObjectId> =
                theirs.difference(&theirs_found).cloned().collect();

            let known_commits = if theirs_not_found.is_empty() {
                return Ok(());
            } else {
                if visited.is_empty() {
                    None
                } else {
                    // prepare bloom filter
                    let expected_elements =
                        remote_commits_nbr + max(visited.len() as u64, branch_info.commits_nbr);
                    let mut config = FilterBuilder::new(expected_elements, 0.01);
                    config.enable_repeat_insert(false);
                    let mut filter = Filter::new(config);
                    for commit_id in visited.keys() {
                        filter.add(commit_id.slice());
                    }
                    Some(BloomFilter {
                        k: filter.hashes(),
                        f: filter.get_u8_array().to_vec(),
                    })
                }
            };

            let msg = TopicSyncReq::V0(TopicSyncReqV0 {
                topic: branch_info.topic,
                known_heads: ours_set.union(&theirs_found).into_iter().cloned().collect(),
                target_heads: theirs_not_found,
                known_commits,
                overlay: Some(store.overlay_for_read_on_client_protocol()),
            });
            (store, msg, branch_info.read_cap.key.clone())
        };

        match broker
            .request::<TopicSyncReq, TopicSyncRes>(user, remote, msg)
            .await
        {
            Err(e) => return Err(e),
            Ok(SoS::Stream(mut events)) => {
                while let Some(event) = events.next().await {
                    let commit = event
                        .event()
                        .open(&store, repo_id, branch_id, &branch_secret)?;

                    // TODO: deal with missing commits in the DAG (fetch them individually with CommitGet). This can happen because of false positive on BloomFilter

                    self.verify_commit(&commit, branch_id, repo_id, Arc::clone(&store))
                        .await?;
                }
            }
            Ok(_) => return Err(NgError::InvalidResponse),
        }

        Ok(())
    }

    async fn do_sync_req(
        &mut self,
        broker: &RwLockReadGuard<'static, Broker>,
        user: &UserId,
        remote: &DirectPeerId,
        topic: &TopicId,
        branch_id: &BranchId,
        branch_secret: &ReadCapSecret,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), NgError> {
        let msg = TopicSyncReq::new_empty(*topic, &store.overlay_for_read_on_client_protocol());
        match broker
            .request::<TopicSyncReq, TopicSyncRes>(user, remote, msg)
            .await
        {
            Err(e) => return Err(e),
            Ok(SoS::Stream(mut events)) => {
                while let Some(event) = events.next().await {
                    let commit = event
                        .event()
                        .open(&store, repo_id, branch_id, branch_secret)?;

                    self.verify_commit(&commit, branch_id, repo_id, Arc::clone(&store))
                        .await?;
                }
            }
            Ok(_) => return Err(NgError::InvalidResponse),
        }
        Ok(())
    }

    async fn load_store_from_read_cap<'a>(
        &mut self,
        broker: &RwLockReadGuard<'static, Broker>,
        user: &UserId,
        remote: &DirectPeerId,
        store: Arc<Store>,
    ) -> Result<(), NgError> {
        // first we fetch the read_cap commit of private store repo.
        let root_branch_commit = Self::get_commit(
            store.get_store_readcap().clone(),
            None,
            &store.overlay_for_read_on_client_protocol(),
            &broker,
            &user,
            &remote,
        )
        .await?;

        match root_branch_commit
            .body()
            .ok_or(VerifierError::CommitBodyNotFound)?
        {
            CommitBody::V0(v0) => match v0 {
                CommitBodyV0::RootBranch(root_branch) => {
                    // doing a SyncReq on the topic of root branch

                    let topic = root_branch.topic();

                    let repo_id = store.id();
                    self.do_sync_req(
                        &broker,
                        &user,
                        &remote,
                        topic,
                        repo_id,
                        store.get_store_readcap_secret(),
                        repo_id,
                        Arc::clone(&store),
                    )
                    .await
                    .map_err(|e| NgError::BootstrapError(e.to_string()))?;

                    let other_branches: Vec<(PubKey, PubKey, SymKey)> = self
                        .get_repo(repo_id, store.get_store_repo())?
                        .branches
                        .iter()
                        .map(|(branch_id, branch)| {
                            (
                                branch_id.clone(),
                                branch.topic.clone(),
                                branch.read_cap.key.clone(),
                            )
                        })
                        .collect();

                    // loading the other Branches of store
                    for (branch_id, topic, secret) in other_branches {
                        if branch_id == *repo_id {
                            // root branch of store is already synced
                            continue;
                        }
                        self.do_sync_req(
                            &broker,
                            &user,
                            &remote,
                            &topic,
                            &branch_id,
                            &secret,
                            repo_id,
                            Arc::clone(&store),
                        )
                        .await
                        .map_err(|e| NgError::BootstrapError(e.to_string()))?;
                    }

                    log_info!("STORE loaded from read_cap {}", repo_id);
                    // TODO: deal with AddSignerCap that are saved on rocksdb for now, but do not make it to the Verifier.repos
                }
                _ => return Err(VerifierError::RootBranchNotFound.into()),
            },
        }

        Ok(())
    }

    async fn get_commit(
        commit_ref: ObjectRef,
        topic_id: Option<TopicId>,
        overlay: &OverlayId,
        broker: &RwLockReadGuard<'static, Broker>,
        user: &UserId,
        remote: &DirectPeerId,
    ) -> Result<Commit, NgError> {
        let msg = CommitGet::V0(CommitGetV0 {
            id: commit_ref.id,
            topic: topic_id, // we dont have the topic (only available from RepoLink/BranchLink) but we are pretty sure the Broker has the commit anyway.
            overlay: Some(*overlay),
        });
        match broker.request::<CommitGet, Block>(user, remote, msg).await {
            Err(NgError::ServerError(ServerError::NotFound)) => {
                // TODO: fallback to BlocksGet, then Commit::load(with_body:true), which will return an Err(CommitLoadError::MissingBlocks), then do another BlocksGet with those, and then again Commit::load...
                return Err(NgError::SiteNotFoundOnBroker);
            }
            Ok(SoS::Stream(blockstream)) => {
                // we could use the in_memory block_storage of the verifier, but then we would have to remove the blocks from there.
                // instead we just create a new temporary in memory block storage
                let temp_mem_block_storage =
                    HashMapBlockStorage::from_block_stream(overlay, blockstream).await;
                // creating a temporary store to access the blocks
                let temp_store = Store::new_from_overlay_id(
                    overlay,
                    Arc::new(std::sync::RwLock::new(temp_mem_block_storage)),
                );
                Ok(Commit::load(commit_ref, &temp_store, true)?)
            }
            Ok(_) => return Err(NgError::InvalidResponse),
            Err(e) => return Err(e),
        }
    }

    pub(crate) async fn fetch_blocks_if_needed(
        &self,
        id: &BlockId,
        repo_id: &RepoId,
        store_repo: &StoreRepo,
    ) -> Result<Option<Receiver<Block>>, NgError> {
        let repo = self.get_repo(repo_id, store_repo)?;

        let overlay = repo.store.overlay_for_read_on_client_protocol();

        let broker = BROKER.read().await;
        let user = self.config.user_priv_key.to_pub();
        let remote = self.connected_server_id.to_owned();

        match repo.store.has(id) {
            Err(StorageError::NotFound) => {
                if remote.is_none() {
                    return Err(NgError::NotFound);
                }
                let msg = BlocksGet::V0(BlocksGetV0 {
                    ids: vec![*id],
                    topic: None,
                    include_children: true,
                    overlay: Some(overlay),
                });
                match broker
                    .request::<BlocksGet, Block>(&user, remote.as_ref().unwrap(), msg)
                    .await
                {
                    Ok(SoS::Stream(blockstream)) => Ok(Some(blockstream)),
                    Ok(_) => return Err(NgError::InvalidResponse),
                    Err(e) => return Err(e),
                }
            }
            Err(e) => Err(e.into()),
            Ok(()) => Ok(None),
        }
    }

    async fn bootstrap_from_remote(&mut self) -> Result<(), NgError> {
        if self.need_bootstrap() {
            let broker = BROKER.read().await;
            let user = self.config.user_priv_key.to_pub();
            let remote = self
                .connected_server_id
                .to_owned()
                .ok_or(NgError::NotConnected)?;

            let private_store_id = self.config.private_store_id.to_owned().unwrap();
            let private_store = self.create_private_store_from_credentials()?;

            self.load_store_from_read_cap(&broker, &user, &remote, private_store)
                .await?;

            let other_stores: Vec<Arc<Store>> = self
                .stores
                .iter()
                .map(|(_, store)| Arc::clone(store))
                .collect();

            // load the other stores (protected and public)
            for store in other_stores {
                if *store.id() == private_store_id {
                    continue;
                    // we already loaded the private store
                }
                self.load_store_from_read_cap(&broker, &user, &remote, store)
                    .await?;
            }
        }
        Ok(())
    }

    fn create_private_store_from_credentials(&mut self) -> Result<Arc<Store>, VerifierError> {
        let private_store_id = self.config.private_store_id.to_owned().unwrap();
        let store_repo = StoreRepo::new_private(private_store_id);

        let store = Arc::new(Store::new(
            store_repo,
            self.config.private_store_read_cap.to_owned().unwrap(),
            self.config.private_store_read_cap.to_owned().unwrap(),
            self.get_arc_block_storage()?,
        ));

        let store = self
            .stores
            .entry(store_repo.overlay_id_for_storage_purpose())
            .or_insert_with(|| store);
        Ok(Arc::clone(store))
    }

    async fn load_from_credentials_and_outbox(
        &mut self,
        events: &Vec<EventOutboxStorage>,
    ) -> Result<(), VerifierError> {
        let private_store_id = self.config.private_store_id.as_ref().unwrap();
        let private_inner_overlay_id = OverlayId::inner(
            private_store_id,
            &self.config.private_store_read_cap.as_ref().unwrap().key,
        );

        let private_store = self.create_private_store_from_credentials()?;

        // 2nd pass: load all the other branches of the private store repo.

        // 1st pass: load all events about private store
        let mut postponed_signer_caps = Vec::with_capacity(3);
        let mut private_user_branch = None;

        for e in events {
            if e.overlay == private_inner_overlay_id {
                // it is an event about the private store
                //log_info!("VERIFYING EVENT {} {}", e.overlay, e.event);
                let (branch_id, branch_secret) =
                    match self.get_repo(private_store.id(), private_store.get_store_repo()) {
                        Err(_) => (private_store.id(), private_store.get_store_readcap_secret()),
                        Ok(repo) => {
                            let (_, branch_id) = self
                                .topics
                                .get(&(e.overlay, *e.event.topic_id()))
                                .ok_or(VerifierError::TopicNotFound)?;
                            let branch = repo.branch(branch_id)?;
                            (branch_id, &branch.read_cap.key)
                        }
                    };

                let commit =
                    e.event
                        .open(&private_store, private_store.id(), branch_id, branch_secret)?;

                if commit
                    .body()
                    .ok_or(VerifierError::CommitBodyNotFound)?
                    .is_add_signer_cap()
                {
                    private_user_branch = Some(branch_id.clone());
                    postponed_signer_caps.push(commit);
                } else {
                    self.verify_commit(
                        &commit,
                        &branch_id.clone(),
                        private_store.id(),
                        Arc::clone(&private_store),
                    )
                    .await?;
                }
            }
        }

        //log_info!("{:?}\n{:?}\n{:?}", self.repos, self.stores, self.topics);
        //log_info!("SECOND PASS");
        // 2nd pass : load the other events (that are not from private store)
        for (_, store) in self.stores.clone().iter() {
            let store_inner_overlay_id = store.inner_overlay();

            // log_info!(
            //     "TRYING OVERLAY {} {}",
            //     store_inner_overlay_id,
            //     private_inner_overlay_id
            // );
            if store_inner_overlay_id == private_inner_overlay_id {
                //log_info!("SKIPPED PRIVATE");
                continue;
                // we skip the private store, as we already loaded it
            }

            for e in events {
                if e.overlay == store_inner_overlay_id {
                    // it is an event about the store we are loading
                    //log_info!("VERIFYING EVENT {} {}", e.overlay, e.event);
                    let (branch_id, branch_secret) =
                        match self.get_repo(store.id(), store.get_store_repo()) {
                            Err(_) => (store.id(), store.get_store_readcap_secret()),
                            Ok(repo) => {
                                let (_, branch_id) = self
                                    .topics
                                    .get(&(e.overlay, *e.event.topic_id()))
                                    .ok_or(VerifierError::TopicNotFound)?;
                                let branch = repo.branch(branch_id)?;
                                (branch_id, &branch.read_cap.key)
                            }
                        };

                    let commit = e.event.open(store, store.id(), branch_id, branch_secret)?;

                    self.verify_commit(&commit, &branch_id.clone(), store.id(), Arc::clone(store))
                        .await?;
                } else {
                    // log_info!(
                    //     "SKIPPED wrong overlay {} {}",
                    //     e.overlay,
                    //     store_inner_overlay_id
                    // );
                }
            }
        }

        // finally, ingest the signer_caps.
        for signer_cap in postponed_signer_caps {
            self.verify_commit(
                &signer_cap,
                private_user_branch.as_ref().unwrap(),
                private_store.id(),
                Arc::clone(&private_store),
            )
            .await?;
        }

        Ok(())
    }

    // fn display(heads: &Vec<ObjectRef>) -> String {
    //     let mut ret = String::new();
    //     if heads.len() == 0 {
    //         ret = "0".to_string();
    //     }
    //     for head in heads {
    //         ret.push_str(&format!("{} ", head.id));
    //     }
    //     ret
    // }

    pub async fn send_outbox(&mut self) -> Result<(), NgError> {
        let ret = self.take_events_from_outbox();
        // if ret.is_err() {
        //     log_err!("send_outbox {:}", ret.as_ref().unwrap_err());
        // }
        let events: Vec<EventOutboxStorage> = ret.unwrap_or(vec![]);
        if events.is_empty() {
            return Ok(());
        }
        let broker = BROKER.read().await;
        let user = self.config.user_priv_key.to_pub();
        let remote = self
            .connected_server_id
            .as_ref()
            .ok_or(NgError::NotConnected)?
            .clone();

        // for all the events, check that they are valid (topic exists, current_heads match with event)
        let mut need_replay = false;
        let mut events_to_replay = Vec::with_capacity(events.len());
        //let mut branch_heads: HashMap<BranchId, Vec<ObjectRef>> = HashMap::new();
        for e in events {
            match self.topics.get(&(e.overlay, *e.event.topic_id())) {
                Some((repo_id, branch_id)) => match self.repos.get(repo_id) {
                    Some(repo) => match repo.branches.get(branch_id) {
                        Some(_branch) => {
                            // let commit = e.event.open_with_info(repo, branch)?;
                            // let acks = commit.acks();
                            // match branch_heads.get(branch_id) {
                            //     Some(previous_heads) => {
                            //         if *previous_heads != acks {
                            //             // skip event, as it is outdated.
                            //             continue;
                            //         } else {
                            //             branch_heads
                            //                 .insert(*branch_id, vec![commit.reference().unwrap()]);
                            //         }
                            //     }
                            //     None => {
                            //         if acks != branch.current_heads {
                            //             // skip event, as it is outdated.
                            //             continue;
                            //         } else {
                            //             branch_heads
                            //                 .insert(*branch_id, vec![commit.reference().unwrap()]);
                            //         }
                            //     }
                            // }
                        }
                        None => {
                            log_info!("REPLAY BRANCH NOT FOUND {}", branch_id);
                            need_replay = true;
                        }
                    },
                    None => {
                        log_info!("REPLAY REPO NOT FOUND {}", repo_id);
                        need_replay = true;
                    }
                },
                None => {
                    log_info!(
                        "REPLAY TOPIC NOT FOUND {} IN OVERLAY {}",
                        e.event.topic_id(),
                        e.overlay
                    );
                    need_replay = true;
                }
            }
            events_to_replay.push(e);
        }
        log_info!("NEED REPLAY {need_replay}");
        if need_replay {
            self.load_from_credentials_and_outbox(&events_to_replay)
                .await?;
            log_info!("REPLAY DONE");
        }
        log_info!("SENDING {} EVENTS FROM OUTBOX", events_to_replay.len());
        for e in events_to_replay {
            let files = e.event.file_ids();
            if !files.is_empty() {
                let (repo_id, branch_id) = self
                    .topics
                    .get(&(e.overlay, *e.event.topic_id()))
                    .ok_or(NgError::TopicNotFound)?
                    .to_owned();

                let repo = self
                    .repos
                    .get(&repo_id)
                    .ok_or(VerifierError::RepoNotFound)?;

                let branch = repo.branch(&branch_id)?;

                let commit = e.event.open_without_body(
                    &repo.store,
                    &repo_id,
                    &branch_id,
                    &branch.read_cap.key,
                )?;

                let store_repo = repo.store.get_store_repo().clone();

                self.open_branch_(&repo_id, &branch_id, true, &broker, &user, &remote, false)
                    .await?;

                for file in commit.files() {
                    log_info!("PUT FILE {:?}", file.id);
                    self.put_all_blocks_of_file(&file, &repo_id, &store_repo)
                        .await?;
                }
            }

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
                //log_debug!("last_seq path {}", path.display());

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
                            .map_err(|e| NgError::OxiGraphError(e.to_string()))?,
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
            inner_to_outer: HashMap::new(),
            uploads: BTreeMap::new(),
            branch_subscriptions: HashMap::new(),
        };
        // this is important as it will load the last seq from storage
        if verif.config.config_type.should_load_last_seq_num() {
            verif.take_some_peer_last_seq_numbers(0)?;
            verif.last_seq_num = verif.max_reserved_seq_num;
            verif.last_reservation = SystemTime::UNIX_EPOCH;
        }
        Ok(verif)
    }

    pub async fn app_request_stream(
        &mut self,
        req: AppRequest,
    ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
        match req {
            AppRequest::V0(v0) => v0.command.process_stream(self, &v0.nuri, &v0.payload).await,
        }
    }

    pub async fn app_request(&mut self, req: AppRequest) -> Result<AppResponse, NgError> {
        match req {
            AppRequest::V0(v0) => v0.command.process(self, v0.nuri, v0.payload).await,
        }
    }

    pub async fn respond(
        &mut self,
        _msg: ProtocolMessage,
        _fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        unimplemented!();
    }

    fn add_repo_without_saving(&mut self, repo: Repo) {
        self.add_repo_(repo);
    }

    pub(crate) fn populate_topics(&mut self, repo: &Repo) {
        for (branch_id, info) in repo.branches.iter() {
            let overlay_id: OverlayId = repo.store.inner_overlay();
            let topic_id = info.topic.clone();
            let repo_id = repo.id.clone();
            let branch_id = branch_id.clone();
            let _res = self
                .topics
                .insert((overlay_id, topic_id), (repo_id, branch_id));
        }
    }

    fn add_repo_(&mut self, repo: Repo) -> &Repo {
        //self.populate_topics(&repo);
        let repo_ref = self.repos.entry(repo.id).or_insert(repo);
        repo_ref
    }

    fn branch_was_opened(
        topics: &HashMap<(OverlayId, PubKey), (PubKey, PubKey)>,
        repo: &mut Repo,
        sub: &TopicSubRes,
    ) -> Result<(), NgError> {
        let overlay = repo.store.inner_overlay();
        // log_info!(
        //     "branch_was_opened topic {} overlay {}",
        //     sub.topic_id(),
        //     overlay
        // );
        let (_, branch_id) = topics
            .get(&(overlay, *sub.topic_id()))
            .ok_or(NgError::TopicNotFound)?;
        // log_info!(
        //     "branch_was_opened insert branch_id {} is_publisher {}",
        //     branch_id,
        //     sub.is_publisher()
        // );
        repo.opened_branches.insert(*branch_id, sub.is_publisher());
        Ok(())
    }

    fn repo_was_opened(
        &mut self,
        repo_id: &RepoId,
        opened_repo: &RepoOpened,
    ) -> Result<(), NgError> {
        let repo = self.repos.get_mut(repo_id).ok_or(NgError::RepoNotFound)?;
        //TODO: improve the inner_to_outer insert. (should be done when store is created, not here. should work also for dialogs.)
        self.inner_to_outer.insert(
            repo.store.overlay_for_read_on_client_protocol(),
            repo.store.outer_overlay(),
        );
        for sub in opened_repo {
            Self::branch_was_opened(&self.topics, repo, sub)?;
        }
        Ok(())
    }

    pub(crate) fn new_store_from_update(
        &mut self,
        update: &StoreUpdate,
    ) -> Result<(), VerifierError> {
        let store = Store::new_from(update, self.get_arc_block_storage()?);
        let overlay_id = store.get_store_repo().overlay_id_for_storage_purpose();
        let _store = self
            .stores
            .entry(overlay_id)
            .or_insert_with(|| Arc::new(store));
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
        let block_storage = self.get_arc_block_storage()?;
        let store = self.stores.entry(overlay_id).or_insert_with(|| {
            let store_readcap = ReadCap::nil();
            // temporarily set the store_overlay_branch_readcap to an objectRef that has an empty id, and a key = to the repo_write_cap_secret
            let store_overlay_branch_readcap =
                ReadCap::from_id_key(ObjectId::nil(), repo_write_cap_secret.clone());
            let store = Store::new(
                *store_repo,
                store_readcap,
                store_overlay_branch_readcap,
                block_storage,
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
        self.populate_topics(&repo);
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
        self.populate_topics(&repo);
        self.new_events_with_repo(proto_events, &repo).await?;
        let repo_ref = self.add_repo_and_save(repo);
        Ok(repo_ref)
    }
}
#[cfg(test)]
mod test {

    use crate::verifier::*;
    use ng_repo::store::Store;

    #[async_std::test]
    pub async fn test_new_repo_default() {
        let (creator_priv_key, creator_pub_key) = generate_keypair();

        let (_publisher_privkey, publisher_pubkey) = generate_keypair();
        let _publisher_peer = PeerId::Forwarded(publisher_pubkey);

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
