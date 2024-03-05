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
    DeserializeError,
    CannotBeAtRootOfBranch,
    MustBeAtRootOfBranch,
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
        let headers = CommitHeaderV0::new_with(deps, ndeps, acks, nacks, refs, nrefs);
        let content = CommitContentV0 {
            author: author_pubkey,
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
            content,
            sig,
            id: None,
            key: None,
            header: headers.0,
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

    /// Load commit from store
    pub fn load(
        commit_ref: ObjectRef,
        store: &Box<impl RepoStore + ?Sized>,
    ) -> Result<Commit, CommitLoadError> {
        let (id, key) = (commit_ref.id, commit_ref.key);
        match Object::load(id, Some(key.clone()), store) {
            Ok(obj) => {
                let content = obj
                    .content()
                    .map_err(|_e| CommitLoadError::ObjectParseError)?;
                let mut commit = match content {
                    ObjectContent::V0(ObjectContentV0::Commit(c)) => c,
                    _ => return Err(CommitLoadError::DeserializeError),
                };
                commit.id = Some(id);
                commit.key = Some(key.clone());
                if let Some(CommitHeader::V0(header_v0)) = obj.header() {
                    commit.header = Some(header_v0.clone());
                }
                Ok(Commit::V0(commit))
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
    ) -> Result<CommitBody, CommitLoadError> {
        // TODO store body in CommitV0 (with #[serde(skip)]) as a cache for subsequent calls to load_body
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
            ObjectContent::V0(ObjectContentV0::CommitBody(body)) => Ok(CommitBody::V0(body)),
            _ => Err(CommitLoadError::DeserializeError),
        }
    }

    /// Get ID of parent `Object`
    pub fn id(&self) -> Option<ObjectId> {
        match self {
            Commit::V0(c) => c.id,
        }
    }

    /// Set ID of parent `Object`
    pub fn set_id(&mut self, id: ObjectId) {
        match self {
            Commit::V0(c) => c.id = Some(id),
        }
    }

    /// Get key of parent `Object`
    pub fn key(&self) -> Option<SymKey> {
        match self {
            Commit::V0(c) => c.key.clone(),
        }
    }

    /// Set key of parent `Object`
    pub fn set_key(&mut self, key: SymKey) {
        match self {
            Commit::V0(c) => c.key = Some(key),
        }
    }

    /// Get commit signature
    pub fn sig(&self) -> &Sig {
        match self {
            Commit::V0(c) => &c.sig,
        }
    }

    /// Get commit content V0
    pub fn content_v0(&self) -> &CommitContentV0 {
        match self {
            Commit::V0(c) => &c.content,
        }
    }

    /// This commit is the first one in the branch (doesn't have any ACKs nor Nacks)
    pub fn is_root_commit_of_branch(&self) -> bool {
        match self {
            Commit::V0(c) => match &c.content.header_keys {
                Some(hk) => hk.acks.is_empty() && hk.nacks.is_empty(),
                None => true,
            },
            _ => unimplemented!(),
        }
    }

    /// Get acks
    pub fn acks(&self) -> Vec<ObjectRef> {
        let mut res: Vec<ObjectRef> = vec![];
        match self {
            Commit::V0(c) => match &c.header {
                Some(header_v0) => match &c.content.header_keys {
                    Some(hk) => {
                        for ack in header_v0.acks.iter().zip(hk.acks.iter()) {
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

    /// Get deps
    pub fn deps(&self) -> Vec<ObjectRef> {
        let mut res: Vec<ObjectRef> = vec![];
        match self {
            Commit::V0(c) => match &c.header {
                Some(header_v0) => match &c.content.header_keys {
                    Some(hk) => {
                        for dep in header_v0.deps.iter().zip(hk.deps.iter()) {
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

    /// Get all commits that are in the direct causal past of the commit (`deps`, `acks`, `nacks`, `ndeps`)
    pub fn direct_causal_past(&self) -> Vec<ObjectRef> {
        let mut res: Vec<ObjectRef> = vec![];
        match self {
            Commit::V0(c) => match (&c.header, &c.content.header_keys) {
                (Some(header_v0), Some(hk)) => {
                    for ack in header_v0.acks.iter().zip(hk.acks.iter()) {
                        res.push(ack.into());
                    }
                    for nack in header_v0.nacks.iter().zip(hk.nacks.iter()) {
                        res.push(nack.into());
                    }
                    for dep in header_v0.deps.iter().zip(hk.deps.iter()) {
                        res.push(dep.into());
                    }
                    for ndep in header_v0.ndeps.iter().zip(hk.ndeps.iter()) {
                        res.push(ndep.into());
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
            Commit::V0(c) => c.content.seq,
        }
    }

    /// Verify commit signature
    pub fn verify_sig(&self) -> Result<(), SignatureError> {
        let c = match self {
            Commit::V0(c) => c,
        };
        let content_ser = serde_bare::to_vec(&c.content).unwrap();
        let pubkey = match c.content.author {
            PubKey::Ed25519PubKey(pk) => pk,
            _ => panic!("author cannot have a Montgomery key"),
        };
        let pk = PublicKey::from_bytes(&pubkey)?;
        let sig_bytes = match c.sig {
            Sig::Ed25519Sig(ss) => [ss[0], ss[1]].concat(),
        };
        let sig = Signature::from_bytes(&sig_bytes)?;
        pk.verify_strict(&content_ser, &sig)
    }

    /// Verify commit permissions
    pub fn verify_perm(&self, repo: &Repo) -> Result<(), CommitVerifyError> {
        repo.verify_permission(self)
            .map_err(|_| CommitVerifyError::PermissionDenied)
    }

    /// Verify if the commit's `body`, `header` and direct_causal_past, and recursively all their refs are available in the `store`
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

            // FIXME: what about this comment? seems like a Commit always has an id
            // the self of verify_full_object_refs_of_branch_at_commit() may not have an ID set,
            // but the commits loaded from store should have it
            match commit.id() {
                Some(id) => {
                    if visited.contains(&id) {
                        return Ok(());
                    }
                    visited.insert(id);
                }
                None => panic!("Commit without an ID"),
            }

            // load body & check if it's the Branch root commit
            match commit.load_body(store) {
                Ok(body) => {
                    if commit.is_root_commit_of_branch() {
                        if body.must_be_root_commit_in_branch() {
                            Ok(())
                        } else {
                            Err(CommitLoadError::CannotBeAtRootOfBranch)
                        }
                    } else {
                        if body.must_be_root_commit_in_branch() {
                            Err(CommitLoadError::MustBeAtRootOfBranch)
                        } else {
                            Ok(())
                        }
                    }
                }
                Err(CommitLoadError::MissingBlocks(m)) => {
                    // The commit body is missing.
                    missing.extend(m);
                    Ok(())
                }
                Err(e) => Err(e),
            }?;

            // load direct causal past
            for blockref in commit.direct_causal_past() {
                match Commit::load(blockref, store) {
                    Ok(c) => {
                        load_direct_object_refs(&c, store, visited, missing)?;
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
    pub fn verify(
        &self,
        repo: &Repo,
        store: &Box<impl RepoStore + ?Sized>,
    ) -> Result<(), CommitVerifyError> {
        self.verify_sig()
            .map_err(|_e| CommitVerifyError::InvalidSignature)?;
        self.verify_perm(repo)?;
        self.verify_full_object_refs_of_branch_at_commit(repo.get_store())
            .map_err(|e| CommitVerifyError::DepLoadError(e))?;
        Ok(())
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

        let repo =
            Repo::new_with_member(&pub_key, pub_key.clone(), &[Permission::Transaction], store);

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

        match commit.verify(&repo, repo.get_store()) {
            Ok(_) => panic!("Commit should not be Ok"),
            Err(CommitVerifyError::BodyLoadError(CommitLoadError::MissingBlocks(missing))) => {
                assert_eq!(missing.len(), 1);
            }
            Err(e) => panic!("Commit verify error: {:?}", e),
        }
    }
}
