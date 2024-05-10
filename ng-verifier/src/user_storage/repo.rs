// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Repo Storage (Object Key/Col/Value Mapping)

use std::collections::HashMap;
use std::collections::HashSet;
use std::sync::{Arc, RwLock};

use either::{Either, Left, Right};
use serde_bare::from_slice;
use serde_bare::to_vec;

use ng_repo::block_storage::BlockStorage;
use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::prop;
use ng_repo::kcv_storage::KCVStorage;
#[allow(unused_imports)]
use ng_repo::log::*;
use ng_repo::repo::BranchInfo;
use ng_repo::repo::Repo;
use ng_repo::store::Store;
use ng_repo::types::*;

use super::branch::BranchStorage;

pub struct RepoStorage<'a> {
    storage: &'a dyn KCVStorage,
    id: RepoId,
}

impl<'a> RepoStorage<'a> {
    const PREFIX: u8 = b'r';

    // repo properties suffixes
    const SIGNER_CAP: u8 = b'a';
    //const SIGNER_CAP_PARTIAL: u8 = b'b';
    const CHAT_BRANCH: u8 = b'c';
    const DEFINITION: u8 = b'd';
    const STORE_BRANCH: u8 = b'e';
    const INHERIT: u8 = b'i';
    const OVERLAY_BRANCH: u8 = b'l';
    const MAIN_BRANCH: u8 = b'm';
    const OWNERS: u8 = b'o';
    const PINNED: u8 = b'p';
    const QUORUM: u8 = b'q';
    const READ_CAP: u8 = b'r';
    const STORE_REPO: u8 = b's';
    //const SIGNER_CAP_TOTAL: u8 = b't';
    const USER_BRANCH: u8 = b'u';
    const WRITE_CAP_SECRET: u8 = b'w';

    const ALL_PROPERTIES: [u8; 14] = [
        Self::SIGNER_CAP,
        //Self::SIGNER_CAP_PARTIAL,
        Self::CHAT_BRANCH,
        Self::DEFINITION,
        Self::STORE_BRANCH,
        Self::INHERIT,
        Self::OVERLAY_BRANCH,
        Self::MAIN_BRANCH,
        Self::OWNERS,
        Self::PINNED,
        Self::QUORUM,
        Self::READ_CAP,
        Self::STORE_REPO,
        //Self::SIGNER_CAP_TOTAL,
        Self::USER_BRANCH,
        Self::WRITE_CAP_SECRET,
    ];

    const PREFIX_BRANCHES: u8 = b'b';

    const SUFFIX_FOR_EXIST_CHECK: u8 = Self::READ_CAP;

    pub fn open(id: &RepoId, storage: &'a dyn KCVStorage) -> Result<RepoStorage<'a>, StorageError> {
        let opening = RepoStorage::new(id, storage);
        if !opening.exists() {
            return Err(StorageError::NotFound);
        }
        Ok(opening)
    }

    pub fn new(id: &RepoId, storage: &'a dyn KCVStorage) -> RepoStorage<'a> {
        RepoStorage {
            id: id.clone(),
            storage,
        }
    }

    pub fn create_from_repo(
        repo: &Repo,
        storage: &'a dyn KCVStorage,
    ) -> Result<RepoStorage<'a>, StorageError> {
        Self::create(
            &repo.id,
            repo.read_cap.as_ref().unwrap(),
            repo.write_cap.as_ref(),
            repo.signer.as_ref(),
            repo.store.get_store_repo(),
            &repo.repo_def,
            &repo.branches,
            storage,
        )
    }

    pub fn add_branch_from_info(
        repo_id: &RepoId,
        branch_info: &BranchInfo,
        storage: &'a dyn KCVStorage,
    ) -> Result<(), StorageError> {
        BranchStorage::create_from_info(branch_info, storage)?;
        storage.write_transaction(&mut |tx| {
            let repo_id_ser = to_vec(&repo_id)?;
            let branch_id_ser = to_vec(&branch_info.id)?;
            let mut key = Vec::with_capacity(repo_id_ser.len() + branch_id_ser.len());
            key.append(&mut repo_id_ser.clone());
            key.append(&mut branch_id_ser.clone());
            tx.put(Self::PREFIX_BRANCHES, &key, None, &vec![], &None)?;

            if branch_info.branch_type == BranchType::Store {
                tx.put(
                    Self::PREFIX,
                    &repo_id_ser,
                    Some(Self::STORE_BRANCH),
                    &branch_id_ser,
                    &None,
                )?;
            }
            Ok(())
        })?;
        Ok(())
    }

    pub fn update_signer_cap(
        signer_cap: &SignerCap,
        storage: &'a dyn KCVStorage,
    ) -> Result<(), StorageError> {
        let repo_id = signer_cap.repo;
        let _ = Self::new(&repo_id, storage);
        storage.write_transaction(&mut |tx| {
            let id_ser = to_vec(&repo_id)?;
            let value = to_vec(signer_cap)?;
            tx.put(Self::PREFIX, &id_ser, Some(Self::SIGNER_CAP), &value, &None)?;
            Ok(())
        })?;
        Ok(())
    }

    pub fn create(
        id: &RepoId,
        read_cap: &ReadCap,
        write_cap: Option<&RepoWriteCapSecret>,
        signer_cap: Option<&SignerCap>,
        store_repo: &StoreRepo,
        repo_def: &Repository,
        branches: &HashMap<BranchId, BranchInfo>,
        storage: &'a dyn KCVStorage,
    ) -> Result<RepoStorage<'a>, StorageError> {
        let repo = RepoStorage {
            id: id.clone(),
            storage,
        };
        if repo.exists() {
            return Err(StorageError::AlreadyExists);
        }

        let mut store_branch = None;

        // FIXME: use the same transaction for all branches and the repo
        for branch in branches.values() {
            BranchStorage::create_from_info(branch, storage)?;
            if branch.branch_type == BranchType::Store {
                store_branch = Some(branch.id);
            }
        }

        storage.write_transaction(&mut |tx| {
            let id_ser = to_vec(&id)?;
            let value = to_vec(read_cap)?;
            tx.put(Self::PREFIX, &id_ser, Some(Self::READ_CAP), &value, &None)?;
            let value = to_vec(store_repo)?;
            tx.put(Self::PREFIX, &id_ser, Some(Self::STORE_REPO), &value, &None)?;
            let value = to_vec(repo_def)?;
            tx.put(Self::PREFIX, &id_ser, Some(Self::DEFINITION), &value, &None)?;
            if let Some(wc) = write_cap {
                let value = to_vec(wc)?;
                tx.put(
                    Self::PREFIX,
                    &id_ser,
                    Some(Self::WRITE_CAP_SECRET),
                    &value,
                    &None,
                )?;
            }
            if let Some(sb) = store_branch {
                let value = to_vec(&sb)?;
                tx.put(
                    Self::PREFIX,
                    &id_ser,
                    Some(Self::STORE_BRANCH),
                    &value,
                    &None,
                )?;
            }
            if let Some(sc) = signer_cap {
                let value = to_vec(sc)?;
                tx.put(Self::PREFIX, &id_ser, Some(Self::SIGNER_CAP), &value, &None)?;
            }
            for branch in branches.keys() {
                let mut branch_ser = to_vec(branch)?;
                let mut key = Vec::with_capacity(id_ser.len() + branch_ser.len());
                key.append(&mut id_ser.clone());
                key.append(&mut branch_ser);
                tx.put(Self::PREFIX_BRANCHES, &key, None, &vec![], &None)?;
            }
            Ok(())
        })?;

        Ok(repo)
    }

    pub fn load(
        id: &RepoId,
        store: Either<Arc<Store>, Arc<RwLock<dyn BlockStorage + Send + Sync>>>,
        storage: &'a dyn KCVStorage,
    ) -> Result<Repo, StorageError> {
        //("LOADING repo {}", id);
        let branch_ids = Self::get_all_branches(id, storage)?;
        let mut branches = HashMap::new();
        let mut overlay_branch_read_cap = None;
        for branch in branch_ids {
            let info = BranchStorage::load(&branch, storage)?;
            if info.branch_type == BranchType::Overlay {
                overlay_branch_read_cap = Some(info.read_cap.clone());
            }
            //log_info!("LOADING BRANCH INFO {}", branch);
            //log_info!("TOPIC {}", info.topic);
            let _ = branches.insert(branch, info);
        }

        let props = storage.get_all_properties_of_key(
            Self::PREFIX,
            to_vec(id).unwrap(),
            Self::ALL_PROPERTIES.to_vec(),
            &None,
        )?;

        let store = match store {
            Left(s) => s,
            Right(bs) => {
                // we want to load a store. let's start by retrieving the store repo
                // TODO: check that it has a STORE_BRANCH
                let store_repo: StoreRepo =
                    prop(Self::STORE_REPO, &props).map_err(|_| StorageError::NotAStoreRepo)?;
                let store_info = branches.get(id).ok_or(StorageError::NotFound)?;
                let overlay_branch_read_cap = if store_repo.is_private() {
                    store_info.read_cap.clone()
                } else {
                    overlay_branch_read_cap.ok_or(StorageError::OverlayBranchNotFound)?
                };
                Arc::new(Store::new(
                    store_repo,
                    store_info.read_cap.clone(),
                    overlay_branch_read_cap,
                    bs,
                ))
            }
        };

        let repo = Repo {
            id: id.clone(),
            repo_def: prop(Self::DEFINITION, &props)?,
            read_cap: prop(Self::READ_CAP, &props)?,
            write_cap: prop(Self::WRITE_CAP_SECRET, &props).ok(),
            signer: prop(Self::SIGNER_CAP, &props).ok(),
            //TODO: members
            members: HashMap::new(),
            branches,
            opened_branches: HashMap::new(),
            store,
        };
        Ok(repo)
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

    pub fn get_all_branches(
        id: &RepoId,
        storage: &'a dyn KCVStorage,
    ) -> Result<Vec<BranchId>, StorageError> {
        let size = to_vec(&BranchId::nil())?.len();
        let key_prefix = to_vec(id).unwrap();
        let mut res: Vec<BranchId> = vec![];
        let key_prefix_len = key_prefix.len();
        let total_size = key_prefix_len + size;
        for branch in storage.get_all_keys_and_values(
            Self::PREFIX_BRANCHES,
            total_size,
            key_prefix,
            None,
            &None,
        )? {
            if branch.0.len() == total_size + 1 {
                let branch_id: BranchId =
                    from_slice(&branch.0[1 + key_prefix_len..total_size + 1])?;
                res.push(branch_id);
            }
        }
        Ok(res)
    }

    pub fn get_all_store_and_repo_ids(
        storage: &'a dyn KCVStorage,
    ) -> Result<HashMap<StoreRepo, Vec<RepoId>>, StorageError> {
        //log_info!("get_all_store_and_repo_ids");
        let mut res = HashMap::new();
        let size = to_vec(&RepoId::nil())?.len();
        let mut store_ids = HashSet::new();
        for (store_id_ser, _) in storage.get_all_keys_and_values(
            Self::PREFIX,
            size,
            vec![],
            Some(Self::STORE_BRANCH),
            &None,
        )? {
            let store_id: RepoId = from_slice(&store_id_ser[1..1 + size])?;
            //log_info!("FOUND store_id {}", store_id);
            store_ids.insert(store_id);
        }
        let mut repo_ids = HashMap::new();
        for (repo_id_ser, store_repo_ser) in storage.get_all_keys_and_values(
            Self::PREFIX,
            size,
            vec![],
            Some(Self::STORE_REPO),
            &None,
        )? {
            let repo_id: RepoId = from_slice(&repo_id_ser[1..1 + size])?;
            //log_info!("FOUND repo_id {}", repo_id);
            let store_repo: StoreRepo = from_slice(&store_repo_ser)?;
            repo_ids.insert(repo_id, store_repo);
        }

        for store in store_ids.iter() {
            let store_repo = repo_ids.get(store).ok_or(StorageError::NotAStoreRepo)?;
            res.insert(*store_repo, vec![]);
            //log_info!("INSERTED store_id {}", store);
        }

        for (repo_id, store_repo) in repo_ids.iter() {
            if store_ids.get(repo_id).is_none() {
                let repos = res.get_mut(store_repo).ok_or(StorageError::NotFound)?;
                repos.push(*repo_id);
                //log_info!("INSERTED repo_id {}", repo_id);
            }
        }

        Ok(res)
    }

    // pub fn get_type(&self) -> Result<u8, ProtocolError> {
    //     let type_ser = self
    //         .store
    //         .get(Self::PREFIX, &to_vec(&self.id)?, Some(Self::TYPE), &None)?;
    //     let t: (u8, u32, Option<String>) = from_slice(&type_ser)?;
    //     // if t.1 < now_timestamp() {
    //     //     return Err(ProtocolError::Expired);
    //     // }
    //     Ok(t.0)
    // }

    // pub fn is_expired(&self) -> Result<bool, StorageError> {
    //     let expire_ser =
    //         self.store
    //             .get(Self::PREFIX, &to_vec(&self.id)?, Some(Self::TYPE), &None)?;
    //     let expire: (u8, u32, Option<String>) = from_slice(&expire_ser)?;
    //     if expire.1 < now_timestamp() {
    //         return Ok(true);
    //     }
    //     Ok(false)
    // }

    pub fn del(&self) -> Result<(), StorageError> {
        self.storage.write_transaction(&mut |tx| {
            let key = &to_vec(&self.id)?;
            tx.del_all(Self::PREFIX, key, &Self::ALL_PROPERTIES, &None)?;
            let size = to_vec(&BranchId::nil())?.len();
            tx.del_all_values(Self::PREFIX_BRANCHES, key, size, None, &None)?;
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
