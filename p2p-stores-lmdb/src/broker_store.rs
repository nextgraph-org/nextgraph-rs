// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0> 
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use p2p_repo::broker_store::*;
use p2p_repo::store::*;
use p2p_repo::types::*;
use p2p_repo::utils::*;

use debug_print::*;
use std::path::Path;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};

use rkv::backend::{
    BackendDatabaseFlags, BackendFlags, BackendIter, BackendWriteFlags, DatabaseFlags, Lmdb,
    LmdbDatabase, LmdbDatabaseFlags, LmdbEnvironment, LmdbRwTransaction, LmdbWriteFlags,
};
use rkv::{
    Manager, MultiStore, Rkv, SingleStore, StoreError, StoreOptions, Value, WriteFlags, Writer,
};

use serde::{Deserialize, Serialize};
use serde_bare::error::Error;

pub struct LmdbBrokerStore {
    /// the main store where all the properties of keys are stored
    main_store: MultiStore<LmdbDatabase>,
    /// the opened environment so we can create new transactions
    environment: Arc<RwLock<Rkv<LmdbEnvironment>>>,
    /// path for the storage backend data
    path: String,
}

impl BrokerStore for LmdbBrokerStore {
    /// Load a single value property from the store.
    fn get(&self, prefix: u8, key: &Vec<u8>, suffix: Option<u8>) -> Result<Vec<u8>, StorageError> {
        let property = Self::compute_property(prefix, key, suffix);
        let lock = self.environment.read().unwrap();
        let reader = lock.read().unwrap();
        let mut iter = self
            .main_store
            .get(&reader, property)
            .map_err(|e| StorageError::BackendError)?;
        match iter.next() {
            Some(Ok(val)) => Ok(val.1.to_bytes().unwrap()),
            Some(Err(_e)) => Err(StorageError::BackendError),
            None => Err(StorageError::NotFound),
        }
    }

    /// Load all the values of a property from the store.
    fn get_all(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
    ) -> Result<Vec<Vec<u8>>, StorageError> {
        let property = Self::compute_property(prefix, key, suffix);
        let lock = self.environment.read().unwrap();
        let reader = lock.read().unwrap();
        let mut iter = self
            .main_store
            .get(&reader, property)
            .map_err(|e| StorageError::BackendError)?;
        let mut vector: Vec<Vec<u8>> = vec![];
        while let res = iter.next() {
            vector.push(match res {
                Some(Ok(val)) => val.1.to_bytes().unwrap(),
                Some(Err(_e)) => return Err(StorageError::BackendError),
                None => {
                    break;
                }
            });
        }
        Ok(vector)
    }

    /// Check if a specific value exists for a property from the store.
    fn has_property_value(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: Vec<u8>,
    ) -> Result<(), StorageError> {
        let property = Self::compute_property(prefix, key, suffix);
        let lock = self.environment.read().unwrap();
        let reader = lock.read().unwrap();
        let exists = self
            .main_store
            .get_key_value(&reader, property, &Value::Blob(value.as_slice()))
            .map_err(|e| StorageError::BackendError)?;
        if exists {
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    /// Save a property value to the store.
    fn put(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: Vec<u8>,
    ) -> Result<(), StorageError> {
        let property = Self::compute_property(prefix, key, suffix);
        let lock = self.environment.read().unwrap();
        let mut writer = lock.write().unwrap();
        self.main_store
            .put(&mut writer, property, &Value::Blob(value.as_slice()))
            .map_err(|e| StorageError::BackendError)?;

        writer.commit().unwrap();

        Ok(())
    }

    /// Replace the property of a key (single value) to the store.
    fn replace(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: Vec<u8>,
    ) -> Result<(), StorageError> {
        let property = Self::compute_property(prefix, key, suffix);
        let lock = self.environment.read().unwrap();
        let mut writer = lock.write().unwrap();
        self.main_store
            .delete_all(&mut writer, property.clone())
            .map_err(|e| StorageError::BackendError)?;

        self.main_store
            .put(&mut writer, property, &Value::Blob(value.as_slice()))
            .map_err(|e| StorageError::BackendError)?;

        writer.commit().unwrap();

        Ok(())
    }

    /// Delete a property from the store.
    fn del(&self, prefix: u8, key: &Vec<u8>, suffix: Option<u8>) -> Result<(), StorageError> {
        let property = Self::compute_property(prefix, key, suffix);
        let lock = self.environment.read().unwrap();
        let mut writer = lock.write().unwrap();
        self.main_store
            .delete_all(&mut writer, property)
            .map_err(|e| StorageError::BackendError)?;

        writer.commit().unwrap();

        Ok(())
    }

    /// Delete a specific value for a property from the store.
    fn del_property_value(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: Vec<u8>,
    ) -> Result<(), StorageError> {
        let property = Self::compute_property(prefix, key, suffix);
        let lock = self.environment.read().unwrap();
        let mut writer = lock.write().unwrap();
        self.main_store
            .delete(&mut writer, property, &Value::Blob(value.as_slice()))
            .map_err(|e| StorageError::BackendError)?;

        writer.commit().unwrap();

        Ok(())
    }

    /// Delete all properties of a key from the store.
    fn del_all(&self, prefix: u8, key: &Vec<u8>, all_suffixes: &[u8]) -> Result<(), StorageError> {
        for suffix in all_suffixes {
            self.del(prefix, key, Some(*suffix))?;
        }
        if all_suffixes.is_empty() {
            self.del(prefix, key, None)?;
        }
        Ok(())
    }
}

impl LmdbBrokerStore {
    pub fn path(&self) -> PathBuf {
        PathBuf::from(&self.path)
    }

    fn compute_property(prefix: u8, key: &Vec<u8>, suffix: Option<u8>) -> Vec<u8> {
        let mut new: Vec<u8> = Vec::with_capacity(key.len() + 2);
        new.push(prefix);
        new.extend(key);
        if suffix.is_some() {
            new.push(suffix.unwrap())
        }
        new
    }

    /// Opens the store and returns a BrokerStore object that should be kept and used to manipulate Accounts, Overlays, Topics and options
    /// The key is the encryption key for the data at rest.
    pub fn open<'a>(path: &Path, key: [u8; 32]) -> LmdbBrokerStore {
        let mut manager = Manager::<LmdbEnvironment>::singleton().write().unwrap();
        let shared_rkv = manager
            .get_or_create(path, |path| {
                //Rkv::new::<Lmdb>(path) // use this instead to disable encryption
                Rkv::with_encryption_key_and_mapsize::<Lmdb>(path, key, 2 * 1024 * 1024 * 1024)
            })
            .unwrap();
        let env = shared_rkv.read().unwrap();

        println!("created env with LMDB Version: {}", env.version());

        let main_store = env.open_multi("main", StoreOptions::create()).unwrap();

        LmdbBrokerStore {
            environment: shared_rkv.clone(),
            main_store,
            path: path.to_str().unwrap().to_string(),
        }
    }
}
