use async_std::stream::StreamExt;
use async_std::sync::{Mutex, MutexGuard};
use futures::{channel::mpsc, SinkExt};
use serde::de::DeserializeOwned;
use std::any::{Any, TypeId};
use std::convert::From;
use std::sync::Arc;

use crate::{connection::*, errors::ProtocolError, log, types::ProtocolMessage};
use std::marker::PhantomData;

pub trait BrokerRequest: std::fmt::Debug {
    fn send(&self) -> ProtocolMessage;
}

//pub trait BrokerResponse: TryFrom<ProtocolMessage> + std::fmt::Debug {}

impl TryFrom<ProtocolMessage> for () {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        Ok(())
    }
}

pub trait IActor: EActor {
    //fn process_request(&self, req: Box<dyn BrokerRequest>) -> Box<dyn BrokerResponse> {}
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
    A: BrokerRequest,
    B: TryFrom<ProtocolMessage, Error = ProtocolError> + std::fmt::Debug + std::marker::Sync,
> {
    id: i64,
    phantom_a: PhantomData<&'a A>,
    phantom_b: PhantomData<&'a B>,
    receiver: Receiver<ConnectionCommand>,
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

impl<
        A: BrokerRequest + 'static,
        B: TryFrom<ProtocolMessage, Error = ProtocolError>
            + std::marker::Sync
            + std::fmt::Debug
            + 'static,
    > Actor<'_, A, B>
{
    pub fn new(id: i64, initiator: bool) -> Self {
        let (mut receiver_tx, receiver) = mpsc::unbounded::<ConnectionCommand>();
        Self {
            id,
            receiver,
            receiver_tx,
            phantom_a: PhantomData,
            phantom_b: PhantomData,
            initiator,
        }
    }

    pub fn verify(&self, msg: ProtocolMessage) -> bool {
        self.initiator && msg.type_id() == TypeId::of::<B>()
            || !self.initiator && msg.type_id() == TypeId::of::<A>()
    }

    pub async fn request(
        &mut self,
        msg: impl BrokerRequest + std::marker::Sync + std::marker::Send,
        stream: Option<impl BrokerRequest + std::marker::Send>,
        fsm: Arc<Mutex<NoiseFSM>>,
    ) -> Result<B, ProtocolError> {
        //sender.send(ConnectionCommand::Msg(msg.send())).await;
        fsm.lock().await.send(msg.send()).await?;
        match self.receiver.next().await {
            Some(ConnectionCommand::Msg(msg)) => msg.try_into(),
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
