// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Errors

use crate::commit::{CommitLoadError, CommitVerifyError};

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
    InvalidKey,
    InvalidInvitation,
    InvalidCreateAccount,
    InvalidFileFormat,
    InvalidArgument,
    PermissionDenied,
    InvalidPazzle,
    CommitLoadError(CommitLoadError),
    StorageError(StorageError),
    NotFound,
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
}

impl Error for NgError {}

impl fmt::Display for NgError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WalletError(string) => write!(f, "WalletError: {}", string),
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

/// Object parsing errors
#[derive(Debug)]
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
