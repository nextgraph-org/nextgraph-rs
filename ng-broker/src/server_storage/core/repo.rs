// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Repo Storage (Object Key/Col/Value Mapping)

use std::collections::HashSet;

use serde_bare::to_vec;

use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::*;
use ng_repo::types::*;

use crate::server_broker::RepoInfo;

pub struct RepoHashStorage<'a> {
    key: Vec<u8>,
    storage: &'a dyn KCVStorage,
}

impl<'a> IModel for RepoHashStorage<'a> {
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

impl<'a> RepoHashStorage<'a> {
    // RepoHash <-> Topic : list of topics of a repo that was pinned on the broker
    pub const TOPICS: MultiValueColumn<Self, TopicId> = MultiValueColumn::new(b'r');
    // RepoHash <-> User : list of users who asked to expose the repo to the outer overlay
    pub const EXPOSE_OUTER: MultiValueColumn<Self, UserId> = MultiValueColumn::new(b'x');

    pub const CLASS: Class<'a> = Class::new(
        "Repo",
        None,
        None,
        &[],
        &[&Self::TOPICS as &dyn IMultiValueColumn, &Self::EXPOSE_OUTER],
    );

    pub fn load(
        repo: &RepoHash,
        overlay: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<RepoInfo, StorageError> {
        let mut opening = Self::new(repo, overlay, storage);
        let info = RepoInfo {
            topics: Self::TOPICS.get_all(&mut opening)?,
            expose_outer: Self::EXPOSE_OUTER.get_all(&mut opening)?,
        };
        Ok(info)
    }

    pub fn load_topics(
        repo: &RepoHash,
        overlay: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<RepoInfo, StorageError> {
        let mut opening = Self::new(repo, overlay, storage);
        let info = RepoInfo {
            topics: Self::TOPICS.get_all(&mut opening)?,
            expose_outer: HashSet::new(),
        };
        Ok(info)
    }

    pub fn load_for_user(
        user: &UserId,
        repo: &RepoHash,
        overlay: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<RepoInfo, StorageError> {
        let mut opening = Self::new(repo, overlay, storage);
        let mut expose_outer = HashSet::new();
        if let Ok(()) = Self::EXPOSE_OUTER.has(&mut opening, user) {
            expose_outer.insert(*user);
        }
        let info = RepoInfo {
            topics: Self::TOPICS.get_all(&mut opening)?,
            expose_outer,
        };
        Ok(info)
    }

    pub fn new(repo: &RepoHash, overlay: &OverlayId, storage: &'a dyn KCVStorage) -> Self {
        let mut key: Vec<u8> = Vec::with_capacity(33 + 33);
        key.append(&mut to_vec(overlay).unwrap());
        key.append(&mut to_vec(repo).unwrap());
        Self { key, storage }
    }

    pub fn open(
        repo: &RepoHash,
        overlay: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<RepoHashStorage<'a>, StorageError> {
        let opening = Self::new(repo, overlay, storage);
        Ok(opening)
    }
    pub fn create(
        repo: &RepoHash,
        overlay: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<RepoHashStorage<'a>, StorageError> {
        let creating = Self::new(repo, overlay, storage);
        Ok(creating)
    }
}
