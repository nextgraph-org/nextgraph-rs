// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use p2p_repo::store::*;
use p2p_repo::types::*;
use p2p_repo::utils::*;

use p2p_repo::log::*;
use std::path::Path;
use std::sync::{Arc, RwLock};

use rkv::backend::{
    BackendDatabaseFlags, BackendFlags, BackendIter, BackendWriteFlags, DatabaseFlags, Lmdb,
    LmdbDatabase, LmdbDatabaseFlags, LmdbEnvironment, LmdbRwTransaction, LmdbWriteFlags,
};
use rkv::{
    Manager, MultiIntegerStore, Rkv, SingleStore, StoreError, StoreOptions, Value, WriteFlags,
    Writer,
};

use serde::{Deserialize, Serialize};
use serde_bare::error::Error;

#[derive(Debug)]
pub struct LmdbRepoStore {
    /// the main store where all the repo blocks are stored
    main_store: SingleStore<LmdbDatabase>,
    /// store for the pin boolean, recently_used timestamp, and synced boolean
    meta_store: SingleStore<LmdbDatabase>,
    /// store for the expiry timestamp
    expiry_store: MultiIntegerStore<LmdbDatabase, u32>,
    /// store for the LRU list
    recently_used_store: MultiIntegerStore<LmdbDatabase, u32>,
    /// the opened environment so we can create new transactions
    environment: Arc<RwLock<Rkv<LmdbEnvironment>>>,
}

// TODO: versioning V0
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
struct BlockMeta {
    pub pin: bool,
    pub last_used: Timestamp,
    pub synced: bool,
}

impl RepoStore for LmdbRepoStore {
    /// Retrieves a block from the storage backend.
    fn get(&self, block_id: &BlockId) -> Result<Block, StorageError> {
        let lock = self.environment.read().unwrap();
        let reader = lock.read().unwrap();
        let block_id_ser = serde_bare::to_vec(&block_id).unwrap();
        let block_ser_res = self.main_store.get(&reader, block_id_ser.clone());
        match block_ser_res {
            Err(e) => Err(StorageError::BackendError),
            Ok(None) => Err(StorageError::NotFound),
            Ok(Some(block_ser)) => {
                // updating recently_used
                // first getting the meta for this BlockId
                let meta_ser = self.meta_store.get(&reader, block_id_ser.clone()).unwrap();
                match meta_ser {
                    Some(meta_value) => {
                        let mut meta =
                            serde_bare::from_slice::<BlockMeta>(&meta_value.to_bytes().unwrap())
                                .unwrap();
                        if meta.synced {
                            let mut writer = lock.write().unwrap();
                            let now = now_timestamp();
                            if !meta.pin {
                                // we remove the previous timestamp (last_used) from recently_used_store
                                self.remove_from_lru(&mut writer, &block_id_ser, &meta.last_used)
                                    .unwrap();
                                // we add an entry to recently_used_store with now
                                self.add_to_lru(&mut writer, &block_id_ser, &now).unwrap();
                            }
                            // we save the new meta (with last_used:now)
                            meta.last_used = now;
                            let new_meta_ser = serde_bare::to_vec(&meta).unwrap();
                            self.meta_store
                                .put(
                                    &mut writer,
                                    block_id_ser,
                                    &Value::Blob(new_meta_ser.as_slice()),
                                )
                                .unwrap();
                            // commit
                            writer.commit().unwrap();
                        }
                    }
                    _ => {} // there is no meta. we do nothing since we start to record LRU only once synced == true.
                }

                match serde_bare::from_slice::<Block>(&block_ser.to_bytes().unwrap()) {
                    Err(_e) => Err(StorageError::InvalidValue),
                    Ok(o) => {
                        if o.id() != *block_id {
                            log_debug!(
                                "Invalid ObjectId.\nExp: {:?}\nGot: {:?}\nContent: {:?}",
                                block_id,
                                o.id(),
                                o
                            );
                            panic!("CORRUPTION OF DATA !");
                        }
                        Ok(o)
                    }
                }
            }
        }
    }

    /// Adds a block in the storage backend.
    /// The block is persisted to disk.
    /// Returns the BlockId of the Block.
    fn put(&self, block: &Block) -> Result<BlockId, StorageError> {
        let block_ser = serde_bare::to_vec(&block).unwrap();

        let block_id = block.id();
        let block_id_ser = serde_bare::to_vec(&block_id).unwrap();

        let lock = self.environment.read().unwrap();
        let mut writer = lock.write().unwrap();

        // TODO: check if the block is already in store? if yes, don't put it again.
        // I didnt do it yet because it is extra cost. surely a get on the store is lighter than a put
        // but doing a get in additing to a put for every call, is probably even costlier. better to deal with that at the higher level

        self.main_store
            .put(
                &mut writer,
                &block_id_ser,
                &Value::Blob(block_ser.as_slice()),
            )
            .unwrap();

        // if it has an expiry, adding the BlockId to the expiry_store
        match block.expiry() {
            Some(expiry) => {
                self.expiry_store
                    .put(&mut writer, expiry, &Value::Blob(block_id_ser.as_slice()))
                    .unwrap();
            }
            _ => {}
        }
        writer.commit().unwrap();

        Ok(block_id)
    }

    /// Removes the block from the storage backend.
    /// The removed block is returned, so it can be inspected.
    /// Also returned is the approximate size of of free space that was reclaimed.
    fn del(&self, block_id: &BlockId) -> Result<(Block, usize), StorageError> {
        let lock = self.environment.read().unwrap();
        let mut writer = lock.write().unwrap();
        let block_id_ser = serde_bare::to_vec(&block_id).unwrap();
        // retrieving the block itself (we need the expiry)
        let block_ser = self
            .main_store
            .get(&writer, block_id_ser.clone())
            .unwrap()
            .ok_or(StorageError::NotFound)?;
        let slice = block_ser.to_bytes().unwrap();
        let block = serde_bare::from_slice::<Block>(&slice).unwrap(); //FIXME propagate error?
        let meta_res = self.meta_store.get(&writer, block_id_ser.clone()).unwrap();
        if meta_res.is_some() {
            let meta = serde_bare::from_slice::<BlockMeta>(&meta_res.unwrap().to_bytes().unwrap())
                .unwrap();
            if meta.last_used != 0 {
                self.remove_from_lru(&mut writer, &block_id_ser.clone(), &meta.last_used)
                    .unwrap();
            }
            // removing the meta
            self.meta_store
                .delete(&mut writer, block_id_ser.clone())
                .unwrap();
        }
        // delete block from main_store
        self.main_store
            .delete(&mut writer, block_id_ser.clone())
            .unwrap();
        // remove BlockId from expiry_store, if any expiry
        match block.expiry() {
            Some(expiry) => {
                self.expiry_store
                    .delete(
                        &mut writer,
                        expiry,
                        &Value::Blob(block_id_ser.clone().as_slice()),
                    )
                    .unwrap();
            }
            _ => {}
        }

        writer.commit().unwrap();
        Ok((block, slice.len()))
    }
}

impl LmdbRepoStore {
    /// Opens the store and returns a RepoStore object that should be kept and used to call put/get/delete/pin
    /// The key is the encryption key for the data at rest.
    pub fn open<'a>(path: &Path, key: [u8; 32]) -> Result<LmdbRepoStore, StorageError> {
        let mut manager = Manager::<LmdbEnvironment>::singleton().write().unwrap();
        let shared_rkv = manager
            .get_or_create(path, |path| {
                //Rkv::new::<Lmdb>(path) // use this instead to disable encryption
                Rkv::with_encryption_key_and_mapsize::<Lmdb>(path, key, 1 * 1024 * 1024 * 1024)
            })
            .map_err(|e| {
                log_debug!("open LMDB failed: {}", e);
                StorageError::BackendError
            })?;
        let env = shared_rkv.read().unwrap();

        log_debug!(
            "created env with LMDB Version: {} key: {}",
            env.version(),
            hex::encode(&key)
        );

        let main_store = env.open_single("main", StoreOptions::create()).unwrap();
        let meta_store = env.open_single("meta", StoreOptions::create()).unwrap();
        let mut opts = StoreOptions::<LmdbDatabaseFlags>::create();
        opts.flags.set(DatabaseFlags::DUP_FIXED, true);
        let expiry_store = env.open_multi_integer("expiry", opts).unwrap();
        let recently_used_store = env.open_multi_integer("recently_used", opts).unwrap();

        Ok(LmdbRepoStore {
            environment: shared_rkv.clone(),
            main_store,
            meta_store,
            expiry_store,
            recently_used_store,
        })
    }

    //FIXME: use BlockId, not ObjectId. this is a block level operation
    /// Pins the object
    pub fn pin(&self, object_id: &ObjectId) -> Result<(), StorageError> {
        self.set_pin(object_id, true)
    }

    //FIXME: use BlockId, not ObjectId. this is a block level operation
    /// Unpins the object
    pub fn unpin(&self, object_id: &ObjectId) -> Result<(), StorageError> {
        self.set_pin(object_id, false)
    }

    //FIXME: use BlockId, not ObjectId. this is a block level operation
    /// Sets the pin for that Object. if add is true, will add the pin. if false, will remove the pin.
    /// A pin on an object prevents it from being removed when the store is making some disk space by using the LRU.
    /// A pin does not override the expiry. If expiry is set and is reached, the obejct will be deleted, no matter what.
    pub fn set_pin(&self, object_id: &ObjectId, add: bool) -> Result<(), StorageError> {
        let lock = self.environment.read().unwrap();
        let mut writer = lock.write().unwrap();
        let obj_id_ser = serde_bare::to_vec(&object_id).unwrap();
        let meta_ser = self.meta_store.get(&writer, &obj_id_ser).unwrap();
        let mut meta;

        // if adding a pin, if there is a meta (if already pinned, return) and is synced, remove the last_used timestamp from recently_used_store
        // if no meta, create it with pin:true, synced: false
        // if removing a pin (if pin already removed, return), if synced, add an entry to recently_used_store with the last_used timestamp (as found in meta, dont use now)

        match meta_ser {
            Some(meta_value) => {
                meta =
                    serde_bare::from_slice::<BlockMeta>(&meta_value.to_bytes().unwrap()).unwrap();

                if add == meta.pin {
                    // pinning while already pinned, or unpinning while already unpinned. NOP
                    return Ok(());
                };

                meta.pin = add;

                if meta.synced {
                    if add {
                        // we remove the previous timestamp (last_used) from recently_used_store
                        self.remove_from_lru(&mut writer, &obj_id_ser, &meta.last_used)
                            .unwrap();
                    } else {
                        // we add an entry to recently_used_store with last_used
                        self.add_to_lru(&mut writer, &obj_id_ser, &meta.last_used)
                            .unwrap();
                    }
                }
            }
            None => {
                if add {
                    meta = BlockMeta {
                        pin: true,
                        synced: false,
                        last_used: 0,
                    }
                } else {
                    // there is no meta, and user wants to unpin, so let's leave everything as it is.
                    return Ok(());
                }
            }
        }
        let new_meta_ser = serde_bare::to_vec(&meta).unwrap();
        self.meta_store
            .put(
                &mut writer,
                obj_id_ser,
                &Value::Blob(new_meta_ser.as_slice()),
            )
            .unwrap();
        // commit
        writer.commit().unwrap();

        Ok(())
    }

    //FIXME: use BlockId, not ObjectId. this is a block level operation
    /// the broker calls this method when the block has been retrieved/synced by enough peers and it
    /// can now be included in the LRU for potential garbage collection.
    /// If this method has not been called on a block, it will be kept in the store and will not enter LRU.
    pub fn has_been_synced(&self, block_id: &BlockId, when: Option<u32>) -> Result<(), Error> {
        let lock = self.environment.read().unwrap();
        let mut writer = lock.write().unwrap();
        let block_id_ser = serde_bare::to_vec(&block_id).unwrap();
        let meta_ser = self.meta_store.get(&writer, block_id_ser.clone()).unwrap();
        let mut meta;
        let now = match when {
            None => now_timestamp(),
            Some(w) => w,
        };
        // get the meta. if no meta, it is ok, we will create it after (with pin:false and synced:true)
        // if already synced, return
        // update the meta with last_used:now and synced:true
        // if pinned, save and return
        // otherwise add an entry to recently_used_store with now

        match meta_ser {
            Some(meta_value) => {
                meta =
                    serde_bare::from_slice::<BlockMeta>(&meta_value.to_bytes().unwrap()).unwrap();

                if meta.synced {
                    // already synced. NOP
                    return Ok(());
                };

                meta.synced = true;
                meta.last_used = now;

                if !meta.pin {
                    // we add an entry to recently_used_store with now
                    log_debug!("adding to LRU");
                    self.add_to_lru(&mut writer, &block_id_ser, &now).unwrap();
                }
            }
            None => {
                meta = BlockMeta {
                    pin: false,
                    synced: true,
                    last_used: now,
                };
                log_debug!("adding to LRU also");
                self.add_to_lru(&mut writer, &block_id_ser, &now).unwrap();
            }
        }
        let new_meta_ser = serde_bare::to_vec(&meta).unwrap();
        self.meta_store
            .put(
                &mut writer,
                block_id_ser,
                &Value::Blob(new_meta_ser.as_slice()),
            )
            .unwrap();
        // commit
        writer.commit().unwrap();

        Ok(())
    }

    /// Removes all the blocks that have expired.
    /// The broker should call this method periodically.
    pub fn remove_expired(&self) -> Result<(), Error> {
        let mut block_ids: Vec<BlockId> = vec![];

        {
            let lock = self.environment.read().unwrap();
            let reader = lock.read().unwrap();

            let mut iter = self
                .expiry_store
                .iter_prev_dup_from(&reader, now_timestamp())
                .unwrap();

            while let Some(Ok(mut sub_iter)) = iter.next() {
                while let Some(Ok(k)) = sub_iter.next() {
                    //log_debug!("removing {:?} {:?}", k.0, k.1);
                    let block_id = serde_bare::from_slice::<ObjectId>(k.1).unwrap();
                    block_ids.push(block_id);
                }
            }
        }
        for block_id in block_ids {
            self.del(&block_id).unwrap();
        }
        Ok(())
    }

    /// Removes some blocks that haven't been used for a while, reclaiming some space on disk.
    /// The oldest are removed first, until the total amount of data removed is at least equal to size,
    /// or the LRU list became empty. The approximate size of the storage space that was reclaimed is returned.
    pub fn remove_least_used(&self, size: usize) -> usize {
        let mut block_ids: Vec<BlockId> = vec![];
        let mut total: usize = 0;

        {
            let lock = self.environment.read().unwrap();
            let reader = lock.read().unwrap();

            let mut iter = self.recently_used_store.iter_start(&reader).unwrap();

            while let Some(Ok(entry)) = iter.next() {
                let block_id =
                    serde_bare::from_slice::<ObjectId>(entry.1.to_bytes().unwrap().as_slice())
                        .unwrap();
                block_ids.push(block_id);
            }
        }
        for block_id in block_ids {
            let (block, block_size) = self.del(&block_id).unwrap();
            log_debug!("removed {:?}", block_id);
            total += block_size;
            if total >= size {
                break;
            }
        }
        total
    }

    fn remove_from_lru(
        &self,
        writer: &mut Writer<LmdbRwTransaction>,
        block_id_ser: &Vec<u8>,
        time: &Timestamp,
    ) -> Result<(), StoreError> {
        self.recently_used_store
            .delete(writer, *time, &Value::Blob(block_id_ser.as_slice()))
    }

    fn add_to_lru(
        &self,
        writer: &mut Writer<LmdbRwTransaction>,
        block_id_ser: &Vec<u8>,
        time: &Timestamp,
    ) -> Result<(), StoreError> {
        let mut flag = LmdbWriteFlags::empty();
        flag.set(WriteFlags::APPEND_DUP, true);
        self.recently_used_store.put_with_flags(
            writer,
            *time,
            &Value::Blob(block_id_ser.as_slice()),
            flag,
        )
    }

    fn list_all(&self) {
        let lock = self.environment.read().unwrap();
        let reader = lock.read().unwrap();
        log_debug!("MAIN");
        let mut iter = self.main_store.iter_start(&reader).unwrap();
        while let Some(Ok(entry)) = iter.next() {
            log_debug!("{:?} {:?}", entry.0, entry.1)
        }
        log_debug!("META");
        let mut iter2 = self.meta_store.iter_start(&reader).unwrap();
        while let Some(Ok(entry)) = iter2.next() {
            log_debug!("{:?} {:?}", entry.0, entry.1)
        }
        log_debug!("EXPIRY");
        let mut iter3 = self.expiry_store.iter_start(&reader).unwrap();
        while let Some(Ok(entry)) = iter3.next() {
            log_debug!("{:?} {:?}", entry.0, entry.1)
        }
        log_debug!("LRU");
        let mut iter4 = self.recently_used_store.iter_start(&reader).unwrap();
        while let Some(Ok(entry)) = iter4.next() {
            log_debug!("{:?} {:?}", entry.0, entry.1)
        }
    }
}
#[cfg(test)]
mod test {

    use crate::repo_store::LmdbRepoStore;
    use p2p_repo::log::*;
    use p2p_repo::store::*;
    use p2p_repo::types::*;
    use p2p_repo::utils::*;
    use rkv::backend::{BackendInfo, BackendStat, Lmdb, LmdbEnvironment};
    use rkv::{Manager, Rkv, StoreOptions, Value};
    #[allow(unused_imports)]
    use std::time::Duration;
    #[allow(unused_imports)]
    use std::{fs, thread};
    use tempfile::Builder;

    #[test]
    pub fn test_remove_least_used() {
        let path_str = "test-env";
        let root = Builder::new().prefix(path_str).tempdir().unwrap();
        let key: [u8; 32] = [0; 32];
        fs::create_dir_all(root.path()).unwrap();
        log_debug!("{}", root.path().to_str().unwrap());
        let mut store = LmdbRepoStore::open(root.path(), key).unwrap();
        let mut now = now_timestamp();
        now -= 200;
        // TODO: fix the LMDB bug that is triggered with x max set to 86 !!!
        for x in 1..85 {
            let block = Block::new(
                Vec::new(),
                ObjectDeps::ObjectIdList(Vec::new()),
                None,
                vec![x; 10],
                None,
            );
            let block_id = store.put(&block).unwrap();
            log_debug!("#{} -> objId {:?}", x, block_id);
            store
                .has_been_synced(&block_id, Some(now + x as u32))
                .unwrap();
        }

        let ret = store.remove_least_used(200);
        log_debug!("removed {}", ret);
        assert_eq!(ret, 208)

        //store.list_all();
    }

    #[test]
    pub fn test_set_pin() {
        let path_str = "test-env";
        let root = Builder::new().prefix(path_str).tempdir().unwrap();
        let key: [u8; 32] = [0; 32];
        fs::create_dir_all(root.path()).unwrap();
        log_debug!("{}", root.path().to_str().unwrap());
        let mut store = LmdbRepoStore::open(root.path(), key).unwrap();
        let mut now = now_timestamp();
        now -= 200;
        // TODO: fix the LMDB bug that is triggered with x max set to 86 !!!
        for x in 1..100 {
            let block = Block::new(
                Vec::new(),
                ObjectDeps::ObjectIdList(Vec::new()),
                None,
                vec![x; 10],
                None,
            );
            let obj_id = store.put(&block).unwrap();
            log_debug!("#{} -> objId {:?}", x, obj_id);
            store.set_pin(&obj_id, true).unwrap();
            store
                .has_been_synced(&obj_id, Some(now + x as u32))
                .unwrap();
        }

        let ret = store.remove_least_used(200);
        log_debug!("removed {}", ret);
        assert_eq!(ret, 0);

        store.list_all();
    }

    #[test]
    pub fn test_get_valid_value_size() {
        assert_eq!(store_valid_value_size(0), 4072);
        assert_eq!(store_valid_value_size(2), 4072);
        assert_eq!(store_valid_value_size(4072), 4072);
        assert_eq!(store_valid_value_size(4072 + 1), 4072 + 4096);
        assert_eq!(store_valid_value_size(4072 + 4096), 4072 + 4096);
        assert_eq!(store_valid_value_size(4072 + 4096 + 1), 4072 + 4096 + 4096);
        assert_eq!(
            store_valid_value_size(4072 + 4096 + 4096),
            4072 + 4096 + 4096
        );
        assert_eq!(
            store_valid_value_size(4072 + 4096 + 4096 + 1),
            4072 + 4096 + 4096 + 4096
        );
        assert_eq!(store_valid_value_size(4072 + 4096 * 511), 4072 + 4096 * 511);
        assert_eq!(
            store_valid_value_size(4072 + 4096 * 511 + 1),
            4072 + 4096 * 511
        );
    }

    #[test]
    pub fn test_remove_expired() {
        let path_str = "test-env";
        let root = Builder::new().prefix(path_str).tempdir().unwrap();
        let key: [u8; 32] = [0; 32];
        fs::create_dir_all(root.path()).unwrap();
        log_debug!("{}", root.path().to_str().unwrap());
        let mut store = LmdbRepoStore::open(root.path(), key).unwrap();

        let now = now_timestamp();
        let list = [
            now - 10,
            now - 6,
            now - 6,
            now - 3,
            now - 2,
            now - 1, //#5 should be removed, and above
            now + 3,
            now + 4,
            now + 4,
            now + 5,
            now + 10,
        ];
        let mut block_ids: Vec<ObjectId> = Vec::with_capacity(11);
        log_debug!("now {}", now);

        let mut i = 0u8;
        for expiry in list {
            //let i: u8 = (expiry + 10 - now).try_into().unwrap();
            let block = Block::new(
                Vec::new(),
                ObjectDeps::ObjectIdList(Vec::new()),
                Some(expiry),
                [i].to_vec(),
                None,
            );
            let block_id = store.put(&block).unwrap();
            log_debug!("#{} -> objId {:?}", i, block_id);
            block_ids.push(block_id);
            i += 1;
        }

        store.remove_expired().unwrap();

        assert!(store.get(block_ids.get(0).unwrap()).is_err());
        assert!(store.get(block_ids.get(1).unwrap()).is_err());
        assert!(store.get(block_ids.get(2).unwrap()).is_err());
        assert!(store.get(block_ids.get(5).unwrap()).is_err());
        assert!(store.get(block_ids.get(6).unwrap()).is_ok());
        assert!(store.get(block_ids.get(7).unwrap()).is_ok());

        //store.list_all();
    }

    #[test]
    pub fn test_remove_all_expired() {
        let path_str = "test-env";
        let root = Builder::new().prefix(path_str).tempdir().unwrap();
        let key: [u8; 32] = [0; 32];
        fs::create_dir_all(root.path()).unwrap();
        log_debug!("{}", root.path().to_str().unwrap());
        let mut store = LmdbRepoStore::open(root.path(), key).unwrap();

        let now = now_timestamp();
        let list = [
            now - 10,
            now - 6,
            now - 6,
            now - 3,
            now - 2,
            now - 2, //#5 should be removed, and above
        ];
        let mut block_ids: Vec<ObjectId> = Vec::with_capacity(6);
        log_debug!("now {}", now);

        let mut i = 0u8;
        for expiry in list {
            //let i: u8 = (expiry + 10 - now).try_into().unwrap();
            let block = Block::new(
                Vec::new(),
                ObjectDeps::ObjectIdList(Vec::new()),
                Some(expiry),
                [i].to_vec(),
                None,
            );
            let block_id = store.put(&block).unwrap();
            log_debug!("#{} -> objId {:?}", i, block_id);
            block_ids.push(block_id);
            i += 1;
        }

        store.remove_expired().unwrap();

        assert!(store.get(block_ids.get(0).unwrap()).is_err());
        assert!(store.get(block_ids.get(1).unwrap()).is_err());
        assert!(store.get(block_ids.get(2).unwrap()).is_err());
        assert!(store.get(block_ids.get(3).unwrap()).is_err());
        assert!(store.get(block_ids.get(4).unwrap()).is_err());
        assert!(store.get(block_ids.get(5).unwrap()).is_err());
    }

    #[test]
    pub fn test_remove_empty_expired() {
        let path_str = "test-env";
        let root = Builder::new().prefix(path_str).tempdir().unwrap();
        let key: [u8; 32] = [0; 32];
        fs::create_dir_all(root.path()).unwrap();
        log_debug!("{}", root.path().to_str().unwrap());
        let store = LmdbRepoStore::open(root.path(), key).unwrap();
        store.remove_expired().unwrap();
    }

    #[test]
    pub fn test_store_block() {
        let path_str = "test-env";
        let root = Builder::new().prefix(path_str).tempdir().unwrap();

        let key: [u8; 32] = [0; 32];
        fs::create_dir_all(root.path()).unwrap();

        log_debug!("{}", root.path().to_str().unwrap());

        let mut store = LmdbRepoStore::open(root.path(), key).unwrap();

        let block = Block::new(
            Vec::new(),
            ObjectDeps::ObjectIdList(Vec::new()),
            None,
            b"abc".to_vec(),
            None,
        );

        let block_id = store.put(&block).unwrap();
        assert_eq!(block_id, block.id());

        log_debug!("ObjectId: {:?}", block_id);
        assert_eq!(
            block_id,
            Digest::Blake3Digest32([
                155, 83, 186, 17, 95, 10, 80, 31, 111, 24, 250, 64, 8, 145, 71, 193, 103, 246, 202,
                28, 202, 144, 63, 65, 85, 229, 136, 85, 202, 34, 13, 85
            ])
        );

        let block_res = store.get(&block_id).unwrap();

        log_debug!("Block: {:?}", block_res);
        assert_eq!(block_res.id(), block.id());
    }

    #[test]
    pub fn test_lmdb() {
        let path_str = "test-env";
        let root = Builder::new().prefix(path_str).tempdir().unwrap();

        // we set an encryption key with all zeros... for test purpose only ;)
        let key: [u8; 32] = [0; 32];
        {
            fs::create_dir_all(root.path()).unwrap();

            log_debug!("{}", root.path().to_str().unwrap());

            let mut manager = Manager::<LmdbEnvironment>::singleton().write().unwrap();
            let shared_rkv = manager
                .get_or_create(root.path(), |path| {
                    // Rkv::new::<Lmdb>(path) // use this instead to disable encryption
                    Rkv::with_encryption_key_and_mapsize::<Lmdb>(path, key, 1 * 1024 * 1024 * 1024)
                })
                .unwrap();
            let env = shared_rkv.read().unwrap();

            log_debug!("LMDB Version: {}", env.version());

            let store = env.open_single("testdb", StoreOptions::create()).unwrap();

            {
                // Use a write transaction to mutate the store via a `Writer`. There can be only
                // one writer for a given environment, so opening a second one will block until
                // the first completes.
                let mut writer = env.write().unwrap();

                // Keys are `AsRef<[u8]>`, while values are `Value` enum instances. Use the `Blob`
                // variant to store arbitrary collections of bytes. Putting data returns a
                // `Result<(), StoreError>`, where StoreError is an enum identifying the reason
                // for a failure.
                // store.put(&mut writer, "int", &Value::I64(1234)).unwrap();
                // store
                //     .put(&mut writer, "uint", &Value::U64(1234_u64))
                //     .unwrap();
                // store
                //     .put(&mut writer, "float", &Value::F64(1234.0.into()))
                //     .unwrap();
                // store
                //     .put(&mut writer, "instant", &Value::Instant(1528318073700))
                //     .unwrap();
                // store
                //     .put(&mut writer, "boolean", &Value::Bool(true))
                //     .unwrap();
                // store
                //     .put(&mut writer, "string", &Value::Str("Héllo, wörld!"))
                //     .unwrap();
                // store
                //     .put(
                //         &mut writer,
                //         "json",
                //         &Value::Json(r#"{"foo":"bar", "number": 1}"#),
                //     )
                //     .unwrap();
                const EXTRA: usize = 2095; // + 4096 * 524280 + 0;
                let key: [u8; 33] = [0; 33];
                let key2: [u8; 33] = [2; 33];
                let key3: [u8; 33] = [3; 33];
                let key4: [u8; 33] = [4; 33];
                //let value: [u8; 1977 + EXTRA] = [1; 1977 + EXTRA];
                let value = vec![1; 1977 + EXTRA];
                let value2: [u8; 1977 + 1] = [1; 1977 + 1];
                let value4: [u8; 953 + 0] = [1; 953 + 0];
                store.put(&mut writer, key, &Value::Blob(&value2)).unwrap();
                store.put(&mut writer, key2, &Value::Blob(&value2)).unwrap();
                // store.put(&mut writer, key3, &Value::Blob(&value)).unwrap();
                // store.put(&mut writer, key4, &Value::Blob(&value4)).unwrap();

                // You must commit a write transaction before the writer goes out of scope, or the
                // transaction will abort and the data won't persist.
                writer.commit().unwrap();
                let reader = env.read().expect("reader");
                let stat = store.stat(&reader).unwrap();

                log_debug!("LMDB stat page_size : {}", stat.page_size());
                log_debug!("LMDB stat depth : {}", stat.depth());
                log_debug!("LMDB stat branch_pages : {}", stat.branch_pages());
                log_debug!("LMDB stat leaf_pages : {}", stat.leaf_pages());
                log_debug!("LMDB stat overflow_pages : {}", stat.overflow_pages());
                log_debug!("LMDB stat entries : {}", stat.entries());
            }

            // {
            //     // Use a read transaction to query the store via a `Reader`. There can be multiple
            //     // concurrent readers for a store, and readers never block on a writer nor other
            //     // readers.
            //     let reader = env.read().expect("reader");

            //     // Keys are `AsRef<u8>`, and the return value is `Result<Option<Value>, StoreError>`.
            //     // log_debug!("Get int {:?}", store.get(&reader, "int").unwrap());
            //     // log_debug!("Get uint {:?}", store.get(&reader, "uint").unwrap());
            //     // log_debug!("Get float {:?}", store.get(&reader, "float").unwrap());
            //     // log_debug!("Get instant {:?}", store.get(&reader, "instant").unwrap());
            //     // log_debug!("Get boolean {:?}", store.get(&reader, "boolean").unwrap());
            //     // log_debug!("Get string {:?}", store.get(&reader, "string").unwrap());
            //     // log_debug!("Get json {:?}", store.get(&reader, "json").unwrap());
            //     log_debug!("Get blob {:?}", store.get(&reader, "blob").unwrap());

            //     // Retrieving a non-existent value returns `Ok(None)`.
            //     log_debug!(
            //         "Get non-existent value {:?}",
            //         store.get(&reader, "non-existent").unwrap()
            //     );

            //     // A read transaction will automatically close once the reader goes out of scope,
            //     // so isn't necessary to close it explicitly, although you can do so by calling
            //     // `Reader.abort()`.
            // }

            // {
            //     // Aborting a write transaction rolls back the change(s).
            //     let mut writer = env.write().unwrap();
            //     store.put(&mut writer, "foo", &Value::Blob(b"bar")).unwrap();
            //     writer.abort();
            //     let reader = env.read().expect("reader");
            //     log_debug!(
            //         "It should be None! ({:?})",
            //         store.get(&reader, "foo").unwrap()
            //     );
            // }

            // {
            //     // Explicitly aborting a transaction is not required unless an early abort is
            //     // desired, since both read and write transactions will implicitly be aborted once
            //     // they go out of scope.
            //     {
            //         let mut writer = env.write().unwrap();
            //         store.put(&mut writer, "foo", &Value::Blob(b"bar")).unwrap();
            //     }
            //     let reader = env.read().expect("reader");
            //     log_debug!(
            //         "It should be None! ({:?})",
            //         store.get(&reader, "foo").unwrap()
            //     );
            // }

            // {
            //     // Deleting a key/value pair also requires a write transaction.
            //     let mut writer = env.write().unwrap();
            //     store.put(&mut writer, "foo", &Value::Blob(b"bar")).unwrap();
            //     store.put(&mut writer, "bar", &Value::Blob(b"baz")).unwrap();
            //     store.delete(&mut writer, "foo").unwrap();

            //     // A write transaction also supports reading, and the version of the store that it
            //     // reads includes the changes it has made regardless of the commit state of that
            //     // transaction.
            //     // In the code above, "foo" and "bar" were put into the store, then "foo" was
            //     // deleted so only "bar" will return a result when the database is queried via the
            //     // writer.
            //     log_debug!(
            //         "It should be None! ({:?})",
            //         store.get(&writer, "foo").unwrap()
            //     );
            //     log_debug!("Get bar ({:?})", store.get(&writer, "bar").unwrap());

            //     // But a reader won't see that change until the write transaction is committed.
            //     {
            //         let reader = env.read().expect("reader");
            //         log_debug!("Get foo {:?}", store.get(&reader, "foo").unwrap());
            //         log_debug!("Get bar {:?}", store.get(&reader, "bar").unwrap());
            //     }
            //     writer.commit().unwrap();
            //     {
            //         let reader = env.read().expect("reader");
            //         log_debug!(
            //             "It should be None! ({:?})",
            //             store.get(&reader, "foo").unwrap()
            //         );
            //         log_debug!("Get bar {:?}", store.get(&reader, "bar").unwrap());
            //     }

            //     // Committing a transaction consumes the writer, preventing you from reusing it by
            //     // failing at compile time with an error. This line would report "error[E0382]:
            //     // borrow of moved value: `writer`".
            //     // store.put(&mut writer, "baz", &Value::Str("buz")).unwrap();
            // }

            // {
            //     // Clearing all the entries in the store with a write transaction.
            //     {
            //         let mut writer = env.write().unwrap();
            //         store.put(&mut writer, "foo", &Value::Blob(b"bar")).unwrap();
            //         store.put(&mut writer, "bar", &Value::Blob(b"baz")).unwrap();
            //         writer.commit().unwrap();
            //     }

            //     // {
            //     //     let mut writer = env.write().unwrap();
            //     //     store.clear(&mut writer).unwrap();
            //     //     writer.commit().unwrap();
            //     // }

            //     // {
            //     //     let reader = env.read().expect("reader");
            //     //     log_debug!(
            //     //         "It should be None! ({:?})",
            //     //         store.get(&reader, "foo").unwrap()
            //     //     );
            //     //     log_debug!(
            //     //         "It should be None! ({:?})",
            //     //         store.get(&reader, "bar").unwrap()
            //     //     );
            //     // }
            // }

            let stat = env.stat().unwrap();
            let info = env.info().unwrap();
            log_debug!("LMDB info map_size : {}", info.map_size());
            log_debug!("LMDB info last_pgno : {}", info.last_pgno());
            log_debug!("LMDB info last_txnid : {}", info.last_txnid());
            log_debug!("LMDB info max_readers : {}", info.max_readers());
            log_debug!("LMDB info num_readers : {}", info.num_readers());
            log_debug!("LMDB stat page_size : {}", stat.page_size());
            log_debug!("LMDB stat depth : {}", stat.depth());
            log_debug!("LMDB stat branch_pages : {}", stat.branch_pages());
            log_debug!("LMDB stat leaf_pages : {}", stat.leaf_pages());
            log_debug!("LMDB stat overflow_pages : {}", stat.overflow_pages());
            log_debug!("LMDB stat entries : {}", stat.entries());
        }
        // We reopen the env and data to see if it was well saved to disk.
        {
            let mut manager = Manager::<LmdbEnvironment>::singleton().write().unwrap();
            let shared_rkv = manager
                .get_or_create(root.path(), |path| {
                    //Rkv::new::<Lmdb>(path) // use this instead to disable encryption
                    Rkv::with_encryption_key_and_mapsize::<Lmdb>(path, key, 1 * 1024 * 1024 * 1024)
                })
                .unwrap();
            let env = shared_rkv.read().unwrap();

            log_debug!("LMDB Version: {}", env.version());

            let mut store = env.open_single("testdb", StoreOptions::default()).unwrap(); //StoreOptions::create()

            {
                let reader = env.read().expect("reader");
                log_debug!(
                    "It should be baz! ({:?})",
                    store.get(&reader, "bar").unwrap()
                );
            }
        }
        // Here the database and environment is closed, but the files are still present in the temp directory.
        // uncomment this if you need time to copy them somewhere for analysis, before the temp folder get destroyed
        //thread::sleep(Duration::from_millis(20000));
    }
}
