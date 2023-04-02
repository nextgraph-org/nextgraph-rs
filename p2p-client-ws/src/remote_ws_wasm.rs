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

//! WebSocket for Wasm Remote Connection to a Broker

use futures::FutureExt;
use futures::{future, pin_mut, select, stream, SinkExt, StreamExt};
use p2p_net::connection::*;
use p2p_net::errors::*;
use p2p_net::log;
use p2p_net::types::*;
use p2p_net::utils::*;
use p2p_net::{connection::*, WS_PORT};
use p2p_repo::types::*;
use p2p_repo::utils::{generate_keypair, now_timestamp};
use std::sync::Arc;

use {
    pharos::{Filter, Observable, ObserveConfig},
    wasm_bindgen::UnwrapThrowExt,
    ws_stream_wasm::*,
};

pub struct ConnectionWebSocket {}

#[cfg_attr(target_arch = "wasm32", async_trait::async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait::async_trait)]
impl IConnection for ConnectionWebSocket {
    fn tp(&self) -> TransportProtocol {
        TransportProtocol::WS
    }

    async fn open(
        self: Arc<Self>,
        ip: IP,
        peer_pubk: PrivKey,
        peer_privk: PubKey,
        remote_peer: DirectPeerId,
    ) -> Result<(), NetError> {
        //pub async fn testt(url: &str) -> ResultSend<()> {
        let mut cnx = ConnectionBase::new(ConnectionDir::Client);

        let url = format!("ws://{}:{}", ip, WS_PORT);

        let (mut ws, wsio) = WsMeta::connect(url, None).await.map_err(|e| {
            //log!("{:?}", e);
            NetError::ConnectionError
        })?;

        let mut evts = ws
            .observe(ObserveConfig::default())
            //.observe(Filter::Pointer(WsEvent::is_closed).into())
            .await
            .expect_throw("observe");

        //let (mut sender_tx, sender_rx) = mpsc::unbounded();
        //let (mut receiver_tx, receiver_rx) = mpsc::unbounded();

        cnx.start_read_loop();

        spawn_and_log_error(ws_loop(ws, wsio, cnx.take_sender(), cnx.take_receiver()));

        //spawn_and_log_error(read_loop(receiver_rx, sender_tx.clone()));

        log!("sending...");
        // cnx.send(ConnectionCommand::Close).await;

        // cnx.send(ConnectionCommand::Msg(ProtocolMessage::Start(
        //     StartProtocol::Auth(ClientHello::V0()),
        // )))
        // .await;

        cnx.close().await;

        // Note that since WsMeta::connect resolves to an opened connection, we don't see
        // any Open events here.
        //
        //assert!(evts.next().await.unwrap_throw().is_closing());
        let last_event = evts.next().await;
        log!("WS closed {:?}", last_event.clone());

        let last_command = match last_event {
            None => ConnectionCommand::Close,
            Some(WsEvent::Open) => ConnectionCommand::Error(NetError::WsError), // this should never happen
            Some(WsEvent::Error) => ConnectionCommand::Error(NetError::ConnectionError),
            Some(WsEvent::Closing) => ConnectionCommand::Close,
            Some(WsEvent::Closed(ce)) => {
                if ce.code == 1000 {
                    ConnectionCommand::Close
                } else if ce.code < 4000 {
                    ConnectionCommand::Error(NetError::WsError)
                } else if ce.code < 4950 {
                    ConnectionCommand::ProtocolError(
                        ProtocolError::try_from(ce.code - 4000).unwrap(),
                    )
                } else {
                    ConnectionCommand::Error(NetError::try_from(ce.code - 4949).unwrap())
                }
            }
            Some(WsEvent::WsErr(_e)) => ConnectionCommand::Error(NetError::WsError),
        };
        let _ = cnx.inject(last_command).await;
        let _ = cnx.close_streams().await;

        //Ok(cnx)
        Ok(())
    }

    async fn accept(&mut self) -> Result<(), NetError> {
        !unimplemented!()
    }
}

async fn ws_loop(
    ws: WsMeta,
    mut stream: WsStream,
    sender: Receiver<ConnectionCommand>,
    receiver: Sender<ConnectionCommand>,
) -> ResultSend<()> {
    async fn inner_loop(
        stream: &mut WsStream,
        mut sender: Receiver<ConnectionCommand>,
        mut receiver: Sender<ConnectionCommand>,
    ) -> Result<ProtocolError, NetError> {
        //let mut rx_sender = sender.fuse();
        loop {
            select! {
                r = stream.next().fuse() => match r {
                    Some(msg) => {
                        log!("GOT MESSAGE {:?}", msg);
                        if let WsMessage::Binary(b) = msg {
                            receiver.send(ConnectionCommand::Msg(serde_bare::from_slice::<ProtocolMessage>(&b)?)).await
                                    .map_err(|_e| NetError::IoError)?;
                        }
                        else {
                            break;
                        }
                    },
                    None => break
                },
                s = sender.next().fuse() => match s {
                    Some(msg) => {
                        log!("SENDING MESSAGE {:?}", msg);
                        match msg {
                            ConnectionCommand::Msg(m) => {
                                if let ProtocolMessage::Start(s) = m {
                                    stream.send(WsMessage::Binary(serde_bare::to_vec(&s)?)).await.map_err(|_e| NetError::IoError)?;
                                }
                            },
                            ConnectionCommand::Error(e) => {
                                return Err(e);
                            },
                            ConnectionCommand::ProtocolError(e) => {
                                return Ok(e);
                            },
                            ConnectionCommand::Close => {
                                break;
                            }
                        }
                    },
                    None => break
                },
            }
        }
        Ok(ProtocolError::NoError)
    }
    match inner_loop(&mut stream, sender, receiver).await {
        Ok(proto_err) => {
            if proto_err == ProtocolError::NoError {
                ws.close_code(1000).await.map_err(|_e| NetError::WsError)?;
            } else {
                let mut code = proto_err.clone() as u16;
                if code > 949 {
                    code = ProtocolError::OtherError as u16;
                }
                ws.close_reason(code + 4000, proto_err.to_string())
                    .await
                    .map_err(|_e| NetError::WsError)?;
                return Err(Box::new(proto_err));
            }
        }
        Err(e) => {
            ws.close_reason(e.clone() as u16 + 4949, e.to_string())
                .await
                .map_err(|_e| NetError::WsError)?;
            return Err(Box::new(e));
        }
    }
    Ok(())
}
