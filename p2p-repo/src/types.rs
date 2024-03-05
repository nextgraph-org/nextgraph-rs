// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// This code is partly derived from work written by TG x Thoth from P2Pcollab.
// Copyright 2022 TG x Thoth
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
use serde::{Deserialize, Serialize};
use serde_bare::to_vec;
use std::collections::{HashMap, HashSet};
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

    #[deprecated(note = "**Don't use dummy method**")]
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
                let prix_key_encoded = base64_url::encode(ed);
                write!(f, "{}", prix_key_encoded)
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

impl BlockRef {
    #[deprecated(note = "**Don't use dummy method**")]
    pub fn dummy() -> Self {
        BlockRef {
            id: Digest::Blake3Digest32([0u8; 32]),
            key: SymKey::ChaCha20Key([0u8; 32]),
        }
    }
    pub fn from_id_key(id: BlockId, key: BlockKey) -> Self {
        BlockRef { id, key }
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

/// Object ID
pub type ObjectId = BlockId;

/// Object Key
pub type ObjectKey = BlockKey;

/// Object reference
pub type ObjectRef = BlockRef;

/// IDENTITY, SITE, STORE, OVERLAY common types

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
}

/// List of Store Overlay types
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum StoreOverlay {
    PublicStore(PubKey),
    ProtectedStore(PubKey),
    PrivateStore(PubKey),
    Group(PubKey),
    Dialog(Digest),
    //Document(RepoId),
}

/// List of Store Root Repo types
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum StoreRootRepo {
    PublicStore(RepoId),
    ProtectedStore(RepoId),
    PrivateStore(RepoId),
    Group(RepoId),
    Dialog(RepoId),
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
    pub root_branch_def_ref: ObjectRef,

    pub repo_secret: SymKey,
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

    pub private_site_root_branch_def_ref: ObjectRef,

    pub private_site_repo_secret: SymKey,

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
    /// Other objects this commit strongly depends on (ex: ADD for a REMOVE, refs for an nrefs)
    pub deps: Vec<ObjectId>,

    /// dependency that is removed after this commit. used for reverts
    pub ndeps: Vec<ObjectId>,

    /// current valid commits in head
    pub acks: Vec<ObjectId>,

    /// head commits that are invalid
    pub nacks: Vec<ObjectId>,

    /// list of Files that are referenced in this commit
    pub refs: Vec<ObjectId>,

    /// list of Files that are not referenced anymore after this commit
    /// the commit(s) that created the refs should be in deps
    pub nrefs: Vec<ObjectId>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum CommitHeader {
    V0(CommitHeaderV0),
}

impl CommitHeader {
    pub fn is_root(&self) -> bool {
        match self {
            CommitHeader::V0(v0) => v0.is_root(),
        }
    }
    pub fn deps(&self) -> Vec<ObjectId> {
        match self {
            CommitHeader::V0(v0) => v0.deps.clone(),
        }
    }
    pub fn acks(&self) -> Vec<ObjectId> {
        match self {
            CommitHeader::V0(v0) => v0.acks.clone(),
        }
    }
}

impl CommitHeaderV0 {
    fn new_empty() -> Self {
        Self {
            deps: vec![],
            ndeps: vec![],
            acks: vec![],
            nacks: vec![],
            refs: vec![],
            nrefs: vec![],
        }
    }

    pub fn new_with(
        deps: Vec<ObjectRef>,
        ndeps: Vec<ObjectRef>,
        acks: Vec<ObjectRef>,
        nacks: Vec<ObjectRef>,
        refs: Vec<ObjectRef>,
        nrefs: Vec<ObjectRef>,
    ) -> (Option<Self>, Option<CommitHeaderKeysV0>) {
        if deps.is_empty()
            && ndeps.is_empty()
            && acks.is_empty()
            && nacks.is_empty()
            && refs.is_empty()
            && nrefs.is_empty()
        {
            (None, None)
        } else {
            let mut ideps: Vec<ObjectId> = vec![];
            let mut indeps: Vec<ObjectId> = vec![];
            let mut iacks: Vec<ObjectId> = vec![];
            let mut inacks: Vec<ObjectId> = vec![];
            let mut irefs: Vec<ObjectId> = vec![];
            let mut inrefs: Vec<ObjectId> = vec![];

            let mut kdeps: Vec<ObjectKey> = vec![];
            let mut kndeps: Vec<ObjectKey> = vec![];
            let mut kacks: Vec<ObjectKey> = vec![];
            let mut knacks: Vec<ObjectKey> = vec![];
            for d in deps {
                ideps.push(d.id);
                kdeps.push(d.key);
            }
            for d in ndeps {
                indeps.push(d.id);
                kndeps.push(d.key);
            }
            for d in acks {
                iacks.push(d.id);
                kacks.push(d.key);
            }
            for d in nacks {
                inacks.push(d.id);
                knacks.push(d.key);
            }
            for d in refs.clone() {
                irefs.push(d.id);
            }
            for d in nrefs {
                inrefs.push(d.id);
            }
            (
                Some(Self {
                    deps: ideps,
                    ndeps: indeps,
                    acks: iacks,
                    nacks: inacks,
                    refs: irefs,
                    nrefs: inrefs,
                }),
                Some(CommitHeaderKeysV0 {
                    deps: kdeps,
                    ndeps: kndeps,
                    acks: kacks,
                    nacks: knacks,
                    refs,
                }),
            )
        }
    }
    pub fn new_with_deps(deps: Vec<ObjectId>) -> Option<Self> {
        assert!(!deps.is_empty());
        let mut n = Self::new_empty();
        n.deps = deps;
        Some(n)
    }

    pub fn new_with_deps_and_acks(deps: Vec<ObjectId>, acks: Vec<ObjectId>) -> Option<Self> {
        assert!(!deps.is_empty() || !acks.is_empty());
        let mut n = Self::new_empty();
        n.deps = deps;
        n.acks = acks;
        Some(n)
    }

    pub fn is_root(&self) -> bool {
        //self.deps.is_empty()
        //    && self.ndeps.is_empty()
        self.acks.is_empty() && self.nacks.is_empty()
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CommitHeaderKeysV0 {
    /// Other objects this commit strongly depends on (ex: ADD for a REMOVE, refs for an nrefs)
    pub deps: Vec<ObjectKey>,

    /// dependencies that are removed after this commit. used for reverts
    pub ndeps: Vec<ObjectKey>,

    /// current valid commits in head
    pub acks: Vec<ObjectKey>,

    /// head commits that are invalid
    pub nacks: Vec<ObjectKey>,

    /// list of Files that are referenced in this commit. Exceptionally this is an ObjectRef, because
    /// even if the CommitHeader is omitted, we want the Files to be openable.
    pub refs: Vec<ObjectRef>,
    // nrefs keys are not included because we don't need the keys to access the files we will not need anymore
    // the keys are in the deps anyway
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum CommitHeaderKeys {
    V0(CommitHeaderKeysV0),
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BlockContentV0 {
    /// Reference (actually, only its ID) to a CommitHeader of the root Block of a commit that contains references to other objects (e.g. Commit deps & acks)
    /// Only set if the block is a commit (and it is the root block of the Object).
    /// It is an easy way to know if the Block is a commit.
    /// And ObjectRef to an Object containing a CommitHeaderV0
    pub commit_header_id: Option<ObjectId>,

    /// Block IDs for child nodes in the Merkle tree, can be empty if ObjectContent fits in one block
    pub children: Vec<BlockId>,

    /// Encrypted ChunkContentV0 (entirety or chunks of ObjectContentV0)
    ///
    /// Encrypted using convergent encryption with ChaCha20:
    /// - convergence_key: BLAKE3 derive_key ("NextGraph Data BLAKE3 key",
    ///                                        repo_pubkey + repo_secret)
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
    // pub header: Option<CommitHeaderV0>,

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
/// First commit published in root branch, where:
/// - branch_pubkey: repo_pubkey
/// - branch_secret: BLAKE3 derive_key ("NextGraph Root Branch secret",
///                                     repo_pubkey + repo_secret)
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
    // TODO: order (partial order, total order, partial sign all commits, fsm, smart contract )
    /// Immutable App-specific metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

/// Repository definition
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Repository {
    V0(RepositoryV0),
}

/// Root Branch definition V0
///
/// Second commit in the root branch, signed by repository key
/// is used also to update the root branch definition when users are removed
/// DEPS: Reference to the repository commit, to get the verification_program and repo_id
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RootBranchV0 {
    /// Branch public key ID, equal to the repo_id
    pub id: PubKey,

    // Reference to the repository commit, to get the verification_program and repo_id
    //pub repo_ref: ObjectRef,
    // this can be omitted as the ref to repo is in deps.
    /// Store ID the repo belongs to
    /// the identity is checked by verifiers (check members, check overlay is matching)
    pub store: StoreOverlay,

    /// Pub/sub topic ID for publishing events
    pub topic: PubKey,

    /// topic private key, encrypted with the repo_secret, topic_id, branch_id
    #[serde(with = "serde_bytes")]
    pub topic_privkey: Vec<u8>,

    /// Permissions are inherited from Store Root Repo. Optional
    /// (only if this repo is not a root repo itself).
    /// check that it matches the self.store
    pub inherit_perms: Option<StoreRootRepo>,

    /// BEC periodic reconciliation interval. zero deactivates it
    pub reconciliation_interval: RelTime,

    /// signature of repoId with MODIFY_STORE_KEY privkey of store
    /// in order to verify that the store recognizes this repo as part of itself.
    /// only if not a store root repo itself
    pub store_sig: Option<Sig>,

    /// Mutable App-specific metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

/// RootBranch definition
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RootBranch {
    V0(RootBranchV0),
}

/// Quorum change V0
///
/// Sent after RemoveUser, AddUser
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct QuorumV0 {
    /// Number of signatures required for an partial order commit to be valid
    pub partial_order_quorum: u32,

    /// List of the users who can sign for partial order
    pub partial_order_users: Vec<UserId>,

    /// Number of signatures required for a total order commit to be valid
    pub total_order_quorum: u32,

    /// List of the users who can sign for total order
    pub total_order_users: Vec<UserId>,

    /// cryptographic material for Threshold signature
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

/// Quorum change
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

    /// object ID of the current root_branch commit, in order to keep in sync the branch with root_branch
    pub root_branch_def_id: ObjectId,

    /// Pub/sub topic for publishing events
    pub topic: PubKey,

    /// topic private key, encrypted with the repo_secret, branch_id, topic_id
    #[serde(with = "serde_bytes")]
    pub topic_privkey: Vec<u8>,

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
/// DEPS: if update branch: previous AddBranch or UpdateBranch commit
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AddBranchV0 {
    /// the new topic_id (will be needed immediately by future readers
    /// in order to subscribe to the pub/sub)
    topic_id: TopicId,

    // the new branch definition commit
    // (we need the ObjectKey in order to open the pub/sub Event)
    branch_def: ObjectRef,
}

/// Add a branch to the repository
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AddBranch {
    V0(AddBranchV0),
}

pub type RemoveBranchV0 = ();

/// Remove a branch from the repository
///
/// DEPS: should point to the previous AddBranch/UpdateBranch, can be several in case of concurrent AddBranch. ORset logiv)
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
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RemoveMemberV0 {
    /// Member to remove
    pub member: UserId,

    /// Should the overlay been refreshed. This is used on the last repo, when User is removed from all the repos of the store, because user was malicious.
    pub refresh_overlay: bool,

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
pub enum Permission {
    Create, // Used internally by the creator at creation time. Not part of the permission set that can added and removed
    MoveToStore, // moves the repo to another store
    AddBranch,
    RemoveBranch,
    ChangeName,
    AddMember,
    RemoveMember,
    ChangeQuorum,
    ChangePermission,
    ChangeMainBranch,
    Transaction,
    Snapshot,
    Chat,
    Inbox,
    Share,
    UpdateStore, // only for store root repo (add doc, remove doc)
}

/// Add permission to a member in a repo
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AddPermissionV0 {
    /// Member receiving the permission
    pub member: UserId,

    /// Permission given to user
    pub permission: Permission,

    /// Metadata
    /// (role, app level permissions, cryptographic material, etc)
    /// Can be some COMMON KEY privkey encrypted with the user pubkey
    /// If a PROOF for the common key is needed, should be sent here too
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AddPermission {
    V0(AddPermissionV0),
}

/// Remove permission from a user in a repo
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RemovePermissionV0 {
    /// Member to remove
    pub member: UserId,

    /// Permission removed from user
    pub permission: Permission,

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

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RepoNamedItemV0 {
    Branch(BranchId),
    Commit(ObjectId),
    File(ObjectId),
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
    pub item: RepoNamedItemV0,

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
    /// Member to remove
    /// names `main`, `chat`, `store` are reserved
    pub name: String,

    /// Permission removed from user
    pub permission: Permission,

    /// Metadata
    /// (reason, new cryptographic materials...)
    /// If the permission was linked to a COMMON KEY, a new privkey should be generated
    /// and sent to all users that still have this permission, encrypted with their respective pubkey
    /// If a PROOF for the common key is needed, should be sent here too
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
/// REFS: the file ObjectRef
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
/// NREFS: the file ObjectRef
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
    // FIXME: why do we need this?
    // Branch heads the snapshot was made from
    // pub heads: Vec<ObjectId>,
    /// hard snapshot will erase all the CommitBody of ancestors in the branch
    /// the acks will be present in header, but the CommitContent.header_keys will be set to None so the access to the acks will be lost
    /// the commit_header_key of BlockV0 can be safely shared outside of the repo, as the header_keys is empty, so the heads will not be readable anyway
    /// If a branch is based on a hard snapshot, it cannot be merged back into the branch where the hard snapshot was made.
    pub hard: bool,

    /// Snapshot data structure
    #[serde(with = "serde_bytes")]
    pub content: Vec<u8>,
}

/// Snapshot of a Branch
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Snapshot {
    V0(SnapshotV0),
}

/// Threshold Signature of a commit
/// mandatory for UpdateRootBranch, AddMember, RemoveMember, Quorum, UpdateBranch, hard Snapshot,
/// DEPS: the signed commit
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct ThresholdSignatureV0 {
    // TODO: pub chain_of_trust: ,
    /// Threshold signature
    #[serde(with = "serde_bytes")]
    pub signature: Vec<u8>,
}

/// Snapshot of a Branch
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum ThresholdSignature {
    V0(ThresholdSignatureV0),
}

/// Commit body V0
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum CommitBodyV0 {
    //
    // for root branch:
    //
    Repository(RepositoryV0), // singleton and should be first in root_branch
    RootBranch(RootBranchV0), // singleton and should be second in root_branch
    UpdateRootBranch(RootBranchV0), // total order enforced with total_order_quorum
    AddMember(AddMemberV0),   // total order enforced with total_order_quorum
    RemoveMember(RemoveMemberV0), // total order enforced with total_order_quorum
    Quorum(QuorumV0),         // total order enforced with total_order_quorum
    AddPermission(AddPermissionV0),
    RemovePermission(RemovePermissionV0),
    AddBranch(AddBranchV0),
    ChangeMainBranch(ChangeMainBranchV0),
    RemoveBranch(RemoveBranchV0),
    AddName(AddNameV0),
    RemoveName(RemoveNameV0),

    //
    // For regular branches:
    //
    Branch(BranchV0),       // singleton and should be first in branch
    UpdateBranch(BranchV0), // total order enforced with total_order_quorum
    Snapshot(SnapshotV0),   // if hard snapshot, total order enforced with total_order_quorum
    Transaction(TransactionV0),
    AddFile(AddFileV0),
    RemoveFile(RemoveFileV0),
    //Merge(MergeV0),
    //Revert(RevertV0), // only possible on partial order commit

    //
    // For both
    //
    ThresholdSignature(ThresholdSignatureV0),
}

/// Commit body
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum CommitBody {
    V0(CommitBodyV0),
}

impl CommitBody {
    pub fn must_be_root_commit_in_branch(&self) -> bool {
        match self {
            Self::V0(v0) => match v0 {
                CommitBodyV0::Repository(_) => true,
                CommitBodyV0::Branch(_) => true,
                _ => false,
            },
        }
    }
    pub fn total_order_required(&self) -> bool {
        match self {
            Self::V0(v0) => match v0 {
                CommitBodyV0::UpdateRootBranch(_) => true,
                CommitBodyV0::AddMember(_) => true,
                CommitBodyV0::RemoveMember(_) => true,
                CommitBodyV0::Quorum(_) => true,
                CommitBodyV0::UpdateBranch(_) => true,
                CommitBodyV0::Snapshot(s) => s.hard,
                _ => false,
            },
        }
    }
    pub fn required_permission(&self) -> HashSet<&Permission> {
        let res: &[Permission];
        res = match self {
            Self::V0(v0) => match v0 {
                CommitBodyV0::Repository(_) => &[Permission::Create],
                CommitBodyV0::RootBranch(_) => &[Permission::Create],
                CommitBodyV0::UpdateRootBranch(_) => {
                    &[Permission::RemoveMember, Permission::MoveToStore]
                }
                CommitBodyV0::AddMember(_) => &[Permission::Create, Permission::AddMember],
                CommitBodyV0::RemoveMember(_) => &[Permission::RemoveMember],
                CommitBodyV0::Quorum(_) => &[
                    Permission::Create,
                    Permission::AddMember,
                    Permission::RemoveMember,
                    Permission::ChangeQuorum,
                ],
                CommitBodyV0::AddPermission(_) => {
                    &[Permission::Create, Permission::ChangePermission]
                }
                CommitBodyV0::RemovePermission(_) => &[Permission::ChangePermission],
                CommitBodyV0::AddBranch(_) => &[Permission::Create, Permission::AddBranch],
                CommitBodyV0::RemoveBranch(_) => &[Permission::RemoveBranch],
                CommitBodyV0::UpdateBranch(_) => {
                    &[Permission::RemoveMember, Permission::MoveToStore]
                }
                CommitBodyV0::AddName(_) => &[Permission::AddBranch, Permission::ChangeName],
                CommitBodyV0::RemoveName(_) => &[Permission::ChangeName, Permission::RemoveBranch],
                CommitBodyV0::Branch(_) => &[Permission::Create, Permission::AddBranch],
                CommitBodyV0::ChangeMainBranch(_) => {
                    &[Permission::Create, Permission::ChangeMainBranch]
                }
                CommitBodyV0::Snapshot(_) => &[Permission::Snapshot],
                CommitBodyV0::Transaction(_) => &[Permission::Transaction],
                CommitBodyV0::AddFile(_) => &[Permission::Transaction],
                CommitBodyV0::RemoveFile(_) => &[Permission::Transaction],
                CommitBodyV0::ThresholdSignature(_) => &[
                    Permission::AddMember,
                    Permission::ChangeQuorum,
                    Permission::RemoveMember,
                    Permission::Snapshot,
                    Permission::MoveToStore,
                    Permission::Transaction,
                ],
            },
        };
        HashSet::from_iter(res.iter())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum QuorumType {
    NoSigning,
    PartialOrder,
    TotalOrder,
}

/// Content of a Commit
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CommitContentV0 {
    /// Commit author (a ForwardedPeerId)
    pub author: PubKey,

    /// Author's commit sequence number
    pub seq: u64,

    /// BranchId the commit belongs to (not a ref, as readers do not need to access the branch definition)
    pub branch: BranchId,

    /// Keys to be able to open all the references (deps, acks, refs, etc...)
    pub header_keys: Option<CommitHeaderKeysV0>,

    /// This commit can only be accepted if signed by this quorum
    pub quorum: QuorumType,

    /// App-specific metadata (commit message, creation time, etc)
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,

    /// reference to an Object with a CommitBody inside.
    /// When the commit is reverted or erased (after compaction/snapshot), the CommitBody is deleted, creating a dangling reference
    pub body: ObjectRef,
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
    pub header: Option<CommitHeaderV0>,

    /// Commit content
    pub content: CommitContentV0,

    /// Signature over the content by the author
    pub sig: Sig,
}

/// Commit Object
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Commit {
    V0(CommitV0),
}

/// File Object
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct FileV0 {
    pub content_type: String,

    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,

    #[serde(with = "serde_bytes")]
    pub content: Vec<u8>,
}

/// A file stored in an Object
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum File {
    V0(FileV0),
}

/// Immutable data stored encrypted in a Merkle tree V0
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum ObjectContentV0 {
    Commit(CommitV0),
    CommitBody(CommitBodyV0),
    CommitHeader(CommitHeaderV0),
    File(FileV0),
}

/// Immutable data stored encrypted in a Merkle tree
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum ObjectContent {
    V0(ObjectContentV0),
}
