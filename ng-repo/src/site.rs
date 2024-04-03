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

use crate::errors::NgError;
use crate::types::*;
use crate::utils::{generate_keypair, sign, verify};

impl SiteV0 {
    pub fn get_individual_user_priv_key(&self) -> Option<PrivKey> {
        match &self.site_type {
            SiteType::Individual((priv_key, _)) => Some(priv_key.clone()),
            _ => None,
        }
    }

    pub fn create_personal(
        user_priv_key: PrivKey,
        private_store_read_cap: ReadCap,
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

        Ok(Self {
            site_type: SiteType::Individual((user_priv_key, private_store_read_cap)),
            id: site_pubkey,
            name: SiteName::Personal,
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
        private_store_read_cap: ReadCap,
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

        Ok(Self {
            site_type: SiteType::Individual((user_priv_key, private_store_read_cap)),
            id: site_pubkey,
            name: SiteName::Name(name),
            public,
            protected,
            private,
            cores: vec![],
            bootstraps: vec![],
        })
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
