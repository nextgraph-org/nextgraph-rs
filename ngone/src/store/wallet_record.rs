// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! ng-wallet

use ng_wallet::types::*;
use p2p_repo::kcv_store::KCVStore;
use p2p_repo::store::*;
use p2p_repo::types::*;
use serde::{Deserialize, Serialize};
use serde_bare::{from_slice, to_vec};

pub struct WalletRecord<'a> {
    /// Wallet ID
    id: WalletId,
    store: &'a dyn KCVStore,
}

impl<'a> WalletRecord<'a> {
    const PREFIX: u8 = b"w"[0];

    // properties' suffixes
    const WALLET: u8 = b"w"[0];
    const BOOTSTRAP: u8 = b"b"[0];

    const ALL_PROPERTIES: [u8; 2] = [Self::BOOTSTRAP, Self::WALLET];

    const SUFFIX_FOR_EXIST_CHECK: u8 = Self::BOOTSTRAP;

    pub fn open(id: &WalletId, store: &'a dyn KCVStore) -> Result<WalletRecord<'a>, StorageError> {
        let opening = WalletRecord {
            id: id.clone(),
            store,
        };
        if !opening.exists() {
            return Err(StorageError::NotFound);
        }
        Ok(opening)
    }
    pub fn create(
        id: &WalletId,
        bootstrap: &Bootstrap,
        store: &'a dyn KCVStore,
    ) -> Result<WalletRecord<'a>, StorageError> {
        let wallet = WalletRecord {
            id: id.clone(),
            store,
        };
        if wallet.exists() {
            return Err(StorageError::BackendError);
        }
        store.write_transaction(&|tx| {
            tx.put(
                Self::PREFIX,
                &to_vec(&id)?,
                Some(Self::BOOTSTRAP),
                &to_vec(bootstrap)?,
            )?;
            Ok(())
        })?;
        Ok(wallet)
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
    pub fn id(&self) -> WalletId {
        self.id
    }
    pub fn replace_wallet(&self, wallet: &Wallet) -> Result<(), StorageError> {
        if !self.exists() {
            return Err(StorageError::BackendError);
        }
        self.store.replace(
            Self::PREFIX,
            &to_vec(&self.id)?,
            Some(Self::WALLET),
            to_vec(wallet)?,
        )
    }

    pub fn replace_bootstrap(&self, boot: &Bootstrap) -> Result<(), StorageError> {
        if !self.exists() {
            return Err(StorageError::BackendError);
        }
        self.store.replace(
            Self::PREFIX,
            &to_vec(&self.id)?,
            Some(Self::BOOTSTRAP),
            to_vec(boot)?,
        )
    }

    pub fn wallet(&self) -> Result<Wallet, StorageError> {
        match self
            .store
            .get(Self::PREFIX, &to_vec(&self.id)?, Some(Self::WALLET))
        {
            Ok(w) => Ok(from_slice::<Wallet>(&w)?),
            Err(e) => Err(e),
        }
    }

    pub fn bootstrap(&self) -> Result<Bootstrap, StorageError> {
        match self
            .store
            .get(Self::PREFIX, &to_vec(&self.id)?, Some(Self::BOOTSTRAP))
        {
            Ok(meta) => Ok(from_slice::<Bootstrap>(&meta)?),
            Err(e) => Err(e),
        }
    }

    pub fn del(&self) -> Result<(), StorageError> {
        self.store
            .del_all(Self::PREFIX, &to_vec(&self.id)?, &Self::ALL_PROPERTIES)
    }
}
