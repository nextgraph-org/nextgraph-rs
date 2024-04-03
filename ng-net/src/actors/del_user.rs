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
use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, errors::ProtocolError, types::ProtocolMessage};
use async_std::sync::Mutex;
use ng_repo::types::PubKey;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use super::StartProtocol;

/// Delete user account V0
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct DelUserV0 {
    /// User pub key
    pub user: PubKey,
}

/// Delete user account
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum DelUser {
    V0(DelUserV0),
}

impl DelUser {
    pub fn user(&self) -> PubKey {
        match self {
            DelUser::V0(o) => o.user,
        }
    }
    pub fn get_actor(&self) -> Box<dyn EActor> {
        Actor::<DelUser, AdminResponse>::new_responder()
    }
}

impl TryFrom<ProtocolMessage> for DelUser {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::Start(StartProtocol::Admin(AdminRequest::V0(AdminRequestV0 {
            content: AdminRequestContentV0::DelUser(a),
            ..
        }))) = msg
        {
            Ok(a)
        } else {
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<DelUser> for ProtocolMessage {
    fn from(msg: DelUser) -> ProtocolMessage {
        unimplemented!();
    }
}

impl From<DelUser> for AdminRequestContentV0 {
    fn from(msg: DelUser) -> AdminRequestContentV0 {
        AdminRequestContentV0::DelUser(msg)
    }
}

impl Actor<'_, DelUser, AdminResponse> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, DelUser, AdminResponse> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = DelUser::try_from(msg)?;
        let broker = BROKER.read().await;
        let res = broker.get_server_storage()?.del_user(req.user());
        let response: AdminResponseV0 = res.into();
        fsm.lock().await.send(response.into()).await?;
        Ok(())
    }
}
