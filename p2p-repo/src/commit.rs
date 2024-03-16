// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// This code is partly derived from work written by TG x Thoth from P2Pcollab.
// Copyright 2022 TG x Thoth
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Commit

use ed25519_dalek::*;
use once_cell::sync::OnceCell;

use crate::errors::NgError;
use crate::log::*;
use crate::object::*;
use crate::repo::Repo;
use crate::store::*;
use crate::types::*;
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
    ) -> Result<CommitV0, SignatureError> {
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
        let kp = match (author_privkey, author_pubkey) {
            (PrivKey::Ed25519PrivKey(sk), PubKey::Ed25519PubKey(pk)) => [sk, pk].concat(),
            (_, _) => panic!("cannot sign with Montgomery key"),
        };
        let keypair = Keypair::from_bytes(kp.as_slice())?;
        let sig_bytes = keypair.sign(content_ser.as_slice()).to_bytes();
        let mut it = sig_bytes.chunks_exact(32);
        let mut ss: Ed25519Sig = [[0; 32], [0; 32]];
        ss[0].copy_from_slice(it.next().unwrap());
        ss[1].copy_from_slice(it.next().unwrap());
        let sig = Sig::Ed25519Sig(ss);
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
    ) -> Result<Commit, SignatureError> {
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
            _ => unimplemented!(),
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
            _ => {}
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
            _ => {}
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
            _ => {}
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
    pub fn verify_sig(&self) -> Result<(), SignatureError> {
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

mod test {
    use std::collections::HashMap;

    use ed25519_dalek::*;
    use rand::rngs::OsRng;

    use crate::branch::*;
    use crate::commit::*;
    use crate::store::*;
    use crate::types::*;

    #[test]
    pub fn test_commit() {
        let mut csprng = OsRng {};
        let keypair: Keypair = Keypair::generate(&mut csprng);
        log_debug!(
            "private key: ({}) {:?}",
            keypair.secret.as_bytes().len(),
            keypair.secret.as_bytes()
        );
        log_debug!(
            "public key: ({}) {:?}",
            keypair.public.as_bytes().len(),
            keypair.public.as_bytes()
        );
        let ed_priv_key = keypair.secret.to_bytes();
        let ed_pub_key = keypair.public.to_bytes();
        let priv_key = PrivKey::Ed25519PrivKey(ed_priv_key);
        let pub_key = PubKey::Ed25519PubKey(ed_pub_key);
        let seq = 3;
        let obj_ref = ObjectRef {
            id: ObjectId::Blake3Digest32([1; 32]),
            key: SymKey::ChaCha20Key([2; 32]),
        };
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
        log_debug!("commit: {:?}", commit);

        let store = Box::new(HashMapRepoStore::new());

        let repo = Repo::new_with_member(&pub_key, &pub_key, &[PermissionV0::WriteAsync], store);

        //let body = CommitBody::Ack(Ack::V0());
        //log_debug!("body: {:?}", body);

        match commit.load_body(repo.get_store()) {
            Ok(_b) => panic!("Body should not exist"),
            Err(CommitLoadError::MissingBlocks(missing)) => {
                assert_eq!(missing.len(), 1);
            }
            Err(e) => panic!("Commit verify error: {:?}", e),
        }

        let content = commit.content_v0();
        log_debug!("content: {:?}", content);

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
