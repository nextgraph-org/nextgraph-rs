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

//! Immutable Block

use crate::types::*;

impl BlockV0 {
    pub fn new(
        children: Vec<BlockId>,
        header_ref: Option<ObjectRef>,
        content: Vec<u8>,
        key: Option<SymKey>,
    ) -> BlockV0 {
        let (commit_header_id, commit_header_key) = header_ref.map_or((None, None), |obj_ref| {
            (Some(obj_ref.id), Some(obj_ref.key))
        });
        let bc = BlockContentV0 {
            children,
            commit_header_id,
            encrypted_content: content,
        };
        let mut b = BlockV0 {
            id: None,
            key,
            content: BlockContent::V0(bc),
            commit_header_key,
        };
        b.id = Some(b.compute_id());
        b
    }

    /// Compute the ID
    pub fn compute_id(&self) -> BlockId {
        let ser = serde_bare::to_vec(&self.content).unwrap();
        let hash = blake3::hash(ser.as_slice());
        Digest::Blake3Digest32(hash.as_bytes().clone())
    }

    pub fn children(&self) -> &Vec<BlockId> {
        self.content.children()
    }
}

impl From<Digest> for String {
    fn from(id: BlockId) -> Self {
        base64_url::encode(&serde_bare::to_vec(&id).unwrap())
        //hex::encode(to_vec(&id).unwrap())
    }
}

impl BlockContent {
    /// Get the encrypted content
    pub fn encrypted_content(&self) -> &Vec<u8> {
        match self {
            BlockContent::V0(bc) => &bc.encrypted_content,
        }
    }

    /// Get the header id
    pub fn header_id(&self) -> &Option<ObjectId> {
        match self {
            BlockContent::V0(bc) => &bc.commit_header_id,
        }
    }

    /// Get the children
    pub fn children(&self) -> &Vec<BlockId> {
        match self {
            BlockContent::V0(b) => &b.children,
        }
    }
}

impl Block {
    pub fn new(
        children: Vec<BlockId>,
        header_ref: Option<ObjectRef>,
        content: Vec<u8>,
        key: Option<SymKey>,
    ) -> Block {
        Block::V0(BlockV0::new(children, header_ref, content, key))
    }

    /// Compute the ID
    pub fn compute_id(&self) -> BlockId {
        match self {
            Block::V0(v0) => v0.compute_id(),
        }
    }

    /// Get the already computed ID or computes it, saves it, and returns it
    pub fn get_and_save_id(&mut self) -> BlockId {
        match &self {
            Block::V0(b) => match b.id {
                Some(id) => id,
                None => {
                    let id = self.compute_id();
                    let Block::V0(c) = self;
                    c.id = Some(id);
                    id
                }
            },
        }
    }

    /// Get the already computed ID or computes it
    pub fn id(&self) -> BlockId {
        match self {
            Block::V0(b) => match b.id {
                Some(id) => id,
                None => self.compute_id(),
            },
        }
    }

    /// Get the encrypted content
    pub fn encrypted_content(&self) -> &Vec<u8> {
        match self {
            Block::V0(b) => &b.content.encrypted_content(),
        }
    }

    /// Get the children
    pub fn children(&self) -> &Vec<BlockId> {
        match self {
            Block::V0(b) => &b.content.children(),
        }
    }

    /// Get the header
    pub fn header_ref(&self) -> Option<ObjectRef> {
        match self {
            Block::V0(b) => b.commit_header_key.as_ref().map(|key| ObjectRef {
                key: key.clone(),
                id: b.content.header_id().unwrap().clone(),
            }),
        }
    }

    /// Get the key
    pub fn key(&self) -> Option<SymKey> {
        match self {
            Block::V0(b) => b.key.clone(),
        }
    }

    /// Set the key
    pub fn set_key(&mut self, key: Option<SymKey>) {
        match self {
            Block::V0(b) => b.key = key,
        }
    }
}
