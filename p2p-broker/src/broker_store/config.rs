// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Broker Config, persisted to store

use p2p_net::types::*;
use p2p_repo::broker_store::BrokerStore;
use p2p_repo::store::*;
use p2p_repo::types::*;
use serde::{Deserialize, Serialize};
use serde_bare::{from_slice, to_vec};

// TODO: versioning V0
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum ConfigMode {
    Local,
    Core,
}

pub struct Config<'a> {
    store: &'a dyn BrokerStore,
}

impl<'a> Config<'a> {
    const PREFIX: u8 = b"c"[0];

    const KEY: [u8; 5] = *b"onfig";

    // propertie's suffixes
    const MODE: u8 = b"m"[0];

    const ALL_PROPERTIES: [u8; 1] = [Self::MODE];

    const SUFFIX_FOR_EXIST_CHECK: u8 = Self::MODE;

    pub fn open(store: &'a dyn BrokerStore) -> Result<Config<'a>, StorageError> {
        let opening = Config { store };
        if !opening.exists() {
            return Err(StorageError::NotFound);
        }
        Ok(opening)
    }
    pub fn get_or_create(
        mode: &ConfigMode,
        store: &'a dyn BrokerStore,
    ) -> Result<Config<'a>, StorageError> {
        match Self::open(store) {
            Err(e) => {
                if e == StorageError::NotFound {
                    Self::create(mode, store)
                } else {
                    Err(StorageError::BackendError)
                }
            }
            Ok(p) => {
                if &p.mode().unwrap() != mode {
                    return Err(StorageError::InvalidValue);
                }
                Ok(p)
            }
        }
    }
    pub fn create(
        mode: &ConfigMode,
        store: &'a dyn BrokerStore,
    ) -> Result<Config<'a>, StorageError> {
        let acc = Config { store };
        if acc.exists() {
            return Err(StorageError::BackendError);
        }
        store.put(
            Self::PREFIX,
            &to_vec(&Self::KEY)?,
            Some(Self::MODE),
            to_vec(&mode)?,
        )?;
        Ok(acc)
    }
    pub fn exists(&self) -> bool {
        self.store
            .get(
                Self::PREFIX,
                &to_vec(&Self::KEY).unwrap(),
                Some(Self::SUFFIX_FOR_EXIST_CHECK),
            )
            .is_ok()
    }
    pub fn mode(&self) -> Result<ConfigMode, StorageError> {
        match self
            .store
            .get(Self::PREFIX, &to_vec(&Self::KEY)?, Some(Self::MODE))
        {
            Ok(ver) => Ok(from_slice::<ConfigMode>(&ver)?),
            Err(e) => Err(e),
        }
    }
}
