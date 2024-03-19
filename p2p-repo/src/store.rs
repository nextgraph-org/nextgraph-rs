// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// This code is partly derived from work written by TG x Thoth from P2Pcollab.
// Copyright 2022 TG x Thoth
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Block store

use futures::StreamExt;

use crate::types::*;
use crate::utils::Receiver;

use std::sync::{Arc, RwLock};
use std::{
    cmp::{max, min},
    collections::{hash_map::Iter, HashMap},
    mem::size_of_val,
};

pub trait RepoStore: Send + Sync {
    /// Load a block from the store.
    fn get(&self, id: &BlockId) -> Result<Block, StorageError>;

    /// Save a block to the store.
    fn put(&self, block: &Block) -> Result<BlockId, StorageError>;

    /// Delete a block from the store.
    fn del(&self, id: &BlockId) -> Result<(Block, usize), StorageError>;
}

#[derive(Debug, PartialEq)]
pub enum StorageError {
    NotFound,
    InvalidValue,
    DifferentValue,
    BackendError,
    SerializationError,
    AlreadyExists,
    DataCorruption,
}

impl core::fmt::Display for StorageError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl From<serde_bare::error::Error> for StorageError {
    fn from(e: serde_bare::error::Error) -> Self {
        StorageError::SerializationError
    }
}

/* LMDB values:

const MIN_SIZE: usize = 4072;
const PAGE_SIZE: usize = 4096;
const HEADER: usize = PAGE_SIZE - MIN_SIZE;
const MAX_FACTOR: usize = 512;

/// Returns a valid/optimal value size for the entries of the storage backend.
pub fn store_valid_value_size(size: usize) -> usize {
    min(
        ((size + HEADER) as f32 / PAGE_SIZE as f32).ceil() as usize,
        MAX_FACTOR,
    ) * PAGE_SIZE
        - HEADER
}

/// Returns the maximum value size for the entries of the storage backend.
pub const fn store_max_value_size() -> usize {
    MAX_FACTOR * PAGE_SIZE - HEADER
}
*/

// ROCKSDB values:

const ONE_MEGA_BYTE: usize = 1024 * 1024;
const DISK_BLOCK_SIZE: usize = 4096;
// HDD block size at 4096, SSD page size at 4096, on openbsd FFS default is 16384
// see Rocksdb integrated BlobDB https://rocksdb.org/blog/2021/05/26/integrated-blob-db.html
// blob values should be multiple of 4096 because of the BlobCache of RocksDB that is in heap memory (so must align on mem page).
const MAX_FACTOR: usize = 256;

/// Returns a valid/optimal value size for the entries of the storage backend.
pub fn store_valid_value_size(size: usize) -> usize {
    min(
        max(1, (size as f32 / DISK_BLOCK_SIZE as f32).ceil() as usize),
        MAX_FACTOR,
    ) * DISK_BLOCK_SIZE
}

/// Returns the maximum value size for the entries of the storage backend.
pub const fn store_max_value_size() -> usize {
    ONE_MEGA_BYTE
}

/// Store with a HashMap backend
pub struct HashMapRepoStore {
    blocks: RwLock<HashMap<BlockId, Block>>,
}

impl HashMapRepoStore {
    pub fn new() -> HashMapRepoStore {
        HashMapRepoStore {
            blocks: RwLock::new(HashMap::new()),
        }
    }

    pub async fn from_block_stream(mut blockstream: Receiver<Block>) -> Self {
        let this = Self::new();
        while let Some(block) = blockstream.next().await {
            this.put(&block).unwrap();
        }
        this
    }

    pub fn get_len(&self) -> usize {
        self.blocks.read().unwrap().len()
    }

    pub fn get_all(&self) -> Vec<Block> {
        self.blocks
            .read()
            .unwrap()
            .values()
            .map(|x| x.clone())
            .collect()
    }
}

impl RepoStore for HashMapRepoStore {
    fn get(&self, id: &BlockId) -> Result<Block, StorageError> {
        match self.blocks.read().unwrap().get(id) {
            Some(block) => {
                let mut b = block.clone();
                let i = b.get_and_save_id();
                if *id == i {
                    Ok(b)
                } else {
                    Err(StorageError::DataCorruption)
                }
            }
            None => Err(StorageError::NotFound),
        }
    }

    fn put(&self, block: &Block) -> Result<BlockId, StorageError> {
        let id = block.id();
        let mut b = block.clone();
        b.set_key(None);
        self.blocks.write().unwrap().insert(id, b);
        Ok(id)
    }

    fn del(&self, id: &BlockId) -> Result<(Block, usize), StorageError> {
        let block = self
            .blocks
            .write()
            .unwrap()
            .remove(id)
            .ok_or(StorageError::NotFound)?;
        let size = size_of_val(&block);
        Ok((block, size))
    }
}
