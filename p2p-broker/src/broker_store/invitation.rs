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
use p2p_repo::utils::now_timestamp;
use serde_bare::from_slice;
use serde_bare::to_vec;

pub struct Invitation<'a> {
    /// User ID
    id: [u8; 32],
    store: &'a dyn KCVStore,
}

impl<'a> Invitation<'a> {
    const PREFIX: u8 = b"i"[0];

    // propertie's invitation suffixes
    const TYPE: u8 = b"t"[0];
    const EXPIRE: u8 = b"e"[0];

    const ALL_PROPERTIES: [u8; 2] = [Self::TYPE, Self::EXPIRE];

    const SUFFIX_FOR_EXIST_CHECK: u8 = Self::TYPE;

    pub fn open(id: &[u8; 32], store: &'a dyn KCVStore) -> Result<Invitation<'a>, StorageError> {
        let opening = Invitation {
            id: id.clone(),
            store,
        };
        if !opening.exists() {
            return Err(StorageError::NotFound);
        }
        Ok(opening)
    }
    pub fn create(
        id: &InvitationCode,
        expiry: u32,
        store: &'a dyn KCVStore,
    ) -> Result<Invitation<'a>, StorageError> {
        let (code_type, code) = match id {
            InvitationCode::Unique(c) => (0, c.slice()),
            InvitationCode::Multi(c) => (1, c.slice()),
            InvitationCode::Admin(c) => (2, c.slice()),
        };
        let acc = Invitation {
            id: code.clone(),
            store,
        };
        if acc.exists() {
            return Err(StorageError::BackendError);
        }
        store.write_transaction(&|tx| {
            tx.put(
                Self::PREFIX,
                &to_vec(code)?,
                Some(Self::TYPE),
                &to_vec(&code_type)?,
            )?;
            tx.put(
                Self::PREFIX,
                &to_vec(code)?,
                Some(Self::EXPIRE),
                &to_vec(&expiry)?,
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
    pub fn id(&self) -> [u8; 32] {
        self.id
    }

    pub fn is_expired(&self) -> Result<bool, StorageError> {
        let expire_ser = self
            .store
            .get(Self::PREFIX, &to_vec(&self.id)?, Some(Self::EXPIRE))?;
        let expire: u32 = from_slice(&expire_ser)?;
        if expire < now_timestamp() {
            return Ok(true);
        }
        Ok(false)
    }

    pub fn del(&self) -> Result<(), StorageError> {
        self.store.write_transaction(&|tx| {
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
        let mut store = LmdbKCVStore::open(root.path(), key);

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
