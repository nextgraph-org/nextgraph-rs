// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// This code is partly derived from work written by TG x Thoth from P2Pcollab.
// Copyright 2022 TG x Thoth
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0> 
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Repository

use crate::types::*;

impl RepositoryV0 {
    pub fn new(
        id: &PubKey,
        branches: &Vec<ObjectRef>,
        allow_ext_requests: bool,
        metadata: &Vec<u8>,
    ) -> RepositoryV0 {
        RepositoryV0 {
            id: id.clone(),
            branches: branches.clone(),
            allow_ext_requests,
            metadata: metadata.clone(),
        }
    }
}

impl Repository {
    pub fn new(
        id: &PubKey,
        branches: &Vec<ObjectRef>,
        allow_ext_requests: bool,
        metadata: &Vec<u8>,
    ) -> Repository {
        Repository::V0(RepositoryV0::new(
            id,
            branches,
            allow_ext_requests,
            metadata,
        ))
    }
}
