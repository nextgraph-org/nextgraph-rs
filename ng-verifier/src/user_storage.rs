// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Storage of user application data (RDF, content of rich-text document, etc)

use ng_repo::{errors::StorageError, types::*};

use crate::types::*;
use std::{
    cmp::{max, min},
    collections::HashMap,
    mem::size_of_val,
};

pub trait UserStorage: Send + Sync {
    /// Gets the StoreRepo for a given RepoId
    fn repo_id_to_store_overlay(&self, id: &RepoId) -> Result<StoreOverlay, StorageError>;
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
}
