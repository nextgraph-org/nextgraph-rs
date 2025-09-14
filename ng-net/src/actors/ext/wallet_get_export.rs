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

use async_std::stream::StreamExt;
use async_std::sync::Mutex;

use ng_repo::errors::*;
use ng_repo::log::*;

use super::super::StartProtocol;

use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};

impl ExtWalletGetExportV0 {
    pub fn get_actor(&self) -> Box<dyn EActor> {
        Actor::<ExtWalletGetExportV0, ExportedWallet>::new_responder(0)
    }
}

impl TryFrom<ProtocolMessage> for ExtWalletGetExportV0 {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::Start(StartProtocol::Ext(ExtRequest::V0(ExtRequestV0 {
            content: ExtRequestContentV0::WalletGetExport(a),
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

impl From<ExtWalletGetExportV0> for ProtocolMessage {
    fn from(_msg: ExtWalletGetExportV0) -> ProtocolMessage {
        unimplemented!();
    }
}

impl From<ExtWalletGetExportV0> for ExtRequestContentV0 {
    fn from(msg: ExtWalletGetExportV0) -> ExtRequestContentV0 {
        ExtRequestContentV0::WalletGetExport(msg)
    }
}

impl TryFrom<ProtocolMessage> for ExportedWallet {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<ExportedWallet, Self::Error> {
        let content: ExtResponseContentV0 = msg.try_into()?;
        if let ExtResponseContentV0::Wallet(res) = content {
            Ok(res)
        } else {
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl Actor<'_, ExtWalletGetExportV0, ExportedWallet> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, ExtWalletGetExportV0, ExportedWallet> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = ExtWalletGetExportV0::try_from(msg)?;
        let result = if req.is_rendezvous {
            let mut receiver = {
                let broker = BROKER.read().await;
                let sb = broker.get_server_broker()?;
                let lock = sb.read().await;
                lock.wait_for_wallet_at_rendezvous(req.id).await
            };

            match receiver.next().await {
                None => Err(ServerError::BrokerError),
                Some(Err(e)) => Err(e),
                Some(Ok(w)) => Ok(ExtResponseContentV0::Wallet(w)),
            }
        } else {
            {
                let broker = BROKER.read().await;
                let sb = broker.get_server_broker()?;
                let lock = sb.read().await;
                lock.get_wallet_export(req.id).await
            }
            .map(|wallet| ExtResponseContentV0::Wallet(wallet))
        };
        let response: ExtResponseV0 = result.into();
        fsm.lock().await.send(response.into()).await?;
        Ok(())
    }
}
