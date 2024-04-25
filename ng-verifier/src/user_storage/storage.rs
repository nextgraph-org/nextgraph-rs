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
    /// Gets the StoreRepo for a given RepoId
    fn repo_id_to_store_overlay(&self, id: &RepoId) -> Result<StoreOverlay, StorageError>;

    fn get_all_store_and_repo_ids(&self) -> Result<HashMap<StoreRepo, Vec<RepoId>>, StorageError>;

    fn load_store(
        &self,
        repo_store: &StoreRepo,
        block_storage: Arc<RwLock<dyn BlockStorage + Send + Sync>>,
    ) -> Result<Repo, StorageError>;

    fn load_repo(&self, repo_id: &RepoId, store: Arc<Store>) -> Result<Repo, StorageError>;

    fn save_repo(&self, repo: &Repo) -> Result<(), StorageError>;

    fn add_branch(&self, repo_id: &RepoId, branch_info: &BranchInfo) -> Result<(), StorageError>;

    fn update_signer_cap(&self, signer_cap: &SignerCap) -> Result<(), StorageError>;
}

pub(crate) struct InMemoryUserStorage {
    repo_id_to_store_overlay: HashMap<RepoId, StoreOverlay>,
}

impl InMemoryUserStorage {
    pub fn new() -> Self {
        InMemoryUserStorage {
            repo_id_to_store_overlay: HashMap::new(),
        }
    }
}

impl UserStorage for InMemoryUserStorage {
    fn repo_id_to_store_overlay(&self, id: &RepoId) -> Result<StoreOverlay, StorageError> {
        Ok(self
            .repo_id_to_store_overlay
            .get(&id)
            .ok_or(StorageError::NotFound)?
            .to_owned())
    }

    fn get_all_store_and_repo_ids(&self) -> Result<HashMap<StoreRepo, Vec<RepoId>>, StorageError> {
        unimplemented!();
    }

    fn load_store(
        &self,
        repo_store: &StoreRepo,
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
}
