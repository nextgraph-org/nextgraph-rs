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
use ng_repo::log::*;
use ng_repo::object::Object;
use ng_repo::{
    block_storage::BlockStorage,
    errors::{NgError, StorageError},
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
use async_std::sync::Mutex;
use std::{collections::HashMap, path::PathBuf, sync::Arc};

use ng_net::{
    connection::NoiseFSM,
    errors::ProtocolError,
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
    user_storage: Option<Box<dyn UserStorage>>,
    block_storage: Option<Arc<std::sync::RwLock<dyn BlockStorage + Send + Sync>>>,
    last_seq_num: u64,
    peer_id: PubKey,
    max_reserved_seq_num: u64,
    last_reservation: SystemTime,
    stores: HashMap<OverlayId, Arc<Store>>,
    repos: HashMap<RepoId, Repo>,
    /// only used for InMemory type, to store the outbox
    in_memory_outbox: Vec<Event>,
}

impl fmt::Debug for Verifier {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "Verifier\nconfig: {:?}", self.config)?;
        writeln!(f, "connected_server_id: {:?}", self.connected_server_id)
    }
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
            in_memory_outbox: vec![],
        }
    }

    pub fn get_store_mut(&mut self, store_repo: &StoreRepo) -> Arc<Store> {
        let overlay_id = store_repo.overlay_id_for_storage_purpose();
        let store = self.stores.entry(overlay_id).or_insert_with(|| {
            // FIXME: get store_readcap from user storage
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
                        .expect("get_store_mut cannot be called on Remote Verifier"),
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
        //read_cap: &ReadCap,
        //overlay_read_cap: Option<&ReadCap>,
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
        id: RepoId,
        store_repo: &StoreRepo,
    ) -> Result<&mut Repo, NgError> {
        let store = self.get_store(store_repo);
        let repo_ref = self.repos.get_mut(&id).ok_or(NgError::RepoNotFound);
        // .or_insert_with(|| {
        //     // load from storage
        //     Repo {
        //         id,
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
        self.stores.insert(overlay_id, store);
    }

    pub(crate) fn new_event(
        &mut self,
        //publisher: &PrivKey,
        //seq: &mut u64,
        commit: &Commit,
        additional_blocks: &Vec<BlockId>,
        //topic_id: TopicId,
        //topic_priv_key: &BranchWriteCapSecret,
        repo_id: RepoId,
        store_repo: &StoreRepo,
    ) -> Result<(), NgError> {
        if self.last_seq_num + 1 >= self.max_reserved_seq_num {
            self.reserve_more(1)?;
        }
        self.new_event_(commit, additional_blocks, repo_id, store_repo)
    }

    fn new_event_(
        &mut self,
        //publisher: &PrivKey,
        //seq: &mut u64,
        commit: &Commit,
        additional_blocks: &Vec<BlockId>,
        //topic_id: TopicId,
        //topic_priv_key: &BranchWriteCapSecret,
        // store: &Store, // store could be omitted and a store repo ID would be given instead.
        repo_id: RepoId,
        store_repo: &StoreRepo,
    ) -> Result<(), NgError> {
        //let topic_id = TopicId::nil(); // should be fetched from user storage, based on the Commit.branch
        //let topic_priv_key = BranchWriteCapSecret::nil(); // should be fetched from user storage, based on repoId found in user storage (search by branchId)
        //self.get_store(store_repo)
        let publisher = self.config.peer_priv_key.clone();
        self.last_seq_num += 1;
        let seq_num = self.last_seq_num;
        let repo = self.get_repo(repo_id, store_repo)?;

        let event = Event::new(&publisher, seq_num, commit, additional_blocks, repo)?;
        self.send_or_save_event_to_outbox(event)?;
        Ok(())
    }

    fn new_event_with_repo_(
        &mut self,
        //publisher: &PrivKey,
        //seq: &mut u64,
        commit: &Commit,
        additional_blocks: &Vec<BlockId>,
        //topic_id: TopicId,
        //topic_priv_key: &BranchWriteCapSecret,
        // store: &Store, // store could be omitted and a store repo ID would be given instead.
        repo: &Repo,
    ) -> Result<(), NgError> {
        //let topic_id = TopicId::nil(); // should be fetched from user storage, based on the Commit.branch
        //let topic_priv_key = BranchWriteCapSecret::nil(); // should be fetched from user storage, based on repoId found in user storage (search by branchId)
        //self.get_store(store_repo)
        let publisher = self.config.peer_priv_key.clone();
        self.last_seq_num += 1;
        let seq_num = self.last_seq_num;

        let event = Event::new(&publisher, seq_num, commit, additional_blocks, repo)?;
        self.send_or_save_event_to_outbox(event)?;
        Ok(())
    }

    pub(crate) fn last_seq_number(&mut self) -> Result<u64, NgError> {
        if self.available_seq_nums() <= 1 {
            self.reserve_more(1)?;
        }
        self.last_seq_num += 1;
        Ok(self.last_seq_num)
    }

    pub(crate) fn new_events_with_repo(
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
            self.new_event_with_repo_(&event.0, &event.1, repo)?;
        }
        Ok(())
    }

    pub(crate) fn new_events(
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
            self.new_event_(&event.0, &event.1, repo_id.clone(), store_repo)?;
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

    fn send_or_save_event_to_outbox<'a>(&'a mut self, event: Event) -> Result<(), NgError> {
        log_debug!("========== EVENT {:03}: {}", event.seq_num(), event);

        if self.connected_server_id.is_some() {
            // send the events to the server already
        } else {
            match &self.config.config_type {
                VerifierConfigType::JsSaveSession(js) => {
                    (js.outbox_write_function)(
                        self.peer_id,
                        event.seq_num(),
                        serde_bare::to_vec(&event)?,
                    )?;
                }
                VerifierConfigType::RocksDb(path) => {}
                VerifierConfigType::Memory => {
                    self.in_memory_outbox.push(event);
                }
                _ => unimplemented!(),
            }
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
                path.push(format!("lastseq{}", self.peer_id.to_string()));
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
                                .map_err(|_| NgError::SerializationError)?,
                            old_val,
                        )
                    }
                    Err(_) => (
                        File::create(path).map_err(|_| NgError::SerializationError)?,
                        0,
                    ),
                };
                if qty > 0 {
                    let new_val = val + qty as u64;
                    let spls = SessionPeerLastSeq::V0(new_val);
                    let ser = spls.ser()?;
                    file_save
                        .write_all(&ser)
                        .map_err(|_| NgError::SerializationError)?;

                    file_save
                        .sync_data()
                        .map_err(|_| NgError::SerializationError)?;
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
        let should_load_last_seq_num = config.config_type.should_load_last_seq_num();
        let mut verif = Verifier {
            config,
            connected_server_id: None,
            graph_dataset: graph,
            user_storage: user,
            block_storage: block,
            peer_id,
            last_reservation: SystemTime::UNIX_EPOCH, // this is to avoid reserving 100 seq_nums at every start of a new session
            max_reserved_seq_num: 0,
            last_seq_num: 0,
            stores: HashMap::new(),
            repos: HashMap::new(),
            in_memory_outbox: vec![],
        };
        // this is important as it will load the last seq from storage
        if should_load_last_seq_num {
            verif.take_some_peer_last_seq_numbers(0)?;
            verif.last_seq_num = verif.max_reserved_seq_num;
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

    pub fn new_store_default<'a>(
        &'a mut self,
        creator: &UserId,
        creator_priv_key: &PrivKey,
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
                        .expect("get_store_mut cannot be called on Remote Verifier"),
                ),
            );
            Arc::new(store)
        });
        let (repo, proto_events) = Arc::clone(store).create_repo_default(
            creator,
            creator_priv_key,
            repo_write_cap_secret,
        )?;
        self.new_events_with_repo(proto_events, &repo)?;
        let repo = self.complete_site_store(store_repo, repo)?;
        let repo_ref = self.repos.entry(repo.id).or_insert(repo);
        Ok(repo_ref)
    }

    /// returns the Repo and the last seq_num of the peer
    pub fn new_repo_default<'a>(
        &'a mut self,
        creator: &UserId,
        creator_priv_key: &PrivKey,
        store_repo: &StoreRepo,
    ) -> Result<&'a Repo, NgError> {
        let store = self.get_store_mut(store_repo);
        let repo_write_cap_secret = SymKey::random();
        let (repo, proto_events) =
            store.create_repo_default(creator, creator_priv_key, repo_write_cap_secret)?;
        self.new_events_with_repo(proto_events, &repo)?;
        // let mut events = vec![];
        // for event in proto_events {
        //     events.push(self.new_event(&event.0, &event.1, &repo.store)?);
        // }
        let repo_ref = self.repos.entry(repo.id).or_insert(repo);
        Ok(repo_ref)
    }
}
#[cfg(test)]
mod test {

    use crate::types::*;
    use crate::verifier::*;
    use ng_repo::log::*;
    use ng_repo::store::Store;

    #[test]
    pub fn test_new_repo_default() {
        let (creator_priv_key, creator_pub_key) = generate_keypair();

        let (publisher_privkey, publisher_pubkey) = generate_keypair();
        let publisher_peer = PeerId::Forwarded(publisher_pubkey);

        let store = Store::dummy_public_v0();
        let store_repo = store.get_store_repo().clone();
        let mut verifier = Verifier::new_dummy();
        verifier.add_store(store);

        let repo = verifier
            .new_repo_default(&creator_pub_key, &creator_priv_key, &store_repo)
            .expect("new_default");

        log_debug!("REPO OBJECT {}", repo);

        assert_eq!(verifier.last_seq_num, 5);
    }
}
