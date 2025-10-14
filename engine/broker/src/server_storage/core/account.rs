// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Account Storage (Object Key/Col/Value Mapping)

use std::collections::HashSet;
use std::hash::{DefaultHasher, Hash, Hasher};

use ng_net::types::InboxMsg;
use ng_repo::utils::now_precise_timestamp;
use serde_bare::to_vec;

use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::*;
use ng_repo::types::*;

pub struct AccountStorage<'a> {
    key: Vec<u8>,
    storage: &'a dyn KCVStorage,
}

impl<'a> IModel for AccountStorage<'a> {
    fn key(&self) -> &Vec<u8> {
        &self.key
    }
    fn storage(&self) -> &dyn KCVStorage {
        self.storage
    }
    fn class(&self) -> &Class {
        &Self::CLASS
    }
    fn existential(&mut self) -> Option<&mut dyn IExistentialValue> {
        None
    }
}

impl<'a> AccountStorage<'a> {
    // User <-> Inboxes : list of inboxes a user has registered as reader. 
    // FIXME: this should be in accounts storage, but because it doesn't implement the ORM yet, it is quicker to implement it here.
    pub const INBOXES: MultiValueColumn<Self, (PubKey, OverlayId)> = MultiValueColumn::new(b'k');

    pub const CLASS: Class<'a> = Class::new(
        "Account",
        None,
        None,
        &[],
        &[&Self::INBOXES as &dyn IMultiValueColumn],
    );

    pub fn load_inboxes(
        user: &UserId,
        storage: &'a dyn KCVStorage,
    ) -> Result<HashSet<(PubKey, OverlayId)>, StorageError> {
        let mut opening = Self::new(user, storage);
        Self::INBOXES.get_all(&mut opening)
    }

    pub fn new(user: &UserId, storage: &'a dyn KCVStorage) -> Self {
        let mut key: Vec<u8> = Vec::with_capacity(33);
        key.append(&mut to_vec(user).unwrap());
        Self { key, storage }
    }

    pub fn open(
        user: &UserId,
        storage: &'a dyn KCVStorage,
    ) -> Result<AccountStorage<'a>, StorageError> {
        let opening = Self::new(user, storage);
        Ok(opening)
    }

    pub fn add_inbox(
        user: &UserId,
        inbox: PubKey,
        overlay: OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<(), StorageError> {
        let mut opening = Self::new(user, storage);
        Self::INBOXES.add(&mut opening, &(inbox,overlay))
    }

    pub fn create(
        user: &UserId,
        storage: &'a dyn KCVStorage,
    ) -> Result<AccountStorage<'a>, StorageError> {
        let creating = Self::new(user, storage);
        Ok(creating)
    }
}
