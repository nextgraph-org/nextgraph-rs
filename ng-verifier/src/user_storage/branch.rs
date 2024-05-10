// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Branch Storage (Object Key/Col/Value Mapping)

use serde_bare::from_slice;
use serde_bare::to_vec;

use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::prop;
use ng_repo::kcv_storage::KCVStorage;
use ng_repo::repo::BranchInfo;
use ng_repo::types::*;

use crate::types::FileName;

pub struct BranchStorage<'a> {
    storage: &'a dyn KCVStorage,
    id: BranchId,
}

impl<'a> BranchStorage<'a> {
    const PREFIX: u8 = b'c';

    // branch properties suffixes
    const TYPE: u8 = b'b';
    const PUBLISHER: u8 = b'p';
    const READ_CAP: u8 = b'r';
    const TOPIC: u8 = b't';

    const ALL_PROPERTIES: [u8; 4] = [Self::TYPE, Self::PUBLISHER, Self::READ_CAP, Self::TOPIC];

    const PREFIX_HEADS: u8 = b'h';

    const PREFIX_FILES: u8 = b'f';

    const SUFFIX_FOR_EXIST_CHECK: u8 = Self::TYPE;

    pub fn new(
        id: &BranchId,
        storage: &'a dyn KCVStorage,
    ) -> Result<BranchStorage<'a>, StorageError> {
        Ok(BranchStorage {
            id: id.clone(),
            storage,
        })
    }

    pub fn open(
        id: &BranchId,
        storage: &'a dyn KCVStorage,
    ) -> Result<BranchStorage<'a>, StorageError> {
        let opening = Self::new(id, storage)?;
        if !opening.exists() {
            return Err(StorageError::NotFound);
        }
        Ok(opening)
    }

    pub fn create_from_info(
        info: &BranchInfo,
        storage: &'a dyn KCVStorage,
    ) -> Result<BranchStorage<'a>, StorageError> {
        Self::create(
            &info.id,
            &info.read_cap,
            &info.branch_type,
            &info.topic,
            info.topic_priv_key.as_ref(),
            &info.current_heads,
            storage,
        )
    }

    //TODO: save all branch info under the repo_id (key prefix should be repo_id)

    pub fn create(
        id: &BranchId,
        read_cap: &ReadCap,
        branch_type: &BranchType,
        topic: &TopicId,
        publisher: Option<&BranchWriteCapSecret>,
        current_heads: &Vec<ObjectRef>,
        storage: &'a dyn KCVStorage,
    ) -> Result<BranchStorage<'a>, StorageError> {
        let bs = BranchStorage {
            id: id.clone(),
            storage,
        };
        // if bs.exists() {
        //     return Err(StorageError::AlreadyExists);
        // }

        storage.write_transaction(&mut |tx| {
            let id_ser = to_vec(&id)?;
            let value = to_vec(read_cap)?;
            tx.put(Self::PREFIX, &id_ser, Some(Self::READ_CAP), &value, &None)?;
            let value = to_vec(branch_type)?;
            tx.put(Self::PREFIX, &id_ser, Some(Self::TYPE), &value, &None)?;
            let value = to_vec(topic)?;
            tx.put(Self::PREFIX, &id_ser, Some(Self::TOPIC), &value, &None)?;
            if let Some(privkey) = publisher {
                let value = to_vec(privkey)?;
                tx.put(Self::PREFIX, &id_ser, Some(Self::PUBLISHER), &value, &None)?;
            }
            for head in current_heads {
                let mut head_ser = to_vec(head)?;
                let mut key = Vec::with_capacity(id_ser.len() + head_ser.len());
                key.append(&mut id_ser.clone());
                key.append(&mut head_ser);
                tx.put(Self::PREFIX_HEADS, &key, None, &vec![], &None)?;
            }
            Ok(())
        })?;
        Ok(bs)
    }

    pub fn load(id: &BranchId, storage: &'a dyn KCVStorage) -> Result<BranchInfo, StorageError> {
        let props = storage.get_all_properties_of_key(
            Self::PREFIX,
            to_vec(id).unwrap(),
            Self::ALL_PROPERTIES.to_vec(),
            &None,
        )?;

        let bs = BranchInfo {
            id: id.clone(),
            branch_type: prop(Self::TYPE, &props)?,
            read_cap: prop(Self::READ_CAP, &props)?,
            topic: prop(Self::TOPIC, &props)?,
            topic_priv_key: prop(Self::PUBLISHER, &props).ok(),
            current_heads: Self::get_all_heads(id, storage)?,
        };
        Ok(bs)
    }

    pub fn get_all_heads(
        id: &BranchId,
        storage: &'a dyn KCVStorage,
    ) -> Result<Vec<ObjectRef>, StorageError> {
        let size = to_vec(&ObjectRef::nil())?.len();
        let key_prefix = to_vec(id).unwrap();
        let key_prefix_len = key_prefix.len();
        let mut res: Vec<ObjectRef> = vec![];
        let total_size = key_prefix_len + size;
        for head in storage.get_all_keys_and_values(
            Self::PREFIX_HEADS,
            total_size,
            key_prefix,
            None,
            &None,
        )? {
            if head.0.len() == total_size + 1 {
                let head: ObjectRef = from_slice(&head.0[1 + key_prefix_len..total_size + 1])?;
                res.push(head);
            }
        }
        Ok(res)
    }

    pub fn add_file(&self, commit_id: &ObjectId, file: &FileName) -> Result<(), StorageError> {
        self.storage.write_transaction(&mut |tx| {
            let branch_id_ser = to_vec(&self.id)?;
            let commit_id_ser = to_vec(commit_id)?;
            let val = to_vec(file)?;
            let mut key = Vec::with_capacity(branch_id_ser.len() + commit_id_ser.len());
            key.append(&mut branch_id_ser.clone());
            key.append(&mut commit_id_ser.clone());
            tx.put(Self::PREFIX_FILES, &key, None, &val, &None)?;
            Ok(())
        })
    }

    pub fn get_all_files(
        id: &BranchId,
        storage: &'a dyn KCVStorage,
    ) -> Result<Vec<FileName>, StorageError> {
        let size = to_vec(&ObjectId::nil())?.len();
        let key_prefix = to_vec(id).unwrap();
        let key_prefix_len = key_prefix.len();
        let mut res: Vec<FileName> = vec![];
        let total_size = key_prefix_len + size;
        for file in storage.get_all_keys_and_values(
            Self::PREFIX_FILES,
            total_size,
            key_prefix,
            None,
            &None,
        )? {
            if file.0.len() == total_size + 1 {
                let file: FileName = from_slice(&file.1)?;
                res.push(file);
            }
        }
        Ok(res)
    }

    pub fn exists(&self) -> bool {
        self.storage
            .get(
                Self::PREFIX,
                &to_vec(&self.id).unwrap(),
                Some(Self::SUFFIX_FOR_EXIST_CHECK),
                &None,
            )
            .is_ok()
    }
    pub fn id(&self) -> &RepoId {
        &self.id
    }

    pub fn replace_current_heads(&self, new_heads: Vec<ObjectRef>) -> Result<(), StorageError> {
        self.storage.write_transaction(&mut |tx| {
            let id_ser = &to_vec(&self.id)?;
            let size = to_vec(&ObjectRef::nil())?.len();
            tx.del_all_values(Self::PREFIX_HEADS, id_ser, size, None, &None)?;
            for head in new_heads.iter() {
                let mut head_ser = to_vec(head)?;
                let mut key = Vec::with_capacity(id_ser.len() + head_ser.len());
                key.append(&mut id_ser.clone());
                key.append(&mut head_ser);
                tx.put(Self::PREFIX_HEADS, &key, None, &vec![], &None)?;
            }
            Ok(())
        })
    }

    pub fn del(&self) -> Result<(), StorageError> {
        self.storage.write_transaction(&mut |tx| {
            let key = &to_vec(&self.id)?;
            tx.del_all(Self::PREFIX, key, &Self::ALL_PROPERTIES, &None)?;
            let size = to_vec(&ObjectRef::nil())?.len();
            tx.del_all_values(Self::PREFIX_HEADS, key, size, None, &None)?;
            Ok(())
        })
    }
}

#[cfg(test)]
mod test {

    use ng_repo::errors::StorageError;
    use ng_repo::types::*;
    use ng_repo::utils::*;
    use std::fs;

    #[test]
    pub fn test_repo() {}
}
