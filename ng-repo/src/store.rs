/*
 * Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
*/

//! Store of a Site, or of a Group or Dialog

use core::fmt;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use crate::block_storage::BlockStorage;
use crate::errors::{NgError, StorageError};
use crate::object::Object;
use crate::repo::{BranchInfo, Repo};
use crate::types::*;
use crate::utils::{generate_keypair, sign, verify};

use crate::log::*;

use rand::prelude::*;
use threshold_crypto::{SecretKeySet, SecretKeyShare};

pub struct Store {
    store_repo: StoreRepo,
    store_readcap: ReadCap,
    store_overlay_branch_readcap: ReadCap,
    overlay_id: OverlayId,
    storage: Arc<RwLock<dyn BlockStorage + Send + Sync>>,
}

impl fmt::Debug for Store {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "Store.\nstore_repo {:?}", self.store_repo)?;
        writeln!(f, "store_readcap {:?}", self.store_readcap)?;
        writeln!(
            f,
            "store_overlay_branch_readcap {:?}",
            self.store_overlay_branch_readcap
        )?;
        writeln!(f, "overlay_id {:?}", self.overlay_id)
    }
}

impl Store {
    pub fn set_read_caps(&mut self, read_cap: ReadCap, overlay_read_cap: Option<ReadCap>) {
        self.store_readcap = read_cap;
        if let Some(overlay_read_cap) = overlay_read_cap {
            self.store_overlay_branch_readcap = overlay_read_cap;
        }
    }

    pub fn get_store_repo(&self) -> &StoreRepo {
        &self.store_repo
    }

    pub fn get_store_readcap(&self) -> &ReadCap {
        &self.store_readcap
    }

    pub fn get_store_overlay_branch_readcap_secret(&self) -> &ReadCapSecret {
        &self.store_overlay_branch_readcap.key
    }

    pub fn get_store_readcap_secret(&self) -> &ReadCapSecret {
        &self.store_readcap.key
    }

    /// Load a block from the storage.
    pub fn get(&self, id: &BlockId) -> Result<Block, StorageError> {
        self.storage
            .read()
            .map_err(|_| StorageError::BackendError)?
            .get(&self.overlay_id, id)
    }

    /// Save a block to the storage.
    pub fn put(&self, block: &Block) -> Result<BlockId, StorageError> {
        self.storage
            .write()
            .map_err(|_| StorageError::BackendError)?
            .put(&self.overlay_id, block)
    }

    /// Delete a block from the storage.
    pub fn del(&self, id: &BlockId) -> Result<usize, StorageError> {
        self.storage
            .write()
            .map_err(|_| StorageError::BackendError)?
            .del(&self.overlay_id, id)
    }

    /// number of Blocks in the storage
    pub fn len(&self) -> Result<usize, StorageError> {
        self.storage
            .read()
            .map_err(|_| StorageError::BackendError)?
            .len()
    }

    pub fn create_repo_default(
        self: Arc<Self>,
        creator: &UserId,
        creator_priv_key: &PrivKey,
        repo_write_cap_secret: SymKey,
    ) -> Result<(Repo, Vec<(Commit, Vec<Digest>)>), NgError> {
        let mut events = Vec::with_capacity(6);

        // creating the Repository commit

        let (repo_priv_key, repo_pub_key) = generate_keypair();

        let repository = Repository::V0(RepositoryV0 {
            id: repo_pub_key,
            verification_program: vec![],
            creator: None,
            metadata: vec![],
        });

        let repository_commit_body = CommitBody::V0(CommitBodyV0::Repository(repository.clone()));

        let repository_commit = Commit::new_with_body_acks_deps_and_save(
            &repo_priv_key,
            &repo_pub_key,
            repo_pub_key,
            QuorumType::NoSigning,
            vec![],
            vec![],
            repository_commit_body,
            &self,
        )?;

        log_debug!("REPOSITORY COMMIT {}", repository_commit);

        let repository_commit_ref = repository_commit.reference().unwrap();

        let (topic_priv_key, topic_pub_key) = generate_keypair();

        // creating the RootBranch commit, acks to Repository commit

        let root_branch_commit_body =
            CommitBody::V0(CommitBodyV0::RootBranch(RootBranch::V0(RootBranchV0 {
                id: repo_pub_key,
                repo: repository_commit_ref.clone(),
                store: (&self.store_repo).into(),
                store_sig: None, //TODO: the store signature
                topic: topic_pub_key,
                topic_privkey: Branch::encrypt_topic_priv_key(
                    &topic_priv_key,
                    topic_pub_key,
                    repo_pub_key,
                    &repo_write_cap_secret,
                ),
                inherit_perms_users_and_quorum_from_store: None,
                quorum: None,
                reconciliation_interval: RelTime::None,
                owners: vec![creator.clone()],
                metadata: vec![],
            })));

        let root_branch_commit = Commit::new_with_body_acks_deps_and_save(
            &repo_priv_key,
            &repo_pub_key,
            repo_pub_key,
            QuorumType::NoSigning,
            vec![],
            vec![repository_commit_ref.clone()],
            root_branch_commit_body,
            &self,
        )?;

        log_debug!("ROOT_BRANCH COMMIT {}", root_branch_commit);
        let root_branch_readcap = root_branch_commit.reference().unwrap();
        let root_branch_readcap_id = root_branch_readcap.id;
        // adding the 2 events for the Repository and Rootbranch commits

        events.push((repository_commit, vec![]));

        events.push((root_branch_commit, vec![]));

        // creating the main branch

        let (main_branch_priv_key, main_branch_pub_key) = generate_keypair();

        let (main_branch_topic_priv_key, main_branch_topic_pub_key) = generate_keypair();

        let main_branch_commit_body = CommitBody::V0(CommitBodyV0::Branch(Branch::V0(BranchV0 {
            id: main_branch_pub_key,
            content_type: BranchContentType::None,
            repo: repository_commit_ref.clone(),
            root_branch_readcap_id,
            topic: main_branch_topic_pub_key,
            topic_privkey: Branch::encrypt_topic_priv_key(
                &main_branch_topic_priv_key,
                main_branch_topic_pub_key,
                main_branch_pub_key,
                &repo_write_cap_secret,
            ),
            metadata: vec![],
        })));

        let main_branch_commit = Commit::new_with_body_acks_deps_and_save(
            &main_branch_priv_key,
            &main_branch_pub_key,
            main_branch_pub_key,
            QuorumType::NoSigning,
            vec![],
            vec![],
            main_branch_commit_body,
            &self,
        )?;
        let branch_read_cap = main_branch_commit.reference().unwrap();
        let branch_read_cap_id = branch_read_cap.id;

        log_debug!("MAIN BRANCH COMMIT {}", main_branch_commit);

        // adding the event for the Branch commit

        events.push((main_branch_commit, vec![]));

        // creating the AddBranch commit (on root_branch), deps to the RootBranch commit
        // author is the owner

        let add_branch_commit_body =
            CommitBody::V0(CommitBodyV0::AddBranch(AddBranch::V0(AddBranchV0 {
                branch_type: BranchType::Main,
                topic_id: main_branch_topic_pub_key,
                branch_read_cap: branch_read_cap.clone(),
            })));

        let add_branch_commit = Commit::new_with_body_acks_deps_and_save(
            creator_priv_key,
            creator,
            repo_pub_key,
            QuorumType::Owners,
            vec![root_branch_readcap.clone()],
            vec![],
            add_branch_commit_body,
            &self,
        )?;

        log_debug!("ADD_BRANCH COMMIT {}", add_branch_commit);

        // TODO: optional AddMember and AddPermission, that should be added as deps to the SynSignature below (and to the commits of the SignatureContent)
        // using the creator as author (and incrementing their peer's seq_num)

        // preparing the threshold keys for the unique owner
        let mut rng = rand::thread_rng();
        let sk_set = SecretKeySet::random(0, &mut rng);
        let pk_set = sk_set.public_keys();

        let sk_share = sk_set.secret_key_share(0);

        // creating signature for RootBranch, AddBranch and Branch commits
        // signed with owner threshold signature (threshold = 0)

        let signature_content = SignatureContent::V0(SignatureContentV0 {
            commits: vec![
                root_branch_readcap_id,
                add_branch_commit.id().unwrap(),
                branch_read_cap_id,
            ],
        });

        let signature_content_ser = serde_bare::to_vec(&signature_content).unwrap();
        let sig_share = sk_share.sign(signature_content_ser);
        let sig = pk_set
            .combine_signatures([(0, &sig_share)])
            .map_err(|_| NgError::IncompleteSignature)?;

        let threshold_sig = ThresholdSignatureV0::Owners((sig));

        // creating root certificate of the repo

        let cert_content = CertificateContentV0 {
            previous: repository_commit_ref,
            readcap_id: root_branch_readcap_id,
            owners_pk_set: pk_set.public_key(),
            orders_pk_sets: OrdersPublicKeySetsV0::None,
        };

        // signing the root certificate
        let cert_content_ser = serde_bare::to_vec(&cert_content).unwrap();
        let sig = sign(&repo_priv_key, &repo_pub_key, &cert_content_ser)?;
        let cert_sig = CertificateSignatureV0::Repo(sig);

        let cert = Certificate::V0(CertificateV0 {
            content: cert_content,
            sig: cert_sig,
        });
        // saving the certificate
        let cert_object = Object::new(
            ObjectContent::V0(ObjectContentV0::Certificate(cert)),
            None,
            0,
            &self,
        );
        let mut cert_obj_blocks = cert_object.save(&self)?;

        // finally getting the signature:

        let signature = Signature::V0(SignatureV0 {
            content: signature_content,
            threshold_sig,
            certificate_ref: cert_object.reference().unwrap(),
        });

        // saving the signature
        let sig_object = Object::new(
            ObjectContent::V0(ObjectContentV0::Signature(signature)),
            None,
            0,
            &self,
        );
        let mut sig_obj_blocks = sig_object.save(&self)?;

        // keeping the Secret Key Share of the owner
        let signer_cap = SignerCap {
            repo: repo_pub_key,
            epoch: root_branch_readcap_id,
            owner: Some(threshold_crypto::serde_impl::SerdeSecret(sk_share)),
            total_order: None,
            partial_order: None,
        };

        let sync_signature = SyncSignature::V0(sig_object.reference().unwrap());

        // creating the SyncSignature for the root_branch with deps to the AddBranch and acks to the RootBranch commit as it is its direct causal future.
        let sync_sig_commit_body = CommitBody::V0(CommitBodyV0::SyncSignature(sync_signature));

        let sync_sig_on_root_branch_commit = Commit::new_with_body_acks_deps_and_save(
            creator_priv_key,
            creator,
            repo_pub_key,
            QuorumType::IamTheSignature,
            vec![add_branch_commit.reference().unwrap()],
            vec![root_branch_readcap.clone()],
            sync_sig_commit_body.clone(),
            &self,
        )?;

        // adding the event for the sync_sig_on_root_branch_commit

        let mut additional_blocks = Vec::with_capacity(
            cert_obj_blocks.len() + sig_obj_blocks.len() + add_branch_commit.blocks().len(),
        );
        additional_blocks.extend(cert_obj_blocks.iter());
        additional_blocks.extend(sig_obj_blocks.iter());
        additional_blocks.extend(add_branch_commit.blocks().iter());

        events.push((sync_sig_on_root_branch_commit, additional_blocks));

        // creating the SyncSignature for the main branch with deps to the Branch commit and acks also to this commit as it is its direct causal future.

        let sync_sig_on_main_branch_commit = Commit::new_with_body_acks_deps_and_save(
            creator_priv_key,
            creator,
            main_branch_pub_key,
            QuorumType::IamTheSignature,
            vec![branch_read_cap.clone()],
            vec![branch_read_cap.clone()],
            sync_sig_commit_body,
            &self,
        )?;

        // adding the event for the sync_sig_on_main_branch_commit

        let mut additional_blocks =
            Vec::with_capacity(cert_obj_blocks.len() + sig_obj_blocks.len());
        additional_blocks.append(&mut cert_obj_blocks);
        additional_blocks.append(&mut sig_obj_blocks);

        events.push((sync_sig_on_main_branch_commit, additional_blocks));

        // TODO: add the CertificateRefresh event on main branch

        // preparing the Repo

        let root_branch = BranchInfo {
            id: repo_pub_key.clone(),
            branch_type: BranchType::Root,
            topic: topic_pub_key,
            topic_priv_key: topic_priv_key,
            read_cap: root_branch_readcap.clone(),
        };

        let main_branch = BranchInfo {
            id: main_branch_pub_key.clone(),
            branch_type: BranchType::Main,
            topic: main_branch_topic_pub_key,
            topic_priv_key: main_branch_topic_priv_key,
            read_cap: branch_read_cap,
        };

        let repo = Repo {
            id: repo_pub_key,
            repo_def: repository,
            signer: Some(signer_cap),
            members: HashMap::new(),
            store: Arc::clone(&self),
            read_cap: Some(root_branch_readcap),
            write_cap: Some(repo_write_cap_secret),
            branches: HashMap::from([
                (repo_pub_key, root_branch),
                (main_branch_pub_key, main_branch),
            ]),
        };

        Ok((repo, events))
    }

    pub fn new(
        store_repo: StoreRepo,
        store_readcap: ReadCap,
        store_overlay_branch_readcap: ReadCap,
        storage: Arc<RwLock<dyn BlockStorage + Send + Sync>>,
    ) -> Self {
        Self {
            store_repo,
            store_readcap,
            overlay_id: store_repo.overlay_id_for_storage_purpose(),
            storage,
            store_overlay_branch_readcap,
        }
    }

    #[allow(deprecated)]
    #[cfg(any(test, feature = "testing"))]
    pub fn dummy_public_v0() -> Arc<Self> {
        use crate::block_storage::HashMapBlockStorage;
        let store_repo = StoreRepo::dummy_public_v0();
        let store_readcap = ReadCap::dummy();
        let store_overlay_branch_readcap = ReadCap::dummy();
        Arc::new(Self::new(
            store_repo,
            store_readcap,
            store_overlay_branch_readcap,
            Arc::new(RwLock::new(HashMapBlockStorage::new()))
                as Arc<RwLock<dyn BlockStorage + Send + Sync>>,
        ))
    }

    #[cfg(any(test, feature = "testing"))]
    pub fn dummy_with_key(repo_pubkey: PubKey) -> Arc<Self> {
        use crate::block_storage::HashMapBlockStorage;
        let store_repo = StoreRepo::dummy_with_key(repo_pubkey);
        let store_readcap = ReadCap::dummy();
        let store_overlay_branch_readcap = ReadCap::dummy();
        Arc::new(Self::new(
            store_repo,
            store_readcap,
            store_overlay_branch_readcap,
            Arc::new(RwLock::new(HashMapBlockStorage::new()))
                as Arc<RwLock<dyn BlockStorage + Send + Sync>>,
        ))
    }
}
