// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Commit Storage (Object Key/Col/Value Mapping)

use std::collections::HashMap;
use std::collections::HashSet;

use ng_net::types::*;
use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::*;
use ng_repo::types::*;

use serde_bare::to_vec;

use crate::server_broker::CommitInfo;
use crate::server_broker::EventInfo;

pub struct CommitStorage<'a> {
    key: Vec<u8>,
    event: ExistentialValue<Option<EventInfo>>,
    storage: &'a dyn KCVStorage,
}

impl<'a> IModel for CommitStorage<'a> {
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
        Some(&mut self.event)
    }
}

impl<'a> CommitStorage<'a> {
    const PREFIX: u8 = b'e';

    // Topic properties
    pub const EVENT: ExistentialValueColumn = ExistentialValueColumn::new(b'e');
    pub const HOME_PINNED: SingleValueColumn<Self, bool> = SingleValueColumn::new(b'p');

    // Commit -> Acks
    pub const ACKS: MultiValueColumn<Self, ObjectId> = MultiValueColumn::new(b'a');
    // Commit -> Deps
    pub const DEPS: MultiValueColumn<Self, ObjectId> = MultiValueColumn::new(b'd');
    // Commit -> Files
    pub const FILES: MultiValueColumn<Self, ObjectId> = MultiValueColumn::new(b'f');
    // Commit -> Causal future commits
    pub const FUTURES: MultiValueColumn<Self, ObjectId> = MultiValueColumn::new(b'c');

    pub const CLASS: Class<'a> = Class::new(
        "Commit",
        Some(Self::PREFIX),
        Some(&Self::EVENT),
        &[&Self::HOME_PINNED as &dyn ISingleValueColumn],
        &[
            &Self::ACKS as &dyn IMultiValueColumn,
            &Self::DEPS,
            &Self::FILES,
            &Self::FUTURES,
        ],
    );

    pub fn new(id: &ObjectId, overlay: &OverlayId, storage: &'a dyn KCVStorage) -> Self {
        let mut key: Vec<u8> = Vec::with_capacity(33 + 33);
        key.append(&mut to_vec(overlay).unwrap());
        key.append(&mut to_vec(id).unwrap());
        CommitStorage {
            key,
            event: ExistentialValue::<Option<EventInfo>>::new(),
            storage,
        }
    }

    pub fn load(
        id: &ObjectId,
        overlay: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<CommitInfo, StorageError> {
        let mut opening = CommitStorage::new(id, overlay, storage);
        let props = opening.load_props()?;
        let existential = col(&Self::EVENT, &props)?;
        opening.event.set(&existential)?;
        Ok(CommitInfo {
            event: existential,
            home_pinned: col(&Self::HOME_PINNED, &props).unwrap_or(false),
            acks: Self::ACKS.get_all(&mut opening)?,
            deps: Self::DEPS.get_all(&mut opening)?,
            files: Self::FILES.get_all(&mut opening)?,
            futures: Self::FUTURES.get_all(&mut opening)?,
        })
    }

    pub fn open(
        id: &ObjectId,
        overlay: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<CommitStorage<'a>, StorageError> {
        let mut opening = CommitStorage::new(id, overlay, storage);
        opening.check_exists()?;
        Ok(opening)
    }
    pub fn create(
        id: &ObjectId,
        overlay: &OverlayId,
        event: &Option<EventInfo>,
        storage: &'a dyn KCVStorage,
    ) -> Result<CommitStorage<'a>, StorageError> {
        let mut creating = CommitStorage::new(id, overlay, storage);
        if creating.exists() {
            return Err(StorageError::AlreadyExists);
        }
        creating.event.set(event)?;
        ExistentialValue::save(&creating, event)?;

        Ok(creating)
    }

    pub fn event(&mut self) -> &Option<EventInfo> {
        self.event.get().unwrap()
    }
}
