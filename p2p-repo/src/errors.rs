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

//! Errors

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
}

impl Error for NgError {}

impl fmt::Display for NgError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl From<serde_bare::error::Error> for NgError {
    fn from(e: serde_bare::error::Error) -> Self {
        NgError::SerializationError
    }
}

impl From<ed25519_dalek::ed25519::Error> for NgError {
    fn from(e: ed25519_dalek::ed25519::Error) -> Self {
        NgError::InvalidSignature
    }
}
