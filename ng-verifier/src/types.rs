// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Types for Verifier

use core::fmt;
//use oxigraph::io::{RdfFormat, RdfParser, RdfSerializer};
//use oxigraph::store::Store;
//use oxigraph::model::GroundQuad;
#[cfg(not(target_family = "wasm"))]
use crate::rocksdb_user_storage::RocksDbUserStorage;
use crate::user_storage::UserStorage;
use async_std::sync::Mutex;
use std::{collections::HashMap, path::PathBuf, sync::Arc};

use ng_net::{
    connection::NoiseFSM,
    types::*,
    utils::{Receiver, Sender},
};
use ng_repo::{
    block_storage::BlockStorage,
    errors::{NgError, ProtocolError, StorageError},
    file::RandomAccessFile,
    store::Store,
    types::*,
};
use serde::{Deserialize, Serialize};
use web_time::SystemTime;
//use yrs::{StateVector, Update};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum SessionPeerLastSeq {
    V0(u64),
    V1((u64, Sig)),
}

impl SessionPeerLastSeq {
    pub fn ser(&self) -> Result<Vec<u8>, NgError> {
        Ok(serde_bare::to_vec(self)?)
    }
    pub fn deser(ser: &[u8]) -> Result<Self, NgError> {
        Ok(serde_bare::from_slice(ser).map_err(|_| NgError::SerializationError)?)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VerifierType {
    /// nothing will be saved on disk during the session
    Memory,
    /// will save all user data locally, with RocksDb backend on native, and on webapp, will save only the session and wallet, not the data itself
    Save,
    /// the verifier will be remote. a Noise connection will be opened
    /// optional peerId to connect to. If None, will try any that has the flag `can_verify`
    Remote(Option<PubKey>),
    /// IndexedDb based rocksdb compiled to WASM... not ready yet. obviously. only works in the browser
    WebRocksDb,
    // Server, this type is for Server Broker that act as verifier. They answer to VerifierType::Remote types of verifier. deprecated
}

impl VerifierType {
    pub fn is_memory(&self) -> bool {
        match self {
            Self::Memory => true,
            _ => false,
        }
    }
    pub fn is_persistent(&self) -> bool {
        match self {
            Self::Save => true,
            _ => false,
        }
    }
}

//type LastSeqFn = fn(peer_id: PubKey, qty: u16) -> Result<u64, NgError>;
pub type LastSeqFn = dyn Fn(PubKey, u16) -> Result<u64, NgError> + 'static + Sync + Send;

// peer_id: PubKey, seq_num:u64, event_ser: vec<u8>,
pub type OutboxWriteFn =
    dyn Fn(PubKey, u64, Vec<u8>) -> Result<(), NgError> + 'static + Sync + Send;

// peer_id: PubKey,
pub type OutboxReadFn = dyn Fn(PubKey) -> Result<Vec<Vec<u8>>, NgError> + 'static + Sync + Send;

pub struct JsSaveSessionConfig {
    pub last_seq_function: Box<LastSeqFn>,
    pub outbox_write_function: Box<OutboxWriteFn>,
    pub outbox_read_function: Box<OutboxReadFn>,
}

impl fmt::Debug for JsSaveSessionConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "JsSaveSessionConfig")
    }
}

#[derive(Debug)]
pub enum VerifierConfigType {
    /// nothing will be saved on disk during the session
    Memory,
    /// only the session information is saved locally. the UserStorage is not saved.
    JsSaveSession(JsSaveSessionConfig),
    /// will save all user data locally, with RocksDb backend
    RocksDb(PathBuf),
    /// the verifier will be remote. a Noise connection will be opened
    /// optional peerId to connect to. If None, will try any that has the flag `can_verify`
    /// // TODO: Pass the AppConfig
    Remote(Option<PubKey>),
    /// IndexedDb based rocksdb compiled to WASM... not ready yet. obviously. only works in the browser
    WebRocksDb,
}

impl VerifierConfigType {
    pub(crate) fn should_load_last_seq_num(&self) -> bool {
        match self {
            Self::JsSaveSession(_) | Self::RocksDb(_) => true,
            _ => false,
        }
    }

    pub(crate) fn is_persistent(&self) -> bool {
        match self {
            Self::RocksDb(_) => true,
            _ => false,
        }
    }

    pub(crate) fn is_in_memory(&self) -> bool {
        match self {
            Self::Memory | Self::JsSaveSession(_) => true,
            _ => false,
        }
    }
}

#[derive(Debug)]
pub struct VerifierConfig {
    pub config_type: VerifierConfigType,
    /// not used for Memory
    pub user_master_key: [u8; 32],
    /// not used for Memory
    pub peer_priv_key: PrivKey,
    pub user_priv_key: PrivKey,
    pub private_store_read_cap: Option<ObjectRef>,
    pub private_store_id: Option<RepoId>,
}

pub type CancelFn = Box<dyn FnOnce()>;

//
// APP PROTOCOL (between APP and VERIFIER)
//

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppFetchContentV0 {
    Get, // more to be detailed
    Subscribe,
    Update,
    ReadQuery, // more to be detailed
    WriteQuery, // more to be detailed
               //Invoke,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppFetchV0 {
    pub doc_id: RepoId,

    pub branch_id: Option<BranchId>,

    pub store: StoreRepo,

    pub content: AppFetchContentV0,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppRequestContentV0 {
    FetchNuri,
    Fetch(AppFetchV0),
    Pin,
    UnPin,
    Delete,
    Create,
    FileGet, // needs the Nuri of branch/doc/store AND ObjectId
    FilePut, // needs the Nuri of branch/doc/store
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppRequestV0 {
    pub nuri: Option<String>,

    pub content: AppRequestContentV0,

    pub payload: Option<AppRequestPayload>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppRequest {
    V0(AppRequestV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum DocQuery {
    V0(String), // Sparql
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GraphUpdate {
    add: Vec<String>,
    remove: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum DiscreteUpdate {
    /// A yrs::Update
    #[serde(with = "serde_bytes")]
    YMap(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YXml(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YText(Vec<u8>),
    /// An automerge::Patch
    #[serde(with = "serde_bytes")]
    Automerge(Vec<u8>),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DocUpdate {
    heads: Vec<ObjectId>,
    graph: Option<GraphUpdate>,
    discrete: Option<DiscreteUpdate>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DocCreate {
    store: StoreRepo,
    content_type: BranchContentType,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DocDelete {
    /// Nuri of doc to delete
    nuri: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppRequestPayloadV0 {
    Create(DocCreate),
    Query(DocQuery),
    Update(DocUpdate),
    Delete(DocDelete),
    //Invoke(InvokeArguments),
    SmallFilePut(SmallFile),
    RandomAccessFilePut(String), // content_type
    RandomAccessFilePutChunk((ObjectId, serde_bytes::ByteBuf)), // end the upload with an empty vec
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppRequestPayload {
    V0(AppRequestPayloadV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum DiscretePatch {
    /// A yrs::Update
    #[serde(with = "serde_bytes")]
    YMap(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YXml(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YText(Vec<u8>),
    /// An automerge::Patch
    #[serde(with = "serde_bytes")]
    Automerge(Vec<u8>),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GraphPatch {
    /// oxigraph::model::GroundQuad serialized to n-quads with oxrdfio
    pub adds: Vec<String>,
    pub removes: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum DiscreteState {
    /// A yrs::StateVector
    #[serde(with = "serde_bytes")]
    YMap(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YXml(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YText(Vec<u8>),
    // the output of Automerge::save()
    #[serde(with = "serde_bytes")]
    Automerge(Vec<u8>),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GraphState {
    pub tuples: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppState {
    heads: Vec<ObjectId>,
    graph: Option<GraphState>, // there is always a graph present in the branch. but it might not have been asked in the request
    discrete: Option<DiscreteState>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppPatch {
    heads: Vec<ObjectId>,
    graph: Option<GraphPatch>,
    discrete: Option<DiscretePatch>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FileName {
    name: Option<String>,
    reference: ObjectRef,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppResponseV0 {
    State(AppState),
    Patch(AppPatch),
    Text(String),
    File(FileName),
    #[serde(with = "serde_bytes")]
    FileBinary(Vec<u8>),
    QueryResult, // see sparesults
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppResponse {
    V0(AppResponseV0),
}
