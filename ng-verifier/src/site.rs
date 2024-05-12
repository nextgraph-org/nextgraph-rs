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

//! A Site of an Individual or Org (with 3P stores: Public, Protected, Private)

use serde::{Deserialize, Serialize};

use ng_repo::errors::NgError;
use ng_repo::types::*;
use ng_repo::utils::generate_keypair;

use crate::verifier::Verifier;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct SiteV0 {
    pub site_type: SiteType,

    pub id: PubKey,

    pub name: SiteName,

    // Identity::OrgPublicStore or Identity::IndividualPublicStore
    pub public: SiteStore,

    // Identity::OrgProtectedStore or Identity::IndividualProtectedStore
    pub protected: SiteStore,

    // Identity::OrgPrivateStore or Identity::IndividualPrivateStore
    pub private: SiteStore,

    // Only for IndividualSite: TODO reorganize those 2 fields
    #[doc(hidden)]
    pub cores: Vec<(PubKey, Option<[u8; 32]>)>,
    #[doc(hidden)]
    pub bootstraps: Vec<PubKey>,
}

impl SiteV0 {
    pub fn get_individual_user_priv_key(&self) -> Option<PrivKey> {
        match &self.site_type {
            SiteType::Individual((priv_key, _)) => Some(priv_key.clone()),
            _ => None,
        }
    }

    pub fn get_individual_site_private_store_read_cap(&self) -> Option<ReadCap> {
        match &self.site_type {
            SiteType::Individual((_, read_cap)) => Some(read_cap.clone()),
            _ => None,
        }
    }

    fn site_store_to_store_repo(site_store: &SiteStore) -> StoreRepo {
        StoreRepo::V0(match site_store.store_type {
            SiteStoreType::Public => StoreRepoV0::PublicStore(site_store.id),
            SiteStoreType::Protected => StoreRepoV0::ProtectedStore(site_store.id),
            SiteStoreType::Private => StoreRepoV0::PrivateStore(site_store.id),
        })
    }

    pub fn get_site_store_id(&self, store_type: SiteStoreType) -> PubKey {
        match store_type {
            SiteStoreType::Public => self.public.id,
            SiteStoreType::Protected => self.protected.id,
            SiteStoreType::Private => self.private.id,
        }
    }

    async fn create_individual_(
        user_priv_key: PrivKey,
        verifier: &mut Verifier,
        site_name: SiteName,
    ) -> Result<Self, NgError> {
        let site_pubkey = user_priv_key.to_pub();

        let (public_store_privkey, public_store_pubkey) = generate_keypair();

        let (protected_store_privkey, protected_store_pubkey) = generate_keypair();

        let (private_store_privkey, private_store_pubkey) = generate_keypair();

        let public = SiteStore {
            id: public_store_pubkey,
            store_type: SiteStoreType::Public,
        };

        let protected = SiteStore {
            id: protected_store_pubkey,
            store_type: SiteStoreType::Protected,
        };

        let private = SiteStore {
            id: private_store_pubkey,
            store_type: SiteStoreType::Private,
        };

        let public_store = Self::site_store_to_store_repo(&public);
        let protected_store = Self::site_store_to_store_repo(&protected);
        let private_store = Self::site_store_to_store_repo(&private);

        verifier.reserve_more(33)?;

        let mut signer_caps = Vec::with_capacity(3);

        let public_repo = verifier
            .new_store_default(
                &site_pubkey,
                &user_priv_key,
                public_store_privkey,
                &public_store,
                false,
            )
            .await?;

        let public_store_update: StoreUpdate = public_repo.store.as_ref().into();
        signer_caps.push(public_repo.signer.to_owned().unwrap());

        let protected_repo = verifier
            .new_store_default(
                &site_pubkey,
                &user_priv_key,
                protected_store_privkey,
                &protected_store,
                false,
            )
            .await?;

        let protected_store_update: StoreUpdate = protected_repo.store.as_ref().into();
        signer_caps.push(protected_repo.signer.to_owned().unwrap());

        let private_repo = verifier
            .new_store_default(
                &site_pubkey,
                &user_priv_key,
                private_store_privkey,
                &private_store,
                true,
            )
            .await?;

        signer_caps.push(private_repo.signer.to_owned().unwrap());
        let user_branch = private_repo.user_branch().unwrap();

        // Creating the StoreUpdate about public store.
        let public_store_update_commit_body =
            CommitBody::V0(CommitBodyV0::StoreUpdate(public_store_update));

        let public_store_update_commit = Commit::new_with_body_acks_deps_and_save(
            &user_priv_key,
            &site_pubkey,
            user_branch.id,
            QuorumType::NoSigning,
            vec![],
            user_branch.current_heads.clone(),
            public_store_update_commit_body,
            &private_repo.store,
        )?;

        // Creating the StoreUpdate about protected store.
        let protected_store_update_commit_body =
            CommitBody::V0(CommitBodyV0::StoreUpdate(protected_store_update));

        let protected_store_update_commit = Commit::new_with_body_acks_deps_and_save(
            &user_priv_key,
            &site_pubkey,
            user_branch.id,
            QuorumType::NoSigning,
            vec![],
            vec![public_store_update_commit.reference().unwrap()],
            protected_store_update_commit_body,
            &private_repo.store,
        )?;

        let mut current_head = protected_store_update_commit.reference().unwrap();

        let private_repo_id = private_repo.id;
        let private_store_repo = private_repo.store.get_store_repo().clone();
        let private_repo_read_cap = private_repo.read_cap.to_owned().unwrap();

        // Creating the AddSignerCap for each store
        let mut commits = Vec::with_capacity(5);
        commits.push((public_store_update_commit, vec![]));
        commits.push((protected_store_update_commit, vec![]));

        for cap in signer_caps {
            let add_signer_cap_commit_body = CommitBody::V0(CommitBodyV0::AddSignerCap(
                AddSignerCap::V0(AddSignerCapV0 {
                    cap,
                    metadata: vec![],
                }),
            ));

            let add_signer_cap_commit = Commit::new_with_body_acks_deps_and_save(
                &user_priv_key,
                &site_pubkey,
                user_branch.id,
                QuorumType::NoSigning,
                vec![],
                vec![current_head],
                add_signer_cap_commit_body,
                &private_repo.store,
            )?;
            current_head = add_signer_cap_commit.reference().unwrap();
            commits.push((add_signer_cap_commit, vec![]));
        }

        // update the current_heads
        //verifier.update_current_heads(&private_repo_id, &user_branch_id, vec![current_head])?;
        // this is now done in send_or_save_event_to_outbox

        // sending the additional events
        verifier
            .new_events(commits, private_repo_id, &private_store_repo)
            .await?;

        Ok(Self {
            site_type: SiteType::Individual((user_priv_key, private_repo_read_cap)),
            id: site_pubkey,
            name: site_name,
            public,
            protected,
            private,
            cores: vec![],
            bootstraps: vec![],
        })
    }

    pub async fn create_individual(
        name: String,
        user_priv_key: PrivKey,
        verifier: &mut Verifier,
    ) -> Result<Self, NgError> {
        Self::create_individual_(user_priv_key, verifier, SiteName::Name(name)).await
    }

    pub async fn create_personal(
        user_priv_key: PrivKey,
        verifier: &mut Verifier,
    ) -> Result<Self, NgError> {
        let site = Self::create_individual_(user_priv_key, verifier, SiteName::Personal).await?;
        verifier.config.private_store_read_cap = site.get_individual_site_private_store_read_cap();
        verifier.config.private_store_id = Some(site.private.id);
        verifier.config.protected_store_id = Some(site.protected.id);
        verifier.config.public_store_id = Some(site.public.id);
        Ok(site)
    }

    pub async fn create_org(name: String) -> Result<Self, NgError> {
        // TODO: implement correctly. see create_personal/create_individual

        let (_site_privkey, site_pubkey) = generate_keypair();

        let (_public_store_privkey, public_store_pubkey) = generate_keypair();

        let (_protected_store_privkey, protected_store_pubkey) = generate_keypair();

        let (_private_store_privkey, private_store_pubkey) = generate_keypair();

        let public = SiteStore {
            id: public_store_pubkey,
            store_type: SiteStoreType::Public,
        };

        let protected = SiteStore {
            id: protected_store_pubkey,
            store_type: SiteStoreType::Protected,
        };

        let private = SiteStore {
            id: private_store_pubkey,
            store_type: SiteStoreType::Private,
        };

        Ok(Self {
            site_type: SiteType::Org,
            id: site_pubkey,
            name: SiteName::Name(name),
            public,
            protected,
            private,
            cores: vec![],
            bootstraps: vec![],
        })
    }
}
