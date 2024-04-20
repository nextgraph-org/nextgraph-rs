// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use ng_repo::block_storage::BlockStorage;
use ng_repo::errors::StorageError;
use ng_repo::types::*;
use ng_repo::utils::*;

use ng_repo::log::*;
use std::path::Path;
use std::sync::{Arc, RwLock};

use serde::{Deserialize, Serialize};
use serde_bare::error::Error;

use rocksdb::{
    ColumnFamily, ColumnFamilyDescriptor, Direction, Env, ErrorKind, IteratorMode, Options,
    SingleThreaded, TransactionDB, TransactionDBOptions, DB,
};

pub struct RocksDbBlockStorage {
    /// the main store where all the properties of keys are stored
    db: TransactionDB,
    /// path for the storage backend data
    path: String,
}

impl RocksDbBlockStorage {
    /// Opens the store and returns a KCVStorage object that should be kept and used to manipulate the properties
    /// The key is the encryption key for the data at rest.
    pub fn open<'a>(path: &Path, key: [u8; 32]) -> Result<RocksDbBlockStorage, StorageError> {
        let mut opts = Options::default();
        opts.set_use_fsync(true);
        opts.create_if_missing(true);
        opts.create_missing_column_families(true);
        let env = Env::enc_env(key).unwrap();
        opts.set_env(&env);
        let tx_options = TransactionDBOptions::new();
        let db: TransactionDB =
            TransactionDB::open_cf(&opts, &tx_options, &path, vec!["cf0", "cf1"]).unwrap();

        log_info!(
            "created blockstorage with Rocksdb Version: {}",
            Env::version()
        );

        Ok(RocksDbBlockStorage {
            db: db,
            path: path.to_str().unwrap().to_string(),
        })
    }

    fn compute_key(overlay: &OverlayId, id: &BlockId) -> Vec<u8> {
        let mut key: Vec<u8> = Vec::with_capacity(34 + 33);
        key.append(&mut serde_bare::to_vec(overlay).unwrap());
        key.append(&mut serde_bare::to_vec(id).unwrap());
        key
    }
}

impl BlockStorage for RocksDbBlockStorage {
    /// Load a block from the storage.
    fn get(&self, overlay: &OverlayId, id: &BlockId) -> Result<Block, StorageError> {
        let block_ser = self
            .db
            .get(Self::compute_key(overlay, id))
            .map_err(|_e| StorageError::BackendError)?
            .ok_or(StorageError::NotFound)?;
        let block: Block = serde_bare::from_slice(&block_ser)?;
        Ok(block)
    }

    /// Save a block to the storage.
    fn put(&self, overlay: &OverlayId, block: &Block) -> Result<BlockId, StorageError> {
        // TODO? return an error if already present in blockstorage?
        let block_id = block.id();
        let ser = serde_bare::to_vec(block)?;
        let tx = self.db.transaction();
        tx.put(Self::compute_key(overlay, &block_id), &ser)
            .map_err(|_e| StorageError::BackendError)?;
        tx.commit().map_err(|_| StorageError::BackendError)?;
        Ok(block_id)
    }

    /// Delete a block from the storage.
    fn del(&self, overlay: &OverlayId, id: &BlockId) -> Result<usize, StorageError> {
        let tx = self.db.transaction();
        tx.delete(Self::compute_key(overlay, id))
            .map_err(|_e| StorageError::BackendError)?;
        tx.commit().map_err(|_| StorageError::BackendError)?;
        // TODO, return real size
        Ok(0)
    }

    /// number of Blocks in the storage
    fn len(&self) -> Result<usize, StorageError> {
        //TODO return number of blocks
        Ok(0)
    }
}
