use futures::{channel::mpsc, SinkExt};
use serde::de::DeserializeOwned;

use crate::{connection::*, errors::ProtocolError};
use std::marker::PhantomData;

pub trait BrokerRequest: DeserializeOwned {}

pub trait BrokerResponse: DeserializeOwned {
    fn test(&self);
}

impl BrokerResponse for () {
    fn test(&self) {}
}

pub trait IActor: EActor {
    fn process_request(&self) {}
}

#[async_trait::async_trait]
pub trait EActor {
    async fn handle(&mut self, cmd: ConnectionCommand);
}

pub struct Actor<'a, A: BrokerRequest, B: BrokerResponse> {
    id: i64,
    phantom_a: PhantomData<&'a A>,
    phantom_b: PhantomData<&'a B>,
    receiver: Receiver<ConnectionCommand>,
    receiver_tx: Sender<ConnectionCommand>,
}

#[async_trait::async_trait]
impl<A: BrokerRequest + std::marker::Sync, B: BrokerResponse + std::marker::Sync> EActor
    for Actor<'_, A, B>
{
    async fn handle(&mut self, cmd: ConnectionCommand) {
        let _ = self.receiver_tx.send(cmd).await;
    }
}

impl<A: BrokerRequest, B: BrokerResponse> Actor<'_, A, B> {
    pub fn new(id: i64) -> Self {
        let (mut receiver_tx, receiver) = mpsc::unbounded::<ConnectionCommand>();
        Self {
            id,
            receiver,
            receiver_tx,
            phantom_a: PhantomData,
            phantom_b: PhantomData,
        }
    }

    pub fn request(&self, msg: A, stream: Option<A>) -> Result<B, ProtocolError> {
        let b: Vec<u8> = vec![];
        let a = serde_bare::from_slice::<B>(&b).unwrap();
        Ok(a)
    }
}
