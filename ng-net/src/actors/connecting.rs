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

use std::sync::Arc;

use async_std::sync::Mutex;
use serde::{Deserialize, Serialize};

use ng_repo::errors::*;

use crate::connection::NoiseFSM;
use crate::{actor::*, types::ProtocolMessage};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Connecting();

impl From<Connecting> for ProtocolMessage {
    fn from(_msg: Connecting) -> ProtocolMessage {
        unimplemented!();
    }
}

impl Actor<'_, Connecting, ()> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, Connecting, ()> {
    async fn respond(
        &mut self,
        _msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        fsm.lock().await.remove_actor(0).await;
        Ok(())
    }
}
