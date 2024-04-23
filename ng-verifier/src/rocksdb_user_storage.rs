// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! RocksDb Backend for UserStorage trait

use crate::types::*;
use crate::user_storage::repo::RepoStorage;
use crate::user_storage::*;
use either::Either::{Left, Right};
use ng_repo::block_storage::BlockStorage;
use ng_repo::repo::Repo;
use ng_repo::store::Store;
use ng_repo::{errors::StorageError, types::*};
use ng_storage_rocksdb::kcv_storage::RocksdbKCVStorage;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use std::{
    cmp::{max, min},
    collections::HashMap,
    mem::size_of_val,
};

pub(crate) struct RocksDbUserStorage {
    user_storage: RocksdbKCVStorage,
}

impl RocksDbUserStorage {
    pub fn open(path: &PathBuf, master_key: [u8; 32]) -> Result<Self, StorageError> {
        Ok(RocksDbUserStorage {
            user_storage: RocksdbKCVStorage::open(path, master_key)?,
        })
    }
}

impl UserStorage for RocksDbUserStorage {
    fn repo_id_to_store_overlay(&self, id: &RepoId) -> Result<StoreOverlay, StorageError> {
        unimplemented!();
    }

    fn get_all_store_and_repo_ids(&self) -> Result<HashMap<StoreRepo, Vec<RepoId>>, StorageError> {
        RepoStorage::get_all_store_and_repo_ids(&self.user_storage)
    }

    fn load_store(
        &self,
        repo_store: &StoreRepo,
        block_storage: Arc<RwLock<dyn BlockStorage + Send + Sync>>,
    ) -> Result<Repo, StorageError> {
        RepoStorage::load(
            repo_store.repo_id(),
            Right(block_storage),
            &self.user_storage,
        )
    }

    fn load_repo(&self, repo_id: &RepoId, store: Arc<Store>) -> Result<Repo, StorageError> {
        RepoStorage::load(repo_id, Left(store), &self.user_storage)
    }

    fn save_repo(&self, repo: &Repo) -> Result<(), StorageError> {
        RepoStorage::create_from_repo(repo, &self.user_storage)?;
        Ok(())
    }
}