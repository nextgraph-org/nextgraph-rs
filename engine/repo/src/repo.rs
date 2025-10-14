// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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

#[derive(Debug, Clone)]
pub struct BranchInfo {
    pub id: BranchId,

    pub branch_type: BranchType,

    pub crdt: BranchCrdt,

    pub topic: Option<TopicId>,

    pub topic_priv_key: Option<BranchWriteCapSecret>,

    pub read_cap: Option<ReadCap>,

    pub fork_of: Option<BranchId>,

    pub merged_in: Option<BranchId>,

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

    pub inbox: Option<PrivKey>,

    pub certificate_ref: Option<ObjectRef>,

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
    pub timestamp: Timestamp,
    pub final_consistency: bool,
    pub commit_type: CommitType,
    pub branch: Option<ObjectId>,
    pub x: u32,
    pub y: u32,
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
        recursor: &mut Vec<(BlockRef, Option<ObjectId>)>,
        visited: &mut HashMap<ObjectId, (HashSet<ObjectId>, CommitInfo)>,
        signatures: &mut HashMap<ObjectId, ObjectRef>,
    ) -> Result<Option<ObjectId>, VerifierError> {
        let mut root = None;
        while let Some((next_ref, future)) = recursor.pop() {
            if let Ok(cobj) = Commit::load(next_ref, &self.store, true) {
                let id = cobj.id().unwrap();
                if let Some((future_set, info)) = visited.get_mut(&id) {
                    // we update the future
                    if let Some(f) = future {
                        future_set.insert(f);
                    }
                    if let Some(sign) = signatures.remove(&id) {
                        info.signature = Some(sign);
                    }
                } else {
                    let commit_type = cobj.get_type().unwrap();
                    let acks = cobj.acks();
                    // for a in acks.iter() {
                    //     log_debug!("ACKS of {} {}", id.to_string(), a.id.to_string());
                    // }
                    let (past, real_acks, next_future) = match commit_type {
                        CommitType::SyncSignature => {
                            assert_eq!(acks.len(), 1);
                            let dep = cobj.deps();
                            assert_eq!(dep.len(), 1);
                            let mut current_commit = dep[0].clone();
                            let sign_ref = cobj.get_signature_reference().unwrap();
                            let real_acks;
                            let mut future = id;
                            loop {
                                let o = Commit::load(current_commit.clone(), &self.store, true)?;
                                let deps = o.deps();
                                let commit_info = CommitInfo {
                                    past: deps.iter().map(|r| r.id.clone()).collect(),
                                    key: o.key().unwrap(),
                                    signature: Some(sign_ref.clone()),
                                    author: self.get_user_string(o.author()),
                                    timestamp: o.timestamp(),
                                    final_consistency: o.final_consistency(),
                                    commit_type: o.get_type().unwrap(),
                                    branch: None,
                                    x: 0,
                                    y: 0,
                                };
                                let id = o.id().unwrap();

                                visited.insert(id, ([future].into(), commit_info));
                                future = id;
                                if id == acks[0].id {
                                    real_acks = o.acks();
                                    break;
                                }
                                assert_eq!(deps.len(), 1);
                                current_commit = deps[0].clone();
                            }
                            (vec![dep[0].id], real_acks, future)
                        }
                        CommitType::AsyncSignature => {
                            let past: Vec<ObjectId> = acks.iter().map(|r| r.id.clone()).collect();
                            let sign = cobj.get_signature_reference().unwrap();
                            for p in cobj.deps().iter() {
                                signatures.insert(p.id, sign.clone());
                                //visited.get_mut(&p.id).unwrap().1.signature = Some(sign.clone());
                            }
                            (past, acks, id)
                        }
                        _ => (acks.iter().map(|r| r.id.clone()).collect(), acks, id),
                    };

                    let commit_info = CommitInfo {
                        past,
                        key: cobj.key().unwrap(),
                        signature: signatures.remove(&id),
                        author: self.get_user_string(cobj.author()),
                        timestamp: cobj.timestamp(),
                        final_consistency: cobj.final_consistency(),
                        commit_type,
                        branch: None,
                        x: 0,
                        y: 0,
                    };
                    visited.insert(id, (future.map_or([].into(), |f| [f].into()), commit_info));
                    if real_acks.is_empty() && root.is_none() {
                        root = Some(next_future);
                    }
                    recursor.extend(real_acks.into_iter().map(|br| (br, Some(next_future))));
                    // for past_ref in real_acks {
                    //     let o = Commit::load(past_ref, &self.store, true)?;
                    //     if let Some(r) = self.load_causal_past(&o, visited, Some(next_future))? {
                    //         root = Some(r);
                    //     }
                    // }
                }
            }
        }
        Ok(root)
    }

    fn past_is_all_in(
        past: &Vec<ObjectId>,
        already_in: &HashMap<ObjectId, ObjectId>,
        coming_from: &ObjectId,
    ) -> bool {
        for p in past {
            if !already_in.contains_key(p) && p != coming_from {
                return false;
            }
        }
        true
    }

    fn collapse(
        id: &ObjectId,
        dag: &mut HashMap<ObjectId, (HashSet<ObjectId>, CommitInfo)>,
        already_in: &mut HashMap<ObjectId, ObjectId>,
        branches_order: &mut Vec<Option<ObjectId>>,
        branches: &mut HashMap<ObjectId, usize>,
        //swimlanes: &mut Vec<Vec<ObjectId>>,
    ) -> Vec<(ObjectId, CommitInfo)> {
        let (_, c) = dag.get(id).unwrap();
        //log_debug!("processing {id}");
        if c.past.len() > 1 && !Self::past_is_all_in(&c.past, already_in, id) {
            // we postpone the merge until all the past commits have been added
            //log_debug!("postponed {}", id);
            vec![]
        } else {
            let (future, mut info) = dag.remove(id).unwrap();
            let mut branch = match info.past.len() {
                0 => *id,
                _ => info.branch.unwrap(),
                // _ => {
                //     we merge on the smallest branch ordinal.
                //     let smallest_branch = info
                //         .past
                //         .iter()
                //         .map(|past_commit| {
                //             branches.get(already_in.get(past_commit).unwrap()).unwrap()
                //         })
                //         .min()
                //         .unwrap();
                //     branches_order
                //         .get(*smallest_branch)
                //         .unwrap()
                //         .unwrap()
                //         .clone()
                // }
            };
            info.branch = Some(branch.clone());
            // let swimlane_idx = branches.get(&branch).unwrap();
            // let swimlane = swimlanes.get_mut(*swimlane_idx).unwrap();
            // if swimlane.last().map_or(true, |last| last != &branch) {
            //     swimlane.push(branch.clone());
            // }
            let mut res = vec![(*id, info)];
            let mut first_child_branch = branch.clone();
            already_in.insert(*id, branch);
            let mut future = Vec::from_iter(future);
            future.sort();
            // the first branch is the continuation as parent.
            let mut iterator = future.iter().peekable();
            while let Some(child) = iterator.next() {
                //log_debug!("child of {} : {}", id, child);
                {
                    // we merge on the smallest branch ordinal.
                    let (_, info) = dag.get_mut(child).unwrap();
                    if let Some(b) = info.branch.to_owned() {
                        let previous_ordinal = branches.get(&b).unwrap();
                        let new_ordinal = branches.get(&branch).unwrap();
                        let close = if previous_ordinal > new_ordinal {
                            let _ = info.branch.insert(branch);
                            // we close the previous branch
                            // log_debug!(
                            //     "closing previous {} {} in favor of new {} {}",
                            //     previous_ordinal,
                            //     b,
                            //     new_ordinal,
                            //     branch
                            // );
                            &b
                        } else {
                            // otherwise we close the new branch
                            if first_child_branch == branch {
                                first_child_branch = b;
                            }
                            // log_debug!(
                            //     "closing new branch {} {} in favor of previous {} {}",
                            //     new_ordinal,
                            //     branch,
                            //     previous_ordinal,
                            //     b
                            // );
                            &branch
                        };
                        let i = branches.get(close).unwrap();
                        branches_order.get_mut(*i).unwrap().take();
                    } else {
                        let _ = info.branch.insert(branch);
                    }
                }
                // log_debug!(
                //     "branches_order before children of {child} {:?}",
                //     branches_order
                //         .iter()
                //         .enumerate()
                //         .map(|(i, b)| b.map_or(format!("{i}:closed"), |bb| format!("{i}:{bb}")))
                //         .collect::<Vec<String>>()
                //         .join(" -- ")
                // );
                res.append(&mut Self::collapse(
                    child,
                    dag,
                    already_in,
                    branches_order,
                    branches,
                    //swimlanes,
                ));
                // log_debug!(
                //     "branches_order after children of {child} {:?}",
                //     branches_order
                //         .iter()
                //         .enumerate()
                //         .map(|(i, b)| b.map_or(format!("{i}:closed"), |bb| format!("{i}:{bb}")))
                //         .collect::<Vec<String>>()
                //         .join(" -- ")
                // );
                // each other child gets a new branch
                if let Some(next) = iterator.peek() {
                    branch = **next;
                    if branches.contains_key(*next) {
                        continue;
                    }
                    let mut branch_inserted = false;
                    let mut first_child_branch_passed = false;
                    for (i, next_branch) in branches_order.iter_mut().enumerate() {
                        if let Some(b) = next_branch {
                            if b == &first_child_branch {
                                first_child_branch_passed = true;
                                //log_debug!("first_child_branch_passed");
                            }
                        }
                        if next_branch.is_none() && first_child_branch_passed {
                            //log_debug!("found empty lane {}, putting branch in it {}", i, branch);
                            let _ = next_branch.insert(branch.clone());
                            branches.insert(branch, i);
                            branch_inserted = true;
                            break;
                        }
                    }
                    if !branch_inserted {
                        //swimlanes.push(Vec::new());
                        // log_debug!(
                        //     "adding new lane {}, for branch {}",
                        //     branches_order.len(),
                        //     branch
                        // );
                        branches_order.push(Some(branch.clone()));
                        branches.insert(branch, branches_order.len() - 1);
                    }
                }
            }
            res
        }
    }

    pub fn history_at_heads(
        &self,
        heads: &[ObjectRef],
    ) -> Result<(Vec<(ObjectId, CommitInfo)>, Vec<Option<ObjectId>>), VerifierError> {
        assert!(!heads.is_empty());
        // for h in heads {
        //     log_debug!("HEAD {}", h.id);
        // }
        let mut visited = HashMap::new();
        let mut root = None;
        let mut recursor: Vec<(BlockRef, Option<ObjectId>)> =
            heads.iter().map(|h| (h.clone(), None)).collect();
        let mut signatures: HashMap<ObjectId, ObjectRef> = HashMap::new();
        let r = self.load_causal_past(&mut recursor, &mut visited, &mut signatures)?;
        if r.is_some() {
            root = r;
        }
        // for id in heads {
        //     if let Ok(cobj) = Commit::load(id.clone(), &self.store, true) {
        //         let r = self.load_causal_past(&cobj, &mut visited, None)?;
        //         //log_debug!("ROOT? {:?}", r.map(|rr| rr.to_string()));
        //         if r.is_some() {
        //             root = r;
        //         }
        //     }
        // }

        // for h in visited.keys() {
        //     log_debug!("VISITED {}", h);
        // }
        if root.is_none() {
            return Err(VerifierError::MalformedDag);
        }
        let root = root.unwrap();

        let mut already_in: HashMap<ObjectId, ObjectId> = HashMap::new();
        let mut branches_order: Vec<Option<ObjectId>> = vec![Some(root.clone())];
        let mut branches: HashMap<ObjectId, usize> = HashMap::from([(root.clone(), 0)]);
        //let mut swimlanes: Vec<Vec<ObjectId>> = vec![vec![root.clone()]];
        let mut commits = Self::collapse(
            &root,
            &mut visited,
            &mut already_in,
            &mut branches_order,
            &mut branches,
            //&mut swimlanes,
        );
        for (i, (_, commit)) in commits.iter_mut().enumerate() {
            commit.y = i as u32;
            commit.x = *branches.get(commit.branch.as_ref().unwrap()).unwrap() as u32;
        }
        Ok((commits, branches_order))
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
            let already_in_heads = set.contains(&commit_ref);
            branch.current_heads = set.into_iter().cloned().collect();
            if !already_in_heads {
                branch.current_heads.push(commit_ref);
                branch.commits_nbr += 1;
            }
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
            inbox: None,
            certificate_ref: None,
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

    pub fn store_branch(&self) -> Option<&BranchInfo> {
        for (_, branch) in self.branches.iter() {
            if branch.branch_type == BranchType::Store {
                return Some(branch);
            }
        }
        None
    }

    pub fn header_branch(&self) -> Option<&BranchInfo> {
        for (_, branch) in self.branches.iter() {
            if branch.branch_type == BranchType::Header {
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
            Some(bi) => Some(bi.read_cap.as_ref().unwrap()),
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
