// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Errors

pub use crate::commit::{CommitLoadError, CommitVerifyError};
use crate::object::Object;
use num_enum::IntoPrimitive;
use num_enum::TryFromPrimitive;

use crate::types::BlockId;
use core::fmt;
use std::error::Error;

#[derive(Debug, Eq, PartialEq, Clone)]
#[repr(u16)]
pub enum NgError {
    InvalidSignature,
    IncompleteSignature,
    SerializationError,
    EncryptionError,
    DecryptionError,
    InvalidValue,
    ConnectionNotFound,
    InvalidKey,
    InvalidInvitation,
    InvalidCreateAccount,
    InvalidFileFormat,
    InvalidArgument,
    PermissionDenied,
    InvalidPazzle,
    CommitLoadError(CommitLoadError),
    ObjectParseError(ObjectParseError),
    StorageError(StorageError),
    NotFound,
    JsStorageKeyNotFound,
    IoError,
    CommitVerifyError(CommitVerifyError),
    LocalBrokerNotInitialized,
    JsStorageReadError,
    JsStorageWriteError(String),
    CannotSaveWhenInMemoryConfig,
    WalletNotFound,
    WalletAlreadyAdded,
    WalletAlreadyOpened,
    WalletError(String),
    BrokerError,
    SessionNotFound,
    SessionAlreadyStarted,
    RepoNotFound,
    BranchNotFound,
    StoreNotFound,
    UserNotFound,
    TopicNotFound,
    NotConnected,
    ActorError,
    ProtocolError(ProtocolError),
    ServerError(ServerError),
    InvalidResponse,
    NotAServerError,
    VerifierError(VerifierError),
    SiteNotFoundOnBroker,
}

impl Error for NgError {}

impl fmt::Display for NgError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WalletError(string) => write!(f, "WalletError: {}", string),
            Self::JsStorageWriteError(string) => write!(f, "JsStorageWriteError: {}", string),
            _ => write!(f, "{:?}", self),
        }
    }
}

impl From<NgError> for std::io::Error {
    fn from(err: NgError) -> std::io::Error {
        match err {
            NgError::InvalidArgument => std::io::Error::from(std::io::ErrorKind::InvalidInput),
            NgError::PermissionDenied => std::io::Error::from(std::io::ErrorKind::PermissionDenied),
            NgError::CommitLoadError(commit_load_error) => std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("CommitLoadError: {:?}", commit_load_error),
            ),
            NgError::StorageError(storage_error) => std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("StorageError: {:?}", storage_error),
            ),
            NgError::NotFound => std::io::Error::from(std::io::ErrorKind::NotFound),
            NgError::CommitVerifyError(commit_verify_error) => std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("CommitVerifyError: {:?}", commit_verify_error),
            ),
            /*NgError::InvalidSignature => ,
            NgError::IncompleteSignature =>
            NgError::SerializationError => ,
            NgError::EncryptionError => ,
            NgError::InvalidKey => ,
            NgError::InvalidInvitation => ,
            NgError::InvalidCreateAccount => ,
            NgError::InvalidFileFormat => ,
            NgError::LocalBrokerNotInitialized => ,
            NgError::JsStorageReadError => ,
            NgError::JsStorageWriteError(String) => ,
            NgError::CannotSaveWhenInMemoryConfig => ,
            NgError::WalletNotFound => ,
            NgError::WalletAlreadyAdded => ,
            NgError::WalletAlreadyOpened => ,
            NgError::WalletError(String) => ,
            NgError::BrokerError => ,
            NgError::SessionNotFound,
            NgError::IoError => ,*/
            _ => std::io::Error::new(std::io::ErrorKind::Other, err.to_string().as_str()),
        }
    }
}

impl From<serde_bare::error::Error> for NgError {
    fn from(_e: serde_bare::error::Error) -> Self {
        NgError::SerializationError
    }
}

impl From<ed25519_dalek::ed25519::Error> for NgError {
    fn from(_e: ed25519_dalek::ed25519::Error) -> Self {
        NgError::InvalidSignature
    }
}

impl From<CommitLoadError> for NgError {
    fn from(e: CommitLoadError) -> Self {
        NgError::CommitLoadError(e)
    }
}

impl From<CommitVerifyError> for NgError {
    fn from(e: CommitVerifyError) -> Self {
        NgError::CommitVerifyError(e)
    }
}

impl From<StorageError> for NgError {
    fn from(e: StorageError) -> Self {
        NgError::StorageError(e)
    }
}

impl From<VerifierError> for NgError {
    fn from(e: VerifierError) -> Self {
        match e {
            VerifierError::InvalidKey => NgError::InvalidKey,
            VerifierError::SerializationError => NgError::SerializationError,
            VerifierError::CommitLoadError(e) => NgError::CommitLoadError(e),
            VerifierError::StorageError(e) => NgError::StorageError(e),
            VerifierError::ObjectParseError(e) => NgError::ObjectParseError(e),
            VerifierError::TopicNotFound => NgError::TopicNotFound,
            VerifierError::RepoNotFound => NgError::RepoNotFound,
            VerifierError::StoreNotFound => NgError::StoreNotFound,
            VerifierError::BranchNotFound => NgError::BranchNotFound,
            _ => NgError::VerifierError(e),
        }
    }
}

/// Object parsing errors
#[derive(Debug, PartialEq, Eq, Clone)]
pub enum ObjectParseError {
    /// Missing blocks
    MissingBlocks(Vec<BlockId>),
    /// Missing root key
    MissingRootKey,
    /// Invalid BlockId encountered in the tree
    InvalidBlockId,
    /// Too many or too few children of a block
    InvalidChildren,
    /// Number of keys does not match number of children of a block
    InvalidKeys,
    /// Invalid CommitHeader object content
    InvalidHeader,
    /// Error deserializing content of a block
    BlockDeserializeError,
    /// Error deserializing content of the object
    ObjectDeserializeError,

    MissingHeaderBlocks((Object, Vec<BlockId>)),
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum StorageError {
    NotFound,
    InvalidValue,
    DifferentValue,
    BackendError,
    SerializationError,
    AlreadyExists,
    DataCorruption,
    UnknownColumnFamily,
    PropertyNotFound,
    NotAStoreRepo,
    OverlayBranchNotFound,
}

impl core::fmt::Display for StorageError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl From<serde_bare::error::Error> for StorageError {
    fn from(_e: serde_bare::error::Error) -> Self {
        StorageError::SerializationError
    }
}

#[derive(Debug, Eq, PartialEq, TryFromPrimitive, IntoPrimitive, Clone)]
#[repr(u16)]
pub enum ServerError {
    Ok = 0,
    PartialContent,
    EndOfStream,
    False,
    SequenceMismatch,
    FileError,
    RepoAlreadyOpened,
    NotFound,
    EmptyStream,
}

impl ServerError {
    pub fn is_stream(&self) -> bool {
        *self == ServerError::PartialContent || *self == ServerError::EndOfStream
    }
    pub fn is_err(&self) -> bool {
        *self != ServerError::Ok && !self.is_stream()
    }
}

#[derive(Debug, Eq, PartialEq, Clone)]
pub enum VerifierError {
    MalformedDag,
    MissingCommitInDag,
    CommitBodyNotFound,
    InvalidKey,
    SerializationError,
    OtherError(String),
    CommitLoadError(CommitLoadError),
    InvalidRepositoryCommit,
    MissingRepoWriteCapSecret,
    StorageError(StorageError),
    ObjectParseError(ObjectParseError),
    NotImplemented,
    InvalidSignatureObject,
    MalformedSyncSignatureAcks,
    MalformedSyncSignatureDeps,
    TopicNotFound,
    RepoNotFound,
    StoreNotFound,
    BranchNotFound,
    InvalidBranch,
    NoBlockStorageAvailable,
    RootBranchNotFound,
}

impl From<NgError> for VerifierError {
    fn from(e: NgError) -> Self {
        match e {
            NgError::InvalidKey => VerifierError::InvalidKey,
            NgError::RepoNotFound => VerifierError::RepoNotFound,
            NgError::BranchNotFound => VerifierError::BranchNotFound,
            NgError::SerializationError => VerifierError::SerializationError,
            // NgError::JsStorageReadError
            // NgError::JsStorageWriteError(String)
            // NgError::JsStorageKeyNotFound
            // NgError::InvalidFileFormat
            _ => VerifierError::OtherError(e.to_string()),
        }
    }
}

impl From<CommitLoadError> for VerifierError {
    fn from(e: CommitLoadError) -> Self {
        VerifierError::CommitLoadError(e)
    }
}

impl From<ObjectParseError> for VerifierError {
    fn from(e: ObjectParseError) -> Self {
        VerifierError::ObjectParseError(e)
    }
}

impl From<StorageError> for VerifierError {
    fn from(e: StorageError) -> Self {
        VerifierError::StorageError(e)
    }
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

    IoError,
    WsError,
    ActorError,
    InvalidState,
    SignatureError,
    InvalidSignature,
    SerializationError,
    AccessDenied,
    InvitationRequired,
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
    ServerError,
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

impl From<ProtocolError> for NgError {
    fn from(e: ProtocolError) -> Self {
        NgError::ProtocolError(e)
    }
}

impl From<ServerError> for NgError {
    fn from(e: ServerError) -> Self {
        NgError::ServerError(e)
    }
}

impl ProtocolError {
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

impl From<NgError> for ProtocolError {
    fn from(e: NgError) -> Self {
        match e {
            NgError::InvalidSignature => ProtocolError::InvalidSignature,
            NgError::SerializationError => ProtocolError::SerializationError,
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
