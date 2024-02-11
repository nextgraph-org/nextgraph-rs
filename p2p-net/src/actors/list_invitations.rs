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
use p2p_repo::log::*;
use p2p_repo::types::PubKey;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use super::StartProtocol;

/// List invitations registered on this broker
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct ListInvitationsV0 {
    /// should list only the admin invitations.
    pub admin: bool,
    /// should list only the unique invitations.
    pub unique: bool,
    /// should list only the multi invitations.
    pub multi: bool,
}

/// List invitations registered on this broker
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum ListInvitations {
    V0(ListInvitationsV0),
}

impl ListInvitations {
    pub fn admin(&self) -> bool {
        match self {
            Self::V0(o) => o.admin,
        }
    }
    pub fn unique(&self) -> bool {
        match self {
            Self::V0(o) => o.unique,
        }
    }
    pub fn multi(&self) -> bool {
        match self {
            Self::V0(o) => o.multi,
        }
    }
    pub fn get_actor(&self) -> Box<dyn EActor> {
        Actor::<ListInvitations, AdminResponse>::new_responder()
    }
}

impl TryFrom<ProtocolMessage> for ListInvitations {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::Start(StartProtocol::Admin(AdminRequest::V0(AdminRequestV0 {
            content: AdminRequestContentV0::ListInvitations(a),
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

impl From<ListInvitations> for ProtocolMessage {
    fn from(msg: ListInvitations) -> ProtocolMessage {
        unimplemented!();
    }
}

impl From<ListInvitations> for AdminRequestContentV0 {
    fn from(msg: ListInvitations) -> AdminRequestContentV0 {
        AdminRequestContentV0::ListInvitations(msg)
    }
}

impl Actor<'_, ListInvitations, AdminResponse> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, ListInvitations, AdminResponse> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = ListInvitations::try_from(msg)?;
        let res = BROKER.read().await.get_server_storage()?.list_invitations(
            req.admin(),
            req.unique(),
            req.multi(),
        );
        let response: AdminResponseV0 = res.into();
        fsm.lock().await.send(response.into()).await?;
        Ok(())
    }
}

impl From<Result<Vec<(InvitationCode, u32, Option<String>)>, ProtocolError>> for AdminResponseV0 {
    fn from(
        res: Result<Vec<(InvitationCode, u32, Option<String>)>, ProtocolError>,
    ) -> AdminResponseV0 {
        match res {
            Err(e) => AdminResponseV0 {
                id: 0,
                result: e.into(),
                content: AdminResponseContentV0::EmptyResponse,
                padding: vec![],
            },
            Ok(vec) => AdminResponseV0 {
                id: 0,
                result: 0,
                content: AdminResponseContentV0::Invitations(vec),
                padding: vec![],
            },
        }
    }
}
