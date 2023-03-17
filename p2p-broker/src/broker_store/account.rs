// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0> 
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! User account

use p2p_repo::broker_store::BrokerStore;
use p2p_repo::store::*;
use p2p_repo::types::*;
use p2p_net::types::*;
use serde_bare::to_vec;

pub struct Account<'a> {
    /// User ID
    id: UserId,
    store: &'a dyn BrokerStore,
}

impl<'a> Account<'a> {
    const PREFIX: u8 = b"u"[0];

    // propertie's suffixes
    const CLIENT: u8 = b"c"[0];
    const ADMIN: u8 = b"a"[0];
    const OVERLAY: u8 = b"o"[0];

    const ALL_PROPERTIES: [u8; 3] = [Self::CLIENT, Self::ADMIN, Self::OVERLAY];

    const SUFFIX_FOR_EXIST_CHECK: u8 = Self::ADMIN;

    pub fn open(id: &UserId, store: &'a dyn BrokerStore) -> Result<Account<'a>, StorageError> {
        let opening = Account {
            id: id.clone(),
            store,
        };
        if !opening.exists() {
            return Err(StorageError::NotFound);
        }
        Ok(opening)
    }
    pub fn create(
        id: &UserId,
        admin: bool,
        store: &'a dyn BrokerStore,
    ) -> Result<Account<'a>, StorageError> {
        let acc = Account {
            id: id.clone(),
            store,
        };
        if acc.exists() {
            return Err(StorageError::BackendError);
        }
        store.put(
            Self::PREFIX,
            &to_vec(&id)?,
            Some(Self::ADMIN),
            to_vec(&admin)?,
        )?;
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
    pub fn id(&self) -> UserId {
        self.id
    }
    pub fn add_client(&self, client: &ClientId) -> Result<(), StorageError> {
        if !self.exists() {
            return Err(StorageError::BackendError);
        }
        self.store.put(
            Self::PREFIX,
            &to_vec(&self.id)?,
            Some(Self::CLIENT),
            to_vec(client)?,
        )
    }
    pub fn remove_client(&self, client: &ClientId) -> Result<(), StorageError> {
        self.store.del_property_value(
            Self::PREFIX,
            &to_vec(&self.id)?,
            Some(Self::CLIENT),
            to_vec(client)?,
        )
    }

    pub fn has_client(&self, client: &ClientId) -> Result<(), StorageError> {
        self.store.has_property_value(
            Self::PREFIX,
            &to_vec(&self.id)?,
            Some(Self::CLIENT),
            to_vec(client)?,
        )
    }

    pub fn add_overlay(&self, overlay: &OverlayId) -> Result<(), StorageError> {
        if !self.exists() {
            return Err(StorageError::BackendError);
        }
        self.store.put(
            Self::PREFIX,
            &to_vec(&self.id)?,
            Some(Self::OVERLAY),
            to_vec(overlay)?,
        )
    }
    pub fn remove_overlay(&self, overlay: &OverlayId) -> Result<(), StorageError> {
        self.store.del_property_value(
            Self::PREFIX,
            &to_vec(&self.id)?,
            Some(Self::OVERLAY),
            to_vec(overlay)?,
        )
    }

    pub fn has_overlay(&self, overlay: &OverlayId) -> Result<(), StorageError> {
        self.store.has_property_value(
            Self::PREFIX,
            &to_vec(&self.id)?,
            Some(Self::OVERLAY),
            to_vec(overlay)?,
        )
    }

    pub fn is_admin(&self) -> Result<bool, StorageError> {
        if self
            .store
            .has_property_value(
                Self::PREFIX,
                &to_vec(&self.id)?,
                Some(Self::ADMIN),
                to_vec(&true)?,
            )
            .is_ok()
        {
            return Ok(true);
        }
        Ok(false)
    }

    pub fn del(&self) -> Result<(), StorageError> {
        self.store
            .del_all(Self::PREFIX, &to_vec(&self.id)?, &Self::ALL_PROPERTIES)
    }
}

#[cfg(test)]
mod test {

    use p2p_repo::store::*;
    use p2p_repo::types::*;
    use p2p_repo::utils::*;
    use p2p_stores_lmdb::broker_store::LmdbBrokerStore;
    use std::fs;
    use tempfile::Builder;

    use crate::broker_store::account::Account;

    #[test]
    pub fn test_account() {
        let path_str = "test-env";
        let root = Builder::new().prefix(path_str).tempdir().unwrap();
        let key: [u8; 32] = [0; 32];
        fs::create_dir_all(root.path()).unwrap();
        println!("{}", root.path().to_str().unwrap());
        let mut store = LmdbBrokerStore::open(root.path(), key);

        let user_id = PubKey::Ed25519PubKey([1; 32]);

        let account = Account::create(&user_id, true, &store).unwrap();
        println!("account created {}", account.id());

        let account2 = Account::open(&user_id, &store).unwrap();
        println!("account opened {}", account2.id());

        let client_id = PubKey::Ed25519PubKey([56; 32]);
        let client_id_not_added = PubKey::Ed25519PubKey([57; 32]);

        account2.add_client(&client_id).unwrap();

        assert!(account2.is_admin().unwrap());

        account.has_client(&client_id).unwrap();
        assert!(account.has_client(&client_id_not_added).is_err());
    }
}
