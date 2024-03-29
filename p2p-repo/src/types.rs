// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! P2P Repo types
//!
//! Corresponds to the BARE schema

use crate::errors::NgError;
use crate::utils::{
    decode_key, dh_pubkey_array_from_ed_pubkey_slice, dh_pubkey_from_ed_pubkey_slice,
    ed_privkey_to_ed_pubkey, from_ed_privkey_to_dh_privkey, random_key,
};
use core::fmt;
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::hash::Hash;
use zeroize::{Zeroize, ZeroizeOnDrop};

//
// COMMON TYPES
//

/// 32-byte Blake3 hash digest
pub type Blake3Digest32 = [u8; 32];

/// Hash digest
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Digest {
    Blake3Digest32(Blake3Digest32),
}

impl fmt::Display for Digest {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Digest::Blake3Digest32(d) => write!(f, "{}", base64_url::encode(d)),
        }
    }
}

impl From<&Vec<u8>> for Digest {
    fn from(ser: &Vec<u8>) -> Self {
        let hash = blake3::hash(ser.as_slice());
        Digest::Blake3Digest32(hash.as_bytes().clone())
    }
}

impl From<&[u8; 32]> for Digest {
    fn from(ser: &[u8; 32]) -> Self {
        let hash = blake3::hash(ser);
        Digest::Blake3Digest32(hash.as_bytes().clone())
    }
}

impl From<&PubKey> for Digest {
    fn from(key: &PubKey) -> Self {
        key.slice().into()
    }
}

/// ChaCha20 symmetric key
pub type ChaCha20Key = [u8; 32];

/// Symmetric cryptographic key
#[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum SymKey {
    ChaCha20Key(ChaCha20Key),
}

impl SymKey {
    pub fn slice(&self) -> &[u8; 32] {
        match self {
            SymKey::ChaCha20Key(o) => o,
        }
    }
    pub fn random() -> Self {
        SymKey::ChaCha20Key(random_key())
    }
    pub fn from_array(array: [u8; 32]) -> Self {
        SymKey::ChaCha20Key(array)
    }
    #[deprecated(note = "**Don't use nil method**")]
    pub fn nil() -> Self {
        SymKey::ChaCha20Key([0; 32])
    }
    #[cfg(test)]
    pub fn dummy() -> Self {
        SymKey::ChaCha20Key([0; 32])
    }
}

impl fmt::Display for SymKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ChaCha20Key(k) => write!(f, "{}", base64_url::encode(k)),
        }
    }
}

impl TryFrom<&[u8]> for SymKey {
    type Error = NgError;
    fn try_from(buf: &[u8]) -> Result<Self, NgError> {
        let sym_key_array = *slice_as_array!(buf, [u8; 32]).ok_or(NgError::InvalidKey)?;
        let sym_key = SymKey::ChaCha20Key(sym_key_array);
        Ok(sym_key)
    }
}

/// Curve25519 public key Edwards form
pub type Ed25519PubKey = [u8; 32];

/// Curve25519 public key Montgomery form
pub type X25519PubKey = [u8; 32];

/// Curve25519 private key Edwards form
pub type Ed25519PrivKey = [u8; 32];

/// Curve25519 private key Montgomery form
pub type X25519PrivKey = [u8; 32];

/// Public key
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PubKey {
    Ed25519PubKey(Ed25519PubKey),
    X25519PubKey(X25519PubKey),
}

impl PubKey {
    pub fn slice(&self) -> &[u8; 32] {
        match self {
            PubKey::Ed25519PubKey(o) | PubKey::X25519PubKey(o) => o,
        }
    }
    pub fn to_dh_from_ed(&self) -> PubKey {
        match self {
            PubKey::Ed25519PubKey(ed) => dh_pubkey_from_ed_pubkey_slice(ed),
            _ => panic!(
                "there is no need to convert a Montgomery key to Montgomery. it is already one. check your code"
            ),
        }
    }
    // pub fn dh_from_ed_slice(slice: &[u8]) -> PubKey {
    //     dh_pubkey_from_ed_pubkey_slice(slice)
    // }
    pub fn to_dh_slice(&self) -> [u8; 32] {
        match self {
            PubKey::Ed25519PubKey(o) => dh_pubkey_array_from_ed_pubkey_slice(o),
            _ => panic!("can only convert an edward key to montgomery"),
        }
    }

    #[deprecated(note = "**Don't use nil method**")]
    pub fn nil() -> Self {
        PubKey::Ed25519PubKey([0u8; 32])
    }
}

impl fmt::Display for PubKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PubKey::Ed25519PubKey(d) | PubKey::X25519PubKey(d) => {
                write!(f, "{}", base64_url::encode(d))
            }
        }
    }
}

impl TryFrom<&str> for PubKey {
    type Error = NgError;
    fn try_from(str: &str) -> Result<Self, NgError> {
        let key = decode_key(str).map_err(|_| NgError::InvalidKey)?;
        Ok(PubKey::Ed25519PubKey(key))
    }
}

/// Private key
#[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PrivKey {
    Ed25519PrivKey(Ed25519PrivKey),
    X25519PrivKey(X25519PrivKey),
}

impl PrivKey {
    pub fn slice(&self) -> &[u8; 32] {
        match self {
            PrivKey::Ed25519PrivKey(o) | PrivKey::X25519PrivKey(o) => o,
        }
    }
    pub fn to_pub(&self) -> PubKey {
        match self {
            PrivKey::Ed25519PrivKey(_) => ed_privkey_to_ed_pubkey(self),
            _ => panic!("X25519PrivKey to pub not implemented"),
        }
    }

    #[deprecated(note = "**Don't use nil method**")]
    pub fn nil() -> PrivKey {
        PrivKey::Ed25519PrivKey([0u8; 32])
    }

    #[cfg(test)]
    pub fn dummy() -> PrivKey {
        PrivKey::Ed25519PrivKey([0u8; 32])
    }

    pub fn to_dh(&self) -> PrivKey {
        from_ed_privkey_to_dh_privkey(self)
    }

    pub fn random_ed() -> Self {
        PrivKey::Ed25519PrivKey(random_key())
    }
}

impl From<[u8; 32]> for PrivKey {
    fn from(buf: [u8; 32]) -> Self {
        let priv_key = PrivKey::Ed25519PrivKey(buf);
        priv_key
    }
}

impl TryFrom<&[u8]> for PrivKey {
    type Error = NgError;
    fn try_from(buf: &[u8]) -> Result<Self, NgError> {
        let priv_key_array = *slice_as_array!(buf, [u8; 32]).ok_or(NgError::InvalidKey)?;
        let priv_key = PrivKey::Ed25519PrivKey(priv_key_array);
        Ok(priv_key)
    }
}

impl TryFrom<&str> for PrivKey {
    type Error = NgError;
    fn try_from(str: &str) -> Result<Self, NgError> {
        let key = decode_key(str).map_err(|_| NgError::InvalidKey)?;
        Ok(PrivKey::Ed25519PrivKey(key))
    }
}

impl fmt::Display for PrivKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Ed25519PrivKey(ed) => {
                //let priv_key_ser = serde_bare::to_vec(ed).unwrap();
                let priv_key_encoded = base64_url::encode(ed);
                write!(f, "{}", priv_key_encoded)
            }
            _ => {
                unimplemented!();
            }
        }
    }
}

/// Ed25519 signature
pub type Ed25519Sig = [[u8; 32]; 2];

/// Cryptographic signature
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Sig {
    Ed25519Sig(Ed25519Sig),
}

impl fmt::Display for Sig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Ed25519Sig(ed) => {
                write!(
                    f,
                    "{} {}",
                    base64_url::encode(&ed[0]),
                    base64_url::encode(&ed[1])
                )
            }
        }
    }
}

/// Timestamp: absolute time in minutes since 2022-02-22 22:22 UTC
pub type Timestamp = u32;

pub const EPOCH_AS_UNIX_TIMESTAMP: u64 = 1645568520;

/// Relative time (e.g. delay from current time)
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RelTime {
    Seconds(u8),
    Minutes(u8),
    Hours(u8),
    Days(u8),
}

impl fmt::Display for RelTime {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Seconds(s) => writeln!(f, "{} sec.", s),
            Self::Minutes(s) => writeln!(f, "{} min.", s),
            Self::Hours(s) => writeln!(f, "{} h.", s),
            Self::Days(s) => writeln!(f, "{} d.", s),
        }
    }
}

/// Bloom filter (variable size)
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BloomFilter {
    /// Number of hash functions
    pub k: u32,

    /// Filter
    #[serde(with = "serde_bytes")]
    pub f: Vec<u8>,
}

/// Bloom filter (128 B)
///
/// (m=1024; k=7; p=0.01; n=107)
pub type BloomFilter128 = [[u8; 32]; 4];

/// Bloom filter (1 KiB)
///
/// (m=8192; k=7; p=0.01; n=855)
pub type BloomFilter1K = [[u8; 32]; 32];

//
// REPOSITORY TYPES
//

/// RepoId is a PubKey
pub type RepoId = PubKey;

/// RepoHash is the BLAKE3 Digest over the RepoId
pub type RepoHash = Digest;

// impl From<RepoHash> for String {
//     fn from(id: RepoHash) -> Self {
//         hex::encode(to_vec(&id).unwrap())
//     }
// }

/// Topic ID: public key of the topic
pub type TopicId = PubKey;

/// User ID: user account for broker
pub type UserId = PubKey;

/// BranchId is a PubKey
pub type BranchId = PubKey;

/// Block ID:
/// BLAKE3 hash over the serialized BlockContent (contains encrypted content)
pub type BlockId = Digest;

pub type BlockKey = SymKey;

/// Block reference
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct BlockRef {
    /// Object ID
    pub id: BlockId,

    /// Key for decrypting the Object
    pub key: BlockKey,
}

impl BlockId {
    #[cfg(test)]
    pub fn dummy() -> Self {
        Digest::Blake3Digest32([0u8; 32])
    }

    #[deprecated(note = "**Don't use nil method**")]
    pub fn nil() -> Self {
        Digest::Blake3Digest32([0u8; 32])
    }
}

impl BlockRef {
    #[cfg(test)]
    pub fn dummy() -> Self {
        BlockRef {
            id: Digest::Blake3Digest32([0u8; 32]),
            key: SymKey::ChaCha20Key([0u8; 32]),
        }
    }

    #[deprecated(note = "**Don't use nil method**")]
    pub fn nil() -> Self {
        BlockRef {
            id: Digest::Blake3Digest32([0u8; 32]),
            key: SymKey::ChaCha20Key([0u8; 32]),
        }
    }

    pub fn from_id_key(id: BlockId, key: BlockKey) -> Self {
        BlockRef { id, key }
    }
}

impl From<BlockRef> for (BlockId, BlockKey) {
    fn from(blockref: BlockRef) -> (BlockId, BlockKey) {
        (blockref.id.clone(), blockref.key.clone())
    }
}

impl From<(&BlockId, &BlockKey)> for BlockRef {
    fn from(id_key: (&BlockId, &BlockKey)) -> Self {
        BlockRef {
            id: id_key.0.clone(),
            key: id_key.1.clone(),
        }
    }
}

impl fmt::Display for BlockRef {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} {}", self.id, self.key)
    }
}

/// Object ID
pub type ObjectId = BlockId;

/// Object Key
pub type ObjectKey = BlockKey;

/// Object reference
pub type ObjectRef = BlockRef;

/// Read capability (for a commit, branch, whole repo, or store)
/// For a store: A ReadCap to the root repo of the store
/// For a repo: A reference to the latest RootBranch definition commit
/// For a branch: A reference to the latest Branch definition commit
/// For a commit or object, the ObjectRef is itself the read capability
pub type ReadCap = ObjectRef;

/// Read capability secret (for a commit, branch, whole repo, or store)
/// it is already included in the ReadCap (it is the key part of the reference)
pub type ReadCapSecret = ObjectKey;

/// Write capability secret (for a whole repo)
pub type RepoWriteCapSecret = SymKey;

/// Write capability secret (for a branch's topic)
pub type BranchWriteCapSecret = PrivKey;

//TODO: PermaReadCap (involves sending an InboxPost to some verifiers)

//
// IDENTITY, SITE, STORE, OVERLAY common types
//

/// List of Identity types
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Identity {
    OrgSite(PubKey),
    IndividualSite(PubKey),
    OrgPublicStore(PubKey),
    OrgProtectedStore(PubKey),
    OrgPrivateStore(PubKey),
    IndividualPublicStore(PubKey),
    IndividualProtectedStore(PubKey),
    IndividualPrivateStore(PubKey),
    //Document(RepoId),
}

/// List of Store Overlay types
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum StoreOverlayV0 {
    PublicStore(PubKey),
    ProtectedStore(PubKey),
    //PrivateStore(PubKey),
    Group(PubKey),
    Dialog(Digest),
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum StoreOverlay {
    V0(StoreOverlayV0),
    Own(BranchId), // The repo is a store, so the overlay can be derived from its own ID. In this case, the branchId of the `overlay` branch is entered here.
}

impl fmt::Display for StoreOverlay {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "StoreOverlay V0")?;
                match v0 {
                    StoreOverlayV0::PublicStore(k) => writeln!(f, "PublicStore: {}", k),
                    StoreOverlayV0::ProtectedStore(k) => writeln!(f, "ProtectedStore: {}", k),
                    StoreOverlayV0::Group(k) => writeln!(f, "Group: {}", k),
                    StoreOverlayV0::Dialog(k) => writeln!(f, "Dialog: {}", k),
                }
            }
            Self::Own(b) => writeln!(f, "Own: {}", b),
        }
    }
}

/// List of Store Root Repo types
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum StoreRepoV0 {
    PublicStore(RepoId),
    ProtectedStore(RepoId),
    //PrivateStore(RepoId),
    Group(RepoId),
    Dialog(RepoId),
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum StoreRepo {
    V0(StoreRepoV0),
}

impl StoreRepo {
    pub fn repo_id(&self) -> &RepoId {
        match self {
            Self::V0(v0) => match v0 {
                StoreRepoV0::PublicStore(id)
                | StoreRepoV0::ProtectedStore(id)
                //| StoreRepoV0::PrivateStore(id)
                | StoreRepoV0::Group(id)
                | StoreRepoV0::Dialog(id) => id,
            },
        }
    }
    #[cfg(test)]
    #[allow(deprecated)]
    pub fn dummy_public_v0() -> (Self, SymKey) {
        let readcap = SymKey::dummy();
        let store_pubkey = PubKey::nil();
        (
            StoreRepo::V0(StoreRepoV0::PublicStore(store_pubkey)),
            readcap,
        )
    }
}

/// Site type
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum SiteType {
    Org,
    Individual, // formerly Personal
}

/// Site Store
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct SiteStore {
    // pub identity: Identity,
    pub key: PrivKey,
    // signature with site_key
    // pub sig: Sig,
    /// current read capabililty
    pub read_cap: ReadCap,

    pub write_cap: RepoWriteCapSecret,
}

/// Site Store type
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum SiteStoreType {
    Public,
    Protected,
    Private,
}

/// Site V0
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct SiteV0 {
    pub site_type: SiteType,
    // Identity::OrgSite or Identity::IndividualSite
    // pub site_identity: Identity,
    pub site_key: PrivKey,

    // Identity::OrgPublicStore or Identity::IndividualPublicStore
    pub public: SiteStore,

    // Identity::OrgProtectedStore or Identity::IndividualProtectedStore
    pub protected: SiteStore,

    // Identity::OrgPrivateStore or Identity::IndividualPrivateStore
    pub private: SiteStore,

    pub cores: Vec<(PubKey, Option<[u8; 32]>)>,

    pub bootstraps: Vec<PubKey>,
}

/// Reduced Site (for QRcode)
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct ReducedSiteV0 {
    pub site_key: PrivKey,

    pub private_site_key: PrivKey,

    pub private_site_read_cap: ReadCap,

    pub private_site_write_cap: RepoWriteCapSecret,

    pub core: PubKey,

    pub bootstraps: Vec<PubKey>,
}

/// BLOCKS common types

/// Internal node of a Merkle tree
pub type InternalNode = Vec<BlockKey>;

/// encrypted_content of BlockContentV0: a Merkle tree node
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum ChunkContentV0 {
    /// Internal node with references to children
    InternalNode(InternalNode),

    #[serde(with = "serde_bytes")]
    DataChunk(Vec<u8>),
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CommitHeaderV0 {
    /// optional Commit Header ID
    #[serde(skip)]
    pub id: Option<ObjectId>,

    /// Other objects this commit strongly depends on (ex: ADD for a REMOVE, files for an nfiles)
    pub deps: Vec<ObjectId>,

    /// dependency that is removed after this commit. used for reverts
    pub ndeps: Vec<ObjectId>,

    /// tells brokers that this is a hard snapshot and that all the ACKs and full causal past should be treated as ndeps (their body removed)
    /// brokers will only perform the deletion of bodies after this commit has been ACKed by at least one subsequent commit
    /// but if the next commit is a nack, the deletion is prevented.
    pub compact: bool,

    /// current valid commits in head
    pub acks: Vec<ObjectId>,

    /// head commits that are invalid
    pub nacks: Vec<ObjectId>,

    /// list of Files that are referenced in this commit
    pub files: Vec<ObjectId>,

    /// list of Files that are not referenced anymore after this commit
    /// the commit(s) that created the files should be in deps
    pub nfiles: Vec<ObjectId>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum CommitHeader {
    V0(CommitHeaderV0),
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CommitHeaderKeysV0 {
    /// Other objects this commit strongly depends on (ex: ADD for a REMOVE, files for an nfiles)
    pub deps: Vec<ObjectKey>,

    // ndeps keys are not included because we don't need the keys to access the commits we will not need anymore
    // the keys are in the deps of their respective subsequent commits in the DAG anyway
    /// current valid commits in head
    pub acks: Vec<ObjectKey>,

    /// head commits that are invalid
    pub nacks: Vec<ObjectKey>,

    /// list of Files that are referenced in this commit. Exceptionally this is an ObjectRef, because
    /// even if the CommitHeader is omitted, we want the Files to be openable.
    pub files: Vec<ObjectRef>,
    // nfiles keys are not included because we don't need the keys to access the files we will not need anymore
    // the keys are in the deps of the respective commits that added them anyway
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum CommitHeaderKeys {
    V0(CommitHeaderKeysV0),
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum CommitHeaderObject {
    Id(ObjectId),
    EncryptedContent(Vec<u8>),
    None,
    RandomAccess,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CommitHeaderRef {
    pub obj: CommitHeaderObject,
    pub key: ObjectKey,
}

impl CommitHeaderRef {
    pub fn from_id_key(id: BlockId, key: ObjectKey) -> Self {
        CommitHeaderRef {
            obj: CommitHeaderObject::Id(id),
            key,
        }
    }
    pub fn from_content_key(content: Vec<u8>, key: ObjectKey) -> Self {
        CommitHeaderRef {
            obj: CommitHeaderObject::EncryptedContent(content),
            key,
        }
    }
    pub fn encrypted_content_len(&self) -> usize {
        match &self.obj {
            CommitHeaderObject::EncryptedContent(ec) => ec.len(),
            _ => 0,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BlockContentV0 {
    /// Reference (actually, only its ID or an embedded block if the size is small enough)
    /// to a CommitHeader of the root Block of a commit that contains references to other objects (e.g. Commit deps & acks)
    /// Only set if the block is a commit (and it is the root block of the Object).
    /// It is an easy way to know if the Block is a commit (but be careful because some root commits can be without a header).
    pub commit_header: CommitHeaderObject,

    /// Block IDs for child nodes in the Merkle tree,
    /// is empty if ObjectContent fits in one block or this block is a leaf. in both cases, encrypted_content is then not empty
    pub children: Vec<BlockId>,

    /// contains encrypted ChunkContentV0 (entirety, when fitting, or chunks of ObjectContentV0, in DataChunk) used for leaves of the Merkle tree,
    /// or to store the keys of children (in InternalNode)
    ///
    /// Encrypted using convergent encryption with ChaCha20:
    /// - convergence_key: BLAKE3 derive_key ("NextGraph Data BLAKE3 key",
    ///                                        StoreRepo + store's repo ReadCapSecret )
    ///                                     // basically similar to the InnerOverlayId but not hashed, so that brokers cannot do preimage attack
    /// - key: BLAKE3 keyed hash (convergence_key, plain_chunk_content)
    /// - nonce: 0
    #[serde(with = "serde_bytes")]
    pub encrypted_content: Vec<u8>,
}

/// Immutable object with encrypted content
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum BlockContent {
    V0(BlockContentV0),
}

impl BlockContent {
    pub fn commit_header_obj(&self) -> &CommitHeaderObject {
        match self {
            Self::V0(v0) => &v0.commit_header,
        }
    }
}

/// Immutable block with encrypted content
///
/// `ObjectContent` is chunked and stored as `Block`s in a Merkle tree.
/// A Block is a Merkle tree node.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BlockV0 {
    /// Block ID
    #[serde(skip)]
    pub id: Option<BlockId>,

    /// Block Key
    #[serde(skip)]
    pub key: Option<SymKey>,

    /// Header
    // #[serde(skip)]
    // TODO
    // pub header: Option<CommitHeader>,

    /// Key needed to open the CommitHeader. can be omitted if the Commit is shared without its ancestors,
    /// or if the block is not a root block of commit, or that commit is a root commit (first in branch)
    pub commit_header_key: Option<ObjectKey>,

    pub content: BlockContent,
}

/// Immutable block with encrypted content
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Block {
    V0(BlockV0),
}

/// REPO IMPLEMENTATION

/// Repository definition
///
/// First commit published in root branch, signed by repository key
/// For the Root repo of a store(overlay), the convergence_key should be derived from :
/// "NextGraph Store Root Repo BLAKE3 convergence key",
///                                     RepoId + RepoWriteCapSecret)
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RepositoryV0 {
    /// Repo public key ID
    pub id: RepoId,

    /// Verification program (WASM)
    #[serde(with = "serde_bytes")]
    pub verification_program: Vec<u8>,

    /// User ID who created this repo
    pub creator: Option<UserId>,

    // TODO: discrete doc type
    // TODO: order (store, partial order, partial sign all commits,(conflict resolution strategy), total order, fsm, smart contract )
    // TODO: immutable conditions (allow_change_owners, allow_change_quorum, min_quorum, allow_inherit_perms, signers_can_be_editors, all_editors_are_signers, etc...)
    /// Immutable App-specific metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

/// Repository definition
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Repository {
    V0(RepositoryV0),
}

impl fmt::Display for Repository {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "V0")?;
                writeln!(f, "repo_id: {}", v0.id)?;
                writeln!(
                    f,
                    "creator: {}",
                    v0.creator.map_or("None".to_string(), |c| format!("{}", c))
                )?;
                Ok(())
            }
        }
    }
}

/// Root Branch definition V0
///
/// Second commit in the root branch, signed by repository key
/// is used also to update the root branch definition when users are removed, quorum(s) are changed, repo is moved to other store.
/// In this case, it is signed by its author, and requires an additional group signature by the total_order_quorum or by the owners_quorum.
/// DEPS: Reference to the previous root branch definition commit, if it is an update
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RootBranchV0 {
    /// Branch public key ID, equal to the repo_id
    pub id: PubKey,

    /// Reference to the repository commit, to get the verification_program and other immutable details
    pub repo: ObjectRef,

    /// Store ID the repo belongs to
    /// the identity is checked by verifiers (check members, check overlay is matching)
    pub store: StoreOverlay,

    /// signature of repoId with MODIFY_STORE_KEY privkey of store
    /// in order to verify that the store recognizes this repo as part of itself.
    /// only if not a store root repo itself
    pub store_sig: Option<Sig>,

    /// Pub/sub topic ID for publishing events about the root branch
    pub topic: TopicId,

    /// topic private key (a BranchWriteCapSecret), encrypted with a key derived as follow
    /// BLAKE3 derive_key ("NextGraph Branch WriteCap Secret BLAKE3 key",
    ///                                        RepoWriteCapSecret, TopicId, BranchId )
    /// so that only editors of the repo can decrypt the privkey
    #[serde(with = "serde_bytes")]
    pub topic_privkey: Vec<u8>,

    /// if set, permissions are inherited from Store Repo.
    /// Optional is a store_read_cap
    /// (only set if this repo is not the store repo itself)
    /// check that it matches the self.store
    /// can only be committed by an owner
    /// owners are not inherited from store
    // TODO: ReadCap or PermaReadCap. If it is a ReadCap, a new RootBranch commit should be published (RefreshReadCap) every time the store read cap changes.
    pub inherit_perms_users_and_quorum_from_store: Option<ReadCap>,

    /// Quorum definition ObjectRef
    /// TODO: ObjectKey should be encrypted with SIGNER_KEY ?
    /// TODO: chain of trust
    pub quorum: Option<ObjectRef>,

    /// BEC periodic reconciliation interval. zero deactivates it
    pub reconciliation_interval: RelTime,

    // list of owners. all of them are required to sign any RootBranch that modifies the list of owners or the inherit_perms_users_and_quorum_from_store field.
    pub owners: Vec<UserId>,

    /// Mutable App-specific metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

/// RootBranch definition
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RootBranch {
    V0(RootBranchV0),
}

impl RootBranch {
    pub fn owners(&self) -> &Vec<UserId> {
        match self {
            Self::V0(v0) => &v0.owners,
        }
    }
}

impl fmt::Display for RootBranch {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "V0")?;
                writeln!(f, "repo_id:   {}", v0.id)?;
                writeln!(f, "repo_ref:  {}", v0.repo)?;
                write!(f, "store:     {}", v0.store)?;
                writeln!(
                    f,
                    "store_sig: {}",
                    v0.store_sig
                        .map_or("None".to_string(), |c| format!("{}", c))
                )?;
                writeln!(f, "topic:     {}", v0.repo)?;
                writeln!(
                    f,
                    "inherit_perms: {}",
                    v0.inherit_perms_users_and_quorum_from_store
                        .as_ref()
                        .map_or("None".to_string(), |c| format!("{}", c))
                )?;
                writeln!(
                    f,
                    "quorum: {}",
                    v0.quorum
                        .as_ref()
                        .map_or("None".to_string(), |c| format!("{}", c))
                )?;
                writeln!(f, "reconciliation_interval: {}", v0.reconciliation_interval)?;
                Ok(())
            }
        }
    }
}

/// Quorum definition V0
///
/// Changed when the signers need to be updated. Signers are not necessarily editors of the repo, and they do not need to be members either, as they will be notified of RefreshReadCaps anyway.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct QuorumV0 {
    /// Number of signatures required for a partial order commit to be valid (threshold+1)
    pub partial_order_quorum: u32,

    /// List of the users who can sign for partial order
    pub partial_order_users: Vec<UserId>,

    /// Number of signatures required for a total order commit to be valid (threshold+1)
    pub total_order_quorum: u32,

    /// List of the users who can sign for total order
    pub total_order_users: Vec<UserId>,

    /// cryptographic material for Threshold signature
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

/// Quorum definition, is part of the RootBranch commit
/// TODO: can it be sent in the root branch without being part of a RootBranch ?
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Quorum {
    V0(QuorumV0),
}

/// Branch definition
///
/// First commit in a branch, signed by branch key
/// In case of a fork, the commit DEPS indicate
/// the previous branch heads, and the ACKS are empty.
///
/// Can be used also to update the branch definition when users are removed
/// In this case, the total_order quorum is needed, and DEPS indicates the previous branch definition, ACKS indicate the current HEAD
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BranchV0 {
    /// Branch public key ID
    pub id: PubKey,

    /// Reference to the repository commit
    pub repo: ObjectRef,

    /// object ID of the current root_branch commit (ReadCap), in order to keep in sync this branch with root_branch
    /// The key is not provided as external readers should not be able to access the root branch definition.
    /// it is only used by verifiers (who have the key already)
    pub root_branch_readcap_id: ObjectId,

    /// Pub/sub topic for publishing events
    pub topic: PubKey,

    /// topic private key (a BranchWriteCapSecret), encrypted with a key derived as follow
    /// BLAKE3 derive_key ("NextGraph Branch WriteCap Secret BLAKE3 key",
    ///                                        RepoWriteCapSecret, TopicId, BranchId )
    /// so that only editors of the repo can decrypt the privkey
    #[serde(with = "serde_bytes")]
    pub topic_privkey: Vec<u8>,

    // TODO: chain of trust
    /// App-specific metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

/// Branch definition
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Branch {
    V0(BranchV0),
}

/// Add a branch to the repository
/// DEPS: if update branch: previous AddBranch commit of the same branchId
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AddBranchV0 {
    /// the new topic_id (will be needed immediately by future readers
    /// in order to subscribe to the pub/sub). should be identical to the one in the Branch definition
    topic_id: TopicId,

    // the new branch definition commit
    // (we need the ObjectKey in order to open the pub/sub Event)
    branch_read_cap: ReadCap,
}

/// Add a branch to the repository
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AddBranch {
    V0(AddBranchV0),
}

pub type RemoveBranchV0 = ();

/// Remove a branch from the repository
///
/// DEPS: should point to the previous AddBranch.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RemoveBranch {
    V0(RemoveBranchV0),
}

/// Add member to a repo
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AddMemberV0 {
    /// Member to add
    pub member: UserId,

    /// App-specific metadata
    /// (role, app level permissions, cryptographic material, etc)
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AddMember {
    V0(AddMemberV0),
}

/// Remove member from a repo
/// An owner cannot be removed
/// The overlay should be refreshed if user was malicious, after the user is removed from last repo. See REFRESH_READ_CAP on store repo.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RemoveMemberV0 {
    /// Member to remove
    pub member: UserId,

    /// should this user be banned and prevented from being invited again by anybody else
    pub banned: bool,

    /// Metadata
    /// (reason, etc...)
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RemoveMember {
    V0(RemoveMemberV0),
}

/// Permissions
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PermissionV0 {
    Create, // Used internally by the creator at creation time. Not part of the permission set that can added and removed
    Owner,  // used internally for owners

    //
    // permissions delegated by owners and admins (all admins inherit them)
    //
    AddReadMember, // adds a member to the repo (AddMember). without additional perm, the user is a reader. always behind SyncSignature
    RemoveMember, // if user has any specific perm, RemoveWritePermission, RefreshWriteCap and/or Admin permission is needed. always behind SyncSignature
    AddWritePermission, // can send AddPermission that add 3 perms to other user: WriteAsync, WriteSync, and RefreshWriteCap
    WriteAsync, // can send AsyncTransaction, AddFile, RemoveFile, Snapshot, optionally with AsyncSignature
    WriteSync,  // can send SyncTransaction, AddFile, RemoveFile, always behind SyncSignature
    Compact,    // can send Compact, always behind SyncSignature
    RemoveWritePermission, // can send RemovePermission that remove the WriteAsync, WriteSync or RefreshWriteCap permissions from user. RefreshWriteCap will probably be needed by the user who does the RemovePermission

    AddBranch,    // can send AddBranch and Branch commits, always behind SyncSignature
    RemoveBranch, // can send removeBranch, always behind SyncSignature
    ChangeName,   // can send AddName and RemoveName

    RefreshReadCap, // can send RefreshReadCap followed by UpdateRootBranch and/or UpdateBranch commits, with or without renewed topicIds. Always behind SyncSignature
    RefreshWriteCap, // can send RefreshWriteCap followed by UpdateRootBranch and associated UpdateBranch commits on all branches, with renewed topicIds and RepoWriteCapSecret. Always behind SyncSignature

    //
    // permissions delegated by owners:
    //
    ChangeQuorum, // can add and remove Signers, change the quorum thresholds for total order and partial order. implies the RefreshReadCap perm (without changing topicids). Always behind SyncSignature
    Admin, // can administer the repo: assigns perms to other user with AddPermission and RemovePermission. RemovePermission always behind SyncSignature
    ChangeMainBranch,

    // other permissions. TODO: specify them more in details
    Chat,           // can chat
    Inbox,          // can read inbox
    PermaShare,     // can create and answer to PermaReadCap PermaWriteCap PermaLink
    UpdateStore,    // only for store root repo (add doc, remove doc) to the store special branch
    RefreshOverlay, // Equivalent to RefreshReadCap for the overlay special branch.
}

/// Add permission to a member in a repo
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AddPermissionV0 {
    /// Member receiving the permission
    pub member: UserId,

    /// Permission given to user
    pub permission: PermissionV0,

    /// Metadata
    /// (role, app level permissions, cryptographic material, etc)
    /// Can be some COMMON KEY privkey encrypted with the user pubkey
    /// If a PROOF for the common key is needed, should be sent here too
    /// COMMON KEYS are: SHARE, INBOX,
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AddPermission {
    V0(AddPermissionV0),
}

impl AddPermission {
    pub fn permission_v0(&self) -> &PermissionV0 {
        match self {
            Self::V0(v0) => &v0.permission,
        }
    }
}

/// Remove permission from a user in a repo
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RemovePermissionV0 {
    /// Member to remove
    pub member: UserId,

    /// Permission removed from user
    pub permission: PermissionV0,

    /// Metadata
    /// (reason, new cryptographic materials...)
    /// If the permission was linked to a COMMON KEY, a new privkey should be generated
    /// and sent to all users that still have this permission, encrypted with their respective pubkey
    /// If a PROOF for the common key is needed, should be sent here too
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RemovePermission {
    V0(RemovePermissionV0),
}

impl RemovePermission {
    pub fn permission_v0(&self) -> &PermissionV0 {
        match self {
            Self::V0(v0) => &v0.permission,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RepoNamedItemV0 {
    Branch(BranchId),
    Commit(ObjectId),
    File(ObjectId),
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RepoNamedItem {
    V0(RepoNamedItemV0),
}

/// Add a new name in the repo that can point to a branch, a commit or a file
/// Or change the value of a name
/// DEPS: if it is a change of value: all the previous AddName commits seen for this name
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AddNameV0 {
    /// the name. in case of conflict, the smallest Id is taken.
    /// names `main`, `chat`, `store` are reserved
    pub name: String,

    /// A branch, commit or file
    pub item: RepoNamedItem,

    /// Metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AddName {
    V0(AddNameV0),
}

/// Change the main branch
/// DEPS: previous ChangeMainBranchV0
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct ChangeMainBranchV0 {
    pub branch: BranchId,

    /// Metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum ChangeMainBranch {
    V0(ChangeMainBranchV0),
}

/// Remove a name from the repo, using ORset CRDT logic
/// DEPS: all the AddName commits seen for this name
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RemoveNameV0 {
    /// name to remove
    /// names `main`, `chat`, `store` are reserved
    pub name: String,

    /// Metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RemoveName {
    V0(RemoveNameV0),
}

/// Transaction with CRDT operations
// TODO: edeps: List<(repo_id,ObjectRef)>
// TODO: rcpts: List<repo_id>
pub type TransactionV0 = Vec<u8>;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Transaction {
    #[serde(with = "serde_bytes")]
    V0(TransactionV0),
}

/// Add a new binary file in a branch
/// FILES: the file ObjectRef
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AddFileV0 {
    /// an optional name. does not conflict (not unique across the branch nor repo)
    pub name: Option<String>,

    /// Metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AddFile {
    V0(AddFileV0),
}

/// Remove a file from the branch, using ORset CRDT logic
/// (removes the ref counting. not necessarily the file itself)
/// NFILES: the file ObjectRef
/// DEPS: all the visible AddFile commits in the branch (ORset)
pub type RemoveFileV0 = ();

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RemoveFile {
    V0(RemoveFileV0),
}

/// Snapshot of a Branch
///
/// Contains a data structure
/// computed from the commits at the specified head.
/// ACKS contains the head the snapshot was made from
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct SnapshotV0 {
    // Branch heads the snapshot was made from, can be useful when shared outside and the commit_header_key is set to None. otherwise it is redundant to ACKS
    pub heads: Vec<ObjectId>,

    /// Snapshot data structure
    #[serde(with = "serde_bytes")]
    pub content: Vec<u8>,
}

/// Snapshot of a Branch
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Snapshot {
    V0(SnapshotV0),
}

/// Compact: Hard Snapshot of a Branch
///
/// Contains a data structure
/// computed from the commits at the specified head.
/// ACKS contains the head the snapshot was made from
///
/// hard snapshot will erase all the CommitBody of ancestors in the branch
/// the compact boolean should be set in the Header too.
/// after a hard snapshot, it is recommended to refresh the read capability (to empty the topics of they keys they still hold)
/// If a branch is based on a hard snapshot, it cannot be merged back into the branch where the hard snapshot was made.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CompactV0 {
    // Branch heads the snapshot was made from, can be useful when shared outside and the commit_header_key is set to None. otherwise it is redundant to ACKS
    pub heads: Vec<ObjectId>,

    /// Snapshot data structure
    #[serde(with = "serde_bytes")]
    pub content: Vec<u8>,
}

/// Snapshot of a Branch
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Compact {
    V0(CompactV0),
}

/// Async Threshold Signature of a commit V0 based on the partial order quorum
/// Can sign Transaction, AddFile, and Snapshot, after they have been committed to the DAG.
/// DEPS: the signed commits
// #[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
// pub struct AsyncSignatureV0 {
//     /// An Object containing the Threshold signature
//     pub signature: ObjectRef,
// }

/// Async Threshold Signature of a commit based on the partial order quorum
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AsyncSignature {
    V0(ObjectRef),
}

/// Sync Threshold Signature of one or a chain of commits . V0 . based on the total order quorum
/// mandatory for UpdateRootBranch, UpdateBranch, ChangeMainBranch, AddBranch, RemoveBranch, AddMember, RemoveMember, RemovePermission, Quorum, Compact, sync Transaction, RefreshReadCap, RefreshWriteCap
/// DEPS: the last signed commit in chain
/// ACKS: previous head before the chain of signed commit(s). should be identical to the HEADS (marked as DEPS) of first commit in chain
// #[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
// pub struct SyncSignatureV0 {
//     /// An Object containing the Threshold signature
//     pub signature: ObjectRef,
// }

/// Threshold Signature of a commit
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum SyncSignature {
    V0(ObjectRef),
}

/// RefreshReadCap. renew the ReadCap of a `transactional` branch, or the root_branch, or all transactional branches and the root_branch.
/// Each branch forms its separate chain for that purpose.
/// can refresh the topic ids, or not
/// DEPS: current HEADS in the branch at the moment of refresh.
/// followed in the chain by a Branch or RootBranch commit (linked with ACK). The key used in EventV0 for the commit in the future of the RefreshReadCap, is the refresh_secret.
/// the chain can be, by example: RefreshReadCap -> RootBranch -> AddBranch
/// or for a transactional branch: RefreshReadCap -> Branch
/// always eventually followed at the end of each chain by a SyncSignature (each branch its own)
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RefreshReadCapV0 {
    /// A randomly generated secret (SymKey) used for the refresh process, encrypted for each Member, Signer and Owner of the repo (except the one that is being excluded, if any)
    /// format to be defined (see crypto_box)
    RefreshSecret(),

    // or a reference to a master RefreshReadCap commit when some transactional branches are refreshed together with the root_branch. the refresh_secret is taken from that referenced commit
    MasterRefresh(ObjectRef),
}

/// RefreshReadCap
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RefreshReadCap {
    V0(RefreshReadCapV0),
}

/// RefreshWriteCap is always done on the root_branch, and always refreshes all the transaction branches WriteCaps, and TopicIDs.
/// DEPS: current HEADS in the branch at the moment of refresh.
/// the chain on the root_branch is : RefreshWriteCap -> RootBranch -> optional AddPermission(s) -> AddBranch
/// and on each transactional branch: RefreshWriteCap -> Branch
/// always eventually followed at the end of each chain by a SyncSignature (each branch its own)
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RefreshWriteCapV0 {
    /// A RefreshReadCapV0::RefreshSecret when on the root_branch, otherwise on transactional branches, a RefreshReadCapV0::MasterRefresh pointing to this RefreshWriteCapV0
    pub refresh_read_cap: RefreshReadCapV0,

    /// the new RepoWriteCapSecret, encrypted for each Editor (any Member that also has at least one permission, plus all the Owners). See format of RefreshSecret
    // TODO: format. should be encrypted
    // None when used for a transaction branch, as we don't want to duplicate this encrypted secret in each branch.
    pub write_secret: Option<RepoWriteCapSecret>,
}

/// RefreshWriteCap
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RefreshWriteCap {
    V0(RefreshWriteCapV0),
}

/// A Threshold Signature content
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct SignatureContentV0 {
    /// list of all the "end of chain" commit for each branch when doing a SyncSignature, or a list of arbitrary commits to sign, for AsyncSignature.
    pub commits: Vec<ObjectRef>,
}

/// A Signature content
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum SignatureContent {
    V0(SignatureContentV0),
}

/// A Threshold Signature and the set used to generate it
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum ThresholdSignatureV0 {
    PartialOrder(threshold_crypto::Signature),
    TotalOrder(threshold_crypto::Signature),
    Owners(threshold_crypto::Signature),
}

/// A Threshold Signature object (not a commit) containing all the information that the signers have prepared.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct SignatureV0 {
    /// the content that is signed
    pub content: SignatureContent,

    /// The threshold signature itself. can come from 3 different sets
    pub threshold_sig: ThresholdSignatureV0,

    /// A reference to the Certificate that should be used to verify this signature.
    pub certificate_ref: ObjectRef,
}

/// A Signature object, referenced in AsyncSignature or SyncSignature
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Signature {
    V0(SignatureV0),
}

/// Enum for "orders" PKsets. Can be inherited from the store, in this case, it is an ObjectRef pointing to the latest Certificate of the store.
/// Or can be 2 PublicKeySets defined specially for this repo,
/// .0 one for the total_order (first one),
/// .1 the other for the partial_order (second one. is optional, as some repos are forcefully totally ordered and do not have this set).
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum OrdersPublicKeySetsV0 {
    Store(ObjectRef),
    Repo(
        (
            threshold_crypto::PublicKeySet,
            Option<threshold_crypto::PublicKeySet>,
        ),
    ),
    None, // the total_order quorum is not defined (yet, or anymore). here are no signers for the total_order, and none either for the partial_order. The owners replace them.
}

/// A Certificate content, that will be signed by the previous certificate signers.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CertificateContentV0 {
    /// the previous certificate in the chain of trust. Can be another Certificate or the Repository commit when we are at the root of the chain of trust.
    pub previous: ObjectRef,

    /// The Commit Id of the latest RootBranch definition (= the ReadCap ID) in order to keep in sync with the options for signing.
    /// not used for verifying (this is why the secret is not present).
    pub readcap_id: ObjectId,

    /// PublicKey Set used by the Owners. verifier uses this PKset if the signature was issued by the Owners.
    pub owners_pk_set: threshold_crypto::PublicKeySet,

    /// two "orders" PublicKey Sets (total_order and partial_order).
    pub orders_pk_sets: OrdersPublicKeySetsV0,
}

/// A Signature of a Certificate and the threshold set or public key used to generate it
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum CertificateSignatureV0 {
    /// the root Certificate is signed with the PrivKey of the Repo
    Repo(Sig),
    /// Any other certificate in the chain of trust is signed by the total_order quorum of the previous certificate, hence establishing the chain of trust.
    TotalOrder(threshold_crypto::Signature),
    /// if the previous cert's total order PKset has a threshold value of 0 or 1 (1 or 2 signers in the quorum),
    /// then it is allowed that the next certificate (this one) will be signed by the owners PKset instead.
    /// This is for a simple reason: if a user is removed from the list of signers in the total_order quorum,
    /// then in those 2 cases, the excluded signer will probably not cooperate to their exclusion, and will not sign the new certificate.
    /// to avoid deadlocks, we allow the owners to step in and sign the new cert instead.
    /// The Owners are also used when there is no quorum/signer defined (OrdersPublicKeySetsV0::None).
    Owners(threshold_crypto::Signature),
    /// in case the new certificate being signed is an update on the store certificate (OrdersPublicKeySetsV0::Store(ObjectRef) has changed from previous cert)
    /// then the signature is in that new store certificate, and not here. nothing else should have changed in the CertificateContent, and the validity of the new store cert has to be checked
    Store,
}

/// A Certificate object (not a commit) containing all the information needed to verify a signature.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CertificateV0 {
    /// content of the certificate, which is signed here below by the previous certificate signers.
    pub content: CertificateContentV0,

    /// signature over the content.
    pub sig: CertificateSignatureV0,
}

/// A certificate object
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Certificate {
    V0(CertificateV0),
}

/// Commit body V0
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum CommitBodyV0 {
    //
    // for root branch:
    //
    Repository(Repository), // singleton and should be first in root_branch
    RootBranch(RootBranch), // singleton and should be second in root_branch
    UpdateRootBranch(RootBranch), // total order enforced with total_order_quorum
    AddMember(AddMember),   // total order enforced with total_order_quorum
    RemoveMember(RemoveMember), // total order enforced with total_order_quorum
    AddPermission(AddPermission),
    RemovePermission(RemovePermission),
    AddBranch(AddBranch),
    ChangeMainBranch(ChangeMainBranch),
    RemoveBranch(RemoveBranch),
    AddName(AddName),
    RemoveName(RemoveName),
    // TODO? Quorum(Quorum), // changes the quorum without changing the RootBranch

    //
    // For transactional branches:
    //
    Branch(Branch),                // singleton and should be first in branch
    UpdateBranch(Branch),          // total order enforced with total_order_quorum
    Snapshot(Snapshot),            // a soft snapshot
    AsyncTransaction(Transaction), // partial_order
    SyncTransaction(Transaction),  // total_order
    AddFile(AddFile),
    RemoveFile(RemoveFile),
    Compact(Compact), // a hard snapshot. total order enforced with total_order_quorum
    //Merge(Merge),
    //Revert(Revert), // only possible on partial order commit
    AsyncSignature(AsyncSignature),

    //
    // For both
    //
    RefreshReadCap(RefreshReadCap),
    RefreshWriteCap(RefreshWriteCap),
    SyncSignature(SyncSignature),
}

/// Commit body
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum CommitBody {
    V0(CommitBodyV0),
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum QuorumType {
    NoSigning,
    PartialOrder,
    TotalOrder,
    Owners,
}

/// Content of a Commit
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CommitContentV0 {
    /// Commit author (a hash of UserId)
    /// BLAKE3 keyed hash over UserId
    /// - key: BLAKE3 derive_key ("NextGraph UserId Hash Overlay Id CommitContentV0 BLAKE3 key", overlayId)
    /// hash will be different than for ForwardedPeerAdvertV0 so that core brokers dealing with public sites wont be able to correlate commits and editing peers (via common author's hash)
    pub author: Digest,

    /// Author's commit sequence number
    pub seq: u64,

    /// BranchId the commit belongs to (not a ref, as readers do not need to access the branch definition)
    pub branch: BranchId,

    /// optional list of dependencies on some commits in the root branch that contain the write permission needed for this commit
    pub perms: Vec<ObjectId>,

    /// Keys to be able to open all the references (deps, acks, files, etc...)
    pub header_keys: Option<CommitHeaderKeys>,

    /// This commit can only be accepted if signed by this quorum
    pub quorum: QuorumType,

    /// App-specific metadata (commit message, creation time, etc)
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,

    /// reference to an Object with a CommitBody inside.
    /// When the commit is reverted or erased (after compaction/snapshot), the CommitBody is deleted, creating a dangling reference
    pub body: ObjectRef,
}

/// Content of a Commit
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum CommitContent {
    V0(CommitContentV0),
}

impl CommitContent {
    pub fn header_keys(&self) -> &Option<CommitHeaderKeys> {
        match self {
            CommitContent::V0(v0) => &v0.header_keys,
        }
    }
    pub fn author(&self) -> &Digest {
        match self {
            CommitContent::V0(v0) => &v0.author,
        }
    }
}

/// Commit object
/// Signed by branch key, or a member key authorized to publish this commit type
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CommitV0 {
    /// ID of containing Object
    #[serde(skip)]
    pub id: Option<ObjectId>,

    /// Key of containing Object
    #[serde(skip)]
    pub key: Option<SymKey>,

    /// optional Commit Header
    #[serde(skip)]
    pub header: Option<CommitHeader>,

    /// optional Commit Header
    #[serde(skip)]
    pub body: OnceCell<CommitBody>,

    /// Commit content
    pub content: CommitContent,

    /// Signature over the content (a CommitContent) by the author. an editor (userId)
    pub sig: Sig,
}

/// Commit Object
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Commit {
    V0(CommitV0),
}

/// File Object
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct SmallFileV0 {
    pub content_type: String,

    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,

    #[serde(with = "serde_bytes")]
    pub content: Vec<u8>,
}

/// A file stored in an Object
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum SmallFile {
    V0(SmallFileV0),
}

/// Random Access File Object
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RandomAccessFileMetaV0 {
    pub content_type: String,

    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,

    pub total_size: u64,

    pub chunk_size: u32,

    pub arity: u16,

    pub depth: u8,
}

/// A Random Access file stored in an Object
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RandomAccessFileMeta {
    V0(RandomAccessFileMetaV0),
}

impl RandomAccessFileMeta {
    pub fn arity(&self) -> u16 {
        match self {
            Self::V0(v0) => v0.arity,
        }
    }

    pub fn depth(&self) -> u8 {
        match self {
            Self::V0(v0) => v0.depth,
        }
    }

    pub fn set_depth(&mut self, depth: u8) {
        match self {
            Self::V0(v0) => {
                v0.depth = depth;
            }
        }
    }

    pub fn chunk_size(&self) -> u32 {
        match self {
            Self::V0(v0) => v0.chunk_size,
        }
    }

    pub fn total_size(&self) -> u64 {
        match self {
            Self::V0(v0) => v0.total_size,
        }
    }

    pub fn set_total_size(&mut self, size: u64) {
        match self {
            Self::V0(v0) => {
                v0.total_size = size;
            }
        }
    }

    pub fn metadata(&self) -> &Vec<u8> {
        match self {
            Self::V0(v0) => &v0.metadata,
        }
    }

    pub fn content_type(&self) -> &String {
        match self {
            Self::V0(v0) => &v0.content_type,
        }
    }
}

/// Immutable data stored encrypted in a Merkle tree V0
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum ObjectContentV0 {
    Commit(Commit),
    CommitBody(CommitBody),
    CommitHeader(CommitHeader),
    Quorum(Quorum),
    Signature(Signature),
    Certificate(Certificate),
    SmallFile(SmallFile),
    RandomAccessFileMeta(RandomAccessFileMeta),
}

/// Immutable data stored encrypted in a Merkle tree
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum ObjectContent {
    V0(ObjectContentV0),
}
