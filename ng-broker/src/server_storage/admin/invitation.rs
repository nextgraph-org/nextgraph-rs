// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! User account Storage (Object Key/Col/Value Mapping)

use serde_bare::from_slice;
use serde_bare::to_vec;

use ng_repo::errors::ProtocolError;
use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::KCVStorage;
use ng_repo::types::SymKey;
use ng_repo::utils::now_timestamp;

use ng_net::types::*;

pub struct Invitation<'a> {
    /// code
    id: [u8; 32],
    storage: &'a dyn KCVStorage,
}

impl<'a> Invitation<'a> {
    const PREFIX: u8 = b'i';

    // propertie's invitation suffixes
    const TYPE: u8 = b't';
    //const EXPIRE: u8 = b'e';

    const ALL_PROPERTIES: [u8; 1] = [Self::TYPE];

    const SUFFIX_FOR_EXIST_CHECK: u8 = Self::TYPE;

    pub fn open(
        id: &[u8; 32],
        storage: &'a dyn KCVStorage,
    ) -> Result<Invitation<'a>, StorageError> {
        let opening = Invitation {
            id: id.clone(),
            storage,
        };
        if !opening.exists() {
            return Err(StorageError::NotFound);
        }
        Ok(opening)
    }
    pub fn create(
        id: &InvitationCode,
        expiry: u32,
        memo: &Option<String>,
        storage: &'a dyn KCVStorage,
    ) -> Result<Invitation<'a>, StorageError> {
        let (code_type, code) = match id {
            InvitationCode::Unique(c) => (0u8, c.slice()),
            InvitationCode::Multi(c) => (1u8, c.slice()),
            InvitationCode::Admin(c) => (2u8, c.slice()),
        };
        let acc = Invitation {
            id: code.clone(),
            storage,
        };
        if acc.exists() {
            return Err(StorageError::BackendError);
        }
        let value = to_vec(&(code_type, expiry, memo.clone()))?;
        storage.write_transaction(&mut |tx| {
            tx.put(
                Self::PREFIX,
                &to_vec(code)?,
                Some(Self::TYPE),
                &value,
                &None,
            )?;
            Ok(())
        })?;
        Ok(acc)
    }

    pub fn get_all_invitations(
        storage: &'a dyn KCVStorage,
        mut admin: bool,
        mut unique: bool,
        mut multi: bool,
    ) -> Result<Vec<(InvitationCode, u32, Option<String>)>, StorageError> {
        let size = to_vec(&[0u8; 32])?.len();
        let mut res: Vec<(InvitationCode, u32, Option<String>)> = vec![];
        if !admin && !unique && !multi {
            admin = true;
            unique = true;
            multi = true;
        }
        for invite in storage.get_all_keys_and_values(Self::PREFIX, size, vec![], None, &None)? {
            if invite.0.len() == size + 2 {
                let code: [u8; 32] = from_slice(&invite.0[1..invite.0.len() - 1])?;
                if invite.0[size + 1] == Self::TYPE {
                    let code_type: (u8, u32, Option<String>) = from_slice(&invite.1)?;
                    let inv_code = match code_type {
                        (0, ex, memo) => {
                            if unique {
                                Some((InvitationCode::Unique(SymKey::ChaCha20Key(code)), ex, memo))
                            } else {
                                None
                            }
                        }
                        (1, ex, memo) => {
                            if multi {
                                Some((InvitationCode::Multi(SymKey::ChaCha20Key(code)), ex, memo))
                            } else {
                                None
                            }
                        }
                        (2, ex, memo) => {
                            if admin {
                                Some((InvitationCode::Admin(SymKey::ChaCha20Key(code)), ex, memo))
                            } else {
                                None
                            }
                        }
                        _ => panic!("invalid code type value"),
                    };
                    if inv_code.is_some() {
                        res.push(inv_code.unwrap());
                    }
                }
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
    pub fn id(&self) -> [u8; 32] {
        self.id
    }

    pub fn get_type(&self) -> Result<u8, ProtocolError> {
        let type_ser =
            self.storage
                .get(Self::PREFIX, &to_vec(&self.id)?, Some(Self::TYPE), &None)?;
        let t: (u8, u32, Option<String>) = from_slice(&type_ser)?;
        // if t.1 < now_timestamp() {
        //     return Err(ProtocolError::Expired);
        // }
        Ok(t.0)
    }

    pub fn is_expired(&self) -> Result<bool, StorageError> {
        let expire_ser =
            self.storage
                .get(Self::PREFIX, &to_vec(&self.id)?, Some(Self::TYPE), &None)?;
        let expire: (u8, u32, Option<String>) = from_slice(&expire_ser)?;
        if expire.1 < now_timestamp() {
            return Ok(true);
        }
        Ok(false)
    }

    pub fn del(&self) -> Result<(), StorageError> {
        self.storage.write_transaction(&mut |tx| {
            tx.del_all(
                Self::PREFIX,
                &to_vec(&self.id)?,
                &Self::ALL_PROPERTIES,
                &None,
            )?;
            Ok(())
        })
    }
}
