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

//! Site (Public, Protected, Private) of Individual and Org

use crate::types::*;
use crate::verifier::Verifier;
use ng_repo::errors::NgError;
use ng_repo::types::*;
use ng_repo::utils::{generate_keypair, sign, verify};
use serde::{Deserialize, Serialize};

/// Site V0
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

    /// Only for IndividualSite: TODO reorganize those 2 fields
    pub cores: Vec<(PubKey, Option<[u8; 32]>)>,
    pub bootstraps: Vec<PubKey>,
}

impl SiteV0 {
    pub fn get_individual_user_priv_key(&self) -> Option<PrivKey> {
        match &self.site_type {
            SiteType::Individual((priv_key, _)) => Some(priv_key.clone()),
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

    fn create_individual_(
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

        verifier.reserve_more(18)?;

        let public_repo =
            verifier.new_store_default(&site_pubkey, &user_priv_key, &public_store, false)?;

        let protected_repo =
            verifier.new_store_default(&site_pubkey, &user_priv_key, &protected_store, false)?;

        let private_repo =
            verifier.new_store_default(&site_pubkey, &user_priv_key, &private_store, true)?;

        // TODO: create user branch
        // TODO: add the 2 commits in user branch about StoreUpdate of public and protected stores.

        Ok(Self {
            site_type: SiteType::Individual((
                user_priv_key,
                private_repo.read_cap.to_owned().unwrap(),
            )),
            id: site_pubkey,
            name: site_name,
            public,
            protected,
            private,
            cores: vec![],
            bootstraps: vec![],
        })
    }

    pub fn create_individual(
        name: String,
        user_priv_key: PrivKey,
        verifier: &mut Verifier,
    ) -> Result<Self, NgError> {
        Self::create_individual_(user_priv_key, verifier, SiteName::Name(name))
    }

    pub fn create_personal(
        user_priv_key: PrivKey,
        verifier: &mut Verifier,
    ) -> Result<Self, NgError> {
        Self::create_individual_(user_priv_key, verifier, SiteName::Personal)
    }

    pub fn create_org(name: String) -> Result<Self, NgError> {
        let (site_privkey, site_pubkey) = generate_keypair();

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
