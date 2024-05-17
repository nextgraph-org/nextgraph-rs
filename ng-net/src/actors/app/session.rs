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

use ng_repo::errors::*;
use ng_repo::log::*;

use crate::app_protocol::*;
use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};

impl AppSessionStart {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<AppSessionStart, AppSessionStartResponse>::new_responder(id)
    }
}

impl TryFrom<ProtocolMessage> for AppSessionStart {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let AppMessageContentV0::SessionStart(req) = msg.try_into()? {
            Ok(req)
        } else {
            log_debug!("INVALID AppMessageContentV0::SessionStart");
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<AppSessionStart> for ProtocolMessage {
    fn from(request: AppSessionStart) -> ProtocolMessage {
        AppMessageContentV0::SessionStart(request).into()
    }
}

impl TryFrom<ProtocolMessage> for AppSessionStartResponse {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let AppMessageContentV0::Response(AppResponse::V0(AppResponseV0::SessionStart(res))) =
            msg.try_into()?
        {
            Ok(res)
        } else {
            log_debug!("INVALID AppSessionStartResponse");
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<AppSessionStartResponse> for AppMessage {
    fn from(response: AppSessionStartResponse) -> AppMessage {
        AppResponse::V0(AppResponseV0::SessionStart(response)).into()
    }
}

impl From<AppSessionStartResponse> for ProtocolMessage {
    fn from(response: AppSessionStartResponse) -> ProtocolMessage {
        response.into()
    }
}

impl Actor<'_, AppSessionStart, AppSessionStartResponse> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, AppSessionStart, AppSessionStartResponse> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = AppSessionStart::try_from(msg)?;
        let res = {
            let lock = fsm.lock().await;
            let remote = lock.remote_peer();

            //TODO: if fsm.get_user_id is some, check that user_priv_key in credentials matches.
            //TODO: if no user in fsm (headless), check user in request is allowed
            if remote.is_none() {
                Err(ServerError::BrokerError)
            } else {
                let (sb, broker_id) = {
                    let b = BROKER.read().await;
                    (b.get_server_broker()?, b.get_server_peer_id())
                };
                let lock = sb.read().await;
                lock.app_session_start(req, remote.unwrap(), broker_id)
                    .await
            }
        };
        let app_message: AppMessage = match res {
            Err(e) => e.into(),
            Ok(o) => o.into(),
        };
        fsm.lock()
            .await
            .send_in_reply_to(app_message.into(), self.id())
            .await?;
        Ok(())
    }
}

///////////////////////

impl AppSessionStop {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<AppSessionStop, EmptyAppResponse>::new_responder(id)
    }
}

impl TryFrom<ProtocolMessage> for AppSessionStop {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let AppMessageContentV0::SessionStop(req) = msg.try_into()? {
            Ok(req)
        } else {
            log_debug!("INVALID AppMessageContentV0::SessionStop");
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl TryFrom<ProtocolMessage> for EmptyAppResponse {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let res: Result<AppMessageContentV0, ProtocolError> = msg.try_into();
        if let AppMessageContentV0::EmptyResponse = res? {
            Ok(EmptyAppResponse(()))
        } else {
            log_debug!("INVALID AppMessageContentV0::EmptyResponse");
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<AppSessionStop> for ProtocolMessage {
    fn from(request: AppSessionStop) -> ProtocolMessage {
        AppMessageContentV0::SessionStop(request).into()
    }
}

impl From<Result<EmptyAppResponse, ServerError>> for ProtocolMessage {
    fn from(res: Result<EmptyAppResponse, ServerError>) -> ProtocolMessage {
        match res {
            Ok(_a) => ServerError::Ok.into(),
            Err(err) => AppMessage::V0(AppMessageV0 {
                id: 0,
                result: err.into(),
                content: AppMessageContentV0::EmptyResponse,
            }),
        }
        .into()
    }
}

impl Actor<'_, AppSessionStop, EmptyAppResponse> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, AppSessionStop, EmptyAppResponse> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = AppSessionStop::try_from(msg)?;
        let res = {
            let lock = fsm.lock().await;
            let remote = lock.remote_peer();

            if remote.is_none() {
                Err(ServerError::BrokerError)
            } else {
                let sb = { BROKER.read().await.get_server_broker()? };
                let lock = sb.read().await;
                lock.app_session_stop(req, remote.as_ref().unwrap()).await
            }
        };

        fsm.lock()
            .await
            .send_in_reply_to(res.into(), self.id())
            .await?;
        Ok(())
    }
}
