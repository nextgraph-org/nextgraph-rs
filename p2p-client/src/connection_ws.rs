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

use debug_print::*;

use p2p_repo::types::*;
use p2p_repo::utils::{generate_keypair, now_timestamp};
use p2p_net::errors::*;
use p2p_net::types::*;
use p2p_net::broker_connection::*;
use crate::connection_remote::*;
use futures::{future, pin_mut, stream, SinkExt, StreamExt};

use async_tungstenite::async_std::connect_async;
use async_tungstenite::client_async;
use async_tungstenite::tungstenite::{Error, Message};

pub struct BrokerConnectionWebSocket {

}

impl BrokerConnectionWebSocket{

    pub async fn open(url:&str, priv_key: PrivKey, pub_key: PubKey) -> Result<impl BrokerConnection, ProtocolError> 
    {

        let res = connect_async(url).await;

        match (res) {
            Ok((ws, _)) => {
                debug_println!("WebSocket handshake completed");

                let (write, read) = ws.split();
                let mut frames_stream_read = read.map(|msg_res| match msg_res {
                    Err(e) => {
                        debug_println!("ERROR {:?}", e);
                        vec![]
                    }
                    Ok(message) => {
                        if message.is_close() {
                            debug_println!("CLOSE FROM SERVER");
                            vec![]
                        } else {
                            message.into_data()
                        }
                    }
                });
                async fn transform(message: Vec<u8>) -> Result<Message, Error> {
                    if message.len() == 0 {
                        debug_println!("sending CLOSE message to SERVER");
                        Ok(Message::Close(None))
                    } else {
                        Ok(Message::binary(message))
                    }
                }
                let frames_stream_write = write
                    .with(|message| transform(message))
                    .sink_map_err(|e| ProtocolError::WriteError);

                let master_key: [u8; 32] = [0; 32];
                let mut cnx_res = ConnectionRemote::open_broker_connection(
                    frames_stream_write,
                    frames_stream_read,
                    pub_key,
                    priv_key,
                    PubKey::Ed25519PubKey([1; 32]),
                )
                .await;

                match cnx_res {
                    Ok(mut cnx) => {
                        Ok(cnx)
                    }
                    Err(e) => {
                        debug_println!("cannot connect {:?}", e);
                        Err(e)
                    }
                }
            }
            Err(e) => {
                debug_println!("Cannot connect: {:?}", e);
                Err(ProtocolError::ConnectionError)
            }
        }
    }

}