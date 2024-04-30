// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Overlay Storage (Object Key/Col/Value Mapping)

use std::collections::HashMap;
use std::collections::HashSet;

use ng_net::types::*;
use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::*;
use ng_repo::types::*;

use serde_bare::to_vec;

use crate::server_broker::OverlayInfo;
use crate::server_broker::OverlayType;

pub struct OverlayStorage<'a> {
    key: Vec<u8>,
    overlay_type: ExistentialValue<OverlayType>,
    storage: &'a dyn KCVStorage,
}

impl<'a> IModel for OverlayStorage<'a> {
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
        Some(&mut self.overlay_type)
    }
    // fn name(&self) -> String {
    //     format_type_of(self)
    // }
}

impl<'a> OverlayStorage<'a> {
    const PREFIX: u8 = b'o';

    // Overlay properties
    pub const TYPE: ExistentialValueColumn = ExistentialValueColumn::new(b'y');
    pub const TOPIC: SingleValueColumn<Self, TopicId> = SingleValueColumn::new(b't');

    // Overlay <-> Block refcount
    pub const BLOCKS: MultiCounterColumn<Self, BlockId> = MultiCounterColumn::new(b'b');
    // Overlay <-> Object refcount
    pub const OBJECTS: MultiCounterColumn<Self, ObjectId> = MultiCounterColumn::new(b'j');

    pub const CLASS: Class<'a> = Class::new(
        "Overlay",
        Some(Self::PREFIX),
        Some(&Self::TYPE),
        &[&Self::TOPIC as &dyn ISingleValueColumn],
        &[&Self::BLOCKS as &dyn IMultiValueColumn, &Self::OBJECTS],
    );

    pub fn new(id: &OverlayId, storage: &'a dyn KCVStorage) -> Self {
        OverlayStorage {
            key: to_vec(id).unwrap(),
            overlay_type: ExistentialValue::<OverlayType>::new(),
            storage,
        }
    }

    pub fn load(id: &OverlayId, storage: &'a dyn KCVStorage) -> Result<OverlayInfo, StorageError> {
        let mut opening = OverlayStorage::new(id, storage);
        let props = opening.load_props()?;
        let existential = col(&Self::TYPE, &props)?;
        opening.overlay_type.set(&existential)?;
        let loading = OverlayInfo {
            overlay_type: existential,
            overlay_topic: col(&Self::TOPIC, &props).ok(),
            topics: HashMap::new(),
            repos: HashMap::new(),
        };
        Ok(loading)
    }

    pub fn open(
        id: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<OverlayStorage<'a>, StorageError> {
        let mut opening = OverlayStorage::new(id, storage);
        opening.check_exists()?;
        Ok(opening)
    }

    pub fn create(
        id: &OverlayId,
        overlay_type: &OverlayType,
        storage: &'a mut dyn KCVStorage,
    ) -> Result<OverlayStorage<'a>, StorageError> {
        let mut overlay = OverlayStorage::new(id, storage);
        if overlay.exists() {
            return Err(StorageError::AlreadyExists);
        }
        overlay.overlay_type.set(overlay_type)?;
        ExistentialValue::save(&overlay, overlay_type)?;

        Ok(overlay)
    }

    pub fn overlay_type(&mut self) -> &OverlayType {
        self.overlay_type.get().unwrap()
    }
}
