// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Errors

use crate::commit::CommitLoadError;
use crate::types::BlockId;
use core::fmt;
use std::error::Error;

#[derive(Debug, Eq, PartialEq, Clone)]
#[repr(u16)]
pub enum NgError {
    InvalidSignature,
    SerializationError,
    InvalidKey,
    InvalidInvitation,
    InvalidCreateAccount,
    InvalidFileFormat,
    InvalidArgument,
    PermissionDenied,
    RepoLoadError,
}

impl Error for NgError {}

impl fmt::Display for NgError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
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
    fn from(_e: CommitLoadError) -> Self {
        NgError::RepoLoadError
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
