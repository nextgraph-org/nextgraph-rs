// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use ng_repo::kcv_store::*;
use ng_repo::store::*;
use ng_repo::types::*;
use ng_repo::utils::*;

use ng_repo::log::*;
use rkv::backend::BackendEnvironmentBuilder;
use rkv::EnvironmentFlags;
use std::path::Path;
use std::path::PathBuf;
use std::sync::RwLockReadGuard;
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

pub struct LmdbTransaction<'a> {
    store: &'a LmdbKCVStore,
    writer: Option<Writer<LmdbRwTransaction<'a>>>,
}

impl<'a> LmdbTransaction<'a> {
    fn commit(&mut self) {
        self.writer.take().unwrap().commit().unwrap();
    }
}

impl<'a> ReadTransaction for LmdbTransaction<'a> {
    fn get_all_keys_and_values(
        &self,
        prefix: u8,
        key_size: usize,
        key_prefix: Vec<u8>,
        suffix: Option<u8>,
    ) -> Result<Vec<(Vec<u8>, Vec<u8>)>, StorageError> {
        unimplemented!();
    }
    /// Load a single value property from the store.
    fn get(&self, prefix: u8, key: &Vec<u8>, suffix: Option<u8>) -> Result<Vec<u8>, StorageError> {
        let property = LmdbKCVStore::compute_property(prefix, key, suffix);

        let mut iter = self
            .store
            .main_store
            .get(self.writer.as_ref().unwrap(), property)
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
        let property = LmdbKCVStore::compute_property(prefix, key, suffix);

        let mut iter = self
            .store
            .main_store
            .get(self.writer.as_ref().unwrap(), property)
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
        value: &Vec<u8>,
    ) -> Result<(), StorageError> {
        let property = LmdbKCVStore::compute_property(prefix, key, suffix);

        let exists = self
            .store
            .main_store
            .get_key_value(
                self.writer.as_ref().unwrap(),
                property,
                &Value::Blob(value.as_slice()),
            )
            .map_err(|e| StorageError::BackendError)?;
        if exists {
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }
}

impl<'a> WriteTransaction for LmdbTransaction<'a> {
    /// Save a property value to the store.
    fn put(
        &mut self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
    ) -> Result<(), StorageError> {
        let property = LmdbKCVStore::compute_property(prefix, key, suffix);
        self.store
            .main_store
            .put(
                self.writer.as_mut().unwrap(),
                property,
                &Value::Blob(value.as_slice()),
            )
            .map_err(|e| StorageError::BackendError)?;

        Ok(())
    }

    /// Replace the property of a key (single value) to the store.
    fn replace(
        &mut self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
    ) -> Result<(), StorageError> {
        let property = LmdbKCVStore::compute_property(prefix, key, suffix);

        self.store
            .main_store
            .delete_all(self.writer.as_mut().unwrap(), property.clone())
            .map_err(|e| StorageError::BackendError)?;

        self.store
            .main_store
            .put(
                self.writer.as_mut().unwrap(),
                property,
                &Value::Blob(value.as_slice()),
            )
            .map_err(|e| StorageError::BackendError)?;

        Ok(())
    }

    /// Delete a property from the store.
    fn del(&mut self, prefix: u8, key: &Vec<u8>, suffix: Option<u8>) -> Result<(), StorageError> {
        let property = LmdbKCVStore::compute_property(prefix, key, suffix);
        let res = self
            .store
            .main_store
            .delete_all(self.writer.as_mut().unwrap(), property);
        if res.is_err() {
            if let StoreError::KeyValuePairNotFound = res.unwrap_err() {
                return Ok(());
            }
            return Err(StorageError::BackendError);
        }
        Ok(())
    }

    /// Delete a specific value for a property from the store.
    fn del_property_value(
        &mut self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
    ) -> Result<(), StorageError> {
        let property = LmdbKCVStore::compute_property(prefix, key, suffix);
        self.store
            .main_store
            .delete(
                self.writer.as_mut().unwrap(),
                property,
                &Value::Blob(value.as_slice()),
            )
            .map_err(|e| StorageError::BackendError)?;

        Ok(())
    }

    /// Delete all properties of a key from the store.
    fn del_all(
        &mut self,
        prefix: u8,
        key: &Vec<u8>,
        all_suffixes: &[u8],
    ) -> Result<(), StorageError> {
        for suffix in all_suffixes {
            self.del(prefix, key, Some(*suffix))?;
        }
        if all_suffixes.is_empty() {
            self.del(prefix, key, None)?;
        }
        Ok(())
    }
}

#[derive(Debug)]
pub struct LmdbKCVStore {
    /// the main store where all the properties of keys are stored
    main_store: MultiStore<LmdbDatabase>,
    /// the opened environment so we can create new transactions
    environment: Arc<RwLock<Rkv<LmdbEnvironment>>>,
    /// path for the storage backend data
    path: String,
}

fn compare<T: Ord>(a: &[T], b: &[T]) -> std::cmp::Ordering {
    let mut iter_b = b.iter();
    for v in a {
        match iter_b.next() {
            Some(w) => match v.cmp(w) {
                std::cmp::Ordering::Equal => continue,
                ord => return ord,
            },
            None => break,
        }
    }
    return a.len().cmp(&b.len());
}

impl ReadTransaction for LmdbKCVStore {
    fn get_all_keys_and_values(
        &self,
        prefix: u8,
        key_size: usize,
        key_prefix: Vec<u8>,
        suffix: Option<u8>,
    ) -> Result<Vec<(Vec<u8>, Vec<u8>)>, StorageError> {
        let mut vec_key_start = key_prefix.clone();
        let mut trailing_zeros = vec![0u8; key_size - key_prefix.len()];
        vec_key_start.append(&mut trailing_zeros);

        let mut vec_key_end = key_prefix.clone();
        let mut trailing_max = vec![255u8; key_size - key_prefix.len()];
        vec_key_end.append(&mut trailing_max);

        let property_start = Self::compute_property(prefix, &vec_key_start, suffix);
        let property_end =
            Self::compute_property(prefix, &vec_key_end, Some(suffix.unwrap_or(255u8)));
        let lock = self.environment.read().unwrap();
        let reader = lock.read().unwrap();
        let mut iter = self
            .main_store
            .iter_from(&reader, property_start)
            .map_err(|e| StorageError::BackendError)?;
        let mut vector: Vec<(Vec<u8>, Vec<u8>)> = vec![];
        while let res = iter.next() {
            match res {
                Some(Ok(val)) => {
                    match compare(val.0, property_end.as_slice()) {
                        std::cmp::Ordering::Less | std::cmp::Ordering::Equal => {
                            if suffix.is_some() {
                                if val.0.len() < (key_size + 2)
                                    || val.0[1 + key_size] != suffix.unwrap()
                                {
                                    continue;
                                }
                                // } else if val.0.len() > (key_size + 1) {
                                //     continue;
                            }
                            vector.push((val.0.to_vec(), val.1.to_bytes().unwrap()));
                        }
                        _ => {} //,
                    }
                }
                Some(Err(_e)) => return Err(StorageError::BackendError),
                None => {
                    break;
                }
            }
        }
        Ok(vector)
    }

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
        value: &Vec<u8>,
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
}

impl KCVStore for LmdbKCVStore {
    fn write_transaction(
        &self,
        method: &mut dyn FnMut(&mut dyn WriteTransaction) -> Result<(), StorageError>,
    ) -> Result<(), StorageError> {
        let lock = self.environment.read().unwrap();
        let writer = lock.write().unwrap();

        let mut transaction = LmdbTransaction {
            store: self,
            writer: Some(writer),
        };
        let res = method(&mut transaction);
        if res.is_ok() {
            transaction.commit();
            //lock.sync(true);
        }
        res
    }

    /// Save a property value to the store.
    fn put(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: Vec<u8>,
    ) -> Result<(), StorageError> {
        self.write_transaction(&mut |tx| tx.put(prefix, key, suffix, &value))
    }

    /// Replace the property of a key (single value) to the store.
    fn replace(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: Vec<u8>,
    ) -> Result<(), StorageError> {
        self.write_transaction(&mut |tx| tx.replace(prefix, key, suffix, &value))
    }

    /// Delete a property from the store.
    fn del(&self, prefix: u8, key: &Vec<u8>, suffix: Option<u8>) -> Result<(), StorageError> {
        self.write_transaction(&mut |tx| tx.del(prefix, key, suffix))
    }

    /// Delete a specific value for a property from the store.
    fn del_property_value(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: Vec<u8>,
    ) -> Result<(), StorageError> {
        self.write_transaction(&mut |tx| tx.del_property_value(prefix, key, suffix, &value))
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

impl LmdbKCVStore {
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

    /// Opens the store and returns a KCVStore object that should be kept and used to manipulate the properties
    /// The key is the encryption key for the data at rest.
    pub fn open<'a>(path: &Path, key: [u8; 32]) -> Result<LmdbKCVStore, StorageError> {
        let mut manager = Manager::<LmdbEnvironment>::singleton().write().unwrap();

        let mut builder = Lmdb::new();
        builder.set_enc_key(key);
        builder.set_flags(EnvironmentFlags::WRITE_MAP);
        builder.set_map_size(1 * 1024 * 1024 * 1024);
        builder.set_max_dbs(10);

        let shared_rkv = manager
            .get_or_create(path, |path| {
                //Rkv::new::<Lmdb>(path) // use this instead to disable encryption
                // TODO: fix memory management of the key. it should be zeroized all the way to the LMDB C FFI

                Rkv::from_builder::<Lmdb>(path, builder)
            })
            .map_err(|e| {
                log_debug!("open LMDB failed: {}", e);
                StorageError::BackendError
            })?;
        let env = shared_rkv.read().unwrap();

        log_info!("created env with LMDB Version: {}", env.version());

        let main_store = env
            .open_multi("main", StoreOptions::create())
            .map_err(|e| {
                log_debug!("open_multi failed {}", e);
                StorageError::BackendError
            })?;

        Ok(LmdbKCVStore {
            environment: shared_rkv.clone(),
            main_store,
            path: path.to_str().unwrap().to_string(),
        })
    }
}
