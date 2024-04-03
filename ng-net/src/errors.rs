// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use core::fmt;
use ng_repo::errors::ObjectParseError;
use ng_repo::store::StorageError;
use num_enum::IntoPrimitive;
use num_enum::TryFromPrimitive;
use std::convert::From;
use std::error::Error;

#[derive(Debug, Eq, PartialEq, Clone)]
pub enum ServerError {
    SequenceMismatch,
    FileError,
}

#[derive(Debug, Eq, PartialEq, TryFromPrimitive, IntoPrimitive, Clone)]
#[repr(u16)]
pub enum NetError {
    DirectionAlreadySet = 1,
    WsError,
    IoError,
    ConnectionError,
    SerializationError,
    ProtocolError,
    AccessDenied,
    InternalError,
    PeerAlreadyConnected,
    Closing,
} //MAX 50 NetErrors

impl Error for NetError {}

impl fmt::Display for NetError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Debug, Eq, PartialEq, TryFromPrimitive, IntoPrimitive, Clone)]
#[repr(u16)]
pub enum ProtocolError {
    NoError = 0,
    PartialContent,
    EndOfStream,

    IoError,
    WsError,
    ActorError,
    InvalidState,
    SignatureError,
    InvalidSignature,
    SerializationError,
    AccessDenied,
    InvitationRequired,
    OverlayNotJoined,
    OverlayNotFound,
    BrokerError,
    NotFound,
    MissingBlocks,
    ObjectParseError,
    InvalidValue,
    AlreadyExists,
    RepoIdRequired,

    ConnectionError,
    Timeout,
    Expired,

    PeerAlreadyConnected,
    OtherError,
    NetError,
    StorageError,
    Closing,
    FsmNotReady,
    MustBeEncrypted,
    NoiseHandshakeFailed,
    DecryptionError,
    EncryptionError,
    WhereIsTheMagic,

    InvalidNonce,
} //MAX 949 ProtocolErrors

impl From<NetError> for ProtocolError {
    fn from(e: NetError) -> Self {
        match e {
            NetError::IoError => ProtocolError::IoError,
            NetError::WsError => ProtocolError::WsError,
            NetError::ConnectionError => ProtocolError::ConnectionError,
            NetError::SerializationError => ProtocolError::SerializationError,
            NetError::ProtocolError => ProtocolError::OtherError,
            NetError::AccessDenied => ProtocolError::AccessDenied,
            NetError::PeerAlreadyConnected => ProtocolError::PeerAlreadyConnected,
            NetError::Closing => ProtocolError::Closing,
            _ => ProtocolError::NetError,
        }
    }
}

impl From<StorageError> for ProtocolError {
    fn from(e: StorageError) -> Self {
        match e {
            StorageError::NotFound => ProtocolError::NotFound,
            StorageError::InvalidValue => ProtocolError::InvalidValue,
            StorageError::BackendError => ProtocolError::StorageError,
            StorageError::SerializationError => ProtocolError::SerializationError,
            StorageError::AlreadyExists => ProtocolError::AlreadyExists,
            _ => ProtocolError::StorageError,
        }
    }
}

impl ProtocolError {
    pub fn is_stream(&self) -> bool {
        *self == ProtocolError::PartialContent || *self == ProtocolError::EndOfStream
    }
    pub fn is_err(&self) -> bool {
        *self != ProtocolError::NoError
    }
}

impl Error for ProtocolError {}

impl fmt::Display for ProtocolError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl From<ng_repo::errors::NgError> for ProtocolError {
    fn from(e: ng_repo::errors::NgError) -> Self {
        match e {
            ng_repo::errors::NgError::InvalidSignature => ProtocolError::InvalidSignature,
            ng_repo::errors::NgError::SerializationError => ProtocolError::SerializationError,
            _ => ProtocolError::OtherError,
        }
    }
}

impl From<ObjectParseError> for ProtocolError {
    fn from(_e: ObjectParseError) -> Self {
        ProtocolError::ObjectParseError
    }
}

impl From<serde_bare::error::Error> for ProtocolError {
    fn from(_e: serde_bare::error::Error) -> Self {
        ProtocolError::SerializationError
    }
}

impl From<serde_bare::error::Error> for NetError {
    fn from(_e: serde_bare::error::Error) -> Self {
        NetError::SerializationError
    }
}

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
