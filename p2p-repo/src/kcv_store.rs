// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use crate::store::StorageError;

// TODO:remove mut on self for trait WriteTransaction methods

pub trait WriteTransaction: ReadTransaction {
    /// Save a property value to the store.
    fn put(
        &mut self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
    ) -> Result<(), StorageError>;

    /// Replace the property of a key (single value) to the store.
    fn replace(
        &mut self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
    ) -> Result<(), StorageError>;

    /// Delete a property from the store.
    fn del(&mut self, prefix: u8, key: &Vec<u8>, suffix: Option<u8>) -> Result<(), StorageError>;

    /// Delete all properties of a key from the store.
    fn del_all(
        &mut self,
        prefix: u8,
        key: &Vec<u8>,
        all_suffixes: &[u8],
    ) -> Result<(), StorageError>;

    /// Delete a specific value for a property from the store.
    fn del_property_value(
        &mut self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
    ) -> Result<(), StorageError>;
}

pub trait ReadTransaction {
    /// Load a property from the store.
    fn get(&self, prefix: u8, key: &Vec<u8>, suffix: Option<u8>) -> Result<Vec<u8>, StorageError>;

    /// Load all the values of a property from the store.
    #[deprecated(
        note = "KVStore has unique values (since switch from lmdb to rocksdb) use get() instead"
    )]
    fn get_all(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
    ) -> Result<Vec<Vec<u8>>, StorageError>;

    /// Check if a specific value exists for a property from the store.
    fn has_property_value(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
    ) -> Result<(), StorageError>;

    /// retrieves all the keys and values with the given prefix and key_size. if no suffix is specified, then all (including none) the suffices are returned
    fn get_all_keys_and_values(
        &self,
        prefix: u8,
        key_size: usize,
        key_prefix: Vec<u8>,
        suffix: Option<u8>,
    ) -> Result<Vec<(Vec<u8>, Vec<u8>)>, StorageError>;
}

pub trait KCVStore: ReadTransaction {
    fn write_transaction(
        &self,
        method: &mut dyn FnMut(&mut dyn WriteTransaction) -> Result<(), StorageError>,
    ) -> Result<(), StorageError>;

    /// Save a property value to the store.
    fn put(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: Vec<u8>,
    ) -> Result<(), StorageError>;

    /// Replace the property of a key (single value) to the store.
    fn replace(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: Vec<u8>,
    ) -> Result<(), StorageError>;

    /// Delete a property from the store.
    fn del(&self, prefix: u8, key: &Vec<u8>, suffix: Option<u8>) -> Result<(), StorageError>;

    /// Delete all properties of a key from the store.
    fn del_all(&self, prefix: u8, key: &Vec<u8>, all_suffixes: &[u8]) -> Result<(), StorageError>;

    /// Delete a specific value for a property from the store.
    fn del_property_value(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: Vec<u8>,
    ) -> Result<(), StorageError>;
}
