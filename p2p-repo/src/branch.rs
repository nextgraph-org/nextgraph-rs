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

//! Branch of a Repository

use crate::log::*;
use std::collections::HashSet;

use fastbloom_rs::{BloomFilter as Filter, Membership};

use crate::object::*;
use crate::store::*;
use crate::types::*;

impl BranchV0 {
    pub fn new(
        id: PubKey,
        repo: ObjectRef,
        root_branch_def_id: ObjectId,
        topic_priv: PrivKey,
        metadata: Vec<u8>,
    ) -> BranchV0 {
        let topic_privkey: Vec<u8> = vec![];
        //TODO: topic_privkey is topic_priv encrypted with the repo_secret, branch_id, topic_id
        let topic = topic_priv.to_pub();
        BranchV0 {
            id,
            repo,
            root_branch_def_id,
            topic,
            topic_privkey,
            metadata,
        }
    }
}

impl Branch {
    pub fn new(
        id: PubKey,
        repo: ObjectRef,
        root_branch_def_id: ObjectId,
        topic_priv: PrivKey,
        metadata: Vec<u8>,
    ) -> Branch {
        Branch::V0(BranchV0::new(
            id,
            repo,
            root_branch_def_id,
            topic_priv,
            metadata,
        ))
    }

    /// Branch sync request from another peer
    ///
    /// Return ObjectIds to send
    pub fn sync_req(
        our_heads: &[ObjectId],
        their_heads: &[ObjectId],
        their_filter: &BloomFilter,
        store: &Box<impl RepoStore + ?Sized>,
    ) -> Result<Vec<ObjectId>, ObjectParseError> {
        //log_debug!(">> sync_req");
        //log_debug!("   our_heads: {:?}", our_heads);
        //log_debug!("   their_heads: {:?}", their_heads);

        /// Load `Commit` `Object`s of a `Branch` from the `RepoStore` starting from the given `Object`,
        /// and collect `ObjectId`s starting from `our_heads` towards `their_heads`
        fn load_branch(
            cobj: &Object,
            store: &Box<impl RepoStore + ?Sized>,
            their_heads: &[ObjectId],
            visited: &mut HashSet<ObjectId>,
            missing: &mut HashSet<ObjectId>,
        ) -> Result<bool, ObjectParseError> {
            //log_debug!(">>> load_branch: {}", cobj.id());
            let id = cobj.id();

            // root has no acks
            let is_root = cobj.is_root();
            //log_debug!("     acks: {:?}", cobj.acks());

            // check if this commit object is present in their_heads
            let mut their_head_found = their_heads.contains(&id);

            // load deps, stop at the root or if this is a commit object from their_heads
            if !is_root && !their_head_found {
                visited.insert(id);
                for id in cobj.deps() {
                    match Object::load(id, None, store) {
                        Ok(o) => {
                            if !visited.contains(&id) {
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
            //log_debug!("<<< load_branch: {}", their_head_found);
            ours.extend(visited); // add if one of their_heads found
        }

        // collect all commits reachable from their_heads
        for id in their_heads {
            let cobj = Object::load(*id, None, store)?;
            let mut visited = HashSet::new();
            let their_head_found = load_branch(&cobj, store, &[], &mut visited, &mut missing)?;
            //log_debug!("<<< load_branch: {}", their_head_found);
            theirs.extend(visited); // add if one of their_heads found
        }

        let mut result = &ours - &theirs;

        //log_debug!("!! ours: {:?}", ours);
        //log_debug!("!! theirs: {:?}", theirs);
        //log_debug!("!! result: {:?}", result);

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
        //log_debug!("!! result filtered: {:?}", result);
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
    use crate::repo::Repo;
    use crate::store::*;

    #[test]
    pub fn test_branch() {
        fn add_obj(
            content: ObjectContentV0,
            header: Option<CommitHeaderV0>,
            repo_pubkey: PubKey,
            repo_secret: SymKey,
            store: &Box<impl RepoStore + ?Sized>,
        ) -> ObjectRef {
            let max_object_size = 4000;
            let obj = Object::new(content, header, max_object_size, repo_pubkey, repo_secret);
            log_debug!(">>> add_obj");
            log_debug!("     id: {:?}", obj.id());
            log_debug!("     header: {:?}", obj.header());
            obj.save(store).unwrap();
            obj.reference().unwrap()
        }

        fn add_commit(
            branch: BranchId,
            author_privkey: PrivKey,
            author_pubkey: PubKey,
            seq: u64,
            deps: Vec<ObjectRef>,
            acks: Vec<ObjectRef>,
            body_ref: ObjectRef,
            repo_pubkey: PubKey,
            repo_secret: SymKey,
            store: &Box<impl RepoStore + ?Sized>,
        ) -> ObjectRef {
            let header = CommitHeaderV0::new_with_deps_and_acks(
                deps.iter().map(|r| r.id).collect(),
                acks.iter().map(|r| r.id).collect(),
            );

            let obj_ref = ObjectRef {
                id: ObjectId::Blake3Digest32([1; 32]),
                key: SymKey::ChaCha20Key([2; 32]),
            };
            let refs = vec![obj_ref];
            let metadata = vec![5u8; 55];

            let commit = CommitV0::new(
                author_privkey,
                author_pubkey,
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
            //log_debug!("commit: {:?}", commit);
            add_obj(
                ObjectContentV0::Commit(commit),
                header,
                repo_pubkey,
                repo_secret,
                store,
            )
        }

        fn add_body_branch(
            branch: BranchV0,
            repo_pubkey: PubKey,
            repo_secret: SymKey,
            store: &Box<impl RepoStore + ?Sized>,
        ) -> ObjectRef {
            let body = CommitBodyV0::Branch(branch);
            //log_debug!("body: {:?}", body);
            add_obj(
                ObjectContentV0::CommitBody(body),
                None,
                repo_pubkey,
                repo_secret,
                store,
            )
        }

        fn add_body_trans(
            header: Option<CommitHeaderV0>,
            repo_pubkey: PubKey,
            repo_secret: SymKey,
            store: &Box<impl RepoStore + ?Sized>,
        ) -> ObjectRef {
            let content = [7u8; 777].to_vec();
            let body = CommitBodyV0::Transaction(content);
            //log_debug!("body: {:?}", body);
            add_obj(
                ObjectContentV0::CommitBody(body),
                header,
                repo_pubkey,
                repo_secret,
                store,
            )
        }

        let store = Box::new(HashMapRepoStore::new());
        let mut rng = OsRng {};

        // repo

        let repo_keypair: Keypair = Keypair::generate(&mut rng);
        log_debug!(
            "repo private key: ({}) {:?}",
            repo_keypair.secret.as_bytes().len(),
            repo_keypair.secret.as_bytes()
        );
        log_debug!(
            "repo public key: ({}) {:?}",
            repo_keypair.public.as_bytes().len(),
            repo_keypair.public.as_bytes()
        );
        let repo_privkey = PrivKey::Ed25519PrivKey(repo_keypair.secret.to_bytes());
        let repo_pubkey = PubKey::Ed25519PubKey(repo_keypair.public.to_bytes());
        let repo_secret = SymKey::ChaCha20Key([9; 32]);

        // branch

        let branch_keypair: Keypair = Keypair::generate(&mut rng);
        log_debug!("branch public key: {:?}", branch_keypair.public.as_bytes());
        let branch_pubkey = PubKey::Ed25519PubKey(branch_keypair.public.to_bytes());

        let member_keypair: Keypair = Keypair::generate(&mut rng);
        log_debug!("member public key: {:?}", member_keypair.public.as_bytes());
        let member_privkey = PrivKey::Ed25519PrivKey(member_keypair.secret.to_bytes());
        let member_pubkey = PubKey::Ed25519PubKey(member_keypair.public.to_bytes());

        let metadata = [66u8; 64].to_vec();

        let repo = Repo::new_with_member(
            &repo_pubkey,
            member_pubkey,
            &[Permission::Transaction],
            store,
        );

        let repo_ref = ObjectRef {
            id: ObjectId::Blake3Digest32([1; 32]),
            key: SymKey::ChaCha20Key([2; 32]),
        };

        let root_branch_def_id = ObjectId::Blake3Digest32([1; 32]);

        let branch = BranchV0::new(
            branch_pubkey,
            repo_ref,
            root_branch_def_id,
            repo_privkey,
            metadata,
        );
        //log_debug!("branch: {:?}", branch);

        fn print_branch() {
            log_debug!("branch deps/acks:");
            log_debug!("");
            log_debug!("     br");
            log_debug!("    /  \\");
            log_debug!("  t1   t2");
            log_debug!("  / \\  / \\");
            log_debug!(" a3  t4<--t5-->(t1)");
            log_debug!("     / \\");
            log_debug!("   a6   a7");
            log_debug!("");
        }

        print_branch();

        // commit bodies

        let branch_body = add_body_branch(
            branch.clone(),
            repo_pubkey.clone(),
            repo_secret.clone(),
            repo.get_store(),
        );

        let trans_body = add_body_trans(None, repo_pubkey, repo_secret.clone(), repo.get_store());

        // create & add commits to store

        log_debug!(">> br");
        let br = add_commit(
            branch_pubkey,
            member_privkey.clone(),
            member_pubkey,
            0,
            vec![],
            vec![],
            branch_body.clone(),
            repo_pubkey,
            repo_secret.clone(),
            repo.get_store(),
        );

        log_debug!(">> t1");
        let t1 = add_commit(
            branch_pubkey,
            member_privkey.clone(),
            member_pubkey,
            1,
            vec![br.clone()],
            vec![],
            trans_body.clone(),
            repo_pubkey,
            repo_secret.clone(),
            repo.get_store(),
        );

        log_debug!(">> t2");
        let t2 = add_commit(
            branch_pubkey,
            member_privkey.clone(),
            member_pubkey,
            2,
            vec![br.clone()],
            vec![],
            trans_body.clone(),
            repo_pubkey,
            repo_secret.clone(),
            repo.get_store(),
        );

        // log_debug!(">> a3");
        // let a3 = add_commit(
        //     branch_pubkey,
        //     member_privkey.clone(),
        //     member_pubkey,
        //     3,
        //     vec![t1.clone()],
        //     vec![],
        //     ack_body.clone(),
        //     repo_pubkey,
        //     repo_secret.clone(),
        //     &mut store,
        // );

        log_debug!(">> t4");
        let t4 = add_commit(
            branch_pubkey,
            member_privkey.clone(),
            member_pubkey,
            4,
            vec![t2.clone()],
            vec![t1.clone()],
            trans_body.clone(),
            repo_pubkey,
            repo_secret.clone(),
            repo.get_store(),
        );

        log_debug!(">> t5");
        let t5 = add_commit(
            branch_pubkey,
            member_privkey.clone(),
            member_pubkey,
            5,
            vec![t1.clone(), t2.clone()],
            vec![t4.clone()],
            trans_body.clone(),
            repo_pubkey,
            repo_secret.clone(),
            repo.get_store(),
        );

        log_debug!(">> a6");
        let a6 = add_commit(
            branch_pubkey,
            member_privkey.clone(),
            member_pubkey,
            6,
            vec![t4.clone()],
            vec![],
            trans_body.clone(),
            repo_pubkey,
            repo_secret.clone(),
            repo.get_store(),
        );

        log_debug!(">> a7");
        let a7 = add_commit(
            branch_pubkey,
            member_privkey.clone(),
            member_pubkey,
            7,
            vec![t4.clone()],
            vec![],
            trans_body.clone(),
            repo_pubkey,
            repo_secret.clone(),
            repo.get_store(),
        );

        let c7 = Commit::load(a7.clone(), repo.get_store()).unwrap();
        c7.verify(&repo, repo.get_store()).unwrap();

        let mut filter = Filter::new(FilterBuilder::new(10, 0.01));
        for commit_ref in [br, t1, t2, t5.clone(), a6.clone()] {
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
        log_debug!(">> sync_req");
        log_debug!("   our_heads: [a3, t5, a6, a7]");
        log_debug!("   their_heads: [a3, t5]");
        log_debug!("   their_commits: [br, t1, t2, a3, t5, a6]");

        let ids = Branch::sync_req(
            &[t5.id, a6.id, a7.id],
            &[t5.id],
            &their_commits,
            repo.get_store(),
        )
        .unwrap();

        assert_eq!(ids.len(), 1);
        assert!(ids.contains(&a7.id));
    }
}
