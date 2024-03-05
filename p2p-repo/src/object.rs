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

use std::collections::{HashMap, HashSet};

use chacha20::cipher::{KeyIvInit, StreamCipher};
use chacha20::ChaCha20;

use crate::log::*;
use crate::store::*;
use crate::types::*;

// TODO: review all those constants. they were done for LMDB but we now use RocksDB.
// Also, the format of Blocks have changed so all should be checked.

/// Size of a serialized empty Block
const EMPTY_BLOCK_SIZE: usize = 12 + 1;
/// Size of a serialized BlockId
const BLOCK_ID_SIZE: usize = 33;
/// Size of serialized SymKey
const BLOCK_KEY_SIZE: usize = 33;
/// Size of serialized Object with deps reference.
const EMPTY_ROOT_SIZE_DEPSREF: usize = 77;
/// Extra size needed if depsRef used instead of deps list.
const DEPSREF_OVERLOAD: usize = EMPTY_ROOT_SIZE_DEPSREF - EMPTY_BLOCK_SIZE;
/// Varint extra bytes when reaching the maximum value we will ever use
const BIG_VARINT_EXTRA: usize = 3;
/// Varint extra bytes when reaching the maximum size of data byte arrays.
const DATA_VARINT_EXTRA: usize = 4;
// Max extra space used by the deps list
//const MAX_DEPS_SIZE: usize = 8 * BLOCK_ID_SIZE;
const MAX_HEADER_SIZE: usize = BLOCK_ID_SIZE;

#[derive(Debug)]
/// An Object in memory. This is not used to serialize data
pub struct Object {
    /// Blocks of the Object (nodes of the tree)
    blocks: Vec<Block>,

    /// Header
    header: Option<CommitHeader>,
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
    fn convergence_key(repo_pubkey: PubKey, repo_secret: SymKey) -> [u8; blake3::OUT_LEN] {
        let key_material = match (repo_pubkey, repo_secret) {
            (PubKey::Ed25519PubKey(pubkey), SymKey::ChaCha20Key(secret)) => {
                [pubkey, secret].concat()
            }
            (_, _) => panic!("cannot sign with Montgomery key"),
        };
        blake3::derive_key("NextGraph Data BLAKE3 key", key_material.as_slice())
    }

    fn make_block(
        content: &[u8],
        conv_key: &[u8; blake3::OUT_LEN],
        children: Vec<ObjectId>,
        header_ref: Option<ObjectRef>,
    ) -> Block {
        let key_hash = blake3::keyed_hash(conv_key, content);
        let nonce = [0u8; 12];
        let key = key_hash.as_bytes();
        let mut cipher = ChaCha20::new(key.into(), &nonce.into());
        let mut content_enc = Vec::from(content);
        let mut content_enc_slice = &mut content_enc.as_mut_slice();
        cipher.apply_keystream(&mut content_enc_slice);
        let key = SymKey::ChaCha20Key(key.clone());
        let block = Block::new(children, header_ref, content_enc, Some(key));
        //log_debug!(">>> make_block:");
        //log_debug!("!! id: {:?}", obj.id());
        //log_debug!("!! children: ({}) {:?}", children.len(), children);
        block
    }

    fn make_header_v0(
        header: CommitHeaderV0,
        object_size: usize,
        repo_pubkey: PubKey,
        repo_secret: SymKey,
    ) -> ObjectRef {
        let header_obj = Object::new(
            ObjectContentV0::CommitHeader(header),
            None,
            object_size,
            repo_pubkey,
            repo_secret,
        );
        let header_ref = ObjectRef {
            id: header_obj.id(),
            key: header_obj.key().unwrap(),
        };
        header_ref
    }

    /// Build tree from leaves, returns parent nodes
    fn make_tree(
        leaves: &[Block],
        conv_key: &ChaCha20Key,
        header_ref: &Option<ObjectRef>,
        arity: usize,
    ) -> Vec<Block> {
        let mut parents = vec![];
        let chunks = leaves.chunks(arity);
        let mut it = chunks.peekable();
        while let Some(nodes) = it.next() {
            let keys = nodes.iter().map(|block| block.key().unwrap()).collect();
            let children = nodes.iter().map(|block| block.id()).collect();
            let content = ChunkContentV0::InternalNode(keys);
            let content_ser = serde_bare::to_vec(&content).unwrap();
            let child_header = None;
            let header = if parents.is_empty() && it.peek().is_none() {
                header_ref
            } else {
                &child_header
            };
            parents.push(Self::make_block(
                content_ser.as_slice(),
                conv_key,
                children,
                header.clone(),
            ));
        }
        //log_debug!("parents += {}", parents.len());

        if 1 < parents.len() {
            let mut great_parents =
                Self::make_tree(parents.as_slice(), conv_key, header_ref, arity);
            parents.append(&mut great_parents);
        }
        parents
    }

    /// Create new Object from given content
    ///
    /// The Object is chunked and stored in a Merkle tree
    /// The arity of the Merkle tree is the maximum that fits in the given `max_object_size`
    ///
    /// Arguments:
    /// * `content`: Object content
    /// * `header`: CommitHeaderV0 : All references of the object
    /// * `block_size`: Desired block size for chunking content, rounded up to nearest valid block size
    /// * `repo_pubkey`: Repository public key
    /// * `repo_secret`: Repository secret
    pub fn new(
        content: ObjectContentV0,
        header: Option<CommitHeaderV0>,
        block_size: usize,
        repo_pubkey: PubKey,
        repo_secret: SymKey,
    ) -> Object {
        // create blocks by chunking + encrypting content
        let valid_block_size = store_valid_value_size(block_size);
        log_debug!("valid_block_size {}", valid_block_size);
        let data_chunk_size = valid_block_size - EMPTY_BLOCK_SIZE - DATA_VARINT_EXTRA;

        let mut blocks: Vec<Block> = vec![];
        let conv_key = Self::convergence_key(repo_pubkey, repo_secret.clone());

        let header_ref = header
            .clone()
            .map(|ch| Self::make_header_v0(ch, valid_block_size, repo_pubkey, repo_secret.clone()));

        let content_ser = serde_bare::to_vec(&content).unwrap();

        if EMPTY_BLOCK_SIZE
            + DATA_VARINT_EXTRA
            + BLOCK_ID_SIZE * header_ref.as_ref().map_or(0, |_| 1)
            + content_ser.len()
            <= valid_block_size
        {
            // content fits in root node
            let data_chunk = ChunkContentV0::DataChunk(content_ser.clone());
            let content_ser = serde_bare::to_vec(&data_chunk).unwrap();
            blocks.push(Self::make_block(
                content_ser.as_slice(),
                &conv_key,
                vec![],
                header_ref,
            ));
        } else {
            // chunk content and create leaf nodes
            for chunk in content_ser.chunks(data_chunk_size) {
                let data_chunk = ChunkContentV0::DataChunk(chunk.to_vec());
                let content_ser = serde_bare::to_vec(&data_chunk).unwrap();
                blocks.push(Self::make_block(
                    content_ser.as_slice(),
                    &conv_key,
                    vec![],
                    None,
                ));
            }

            // internal nodes
            // arity: max number of ObjectRefs that fit inside an InternalNode Object within the object_size limit
            let arity: usize =
                (valid_block_size - EMPTY_BLOCK_SIZE - BIG_VARINT_EXTRA * 2 - MAX_HEADER_SIZE)
                    / (BLOCK_ID_SIZE + BLOCK_KEY_SIZE);
            let mut parents = Self::make_tree(blocks.as_slice(), &conv_key, &header_ref, arity);
            blocks.append(&mut parents);
        }

        Object {
            blocks,
            header: header.map(|h| CommitHeader::V0(h)),
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
            blocks: &mut Vec<Block>,
            missing: &mut Vec<BlockId>,
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
                        blocks.insert(0, block);
                    }
                    Err(_) => missing.push(id.clone()),
                }
            }
            if !children.is_empty() {
                load_tree(children, store, blocks, missing);
            }
        }

        let mut blocks: Vec<Block> = vec![];
        let mut missing: Vec<BlockId> = vec![];

        load_tree(vec![id], store, &mut blocks, &mut missing);

        if !missing.is_empty() {
            return Err(ObjectParseError::MissingBlocks(missing));
        }

        let root = blocks.last_mut().unwrap();
        if key.is_some() {
            root.set_key(key);
        }

        let header = match root.header_ref() {
            Some(header_ref) => {
                let obj = Object::load(header_ref.id, Some(header_ref.key), store)?;
                match obj.content()? {
                    ObjectContent::V0(ObjectContentV0::CommitHeader(commit_header)) => {
                        Some(CommitHeader::V0(commit_header))
                    }
                    _ => return Err(ObjectParseError::InvalidHeader),
                }
            }
            None => None,
        };

        Ok(Object { blocks, header })
    }

    /// Save blocks of the object in the store
    pub fn save(&self, store: &Box<impl RepoStore + ?Sized>) -> Result<(), StorageError> {
        let mut deduplicated: HashSet<ObjectId> = HashSet::new();
        for block in &self.blocks {
            let id = block.id();
            if deduplicated.get(&id).is_none() {
                store.put(block)?;
                deduplicated.insert(id);
            }
        }
        Ok(())
    }

    /// Get the ID of the Object
    pub fn id(&self) -> ObjectId {
        self.blocks.last().unwrap().id()
    }

    /// Get the key for the Object
    pub fn key(&self) -> Option<SymKey> {
        self.blocks.last().unwrap().key()
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

    pub fn deps(&self) -> Vec<ObjectId> {
        match &self.header {
            Some(h) => h.deps(),
            None => vec![],
        }
    }

    pub fn acks(&self) -> Vec<ObjectId> {
        match &self.header {
            Some(h) => h.acks(),
            None => vec![],
        }
    }

    pub fn root_block(&self) -> &Block {
        self.blocks.last().unwrap()
    }

    pub fn header(&self) -> &Option<CommitHeader> {
        &self.header
    }

    pub fn blocks(&self) -> &Vec<Block> {
        &self.blocks
    }

    pub fn to_hashmap(&self) -> HashMap<BlockId, Block> {
        let mut map: HashMap<BlockId, Block> = HashMap::new();
        for block in &self.blocks {
            map.insert(block.id(), block.clone());
        }
        map
    }

    /// Collect leaves from the tree
    fn collect_leaves(
        blocks: &Vec<Block>,
        parents: &Vec<(ObjectId, SymKey)>,
        parent_index: usize,
        leaves: &mut Option<&mut Vec<Block>>,
        obj_content: &mut Option<&mut Vec<u8>>,
    ) -> Result<(), ObjectParseError> {
        /*log_debug!(
            ">>> collect_leaves: #{}..{}",
            parent_index,
            parent_index + parents.len() - 1
        );*/
        let mut children: Vec<(ObjectId, SymKey)> = vec![];
        let mut i = parent_index;

        for (id, key) in parents {
            //log_debug!("!!! parent: #{}", i);
            let block = &blocks[i];
            i += 1;

            // verify object ID
            if *id != block.id() {
                log_debug!("Invalid ObjectId.\nExp: {:?}\nGot: {:?}", *id, block.id());
                return Err(ObjectParseError::InvalidBlockId);
            }

            match block {
                Block::V0(b) => {
                    // decrypt content
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
                    let b_children = b.children();
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
        if !children.is_empty() {
            if parent_index < children.len() {
                return Err(ObjectParseError::InvalidChildren);
            }
            match Self::collect_leaves(
                blocks,
                &children,
                parent_index - children.len(),
                leaves,
                obj_content,
            ) {
                Ok(_) => (),
                Err(e) => return Err(e),
            }
        }
        Ok(())
    }

    /// Parse the Object and return the leaf Blocks with decryption key set
    pub fn leaves(&self) -> Result<Vec<Block>, ObjectParseError> {
        let mut leaves: Vec<Block> = vec![];
        let parents = vec![(self.id(), self.key().unwrap())];
        match Self::collect_leaves(
            &self.blocks,
            &parents,
            self.blocks.len() - 1,
            &mut Some(&mut leaves),
            &mut None,
        ) {
            Ok(_) => Ok(leaves),
            Err(e) => Err(e),
        }
    }

    /// Parse the Object and return the decrypted content assembled from Blocks
    pub fn content(&self) -> Result<ObjectContent, ObjectParseError> {
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
        ) {
            Ok(_) => {
                let content: ObjectContentV0;
                match serde_bare::from_slice(obj_content.as_slice()) {
                    Ok(c) => Ok(ObjectContent::V0(c)),
                    Err(e) => {
                        log_debug!("Object deserialize error: {}", e);
                        Err(ObjectParseError::ObjectDeserializeError)
                    }
                }
            }
            Err(e) => Err(e),
        }
    }

    pub fn content_v0(&self) -> Result<ObjectContentV0, ObjectParseError> {
        match self.content() {
            Ok(ObjectContent::V0(v0)) => Ok(v0),
            Err(e) => Err(e),
            _ => unimplemented!(),
        }
    }
}

#[cfg(test)]
mod test {

    use crate::object::*;
    use crate::store::*;
    use crate::types::*;
    use std::io::BufReader;
    use std::io::Read;
    use std::io::Write;

    // Those constants are calculated with RepoStore::get_max_value_size

    /// Maximum arity of branch containing max number of leaves
    const MAX_ARITY_LEAVES: usize = 31774;
    /// Maximum arity of root branch
    const MAX_ARITY_ROOT: usize = 31770;
    /// Maximum data that can fit in object.content
    const MAX_DATA_PAYLOAD_SIZE: usize = 2097112;

    #[test]
    pub fn test_pubkey_from_str() {
        let pubkey = PubKey::Ed25519PubKey([1u8; 32]);
        let str = pubkey.to_string();
        let server_key: PubKey = str.as_str().try_into().unwrap();
        assert_eq!(server_key, pubkey);
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

        let file = FileV0 {
            content_type: "image/jpeg".into(),
            metadata: vec![],
            content: img_buffer,
        };
        let content = ObjectContentV0::File(file);

        let deps: Vec<ObjectId> = vec![Digest::Blake3Digest32([9; 32])];
        let max_object_size = store_max_value_size();

        let repo_secret = SymKey::ChaCha20Key([0; 32]);
        let repo_pubkey = PubKey::Ed25519PubKey([1; 32]);

        let obj = Object::new(content, None, max_object_size, repo_pubkey, repo_secret);

        log_debug!("obj.id: {:?}", obj.id());
        log_debug!("obj.key: {:?}", obj.key());
        log_debug!("obj.blocks.len: {:?}", obj.blocks().len());

        let mut i = 0;
        for node in obj.blocks() {
            log_debug!("#{}: {:?}", i, node.id());
            let mut file = std::fs::File::create(format!("tests/{}.ng", node.id()))
                .expect("open block write file");
            let ser_file = serde_bare::to_vec(node).unwrap();
            file.write_all(&ser_file);
            log_debug!("{:?}", ser_file);

            i += 1;
        }
    }

    /// Test tree API
    #[test]
    pub fn test_object() {
        let file = FileV0 {
            content_type: "file/test".into(),
            metadata: Vec::from("some meta data here"),
            content: [(0..255).collect::<Vec<u8>>().as_slice(); 320].concat(),
        };
        let content = ObjectContentV0::File(file);

        let deps = vec![Digest::Blake3Digest32([9; 32])];
        let header = CommitHeaderV0::new_with_deps(deps.clone());
        let exp = Some(2u32.pow(31));
        let max_object_size = 0;

        let repo_secret = SymKey::ChaCha20Key([0; 32]);
        let repo_pubkey = PubKey::Ed25519PubKey([1; 32]);

        let obj = Object::new(
            content.clone(),
            header,
            max_object_size,
            repo_pubkey,
            repo_secret.clone(),
        );

        log_debug!("obj.id: {:?}", obj.id());
        log_debug!("obj.key: {:?}", obj.key());
        log_debug!("obj.acks: {:?}", obj.acks());
        log_debug!("obj.deps: {:?}", obj.deps());
        log_debug!("obj.blocks.len: {:?}", obj.blocks().len());

        let mut i = 0;
        for node in obj.blocks() {
            log_debug!("#{}: {:?}", i, node.id());
            i += 1;
        }

        assert_eq!(*obj.deps(), deps);

        match obj.content() {
            Ok(ObjectContent::V0(cnt)) => {
                assert_eq!(content, cnt);
            }
            Err(e) => panic!("Object parse error: {:?}", e),
        }
        let store = Box::new(HashMapRepoStore::new());

        obj.save(&store).expect("Object save error");

        let obj2 = Object::load(obj.id(), obj.key(), &store).unwrap();

        log_debug!("obj2.id: {:?}", obj2.id());
        log_debug!("obj2.key: {:?}", obj2.key());
        log_debug!("obj2.acks: {:?}", obj2.acks());
        log_debug!("obj2.deps: {:?}", obj2.deps());
        log_debug!("obj2.blocks.len: {:?}", obj2.blocks().len());
        let mut i = 0;
        for node in obj2.blocks() {
            log_debug!("#{}: {:?}", i, node.id());
            i += 1;
        }

        assert_eq!(*obj2.deps(), deps);

        match obj2.content_v0() {
            Ok(cnt) => {
                assert_eq!(content, cnt);
            }
            Err(e) => panic!("Object2 parse error: {:?}", e),
        }

        let obj3 = Object::load(obj.id(), None, &store).unwrap();

        log_debug!("obj3.id: {:?}", obj3.id());
        log_debug!("obj3.key: {:?}", obj3.key());
        log_debug!("obj3.deps: {:?}", obj3.deps());
        log_debug!("obj3.blocks.len: {:?}", obj3.blocks().len());
        let mut i = 0;
        for node in obj3.blocks() {
            log_debug!("#{}: {:?}", i, node.id());
            i += 1;
        }

        assert_eq!(*obj3.deps(), deps);

        match obj3.content() {
            Err(ObjectParseError::MissingRootKey) => (),
            Err(e) => panic!("Object3 parse error: {:?}", e),
            Ok(_) => panic!("Object3 should not return content"),
        }
    }

    /// Checks that a content that fits the root node, will not be chunked into children nodes
    #[test]
    pub fn test_depth_1() {
        let deps: Vec<ObjectId> = vec![Digest::Blake3Digest32([9; 32])];

        let empty_file = ObjectContentV0::File(FileV0 {
            content_type: "".into(),
            metadata: vec![],
            content: vec![],
        });
        let empty_file_ser = serde_bare::to_vec(&empty_file).unwrap();
        log_debug!("empty file size: {}", empty_file_ser.len());

        let size = store_max_value_size()
            - EMPTY_BLOCK_SIZE
            - DATA_VARINT_EXTRA
            - BLOCK_ID_SIZE
            - empty_file_ser.len()
            - DATA_VARINT_EXTRA;
        log_debug!("file size: {}", size);

        let content = ObjectContentV0::File(FileV0 {
            content_type: "".into(),
            metadata: vec![],
            content: vec![99; size],
        });
        let content_ser = serde_bare::to_vec(&content).unwrap();
        log_debug!("content len: {}", content_ser.len());

        let expiry = Some(2u32.pow(31));
        let max_object_size = store_max_value_size();

        let repo_secret = SymKey::ChaCha20Key([0; 32]);
        let repo_pubkey = PubKey::Ed25519PubKey([1; 32]);

        let object = Object::new(
            content,
            CommitHeaderV0::new_with_deps(deps),
            max_object_size,
            repo_pubkey,
            repo_secret,
        );

        log_debug!("root_id: {:?}", object.id());
        log_debug!("root_key: {:?}", object.key().unwrap());
        log_debug!("nodes.len: {:?}", object.blocks().len());
        //log_debug!("root: {:?}", tree.root_block());
        //log_debug!("nodes: {:?}", object.blocks);
        assert_eq!(object.blocks.len(), 1);
    }

    #[test]
    pub fn test_block_size() {
        let max_block_size = store_max_value_size();
        log_debug!("max_object_size: {}", max_block_size);

        let id = Digest::Blake3Digest32([0u8; 32]);
        let key = SymKey::ChaCha20Key([0u8; 32]);

        let one_key = ChunkContentV0::InternalNode(vec![key.clone()]);
        let one_key_ser = serde_bare::to_vec(&one_key).unwrap();

        let two_keys = ChunkContentV0::InternalNode(vec![key.clone(), key.clone()]);
        let two_keys_ser = serde_bare::to_vec(&two_keys).unwrap();

        let max_keys = ChunkContentV0::InternalNode(vec![key.clone(); MAX_ARITY_LEAVES]);
        let max_keys_ser = serde_bare::to_vec(&max_keys).unwrap();

        let data = ChunkContentV0::DataChunk(vec![]);
        let data_ser = serde_bare::to_vec(&data).unwrap();

        let data_full = ChunkContentV0::DataChunk(vec![0; MAX_DATA_PAYLOAD_SIZE]);
        let data_full_ser = serde_bare::to_vec(&data_full).unwrap();

        let leaf_empty = Block::new(vec![], None, data_ser.clone(), None);
        let leaf_empty_ser = serde_bare::to_vec(&leaf_empty).unwrap();

        let leaf_full_data = Block::new(vec![], None, data_full_ser.clone(), None);
        let leaf_full_data_ser = serde_bare::to_vec(&leaf_full_data).unwrap();

        let root_depsref = Block::new(
            vec![],
            Some(ObjectRef::from_id_key(id, key.clone())),
            data_ser.clone(),
            None,
        );

        let root_depsref_ser = serde_bare::to_vec(&root_depsref).unwrap();

        let internal_max = Block::new(vec![id; MAX_ARITY_LEAVES], None, max_keys_ser.clone(), None);
        let internal_max_ser = serde_bare::to_vec(&internal_max).unwrap();

        let internal_one = Block::new(vec![id; 1], None, one_key_ser.clone(), None);
        let internal_one_ser = serde_bare::to_vec(&internal_one).unwrap();

        let internal_two = Block::new(vec![id; 2], None, two_keys_ser.clone(), None);
        let internal_two_ser = serde_bare::to_vec(&internal_two).unwrap();

        let root_one = Block::new(
            vec![id; 1],
            Some(ObjectRef::from_id_key(id, key.clone())),
            one_key_ser.clone(),
            None,
        );
        let root_one_ser = serde_bare::to_vec(&root_one).unwrap();

        let root_two = Block::new(
            vec![id; 2],
            Some(ObjectRef::from_id_key(id, key)),
            two_keys_ser.clone(),
            None,
        );
        let root_two_ser = serde_bare::to_vec(&root_two).unwrap();

        log_debug!(
            "range of valid value sizes {} {}",
            store_valid_value_size(0),
            store_max_value_size()
        );

        log_debug!(
            "max_data_payload_of_object: {}",
            max_block_size - EMPTY_BLOCK_SIZE - DATA_VARINT_EXTRA
        );

        log_debug!(
            "max_data_payload_depth_1: {}",
            max_block_size - EMPTY_BLOCK_SIZE - DATA_VARINT_EXTRA - MAX_HEADER_SIZE
        );

        log_debug!(
            "max_data_payload_depth_2: {}",
            MAX_ARITY_ROOT * MAX_DATA_PAYLOAD_SIZE
        );

        log_debug!(
            "max_data_payload_depth_3: {}",
            MAX_ARITY_ROOT * MAX_ARITY_LEAVES * MAX_DATA_PAYLOAD_SIZE
        );

        let max_arity_leaves = (max_block_size - EMPTY_BLOCK_SIZE - BIG_VARINT_EXTRA * 2)
            / (BLOCK_ID_SIZE + BLOCK_KEY_SIZE);
        log_debug!("max_arity_leaves: {}", max_arity_leaves);
        assert_eq!(max_arity_leaves, MAX_ARITY_LEAVES);
        assert_eq!(
            max_block_size - EMPTY_BLOCK_SIZE - DATA_VARINT_EXTRA,
            MAX_DATA_PAYLOAD_SIZE
        );
        let max_arity_root =
            (max_block_size - EMPTY_BLOCK_SIZE - MAX_HEADER_SIZE - BIG_VARINT_EXTRA * 2)
                / (BLOCK_ID_SIZE + BLOCK_KEY_SIZE);
        log_debug!("max_arity_root: {}", max_arity_root);
        assert_eq!(max_arity_root, MAX_ARITY_ROOT);
        log_debug!("store_max_value_size: {}", leaf_full_data_ser.len());
        assert_eq!(leaf_full_data_ser.len(), max_block_size);
        log_debug!("leaf_empty: {}", leaf_empty_ser.len());
        assert_eq!(leaf_empty_ser.len(), EMPTY_BLOCK_SIZE);
        log_debug!("root_depsref: {}", root_depsref_ser.len());
        assert_eq!(root_depsref_ser.len(), EMPTY_ROOT_SIZE_DEPSREF);
        log_debug!("internal_max: {}", internal_max_ser.len());
        assert_eq!(
            internal_max_ser.len(),
            EMPTY_BLOCK_SIZE
                + BIG_VARINT_EXTRA * 2
                + MAX_ARITY_LEAVES * (BLOCK_ID_SIZE + BLOCK_KEY_SIZE)
        );
        assert!(internal_max_ser.len() < max_block_size);
        log_debug!("internal_one: {}", internal_one_ser.len());
        assert_eq!(
            internal_one_ser.len(),
            EMPTY_BLOCK_SIZE + 1 * BLOCK_ID_SIZE + 1 * BLOCK_KEY_SIZE
        );
        log_debug!("internal_two: {}", internal_two_ser.len());
        assert_eq!(
            internal_two_ser.len(),
            EMPTY_BLOCK_SIZE + 2 * BLOCK_ID_SIZE + 2 * BLOCK_KEY_SIZE
        );
        log_debug!("root_one: {}", root_one_ser.len());
        assert_eq!(
            root_one_ser.len(),
            EMPTY_BLOCK_SIZE + 8 * BLOCK_ID_SIZE + 1 * BLOCK_ID_SIZE + 1 * BLOCK_KEY_SIZE
        );
        log_debug!("root_two: {}", root_two_ser.len());
        assert_eq!(
            root_two_ser.len(),
            EMPTY_BLOCK_SIZE + 8 * BLOCK_ID_SIZE + 2 * BLOCK_ID_SIZE + 2 * BLOCK_KEY_SIZE
        );

        // let object_size_1 = 4096 * 1 - VALUE_HEADER_SIZE;
        // let object_size_512 = 4096 * MAX_PAGES_PER_VALUE - VALUE_HEADER_SIZE;
        // let arity_1: usize =
        //     (object_size_1 - 8 * OBJECT_ID_SIZE) / (OBJECT_ID_SIZE + OBJECT_KEY_SIZE);
        // let arity_512: usize =
        //     (object_size_512 - 8 * OBJECT_ID_SIZE) / (OBJECT_ID_SIZE + OBJECT_KEY_SIZE);

        // log_debug!("1-page object_size: {}", object_size_1);
        // log_debug!("512-page object_size: {}", object_size_512);
        // log_debug!("max arity of 1-page object: {}", arity_1);
        // log_debug!("max arity of 512-page object: {}", arity_512);
    }
}
