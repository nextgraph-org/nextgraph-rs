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

use async_std::sync::Mutex;
use futures::io::Close;
use futures::{future, pin_mut, select, stream, StreamExt};
use futures::{FutureExt, SinkExt};

use async_std::task;
use p2p_net::errors::*;
use p2p_net::types::*;
use p2p_net::utils::{gen_ed_keys, spawn_and_log_error, Receiver, ResultSend, Sender, Sensitive};
use p2p_net::{connection::*, WS_PORT};
use p2p_repo::log::*;
use p2p_repo::types::*;
use p2p_repo::utils::{generate_keypair, now_timestamp};

use async_tungstenite::async_std::connect_async;
use async_tungstenite::tungstenite::{Error, Message};

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

        let res = connect_async(url).await;

        match (res) {
            Err(e) => {
                log_debug!("Cannot connect: {:?}", e);
                Err(NetError::ConnectionError)
            }
            Ok((mut websocket, _)) => {
                cnx.start_read_loop(None, peer_privk, Some(remote_peer));
                let s = cnx.take_sender();
                let r = cnx.take_receiver();
                let mut shutdown = cnx.set_shutdown();

                let join = task::spawn(async move {
                    log_debug!("START of WS loop");

                    let res = ws_loop(websocket, s, r).await;

                    if res.is_err() {
                        let _ = shutdown.send(res.err().unwrap()).await;
                    }
                    log_debug!("END of WS loop");
                });

                cnx.start(config).await;

                Ok(cnx)
            }
        }
    }
}

#[cfg_attr(target_arch = "wasm32", async_trait::async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait::async_trait)]
impl IAccept for ConnectionWebSocket {
    type Socket = WebSocketStream<TcpStream>;
    async fn accept(
        &self,
        remote_bind_address: BindAddress,
        local_bind_address: BindAddress,
        peer_privk: Sensitive<[u8; 32]>,
        socket: Self::Socket,
    ) -> Result<ConnectionBase, NetError> {
        let mut cnx = ConnectionBase::new(ConnectionDir::Server, TransportProtocol::WS);

        cnx.start_read_loop(
            Some((local_bind_address, remote_bind_address)),
            peer_privk,
            None,
        );
        let s = cnx.take_sender();
        let r = cnx.take_receiver();
        let mut shutdown = cnx.set_shutdown();

        let join = task::spawn(async move {
            log_debug!("START of WS loop");

            let res = ws_loop(socket, s, r).await;

            if res.is_err() {
                let _ = shutdown.send(res.err().unwrap()).await;
            }
            log_debug!("END of WS loop");
        });
        Ok(cnx)
    }
}

async fn close_ws(
    stream: &mut WebSocketStream<TcpStream>,
    receiver: &mut Sender<ConnectionCommand>,
    code: u16,
    reason: &str,
) -> Result<(), NetError> {
    log_info!("close_ws {:?}", code);

    let cmd = if code == 1000 {
        ConnectionCommand::Close
    } else if code < 4000 {
        ConnectionCommand::Error(NetError::WsError)
    } else if code < 4950 {
        ConnectionCommand::ProtocolError(ProtocolError::try_from(code - 4000).unwrap())
    } else {
        ConnectionCommand::Error(NetError::try_from(code - 4949).unwrap())
    };
    log_info!("sending to read loop {:?}", cmd);
    let _ = futures::SinkExt::send(receiver, cmd).await;

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
                        //log_info!("GOT MESSAGE {:?}", msg);

                        if msg.is_close() {
                            if let Message::Close(Some(cf)) = msg {
                                log_info!("CLOSE from remote with closeframe: {}",cf.reason);
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
                                log_info!("CLOSE from remote");
                            }
                            return Ok(ProtocolError::Closing);
                        } else {
                            futures::SinkExt::send(receiver,ConnectionCommand::Msg(serde_bare::from_slice::<ProtocolMessage>(&msg.into_data())?)).await
                                .map_err(|_e| NetError::IoError)?;
                        }
                    },
                    Some(Err(e)) => {log_info!("GOT ERROR {:?}",e);return Err(NetError::WsError);},
                    None => break
                },
                s = sender.next().fuse() => match s {
                    Some(msg) => {
                        //log_info!("SENDING MESSAGE {:?}", msg);
                        match msg {
                            ConnectionCommand::Msg(m) => {
                                futures::SinkExt::send(&mut stream,Message::binary(serde_bare::to_vec(&m)?)).await.map_err(|_e| NetError::IoError)?;
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
                log_info!("ProtocolError::Closing");
                let _ = ws.close(None).await;
            } else if proto_err == ProtocolError::NoError {
                close_ws(&mut ws, &mut receiver, 1000, "").await?;
            } else {
                let mut code = proto_err.clone() as u16;
                if code > 949 {
                    code = ProtocolError::OtherError as u16;
                }
                close_ws(&mut ws, &mut receiver, code + 4000, &proto_err.to_string()).await?;
                //return Err(NetError::ProtocolError);
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
    Ok(())
}

#[cfg(test)]
mod test {

    use crate::remote_ws::*;
    use async_std::task;
    use p2p_net::broker::*;
    use p2p_net::errors::NetError;
    use p2p_net::types::IP;
    use p2p_net::utils::{spawn_and_log_error, ResultSend};
    use p2p_repo::errors::NgError;
    use p2p_repo::log::*;
    use p2p_repo::utils::generate_keypair;
    use std::net::IpAddr;
    use std::str::FromStr;

    #[async_std::test]
    pub async fn test_ws() -> Result<(), NgError> {
        // let mut random_buf = [0u8; 32];
        // getrandom::getrandom(&mut random_buf).unwrap();

        let server_key: PubKey = "NvMf86FnhcSJ4s9zryguepgqtNCImUM4qUoW6p_wRdA".try_into()?;
        log_debug!("server_key:{}", server_key);

        //let keys = p2p_net::utils::gen_dh_keys();
        //let pub_key = PubKey::Ed25519PubKey(keys.1);
        let keys = gen_ed_keys();
        let x_from_ed = keys.1.to_dh_from_ed();
        log_info!("Pub from X {}", x_from_ed);

        let (client_priv_key, client_pub_key) = generate_keypair();
        let (user_priv_key, user_pub_key) = generate_keypair();

        log_info!("start connecting");
        {
            let res = BROKER
                .write()
                .await
                .connect(
                    Box::new(ConnectionWebSocket {}),
                    IP::try_from(&IpAddr::from_str("127.0.0.1").unwrap()).unwrap(),
                    None,
                    keys.0,
                    keys.1,
                    server_key,
                    StartConfig::Client(ClientConfig {
                        user: user_pub_key,
                        client: client_pub_key,
                        client_priv: client_priv_key,
                    }),
                )
                .await;
            log_info!("broker.connect : {:?}", res);
            res.expect("assume the connection succeeds");
        }

        BROKER.read().await.print_status();

        async fn timer_close(remote_peer_id: DirectPeerId) -> ResultSend<()> {
            async move {
                sleep!(std::time::Duration::from_secs(3));
                log_info!("timeout");
                BROKER
                    .write()
                    .await
                    .close_peer_connection(&remote_peer_id)
                    .await;
            }
            .await;
            Ok(())
        }
        spawn_and_log_error(timer_close(server_key));

        //Broker::graceful_shutdown().await;

        Broker::join_shutdown_with_timeout(std::time::Duration::from_secs(5)).await;
        Ok(())
    }
}
