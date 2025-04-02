/*
 * Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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

use ng_threshold_crypto::SecretKeySet;

use crate::block_storage::{BlockStorage, HashMapBlockStorage};
use crate::errors::{NgError, StorageError};
#[allow(unused_imports)]
use crate::log::*;
use crate::object::Object;
use crate::repo::{BranchInfo, Repo};
use crate::types::*;
use crate::utils::{generate_keypair, sign};

pub struct Store {
    //TODO: store_repo, store_readcap and store_overlay_branch_readcap could be empty, if we have only an outer access to the store. should be Options
    store_repo: StoreRepo,
    store_readcap: ReadCap,
    store_overlay_branch_readcap: ReadCap,
    pub overlay_id: OverlayId,
    storage: Arc<RwLock<dyn BlockStorage + Send + Sync>>,
}

impl From<&Store> for StoreUpdate {
    fn from(s: &Store) -> StoreUpdate {
        StoreUpdate::V0(StoreUpdateV0 {
            store: s.store_repo,
            store_read_cap: s.store_readcap.clone(),
            overlay_branch_read_cap: s.store_overlay_branch_readcap.clone(),
            metadata: vec![],
        })
    }
}

impl fmt::Debug for Store {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Store:\nstore_repo {}", self.store_repo)?;
        writeln!(f, "store_readcap {}", self.store_readcap)?;
        writeln!(
            f,
            "store_overlay_branch_readcap {}",
            self.store_overlay_branch_readcap
        )?;
        writeln!(f, "overlay_id {}", self.overlay_id)
    }
}

impl Store {
    pub fn new_temp_in_mem() -> Self {
        Store {
            store_repo: StoreRepo::nil(),
            store_readcap: ReadCap::nil(),
            store_overlay_branch_readcap: ReadCap::nil(),
            overlay_id: OverlayId::nil(),
            storage: Arc::new(RwLock::new(HashMapBlockStorage::new())),
        }
    }

    pub fn new_from_overlay_id(
        overlay: &OverlayId,
        storage: Arc<RwLock<dyn BlockStorage + Send + Sync>>,
    ) -> Store {
        Store {
            store_repo: StoreRepo::nil(),
            store_readcap: ReadCap::nil(),
            store_overlay_branch_readcap: ReadCap::nil(),
            overlay_id: overlay.clone(),
            storage,
        }
    }

    pub fn new_from(
        update: &StoreUpdate,
        storage: Arc<RwLock<dyn BlockStorage + Send + Sync>>,
    ) -> Store {
        match update {
            StoreUpdate::V0(v0) => Store::new(
                v0.store,
                v0.store_read_cap.clone(),
                v0.overlay_branch_read_cap.clone(),
                storage,
            ),
        }
    }
    pub fn id(&self) -> &PubKey {
        self.store_repo.repo_id()
    }
    pub fn set_read_caps(&mut self, read_cap: ReadCap, overlay_read_cap: Option<ReadCap>) {
        self.store_readcap = read_cap;
        if let Some(overlay_read_cap) = overlay_read_cap {
            self.store_overlay_branch_readcap = overlay_read_cap;
        }
    }

    pub fn is_private(&self) -> bool {
        self.store_repo.is_private()
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

    pub fn get_store_overlay_branch_readcap(&self) -> &ReadCap {
        &self.store_overlay_branch_readcap
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

    /// fetch a block from broker or core overlay
    pub async fn fetch(&self, _id: &BlockId) -> Result<Block, StorageError> {
        todo!();
    }

    /// Save a block to the storage.
    pub fn put(&self, block: &Block) -> Result<BlockId, StorageError> {
        self.storage
            .write()
            .map_err(|_| StorageError::BackendError)?
            .put(&self.overlay_id, block, true)
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

    pub fn has(&self, id: &BlockId) -> Result<(), StorageError> {
        self.storage
            .read()
            .map_err(|_| StorageError::BackendError)?
            .has(&self.overlay_id, id)
    }

    /// returns the (branch_commit, add_branch_commit, branch_info)
    fn create_branch(
        &self,
        branch_type: BranchType,
        crdt: BranchCrdt,
        creator: &UserId,
        creator_priv_key: &PrivKey,
        repo_pub_key: BranchId,
        repository_commit_ref: ObjectRef,
        root_branch_readcap_id: ObjectId,
        repo_write_cap_secret: &RepoWriteCapSecret,
        add_branch_deps: Vec<ObjectRef>,
        add_branch_acks: Vec<ObjectRef>,
    ) -> Result<(Commit, Commit, BranchInfo), NgError> {
        let (branch_priv_key, branch_pub_key) = generate_keypair();

        let (branch_topic_priv_key, branch_topic_pub_key) = generate_keypair();

        let branch_commit_body = CommitBody::V0(CommitBodyV0::Branch(Branch::V0(BranchV0 {
            id: branch_pub_key,
            crdt: crdt.clone(),
            repo: repository_commit_ref,
            root_branch_readcap_id,
            topic: branch_topic_pub_key,
            topic_privkey: Branch::encrypt_branch_write_cap_secret(
                &branch_topic_priv_key,
                branch_topic_pub_key,
                branch_pub_key,
                repo_write_cap_secret,
            ),
            pulled_from: vec![],
            metadata: vec![],
        })));

        let branch_commit = Commit::new_with_body_acks_deps_and_save(
            &branch_priv_key,
            &branch_pub_key,
            branch_pub_key,
            QuorumType::Owners,
            vec![],
            vec![],
            branch_commit_body,
            self,
        )?;
        let branch_read_cap = branch_commit.reference().unwrap();

        // creating the AddBranch commit (on root_branch), deps to the RootBranch commit
        // author is the owner

        let add_branch_commit_body =
            CommitBody::V0(CommitBodyV0::AddBranch(AddBranch::V0(AddBranchV0 {
                branch_type: branch_type.clone(),
                branch_id: branch_pub_key,
                topic_id: Some(branch_topic_pub_key),
                branch_read_cap: Some(branch_read_cap.clone()),
                fork_of: None,
                merged_in: None,
                crdt: crdt.clone(),
            })));

        let add_branch_commit = Commit::new_with_body_acks_deps_and_save(
            creator_priv_key,
            creator,
            repo_pub_key,
            QuorumType::Owners,
            add_branch_deps,
            add_branch_acks,
            add_branch_commit_body,
            self,
        )?;

        let branch_info = BranchInfo {
            id: branch_pub_key,
            branch_type,
            topic: Some(branch_topic_pub_key),
            topic_priv_key: Some(branch_topic_priv_key),
            read_cap: Some(branch_read_cap),
            fork_of: None,
            merged_in: None,
            crdt,
            current_heads: vec![],
            commits_nbr: 0,
        };

        Ok((branch_commit, add_branch_commit, branch_info))
    }

    pub fn create_repo_default(
        self: Arc<Self>,
        creator: &UserId,
        creator_priv_key: &PrivKey,
        repo_write_cap_secret: SymKey,
        branch_crdt: BranchCrdt,
    ) -> Result<(Repo, Vec<(Commit, Vec<Digest>)>), NgError> {
        let (repo_priv_key, repo_pub_key) = generate_keypair();

        self.create_repo_with_keys(
            creator,
            creator_priv_key,
            repo_priv_key,
            repo_pub_key,
            repo_write_cap_secret,
            Some(branch_crdt),
            false,
        )
    }

    pub fn create_repo_with_keys(
        self: Arc<Self>,
        creator: &UserId,
        creator_priv_key: &PrivKey,
        repo_priv_key: PrivKey,
        repo_pub_key: PubKey,
        repo_write_cap_secret: SymKey,
        mut branch_crdt: Option<BranchCrdt>,
        is_private_store: bool,
    ) -> Result<(Repo, Vec<(Commit, Vec<Digest>)>), NgError> {
        let is_store = branch_crdt.is_none();
        if is_store {
            branch_crdt = Some(BranchCrdt::Graph("data:container".to_string()));
        }

        let mut events = Vec::with_capacity(9);
        let mut events_postponed = Vec::with_capacity(6);

        // creating the Repository commit

        let repository = Repository::new(&repo_pub_key);

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

        let repository_commit_body_ref = repository_commit.body_ref().clone();

        //log_debug!("REPOSITORY COMMIT {}", repository_commit);

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
                topic_privkey: Branch::encrypt_branch_write_cap_secret(
                    &topic_priv_key,
                    topic_pub_key,
                    repo_pub_key,
                    &repo_write_cap_secret,
                ),
                inherit_perms_users_and_quorum_from_store: None,
                quorum: None,
                reconciliation_interval: RelTime::None,
                owners: vec![creator.clone()],
                owners_write_cap: vec![serde_bytes::ByteBuf::from(RootBranch::encrypt_write_cap(
                    creator,
                    &repo_write_cap_secret,
                )?)],
                metadata: vec![],
            })));

        let root_branch_commit = Commit::new_with_body_acks_deps_and_save(
            &repo_priv_key,
            &repo_pub_key,
            repo_pub_key,
            QuorumType::Owners,
            vec![],
            vec![repository_commit_ref.clone()],
            root_branch_commit_body,
            &self,
        )?;

        let root_branch_readcap = root_branch_commit.reference().unwrap();
        let root_branch_readcap_id = root_branch_readcap.id;
        // adding the 2 events for the Repository and Rootbranch commits

        events.push((repository_commit, vec![]));

        events.push((root_branch_commit, vec![]));

        // creating the header branch
        let (header_add_branch_commit, header_branch_info, next_dep) = if !is_private_store {
            let (header_branch_commit, header_add_branch_commit, header_branch_info) =
                self.as_ref().create_branch(
                    BranchType::Header,
                    BranchCrdt::Graph(branch_crdt.as_ref().unwrap().class().clone()),
                    creator,
                    creator_priv_key,
                    repo_pub_key,
                    repository_commit_ref.clone(),
                    root_branch_readcap_id,
                    &repo_write_cap_secret,
                    vec![root_branch_readcap.clone()],
                    vec![],
                )?;
            let header_add_branch_readcap = header_add_branch_commit.reference().unwrap();
            events_postponed.push((header_branch_commit, vec![]));
            (
                Some(header_add_branch_commit),
                Some(header_branch_info),
                header_add_branch_readcap,
            )
        } else {
            (None, None, root_branch_readcap.clone())
        };

        // creating the main branch

        let (main_branch_commit, main_add_branch_commit, main_branch_info) =
            self.as_ref().create_branch(
                BranchType::Main,
                branch_crdt.unwrap(),
                creator,
                creator_priv_key,
                repo_pub_key,
                repository_commit_ref.clone(),
                root_branch_readcap_id,
                &repo_write_cap_secret,
                vec![next_dep],
                vec![],
            )?;
        events_postponed.push((main_branch_commit, vec![]));

        // TODO: optional AddMember and AddPermission, that should be added as deps to the SynSignature below (and to the commits of the SignatureContent)
        // using the creator as author (and incrementing their peer's seq_num)

        let extra_branches = if is_store {
            // creating the store branch
            let (store_branch_commit, store_add_branch_commit, store_branch_info) =
                self.as_ref().create_branch(
                    BranchType::Store,
                    BranchCrdt::None,
                    creator,
                    creator_priv_key,
                    repo_pub_key,
                    repository_commit_ref.clone(),
                    root_branch_readcap_id,
                    &repo_write_cap_secret,
                    vec![main_add_branch_commit.reference().unwrap()],
                    vec![],
                )?;
            events_postponed.push((store_branch_commit, vec![]));

            // creating the overlay or user branch
            let (
                overlay_or_user_branch_commit,
                overlay_or_user_add_branch_commit,
                overlay_or_user_branch_info,
            ) = self.as_ref().create_branch(
                if is_private_store {
                    BranchType::User
                } else {
                    BranchType::Overlay
                },
                BranchCrdt::None,
                creator,
                creator_priv_key,
                repo_pub_key,
                repository_commit_ref.clone(),
                root_branch_readcap_id,
                &repo_write_cap_secret,
                vec![store_add_branch_commit.reference().unwrap()],
                vec![],
            )?;

            events_postponed.push((overlay_or_user_branch_commit, vec![]));

            Some((
                store_add_branch_commit,
                store_branch_info,
                overlay_or_user_add_branch_commit,
                overlay_or_user_branch_info,
            ))
        } else {
            None
        };

        let sync_sign_deps = if is_store {
            extra_branches.as_ref().unwrap().2.reference().unwrap()
        } else {
            main_add_branch_commit.reference().unwrap()
        };

        // preparing the threshold keys for the unique owner
        let mut rng = rand::thread_rng();
        let sk_set = SecretKeySet::random(0, &mut rng);
        let pk_set = sk_set.public_keys();

        let sk_share = sk_set.secret_key_share(0);

        // creating signature for RootBranch, AddBranch and Branch commits
        // signed with owner threshold signature (threshold = 0)

        let mut signed_commits = if header_branch_info.is_some() {
            vec![
                header_branch_info
                    .as_ref()
                    .unwrap()
                    .read_cap
                    .as_ref()
                    .unwrap()
                    .id,
                main_branch_info.read_cap.as_ref().unwrap().id,
            ]
        } else {
            vec![main_branch_info.read_cap.as_ref().unwrap().id]
        };

        if let Some((_, store_branch, oou_add_branch, oou_branch)) = &extra_branches {
            signed_commits.append(&mut vec![
                oou_add_branch.id().unwrap(),
                store_branch.read_cap.as_ref().unwrap().id,
                oou_branch.read_cap.as_ref().unwrap().id,
            ]);
        } else {
            signed_commits.push(main_add_branch_commit.id().unwrap());
        }

        let signature_content = SignatureContent::V0(SignatureContentV0 {
            commits: signed_commits,
        });

        let signature_content_ser = serde_bare::to_vec(&signature_content).unwrap();
        let sig_share = sk_share.sign(signature_content_ser);
        let sig = pk_set
            .combine_signatures([(0, &sig_share)])
            .map_err(|_| NgError::IncompleteSignature)?;

        let threshold_sig = ThresholdSignatureV0::Owners(sig);

        // creating root certificate of the repo

        let cert_content = CertificateContentV0 {
            previous: repository_commit_body_ref,
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
        let cert_obj_blocks = cert_object.save(&self)?;

        // finally getting the signature:

        let certificate_ref = cert_object.reference().unwrap();
        let signature = Signature::V0(SignatureV0 {
            content: signature_content,
            threshold_sig,
            certificate_ref: certificate_ref.clone(),
        });

        // saving the signature
        let sig_object = Object::new(
            ObjectContent::V0(ObjectContentV0::Signature(signature)),
            None,
            0,
            &self,
        );
        let sig_obj_blocks = sig_object.save(&self)?;

        // keeping the Secret Key Share of the owner
        let signer_cap = SignerCap {
            repo: repo_pub_key,
            epoch: root_branch_readcap_id,
            owner: Some(ng_threshold_crypto::serde_impl::SerdeSecret(sk_share)),
            total_order: None,
            partial_order: None,
        };

        let sync_signature = SyncSignature::V0(sig_object.reference().unwrap());

        // creating the SyncSignature commit body (cloned for each branch)
        let sync_sig_commit_body = CommitBody::V0(CommitBodyV0::SyncSignature(sync_signature));

        // creating the SyncSignature commit for the root_branch with deps to the AddBranch and acks to the RootBranch commit as it is its direct causal future.

        let sync_sig_on_root_branch_commit = Commit::new_with_body_acks_deps_and_save(
            creator_priv_key,
            creator,
            repo_pub_key,
            QuorumType::IamTheSignature,
            vec![sync_sign_deps],
            vec![root_branch_readcap.clone()],
            sync_sig_commit_body.clone(),
            &self,
        )?;

        let mut branches = if header_branch_info.is_some() {
            vec![
                (
                    header_branch_info.as_ref().unwrap().id,
                    header_branch_info.unwrap(),
                ),
                (main_branch_info.id, main_branch_info),
            ]
        } else {
            vec![(main_branch_info.id, main_branch_info)]
        };

        // adding the event for the sync_sig_on_root_branch_commit

        let mut capacity =
            cert_obj_blocks.len() + sig_obj_blocks.len() + main_add_branch_commit.blocks().len();
        if header_add_branch_commit.is_some() {
            capacity += header_add_branch_commit.as_ref().unwrap().blocks().len()
        }
        let mut additional_blocks = Vec::with_capacity(capacity);
        additional_blocks.extend(cert_obj_blocks.iter());
        additional_blocks.extend(sig_obj_blocks.iter());
        additional_blocks.extend(main_add_branch_commit.blocks().iter());
        if header_add_branch_commit.is_some() {
            additional_blocks.extend(header_add_branch_commit.unwrap().blocks().iter());
        }
        if let Some((store_add_branch, store_branch_info, oou_add_branch, oou_branch_info)) =
            extra_branches
        {
            additional_blocks.extend(store_add_branch.blocks().iter());
            additional_blocks.extend(oou_add_branch.blocks().iter());
            branches.push((store_branch_info.id, store_branch_info));
            branches.push((oou_branch_info.id, oou_branch_info));
        }

        // creating the SyncSignature for all (2+ optional 2) branches with deps to the Branch commit and acks also to this commit as it is its direct causal future.

        for (branch_id, branch_info) in &mut branches {
            let sync_sig_on_branch_commit = Commit::new_with_body_acks_deps_and_save(
                creator_priv_key,
                creator,
                *branch_id,
                QuorumType::IamTheSignature,
                vec![branch_info.read_cap.as_ref().unwrap().clone()],
                vec![branch_info.read_cap.as_ref().unwrap().clone()],
                sync_sig_commit_body.clone(),
                &self,
            )?;

            let sync_sig_on_branch_commit_ref = sync_sig_on_branch_commit.reference().unwrap();

            // adding the event for the sync_sig_on_branch_commit

            let mut additional = Vec::with_capacity(cert_obj_blocks.len() + sig_obj_blocks.len());
            additional.extend(cert_obj_blocks.iter());
            additional.extend(sig_obj_blocks.iter());
            events_postponed.push((sync_sig_on_branch_commit, additional));

            branch_info.current_heads = vec![sync_sig_on_branch_commit_ref];

            // TODO: add the CertificateRefresh event on main branch
        }

        let sync_sig_on_root_branch_commit_ref =
            sync_sig_on_root_branch_commit.reference().unwrap();

        events.push((sync_sig_on_root_branch_commit, additional_blocks));
        events.extend(events_postponed);

        // preparing the Repo

        let root_branch = BranchInfo {
            id: repo_pub_key.clone(),
            branch_type: BranchType::Root,
            topic: Some(topic_pub_key),
            topic_priv_key: Some(topic_priv_key),
            read_cap: Some(root_branch_readcap.clone()),
            fork_of: None,
            merged_in: None,
            crdt: BranchCrdt::None,
            current_heads: vec![sync_sig_on_root_branch_commit_ref],
            commits_nbr: 0,
        };

        branches.push((root_branch.id, root_branch));

        let repo = Repo {
            id: repo_pub_key,
            repo_def: repository,
            signer: Some(signer_cap),
            members: HashMap::new(),
            store: Arc::clone(&self),
            read_cap: Some(root_branch_readcap),
            write_cap: Some(repo_write_cap_secret),
            branches: branches.into_iter().collect(),
            opened_branches: HashMap::new(),
            certificate_ref: Some(certificate_ref),
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

    pub fn inner_overlay(&self) -> OverlayId {
        self.store_repo
            .overlay_id_for_write_purpose(&self.store_overlay_branch_readcap.key)
    }

    pub fn overlay_for_read_on_client_protocol(&self) -> OverlayId {
        match self.store_repo {
            _ => self.inner_overlay(),
            //StoreRepo::V0(StoreRepoV0::PrivateStore(_)) => self.inner_overlay(),
            //_ => self.overlay_id,
        }
    }

    pub fn outer_overlay(&self) -> OverlayId {
        self.store_repo.outer_overlay()
    }

    #[allow(deprecated)]
    #[cfg(any(test, feature = "testing"))]
    pub fn dummy_public_v0() -> Arc<Self> {
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
