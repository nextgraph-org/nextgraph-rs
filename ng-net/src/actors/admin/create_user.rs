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
use ng_repo::types::UserId;
use serde::{Deserialize, Serialize};

use ng_repo::errors::*;
use ng_repo::log::*;

use super::super::StartProtocol;

use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};

/// Create user and keeps credentials in the server (for use with headless API)
#[doc(hidden)]
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct CreateUserV0 {}

/// Create user
#[doc(hidden)]
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum CreateUser {
    V0(CreateUserV0),
}

impl TryFrom<ProtocolMessage> for CreateUser {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::Start(StartProtocol::Admin(AdminRequest::V0(AdminRequestV0 {
            content: AdminRequestContentV0::CreateUser(a),
            ..
        }))) = msg
        {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", msg);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<CreateUser> for ProtocolMessage {
    fn from(_msg: CreateUser) -> ProtocolMessage {
        unimplemented!();
    }
}

impl From<UserId> for ProtocolMessage {
    fn from(_msg: UserId) -> ProtocolMessage {
        unimplemented!();
    }
}

impl TryFrom<ProtocolMessage> for UserId {
    type Error = ProtocolError;
    fn try_from(_msg: ProtocolMessage) -> Result<Self, Self::Error> {
        unimplemented!();
    }
}

impl From<CreateUser> for AdminRequestContentV0 {
    fn from(msg: CreateUser) -> AdminRequestContentV0 {
        AdminRequestContentV0::CreateUser(msg)
    }
}

impl CreateUser {
    pub fn get_actor(&self) -> Box<dyn EActor> {
        Actor::<CreateUser, UserId>::new_responder(0)
    }
}

impl Actor<'_, CreateUser, UserId> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, CreateUser, UserId> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let _req = CreateUser::try_from(msg)?;

        let res = {
            let (broker_id, sb) = {
                let b = BROKER.read().await;
                (b.get_server_peer_id(), b.get_server_broker()?)
            };
            let lock = sb.read().await;
            lock.create_user(&broker_id).await
        };

        let response: AdminResponseV0 = res.into();
        fsm.lock().await.send(response.into()).await?;
        Ok(())
    }
}
