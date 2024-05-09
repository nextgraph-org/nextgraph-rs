// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Storage of user application data (RDF, content of rich-text document, etc)

use ng_repo::{
    block_storage::BlockStorage,
    errors::StorageError,
    repo::{BranchInfo, Repo},
    store::Store,
    types::*,
};

use crate::types::*;
use std::{
    cmp::{max, min},
    collections::HashMap,
    mem::size_of_val,
    sync::{Arc, RwLock},
};

pub trait UserStorage: Send + Sync {
    //fn repo_id_to_store_overlay(&self, id: &RepoId) -> Result<StoreOverlay, StorageError>;

    fn get_all_store_and_repo_ids(&self) -> Result<HashMap<StoreRepo, Vec<RepoId>>, StorageError>;

    fn load_store(
        &self,
        store_repo: &StoreRepo,
        block_storage: Arc<RwLock<dyn BlockStorage + Send + Sync>>,
    ) -> Result<Repo, StorageError>;

    fn load_repo(&self, repo_id: &RepoId, store: Arc<Store>) -> Result<Repo, StorageError>;

    fn save_repo(&self, repo: &Repo) -> Result<(), StorageError>;

    fn add_branch(&self, repo_id: &RepoId, branch_info: &BranchInfo) -> Result<(), StorageError>;

    fn update_signer_cap(&self, signer_cap: &SignerCap) -> Result<(), StorageError>;

    fn branch_add_file(
        &self,
        commit_id: ObjectId,
        branch: BranchId,
        file: FileName,
    ) -> Result<(), StorageError>;

    fn branch_get_all_files(&self, branch: &BranchId) -> Result<Vec<FileName>, StorageError>;

    fn update_branch_current_head(
        &self,
        repo_id: &RepoId,
        branch_id: &BranchId,
        new_heads: Vec<ObjectRef>,
    ) -> Result<(), StorageError>;
}

pub(crate) struct InMemoryUserStorage {
    branch_files: RwLock<HashMap<BranchId, Vec<FileName>>>,
}

impl InMemoryUserStorage {
    pub fn new() -> Self {
        InMemoryUserStorage {
            branch_files: RwLock::new(HashMap::new()),
        }
    }
}

impl UserStorage for InMemoryUserStorage {
    fn branch_add_file(
        &self,
        commit_id: ObjectId,
        branch: BranchId,
        file: FileName,
    ) -> Result<(), StorageError> {
        let mut lock = self.branch_files.write().unwrap();
        let file_list = lock.entry(branch).or_insert_with(|| Vec::with_capacity(1));
        file_list.push(file);
        Ok(())
    }

    fn branch_get_all_files(&self, branch: &BranchId) -> Result<Vec<FileName>, StorageError> {
        let lock = self.branch_files.read().unwrap();
        if let Some(file_list) = lock.get(&branch) {
            Ok(file_list.to_vec())
        } else {
            Ok(vec![])
        }
    }

    fn get_all_store_and_repo_ids(&self) -> Result<HashMap<StoreRepo, Vec<RepoId>>, StorageError> {
        unimplemented!();
    }

    fn load_store(
        &self,
        store_repo: &StoreRepo,
        block_storage: Arc<RwLock<dyn BlockStorage + Send + Sync>>,
    ) -> Result<Repo, StorageError> {
        unimplemented!();
    }
    fn load_repo(&self, repo_id: &RepoId, store: Arc<Store>) -> Result<Repo, StorageError> {
        unimplemented!();
    }

    fn save_repo(&self, repo: &Repo) -> Result<(), StorageError> {
        unimplemented!();
    }

    fn add_branch(&self, repo_id: &RepoId, branch_info: &BranchInfo) -> Result<(), StorageError> {
        unimplemented!();
    }

    fn update_signer_cap(&self, signer_cap: &SignerCap) -> Result<(), StorageError> {
        unimplemented!();
    }

    fn update_branch_current_head(
        &self,
        repo_id: &RepoId,
        branch_id: &BranchId,
        new_heads: Vec<ObjectRef>,
    ) -> Result<(), StorageError> {
        unimplemented!();
    }
}
