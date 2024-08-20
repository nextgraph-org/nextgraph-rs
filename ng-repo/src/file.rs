// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! SmallFile and RandomAccessFile objects

use core::fmt;
use std::cmp::min;
use std::collections::HashMap;
use std::sync::Arc;

use chacha20::cipher::{KeyIvInit, StreamCipher};
use chacha20::ChaCha20;
use zeroize::Zeroize;

use crate::block_storage::*;
use crate::errors::*;
#[allow(unused_imports)]
use crate::log::*;
use crate::object::*;
use crate::store::Store;
use crate::types::*;

/// File errors
#[derive(Debug, Eq, PartialEq, Clone)]
pub enum FileError {
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
    /// Error deserializing content of the RandomAccessFileMeta
    MetaDeserializeError,
    /// Files are immutable, you cannot modify them and this one was already saved once. Create a new File for your new data (and delete the old one if needed)
    AlreadySaved,
    /// File is too big
    TooBig,
    NotFound,
    StorageError,
    EndOfFile,
    InvalidArgument,
    NotAFile,
}

impl From<StorageError> for FileError {
    fn from(e: StorageError) -> Self {
        match e {
            StorageError::NotFound => FileError::NotFound,
            _ => FileError::StorageError,
        }
    }
}

impl From<ObjectParseError> for FileError {
    fn from(e: ObjectParseError) -> Self {
        match e {
            _ => FileError::BlockDeserializeError,
        }
    }
}

pub trait ReadFile {
    fn read(&self, pos: usize, size: usize) -> Result<Vec<u8>, FileError>;

    fn get_all_blocks_ids(&self) -> Result<Vec<ObjectId>, FileError>;
}

/// A File in memory (read access only)
pub struct File<'a> {
    internal: Box<dyn ReadFile + 'a>,
    blocks_ids: Vec<BlockId>,
}

impl<'a> File<'a> {
    pub fn open(id: ObjectId, key: SymKey, store: Arc<Store>) -> Result<File<'a>, FileError> {
        let root_block = store.get(&id)?;

        if root_block.children().len() == 2
            && *root_block.content().commit_header_obj() == CommitHeaderObject::RandomAccess
        {
            Ok(File {
                internal: Box::new(RandomAccessFile::open(id, key, store)?),
                blocks_ids: vec![],
            })
        } else {
            let obj = Object::load(id, Some(key), &store)?;
            match obj.content_v0()? {
                ObjectContentV0::SmallFile(small_file) => Ok(File {
                    internal: Box::new(small_file),
                    blocks_ids: obj.block_ids(),
                }),
                _ => Err(FileError::NotAFile),
            }
        }
    }
}

impl<'a> ReadFile for File<'a> {
    fn read(&self, pos: usize, size: usize) -> Result<Vec<u8>, FileError> {
        self.internal.read(pos, size)
    }
    fn get_all_blocks_ids(&self) -> Result<Vec<ObjectId>, FileError> {
        if self.blocks_ids.len() > 0 {
            Ok(self.blocks_ids.to_vec())
        } else {
            self.internal.get_all_blocks_ids()
        }
    }
}

impl ReadFile for SmallFile {
    fn read(&self, pos: usize, size: usize) -> Result<Vec<u8>, FileError> {
        match self {
            Self::V0(v0) => v0.read(pos, size),
        }
    }
    fn get_all_blocks_ids(&self) -> Result<Vec<ObjectId>, FileError> {
        unimplemented!();
    }
}

impl ReadFile for SmallFileV0 {
    fn read(&self, pos: usize, size: usize) -> Result<Vec<u8>, FileError> {
        if size == 0 {
            return Err(FileError::InvalidArgument);
        }
        if pos + size > self.content.len() {
            return Err(FileError::EndOfFile);
        }
        Ok(self.content[pos..pos + size].to_vec())
    }
    fn get_all_blocks_ids(&self) -> Result<Vec<ObjectId>, FileError> {
        unimplemented!();
    }
}

/// A RandomAccessFile in memory. This is not used to serialize data
pub struct RandomAccessFile {
    //storage: Arc<&'a dyn BlockStorage>,
    store: Arc<Store>,
    /// accurate once saved or opened
    meta: RandomAccessFileMeta,

    //meta_object_id: Option<BlockId>,
    //content_block_id: Option<BlockId>,
    /// keeps the deduplicated blocks' IDs, used for async writes
    block_contents: HashMap<BlockKey, BlockId>,

    /// Blocks of the Object (nodes of the tree). Only used when writing asynchronously, before saving.
    blocks: Vec<(BlockId, BlockKey)>,

    /// When an id is present, the File is opened in Read mode, and cannot be saved.
    id: Option<ObjectId>,
    key: Option<ObjectKey>,

    content_block: Option<(BlockId, BlockKey)>,

    // used for writes
    conv_key: Option<[u8; 32]>,
    remainder: Vec<u8>,
    size: usize,
}

impl ReadFile for RandomAccessFile {
    fn get_all_blocks_ids(&self) -> Result<Vec<ObjectId>, FileError> {
        if self.id.is_none() {
            unimplemented!();
        }
        let mut res = Vec::with_capacity(4);
        let _: Vec<()> = self
            .blocks
            .iter()
            .map(|(id, _)| res.push(id.clone()))
            .collect();

        recurse_tree(
            &self.store,
            self.content_block.as_ref().unwrap().clone(),
            &mut res,
            self.meta.depth(),
        )?;

        fn recurse_tree(
            store: &Store,
            current_block_id_key: (Digest, SymKey),
            res: &mut Vec<Digest>,
            level: u8,
        ) -> Result<(), FileError> {
            res.push(current_block_id_key.0);
            if level > 0 {
                let tree_block = store.get(&current_block_id_key.0)?;
                let (children, content) = tree_block.read(&current_block_id_key.1)?;
                if children.is_empty() || content.len() > 0 {
                    return Err(FileError::BlockDeserializeError);
                }

                for child in children {
                    recurse_tree(store, child, res, level - 1)?;
                }
            }
            Ok(())
        }
        Ok(res)
    }

    /// reads at most one block from the file. the returned vector should be tested for size. it might be smaller than what you asked for.
    /// `pos`ition can be anywhere in the file.
    //TODO: parallelize decryption on multi threads (cores)
    fn read(&self, pos: usize, mut size: usize) -> Result<Vec<u8>, FileError> {
        if size == 0 {
            return Err(FileError::InvalidArgument);
        }
        if self.id.is_some() {
            let total = self.meta.total_size() as usize;
            if pos > total {
                return Err(FileError::EndOfFile);
            }
            size = min(total - pos, size);
            let mut current_block_id_key = self.content_block.as_ref().unwrap().clone();

            let depth = self.meta.depth();
            let arity = self.meta.arity();

            let mut level_pos = pos;
            for level in 0..depth {
                let tree_block = self.store.get(&current_block_id_key.0)?;
                let (children, content) = tree_block.read(&current_block_id_key.1)?;
                if children.is_empty() || content.len() > 0 {
                    return Err(FileError::BlockDeserializeError);
                }
                let factor = (arity as usize).pow(depth as u32 - level as u32 - 1)
                    * self.meta.chunk_size() as usize;
                let level_index = pos / factor;
                if level_index >= children.len() {
                    return Err(FileError::EndOfFile);
                }
                current_block_id_key = (children[level_index]).clone();
                level_pos = pos as usize % factor;
            }

            let content_block = self.store.get(&current_block_id_key.0)?;
            //log_debug!("CONTENT BLOCK SIZE {}", content_block.size());

            let (children, content) = content_block.read(&current_block_id_key.1)?;

            if children.is_empty() && content.len() > 0 {
                //log_debug!("CONTENT SIZE {}", content.len());

                if level_pos >= content.len() {
                    return Err(FileError::EndOfFile);
                }
                let end = min(content.len(), level_pos + size);
                return Ok(content[level_pos..end].to_vec());
            } else {
                return Err(FileError::BlockDeserializeError);
            }
        } else {
            // hasn't been saved yet, we can use the self.blocks as a flat array and the remainder too
            let factor = self.meta.chunk_size() as usize;
            let index = pos / factor as usize;
            let level_pos = pos % factor as usize;
            let remainder_pos = self.blocks.len() * factor;
            if pos >= remainder_pos {
                let pos_in_remainder = pos - remainder_pos;
                if self.remainder.len() > 0 && pos_in_remainder < self.remainder.len() {
                    let end = min(self.remainder.len(), pos_in_remainder + size);
                    return Ok(self.remainder[pos_in_remainder..end].to_vec());
                } else {
                    return Err(FileError::EndOfFile);
                }
            }
            //log_debug!("{} {} {} {}", index, self.blocks.len(), factor, level_pos);
            if index >= self.blocks.len() {
                return Err(FileError::EndOfFile);
            }
            let block = &self.blocks[index];
            let content_block = self.store.get(&block.0)?;
            let (children, content) = content_block.read(&block.1)?;
            if children.is_empty() && content.len() > 0 {
                //log_debug!("CONTENT SIZE {}", content.len());

                if level_pos >= content.len() {
                    return Err(FileError::EndOfFile);
                }
                let end = min(content.len(), level_pos + size);
                return Ok(content[level_pos..end].to_vec());
            } else {
                return Err(FileError::BlockDeserializeError);
            }
        }
    }
}

impl RandomAccessFile {
    pub fn meta(&self) -> &RandomAccessFileMeta {
        &self.meta
    }

    pub fn id(&self) -> &Option<ObjectId> {
        &self.id
    }

    pub fn key(&self) -> &Option<ObjectKey> {
        &self.key
    }

    fn make_block(
        mut content: Vec<u8>,
        conv_key: &[u8; blake3::OUT_LEN],
        children: Vec<ObjectId>,
        already_existing: &mut HashMap<BlockKey, BlockId>,
        store: &Store,
    ) -> Result<(BlockId, BlockKey), StorageError> {
        let key_hash = blake3::keyed_hash(conv_key, &content);

        let key_slice = key_hash.as_bytes();
        let key = SymKey::ChaCha20Key(key_slice.clone());
        let it = already_existing.get(&key);
        if it.is_some() {
            return Ok((*it.unwrap(), key));
        }
        let nonce = [0u8; 12];
        let mut cipher = ChaCha20::new(key_slice.into(), &nonce.into());
        //let mut content_enc = Vec::from(content);
        let mut content_enc_slice = &mut content.as_mut_slice();
        cipher.apply_keystream(&mut content_enc_slice);

        let mut block = Block::new_random_access(children, content, None);
        //log_debug!(">>> make_block random access: {}", block.id());
        //log_debug!("!! children: ({}) {:?}", children.len(), children);

        let id = block.get_and_save_id();
        already_existing.insert(key.clone(), id);
        //log_debug!("putting *** {}", id);
        store.put(&block)?;
        Ok((id, key))
    }

    fn make_parent_block(
        conv_key: &[u8; blake3::OUT_LEN],
        children: Vec<(BlockId, BlockKey)>,
        already_existing: &mut HashMap<BlockKey, BlockId>,
        store: &Store,
    ) -> Result<(BlockId, BlockKey), StorageError> {
        let mut ids: Vec<BlockId> = Vec::with_capacity(children.len());
        let mut keys: Vec<BlockKey> = Vec::with_capacity(children.len());
        children.iter().for_each(|child| {
            ids.push(child.0);
            keys.push(child.1.clone());
        });
        let content = ChunkContentV0::InternalNode(keys);
        let content_ser = serde_bare::to_vec(&content).unwrap();

        Self::make_block(content_ser, conv_key, ids, already_existing, store)
    }

    /// Build tree from leaves, returns parent nodes
    fn make_tree(
        already_existing: &mut HashMap<BlockKey, BlockId>,
        leaves: &[(BlockId, BlockKey)],
        conv_key: &ChaCha20Key,
        arity: u16,
        store: &Store,
    ) -> Result<(BlockId, BlockKey), StorageError> {
        let mut parents: Vec<(BlockId, BlockKey)> = vec![];
        let mut chunks = leaves.chunks(arity as usize);
        while let Some(nodes) = chunks.next() {
            //log_debug!("making parent");
            parents.push(Self::make_parent_block(
                conv_key,
                nodes.to_vec(),
                already_existing,
                store,
            )?);
        }
        //log_debug!("level with {} parents", parents.len());

        if 1 < parents.len() {
            return Self::make_tree(already_existing, parents.as_slice(), conv_key, arity, store);
        }
        Ok(parents[0].clone())
    }

    /// returns content_block id/key pair, and root_block id/key pair
    fn save_(
        already_existing: &mut HashMap<BlockKey, BlockId>,
        blocks: &[(BlockId, BlockKey)],
        meta: &mut RandomAccessFileMeta,
        conv_key: &ChaCha20Key,
        store: &Store,
    ) -> Result<((BlockId, BlockKey), (BlockId, BlockKey)), FileError> {
        let leaf_blocks_nbr = blocks.len();
        let arity = meta.arity();

        let mut depth: u8 = u8::MAX;
        for i in 0..u8::MAX {
            if leaf_blocks_nbr <= (arity as usize).pow(i.into()) {
                depth = i;
                break;
            }
        }
        if depth == u8::MAX {
            return Err(FileError::TooBig);
        }
        meta.set_depth(depth);
        //log_debug!("depth={} leaves={}", depth, leaf_blocks_nbr);

        let content_block = if depth == 0 {
            assert!(blocks.len() == 1);
            blocks[0].clone()
        } else {
            // we create the tree
            Self::make_tree(already_existing, &blocks, &conv_key, arity, store)?
        };

        let meta_object = Object::new_with_convergence_key(
            ObjectContent::V0(ObjectContentV0::RandomAccessFileMeta(meta.clone())),
            None,
            store_valid_value_size(meta.chunk_size() as usize),
            conv_key,
        );
        //log_debug!("saving meta object");
        _ = meta_object.save(store)?;

        // creating the root block that contains as first child the meta_object, and as second child the content_block
        // it is added to storage in make_parent_block
        //log_debug!("saving root block");
        let root_block = Self::make_parent_block(
            conv_key,
            vec![
                (meta_object.id(), meta_object.key().unwrap()),
                content_block.clone(),
            ],
            already_existing,
            store,
        )?;
        Ok((content_block, root_block))
    }

    /// Creates a new file based on a content that is fully known at the time of creation.
    ///
    /// If you want to stream progressively the content into the new file, you should use new_empty(), write() and save() instead
    pub fn new_from_slice(
        content: &[u8],
        block_size: usize,
        content_type: String,
        metadata: Vec<u8>,
        store: Arc<Store>,
    ) -> Result<RandomAccessFile, FileError> {
        //let max_block_size = store_max_value_size();
        let valid_block_size = store_valid_value_size(block_size) - BLOCK_EXTRA;

        let arity = ((valid_block_size) / CHILD_SIZE) as u16;

        let total_size = content.len() as u64;

        let mut conv_key = Object::convergence_key(&store);

        let mut blocks: Vec<(BlockId, BlockKey)> = vec![];

        let mut already_existing: HashMap<BlockKey, BlockId> = HashMap::new();

        //log_debug!("making the leaves");
        for chunk in content.chunks(valid_block_size) {
            let data_chunk = ChunkContentV0::DataChunk(chunk.to_vec());
            let content_ser = serde_bare::to_vec(&data_chunk).unwrap();
            blocks.push(Self::make_block(
                content_ser,
                &conv_key,
                vec![],
                &mut already_existing,
                &store,
            )?);
        }
        assert_eq!(
            (total_size as usize + valid_block_size - 1) / valid_block_size,
            blocks.len()
        );

        let mut meta = RandomAccessFileMeta::V0(RandomAccessFileMetaV0 {
            content_type,
            metadata,
            chunk_size: valid_block_size as u32,
            total_size,
            arity,
            depth: 0,
        });

        let (content_block, root_block) =
            Self::save_(&mut already_existing, &blocks, &mut meta, &conv_key, &store)?;

        conv_key.zeroize();

        Ok(Self {
            store,
            meta,
            block_contents: HashMap::new(), // not used in this case
            blocks: vec![],                 // not used in this case
            id: Some(root_block.0.clone()),
            key: Some(root_block.1.clone()),
            content_block: Some(content_block),
            conv_key: None,    // not used in this case
            remainder: vec![], // not used in this case
            size: 0,           // not used in this case
        })
    }

    pub fn new_empty(
        block_size: usize,
        content_type: String,
        metadata: Vec<u8>,
        store: Arc<Store>,
    ) -> Self {
        let valid_block_size = store_valid_value_size(block_size) - BLOCK_EXTRA;

        let arity = ((valid_block_size) / CHILD_SIZE) as u16;

        let meta = RandomAccessFileMeta::V0(RandomAccessFileMetaV0 {
            content_type,
            metadata,
            chunk_size: valid_block_size as u32,
            arity,
            total_size: 0, // will be filled in later, during save
            depth: 0,      // will be filled in later, during save
        });

        Self {
            store: Arc::clone(&store),
            meta,
            block_contents: HashMap::new(),
            blocks: vec![],
            id: None,
            key: None,
            content_block: None,
            conv_key: Some(Object::convergence_key(&store)),
            remainder: vec![],
            size: 0,
        }
    }

    /// Appends some data at the end of the file currently created with new_empty() and not saved yet.
    /// you can call it many times. Don't forget to eventually call save()
    pub fn write(&mut self, data: &[u8]) -> Result<(), FileError> {
        if self.id.is_some() {
            return Err(FileError::AlreadySaved);
        }
        let remainder = self.remainder.len();
        let chunk_size = self.meta.chunk_size() as usize;
        let mut pos: usize = 0;
        let conv_key = self.conv_key.unwrap();
        // TODO: provide an option to search in storage for already existing, when doing a resume of previously aborted write
        let mut already_existing: HashMap<BlockKey, BlockId> = HashMap::new();

        if remainder > 0 {
            if data.len() >= chunk_size - remainder {
                let mut new_block = Vec::with_capacity(chunk_size);
                new_block.append(&mut self.remainder);
                pos = chunk_size - remainder;
                self.size += chunk_size;
                //log_debug!("size += chunk_size {} {}", self.size, chunk_size);
                new_block.extend(data[0..pos].iter());
                assert_eq!(new_block.len(), chunk_size);
                let data_chunk = ChunkContentV0::DataChunk(new_block);
                let content_ser = serde_bare::to_vec(&data_chunk).unwrap();
                self.blocks.push(Self::make_block(
                    content_ser,
                    &conv_key,
                    vec![],
                    &mut already_existing,
                    &self.store,
                )?);
            } else {
                // not enough data to create a new block
                self.remainder.extend(data.iter());
                return Ok(());
            }
        } else if data.len() < chunk_size {
            self.remainder = Vec::from(data);
            return Ok(());
        }

        for chunk in data[pos..].chunks(chunk_size) {
            if chunk.len() == chunk_size {
                self.size += chunk_size;
                //log_debug!("size += chunk_size {} {}", self.size, chunk_size);
                let data_chunk = ChunkContentV0::DataChunk(chunk.to_vec());
                let content_ser = serde_bare::to_vec(&data_chunk).unwrap();
                self.blocks.push(Self::make_block(
                    content_ser,
                    &conv_key,
                    vec![],
                    &mut already_existing,
                    &self.store,
                )?);
            } else {
                self.remainder = Vec::from(chunk);
                return Ok(());
            }
        }
        Ok(())
    }

    pub fn save(&mut self) -> Result<ObjectId, FileError> {
        if self.id.is_some() {
            return Err(FileError::AlreadySaved);
        }
        // save the remainder, if any.
        if self.remainder.len() > 0 {
            self.size += self.remainder.len();
            //log_debug!("size += remainder {} {}", self.size, self.remainder.len());
            let mut remainder = Vec::with_capacity(self.remainder.len());
            remainder.append(&mut self.remainder);
            let data_chunk = ChunkContentV0::DataChunk(remainder);
            let content_ser = serde_bare::to_vec(&data_chunk).unwrap();
            self.blocks.push(Self::make_block(
                content_ser,
                &self.conv_key.unwrap(),
                vec![],
                &mut HashMap::new(),
                &self.store,
            )?);
        }

        self.meta.set_total_size(self.size as u64);

        let mut already_existing: HashMap<BlockKey, BlockId> = HashMap::new();
        let (content_block, root_block) = Self::save_(
            &mut already_existing,
            &self.blocks,
            &mut self.meta,
            self.conv_key.as_ref().unwrap(),
            &self.store,
        )?;

        self.conv_key.as_mut().unwrap().zeroize();
        self.conv_key = None;

        self.id = Some(root_block.0);
        self.key = Some(root_block.1.clone());
        self.content_block = Some(content_block);

        self.blocks = vec![];
        self.blocks.shrink_to_fit();

        Ok(root_block.0)
    }

    pub fn reference(&self) -> Option<ObjectRef> {
        if self.key.is_some() && self.id.is_some() {
            Some(ObjectRef::from_id_key(
                self.id.unwrap(),
                self.key.as_ref().unwrap().clone(),
            ))
        } else {
            None
        }
    }

    /// Opens a file for read purpose.
    pub fn open(
        id: ObjectId,
        key: SymKey,
        store: Arc<Store>,
    ) -> Result<RandomAccessFile, FileError> {
        // load root block
        let root_block = store.get(&id)?;

        if root_block.children().len() != 2
            || *root_block.content().commit_header_obj() != CommitHeaderObject::RandomAccess
        {
            return Err(FileError::BlockDeserializeError);
        }

        let (root_sub_blocks, _) = root_block.read(&key)?;

        // load meta object (first one in root block)
        let meta_object = Object::load(
            root_sub_blocks[0].0,
            Some(root_sub_blocks[0].1.clone()),
            &store,
        )?;

        let meta = match meta_object.content_v0()? {
            ObjectContentV0::RandomAccessFileMeta(meta) => meta,
            _ => return Err(FileError::InvalidChildren),
        };

        Ok(RandomAccessFile {
            store,
            meta,
            block_contents: HashMap::new(), // not used in this case
            blocks: vec![(id, SymKey::nil()), (root_sub_blocks[0].0, SymKey::nil())], // not used in this case
            id: Some(id),
            key: Some(key),
            content_block: Some(root_sub_blocks[1].clone()),
            conv_key: None,
            remainder: vec![],
            size: 0,
        })
    }

    pub fn blocks(&self) -> impl Iterator<Item = Block> + '_ {
        self.blocks
            .iter()
            .map(|key| self.store.get(&key.0).unwrap())
    }

    /// Size once encoded, before deduplication. Only available before save()
    pub fn size(&self) -> usize {
        let mut total = 0;
        self.blocks().for_each(|b| total += b.size());
        total
    }

    /// Real size on disk
    pub fn dedup_size(&self) -> usize {
        let mut total = 0;
        self.block_contents
            .values()
            .for_each(|b| total += self.store.get(b).unwrap().size());
        total
    }

    pub fn depth(&self) -> Result<u8, NgError> {
        Ok(self.meta.depth())

        // unimplemented!();
        // if self.key().is_none() {
        //     return Err(ObjectParseError::MissingRootKey);
        // }
        // let parents = vec![(self.id(), self.key().unwrap())];
        // Self::collect_leaves(
        //     &self.blocks,
        //     &parents,
        //     self.blocks.len() - 1,
        //     &mut None,
        //     &mut None,
        //     &self.block_contents,
        // )
    }
}

impl fmt::Display for RandomAccessFile {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(
            f,
            "====== File ID {}",
            self.id
                .map_or("NOT SAVED".to_string(), |i| format!("{}", i))
        )?;
        writeln!(
            f,
            "== Key:    {}",
            self.key
                .as_ref()
                .map_or("None".to_string(), |k| format!("{}", k))
        )?;
        writeln!(f, "== depth:        {}", self.meta.depth())?;
        writeln!(f, "== arity:        {}", self.meta.arity())?;
        writeln!(f, "== chunk_size:   {}", self.meta.chunk_size())?;
        writeln!(f, "== total_size:   {}", self.meta.total_size())?;
        writeln!(f, "== content_type: {}", self.meta.content_type())?;
        writeln!(f, "== metadata len: {}", self.meta.metadata().len())?;
        if self.id.is_none() {
            writeln!(f, "== blocks to save: {}", self.blocks.len())?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod test {

    use crate::file::*;
    use std::io::BufReader;
    use std::io::Read;

    /// Checks that a content that does fit in one block, creates an arity of 0
    #[test]
    pub fn test_depth_0() {
        let block_size = store_max_value_size();
        //store_valid_value_size(0)

        ////// 1 MB of data!
        let data_size = block_size - BLOCK_EXTRA;

        let store = Store::dummy_public_v0();
        log_debug!("creating 1MB of data");
        let content: Vec<u8> = vec![99; data_size];

        log_debug!("creating random access file with that data");
        let file: RandomAccessFile = RandomAccessFile::new_from_slice(
            &content,
            block_size,
            "text/plain".to_string(),
            vec![],
            Arc::clone(&store),
        )
        .expect("new_from_slice");
        log_debug!("{}", file);

        let id = file.id.as_ref().unwrap().clone();

        let file_size = file.size();
        log_debug!("file size to save : {}", file_size);

        log_debug!("data size: {}", data_size);

        let read_content = file.read(0, data_size).expect("reading all");
        assert_eq!(read_content, content);

        let read_content2 = file.read(0, data_size + 1);
        assert_eq!(read_content2.unwrap().len(), 1048564);

        let read_content = file.read(data_size - 9, 9).expect("reading end");
        assert_eq!(read_content, vec![99, 99, 99, 99, 99, 99, 99, 99, 99]);

        let read_content = file.read(data_size - 9, 10);
        assert_eq!(read_content, Ok(vec![99, 99, 99, 99, 99, 99, 99, 99, 99]));

        // log_debug!(
        //     "overhead: {} - {}%",
        //     file_size - data_size,
        //     ((file_size - data_size) * 100) as f32 / data_size as f32
        // );

        // let dedup_size = file.dedup_size();
        // log_debug!(
        //     "dedup compression: {} - {}%",
        //     data_size - dedup_size,
        //     ((data_size - dedup_size) * 100) as f32 / data_size as f32
        // );

        // log_debug!("number of blocks : {}", file.blocks.len());
        // assert_eq!(
        //     file.blocks.len(),
        //     MAX_ARITY_LEAVES * (MAX_ARITY_LEAVES + 1) * MAX_ARITY_LEAVES + MAX_ARITY_LEAVES + 1
        // );
        assert_eq!(file.depth(), Ok(0));
        assert_eq!(store.len(), Ok(3));

        let file = RandomAccessFile::open(id, file.key.unwrap(), store).expect("re open");

        log_debug!("{}", file);

        let read_content = file.read(0, data_size).expect("reading all after re open");
        assert_eq!(read_content, content);
    }

    /// Checks that a content that doesn't fit in all the children of first level in tree
    #[ignore]
    #[test]
    pub fn test_depth_1() {
        const MAX_ARITY_LEAVES: usize = 15887;
        const MAX_DATA_PAYLOAD_SIZE: usize = 1048564;

        ////// 16 GB of data!
        let data_size = MAX_ARITY_LEAVES * MAX_DATA_PAYLOAD_SIZE;

        let store = Store::dummy_public_v0();
        log_debug!("creating 16GB of data");

        let content: Vec<u8> = vec![99; data_size];

        log_debug!("creating random access file with that data");
        let file: RandomAccessFile = RandomAccessFile::new_from_slice(
            &content,
            store_max_value_size(),
            "text/plain".to_string(),
            vec![],
            Arc::clone(&store),
        )
        .expect("new_from_slice");
        log_debug!("{}", file);

        let _id = file.id.as_ref().unwrap().clone();

        log_debug!("data size: {}", data_size);

        assert_eq!(file.depth(), Ok(1));

        assert_eq!(store.len(), Ok(4));
    }

    /// Checks that a content that doesn't fit in all the children of first level in tree
    #[ignore]
    #[test]
    pub fn test_depth_2() {
        const MAX_ARITY_LEAVES: usize = 15887;
        const MAX_DATA_PAYLOAD_SIZE: usize = 1048564;

        ////// 16 GB of data!
        let data_size = MAX_ARITY_LEAVES * MAX_DATA_PAYLOAD_SIZE + 1;

        let store = Store::dummy_public_v0();
        log_debug!("creating 16GB of data");
        let content: Vec<u8> = vec![99; data_size];

        log_debug!("creating file with that data");
        let file: RandomAccessFile = RandomAccessFile::new_from_slice(
            &content,
            store_max_value_size(),
            "text/plain".to_string(),
            vec![],
            Arc::clone(&store),
        )
        .expect("new_from_slice");
        log_debug!("{}", file);

        let file_size = file.size();
        log_debug!("file size: {}", file_size);

        log_debug!("data size: {}", data_size);

        assert_eq!(file.depth().unwrap(), 2);

        assert_eq!(store.len(), Ok(7));
    }

    /// Checks that a content that doesn't fit in all the children of first level in tree
    #[test]
    pub fn test_depth_3() {
        const MAX_ARITY_LEAVES: usize = 61;
        const MAX_DATA_PAYLOAD_SIZE: usize = 4084;

        ////// 900 MB of data!
        let data_size =
            MAX_ARITY_LEAVES * MAX_ARITY_LEAVES * MAX_ARITY_LEAVES * MAX_DATA_PAYLOAD_SIZE;

        let store = Store::dummy_public_v0();
        log_debug!("creating 900MB of data");
        let content: Vec<u8> = vec![99; data_size];

        log_debug!("creating file with that data");
        let file: RandomAccessFile = RandomAccessFile::new_from_slice(
            &content,
            store_valid_value_size(0),
            "text/plain".to_string(),
            vec![],
            Arc::clone(&store),
        )
        .expect("new_from_slice");
        log_debug!("{}", file);

        let file_size = file.size();
        log_debug!("file size: {}", file_size);

        let read_content = file.read(0, data_size).expect("reading all");
        assert_eq!(read_content.len(), MAX_DATA_PAYLOAD_SIZE);

        let read_content = file.read(9000, 10000).expect("reading 10k");
        assert_eq!(read_content, vec![99; 3252]);

        // log_debug!("data size: {}", data_size);
        // log_debug!(
        //     "overhead: {} - {}%",
        //     file_size - data_size,
        //     ((file_size - data_size) * 100) as f32 / data_size as f32
        // );

        // let dedup_size = file.dedup_size();
        // log_debug!(
        //     "dedup compression: {} - {}%",
        //     data_size - dedup_size,
        //     ((data_size - dedup_size) * 100) as f32 / data_size as f32
        // );

        // log_debug!("number of blocks : {}", file.blocks.len());
        // assert_eq!(
        //     file.blocks.len(),
        //     MAX_ARITY_LEAVES * (MAX_ARITY_LEAVES + 1) * MAX_ARITY_LEAVES + MAX_ARITY_LEAVES + 1
        // );
        assert_eq!(file.depth().unwrap(), 3);

        assert_eq!(store.len(), Ok(6));
    }

    /// Checks that a content that doesn't fit in all the children of first level in tree
    #[ignore]
    #[test]
    pub fn test_depth_4() {
        const MAX_ARITY_LEAVES: usize = 61;
        const MAX_DATA_PAYLOAD_SIZE: usize = 4084;

        ////// 52GB of data!
        let data_size = MAX_ARITY_LEAVES
            * MAX_ARITY_LEAVES
            * MAX_ARITY_LEAVES
            * MAX_ARITY_LEAVES
            * MAX_DATA_PAYLOAD_SIZE;

        let store = Store::dummy_public_v0();
        log_debug!("creating 55GB of data");
        let content: Vec<u8> = vec![99; data_size];

        log_debug!("creating file with that data");
        let file: RandomAccessFile = RandomAccessFile::new_from_slice(
            &content,
            store_valid_value_size(0),
            "text/plain".to_string(),
            vec![],
            Arc::clone(&store),
        )
        .expect("new_from_slice");

        log_debug!("{}", file);

        let file_size = file.size();
        log_debug!("file size: {}", file_size);

        log_debug!("data size: {}", data_size);

        assert_eq!(file.depth().unwrap(), 4);

        assert_eq!(store.len(), Ok(7));
    }

    /// Test async write to a file all at once
    #[test]
    pub fn test_write_all_at_once() {
        let f = std::fs::File::open("tests/test.jpg").expect("open of tests/test.jpg");
        let mut reader = BufReader::new(f);
        let mut img_buffer: Vec<u8> = Vec::new();
        reader
            .read_to_end(&mut img_buffer)
            .expect("read of test.jpg");

        let store = Store::dummy_public_v0();

        log_debug!("creating file with the JPG content");
        let mut file: RandomAccessFile = RandomAccessFile::new_empty(
            store_max_value_size(), //store_valid_value_size(0),//
            "image/jpeg".to_string(),
            vec![],
            store,
        );

        log_debug!("{}", file);

        file.write(&img_buffer).expect("write all at once");

        // !!! all those tests work only because store_max_value_size() is bigger than the actual size of the JPEG file. so it fits in one block.

        assert_eq!(
            file.read(0, img_buffer.len()).expect("read before save"),
            img_buffer
        );

        // asking too much, receiving just enough
        assert_eq!(
            file.read(0, img_buffer.len() + 1)
                .expect("read before save"),
            img_buffer
        );

        // // reading too far, well behind the size of the JPG
        // assert_eq!(file.read(100000, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(10000, 1).expect("read before save"), vec![41]);

        // // reading one byte after the end of the file size.
        // assert_eq!(file.read(29454, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(29454, 0), Err(FileError::InvalidArgument));

        file.save().expect("save");

        let res = file.read(0, img_buffer.len()).expect("read all");
        assert_eq!(res, img_buffer);

        // // asking too much, receiving an error, as now we know the total size of file, and we check it
        // assert_eq!(
        //     file.read(0, img_buffer.len() + 1),
        //     Err(FileError::EndOfFile)
        // );

        // reading too far, well behind the size of the JPG
        assert_eq!(file.read(100000, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(10000, 1).expect("read after save"), vec![41]);

        // // reading one byte after the end of the file size.
        // assert_eq!(file.read(29454, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(29454, 0), Err(FileError::InvalidArgument));
    }

    /// Test async write to a file by increments
    #[test]
    pub fn test_write_by_increments() {
        let f = std::fs::File::open("tests/test.jpg").expect("open of tests/test.jpg");
        let mut reader = BufReader::new(f);
        let mut img_buffer: Vec<u8> = Vec::new();
        reader
            .read_to_end(&mut img_buffer)
            .expect("read of test.jpg");

        let store = Store::dummy_public_v0();

        log_debug!("creating file with the JPG content");
        let mut file: RandomAccessFile = RandomAccessFile::new_empty(
            store_max_value_size(), //store_valid_value_size(0),//
            "image/jpeg".to_string(),
            vec![],
            store,
        );

        log_debug!("{}", file);

        for chunk in img_buffer.chunks(1000) {
            file.write(chunk).expect("write a chunk");
        }

        assert_eq!(
            file.read(0, img_buffer.len()).expect("read before save"),
            img_buffer
        );

        // asking too much, receiving just enough
        assert_eq!(
            file.read(0, img_buffer.len() + 1)
                .expect("read before save"),
            img_buffer
        );

        // reading too far, well behind the size of the JPG
        assert_eq!(file.read(100000, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(10000, 1).expect("read before save"), vec![41]);

        // reading one byte after the end of the file size.
        assert_eq!(file.read(29454, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(29454, 0), Err(FileError::InvalidArgument));

        file.save().expect("save");

        // this works only because store_max_value_size() is bigger than the actual size of the JPEG file. so it fits in one block.
        let res = file.read(0, img_buffer.len()).expect("read all");

        assert_eq!(res, img_buffer);

        // // asking too much, receiving an error, as now we know the total size of file, and we check it
        // assert_eq!(
        //     file.read(0, img_buffer.len() + 1),
        //     Err(FileError::EndOfFile)
        // );

        // reading too far, well behind the size of the JPG
        assert_eq!(file.read(100000, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(10000, 1).expect("read after save"), vec![41]);

        // // reading one byte after the end of the file size.
        // assert_eq!(file.read(29454, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(29454, 0), Err(FileError::InvalidArgument));
    }

    /// Test async write to a file by increments small blocks
    #[test]
    pub fn test_write_by_increments_small_blocks() {
        let f = std::fs::File::open("tests/test.jpg").expect("open of tests/test.jpg");
        let mut reader = BufReader::new(f);
        let mut img_buffer: Vec<u8> = Vec::new();
        reader
            .read_to_end(&mut img_buffer)
            .expect("read of test.jpg");

        let store = Store::dummy_public_v0();

        log_debug!("creating file with the JPG content");
        let mut file: RandomAccessFile = RandomAccessFile::new_empty(
            store_valid_value_size(0),
            "image/jpeg".to_string(),
            vec![],
            store,
        );

        log_debug!("{}", file);

        let first_block_content = img_buffer[0..4084].to_vec();

        for chunk in img_buffer.chunks(1000) {
            file.write(chunk).expect("write a chunk");
        }

        log_debug!("{}", file);

        assert_eq!(
            file.read(0, img_buffer.len()).expect("read before save"),
            first_block_content
        );

        // asking too much, receiving just enough
        assert_eq!(
            file.read(0, img_buffer.len() + 1)
                .expect("read before save"),
            first_block_content
        );

        // reading too far, well behind the size of the JPG
        assert_eq!(file.read(100000, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(10000, 1).expect("read before save"), vec![41]);

        // // reading one byte after the end of the file size.
        // assert_eq!(file.read(29454, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(29454, 0), Err(FileError::InvalidArgument));

        file.save().expect("save");

        log_debug!("{}", file);

        assert_eq!(img_buffer.len(), file.meta.total_size() as usize);

        let res = file.read(0, img_buffer.len()).expect("read all");
        assert_eq!(res, first_block_content);

        // // asking too much, not receiving an error, as we know the total size of file, and return what we can
        // assert_eq!(
        //     file.read(0, img_buffer.len() + 1),
        //     Err(FileError::EndOfFile)
        // );

        // reading too far, well behind the size of the JPG
        assert_eq!(file.read(100000, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(10000, 1).expect("read after save"), vec![41]);

        // // reading one byte after the end of the file size.
        // assert_eq!(file.read(29454, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(29454, 0), Err(FileError::InvalidArgument));
    }

    /// Test async write to a file all at once
    #[test]
    pub fn test_write_all_at_once_small_blocks() {
        let f = std::fs::File::open("tests/test.jpg").expect("open of tests/test.jpg");
        let mut reader = BufReader::new(f);
        let mut img_buffer: Vec<u8> = Vec::new();
        reader
            .read_to_end(&mut img_buffer)
            .expect("read of test.jpg");

        let first_block_content = img_buffer[0..4084].to_vec();

        let store = Store::dummy_public_v0();

        log_debug!("creating file with the JPG content");
        let mut file: RandomAccessFile = RandomAccessFile::new_empty(
            store_valid_value_size(0),
            "image/jpeg".to_string(),
            vec![],
            store,
        );

        log_debug!("{}", file);

        file.write(&img_buffer).expect("write all at once");

        assert_eq!(
            file.read(0, img_buffer.len()).expect("read before save"),
            first_block_content
        );

        // asking too much, receiving just enough
        assert_eq!(
            file.read(0, img_buffer.len() + 1)
                .expect("read before save"),
            first_block_content
        );

        // reading too far, well behind the size of the JPG
        assert_eq!(file.read(100000, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(10000, 1).expect("read before save"), vec![41]);

        // // reading one byte after the end of the file size.
        // assert_eq!(file.read(29454, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(29454, 0), Err(FileError::InvalidArgument));

        file.save().expect("save");

        let res = file.read(0, img_buffer.len()).expect("read all");
        assert_eq!(res, first_block_content);

        let res = file.read(10, img_buffer.len() - 10).expect("read all");
        assert_eq!(res, first_block_content[10..].to_vec());

        // // asking too much, receiving an error, as now we know the total size of file, and we check it
        // assert_eq!(
        //     file.read(0, img_buffer.len() + 1),
        //     Err(FileError::EndOfFile)
        // );

        // reading too far, well behind the size of the JPG
        assert_eq!(file.read(100000, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(10000, 1).expect("read after save"), vec![41]);

        // // reading one byte after the end of the file size.
        // assert_eq!(file.read(29454, 1), Err(FileError::EndOfFile));

        assert_eq!(file.read(29454, 0), Err(FileError::InvalidArgument));
    }

    /// Test depth 4 with 52GB of data, but using write in small increments, so the memory burden on the system will be minimal
    #[ignore]
    #[test]
    pub fn test_depth_4_write_small() {
        const MAX_ARITY_LEAVES: usize = 61;
        const MAX_DATA_PAYLOAD_SIZE: usize = 4084;

        ////// 52GB of data!
        let data_size = MAX_ARITY_LEAVES
            * MAX_ARITY_LEAVES
            * MAX_ARITY_LEAVES
            * MAX_ARITY_LEAVES
            * MAX_DATA_PAYLOAD_SIZE;

        // chunks of 5 MB
        let chunk_nbr = data_size / 5000000;
        let last_chunk = data_size % 5000000;

        let store = Store::dummy_public_v0();

        log_debug!("creating empty file");
        let mut file: RandomAccessFile = RandomAccessFile::new_empty(
            store_valid_value_size(0),
            "image/jpeg".to_string(),
            vec![],
            Arc::clone(&store),
        );

        log_debug!("{}", file);

        let chunk = vec![99; 5000000];
        let last_chunk = vec![99; last_chunk];

        for _i in 0..chunk_nbr {
            file.write(&chunk).expect("write a chunk");
        }

        file.write(&last_chunk).expect("write last chunk");

        log_debug!("{}", file);

        file.save().expect("save");

        log_debug!("{}", file);

        let file_size = file.size();
        log_debug!("file size: {}", file_size);

        log_debug!("data size: {}", data_size);

        assert_eq!(data_size, file.meta.total_size() as usize);

        assert_eq!(file.depth().unwrap(), 4);

        assert_eq!(store.len(), Ok(7));
    }

    /// Test open
    #[test]
    pub fn test_open() {
        let f = std::fs::File::open("tests/test.jpg").expect("open of tests/test.jpg");
        let mut reader = BufReader::new(f);
        let mut img_buffer: Vec<u8> = Vec::new();
        reader
            .read_to_end(&mut img_buffer)
            .expect("read of test.jpg");

        let store = Store::dummy_public_v0();

        log_debug!("creating file with the JPG content");
        let mut file: RandomAccessFile = RandomAccessFile::new_empty(
            store_max_value_size(), //store_valid_value_size(0),//
            "image/jpeg".to_string(),
            vec![],
            Arc::clone(&store),
        );

        log_debug!("{}", file);

        for chunk in img_buffer.chunks(1000) {
            file.write(chunk).expect("write a chunk");
        }

        file.save().expect("save");

        let file2 = RandomAccessFile::open(file.id().unwrap(), file.key.unwrap(), store)
            .expect("reopen file");

        // this works only because store_max_value_size() is bigger than the actual size of the JPEG file. so it fits in one block.
        let res = file2.read(0, img_buffer.len()).expect("read all");

        log_debug!("{}", file2);

        assert_eq!(res, img_buffer);

        // // asking too much, receiving an error, as now we know the total size of file, and we check it
        // assert_eq!(
        //     file2.read(0, img_buffer.len() + 1),
        //     Err(FileError::EndOfFile)
        // );

        // reading too far, well behind the size of the JPG
        assert_eq!(file2.read(100000, 1), Err(FileError::EndOfFile));

        assert_eq!(file2.read(10000, 1).expect("read after save"), vec![41]);

        // // reading one byte after the end of the file size.
        // assert_eq!(file2.read(29454, 1), Err(FileError::EndOfFile));

        assert_eq!(file2.read(29454, 0), Err(FileError::InvalidArgument));
    }

    /// Test read JPEG file small
    #[test]
    pub fn test_read_small_file() {
        let f = std::fs::File::open("tests/test.jpg").expect("open of tests/test.jpg");
        let mut reader = BufReader::new(f);
        let mut img_buffer: Vec<u8> = Vec::new();
        reader
            .read_to_end(&mut img_buffer)
            .expect("read of test.jpg");
        let len = img_buffer.len();
        let content = ObjectContent::new_file_v0_with_content(img_buffer.clone(), "image/jpeg");

        let max_object_size = store_max_value_size();
        let store = Store::dummy_public_v0();
        let mut obj = Object::new(content, None, max_object_size, &store);

        log_debug!("{}", obj);

        let _ = obj.save_in_test(&store).expect("save");

        let file = File::open(obj.id(), obj.key().unwrap(), store).expect("open");

        let res = file.read(0, len).expect("read all");

        assert_eq!(res, img_buffer);
    }

    /// Test read JPEG file random access
    #[test]
    pub fn test_read_random_access_file() {
        let f = std::fs::File::open("tests/test.jpg").expect("open of tests/test.jpg");
        let mut reader = BufReader::new(f);
        let mut img_buffer: Vec<u8> = Vec::new();
        reader
            .read_to_end(&mut img_buffer)
            .expect("read of test.jpg");
        let len = img_buffer.len();

        let max_object_size = store_max_value_size();
        let store = Store::dummy_public_v0();

        log_debug!("creating empty file");
        let mut file: RandomAccessFile = RandomAccessFile::new_empty(
            max_object_size,
            "image/jpeg".to_string(),
            vec![],
            Arc::clone(&store),
        );

        file.write(&img_buffer).expect("write all");

        log_debug!("{}", file);

        file.save().expect("save");

        log_debug!("{}", file);

        let file = File::open(
            file.id().unwrap(),
            file.key().as_ref().unwrap().clone(),
            store,
        )
        .expect("open");

        // this only works because we chose a big block size (1MB) so the small JPG file fits in one block.
        // if not, we would have to call read repeatedly and append the results into a buffer, in order to get the full file
        let res = file.read(0, len).expect("read all");

        assert_eq!(res, img_buffer);
    }

    /// Test depth 4, but using write in increments, so the memory burden on the system will be minimal
    #[ignore]
    #[test]
    pub fn test_depth_4_big_write_small() {
        let encoding_big_file = std::time::Instant::now();

        let f = std::fs::File::open("[enter path of a big file here]").expect("open of a big file");
        let mut reader = BufReader::new(f);

        let store = Store::dummy_public_v0();

        log_debug!("creating empty file");
        let mut file: RandomAccessFile = RandomAccessFile::new_empty(
            store_valid_value_size(0),
            "image/jpeg".to_string(),
            vec![],
            store,
        );

        log_debug!("{}", file);

        let mut chunk = [0u8; 1000000];

        loop {
            let size = reader.read(&mut chunk).expect("read a chunk");
            //log_debug!("{}", size);
            file.write(&chunk[0..size]).expect("write a chunk");
            if size != 1000000 {
                break;
            }
        }

        log_debug!("{}", file);

        file.save().expect("save");

        log_debug!("{}", file);

        log_debug!("data size: {}", file.meta.total_size());

        //assert_eq!(data_size, file.meta.total_size() as usize);

        assert_eq!(file.depth().unwrap(), 4);

        log_debug!(
            "encoding_big_file took: {} s",
            encoding_big_file.elapsed().as_secs_f32()
        );
    }

    /// Test depth 4 with 2.7GB of data, but using write in increments, so the memory burden on the system will be minimal
    #[ignore]
    #[test]
    pub fn test_depth_4_big_write_big() {
        let encoding_big_file = std::time::Instant::now();

        let f = std::fs::File::open("[enter path of a big file here]").expect("open of a big file");
        let mut reader = BufReader::new(f);

        let store = Store::dummy_public_v0();

        log_debug!("creating empty file");
        let mut file: RandomAccessFile = RandomAccessFile::new_empty(
            store_max_value_size(),
            "image/jpeg".to_string(),
            vec![],
            store,
        );

        log_debug!("{}", file);

        let mut chunk = [0u8; 2000000];

        loop {
            let size = reader.read(&mut chunk).expect("read a chunk");
            //log_debug!("{}", size);
            file.write(&chunk[0..size]).expect("write a chunk");
            if size != 2000000 {
                break;
            }
        }

        log_debug!("{}", file);

        file.save().expect("save");

        log_debug!("{}", file);

        log_debug!("data size: {}", file.meta.total_size());

        //assert_eq!(data_size, file.meta.total_size() as usize);

        assert_eq!(file.depth().unwrap(), 1);

        log_debug!(
            "encoding_big_file took: {} s",
            encoding_big_file.elapsed().as_secs_f32()
        );
    }
}
