// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Commit Storage (Object Key/Col/Value Mapping)

use either::Either;
use serde_bare::to_vec;

use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::*;
use ng_repo::types::*;

use super::OverlayStorage;

use crate::server_broker::CommitInfo;
use crate::server_broker::EventInfo;

pub struct CommitStorage<'a> {
    key: Vec<u8>,
    event: ExistentialValue<Either<EventInfo, TopicId>>,
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
            event: ExistentialValue::<Either<EventInfo, TopicId>>::new(),
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
        event: EventInfo,
        header: &Option<CommitHeader>,
        home_pinned: bool,
        storage: &'a dyn KCVStorage,
    ) -> Result<CommitStorage<'a>, StorageError> {
        let mut creating = CommitStorage::new(id, overlay, storage);
        if creating.exists() {
            return Err(StorageError::AlreadyExists);
        }
        let event_either = Either::Left(event);
        creating.event.set(&event_either)?;
        ExistentialValue::save(&creating, &event_either)?;

        if home_pinned {
            Self::HOME_PINNED.set(&mut creating, &true)?;
        }
        if let Some(header) = header {
            let mut overlay_storage = OverlayStorage::new(overlay, storage);
            // adding all the references
            for ack in header.acks() {
                Self::ACKS.add(&mut creating, &ack)?;
                OverlayStorage::OBJECTS.increment(&mut overlay_storage, &ack)?;
            }
            for dep in header.deps() {
                Self::DEPS.add(&mut creating, &dep)?;
                OverlayStorage::OBJECTS.increment(&mut overlay_storage, &dep)?;
            }
            for file in header.files() {
                Self::FILES.add(&mut creating, file)?;
                OverlayStorage::OBJECTS.increment(&mut overlay_storage, &file)?;
            }
        }

        Ok(creating)
    }

    pub fn event(&mut self) -> &Either<EventInfo, TopicId> {
        self.event.get().unwrap()
    }
    pub fn take_event(self) -> Either<EventInfo, TopicId> {
        self.event.take().unwrap()
    }
}
