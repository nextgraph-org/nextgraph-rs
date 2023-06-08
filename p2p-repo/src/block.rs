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

//! Immutable Block

use crate::types::*;

impl BlockV0 {
    pub fn new(
        children: Vec<BlockId>,
        deps: ObjectDeps,
        expiry: Option<Timestamp>,
        content: Vec<u8>,
        key: Option<SymKey>,
    ) -> BlockV0 {
        let mut b = BlockV0 {
            id: None,
            key,
            children,
            deps,
            expiry,
            content,
        };
        let block = Block::V0(b.clone());
        b.id = Some(block.get_id());
        b
    }
}

impl From<Digest> for String {
    fn from(id: BlockId) -> Self {
        base64_url::encode(&serde_bare::to_vec(&id).unwrap())
        //hex::encode(to_vec(&id).unwrap())
    }
}

impl Block {
    pub fn new(
        children: Vec<BlockId>,
        deps: ObjectDeps,
        expiry: Option<Timestamp>,
        content: Vec<u8>,
        key: Option<SymKey>,
    ) -> Block {
        Block::V0(BlockV0::new(children, deps, expiry, content, key))
    }

    /// Compute the ID
    pub fn get_id(&self) -> BlockId {
        let ser = serde_bare::to_vec(self).unwrap();
        let hash = blake3::hash(ser.as_slice());
        Digest::Blake3Digest32(hash.as_bytes().clone())
    }

    /// Get the already computed ID
    pub fn id(&self) -> BlockId {
        match self {
            Block::V0(b) => match b.id {
                Some(id) => id,
                None => self.get_id(),
            },
        }
    }

    /// Get the content
    pub fn content(&self) -> &Vec<u8> {
        match self {
            Block::V0(b) => &b.content,
        }
    }

    /// Get the children
    pub fn children(&self) -> &Vec<BlockId> {
        match self {
            Block::V0(b) => &b.children,
        }
    }

    /// Get the dependencies
    pub fn deps(&self) -> &ObjectDeps {
        match self {
            Block::V0(b) => &b.deps,
        }
    }

    /// Get the expiry
    pub fn expiry(&self) -> Option<Timestamp> {
        match self {
            Block::V0(b) => b.expiry,
        }
    }

    pub fn set_expiry(&mut self, expiry: Option<Timestamp>) {
        match self {
            Block::V0(b) => {
                b.id = None;
                b.expiry = expiry
            }
        }
    }

    /// Get the key
    pub fn key(&self) -> Option<SymKey> {
        match self {
            Block::V0(b) => b.key,
        }
    }

    /// Set the key
    pub fn set_key(&mut self, key: Option<SymKey>) {
        match self {
            Block::V0(b) => b.key = key,
        }
    }
}
