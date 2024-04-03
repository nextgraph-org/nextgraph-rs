// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Repository serde implementation and in memory helper

use crate::errors::*;
use crate::event::*;
use crate::log::*;
use crate::object::Object;
use crate::store::*;
use crate::types::*;
use crate::utils::generate_keypair;
use crate::utils::sign;
use core::fmt;
use rand::prelude::*;

use std::collections::HashMap;
use std::collections::HashSet;

use threshold_crypto::{SecretKeySet, SecretKeyShare};

impl RepositoryV0 {
    pub fn new(id: &PubKey, metadata: &Vec<u8>) -> RepositoryV0 {
        RepositoryV0 {
            id: id.clone(),
            metadata: metadata.clone(),
            verification_program: vec![],
            creator: None,
        }
    }
}

impl Repository {
    pub fn new(id: &PubKey, metadata: &Vec<u8>) -> Repository {
        Repository::V0(RepositoryV0::new(id, metadata))
    }
}

#[derive(Debug)]
pub struct UserInfo {
    /// list of permissions granted to user, with optional metadata
    pub permissions: HashMap<PermissionV0, Vec<u8>>,
    pub id: UserId,
}

impl UserInfo {
    pub fn has_any_perm(&self, perms: &HashSet<PermissionV0>) -> Result<(), NgError> {
        //log_debug!("perms {:?}", perms);
        if self.has_perm(&PermissionV0::Owner).is_ok() {
            return Ok(());
        }
        let is_admin = self.has_perm(&PermissionV0::Admin).is_ok();
        //log_debug!("is_admin {}", is_admin);
        //is_delegated_by_admin
        let has_perms: HashSet<&PermissionV0> = self.permissions.keys().collect();
        //log_debug!("has_perms {:?}", has_perms);
        for perm in perms {
            if is_admin && perm.is_delegated_by_admin() || has_perms.contains(perm) {
                return Ok(());
            }
        }
        // if has_perms.intersection(perms).count() > 0 {
        //     Ok(())
        // } else {
        Err(NgError::PermissionDenied)
    }
    pub fn has_perm(&self, perm: &PermissionV0) -> Result<&Vec<u8>, NgError> {
        self.permissions.get(perm).ok_or(NgError::PermissionDenied)
    }
}

/// In memory Repository representation. With helper functions that access the underlying UserStore and keeps proxy of the values
pub struct Repo<'a> {
    /// Repo definition
    pub repo_def: Repository,

    pub signer: Option<SignerCap>,

    pub members: HashMap<Digest, UserInfo>,

    storage: &'a Box<dyn RepoStore + Send + Sync + 'a>,
}

impl<'a> fmt::Display for Repo<'a> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "====== Repo ======")?;

        write!(f, "== repo_def:    {}", self.repo_def)?;

        if self.signer.is_some() {
            writeln!(f, "== signer:   {:?}", self.signer)?;
        }

        writeln!(f, "== members:   {:?}", self.members)?;

        Ok(())
    }
}

impl<'a> Repo<'a> {
    /// returns the Repo and the last seq_num of the peer
    pub fn new_default(
        creator: &UserId,
        creator_priv_key: &PrivKey,
        publisher_peer: &PrivKey,
        peer_last_seq_num: &mut u64,
        store_repo: &StoreRepo,
        store_secret: &ReadCapSecret,
        storage: &'a Box<dyn RepoStore + Send + Sync + 'a>,
    ) -> Result<(Self, Vec<Event>), NgError> {
        let mut events = Vec::with_capacity(6);

        // creating the Repository commit

        let (repo_priv_key, repo_pub_key) = generate_keypair();

        //let overlay = store_repo.overlay_id_for_read_purpose();

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
            &store_repo,
            &store_secret,
            storage,
        )?;

        log_debug!("REPOSITORY COMMIT {}", repository_commit);

        let repository_commit_ref = repository_commit.reference().unwrap();

        let (topic_priv_key, topic_pub_key) = generate_keypair();

        // creating the RootBranch commit, acks to Repository commit

        let repo_write_cap_secret = SymKey::random();

        let root_branch_commit_body =
            CommitBody::V0(CommitBodyV0::RootBranch(RootBranch::V0(RootBranchV0 {
                id: repo_pub_key,
                repo: repository_commit_ref.clone(),
                store: store_repo.into(),
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
            &store_repo,
            &store_secret,
            storage,
        )?;

        log_debug!("ROOT_BRANCH COMMIT {}", root_branch_commit);

        // adding the 2 events for the Repository and Rootbranch commits

        //peer_last_seq_num += 1;
        events.push(Event::new(
            publisher_peer,
            peer_last_seq_num,
            &repository_commit,
            &vec![],
            topic_pub_key,
            root_branch_commit.key().unwrap(),
            &topic_priv_key,
            storage,
        )?);

        //peer_last_seq_num += 1;
        events.push(Event::new(
            publisher_peer,
            peer_last_seq_num,
            &root_branch_commit,
            &vec![],
            topic_pub_key,
            root_branch_commit.key().unwrap(),
            &topic_priv_key,
            storage,
        )?);

        // creating the main branch

        let (main_branch_priv_key, main_branch_pub_key) = generate_keypair();

        let (main_branch_topic_priv_key, main_branch_topic_pub_key) = generate_keypair();

        let main_branch_commit_body = CommitBody::V0(CommitBodyV0::Branch(Branch::V0(BranchV0 {
            id: main_branch_pub_key,
            repo: repository_commit_ref.clone(),
            root_branch_readcap_id: root_branch_commit.id().unwrap(),
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
            &store_repo,
            &store_secret,
            storage,
        )?;

        log_debug!("MAIN BRANCH COMMIT {}", main_branch_commit);

        // adding the event for the Branch commit

        // peer_last_seq_num += 1;
        events.push(Event::new(
            publisher_peer,
            peer_last_seq_num,
            &main_branch_commit,
            &vec![],
            main_branch_topic_pub_key,
            main_branch_commit.key().unwrap(),
            &main_branch_topic_priv_key,
            storage,
        )?);

        // creating the AddBranch commit (on root_branch), deps to the RootBranch commit
        // author is the owner

        let add_branch_commit_body =
            CommitBody::V0(CommitBodyV0::AddBranch(AddBranch::V0(AddBranchV0 {
                branch_type: BranchType::Main,
                topic_id: main_branch_topic_pub_key,
                branch_read_cap: main_branch_commit.reference().unwrap(),
            })));

        let add_branch_commit = Commit::new_with_body_acks_deps_and_save(
            creator_priv_key,
            creator,
            repo_pub_key,
            QuorumType::Owners,
            vec![root_branch_commit.reference().unwrap()],
            vec![],
            add_branch_commit_body,
            &store_repo,
            &store_secret,
            storage,
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
                root_branch_commit.id().unwrap(),
                add_branch_commit.id().unwrap(),
                main_branch_commit.id().unwrap(),
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
            readcap_id: root_branch_commit.id().unwrap(),
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
            &store_repo,
            &store_secret,
        );
        let mut cert_obj_blocks = cert_object.save(storage)?;

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
            &store_repo,
            &store_secret,
        );
        let mut sig_obj_blocks = sig_object.save(storage)?;

        // keeping the Secret Key Share of the owner
        let signer_cap = SignerCap {
            repo: repo_pub_key,
            epoch: root_branch_commit.id().unwrap(),
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
            vec![root_branch_commit.reference().unwrap()],
            sync_sig_commit_body.clone(),
            &store_repo,
            &store_secret,
            storage,
        )?;

        // adding the event for the sync_sig_on_root_branch_commit

        let mut additional_blocks = Vec::with_capacity(
            cert_obj_blocks.len() + sig_obj_blocks.len() + add_branch_commit.blocks().len(),
        );
        additional_blocks.extend(cert_obj_blocks.iter());
        additional_blocks.extend(sig_obj_blocks.iter());
        additional_blocks.extend(add_branch_commit.blocks().iter());

        //peer_last_seq_num += 1;
        events.push(Event::new(
            publisher_peer,
            peer_last_seq_num,
            &sync_sig_on_root_branch_commit,
            &additional_blocks,
            topic_pub_key,
            root_branch_commit.key().unwrap(),
            &topic_priv_key,
            storage,
        )?);

        // creating the SyncSignature for the main branch with deps to the Branch commit and acks also to this commit as it is its direct causal future.

        let sync_sig_on_main_branch_commit = Commit::new_with_body_acks_deps_and_save(
            creator_priv_key,
            creator,
            main_branch_pub_key,
            QuorumType::IamTheSignature,
            vec![main_branch_commit.reference().unwrap()],
            vec![main_branch_commit.reference().unwrap()],
            sync_sig_commit_body,
            &store_repo,
            &store_secret,
            storage,
        )?;

        // adding the event for the sync_sig_on_main_branch_commit

        let mut additional_blocks =
            Vec::with_capacity(cert_obj_blocks.len() + sig_obj_blocks.len());
        additional_blocks.append(&mut cert_obj_blocks);
        additional_blocks.append(&mut sig_obj_blocks);

        // peer_last_seq_num += 1;
        events.push(Event::new(
            publisher_peer,
            peer_last_seq_num,
            &sync_sig_on_main_branch_commit,
            &additional_blocks,
            main_branch_topic_pub_key,
            main_branch_commit.key().unwrap(),
            &main_branch_topic_priv_key,
            storage,
        )?);

        // TODO: add the CertificateRefresh event on main branch

        // += 1;

        // preparing the Repo

        let repo = Repo {
            repo_def: repository,
            signer: Some(signer_cap),
            members: HashMap::new(),
            storage,
        };

        Ok((repo, events))
    }

    pub fn new_with_member(
        id: &PubKey,
        member: &UserId,
        perms: &[PermissionV0],
        overlay: OverlayId,
        storage: &'a Box<dyn RepoStore + Send + Sync + 'a>,
    ) -> Self {
        let mut members = HashMap::new();
        let permissions = HashMap::from_iter(
            perms
                .iter()
                .map(|p| (*p, vec![]))
                .collect::<Vec<(PermissionV0, Vec<u8>)>>()
                .iter()
                .cloned(),
        );
        members.insert(
            CommitContent::author_digest(member, overlay),
            UserInfo {
                id: *member,
                permissions,
            },
        );
        Self {
            repo_def: Repository::new(id, &vec![]),
            members,
            storage,
            signer: None,
        }
    }

    pub fn verify_permission(&self, commit: &Commit) -> Result<(), NgError> {
        let content_author = commit.content_v0().author;
        let body = commit.load_body(&self.storage)?;
        match self.members.get(&content_author) {
            Some(info) => return info.has_any_perm(&body.required_permission()),
            None => {}
        }
        Err(NgError::PermissionDenied)
    }

    pub fn member_pubkey(&self, hash: &Digest) -> Result<UserId, NgError> {
        match self.members.get(hash) {
            Some(user_info) => Ok(user_info.id),
            None => Err(NgError::NotFound),
        }
    }

    pub fn get_storage(&self) -> &Box<dyn RepoStore + Send + Sync + 'a> {
        self.storage
    }
}

#[cfg(test)]
mod test {

    use crate::object::*;
    use crate::repo::*;

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

    #[test]
    pub fn test_new_repo_default() {
        let (creator_priv_key, creator_pub_key) = generate_keypair();

        let (publisher_privkey, publisher_pubkey) = generate_keypair();
        let publisher_peer = PeerId::Forwarded(publisher_pubkey);

        let mut peer_last_seq_num = 10;

        let (store_repo, store_secret) = StoreRepo::dummy_public_v0();
        let hashmap_storage = HashMapRepoStore::new();
        let t = Test::storage(hashmap_storage);

        let (repo, events) = Repo::new_default(
            &creator_pub_key,
            &creator_priv_key,
            &publisher_privkey,
            &mut peer_last_seq_num,
            &store_repo,
            &store_secret,
            t.s(),
        )
        .expect("new_default");

        log_debug!("REPO OBJECT {}", repo);

        log_debug!("events:     {}\n", events.len());
        let mut i = 0;
        for e in events {
            log_debug!("========== EVENT {:03}: {}", i, e);
            i += 1;
        }

        assert_eq!(peer_last_seq_num, 15);
    }
}
