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

//! P2P Repo types
//!
//! Corresponds to the BARE schema

use core::fmt;
use serde::{Deserialize, Serialize};
use serde_bare::to_vec;
use std::collections::HashMap;
use std::hash::Hash;

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
            Digest::Blake3Digest32(d) => write!(f, "{}", hex::encode(d)),
        }
    }
}

/// ChaCha20 symmetric key
pub type ChaCha20Key = [u8; 32];

/// Symmetric cryptographic key
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum SymKey {
    ChaCha20Key(ChaCha20Key),
}

impl SymKey {
    pub fn slice(&self) -> &[u8; 32] {
        match self {
            SymKey::ChaCha20Key(o) => o,
        }
    }
}

/// Curve25519 public key Edwards form
pub type Ed25519PubKey = [u8; 32];

/// Curve25519 public key Montgomery form
pub type Mo25519PubKey = [u8; 32];

/// Curve25519 private key
pub type Ed25519PrivKey = [u8; 32];

/// Public key
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PubKey {
    Ed25519PubKey(Ed25519PubKey),
}

impl PubKey {
    pub fn slice(&self) -> &[u8; 32] {
        match self {
            PubKey::Ed25519PubKey(o) => o,
        }
    }
}

impl fmt::Display for PubKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PubKey::Ed25519PubKey(d) => write!(f, "{}", hex::encode(d)),
        }
    }
}

/// Private key
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PrivKey {
    Ed25519PrivKey(Ed25519PrivKey),
}

impl PrivKey {
    pub fn slice(&self) -> &[u8; 32] {
        match self {
            PrivKey::Ed25519PrivKey(o) => o,
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

/// List of Permissions
pub enum PermissionType {
    ADD_BRANCH,
    REMOVE_BRANCH,
    CHANGE_NAME,
    ADD_MEMBER,
    REMOVE_MEMBER,
    CHANGE_PERMISSION,
    TRANSACTION,
    SNAPSHOT,
    SHARING,
    CHANGE_ACK_CONFIG,
}

/// List of Identity types
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Identity {
    OrgSite(PubKey),
    IndividualSite(PubKey),
    OrgPublic(PubKey),
    OrgProtected(PubKey),
    OrgPrivate(PubKey),
    IndividualPublic(PubKey),
    IndividualProtected(PubKey),
    IndividualPrivate(PubKey),
    Group(RepoId),
    Dialog(RepoId),
    Document(RepoId),
    DialogOverlay(Digest),
}

/// Site type
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum SiteType {
    Org,
    Individual, // formerly Personal
}

/// Site
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct Site {
    pub site_type: SiteType,
    // Identity::OrgSite or Identity::IndividualSite
    pub site_identity: Identity,
    pub site_key: PrivKey,

    // Identity::OrgPublic or Identity::IndividualPublic
    pub public_identity: Identity,
    pub public_key: PrivKey,
    // signature of public_identity with site_key
    pub public_sig: Sig,

    // Identity::OrgProtected or Identity::IndividualProtected
    pub protected_identity: Identity,
    pub protected_key: PrivKey,
    // signature of protected_identity with site_key
    pub protected_sig: Sig,

    // Identity::OrgPrivate or Identity::IndividualPrivate
    pub private_identity: Identity,
    pub private_key: PrivKey,
    // signature of private_identity with site_key
    pub private_sig: Sig,
}

/// RepoHash:
/// BLAKE3 hash of the RepoId
pub type RepoHash = Digest;

// impl From<RepoHash> for String {
//     fn from(id: RepoHash) -> Self {
//         hex::encode(to_vec(&id).unwrap())
//     }
// }

/// RepoId is a PubKey
pub type RepoId = PubKey;

/// Block ID:
/// BLAKE3 hash over the serialized Object with encrypted content
pub type BlockId = Digest;

/// Block reference
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct BlockRef {
    /// Object ID
    pub id: BlockId,

    /// Key for decrypting the Object
    pub key: SymKey,
}

/// Object ID
pub type ObjectId = BlockId;

/// Object reference
pub type ObjectRef = BlockRef;

/// Internal node of a Merkle tree
pub type InternalNode = Vec<SymKey>;

/// Content of BlockV0: a Merkle tree node
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum BlockContentV0 {
    /// Internal node with references to children
    InternalNode(InternalNode),

    #[serde(with = "serde_bytes")]
    DataChunk(Vec<u8>),
}

/// List of ObjectId dependencies as encrypted Object content
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum DepList {
    V0(Vec<ObjectId>),
}

/// Dependencies of an Object
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum ObjectDeps {
    /// List of Object IDs (max. 8),
    ObjectIdList(Vec<ObjectId>),

    /// Reference to an Object that contains a DepList
    DepListRef(ObjectRef),
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

    /// Block IDs for child nodes in the Merkle tree
    pub children: Vec<BlockId>,

    /// Other objects this object depends on (e.g. Commit deps & acks)
    /// Only set for the root block
    pub deps: ObjectDeps,

    /// Expiry time of this object and all of its children
    /// when the object should be deleted by all replicas
    /// Only set for the root block
    pub expiry: Option<Timestamp>,

    /// Encrypted ObjectContentV0
    ///
    /// Encrypted using convergent encryption with ChaCha20:
    /// - convergence_key: BLAKE3 derive_key ("NextGraph Data BLAKE3 key",
    ///                                        repo_pubkey + repo_secret)
    /// - key: BLAKE3 keyed hash (convergence_key, plain_object_content)
    /// - nonce: 0
    #[serde(with = "serde_bytes")]
    pub content: Vec<u8>,
}

/// Immutable object with encrypted content
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Block {
    V0(BlockV0),
}

/// Repository definition
///
/// Published in root branch, where:
/// - branch_pubkey: repo_pubkey
/// - branch_secret: BLAKE3 derive_key ("NextGraph Root Branch secret",
///                                     repo_pubkey + repo_secret)
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RepositoryV0 {
    /// Repo public key ID
    pub id: RepoId,

    /// List of branches
    pub branches: Vec<ObjectRef>,

    /// Whether or not to allow external requests
    pub allow_ext_requests: bool,

    /// App-specific metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

/// Repository definition
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Repository {
    V0(RepositoryV0),
}

/// Add a branch to the repository
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AddBranch {
    V0(ObjectRef),
}

/// Remove a branch from the repository
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RemoveBranch {
    V0(ObjectRef),
}

/// Commit object types
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum CommitType {
    Repository,
    AddBranch,
    RemoveBranch,
    Branch,
    AddMembers,
    EndOfBranch,
    Transaction,
    Snapshot,
    Ack,
}

/// Member of a Branch
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct MemberV0 {
    /// Member public key ID
    pub id: PubKey,

    /// Commit types the member is allowed to publish in the branch
    pub commit_types: Vec<CommitType>,

    /// App-specific metadata
    /// (role, permissions, cryptographic material, etc)
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

/// Member of a branch
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Member {
    V0(MemberV0),
}

/// Branch definition
///
/// First commit in a branch, signed by branch key
/// In case of a fork, the commit deps indicat
/// the previous branch heads.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BranchV0 {
    /// Branch public key ID
    pub id: PubKey,

    /// Pub/sub topic for publishing events
    pub topic: PubKey,

    /// Branch secret key
    pub secret: SymKey,

    /// Members with permissions
    pub members: Vec<MemberV0>,

    /// Number of acks required for a commit to be valid
    pub quorum: HashMap<CommitType, u32>,

    /// Delay to send explicit acks,
    /// if not enough implicit acks arrived by then
    pub ack_delay: RelTime,

    /// Tags for organizing branches within the repository
    #[serde(with = "serde_bytes")]
    pub tags: Vec<u8>,

    /// App-specific metadata (validation rules, etc)
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

/// Branch definition
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Branch {
    V0(BranchV0),
}

/// Add members to an existing branch
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AddMembersV0 {
    /// Members to add, with permissions
    pub members: Vec<MemberV0>,

    /// New quorum
    pub quorum: Option<HashMap<CommitType, u32>>,

    /// New ackDelay
    pub ack_delay: Option<RelTime>,
}

/// Add members to an existing branch
///
/// If a member already exists, it overwrites the previous definition,
/// in that case this can only be used for adding new permissions,
/// not to remove existing ones.
/// The quorum and ackDelay can be changed as well
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AddMembers {
    V0(AddMembersV0),
}

/// ObjectRef for EndOfBranch
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum PlainOrEncryptedObjectRef {
    Plain(ObjectRef),
    Encrypted(Vec<u8>),
}

/// End of branch
///
/// No more commits accepted afterwards, only acks of this commit
/// May reference a fork where the branch continues
/// with possibly different members, permissions, validation rules.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct EndOfBranchV0 {
    /// (Encrypted) reference to forked branch (optional)
    pub fork: Option<PlainOrEncryptedObjectRef>,

    /// Expiry time when all commits in the branch should be deleted
    pub expiry: Timestamp,
}

/// End of branch
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum EndOfBranch {
    V0(EndOfBranchV0),
}

/// Transaction with CRDT operations
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Transaction {
    #[serde(with = "serde_bytes")]
    V0(Vec<u8>),
}

/// Snapshot of a Branch
///
/// Contains a data structure
/// computed from the commits at the specified head.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct SnapshotV0 {
    /// Branch heads the snapshot was made from
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

/// Acknowledgement of another Commit
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Ack {
    V0(),
}

/// Commit body, corresponds to CommitType
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum CommitBody {
    Repository(Repository),
    AddBranch(AddBranch),
    RemoveBranch(RemoveBranch),
    Branch(Branch),
    AddMembers(AddMembers),
    EndOfBranch(EndOfBranch),
    Transaction(Transaction),
    Snapshot(Snapshot),
    Ack(Ack),
}

/// Content of a Commit
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CommitContentV0 {
    /// Commit author
    pub author: PubKey,

    /// Author's commit sequence number in this branch
    pub seq: u32,

    /// Branch the commit belongs to
    pub branch: ObjectRef,

    /// Direct dependencies of this commit
    pub deps: Vec<ObjectRef>,

    /// Not directly dependent heads to acknowledge
    pub acks: Vec<ObjectRef>,

    /// Files the commit references
    pub refs: Vec<ObjectRef>,

    /// App-specific metadata (commit message, creation time, etc)
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,

    /// Object with a CommitBody inside
    pub body: ObjectRef,

    /// Expiry time of the body object
    pub expiry: Option<Timestamp>,
}

/// Commit object
/// Signed by branch key, or a member key authorized to publish this commit type
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CommitV0 {
    /// ID of parent Object
    #[serde(skip)]
    pub id: Option<ObjectId>,

    /// Key of parent Object
    #[serde(skip)]
    pub key: Option<SymKey>,

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

/// Immutable data stored encrypted in a Merkle tree
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum ObjectContent {
    Commit(Commit),
    CommitBody(CommitBody),
    File(File),
    DepList(DepList),
}
