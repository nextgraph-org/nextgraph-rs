// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Branch of a Repository

use std::collections::HashMap;
use std::collections::HashSet;
use std::fmt;

use sbbf_rs_safe::Filter;
use zeroize::Zeroize;

use crate::errors::*;
#[allow(unused_imports)]
use crate::log::*;
use crate::object::*;
use crate::store::Store;
use crate::types::*;
use crate::utils::encrypt_in_place;

impl BranchV0 {
    pub fn new(
        id: PubKey,
        repo: ObjectRef,
        root_branch_readcap_id: ObjectId,
        topic_priv: PrivKey,
        metadata: Vec<u8>,
    ) -> BranchV0 {
        let topic_privkey: Vec<u8> = vec![];
        //TODO: use encrypt_topic_priv_key
        let topic = topic_priv.to_pub();
        BranchV0 {
            id,
            crdt: BranchCrdt::None,
            repo,
            root_branch_readcap_id,
            topic,
            topic_privkey,
            pulled_from: vec![],
            metadata,
        }
    }
}

#[allow(dead_code)]
#[derive(Debug)]
pub struct DagNode {
    pub future: HashSet<ObjectId>,
    pub past: HashSet<ObjectId>,
}

#[allow(dead_code)]
struct Dag<'a>(&'a HashMap<Digest, DagNode>);

impl fmt::Display for DagNode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        for fu in self.future.iter() {
            write!(f, "{} ", fu)?;
        }
        Ok(())
    }
}

impl<'a> fmt::Display for Dag<'a> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        for node in self.0.iter() {
            writeln!(f, "ID: {} FUTURES: {}", node.0, node.1)?;
        }
        Ok(())
    }
}

impl DagNode {
    fn new() -> Self {
        Self {
            future: HashSet::new(),
            past: HashSet::new(),
        }
    }
    fn collapse(
        id: &ObjectId,
        dag: &HashMap<ObjectId, DagNode>,
        dag_ids: &HashSet<ObjectId>,
        already_in: &mut HashSet<ObjectId>,
    ) -> Vec<ObjectId> {
        let this = dag.get(id).unwrap();
        let intersec = this
            .past
            .intersection(dag_ids)
            .cloned()
            .collect::<HashSet<ObjectId>>();
        if intersec.len() > 1 && !intersec.is_subset(already_in) {
            // we postpone it
            // log_debug!("postponed {}", id);
            vec![]
        } else {
            let mut res = vec![*id];
            already_in.insert(*id);
            for child in this.future.iter() {
                // log_debug!("child of {} : {}", id, child);
                res.append(&mut Self::collapse(child, dag, dag_ids, already_in));
            }
            res
        }
    }
}

impl Branch {
    /// topic private key (a BranchWriteCapSecret), encrypted with a key derived as follow
    /// BLAKE3 derive_key ("NextGraph Branch WriteCap Secret BLAKE3 key",
    ///                                        RepoWriteCapSecret, TopicId, BranchId )
    /// so that only editors of the repo can decrypt the privkey
    /// nonce = 0
    fn encrypt_topic_priv_key(
        mut plaintext: Vec<u8>,
        topic_id: TopicId,
        branch_id: BranchId,
        repo_write_cap_secret: &RepoWriteCapSecret,
    ) -> Vec<u8> {
        let repo_write_cap_secret = serde_bare::to_vec(repo_write_cap_secret).unwrap();
        let topic_id = serde_bare::to_vec(&topic_id).unwrap();
        let branch_id = serde_bare::to_vec(&branch_id).unwrap();
        let mut key_material = [repo_write_cap_secret, topic_id, branch_id].concat();
        let mut key: [u8; 32] = blake3::derive_key(
            "NextGraph Branch WriteCap Secret BLAKE3 key",
            key_material.as_slice(),
        );
        encrypt_in_place(&mut plaintext, key, [0; 12]);
        key.zeroize();
        key_material.zeroize();
        plaintext
    }

    pub fn encrypt_branch_write_cap_secret(
        privkey: &BranchWriteCapSecret,
        topic_id: TopicId,
        branch_id: BranchId,
        repo_write_cap_secret: &RepoWriteCapSecret,
    ) -> Vec<u8> {
        let plaintext = serde_bare::to_vec(privkey).unwrap();
        Branch::encrypt_topic_priv_key(plaintext, topic_id, branch_id, repo_write_cap_secret)
    }

    pub fn decrypt_branch_write_cap_secret(
        ciphertext: Vec<u8>,
        topic_id: TopicId,
        branch_id: BranchId,
        repo_write_cap_secret: &RepoWriteCapSecret,
    ) -> Result<BranchWriteCapSecret, NgError> {
        let plaintext =
            Branch::encrypt_topic_priv_key(ciphertext, topic_id, branch_id, repo_write_cap_secret);
        Ok(serde_bare::from_slice(&plaintext)?)
    }

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

    /// Load causal past of a Commit `cobj` in a `Branch` from the `Store`,
    ///
    /// and collect in `visited` the ObjectIds encountered on the way, stopping at any commit already belonging to `theirs` or the root of DAG.
    /// optionally collecting the missing objects/blocks that couldn't be found locally on the way,
    /// and also optionally, collecting the commits of `theirs` found on the way
    pub fn load_causal_past(
        recursor: &mut Vec<(ObjectId, Option<ObjectId>)>,
        store: &Store,
        theirs: &HashSet<ObjectId>,
        visited: &mut HashMap<ObjectId, DagNode>,
        missing: &mut Option<&mut HashSet<ObjectId>>,
        theirs_found: &mut Option<&mut HashSet<ObjectId>>,
        theirs_filter: &Option<Filter>,
    ) -> Result<(), ObjectParseError> {
        while let Some((id, future)) = recursor.pop() {
            match Object::load(id, None, store) {
                Ok(cobj) => {
                    let id = cobj.id();

                    // check if this commit object is present in theirs or has already been visited in the current walk
                    // load deps, stop at the root(including it in visited) or if this is a commit object from known_heads

                    let mut found_in_theirs = theirs.contains(&id);
                    if !found_in_theirs {
                        found_in_theirs = if let Some(filter) = theirs_filter {
                            let hash = id.get_hash();
                            filter.contains_hash(hash)
                        } else {
                            false
                        };
                    }

                    if found_in_theirs {
                        if theirs_found.is_some() {
                            theirs_found.as_mut().unwrap().insert(id);
                        }
                    } else {
                        if let Some(past) = visited.get_mut(&id) {
                            // we update the future
                            if let Some(f) = future {
                                past.future.insert(f);
                            }
                        } else {
                            let mut new_node_to_insert = DagNode::new();
                            if let Some(f) = future {
                                new_node_to_insert.future.insert(f);
                            }
                            let pasts = cobj.acks_and_nacks();
                            new_node_to_insert.past.extend(pasts.iter().cloned());
                            visited.insert(id, new_node_to_insert);
                            recursor.extend(pasts.into_iter().map(|past_id| (past_id, Some(id))));
                            // for past_id in pasts {
                            //     match Object::load(past_id, None, store) {
                            //         Ok(o) => {
                            //             Self::load_causal_past(
                            //                 recursor,
                            //                 store,
                            //                 theirs,
                            //                 visited,
                            //                 missing,
                            //                 theirs_found,
                            //                 theirs_filter,
                            //             )?;
                            //         }
                            //         Err(ObjectParseError::MissingBlocks(blocks)) => {
                            //             missing.as_mut().map(|m| m.extend(blocks));
                            //         }
                            //         Err(e) => return Err(e),
                            //     }
                            // }
                        }
                    }
                }
                Err(ObjectParseError::MissingBlocks(blocks)) => {
                    if future.is_some() {
                        missing.as_mut().map(|m| m.extend(blocks));
                    }
                }
                Err(e) => {
                    if future.is_some() {
                        return Err(e);
                    }
                }
            }
        }
        Ok(())
    }

    /// Branch sync request from another peer
    ///
    /// `target_heads` represents the list of heads the requester would like to reach. this list cannot be empty.
    ///  if the requester doesn't know what to reach, the responder should fill this list with their own current local head.
    ///  this is not done here. it should be done before, in the handling of incoming requests.
    /// `known_heads` represents the list of current heads at the requester replica at the moment of request.
    ///  an empty list means the requester has an empty branch locally
    ///
    /// Return ObjectIds to send, ordered in respect of causal partial order
    pub fn sync_req(
        target_heads: impl Iterator<Item = ObjectId>,
        known_heads: &[ObjectId],
        known_commits: &Option<BloomFilter>,
        store: &Store,
    ) -> Result<Vec<ObjectId>, ObjectParseError> {
        // their commits
        let mut theirs: HashMap<ObjectId, DagNode> = HashMap::new();

        //
        let mut recursor: Vec<(ObjectId, Option<ObjectId>)> =
            known_heads.iter().map(|h| (h.clone(), None)).collect();
        // collect causal past of known_heads
        // we silently discard any load error on the known_heads as the responder might not know them (yet).
        Self::load_causal_past(
            &mut recursor,
            store,
            &HashSet::new(),
            &mut theirs,
            &mut None,
            &mut None,
            &None,
        )?;

        // log_debug!("their causal past \n{}", Dag(&theirs));

        let mut visited = HashMap::new();

        let theirs: HashSet<ObjectId> = theirs.keys().into_iter().cloned().collect();

        let filter = if let Some(filter) = known_commits.as_ref() {
            Some(
                filter.filter(), //.map_err(|_| ObjectParseError::FilterDeserializationError)?,
            )
        } else {
            None
        };

        let mut recursor: Vec<(ObjectId, Option<ObjectId>)> =
            target_heads.map(|h| (h.clone(), None)).collect();
        // collect all commits reachable from target_heads
        // up to the root or until encountering a commit from theirs
        // we silently discard any load error on the target_heads as they can be wrong if the requester is confused about what the responder has locally.
        Self::load_causal_past(
            &mut recursor,
            store,
            &theirs,
            &mut visited,
            &mut None,
            &mut None,
            &filter,
        )?;
        // for id in target_heads {
        //     if let Ok(cobj) = Object::load(id, None, store) {
        //         Self::load_causal_past(
        //             &cobj,
        //             store,
        //             &theirs,
        //             &mut visited,
        //             &mut None,
        //             None,
        //             &mut None,
        //             &filter,
        //         )?;
        //     }

        // }

        // log_debug!("what we have here \n{}", Dag(&visited));

        // now ordering to respect causal partial order.
        let mut next_generations = HashSet::new();
        for (_, node) in visited.iter() {
            for future in node.future.iter() {
                next_generations.insert(future);
            }
        }
        let all = HashSet::from_iter(visited.keys());
        let first_generation = all.difference(&next_generations);

        let mut already_in: HashSet<ObjectId> = HashSet::new();

        let sub_dag_to_send_size = visited.len();
        let mut result = Vec::with_capacity(sub_dag_to_send_size);
        let dag_ids: HashSet<ObjectId> = visited.keys().cloned().collect();
        for first in first_generation {
            result.append(&mut DagNode::collapse(
                first,
                &visited,
                &dag_ids,
                &mut already_in,
            ));
        }
        // log_debug!(
        //     "DAG {} {} {}",
        //     result.len(),
        //     sub_dag_to_send_size,
        //     already_in.len()
        // );
        if result.len() != sub_dag_to_send_size || already_in.len() != sub_dag_to_send_size {
            return Err(ObjectParseError::MalformedDag);
        }

        #[cfg(debug_assertions)]
        for _res in result.iter() {
            log_debug!("sending missing commit {}", _res);
        }

        Ok(result)
    }
}

#[allow(unused_imports)]
#[cfg(test)]
mod test {

    //use use bloomfilter::Bloom;

    use crate::branch::*;

    use crate::repo::Repo;

    use crate::log::*;
    use crate::store::Store;
    use crate::utils::*;

    #[test]
    pub fn test_branch() {
        fn add_obj(
            content: ObjectContentV0,
            header: Option<CommitHeader>,
            store: &Store,
        ) -> ObjectRef {
            let max_object_size = 4000;
            let mut obj = Object::new(ObjectContent::V0(content), header, max_object_size, store);
            obj.save_in_test(store).unwrap();
            obj.reference().unwrap()
        }

        fn add_commit(
            branch: BranchId,
            author_privkey: PrivKey,
            author_pubkey: PubKey,
            deps: Vec<ObjectRef>,
            acks: Vec<ObjectRef>,
            body_ref: ObjectRef,
            store: &Store,
        ) -> ObjectRef {
            let header = CommitHeader::new_with_deps_and_acks(
                deps.iter().map(|r| r.id).collect(),
                acks.iter().map(|r| r.id).collect(),
            );

            let overlay = store.get_store_repo().overlay_id_for_read_purpose();

            let obj_ref = ObjectRef {
                id: ObjectId::Blake3Digest32([1; 32]),
                key: SymKey::ChaCha20Key([2; 32]),
            };
            let refs = vec![obj_ref];
            let metadata = vec![5u8; 55];

            let commit = CommitV0::new(
                &author_privkey,
                &author_pubkey,
                overlay,
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
            add_obj(ObjectContentV0::Commit(Commit::V0(commit)), header, store)
        }

        fn add_body_branch(branch: BranchV0, store: &Store) -> ObjectRef {
            let body: CommitBodyV0 = CommitBodyV0::Branch(Branch::V0(branch));
            //log_debug!("body: {:?}", body);
            add_obj(
                ObjectContentV0::CommitBody(CommitBody::V0(body)),
                None,
                store,
            )
        }

        fn add_body_trans(header: Option<CommitHeader>, content: u8, store: &Store) -> ObjectRef {
            let content = [content; 777].to_vec();
            let body = CommitBodyV0::AsyncTransaction(Transaction::V0(content));
            //log_debug!("body: {:?}", body);
            add_obj(
                ObjectContentV0::CommitBody(CommitBody::V0(body)),
                header,
                store,
            )
        }

        // repo

        let (repo_privkey, repo_pubkey) = generate_keypair();
        let store = Store::dummy_with_key(repo_pubkey);

        // branch

        let (_, branch_pubkey) = generate_keypair();

        let (member_privkey, member_pubkey) = generate_keypair();

        let metadata = [66u8; 64].to_vec();

        let repo = Repo::new_with_member(
            &repo_pubkey,
            &member_pubkey,
            &[PermissionV0::WriteAsync],
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
            log_debug!("    \\  /");
            log_debug!("     t4");
            log_debug!("      |");
            log_debug!("     t5");
            log_debug!("");
        }

        print_branch();

        // commit bodies

        let branch_body = add_body_branch(branch.clone(), &repo.store);

        let trans_body = add_body_trans(None, 8, &repo.store);
        let trans_body2 = add_body_trans(None, 9, &repo.store);

        // create & add commits to store

        let br = add_commit(
            branch_pubkey,
            member_privkey.clone(),
            member_pubkey,
            vec![],
            vec![],
            branch_body.clone(),
            &repo.store,
        );
        log_debug!(">> br {}", br.id);

        let t1 = add_commit(
            branch_pubkey,
            member_privkey.clone(),
            member_pubkey,
            vec![],
            vec![br.clone()],
            trans_body.clone(),
            &repo.store,
        );
        log_debug!(">> t1 {}", t1.id);

        let t2 = add_commit(
            branch_pubkey,
            member_privkey.clone(),
            member_pubkey,
            vec![],
            vec![br.clone()],
            trans_body2.clone(),
            &repo.store,
        );
        log_debug!(">> t2 {}", t2.id);

        let t4 = add_commit(
            branch_pubkey,
            member_privkey.clone(),
            member_pubkey,
            vec![],
            vec![t1.clone(), t2.clone()],
            trans_body.clone(),
            &repo.store,
        );
        log_debug!(">> t4 {}", t4.id);

        let t5 = add_commit(
            branch_pubkey,
            member_privkey.clone(),
            member_pubkey,
            vec![],
            vec![t4.clone()],
            trans_body.clone(),
            &repo.store,
        );
        log_debug!(">> t5 {}", t5.id);

        let c5 = Commit::load(t5.clone(), &repo.store, true).unwrap();
        c5.verify(&repo).unwrap();

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

        let ids = Branch::sync_req([t5.id].into_iter(), &[t1.id], &None, &repo.store).unwrap();

        assert_eq!(ids.len(), 3);
        assert_eq!(ids, [t2.id, t4.id, t5.id]);
    }
}
