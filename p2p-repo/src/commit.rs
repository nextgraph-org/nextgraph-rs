// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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

use debug_print::*;
use ed25519_dalek::*;

use std::collections::HashSet;
use std::iter::FromIterator;

use crate::object::*;
use crate::store::*;
use crate::types::*;

#[derive(Debug)]
pub enum CommitLoadError {
    MissingBlocks(Vec<BlockId>),
    ObjectParseError,
    DeserializeError,
}

#[derive(Debug)]
pub enum CommitVerifyError {
    InvalidSignature,
    PermissionDenied,
    BodyLoadError(CommitLoadError),
    DepLoadError(CommitLoadError),
}
impl CommitBody {
    /// Get CommitType corresponding to CommitBody
    pub fn to_type(&self) -> CommitType {
        match self {
            CommitBody::Ack(_) => CommitType::Ack,
            CommitBody::AddBranch(_) => CommitType::AddBranch,
            CommitBody::AddMembers(_) => CommitType::AddMembers,
            CommitBody::Branch(_) => CommitType::Branch,
            CommitBody::EndOfBranch(_) => CommitType::EndOfBranch,
            CommitBody::RemoveBranch(_) => CommitType::RemoveBranch,
            CommitBody::Repository(_) => CommitType::Repository,
            CommitBody::Snapshot(_) => CommitType::Snapshot,
            CommitBody::Transaction(_) => CommitType::Transaction,
        }
    }
}

impl CommitV0 {
    /// New commit
    pub fn new(
        author_privkey: PrivKey,
        author_pubkey: PubKey,
        seq: u32,
        branch: ObjectRef,
        deps: Vec<ObjectRef>,
        acks: Vec<ObjectRef>,
        refs: Vec<ObjectRef>,
        metadata: Vec<u8>,
        body: ObjectRef,
        expiry: Option<Timestamp>,
    ) -> Result<CommitV0, SignatureError> {
        let content = CommitContentV0 {
            author: author_pubkey,
            seq,
            branch,
            deps,
            acks,
            refs,
            metadata,
            body,
            expiry,
        };
        let content_ser = serde_bare::to_vec(&content).unwrap();

        // sign commit
        let kp = match (author_privkey, author_pubkey) {
            (PrivKey::Ed25519PrivKey(sk), PubKey::Ed25519PubKey(pk)) => [sk, pk].concat(),
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
        })
    }
}

impl Commit {
    /// New commit
    pub fn new(
        author_privkey: PrivKey,
        author_pubkey: PubKey,
        seq: u32,
        branch: ObjectRef,
        deps: Vec<ObjectRef>,
        acks: Vec<ObjectRef>,
        refs: Vec<ObjectRef>,
        metadata: Vec<u8>,
        body: ObjectRef,
        expiry: Option<Timestamp>,
    ) -> Result<Commit, SignatureError> {
        CommitV0::new(
            author_privkey,
            author_pubkey,
            seq,
            branch,
            deps,
            acks,
            refs,
            metadata,
            body,
            expiry,
        )
        .map(|c| Commit::V0(c))
    }

    /// Load commit from store
    pub fn load(commit_ref: ObjectRef, store: &impl RepoStore) -> Result<Commit, CommitLoadError> {
        let (id, key) = (commit_ref.id, commit_ref.key);
        match Object::load(id, Some(key), store) {
            Ok(obj) => {
                let content = obj
                    .content()
                    .map_err(|_e| CommitLoadError::ObjectParseError)?;
                let mut commit = match content {
                    ObjectContent::Commit(c) => c,
                    _ => return Err(CommitLoadError::DeserializeError),
                };
                commit.set_id(id);
                commit.set_key(key);
                Ok(commit)
            }
            Err(ObjectParseError::MissingBlocks(missing)) => {
                Err(CommitLoadError::MissingBlocks(missing))
            }
            Err(_) => Err(CommitLoadError::ObjectParseError),
        }
    }

    /// Load commit body from store
    pub fn load_body(&self, store: &impl RepoStore) -> Result<CommitBody, CommitLoadError> {
        let content = self.content();
        let (id, key) = (content.body.id, content.body.key);
        let obj = Object::load(id.clone(), Some(key.clone()), store).map_err(|e| match e {
            ObjectParseError::MissingBlocks(missing) => CommitLoadError::MissingBlocks(missing),
            _ => CommitLoadError::ObjectParseError,
        })?;
        let content = obj
            .content()
            .map_err(|_e| CommitLoadError::ObjectParseError)?;
        match content {
            ObjectContent::CommitBody(body) => Ok(body),
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
            Commit::V0(c) => c.key,
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

    /// Get commit content
    pub fn content(&self) -> &CommitContentV0 {
        match self {
            Commit::V0(c) => &c.content,
        }
    }

    /// Get acks
    pub fn acks(&self) -> Vec<ObjectRef> {
        match self {
            Commit::V0(c) => c.content.acks.clone(),
        }
    }

    /// Get deps
    pub fn deps(&self) -> Vec<ObjectRef> {
        match self {
            Commit::V0(c) => c.content.deps.clone(),
        }
    }

    /// Get all direct commit dependencies of the commit (`deps`, `acks`)
    pub fn deps_acks(&self) -> Vec<ObjectRef> {
        match self {
            Commit::V0(c) => [c.content.acks.clone(), c.content.deps.clone()].concat(),
        }
    }

    /// Get seq
    pub fn seq(&self) -> u32 {
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
        };
        let pk = PublicKey::from_bytes(&pubkey)?;
        let sig_bytes = match c.sig {
            Sig::Ed25519Sig(ss) => [ss[0], ss[1]].concat(),
        };
        let sig = Signature::from_bytes(&sig_bytes)?;
        pk.verify_strict(&content_ser, &sig)
    }

    /// Verify commit permissions
    pub fn verify_perm(&self, body: &CommitBody, branch: &Branch) -> Result<(), CommitVerifyError> {
        let content = self.content();
        match branch.get_member(&content.author) {
            Some(m) => {
                if m.has_perm(body.to_type()) {
                    return Ok(());
                }
            }
            None => (),
        }
        Err(CommitVerifyError::PermissionDenied)
    }

    /// Verify if the commit's `body` and dependencies (`deps` & `acks`) are available in the `store`
    pub fn verify_deps(&self, store: &impl RepoStore) -> Result<Vec<ObjectId>, CommitLoadError> {
        //debug_println!(">> verify_deps: #{}", self.seq());
        /// Load `Commit`s of a `Branch` from the `RepoStore` starting from the given `Commit`,
        /// and collect missing `ObjectId`s
        fn load_branch(
            commit: &Commit,
            store: &impl RepoStore,
            visited: &mut HashSet<ObjectId>,
            missing: &mut HashSet<ObjectId>,
        ) -> Result<(), CommitLoadError> {
            //debug_println!(">>> load_branch: #{}", commit.seq());
            // the commit verify_deps() was called on may not have an ID set,
            // but the commits loaded from store should have it
            match commit.id() {
                Some(id) => {
                    if visited.contains(&id) {
                        return Ok(());
                    }
                    visited.insert(id);
                }
                None => (),
            }

            // load body & check if it's the Branch commit at the root
            let is_root = match commit.load_body(store) {
                Ok(body) => body.to_type() == CommitType::Branch,
                Err(CommitLoadError::MissingBlocks(m)) => {
                    missing.extend(m);
                    false
                }
                Err(e) => return Err(e),
            };
            debug_println!("!!! is_root: {}", is_root);

            // load deps
            if !is_root {
                for dep in commit.deps_acks() {
                    match Commit::load(dep, store) {
                        Ok(c) => {
                            load_branch(&c, store, visited, missing)?;
                        }
                        Err(CommitLoadError::MissingBlocks(m)) => {
                            missing.extend(m);
                        }
                        Err(e) => return Err(e),
                    }
                }
            }
            Ok(())
        }

        let mut visited = HashSet::new();
        let mut missing = HashSet::new();
        load_branch(self, store, &mut visited, &mut missing)?;

        if !missing.is_empty() {
            return Err(CommitLoadError::MissingBlocks(Vec::from_iter(missing)));
        }
        Ok(Vec::from_iter(visited))
    }

    /// Verify signature, permissions, and dependencies
    pub fn verify(&self, branch: &Branch, store: &impl RepoStore) -> Result<(), CommitVerifyError> {
        self.verify_sig()
            .map_err(|_e| CommitVerifyError::InvalidSignature)?;
        let body = self
            .load_body(store)
            .map_err(|e| CommitVerifyError::BodyLoadError(e))?;
        self.verify_perm(&body, branch)?;
        self.verify_deps(store)
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
        println!(
            "private key: ({}) {:?}",
            keypair.secret.as_bytes().len(),
            keypair.secret.as_bytes()
        );
        println!(
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
        let obj_refs = vec![obj_ref];
        let branch = obj_ref.clone();
        let deps = obj_refs.clone();
        let acks = obj_refs.clone();
        let refs = obj_refs.clone();
        let metadata = vec![1, 2, 3];
        let body_ref = obj_ref.clone();
        let expiry = Some(2342);

        let commit = Commit::new(
            priv_key, pub_key, seq, branch, deps, acks, refs, metadata, body_ref, expiry,
        )
        .unwrap();
        println!("commit: {:?}", commit);

        let store = HashMapRepoStore::new();
        let metadata = [66u8; 64].to_vec();
        let commit_types = vec![CommitType::Ack, CommitType::Transaction];
        let key: [u8; 32] = [0; 32];
        let secret = SymKey::ChaCha20Key(key);
        let member = MemberV0::new(pub_key, commit_types, metadata.clone());
        let members = vec![member];
        let mut quorum = HashMap::new();
        quorum.insert(CommitType::Transaction, 3);
        let ack_delay = RelTime::Minutes(3);
        let tags = [99u8; 32].to_vec();
        let branch = Branch::new(
            pub_key.clone(),
            pub_key.clone(),
            secret,
            members,
            quorum,
            ack_delay,
            tags,
            metadata,
        );
        //println!("branch: {:?}", branch);
        let body = CommitBody::Ack(Ack::V0());
        //println!("body: {:?}", body);

        match commit.load_body(&store) {
            Ok(_b) => panic!("Body should not exist"),
            Err(CommitLoadError::MissingBlocks(missing)) => {
                assert_eq!(missing.len(), 1);
            }
            Err(e) => panic!("Commit verify error: {:?}", e),
        }

        let content = commit.content();
        println!("content: {:?}", content);

        commit.verify_sig().expect("Invalid signature");
        commit
            .verify_perm(&body, &branch)
            .expect("Permission denied");

        match commit.verify_deps(&store) {
            Ok(_) => panic!("Commit should not be Ok"),
            Err(CommitLoadError::MissingBlocks(missing)) => {
                assert_eq!(missing.len(), 1);
            }
            Err(e) => panic!("Commit verify error: {:?}", e),
        }

        match commit.verify(&branch, &store) {
            Ok(_) => panic!("Commit should not be Ok"),
            Err(CommitVerifyError::BodyLoadError(CommitLoadError::MissingBlocks(missing))) => {
                assert_eq!(missing.len(), 1);
            }
            Err(e) => panic!("Commit verify error: {:?}", e),
        }
    }
}
