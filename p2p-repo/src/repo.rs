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
    pub permissions: HashMap<Permission, Vec<u8>>,
}

impl UserInfo {
    pub fn has_any_perm(&self, perms: &HashSet<&Permission>) -> Result<(), NgError> {
        let has_perms: HashSet<&Permission> = self.permissions.keys().collect();
        if has_perms.intersection(perms).count() > 0 {
            Ok(())
        } else {
            Err(NgError::PermissionDenied)
        }
        //
    }
    pub fn has_perm(&self, perm: &Permission) -> Result<&Vec<u8>, NgError> {
        self.permissions.get(perm).ok_or(NgError::PermissionDenied)
    }
}

/// In memory Repository representation. With helper functions that access the underlying UserStore and keeps proxy of the values
pub struct Repo<'a> {
    /// Repo definition
    pub repo_def: Repository,

    pub members: HashMap<UserId, UserInfo>,

    store: Box<dyn RepoStore + Send + Sync + 'a>,
}

impl<'a> Repo<'a> {
    pub fn new_with_member(
        id: &PubKey,
        member: UserId,
        perms: &[Permission],
        store: Box<dyn RepoStore + Send + Sync + 'a>,
    ) -> Self {
        let mut members = HashMap::new();
        let permissions = HashMap::from_iter(
            perms
                .iter()
                .map(|p| (*p, vec![]))
                .collect::<Vec<(Permission, Vec<u8>)>>()
                .iter()
                .cloned(),
        );
        members.insert(member, UserInfo { permissions });
        Self {
            repo_def: Repository::new(id, &vec![]),
            members,
            store,
        }
    }

    pub fn verify_permission(&self, commit: &Commit) -> Result<(), NgError> {
        let content = commit.content_v0();
        let body = commit.load_body(&self.store)?;
        match self.members.get(&content.author) {
            Some(info) => return info.has_any_perm(&body.required_permission()),
            None => {}
        }
        Err(NgError::PermissionDenied)
    }

    pub fn get_store(&self) -> &Box<dyn RepoStore + Send + Sync + 'a> {
        &self.store
    }
}
