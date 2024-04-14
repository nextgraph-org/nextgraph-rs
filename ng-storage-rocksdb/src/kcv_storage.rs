// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use ng_repo::kcv_storage::*;

use ng_repo::errors::*;
use ng_repo::log::*;
use rocksdb::DBIteratorWithThreadMode;

use std::collections::HashMap;
use std::path::Path;
use std::path::PathBuf;

use rocksdb::{
    ColumnFamily, ColumnFamilyDescriptor, Direction, Env, ErrorKind, IteratorMode, Options,
    SingleThreaded, TransactionDB, TransactionDBOptions, DB,
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
    fn get_iterator(
        &self,
        property_start: &[u8],
        family: &Option<String>,
    ) -> Result<DBIteratorWithThreadMode<impl rocksdb::DBAccess + 'a>, StorageError> {
        Ok(match family {
            Some(cf) => self.tx().iterator_cf(
                self.store
                    .db
                    .cf_handle(&cf)
                    .ok_or(StorageError::UnknownColumnFamily)?,
                IteratorMode::From(property_start, Direction::Forward),
            ),
            None => self
                .tx()
                .iterator(IteratorMode::From(property_start, Direction::Forward)),
        })
    }
}

impl<'a> ReadTransaction for RocksdbTransaction<'a> {
    fn get_all_keys_and_values(
        &self,
        prefix: u8,
        key_size: usize,
        key_prefix: Vec<u8>,
        suffix: Option<u8>,
        family: &Option<String>,
    ) -> Result<Vec<(Vec<u8>, Vec<u8>)>, StorageError> {
        let property_start =
            RocksdbKCVStore::calc_key_start(prefix, key_size, &key_prefix, &suffix);
        let iter = self.get_iterator(&property_start, &family)?;
        self.store
            .get_all_keys_and_values_(prefix, key_size, key_prefix, suffix, iter)
    }

    fn get_all_properties_of_key(
        &self,
        prefix: u8,
        key: Vec<u8>,
        properties: Vec<u8>,
        family: &Option<String>,
    ) -> Result<HashMap<u8, Vec<u8>>, StorageError> {
        let key_size = key.len();
        let prop_values = self.get_all_keys_and_values(prefix, key_size, key, None, family)?;
        Ok(RocksdbKCVStore::get_all_properties_of_key(
            prop_values,
            key_size,
            &properties,
        ))
    }

    /// Load a single value property from the store.
    fn get(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        family: &Option<String>,
    ) -> Result<Vec<u8>, StorageError> {
        let property = RocksdbKCVStore::compute_property(prefix, key, &suffix);
        let res = match family {
            Some(cf) => self.tx().get_for_update_cf(
                self.store
                    .db
                    .cf_handle(&cf)
                    .ok_or(StorageError::UnknownColumnFamily)?,
                property,
                true,
            ),
            None => self.tx().get_for_update(property, true),
        }
        .map_err(|_e| StorageError::BackendError)?;
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
        family: &Option<String>,
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
        family: &Option<String>,
    ) -> Result<(), StorageError> {
        let exists = self.get(prefix, key, suffix, family)?;
        if exists.eq(value) {
            Ok(())
        } else {
            Err(StorageError::DifferentValue)
        }
    }
}

impl<'a> WriteTransaction for RocksdbTransaction<'a> {
    /// Save a property value to the store.
    fn put(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
        family: &Option<String>,
    ) -> Result<(), StorageError> {
        let property = RocksdbKCVStore::compute_property(prefix, key, &suffix);
        match family {
            Some(cf) => self.tx().put_cf(
                self.store
                    .db
                    .cf_handle(&cf)
                    .ok_or(StorageError::UnknownColumnFamily)?,
                property,
                value,
            ),
            None => self.tx().put(property, value),
        }
        .map_err(|_e| StorageError::BackendError)?;

        Ok(())
    }

    /// Replace the property of a key (single value) to the store.
    fn replace(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
        family: &Option<String>,
    ) -> Result<(), StorageError> {
        self.put(prefix, key, suffix, value, family)
    }

    /// Delete a property from the store.
    fn del(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        family: &Option<String>,
    ) -> Result<(), StorageError> {
        let property = RocksdbKCVStore::compute_property(prefix, key, &suffix);
        let res = match family {
            Some(cf) => self.tx().delete_cf(
                self.store
                    .db
                    .cf_handle(&cf)
                    .ok_or(StorageError::UnknownColumnFamily)?,
                property,
            ),
            None => self.tx().delete(property),
        };
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
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
        family: &Option<String>,
    ) -> Result<(), StorageError> {
        let exists = self.get(prefix, key, suffix, family)?;
        if exists.eq(value) {
            self.del(prefix, key, suffix, family)
        } else {
            Err(StorageError::DifferentValue)
        }
    }

    /// Delete all properties of a key from the store.
    // TODO: this could be optimized with an iterator
    fn del_all(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        all_suffixes: &[u8],
        family: &Option<String>,
    ) -> Result<(), StorageError> {
        for suffix in all_suffixes {
            self.del(prefix, key, Some(*suffix), family)?;
        }
        if all_suffixes.is_empty() {
            self.del(prefix, key, None, family)?;
        }
        Ok(())
    }
}

pub struct RocksdbKCVStore {
    /// the main store where all the properties of keys are stored
    db: TransactionDB,
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
    /// returns a list of (key,value) that are in the range specified in the request
    fn get_all_keys_and_values(
        &self,
        prefix: u8,
        key_size: usize,
        key_prefix: Vec<u8>,
        suffix: Option<u8>,
        family: &Option<String>,
    ) -> Result<Vec<(Vec<u8>, Vec<u8>)>, StorageError> {
        let property_start = Self::calc_key_start(prefix, key_size, &key_prefix, &suffix);
        let iter = self.get_iterator(&property_start, &family)?;
        self.get_all_keys_and_values_(prefix, key_size, key_prefix, suffix, iter)
    }

    /// returns a map of found properties and their value. If `properties` is empty, then all the properties are returned.
    /// Otherwise, only the properties in the list are returned (if found in backend storage)
    fn get_all_properties_of_key(
        &self,
        prefix: u8,
        key: Vec<u8>,
        properties: Vec<u8>,
        family: &Option<String>,
    ) -> Result<HashMap<u8, Vec<u8>>, StorageError> {
        let key_size = key.len();
        let prop_values = self.get_all_keys_and_values(prefix, key_size, key, None, family)?;
        Ok(Self::get_all_properties_of_key(
            prop_values,
            key_size,
            &properties,
        ))
    }

    /// Load a single value property from the store.
    fn get(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        family: &Option<String>,
    ) -> Result<Vec<u8>, StorageError> {
        let property = Self::compute_property(prefix, key, &suffix);
        let res = match family {
            Some(cf) => self.db.get_cf(
                self.db
                    .cf_handle(&cf)
                    .ok_or(StorageError::UnknownColumnFamily)?,
                property,
            ),
            None => self.db.get(property),
        }
        .map_err(|_e| StorageError::BackendError)?;
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
        family: &Option<String>,
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
        family: &Option<String>,
    ) -> Result<(), StorageError> {
        let exists = self.get(prefix, key, suffix, family)?;
        if exists.eq(value) {
            Ok(())
        } else {
            Err(StorageError::DifferentValue)
        }
    }
}

impl KCVStore for RocksdbKCVStore {
    fn write_transaction(
        &self,
        method: &mut dyn FnMut(&mut dyn WriteTransaction) -> Result<(), StorageError>,
    ) -> Result<(), StorageError> {
        let tx = self.db.transaction();

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
}

impl WriteTransaction for RocksdbKCVStore {
    /// Save a property value to the store.
    fn put(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
        family: &Option<String>,
    ) -> Result<(), StorageError> {
        self.write_transaction(&mut |tx| tx.put(prefix, key, suffix, value, family))
    }

    /// Replace the property of a key (single value) to the store.
    fn replace(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
        family: &Option<String>,
    ) -> Result<(), StorageError> {
        self.write_transaction(&mut |tx| tx.replace(prefix, key, suffix, value, family))
    }

    /// Delete a property from the store.
    fn del(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        family: &Option<String>,
    ) -> Result<(), StorageError> {
        self.write_transaction(&mut |tx| tx.del(prefix, key, suffix, family))
    }

    /// Delete a specific value for a property from the store.
    fn del_property_value(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
        family: &Option<String>,
    ) -> Result<(), StorageError> {
        self.write_transaction(&mut |tx| tx.del_property_value(prefix, key, suffix, value, family))
    }

    /// Delete all properties of a key from the store.
    fn del_all(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        all_suffixes: &[u8],
        family: &Option<String>,
    ) -> Result<(), StorageError> {
        self.write_transaction(&mut |tx| {
            for suffix in all_suffixes {
                tx.del(prefix, key, Some(*suffix), family)?;
            }
            if all_suffixes.is_empty() {
                tx.del(prefix, key, None, family)?;
            }
            Ok(())
        })
    }
}

impl RocksdbKCVStore {
    pub fn path(&self) -> PathBuf {
        PathBuf::from(&self.path)
    }

    fn get_all_properties_of_key(
        prop_values: Vec<(Vec<u8>, Vec<u8>)>,
        key_size: usize,
        properties: &Vec<u8>,
    ) -> HashMap<u8, Vec<u8>> {
        let mut res = HashMap::new();
        for prop_val in prop_values {
            let prop = prop_val.0[1 + key_size];
            if properties.len() > 0 && !properties.contains(&prop) {
                continue;
            }
            res.insert(prop, prop_val.1);
        }
        res
    }

    fn get_all_keys_and_values_(
        &self,
        prefix: u8,
        key_size: usize,
        key_prefix: Vec<u8>,
        suffix: Option<u8>,
        mut iter: DBIteratorWithThreadMode<'_, impl rocksdb::DBAccess>,
    ) -> Result<Vec<(Vec<u8>, Vec<u8>)>, StorageError> {
        if key_prefix.len() > key_size {
            return Err(StorageError::InvalidValue);
        }

        // let mut vec_key_start = key_prefix.clone();
        // let mut trailing_zeros = vec![0u8; key_size - key_prefix.len()];
        // vec_key_start.append(&mut trailing_zeros);

        let mut vec_key_end = key_prefix.clone();
        let mut trailing_max = vec![255u8; key_size - key_prefix.len()];
        vec_key_end.append(&mut trailing_max);

        // let property_start = Self::compute_property(prefix, &vec_key_start, suffix);
        let property_end =
            Self::compute_property(prefix, &vec_key_end, &Some(suffix.unwrap_or(255u8)));

        // let mut iter = match family {
        //     Some(cf) => self.db.iterator_cf(
        //         self.db
        //             .cf_handle(&cf)
        //             .ok_or(StorageError::UnknownColumnFamily)?,
        //         IteratorMode::From(&property_start, Direction::Forward),
        //     ),
        //     None => self
        //         .db
        //         .iterator(IteratorMode::From(&property_start, Direction::Forward)),
        // };
        let mut vector: Vec<(Vec<u8>, Vec<u8>)> = vec![];
        loop {
            let res = iter.next();
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

    fn calc_key_start(
        prefix: u8,
        key_size: usize,
        key_prefix: &Vec<u8>,
        suffix: &Option<u8>,
    ) -> Vec<u8> {
        let mut vec_key_start = key_prefix.clone();
        let mut trailing_zeros = vec![0u8; key_size - key_prefix.len()];
        vec_key_start.append(&mut trailing_zeros);

        let mut vec_key_end = key_prefix.clone();
        let mut trailing_max = vec![255u8; key_size - key_prefix.len()];
        vec_key_end.append(&mut trailing_max);

        Self::compute_property(prefix, &vec_key_start, suffix)
    }

    fn get_iterator(
        &self,
        property_start: &[u8],
        family: &Option<String>,
    ) -> Result<DBIteratorWithThreadMode<'_, impl rocksdb::DBAccess>, StorageError> {
        Ok(match family {
            Some(cf) => self.db.iterator_cf(
                self.db
                    .cf_handle(&cf)
                    .ok_or(StorageError::UnknownColumnFamily)?,
                IteratorMode::From(property_start, Direction::Forward),
            ),
            None => self
                .db
                .iterator(IteratorMode::From(property_start, Direction::Forward)),
        })
    }

    fn compute_property(prefix: u8, key: &Vec<u8>, suffix: &Option<u8>) -> Vec<u8> {
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
            db: db,
            path: path.to_str().unwrap().to_string(),
        })
    }
}
