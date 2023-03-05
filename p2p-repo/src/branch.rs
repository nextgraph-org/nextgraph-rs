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

//! Branch of a Repository

use debug_print::*;
use std::collections::{HashMap, HashSet};

use fastbloom_rs::{BloomFilter as Filter, Membership};

use crate::object::*;
use crate::store::*;
use crate::types::*;

impl MemberV0 {
    /// New member
    pub fn new(id: PubKey, commit_types: Vec<CommitType>, metadata: Vec<u8>) -> MemberV0 {
        MemberV0 {
            id,
            commit_types,
            metadata,
        }
    }

    /// Check whether this member has permission for the given commit type
    pub fn has_perm(&self, commit_type: CommitType) -> bool {
        self.commit_types.contains(&commit_type)
    }
}

impl Member {
    /// New member
    pub fn new(id: PubKey, commit_types: Vec<CommitType>, metadata: Vec<u8>) -> Member {
        Member::V0(MemberV0::new(id, commit_types, metadata))
    }

    /// Check whether this member has permission for the given commit type
    pub fn has_perm(&self, commit_type: CommitType) -> bool {
        match self {
            Member::V0(m) => m.has_perm(commit_type),
        }
    }
}

impl BranchV0 {
    pub fn new(
        id: PubKey,
        topic: PubKey,
        secret: SymKey,
        members: Vec<MemberV0>,
        quorum: HashMap<CommitType, u32>,
        ack_delay: RelTime,
        tags: Vec<u8>,
        metadata: Vec<u8>,
    ) -> BranchV0 {
        BranchV0 {
            id,
            topic,
            secret,
            members,
            quorum,
            ack_delay,
            tags,
            metadata,
        }
    }
}

impl Branch {
    pub fn new(
        id: PubKey,
        topic: PubKey,
        secret: SymKey,
        members: Vec<MemberV0>,
        quorum: HashMap<CommitType, u32>,
        ack_delay: RelTime,
        tags: Vec<u8>,
        metadata: Vec<u8>,
    ) -> Branch {
        Branch::V0(BranchV0::new(
            id, topic, secret, members, quorum, ack_delay, tags, metadata,
        ))
    }

    /// Get member by ID
    pub fn get_member(&self, id: &PubKey) -> Option<&MemberV0> {
        match self {
            Branch::V0(b) => {
                for m in b.members.iter() {
                    if m.id == *id {
                        return Some(m);
                    }
                }
            }
        }
        None
    }

    /// Branch sync request from another peer
    ///
    /// Return ObjectIds to send
    pub fn sync_req(
        our_heads: &[ObjectId],
        their_heads: &[ObjectId],
        their_filter: &BloomFilter,
        store: &impl RepoStore,
    ) -> Result<Vec<ObjectId>, ObjectParseError> {
        //debug_println!(">> sync_req");
        //debug_println!("   our_heads: {:?}", our_heads);
        //debug_println!("   their_heads: {:?}", their_heads);

        /// Load `Commit` `Object`s of a `Branch` from the `RepoStore` starting from the given `Object`,
        /// and collect `ObjectId`s starting from `our_heads` towards `their_heads`
        fn load_branch(
            cobj: &Object,
            store: &impl RepoStore,
            their_heads: &[ObjectId],
            visited: &mut HashSet<ObjectId>,
            missing: &mut HashSet<ObjectId>,
        ) -> Result<bool, ObjectParseError> {
            //debug_println!(">>> load_branch: {}", cobj.id());
            let id = cobj.id();

            // root has no deps
            let is_root = cobj.is_root();
            //debug_println!("     deps: {:?}", cobj.deps());

            // check if this commit object is present in their_heads
            let mut their_head_found = their_heads.contains(&id);

            // load deps, stop at the root or if this is a commit object from their_heads
            if !is_root && !their_head_found {
                visited.insert(id);
                for id in cobj.deps() {
                    match Object::load(*id, None, store) {
                        Ok(o) => {
                            if !visited.contains(id) {
                                if load_branch(&o, store, their_heads, visited, missing)? {
                                    their_head_found = true;
                                }
                            }
                        }
                        Err(ObjectParseError::MissingBlocks(m)) => {
                            missing.extend(m);
                        }
                        Err(e) => return Err(e),
                    }
                }
            }
            Ok(their_head_found)
        }

        // missing commits from our branch
        let mut missing = HashSet::new();
        // our commits
        let mut ours = HashSet::new();
        // their commits
        let mut theirs = HashSet::new();

        // collect all commits reachable from our_heads
        // up to the root or until encountering a commit from their_heads
        for id in our_heads {
            let cobj = Object::load(*id, None, store)?;
            let mut visited = HashSet::new();
            let their_head_found =
                load_branch(&cobj, store, their_heads, &mut visited, &mut missing)?;
            //debug_println!("<<< load_branch: {}", their_head_found);
            ours.extend(visited); // add if one of their_heads found
        }

        // collect all commits reachable from their_heads
        for id in their_heads {
            let cobj = Object::load(*id, None, store)?;
            let mut visited = HashSet::new();
            let their_head_found = load_branch(&cobj, store, &[], &mut visited, &mut missing)?;
            //debug_println!("<<< load_branch: {}", their_head_found);
            theirs.extend(visited); // add if one of their_heads found
        }

        let mut result = &ours - &theirs;

        //debug_println!("!! ours: {:?}", ours);
        //debug_println!("!! theirs: {:?}", theirs);
        //debug_println!("!! result: {:?}", result);

        // remove their_commits from result
        let filter = Filter::from_u8_array(their_filter.f.as_slice(), their_filter.k.into());
        for id in result.clone() {
            match id {
                Digest::Blake3Digest32(d) => {
                    if filter.contains(&d) {
                        result.remove(&id);
                    }
                }
            }
        }
        //debug_println!("!! result filtered: {:?}", result);
        Ok(Vec::from_iter(result))
    }
}

mod test {
    use std::collections::HashMap;

    use ed25519_dalek::*;
    use fastbloom_rs::{BloomFilter as Filter, FilterBuilder, Membership};
    use rand::rngs::OsRng;

    use crate::branch::*;
    use crate::commit::*;
    use crate::object::*;
    use crate::repo;
    use crate::store::*;

    #[test]
    pub fn test_branch() {
        fn add_obj(
            content: ObjectContent,
            deps: Vec<ObjectId>,
            expiry: Option<Timestamp>,
            repo_pubkey: PubKey,
            repo_secret: SymKey,
            store: &mut impl RepoStore,
        ) -> ObjectRef {
            let max_object_size = 4000;
            let obj = Object::new(
                content,
                deps,
                expiry,
                max_object_size,
                repo_pubkey,
                repo_secret,
            );
            println!(">>> add_obj");
            println!("     id: {:?}", obj.id());
            println!("     deps: {:?}", obj.deps());
            obj.save(store).unwrap();
            obj.reference().unwrap()
        }

        fn add_commit(
            branch: ObjectRef,
            author_privkey: PrivKey,
            author_pubkey: PubKey,
            seq: u32,
            deps: Vec<ObjectRef>,
            acks: Vec<ObjectRef>,
            body_ref: ObjectRef,
            repo_pubkey: PubKey,
            repo_secret: SymKey,
            store: &mut impl RepoStore,
        ) -> ObjectRef {
            let mut obj_deps: Vec<ObjectId> = vec![];
            obj_deps.extend(deps.iter().map(|r| r.id));
            obj_deps.extend(acks.iter().map(|r| r.id));

            let obj_ref = ObjectRef {
                id: ObjectId::Blake3Digest32([1; 32]),
                key: SymKey::ChaCha20Key([2; 32]),
            };
            let refs = vec![obj_ref];
            let metadata = vec![5u8; 55];
            let expiry = None;

            let commit = Commit::new(
                author_privkey,
                author_pubkey,
                seq,
                branch,
                deps,
                acks,
                refs,
                metadata,
                body_ref,
                expiry,
            )
            .unwrap();
            //println!("commit: {:?}", commit);
            add_obj(
                ObjectContent::Commit(commit),
                obj_deps,
                expiry,
                repo_pubkey,
                repo_secret,
                store,
            )
        }

        fn add_body_branch(
            branch: Branch,
            repo_pubkey: PubKey,
            repo_secret: SymKey,
            store: &mut impl RepoStore,
        ) -> ObjectRef {
            let deps = vec![];
            let expiry = None;
            let body = CommitBody::Branch(branch);
            //println!("body: {:?}", body);
            add_obj(
                ObjectContent::CommitBody(body),
                deps,
                expiry,
                repo_pubkey,
                repo_secret,
                store,
            )
        }

        fn add_body_trans(
            deps: Vec<ObjectId>,
            repo_pubkey: PubKey,
            repo_secret: SymKey,
            store: &mut impl RepoStore,
        ) -> ObjectRef {
            let expiry = None;
            let content = [7u8; 777].to_vec();
            let body = CommitBody::Transaction(Transaction::V0(content));
            //println!("body: {:?}", body);
            add_obj(
                ObjectContent::CommitBody(body),
                deps,
                expiry,
                repo_pubkey,
                repo_secret,
                store,
            )
        }

        fn add_body_ack(
            deps: Vec<ObjectId>,
            repo_pubkey: PubKey,
            repo_secret: SymKey,
            store: &mut impl RepoStore,
        ) -> ObjectRef {
            let expiry = None;
            let body = CommitBody::Ack(Ack::V0());
            //println!("body: {:?}", body);
            add_obj(
                ObjectContent::CommitBody(body),
                deps,
                expiry,
                repo_pubkey,
                repo_secret,
                store,
            )
        }

        let mut store = HashMapRepoStore::new();
        let mut rng = OsRng {};

        // repo

        let repo_keypair: Keypair = Keypair::generate(&mut rng);
        println!(
            "repo private key: ({}) {:?}",
            repo_keypair.secret.as_bytes().len(),
            repo_keypair.secret.as_bytes()
        );
        println!(
            "repo public key: ({}) {:?}",
            repo_keypair.public.as_bytes().len(),
            repo_keypair.public.as_bytes()
        );
        let _repo_privkey = PrivKey::Ed25519PrivKey(repo_keypair.secret.to_bytes());
        let repo_pubkey = PubKey::Ed25519PubKey(repo_keypair.public.to_bytes());
        let repo_secret = SymKey::ChaCha20Key([9; 32]);

        // branch

        let branch_keypair: Keypair = Keypair::generate(&mut rng);
        println!("branch public key: {:?}", branch_keypair.public.as_bytes());
        let branch_pubkey = PubKey::Ed25519PubKey(branch_keypair.public.to_bytes());

        let member_keypair: Keypair = Keypair::generate(&mut rng);
        println!("member public key: {:?}", member_keypair.public.as_bytes());
        let member_privkey = PrivKey::Ed25519PrivKey(member_keypair.secret.to_bytes());
        let member_pubkey = PubKey::Ed25519PubKey(member_keypair.public.to_bytes());

        let metadata = [66u8; 64].to_vec();
        let commit_types = vec![CommitType::Ack, CommitType::Transaction];
        let secret = SymKey::ChaCha20Key([0; 32]);

        let member = MemberV0::new(member_pubkey, commit_types, metadata.clone());
        let members = vec![member];
        let mut quorum = HashMap::new();
        quorum.insert(CommitType::Transaction, 3);
        let ack_delay = RelTime::Minutes(3);
        let tags = [99u8; 32].to_vec();
        let branch = Branch::new(
            branch_pubkey,
            branch_pubkey,
            secret,
            members,
            quorum,
            ack_delay,
            tags,
            metadata,
        );
        //println!("branch: {:?}", branch);

        fn print_branch() {
            println!("branch deps/acks:");
            println!("");
            println!("     br");
            println!("    /  \\");
            println!("  t1   t2");
            println!("  / \\  / \\");
            println!(" a3  t4<--t5-->(t1)");
            println!("     / \\");
            println!("   a6   a7");
            println!("");
        }

        print_branch();

        // commit bodies

        let branch_body = add_body_branch(
            branch.clone(),
            repo_pubkey.clone(),
            repo_secret.clone(),
            &mut store,
        );
        let ack_body = add_body_ack(vec![], repo_pubkey, repo_secret, &mut store);
        let trans_body = add_body_trans(vec![], repo_pubkey, repo_secret, &mut store);

        // create & add commits to store

        println!(">> br");
        let br = add_commit(
            branch_body,
            member_privkey,
            member_pubkey,
            0,
            vec![],
            vec![],
            branch_body,
            repo_pubkey,
            repo_secret,
            &mut store,
        );

        println!(">> t1");
        let t1 = add_commit(
            branch_body,
            member_privkey,
            member_pubkey,
            1,
            vec![br],
            vec![],
            trans_body,
            repo_pubkey,
            repo_secret,
            &mut store,
        );

        println!(">> t2");
        let t2 = add_commit(
            branch_body,
            member_privkey,
            member_pubkey,
            2,
            vec![br],
            vec![],
            trans_body,
            repo_pubkey,
            repo_secret,
            &mut store,
        );

        println!(">> a3");
        let a3 = add_commit(
            branch_body,
            member_privkey,
            member_pubkey,
            3,
            vec![t1],
            vec![],
            ack_body,
            repo_pubkey,
            repo_secret,
            &mut store,
        );

        println!(">> t4");
        let t4 = add_commit(
            branch_body,
            member_privkey,
            member_pubkey,
            4,
            vec![t2],
            vec![t1],
            trans_body,
            repo_pubkey,
            repo_secret,
            &mut store,
        );

        println!(">> t5");
        let t5 = add_commit(
            branch_body,
            member_privkey,
            member_pubkey,
            5,
            vec![t1, t2],
            vec![t4],
            trans_body,
            repo_pubkey,
            repo_secret,
            &mut store,
        );

        println!(">> a6");
        let a6 = add_commit(
            branch_body,
            member_privkey,
            member_pubkey,
            6,
            vec![t4],
            vec![],
            ack_body,
            repo_pubkey,
            repo_secret,
            &mut store,
        );

        println!(">> a7");
        let a7 = add_commit(
            branch_body,
            member_privkey,
            member_pubkey,
            7,
            vec![t4],
            vec![],
            ack_body,
            repo_pubkey,
            repo_secret,
            &mut store,
        );

        let c7 = Commit::load(a7, &store).unwrap();
        c7.verify(&branch, &store).unwrap();

        let mut filter = Filter::new(FilterBuilder::new(10, 0.01));
        for commit_ref in [br, t1, t2, a3, t5, a6] {
            match commit_ref.id {
                ObjectId::Blake3Digest32(d) => filter.add(&d),
            }
        }
        let cfg = filter.config();
        let their_commits = BloomFilter {
            k: cfg.hashes,
            f: filter.get_u8_array().to_vec(),
        };

        print_branch();
        println!(">> sync_req");
        println!("   our_heads: [a3, t5, a6, a7]");
        println!("   their_heads: [a3, t5]");
        println!("   their_commits: [br, t1, t2, a3, t5, a6]");

        let ids = Branch::sync_req(
            &[a3.id, t5.id, a6.id, a7.id],
            &[a3.id, t5.id],
            &their_commits,
            &store,
        )
        .unwrap();

        assert_eq!(ids.len(), 1);
        assert!(ids.contains(&a7.id));
    }
}
