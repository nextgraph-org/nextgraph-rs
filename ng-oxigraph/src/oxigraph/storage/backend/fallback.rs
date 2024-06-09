//! TODO: This storage is dramatically naive.

use super::super::numeric_encoder::StrHash;
use crate::oxigraph::storage::StorageError;
use crate::oxigraph::store::CorruptionError;
use std::cell::RefCell;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::error::Error;
use std::mem::transmute;
use std::rc::{Rc, Weak};
use std::sync::{Arc, RwLock, RwLockWriteGuard};

pub struct ColumnFamilyDefinition {
    pub name: &'static str,
    pub use_iter: bool,
    pub min_prefix_size: usize,
    pub unordered_writes: bool,
}

#[derive(Clone)]
pub struct Db {
    db: Arc<RwLock<HashMap<ColumnFamily, BTreeMap<Vec<u8>, Vec<u8>>>>>,
    pub past_commits_cache: Arc<RwLock<HashMap<StrHash, Arc<HashSet<StrHash>>>>>,
}

impl Db {
    pub(crate) fn past_commits_cache(
        &self,
    ) -> Arc<RwLock<HashMap<StrHash, Arc<HashSet<StrHash>>>>> {
        Arc::clone(&self.past_commits_cache)
    }

    #[allow(clippy::unnecessary_wraps)]
    pub fn new(column_families: Vec<ColumnFamilyDefinition>) -> Result<Self, StorageError> {
        let mut trees = HashMap::new();
        for cf in column_families {
            trees.insert(ColumnFamily(cf.name), BTreeMap::default());
        }
        trees.entry(ColumnFamily("default")).or_default(); // We make sure that "default" key exists.
        Ok(Self {
            db: Arc::new(RwLock::new(trees)),
            past_commits_cache: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    #[allow(clippy::unwrap_in_result)]
    pub fn column_family(&self, name: &'static str) -> Result<ColumnFamily, StorageError> {
        let column_family = ColumnFamily(name);
        if self.db.read().unwrap().contains_key(&column_family) {
            Ok(column_family)
        } else {
            Err(CorruptionError::from_missing_column_family_name(name).into())
        }
    }

    #[must_use]
    pub fn snapshot(&self) -> Reader {
        Reader(InnerReader::Simple(Arc::clone(&self.db)))
    }

    #[allow(clippy::unwrap_in_result)]
    pub fn transaction<'a, 'b: 'a, T, E: Error + 'static + From<StorageError>>(
        &'b self,
        f: impl Fn(Transaction<'a>) -> Result<T, E>,
    ) -> Result<T, E> {
        let mut t = Transaction::new(Rc::new(RefCell::new(self.db.write().unwrap())));
        let res = f(t.clone());
        t.rollback();
        res
    }

    pub fn ng_transaction<'a, 'b: 'a, T, E: Error + 'static + From<StorageError>>(
        &'b self,
        f: impl Fn(Transaction<'a>) -> Result<T, E>,
    ) -> Result<T, E> {
        let mut t = Transaction::new(Rc::new(RefCell::new(self.db.write().unwrap())));
        let res = f(t.clone());
        if res.is_err() {
            t.rollback();
        }
        res
    }
}

#[derive(Clone, Ord, PartialOrd, Eq, PartialEq, Hash)]
pub struct ColumnFamily(&'static str);

pub struct Reader(InnerReader);

enum InnerReader {
    Simple(Arc<RwLock<HashMap<ColumnFamily, BTreeMap<Vec<u8>, Vec<u8>>>>>),
    Transaction(
        Weak<RefCell<RwLockWriteGuard<'static, HashMap<ColumnFamily, BTreeMap<Vec<u8>, Vec<u8>>>>>>,
    ),
}

impl Reader {
    #[allow(clippy::unwrap_in_result)]
    pub fn get(
        &self,
        column_family: &ColumnFamily,
        key: &[u8],
    ) -> Result<Option<Vec<u8>>, StorageError> {
        match &self.0 {
            InnerReader::Simple(reader) => Ok(reader
                .read()
                .unwrap()
                .get(column_family)
                .and_then(|cf| cf.get(key).cloned())),
            InnerReader::Transaction(reader) => {
                if let Some(reader) = reader.upgrade() {
                    Ok((*reader)
                        .borrow()
                        .get(column_family)
                        .and_then(|cf| cf.get(key).cloned()))
                } else {
                    Err(StorageError::Other(
                        "The transaction is already ended".into(),
                    ))
                }
            }
        }
    }

    #[allow(clippy::unwrap_in_result)]
    pub fn contains_key(
        &self,
        column_family: &ColumnFamily,
        key: &[u8],
    ) -> Result<bool, StorageError> {
        match &self.0 {
            InnerReader::Simple(reader) => Ok(reader
                .read()
                .unwrap()
                .get(column_family)
                .map_or(false, |cf| cf.contains_key(key))),
            InnerReader::Transaction(reader) => {
                if let Some(reader) = reader.upgrade() {
                    Ok((*reader)
                        .borrow()
                        .get(column_family)
                        .map_or(false, |cf| cf.contains_key(key)))
                } else {
                    Err(StorageError::Other(
                        "The transaction is already ended".into(),
                    ))
                }
            }
        }
    }

    #[allow(clippy::iter_not_returning_iterator)]
    pub fn iter(&self, column_family: &ColumnFamily) -> Result<Iter, StorageError> {
        self.scan_prefix(column_family, &[])
    }

    #[allow(clippy::unwrap_in_result)]
    pub fn scan_prefix(
        &self,
        column_family: &ColumnFamily,
        prefix: &[u8],
    ) -> Result<Iter, StorageError> {
        let data: Vec<_> = match &self.0 {
            InnerReader::Simple(reader) => {
                let trees = reader.read().unwrap();
                let Some(tree) = trees.get(column_family) else {
                    return Ok(Iter {
                        iter: Vec::new().into_iter(),
                        current: None,
                    });
                };
                if prefix.is_empty() {
                    tree.iter().map(|(k, v)| (k.clone(), v.clone())).collect()
                } else {
                    tree.range(prefix.to_vec()..)
                        .take_while(|(k, _)| k.starts_with(prefix))
                        .map(|(k, v)| (k.clone(), v.clone()))
                        .collect()
                }
            }
            InnerReader::Transaction(reader) => {
                let Some(reader) = reader.upgrade() else {
                    return Err(StorageError::Other(
                        "The transaction is already ended".into(),
                    ));
                };
                let trees = (*reader).borrow();
                let Some(tree) = trees.get(column_family) else {
                    return Ok(Iter {
                        iter: Vec::new().into_iter(),
                        current: None,
                    });
                };
                if prefix.is_empty() {
                    tree.iter().map(|(k, v)| (k.clone(), v.clone())).collect()
                } else {
                    tree.range(prefix.to_vec()..)
                        .take_while(|(k, _)| k.starts_with(prefix))
                        .map(|(k, v)| (k.clone(), v.clone()))
                        .collect()
                }
            }
        };
        let mut iter = data.into_iter();
        let current = iter.next();
        Ok(Iter { iter, current })
    }

    #[allow(clippy::unwrap_in_result)]
    pub fn len(&self, column_family: &ColumnFamily) -> Result<usize, StorageError> {
        match &self.0 {
            InnerReader::Simple(reader) => Ok(reader
                .read()
                .unwrap()
                .get(column_family)
                .map_or(0, BTreeMap::len)),
            InnerReader::Transaction(reader) => {
                if let Some(reader) = reader.upgrade() {
                    Ok((*reader)
                        .borrow()
                        .get(column_family)
                        .map_or(0, BTreeMap::len))
                } else {
                    Err(StorageError::Other(
                        "The transaction is already ended".into(),
                    ))
                }
            }
        }
    }

    #[allow(clippy::unwrap_in_result)]
    pub fn is_empty(&self, column_family: &ColumnFamily) -> Result<bool, StorageError> {
        match &self.0 {
            InnerReader::Simple(reader) => Ok(reader
                .read()
                .unwrap()
                .get(column_family)
                .map_or(true, BTreeMap::is_empty)),
            InnerReader::Transaction(reader) => {
                if let Some(reader) = reader.upgrade() {
                    Ok((*reader)
                        .borrow()
                        .get(column_family)
                        .map_or(true, BTreeMap::is_empty))
                } else {
                    Err(StorageError::Other(
                        "The transaction is already ended".into(),
                    ))
                }
            }
        }
    }
}

#[derive(Clone)]
pub struct Transaction<'a> {
    db: Rc<RefCell<RwLockWriteGuard<'a, HashMap<ColumnFamily, BTreeMap<Vec<u8>, Vec<u8>>>>>>,
    inserts: Rc<RwLock<HashMap<(ColumnFamily, Vec<u8>), Option<Vec<u8>>>>>,
    removes: Rc<RwLock<HashMap<(ColumnFamily, Vec<u8>), Vec<u8>>>>,
}

impl<'a> Transaction<'a> {
    fn new(
        db: Rc<RefCell<RwLockWriteGuard<'a, HashMap<ColumnFamily, BTreeMap<Vec<u8>, Vec<u8>>>>>>,
    ) -> Self {
        Transaction {
            db,
            inserts: Rc::new(RwLock::new(HashMap::new())),
            removes: Rc::new(RwLock::new(HashMap::new())),
        }
    }

    #[allow(unsafe_code, clippy::useless_transmute)]
    pub fn reader(&self) -> Reader {
        // SAFETY: This transmute is safe because we take a weak reference and the only Rc reference used is guarded by the lifetime.
        Reader(InnerReader::Transaction(Rc::downgrade(unsafe {
            transmute(&self.db)
        })))
    }

    #[allow(clippy::unnecessary_wraps)]
    pub fn contains_key_for_update(
        &self,
        column_family: &ColumnFamily,
        key: &[u8],
    ) -> Result<bool, StorageError> {
        Ok((*self.db)
            .borrow()
            .get(column_family)
            .map_or(false, |cf| cf.contains_key(key)))
    }

    fn rollback(&mut self) {
        let inserts = self.inserts.read().unwrap();
        for ((column_family, key), val) in inserts.iter() {
            if val.is_some() {
                //restore original val
                self.db
                    .borrow_mut()
                    .get_mut(&column_family)
                    .unwrap()
                    .insert(key.to_vec(), val.as_ref().unwrap().to_vec());
            } else {
                // we remove it
                self.db
                    .borrow_mut()
                    .get_mut(&column_family)
                    .unwrap()
                    .remove(key.into());
            }
        }
        let removes = self.removes.read().unwrap();
        for ((column_family, key), val) in removes.iter() {
            //restore original val
            self.db
                .borrow_mut()
                .get_mut(&column_family)
                .unwrap()
                .insert(key.to_vec(), val.to_vec());
        }
    }

    #[allow(clippy::unnecessary_wraps, clippy::unwrap_in_result)]
    pub fn insert(
        &mut self,
        column_family: &ColumnFamily,
        key: &[u8],
        value: &[u8],
    ) -> Result<(), StorageError> {
        let mut previous_val = self
            .db
            .borrow_mut()
            .get_mut(column_family)
            .unwrap()
            .insert(key.into(), value.into());
        let key = (column_family.clone(), key.to_vec());
        let previous_val2 = self.removes.write().unwrap().remove(&key);
        if previous_val.is_none() && previous_val2.is_some() {
            previous_val = previous_val2;
        }
        let mut inserts = self.inserts.write().unwrap();
        if !inserts.contains_key(&key) {
            inserts.insert(key, previous_val);
        }

        Ok(())
    }

    pub fn insert_empty(
        &mut self,
        column_family: &ColumnFamily,
        key: &[u8],
    ) -> Result<(), StorageError> {
        self.insert(column_family, key, &[])
    }

    #[allow(clippy::unnecessary_wraps, clippy::unwrap_in_result)]
    pub fn remove(&mut self, column_family: &ColumnFamily, key: &[u8]) -> Result<(), StorageError> {
        let mut val = self
            .db
            .borrow_mut()
            .get_mut(column_family)
            .unwrap()
            .remove(key);
        let val2 = self
            .inserts
            .write()
            .unwrap()
            .remove(&(column_family.clone(), key.to_vec()));
        if val2.is_some() {
            // we prefer the value in inserts as it may contain the original value after several inserts on the same key.
            val = val2.unwrap();
        }
        if let Some(val) = val {
            self.removes
                .write()
                .unwrap()
                .insert((column_family.clone(), key.to_vec()), val.to_vec());
        }
        Ok(())
    }
}

pub struct Iter {
    iter: std::vec::IntoIter<(Vec<u8>, Vec<u8>)>,
    current: Option<(Vec<u8>, Vec<u8>)>,
}

impl Iter {
    pub fn key(&self) -> Option<&[u8]> {
        Some(&self.current.as_ref()?.0)
    }

    #[allow(dead_code)]
    pub fn value(&self) -> Option<&[u8]> {
        Some(&self.current.as_ref()?.1)
    }

    pub fn next(&mut self) {
        self.current = self.iter.next();
    }

    #[allow(clippy::unnecessary_wraps, clippy::unused_self)]
    pub fn status(&self) -> Result<(), StorageError> {
        Ok(())
    }
}
