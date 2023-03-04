// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// This code is partly derived from work written by TG x Thoth from P2Pcollab.
// Copyright 2022 TG x Thoth
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0> 
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use crate::types::BrokerMessage;
use core::fmt;
use p2p_repo::object::ObjectParseError;
use p2p_repo::types::Block;
use p2p_repo::types::ObjectId;
use num_enum::IntoPrimitive;
use num_enum::TryFromPrimitive;
use std::convert::From;
use std::convert::TryFrom;
use std::error::Error;

#[derive(Debug, Eq, PartialEq, TryFromPrimitive, IntoPrimitive, Clone)]
#[repr(u16)]
pub enum ProtocolError {
    WriteError = 1,
    ActorError,
    InvalidState,
    SignatureError,
    InvalidSignature,
    SerializationError,
    PartialContent,
    AccessDenied,
    OverlayNotJoined,
    OverlayNotFound,
    BrokerError,
    NotFound,
    EndOfStream,
    StoreError,
    MissingBlocks,
    ObjectParseError,
    InvalidValue,
    UserAlreadyExists,
    RepoIdRequired,
    Closing,
    ConnectionError,
}

impl ProtocolError {
    pub fn is_stream(&self) -> bool {
        *self == ProtocolError::PartialContent || *self == ProtocolError::EndOfStream
    }
}

impl Error for ProtocolError {}

impl fmt::Display for ProtocolError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl From<p2p_repo::errors::NgError> for ProtocolError {
    fn from(e: p2p_repo::errors::NgError) -> Self {
        match e {
            p2p_repo::errors::NgError::InvalidSignature => ProtocolError::InvalidSignature,
            p2p_repo::errors::NgError::SerializationError => ProtocolError::SerializationError,
        }
    }
}

impl From<ObjectParseError> for ProtocolError {
    fn from(e: ObjectParseError) -> Self {
        ProtocolError::ObjectParseError
    }
}

impl From<p2p_repo::store::StorageError> for ProtocolError {
    fn from(e: p2p_repo::store::StorageError) -> Self {
        match e {
            p2p_repo::store::StorageError::NotFound => ProtocolError::NotFound,
            p2p_repo::store::StorageError::InvalidValue => ProtocolError::InvalidValue,
            _ => ProtocolError::StoreError,
        }
    }
}

impl From<serde_bare::error::Error> for ProtocolError {
    fn from(e: serde_bare::error::Error) -> Self {
        ProtocolError::SerializationError
    }
}

impl From<BrokerMessage> for Result<(), ProtocolError> {
    fn from(msg: BrokerMessage) -> Self {
        if !msg.is_response() {
            panic!("BrokerMessage is not a response");
        }
        match msg.result() {
            0 => Ok(()),
            err => Err(ProtocolError::try_from(err).unwrap()),
        }
    }
}

impl From<BrokerMessage> for Result<ObjectId, ProtocolError> {
    fn from(msg: BrokerMessage) -> Self {
        if !msg.is_response() {
            panic!("BrokerMessage is not a response");
        }
        match msg.result() {
            0 => Ok(msg.response_object_id()),
            err => Err(ProtocolError::try_from(err).unwrap()),
        }
    }
}

/// Option represents if a Block is available. cannot be returned here. call BrokerMessage.response_block() to get a reference to it.
impl From<BrokerMessage> for Result<Option<u16>, ProtocolError> {
    fn from(msg: BrokerMessage) -> Self {
        if !msg.is_response() {
            panic!("BrokerMessage is not a response");
        }
        //let partial: u16 = ProtocolError::PartialContent.into();
        let res = msg.result();
        if res == 0 || ProtocolError::try_from(res).unwrap().is_stream() {
            if msg.is_overlay() {
                match msg.response_block() {
                    Some(_) => Ok(Some(res)),
                    None => Ok(None),
                }
            } else {
                Ok(None)
            }
        } else {
            Err(ProtocolError::try_from(res).unwrap())
        }
    }
}

/// Option represents if a Block is available. returns a clone.
impl From<BrokerMessage> for Result<Option<Block>, ProtocolError> {
    fn from(msg: BrokerMessage) -> Self {
        if !msg.is_response() {
            panic!("BrokerMessage is not a response");
        }
        //let partial: u16 = ProtocolError::PartialContent.into();
        let res = msg.result();
        if res == 0 || ProtocolError::try_from(res).unwrap().is_stream() {
            if msg.is_overlay() {
                match msg.response_block() {
                    Some(b) => Ok(Some(b.clone())),
                    None => Ok(None),
                }
            } else {
                Ok(None)
            }
        } else {
            Err(ProtocolError::try_from(res).unwrap())
        }
    }
}
