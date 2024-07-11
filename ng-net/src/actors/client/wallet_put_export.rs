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
use ng_repo::types::OverlayId;

use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};

impl WalletPutExport {
    pub fn get_actor(&self, id: i64) -> Box<dyn EActor> {
        Actor::<WalletPutExport, ()>::new_responder(id)
    }
}

impl TryFrom<ProtocolMessage> for WalletPutExport {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        let req: ClientRequestContentV0 = msg.try_into()?;
        if let ClientRequestContentV0::WalletPutExport(a) = req {
            Ok(a)
        } else {
            log_debug!("INVALID {:?}", req);
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl From<WalletPutExport> for ProtocolMessage {
    fn from(msg: WalletPutExport) -> ProtocolMessage {
        ProtocolMessage::from_client_request_v0(
            ClientRequestContentV0::WalletPutExport(msg),
            OverlayId::nil(),
        )
    }
}

impl Actor<'_, WalletPutExport, ()> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, WalletPutExport, ()> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = WalletPutExport::try_from(msg)?;
        let sb = { BROKER.read().await.get_server_broker()? };
        let mut res: Result<(), ServerError> = Ok(());

        match req {
            WalletPutExport::V0(v0) => {
                if v0.is_rendezvous {
                    res = sb
                        .read()
                        .await
                        .put_wallet_at_rendezvous(v0.rendezvous_id, v0.wallet)
                        .await;
                } else {
                    sb.read()
                        .await
                        .put_wallet_export(v0.rendezvous_id, v0.wallet)
                        .await;
                }
            }
        }

        fsm.lock()
            .await
            .send_in_reply_to(res.into(), self.id())
            .await?;
        Ok(())
    }
}
