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

//! Merkle hash tree of Objects

use core::fmt;
use std::collections::{HashMap, HashSet};

use chacha20::cipher::{KeyIvInit, StreamCipher};
use chacha20::ChaCha20;

use crate::log::*;
use crate::store::*;
use crate::types::*;

pub const BLOCK_EXTRA: usize = 12; // 8 is the smallest extra + BLOCK_MAX_DATA_EXTRA
pub const HEADER_REF_EXTRA: usize = 66;
pub const HEADER_EMBED_EXTRA: usize = 34;
pub const CHILD_SIZE: usize = 66;

pub const BLOCK_ID_SIZE: usize = 33;
/// Size of serialized SymKey
pub const BLOCK_KEY_SIZE: usize = 33;
/// Size of serialized Object with deps reference.
/// Varint extra bytes when reaching the maximum value we will ever use in one block
pub const BIG_VARINT_EXTRA: usize = 2;
/// Varint extra bytes when reaching the maximum size of data byte arrays.
pub const DATA_VARINT_EXTRA: usize = 4;

pub const BLOCK_MAX_DATA_EXTRA: usize = 4;

#[derive(Debug)]
/// An Object in memory. This is not used to serialize data
pub struct Object {
    /// keeps the deduplicated blocks of the Object
    block_contents: HashMap<BlockId, Block>,

    /// Blocks of the Object (nodes of the tree)
    blocks: Vec<BlockId>,

    /// Header
    header: Option<CommitHeader>,

    /// Blocks of the Header (nodes of the tree)
    header_blocks: Vec<Block>,

    #[cfg(test)]
    already_saved: bool,
}

/// Object parsing errors
#[derive(Debug)]
pub enum ObjectParseError {
    /// Missing blocks
    MissingBlocks(Vec<BlockId>),
    /// Missing root key
    MissingRootKey,
    /// Invalid BlockId encountered in the tree
    InvalidBlockId,
    /// Too many or too few children of a block
    InvalidChildren,
    /// Number of keys does not match number of children of a block
    InvalidKeys,
    /// Invalid CommitHeader object content
    InvalidHeader,
    /// Error deserializing content of a block
    BlockDeserializeError,
    /// Error deserializing content of the object
    ObjectDeserializeError,
}

/// Object copy error
#[derive(Debug)]
pub enum ObjectCopyError {
    NotFound,
    ParseError,
}

impl Object {
    pub(crate) fn convergence_key(
        store_pubkey: &StoreRepo,
        store_readcap_secret: &ReadCapSecret,
    ) -> [u8; blake3::OUT_LEN] {
        let key_material = match (*store_pubkey.repo_id(), store_readcap_secret.clone()) {
            (PubKey::Ed25519PubKey(pubkey), SymKey::ChaCha20Key(secret)) => {
                [pubkey, secret].concat()
            }
            (_, _) => panic!("cannot sign with Montgomery key"),
        };
        blake3::derive_key("NextGraph Data BLAKE3 key", key_material.as_slice())
    }

    fn make_block(
        mut content: Vec<u8>,
        conv_key: &[u8; blake3::OUT_LEN],
        children: Vec<ObjectId>,
        header_ref: Option<CommitHeaderRef>,
        already_existing: &mut HashMap<BlockKey, BlockId>,
    ) -> Result<Block, BlockId> {
        let key_hash = blake3::keyed_hash(conv_key, &content);

        let key_slice = key_hash.as_bytes();
        let key = SymKey::ChaCha20Key(key_slice.clone());
        let it = already_existing.get(&key);
        if it.is_some() {
            return Err(*it.unwrap());
        }
        let nonce = [0u8; 12];
        let mut cipher = ChaCha20::new(key_slice.into(), &nonce.into());
        //let mut content_enc = Vec::from(content);
        let mut content_enc_slice = &mut content.as_mut_slice();
        cipher.apply_keystream(&mut content_enc_slice);

        let block = Block::new(children, header_ref, content, Some(key));
        //log_debug!(">>> make_block: {}", block.id());
        //log_debug!("!! children: ({}) {:?}", children.len(), children);
        Ok(block)
    }

    fn make_header_v0(
        header: CommitHeaderV0,
        object_size: usize,
        conv_key: &ChaCha20Key,
    ) -> (ObjectRef, Vec<Block>) {
        let header_obj = Object::new_with_convergence_key(
            ObjectContent::V0(ObjectContentV0::CommitHeader(CommitHeader::V0(header))),
            None,
            object_size,
            conv_key,
        );
        let header_ref = ObjectRef {
            id: header_obj.id(),
            key: header_obj.key().unwrap(),
        };
        (header_ref, header_obj.blocks().cloned().collect())
    }

    fn make_header(
        header: CommitHeader,
        object_size: usize,
        conv_key: &ChaCha20Key,
    ) -> (ObjectRef, Vec<Block>) {
        match header {
            CommitHeader::V0(v0) => Self::make_header_v0(v0, object_size, conv_key),
        }
    }

    /// Build tree from leaves, returns parent nodes and optional header blocks
    fn make_tree(
        block_contents: &mut HashMap<BlockId, Block>,
        already_existing: &mut HashMap<BlockKey, BlockId>,
        leaves: &[BlockId],
        conv_key: &ChaCha20Key,
        header_prepare_size: usize,
        mut header_prepare_block_ref: Option<BlockRef>,
        mut header_prepare_blocks: Vec<Block>,
        valid_block_size: usize,
        arity: usize,
    ) -> (Vec<BlockId>, Vec<Block>) {
        let mut parents: Vec<BlockId> = vec![];
        let mut header_blocks = vec![];
        let chunks = leaves.chunks(arity);
        let mut it = chunks.peekable();
        while let Some(nodes) = it.next() {
            let children = nodes.to_vec();
            let keys: Vec<BlockKey> = nodes
                .iter()
                .map(|block_id| block_contents.get(block_id).unwrap().key().unwrap())
                .collect();
            let content = ChunkContentV0::InternalNode(keys);
            let content_ser = serde_bare::to_vec(&content).unwrap();
            //let child_header = None;
            let header = if parents.is_empty() && it.peek().is_none() {
                let mut header_prepare_blocks_taken = vec![];
                header_prepare_blocks_taken.append(&mut header_prepare_blocks);
                match (
                    header_prepare_size,
                    header_prepare_block_ref.take(),
                    header_prepare_blocks_taken,
                ) {
                    (0, None, _) => None,
                    (header_size, Some(block_ref), blocks) => {
                        let is_embeddable = header_size > 0
                            && ((valid_block_size
                                - BLOCK_EXTRA
                                - HEADER_EMBED_EXTRA
                                - header_size)
                                / CHILD_SIZE)
                                >= children.len();
                        let (header_r, mut h_blocks) =
                            Self::make_header_ref(is_embeddable, block_ref, blocks);
                        header_blocks.append(&mut h_blocks);
                        header_r
                    }
                    (_, None, _) => unimplemented!(),
                }
                //header_ref.take()
            } else {
                None
            };
            Self::add_block(
                Self::make_block(content_ser, conv_key, children, header, already_existing),
                &mut parents,
                block_contents,
                already_existing,
            );
        }
        //log_debug!("parents += {}", parents.len());

        if 1 < parents.len() {
            let mut great_parents = Self::make_tree(
                block_contents,
                already_existing,
                parents.as_slice(),
                conv_key,
                header_prepare_size,
                header_prepare_block_ref,
                header_prepare_blocks,
                valid_block_size,
                arity,
            );
            parents.append(&mut great_parents.0);
            header_blocks.append(&mut great_parents.1);
        }
        (parents, header_blocks)
    }

    fn make_header_ref(
        embedded: bool,
        header_ref: BlockRef,
        blocks: Vec<Block>,
    ) -> (Option<CommitHeaderRef>, Vec<Block>) {
        if embedded {
            (
                Some(CommitHeaderRef {
                    obj: CommitHeaderObject::EncryptedContent(
                        blocks[0].encrypted_content().to_vec(),
                    ),
                    key: header_ref.key,
                }),
                vec![],
            )
        } else {
            (
                Some(CommitHeaderRef {
                    obj: CommitHeaderObject::Id(header_ref.id),
                    key: header_ref.key,
                }),
                blocks,
            )
        }
    }

    fn add_block(
        block_result: Result<Block, BlockId>,
        blocks: &mut Vec<BlockId>,
        block_contents: &mut HashMap<BlockId, Block>,
        already_existing: &mut HashMap<BlockKey, BlockId>,
    ) {
        match block_result {
            Ok(mut block) => {
                let id = block.get_and_save_id();
                blocks.push(id);
                if !block_contents.contains_key(&id) {
                    already_existing.insert(block.key().unwrap(), id);
                    block_contents.insert(id, block);
                }
            }
            Err(id) => {
                blocks.push(id);
            }
        }
    }

    /// Create new Object from given content
    ///
    /// The Object is chunked and stored in a Merkle tree
    /// The arity of the Merkle tree is the maximum that fits in the given `max_object_size`
    ///
    /// Arguments:
    /// * `content`: Object content
    /// * `header`: CommitHeaderV0 : All references of the object
    /// * `block_size`: Desired block size for chunking content, will be rounded up to nearest valid block size
    /// * `store`: store public key, needed to generate the convergence key
    /// * `store_secret`: store's read capability secret, needed to generate the convergence key
    pub fn new(
        content: ObjectContent,
        header: Option<CommitHeader>,
        block_size: usize,
        store: &StoreRepo,
        store_secret: &ReadCapSecret,
    ) -> Object {
        let conv_key = Self::convergence_key(store, store_secret);
        Self::new_with_convergence_key(content, header, block_size, &conv_key)
    }

    pub fn new_with_convergence_key(
        content: ObjectContent,
        mut header: Option<CommitHeader>,
        block_size: usize,
        conv_key: &ChaCha20Key,
    ) -> Object {
        if header.is_some() && !content.can_have_header() {
            panic!(
                "cannot make a new Object with header if ObjectContent type different from Commit"
            );
        }

        // create blocks by chunking + encrypting content
        let valid_block_size = store_valid_value_size(block_size);
        log_debug!("valid_block_size {}", valid_block_size);

        // let max_arity_leaves: usize = (valid_block_size - BLOCK_EXTRA) / CHILD_SIZE;
        // let max_arity_root: usize =
        //     (valid_block_size - BLOCK_EXTRA - HEADER_REF_EXTRA) / CHILD_SIZE;
        let max_data_payload_size =
            valid_block_size - BLOCK_EXTRA - HEADER_REF_EXTRA * header.as_ref().map_or(0, |_| 1);
        let max_arity: usize = max_data_payload_size / CHILD_SIZE;

        let mut blocks: Vec<BlockId> = vec![];
        let mut block_contents: HashMap<BlockId, Block> = HashMap::new();
        let mut already_existing: HashMap<BlockKey, BlockId> = HashMap::new();

        let header_prepare = match &header {
            None => (0 as usize, None, vec![]),
            Some(h) => {
                let block_info = Self::make_header(h.clone(), valid_block_size, conv_key);
                if block_info.1.len() == 1 {
                    (
                        block_info.1[0].encrypted_content().len(),
                        Some(block_info.0),
                        block_info.1,
                    )
                } else {
                    (0 as usize, Some(block_info.0), block_info.1)
                }
            }
        };

        let content_ser = serde_bare::to_vec(&content).unwrap();
        let content_len = content_ser.len();

        log_debug!(
            "only one block? {} {} {}",
            content_len <= max_data_payload_size,
            content_len,
            max_data_payload_size
        );
        let header_blocks = if content_len <= max_data_payload_size {
            // content fits in root node
            let data_chunk = ChunkContentV0::DataChunk(content_ser.clone());
            let content_ser = serde_bare::to_vec(&data_chunk).unwrap();

            let (header_ref, h_blocks) = match header_prepare {
                (0, None, _) => (None, vec![]),
                (header_size, Some(block_ref), blocks) => {
                    let is_embeddable = header_size > 0
                        && valid_block_size - BLOCK_EXTRA - HEADER_EMBED_EXTRA - content_ser.len()
                            > header_size;
                    Self::make_header_ref(is_embeddable, block_ref, blocks)
                }
                (_, None, _) => unimplemented!(),
            };
            Self::add_block(
                Self::make_block(
                    content_ser,
                    conv_key,
                    vec![],
                    header_ref,
                    &mut already_existing,
                ),
                &mut blocks,
                &mut block_contents,
                &mut already_existing,
            );

            h_blocks
        } else {
            // chunk content and create leaf nodes
            let mut i = 0;
            let total = content_len / (valid_block_size - BLOCK_EXTRA);
            for chunk in content_ser.chunks(valid_block_size - BLOCK_EXTRA) {
                let data_chunk = ChunkContentV0::DataChunk(chunk.to_vec());
                let chunk_ser = serde_bare::to_vec(&data_chunk).unwrap();
                Self::add_block(
                    Self::make_block(chunk_ser, conv_key, vec![], None, &mut already_existing),
                    &mut blocks,
                    &mut block_contents,
                    &mut already_existing,
                );
                log_debug!("make_block {} of {} - {}%", i, total, i * 100 / total);
                i = i + 1;
            }

            // internal nodes
            // max_arity: max number of ObjectRefs that fit inside an InternalNode Object within the max_data_payload_size limit
            let mut parents = Self::make_tree(
                &mut block_contents,
                &mut already_existing,
                blocks.as_slice(),
                conv_key,
                header_prepare.0,
                header_prepare.1,
                header_prepare.2,
                valid_block_size,
                max_arity,
            );

            blocks.append(&mut parents.0);
            parents.1
        };

        if header_blocks.len() > 0 {
            header
                .as_mut()
                .unwrap()
                .set_id(header_blocks.last().unwrap().id());
        }
        Object {
            blocks,
            block_contents,
            header,
            header_blocks,
            #[cfg(test)]
            already_saved: false,
        }
    }

    /// Load an Object from RepoStore
    ///
    /// Returns Ok(Object) or an Err(ObjectParseError::MissingBlocks(Vec<ObjectId>)) of missing BlockIds
    pub fn load(
        id: ObjectId,
        key: Option<SymKey>,
        store: &Box<impl RepoStore + ?Sized>,
    ) -> Result<Object, ObjectParseError> {
        fn load_tree(
            parents: Vec<BlockId>,
            store: &Box<impl RepoStore + ?Sized>,
            blocks: &mut Vec<BlockId>,
            missing: &mut Vec<BlockId>,
            block_contents: &mut HashMap<BlockId, Block>,
        ) {
            let mut children: Vec<BlockId> = vec![];
            for id in parents {
                match store.get(&id) {
                    Ok(block) => {
                        match &block {
                            Block::V0(o) => {
                                children.extend(o.children().iter().rev());
                            }
                        }
                        blocks.insert(0, id);
                        if !block_contents.contains_key(&id) {
                            block_contents.insert(id, block);
                        }
                    }
                    Err(_) => missing.push(id.clone()),
                }
            }
            if !children.is_empty() {
                load_tree(children, store, blocks, missing, block_contents);
            }
        }

        let mut blocks: Vec<BlockId> = vec![];
        let mut block_contents: HashMap<BlockId, Block> = HashMap::new();
        let mut missing: Vec<BlockId> = vec![];

        load_tree(
            vec![id],
            store,
            &mut blocks,
            &mut missing,
            &mut block_contents,
        );

        if !missing.is_empty() {
            return Err(ObjectParseError::MissingBlocks(missing));
        }

        let root = block_contents.get_mut(blocks.last().unwrap()).unwrap();
        if key.is_some() {
            root.set_key(key);
        }

        let header = match root.header_ref() {
            Some(header_ref) => match header_ref.obj {
                CommitHeaderObject::None | CommitHeaderObject::RandomAccess => {
                    panic!("shouldn't happen")
                }
                CommitHeaderObject::Id(id) => {
                    let obj = Object::load(id, Some(header_ref.key.clone()), store)?;
                    match obj.content()? {
                        ObjectContent::V0(ObjectContentV0::CommitHeader(mut commit_header)) => {
                            commit_header.set_id(id);
                            (Some(commit_header), Some(obj.blocks().cloned().collect()))
                        }
                        _ => return Err(ObjectParseError::InvalidHeader),
                    }
                }
                CommitHeaderObject::EncryptedContent(content) => {
                    match serde_bare::from_slice(content.as_slice()) {
                        Ok(ObjectContent::V0(ObjectContentV0::CommitHeader(commit_header))) => {
                            (Some(commit_header), None)
                        }
                        Err(_e) => return Err(ObjectParseError::InvalidHeader),
                        _ => return Err(ObjectParseError::InvalidHeader),
                    }
                }
            },
            None => (None, None),
        };

        Ok(Object {
            blocks,
            block_contents,
            header: header.0,
            header_blocks: header.1.unwrap_or(vec![]),
            #[cfg(test)]
            already_saved: true,
        })
    }

    /// Save blocks of the object and the blocks of the header object in the store
    pub fn save(&self, store: &Box<impl RepoStore + ?Sized>) -> Result<(), StorageError> {
        let mut deduplicated: HashSet<ObjectId> = HashSet::new();
        //.chain(self.header_blocks.iter())
        for block_id in self.blocks.iter() {
            store.put(self.block_contents.get(block_id).unwrap())?;
        }
        for block in &self.header_blocks {
            let id = block.id();
            if deduplicated.get(&id).is_none() {
                deduplicated.insert(id);
                store.put(block)?;
            }
        }
        Ok(())
    }

    #[cfg(test)]
    pub fn save_in_test(
        &mut self,
        store: &Box<impl RepoStore + ?Sized>,
    ) -> Result<(), StorageError> {
        assert!(self.already_saved == false);
        self.already_saved = true;

        self.save(store)
    }

    /// Get the ID of the Object
    pub fn id(&self) -> ObjectId {
        self.root_block().id()
    }

    /// Get the ID of the Object and saves it
    pub fn get_and_save_id(&mut self) -> ObjectId {
        self.block_contents
            .get_mut(self.blocks.last().unwrap())
            .unwrap()
            .get_and_save_id()
    }

    /// Get the key for the Object
    pub fn key(&self) -> Option<SymKey> {
        self.root_block().key()
    }

    /// Get an `ObjectRef` for the root object
    pub fn reference(&self) -> Option<ObjectRef> {
        if self.key().is_some() {
            Some(ObjectRef {
                id: self.id(),
                key: self.key().unwrap(),
            })
        } else {
            None
        }
    }

    pub fn is_root(&self) -> bool {
        self.header.as_ref().map_or(true, |h| h.is_root())
    }

    /// Get deps (that have an ID in the header, without checking if there is a key for them in the header_keys)
    /// if there is no header, returns an empty vec
    pub fn deps(&self) -> Vec<ObjectId> {
        match &self.header {
            Some(h) => h.deps(),
            None => vec![],
        }
    }

    /// Get acks and nacks (that have an ID in the header, without checking if there is a key for them in the header_keys)
    /// if there is no header, returns an empty vec
    pub fn acks_and_nacks(&self) -> Vec<ObjectId> {
        match &self.header {
            Some(h) => h.acks_and_nacks(),
            None => vec![],
        }
    }

    /// Get acks (that have an ID in the header, without checking if there is a key for them in the header_keys)
    /// if there is no header, returns an empty vec
    pub fn acks(&self) -> Vec<ObjectId> {
        match &self.header {
            Some(h) => h.acks(),
            None => vec![],
        }
    }

    pub fn root_block(&self) -> &Block {
        self.block_contents
            .get(self.blocks.last().unwrap())
            .unwrap()
    }

    pub fn header(&self) -> &Option<CommitHeader> {
        &self.header
    }

    pub fn blocks(&self) -> impl Iterator<Item = &Block> + '_ {
        self.blocks
            .iter()
            .map(|key| self.block_contents.get(key).unwrap())
    }

    pub fn size(&self) -> usize {
        let mut total = 0;
        self.blocks().for_each(|b| total += b.size());
        self.header_blocks.iter().for_each(|b| total += b.size());
        total
    }

    pub fn dedup_size(&self) -> usize {
        let mut total = 0;
        self.block_contents.values().for_each(|b| total += b.size());
        self.header_blocks.iter().for_each(|b| total += b.size());
        total
    }

    pub fn hashmap(&self) -> &HashMap<BlockId, Block> {
        &self.block_contents
    }

    /// Collect leaves from the tree
    fn collect_leaves(
        blocks: &Vec<BlockId>,
        parents: &Vec<(ObjectId, SymKey)>,
        parent_index: usize,
        leaves: &mut Option<&mut Vec<Block>>,
        obj_content: &mut Option<&mut Vec<u8>>,
        block_contents: &HashMap<BlockId, Block>,
    ) -> Result<u8, ObjectParseError> {
        // log_debug!(
        //     ">>> collect_leaves: #{}..{}",
        //     parent_index,
        //     parent_index + parents.len() - 1
        // );
        let mut children: Vec<(ObjectId, SymKey)> = vec![];
        let mut i = parent_index;

        for (id, key) in parents {
            //log_debug!("!!! parent: #{}", i);
            let block = block_contents.get(&blocks[i]).unwrap();
            i += 1;

            // verify object ID
            let block_id = block.id();
            if *id != block_id {
                log_debug!("Invalid ObjectId.\nExp: {:?}\nGot: {:?}", *id, block_id);
                return Err(ObjectParseError::InvalidBlockId);
            }

            match block {
                Block::V0(b) => {
                    let b_children = b.children();
                    if leaves.is_none() && obj_content.is_none() {
                        // we just want to calculate the depth. no need to decrypt
                        for id in b_children {
                            #[allow(deprecated)]
                            children.push((id.clone(), ObjectKey::nil()));
                        }
                        continue;
                    }
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

                            for (id, key) in b_children.iter().zip(keys.iter()) {
                                children.push((id.clone(), key.clone()));
                            }
                        }
                        ChunkContentV0::DataChunk(chunk) => {
                            if leaves.is_some() {
                                //FIXME this part is never used (when leaves.is_some ?)
                                //FIXME if it was used, we should probably try to remove the block.clone()
                                let mut leaf = block.clone();
                                leaf.set_key(Some(key.clone()));
                                let l = &mut **leaves.as_mut().unwrap();
                                l.push(leaf);
                            }
                            if obj_content.is_some() {
                                let c = &mut **obj_content.as_mut().unwrap();
                                c.extend_from_slice(chunk.as_slice());
                            }
                        }
                    }
                }
            }
        }
        Ok(if !children.is_empty() {
            if parent_index < children.len() {
                return Err(ObjectParseError::InvalidChildren);
            }
            Self::collect_leaves(
                blocks,
                &children,
                parent_index - children.len(),
                leaves,
                obj_content,
                block_contents,
            )? + 1
        } else {
            0
        })
    }

    // /// Parse the Object and return the leaf Blocks with decryption key set
    // pub fn leaves(&self) -> Result<Vec<Block>, ObjectParseError> {
    //     let mut leaves: Vec<Block> = vec![];
    //     let parents = vec![(self.id(), self.key().unwrap())];
    //     match Self::collect_leaves(
    //         &self.blocks,
    //         &parents,
    //         self.blocks.len() - 1,
    //         &mut Some(&mut leaves),
    //         &mut None,
    //     ) {
    //         Ok(_) => Ok(leaves),
    //         Err(e) => Err(e),
    //     }
    // }

    /// Parse the Object and return the decrypted content assembled from Blocks
    pub fn content(&self) -> Result<ObjectContent, ObjectParseError> {
        // TODO: keep a local cache of content (with oncecell)
        if self.key().is_none() {
            return Err(ObjectParseError::MissingRootKey);
        }
        let mut obj_content: Vec<u8> = vec![];
        let parents = vec![(self.id(), self.key().unwrap())];
        match Self::collect_leaves(
            &self.blocks,
            &parents,
            self.blocks.len() - 1,
            &mut None,
            &mut Some(&mut obj_content),
            &self.block_contents,
        ) {
            Ok(_) => match serde_bare::from_slice(obj_content.as_slice()) {
                Ok(c) => Ok(c),
                Err(e) => {
                    log_debug!("Object deserialize error: {}", e);
                    Err(ObjectParseError::ObjectDeserializeError)
                }
            },
            Err(e) => Err(e),
        }
    }

    /// Parse the Object returns the depth of the tree
    pub fn depth(&self) -> Result<u8, ObjectParseError> {
        if self.key().is_none() {
            return Err(ObjectParseError::MissingRootKey);
        }
        let parents = vec![(self.id(), self.key().unwrap())];
        Self::collect_leaves(
            &self.blocks,
            &parents,
            self.blocks.len() - 1,
            &mut None,
            &mut None,
            &self.block_contents,
        )
    }

    pub fn content_v0(&self) -> Result<ObjectContentV0, ObjectParseError> {
        match self.content() {
            Ok(ObjectContent::V0(v0)) => Ok(v0),
            Err(e) => Err(e),
        }
    }
}

impl fmt::Display for Object {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "====== Object ID {}", self.id())?;
        writeln!(
            f,
            "== Key:    {}",
            self.key().map_or("None".to_string(), |k| format!("{}", k))
        )?;
        #[cfg(test)]
        writeln!(f, "== saved:  {}", self.already_saved)?;
        writeln!(
            f,
            "== Header: {}",
            self.header
                .as_ref()
                .map_or("None".to_string(), |k| format!("{}", k))
        )?;
        writeln!(f, "== Blocks: {}", self.blocks.len())?;
        let mut i = 0;
        for block_id in &self.blocks {
            writeln!(f, "========== {:03}: {}", i, block_id)?;
            i += 1;
        }
        writeln!(f, "== Depth: {:?}", self.depth().unwrap_or(0))?;

        writeln!(f, "== Header Blocks: {}", self.header_blocks.len())?;
        i = 0;
        for block in &self.header_blocks {
            writeln!(f, "========== {:03}: {}", i, block.id())?;
        }
        Ok(())
    }
}

impl ObjectContent {
    pub fn can_have_header(&self) -> bool {
        match self {
            Self::V0(v0) => match v0 {
                ObjectContentV0::Commit(_) => true,
                _ => false,
            },
        }
    }

    pub fn new_file_v0_with_content(content: Vec<u8>, content_type: &str) -> Self {
        ObjectContent::V0(ObjectContentV0::File(File::V0(FileV0 {
            content_type: content_type.into(),
            metadata: vec![],
            content,
        })))
    }
}

impl fmt::Display for ObjectContent {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let (version, content_type) = match self {
            Self::V0(v0) => (
                "v0",
                match v0 {
                    ObjectContentV0::Commit(_) => "Commit",
                    ObjectContentV0::CommitBody(_) => "CommitBody",
                    ObjectContentV0::CommitHeader(_) => "CommitHeader",
                    ObjectContentV0::Quorum(_) => "Quorum",
                    ObjectContentV0::Signature(_) => "Signature",
                    ObjectContentV0::Certificate(_) => "Certificate",
                    ObjectContentV0::File(_) => "File",
                    ObjectContentV0::RandomAccessFileMeta(_) => "RandomAccessFileMeta",
                },
            ),
        };
        writeln!(
            f,
            "====== ObjectContent {} {} ======",
            version, content_type
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod test {

    use crate::object::*;
    use std::io::BufReader;
    use std::io::Read;
    use std::io::Write;

    // Those constants are calculated with RepoStore::get_max_value_size
    /// Maximum arity of branch containing max number of leaves
    // const MAX_ARITY_LEAVES: usize = 15887;
    // /// Maximum arity of root branch
    // const MAX_ARITY_ROOT: usize = 15886;
    // /// Maximum data that can fit in object.content
    // const MAX_DATA_PAYLOAD_SIZE: usize = 1048564;

    #[test]
    pub fn test_pubkey_from_str() {
        let pubkey = PubKey::Ed25519PubKey([1u8; 32]);
        let str = pubkey.to_string();
        let server_key: PubKey = str.as_str().try_into().unwrap();
        assert_eq!(server_key, pubkey);
    }

    /// Test no header needed if not a commit
    #[test]
    #[should_panic]
    pub fn test_no_header() {
        let file = File::V0(FileV0 {
            content_type: "image/jpeg".into(),
            metadata: vec![],
            content: vec![],
        });
        let content = ObjectContent::V0(ObjectContentV0::File(file));
        let (store_repo, store_secret) = StoreRepo::dummy_public_v0();
        let header = CommitHeader::new_with_acks([ObjectId::dummy()].to_vec());
        let _obj = Object::new(
            content,
            header,
            store_max_value_size(),
            &store_repo,
            &store_secret,
        );
    }

    /// Test JPEG file
    #[test]
    pub fn test_jpg() {
        let f = std::fs::File::open("tests/test.jpg").expect("open of tests/test.jpg");
        let mut reader = BufReader::new(f);
        let mut img_buffer: Vec<u8> = Vec::new();
        reader
            .read_to_end(&mut img_buffer)
            .expect("read of test.jpg");
        let content = ObjectContent::new_file_v0_with_content(img_buffer, "image/jpeg");

        let max_object_size = store_max_value_size();
        let (store_repo, store_secret) = StoreRepo::dummy_public_v0();
        let obj = Object::new(content, None, max_object_size, &store_repo, &store_secret);

        log_debug!("{}", obj);

        let mut i = 0;
        for node in obj.blocks() {
            log_debug!("#{}: {}", i, node.id());
            let mut file = std::fs::File::create(format!("tests/{}.ng", node.id()))
                .expect("open block write file");
            let ser_file = serde_bare::to_vec(node).unwrap();
            file.write_all(&ser_file)
                .expect(&format!("write of block #{}", i));
            i += 1;
        }
    }

    /// Test tree API
    #[test]
    pub fn test_object() {
        let file = File::V0(FileV0 {
            content_type: "file/test".into(),
            metadata: Vec::from("some meta data here"),
            content: [(0..255).collect::<Vec<u8>>().as_slice(); 320].concat(),
        });
        let content = ObjectContent::V0(ObjectContentV0::File(file));

        let acks = vec![];
        //let header = CommitHeader::new_with_acks(acks.clone());
        let max_object_size = 0;

        let (store_repo, store_secret) = StoreRepo::dummy_public_v0();

        let mut obj = Object::new(
            content.clone(),
            None,
            max_object_size,
            &store_repo,
            &store_secret,
        );

        log_debug!("{}", obj);

        assert_eq!(*obj.acks(), acks);

        match obj.content() {
            Ok(cnt) => {
                log_debug!("{}", cnt);
                assert_eq!(content, cnt);
            }
            Err(e) => panic!("Object parse error: {:?}", e),
        }
        let store = Box::new(HashMapRepoStore::new());

        obj.save_in_test(&store).expect("Object save error");

        let obj2 = Object::load(obj.id(), obj.key(), &store).unwrap();

        log_debug!("{}", obj2);

        assert_eq!(*obj2.acks(), acks);

        match obj2.content() {
            Ok(cnt) => {
                log_debug!("{}", cnt);
                assert_eq!(content, cnt);
            }
            Err(e) => panic!("Object2 parse error: {:?}", e),
        }

        let obj3 = Object::load(obj.id(), None, &store).unwrap();

        log_debug!("{}", obj3);

        assert_eq!(*obj3.acks(), acks);

        match obj3.content() {
            Err(ObjectParseError::MissingRootKey) => (),
            Err(e) => panic!("Object3 parse error: {:?}", e),
            Ok(_) => panic!("Object3 should not return content"),
        }
    }

    /// Checks that a content that fits the root node, will not be chunked into children nodes
    #[test]
    pub fn test_depth_0() {
        let (store_repo, store_secret) = StoreRepo::dummy_public_v0();

        let empty_file = ObjectContent::V0(ObjectContentV0::File(File::V0(FileV0 {
            content_type: "".into(),
            metadata: vec![],
            content: vec![],
        })));
        let content_ser = serde_bare::to_vec(&empty_file).unwrap();
        log_debug!("content len for empty :     {}", content_ser.len());

        // let content = ObjectContent::V0(ObjectContentV0::File(File::V0(FileV0 {
        //     content_type: "".into(),
        //     metadata: vec![],
        //     content: vec![99; 1000],
        // })));
        // let content_ser = serde_bare::to_vec(&content).unwrap();
        // log_debug!("content len for 1000    :     {}", content_ser.len());

        // let content = ObjectContent::V0(ObjectContentV0::File(File::V0(FileV0 {
        //     content_type: "".into(),
        //     metadata: vec![],
        //     content: vec![99; 1048554],
        // })));
        // let content_ser = serde_bare::to_vec(&content).unwrap();
        // log_debug!("content len for 1048554 :     {}", content_ser.len());

        // let content = ObjectContent::V0(ObjectContentV0::File(File::V0(FileV0 {
        //     content_type: "".into(),
        //     metadata: vec![],
        //     content: vec![99; 1550000],
        // })));
        // let content_ser = serde_bare::to_vec(&content).unwrap();
        // log_debug!("content len for 1550000 :     {}", content_ser.len());

        // let content = ObjectContent::V0(ObjectContentV0::File(File::V0(FileV0 {
        //     content_type: "".into(),
        //     metadata: vec![],
        //     content: vec![99; 1550000000],
        // })));
        // let content_ser = serde_bare::to_vec(&content).unwrap();
        // log_debug!("content len for 1550000000 :     {}", content_ser.len());

        // let content = ObjectContent::V0(ObjectContentV0::File(File::V0(FileV0 {
        //     content_type: "".into(),
        //     metadata: vec![99; 1000],
        //     content: vec![99; 1000],
        // })));
        // let content_ser = serde_bare::to_vec(&content).unwrap();
        // log_debug!("content len for 1000+1000:     {}", content_ser.len());

        // let content = ObjectContent::V0(ObjectContentV0::File(File::V0(FileV0 {
        //     content_type: "".into(),
        //     metadata: vec![99; 1000],
        //     content: vec![99; 524277],
        // })));
        // let content_ser = serde_bare::to_vec(&content).unwrap();
        // log_debug!("content len for 1000+524277:     {}", content_ser.len());

        // let content = ObjectContent::V0(ObjectContentV0::File(File::V0(FileV0 {
        //     content_type: "".into(),
        //     metadata: vec![99; 524277],
        //     content: vec![99; 524277],
        // })));
        // let content_ser = serde_bare::to_vec(&content).unwrap();
        // log_debug!("content len for 2*524277:     {}", content_ser.len());

        let empty_obj = Object::new(
            empty_file,
            None,
            store_max_value_size(),
            &store_repo,
            &store_secret,
        );

        let empty_file_size = empty_obj.size();
        log_debug!("empty file size: {}", empty_file_size);

        let size =
            store_max_value_size() - empty_file_size - BLOCK_MAX_DATA_EXTRA - BIG_VARINT_EXTRA;
        log_debug!("full file content size: {}", size);

        let content = ObjectContent::V0(ObjectContentV0::File(File::V0(FileV0 {
            content_type: "".into(),
            metadata: vec![],
            content: vec![99; size],
        })));
        let content_ser = serde_bare::to_vec(&content).unwrap();
        log_debug!("content len:     {}", content_ser.len());

        let object = Object::new(
            content,
            None,
            store_max_value_size(),
            &store_repo,
            &store_secret,
        );
        log_debug!("{}", object);

        log_debug!("object size:     {}", object.size());

        assert_eq!(object.blocks.len(), 1);
    }

    /// Checks that a content that doesn't fit in all the children of first level in tree
    #[test]
    pub fn test_depth_1() {
        const MAX_ARITY_LEAVES: usize = 15887;
        // /// Maximum arity of root branch
        // const MAX_ARITY_ROOT: usize = 15886;
        // /// Maximum data that can fit in object.content
        const MAX_DATA_PAYLOAD_SIZE: usize = 1048564;

        ////// 16 GB of data!
        let data_size = MAX_ARITY_LEAVES * MAX_DATA_PAYLOAD_SIZE - 10;

        let (store_repo, store_secret) = StoreRepo::dummy_public_v0();
        log_debug!("creating 16GB of data");
        let content = ObjectContent::V0(ObjectContentV0::File(File::V0(FileV0 {
            content_type: "".into(),
            metadata: vec![],
            content: vec![99; data_size],
        })));
        //let content_ser = serde_bare::to_vec(&content).unwrap();
        //log_debug!("content len:     {}", content_ser.len());
        log_debug!("creating object with that data");
        let object = Object::new(
            content,
            None,
            store_max_value_size(),
            &store_repo,
            &store_secret,
        );
        log_debug!("{}", object);

        let obj_size = object.size();
        log_debug!("object size: {}", obj_size);

        log_debug!("data size: {}", data_size);
        log_debug!(
            "overhead: {} - {}%",
            obj_size - data_size,
            ((obj_size - data_size) * 100) as f32 / data_size as f32
        );

        log_debug!("number of blocks : {}", object.blocks.len());
        assert_eq!(object.blocks.len(), MAX_ARITY_LEAVES + 1);
        assert_eq!(object.depth().unwrap(), 1);
    }

    /// Checks that a content that doesn't fit in all the children of first level in tree
    #[test]
    pub fn test_depth_2() {
        const MAX_ARITY_LEAVES: usize = 15887;
        const MAX_DATA_PAYLOAD_SIZE: usize = 1048564;

        ////// 16 GB of data!
        let data_size = MAX_ARITY_LEAVES * MAX_DATA_PAYLOAD_SIZE;

        let (store_repo, store_secret) = StoreRepo::dummy_public_v0();
        log_debug!("creating 16GB of data");
        let content = ObjectContent::V0(ObjectContentV0::File(File::V0(FileV0 {
            content_type: "".into(),
            metadata: vec![],
            content: vec![99; data_size],
        })));
        //let content_ser = serde_bare::to_vec(&content).unwrap();
        //log_debug!("content len:     {}", content_ser.len());
        log_debug!("creating object with that data");
        let object = Object::new(
            content,
            None,
            store_max_value_size(),
            &store_repo,
            &store_secret,
        );
        log_debug!("{}", object);

        let obj_size = object.size();
        log_debug!("object size: {}", obj_size);

        log_debug!("data size: {}", data_size);
        log_debug!(
            "overhead: {} - {}%",
            obj_size - data_size,
            ((obj_size - data_size) * 100) as f32 / data_size as f32
        );

        log_debug!("number of blocks : {}", object.blocks.len());
        assert_eq!(object.blocks.len(), MAX_ARITY_LEAVES + 4);
        assert_eq!(object.depth().unwrap(), 2);
    }

    /// Checks that a content that doesn't fit in all the children of first level in tree
    #[test]
    pub fn test_depth_3() {
        const MAX_ARITY_LEAVES: usize = 61;
        const MAX_DATA_PAYLOAD_SIZE: usize = 4084;

        ////// 900 MB of data!
        let data_size =
            MAX_ARITY_LEAVES * MAX_ARITY_LEAVES * MAX_ARITY_LEAVES * MAX_DATA_PAYLOAD_SIZE - 10;

        let (store_repo, store_secret) = StoreRepo::dummy_public_v0();
        log_debug!("creating 900MB of data");
        let content = ObjectContent::V0(ObjectContentV0::File(File::V0(FileV0 {
            content_type: "".into(),
            metadata: vec![],
            content: vec![99; data_size],
        })));
        //let content_ser = serde_bare::to_vec(&content).unwrap();
        //log_debug!("content len:     {}", content_ser.len());
        log_debug!("creating object with that data");
        let object = Object::new(
            content,
            None,
            store_valid_value_size(0),
            &store_repo,
            &store_secret,
        );
        log_debug!("{}", object);

        let obj_size = object.size();
        log_debug!("object size: {}", obj_size);

        log_debug!("data size: {}", data_size);
        log_debug!(
            "overhead: {} - {}%",
            obj_size - data_size,
            ((obj_size - data_size) * 100) as f32 / data_size as f32
        );

        let dedup_size = object.dedup_size();
        log_debug!(
            "dedup compression: {} - {}%",
            data_size - dedup_size,
            ((data_size - dedup_size) * 100) as f32 / data_size as f32
        );

        log_debug!("number of blocks : {}", object.blocks.len());
        assert_eq!(
            object.blocks.len(),
            MAX_ARITY_LEAVES * (MAX_ARITY_LEAVES + 1) * MAX_ARITY_LEAVES + MAX_ARITY_LEAVES + 1
        );
        assert_eq!(object.depth().unwrap(), 3);
    }

    /// Checks that a content that doesn't fit in all the children of first level in tree
    #[test]
    pub fn test_depth_4() {
        const MAX_ARITY_LEAVES: usize = 61;
        const MAX_DATA_PAYLOAD_SIZE: usize = 4084;

        ////// 52GB of data!
        let data_size = MAX_ARITY_LEAVES
            * MAX_ARITY_LEAVES
            * MAX_ARITY_LEAVES
            * MAX_ARITY_LEAVES
            * MAX_DATA_PAYLOAD_SIZE
            - 12;

        let (store_repo, store_secret) = StoreRepo::dummy_public_v0();
        log_debug!("creating 52GB of data");
        let content = ObjectContent::V0(ObjectContentV0::File(File::V0(FileV0 {
            content_type: "".into(),
            metadata: vec![],
            content: vec![99; data_size],
        })));
        //let content_ser = serde_bare::to_vec(&content).unwrap();
        //log_debug!("content len:     {}", content_ser.len());
        log_debug!("creating object with that data");
        let object = Object::new(
            content,
            None,
            store_valid_value_size(0),
            &store_repo,
            &store_secret,
        );
        log_debug!("{}", object);

        let obj_size = object.size();
        log_debug!("object size: {}", obj_size);

        log_debug!("data size: {}", data_size);
        log_debug!(
            "overhead: {} - {}%",
            obj_size - data_size,
            ((obj_size - data_size) * 100) as f32 / data_size as f32
        );

        log_debug!("number of blocks : {}", object.blocks.len());
        assert_eq!(
            object.blocks.len(),
            MAX_ARITY_LEAVES
                * (MAX_ARITY_LEAVES * (MAX_ARITY_LEAVES + 1) * MAX_ARITY_LEAVES
                    + MAX_ARITY_LEAVES
                    + 1)
                + 1
        );
        assert_eq!(object.depth().unwrap(), 4);
    }

    #[test]
    pub fn test_block_size() {
        //let max_block_size = store_max_value_size();

        fn test_block(max_block_size: usize) {
            let max_arity_leaves: usize = (max_block_size - BLOCK_EXTRA) / CHILD_SIZE;
            let max_arity_root: usize =
                (max_block_size - BLOCK_EXTRA - HEADER_REF_EXTRA) / CHILD_SIZE;

            let max_data_payload_size = max_block_size - BLOCK_EXTRA;

            log_debug!("max_block_size: {}", max_block_size);
            log_debug!("max_arity_leaves: {}", max_arity_leaves);
            log_debug!("max_arity_root: {}", max_arity_root);
            log_debug!("max_data_payload_size: {}", max_data_payload_size);

            let (id, key) = ObjectRef::dummy().into();

            // this should never happen
            let zero_key = ChunkContentV0::InternalNode(vec![]);
            let zero_key_ser = serde_bare::to_vec(&zero_key).unwrap();

            let one_key = ChunkContentV0::InternalNode(vec![key.clone()]);
            let one_key_ser = serde_bare::to_vec(&one_key).unwrap();

            let two_keys = ChunkContentV0::InternalNode(vec![key.clone(), key.clone()]);
            let two_keys_ser = serde_bare::to_vec(&two_keys).unwrap();

            let max_keys = ChunkContentV0::InternalNode(vec![key.clone(); max_arity_leaves]);
            let max_keys_ser = serde_bare::to_vec(&max_keys).unwrap();

            let max_keys_root = ChunkContentV0::InternalNode(vec![key.clone(); max_arity_root]);
            let max_keys_root_ser = serde_bare::to_vec(&max_keys_root).unwrap();

            // this should never happen
            let data_empty = ChunkContentV0::DataChunk(vec![]);
            let data_empty_ser = serde_bare::to_vec(&data_empty).unwrap();

            let data_full = ChunkContentV0::DataChunk(vec![0; max_data_payload_size]);
            let data_full_ser = serde_bare::to_vec(&data_full).unwrap();

            // this should never happen: an empty block with no children and no data and no header
            let leaf_empty = Block::new(vec![], None, data_empty_ser.clone(), None);
            let leaf_empty_ser = serde_bare::to_vec(&leaf_empty).unwrap();

            log_debug!(
                "block size of empty leaf without header: {}",
                leaf_empty_ser.len()
            );

            let leaf_full_data = Block::new(vec![], None, data_full_ser.clone(), None);
            let leaf_full_data_ser = serde_bare::to_vec(&leaf_full_data).unwrap();

            log_debug!(
                "block size of full leaf block without header: {}",
                leaf_full_data_ser.len()
            );

            // this should never happen: an empty block with no children and no keys
            let internal_zero = Block::new(vec![], None, zero_key_ser.clone(), None);
            let internal_zero_ser = serde_bare::to_vec(&internal_zero).unwrap();

            log_debug!(
                "block size of empty internal block without header: {}",
                internal_zero_ser.len()
            );

            assert!(leaf_full_data_ser.len() <= max_block_size);

            // let root_zero = Block::new(
            //     vec![],
            //     None,
            //     zero_key_ser.clone(),
            //     None,
            // );
            // let root_zero_ser = serde_bare::to_vec(&root_zero).unwrap();

            let header_ref = CommitHeaderRef::from_id_key(id, key.clone());

            // this should never happen. an embedded header never has an empty content
            let header_embed = CommitHeaderRef::from_content_key(vec![], key.clone());

            // this should never happen: an empty block with no children and no data and header ref
            let root_zero_header_ref = Block::new(
                vec![],
                Some(header_ref.clone()),
                data_empty_ser.clone(),
                None,
            );
            let root_zero_header_ref_ser = serde_bare::to_vec(&root_zero_header_ref).unwrap();

            // this should never happen: an empty block with no children and no data and header embed
            let root_zero_header_embed = Block::new(
                vec![],
                Some(header_embed.clone()),
                data_empty_ser.clone(),
                None,
            );
            let root_zero_header_embed_ser = serde_bare::to_vec(&root_zero_header_embed).unwrap();

            // log_debug!(
            //     "block size of empty root block without header: {}",
            //     root_zero_ser.len()
            // );

            log_debug!(
                "block size of empty root block with header ref: {}",
                root_zero_header_ref_ser.len()
            );

            log_debug!(
                "block size of empty root block with header embedded: {}",
                root_zero_header_embed_ser.len()
            );

            let internal_max =
                Block::new(vec![id; max_arity_leaves], None, max_keys_ser.clone(), None);
            let internal_max_ser = serde_bare::to_vec(&internal_max).unwrap();

            let internal_one = Block::new(vec![id; 1], None, one_key_ser.clone(), None);
            let internal_one_ser = serde_bare::to_vec(&internal_one).unwrap();

            let internal_two = Block::new(vec![id; 2], None, two_keys_ser.clone(), None);
            let internal_two_ser = serde_bare::to_vec(&internal_two).unwrap();

            log_debug!(
                "block size of internal block with 1 child, without header: {}",
                internal_one_ser.len()
            );

            log_debug!(
                "block size of internal block with 2 children, without header: {}",
                internal_two_ser.len()
            );

            log_debug!(
                "block size of internal block with max arity children, without header: {}",
                internal_max_ser.len()
            );

            assert!(internal_max_ser.len() <= max_block_size);

            let root_one = Block::new(
                vec![id; 1],
                Some(header_ref.clone()),
                one_key_ser.clone(),
                None,
            );
            let root_one_ser = serde_bare::to_vec(&root_one).unwrap();

            let root_two = Block::new(
                vec![id; 2],
                Some(header_ref.clone()),
                two_keys_ser.clone(),
                None,
            );
            let root_two_ser = serde_bare::to_vec(&root_two).unwrap();

            let root_max = Block::new(
                vec![id; max_arity_root],
                Some(header_ref.clone()),
                max_keys_root_ser.clone(),
                None,
            );
            let root_max_ser = serde_bare::to_vec(&root_max).unwrap();

            let data_full_when_header_ref =
                ChunkContentV0::DataChunk(vec![0; max_data_payload_size - HEADER_REF_EXTRA]);
            let data_full_when_header_ref_ser =
                serde_bare::to_vec(&data_full_when_header_ref).unwrap();

            let root_full = Block::new(
                vec![],
                Some(header_ref.clone()),
                data_full_when_header_ref_ser.clone(),
                None,
            );
            let root_full_ser = serde_bare::to_vec(&root_full).unwrap();

            log_debug!(
                "block size of root block with header ref with 1 child: {}",
                root_one_ser.len()
            );

            log_debug!(
                "block size of root block with header ref with 2 children: {}",
                root_two_ser.len()
            );

            log_debug!(
                "block size of root block with header ref with max arity children: {}",
                root_max_ser.len()
            );

            log_debug!(
                "block size of root block with header ref with full DataChunk (fitting ObjectContent): {}",
                root_full_ser.len()
            );

            assert!(root_full_ser.len() <= max_block_size);

            let root_embed_one = Block::new(
                vec![id; 1],
                Some(header_embed.clone()),
                one_key_ser.clone(),
                None,
            );
            let root_embed_one_ser = serde_bare::to_vec(&root_embed_one).unwrap();

            let root_embed_two = Block::new(
                vec![id; 2],
                Some(header_embed.clone()),
                two_keys_ser.clone(),
                None,
            );
            let root_embed_two_ser = serde_bare::to_vec(&root_embed_two).unwrap();

            let root_embed_max = Block::new(
                vec![id; max_arity_root],
                Some(header_embed.clone()),
                max_keys_root_ser.clone(),
                None,
            );
            let root_embed_max_ser = serde_bare::to_vec(&root_embed_max).unwrap();

            let data_full_when_header_embed =
                ChunkContentV0::DataChunk(vec![0; max_data_payload_size - HEADER_EMBED_EXTRA]);
            let data_full_when_header_embed_ser =
                serde_bare::to_vec(&data_full_when_header_embed).unwrap();

            let root_embed_full = Block::new(
                vec![],
                Some(header_embed.clone()),
                data_full_when_header_embed_ser.clone(),
                None,
            );
            let root_embed_full_ser = serde_bare::to_vec(&root_embed_full).unwrap();

            log_debug!(
                "block size of root block with header embed with 1 child: {}",
                root_embed_one_ser.len()
            );

            log_debug!(
                "block size of root block with header embed with 2 children: {}",
                root_embed_two_ser.len()
            );

            log_debug!(
                "block size of root block with header embed with max arity children: {}",
                root_embed_max_ser.len()
            );

            log_debug!(
                "block size of root block with header embed with full DataChunk (fitting ObjectContent): {}",
                root_embed_full_ser.len()
            );

            assert!(root_embed_full_ser.len() <= max_block_size);

            let header_acks_1 = CommitHeader::new_with_acks(vec![id]);
            let header_acks_2 = CommitHeader::new_with_acks(vec![id, id]);
            let header_acks_60 = CommitHeader::new_with_acks(vec![id; 60]);
            let header_acks_60_deps_60 =
                CommitHeader::new_with_deps_and_acks(vec![id; 60], vec![id; 60]);

            fn make_header_block(header: Option<CommitHeader>) -> CommitHeaderRef {
                let content_ser = serde_bare::to_vec(&ObjectContent::V0(
                    ObjectContentV0::CommitHeader(header.unwrap()),
                ))
                .unwrap();
                let data_chunk = ChunkContentV0::DataChunk(content_ser.clone());
                let encrypted_content = serde_bare::to_vec(&data_chunk).unwrap();
                CommitHeaderRef::from_content_key(encrypted_content, SymKey::dummy())
            }

            let header_embed_acks_1 = make_header_block(header_acks_1);
            let header_embed_acks_2 = make_header_block(header_acks_2);
            let header_embed_acks_60 = make_header_block(header_acks_60);
            let header_embed_acks_60_deps_60 = make_header_block(header_acks_60_deps_60);

            fn test_header_embed(name: &str, header: CommitHeaderRef, max_block_size: usize) {
                let (id, key) = BlockRef::dummy().into();

                log_debug!("header content size : {}", header.encrypted_content_len());

                let max_arity = (max_block_size
                    - header.encrypted_content_len()
                    - BLOCK_EXTRA
                    - HEADER_EMBED_EXTRA)
                    / CHILD_SIZE;

                log_debug!("max arity for header {} : {}", name, max_arity);

                let max_keys_when_real_header =
                    ChunkContentV0::InternalNode(vec![key.clone(); max_arity]);
                let max_keys_when_real_header_ser =
                    serde_bare::to_vec(&max_keys_when_real_header).unwrap();

                let root_embed_max = Block::new(
                    vec![id; max_arity],
                    Some(header),
                    max_keys_when_real_header_ser.clone(),
                    None,
                );
                let root_embed_max_ser = serde_bare::to_vec(&root_embed_max).unwrap();

                log_debug!(
                    "block size of root block with header {} with max possible arity children : {}",
                    name,
                    root_embed_max_ser.len()
                );

                assert!(root_embed_max_ser.len() <= max_block_size);
            }

            test_header_embed(
                "embed acks 60 deps 60",
                header_embed_acks_60_deps_60,
                max_block_size,
            );

            test_header_embed("embed acks 60", header_embed_acks_60, max_block_size);

            test_header_embed("embed acks 2", header_embed_acks_2, max_block_size);

            test_header_embed("embed acks 1", header_embed_acks_1, max_block_size);
        }

        let max_block_size = store_max_value_size();
        let min_block_size = store_valid_value_size(0);

        test_block(max_block_size);
        test_block(min_block_size);
        test_block(store_valid_value_size(10000));
        test_block(store_valid_value_size(100000));
        test_block(store_valid_value_size(1000000));
        test_block(store_valid_value_size(5000));
    }
}
