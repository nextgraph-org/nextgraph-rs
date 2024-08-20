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
use ng_repo::object::Object;
use ng_repo::store::Store;
use ng_repo::types::Block;

use super::super::StartProtocol;

use crate::broker::BROKER;
use crate::connection::NoiseFSM;
use crate::types::*;
use crate::{actor::*, types::ProtocolMessage};

impl ExtObjectGetV0 {
    pub fn get_actor(&self) -> Box<dyn EActor> {
        Actor::<ExtObjectGetV0, Vec<Block>>::new_responder(0)
    }
}

impl TryFrom<ProtocolMessage> for ExtObjectGetV0 {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::Start(StartProtocol::Ext(ExtRequest::V0(ExtRequestV0 {
            content: ExtRequestContentV0::ExtObjectGet(a),
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

impl From<ExtObjectGetV0> for ProtocolMessage {
    fn from(_msg: ExtObjectGetV0) -> ProtocolMessage {
        unimplemented!();
    }
}

impl From<ExtObjectGetV0> for ExtRequestContentV0 {
    fn from(msg: ExtObjectGetV0) -> ExtRequestContentV0 {
        ExtRequestContentV0::ExtObjectGet(msg)
    }
}

impl TryFrom<ProtocolMessage> for Vec<Block> {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Vec<Block>, Self::Error> {
        let content: ExtResponseContentV0 = msg.try_into()?;
        if let ExtResponseContentV0::Blocks(res) = content {
            Ok(res)
        } else {
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl Actor<'_, ExtObjectGetV0, Vec<Block>> {}

#[async_trait::async_trait]
impl EActor for Actor<'_, ExtObjectGetV0, Vec<Block>> {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError> {
        let req = ExtObjectGetV0::try_from(msg)?;
        let sb = {
            let broker = BROKER.read().await;
            broker.get_server_broker()?
        };
        let lock = sb.read().await;
        let store = Store::new_from_overlay_id(&req.overlay, lock.get_block_storage());
        let mut blocks = Vec::new();
        for obj_id in req.ids {
            // TODO: deal with RandomAccessFiles (or is it just working?)
            if let Ok(obj) = Object::load_without_header(obj_id, None, &store) {
                blocks.append(&mut obj.into_blocks());
                //TODO: load the obj.files too (if req.include_files)
            }
        }
        let response: ExtResponseV0 = Ok(ExtResponseContentV0::Blocks(blocks)).into();
        fsm.lock().await.send(response.into()).await?;
        Ok(())
    }
}
