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
use crate::user_storage::*;
use ng_repo::{errors::StorageError, types::*};
use ng_storage_rocksdb::kcv_storage::RocksdbKCVStore;
use std::path::PathBuf;
use std::{
    cmp::{max, min},
    collections::HashMap,
    mem::size_of_val,
};

pub(crate) struct RocksDbUserStorage {
    user_storage: RocksdbKCVStore,
}

impl RocksDbUserStorage {
    pub fn open(path: &PathBuf, master_key: [u8; 32]) -> Result<Self, StorageError> {
        Ok(RocksDbUserStorage {
            user_storage: RocksdbKCVStore::open(path, master_key)?,
        })
    }
}

impl UserStorage for RocksDbUserStorage {
    fn repo_id_to_store_overlay(&self, id: &RepoId) -> Result<StoreOverlay, StorageError> {
        unimplemented!();
    }
}
