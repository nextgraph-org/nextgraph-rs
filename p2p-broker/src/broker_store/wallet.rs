// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Broker Wallet, persists to store all the SymKeys needed to open other storages

use p2p_net::types::*;
use p2p_repo::kcv_store::KCVStore;
use p2p_repo::store::*;
use p2p_repo::types::*;
use serde::{Deserialize, Serialize};
use serde_bare::{from_slice, to_vec};

pub struct Wallet<'a> {
    store: &'a dyn KCVStore,
}

impl<'a> Wallet<'a> {
    const PREFIX: u8 = b"w"[0];
    const PREFIX_OVERLAY: u8 = b"o"[0];
    const PREFIX_USER: u8 = b"u"[0];

    const KEY_ACCOUNTS: [u8; 8] = *b"accounts";
    const KEY_PEERS: [u8; 5] = *b"peers";

    // propertie's suffixes
    const SYM_KEY: u8 = b"s"[0];

    const ALL_PROPERTIES: [u8; 1] = [Self::SYM_KEY];

    const SUFFIX_FOR_EXIST_CHECK: u8 = Self::SYM_KEY;

    pub fn open(store: &'a dyn KCVStore) -> Wallet<'a> {
        Wallet { store }
    }
    pub fn get_or_create_single_key(
        &self,
        prefix: u8,
        key: &Vec<u8>,
    ) -> Result<SymKey, StorageError> {
        // FIXME. this get or create is not using a transaction, because calls will be made from the broker, that is behind a mutex.
        // if this was to change, we should make the get and put inside one transaction.
        let get = self
            .store
            .get(prefix, key, Some(Self::SUFFIX_FOR_EXIST_CHECK));
        match get {
            Err(e) => {
                if e == StorageError::NotFound {
                    self.create_single_key(prefix, key)
                } else {
                    Err(StorageError::BackendError)
                }
            }
            Ok(p) => {
                let k: SymKey = p
                    .as_slice()
                    .try_into()
                    .map_err(|_| StorageError::BackendError)?;
                Ok(k)
            }
        }
    }

    pub fn get_or_create_user_key(&self, user: &UserId) -> Result<SymKey, StorageError> {
        self.get_or_create_single_key(Self::PREFIX_USER, &to_vec(user)?)
    }

    pub fn get_or_create_overlay_key(&self, overlay: &OverlayId) -> Result<SymKey, StorageError> {
        self.get_or_create_single_key(Self::PREFIX_USER, &to_vec(overlay)?)
    }

    pub fn create_single_key(&self, prefix: u8, key: &Vec<u8>) -> Result<SymKey, StorageError> {
        let symkey = SymKey::random();
        let vec = symkey.slice().to_vec();
        self.store.put(prefix, key, Some(Self::SYM_KEY), vec)?;
        Ok(symkey)
    }
    pub fn exists_single_key(&self, prefix: u8, key: &Vec<u8>) -> bool {
        self.store
            .get(prefix, key, Some(Self::SUFFIX_FOR_EXIST_CHECK))
            .is_ok()
    }

    pub fn exists_accounts_key(&self) -> bool {
        self.exists_single_key(Self::PREFIX, &Self::KEY_ACCOUNTS.to_vec())
    }
    pub fn create_accounts_key(&self) -> Result<SymKey, StorageError> {
        self.create_single_key(Self::PREFIX, &Self::KEY_ACCOUNTS.to_vec())
    }
    pub fn get_or_create_peers_key(&self) -> Result<SymKey, StorageError> {
        self.get_or_create_single_key(Self::PREFIX, &Self::KEY_PEERS.to_vec())
    }
    pub fn get_or_create_accounts_key(&self) -> Result<SymKey, StorageError> {
        self.get_or_create_single_key(Self::PREFIX, &Self::KEY_ACCOUNTS.to_vec())
    }
}
