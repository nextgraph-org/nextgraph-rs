// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Repository serde implementation and in memory helper

use crate::errors::*;
use crate::log::*;
use crate::store::*;
use crate::types::*;

use std::collections::HashMap;
use std::collections::HashSet;

impl RepositoryV0 {
    pub fn new(id: &PubKey, metadata: &Vec<u8>) -> RepositoryV0 {
        RepositoryV0 {
            id: id.clone(),
            metadata: metadata.clone(),
            verification_program: vec![],
            creator: None,
        }
    }
}

impl Repository {
    pub fn new(id: &PubKey, metadata: &Vec<u8>) -> Repository {
        Repository::V0(RepositoryV0::new(id, metadata))
    }
}

pub struct UserInfo {
    /// list of permissions granted to user, with optional metadata
    pub permissions: HashMap<PermissionV0, Vec<u8>>,
    pub id: UserId,
}

impl UserInfo {
    pub fn has_any_perm(&self, perms: &HashSet<PermissionV0>) -> Result<(), NgError> {
        //log_debug!("perms {:?}", perms);
        if self.has_perm(&PermissionV0::Owner).is_ok() {
            return Ok(());
        }
        let is_admin = self.has_perm(&PermissionV0::Admin).is_ok();
        //log_debug!("is_admin {}", is_admin);
        //is_delegated_by_admin
        let has_perms: HashSet<&PermissionV0> = self.permissions.keys().collect();
        //log_debug!("has_perms {:?}", has_perms);
        for perm in perms {
            if is_admin && perm.is_delegated_by_admin() || has_perms.contains(perm) {
                return Ok(());
            }
        }
        // if has_perms.intersection(perms).count() > 0 {
        //     Ok(())
        // } else {
        Err(NgError::PermissionDenied)
    }
    pub fn has_perm(&self, perm: &PermissionV0) -> Result<&Vec<u8>, NgError> {
        self.permissions.get(perm).ok_or(NgError::PermissionDenied)
    }
}

/// In memory Repository representation. With helper functions that access the underlying UserStore and keeps proxy of the values
pub struct Repo<'a> {
    /// Repo definition
    pub repo_def: Repository,

    pub members: HashMap<Digest, UserInfo>,

    store: &'a Box<dyn RepoStore + Send + Sync + 'a>,
}

impl<'a> Repo<'a> {
    pub fn new_with_member(
        id: &PubKey,
        member: &UserId,
        perms: &[PermissionV0],
        store: &'a Box<dyn RepoStore + Send + Sync + 'a>,
    ) -> Self {
        let mut members = HashMap::new();
        let permissions = HashMap::from_iter(
            perms
                .iter()
                .map(|p| (*p, vec![]))
                .collect::<Vec<(PermissionV0, Vec<u8>)>>()
                .iter()
                .cloned(),
        );
        members.insert(
            member.into(),
            UserInfo {
                id: *member,
                permissions,
            },
        );
        Self {
            repo_def: Repository::new(id, &vec![]),
            members,
            store,
        }
    }

    pub fn verify_permission(&self, commit: &Commit) -> Result<(), NgError> {
        let content_author = commit.content_v0().author;
        let body = commit.load_body(&self.store)?;
        match self.members.get(&content_author) {
            Some(info) => return info.has_any_perm(&body.required_permission()),
            None => {}
        }
        Err(NgError::PermissionDenied)
    }

    pub fn member_pubkey(&self, hash: &Digest) -> Result<UserId, NgError> {
        match self.members.get(hash) {
            Some(user_info) => Ok(user_info.id),
            None => Err(NgError::NotFound),
        }
    }

    pub fn get_store(&self) -> &Box<dyn RepoStore + Send + Sync + 'a> {
        self.store
    }
}
