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

impl AppRequest {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<AppRequest, AppResponse>::new_responder(id)
    }
}

impl TryFrom<ProtocolMessage> for AppRequest {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let AppMessageContentV0::Request(req) = msg.try_into()? {
            Ok(req)
        } else {
            log_debug!("INVALID AppMessageContentV0::Request");
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<AppRequest> for ProtocolMessage {
    fn from(request: AppRequest) -> ProtocolMessage {
        AppMessageContentV0::Request(request).into()
    }
}

impl From<AppMessageContentV0> for ProtocolMessage {
    fn from(content: AppMessageContentV0) -> ProtocolMessage {
        AppMessage::V0(AppMessageV0 {
            content,
            id: 0,
            result: 0,
        })
        .into()
    }
}

impl TryFrom<ProtocolMessage> for AppResponse {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let AppMessageContentV0::Response(res) = msg.try_into()? {
            Ok(res)
        } else {
            log_info!("INVALID AppMessageContentV0::Response");
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl TryFrom<ProtocolMessage> for AppMessageContentV0 {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::AppMessage(AppMessage::V0(AppMessageV0 {
            content, result, ..
        })) = msg
        {
            let err = ServerError::try_from(result).unwrap();
            if !err.is_err() {
                Ok(content)
            } else {
                Err(ProtocolError::ServerError)
            }
        } else {
            log_info!("INVALID AppMessageContentV0 {:?}", msg);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<AppResponse> for AppMessage {
    fn from(response: AppResponse) -> AppMessage {
        AppMessage::V0(AppMessageV0 {
            content: AppMessageContentV0::Response(response),
            id: 0,
            result: 0,
        })
    }
}

impl From<AppResponse> for ProtocolMessage {
    fn from(response: AppResponse) -> ProtocolMessage {
        response.into()
    }
}

impl Actor<'_, AppRequest, AppResponse> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, AppRequest, AppResponse> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = AppRequest::try_from(msg)?;
        let res = {
            let sb = { BROKER.read().await.get_server_broker()? };
            let lock = sb.read().await;
            lock.app_process_request(req, self.id(), &fsm).await
        };
        if res.is_err() {
            let server_err: ServerError = res.unwrap_err().into();
            let app_message: AppMessage = server_err.into();
            fsm.lock()
                .await
                .send_in_reply_to(app_message.into(), self.id())
                .await?;
        }
        Ok(())
    }
}
