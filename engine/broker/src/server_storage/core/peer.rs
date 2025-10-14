// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Peer

use serde_bare::{from_slice, to_vec};

use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::KCVStorage;
use ng_repo::types::*;

use ng_net::types::*;

pub struct Peer<'a> {
    /// Topic ID
    id: PeerId,
    storage: &'a dyn KCVStorage,
}

impl<'a> Peer<'a> {
    const PREFIX: u8 = b"p"[0];

    // propertie's suffixes
    const VERSION: u8 = b"v"[0];
    const ADVERT: u8 = b"a"[0];

    const ALL_PROPERTIES: [u8; 2] = [Self::VERSION, Self::ADVERT];

    const SUFFIX_FOR_EXIST_CHECK: u8 = Self::VERSION;

    pub fn open(id: &PeerId, storage: &'a dyn KCVStorage) -> Result<Peer<'a>, StorageError> {
        let opening = Peer {
            id: id.clone(),
            storage,
        };
        if !opening.exists() {
            return Err(StorageError::NotFound);
        }
        Ok(opening)
    }
    pub fn update_or_create(
        advert: &PeerAdvert,
        storage: &'a dyn KCVStorage,
    ) -> Result<Peer<'a>, StorageError> {
        let id = advert.peer();
        match Self::open(id, storage) {
            Err(e) => {
                if e == StorageError::NotFound {
                    Self::create(advert, storage)
                } else {
                    Err(StorageError::BackendError)
                }
            }
            Ok(p) => {
                p.update_advert(advert)?;
                Ok(p)
            }
        }
    }
    pub fn create(
        advert: &PeerAdvert,
        storage: &'a dyn KCVStorage,
    ) -> Result<Peer<'a>, StorageError> {
        let id = advert.peer();
        let acc = Peer {
            id: id.clone(),
            storage,
        };
        if acc.exists() {
            return Err(StorageError::BackendError);
        }
        storage.write_transaction(&mut |tx| {
            tx.put(
                Self::PREFIX,
                &to_vec(&id)?,
                Some(Self::VERSION),
                &to_vec(&advert.version())?,
                &None,
            )?;
            tx.put(
                Self::PREFIX,
                &to_vec(&id)?,
                Some(Self::ADVERT),
                &to_vec(&advert)?,
                &None,
            )?;
            Ok(())
        })?;
        Ok(acc)
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
    pub fn id(&self) -> PeerId {
        self.id
    }
    pub fn version(&self) -> Result<u32, StorageError> {
        match self
            .storage
            .get(Self::PREFIX, &to_vec(&self.id)?, Some(Self::VERSION), &None)
        {
            Ok(ver) => Ok(from_slice::<u32>(&ver)?),
            Err(e) => Err(e),
        }
    }
    pub fn set_version(&self, version: u32) -> Result<(), StorageError> {
        if !self.exists() {
            return Err(StorageError::BackendError);
        }
        self.storage.replace(
            Self::PREFIX,
            &to_vec(&self.id)?,
            Some(Self::VERSION),
            &to_vec(&version)?,
            &None,
        )
    }
    pub fn update_advert(&self, advert: &PeerAdvert) -> Result<(), StorageError> {
        if advert.peer() != &self.id {
            return Err(StorageError::InvalidValue);
        }
        let current_advert = self.advert().map_err(|_| StorageError::BackendError)?;
        if current_advert.version() >= advert.version() {
            return Ok(());
        }
        self.storage.write_transaction(&mut |tx| {
            tx.replace(
                Self::PREFIX,
                &to_vec(&self.id)?,
                Some(Self::VERSION),
                &to_vec(&advert.version())?,
                &None,
            )?;
            tx.replace(
                Self::PREFIX,
                &to_vec(&self.id)?,
                Some(Self::ADVERT),
                &to_vec(&advert)?,
                &None,
            )?;
            Ok(())
        })
    }
    pub fn advert(&self) -> Result<PeerAdvert, StorageError> {
        match self
            .storage
            .get(Self::PREFIX, &to_vec(&self.id)?, Some(Self::ADVERT), &None)
        {
            Ok(advert) => Ok(from_slice::<PeerAdvert>(&advert)?),
            Err(e) => Err(e),
        }
    }
    pub fn set_advert(&self, advert: &PeerAdvert) -> Result<(), StorageError> {
        if !self.exists() {
            return Err(StorageError::BackendError);
        }
        self.storage.replace(
            Self::PREFIX,
            &to_vec(&self.id)?,
            Some(Self::ADVERT),
            &to_vec(advert)?,
            &None,
        )
    }

    pub fn del(&self) -> Result<(), StorageError> {
        self.storage.del_all(
            Self::PREFIX,
            &to_vec(&self.id)?,
            &Self::ALL_PROPERTIES,
            &None,
        )
    }
}
