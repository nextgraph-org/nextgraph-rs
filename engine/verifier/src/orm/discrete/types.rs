// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use ng_net::app_protocol::AppResponse;
use ng_net::app_protocol::NuriV0;
use ng_net::utils::Sender;
use ng_repo::types::BranchId;

#[derive(Debug)]
pub struct DiscreteOrmSubscription {
    pub nuri: NuriV0,
    pub branch_id: BranchId,
    pub subscription_id: u64,
    pub sender: Sender<AppResponse>,
}

#[derive(Debug)]
pub enum BackendDiscreteState {
    YMap(yrs::Doc),
    YArray(yrs::Doc),
    Automerge(automerge::Automerge),
}
