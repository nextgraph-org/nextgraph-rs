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
use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, errors::ProtocolError, types::ProtocolMessage};

use async_std::sync::Mutex;
use p2p_repo::log::*;
use p2p_repo::types::PubKey;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use super::StartProtocol;

/// List users registered on this broker
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct ListUsersV0 {
    /// should list only the admins. if false, admin users will be excluded
    pub admins: bool,
}

/// List users registered on this broker
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum ListUsers {
    V0(ListUsersV0),
}

impl ListUsers {
    pub fn admins(&self) -> bool {
        match self {
            Self::V0(o) => o.admins,
        }
    }
    pub fn get_actor(&self) -> Box<dyn EActor> {
        Actor::<ListUsers, AdminResponse>::new_responder()
    }
}

impl TryFrom<ProtocolMessage> for ListUsers {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::Start(StartProtocol::Admin(AdminRequest::V0(AdminRequestV0 {
            content: AdminRequestContentV0::ListUsers(a),
            ..
        }))) = msg
        {
            Ok(a)
        } else {
            //log_debug!("INVALID {:?}", msg);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<ListUsers> for ProtocolMessage {
    fn from(msg: ListUsers) -> ProtocolMessage {
        unimplemented!();
    }
}

impl From<ListUsers> for AdminRequestContentV0 {
    fn from(msg: ListUsers) -> AdminRequestContentV0 {
        AdminRequestContentV0::ListUsers(msg)
    }
}

impl Actor<'_, ListUsers, AdminResponse> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, ListUsers, AdminResponse> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = ListUsers::try_from(msg)?;
        let res = BROKER
            .read()
            .await
            .get_server_storage()?
            .list_users(req.admins());
        let response: AdminResponseV0 = res.into();
        fsm.lock().await.send(response.into()).await?;
        Ok(())
    }
}
