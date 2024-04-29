// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! KeyColumnValue Storage abstraction

use std::collections::HashMap;
use std::{collections::HashSet, marker::PhantomData};

use crate::errors::StorageError;
use serde::{Deserialize, Serialize};
use serde_bare::{from_slice, to_vec};

pub fn prop<A>(prop: u8, props: &HashMap<u8, Vec<u8>>) -> Result<A, StorageError>
where
    A: for<'a> Deserialize<'a>,
{
    Ok(from_slice(
        &props.get(&prop).ok_or(StorageError::PropertyNotFound)?,
    )?)
}

pub struct Class<'a> {
    columns: Vec<&'a dyn ISingleValueColumn>,
    multi_value_columns: Vec<&'a dyn IMultiValueColumn>,
    existential_column: &'a dyn ISingleValueColumn,
    prefix: u8,
}

impl<'a> Class<'a> {
    pub fn new(
        prefix: u8,
        existential_column: &'a dyn ISingleValueColumn,
        columns: Vec<&'a dyn ISingleValueColumn>,
        multi_value_columns: Vec<&'a dyn IMultiValueColumn>,
    ) -> Self {
        // check unicity of prefixes and suffixes
        #[cfg(test)]
        {
            let mut prefixes = HashSet::from([prefix]);
            let mut suffixes = HashSet::from([existential_column.suffix()]);
            for column in columns.iter() {
                if !suffixes.insert(column.suffix()) {
                    panic!("duplicate suffix {} !!! check the code", column.suffix());
                }
            }
            for mvc in multi_value_columns.iter() {
                if !prefixes.insert(mvc.prefix()) {
                    panic!("duplicate prefix {} !!! check the code", mvc.prefix());
                }
            }
        }
        Self {
            columns,
            multi_value_columns,
            prefix,
            existential_column,
        }
    }
    fn suffices(&self) -> Vec<u8> {
        let mut res: Vec<u8> = self.columns.iter().map(|c| c.suffix()).collect();
        res.push(self.existential_column.suffix());
        res
    }
}

pub trait IModel {
    fn key(&self) -> &Vec<u8>;
    fn prefix(&self) -> u8 {
        self.class().prefix
    }
    fn check_exists(&mut self) -> Result<(), StorageError> {
        if !self.exists() {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }
    fn existential(&mut self) -> &mut dyn IExistentialValue;
    fn exists(&mut self) -> bool {
        if self.existential().exists() {
            return true;
        }
        let prefix = self.prefix();
        let key = self.key();
        let suffix = self.class().existential_column.suffix();
        match self.storage().get(prefix, key, Some(suffix), &None) {
            Ok(res) => {
                self.existential().process_exists(res);
                true
            }
            Err(e) => false,
        }
    }
    fn storage(&self) -> &dyn KCVStorage;
    fn load_props(&self) -> Result<HashMap<u8, Vec<u8>>, StorageError> {
        self.storage().get_all_properties_of_key(
            self.prefix(),
            self.key().to_vec(),
            self.class().suffices(),
            &None,
        )
    }
    fn class(&self) -> &Class;
    fn del(&self) -> Result<(), StorageError> {
        self.storage().write_transaction(&mut |tx| {
            tx.del_all(self.prefix(), self.key(), &self.class().suffices(), &None)?;
            for mvc in self.class().multi_value_columns.iter() {
                let size = mvc.value_size()?;
                tx.del_all_values(self.prefix(), self.key(), size, None, &None)?;
            }
            Ok(())
        })?;
        Ok(())
    }
}
use std::hash::Hash;
pub struct MultiValueColumn<
    Model: IModel,
    Column: Eq + PartialEq + Hash + Serialize + Default + for<'a> Deserialize<'a>,
> {
    prefix: u8,
    phantom: PhantomData<Column>,
    model: PhantomData<Model>,
    value_size: usize,
}

impl<
        Model: IModel,
        Column: Eq + PartialEq + Hash + Serialize + Default + for<'d> Deserialize<'d>,
    > MultiValueColumn<Model, Column>
{
    pub fn new(prefix: u8) -> Self {
        MultiValueColumn {
            prefix,
            phantom: PhantomData,
            model: PhantomData,
            value_size: to_vec(&Column::default())
                .expect("serialization of default Column value")
                .len(),
        }
    }

    fn compute_key(model: &Model, column: &Column) -> Result<Vec<u8>, StorageError> {
        let model_key = model.key();
        let mut column_ser = to_vec(column)?;
        let mut key = Vec::with_capacity(model_key.len() + column_ser.len());
        key.append(&mut model_key.to_vec());
        key.append(&mut column_ser);
        Ok(key)
    }

    pub fn add(&self, model: &mut Model, column: &Column) -> Result<(), StorageError> {
        model.check_exists()?;
        let key = Self::compute_key(model, column)?;
        model.storage().put(self.prefix, &key, None, &vec![], &None)
    }
    pub fn remove(&self, model: &mut Model, column: &Column) -> Result<(), StorageError> {
        model.check_exists()?;
        let key = Self::compute_key(model, column)?;
        model.storage().del(self.prefix, &key, None, &None)
    }

    pub fn has(&self, model: &mut Model, column: &Column) -> Result<(), StorageError> {
        model.check_exists()?;
        let key = Self::compute_key(model, column)?;
        model
            .storage()
            .has_property_value(self.prefix, &key, None, &vec![], &None)
    }

    pub fn get_all(&self, model: &mut Model) -> Result<HashSet<Column>, StorageError> {
        model.check_exists()?;
        let key_prefix = model.key();
        let key_prefix_len = key_prefix.len();
        let mut res: HashSet<Column> = HashSet::new();
        let total_size = key_prefix_len + self.value_size;
        for val in model.storage().get_all_keys_and_values(
            self.prefix,
            total_size,
            key_prefix.to_vec(),
            None,
            &None,
        )? {
            if val.0.len() == total_size + 1 {
                let val: Column = from_slice(&val.0[1 + key_prefix_len..total_size + 1])?;
                res.insert(val);
            }
        }
        Ok(res)
    }
}
impl<
        Model: IModel,
        Column: Eq + PartialEq + Hash + Serialize + Default + for<'d> Deserialize<'d>,
    > IMultiValueColumn for MultiValueColumn<Model, Column>
{
    fn value_size(&self) -> Result<usize, StorageError> {
        Ok(to_vec(&Column::default())?.len())
    }
    fn prefix(&self) -> u8 {
        self.prefix
    }
}

pub struct MultiMapColumn<
    Model: IModel,
    Column: Eq + PartialEq + Hash + Serialize + Default + for<'a> Deserialize<'a>,
    Value: Serialize + for<'a> Deserialize<'a>,
> {
    prefix: u8,
    phantom_column: PhantomData<Column>,
    phantom_model: PhantomData<Model>,
    phantom_value: PhantomData<Value>,
    value_size: usize,
}

impl<
        Model: IModel,
        Column: Eq + PartialEq + Hash + Serialize + Default + for<'d> Deserialize<'d>,
        Value: Serialize + for<'a> Deserialize<'a>,
    > MultiMapColumn<Model, Column, Value>
{
    pub fn new(prefix: u8) -> Self {
        MultiMapColumn {
            prefix,
            phantom_column: PhantomData,
            phantom_model: PhantomData,
            phantom_value: PhantomData,
            value_size: to_vec(&Column::default())
                .expect("serialization of default Column value")
                .len(),
        }
    }
    pub fn add(
        &self,
        model: &mut Model,
        column: &Column,
        value: &Value,
    ) -> Result<(), StorageError> {
        model.check_exists()?;
        let key = MultiValueColumn::compute_key(model, column)?;
        model
            .storage()
            .put(self.prefix, &key, None, &to_vec(value)?, &None)
    }
    pub fn remove(
        &self,
        model: &mut Model,
        column: &Column,
        value: &Value,
    ) -> Result<(), StorageError> {
        model.check_exists()?;
        let key = MultiValueColumn::compute_key(model, column)?;
        model
            .storage()
            .del_property_value(self.prefix, &key, None, &to_vec(value)?, &None)
    }
    pub fn remove_regardless_value(
        &self,
        model: &mut Model,
        column: &Column,
    ) -> Result<(), StorageError> {
        model.check_exists()?;
        let key = MultiValueColumn::compute_key(model, column)?;
        model.storage().del(self.prefix, &key, None, &None)
    }

    pub fn has(
        &self,
        model: &mut Model,
        column: &Column,
        value: &Value,
    ) -> Result<(), StorageError> {
        model.check_exists()?;
        let key = MultiValueColumn::compute_key(model, column)?;
        model
            .storage()
            .has_property_value(self.prefix, &key, None, &to_vec(value)?, &None)
    }

    pub fn has_regardless_value(
        &self,
        model: &mut Model,
        column: &Column,
    ) -> Result<(), StorageError> {
        model.check_exists()?;
        let key = MultiValueColumn::compute_key(model, column)?;
        model.storage().get(self.prefix, &key, None, &None)?;
        Ok(())
    }

    pub fn get_all(&self, model: &mut Model) -> Result<HashMap<Column, Value>, StorageError> {
        model.check_exists()?;
        let key_prefix = model.key();
        let key_prefix_len = key_prefix.len();
        let mut res: HashMap<Column, Value> = HashMap::new();
        let total_size = key_prefix_len + self.value_size;
        for val in model.storage().get_all_keys_and_values(
            self.prefix,
            total_size,
            key_prefix.to_vec(),
            None,
            &None,
        )? {
            if val.0.len() == total_size + 1 {
                let col: Column = from_slice(&val.0[1 + key_prefix_len..total_size + 1])?;
                let val = from_slice(&val.1)?;
                res.insert(col, val);
            }
        }
        Ok(res)
    }
}
impl<
        Model: IModel,
        Column: Eq + PartialEq + Hash + Serialize + Default + for<'d> Deserialize<'d>,
        Value: Serialize + for<'a> Deserialize<'a>,
    > IMultiValueColumn for MultiMapColumn<Model, Column, Value>
{
    fn value_size(&self) -> Result<usize, StorageError> {
        Ok(to_vec(&Column::default())?.len())
    }
    fn prefix(&self) -> u8 {
        self.prefix
    }
}

pub trait ISingleValueColumn {
    fn suffix(&self) -> u8;
}

pub trait IMultiValueColumn {
    fn prefix(&self) -> u8;
    fn value_size(&self) -> Result<usize, StorageError>;
}

pub struct ExistentialValueColumn {
    suffix: u8,
}

impl ISingleValueColumn for ExistentialValueColumn {
    fn suffix(&self) -> u8 {
        self.suffix
    }
}

impl ExistentialValueColumn {
    pub fn new(suffix: u8) -> Self {
        ExistentialValueColumn { suffix }
    }
}

pub struct SingleValueColumn<Model: IModel, Value: Serialize + for<'a> Deserialize<'a>> {
    suffix: u8,
    phantom_value: PhantomData<Value>,
    phantom_model: PhantomData<Model>,
}

impl<Model: IModel, Value: Serialize + for<'d> Deserialize<'d>> ISingleValueColumn
    for SingleValueColumn<Model, Value>
{
    fn suffix(&self) -> u8 {
        self.suffix
    }
}

impl<Model: IModel, Value: Serialize + for<'d> Deserialize<'d>> SingleValueColumn<Model, Value> {
    pub fn new(suffix: u8) -> Self {
        SingleValueColumn {
            suffix,
            phantom_value: PhantomData,
            phantom_model: PhantomData,
        }
    }

    pub fn set(&self, model: &mut Model, value: &Value) -> Result<(), StorageError> {
        model.check_exists()?;
        model.storage().replace(
            model.prefix(),
            model.key(),
            Some(self.suffix),
            &to_vec(value)?,
            &None,
        )
    }
    pub fn get(&self, model: &mut Model) -> Result<Value, StorageError> {
        model.check_exists()?;
        match model
            .storage()
            .get(model.prefix(), model.key(), Some(self.suffix), &None)
        {
            Ok(res) => Ok(from_slice::<Value>(&res)?),
            Err(e) => Err(e),
        }
    }

    pub fn has(&self, model: &mut Model, value: &Value) -> Result<(), StorageError> {
        model.check_exists()?;
        model.storage().has_property_value(
            model.prefix(),
            model.key(),
            Some(self.suffix),
            &to_vec(value)?,
            &None,
        )
    }

    pub fn del(
        &self,
        model: &mut Model,
        tx: &mut dyn WriteTransaction,
    ) -> Result<(), StorageError> {
        tx.del(model.prefix(), model.key(), Some(self.suffix), &None)
    }
}

pub struct ExistentialValue<Column: Serialize + for<'d> Deserialize<'d>> {
    value: Option<Column>,
    value_ser: Vec<u8>,
}
pub trait IExistentialValue {
    fn process_exists(&mut self, value_ser: Vec<u8>);

    fn exists(&self) -> bool;
}

impl<Column: Serialize + for<'d> Deserialize<'d>> IExistentialValue for ExistentialValue<Column> {
    fn exists(&self) -> bool {
        self.value.is_some() || self.value_ser.len() > 0
    }
    fn process_exists(&mut self, value_ser: Vec<u8>) {
        self.value_ser = value_ser;
    }
}

impl<Column: Clone + Serialize + for<'d> Deserialize<'d>> ExistentialValue<Column> {
    pub fn new() -> Self {
        ExistentialValue {
            value: None,
            value_ser: vec![],
        }
    }

    pub fn set<Model: IModel>(
        &mut self,
        value: &Column,
        model: &Model,
    ) -> Result<(), StorageError> {
        if self.value.is_some() {
            return Err(StorageError::AlreadyExists);
        }
        model.storage().replace(
            model.prefix(),
            model.key(),
            Some(model.class().existential_column.suffix()),
            &to_vec(value)?,
            &None,
        )?;
        self.value = Some(value.clone());
        Ok(())
    }

    pub fn get(&mut self) -> Result<&Column, StorageError> {
        if self.value.is_some() {
            return Ok(self.value.as_ref().unwrap());
        }
        if self.value_ser.len() == 0 {
            return Err(StorageError::BackendError);
        }
        let value = from_slice::<Column>(&self.value_ser);
        match value {
            Err(_) => return Err(StorageError::InvalidValue),
            Ok(val) => {
                self.value = Some(val);
                return Ok(self.value.as_ref().unwrap());
            }
        }
    }
}

pub trait WriteTransaction: ReadTransaction {
    /// Save a property value to the store.
    fn put(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
        family: &Option<String>,
    ) -> Result<(), StorageError>;

    /// Replace the property of a key (single value) to the store.
    fn replace(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
        family: &Option<String>,
    ) -> Result<(), StorageError>;

    /// Delete a property from the store.
    fn del(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        family: &Option<String>,
    ) -> Result<(), StorageError>;

    /// Delete all properties of a key from the store.
    fn del_all(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        all_suffixes: &[u8],
        family: &Option<String>,
    ) -> Result<(), StorageError>;

    /// Delete a specific value for a property from the store.
    fn del_property_value(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
        family: &Option<String>,
    ) -> Result<(), StorageError>;

    /// Delete all properties' values of a key from the store in case the property is a multi-values one
    fn del_all_values(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        property_size: usize,
        suffix: Option<u8>,
        family: &Option<String>,
    ) -> Result<(), StorageError>;
}

pub trait ReadTransaction {
    /// Load a property from the store.
    fn get(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        family: &Option<String>,
    ) -> Result<Vec<u8>, StorageError>;

    /// Load all the values of a property from the store.
    #[deprecated(
        note = "KVStore has unique values (since switch from lmdb to rocksdb) use get() instead"
    )]
    fn get_all(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        family: &Option<String>,
    ) -> Result<Vec<Vec<u8>>, StorageError>;

    fn get_all_properties_of_key(
        &self,
        prefix: u8,
        key: Vec<u8>,
        properties: Vec<u8>,
        family: &Option<String>,
    ) -> Result<HashMap<u8, Vec<u8>>, StorageError>;

    /// Check if a specific value exists for a property from the store.
    fn has_property_value(
        &self,
        prefix: u8,
        key: &Vec<u8>,
        suffix: Option<u8>,
        value: &Vec<u8>,
        family: &Option<String>,
    ) -> Result<(), StorageError>;

    /// retrieves all the keys and values with the given prefix and key_size. if no suffix is specified, then all (including none) the suffices are returned
    fn get_all_keys_and_values(
        &self,
        prefix: u8,
        key_size: usize,
        key_prefix: Vec<u8>,
        suffix: Option<u8>,
        family: &Option<String>,
    ) -> Result<Vec<(Vec<u8>, Vec<u8>)>, StorageError>;
}

pub trait KCVStorage: WriteTransaction {
    fn write_transaction(
        &self,
        method: &mut dyn FnMut(&mut dyn WriteTransaction) -> Result<(), StorageError>,
    ) -> Result<(), StorageError>;

    // /// Save a property value to the store.
    // fn put(
    //     &self,
    //     prefix: u8,
    //     key: &Vec<u8>,
    //     suffix: Option<u8>,
    //     value: Vec<u8>,
    // ) -> Result<(), StorageError>;

    // /// Replace the property of a key (single value) to the store.
    // fn replace(
    //     &self,
    //     prefix: u8,
    //     key: &Vec<u8>,
    //     suffix: Option<u8>,
    //     value: Vec<u8>,
    // ) -> Result<(), StorageError>;

    // /// Delete a property from the store.
    // fn del(&self, prefix: u8, key: &Vec<u8>, suffix: Option<u8>) -> Result<(), StorageError>;

    // /// Delete all properties of a key from the store.
    // fn del_all(&self, prefix: u8, key: &Vec<u8>, all_suffixes: &[u8]) -> Result<(), StorageError>;

    // /// Delete a specific value for a property from the store.
    // fn del_property_value(
    //     &self,
    //     prefix: u8,
    //     key: &Vec<u8>,
    //     suffix: Option<u8>,
    //     value: Vec<u8>,
    // ) -> Result<(), StorageError>;
}
