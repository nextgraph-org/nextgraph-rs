/*
 * Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
 */

use std::path::PathBuf;

use crate::types::*;
use p2p_net::broker_storage::*;
use p2p_repo::kcv_store::KCVStore;
use p2p_repo::types::SymKey;
use stores_lmdb::kcv_store::LmdbKCVStore;
use stores_lmdb::repo_store::LmdbRepoStore;

pub struct LmdbBrokerStorage {
    wallet_storage: LmdbKCVStore,
}

impl LmdbBrokerStorage {
    pub fn open(path: &mut PathBuf, master_key: SymKey) -> Self {
        path.push("wallet");
        std::fs::create_dir_all(path.clone()).unwrap();
        //TODO redo the whole key passing mechanism so it uses zeroize all the way
        let wallet_storage = LmdbKCVStore::open(&path, master_key.slice().clone());
        LmdbBrokerStorage { wallet_storage }
    }
}

impl BrokerStorage for LmdbBrokerStorage {
    fn get_user(&self) {}
}
