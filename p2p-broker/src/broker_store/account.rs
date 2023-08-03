// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! User account

use std::collections::hash_map::DefaultHasher;
use std::hash::Hash;
use std::hash::Hasher;
use std::time::SystemTime;

use p2p_net::types::*;
use p2p_repo::kcv_store::KCVStore;
use p2p_repo::store::*;
use p2p_repo::types::Timestamp;
use serde_bare::{from_slice, to_vec};

pub struct Account<'a> {
    /// User ID
    id: UserId,
    store: &'a dyn KCVStore,
}

impl<'a> Account<'a> {
    const PREFIX: u8 = b"u"[0];
    const PREFIX_CLIENT: u8 = b"d"[0];

    // propertie's suffixes
    const CLIENT: u8 = b"c"[0];
    const ADMIN: u8 = b"a"[0];
    //const OVERLAY: u8 = b"o"[0];

    // propertie's client suffixes
    const INFO: u8 = b"i"[0];
    const LAST_SEEN: u8 = b"l"[0];

    const ALL_PROPERTIES: [u8; 2] = [Self::CLIENT, Self::ADMIN];

    const ALL_CLIENT_PROPERTIES: [u8; 2] = [Self::INFO, Self::LAST_SEEN];

    const SUFFIX_FOR_EXIST_CHECK: u8 = Self::ADMIN;

    pub fn open(id: &UserId, store: &'a dyn KCVStore) -> Result<Account<'a>, StorageError> {
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
        store: &'a dyn KCVStore,
    ) -> Result<Account<'a>, StorageError> {
        let acc = Account {
            id: id.clone(),
            store,
        };
        if acc.exists() {
            return Err(StorageError::AlreadyExists);
        }
        store.put(
            Self::PREFIX,
            &to_vec(&id)?,
            Some(Self::ADMIN),
            to_vec(&admin)?,
        )?;
        Ok(acc)
    }
    pub fn get_all_users(
        admins: bool,
        store: &'a dyn KCVStore,
    ) -> Result<Vec<UserId>, StorageError> {
        let size = to_vec(&UserId::nil())?.len();
        let mut res: Vec<UserId> = vec![];
        for user in store.get_all_keys_and_values(Self::PREFIX, size, Some(Self::ADMIN))? {
            let admin: bool = from_slice(&user.1)?;
            if admin == admins {
                let id: UserId = from_slice(&user.0[1..user.0.len() - 1])?;
                res.push(id);
            }
        }
        Ok(res)
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
    pub fn add_client(&self, client: &ClientId, info: &ClientInfo) -> Result<(), StorageError> {
        if !self.exists() {
            return Err(StorageError::BackendError);
        }

        let mut s = DefaultHasher::new();
        info.hash(&mut s);
        let hash = s.finish();

        let client_key = (client.clone(), hash);
        let client_key_ser = to_vec(&client_key)?;

        let info_ser = to_vec(info)?;

        self.store.write_transaction(&mut |tx| {
            if tx
                .has_property_value(
                    Self::PREFIX,
                    &to_vec(&self.id)?,
                    Some(Self::CLIENT),
                    &client_key_ser,
                )
                .is_err()
            {
                tx.put(
                    Self::PREFIX,
                    &to_vec(&self.id)?,
                    Some(Self::CLIENT),
                    &client_key_ser,
                )?;
            }
            if tx
                .has_property_value(
                    Self::PREFIX_CLIENT,
                    &client_key_ser,
                    Some(Self::INFO),
                    &info_ser,
                )
                .is_err()
            {
                tx.put(
                    Self::PREFIX_CLIENT,
                    &client_key_ser,
                    Some(Self::INFO),
                    &info_ser,
                )?;
            }
            let now = SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            tx.replace(
                Self::PREFIX_CLIENT,
                &client_key_ser,
                Some(Self::LAST_SEEN),
                &to_vec(&now)?,
            )?;
            Ok(())
        })
    }

    // pub fn has_client(&self, client: &ClientId) -> Result<(), StorageError> {
    //     self.store.has_property_value(
    //         Self::PREFIX,
    //         &to_vec(&self.id)?,
    //         Some(Self::CLIENT),
    //         to_vec(client)?,
    //     )
    // }

    // pub fn add_overlay(&self, overlay: &OverlayId) -> Result<(), StorageError> {
    //     if !self.exists() {
    //         return Err(StorageError::BackendError);
    //     }
    //     self.store.put(
    //         Self::PREFIX,
    //         &to_vec(&self.id)?,
    //         Some(Self::OVERLAY),
    //         to_vec(overlay)?,
    //     )
    // }
    // pub fn remove_overlay(&self, overlay: &OverlayId) -> Result<(), StorageError> {
    //     self.store.del_property_value(
    //         Self::PREFIX,
    //         &to_vec(&self.id)?,
    //         Some(Self::OVERLAY),
    //         to_vec(overlay)?,
    //     )
    // }

    // pub fn has_overlay(&self, overlay: &OverlayId) -> Result<(), StorageError> {
    //     self.store.has_property_value(
    //         Self::PREFIX,
    //         &to_vec(&self.id)?,
    //         Some(Self::OVERLAY),
    //         to_vec(overlay)?,
    //     )
    // }

    pub fn is_admin(&self) -> Result<bool, StorageError> {
        if self
            .store
            .has_property_value(
                Self::PREFIX,
                &to_vec(&self.id)?,
                Some(Self::ADMIN),
                &to_vec(&true)?,
            )
            .is_ok()
        {
            return Ok(true);
        }
        Ok(false)
    }

    pub fn del(&self) -> Result<(), StorageError> {
        self.store.write_transaction(&mut |tx| {
            if let Ok(clients) = tx.get_all(Self::PREFIX, &to_vec(&self.id)?, Some(Self::CLIENT)) {
                for client in clients {
                    tx.del_all(Self::PREFIX_CLIENT, &client, &Self::ALL_CLIENT_PROPERTIES)?;
                }
            }
            tx.del_all(Self::PREFIX, &to_vec(&self.id)?, &Self::ALL_PROPERTIES)?;
            Ok(())
        })
    }
}

#[cfg(test)]
mod test {

    use p2p_repo::store::*;
    use p2p_repo::types::*;
    use p2p_repo::utils::*;
    use std::fs;
    use stores_lmdb::kcv_store::LmdbKCVStore;
    use tempfile::Builder;

    use crate::broker_store::account::Account;

    #[test]
    pub fn test_account() {
        let path_str = "test-env";
        let root = Builder::new().prefix(path_str).tempdir().unwrap();
        let key: [u8; 32] = [0; 32];
        fs::create_dir_all(root.path()).unwrap();
        println!("{}", root.path().to_str().unwrap());
        let mut store = LmdbKCVStore::open(root.path(), key).unwrap();

        let user_id = PubKey::Ed25519PubKey([1; 32]);

        let account = Account::create(&user_id, true, &store).unwrap();
        println!("account created {}", account.id());

        let account2 = Account::open(&user_id, &store).unwrap();
        println!("account opened {}", account2.id());

        // let client_id = PubKey::Ed25519PubKey([56; 32]);
        // let client_id_not_added = PubKey::Ed25519PubKey([57; 32]);

        // account2.add_client(&client_id).unwrap();

        // assert!(account2.is_admin().unwrap());

        // account.has_client(&client_id).unwrap();
        // assert!(account.has_client(&client_id_not_added).is_err());
    }
}
