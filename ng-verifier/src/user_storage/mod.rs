// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

pub mod storage;

pub use storage::*;

pub mod repo;

pub mod branch;

use ng_repo::errors::StorageError;
use serde::Deserialize;
use serde_bare::from_slice;
use std::collections::HashMap;
pub(crate) fn prop<A>(prop: u8, props: &HashMap<u8, Vec<u8>>) -> Result<A, StorageError>
where
    A: for<'a> Deserialize<'a>,
{
    Ok(from_slice(
        &props.get(&prop).ok_or(StorageError::PropertyNotFound)?,
    )?)
}
