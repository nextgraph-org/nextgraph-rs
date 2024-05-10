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

//! Actor handles messages in the Protocol. common types are here

use std::any::TypeId;
use std::marker::PhantomData;
use std::sync::Arc;

use async_std::stream::StreamExt;
use async_std::sync::Mutex;
use futures::{channel::mpsc, SinkExt};

use ng_repo::errors::{NgError, ProtocolError, ServerError};
use ng_repo::log::*;

use crate::utils::{spawn_and_log_error, Receiver, ResultSend, Sender};
use crate::{connection::*, types::ProtocolMessage};

impl TryFrom<ProtocolMessage> for () {
    type Error = ProtocolError;
    fn try_from(_msg: ProtocolMessage) -> Result<Self, Self::Error> {
        Ok(())
    }
}

#[async_trait::async_trait]
pub trait EActor: Send + Sync + std::fmt::Debug {
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<(), ProtocolError>;

    fn set_id(&mut self, _id: i64) {}
}

#[derive(Debug)]
pub struct Actor<
    'a,
    A: Into<ProtocolMessage> + std::fmt::Debug,
    B: TryFrom<ProtocolMessage, Error = ProtocolError> + std::fmt::Debug + Sync,
> {
    id: i64,
    phantom_a: PhantomData<&'a A>,
    phantom_b: PhantomData<&'a B>,
    receiver: Option<Receiver<ConnectionCommand>>,
    receiver_tx: Sender<ConnectionCommand>,
    //initiator: bool,
}

pub enum SoS<B> {
    Single(B),
    Stream(Receiver<B>),
}

impl<B> SoS<B> {
    pub fn is_single(&self) -> bool {
        if let Self::Single(_b) = self {
            true
        } else {
            false
        }
    }
    pub fn is_stream(&self) -> bool {
        !self.is_single()
    }
    pub fn unwrap_single(self) -> B {
        match self {
            Self::Single(s) => s,
            Self::Stream(_s) => {
                panic!("called `unwrap_single()` on a `Stream` value")
            }
        }
    }
    pub fn unwrap_stream(self) -> Receiver<B> {
        match self {
            Self::Stream(s) => s,
            Self::Single(_s) => {
                panic!("called `unwrap_stream()` on a `Single` value")
            }
        }
    }
}

impl<
        A: Into<ProtocolMessage> + std::fmt::Debug + 'static,
        B: TryFrom<ProtocolMessage, Error = ProtocolError> + Sync + Send + std::fmt::Debug + 'static,
    > Actor<'_, A, B>
{
    pub fn new(id: i64, _initiator: bool) -> Self {
        let (receiver_tx, receiver) = mpsc::unbounded::<ConnectionCommand>();
        Self {
            id,
            receiver: Some(receiver),
            receiver_tx,
            phantom_a: PhantomData,
            phantom_b: PhantomData,
            //initiator,
        }
    }

    // pub fn verify(&self, msg: ProtocolMessage) -> bool {
    //     self.initiator && msg.type_id() == TypeId::of::<B>()
    //         || !self.initiator && msg.type_id() == TypeId::of::<A>()
    // }

    pub fn detach_receiver(&mut self) -> Receiver<ConnectionCommand> {
        self.receiver.take().unwrap()
    }

    pub async fn request(
        &mut self,
        msg: ProtocolMessage,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<SoS<B>, NgError> {
        fsm.lock().await.send(msg).await?;
        let mut receiver = self.receiver.take().unwrap();
        match receiver.next().await {
            Some(ConnectionCommand::Msg(msg)) => {
                if let ProtocolMessage::ClientMessage(ref bm) = msg {
                    if bm.result() == Into::<u16>::into(ServerError::PartialContent)
                        && TypeId::of::<B>() != TypeId::of::<()>()
                    {
                        let (mut b_sender, b_receiver) = mpsc::unbounded::<B>();
                        let response = msg.try_into().map_err(|e| {
                            log_err!("msg.try_into {}", e);
                            ProtocolError::ActorError
                        })?;
                        b_sender
                            .send(response)
                            .await
                            .map_err(|_err| ProtocolError::IoError)?;
                        async fn pump_stream<C: TryFrom<ProtocolMessage, Error = ProtocolError>>(
                            mut actor_receiver: Receiver<ConnectionCommand>,
                            mut sos_sender: Sender<C>,
                            fsm: Arc<Mutex<NoiseFSM>>,
                            id: i64,
                        ) -> ResultSend<()> {
                            async move {
                                while let Some(ConnectionCommand::Msg(msg)) =
                                    actor_receiver.next().await
                                {
                                    if let ProtocolMessage::ClientMessage(ref bm) = msg {
                                        if bm.result()
                                            == Into::<u16>::into(ServerError::EndOfStream)
                                        {
                                            break;
                                        }
                                        let response = msg.try_into();
                                        if response.is_err() {
                                            // TODO deal with errors.
                                            break;
                                        }
                                        if sos_sender.send(response.unwrap()).await.is_err() {
                                            break;
                                        }
                                    } else {
                                        // todo deal with error (not a ClientMessage)
                                        break;
                                    }
                                }
                                fsm.lock().await.remove_actor(id).await;
                            }
                            .await;
                            Ok(())
                        }
                        spawn_and_log_error(pump_stream::<B>(
                            receiver,
                            b_sender,
                            Arc::clone(&fsm),
                            self.id,
                        ));
                        return Ok(SoS::<B>::Stream(b_receiver));
                    }
                }
                fsm.lock().await.remove_actor(self.id).await;
                let server_error: Result<ServerError, NgError> = (&msg).try_into();
                let response: B = match msg.try_into() {
                    Ok(b) => b,
                    Err(ProtocolError::ServerError) => {
                        return Err(NgError::ServerError(server_error?));
                    }
                    Err(e) => return Err(NgError::ProtocolError(e)),
                };
                Ok(SoS::<B>::Single(response))
            }
            Some(ConnectionCommand::ProtocolError(e)) => Err(e.into()),
            Some(ConnectionCommand::Error(e)) => Err(ProtocolError::from(e).into()),
            Some(ConnectionCommand::Close) => Err(ProtocolError::Closing.into()),
            _ => Err(ProtocolError::ActorError.into()),
        }
    }

    pub fn new_responder(id: i64) -> Box<Self> {
        Box::new(Self::new(id, false))
    }

    pub fn get_receiver_tx(&self) -> Sender<ConnectionCommand> {
        self.receiver_tx.clone()
    }

    pub fn id(&self) -> i64 {
        self.id
    }
}

#[cfg(test)]
mod test {

    use crate::actor::*;
    use crate::actors::*;

    #[async_std::test]
    pub async fn test_actor() {
        let _a = Actor::<Noise, Noise>::new(1, true);
        // a.handle(ProtocolMessage::Start(StartProtocol::Client(
        //     ClientHello::Noise3(Noise::V0(NoiseV0 { data: vec![] })),
        // )))
        // .await;
        // a.handle(ProtocolMessage::Noise(Noise::V0(NoiseV0 { data: vec![] })))
        //     .await;
    }
}
