// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! User account Storage (Object Key/Col/Value Mapping)

use std::collections::hash_map::DefaultHasher;
use std::fmt;
use std::hash::Hash;
use std::hash::Hasher;
use std::time::SystemTime;

use serde_bare::{from_slice, to_vec};

use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::KCVStorage;
#[allow(unused_imports)]
use ng_repo::log::*;
use ng_repo::types::UserId;

use ng_net::types::*;

pub struct Account<'a> {
    /// User ID
    id: UserId,
    storage: &'a dyn KCVStorage,
}

impl<'a> fmt::Debug for Account<'a> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Account {}", self.id)
    }
}

impl<'a> Account<'a> {
    const PREFIX_ACCOUNT: u8 = b'a';
    const PREFIX_CLIENT: u8 = b'c';
    const PREFIX_CLIENT_PROPERTY: u8 = b'd';

    // propertie's client suffixes
    const INFO: u8 = b'i';
    const LAST_SEEN: u8 = b'l';
    const CREDENTIALS: u8 = b'c';
    //const USER_KEYS: u8 = b'k';

    const ALL_CLIENT_PROPERTIES: [u8; 3] = [
        Self::INFO,
        Self::LAST_SEEN,
        Self::CREDENTIALS,
        //Self::USER_KEYS,
    ];

    pub fn open(id: &UserId, storage: &'a dyn KCVStorage) -> Result<Account<'a>, StorageError> {
        let opening = Account {
            id: id.clone(),
            storage,
        };
        if !opening.exists() {
            return Err(StorageError::NotFound);
        }
        Ok(opening)
    }
    pub fn create(
        id: &UserId,
        admin: bool,
        storage: &'a dyn KCVStorage,
    ) -> Result<Account<'a>, StorageError> {
        let acc = Account {
            id: id.clone(),
            storage,
        };
        if acc.exists() {
            return Err(StorageError::AlreadyExists);
        }
        storage.put(
            Self::PREFIX_ACCOUNT,
            &to_vec(&id)?,
            None,
            &to_vec(&admin)?,
            &None,
        )?;
        Ok(acc)
    }

    #[allow(deprecated)]
    pub fn get_all_users(
        admins: bool,
        storage: &'a dyn KCVStorage,
    ) -> Result<Vec<UserId>, StorageError> {
        let size = to_vec(&UserId::nil())?.len();
        let mut res: Vec<UserId> = vec![];
        for user in
            storage.get_all_keys_and_values(Self::PREFIX_ACCOUNT, size, vec![], None, &None)?
        {
            let admin: bool = from_slice(&user.1)?;
            if admin == admins {
                let id: UserId = from_slice(&user.0[1..user.0.len()])?;
                res.push(id);
            }
        }
        Ok(res)
    }

    pub fn has_users(storage: &'a dyn KCVStorage) -> Result<bool, StorageError> {
        let size = to_vec(&UserId::nil())?.len();
        let mut res: Vec<UserId> = vec![];
        //TODO: fix this. we shouldn't have to fetch all the users to know if there is at least one user. highly inefficient. need to add a storage.has_one_key_value method
        Ok(!storage
            .get_all_keys_and_values(Self::PREFIX_ACCOUNT, size, vec![], None, &None)?
            .is_empty())
    }

    pub fn exists(&self) -> bool {
        self.storage
            .get(
                Self::PREFIX_ACCOUNT,
                &to_vec(&self.id).unwrap(),
                None,
                &None,
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
        let mut client_key_ser = to_vec(&client_key)?;

        let info_ser = to_vec(info)?;

        self.storage.write_transaction(&mut |tx| {
            let mut id_and_client = to_vec(&self.id)?;
            id_and_client.append(&mut client_key_ser);
            if tx
                .has_property_value(Self::PREFIX_CLIENT, &id_and_client, None, &vec![], &None)
                .is_err()
            {
                tx.put(Self::PREFIX_CLIENT, &id_and_client, None, &vec![], &None)?;
            }
            if tx
                .has_property_value(
                    Self::PREFIX_CLIENT_PROPERTY,
                    &id_and_client,
                    Some(Self::INFO),
                    &info_ser,
                    &None,
                )
                .is_err()
            {
                tx.put(
                    Self::PREFIX_CLIENT_PROPERTY,
                    &id_and_client,
                    Some(Self::INFO),
                    &info_ser,
                    &None,
                )?;
            }
            let now = SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            tx.replace(
                Self::PREFIX_CLIENT_PROPERTY,
                &id_and_client,
                Some(Self::LAST_SEEN),
                &to_vec(&now)?,
                &None,
            )?;
            Ok(())
        })
    }

    pub fn add_credentials(&self, credentials: &Credentials) -> Result<(), StorageError> {
        if !self.exists() {
            return Err(StorageError::BackendError);
        }
        self.storage.put(
            Self::PREFIX_ACCOUNT,
            &to_vec(&self.id)?,
            Some(Self::CREDENTIALS),
            &to_vec(credentials)?,
            &None,
        )
    }

    pub fn remove_credentials(&self) -> Result<(), StorageError> {
        self.storage.del(
            Self::PREFIX_ACCOUNT,
            &to_vec(&self.id)?,
            Some(Self::CREDENTIALS),
            &None,
        )
    }

    pub fn get_credentials(&self) -> Result<Credentials, StorageError> {
        Ok(from_slice(&self.storage.get(
            Self::PREFIX_ACCOUNT,
            &to_vec(&self.id)?,
            Some(Self::CREDENTIALS),
            &None,
        )?)?)
    }

    // pub fn add_user_keys(
    //     &self,
    //     storage_key: &SymKey,
    //     peer_priv_key: &PrivKey,
    // ) -> Result<(), StorageError> {
    //     if !self.exists() {
    //         return Err(StorageError::BackendError);
    //     }
    //     self.storage.put(
    //         Self::PREFIX_ACCOUNT,
    //         &to_vec(&self.id)?,
    //         Some(Self::USER_KEYS),
    //         &to_vec(&(storage_key.clone(), peer_priv_key.clone()))?,
    //         &None,
    //     )
    // }

    // pub fn remove_user_keys(&self) -> Result<(), StorageError> {
    //     self.storage.del(
    //         Self::PREFIX_ACCOUNT,
    //         &to_vec(&self.id)?,
    //         Some(Self::USER_KEYS),
    //         &None,
    //     )
    // }

    // pub fn get_user_keys(&self) -> Result<(SymKey, PrivKey), StorageError> {
    //     Ok(from_slice(&self.storage.get(
    //         Self::PREFIX_ACCOUNT,
    //         &to_vec(&self.id)?,
    //         Some(Self::USER_KEYS),
    //         &None,
    //     )?)?)
    // }

    // pub fn remove_overlay(&self, overlay: &OverlayId) -> Result<(), StorageError> {
    //     self.storage.del_property_value(
    //         Self::PREFIX,
    //         &to_vec(&self.id)?,
    //         Some(Self::OVERLAY),
    //         to_vec(overlay)?,
    //     )
    // }

    // pub fn has_overlay(&self, overlay: &OverlayId) -> Result<(), StorageError> {
    //     self.storage.has_property_value(
    //         Self::PREFIX,
    //         &to_vec(&self.id)?,
    //         Some(Self::OVERLAY),
    //         to_vec(overlay)?,
    //     )
    // }

    pub fn is_admin(&self) -> Result<bool, StorageError> {
        if self
            .storage
            .has_property_value(
                Self::PREFIX_ACCOUNT,
                &to_vec(&self.id)?,
                None,
                &to_vec(&true)?,
                &None,
            )
            .is_ok()
        {
            return Ok(true);
        }
        Ok(false)
    }

    pub fn del(&self) -> Result<(), StorageError> {
        self.storage.write_transaction(&mut |tx| {
            let id = to_vec(&self.id)?;
            // let mut id_and_client = to_vec(&self.id)?;
            // let client_key = (client.clone(), hash);
            // let mut client_key_ser = to_vec(&client_key)?;
            #[allow(deprecated)]
            let client_key = (ClientId::nil(), 0u64);
            let client_key_ser = to_vec(&client_key)?;
            let size = client_key_ser.len() + id.len();

            if let Ok(clients) =
                tx.get_all_keys_and_values(Self::PREFIX_CLIENT, size, id, None, &None)
            {
                for client in clients {
                    tx.del(Self::PREFIX_CLIENT, &client.0, None, &None)?;
                    tx.del_all(
                        Self::PREFIX_CLIENT_PROPERTY,
                        &client.0,
                        &Self::ALL_CLIENT_PROPERTIES,
                        &None,
                    )?;
                }
            }
            tx.del(Self::PREFIX_ACCOUNT, &to_vec(&self.id)?, None, &None)?;
            Ok(())
        })
    }
}

#[cfg(test)]
mod test {

    use ng_repo::types::*;
    use ng_storage_rocksdb::kcv_storage::RocksDbKCVStorage;
    use std::fs;
    use tempfile::Builder;

    use crate::server_storage::admin::account::Account;

    #[test]
    pub fn test_account() {
        let path_str = "test-env";
        let root = Builder::new().prefix(path_str).tempdir().unwrap();
        let key: [u8; 32] = [0; 32];
        fs::create_dir_all(root.path()).unwrap();
        println!("{}", root.path().to_str().unwrap());
        let storage = RocksDbKCVStorage::open(root.path(), key).unwrap();

        let user_id = PubKey::Ed25519PubKey([1; 32]);

        let account = Account::create(&user_id, true, &storage).unwrap();
        println!("account created {}", account.id());

        let account2 = Account::open(&user_id, &storage).unwrap();
        println!("account opened {}", account2.id());

        // let client_id = PubKey::Ed25519PubKey([56; 32]);
        // let client_id_not_added = PubKey::Ed25519PubKey([57; 32]);

        // account2.add_client(&client_id).unwrap();

        // assert!(account2.is_admin().unwrap());

        // account.has_client(&client_id).unwrap();
        // assert!(account.has_client(&client_id_not_added).is_err());
    }
}
