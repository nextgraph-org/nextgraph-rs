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

use serde::{Deserialize, Serialize};

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

    pub commits_nbr: u64,
}

/// In memory Repository representation. With helper functions that access the underlying UserStorage and keeps proxy of the values
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

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CommitInfo {
    pub past: Vec<ObjectId>,
    pub key: ObjectKey,
    pub signature: Option<ObjectRef>,
    pub author: String,
    pub final_consistency: bool,
    pub commit_type: CommitType,
}

impl Repo {
    #[cfg(any(test, feature = "testing"))]
    #[allow(deprecated)]
    pub fn new_with_perms(perms: &[PermissionV0], store: Arc<Store>) -> Self {
        let pub_key = PubKey::nil();
        Self::new_with_member(&pub_key, &pub_key, perms, store)
    }

    pub(crate) fn get_user_string(&self, user_hash: &Digest) -> String {
        self.members
            .get(user_hash)
            .map_or_else(|| format!("t:{user_hash}"), |info| format!("i:{}", info.id))
    }

    fn load_causal_past(
        &self,
        cobj: &Commit,
        visited: &mut HashMap<ObjectId, CommitInfo>,
    ) -> Result<(), VerifierError> {
        let id = cobj.id().unwrap();
        if visited.get(&id).is_none() {
            let commit_type = cobj.get_type().unwrap();
            let acks = cobj.acks();
            let (past, real_acks) = match commit_type {
                CommitType::SyncSignature => {
                    assert_eq!(acks.len(), 1);
                    let dep = cobj.deps();
                    assert_eq!(dep.len(), 1);
                    let mut current_commit = dep[0].clone();
                    let sign_ref = cobj.get_signature_reference().unwrap();
                    let real_acks;
                    loop {
                        let o = Commit::load(current_commit.clone(), &self.store, true)?;
                        let deps = o.deps();
                        let commit_info = CommitInfo {
                            past: deps.iter().map(|r| r.id.clone()).collect(),
                            key: o.key().unwrap(),
                            signature: Some(sign_ref.clone()),
                            author: self.get_user_string(o.author()),
                            final_consistency: o.final_consistency(),
                            commit_type: o.get_type().unwrap(),
                        };
                        let id = o.id().unwrap();
                        visited.insert(id, commit_info);
                        if id == acks[0].id {
                            real_acks = o.acks();
                            break;
                        }
                        assert_eq!(deps.len(), 1);
                        current_commit = deps[0].clone();
                    }
                    (vec![dep[0].id], real_acks)
                }
                CommitType::AsyncSignature => {
                    let past: Vec<ObjectId> = acks.iter().map(|r| r.id.clone()).collect();
                    for p in past.iter() {
                        visited.get_mut(p).unwrap().signature =
                            Some(cobj.get_signature_reference().unwrap());
                    }
                    (past, acks)
                }
                _ => (acks.iter().map(|r| r.id.clone()).collect(), acks),
            };

            let commit_info = CommitInfo {
                past,
                key: cobj.key().unwrap(),
                signature: None,
                author: self.get_user_string(cobj.author()),
                final_consistency: cobj.final_consistency(),
                commit_type,
            };
            visited.insert(id, commit_info);
            for past_ref in real_acks {
                let o = Commit::load(past_ref, &self.store, true)?;
                self.load_causal_past(&o, visited)?;
            }
        }
        Ok(())
    }

    pub fn history_at_heads(
        &self,
        heads: &[ObjectRef],
    ) -> Result<HashMap<ObjectId, CommitInfo>, VerifierError> {
        let mut res = HashMap::new();
        for id in heads {
            if let Ok(cobj) = Commit::load(id.clone(), &self.store, true) {
                self.load_causal_past(&cobj, &mut res)?;
            }
        }
        Ok(res)
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
            branch.commits_nbr += 1;
            // we return the new current heads
            Ok(branch.current_heads.to_vec())
        } else {
            Err(VerifierError::BranchNotFound)
        }
    }

    pub fn new_with_member(
        repo_id: &PubKey,
        member: &UserId,
        perms: &[PermissionV0],
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
        let overlay = store.get_store_repo().overlay_id_for_read_purpose();
        let member_hash = CommitContent::author_digest(member, overlay);
        //log_debug!("added member {:?} {:?}", member, member_hash);
        members.insert(
            member_hash,
            UserInfo {
                id: *member,
                permissions,
            },
        );
        Self {
            id: repo_id.clone(),
            repo_def: Repository::new(&repo_id),
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
