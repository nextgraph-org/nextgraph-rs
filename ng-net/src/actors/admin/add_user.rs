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
use ng_repo::log::*;
use ng_repo::types::PubKey;

use super::super::StartProtocol;

use crate::broker::{ServerConfig, BROKER};
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};

/// Add user account
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct AddUserV0 {
    /// User pub key
    pub user: PubKey,
    /// should the newly added user be an admin of the server
    pub is_admin: bool,
}

/// Add user account
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum AddUser {
    V0(AddUserV0),
}

impl AddUser {
    pub fn user(&self) -> PubKey {
        match self {
            AddUser::V0(o) => o.user,
        }
    }
    pub fn is_admin(&self) -> bool {
        match self {
            AddUser::V0(o) => o.is_admin,
        }
    }
    pub fn get_actor(&self) -> Box<dyn EActor> {
        Actor::<AddUser, AdminResponse>::new_responder(0)
    }
}

impl TryFrom<ProtocolMessage> for AddUser {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::Start(StartProtocol::Admin(AdminRequest::V0(AdminRequestV0 {
            content: AdminRequestContentV0::AddUser(a),
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

impl From<AddUser> for ProtocolMessage {
    fn from(_msg: AddUser) -> ProtocolMessage {
        unimplemented!();
    }
}

impl From<AddUser> for AdminRequestContentV0 {
    fn from(msg: AddUser) -> AdminRequestContentV0 {
        AdminRequestContentV0::AddUser(msg)
    }
}

impl Actor<'_, AddUser, AdminResponse> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, AddUser, AdminResponse> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = AddUser::try_from(msg)?;

        let res = {
            let mut is_admin = req.is_admin();
            let sb = {
                let broker = BROKER.read().await;
                if let Some(ServerConfig {
                    admin_user: Some(admin_user),
                    ..
                }) = broker.get_config()
                {
                    if *admin_user == req.user() {
                        is_admin = true;
                    }
                }
                broker.get_server_broker()?
            };

            let lock = sb.read().await;
            lock.add_user(req.user(), is_admin)
        };
        let response: AdminResponseV0 = res.into();
        fsm.lock().await.send(response.into()).await?;
        Ok(())
    }
}
