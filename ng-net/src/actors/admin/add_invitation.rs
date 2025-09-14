/*
 * Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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

use super::super::StartProtocol;

use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};

/// Add invitation
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddInvitationV0 {
    pub invite_code: InvitationCode,
    pub expiry: u32,
    pub memo: Option<String>,
    pub tos_url: bool,
}

/// Add invitation
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AddInvitation {
    V0(AddInvitationV0),
}

impl AddInvitation {
    pub fn code(&self) -> &InvitationCode {
        match self {
            AddInvitation::V0(o) => &o.invite_code,
        }
    }
    pub fn expiry(&self) -> u32 {
        match self {
            AddInvitation::V0(o) => o.expiry,
        }
    }
    pub fn memo(&self) -> &Option<String> {
        match self {
            AddInvitation::V0(o) => &o.memo,
        }
    }
    pub fn tos_url(&self) -> bool {
        match self {
            AddInvitation::V0(o) => o.tos_url,
        }
    }
    pub fn get_actor(&self) -> Box<dyn EActor> {
        Actor::<AddInvitation, AdminResponse>::new_responder(0)
    }
}

impl TryFrom<ProtocolMessage> for AddInvitation {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::Start(StartProtocol::Admin(AdminRequest::V0(AdminRequestV0 {
            content: AdminRequestContentV0::AddInvitation(a),
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

impl From<AddInvitation> for ProtocolMessage {
    fn from(_msg: AddInvitation) -> ProtocolMessage {
        unimplemented!();
    }
}

impl From<AddInvitation> for AdminRequestContentV0 {
    fn from(msg: AddInvitation) -> AdminRequestContentV0 {
        AdminRequestContentV0::AddInvitation(msg)
    }
}

impl Actor<'_, AddInvitation, AdminResponse> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, AddInvitation, AdminResponse> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = AddInvitation::try_from(msg)?;
        let (url, bootstrap, sb) = {
            let broker = BROKER.read().await;
            let url = if req.tos_url() {
                broker.get_registration_url().map(|s| s.clone())
            } else {
                None
            };
            (
                url,
                broker.get_bootstrap()?.clone(),
                broker.get_server_broker()?,
            )
        };
        {
            sb.read()
                .await
                .add_invitation(req.code(), req.expiry(), req.memo())?;
        }
        let invitation = crate::types::Invitation::V0(InvitationV0::new(
            bootstrap,
            Some(req.code().get_symkey()),
            None,
            url,
        ));
        let response: AdminResponseV0 = invitation.into();
        fsm.lock().await.send(response.into()).await?;
        Ok(())
    }
}

impl From<Invitation> for AdminResponseV0 {
    fn from(res: Invitation) -> AdminResponseV0 {
        AdminResponseV0 {
            id: 0,
            result: 0,
            content: AdminResponseContentV0::Invitation(res),
            padding: vec![],
        }
    }
}
