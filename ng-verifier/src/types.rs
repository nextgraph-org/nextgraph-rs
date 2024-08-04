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
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
//use oxigraph::io::{RdfFormat, RdfParser, RdfSerializer};
//use oxigraph::store::Store;
//use oxigraph::model::GroundQuad;
//use yrs::{StateVector, Update};

use ng_net::{app_protocol::*, types::*};
use ng_oxigraph::oxrdf::{GraphName, GraphNameRef, NamedNode, Quad, Triple, TripleRef};
use ng_repo::{errors::*, types::*};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GraphTransaction {
    pub inserts: Vec<Triple>,
    pub removes: Vec<Triple>,
}

impl GraphTransaction {
    pub(crate) fn as_patch(&self) -> GraphPatch {
        GraphPatch {
            inserts: serde_bare::to_vec(&self.inserts).unwrap(),
            removes: serde_bare::to_vec(&self.removes).unwrap(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum DiscreteTransaction {
    /// A serialization of a yrs::Update
    #[serde(with = "serde_bytes")]
    YMap(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YArray(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YXml(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YText(Vec<u8>),
    /// An automerge::Patch
    #[serde(with = "serde_bytes")]
    Automerge(Vec<u8>),
}

impl From<DiscreteUpdate> for DiscreteTransaction {
    fn from(update: DiscreteUpdate) -> Self {
        match update {
            DiscreteUpdate::Automerge(v) => DiscreteTransaction::Automerge(v),
            DiscreteUpdate::YMap(v) => DiscreteTransaction::YMap(v),
            DiscreteUpdate::YArray(v) => DiscreteTransaction::YArray(v),
            DiscreteUpdate::YXml(v) => DiscreteTransaction::YXml(v),
            DiscreteUpdate::YText(v) => DiscreteTransaction::YText(v),
        }
    }
}

impl DiscreteTransaction {
    pub fn to_vec(&self) -> Vec<u8> {
        match self {
            Self::YMap(v)
            | Self::YArray(v)
            | Self::YXml(v)
            | Self::YText(v)
            | Self::Automerge(v) => v.to_vec(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum TransactionBodyType {
    Graph,
    Discrete,
    Both,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionBody {
    pub body_type: TransactionBodyType,
    pub graph: Option<GraphTransaction>,
    pub discrete: Option<DiscreteTransaction>,
}

#[doc(hidden)]
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

    pub fn is_remote(&self) -> bool {
        match self {
            Self::Remote(_) => true,
            _ => false,
        }
    }
}
#[doc(hidden)]
//type LastSeqFn = fn(peer_id: PubKey, qty: u16) -> Result<u64, NgError>;
pub type LastSeqFn = dyn Fn(PubKey, u16) -> Result<u64, NgError> + 'static + Sync + Send;
#[doc(hidden)]
// peer_id: PubKey, seq_num:u64, event_ser: vec<u8>,
pub type OutboxWriteFn =
    dyn Fn(PubKey, u64, Vec<u8>) -> Result<(), NgError> + 'static + Sync + Send;
#[doc(hidden)]
// peer_id: PubKey,
pub type OutboxReadFn = dyn Fn(PubKey) -> Result<Vec<Vec<u8>>, NgError> + 'static + Sync + Send;

#[doc(hidden)]
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

#[doc(hidden)]
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
    /// headless
    Headless(Credentials),
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

    #[allow(dead_code)]
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
    pub public_store_id: Option<RepoId>,
    pub protected_store_id: Option<RepoId>,
}

#[doc(hidden)]
pub type CancelFn = Box<dyn FnOnce() + Sync + Send>;

#[doc(hidden)]
#[derive(Debug, Clone)]
pub enum BrokerPeerId {
    Local(DirectPeerId),
    Direct(DirectPeerId),
    None,
}

impl From<&BrokerPeerId> for Option<PubKey> {
    fn from(bpi: &BrokerPeerId) -> Option<PubKey> {
        match bpi {
            BrokerPeerId::Local(_) => None,
            BrokerPeerId::Direct(d) => Some(*d),
            BrokerPeerId::None => panic!("cannot connect to a broker without a peerid"),
        }
    }
}

impl From<BrokerPeerId> for Option<PubKey> {
    fn from(bpi: BrokerPeerId) -> Option<PubKey> {
        (&bpi).into()
    }
}

impl BrokerPeerId {
    pub fn new_direct(peer: DirectPeerId) -> Self {
        Self::Direct(peer)
    }
    pub fn is_some(&self) -> bool {
        match self {
            BrokerPeerId::Local(_) | BrokerPeerId::Direct(_) => true,
            _ => false,
        }
    }
    pub fn is_none(&self) -> bool {
        !self.is_some()
    }
    pub fn connected_or_err(&self) -> Result<Option<PubKey>, NgError> {
        match self {
            BrokerPeerId::None => Err(NgError::NotConnected),
            _ => Ok(self.into()),
        }
    }
    pub fn broker_peer_id(&self) -> &DirectPeerId {
        match self {
            BrokerPeerId::Local(p) | BrokerPeerId::Direct(p) => p,
            _ => panic!("dont call broker_peer_id on a BrokerPeerId::None"),
        }
    }
    pub fn is_local(&self) -> bool {
        match self {
            BrokerPeerId::Local(_) => true,
            _ => false,
        }
    }
    pub fn is_direct(&self) -> bool {
        match self {
            BrokerPeerId::Direct(_) => true,
            _ => false,
        }
    }
    pub fn is_direct_or_err(&self) -> Result<(), NgError> {
        match self {
            BrokerPeerId::Direct(_) => Ok(()),
            _ => Err(NgError::NotConnected),
        }
    }

    pub fn to_direct_if_not_local(&self, peer: DirectPeerId) -> Result<Self, VerifierError> {
        match self {
            BrokerPeerId::Local(_) => Err(VerifierError::LocallyConnected),
            _ => Ok(BrokerPeerId::Direct(peer)),
        }
    }
}
