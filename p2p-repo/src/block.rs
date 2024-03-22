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

use crate::errors::*;
use crate::log::*;
use crate::types::*;

use chacha20::cipher::{KeyIvInit, StreamCipher};
use chacha20::ChaCha20;

impl BlockV0 {
    pub fn new(
        children: Vec<BlockId>,
        mut header_ref: Option<CommitHeaderRef>,
        content: Vec<u8>,
        key: Option<SymKey>,
    ) -> BlockV0 {
        let (commit_header, commit_header_key) = header_ref
            .take()
            .map_or((CommitHeaderObject::None, None), |obj_ref| {
                (obj_ref.obj, Some(obj_ref.key))
            });
        let bc = BlockContentV0 {
            children,
            commit_header: commit_header,
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

    pub fn new_random_access(
        children: Vec<BlockId>,
        content: Vec<u8>,
        key: Option<SymKey>,
    ) -> BlockV0 {
        let bc = BlockContentV0 {
            children,
            commit_header: CommitHeaderObject::RandomAccess,
            encrypted_content: content,
        };
        let mut b = BlockV0 {
            id: None,
            key,
            content: BlockContent::V0(bc),
            commit_header_key: None,
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

    // /// Get the header id
    // pub fn header_id(&self) -> &Option<ObjectId> {
    //     match self {
    //         BlockContent::V0(bc) => &bc.commit_header_id,
    //     }
    // }

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
        header_ref: Option<CommitHeaderRef>,
        content: Vec<u8>,
        key: Option<SymKey>,
    ) -> Block {
        Block::V0(BlockV0::new(children, header_ref, content, key))
    }

    pub fn new_random_access(
        children: Vec<BlockId>,
        content: Vec<u8>,
        key: Option<SymKey>,
    ) -> Block {
        Block::V0(BlockV0::new_random_access(children, content, key))
    }

    pub fn new_with_encrypted_content(content: Vec<u8>, key: Option<SymKey>) -> Block {
        Block::V0(BlockV0::new(vec![], None, content, key))
    }

    pub fn size(&self) -> usize {
        serde_bare::to_vec(&self).unwrap().len()
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

    /// Get the content
    pub fn content(&self) -> &BlockContent {
        match self {
            Block::V0(b) => &b.content,
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

    /// Get the header reference
    pub fn header_ref(&self) -> Option<CommitHeaderRef> {
        match self {
            Block::V0(b) => match b.commit_header_key.as_ref() {
                Some(key) => match b.content.commit_header_obj() {
                    CommitHeaderObject::None => None,
                    CommitHeaderObject::RandomAccess => None,
                    _ => Some(CommitHeaderRef {
                        obj: b.content.commit_header_obj().clone(),
                        key: key.clone(),
                    }),
                },

                None => None,
            },
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

    pub fn read(
        &self,
        key: &SymKey,
    ) -> Result<(Vec<(BlockId, BlockKey)>, Vec<u8>), ObjectParseError> {
        match self {
            Block::V0(b) => {
                // decrypt content in place (this is why we have to clone first)
                let mut content_dec = b.content.encrypted_content().clone();
                match key {
                    SymKey::ChaCha20Key(key) => {
                        let nonce = [0u8; 12];
                        let mut cipher = ChaCha20::new(key.into(), &nonce.into());
                        let mut content_dec_slice = &mut content_dec.as_mut_slice();
                        cipher.apply_keystream(&mut content_dec_slice);
                    }
                }

                // deserialize content
                let content: ChunkContentV0;
                match serde_bare::from_slice(content_dec.as_slice()) {
                    Ok(c) => content = c,
                    Err(e) => {
                        log_debug!("Block deserialize error: {}", e);
                        return Err(ObjectParseError::BlockDeserializeError);
                    }
                }
                // parse content
                match content {
                    ChunkContentV0::InternalNode(keys) => {
                        let b_children = b.children();
                        if keys.len() != b_children.len() {
                            log_debug!(
                                "Invalid keys length: got {}, expected {}",
                                keys.len(),
                                b_children.len()
                            );
                            log_debug!("!!! children: {:?}", b_children);
                            log_debug!("!!! keys: {:?}", keys);
                            return Err(ObjectParseError::InvalidKeys);
                        }
                        let mut children = Vec::with_capacity(b_children.len());
                        for (id, key) in b_children.iter().zip(keys.iter()) {
                            children.push((id.clone(), key.clone()));
                        }
                        Ok((children, vec![]))
                    }
                    ChunkContentV0::DataChunk(chunk) => Ok((vec![], chunk)),
                }
            }
        }
    }
}
