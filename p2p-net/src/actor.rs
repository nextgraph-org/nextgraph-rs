use async_std::stream::StreamExt;
use async_std::sync::{Mutex, MutexGuard};
use futures::{channel::mpsc, SinkExt};
use serde::de::DeserializeOwned;
use std::any::{Any, TypeId};
use std::convert::From;
use std::sync::Arc;

use crate::utils::{spawn_and_log_error, Receiver, ResultSend, Sender};
use crate::{connection::*, errors::ProtocolError, log, types::ProtocolMessage};
use std::marker::PhantomData;

// pub trait BrokerRequest: std::fmt::Debug {
//     fn send(&self) -> ProtocolMessage;
// }

//pub trait BrokerResponse: TryFrom<ProtocolMessage> + std::fmt::Debug {}

impl TryFrom<ProtocolMessage> for () {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        Ok(())
    }
}

#[async_trait::async_trait]
pub trait EActor: Send + Sync + std::fmt::Debug {
    //type T: TryFrom<ProtocolMessage, Error = ProtocolError> + std::fmt::Debug;
    //async fn handle(&mut self, msg: ProtocolMessage);
    async fn respond(
        &mut self,
        msg: ProtocolMessage,
        //stream: Option<impl BrokerRequest + std::marker::Send>,
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

// #[async_trait::async_trait]
// impl<
//         A: BrokerRequest + std::marker::Sync + 'static,
//         B: TryFrom<ProtocolMessage, Error = ProtocolError>
//             + std::fmt::Debug
//             + std::marker::Sync
//             + 'static,
//     > EActor for Actor<'_, A, B>
// {
//     //type T = B;

//     // async fn handle(&mut self, msg: ProtocolMessage) {
//     //     if self.initiator && msg.type_id() == TypeId::of::<B>()
//     //         || !self.initiator && msg.type_id() == TypeId::of::<A>()
//     //     {
//     //         let _ = self.receiver_tx.send(ConnectionCommand::Msg(msg)).await;
//     //     } else {
//     //         log!("NOT OK");
//     //     }
//     // }

//     // async fn respond(id: i64, msg: A) -> Result<B, ProtocolError> {
//     //     let mut actor = Box::new(Actor::<A, B>::new(id, false));
//     //     //actor.process_request
//     //     match self.receiver.next().await {
//     //         Some(msg) => B::receive(msg),
//     //         _ => Err(ProtocolError::ActorError),
//     //     }
//     // }
// }

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

    pub async fn request(
        &mut self,
        msg: ProtocolMessage,
        //stream: Option<impl BrokerRequest + std::marker::Send>,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<SoS<B>, ProtocolError> {
        //sender.send(ConnectionCommand::Msg(msg.send())).await;
        fsm.lock().await.send(msg).await?;
        let mut receiver = self.receiver.take().unwrap();
        match receiver.next().await {
            Some(ConnectionCommand::Msg(msg)) => {
                if let ProtocolMessage::BrokerMessage(ref bm) = msg {
                    if bm.result() == ProtocolError::PartialContent.into()
                        && TypeId::of::<B>() != TypeId::of::<()>()
                    {
                        let (b_sender, b_receiver) = mpsc::unbounded::<B>();
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
                                        sos_sender.send(response.unwrap()).await;
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
