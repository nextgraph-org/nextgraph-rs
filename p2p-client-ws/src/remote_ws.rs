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

//! WebSocket Remote Connection to a Broker

use std::sync::Arc;

use async_std::net::TcpStream;
use async_tungstenite::tungstenite::protocol::frame::coding::CloseCode;
use async_tungstenite::tungstenite::protocol::CloseFrame;
use async_tungstenite::WebSocketStream;
use debug_print::*;

use async_std::sync::Mutex;
use futures::io::Close;
use futures::FutureExt;
use futures::{future, pin_mut, select, stream, StreamExt};

use async_std::task;
use p2p_net::errors::*;
use p2p_net::log;
use p2p_net::types::*;
use p2p_net::utils::{spawn_and_log_error, ResultSend};
use p2p_net::{connection::*, WS_PORT};
use p2p_repo::types::*;
use p2p_repo::utils::{generate_keypair, now_timestamp};

use async_tungstenite::async_std::connect_async;
use async_tungstenite::tungstenite::{Error, Message};

pub struct ConnectionWebSocket {}

#[cfg_attr(target_arch = "wasm32", async_trait::async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait::async_trait)]
impl IConnection for ConnectionWebSocket {
    async fn open(
        self: Arc<Self>,
        ip: IP,
        peer_pubk: PrivKey,
        peer_privk: PubKey,
        remote_peer: DirectPeerId,
    ) -> Result<(), NetError> {
        let mut cnx = ConnectionBase::new(ConnectionDir::Client);

        let url = format!("ws://{}:{}", ip, WS_PORT);

        let res = connect_async(url).await;

        match (res) {
            Err(e) => {
                debug_println!("Cannot connect: {:?}", e);
                Err(NetError::ConnectionError)
            }
            Ok((mut websocket, _)) => {
                //let ws = Arc::new(Mutex::new(Box::pin(websocket)));

                // let (write, read) = ws.split();
                // let mut stream_read = read.map(|msg_res| match msg_res {
                //     Err(e) => {
                //         debug_println!("READ ERROR {:?}", e);
                //         ConnectionCommand::Error(NetError::IoError)
                //     }
                //     Ok(message) => {
                //         if message.is_close() {
                //             debug_println!("CLOSE FROM SERVER");
                //             ConnectionCommand::Close
                //         } else {
                //             ConnectionCommand::Msg(
                //                 serde_bare::from_slice::<ProtocolMessage>(&message.into_data())
                //                     .unwrap(),
                //             )
                //         }
                //     }
                // });
                // async fn write_transform(cmd: ConnectionCommand) -> Result<Message, Error> {
                //     match cmd {
                //         ConnectionCommand::Error(_) => Err(Error::AlreadyClosed), //FIXME
                //         ConnectionCommand::ProtocolError(_) => Err(Error::AlreadyClosed), //FIXME
                //         ConnectionCommand::Close => {
                //             // todo close cnx. }
                //             Err(Error::AlreadyClosed)
                //         }
                //         ConnectionCommand::Msg(msg) => Ok(Message::binary(
                //             serde_bare::to_vec(&msg)
                //                 .map_err(|_| Error::AlreadyClosed) //FIXME
                //                 .unwrap(),
                //         )),
                //     }
                // }
                // let stream_write = write
                //     .with(|message| write_transform(message))
                //     .sink_map_err(|e| NetError::IoError);

                // ws.close(Some(CloseFrame {
                //     code: CloseCode::Library(4000),
                //     reason: std::borrow::Cow::Borrowed(""),
                // }))
                // .await;

                cnx.start_read_loop();
                let s = cnx.take_sender();
                let r = cnx.take_receiver();

                //let ws_in_task = Arc::clone(&ws);
                task::spawn(async move {
                    debug_println!("START of WS loop");
                    //let w = ws_in_task.lock().await;
                    ws_loop(websocket, s, r).await;
                    // .close(Some(CloseFrame {
                    //     code: CloseCode::Library(4000),
                    //     reason: std::borrow::Cow::Borrowed(""),
                    // }))
                    // .await;
                    debug_println!("END of WS loop");
                });

                //spawn_and_log_error(ws_loop(ws, cnx.take_sender(), cnx.take_receiver()));

                log!("sending...");
                // cnx.send(ConnectionCommand::Close).await;

                // cnx.send(ConnectionCommand::Msg(ProtocolMessage::Start(
                //     StartProtocol::Auth(ClientHello::V0()),
                // )))
                // .await;

                //cnx.close().await;

                // let _ = cnx.inject(last_command).await;
                // let _ = cnx.close_streams().await;

                // Note that since WsMeta::connect resolves to an opened connection, we don't see
                // any Open events here.
                //
                //assert!(evts.next().await.unwrap_throw().is_closing());

                // TODO wait for close

                //log!("WS closed {:?}", last_event.clone());

                //Ok(cnx)
                Ok(())
            }
        }
    }

    async fn accept(&mut self) -> Result<(), NetError> {
        let cnx = ConnectionBase::new(ConnectionDir::Server);

        Ok(())
    }

    fn tp(&self) -> TransportProtocol {
        TransportProtocol::WS
    }
}

async fn close_ws(
    stream: &mut WebSocketStream<TcpStream>,
    receiver: &mut Sender<ConnectionCommand>,
    code: u16,
    reason: &str,
) -> Result<(), NetError> {
    log!("close_ws");
    let _ = futures::SinkExt::send(receiver, ConnectionCommand::Close).await;
    stream
        .close(Some(CloseFrame {
            code: CloseCode::Library(code),
            reason: std::borrow::Cow::Borrowed(reason),
        }))
        .await
        .map_err(|_e| NetError::WsError)?;
    Ok(())
}

async fn ws_loop(
    mut ws: WebSocketStream<TcpStream>,
    sender: Receiver<ConnectionCommand>,
    mut receiver: Sender<ConnectionCommand>,
) -> Result<(), NetError> {
    async fn inner_loop(
        stream: &mut WebSocketStream<TcpStream>,
        mut sender: Receiver<ConnectionCommand>,
        receiver: &mut Sender<ConnectionCommand>,
    ) -> Result<ProtocolError, NetError> {
        //let mut rx_sender = sender.fuse();
        pin_mut!(stream);
        loop {
            select! {
                r = stream.next().fuse() => match r {
                    Some(Ok(msg)) => {
                        log!("GOT MESSAGE {:?}", msg);

                        if msg.is_close() {
                            if let  Message::Close(Some(cf)) = msg {
                                log!("CLOSE from server: {}",cf.reason);
                                let last_command = match cf.code {
                                    CloseCode::Normal =>
                                        ConnectionCommand::Close,
                                    CloseCode::Library(c) => {
                                        if c < 4950 {
                                            ConnectionCommand::ProtocolError(
                                                ProtocolError::try_from(c - 4000).unwrap(),
                                            )
                                        } else {
                                            ConnectionCommand::Error(NetError::try_from(c - 4949).unwrap())
                                        }
                                    },
                                    _ => ConnectionCommand::Error(NetError::WsError)
                                };
                                let _ = futures::SinkExt::send(receiver, last_command).await;
                            }
                            else {
                                let _ = futures::SinkExt::send(receiver, ConnectionCommand::Close).await;
                                log!("CLOSE from server");
                            }

                        } else {
                            futures::SinkExt::send(receiver,ConnectionCommand::Msg(serde_bare::from_slice::<ProtocolMessage>(&msg.into_data())?)).await
                                .map_err(|_e| NetError::IoError)?;
                        }
                        return Ok(ProtocolError::Closing);
                    },
                    Some(Err(e)) => break,
                    None => break
                },
                s = sender.next().fuse() => match s {
                    Some(msg) => {
                        log!("SENDING MESSAGE {:?}", msg);
                        match msg {
                            ConnectionCommand::Msg(m) => {
                                if let ProtocolMessage::Start(s) = m {
                                    futures::SinkExt::send(&mut stream, Message::binary(serde_bare::to_vec(&s)?)).await.map_err(|_e| NetError::IoError)?;
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
    match inner_loop(&mut ws, sender, &mut receiver).await {
        Ok(proto_err) => {
            if proto_err == ProtocolError::Closing {
                ws.close(None).await.map_err(|_e| NetError::WsError)?;
            } else if proto_err == ProtocolError::NoError {
                close_ws(&mut ws, &mut receiver, 1000, "").await?;
            } else {
                let mut code = proto_err.clone() as u16;
                if code > 949 {
                    code = ProtocolError::OtherError as u16;
                }
                close_ws(&mut ws, &mut receiver, code + 4000, &proto_err.to_string()).await?;
                return Err(NetError::ProtocolError);
            }
        }
        Err(e) => {
            close_ws(
                &mut ws,
                &mut receiver,
                e.clone() as u16 + 4949,
                &e.to_string(),
            )
            .await?;
            return Err(e);
        }
    }
    log!("END OF LOOP");
    Ok(())
}

#[cfg(test)]
mod test {

    use crate::remote_ws::*;
    use async_std::task;
    use p2p_net::broker::*;
    use p2p_net::errors::NetError;
    use p2p_net::log;
    use p2p_net::types::IP;
    use p2p_net::utils::{spawn_and_log_error, ResultSend};
    use p2p_repo::utils::generate_keypair;
    use std::net::IpAddr;
    use std::str::FromStr;

    #[async_std::test]
    pub async fn test_ws() -> Result<(), NetError> {
        let mut random_buf = [0u8; 32];
        getrandom::getrandom(&mut random_buf).unwrap();
        //spawn_and_log_error(testt("ws://127.0.0.1:3012"));

        log!("start connecting");
        let cnx = Arc::new(ConnectionWebSocket {});
        let (priv_key, pub_key) = generate_keypair();
        let broker = Broker::new();
        let res = broker
            .connect(
                cnx,
                IP::try_from(&IpAddr::from_str("127.0.0.1").unwrap()).unwrap(),
                None,
                priv_key,
                pub_key,
                pub_key,
            )
            .await;
        log!("broker.connect : {:?}", res);
        //res.expect_throw("assume the connection succeeds");

        Ok(())
    }
}
