// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Topic

use std::collections::HashMap;
use std::collections::HashSet;

use ng_net::types::*;
use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::*;
use ng_repo::types::*;

use serde_bare::to_vec;

pub struct Topic<'a> {
    key: Vec<u8>,
    repo: ExistentialValue<RepoHash>,
    storage: &'a dyn KCVStorage,
}

impl<'a> IModel for Topic<'a> {
    fn key(&self) -> &Vec<u8> {
        &self.key
    }
    fn storage(&self) -> &dyn KCVStorage {
        self.storage
    }
    fn class(&self) -> &Class {
        &Self::CLASS
    }
    fn existential(&mut self) -> &mut dyn IExistentialValue {
        &mut self.repo
    }
}

impl<'a> Topic<'a> {
    const PREFIX: u8 = b't';

    // Topic properties
    const ADVERT: SingleValueColumn<Self, PublisherAdvert> = SingleValueColumn::new(b'a');
    const REPO: ExistentialValueColumn = ExistentialValueColumn::new(b'r');
    const ROOT_COMMIT: SingleValueColumn<Self, ObjectId> = SingleValueColumn::new(b'o');

    // Topic <-> Users who pinned it
    pub const USERS: MultiValueColumn<Self, UserId> = MultiValueColumn::new(b'u');
    // Topic <-> heads
    pub const HEADS: MultiValueColumn<Self, ObjectId> = MultiValueColumn::new(b'h');

    const CLASS: Class<'a> = Class::new(
        Self::PREFIX,
        &Self::REPO,
        vec![&Self::ADVERT, &Self::ROOT_COMMIT],
        vec![&Self::USERS, &Self::HEADS],
    );

    pub fn load(&self) -> Result<(), StorageError> {
        let props = self.load_props()?;
        // let bs = BranchInfo {
        //     id: id.clone(),
        //     branch_type: prop(Self::TYPE, &props)?,
        //     read_cap: prop(Self::READ_CAP, &props)?,
        //     topic: prop(Self::TOPIC, &props)?,
        //     topic_priv_key: prop(Self::PUBLISHER, &props).ok(),
        //     current_heads: Self::get_all_heads(id, storage)?,
        // };
        // Ok(bs)
        Ok(())
    }

    pub fn new(id: &TopicId, overlay: &OverlayId, storage: &'a dyn KCVStorage) -> Self {
        let mut key: Vec<u8> = Vec::with_capacity(33 + 33);
        key.append(&mut to_vec(overlay).unwrap());
        key.append(&mut to_vec(id).unwrap());
        Topic {
            key,
            repo: ExistentialValue::<RepoHash>::new(),
            storage,
        }
    }

    pub fn open(
        id: &TopicId,
        overlay: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<Topic<'a>, StorageError> {
        let mut opening = Topic::new(id, overlay, storage);
        opening.check_exists()?;
        Ok(opening)
    }
    pub fn create(
        id: &TopicId,
        overlay: &OverlayId,
        repo: &RepoHash,
        storage: &'a mut dyn KCVStorage,
    ) -> Result<Topic<'a>, StorageError> {
        let mut topic = Topic::new(id, overlay, storage);
        if topic.exists() {
            return Err(StorageError::AlreadyExists);
        }
        topic.repo.set(repo, &topic)?;

        Ok(topic)
    }

    pub fn repo_hash(&self) -> &RepoHash {
        self.repo.get().unwrap()
    }

    pub fn root_commit(&mut self) -> Result<ObjectId, StorageError> {
        Self::ROOT_COMMIT.get(self)
    }
    pub fn set_root_commit(&mut self, commit: &ObjectId) -> Result<(), StorageError> {
        Self::ROOT_COMMIT.set(self, commit)
    }

    pub fn publisher_advert(&mut self) -> Result<PublisherAdvert, StorageError> {
        Self::ADVERT.get(self)
    }
    pub fn set_publisher_advert(&mut self, advert: &PublisherAdvert) -> Result<(), StorageError> {
        Self::ADVERT.set(self, advert)
    }

    pub fn add_head(&mut self, head: &ObjectId) -> Result<(), StorageError> {
        Self::HEADS.add(self, head)
    }
    pub fn remove_head(&mut self, head: &ObjectId) -> Result<(), StorageError> {
        Self::HEADS.remove(self, head)
    }

    pub fn has_head(&mut self, head: &ObjectId) -> Result<(), StorageError> {
        Self::HEADS.has(self, head)
    }

    pub fn get_all_heads(&mut self) -> Result<HashSet<ObjectId>, StorageError> {
        Self::HEADS.get_all(self)
    }

    pub fn add_user(&mut self, user: &UserId) -> Result<(), StorageError> {
        Self::USERS.add(self, user)
    }
    pub fn remove_user(&mut self, user: &UserId) -> Result<(), StorageError> {
        Self::USERS.remove(self, user)
    }

    pub fn has_user(&mut self, user: &UserId) -> Result<(), StorageError> {
        Self::USERS.has(self, user)
    }

    pub fn get_all_users(&mut self) -> Result<HashSet<UserId>, StorageError> {
        Self::USERS.get_all(self)
    }
}
