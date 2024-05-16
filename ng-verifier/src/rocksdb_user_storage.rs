// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! RocksDb Backend for UserStorage trait

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};

use either::Either::{Left, Right};

use ng_net::app_protocol::FileName;
use ng_repo::block_storage::BlockStorage;
use ng_repo::log::*;
use ng_repo::repo::{BranchInfo, Repo};
use ng_repo::store::Store;
use ng_repo::{errors::StorageError, types::*};

use ng_storage_rocksdb::kcv_storage::RocksDbKCVStorage;

use crate::user_storage::branch::*;
use crate::user_storage::repo::*;
use crate::user_storage::*;

pub(crate) struct RocksDbUserStorage {
    user_storage: RocksDbKCVStorage,
}

impl RocksDbUserStorage {
    pub fn open(path: &PathBuf, master_key: [u8; 32]) -> Result<Self, StorageError> {
        Ok(RocksDbUserStorage {
            user_storage: RocksDbKCVStorage::open(path, master_key)?,
        })
    }
}

impl UserStorage for RocksDbUserStorage {
    // fn repo_id_to_store_overlay(&self, id: &RepoId) -> Result<StoreOverlay, StorageError> {
    //     unimplemented!();
    // }

    fn get_all_store_and_repo_ids(&self) -> Result<HashMap<StoreRepo, Vec<RepoId>>, StorageError> {
        RepoStorage::get_all_store_and_repo_ids(&self.user_storage)
    }

    fn load_store(
        &self,
        store_repo: &StoreRepo,
        block_storage: Arc<RwLock<dyn BlockStorage + Send + Sync>>,
    ) -> Result<Repo, StorageError> {
        RepoStorage::load(
            store_repo.repo_id(),
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

    fn add_branch(&self, repo_id: &RepoId, branch_info: &BranchInfo) -> Result<(), StorageError> {
        RepoStorage::add_branch_from_info(repo_id, branch_info, &self.user_storage)
    }

    fn update_signer_cap(&self, signer_cap: &SignerCap) -> Result<(), StorageError> {
        RepoStorage::update_signer_cap(signer_cap, &self.user_storage)
    }

    fn update_branch_current_heads(
        &self,
        _repo_id: &RepoId,
        branch_id: &BranchId,
        new_heads: Vec<ObjectRef>,
    ) -> Result<(), StorageError> {
        let branch = BranchStorage::new(branch_id, &self.user_storage)?;
        if let Err(e) = branch.replace_current_heads(new_heads) {
            log_err!("error while updating branch current head {:?}", e);
            Err(e)
        } else {
            Ok(())
        }
    }

    fn branch_add_file(
        &self,
        commit_id: ObjectId,
        branch: BranchId,
        file: FileName,
    ) -> Result<(), StorageError> {
        let branch = BranchStorage::new(&branch, &self.user_storage)?;
        branch.add_file(&commit_id, &file)
    }
    fn branch_get_all_files(&self, branch: &BranchId) -> Result<Vec<FileName>, StorageError> {
        BranchStorage::get_all_files(&branch, &self.user_storage)
    }
}
