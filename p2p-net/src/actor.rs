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

use async_std::stream::StreamExt;
use async_std::sync::{Mutex, MutexGuard};
use futures::{channel::mpsc, SinkExt};
use serde::de::DeserializeOwned;
use std::any::{Any, TypeId};
use std::convert::From;
use std::sync::Arc;

use crate::utils::{spawn_and_log_error, Receiver, ResultSend, Sender};
use crate::{connection::*, errors::ProtocolError, types::ProtocolMessage};
use std::marker::PhantomData;

impl TryFrom<ProtocolMessage> for () {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
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
    initiator: bool,
}

pub enum SoS<B> {
    Single(B),
    Stream(Receiver<B>),
}

impl<B> SoS<B> {
    pub fn is_single(&self) -> bool {
        if let Self::Single(b) = self {
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
            Self::Stream(s) => {
                panic!("called `unwrap_single()` on a `Stream` value")
            }
        }
    }
    pub fn unwrap_stream(self) -> Receiver<B> {
        match self {
            Self::Stream(s) => s,
            Self::Single(s) => {
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
    pub fn new(id: i64, initiator: bool) -> Self {
        let (mut receiver_tx, receiver) = mpsc::unbounded::<ConnectionCommand>();
        Self {
            id,
            receiver: Some(receiver),
            receiver_tx,
            phantom_a: PhantomData,
            phantom_b: PhantomData,
            initiator,
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
    ) -> Result<SoS<B>, ProtocolError> {
        fsm.lock().await.send(msg).await?;
        let mut receiver = self.receiver.take().unwrap();
        match receiver.next().await {
            Some(ConnectionCommand::Msg(msg)) => {
                if let ProtocolMessage::BrokerMessage(ref bm) = msg {
                    if bm.result() == ProtocolError::PartialContent.into()
                        && TypeId::of::<B>() != TypeId::of::<()>()
                    {
                        let (mut b_sender, b_receiver) = mpsc::unbounded::<B>();
                        let response = msg.try_into().map_err(|e| ProtocolError::ActorError)?;
                        b_sender
                            .send(response)
                            .await
                            .map_err(|err| ProtocolError::IoError)?;
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
                                    if let ProtocolMessage::BrokerMessage(ref bm) = msg {
                                        if bm.result() == ProtocolError::EndOfStream.into() {
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
                                        // todo deal with error (not a brokermessage)
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
                let response: B = msg.try_into()?;
                Ok(SoS::<B>::Single(response))
            }
            _ => Err(ProtocolError::ActorError),
        }
    }

    pub fn new_responder() -> Box<Self> {
        Box::new(Self::new(0, false))
    }

    pub fn get_receiver_tx(&self) -> Sender<ConnectionCommand> {
        self.receiver_tx.clone()
    }
}

mod test {

    use crate::actor::*;
    use crate::actors::*;
    use crate::types::*;

    #[async_std::test]
    pub async fn test_actor() {
        let mut a = Actor::<Noise, Noise>::new(1, true);
        // a.handle(ProtocolMessage::Start(StartProtocol::Client(
        //     ClientHello::Noise3(Noise::V0(NoiseV0 { data: vec![] })),
        // )))
        // .await;
        // a.handle(ProtocolMessage::Noise(Noise::V0(NoiseV0 { data: vec![] })))
        //     .await;
    }
}
