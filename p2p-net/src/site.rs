/*
 * Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
*/

use crate::types::{SiteStore, SiteType, SiteV0};

use p2p_repo::errors::NgError;
use p2p_repo::types::{BlockRef, PrivKey, SymKey};
use p2p_repo::utils::{generate_keypair, sign, verify};

impl SiteV0 {
    // pub fn site_identity(&self) -> &Identity {
    //     match site_type {
    //         SiteType::Individual => {
    //             Identity::IndividualSite(self.site_key);
    //         }
    //         SiteType::Org => {
    //             Identity::OrgPublic(self.public_key)
    //         }
    //     }
    // }
    pub fn create(site_type: SiteType) -> Result<Self, NgError> {
        let site_key = PrivKey::random_ed();

        let public_key = PrivKey::random_ed();

        let protected_key = PrivKey::random_ed();

        let private_key = PrivKey::random_ed();

        let public = SiteStore {
            key: PrivKey::dummy(),
            root_branch_def_ref: BlockRef::dummy(),
            repo_secret: SymKey::random(),
        };

        let protected = SiteStore {
            key: PrivKey::dummy(),
            root_branch_def_ref: BlockRef::dummy(),
            repo_secret: SymKey::random(),
        };

        let private = SiteStore {
            key: PrivKey::dummy(),
            root_branch_def_ref: BlockRef::dummy(),
            repo_secret: SymKey::random(),
        };

        Ok(Self {
            site_type,
            site_key,
            public,
            protected,
            private,
            cores: vec![],
            bootstraps: vec![],
        })
    }
}
