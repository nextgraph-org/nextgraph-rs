// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use p2p_repo::kcv_store::*;
use p2p_repo::store::*;
use p2p_repo::types::*;
use p2p_repo::utils::*;

use p2p_repo::log::*;

use std::path::Path;
use std::path::PathBuf;
use std::sync::RwLockReadGuard;
use std::sync::{Arc, RwLock};

use serde::{Deserialize, Serialize};
use serde_bare::error::Error;

use rocksdb::{
    ColumnFamilyDescriptor, Direction, Env, ErrorKind, IteratorMode, Options, SingleThreaded,
    TransactionDB, TransactionDBOptions, DB,
};

pub struct RocksdbTransaction<'a> {
    store: &'a RocksdbKCVStore,
    tx: Option<rocksdb::Transaction<'a, TransactionDB>>,
}

impl<'a> RocksdbTransaction<'a> {
    fn commit(&mut self) {
        self.tx.take().unwrap().commit().unwrap();
    }
    fn tx(&self) -> &rocksdb::Transaction<'a, TransactionDB> {
        self.tx.as_ref().unwrap()
    }
}

impl<'a> ReadTransaction for RocksdbTransaction<'a> {
    fn get_all_keys_and_values(
        &self,
        prefix: u8,
        key_size: usize,
        key_prefix: Vec<u8>,
        suffix: Option<u8>,
    ) -> Result<Vec<(Vec<u8>, Vec<u8>)>, StorageError> {
        self.store
            .get_all_keys_and_values(prefix, key_size, key_prefix, suffix)
    }

    /// Load a single value property from the store.
    fn get(&self, prefix: u8, key: &Vec<u8>, suffix: Option<u8>) -> Result<Vec<u8>, StorageError> {
        let property = RocksdbKCVStore::compute_property(prefix, key, suffix);
        let mut res = self
            .tx()
            .get_for_update(property, true)
            .map_err(|e| StorageError::BackendError)?;
        match res {
            Some(val) => Ok(val),
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
        unimplemented!();
    }

    /// Check if a specific value exists for a property from the store.
    fn has_property_value(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
    ) -> Result<(), StorageError> {
        let property = RocksdbKCVStore::compute_property(prefix, key, suffix);
        let exists = self
            .tx()
            .get_for_update(property, true)
            .map_err(|e| StorageError::BackendError)?;
        match exists {
            Some(stored_value) => {
                if stored_value.eq(value) {
                    Ok(())
                } else {
                    Err(StorageError::DifferentValue)
                }
            }
            None => Err(StorageError::NotFound),
        }
    }
}

impl<'a> WriteTransaction for RocksdbTransaction<'a> {
    /// Save a property value to the store.
    fn put(
        &mut self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
    ) -> Result<(), StorageError> {
        let property = RocksdbKCVStore::compute_property(prefix, key, suffix);
        self.tx()
            .put(property, value)
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
        let property = RocksdbKCVStore::compute_property(prefix, key, suffix);

        self.tx()
            .put(property, value)
            .map_err(|e| StorageError::BackendError)?;

        Ok(())
    }

    /// Delete a property from the store.
    fn del(&mut self, prefix: u8, key: &Vec<u8>, suffix: Option<u8>) -> Result<(), StorageError> {
        let property = RocksdbKCVStore::compute_property(prefix, key, suffix);
        let res = self.tx().delete(property);
        if res.is_err() {
            if let ErrorKind::NotFound = res.unwrap_err().kind() {
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
        let property = RocksdbKCVStore::compute_property(prefix, key, suffix);
        let exists = self
            .tx()
            .get_for_update(property.clone(), true)
            .map_err(|e| StorageError::BackendError)?;
        match exists {
            Some(val) => {
                if val.eq(value) {
                    self.tx()
                        .delete(property)
                        .map_err(|e| StorageError::BackendError)?;
                }
            }
            None => return Err(StorageError::DifferentValue),
        }
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

pub struct RocksdbKCVStore {
    /// the main store where all the properties of keys are stored
    main_db: TransactionDB,
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

impl ReadTransaction for RocksdbKCVStore {
    fn get_all_keys_and_values(
        &self,
        prefix: u8,
        key_size: usize,
        key_prefix: Vec<u8>,
        suffix: Option<u8>,
    ) -> Result<Vec<(Vec<u8>, Vec<u8>)>, StorageError> {
        if key_prefix.len() > key_size {
            return Err(StorageError::InvalidValue);
        }

        let mut vec_key_start = key_prefix.clone();
        let mut trailing_zeros = vec![0u8; key_size - key_prefix.len()];
        vec_key_start.append(&mut trailing_zeros);

        let mut vec_key_end = key_prefix.clone();
        let mut trailing_max = vec![255u8; key_size - key_prefix.len()];
        vec_key_end.append(&mut trailing_max);

        let property_start = Self::compute_property(prefix, &vec_key_start, suffix);
        let property_end =
            Self::compute_property(prefix, &vec_key_end, Some(suffix.unwrap_or(255u8)));

        let mut iter = self
            .main_db
            .iterator(IteratorMode::From(&property_start, Direction::Forward));
        let mut vector: Vec<(Vec<u8>, Vec<u8>)> = vec![];
        while let res = iter.next() {
            match res {
                Some(Ok(val)) => {
                    match compare(&val.0, property_end.as_slice()) {
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
                            vector.push((val.0.to_vec(), val.1.to_vec()));
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
        let mut res = self
            .main_db
            .get(property)
            .map_err(|e| StorageError::BackendError)?;
        match res {
            Some(val) => Ok(val),
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
        unimplemented!();
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
        let exists = self
            .main_db
            .get(property)
            .map_err(|e| StorageError::BackendError)?;
        match exists {
            Some(stored_value) => {
                if stored_value.eq(value) {
                    Ok(())
                } else {
                    Err(StorageError::DifferentValue)
                }
            }
            None => Err(StorageError::NotFound),
        }
    }
}

impl KCVStore for RocksdbKCVStore {
    fn write_transaction(
        &self,
        method: &mut dyn FnMut(&mut dyn WriteTransaction) -> Result<(), StorageError>,
    ) -> Result<(), StorageError> {
        let tx = self.main_db.transaction();

        let mut transaction = RocksdbTransaction {
            store: self,
            tx: Some(tx),
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

impl RocksdbKCVStore {
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
    pub fn open<'a>(path: &Path, key: [u8; 32]) -> Result<RocksdbKCVStore, StorageError> {
        let mut opts = Options::default();
        opts.set_use_fsync(true);
        opts.create_if_missing(true);
        opts.create_missing_column_families(true);
        let env = Env::enc_env(key).unwrap();
        opts.set_env(&env);
        let tx_options = TransactionDBOptions::new();
        let db: TransactionDB =
            TransactionDB::open_cf(&opts, &tx_options, &path, vec!["cf0", "cf1"]).unwrap();

        log_info!("created db with Rocksdb Version: {}", Env::version());

        Ok(RocksdbKCVStore {
            main_db: db,
            path: path.to_str().unwrap().to_string(),
        })
    }
}
