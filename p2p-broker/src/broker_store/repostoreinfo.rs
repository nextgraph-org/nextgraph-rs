// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! RepoStore information about each RepoStore
//! It contains the symKeys to open the RepoStores
//! A repoStore is identified by its repo pubkey if in local mode
//! In core mode, it is identified by the overlayid.

use p2p_net::types::*;
use p2p_repo::kcv_store::KCVStore;
use p2p_repo::store::*;
use p2p_repo::types::*;
use serde::{Deserialize, Serialize};
use serde_bare::{from_slice, to_vec};

// #[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
// pub enum RepoStoreId {
//     Overlay(OverlayId),
//     Repo(PubKey),
// }

// impl From<RepoStoreId> for String {
//     fn from(id: RepoStoreId) -> Self {
//         hex::encode(to_vec(&id).unwrap())
//     }
// }

pub struct RepoStoreInfo<'a> {
    /// RepoStore ID
    id: RepoHash,
    store: &'a dyn KCVStore,
}

impl<'a> RepoStoreInfo<'a> {
    const PREFIX: u8 = b"r"[0];

    // propertie's suffixes
    const KEY: u8 = b"k"[0];

    const ALL_PROPERTIES: [u8; 1] = [Self::KEY];

    const SUFFIX_FOR_EXIST_CHECK: u8 = Self::KEY;

    pub fn open(id: &RepoHash, store: &'a dyn KCVStore) -> Result<RepoStoreInfo<'a>, StorageError> {
        let opening = RepoStoreInfo {
            id: id.clone(),
            store,
        };
        if !opening.exists() {
            return Err(StorageError::NotFound);
        }
        Ok(opening)
    }
    pub fn create(
        id: &RepoHash,
        key: &SymKey,
        store: &'a dyn KCVStore,
    ) -> Result<RepoStoreInfo<'a>, StorageError> {
        let acc = RepoStoreInfo {
            id: id.clone(),
            store,
        };
        if acc.exists() {
            return Err(StorageError::BackendError);
        }
        store.put(Self::PREFIX, &to_vec(&id)?, Some(Self::KEY), to_vec(key)?)?;
        Ok(acc)
    }
    pub fn exists(&self) -> bool {
        self.store
            .get(
                Self::PREFIX,
                &to_vec(&self.id).unwrap(),
                Some(Self::SUFFIX_FOR_EXIST_CHECK),
            )
            .is_ok()
    }
    pub fn id(&self) -> &RepoHash {
        &self.id
    }
    pub fn key(&self) -> Result<SymKey, StorageError> {
        match self
            .store
            .get(Self::PREFIX, &to_vec(&self.id)?, Some(Self::KEY))
        {
            Ok(k) => Ok(from_slice::<SymKey>(&k)?),
            Err(e) => Err(e),
        }
    }
    pub fn del(&self) -> Result<(), StorageError> {
        self.store
            .del_all(Self::PREFIX, &to_vec(&self.id)?, &Self::ALL_PROPERTIES)
    }
}
