// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! ng-one bootstrap

use ng_net::types::*;
use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::KCVStore;
use ng_repo::types::PubKey;

use serde::{Deserialize, Serialize};
use serde_bare::{from_slice, to_vec};

pub struct DynPeer<'a> {
    /// peer ID
    id: PubKey,
    store: &'a dyn KCVStore,
}

impl<'a> DynPeer<'a> {
    const PREFIX: u8 = b"d"[0];

    // properties' suffixes
    const ADDRS: u8 = b"a"[0];

    const ALL_PROPERTIES: [u8; 1] = [Self::ADDRS];

    const SUFFIX_FOR_EXIST_CHECK: u8 = Self::ADDRS;

    pub fn open(id: &PubKey, store: &'a dyn KCVStore) -> Result<DynPeer<'a>, StorageError> {
        let opening = DynPeer {
            id: id.clone(),
            store,
        };
        if !opening.exists() {
            return Err(StorageError::NotFound);
        }
        Ok(opening)
    }
    pub fn create(
        id: &PubKey,
        addrs: &Vec<NetAddr>,
        store: &'a dyn KCVStore,
    ) -> Result<DynPeer<'a>, StorageError> {
        let acc = DynPeer {
            id: id.clone(),
            store,
        };
        if acc.exists() {
            return Err(StorageError::BackendError);
        }
        store.write_transaction(&mut |tx| {
            tx.put(
                Self::PREFIX,
                &to_vec(&id)?,
                Some(Self::ADDRS),
                &to_vec(&addrs)?,
            )?;
            Ok(())
        })?;
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
    pub fn id(&self) -> PubKey {
        self.id
    }
    pub fn replace_addresses(&self, addrs: &Vec<NetAddr>) -> Result<(), StorageError> {
        if !self.exists() {
            return Err(StorageError::BackendError);
        }
        self.store.replace(
            Self::PREFIX,
            &to_vec(&self.id)?,
            Some(Self::ADDRS),
            to_vec(addrs)?,
        )
    }
    pub fn remove_addresses(&self) -> Result<(), StorageError> {
        self.store
            .del(Self::PREFIX, &to_vec(&self.id)?, Some(Self::ADDRS))
    }

    pub fn del(&self) -> Result<(), StorageError> {
        self.store
            .del_all(Self::PREFIX, &to_vec(&self.id)?, &Self::ALL_PROPERTIES)
    }
}
