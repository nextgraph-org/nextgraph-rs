// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! KeyColumnValue Storage abstraction

use std::{
    collections::{HashMap, HashSet},
    marker::PhantomData,
};

use serde::{Deserialize, Serialize};
use serde_bare::{from_slice, to_vec};

use crate::errors::StorageError;
#[allow(unused_imports)]
use crate::log::*;

pub fn prop<A>(prop: u8, props: &HashMap<u8, Vec<u8>>) -> Result<A, StorageError>
where
    A: for<'a> Deserialize<'a>,
{
    Ok(from_slice(
        &props.get(&prop).ok_or(StorageError::PropertyNotFound)?,
    )?)
}

pub fn col<A>(
    column: &dyn ISingleValueColumn,
    props: &HashMap<u8, Vec<u8>>,
) -> Result<A, StorageError>
where
    A: for<'a> Deserialize<'a>,
{
    Ok(from_slice(
        &props
            .get(&column.suffix())
            .ok_or(StorageError::PropertyNotFound)?,
    )?)
}

pub struct Class<'a> {
    prefix: Option<u8>,
    pub name: &'static str,
    existential_column: Option<&'a dyn ISingleValueColumn>,
    columns: &'a [&'a dyn ISingleValueColumn],
    multi_value_columns: &'a [&'a dyn IMultiValueColumn],
}

impl<'a> Class<'a> {
    pub const fn new(
        name: &'static str,
        prefix: Option<u8>,
        existential_column: Option<&'a dyn ISingleValueColumn>,
        columns: &'a [&'a dyn ISingleValueColumn],
        multi_value_columns: &'a [&'a dyn IMultiValueColumn],
    ) -> Self {
        if prefix.is_none() {
            if existential_column.is_some() {
                panic!("cannot have an existential_column without a prefix");
            }
            if columns.len() > 0 {
                panic!("cannot have some property columns without a prefix");
            }
        }
        Self {
            columns,
            name,
            multi_value_columns,
            prefix,
            existential_column,
        }
    }

    /// check unicity of prefixes and suffixes
    #[cfg(debug_assertions)]
    pub fn check(&self) {
        let mut prefixes = if self.prefix.is_some() {
            HashSet::from([self.prefix.unwrap()])
        } else {
            HashSet::new()
        };

        let mut suffixes = if self.existential_column.is_some() {
            HashSet::from([self.existential_column.unwrap().suffix()])
        } else {
            HashSet::new()
        };
        let name = self.name;
        //log_debug!("CHECKING CLASS {name}");
        for column in self.columns.iter() {
            //log_debug!("INSERTING SUFFIX {}", column.suffix());
            if !suffixes.insert(column.suffix()) {
                panic!(
                    "duplicate suffix {} in {name}!!! check the code",
                    column.suffix() as char
                );
            }
        }
        //log_debug!("SUFFIXES {:?}", suffixes);
        for mvc in self.multi_value_columns.iter() {
            //log_debug!("INSERTING PREFIX {}", mvc.prefix());
            if !prefixes.insert(mvc.prefix()) {
                panic!(
                    "duplicate prefix {} in {name}!!! check the code",
                    mvc.prefix() as char
                );
            }
        }
        //log_debug!("PREFIXES {:?}", prefixes);
    }

    pub fn prefixes(&self) -> Vec<u8> {
        let mut res: Vec<u8> = self
            .multi_value_columns
            .iter()
            .map(|c| c.prefix())
            .collect();
        if self.prefix.is_some() {
            res.push(self.prefix.unwrap());
        }
        res
    }
    fn suffices(&self) -> Vec<u8> {
        let mut res: Vec<u8> = self.columns.iter().map(|c| c.suffix()).collect();
        if self.existential_column.is_some() {
            res.push(self.existential_column.unwrap().suffix());
        }
        res
    }
}

pub fn format_type_of<T>(_: &T) -> String {
    format!("{}", std::any::type_name::<T>())
}

pub trait IModel {
    fn key(&self) -> &Vec<u8>;
    fn prefix(&self) -> u8 {
        self.class().prefix.unwrap()
    }
    fn check_exists(&mut self) -> Result<(), StorageError> {
        if !self.exists() {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }
    fn existential(&mut self) -> Option<&mut dyn IExistentialValue>;
    fn exists(&mut self) -> bool {
        if self.existential().is_none() || self.class().existential_column.is_none() {
            return true;
        }
        if self.existential().as_mut().unwrap().exists() {
            return true;
        }
        let prefix = self.prefix();
        let key = self.key();
        let suffix = self.class().existential_column.unwrap().suffix();
        // log_info!(
        //     "EXISTENTIAL CHECK {} {} {:?}",
        //     prefix as char,
        //     suffix as char,
        //     key
        // );
        match self.storage().get(prefix, key, Some(suffix), &None) {
            Ok(res) => {
                //log_info!("EXISTENTIAL CHECK GOT {:?}", res);
                self.existential().as_mut().unwrap().process_exists(res);
                true
            }
            Err(_e) => false,
        }
    }
    fn storage(&self) -> &dyn KCVStorage;
    fn load_props(&self) -> Result<HashMap<u8, Vec<u8>>, StorageError> {
        if self.class().prefix.is_none() {
            panic!("cannot call load_props on a Class without prefix");
        }
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
            if self.class().prefix.is_some() {
                tx.del_all(self.prefix(), self.key(), &self.class().suffices(), &None)?;
            }
            for mvc in self.class().multi_value_columns.iter() {
                let size = mvc.value_size()?;
                tx.del_all_values(mvc.prefix(), self.key(), size, None, &None)?;
            }
            Ok(())
        })?;
        Ok(())
    }
}
use std::hash::Hash;
pub struct MultiValueColumn<
    Model: IModel,
    Column: std::fmt::Debug + Eq + PartialEq + Hash + Serialize + Default + for<'a> Deserialize<'a>,
> {
    prefix: u8,
    phantom: PhantomData<Column>,
    model: PhantomData<Model>,
    //value_size: usize,
}

impl<
        Model: IModel,
        Column: std::fmt::Debug + Eq + PartialEq + Hash + Serialize + Default + for<'d> Deserialize<'d>,
    > MultiValueColumn<Model, Column>
{
    pub const fn new(prefix: u8) -> Self {
        MultiValueColumn {
            prefix,
            phantom: PhantomData,
            model: PhantomData,
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

    pub fn add_lazy(&self, model: &mut Model, column: &Column) -> Result<(), StorageError> {
        model.check_exists()?;
        let key = Self::compute_key(model, column)?;
        model.storage().write_transaction(&mut |tx| {
            match tx.has_property_value(self.prefix, &key, None, &vec![], &None) {
                Ok(_) => {}
                Err(StorageError::NotFound) => {
                    tx.put(self.prefix, &key, None, &vec![], &None)?;
                }
                Err(e) => return Err(e),
            };
            Ok(())
        })
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

    pub fn remove_from_set_and_add(
        &self,
        model: &mut Model,
        mut remove_set: HashSet<Column>,
        add_set: HashSet<Column>,
    ) -> Result<(), StorageError> {
        // if existing_set.len() == 0 {
        //     return Err(StorageError::InvalidValue);
        // }
        model.check_exists()?;

        let key_prefix = model.key();
        let key_prefix_len = key_prefix.len();
        let total_size = key_prefix_len + self.value_size()?;

        //log_debug!("REPLACE HEAD {:?} with {:?}", existing_set, replace_with);

        model.storage().write_transaction(&mut |tx| {
            for found in tx.get_all_keys_and_values(
                self.prefix,
                total_size,
                key_prefix.to_vec(),
                None,
                &None,
            )? {
                if found.0.len() == total_size + 1 {
                    let val: Column = from_slice(&found.0[1 + key_prefix_len..total_size + 1])?;
                    if remove_set.remove(&val) {
                        tx.del(self.prefix, &found.0[1..].to_vec(), None, &None)?;
                    }
                }
            }

            for add in add_set.iter() {
                let mut new = Vec::with_capacity(total_size);
                new.extend(key_prefix);
                let mut val = to_vec(add)?;
                new.append(&mut val);
                //log_debug!("PUTTING HEAD {} {:?}", self.prefix as char, new);
                tx.put(self.prefix, &new, None, &vec![], &None)?;
            }
            return Ok(());
        })
    }

    pub fn replace_with_new_set_if_old_set_exists(
        &self,
        model: &mut Model,
        mut existing_set: HashSet<Column>,
        replace_with: HashSet<Column>,
    ) -> Result<(), StorageError> {
        // if existing_set.len() == 0 {
        //     return Err(StorageError::InvalidValue);
        // }
        model.check_exists()?;

        let key_prefix = model.key();
        let key_prefix_len = key_prefix.len();
        let total_size = key_prefix_len + self.value_size()?;

        let empty_existing = existing_set.is_empty();

        //log_debug!("REPLACE HEAD {:?} with {:?}", existing_set, replace_with);

        model.storage().write_transaction(&mut |tx| {
            for found in tx.get_all_keys_and_values(
                self.prefix,
                total_size,
                key_prefix.to_vec(),
                None,
                &None,
            )? {
                if found.0.len() == total_size + 1 {
                    let val: Column = from_slice(&found.0[1 + key_prefix_len..total_size + 1])?;
                    if empty_existing {
                        return Err(StorageError::NotEmpty);
                    }
                    if existing_set.remove(&val) {
                        tx.del(self.prefix, &found.0[1..].to_vec(), None, &None)?;
                    }
                }
            }
            if existing_set.is_empty() {
                for add in replace_with.iter() {
                    let mut new = Vec::with_capacity(total_size);
                    new.extend(key_prefix);
                    let mut val = to_vec(add)?;
                    new.append(&mut val);
                    //log_debug!("PUTTING HEAD {} {:?}", self.prefix as char, new);
                    tx.put(self.prefix, &new, None, &vec![], &None)?;
                }
                return Ok(());
            }
            Err(StorageError::Abort)
        })
    }

    pub fn get_all(&self, model: &mut Model) -> Result<HashSet<Column>, StorageError> {
        model.check_exists()?;
        let key_prefix = model.key();
        let key_prefix_len = key_prefix.len();
        let mut res: HashSet<Column> = HashSet::new();
        let total_size = key_prefix_len + self.value_size()?;
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
        Column: std::fmt::Debug + Eq + PartialEq + Hash + Serialize + Default + for<'d> Deserialize<'d>,
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
    Column: std::fmt::Debug + Eq + PartialEq + Hash + Serialize + Default + for<'a> Deserialize<'a>,
    Value: Serialize + for<'a> Deserialize<'a> + Clone + PartialEq,
> {
    prefix: u8,
    phantom_column: PhantomData<Column>,
    phantom_model: PhantomData<Model>,
    phantom_value: PhantomData<Value>,
    //value_size: usize,
}

impl<
        Model: IModel,
        Column: std::fmt::Debug + Eq + PartialEq + Hash + Serialize + Default + for<'d> Deserialize<'d>,
        Value: Serialize + for<'a> Deserialize<'a> + Clone + PartialEq,
    > MultiMapColumn<Model, Column, Value>
{
    pub const fn new(prefix: u8) -> Self {
        MultiMapColumn {
            prefix,
            phantom_column: PhantomData,
            phantom_model: PhantomData,
            phantom_value: PhantomData,
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

    pub fn get(&self, model: &mut Model, column: &Column) -> Result<Value, StorageError> {
        model.check_exists()?;
        let key = MultiValueColumn::compute_key(model, column)?;
        let val_ser = model.storage().get(self.prefix, &key, None, &None)?;
        Ok(from_slice(&val_ser)?)
    }

    pub fn get_or_add(
        &self,
        model: &mut Model,
        column: &Column,
        value: &Value,
    ) -> Result<Value, StorageError> {
        model.check_exists()?;
        let key = MultiValueColumn::compute_key(model, column)?;
        let mut found: Option<Value> = None;
        model.storage().write_transaction(&mut |tx| {
            found = match tx.get(self.prefix, &key, None, &None) {
                Ok(val_ser) => Some(from_slice(&val_ser)?),
                Err(StorageError::NotFound) => {
                    tx.put(self.prefix, &key, None, &to_vec(value)?, &None)?;
                    None
                }
                Err(e) => return Err(e),
            };
            Ok(())
        })?;
        Ok(found.unwrap_or(value.clone()))
    }

    pub fn add_or_change(
        &self,
        model: &mut Model,
        column: &Column,
        value: &Value,
    ) -> Result<(), StorageError> {
        model.check_exists()?;
        let key = MultiValueColumn::compute_key(model, column)?;
        let mut found: Option<Value> = None;
        model.storage().write_transaction(&mut |tx| {
            found = match tx.get(self.prefix, &key, None, &None) {
                Ok(val_ser) => Some(from_slice(&val_ser)?),
                Err(StorageError::NotFound) => {
                    tx.put(self.prefix, &key, None, &to_vec(value)?, &None)?;
                    None
                }
                Err(e) => return Err(e),
            };
            if found.is_some() && found.as_ref().unwrap() != value {
                // we change it
                tx.put(self.prefix, &key, None, &to_vec(value)?, &None)?;
            }
            Ok(())
        })?;
        Ok(())
    }

    pub fn get_all(&self, model: &mut Model) -> Result<HashMap<Column, Value>, StorageError> {
        model.check_exists()?;
        let key_prefix = model.key();
        let key_prefix_len = key_prefix.len();
        let mut res: HashMap<Column, Value> = HashMap::new();
        let total_size = key_prefix_len + self.value_size()?;
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
        Column: std::fmt::Debug + Eq + PartialEq + Hash + Serialize + Default + for<'d> Deserialize<'d>,
        Value: Serialize + for<'a> Deserialize<'a> + Clone + PartialEq,
    > IMultiValueColumn for MultiMapColumn<Model, Column, Value>
{
    fn value_size(&self) -> Result<usize, StorageError> {
        Ok(to_vec(&Column::default())?.len())
    }
    fn prefix(&self) -> u8 {
        self.prefix
    }
}

pub struct MultiCounterColumn<
    Model: IModel,
    Column: std::fmt::Debug + Eq + PartialEq + Hash + Serialize + Default + for<'a> Deserialize<'a>,
> {
    prefix: u8,
    phantom_column: PhantomData<Column>,
    phantom_model: PhantomData<Model>,
}

impl<
        Model: IModel,
        Column: std::fmt::Debug + Eq + PartialEq + Hash + Serialize + Default + for<'d> Deserialize<'d>,
    > MultiCounterColumn<Model, Column>
{
    pub const fn new(prefix: u8) -> Self {
        MultiCounterColumn {
            prefix,
            phantom_column: PhantomData,
            phantom_model: PhantomData,
        }
    }
    pub fn increment(&self, model: &mut Model, column: &Column) -> Result<(), StorageError> {
        let key = MultiValueColumn::compute_key(model, column)?;
        model.storage().write_transaction(&mut |tx| {
            let mut val: u64 = match tx.get(self.prefix, &key, None, &None) {
                Ok(val_ser) => from_slice(&val_ser)?,
                Err(StorageError::NotFound) => 0,
                Err(e) => return Err(e),
            };
            val += 1;
            let val_ser = to_vec(&val)?;
            tx.put(self.prefix, &key, None, &val_ser, &None)?;
            Ok(())
        })
    }
    /// returns true if the counter reached zero (and the key was removed from KVC store)
    pub fn decrement(&self, model: &mut Model, column: &Column) -> Result<bool, StorageError> {
        let key = MultiValueColumn::compute_key(model, column)?;
        let mut ret: bool = false;
        model.storage().write_transaction(&mut |tx| {
            let val_ser = tx.get(self.prefix, &key, None, &None)?;
            let mut val: u64 = from_slice(&val_ser)?;
            val -= 1;
            ret = val == 0;
            if ret {
                tx.del(self.prefix, &key, None, &None)?;
            } else {
                let val_ser = to_vec(&val)?;
                tx.put(self.prefix, &key, None, &val_ser, &None)?;
            }
            Ok(())
        })?;
        Ok(ret)
    }

    pub fn get(&self, model: &mut Model, column: &Column) -> Result<u64, StorageError> {
        let key = MultiValueColumn::compute_key(model, column)?;
        let val_ser = model.storage().get(self.prefix, &key, None, &None)?;
        let val: u64 = from_slice(&val_ser)?;
        Ok(val)
    }

    pub fn get_all(&self, model: &mut Model) -> Result<HashMap<Column, u64>, StorageError> {
        model.check_exists()?;
        let key_prefix = model.key();
        let key_prefix_len = key_prefix.len();
        let mut res: HashMap<Column, u64> = HashMap::new();
        let total_size = key_prefix_len + self.value_size()?;
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
        Column: std::fmt::Debug + Eq + PartialEq + Hash + Serialize + Default + for<'d> Deserialize<'d>,
    > IMultiValueColumn for MultiCounterColumn<Model, Column>
{
    fn value_size(&self) -> Result<usize, StorageError> {
        Ok(to_vec(&(0 as u64))?.len())
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

pub struct SingleValueColumn<Model: IModel, Value: Serialize + for<'a> Deserialize<'a>> {
    suffix: u8,
    phantom_value: PhantomData<Value>,
    phantom_model: PhantomData<Model>,
}

impl<Model: IModel, Value: Clone + Serialize + for<'d> Deserialize<'d>> ISingleValueColumn
    for SingleValueColumn<Model, Value>
{
    fn suffix(&self) -> u8 {
        self.suffix
    }
}

impl<Model: IModel, Value: Clone + Serialize + for<'d> Deserialize<'d>>
    SingleValueColumn<Model, Value>
{
    pub const fn new(suffix: u8) -> Self {
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

    pub fn get_or_set(&self, model: &mut Model, value: &Value) -> Result<Value, StorageError> {
        model.check_exists()?;
        let mut found: Option<Value> = None;
        model.storage().write_transaction(&mut |tx| {
            found = match tx.get(model.prefix(), model.key(), Some(self.suffix), &None) {
                Ok(val_ser) => Some(from_slice(&val_ser)?),
                Err(StorageError::NotFound) => {
                    tx.put(
                        model.prefix(),
                        model.key(),
                        Some(self.suffix),
                        &to_vec(value)?,
                        &None,
                    )?;
                    None
                }
                Err(e) => return Err(e),
            };
            Ok(())
        })?;
        Ok(found.unwrap_or(value.clone()))
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

    pub fn del(&self, model: &mut Model) -> Result<(), StorageError> {
        model.check_exists()?;
        model
            .storage()
            .del(model.prefix(), model.key(), Some(self.suffix), &None)
    }
}

/////////////  Counter Value

pub struct CounterValue<Model: IModel> {
    suffix: u8,
    phantom_model: PhantomData<Model>,
}

impl<Model: IModel> ISingleValueColumn for CounterValue<Model> {
    fn suffix(&self) -> u8 {
        self.suffix
    }
}

impl<Model: IModel> CounterValue<Model> {
    pub const fn new(suffix: u8) -> Self {
        CounterValue {
            suffix,
            phantom_model: PhantomData,
        }
    }

    pub fn increment(&self, model: &mut Model) -> Result<(), StorageError> {
        model.storage().write_transaction(&mut |tx| {
            let mut val: u64 = match tx.get(model.prefix(), model.key(), Some(self.suffix), &None) {
                Ok(val_ser) => from_slice(&val_ser)?,
                Err(StorageError::NotFound) => 0,
                Err(e) => return Err(e),
            };
            val += 1;
            let val_ser = to_vec(&val)?;
            tx.put(
                model.prefix(),
                model.key(),
                Some(self.suffix),
                &val_ser,
                &None,
            )?;
            Ok(())
        })
    }
    /// returns true if the counter reached zero, and the property was removed
    pub fn decrement(&self, model: &mut Model) -> Result<bool, StorageError> {
        let mut ret: bool = false;
        model.storage().write_transaction(&mut |tx| {
            let val_ser = tx.get(model.prefix(), model.key(), Some(self.suffix), &None)?;
            let mut val: u64 = from_slice(&val_ser)?;
            val -= 1;
            ret = val == 0;
            if ret {
                tx.del(model.prefix(), model.key(), Some(self.suffix), &None)?;
            } else {
                let val_ser = to_vec(&val)?;
                tx.put(
                    model.prefix(),
                    model.key(),
                    Some(self.suffix),
                    &val_ser,
                    &None,
                )?;
            }
            Ok(())
        })?;
        Ok(ret)
    }

    pub fn get(&self, model: &mut Model) -> Result<u64, StorageError> {
        let val_res = model
            .storage()
            .get(model.prefix(), model.key(), Some(self.suffix), &None);
        match val_res {
            Ok(val_ser) => Ok(from_slice(&val_ser)?),
            Err(StorageError::NotFound) => Ok(0),
            Err(e) => Err(e),
        }
    }

    pub fn del(&self, model: &mut Model) -> Result<(), StorageError> {
        model.check_exists()?;
        model
            .storage()
            .del(model.prefix(), model.key(), Some(self.suffix), &None)
    }
}

////////////////

pub struct ExistentialValueColumn {
    suffix: u8,
}

impl ISingleValueColumn for ExistentialValueColumn {
    fn suffix(&self) -> u8 {
        self.suffix
    }
}

impl ExistentialValueColumn {
    pub const fn new(suffix: u8) -> Self {
        ExistentialValueColumn { suffix }
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

    pub fn set(&mut self, value: &Column) -> Result<(), StorageError> {
        if self.value.is_some() {
            return Err(StorageError::AlreadyExists);
        }
        self.value = Some(value.clone());

        Ok(())
    }

    pub fn save<Model: IModel>(model: &Model, value: &Column) -> Result<(), StorageError> {
        model.storage().replace(
            model.prefix(),
            model.key(),
            Some(model.class().existential_column.unwrap().suffix()),
            &to_vec(value)?,
            &None,
        )?;
        Ok(())
    }

    pub fn get(&mut self) -> Result<&Column, StorageError> {
        if self.value.is_some() {
            return Ok(self.value.as_ref().unwrap());
        }
        if self.value_ser.is_empty() {
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

    pub fn take(mut self) -> Result<Column, StorageError> {
        self.get()?;
        Ok(self.value.take().unwrap())
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
