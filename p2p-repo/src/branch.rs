// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Branch of a Repository

use std::collections::HashSet;

// use fastbloom_rs::{BloomFilter as Filter, Membership};

use crate::errors::*;
use crate::object::*;
use crate::store::*;
use crate::types::*;

impl BranchV0 {
    pub fn new(
        id: PubKey,
        repo: ObjectRef,
        root_branch_readcap_id: ObjectId,
        topic_priv: PrivKey,
        metadata: Vec<u8>,
    ) -> BranchV0 {
        let topic_privkey: Vec<u8> = vec![];
        //TODO: topic_privkey is topic_priv encrypted with RepoWriteCapSecret, TopicId, BranchId
        let topic = topic_priv.to_pub();
        BranchV0 {
            id,
            repo,
            root_branch_readcap_id,
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
        root_branch_readcap_id: ObjectId,
        topic_priv: PrivKey,
        metadata: Vec<u8>,
    ) -> Branch {
        Branch::V0(BranchV0::new(
            id,
            repo,
            root_branch_readcap_id,
            topic_priv,
            metadata,
        ))
    }

    /// Branch sync request from another peer
    /// `target_heads` represents the list of heads the requester would like to reach. this list should not be empty.
    ///  if the requester doesn't know what to reach, the responder should fill this list with their own current local head.
    /// `known_heads` represents the list of current heads at the requester replica at the moment of request.
    ///  an empty list means the requester has an empty branch locally
    ///
    /// Return ObjectIds to send
    pub fn sync_req(
        target_heads: &[ObjectId],
        known_heads: &[ObjectId],
        //their_filter: &BloomFilter,
        store: &Box<impl RepoStore + ?Sized>,
    ) -> Result<Vec<ObjectId>, ObjectParseError> {
        //log_debug!(">> sync_req");
        //log_debug!("   target_heads: {:?}", target_heads);
        //log_debug!("   known_heads: {:?}", known_heads);

        /// Load causal past of a Commit `cobj` in a `Branch` from the `RepoStore`,
        /// and collect in `visited` the ObjectIds encountered on the way, stopping at any commit already belonging to `theirs` or the root of DAG.
        /// optionally collecting the missing objects/blocks that couldn't be found locally on the way
        fn load_causal_past(
            cobj: &Object,
            store: &Box<impl RepoStore + ?Sized>,
            theirs: &HashSet<ObjectId>,
            visited: &mut HashSet<ObjectId>,
            missing: &mut Option<&mut HashSet<ObjectId>>,
        ) -> Result<(), ObjectParseError> {
            let id = cobj.id();

            // check if this commit object is present in theirs or has already been visited in the current walk
            // load deps, stop at the root(including it in visited) or if this is a commit object from known_heads
            if !theirs.contains(&id) && !visited.contains(&id) {
                visited.insert(id);
                for id in cobj.acks_and_nacks() {
                    match Object::load(id, None, store) {
                        Ok(o) => {
                            load_causal_past(&o, store, theirs, visited, missing)?;
                        }
                        Err(ObjectParseError::MissingBlocks(blocks)) => {
                            missing.as_mut().map(|m| m.extend(blocks));
                        }
                        Err(e) => return Err(e),
                    }
                }
            }
            Ok(())
        }

        // their commits
        let mut theirs = HashSet::new();

        // collect causal past of known_heads
        for id in known_heads {
            if let Ok(cobj) = Object::load(*id, None, store) {
                load_causal_past(&cobj, store, &HashSet::new(), &mut theirs, &mut None)?;
            }
            // we silently discard any load error on the known_heads as the responder might not know them (yet).
        }

        let mut visited = HashSet::new();
        // collect all commits reachable from target_heads
        // up to the root or until encountering a commit from theirs
        for id in target_heads {
            if let Ok(cobj) = Object::load(*id, None, store) {
                load_causal_past(&cobj, store, &theirs, &mut visited, &mut None)?;
            }
            // we silently discard any load error on the target_heads as they can be wrong if the requester is confused about what the responder has locally.
        }

        //log_debug!("!! ours: {:?}", ours);
        //log_debug!("!! theirs: {:?}", theirs);

        // remove their_commits from result
        // let filter = Filter::from_u8_array(their_filter.f.as_slice(), their_filter.k.into());
        // for id in result.clone() {
        //     match id {
        //         Digest::Blake3Digest32(d) => {
        //             if filter.contains(&d) {
        //                 result.remove(&id);
        //             }
        //         }
        //     }
        // }
        //log_debug!("!! result filtered: {:?}", result);
        Ok(Vec::from_iter(visited))
    }
}

#[cfg(test)]
mod test {

    //use fastbloom_rs::{BloomFilter as Filter, FilterBuilder, Membership};

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

    use crate::branch::*;

    use crate::repo::Repo;

    use crate::log::*;
    use crate::utils::*;

    #[test]
    pub fn test_branch() {
        fn add_obj(
            content: ObjectContentV0,
            header: Option<CommitHeader>,
            store_pubkey: &StoreRepo,
            store_secret: &ReadCapSecret,
            store: &Box<impl RepoStore + ?Sized>,
        ) -> ObjectRef {
            let max_object_size = 4000;
            let mut obj = Object::new(
                ObjectContent::V0(content),
                header,
                max_object_size,
                store_pubkey,
                store_secret,
            );
            log_debug!(">>> add_obj");
            log_debug!("     id: {:?}", obj.id());
            log_debug!("     header: {:?}", obj.header());
            obj.save_in_test(store).unwrap();
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
            store_pubkey: &StoreRepo,
            store_secret: &ReadCapSecret,
            store: &Box<impl RepoStore + ?Sized>,
        ) -> ObjectRef {
            let header = CommitHeader::new_with_deps_and_acks(
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
                ObjectContentV0::Commit(Commit::V0(commit)),
                header,
                store_pubkey,
                store_secret,
                store,
            )
        }

        fn add_body_branch(
            branch: BranchV0,
            store_pubkey: &StoreRepo,
            store_secret: &ReadCapSecret,
            store: &Box<impl RepoStore + ?Sized>,
        ) -> ObjectRef {
            let body: CommitBodyV0 = CommitBodyV0::Branch(Branch::V0(branch));
            //log_debug!("body: {:?}", body);
            add_obj(
                ObjectContentV0::CommitBody(CommitBody::V0(body)),
                None,
                store_pubkey,
                store_secret,
                store,
            )
        }

        fn add_body_trans(
            header: Option<CommitHeader>,
            store_pubkey: &StoreRepo,
            store_secret: &ReadCapSecret,
            store: &Box<impl RepoStore + ?Sized>,
        ) -> ObjectRef {
            let content = [7u8; 777].to_vec();
            let body = CommitBodyV0::AsyncTransaction(Transaction::V0(content));
            //log_debug!("body: {:?}", body);
            add_obj(
                ObjectContentV0::CommitBody(CommitBody::V0(body)),
                header,
                store_pubkey,
                store_secret,
                store,
            )
        }

        let hashmap_storage = HashMapRepoStore::new();
        let t = Test::storage(hashmap_storage);

        // repo

        let (repo_privkey, repo_pubkey) = generate_keypair();
        let (store_repo, repo_secret) = StoreRepo::dummy_public_v0();

        // branch

        let (branch_privkey, branch_pubkey) = generate_keypair();

        let (member_privkey, member_pubkey) = generate_keypair();

        let metadata = [66u8; 64].to_vec();

        let repo = Repo::new_with_member(
            &repo_pubkey,
            &member_pubkey,
            &[PermissionV0::WriteAsync],
            t.s(),
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

        let branch_body =
            add_body_branch(branch.clone(), &store_repo, &repo_secret, repo.get_store());

        let trans_body = add_body_trans(None, &store_repo, &repo_secret, repo.get_store());

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
            &store_repo,
            &repo_secret,
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
            &store_repo,
            &repo_secret,
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
            &store_repo,
            &repo_secret,
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
            &store_repo,
            &repo_secret,
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
            &store_repo,
            &repo_secret,
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
            &store_repo,
            &repo_secret,
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
            &store_repo,
            &repo_secret,
            repo.get_store(),
        );

        let c7 = Commit::load(a7.clone(), repo.get_store(), true).unwrap();
        c7.verify(&repo).unwrap();

        // let mut filter = Filter::new(FilterBuilder::new(10, 0.01));
        // for commit_ref in [br, t1, t2, t5.clone(), a6.clone()] {
        //     match commit_ref.id {
        //         ObjectId::Blake3Digest32(d) => filter.add(&d),
        //     }
        // }
        // let cfg = filter.config();
        // let their_commits = BloomFilter {
        //     k: cfg.hashes,
        //     f: filter.get_u8_array().to_vec(),
        // };

        print_branch();
        log_debug!(">> sync_req");
        log_debug!("   our_heads: [a3, t5, a6, a7]");
        log_debug!("   known_heads: [a3, t5]");
        log_debug!("   their_commits: [br, t1, t2, a3, t5, a6]");

        let ids = Branch::sync_req(
            &[t5.id, a6.id, a7.id],
            &[t5.id],
            //&their_commits,
            repo.get_store(),
        )
        .unwrap();

        assert_eq!(ids.len(), 1);
        assert!(ids.contains(&a7.id));
    }
}
