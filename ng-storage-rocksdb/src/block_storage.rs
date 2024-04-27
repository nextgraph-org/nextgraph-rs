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
use rocksdb::BlockBasedOptions;
use rocksdb::DBCompressionType;
use std::path::Path;
use std::sync::{Arc, RwLock};
use std::thread::available_parallelism;

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
        let default_parallelism_approx = available_parallelism()
            .unwrap_or(std::num::NonZeroUsize::new(1).unwrap())
            .get();
        //opts.set_use_fsync(true);
        opts.set_max_background_jobs(default_parallelism_approx as i32);
        opts.increase_parallelism(default_parallelism_approx as i32);

        // the default WAL size is CF_nbr * write_buffer_size * max_write_buffer_number * 4
        opts.set_max_total_wal_size(256 * 1024 * 1024);
        opts.set_write_buffer_size(64 * 1024 * 1024); // which is the default. might have to reduce this on smartphones.
        opts.set_target_file_size_base(1024 * 1024);
        opts.set_max_write_buffer_number(2); // the default
        opts.set_level_zero_file_num_compaction_trigger(4); // the default
        opts.set_max_bytes_for_level_base(16 * 1024 * 1024);
        opts.set_target_file_size_multiplier(10);
        opts.set_level_compaction_dynamic_level_bytes(true);
        opts.set_num_levels(7); // the default

        opts.create_if_missing(true);
        opts.create_missing_column_families(false);
        opts.set_enable_blob_files(true);
        // all values are going to BlobStore
        opts.set_min_blob_size(0);
        // set a low value (16M) for file_size to reduce space amplification
        opts.set_blob_file_size(16 * 1024 * 1024);
        // no need for compression, as the data is encrypted (it won't compress)
        opts.set_blob_compression_type(DBCompressionType::None);
        opts.set_enable_blob_gc(true);
        // the oldest half of blob files will be selected for GC
        opts.set_blob_gc_age_cutoff(0.75);
        // in those oldest blob files, if 50% of it (8MB) is garbage, a forced compact will occur.
        // this way we are reducing the space amplification by small decrements of 8MB
        opts.set_blob_gc_force_threshold(0.5);

        let mut block_based_opts = BlockBasedOptions::default();
        // we will have a cache of decrypted objects, so there is no point in caching also the encrypted blocks.
        block_based_opts.disable_cache();
        block_based_opts.set_block_size(16 * 1024);
        block_based_opts.set_bloom_filter(10.0, false);
        block_based_opts.set_format_version(6);
        opts.set_block_based_table_factory(&block_based_opts);

        let env = Env::enc_env(key).unwrap();
        opts.set_env(&env);
        let tx_options = TransactionDBOptions::new();
        let db: TransactionDB = TransactionDB::open(&opts, &tx_options, &path).unwrap();

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
