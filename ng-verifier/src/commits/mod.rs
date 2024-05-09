// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Verifiers for each Commit type

use crate::types::*;
use crate::verifier::Verifier;
use ng_repo::errors::VerifierError;
use ng_repo::log::*;
use ng_repo::object::Object;
use ng_repo::repo::{BranchInfo, Repo};
use ng_repo::store::Store;
use ng_repo::types::*;
use std::collections::HashMap;
use std::sync::Arc;

#[async_trait::async_trait]
pub trait CommitVerifier {
    async fn verify(
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

#[async_trait::async_trait]
impl CommitVerifier for RootBranch {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for Branch {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for SyncSignature {
    async fn verify(
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
                    verifier
                        .verify_commit(&commit, branch_id, repo_id, Arc::clone(&store))
                        .await?;
                }
            }
        }
        Ok(())
    }
}
#[async_trait::async_trait]
impl CommitVerifier for AddBranch {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for Repository {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for StoreUpdate {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for AddSignerCap {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for AddMember {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for RemoveMember {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for AddPermission {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for RemovePermission {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for RemoveBranch {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for AddName {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for RemoveName {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for () {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for Snapshot {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for AddFile {
    async fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        let files = commit.files();

        if files.len() == 1 {
            let refe = commit.files().remove(0);
            let filename = FileName {
                heads: vec![], //TODO: put the current heads
                name: self.name().clone(),
                nuri: refe.nuri(),
                reference: refe,
            };
            verifier.user_storage.as_ref().unwrap().branch_add_file(
                commit.id().unwrap(),
                *branch_id,
                filename.clone(),
            )?;
            verifier
                .push_app_response(branch_id, AppResponse::V0(AppResponseV0::File(filename)))
                .await;
            Ok(())
        } else {
            Err(VerifierError::InvalidCommit)
        }
    }
}
#[async_trait::async_trait]
impl CommitVerifier for RemoveFile {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for Compact {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for AsyncSignature {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for RootCapRefresh {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for BranchCapRefresh {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for AddRepo {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for RemoveRepo {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for AddLink {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for RemoveLink {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for RemoveSignerCap {
    async fn verify(
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
#[async_trait::async_trait]
impl CommitVerifier for WalletUpdate {
    async fn verify(
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
