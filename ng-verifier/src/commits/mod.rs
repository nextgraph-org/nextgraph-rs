// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Verifiers for each Commit type

use crate::verifier::Verifier;
use ng_repo::errors::VerifierError;
use ng_repo::log::*;
use ng_repo::object::Object;
use ng_repo::repo::{BranchInfo, Repo};
use ng_repo::store::Store;
use ng_repo::types::*;
use std::collections::HashMap;
use std::sync::Arc;

pub trait CommitVerifier {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError>;
}

fn list_dep_chain_until(
    start: ObjectRef,
    end: &ObjectId,
    store: &Store,
) -> Result<Vec<Commit>, VerifierError> {
    let mut res = vec![];
    let mut pos = start;
    loop {
        let pos_id = pos.id.clone();
        if pos_id == *end {
            break;
        }
        let commit = Commit::load(pos, &store, true)?;
        let deps = commit.deps();
        if deps.len() != 1 {
            return Err(VerifierError::MalformedSyncSignatureDeps);
        }
        res.push(commit);
        pos = deps[0].clone();
    }
    res.reverse();

    Ok(res)
}

impl CommitVerifier for RootBranch {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        match self {
            RootBranch::V0(root_branch) => {
                let repository_commit = Commit::load(root_branch.repo.clone(), &store, true)?;
                let repository = match repository_commit
                    .body()
                    .ok_or(VerifierError::CommitBodyNotFound)?
                {
                    CommitBody::V0(CommitBodyV0::Repository(r)) => r,
                    _ => return Err(VerifierError::InvalidRepositoryCommit),
                };
                //TODO: deal with quorum_type (verify signature)

                let user_priv = verifier.user_privkey();
                let user_id = user_priv.to_pub();
                let repo_write_cap_secret = if store.is_private() {
                    Some(SymKey::nil())
                } else if let Some(pos) = root_branch.owners.iter().position(|&o| o == user_id) {
                    let cryptobox = &root_branch.owners_write_cap[pos];
                    Some(RootBranch::decrypt_write_cap(user_priv, cryptobox)?)
                } else {
                    None
                };
                let topic_priv_key = if let Some(rwcs) = repo_write_cap_secret.as_ref() {
                    Branch::decrypt_branch_write_cap_secret(
                        root_branch.topic_privkey.clone(),
                        root_branch.topic.clone(),
                        root_branch.id.clone(),
                        rwcs,
                    )
                    .map_or(None, |k| Some(k))
                } else {
                    None
                };
                let reference = commit.reference().unwrap();
                let root_branch = BranchInfo {
                    id: root_branch.id.clone(),
                    branch_type: BranchType::Root,
                    topic: root_branch.topic,
                    topic_priv_key,
                    read_cap: reference.clone(),
                    current_heads: vec![reference.clone()],
                };
                let id = root_branch.id;
                let branches = vec![(root_branch.id, root_branch)];
                let repo = Repo {
                    id,
                    repo_def: repository.clone(),
                    signer: None, //TO BE ADDED LATER when AddSignerCap commit is found
                    members: HashMap::new(),
                    store: Arc::clone(&store),
                    read_cap: Some(reference),
                    write_cap: repo_write_cap_secret,
                    branches: branches.into_iter().collect(),
                    opened_branches: HashMap::new(),
                };
                let _repo_ref = verifier.add_repo_and_save(repo);
            }
        }

        Ok(())
    }
}

impl CommitVerifier for Branch {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        match self {
            Branch::V0(branch) => {
                //TODO: deal with root_branch_readcap_id (the epoch)

                //TODO: deal with quorum_type (verify signature)

                let repository_commit = Commit::load(branch.repo.clone(), &store, true)?;

                let repository = match repository_commit
                    .body()
                    .ok_or(VerifierError::CommitBodyNotFound)?
                {
                    CommitBody::V0(CommitBodyV0::Repository(r)) => r,
                    _ => return Err(VerifierError::InvalidRepositoryCommit),
                };

                // check that the repository exists
                let repo = verifier.get_repo_mut(repository.id(), store.get_store_repo())?;

                let topic_priv_key = if let Some(rwcs) = repo.write_cap.as_ref() {
                    Branch::decrypt_branch_write_cap_secret(
                        branch.topic_privkey.clone(),
                        branch.topic.clone(),
                        branch.id.clone(),
                        rwcs,
                    )
                    .map_or(None, |k| Some(k))
                } else {
                    None
                };
                let reference = commit.reference().unwrap();

                let branch_info = repo.branch_mut(&branch.id)?;
                if branch_info.read_cap != reference {
                    return Err(VerifierError::InvalidBranch);
                }
                branch_info.topic_priv_key = topic_priv_key;
                branch_info.current_heads = vec![reference];

                verifier.update_branch(&repository.id(), &branch.id, store.get_store_repo())?;
                Ok(())
            }
        }
    }
}

impl CommitVerifier for SyncSignature {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        match self {
            SyncSignature::V0(signature_ref) => {
                let sign = Object::load_ref(signature_ref, &store)?;
                match sign.content_v0()? {
                    ObjectContentV0::Signature(sig) => {
                        //TODO: verify signature
                    }
                    _ => return Err(VerifierError::InvalidSignatureObject),
                }
                // process each deps
                let acks = commit.acks();
                if acks.len() != 1 {
                    return Err(VerifierError::MalformedSyncSignatureAcks);
                }
                let ack = &acks[0];
                let deps = commit.deps();
                if deps.len() != 1 {
                    return Err(VerifierError::MalformedSyncSignatureDeps);
                }
                let commits = list_dep_chain_until(deps[0].clone(), &ack.id, &store)?;
                for commit in commits {
                    verifier.verify_commit(commit, branch_id, repo_id, Arc::clone(&store))?;
                }
            }
        }
        Ok(())
    }
}

impl CommitVerifier for AddBranch {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        match self {
            AddBranch::V0(v0) => {
                if v0.branch_type == BranchType::Root {
                    return Err(VerifierError::InvalidBranch);
                }
                // let _ = verifier.topics.insert(
                //     (store.inner_overlay(), v0.topic_id),
                //     (*commit.branch(), v0.branch_id),
                // );

                let branch_info = BranchInfo {
                    id: v0.branch_id,
                    branch_type: v0.branch_type.clone(),
                    topic: v0.topic_id,
                    topic_priv_key: None,
                    read_cap: v0.branch_read_cap.clone(),
                    current_heads: vec![],
                };

                verifier.add_branch_and_save(
                    commit.branch(),
                    branch_info,
                    store.get_store_repo(),
                )?;
            }
        }
        Ok(())
    }
}

impl CommitVerifier for Repository {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        // left empty intentionally
        Ok(())
    }
}

impl CommitVerifier for StoreUpdate {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        verifier.new_store_from_update(self)
    }
}

impl CommitVerifier for AddSignerCap {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        match self {
            AddSignerCap::V0(v0) => verifier.update_signer_cap(&v0.cap),
        }
    }
}

impl CommitVerifier for AddMember {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for RemoveMember {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for AddPermission {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for RemovePermission {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for RemoveBranch {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for AddName {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for RemoveName {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for () {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for Snapshot {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for AddFile {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for RemoveFile {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for Compact {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for AsyncSignature {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for RootCapRefresh {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for BranchCapRefresh {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for AddRepo {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for RemoveRepo {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for AddLink {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for RemoveLink {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for RemoveSignerCap {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}

impl CommitVerifier for WalletUpdate {
    fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        Ok(())
    }
}
