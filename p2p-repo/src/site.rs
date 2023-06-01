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

use crate::errors::NgError;
use crate::types::{Identity, Site, SiteType};
use crate::utils::{generate_keypair, sign, verify};

impl Site {
    pub fn create(site_type: SiteType) -> Result<Self, NgError> {
        let (site_key, side_id) = generate_keypair();

        let (public_key, public_id) = generate_keypair();

        let (protected_key, protected_id) = generate_keypair();

        let (private_key, private_id) = generate_keypair();

        let site_identity;
        let public_identity;
        let protected_identity;
        let private_identity;

        match site_type {
            SiteType::Individual => {
                site_identity = Identity::IndividualSite(side_id);
                public_identity = Identity::IndividualPublic(public_id);
                protected_identity = Identity::IndividualProtected(protected_id);
                private_identity = Identity::IndividualPrivate(private_id);
            }
            SiteType::Org => {
                site_identity = Identity::OrgSite(side_id);
                public_identity = Identity::OrgPublic(public_id);
                protected_identity = Identity::OrgProtected(protected_id);
                private_identity = Identity::OrgPrivate(private_id);
            }
        }

        let public_sig = sign(
            site_key,
            side_id,
            &serde_bare::to_vec(&public_identity).unwrap(),
        )?;

        let protected_sig = sign(
            site_key,
            side_id,
            &serde_bare::to_vec(&protected_identity).unwrap(),
        )?;

        let private_sig = sign(
            site_key,
            side_id,
            &serde_bare::to_vec(&private_identity).unwrap(),
        )?;

        Ok(Self {
            site_type,
            site_identity,
            site_key,
            public_identity,
            public_key,
            public_sig,
            protected_identity,
            protected_key,
            protected_sig,
            private_identity,
            private_key,
            private_sig,
        })
    }
}
