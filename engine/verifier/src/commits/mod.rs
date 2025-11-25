// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Verifiers for each Commit type

pub mod transaction;

pub mod snapshot;

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use ng_net::broker::BROKER;
use ng_repo::errors::VerifierError;
#[allow(unused_imports)]
use ng_repo::log::*;
use ng_repo::object::Object;
use ng_repo::repo::{BranchInfo, CommitInfo, Repo};
use ng_repo::store::Store;
use ng_repo::types::*;

use ng_net::app_protocol::*;

use crate::verifier::Verifier;

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

pub(crate) fn list_dep_chain_until(
    start: ObjectRef,
    end: &ObjectId,
    store: &Store,
    with_body: bool,
) -> Result<Vec<Commit>, VerifierError> {
    let mut res = vec![];
    let mut pos = start;
    loop {
        let pos_id = pos.id.clone();
        if pos_id == *end {
            break;
        }
        let commit = Commit::load(pos, &store, with_body)?;
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
        _branch_id: &BranchId,
        _repo_id: &RepoId,
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
                let user_id = verifier.user_id();
                let repo_write_cap_secret = if store.id() == &root_branch.id && store.is_private() {
                    Some(SymKey::nil())
                } else if let Some(pos) = root_branch.owners.iter().position(|o| o == user_id) {
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
                    topic: Some(root_branch.topic),
                    topic_priv_key,
                    read_cap: Some(reference.clone()),
                    fork_of: None,
                    crdt: BranchCrdt::None,
                    merged_in: None,
                    current_heads: vec![reference.clone()],
                    commits_nbr: 1,
                };
                let id = root_branch.id;
                let branches = vec![(root_branch.id, root_branch)];
                let signer = verifier
                    .user_storage()
                    .and_then(|storage| storage.get_signer_cap(&id).ok());
                let inbox = verifier
                    .user_storage()
                    .and_then(|storage| storage.get_inbox_cap(&id).ok());
                let repo = Repo {
                    id,
                    repo_def: repository.clone(),
                    signer,
                    inbox,
                    members: HashMap::new(),
                    store: Arc::clone(&store),
                    read_cap: Some(reference),
                    write_cap: repo_write_cap_secret,
                    branches: branches.into_iter().collect(),
                    opened_branches: HashMap::new(),
                    certificate_ref: verifier.temporary_repo_certificates.remove(&id),
                };
                verifier.populate_topics(&repo);
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
        _branch_id: &BranchId,
        _repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        match self {
            Branch::V0(branch) => {
                //TODO: deal with root_branch_readcap_id (the epoch)

                //TODO: deal with quorum_type (verify signature)

                let repository_commit: Commit = Commit::load(branch.repo.clone(), &store, true)?;

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
                if branch_info.read_cap.as_ref().unwrap() != &reference {
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
                        verifier.update_repo_certificate(repo_id, sig.certificate_ref());
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
                let commits = list_dep_chain_until(deps[0].clone(), &ack.id, &store, true)?;
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
        _branch_id: &BranchId,
        _repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        match self {
            AddBranch::V0(v0) => {
                if v0.branch_type == BranchType::Root {
                    return Err(VerifierError::InvalidBranch);
                }

                // TODO fetch the readcap and verify that crdt and other infos in Branch definition are the same as in AddBranch commit
                let branch_info = BranchInfo {
                    id: v0.branch_id,
                    branch_type: v0.branch_type.clone(),
                    topic: v0.topic_id,
                    topic_priv_key: None,
                    read_cap: v0.branch_read_cap.clone(),
                    fork_of: v0.fork_of,
                    merged_in: v0.merged_in,
                    crdt: v0.crdt.clone(),
                    current_heads: vec![],
                    commits_nbr: 0,
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
        _commit: &Commit,
        _verifier: &mut Verifier,
        _branch_id: &BranchId,
        _repo_id: &RepoId,
        _store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        // left empty intentionally
        Ok(())
    }
}
#[async_trait::async_trait]
impl CommitVerifier for StoreUpdate {
    async fn verify(
        &self,
        _commit: &Commit,
        verifier: &mut Verifier,
        _branch_id: &BranchId,
        _repo_id: &RepoId,
        _store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        verifier.new_store_from_update(self)
    }
}
#[async_trait::async_trait]
impl CommitVerifier for AddInboxCap {
    async fn verify(
        &self,
        _commit: &Commit,
        verifier: &mut Verifier,
        _branch_id: &BranchId,
        _repo_id: &RepoId,
        _store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        match self {
            AddInboxCap::V0(v0) => verifier.update_inbox_cap_v0(&v0),
        }
    }
}
#[async_trait::async_trait]
impl CommitVerifier for AddSignerCap {
    async fn verify(
        &self,
        _commit: &Commit,
        verifier: &mut Verifier,
        _branch_id: &BranchId,
        _repo_id: &RepoId,
        _store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        match self {
            AddSignerCap::V0(v0) => verifier.update_signer_cap(&v0.cap),
        }
    }
}
#[async_trait::async_trait]
impl CommitVerifier for AddMember {
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
    async fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        let repo = verifier.get_repo(repo_id, store.get_store_repo())?;
        verifier
            .push_app_response(
                branch_id,
                AppResponse::V0(AppResponseV0::Patch(AppPatch {
                    commit_id: commit.id().unwrap().to_string(),
                    commit_info: (&commit.as_info(repo)).into(),
                    graph: None,
                    discrete: None,
                    other: Some(OtherPatch::Snapshot(self.snapshot_ref().clone())),
                })),
            )
            .await;
        Ok(())
    }
}
#[async_trait::async_trait]
impl CommitVerifier for AddFile {
    #[allow(unused_variables)]
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
                name: self.name().clone(),
                nuri: NuriV0::object_ref(&refe),
                reference: refe,
            };
            let commit_id = commit.id().unwrap();
            verifier.user_storage.as_ref().unwrap().branch_add_file(
                commit_id.clone(),
                *branch_id,
                filename.clone(),
            )?;
            let store_repo = store.get_store_repo();
            let repo = verifier.get_repo(repo_id, store_repo)?;
            let branch = repo.branch(branch_id)?;
            let topic = branch.topic.clone().unwrap();
            let overlay_id = store_repo.overlay_id_for_storage_purpose();
            let previous_heads =
                HashSet::from_iter(branch.current_heads.iter().map(|br| br.id.clone()));
            verifier
                .push_app_response(
                    branch_id,
                    AppResponse::V0(AppResponseV0::Patch(AppPatch {
                        commit_id: commit_id.to_string(),
                        commit_info: (&commit.as_info(repo)).into(),
                        graph: None,
                        discrete: None,
                        other: Some(OtherPatch::FileAdd(filename)),
                    })),
                )
                .await;
            verifier.advance_head_without_graph(&topic, &overlay_id, &commit_id, previous_heads)?;
            Ok(())
        } else {
            Err(VerifierError::InvalidCommit)
        }
    }
}
#[async_trait::async_trait]
impl CommitVerifier for RemoveFile {
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
    async fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        match self {
            AsyncSignature::V0(signature_ref) => {
                let sign = Object::load_ref(signature_ref, &store)?;
                let deps: Vec<BlockRef> = commit.deps();
                match sign.content_v0()? {
                    ObjectContentV0::Signature(sig) => {
                        //TODO: verify signature (each deps should be in the sig.signed_commits())

                        // pushing AppResponse
                        let repo = verifier.get_repo(repo_id, store.get_store_repo())?;
                        verifier
                            .push_app_response(
                                branch_id,
                                AppResponse::V0(AppResponseV0::Patch(AppPatch {
                                    commit_id: commit.id().unwrap().to_string(),
                                    commit_info: (&commit.as_info(repo)).into(),
                                    graph: None,
                                    discrete: None,
                                    other: Some(OtherPatch::AsyncSignature((
                                        NuriV0::signature_ref(&signature_ref),
                                        sig.signed_commits()
                                            .iter()
                                            .map(|c| c.to_string())
                                            .collect(),
                                    ))),
                                })),
                            )
                            .await;

                        Ok(())
                    }
                    _ => return Err(VerifierError::InvalidSignatureObject),
                }
            }
        }
    }
}
#[async_trait::async_trait]
impl CommitVerifier for RootCapRefresh {
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
    async fn verify(
        &self,
        commit: &Commit,
        verifier: &mut Verifier,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        let broker = BROKER.read().await;
        let remote = (&verifier.connected_broker).into();
        let user = Some(verifier.user_id().clone());
        let read_cap = self.read_cap();
        let overlay_id = store.overlay_id;
        verifier
            .load_repo_from_read_cap(read_cap, &broker, &user, &remote, store, true)
            .await?;
        verifier.add_doc(repo_id, &overlay_id)?;
        Ok(())
    }
}
#[async_trait::async_trait]
impl CommitVerifier for RemoveRepo {
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
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
    #[allow(unused_variables)]
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
