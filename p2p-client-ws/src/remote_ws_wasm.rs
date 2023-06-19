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
use p2p_net::types::*;
use p2p_net::utils::*;
use p2p_net::WS_PORT;
use p2p_repo::log::*;
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
impl IConnect for ConnectionWebSocket {
    async fn open(
        &self,
        ip: IP,
        peer_privk: Sensitive<[u8; 32]>,
        peer_pubk: PubKey,
        remote_peer: DirectPeerId,
        config: StartConfig,
    ) -> Result<ConnectionBase, NetError> {
        let mut cnx = ConnectionBase::new(ConnectionDir::Client, TransportProtocol::WS);

        let url = format!("ws://{}:{}", ip, WS_PORT);

        let (mut ws, wsio) = WsMeta::connect(url, None).await.map_err(|e| {
            //log_info!("{:?}", e);
            NetError::ConnectionError
        })?;

        cnx.start_read_loop(peer_privk, Some(remote_peer));
        let mut shutdown = cnx.set_shutdown();

        spawn_and_log_error(ws_loop(
            ws,
            wsio,
            cnx.take_sender(),
            cnx.take_receiver(),
            shutdown,
        ));

        cnx.start(config).await;

        Ok(cnx)
    }
}

async fn ws_loop(
    mut ws: WsMeta,
    mut stream: WsStream,
    sender: Receiver<ConnectionCommand>,
    mut receiver: Sender<ConnectionCommand>,
    mut shutdown: Sender<NetError>,
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
                        log_info!("GOT MESSAGE {:?}", msg);
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
                        log_info!("SENDING MESSAGE {:?}", msg);
                        match msg {
                            ConnectionCommand::Msg(m) => {

                                stream.send(WsMessage::Binary(serde_bare::to_vec(&m)?)).await.map_err(|e| { log_info!("{:?}",e); return NetError::IoError;})?;

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
    log_info!("START of WS loop");
    let mut events = ws
        .observe(ObserveConfig::default())
        //.observe(Filter::Pointer(WsEvent::is_closed).into())
        .await
        .expect_throw("observe");
    match inner_loop(&mut stream, sender, receiver.clone()).await {
        Ok(proto_err) => {
            if proto_err == ProtocolError::NoError {
                let _ = ws.close_code(1000).await; //.map_err(|_e| NetError::WsError)?;
                log_info!("CLOSED GRACEFULLY");
            } else {
                log_info!("PROTOCOL ERR");
                let mut code = proto_err.clone() as u16;
                if code > 949 {
                    code = ProtocolError::OtherError as u16;
                }
                let _ = ws.close_reason(code + 4000, proto_err.to_string()).await;
                //.map_err(|_e| NetError::WsError)?;
                //return Err(Box::new(proto_err));
            }
        }
        Err(e) => {
            let _ = ws
                .close_reason(e.clone() as u16 + 4949, e.to_string())
                .await;
            //.map_err(|_e| NetError::WsError)?;
            //return Err(Box::new(e));
            log_info!("ERR {:?}", e);
        }
    }

    let last_event = events.next().await;
    log_info!("WS closed {:?}", last_event.clone());
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
                ConnectionCommand::ProtocolError(ProtocolError::try_from(ce.code - 4000).unwrap())
            } else {
                ConnectionCommand::Error(NetError::try_from(ce.code - 4949).unwrap())
            }
        }
        Some(WsEvent::WsErr(_e)) => ConnectionCommand::Error(NetError::WsError),
    };
    if let ConnectionCommand::Error(err) = last_command.clone() {
        let _ = shutdown.send(err).await;
    } else if let ConnectionCommand::ProtocolError(err) = last_command.clone() {
        //let _ = shutdown.send(NetError::ProtocolError).await;
    } // otherwise, shutdown gracefully (with None). it is done automatically during destroy of shutdown

    receiver
        .send(last_command)
        .await
        .map_err(|_e| NetError::IoError)?;

    log_info!("END of WS loop");
    Ok(())
}
