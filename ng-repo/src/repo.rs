// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Repository

use core::fmt;
use std::collections::HashMap;
use std::collections::HashSet;
use std::sync::Arc;

use crate::errors::*;
#[allow(unused_imports)]
use crate::log::*;
use crate::store::Store;
use crate::types::*;

impl RepositoryV0 {
    pub fn new_with_meta(id: &PubKey, metadata: &Vec<u8>) -> RepositoryV0 {
        RepositoryV0 {
            id: id.clone(),
            metadata: metadata.clone(),
            verification_program: vec![],
            fork_of: vec![],
            creator: None,
        }
    }
}

impl Repository {
    pub fn new(id: &RepoId) -> Self {
        Repository::V0(RepositoryV0 {
            id: id.clone(),
            verification_program: vec![],
            creator: None,
            fork_of: vec![],
            metadata: vec![],
        })
    }
    pub fn new_with_meta(id: &PubKey, metadata: &Vec<u8>) -> Repository {
        Repository::V0(RepositoryV0::new_with_meta(id, metadata))
    }
    pub fn id(&self) -> &PubKey {
        match self {
            Self::V0(v0) => &v0.id,
        }
    }
}

#[derive(Debug)]
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

#[derive(Debug)]
pub struct BranchInfo {
    pub id: BranchId,

    pub branch_type: BranchType,

    pub topic: TopicId,

    pub topic_priv_key: Option<BranchWriteCapSecret>,

    pub read_cap: ReadCap,

    pub current_heads: Vec<ObjectRef>,
}

/// In memory Repository representation. With helper functions that access the underlying UserStore and keeps proxy of the values
#[derive(Debug)]
pub struct Repo {
    pub id: RepoId,
    /// Repo definition
    pub repo_def: Repository,

    pub read_cap: Option<ReadCap>,

    pub write_cap: Option<RepoWriteCapSecret>,

    pub signer: Option<SignerCap>,

    pub members: HashMap<Digest, UserInfo>,

    pub branches: HashMap<BranchId, BranchInfo>,

    /// if opened_branches is empty, it means the repo has not been opened yet.
    /// if a branchId is present in the hashmap, it means it is opened.
    /// the boolean indicates if the branch is opened as publisher or not
    pub opened_branches: HashMap<BranchId, bool>,

    /*pub main_branch_rc: Option<BranchId>,

    pub chat_branch_rc: Option<BranchId>,

    // only used if it is a StoreRepo
    pub store_branch_rc: Option<BranchId>,
    pub overlay_branch_rc: Option<BranchId>,

    // only used if it is a private StoreRepo
    pub user_branch_rc: Option<BranchId>,*/
    pub store: Arc<Store>,
}

impl fmt::Display for Repo {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "====== Repo ====== {}", self.id)?;

        write!(f, "== repo_def:    {}", self.repo_def)?;

        if self.signer.is_some() {
            writeln!(f, "== signer:   {:?}", self.signer)?;
        }

        writeln!(f, "== members:   {:?}", self.members)?;

        Ok(())
    }
}

impl Repo {
    #[cfg(any(test, feature = "testing"))]
    #[allow(deprecated)]
    pub fn new_with_perms(perms: &[PermissionV0], store: Arc<Store>) -> Self {
        let pub_key = PubKey::nil();
        Self::new_with_member(&pub_key, &pub_key, perms, OverlayId::dummy(), store)
    }

    pub fn update_branch_current_heads(
        &mut self,
        branch: &BranchId,
        commit_ref: ObjectRef,
        past: Vec<ObjectRef>,
    ) -> Result<Vec<ObjectRef>, VerifierError> {
        //log_info!("from branch {} HEAD UPDATED TO {}", branch, commit_ref.id);
        if let Some(branch) = self.branches.get_mut(branch) {
            let mut set: HashSet<&ObjectRef> = HashSet::from_iter(branch.current_heads.iter());
            for p in past {
                set.remove(&p);
            }
            branch.current_heads = set.into_iter().cloned().collect();
            branch.current_heads.push(commit_ref);
            // we return the new current heads
            Ok(branch.current_heads.to_vec())
        } else {
            Err(VerifierError::BranchNotFound)
        }
    }

    pub fn new_with_member(
        id: &PubKey,
        member: &UserId,
        perms: &[PermissionV0],
        overlay: OverlayId,
        store: Arc<Store>,
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
            CommitContent::author_digest(member, overlay),
            UserInfo {
                id: *member,
                permissions,
            },
        );
        Self {
            id: id.clone(),
            repo_def: Repository::new(&id),
            members,
            store,
            signer: None,
            read_cap: None,
            write_cap: None,
            branches: HashMap::new(),
            opened_branches: HashMap::new(),
            //main_branch_rc: None,
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

    pub fn branch(&self, id: &BranchId) -> Result<&BranchInfo, NgError> {
        //TODO: load the BranchInfo from storage
        self.branches.get(id).ok_or(NgError::BranchNotFound)
    }

    pub fn branch_mut(&mut self, id: &BranchId) -> Result<&mut BranchInfo, NgError> {
        //TODO: load the BranchInfo from storage
        self.branches.get_mut(id).ok_or(NgError::BranchNotFound)
    }

    pub fn overlay_branch(&self) -> Option<&BranchInfo> {
        for (_, branch) in self.branches.iter() {
            if branch.branch_type == BranchType::Overlay {
                return Some(branch);
            }
        }
        None
    }

    pub fn user_branch(&self) -> Option<&BranchInfo> {
        for (_, branch) in self.branches.iter() {
            if branch.branch_type == BranchType::User {
                return Some(branch);
            }
        }
        None
    }

    pub fn main_branch(&self) -> Option<&BranchInfo> {
        for (_, branch) in self.branches.iter() {
            if branch.branch_type == BranchType::Main {
                return Some(branch);
            }
        }
        None
    }

    pub fn root_branch(&self) -> Option<&BranchInfo> {
        for (_, branch) in self.branches.iter() {
            if branch.branch_type == BranchType::Root {
                return Some(branch);
            }
        }
        None
    }

    pub fn overlay_branch_read_cap(&self) -> Option<&ReadCap> {
        match self.overlay_branch() {
            Some(bi) => Some(&bi.read_cap),
            None => self.read_cap.as_ref(), // this is for private stores that don't have an overlay branch
        }
    }

    pub fn branch_is_opened(&self, branch: &BranchId) -> bool {
        self.opened_branches.contains_key(branch)
    }

    pub fn branch_is_opened_as_publisher(&self, branch: &BranchId) -> bool {
        match self.opened_branches.get(branch) {
            Some(val) => *val,
            None => false,
        }
    }

    // pub(crate) fn get_store(&self) -> &Store {
    //     self.store.unwrap()
    // }
}
