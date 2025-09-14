// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Inbox Storage (Object Key/Col/Value Mapping)

use std::collections::HashSet;
use std::hash::{DefaultHasher, Hash, Hasher};

use ng_net::types::InboxMsg;
use ng_repo::utils::now_precise_timestamp;
use serde_bare::to_vec;

use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::*;
use ng_repo::types::*;

pub struct InboxStorage<'a> {
    key: Vec<u8>,
    storage: &'a dyn KCVStorage,
}

impl<'a> IModel for InboxStorage<'a> {
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

// seconds, nanosecs, hash of InboxMsgBody
type MsgKeySuffix = (u64, u32, u64);

impl<'a> InboxStorage<'a> {
    // Inbox <-> Msg : list of incoming messages that will be delivered once a user is online
    pub const MSGS: MultiMapColumn<Self, MsgKeySuffix, InboxMsg> = MultiMapColumn::new(b'm');
    // Inbox <-> User : list of users who registered as readers of an inbox
    pub const READERS: MultiValueColumn<Self, UserId> = MultiValueColumn::new(b'i');

    pub const CLASS: Class<'a> = Class::new(
        "Inbox",
        None,
        None,
        &[],
        &[&Self::MSGS as &dyn IMultiValueColumn, &Self::READERS],
    );

    pub fn take_first_msg(
        inbox: &PubKey,
        overlay: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<InboxMsg, StorageError> {
        let mut opening = Self::new(inbox, overlay, storage);
        Self::MSGS.take_first_value(&mut opening)
    }

    pub fn load_readers(
        inbox: &PubKey,
        overlay: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<HashSet<UserId>, StorageError> {
        let mut opening = Self::new(inbox, overlay, storage);
        Self::READERS.get_all(&mut opening)
    }

    pub fn new(inbox: &PubKey, overlay: &OverlayId, storage: &'a dyn KCVStorage) -> Self {
        let mut key: Vec<u8> = Vec::with_capacity(33 + 33);
        key.append(&mut to_vec(overlay).unwrap());
        key.append(&mut to_vec(inbox).unwrap());
        Self { key, storage }
    }

    pub fn open(
        inbox: &PubKey,
        overlay: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<InboxStorage<'a>, StorageError> {
        let opening = Self::new(inbox, overlay, storage);
        Ok(opening)
    }

    pub fn register_reader(
        inbox: &PubKey,
        overlay: &OverlayId,
        reader: &UserId,
        storage: &'a dyn KCVStorage,
    ) -> Result<(), StorageError> {
        let mut opening = Self::new(inbox, overlay, storage);
        Self::READERS.add(&mut opening, reader)
    }

    pub fn enqueue_msg(&mut self, msg: &InboxMsg) -> Result<(), StorageError> {
        let (sec,nano) = now_precise_timestamp();
        let mut hasher = DefaultHasher::new();
        msg.body.hash(&mut hasher);
        let key = (sec,nano, hasher.finish());
        Self::MSGS.add(self, &key,msg)
    }

    pub fn create(
        inbox: &PubKey,
        overlay: &OverlayId,
        storage: &'a dyn KCVStorage,
    ) -> Result<InboxStorage<'a>, StorageError> {
        let creating = Self::new(inbox, overlay, storage);
        Ok(creating)
    }
}
