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
    stores: HashMap<OverlayId, Store>,
    repos: HashMap<RepoId, Repo>,
}

impl fmt::Debug for Verifier {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "Verifier\nconfig: {:?}", self.config)?;
        writeln!(f, "connected_server_id: {:?}", self.connected_server_id)
    }
}

impl Verifier {
    #[cfg(test)]
    pub fn new_dummy() -> Self {
        let (peer_priv_key, peer_id) = generate_keypair();
        let block_storage = Arc::new(RwLock::new(HashMapBlockStorage::new()))
            as Arc<RwLock<Box<dyn BlockStorage + Send + Sync + 'static>>>;
        Verifier {
            config: VerifierConfig {
                config_type: VerifierConfigType::Memory,
                user_master_key: [0; 32],
                peer_priv_key,
                user_priv_key: PrivKey::random_ed(),
                private_store_read_cap: ObjectRef::dummy(),
            },
            connected_server_id: None,
            graph_dataset: None,
            user_storage: None,
            block_storage: Some(block_storage),
            last_seq_num: 0,
            peer_id,
            max_reserved_seq_num: 1,
            last_reservation: SystemTime::now(),
            stores: HashMap::new(),
            repos: HashMap::new(),
        }
    }

    pub fn get_store(&mut self, store_repo: &StoreRepo) -> &mut Store {
        let overlay_id = store_repo.overlay_id_for_storage_purpose();
        if self.stores.get(&overlay_id).is_none() {
            // FIXME: get store_readcap from user storage
            let store_readcap = ReadCap::nil();
            let store = Store::new(
                *store_repo,
                store_readcap,
                Arc::clone(
                    &self
                        .block_storage
                        .as_ref()
                        .ok_or(core::fmt::Error)
                        .expect("get_store cannot be called on Remote Verifier"),
                ),
            );
            //self.stores.insert(overlay_id, store);
            let store = self.stores.entry(overlay_id).or_insert(store);
            store
        } else {
            self.stores.get_mut(&overlay_id).unwrap()
        }
    }

    pub(crate) fn new_event(
        &mut self,
        //publisher: &PrivKey,
        //seq: &mut u64,
        commit: &Commit,
        additional_blocks: &Vec<BlockId>,
        //topic_id: TopicId,
        //topic_priv_key: &BranchWriteCapSecret,
        store: &Store, // store could be omitted and a store repo ID would be given instead.
    ) -> Result<Event, NgError> {
        let topic_id = TopicId::nil(); // should be fetched from user storage, based on the Commit.branch
        let topic_priv_key = BranchWriteCapSecret::nil(); // should be fetched from user storage, based on repoId found in user storage (search by branchId)
        let seq = self.last_seq_number()?;
        Event::new(
            &self.config.peer_priv_key,
            seq,
            commit,
            additional_blocks,
            topic_id,
            &topic_priv_key,
            store,
        )
    }

    pub(crate) fn last_seq_number(&mut self) -> Result<u64, NgError> {
        if self.last_seq_num - 1 >= self.max_reserved_seq_num {
            self.reserve_more(1)?;
        }
        self.last_seq_num += 1;
        Ok(self.last_seq_num)
    }

    pub(crate) fn new_events(
        &mut self,
        events: Vec<(Commit, Vec<Digest>)>,
        store: &Store,
    ) -> Result<Vec<Event>, NgError> {
        let missing_count = events.len() as i64 - self.available_seq_nums() as i64;
        // this is reducing the capacity of reserver_seq_num by half (cast from u64 to i64)
        // but we will never reach situation where so many seq_nums are reserved, neither such a big list of events to processs
        if missing_count >= 0 {
            self.reserve_more(missing_count as u64 + 1)?;
        }
        let mut res = vec![];
        for event in events {
            let topic_id = TopicId::nil(); // should be fetched from user storage, based on the Commit.branch
            let topic_priv_key = BranchWriteCapSecret::nil(); // should be fetched from user storage, based on repoId found in user storage (search by branchId)
            self.last_seq_num += 1;
            let event = Event::new(
                &self.config.peer_priv_key,
                self.last_seq_num,
                &event.0,
                &event.1,
                topic_id,
                &topic_priv_key,
                store,
            )?;
            res.push(event);
        }
        Ok(res)
    }

    fn available_seq_nums(&self) -> u64 {
        self.max_reserved_seq_num - self.last_seq_num
    }

    fn reserve_more(&mut self, at_least: u64) -> Result<(), NgError> {
        // the qty should be calculated based on the last_reservation. the closer to now, the higher the qty.
        // below 1 sec, => 100
        // below 5 sec, => 10
        // below 10 sec => 1
        self.take_some_peer_last_seq_numbers(10)
    }

    fn take_some_peer_last_seq_numbers(&mut self, qty: u16) -> Result<(), NgError> {
        // TODO the magic

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
            VerifierConfigType::RocksDb(path) => (
                // FIXME BIG TIME: we are reusing the same encryption key here.
                // this is very temporary, until we remove the code in oxi_rocksdb of oxigraph,
                // and have oxigraph use directly the UserStorage
                Some(oxigraph::store::Store::open_with_key(path, config.user_master_key).unwrap()),
                Some(
                    Box::new(RocksDbUserStorage::open(path, config.user_master_key)?)
                        as Box<dyn UserStorage>,
                ),
                Some(block_storage),
            ),
            VerifierConfigType::Remote(_) => (None, None, None),
            _ => unimplemented!(), // can be WebRocksDb or RocksDb on wasm platforms
        };
        let peer_id = config.peer_priv_key.to_pub();
        let mut verif = Verifier {
            config,
            connected_server_id: None,
            graph_dataset: graph,
            user_storage: user,
            block_storage: block,
            peer_id,
            last_reservation: SystemTime::now(),
            max_reserved_seq_num: 0,
            last_seq_num: 0,
            stores: HashMap::new(),
            repos: HashMap::new(),
        };
        verif.take_some_peer_last_seq_numbers(1)?;
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

    /// returns the Repo and the last seq_num of the peer
    pub fn new_repo_default<'a>(
        &'a mut self,
        creator: &UserId,
        creator_priv_key: &PrivKey,
        //store_repo: &StoreRepo,
        store: Box<Store>,
    ) -> Result<(&'a Repo, Vec<Event>), NgError> {
        //let store = self.get_store(store_repo);
        let (repo, proto_events) = store.create_repo_default(creator, creator_priv_key)?;

        //repo.store = Some(store);
        let events = self.new_events(proto_events, &repo.store)?;

        let repo_ref = self.repos.entry(repo.id).or_insert(repo);
        Ok((repo_ref, events))
    }
}
#[cfg(test)]
mod test {

    use crate::types::*;
    use crate::verifier::*;
    use ng_repo::log::*;

    #[test]
    pub fn test_new_repo_default() {
        let (creator_priv_key, creator_pub_key) = generate_keypair();

        let (publisher_privkey, publisher_pubkey) = generate_keypair();
        let publisher_peer = PeerId::Forwarded(publisher_pubkey);

        let store = Store::dummy_public_v0();

        let mut verifier = Verifier::new_dummy();
        //let store = verifier.get_store(store_repo);

        let (repo, events) = verifier
            .new_repo_default(&creator_pub_key, &creator_priv_key, store)
            .expect("new_default");

        log_debug!("REPO OBJECT {}", repo);

        log_debug!("events:     {}\n", events.len());
        let mut i = 0;
        for e in events {
            log_debug!("========== EVENT {:03}: {}", i, e);
            i += 1;
        }

        assert_eq!(verifier.last_seq_number(), 6);
    }
}
