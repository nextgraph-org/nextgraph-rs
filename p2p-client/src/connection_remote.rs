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

use async_std::task;
use async_std::sync::Mutex;
use futures::{
    ready,
    stream::Stream,
    task::{Context, Poll},
    Future,
    select, FutureExt,
};
use futures::channel::mpsc;
use std::pin::Pin;
use std::{collections::HashSet, fmt::Debug};

use async_oneshot::oneshot;
use debug_print::*;
use futures::{pin_mut, stream, Sink, SinkExt, StreamExt};
use p2p_repo::object::*;
use p2p_repo::store::*;
use p2p_repo::types::*;
use p2p_repo::utils::*;
use p2p_net::errors::*;
use p2p_net::types::*;
use p2p_net::broker_connection::*;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use xactor::{message, spawn, Actor, Addr, Handler, WeakAddr};


#[message]
struct BrokerMessageXActor(BrokerMessage);

struct BrokerMessageActor {
    r: Option<async_oneshot::Receiver<BrokerMessage>>,
    s: async_oneshot::Sender<BrokerMessage>,
}

impl Actor for BrokerMessageActor {}

impl BrokerMessageActor {
    fn new() -> BrokerMessageActor {
        let (s, r) = oneshot::<BrokerMessage>();
        BrokerMessageActor { r: Some(r), s }
    }
    fn resolve(&mut self, msg: BrokerMessage) {
        let _ = self.s.send(msg);
    }

    fn receiver(&mut self) -> async_oneshot::Receiver<BrokerMessage> {
        self.r.take().unwrap()
    }
}

struct BrokerMessageStreamActor {
    r: Option<async_channel::Receiver<Block>>,
    s: async_channel::Sender<Block>,
    error_r: Option<async_oneshot::Receiver<Option<ProtocolError>>>,
    error_s: Option<async_oneshot::Sender<Option<ProtocolError>>>,
}

impl Actor for BrokerMessageStreamActor {}

impl BrokerMessageStreamActor {
    fn new() -> BrokerMessageStreamActor {
        let (s, r) = async_channel::unbounded::<Block>();
        let (error_s, error_r) = oneshot::<Option<ProtocolError>>();
        BrokerMessageStreamActor {
            r: Some(r),
            s,
            error_r: Some(error_r),
            error_s: Some(error_s),
        }
    }
    async fn partial(&mut self, block: Block) -> Result<(), ProtocolError> {
        //debug_println!("GOT PARTIAL {:?}", block.id());
        self.s
            .send(block)
            .await
            .map_err(|e| ProtocolError::WriteError)
    }

    fn receiver(&mut self) -> async_channel::Receiver<Block> {
        self.r.take().unwrap()
    }

    fn error_receiver(&mut self) -> async_oneshot::Receiver<Option<ProtocolError>> {
        self.error_r.take().unwrap()
    }

    fn send_error(&mut self, err: Option<ProtocolError>) {
        if self.error_s.is_some() {
            let _ = self.error_s.take().unwrap().send(err);
            self.error_s = None;
        }
    }

    fn close(&mut self) {
        self.s.close();
    }
}

#[async_trait::async_trait]
impl Handler<BrokerMessageXActor> for BrokerMessageActor {
    async fn handle(&mut self, ctx: &mut xactor::Context<Self>, msg: BrokerMessageXActor) {
        //println!("handling {:?}", msg.0);
        self.resolve(msg.0);
        ctx.stop(None);
    }
}

#[async_trait::async_trait]
impl Handler<BrokerMessageXActor> for BrokerMessageStreamActor {
    async fn handle(&mut self, ctx: &mut xactor::Context<Self>, msg: BrokerMessageXActor) {
        //println!("handling {:?}", msg.0);
        let res: Result<Option<Block>, ProtocolError> = msg.0.into();
        match res {
            Err(e) => {
                self.send_error(Some(e));
                ctx.stop(None);
                self.close();
            }
            Ok(Some(b)) => {
                self.send_error(None);
                // it must be a partial content
                let res = self.partial(b).await;
                if let Err(e) = res {
                    ctx.stop(None);
                    self.close();
                }
            }
            Ok(None) => {
                self.send_error(None);
                ctx.stop(None);
                self.close();
            }
        }
    }
}

pub struct ConnectionRemote {}

impl ConnectionRemote {
    pub async fn ext_request<
        B: Stream<Item = Vec<u8>> + StreamExt + Send + Sync,
        A: Sink<Vec<u8>, Error = ProtocolError> + Send,
    >(
        w: A,
        r: B,
        request: ExtRequest,
    ) -> Result<ExtResponse, ProtocolError> {
        unimplemented!();
    }

    async fn close<S>(w: S, err: ProtocolError) -> ProtocolError
    where
        S: Sink<Vec<u8>, Error = ProtocolError>,
    {
        let mut writer = Box::pin(w);
        let _ = writer.send(vec![]);
        let _ = writer.close().await;
        err
    }

    pub async fn open_broker_connection<
        B: Stream<Item = Vec<u8>> + StreamExt + Send + Sync + 'static,
        A: Sink<Vec<u8>, Error = ProtocolError> + Send + 'static,
    >(
        w: A,
        r: B,
        user: PubKey,
        user_pk: PrivKey,
        client: PubKey,
    ) -> Result<impl BrokerConnection, ProtocolError> {
        let mut writer = Box::pin(w);
        writer
            .send(serde_bare::to_vec(&StartProtocol::Auth(ClientHello::V0()))?)
            .await
            .map_err(|_e| ProtocolError::WriteError)?;

        let mut reader = Box::pin(r);
        let answer = reader.next().await;
        if answer.is_none() {
            return Err(Self::close(writer, ProtocolError::InvalidState).await);
        }

        let server_hello = serde_bare::from_slice::<ServerHello>(&answer.unwrap())?;

        //debug_println!("received nonce from server: {:?}", server_hello.nonce());

        let content = ClientAuthContentV0 {
            user,
            client,
            nonce: server_hello.nonce().clone(),
        };

        let sig = sign(user_pk, user, &serde_bare::to_vec(&content)?)
            .map_err(|_e| ProtocolError::SignatureError)?;

        let auth_ser = serde_bare::to_vec(&ClientAuth::V0(ClientAuthV0 { content, sig }))?;
        //debug_println!("AUTH SENT {:?}", auth_ser);
        writer
            .send(auth_ser)
            .await
            .map_err(|_e| ProtocolError::WriteError)?;

        let answer = reader.next().await;
        if answer.is_none() {
            //return Err(ProtocolError::InvalidState);
            return Err(Self::close(writer, ProtocolError::InvalidState).await);
        }

        let auth_result = serde_bare::from_slice::<AuthResult>(&answer.unwrap())?;

        match auth_result.result() {
            0 => {
                async fn transform(message: BrokerMessage) -> Result<Vec<u8>, ProtocolError> {
                    if message.is_close() {
                        Ok(vec![])
                    } else {
                        Ok(serde_bare::to_vec(&message)?)
                    }
                }
                let messages_stream_write = writer.with(|message| transform(message));

                let mut messages_stream_read = reader.map(|message| {
                    if message.len() == 0 {
                        BrokerMessage::Close
                    } else {
                        match serde_bare::from_slice::<BrokerMessage>(&message) {
                            Err(e) => BrokerMessage::Close,
                            Ok(m) => m
                        }
                    }
                });

                let cnx =
                    BrokerConnectionRemote::open(messages_stream_write, messages_stream_read, user);

                Ok(cnx)
            }
            err => Err(Self::close(writer, ProtocolError::try_from(err).unwrap()).await),
        }
    }
}

pub struct BrokerConnectionRemote<T>
where
    T: Sink<BrokerMessage> + Send + 'static,
{
    writer: Arc<Mutex<Pin<Box<T>>>>,
    user: PubKey,
    actors: Arc<RwLock<HashMap<u64, WeakAddr<BrokerMessageActor>>>>,
    stream_actors: Arc<RwLock<HashMap<u64, WeakAddr<BrokerMessageStreamActor>>>>,
    shutdown: mpsc::UnboundedSender<Void>,
}

#[async_trait::async_trait]
impl<T> BrokerConnection for BrokerConnectionRemote<T>
where
    T: Sink<BrokerMessage> + Send,
{
    type OC = BrokerConnectionRemote<T>;
    type BlockStream = async_channel::Receiver<Block>;

    async fn close(&mut self) {
        let _ = self.shutdown.close().await;
        let mut w = self.writer.lock().await;
        let _ = w.send(BrokerMessage::Close).await;
        let _ = w.close().await;
    }

    async fn process_overlay_request_stream_response(
        &mut self,
        overlay: OverlayId,
        request: BrokerOverlayRequestContentV0,
    ) -> Result<Pin<Box<Self::BlockStream>>, ProtocolError> {
        let mut actor = BrokerMessageStreamActor::new();
        let receiver = actor.receiver();
        let error_receiver = actor.error_receiver();
        let mut addr = actor
            .start()
            .await
            .map_err(|_e| ProtocolError::ActorError)?;

        let request_id = addr.actor_id();
        //debug_println!("actor ID {}", request_id);

        {
            let mut map = self.stream_actors.write().expect("RwLock poisoned");
            map.insert(request_id, addr.downgrade());
        }

        let mut w = self.writer.lock().await;
        w.send(BrokerMessage::V0(BrokerMessageV0 {
                padding: vec![], //FIXME implement padding
                content: BrokerMessageContentV0::BrokerOverlayMessage(BrokerOverlayMessage::V0(
                    BrokerOverlayMessageV0 {
                        overlay,
                        content: BrokerOverlayMessageContentV0::BrokerOverlayRequest(
                            BrokerOverlayRequest::V0(BrokerOverlayRequestV0 {
                                id: request_id,
                                content: request,
                            }),
                        ),
                    },
                )),
            }))
            .await
            .map_err(|_e| ProtocolError::WriteError)?;

        //debug_println!("waiting for first reply");
        let reply = error_receiver.await;
        match reply {
            Err(_e) => {
                Err(ProtocolError::Closing)
            }
            Ok(Some(e)) => {
                let mut map = self.stream_actors.write().expect("RwLock poisoned");
                map.remove(&request_id);
                return Err(e);
            }
            Ok(None) => {
                let stream_actors_in_thread = Arc::clone(&self.stream_actors);
                task::spawn(async move {
                    addr.wait_for_stop().await; // TODO add timeout
                    let mut map = stream_actors_in_thread.write().expect("RwLock poisoned");
                    map.remove(&request_id);
                });

                Ok(Box::pin(receiver))
            }
        }
    }

    async fn process_overlay_request_objectid_response(
        &mut self,
        overlay: OverlayId,
        request: BrokerOverlayRequestContentV0,
    ) -> Result<ObjectId, ProtocolError> {
        before!(self, request_id, addr, receiver);

        self.writer.lock().await
            .send(BrokerMessage::V0(BrokerMessageV0 {
                padding: vec![], // FIXME implement padding
                content: BrokerMessageContentV0::BrokerOverlayMessage(BrokerOverlayMessage::V0(
                    BrokerOverlayMessageV0 {
                        overlay,
                        content: BrokerOverlayMessageContentV0::BrokerOverlayRequest(
                            BrokerOverlayRequest::V0(BrokerOverlayRequestV0 {
                                id: request_id,
                                content: request,
                            }),
                        ),
                    },
                )),
            }))
            .await
            .map_err(|_e| ProtocolError::WriteError)?;

        after!(self, request_id, addr, receiver, reply);
        reply.into()
    }

    async fn process_overlay_request(
        &mut self,
        overlay: OverlayId,
        request: BrokerOverlayRequestContentV0,
    ) -> Result<(), ProtocolError> {
        before!(self, request_id, addr, receiver);

        self.writer.lock().await
            .send(BrokerMessage::V0(BrokerMessageV0 {
                padding: vec![], // FIXME implement padding
                content: BrokerMessageContentV0::BrokerOverlayMessage(BrokerOverlayMessage::V0(
                    BrokerOverlayMessageV0 {
                        overlay,
                        content: BrokerOverlayMessageContentV0::BrokerOverlayRequest(
                            BrokerOverlayRequest::V0(BrokerOverlayRequestV0 {
                                id: request_id,
                                content: request,
                            }),
                        ),
                    },
                )),
            }))
            .await
            .map_err(|_e| ProtocolError::WriteError)?;

        after!(self, request_id, addr, receiver, reply);
        reply.into()
    }

    async fn add_user(
        &mut self,
        user_id: PubKey,
        admin_user_pk: PrivKey,
    ) -> Result<(), ProtocolError> {
        before!(self, request_id, addr, receiver);

        let op_content = AddUserContentV0 { user: user_id };

        let sig = sign(
            admin_user_pk,
            self.user,
            &serde_bare::to_vec(&op_content)?,
        )?;

        self.writer.lock().await
            .send(BrokerMessage::V0(BrokerMessageV0 {
                padding: vec![], // TODO implement padding
                content: BrokerMessageContentV0::BrokerRequest(BrokerRequest::V0(
                    BrokerRequestV0 {
                        id: request_id,
                        content: BrokerRequestContentV0::AddUser(AddUser::V0(AddUserV0 {
                            content: op_content,
                            sig,
                        })),
                    },
                )),
            }))
            .await
            .map_err(|_e| ProtocolError::WriteError)?;

        after!(self, request_id, addr, receiver, reply);
        reply.into()
    }

    async fn del_user(&mut self, user_id: PubKey, admin_user_pk: PrivKey) {}

    async fn add_client(&mut self, client_id: ClientId, user_pk: PrivKey) {}

    async fn del_client(&mut self, client_id: ClientId, user_pk: PrivKey) {}

    async fn overlay_connect(
        &mut self,
        repo_link: &RepoLink,
        public: bool,
    ) -> Result<OverlayConnectionClient<BrokerConnectionRemote<T>>, ProtocolError> {
        let overlay = self.process_overlay_connect(repo_link, public).await?;

        Ok(OverlayConnectionClient::create(self, overlay,repo_link.clone() ))
    }
}

#[derive(Debug)]
enum Void {}

impl<T> BrokerConnectionRemote<T>
where
    T: Sink<BrokerMessage> + Send,
{
    async fn connection_reader_loop<
        U: Stream<Item = BrokerMessage> + StreamExt + Send + Sync + Unpin + 'static,
    >(
        stream: U,
        actors: Arc<RwLock<HashMap<u64, WeakAddr<BrokerMessageActor>>>>,
        stream_actors: Arc<RwLock<HashMap<u64, WeakAddr<BrokerMessageStreamActor>>>>,
        shutdown: mpsc::UnboundedReceiver<Void>,
    ) -> Result<(), ProtocolError> {
        let mut s = stream.fuse();
        let mut shutdown = shutdown.fuse();
        loop {
            select! {
                void = shutdown.next().fuse() => match void {
                    Some(void) => match void {},
                    None => break,
                },
                message = s.next().fuse() => match message {
                    Some(message) => 
                    {
                        //debug_println!("GOT MESSAGE {:?}", message);

                        if message.is_close() {
                            // releasing the blocking calls on the actors

                            let map = actors.read().expect("RwLock poisoned");
                            for (a) in map.values() {
                                if let Some(mut addr) = a.upgrade() {
                                    let _ = addr.stop(Some(ProtocolError::Closing.into()));
                                }
                            }
                            let map2 = stream_actors.read().expect("RwLock poisoned");
                            for (a) in map2.values() {
                                if let Some(mut addr) = a.upgrade() {
                                    let _ = addr.stop(Some(ProtocolError::Closing.into()));
                                }
                            }
                            return Err(ProtocolError::Closing);
                        }

                        if message.is_request() {
                            debug_println!("is request {}", message.id());
                            // closing connection. a client is not supposed to receive requests.
                            return Err(ProtocolError::Closing);
                            
                        } else if message.is_response() {
                            let id = message.id();
                            //debug_println!("is response for {}", id);
                            {
                                let map = actors.read().expect("RwLock poisoned");
                                match map.get(&id) {
                                    Some(weak_addr) => match weak_addr.upgrade() {
                                        Some(addr) => {
                                            addr.send(BrokerMessageXActor(message))
                                                .map_err(|e| ProtocolError::Closing)?
                                            //.expect("sending message back to actor failed");
                                        }
                                        None => {
                                            debug_println!("ERROR. Addr is dead for ID {}", id);
                                            return Err(ProtocolError::Closing);
                                        }
                                    },
                                    None => {
                                        let map2 = stream_actors.read().expect("RwLock poisoned");
                                        match map2.get(&id) {
                                            Some(weak_addr) => match weak_addr.upgrade() {
                                                Some(addr) => {
                                                    addr.send(BrokerMessageXActor(message))
                                                        .map_err(|e| ProtocolError::Closing)?
                                                    //.expect("sending message back to stream actor failed");
                                                }
                                                None => {
                                                    debug_println!(
                                                        "ERROR. Addr is dead for ID {} {:?}",
                                                        id,
                                                        message
                                                    );
                                                    return Err(ProtocolError::Closing);
                                                }
                                            },
                                            None => {
                                                debug_println!("Actor ID not found {} {:?}", id, message);
                                                return Err(ProtocolError::Closing);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    None => break,
                }
            }
        }
        Ok(())
    }

    pub fn open<U: Stream<Item = BrokerMessage> + StreamExt + Send + Sync + Unpin + 'static>(
        writer: T,
        reader: U,
        user: PubKey,
    ) -> BrokerConnectionRemote<T> {
        let actors: Arc<RwLock<HashMap<u64, WeakAddr<BrokerMessageActor>>>> =
            Arc::new(RwLock::new(HashMap::new()));

        let stream_actors: Arc<RwLock<HashMap<u64, WeakAddr<BrokerMessageStreamActor>>>> =
            Arc::new(RwLock::new(HashMap::new()));

        let (shutdown_sender, shutdown_receiver) = mpsc::unbounded::<Void>();

        let w = Arc::new(Mutex::new(Box::pin(writer)));
        let ws_in_task = Arc::clone(&w);

        let actors_in_thread = Arc::clone(&actors);
        let stream_actors_in_thread = Arc::clone(&stream_actors);
        task::spawn(async move {
            debug_println!("START of reader loop");
            if let Err(e) =
                Self::connection_reader_loop(reader, actors_in_thread, stream_actors_in_thread, shutdown_receiver)
                    .await
            {
                debug_println!("closing because of {}", e);
                let _ = ws_in_task.lock().await.close().await;
            }
            debug_println!("END of reader loop");
        });

        BrokerConnectionRemote::<T> {
            writer: Arc::clone(&w),
            user,
            actors: Arc::clone(&actors),
            stream_actors: Arc::clone(&stream_actors),
            shutdown:shutdown_sender ,
        }
    }
}