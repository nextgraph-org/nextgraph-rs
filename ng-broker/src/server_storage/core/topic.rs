// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Topic Storage (Object Key/Col/Value Mapping)

use std::collections::HashMap;
use std::collections::HashSet;

use ng_net::types::*;
use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::*;
use ng_repo::types::*;

use serde_bare::to_vec;

use crate::server_broker::TopicInfo;

pub struct TopicStorage<'a> {
    key: Vec<u8>,
    repo: ExistentialValue<RepoHash>,
    storage: &'a dyn KCVStorage,
}

impl<'a> IModel for TopicStorage<'a> {
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
        Some(&mut self.repo)
    }
    // fn name(&self) -> String {
    //     format_type_of(self)
    // }
}

impl<'a> TopicStorage<'a> {
    const PREFIX: u8 = b't';

    // Topic properties
    pub const ADVERT: SingleValueColumn<Self, PublisherAdvert> = SingleValueColumn::new(b'a');
    pub const REPO: ExistentialValueColumn = ExistentialValueColumn::new(b'r');
    pub const ROOT_COMMIT: SingleValueColumn<Self, ObjectId> = SingleValueColumn::new(b'o');

    // Topic <-> Users who pinned it (with boolean: R or W)
    pub const USERS: MultiMapColumn<Self, UserId, bool> = MultiMapColumn::new(b'u');
    // Topic <-> heads
    pub const HEADS: MultiValueColumn<Self, ObjectId> = MultiValueColumn::new(b'h');

    pub const CLASS: Class<'a> = Class::new(
        "Topic",
        Some(Self::PREFIX),
        Some(&Self::REPO),
        &[&Self::ADVERT as &dyn ISingleValueColumn, &Self::ROOT_COMMIT],
        &[&Self::USERS as &dyn IMultiValueColumn, &Self::HEADS],
    );

    pub fn new(id: &TopicId, overlay: &OverlayId, storage: &'a dyn KCVStorage) -> Self {
        let mut key: Vec<u8> = Vec::with_capacity(33 + 33);
        key.append(&mut to_vec(overlay).unwrap());
        key.append(&mut to_vec(id).unwrap());
        TopicStorage {
            key,
            repo: ExistentialValue::<RepoHash>::new(),
            storage,
        }
    }

    pub fn load(
        id: &TopicId,
        overlay: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<TopicInfo, StorageError> {
        let mut opening = TopicStorage::new(id, overlay, storage);
        let props = opening.load_props()?;
        let existential = col(&Self::REPO, &props)?;
        opening.repo.set(&existential)?;
        let ti = TopicInfo {
            repo: existential,
            publisher_advert: col(&Self::ADVERT, &props).ok(),
            root_commit: col(&Self::ROOT_COMMIT, &props).ok(),
            users: Self::USERS.get_all(&mut opening)?,
            current_heads: Self::HEADS.get_all(&mut opening)?,
        };
        Ok(ti)
    }

    pub fn open(
        id: &TopicId,
        overlay: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<TopicStorage<'a>, StorageError> {
        let mut opening = TopicStorage::new(id, overlay, storage);
        opening.check_exists()?;
        Ok(opening)
    }
    pub fn create(
        id: &TopicId,
        overlay: &OverlayId,
        repo: &RepoHash,
        storage: &'a dyn KCVStorage,
        or_open: bool,
    ) -> Result<TopicStorage<'a>, StorageError> {
        let mut topic = TopicStorage::new(id, overlay, storage);
        if topic.exists() {
            if or_open {
                return Ok(topic);
            } else {
                return Err(StorageError::AlreadyExists);
            }
        }
        topic.repo.set(repo)?;
        ExistentialValue::save(&topic, repo)?;

        Ok(topic)
    }

    pub fn repo_hash(&mut self) -> &RepoHash {
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

    pub fn add_user(&mut self, user: &UserId, publisher: bool) -> Result<(), StorageError> {
        Self::USERS.add(self, user, &publisher)
    }
    pub fn remove_user(&mut self, user: &UserId, publisher: bool) -> Result<(), StorageError> {
        Self::USERS.remove(self, user, &publisher)
    }

    pub fn has_user(&mut self, user: &UserId, publisher: bool) -> Result<(), StorageError> {
        Self::USERS.has(self, user, &publisher)
    }

    pub fn get_all_users(&mut self) -> Result<HashMap<UserId, bool>, StorageError> {
        Self::USERS.get_all(self)
    }
}
