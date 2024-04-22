// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use core::fmt;
use ng_repo::errors::{ObjectParseError, StorageError};

use std::convert::From;
use std::error::Error;

// impl From<BrokerMessage> for Result<(), ProtocolError> {
//     fn from(msg: BrokerMessage) -> Self {
//         if !msg.is_response() {
//             panic!("BrokerMessage is not a response");
//         }
//         match msg.result() {
//             0 => Ok(()),
//             err => Err(ProtocolError::try_from(err).unwrap()),
//         }
//     }
// }

// impl From<BrokerMessage> for Result<ObjectId, ProtocolError> {
//     fn from(msg: BrokerMessage) -> Self {
//         if !msg.is_response() {
//             panic!("BrokerMessage is not a response");
//         }
//         match msg.result() {
//             0 => Ok(msg.response_object_id()),
//             err => Err(ProtocolError::try_from(err).unwrap()),
//         }
//     }
// }

// /// Option represents if a Block is available. cannot be returned here. call BrokerMessage.response_block() to get a reference to it.
// impl From<BrokerMessage> for Result<Option<u16>, ProtocolError> {
//     fn from(msg: BrokerMessage) -> Self {
//         if !msg.is_response() {
//             panic!("BrokerMessage is not a response");
//         }
//         //let partial: u16 = ProtocolError::PartialContent.into();
//         let res = msg.result();
//         if res == 0 || ProtocolError::try_from(res).unwrap().is_stream() {
//             if msg.is_overlay() {
//                 match msg.response_block() {
//                     Some(_) => Ok(Some(res)),
//                     None => Ok(None),
//                 }
//             } else {
//                 Ok(None)
//             }
//         } else {
//             Err(ProtocolError::try_from(res).unwrap())
//         }
//     }
// }

// /// Option represents if a Block is available. returns a clone.
// impl From<BrokerMessage> for Result<Option<Block>, ProtocolError> {
//     fn from(msg: BrokerMessage) -> Self {
//         if !msg.is_response() {
//             panic!("BrokerMessage is not a response");
//         }
//         //let partial: u16 = ProtocolError::PartialContent.into();
//         let res = msg.result();
//         if res == 0 || ProtocolError::try_from(res).unwrap().is_stream() {
//             if msg.is_overlay() {
//                 match msg.response_block() {
//                     Some(b) => Ok(Some(b.clone())),
//                     None => Ok(None),
//                 }
//             } else {
//                 Ok(None)
//             }
//         } else {
//             Err(ProtocolError::try_from(res).unwrap())
//         }
//     }
// }
