// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
use p2p_net::types::{BrokerOverlayConfigV0, ListenerV0, RegistrationConfig};
use p2p_repo::types::{PrivKey, PubKey};
use serde::{Deserialize, Serialize};

/// DaemonConfig Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DaemonConfigV0 {
    /// List of listeners for TCP (HTTP) incoming connections
    pub listeners: Vec<ListenerV0>,

    pub overlays_configs: Vec<BrokerOverlayConfigV0>,

    pub registration: RegistrationConfig,

    pub admin_user: Option<PubKey>,

    pub registration_url: Option<String>,
}

/// Daemon config
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum DaemonConfig {
    V0(DaemonConfigV0),
}
