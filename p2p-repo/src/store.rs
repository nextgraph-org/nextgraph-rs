// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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

use crate::types::*;

use std::sync::{Arc, RwLock};
use std::{
    cmp::min,
    collections::{hash_map::Iter, HashMap},
    mem::size_of_val,
};

pub trait RepoStore {
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
    BackendError,
    SerializationError,
    AlreadyExists,
}

impl From<serde_bare::error::Error> for StorageError {
    fn from(e: serde_bare::error::Error) -> Self {
        StorageError::SerializationError
    }
}

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
            Some(block) => Ok(block.clone()),
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
