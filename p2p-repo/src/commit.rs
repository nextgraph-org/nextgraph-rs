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
use ed25519_dalek::{PublicKey, Signature};
use once_cell::sync::OnceCell;

use crate::errors::NgError;

use crate::errors::*;
use crate::log::*;
use crate::object::*;
use crate::repo::Repo;
use crate::store::*;
use crate::types::*;
use crate::utils::*;
use std::collections::HashSet;
use std::iter::FromIterator;

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum CommitLoadError {
    MissingBlocks(Vec<BlockId>),
    ObjectParseError,
    NotACommitError,
    NotACommitBodyError,
    CannotBeAtRootOfBranch,
    MustBeAtRootOfBranch,
    SingletonCannotHaveHeader,
    BodyLoadError(Vec<BlockId>),
    HeaderLoadError,
    BodyTypeMismatch,
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum CommitVerifyError {
    InvalidSignature,
    InvalidHeader,
    PermissionDenied,
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
        files: Vec<ObjectRef>,
        nfiles: Vec<ObjectRef>,
        metadata: Vec<u8>,
        body: ObjectRef,
    ) -> Result<CommitV0, NgError> {
        let headers = CommitHeader::new_with(deps, ndeps, acks, nacks, files, nfiles);
        let content = CommitContent::V0(CommitContentV0 {
            perms: vec![],
            author: (&author_pubkey).into(),
            seq,
            branch,
            header_keys: headers.1,
            quorum,
            metadata,
            body,
        });
        let content_ser = serde_bare::to_vec(&content).unwrap();

        // sign commit
        let sig = sign(&author_privkey, &author_pubkey, &content_ser)?;
        Ok(CommitV0 {
            content: content,
            sig,
            id: None,
            key: None,
            header: headers.0,
            body: OnceCell::new(),
        })
    }

    #[cfg(test)]
    /// New commit with invalid header, only for test purposes
    pub fn new_with_invalid_header(
        author_privkey: PrivKey,
        author_pubkey: PubKey,
        seq: u64,
        branch: BranchId,
        quorum: QuorumType,
        metadata: Vec<u8>,
        body: ObjectRef,
    ) -> Result<CommitV0, NgError> {
        let headers = CommitHeader::new_invalid();
        let content = CommitContent::V0(CommitContentV0 {
            perms: vec![],
            author: (&author_pubkey).into(),
            seq,
            branch,
            header_keys: headers.1,
            quorum,
            metadata,
            body,
        });
        let content_ser = serde_bare::to_vec(&content).unwrap();

        // sign commit
        let sig = sign(&author_privkey, &author_pubkey, &content_ser)?;
        Ok(CommitV0 {
            content: content,
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
        files: Vec<ObjectRef>,
        nfiles: Vec<ObjectRef>,
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
            files,
            nfiles,
            metadata,
            body,
        )
        .map(|c| Commit::V0(c))
    }

    /// New commit
    pub fn new_with_body_and_save(
        author_privkey: PrivKey,
        author_pubkey: PubKey,
        seq: u64,
        branch: BranchId,
        quorum: QuorumType,
        deps: Vec<ObjectRef>,
        ndeps: Vec<ObjectRef>,
        acks: Vec<ObjectRef>,
        nacks: Vec<ObjectRef>,
        files: Vec<ObjectRef>,
        nfiles: Vec<ObjectRef>,
        metadata: Vec<u8>,
        body: CommitBody,
        block_size: usize,
        store_pubkey: &StoreRepo,
        store_secret: &ReadCapSecret,
        store: &Box<impl RepoStore + ?Sized>,
    ) -> Result<Commit, NgError> {
        let body_ref = body
            .clone()
            .save(block_size, store_pubkey, store_secret, store)?;

        let mut commit = CommitV0::new(
            author_privkey,
            author_pubkey,
            seq,
            branch,
            quorum,
            deps,
            ndeps,
            acks,
            nacks,
            files,
            nfiles,
            metadata,
            body_ref,
        )
        .map(|c| Commit::V0(c))?;

        commit.set_body(body);

        let commit_ref = commit.save(block_size, store_pubkey, store_secret, store)?;

        commit.set_id(commit_ref.id);
        commit.set_key(commit_ref.key);
        Ok(commit)
    }

    pub fn reference(&self) -> Option<ObjectRef> {
        if self.key().is_some() && self.id().is_some() {
            Some(ObjectRef {
                id: self.id().unwrap(),
                key: self.key().unwrap(),
            })
        } else {
            None
        }
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
                if v0.id.is_some() && v0.key.is_some() {
                    return Ok(ObjectRef::from_id_key(
                        v0.id.unwrap(),
                        v0.key.as_ref().unwrap().clone(),
                    ));
                }
                log_debug!("{:?}", v0.header);
                let mut obj = Object::new(
                    ObjectContent::V0(ObjectContentV0::Commit(Commit::V0(v0.clone()))),
                    v0.header.clone(),
                    block_size,
                    store_pubkey,
                    store_secret,
                );
                obj.save(store)?;
                if let Some(h) = &mut v0.header {
                    if let Some(id) = obj.header().as_ref().unwrap().id() {
                        h.set_id(*id);
                    }
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
            ObjectParseError::MissingBlocks(missing) => CommitLoadError::BodyLoadError(missing),
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
    /// only returns objectRefs that have both an ID from header and a KEY from header_keys (they all have a key)
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
                        let obj_ref: ObjectRef = dep.into();
                        if !res.contains(&obj_ref) {
                            res.push(obj_ref);
                        }
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
    pub fn verify_sig(&self, repo: &Repo) -> Result<(), CommitVerifyError> {
        let c = match self {
            Commit::V0(c) => c,
        };
        let content_ser = serde_bare::to_vec(&c.content).unwrap();

        let pubkey = repo
            .member_pubkey(c.content.author())
            .map_err(|_| CommitVerifyError::PermissionDenied)?;

        let pubkey_slice = match pubkey {
            PubKey::Ed25519PubKey(pk) => pk,
            _ => panic!("author cannot have a Montgomery key"),
        };
        let pk = PublicKey::from_bytes(&pubkey_slice)
            .map_err(|_| CommitVerifyError::InvalidSignature)?;
        let sig_bytes = match c.sig {
            Sig::Ed25519Sig(ss) => [ss[0], ss[1]].concat(),
        };
        let sig =
            Signature::from_bytes(&sig_bytes).map_err(|_| CommitVerifyError::InvalidSignature)?;
        pk.verify_strict(&content_ser, &sig)
            .map_err(|_| CommitVerifyError::InvalidSignature)
    }

    /// Verify commit permissions
    pub fn verify_perm(&self, repo: &Repo) -> Result<(), NgError> {
        repo.verify_permission(self)
    }

    pub fn verify_perm_creation(&self, user: Option<&Digest>) -> Result<&Digest, NgError> {
        let digest = self.content().author();
        if user.is_some() && *digest != *user.unwrap() {
            return Err(NgError::PermissionDenied);
        }
        let body = self.body().ok_or(NgError::InvalidArgument)?;
        if !(body.is_repository_singleton_commit() && user.is_none()) {
            // a user must be provided to verify all subsequent commits of a Repository commit, that have the same author and that are signed with the repository key
            return Err(NgError::InvalidArgument);
        }
        if body.required_permission().contains(&PermissionV0::Create) {
            Ok(digest)
        } else {
            Err(NgError::PermissionDenied)
        }
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
                    missing.extend(m.clone());
                    Err(CommitLoadError::BodyLoadError(m))
                }
                Err(e) => Err(e),
            }?;

            let body = commit.body().unwrap();
            visited.insert(commit.content_v0().body.id);
            if commit.is_root_commit_of_branch() {
                if !body.must_be_root_commit_in_branch() {
                    return Err(CommitLoadError::CannotBeAtRootOfBranch);
                }
                if body.is_repository_singleton_commit() && commit.header().is_some() {
                    return Err(CommitLoadError::SingletonCannotHaveHeader);
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
    pub fn verify(&self, repo: &Repo) -> Result<(), NgError> {
        if !self.header().as_ref().map_or(true, |h| h.verify()) {
            return Err(NgError::CommitVerifyError(CommitVerifyError::InvalidHeader));
        }
        self.verify_sig(repo)?;
        self.verify_perm(repo)?;
        self.verify_full_object_refs_of_branch_at_commit(repo.get_store())?;
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
    pub fn save(
        self,
        block_size: usize,
        store_pubkey: &StoreRepo,
        store_secret: &ReadCapSecret,
        store: &Box<impl RepoStore + ?Sized>,
    ) -> Result<ObjectRef, StorageError> {
        let obj = Object::new(
            ObjectContent::V0(ObjectContentV0::CommitBody(self)),
            None,
            block_size,
            store_pubkey,
            store_secret,
        );
        obj.save(store)?;
        Ok(obj.reference().unwrap())
    }

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
                writeln!(f, "====  acks  : {}", v0.acks.len())?;
                for ack in &v0.acks {
                    writeln!(f, "============== {}", ack)?;
                }
                writeln!(f, "==== nacks  : {}", v0.nacks.len())?;
                for nack in &v0.nacks {
                    writeln!(f, "============== {}", nack)?;
                }
                writeln!(f, "====  deps  : {}", v0.deps.len())?;
                for dep in &v0.deps {
                    writeln!(f, "============== {}", dep)?;
                }
                writeln!(f, "==== ndeps  : {}", v0.ndeps.len())?;
                for ndep in &v0.ndeps {
                    writeln!(f, "============== {}", ndep)?;
                }
                writeln!(f, "====  files : {}", v0.files.len())?;
                for file in &v0.files {
                    writeln!(f, "============== {}", file)?;
                }
                writeln!(f, "==== nfiles : {}", v0.nfiles.len())?;
                for nfile in &v0.nfiles {
                    writeln!(f, "============== {}", nfile)?;
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

    pub fn verify(&self) -> bool {
        match self {
            CommitHeader::V0(v0) => v0.verify(),
        }
    }

    pub fn new_with(
        deps: Vec<ObjectRef>,
        ndeps: Vec<ObjectRef>,
        acks: Vec<ObjectRef>,
        nacks: Vec<ObjectRef>,
        files: Vec<ObjectRef>,
        nfiles: Vec<ObjectRef>,
    ) -> (Option<Self>, Option<CommitHeaderKeys>) {
        let res = CommitHeaderV0::new_with(deps, ndeps, acks, nacks, files, nfiles);
        (
            res.0.map(|h| CommitHeader::V0(h)),
            res.1.map(|h| CommitHeaderKeys::V0(h)),
        )
    }

    #[cfg(test)]
    pub fn new_invalid() -> (Option<Self>, Option<CommitHeaderKeys>) {
        let res = CommitHeaderV0::new_invalid();
        (
            res.0.map(|h| CommitHeader::V0(h)),
            res.1.map(|h| CommitHeaderKeys::V0(h)),
        )
    }

    #[cfg(test)]
    pub fn new_with_deps(deps: Vec<ObjectId>) -> Option<Self> {
        CommitHeaderV0::new_with_deps(deps).map(|ch| CommitHeader::V0(ch))
    }

    #[cfg(test)]
    pub fn new_with_deps_and_acks(deps: Vec<ObjectId>, acks: Vec<ObjectId>) -> Option<Self> {
        CommitHeaderV0::new_with_deps_and_acks(deps, acks).map(|ch| CommitHeader::V0(ch))
    }

    #[cfg(test)]
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
            files: vec![],
            nfiles: vec![],
        }
    }

    #[cfg(test)]
    fn new_invalid() -> (Option<Self>, Option<CommitHeaderKeysV0>) {
        let ideps: Vec<ObjectId> = vec![ObjectId::dummy()];
        let kdeps: Vec<ObjectKey> = vec![ObjectKey::dummy()];

        let res = Self {
            id: None,
            compact: false,
            deps: ideps.clone(),
            ndeps: ideps,
            acks: vec![],
            nacks: vec![],
            files: vec![],
            nfiles: vec![],
        };
        (
            Some(res),
            Some(CommitHeaderKeysV0 {
                deps: kdeps,
                acks: vec![],
                nacks: vec![],
                files: vec![],
            }),
        )
    }

    pub fn verify(&self) -> bool {
        if !self.deps.is_empty() && !self.ndeps.is_empty() {
            for ndep in self.ndeps.iter() {
                if self.deps.contains(ndep) {
                    return false;
                }
            }
        }
        if !self.acks.is_empty() && !self.nacks.is_empty() {
            for nack in self.nacks.iter() {
                if self.acks.contains(nack) {
                    return false;
                }
            }
        }
        if !self.files.is_empty() && !self.nfiles.is_empty() {
            for nref in self.nfiles.iter() {
                if self.files.contains(nref) {
                    return false;
                }
            }
        }
        true
    }

    pub fn set_compact(&mut self) {
        self.compact = true;
    }

    pub fn new_with(
        deps: Vec<ObjectRef>,
        ndeps: Vec<ObjectRef>,
        acks: Vec<ObjectRef>,
        nacks: Vec<ObjectRef>,
        files: Vec<ObjectRef>,
        nfiles: Vec<ObjectRef>,
    ) -> (Option<Self>, Option<CommitHeaderKeysV0>) {
        if deps.is_empty()
            && ndeps.is_empty()
            && acks.is_empty()
            && nacks.is_empty()
            && files.is_empty()
            && nfiles.is_empty()
        {
            (None, None)
        } else {
            let mut ideps: Vec<ObjectId> = vec![];
            let mut indeps: Vec<ObjectId> = vec![];
            let mut iacks: Vec<ObjectId> = vec![];
            let mut inacks: Vec<ObjectId> = vec![];
            let mut ifiles: Vec<ObjectId> = vec![];
            let mut infiles: Vec<ObjectId> = vec![];

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
            for d in files.clone() {
                ifiles.push(d.id);
            }
            for d in nfiles {
                infiles.push(d.id);
            }
            let res = Self {
                id: None,
                compact: false,
                deps: ideps,
                ndeps: indeps,
                acks: iacks,
                nacks: inacks,
                files: ifiles,
                nfiles: infiles,
            };
            if !res.verify() {
                panic!("cannot create a header with conflicting references");
            }
            (
                Some(res),
                Some(CommitHeaderKeysV0 {
                    deps: kdeps,
                    acks: kacks,
                    nacks: knacks,
                    files,
                }),
            )
        }
    }

    #[cfg(test)]
    pub fn new_with_deps(deps: Vec<ObjectId>) -> Option<Self> {
        assert!(!deps.is_empty());
        let mut n = Self::new_empty();
        n.deps = deps;
        Some(n)
    }

    #[cfg(test)]
    pub fn new_with_deps_and_acks(deps: Vec<ObjectId>, acks: Vec<ObjectId>) -> Option<Self> {
        assert!(!deps.is_empty() || !acks.is_empty());
        let mut n = Self::new_empty();
        n.deps = deps;
        n.acks = acks;
        Some(n)
    }

    #[cfg(test)]
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
                    write!(f, "== Body:   {}", v0.body.get().unwrap())?;
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
                writeln!(f, "====   acks : {}", v0.acks.len())?;
                for ack in &v0.acks {
                    writeln!(f, "============== {}", ack)?;
                }
                writeln!(f, "====  nacks : {}", v0.nacks.len())?;
                for nack in &v0.nacks {
                    writeln!(f, "============== {}", nack)?;
                }
                writeln!(f, "====   deps : {}", v0.deps.len())?;
                for dep in &v0.deps {
                    writeln!(f, "============== {}", dep)?;
                }
                writeln!(f, "====   files : {}", v0.files.len())?;
                for file in &v0.files {
                    writeln!(f, "============== {}", file)?;
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

    struct Test<'a> {
        storage: Box<dyn RepoStore + Send + Sync + 'a>,
    }

    impl<'a> Test<'a> {
        fn storage(s: impl RepoStore + 'a) -> Self {
            Test {
                storage: Box::new(s),
            }
        }
        fn s(&self) -> &Box<dyn RepoStore + Send + Sync + 'a> {
            &self.storage
        }
    }

    fn test_commit_header_ref_content_fits(
        obj_refs: Vec<BlockRef>,
        metadata_size: usize,
        expect_blocks_len: usize,
    ) {
        let (priv_key, pub_key) = generate_keypair();
        let seq = 3;
        let obj_ref = ObjectRef::dummy();

        let branch = pub_key;
        let deps = obj_refs.clone();
        let acks = obj_refs.clone();
        let files = obj_refs.clone();
        let body_ref = obj_ref.clone();

        let metadata = vec![66; metadata_size];

        let mut commit = Commit::new(
            priv_key,
            pub_key,
            seq,
            branch,
            QuorumType::NoSigning,
            deps,
            vec![],
            acks.clone(),
            vec![],
            files,
            vec![],
            metadata,
            body_ref,
        )
        .unwrap();

        log_debug!("{}", commit);

        let max_object_size = 0;

        let (store_repo, store_secret) = StoreRepo::dummy_public_v0();
        let hashmap_storage = HashMapRepoStore::new();
        let storage = Box::new(hashmap_storage);

        let commit_ref = commit
            .save(max_object_size, &store_repo, &store_secret, &storage)
            .expect("save commit");

        let commit_object = Object::load(
            commit_ref.id.clone(),
            Some(commit_ref.key.clone()),
            &storage,
        )
        .expect("load object from storage");

        assert_eq!(
            commit_object.acks(),
            acks.iter().map(|a| a.id).collect::<Vec<ObjectId>>()
        );

        log_debug!("{}", commit_object);

        log_debug!("object size:     {}", commit_object.size());

        assert_eq!(commit_object.all_blocks_len(), expect_blocks_len);

        let commit = Commit::load(commit_ref, &storage, false).expect("load commit from storage");

        log_debug!("{}", commit);
    }

    #[test]
    pub fn test_commit_header_ref_content_fits_or_not() {
        let obj_ref = ObjectRef::dummy();
        let obj_refs2 = vec![obj_ref.clone(), obj_ref.clone()];
        let obj_refs = vec![obj_ref.clone()];
        // with 1 refs in header
        test_commit_header_ref_content_fits(obj_refs.clone(), 3733, 2);
        test_commit_header_ref_content_fits(obj_refs.clone(), 3734, 3);
        test_commit_header_ref_content_fits(obj_refs.clone(), 3584, 1);
        test_commit_header_ref_content_fits(obj_refs.clone(), 3585, 2);
        // with 2 refs in header
        test_commit_header_ref_content_fits(obj_refs2.clone(), 3352, 1);
        test_commit_header_ref_content_fits(obj_refs2.clone(), 3353, 2);
        test_commit_header_ref_content_fits(obj_refs2.clone(), 3601, 2);
        test_commit_header_ref_content_fits(obj_refs2.clone(), 3602, 3);
    }

    #[test]
    pub fn test_load_commit_fails_on_non_commit_object() {
        let file = SmallFile::V0(SmallFileV0 {
            content_type: "file/test".into(),
            metadata: Vec::from("some meta data here"),
            content: [(0..255).collect::<Vec<u8>>().as_slice(); 320].concat(),
        });
        let content = ObjectContent::V0(ObjectContentV0::SmallFile(file));

        let max_object_size = 0;

        let (store_repo, store_secret) = StoreRepo::dummy_public_v0();

        let obj = Object::new(
            content.clone(),
            None,
            max_object_size,
            &store_repo,
            &store_secret,
        );

        let hashmap_storage = HashMapRepoStore::new();
        let storage = Box::new(hashmap_storage);

        obj.save(&storage).expect("save object");

        let commit = Commit::load(obj.reference().unwrap(), &storage, false);

        assert_eq!(commit, Err(CommitLoadError::NotACommitError));
    }

    #[test]
    pub fn test_load_commit_with_body() {
        let (priv_key, pub_key) = generate_keypair();
        let seq = 3;
        let obj_ref = ObjectRef::dummy();

        let branch = pub_key;
        let obj_refs = vec![obj_ref.clone()];
        let deps = obj_refs.clone();
        let acks = obj_refs.clone();
        let files = obj_refs.clone();

        let metadata = Vec::from("some metadata");

        let body = CommitBody::V0(CommitBodyV0::Repository(Repository::V0(RepositoryV0 {
            id: branch,
            verification_program: vec![],
            creator: None,
            metadata: vec![],
        })));

        let max_object_size = 0;

        let (store_repo, store_secret) = StoreRepo::dummy_public_v0();
        let hashmap_storage = HashMapRepoStore::new();
        let storage = Box::new(hashmap_storage);

        let commit = Commit::new_with_body_and_save(
            priv_key,
            pub_key,
            seq,
            branch,
            QuorumType::NoSigning,
            deps,
            vec![],
            acks.clone(),
            vec![],
            files,
            vec![],
            metadata,
            body,
            max_object_size,
            &store_repo,
            &store_secret,
            &storage,
        )
        .expect("commit::new_With_body_and_save");

        log_debug!("{}", commit);

        let commit2 = Commit::load(commit.reference().unwrap(), &storage, true)
            .expect("load commit with body after save");

        log_debug!("{}", commit2);

        assert_eq!(commit, commit2);
    }

    #[test]
    pub fn test_commit_load_body_fails() {
        let (priv_key, pub_key) = generate_keypair();
        let seq = 3;
        let obj_ref = ObjectRef::dummy();
        let obj_refs = vec![obj_ref.clone()];
        let branch = pub_key;
        let deps = obj_refs.clone();
        let acks = obj_refs.clone();
        let files = obj_refs.clone();
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
            files,
            vec![],
            metadata,
            body_ref,
        )
        .unwrap();
        log_debug!("{}", commit);

        let hashmap_storage = HashMapRepoStore::new();
        let t = Test::storage(hashmap_storage);

        let repo = Repo::new_with_member(&pub_key, &pub_key, &[PermissionV0::Create], t.s());

        match commit.load_body(repo.get_store()) {
            Ok(_b) => panic!("Body should not exist"),
            Err(CommitLoadError::BodyLoadError(missing)) => {
                assert_eq!(missing.len(), 1);
            }
            Err(e) => panic!("Commit load error: {:?}", e),
        }

        commit.verify_sig(&repo).expect("verify signature");
        match commit.verify_perm(&repo) {
            Ok(_) => panic!("Commit should not be Ok"),
            Err(NgError::CommitLoadError(CommitLoadError::BodyLoadError(missing))) => {
                assert_eq!(missing.len(), 1);
            }
            Err(e) => panic!("Commit verify perm error: {:?}", e),
        }

        match commit.verify_full_object_refs_of_branch_at_commit(repo.get_store()) {
            Ok(_) => panic!("Commit should not be Ok"),
            Err(CommitLoadError::BodyLoadError(missing)) => {
                assert_eq!(missing.len(), 1);
            }
            Err(e) => panic!("Commit verify error: {:?}", e),
        }

        match commit.verify(&repo) {
            Ok(_) => panic!("Commit should not be Ok"),
            Err(NgError::CommitLoadError(CommitLoadError::BodyLoadError(missing))) => {
                assert_eq!(missing.len(), 1);
            }
            Err(e) => panic!("Commit verify error: {:?}", e),
        }
    }

    #[test]
    pub fn test_load_commit_with_body_verify_perms() {
        let (priv_key, pub_key) = generate_keypair();
        let seq = 3;
        let obj_ref = ObjectRef::dummy();

        let branch = pub_key;

        let metadata = Vec::from("some metadata");

        let body = CommitBody::V0(CommitBodyV0::Repository(Repository::V0(RepositoryV0 {
            id: branch,
            verification_program: vec![],
            creator: None,
            metadata: vec![],
        })));

        let max_object_size = 0;

        let (store_repo, store_secret) = StoreRepo::dummy_public_v0();
        let hashmap_storage = HashMapRepoStore::new();
        let t = Test::storage(hashmap_storage);

        let commit = Commit::new_with_body_and_save(
            priv_key,
            pub_key,
            seq,
            branch,
            QuorumType::NoSigning,
            vec![],
            vec![],
            vec![], //acks.clone(),
            vec![],
            vec![],
            vec![],
            metadata,
            body,
            max_object_size,
            &store_repo,
            &store_secret,
            t.s(),
        )
        .expect("commit::new_with_body_and_save");

        log_debug!("{}", commit);

        let repo = Repo::new_with_member(&pub_key, &pub_key, &[PermissionV0::Create], t.s());

        commit.load_body(repo.get_store()).expect("load body");

        commit.verify_sig(&repo).expect("verify signature");
        commit.verify_perm(&repo).expect("verify perms");
        commit
            .verify_perm_creation(None)
            .expect("verify_perm_creation");

        commit
            .verify_full_object_refs_of_branch_at_commit(repo.get_store())
            .expect("verify is at root of branch and singleton");

        commit.verify(&repo).expect("verify");
    }

    #[test]
    pub fn test_load_commit_with_invalid_header() {
        let (priv_key, pub_key) = generate_keypair();
        let seq = 3;
        let obj_ref = ObjectRef::dummy();

        let branch = pub_key;
        let metadata = Vec::from("some metadata");

        //let max_object_size = 0;
        //let (store_repo, store_secret) = StoreRepo::dummy_public_v0();

        let commit = Commit::V0(
            CommitV0::new_with_invalid_header(
                priv_key,
                pub_key,
                seq,
                branch,
                QuorumType::NoSigning,
                metadata,
                obj_ref,
            )
            .expect("commit::new_with_invalid_header"),
        );

        log_debug!("{}", commit);

        let hashmap_storage = HashMapRepoStore::new();
        let t = Test::storage(hashmap_storage);

        let repo = Repo::new_with_member(&pub_key, &pub_key, &[PermissionV0::Create], t.s());

        assert_eq!(
            commit.verify(&repo),
            Err(NgError::CommitVerifyError(CommitVerifyError::InvalidHeader))
        );
    }
}
