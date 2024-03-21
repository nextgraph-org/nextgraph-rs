// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Commit

use core::fmt;
//use ed25519_dalek::*;
use once_cell::sync::OnceCell;

use crate::errors::NgError;

use crate::object::*;
use crate::repo::Repo;
use crate::store::*;
use crate::types::*;
use crate::utils::*;
use std::collections::HashSet;
use std::iter::FromIterator;

#[derive(Debug)]
pub enum CommitLoadError {
    MissingBlocks(Vec<BlockId>),
    ObjectParseError,
    NotACommitError,
    NotACommitBodyError,
    CannotBeAtRootOfBranch,
    MustBeAtRootOfBranch,
    BodyLoadError,
    HeaderLoadError,
    BodyTypeMismatch,
}

#[derive(Debug)]
pub enum CommitVerifyError {
    InvalidSignature,
    PermissionDenied,
    BodyLoadError(CommitLoadError),
    DepLoadError(CommitLoadError),
}

impl CommitV0 {
    /// New commit
    pub fn new(
        author_privkey: PrivKey,
        author_pubkey: PubKey,
        seq: u64,
        branch: BranchId,
        quorum: QuorumType,
        deps: Vec<ObjectRef>,
        ndeps: Vec<ObjectRef>,
        acks: Vec<ObjectRef>,
        nacks: Vec<ObjectRef>,
        refs: Vec<ObjectRef>,
        nrefs: Vec<ObjectRef>,
        metadata: Vec<u8>,
        body: ObjectRef,
    ) -> Result<CommitV0, NgError> {
        let headers = CommitHeader::new_with(deps, ndeps, acks, nacks, refs, nrefs);
        let content = CommitContentV0 {
            perms: vec![],
            author: (&author_pubkey).into(),
            seq,
            branch,
            header_keys: headers.1,
            quorum,
            metadata,
            body,
        };
        let content_ser = serde_bare::to_vec(&content).unwrap();

        // sign commit
        let sig = sign(&author_privkey, &author_pubkey, &content_ser)?;
        Ok(CommitV0 {
            content: CommitContent::V0(content),
            sig,
            id: None,
            key: None,
            header: headers.0,
            body: OnceCell::new(),
        })
    }
}

impl Commit {
    /// New commit
    pub fn new(
        author_privkey: PrivKey,
        author_pubkey: PubKey,
        seq: u64,
        branch: BranchId,
        quorum: QuorumType,
        deps: Vec<ObjectRef>,
        ndeps: Vec<ObjectRef>,
        acks: Vec<ObjectRef>,
        nacks: Vec<ObjectRef>,
        refs: Vec<ObjectRef>,
        nrefs: Vec<ObjectRef>,
        metadata: Vec<u8>,
        body: ObjectRef,
    ) -> Result<Commit, NgError> {
        CommitV0::new(
            author_privkey,
            author_pubkey,
            seq,
            branch,
            quorum,
            deps,
            ndeps,
            acks,
            nacks,
            refs,
            nrefs,
            metadata,
            body,
        )
        .map(|c| Commit::V0(c))
    }

    pub fn save(
        &mut self,
        block_size: usize,
        store_pubkey: &StoreRepo,
        store_secret: &ReadCapSecret,
        store: &Box<impl RepoStore + ?Sized>,
    ) -> Result<ObjectRef, StorageError> {
        match self {
            Commit::V0(v0) => {
                let mut obj = Object::new(
                    ObjectContent::V0(ObjectContentV0::Commit(Commit::V0(v0.clone()))),
                    v0.header.clone(),
                    block_size,
                    store_pubkey,
                    store_secret,
                );
                obj.save(store)?;
                if let Some(h) = &mut v0.header {
                    h.set_id(obj.header().as_ref().unwrap().id().unwrap());
                }
                self.set_id(obj.get_and_save_id());
                self.set_key(obj.key().unwrap());
                Ok(obj.reference().unwrap())
            }
        }
    }

    /// Load commit from store
    pub fn load(
        commit_ref: ObjectRef,
        store: &Box<impl RepoStore + ?Sized>,
        with_body: bool,
    ) -> Result<Commit, CommitLoadError> {
        let (id, key) = (commit_ref.id, commit_ref.key);
        match Object::load(id, Some(key.clone()), store) {
            Ok(obj) => {
                let content = obj
                    .content()
                    .map_err(|_e| CommitLoadError::ObjectParseError)?;
                let mut commit = match content {
                    ObjectContent::V0(ObjectContentV0::Commit(c)) => c,
                    _ => return Err(CommitLoadError::NotACommitError),
                };
                commit.set_id(id);
                commit.set_key(key.clone());
                commit.set_header(obj.header().clone());

                if with_body {
                    commit.load_body(store)?;
                }

                Ok(commit)
            }
            Err(ObjectParseError::MissingBlocks(missing)) => {
                Err(CommitLoadError::MissingBlocks(missing))
            }
            Err(_) => Err(CommitLoadError::ObjectParseError),
        }
    }

    /// Load commit body from store
    pub fn load_body(
        &self,
        store: &Box<impl RepoStore + ?Sized>,
    ) -> Result<&CommitBody, CommitLoadError> {
        if self.body().is_some() {
            return Ok(self.body().unwrap());
        }
        let content = self.content_v0();
        let (id, key) = (content.body.id, content.body.key.clone());
        let obj = Object::load(id.clone(), Some(key.clone()), store).map_err(|e| match e {
            ObjectParseError::MissingBlocks(missing) => CommitLoadError::MissingBlocks(missing),
            _ => CommitLoadError::ObjectParseError,
        })?;
        let content = obj
            .content()
            .map_err(|_e| CommitLoadError::ObjectParseError)?;
        match content {
            ObjectContent::V0(ObjectContentV0::CommitBody(body)) => {
                self.set_body(body);
                Ok(self.body().unwrap())
            }
            _ => Err(CommitLoadError::NotACommitBodyError),
        }
    }

    fn set_body(&self, body: CommitBody) {
        match self {
            Commit::V0(c) => {
                c.body.set(body).unwrap();
            }
        }
    }

    /// Get ID of including `Object`,
    /// only available if the Commit was loaded from store or saved
    pub fn id(&self) -> Option<ObjectId> {
        match self {
            Commit::V0(c) => c.id,
        }
    }

    /// Get ID of header `Object`
    pub fn header_id(&self) -> &Option<ObjectId> {
        match self {
            Commit::V0(CommitV0 {
                header: Some(ch), ..
            }) => ch.id(),
            _ => &None,
        }
    }

    /// Set ID of including `Object`
    fn set_id(&mut self, id: ObjectId) {
        match self {
            Commit::V0(c) => c.id = Some(id),
        }
    }

    /// Get key of including `Object`
    /// only available if the Commit was loaded from store or saved
    pub fn key(&self) -> Option<SymKey> {
        match self {
            Commit::V0(c) => c.key.clone(),
        }
    }

    /// Set key of including `Object`
    fn set_key(&mut self, key: SymKey) {
        match self {
            Commit::V0(c) => c.key = Some(key),
        }
    }

    /// Set header of including `Object`
    fn set_header(&mut self, header: Option<CommitHeader>) {
        match self {
            Commit::V0(c) => c.header = header,
        }
    }

    /// Get commit signature
    pub fn sig(&self) -> &Sig {
        match self {
            Commit::V0(c) => &c.sig,
        }
    }

    /// Get commit signature
    pub fn header(&self) -> &Option<CommitHeader> {
        match self {
            Commit::V0(c) => &c.header,
        }
    }

    /// Get commit content V0
    pub fn content_v0(&self) -> &CommitContentV0 {
        match self {
            Commit::V0(CommitV0 {
                content: CommitContent::V0(c),
                ..
            }) => c,
        }
    }

    /// Get commit content
    pub fn content(&self) -> &CommitContent {
        match self {
            Commit::V0(CommitV0 { content: c, .. }) => c,
        }
    }

    pub fn body(&self) -> Option<&CommitBody> {
        match self {
            Commit::V0(c) => c.body.get(),
        }
    }

    pub fn owners_signature_required(
        &self,
        store: &Box<impl RepoStore + ?Sized>,
    ) -> Result<bool, CommitLoadError> {
        match self.load_body(store)? {
            CommitBody::V0(CommitBodyV0::UpdateRootBranch(new_root)) => {
                // load deps (the previous RootBranch commit)
                let deps = self.deps();
                if deps.len() != 1 {
                    Err(CommitLoadError::HeaderLoadError)
                } else {
                    let previous_rootbranch_commit = Commit::load(deps[0].clone(), store, true)?;
                    let previous_rootbranch = previous_rootbranch_commit
                        .body()
                        .unwrap()
                        .root_branch_commit()?;
                    if previous_rootbranch.owners() != new_root.owners() {
                        Ok(true)
                    } else {
                        Ok(false)
                    }
                }
            }
            CommitBody::V0(CommitBodyV0::RootBranch(_)) => {
                let deps = self.deps();
                let acks = self.acks();
                if deps.len() == 0 && acks.len() == 1 {
                    // we check that the ACK is the repository singleton commit. in this case, it means we are dealing with the first RootBranch commit, which is fine to have no deps.
                    let causal_past = Commit::load(acks[0].clone(), store, true)?;
                    if causal_past.body().unwrap().is_repository_singleton_commit() {
                        return Ok(false);
                    }
                }
                Err(CommitLoadError::HeaderLoadError)
            }
            _ => Ok(false),
        }
    }

    /// This commit is the first one in the branch (doesn't have any ACKs nor Nacks)
    pub fn is_root_commit_of_branch(&self) -> bool {
        match self {
            Commit::V0(CommitV0 {
                content: CommitContent::V0(c),
                ..
            }) => match &c.header_keys {
                Some(CommitHeaderKeys::V0(hk)) => hk.acks.is_empty() && hk.nacks.is_empty(),
                None => true,
            },
        }
    }

    /// Get acks (that have both an ID in the header and a key in the header_keys)
    pub fn acks(&self) -> Vec<ObjectRef> {
        let mut res: Vec<ObjectRef> = vec![];
        match self {
            Commit::V0(c) => match &c.header {
                Some(CommitHeader::V0(header_v0)) => match &c.content.header_keys() {
                    Some(CommitHeaderKeys::V0(hk_v0)) => {
                        for ack in header_v0.acks.iter().zip(hk_v0.acks.iter()) {
                            res.push(ack.into());
                        }
                    }
                    None => {}
                },
                None => {}
            },
        };
        res
    }

    /// Get deps (that have both an ID in the header and a key in the header_keys)
    pub fn deps(&self) -> Vec<ObjectRef> {
        let mut res: Vec<ObjectRef> = vec![];
        match self {
            Commit::V0(c) => match &c.header {
                Some(CommitHeader::V0(header_v0)) => match &c.content.header_keys() {
                    Some(CommitHeaderKeys::V0(hk_v0)) => {
                        for dep in header_v0.deps.iter().zip(hk_v0.deps.iter()) {
                            res.push(dep.into());
                        }
                    }
                    None => {}
                },
                None => {}
            },
        };
        res
    }

    /// Get all commits that are in the direct causal past of the commit (`deps`, `acks`, `nacks`)
    /// only returns objectRefs that have both an ID from header and a KEY from header_keys (it couldn't be otherwise)
    pub fn direct_causal_past(&self) -> Vec<ObjectRef> {
        let mut res: Vec<ObjectRef> = vec![];
        match self {
            Commit::V0(c) => match (&c.header, &c.content.header_keys()) {
                (Some(CommitHeader::V0(header_v0)), Some(CommitHeaderKeys::V0(hk_v0))) => {
                    for ack in header_v0.acks.iter().zip(hk_v0.acks.iter()) {
                        res.push(ack.into());
                    }
                    for nack in header_v0.nacks.iter().zip(hk_v0.nacks.iter()) {
                        res.push(nack.into());
                    }
                    for dep in header_v0.deps.iter().zip(hk_v0.deps.iter()) {
                        res.push(dep.into());
                        //TODO deal with deps that are also in acks. should nt be added twice
                    }
                }
                _ => {}
            },
        };
        res
    }

    /// Get seq
    pub fn seq(&self) -> u64 {
        match self {
            Commit::V0(CommitV0 {
                content: CommitContent::V0(c),
                ..
            }) => c.seq,
        }
    }

    /// Verify commit signature
    pub fn verify_sig(&self) -> Result<(), NgError> {
        let c = match self {
            Commit::V0(c) => c,
        };
        let content_ser = serde_bare::to_vec(&c.content).unwrap();
        unimplemented!();
        // FIXME : lookup author in member's list
        // let pubkey = match c.content.author() {
        //     PubKey::Ed25519PubKey(pk) => pk,
        //     _ => panic!("author cannot have a Montgomery key"),
        // };
        // let pk = PublicKey::from_bytes(pubkey)?;
        // let sig_bytes = match c.sig {
        //     Sig::Ed25519Sig(ss) => [ss[0], ss[1]].concat(),
        // };
        // let sig = Signature::from_bytes(&sig_bytes)?;
        // pk.verify_strict(&content_ser, &sig)
    }

    /// Verify commit permissions
    pub fn verify_perm(&self, repo: &Repo) -> Result<(), CommitVerifyError> {
        repo.verify_permission(self)
            .map_err(|_| CommitVerifyError::PermissionDenied)
    }

    /// Verify if the commit's `body` and its direct_causal_past, and recursively all their refs are available in the `store`
    /// returns a list of all the ObjectIds that have been visited (only commits in the DAG)
    /// or a list of missing blocks
    pub fn verify_full_object_refs_of_branch_at_commit(
        &self,
        store: &Box<impl RepoStore + ?Sized>,
    ) -> Result<Vec<ObjectId>, CommitLoadError> {
        //log_debug!(">> verify_full_object_refs_of_branch_at_commit: #{}", self.seq());

        /// Load `Commit`s of a `Branch` from the `RepoStore` starting from the given `Commit`,
        /// and collect missing `ObjectId`s
        fn load_direct_object_refs(
            commit: &Commit,
            store: &Box<impl RepoStore + ?Sized>,
            visited: &mut HashSet<ObjectId>,
            missing: &mut HashSet<ObjectId>,
        ) -> Result<(), CommitLoadError> {
            //log_debug!(">>> load_branch: #{}", commit.seq());

            // if the self of verify_full_object_refs_of_branch_at_commit() has not been saved yet, then it doesn't have an ID
            match commit.id() {
                Some(id) => {
                    if visited.contains(&id) {
                        return Ok(());
                    }
                    visited.insert(id);
                    // not adding the ObjectId of the header of this commit as it is not part of the DAG (neither is the CommitBody added to visited)
                    // // commit.header_id().map(|hid| visited.insert(hid));
                }
                None => {
                    if !visited.is_empty() {
                        // we are not at the beginning (meaning, the self/the commit object) so this is a panic error as all causal
                        // past commits have been loaded from store and should have an id
                        panic!("A Commit in the causal past doesn't have an ID");
                    }
                }
            }

            // load body & check if it's the Branch root commit
            match commit.load_body(store) {
                Ok(_) => Ok(()),
                Err(CommitLoadError::MissingBlocks(m)) => {
                    // The commit body is missing.
                    missing.extend(m);
                    Err(CommitLoadError::BodyLoadError)
                }
                Err(e) => Err(e),
            }?;

            let body = commit.body().unwrap();
            visited.insert(commit.content_v0().body.id);
            if commit.is_root_commit_of_branch() {
                if !body.must_be_root_commit_in_branch() {
                    return Err(CommitLoadError::CannotBeAtRootOfBranch);
                }
            } else {
                if body.must_be_root_commit_in_branch() {
                    return Err(CommitLoadError::MustBeAtRootOfBranch);
                }
            }

            // load direct causal past
            for blockref in commit.direct_causal_past() {
                match Commit::load(blockref, store, true) {
                    Ok(mut c) => {
                        load_direct_object_refs(&mut c, store, visited, missing)?;
                    }
                    Err(CommitLoadError::MissingBlocks(m)) => {
                        missing.extend(m);
                    }
                    Err(e) => return Err(e),
                }
            }

            Ok(())
        }

        let mut visited = HashSet::new();
        let mut missing = HashSet::new();
        load_direct_object_refs(self, store, &mut visited, &mut missing)?;

        if !missing.is_empty() {
            return Err(CommitLoadError::MissingBlocks(Vec::from_iter(missing)));
        }
        Ok(Vec::from_iter(visited))
    }

    /// Verify signature, permissions, and full causal past
    pub fn verify(&self, repo: &Repo) -> Result<(), CommitVerifyError> {
        self.verify_sig()
            .map_err(|_e| CommitVerifyError::InvalidSignature)?;
        self.verify_perm(repo)?;
        self.verify_full_object_refs_of_branch_at_commit(repo.get_store())
            .map_err(|e| CommitVerifyError::DepLoadError(e))?;
        Ok(())
    }
}

impl PermissionV0 {
    /// the kind of permissions that can be added and removed with AddWritePermission and RemoveWritePermission permissions respectively
    pub fn is_write_permission(&self) -> bool {
        match self {
            Self::WriteAsync | Self::WriteSync | Self::RefreshWriteCap => true,
            _ => false,
        }
    }

    pub fn is_delegated_by_admin(&self) -> bool {
        self.is_write_permission()
            || match self {
                Self::AddReadMember
                | Self::RemoveMember
                | Self::AddWritePermission
                | Self::RemoveWritePermission
                | Self::Compact
                | Self::AddBranch
                | Self::RemoveBranch
                | Self::ChangeName
                | Self::RefreshReadCap => true,
                _ => false,
            }
    }

    pub fn is_delegated_by_owner(&self) -> bool {
        self.is_delegated_by_admin()
            || match self {
                Self::ChangeQuorum | Self::Admin | Self::ChangeMainBranch => true,
                _ => false,
            }
    }
}

impl CommitBody {
    pub fn root_branch_commit(&self) -> Result<&RootBranch, CommitLoadError> {
        match self {
            Self::V0(v0) => match v0 {
                CommitBodyV0::UpdateRootBranch(rb) | CommitBodyV0::RootBranch(rb) => Ok(rb),
                _ => Err(CommitLoadError::BodyTypeMismatch),
            },
        }
    }

    pub fn is_repository_singleton_commit(&self) -> bool {
        match self {
            Self::V0(v0) => match v0 {
                CommitBodyV0::Repository(_) => true,
                _ => false,
            },
        }
    }
    pub fn must_be_root_commit_in_branch(&self) -> bool {
        match self {
            Self::V0(v0) => match v0 {
                CommitBodyV0::Repository(_) => true,
                CommitBodyV0::Branch(_) => true,
                _ => false,
            },
        }
    }

    pub fn on_root_branch(&self) -> bool {
        match self {
            Self::V0(v0) => match v0 {
                CommitBodyV0::Repository(_) => true,
                CommitBodyV0::RootBranch(_) => true,
                CommitBodyV0::UpdateRootBranch(_) => true,
                CommitBodyV0::ChangeMainBranch(_) => true,
                CommitBodyV0::AddBranch(_) => true,
                CommitBodyV0::RemoveBranch(_) => true,
                CommitBodyV0::AddMember(_) => true,
                CommitBodyV0::RemoveMember(_) => true,
                CommitBodyV0::AddPermission(_) => true,
                CommitBodyV0::RemovePermission(_) => true,
                CommitBodyV0::AddName(_) => true,
                CommitBodyV0::RemoveName(_) => true,
                //CommitBodyV0::Quorum(_) => true,
                CommitBodyV0::RefreshReadCap(_) => true,
                CommitBodyV0::RefreshWriteCap(_) => true,
                CommitBodyV0::SyncSignature(_) => true,
                _ => false,
            },
        }
    }

    pub fn on_transactional_branch(&self) -> bool {
        match self {
            Self::V0(v0) => match v0 {
                CommitBodyV0::Branch(_) => true,
                CommitBodyV0::UpdateBranch(_) => true,
                CommitBodyV0::Snapshot(_) => true,
                CommitBodyV0::AsyncTransaction(_) => true,
                CommitBodyV0::SyncTransaction(_) => true,
                CommitBodyV0::AddFile(_) => true,
                CommitBodyV0::RemoveFile(_) => true,
                CommitBodyV0::Compact(_) => true,
                CommitBodyV0::AsyncSignature(_) => true,
                CommitBodyV0::RefreshReadCap(_) => true,
                CommitBodyV0::RefreshWriteCap(_) => true,
                CommitBodyV0::SyncSignature(_) => true,
                _ => false,
            },
        }
    }

    pub fn total_order_required(&self) -> bool {
        match self {
            Self::V0(v0) => match v0 {
                CommitBodyV0::UpdateRootBranch(_) => true,
                CommitBodyV0::UpdateBranch(_) => true,
                CommitBodyV0::ChangeMainBranch(_) => true,
                CommitBodyV0::AddBranch(_) => true,
                CommitBodyV0::RemoveBranch(_) => true,
                CommitBodyV0::AddMember(_) => true,
                CommitBodyV0::RemoveMember(_) => true,
                CommitBodyV0::RemovePermission(_) => true,
                //CommitBodyV0::Quorum(_) => true,
                CommitBodyV0::Compact(_) => true,
                CommitBodyV0::SyncTransaction(_) => true, // check Quorum::TotalOrder in CommitContent
                CommitBodyV0::RefreshReadCap(_) => true,
                CommitBodyV0::RefreshWriteCap(_) => true,
                _ => false,
            },
        }
    }
    pub fn required_permission(&self) -> HashSet<PermissionV0> {
        let res: Vec<PermissionV0>;
        res = match self {
            Self::V0(v0) => match v0 {
                CommitBodyV0::Repository(_) => vec![PermissionV0::Create],
                CommitBodyV0::RootBranch(_) => vec![PermissionV0::Create],
                CommitBodyV0::UpdateRootBranch(_) => vec![
                    PermissionV0::ChangeQuorum,
                    PermissionV0::RefreshWriteCap,
                    PermissionV0::RefreshReadCap,
                    PermissionV0::RefreshOverlay,
                ],
                CommitBodyV0::AddMember(_) => {
                    vec![PermissionV0::Create, PermissionV0::AddReadMember]
                }
                CommitBodyV0::RemoveMember(_) => vec![PermissionV0::RemoveMember],
                CommitBodyV0::AddPermission(addp) => {
                    let mut perms = vec![PermissionV0::Create];
                    if addp.permission_v0().is_delegated_by_admin() {
                        perms.push(PermissionV0::Admin);
                    }
                    if addp.permission_v0().is_write_permission() {
                        perms.push(PermissionV0::AddWritePermission);
                    }
                    perms
                }
                CommitBodyV0::RemovePermission(remp) => {
                    let mut perms = vec![];
                    if remp.permission_v0().is_delegated_by_admin() {
                        perms.push(PermissionV0::Admin);
                    }
                    if remp.permission_v0().is_write_permission() {
                        perms.push(PermissionV0::RemoveWritePermission);
                    }
                    perms
                }
                CommitBodyV0::AddBranch(_) => vec![
                    PermissionV0::Create,
                    PermissionV0::AddBranch,
                    PermissionV0::RefreshReadCap,
                    PermissionV0::RefreshWriteCap,
                    PermissionV0::RefreshOverlay,
                ],
                CommitBodyV0::RemoveBranch(_) => vec![PermissionV0::RemoveBranch],
                CommitBodyV0::UpdateBranch(_) => {
                    vec![PermissionV0::RefreshReadCap, PermissionV0::RefreshWriteCap]
                }
                CommitBodyV0::AddName(_) => vec![PermissionV0::AddBranch, PermissionV0::ChangeName],
                CommitBodyV0::RemoveName(_) => {
                    vec![PermissionV0::ChangeName, PermissionV0::RemoveBranch]
                }
                CommitBodyV0::Branch(_) => vec![PermissionV0::Create, PermissionV0::AddBranch],
                CommitBodyV0::ChangeMainBranch(_) => {
                    vec![PermissionV0::Create, PermissionV0::ChangeMainBranch]
                }
                CommitBodyV0::Snapshot(_) => vec![PermissionV0::WriteAsync],
                CommitBodyV0::Compact(_) => vec![PermissionV0::Compact],
                CommitBodyV0::AsyncTransaction(_) => vec![PermissionV0::WriteAsync],
                CommitBodyV0::AddFile(_) => vec![PermissionV0::WriteAsync, PermissionV0::WriteSync],
                CommitBodyV0::RemoveFile(_) => {
                    vec![PermissionV0::WriteAsync, PermissionV0::WriteSync]
                }
                CommitBodyV0::SyncTransaction(_) => vec![PermissionV0::WriteSync],
                CommitBodyV0::AsyncSignature(_) => vec![PermissionV0::WriteAsync],
                CommitBodyV0::SyncSignature(_) => vec![
                    PermissionV0::WriteSync,
                    PermissionV0::ChangeQuorum,
                    PermissionV0::RefreshWriteCap,
                    PermissionV0::RefreshReadCap,
                    PermissionV0::RefreshOverlay,
                    PermissionV0::ChangeMainBranch,
                    PermissionV0::AddBranch,
                    PermissionV0::RemoveBranch,
                    PermissionV0::AddReadMember,
                    PermissionV0::RemoveMember,
                    PermissionV0::RemoveWritePermission,
                    PermissionV0::Compact,
                ],
                CommitBodyV0::RefreshReadCap(_) => vec![PermissionV0::RefreshReadCap],
                CommitBodyV0::RefreshWriteCap(_) => vec![PermissionV0::RefreshWriteCap],
            },
        };
        HashSet::from_iter(res.iter().cloned())
    }
}

impl fmt::Display for CommitHeader {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CommitHeader::V0(v0) => {
                writeln!(
                    f,
                    "v0 - compact:{} id:{}",
                    v0.compact,
                    v0.id.map_or("None".to_string(), |i| format!("{}", i))
                )?;
                writeln!(f, "====  acks : {}", v0.acks.len())?;
                for ack in &v0.acks {
                    writeln!(f, "============== {}", ack)?;
                }
                writeln!(f, "==== nacks : {}", v0.nacks.len())?;
                for nack in &v0.nacks {
                    writeln!(f, "============== {}", nack)?;
                }
                writeln!(f, "====  deps : {}", v0.deps.len())?;
                for dep in &v0.deps {
                    writeln!(f, "============== {}", dep)?;
                }
                writeln!(f, "==== ndeps : {}", v0.ndeps.len())?;
                for ndep in &v0.ndeps {
                    writeln!(f, "============== {}", ndep)?;
                }
                writeln!(f, "====  refs : {}", v0.refs.len())?;
                for rref in &v0.refs {
                    writeln!(f, "============== {}", rref)?;
                }
                writeln!(f, "==== nrefs : {}", v0.nrefs.len())?;
                for nref in &v0.nrefs {
                    writeln!(f, "============== {}", nref)?;
                }
                Ok(())
            }
        }
    }
}

impl CommitHeader {
    pub fn is_root(&self) -> bool {
        match self {
            CommitHeader::V0(v0) => v0.is_root(),
        }
    }
    pub fn deps(&self) -> Vec<ObjectId> {
        match self {
            CommitHeader::V0(v0) => v0.deps.clone(),
        }
    }
    pub fn acks(&self) -> Vec<ObjectId> {
        match self {
            CommitHeader::V0(v0) => v0.acks.clone(),
        }
    }
    pub fn acks_and_nacks(&self) -> Vec<ObjectId> {
        match self {
            CommitHeader::V0(v0) => {
                let mut res = v0.acks.clone();
                res.extend_from_slice(&v0.nacks);
                res
            }
        }
    }
    pub fn id(&self) -> &Option<ObjectId> {
        match self {
            CommitHeader::V0(v0) => &v0.id,
        }
    }

    pub fn set_id(&mut self, id: Digest) {
        match self {
            CommitHeader::V0(v0) => v0.id = Some(id),
        }
    }

    pub fn set_compact(&mut self) {
        match self {
            CommitHeader::V0(v0) => v0.set_compact(),
        }
    }

    pub fn new_with(
        deps: Vec<ObjectRef>,
        ndeps: Vec<ObjectRef>,
        acks: Vec<ObjectRef>,
        nacks: Vec<ObjectRef>,
        refs: Vec<ObjectRef>,
        nrefs: Vec<ObjectRef>,
    ) -> (Option<Self>, Option<CommitHeaderKeys>) {
        let res = CommitHeaderV0::new_with(deps, ndeps, acks, nacks, refs, nrefs);
        (
            res.0.map(|h| CommitHeader::V0(h)),
            res.1.map(|h| CommitHeaderKeys::V0(h)),
        )
    }

    pub fn new_with_deps(deps: Vec<ObjectId>) -> Option<Self> {
        CommitHeaderV0::new_with_deps(deps).map(|ch| CommitHeader::V0(ch))
    }

    pub fn new_with_deps_and_acks(deps: Vec<ObjectId>, acks: Vec<ObjectId>) -> Option<Self> {
        CommitHeaderV0::new_with_deps_and_acks(deps, acks).map(|ch| CommitHeader::V0(ch))
    }

    pub fn new_with_acks(acks: Vec<ObjectId>) -> Option<Self> {
        CommitHeaderV0::new_with_acks(acks).map(|ch| CommitHeader::V0(ch))
    }
}

impl CommitHeaderV0 {
    fn new_empty() -> Self {
        Self {
            id: None,
            compact: false,
            deps: vec![],
            ndeps: vec![],
            acks: vec![],
            nacks: vec![],
            refs: vec![],
            nrefs: vec![],
        }
    }

    pub fn set_compact(&mut self) {
        self.compact = true;
    }

    pub fn new_with(
        deps: Vec<ObjectRef>,
        ndeps: Vec<ObjectRef>,
        acks: Vec<ObjectRef>,
        nacks: Vec<ObjectRef>,
        refs: Vec<ObjectRef>,
        nrefs: Vec<ObjectRef>,
    ) -> (Option<Self>, Option<CommitHeaderKeysV0>) {
        if deps.is_empty()
            && ndeps.is_empty()
            && acks.is_empty()
            && nacks.is_empty()
            && refs.is_empty()
            && nrefs.is_empty()
        {
            (None, None)
        } else {
            let mut ideps: Vec<ObjectId> = vec![];
            let mut indeps: Vec<ObjectId> = vec![];
            let mut iacks: Vec<ObjectId> = vec![];
            let mut inacks: Vec<ObjectId> = vec![];
            let mut irefs: Vec<ObjectId> = vec![];
            let mut inrefs: Vec<ObjectId> = vec![];

            let mut kdeps: Vec<ObjectKey> = vec![];
            let mut kacks: Vec<ObjectKey> = vec![];
            let mut knacks: Vec<ObjectKey> = vec![];
            for d in deps {
                ideps.push(d.id);
                kdeps.push(d.key);
            }
            for d in ndeps {
                indeps.push(d.id);
            }
            for d in acks {
                iacks.push(d.id);
                kacks.push(d.key);
            }
            for d in nacks {
                inacks.push(d.id);
                knacks.push(d.key);
            }
            for d in refs.clone() {
                irefs.push(d.id);
            }
            for d in nrefs {
                inrefs.push(d.id);
            }
            (
                Some(Self {
                    id: None,
                    compact: false,
                    deps: ideps,
                    ndeps: indeps,
                    acks: iacks,
                    nacks: inacks,
                    refs: irefs,
                    nrefs: inrefs,
                }),
                Some(CommitHeaderKeysV0 {
                    deps: kdeps,
                    acks: kacks,
                    nacks: knacks,
                    refs,
                }),
            )
        }
    }
    pub fn new_with_deps(deps: Vec<ObjectId>) -> Option<Self> {
        assert!(!deps.is_empty());
        let mut n = Self::new_empty();
        n.deps = deps;
        Some(n)
    }

    pub fn new_with_deps_and_acks(deps: Vec<ObjectId>, acks: Vec<ObjectId>) -> Option<Self> {
        assert!(!deps.is_empty() || !acks.is_empty());
        let mut n = Self::new_empty();
        n.deps = deps;
        n.acks = acks;
        Some(n)
    }

    pub fn new_with_acks(acks: Vec<ObjectId>) -> Option<Self> {
        assert!(!acks.is_empty());
        let mut n = Self::new_empty();
        n.acks = acks;
        Some(n)
    }

    /// we do not check the deps because in a forked branch, they point to previous branch heads.
    pub fn is_root(&self) -> bool {
        //self.deps.is_empty()
        //    && self.ndeps.is_empty()
        self.acks.is_empty() && self.nacks.is_empty()
    }
}

impl fmt::Display for Commit {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "====== Commit V0 ======")?;
                if v0.id.is_some() {
                    writeln!(f, "== ID:    {}", v0.id.as_ref().unwrap())?;
                }
                if v0.key.is_some() {
                    writeln!(f, "== Key:   {}", v0.key.as_ref().unwrap())?;
                }
                if v0.header.is_some() {
                    write!(f, "== Header:   {}", v0.header.as_ref().unwrap())?;
                }
                writeln!(f, "== Sig:   {}", v0.sig)?;
                write!(f, "{}", v0.content)?;
                if v0.body.get().is_some() {
                    writeln!(f, "== Body:   {}", v0.body.get().unwrap())?;
                }
            }
        }
        Ok(())
    }
}

impl fmt::Display for CommitBody {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                write!(f, "V0 ")?;
                match v0 {
                    //
                    // for root branch:
                    //
                    CommitBodyV0::Repository(b) => writeln!(f, "Repository {}", b),
                    CommitBodyV0::RootBranch(b) => writeln!(f, "RootBranch {}", b),
                    _ => unimplemented!(),
                    /*UpdateRootBranch(RootBranch), // total order enforced with total_order_quorum
                    AddMember(AddMember),   // total order enforced with total_order_quorum
                    RemoveMember(RemoveMember), // total order enforced with total_order_quorum
                    AddPermission(AddPermission),
                    RemovePermission(RemovePermission),
                    AddBranch(AddBranch),
                    ChangeMainBranch(ChangeMainBranch),
                    RemoveBranch(RemoveBranch),
                    AddName(AddName),
                    RemoveName(RemoveName),
                    // TODO? Quorum(Quorum), // changes the quorum without changing the RootBranch

                    //
                    // For transactional branches:
                    //
                    Branch(Branch),                // singleton and should be first in branch
                    UpdateBranch(Branch),          // total order enforced with total_order_quorum
                    Snapshot(Snapshot),            // a soft snapshot
                    AsyncTransaction(Transaction), // partial_order
                    SyncTransaction(Transaction),  // total_order
                    AddFile(AddFile),
                    RemoveFile(RemoveFile),
                    Compact(Compact), // a hard snapshot. total order enforced with total_order_quorum
                    //Merge(Merge),
                    //Revert(Revert), // only possible on partial order commit
                    AsyncSignature(AsyncSignature),

                    //
                    // For both
                    //
                    RefreshReadCap(RefreshReadCap),
                    RefreshWriteCap(RefreshWriteCap),
                    SyncSignature(SyncSignature),*/
                }
            }
        }
    }
}

impl fmt::Display for CommitContent {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "=== CommitContent V0 ===")?;
                writeln!(f, "====== author:   {}", v0.author)?;
                writeln!(f, "====== seq:      {}", v0.seq)?;
                writeln!(f, "====== BranchID: {}", v0.branch)?;
                writeln!(f, "====== quorum:   {:?}", v0.quorum)?;
                writeln!(f, "====== Ref body: {}", v0.body)?;
                if v0.header_keys.is_none() {
                    writeln!(f, "====== header keys: None")?;
                } else {
                    write!(f, "{}", v0.header_keys.as_ref().unwrap())?;
                }
                writeln!(f, "====== Perms commits: {}", v0.perms.len())?;
                let mut i = 0;
                for block in &v0.perms {
                    writeln!(f, "========== {:03}: {}", i, block)?;
                    i += 1;
                }
            }
        }
        Ok(())
    }
}

impl fmt::Display for CommitHeaderKeys {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "=== CommitHeaderKeys V0 ===")?;
                writeln!(f, "====  acks : {}", v0.acks.len())?;
                for ack in &v0.acks {
                    writeln!(f, "============== {}", ack)?;
                }
                writeln!(f, "==== nacks : {}", v0.nacks.len())?;
                for nack in &v0.nacks {
                    writeln!(f, "============== {}", nack)?;
                }
                writeln!(f, "====  deps : {}", v0.deps.len())?;
                for dep in &v0.deps {
                    writeln!(f, "============== {}", dep)?;
                }
                writeln!(f, "====  refs : {}", v0.refs.len())?;
                for rref in &v0.refs {
                    writeln!(f, "============== {}", rref)?;
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use crate::commit::*;
    use crate::log::*;

    #[test]
    pub fn test_commit() {
        let (priv_key, pub_key) = generate_keypair();
        let seq = 3;
        let obj_ref = ObjectRef::dummy();
        let obj_refs = vec![obj_ref.clone()];
        let branch = pub_key;
        let deps = obj_refs.clone();
        let acks = obj_refs.clone();
        let refs = obj_refs.clone();
        let metadata = vec![1, 2, 3];
        let body_ref = obj_ref.clone();

        let commit = Commit::new(
            priv_key,
            pub_key,
            seq,
            branch,
            QuorumType::NoSigning,
            deps,
            vec![],
            acks,
            vec![],
            refs,
            vec![],
            metadata,
            body_ref,
        )
        .unwrap();
        log_debug!("{}", commit);

        let store = Box::new(HashMapRepoStore::new());

        let repo = Repo::new_with_member(&pub_key, &pub_key, &[PermissionV0::WriteAsync], store);

        match commit.load_body(repo.get_store()) {
            Ok(_b) => panic!("Body should not exist"),
            Err(CommitLoadError::MissingBlocks(missing)) => {
                assert_eq!(missing.len(), 1);
            }
            Err(e) => panic!("Commit verify error: {:?}", e),
        }

        commit.verify_sig().expect("Invalid signature");
        commit.verify_perm(&repo).expect("Permission denied");

        match commit.verify_full_object_refs_of_branch_at_commit(repo.get_store()) {
            Ok(_) => panic!("Commit should not be Ok"),
            Err(CommitLoadError::MissingBlocks(missing)) => {
                assert_eq!(missing.len(), 1);
            }
            Err(e) => panic!("Commit verify error: {:?}", e),
        }

        match commit.verify(&repo) {
            Ok(_) => panic!("Commit should not be Ok"),
            Err(CommitVerifyError::BodyLoadError(CommitLoadError::MissingBlocks(missing))) => {
                assert_eq!(missing.len(), 1);
            }
            Err(e) => panic!("Commit verify error: {:?}", e),
        }
    }
}
