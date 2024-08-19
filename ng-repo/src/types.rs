// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! NextGraph Repo types
//!
//! Corresponds to the BARE schema

use core::fmt;
use std::cmp::Ordering;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

use once_cell::sync::OnceCell;
use sbbf_rs_safe::Filter;
use serde::{Deserialize, Serialize};
use threshold_crypto::serde_impl::SerdeSecret;
use threshold_crypto::SignatureShare;
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::errors::NgError;
use crate::utils::{
    decode_key, decode_priv_key, dh_pubkey_array_from_ed_pubkey_slice,
    dh_pubkey_from_ed_pubkey_slice, ed_privkey_to_ed_pubkey, from_ed_privkey_to_dh_privkey,
    random_key,
};

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

impl Ord for Digest {
    fn cmp(&self, other: &Self) -> Ordering {
        match self {
            Self::Blake3Digest32(left) => match other {
                Self::Blake3Digest32(right) => left.cmp(right),
            },
        }
    }
}

impl PartialOrd for Digest {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Digest {
    pub fn from_slice(slice: [u8; 32]) -> Digest {
        Digest::Blake3Digest32(slice)
    }
    pub fn slice(&self) -> &[u8; 32] {
        match self {
            Self::Blake3Digest32(o) => o,
        }
    }
    pub fn to_slice(self) -> [u8; 32] {
        match self {
            Self::Blake3Digest32(o) => o,
        }
    }
    /// returns a hash that is consistent across platforms (32/64 bits. important for WASM32 compatibility with the rest)
    /// see https://www.reddit.com/r/rust/comments/fwpki6/a_debugging_mystery_hashing_slices_in_wasm_works/
    pub fn get_hash(&self) -> u64 {
        let mut hasher = DefaultHasher::new();
        let ser = serde_bare::to_vec(&self).unwrap();
        for e in ser {
            e.hash(&mut hasher);
        }
        hasher.finish()
    }
}

impl fmt::Display for Digest {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", std::string::String::from(self))
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
    pub fn nil() -> Self {
        SymKey::ChaCha20Key([0; 32])
    }
    #[cfg(any(test, feature = "testing"))]
    pub fn dummy() -> Self {
        SymKey::ChaCha20Key([0; 32])
    }
}

impl fmt::Display for SymKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let mut ser = serde_bare::to_vec(&self).unwrap();
        ser.reverse();
        write!(f, "{}", base64_url::encode(&ser))
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

impl Default for PubKey {
    fn default() -> Self {
        Self::nil()
    }
}

impl PubKey {
    pub fn to_dh(self) -> X25519PubKey {
        match self {
            Self::X25519PubKey(x) => x,
            _ => panic!("cannot call to_dh on an Edward key"),
        }
    }
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

    pub fn to_hash_string(&self) -> String {
        let ser = serde_bare::to_vec(&self).unwrap();
        let hash = blake3::hash(&ser);
        base64_url::encode(&hash.as_bytes())
    }
}

impl fmt::Display for PubKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let mut ser = serde_bare::to_vec(&self).unwrap();
        ser.reverse();
        write!(f, "{}", base64_url::encode(&ser))
    }
}

impl TryFrom<&str> for PubKey {
    type Error = NgError;
    fn try_from(str: &str) -> Result<Self, NgError> {
        decode_key(str)
    }
}

/// Private key
#[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PrivKey {
    Ed25519PrivKey(Ed25519PrivKey),
    X25519PrivKey(X25519PrivKey),
}

#[allow(deprecated)]
impl Default for PrivKey {
    fn default() -> Self {
        Self::nil()
    }
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

    pub fn nil() -> PrivKey {
        PrivKey::Ed25519PrivKey([0u8; 32])
    }

    #[cfg(any(test, feature = "testing"))]
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
        decode_priv_key(str)
    }
}

impl fmt::Display for PrivKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let mut ser = serde_bare::to_vec(&self).unwrap();
        ser.reverse();
        write!(f, "{}", base64_url::encode(&ser))
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

impl Sig {
    pub fn nil() -> Self {
        Sig::Ed25519Sig([[0; 32]; 2])
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
    None,
}

impl fmt::Display for RelTime {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Seconds(s) => writeln!(f, "{} sec.", s),
            Self::Minutes(s) => writeln!(f, "{} min.", s),
            Self::Hours(s) => writeln!(f, "{} h.", s),
            Self::Days(s) => writeln!(f, "{} d.", s),
            Self::None => writeln!(f, "None"),
        }
    }
}

/// Bloom filter (variable size)
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BloomFilterV0 {
    /// Filter
    #[serde(with = "serde_bytes")]
    pub f: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum BloomFilter {
    V0(BloomFilterV0),
}

impl BloomFilter {
    pub fn filter(&self) -> Filter {
        match self {
            Self::V0(v0) => Filter::from_bytes(&v0.f).unwrap(),
        }
    }
    pub fn from_filter(filter: &Filter) -> Self {
        BloomFilter::V0(BloomFilterV0 {
            f: filter.as_bytes().to_vec(),
        })
    }
}

//
// REPOSITORY TYPES
//

/// RepoId is a PubKey
pub type RepoId = PubKey;

/// RepoHash is the BLAKE3 Digest over the RepoId
pub type RepoHash = Digest;

impl From<RepoId> for RepoHash {
    fn from(id: RepoId) -> Self {
        Digest::Blake3Digest32(*blake3::hash(id.slice()).as_bytes())
    }
}

// impl From<RepoHash> for String {
//     fn from(id: RepoHash) -> Self {
//         hex::encode(to_vec(&id).unwrap())
//     }
// }

/// Topic ID: public key of the topic
pub type TopicId = PubKey;

/// User ID: user account for broker and member of a repo
pub type UserId = PubKey;

/// BranchId is a PubKey
pub type BranchId = PubKey;

/// Block ID: BLAKE3 hash over the serialized BlockContent (contains encrypted content)
pub type BlockId = Digest;

pub type BlockKey = SymKey;

/// Block reference
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct BlockRef {
    /// Block ID
    pub id: BlockId,

    /// Key for decrypting the Block
    pub key: BlockKey,
}

impl Default for BlockId {
    fn default() -> Self {
        Self::nil()
    }
}

impl BlockId {
    #[cfg(any(test, feature = "testing"))]
    pub fn dummy() -> Self {
        Digest::Blake3Digest32([0u8; 32])
    }

    pub fn nil() -> Self {
        Digest::Blake3Digest32([0u8; 32])
    }
}

impl BlockRef {
    #[cfg(any(test, feature = "testing"))]
    pub fn dummy() -> Self {
        BlockRef {
            id: Digest::Blake3Digest32([0u8; 32]),
            key: SymKey::ChaCha20Key([0u8; 32]),
        }
    }

    pub fn nil() -> Self {
        BlockRef {
            id: Digest::Blake3Digest32([0u8; 32]),
            key: SymKey::ChaCha20Key([0u8; 32]),
        }
    }

    pub fn from_id_key(id: BlockId, key: BlockKey) -> Self {
        BlockRef { id, key }
    }

    pub fn object_nuri(&self) -> String {
        format!("j:{}:k:{}", self.id, self.key)
    }

    pub fn commit_nuri(&self) -> String {
        format!("c:{}:k:{}", self.id, self.key)
    }

    pub fn readcap_nuri(&self) -> String {
        let ser = serde_bare::to_vec(self).unwrap();
        format!("r:{}", base64_url::encode(&ser))
    }

    pub fn tokenize(&self) -> Digest {
        let ser = serde_bare::to_vec(self).unwrap();
        Digest::Blake3Digest32(*blake3::hash(&ser).as_bytes())
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
///
/// For a store: A ReadCap to the root repo of the store
/// For a repo: A reference to the latest RootBranch definition commit
/// For a branch: A reference to the latest Branch definition commit
/// For a commit or object, the ObjectRef is itself the read capability
pub type ReadCap = ObjectRef;

/// Read capability secret (for a commit, branch, whole repo, or store)
///
/// it is already included in the ReadCap (it is the key part of the reference)
pub type ReadCapSecret = ObjectKey;

/// Write capability secret (for a whole repo)
pub type RepoWriteCapSecret = SymKey;

/// Write capability secret (for a branch's topic)
pub type BranchWriteCapSecret = PrivKey;

//TODO: PermaCap (involves sending an InboxPost to some verifiers)

//
// IDENTITY, SITE, STORE, OVERLAY common types
//

// /// List of Identity types
// #[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
// pub enum Identity {
//     OrgSite(PubKey),
//     IndividualSite(PubKey),
//     OrgPublicStore(PubKey),
//     OrgProtectedStore(PubKey),
//     OrgPrivateStore(PubKey),
//     IndividualPublicStore(PubKey),
//     IndividualProtectedStore(PubKey),
//     IndividualPrivateStore(PubKey),
// }

pub type OuterOverlayId = Digest;

pub type InnerOverlayId = Digest;

/// Overlay ID
///
/// - for outer overlays that need to be discovered by public key:
///   BLAKE3 hash over the public key of the store repo
/// - for inner overlays:
///   BLAKE3 keyed hash over the public key of the store repo
///   - key: BLAKE3 derive_key ("NextGraph Overlay ReadCapSecret BLAKE3 key", store repo's overlay's branch ReadCapSecret)
///   except for Dialog Overlays where the Hash is computed from 2 secrets.
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum OverlayId {
    Outer(Blake3Digest32),
    Inner(Blake3Digest32),
    Global,
}

impl fmt::Display for OverlayId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let mut ser = serde_bare::to_vec(&self).unwrap();
        ser.reverse();
        write!(f, "{}", base64_url::encode(&ser))
    }
}

impl OverlayId {
    // pub fn inner_from_store(store: &Store) -> OverlayId {
    //     Self::inner(store.id(), store.get_store_overlay_branch_readcap_secret())
    // }
    pub fn inner(
        store_id: &PubKey,
        store_overlay_branch_readcap_secret: &ReadCapSecret,
    ) -> OverlayId {
        let store_id = serde_bare::to_vec(store_id).unwrap();
        let mut store_overlay_branch_readcap_secret_ser =
            serde_bare::to_vec(store_overlay_branch_readcap_secret).unwrap();
        let mut key: [u8; 32] = blake3::derive_key(
            "NextGraph Overlay ReadCapSecret BLAKE3 key",
            store_overlay_branch_readcap_secret_ser.as_slice(),
        );
        let key_hash = blake3::keyed_hash(&key, &store_id);
        store_overlay_branch_readcap_secret_ser.zeroize();
        key.zeroize();
        OverlayId::Inner(*key_hash.as_bytes())
    }

    pub fn outer(store_id: &PubKey) -> OverlayId {
        let store_id = serde_bare::to_vec(store_id).unwrap();
        let d: Digest = (&store_id).into();
        OverlayId::Outer(d.to_slice())
    }
    #[cfg(any(test, feature = "testing"))]
    pub fn dummy() -> OverlayId {
        OverlayId::Outer(Digest::dummy().to_slice())
    }
    pub fn nil() -> OverlayId {
        OverlayId::Outer(Digest::nil().to_slice())
    }

    pub fn is_inner(&self) -> bool {
        match self {
            Self::Inner(_) => true,
            _ => false,
        }
    }

    pub fn is_outer(&self) -> bool {
        match self {
            Self::Outer(_) => true,
            _ => false,
        }
    }
}

/// List of Store Overlay types
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum StoreOverlayV0 {
    PublicStore(PubKey),
    ProtectedStore(PubKey),
    PrivateStore(PubKey),
    Group(PubKey),
    Dialog(Digest),
}

impl fmt::Display for StoreOverlayV0 {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "StoreOverlay V0 ")?;
        match self {
            StoreOverlayV0::PublicStore(k) => writeln!(f, "PublicStore: {}", k),
            StoreOverlayV0::ProtectedStore(k) => writeln!(f, "ProtectedStore: {}", k),
            StoreOverlayV0::PrivateStore(k) => writeln!(f, "PrivateStore: {}", k),
            StoreOverlayV0::Group(k) => writeln!(f, "Group: {}", k),
            StoreOverlayV0::Dialog(k) => writeln!(f, "Dialog: {}", k),
        }
    }
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum StoreOverlay {
    V0(StoreOverlayV0),
    OwnV0(StoreOverlayV0), // The repo is a store, so the overlay can be derived from its own ID. In this case, the branchId of the `overlay` branch is entered here as PubKey of the StoreOverlayV0 variants.
}

impl fmt::Display for StoreOverlay {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => writeln!(f, "{}", v0),
            Self::OwnV0(v0) => writeln!(f, "Own: {}", v0),
        }
    }
}

impl StoreOverlay {
    pub fn from_store_repo(store_repo: &StoreRepo, overlay_branch: BranchId) -> StoreOverlay {
        match store_repo {
            StoreRepo::V0(v0) => match v0 {
                StoreRepoV0::PublicStore(_id) => {
                    StoreOverlay::V0(StoreOverlayV0::PublicStore(overlay_branch))
                }
                StoreRepoV0::ProtectedStore(_id) => {
                    StoreOverlay::V0(StoreOverlayV0::ProtectedStore(overlay_branch))
                }
                StoreRepoV0::PrivateStore(_id) => {
                    StoreOverlay::V0(StoreOverlayV0::PrivateStore(overlay_branch))
                }
                StoreRepoV0::Group(_id) => StoreOverlay::V0(StoreOverlayV0::Group(overlay_branch)),
                StoreRepoV0::Dialog((_, d)) => StoreOverlay::V0(StoreOverlayV0::Dialog(d.clone())),
            },
        }
    }

    pub fn overlay_id_for_read_purpose(&self) -> OverlayId {
        match self {
            StoreOverlay::V0(StoreOverlayV0::PublicStore(id))
            | StoreOverlay::V0(StoreOverlayV0::ProtectedStore(id))
            | StoreOverlay::V0(StoreOverlayV0::PrivateStore(id))
            | StoreOverlay::V0(StoreOverlayV0::Group(id)) => OverlayId::outer(id),
            StoreOverlay::V0(StoreOverlayV0::Dialog(d)) => OverlayId::Inner(d.clone().to_slice()),
            StoreOverlay::OwnV0(_) => unimplemented!(),
        }
    }

    pub fn overlay_id_for_write_purpose(
        &self,
        store_overlay_branch_readcap_secret: ReadCapSecret,
    ) -> OverlayId {
        match self {
            StoreOverlay::V0(StoreOverlayV0::PublicStore(id))
            | StoreOverlay::V0(StoreOverlayV0::ProtectedStore(id))
            | StoreOverlay::V0(StoreOverlayV0::PrivateStore(id))
            | StoreOverlay::V0(StoreOverlayV0::Group(id)) => {
                OverlayId::inner(id, &store_overlay_branch_readcap_secret)
            }
            StoreOverlay::V0(StoreOverlayV0::Dialog(d)) => OverlayId::Inner(d.clone().to_slice()),
            StoreOverlay::OwnV0(_) => unimplemented!(),
        }
    }
}

impl From<&StoreRepo> for StoreOverlay {
    fn from(store_repo: &StoreRepo) -> Self {
        match store_repo {
            StoreRepo::V0(v0) => match v0 {
                StoreRepoV0::PublicStore(id) => {
                    StoreOverlay::V0(StoreOverlayV0::PublicStore(id.clone()))
                }
                StoreRepoV0::ProtectedStore(id) => {
                    StoreOverlay::V0(StoreOverlayV0::ProtectedStore(id.clone()))
                }
                StoreRepoV0::PrivateStore(id) => {
                    StoreOverlay::V0(StoreOverlayV0::PrivateStore(id.clone()))
                }
                StoreRepoV0::Group(id) => StoreOverlay::V0(StoreOverlayV0::Group(id.clone())),
                StoreRepoV0::Dialog((_, d)) => StoreOverlay::V0(StoreOverlayV0::Dialog(d.clone())),
            },
        }
    }
}

/// List of Store Root Repo types
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum StoreRepoV0 {
    PublicStore(RepoId),
    ProtectedStore(RepoId),
    PrivateStore(RepoId),
    Group(RepoId),
    Dialog((RepoId, Digest)),
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum StoreRepo {
    V0(StoreRepoV0),
}

impl fmt::Display for StoreRepo {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "StoreRepo V0 {} {}",
            match self {
                StoreRepo::V0(v0) => match v0 {
                    StoreRepoV0::PublicStore(_) => "PublicStore",
                    StoreRepoV0::ProtectedStore(_) => "ProtectedStore",
                    StoreRepoV0::PrivateStore(_) => "PrivateStore",
                    StoreRepoV0::Group(_) => "Group",
                    StoreRepoV0::Dialog(_) => "Dialog",
                },
            },
            self.repo_id()
        )
    }
}

impl StoreRepo {
    pub fn store_type_for_app(&self) -> String {
        match self {
            Self::V0(v0) => match v0 {
                StoreRepoV0::PublicStore(_) => "public",
                StoreRepoV0::ProtectedStore(_) => "protected",
                StoreRepoV0::PrivateStore(_) => "private",
                StoreRepoV0::Group(_) => "group",
                StoreRepoV0::Dialog(_) => "dialog",
            },
        }
        .to_string()
    }

    pub fn repo_id(&self) -> &RepoId {
        match self {
            Self::V0(v0) => match v0 {
                StoreRepoV0::PublicStore(id)
                | StoreRepoV0::ProtectedStore(id)
                | StoreRepoV0::PrivateStore(id)
                | StoreRepoV0::Group(id)
                | StoreRepoV0::Dialog((id, _)) => id,
            },
        }
    }
    #[cfg(any(test, feature = "testing"))]
    #[allow(deprecated)]
    pub fn dummy_public_v0() -> Self {
        let store_pubkey = PubKey::nil();
        StoreRepo::V0(StoreRepoV0::PublicStore(store_pubkey))
    }
    #[cfg(any(test, feature = "testing"))]
    pub fn dummy_with_key(repo_pubkey: PubKey) -> Self {
        StoreRepo::V0(StoreRepoV0::PublicStore(repo_pubkey))
    }

    pub fn nil() -> Self {
        let store_pubkey = PubKey::nil();
        StoreRepo::V0(StoreRepoV0::PublicStore(store_pubkey))
    }

    pub fn new_private(repo_pubkey: PubKey) -> Self {
        StoreRepo::V0(StoreRepoV0::PrivateStore(repo_pubkey))
    }

    pub fn outer_overlay(&self) -> OverlayId {
        self.overlay_id_for_read_purpose()
    }

    pub fn overlay_id_for_read_purpose(&self) -> OverlayId {
        let store_overlay: StoreOverlay = self.into();
        store_overlay.overlay_id_for_read_purpose()
        //OverlayId::outer(self.repo_id())
    }

    pub fn is_private(&self) -> bool {
        match self {
            Self::V0(StoreRepoV0::PrivateStore(_)) => true,
            _ => false,
        }
    }

    // pub fn overlay_id_for_storage_purpose(
    //     &self,
    //     store_overlay_branch_readcap_secret: Option<ReadCapSecret>,
    // ) -> OverlayId {
    //     match self {
    //         Self::V0(StoreRepoV0::PublicStore(id))
    //         | Self::V0(StoreRepoV0::ProtectedStore(id))
    //         | Self::V0(StoreRepoV0::Group(id))
    //         | Self::V0(StoreRepoV0::PrivateStore(id)) => self.overlay_id_for_read_purpose(),
    //         Self::V0(StoreRepoV0::Dialog(d)) => OverlayId::inner(
    //             &d.0,
    //             store_overlay_branch_readcap_secret
    //                 .expect("Dialog needs store_overlay_branch_readcap_secret"),
    //         ),
    //     }
    // }

    pub fn overlay_id_for_storage_purpose(&self) -> OverlayId {
        match self {
            Self::V0(StoreRepoV0::PublicStore(_id))
            | Self::V0(StoreRepoV0::ProtectedStore(_id))
            | Self::V0(StoreRepoV0::Group(_id))
            | Self::V0(StoreRepoV0::PrivateStore(_id)) => self.overlay_id_for_read_purpose(),
            Self::V0(StoreRepoV0::Dialog(d)) => OverlayId::Inner(d.1.clone().to_slice()),
        }
    }

    pub fn overlay_id_for_write_purpose(
        &self,
        store_overlay_branch_readcap_secret: &ReadCapSecret,
    ) -> OverlayId {
        match self {
            Self::V0(StoreRepoV0::PublicStore(id))
            | Self::V0(StoreRepoV0::ProtectedStore(id))
            | Self::V0(StoreRepoV0::Group(id))
            | Self::V0(StoreRepoV0::PrivateStore(id)) => {
                OverlayId::inner(id, store_overlay_branch_readcap_secret)
            }
            Self::V0(StoreRepoV0::Dialog(d)) => OverlayId::Inner(d.1.clone().to_slice()),
        }
    }
}

/// Site type
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum SiteType {
    Org,
    Individual((PrivKey, ReadCap)), // the priv_key of the user, and the read_cap of the private store
}

/// Site Store
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct SiteStore {
    pub id: PubKey,

    pub store_type: SiteStoreType,
}

/// Site Store type
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum SiteStoreType {
    Public,
    Protected,
    Private,
}

/// Site Name
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum SiteName {
    Personal,
    Name(String),
}

/// Reduced Site (for QRcode)
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct ReducedSiteV0 {
    pub user_key: PrivKey,

    pub private_store_read_cap: ReadCap,

    pub core: PubKey,
    pub bootstraps: Vec<PubKey>,
}

//
// BLOCKS common types
//

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

/// Header of a Commit, can be embedded or as a ref
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

/// Keys for the corresponding IDs contained in the Header
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

/// unencrypted part of the Block
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

    /// contains encrypted ChunkContentV0 (entirely, when fitting, or chunks of ObjectContentV0, in DataChunk) used for leaves of the Merkle tree,
    /// or to store the keys of children (in InternalNode)
    ///
    /// Encrypted using convergent encryption with ChaCha20:
    /// - convergence_key: BLAKE3 derive_key ("NextGraph Data BLAKE3 key",
    ///                                        StoreRepo + store's repo ReadCapSecret )
    ///                                     // basically similar to the InnerOverlayId but not hashed, so that brokers cannot do "confirmation of a file" attack
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

//
// REPO IMPLEMENTATION
//

/// Repository definition
///
/// First commit published in root branch, signed by repository key
/// For the Root repo of a store(overlay), the convergence_key should be derived from :
/// "NextGraph Data BLAKE3 key", RepoId + RepoWriteCapSecret)
/// for a private store root repo, the RepoWriteCapSecret can be omitted
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RepositoryV0 {
    /// Repo public key ID
    pub id: RepoId,

    /// Verification program (WASM)
    #[serde(with = "serde_bytes")]
    pub verification_program: Vec<u8>,

    /// Optional serialization of a ReadBranchLink (of a rootbranch or a transactional branch), if the repository is a fork of another one.
    /// then transaction branches of this new repo, will be able to reference the forked repo/branches commits as DEPS in their singleton Branch commit.
    #[serde(with = "serde_bytes")]
    pub fork_of: Vec<u8>,

    /// User ID who created this repo
    pub creator: Option<UserId>,

    // TODO: for org store root repo, should have a sig by the org priv_key, over the repoid, and a sig by this repo_priv_key over the org_id (to establish the bidirectional linking between org and store)

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
    /// the identity is checked by verifiers (check overlay is matching)
    pub store: StoreOverlay,

    /// signature of repoId with store's partial_order signature
    /// in order to verify that the store recognizes this repo as part of itself.
    /// only if not a store root repo itself
    pub store_sig: Option<Signature>,

    /// Pub/sub topic ID for publishing events about the root branch
    pub topic: TopicId,

    /// topic private key (a BranchWriteCapSecret), encrypted with a key derived as follow
    /// BLAKE3 derive_key ("NextGraph Branch WriteCap Secret BLAKE3 key",
    ///                                        RepoWriteCapSecret, TopicId, BranchId )
    /// so that only editors of the repo can decrypt the privkey
    /// nonce = 0
    /// not encrypted for individual store repo.
    #[serde(with = "serde_bytes")]
    pub topic_privkey: Vec<u8>,

    /// if set, permissions are inherited from Store Repo.
    /// Optional is a store_read_cap
    /// (only set if this repo is not the store repo itself)
    /// check that it matches the self.store
    /// can only be committed by an owner
    /// it generates a new certificate
    /// owners are not inherited from store
    // TODO: ReadCap or PermaCap. If it is a ReadCap, a new RootBranch commit should be published (RootCapRefresh, only read_cap changes) every time the store read cap changes.
    /// empty for private repos, eventhough they are all implicitly inheriting perms from private store
    pub inherit_perms_users_and_quorum_from_store: Option<ReadCap>,

    /// Quorum definition ObjectRef
    /// TODO: ObjectKey should be encrypted with SIGNER_KEY ?
    pub quorum: Option<ObjectRef>,

    /// BEC periodic reconciliation interval. zero deactivates it
    pub reconciliation_interval: RelTime,

    // list of owners. all of them are required to sign any RootBranch that modifies the list of owners or the inherit_perms_users_and_quorum_from_store field.
    pub owners: Vec<UserId>,

    /// when the list of owners is changed, a crypto_box containing the RepoWriteCapSecret should be included here for each owner.
    /// this should also be done at creation time, with the UserId of the first owner, except for individual private store repo, because it doesnt have a RepoWriteCapSecret
    /// the vector has the same order and size as the owners one. each owner finds their write_cap here.
    pub owners_write_cap: Vec<serde_bytes::ByteBuf>,

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
    pub fn topic(&self) -> &TopicId {
        match self {
            Self::V0(v0) => &v0.topic,
        }
    }
    pub fn repo_id(&self) -> &RepoId {
        match self {
            Self::V0(v0) => &v0.id,
        }
    }
    pub fn owners(&self) -> &Vec<UserId> {
        match self {
            Self::V0(v0) => &v0.owners,
        }
    }
    pub fn encrypt_write_cap(
        for_user: &UserId,
        write_cap: &RepoWriteCapSecret,
    ) -> Result<Vec<u8>, NgError> {
        let ser = serde_bare::to_vec(write_cap).unwrap();
        let mut rng = crypto_box::aead::OsRng {};
        let cipher = crypto_box::seal(&mut rng, &for_user.to_dh_slice().into(), &ser)
            .map_err(|_| NgError::EncryptionError)?;
        Ok(cipher)
    }
    pub fn decrypt_write_cap(
        by_user: &PrivKey,
        cipher: &Vec<u8>,
    ) -> Result<RepoWriteCapSecret, NgError> {
        let ser = crypto_box::seal_open(&(*by_user.to_dh().slice()).into(), cipher)
            .map_err(|_| NgError::DecryptionError)?;
        let write_cap: RepoWriteCapSecret =
            serde_bare::from_slice(&ser).map_err(|_| NgError::SerializationError)?;
        Ok(write_cap)
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
                        .as_ref()
                        .map_or("None".to_string(), |c| format!("{}", c))
                )?;
                writeln!(f, "topic:     {}", v0.topic)?;
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
/// Changed when the signers need to be updated. Signers are not necessarily editors of the repo, and they do not need to be members either, as they will be notified of RootCapRefresh anyway.
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

    // TODO:
    // epoch: ObjectId pointing to rootbranch commit (read_cap_id)
    /// cryptographic material for Threshold signature
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

/// Quorum definition, is part of the RootBranch commit
// TODO: can it be sent in the root branch without being part of a RootBranch ?
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Quorum {
    V0(QuorumV0),
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum BranchCrdt {
    Graph(String),
    YMap(String),
    YArray(String),
    YXml(String),
    YText(String),
    Automerge(String),
    Elmer(String),
    //Rdfs,
    //Owl,
    //Shacl,
    //Shex,
    None, // this is used by Overlay, Store and User BranchTypes
}

impl BranchCrdt {
    pub fn is_graph(&self) -> bool {
        match self {
            BranchCrdt::Graph(_) => true,
            _ => false,
        }
    }
    pub fn name(&self) -> String {
        match self {
            BranchCrdt::Graph(_) => "Graph",
            BranchCrdt::YMap(_) => "YMap",
            BranchCrdt::YArray(_) => "YArray",
            BranchCrdt::YXml(_) => "YXml",
            BranchCrdt::YText(_) => "YText",
            BranchCrdt::Automerge(_) => "Automerge",
            BranchCrdt::Elmer(_) => "Elmer",
            BranchCrdt::None => panic!("BranchCrdt::None does not have a name"),
        }
        .to_string()
    }
    pub fn class(&self) -> &String {
        match self {
            BranchCrdt::Graph(c)
            | BranchCrdt::YMap(c)
            | BranchCrdt::YArray(c)
            | BranchCrdt::YXml(c)
            | BranchCrdt::YText(c)
            | BranchCrdt::Automerge(c)
            | BranchCrdt::Elmer(c) => c,
            BranchCrdt::None => panic!("BranchCrdt::None does not have a class"),
        }
    }
    pub fn from(name: String, class: String) -> Result<Self, NgError> {
        Ok(match name.as_str() {
            "Graph" => BranchCrdt::Graph(class),
            "YMap" => BranchCrdt::YMap(class),
            "YArray" => BranchCrdt::YArray(class),
            "YXml" => BranchCrdt::YXml(class),
            "YText" => BranchCrdt::YText(class),
            "Automerge" => BranchCrdt::Automerge(class),
            "Elmer" => BranchCrdt::Elmer(class),
            _ => return Err(NgError::InvalidClass),
        })
    }
}

/// Branch definition
///
/// First commit in a branch, signed by branch key
/// In case of a fork, the commit DEPS indicate
/// the previous branch heads, and the ACKS are empty.
///
/// Can be used also to update the branch definition when users are removed
/// In this case, the total_order quorum is needed, and DEPS indicates the BranchCapRefresh commit
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BranchV0 {
    /// Branch public key ID
    pub id: PubKey,

    pub crdt: BranchCrdt,

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
    /// For individual store repo, the RepoWriteCapSecret is zero
    #[serde(with = "serde_bytes")]
    pub topic_privkey: Vec<u8>,

    /// optional: this branch is the result of a pull request coming from another repo.
    /// contains a serialization of a ReadBranchLink of a transactional branch from another repo
    #[serde(with = "serde_bytes")]
    pub pulled_from: Vec<u8>,

    /// App-specific metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

impl fmt::Display for Branch {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "V0")?;
                writeln!(f, "id:                     {}", v0.id)?;
                writeln!(f, "repo:                   {}", v0.repo)?;
                writeln!(f, "root_branch_readcap_id: {}", v0.root_branch_readcap_id)?;
                writeln!(f, "topic:                  {}", v0.topic)?;
                writeln!(f, "topic_privkey:          {:?}", v0.topic_privkey)?;
                Ok(())
            }
        }
    }
}

/// Branch definition
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Branch {
    V0(BranchV0),
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum BranchType {
    Main, // Main is also transactional
    Store,
    Overlay,
    User,
    // special transactional branches
    Chat,
    Stream,
    Comments,
    BackLinks,
    Context,
    //Ontology,
    Transactional, // this could have been called OtherTransactional, but for the sake of simplicity, we use Transactional for any branch that is not the Main one.
    Root, // only used for BranchInfo//Unknown, // only used temporarily when loading a branch info from commits (Branch commit, then AddBranch commit)
    Header,
}

impl BranchType {
    pub fn is_main(&self) -> bool {
        match self {
            Self::Main => true,
            _ => false,
        }
    }
}

impl fmt::Display for BranchType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}",
            match self {
                Self::Main => "Main",
                Self::Header => "Header",
                Self::Store => "Store",
                Self::Overlay => "Overlay",
                Self::User => "User",
                Self::Transactional => "Transactional",
                Self::Root => "Root",
                Self::Chat => "Chat",
                Self::Stream => "Stream",
                Self::Comments => "Comments",
                Self::BackLinks => "BackLinks",
                Self::Context => "Context",
                //Self::Ontology => "Ontology",
                //Self::Unknown => "==unknown==",
            }
        )
    }
}

/// Add a branch to the repository
///
/// DEPS: if update branch: previous AddBranch commit of the same branchId
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AddBranchV0 {
    // the new topic_id (will be needed immediately by future readers
    // in order to subscribe to the pub/sub). should be identical to the one in the Branch definition.
    // None if merged_in
    pub topic_id: Option<TopicId>,
    // the new branch definition commit
    // (we need the ObjectKey in order to open the pub/sub Event)
    // None if merged_in
    pub branch_read_cap: Option<ReadCap>,

    pub crdt: BranchCrdt,

    pub branch_id: BranchId,

    pub branch_type: BranchType,

    pub fork_of: Option<BranchId>,

    pub merged_in: Option<BranchId>,
}

impl fmt::Display for AddBranch {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "V0         {}", v0.branch_type)?;
                writeln!(f, "branch_id: {}", v0.branch_id)?;
                if v0.topic_id.is_some() {
                    writeln!(f, "topic_id:  {}", v0.topic_id.as_ref().unwrap())?;
                }
                if v0.branch_read_cap.is_some() {
                    writeln!(
                        f,
                        "branch_read_cap: {}",
                        v0.branch_read_cap.as_ref().unwrap()
                    )?;
                }
                if v0.fork_of.is_some() {
                    writeln!(f, "fork_of:   {}", v0.fork_of.as_ref().unwrap())?;
                }
                if v0.merged_in.is_some() {
                    writeln!(f, "merged_in: {}", v0.merged_in.as_ref().unwrap())?;
                }
                Ok(())
            }
        }
    }
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
///
/// An owner cannot be removed (it cannot be added even)
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

/// when a signing capability is removed, a new SignerSecretKeys should be added to wallet, with the removed key set to None
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct SignerCap {
    pub repo: RepoId,

    /// latest RootBranch commit or Quorum commit that defines the signing epoch
    pub epoch: ObjectId,

    pub owner: Option<SerdeSecret<threshold_crypto::SecretKeyShare>>,

    pub total_order: Option<SerdeSecret<threshold_crypto::SecretKeyShare>>,

    pub partial_order: Option<SerdeSecret<threshold_crypto::SecretKeyShare>>,
}

impl SignerCap {
    pub fn sign_with_owner(&self, content: &[u8]) -> Result<SignatureShare, NgError> {
        if let Some(key_share) = &self.owner {
            Ok(key_share.sign(content))
        } else {
            Err(NgError::KeyShareNotFound)
        }
    }
}

/// Permissions
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PermissionV0 {
    Create, // Used internally by the creator at creation time. Not part of the permission set that can be added and removed
    Owner,  // used internally for owners

    //
    // permissions delegated by owners and admins (all admins inherit them)
    //
    AddReadMember, // adds a member to the repo (AddMember). without additional perm, the user is a reader
    RemoveMember, // if user has any specific perm, RemoveWritePermission, RefreshWriteCap and/or Admin permission is needed. always behind SyncSignature
    AddWritePermission, // can send AddPermission that add 3 perms to other user: WriteAsync, WriteSync, and RefreshWriteCap
    WriteAsync, // can send AsyncTransaction, AddFile, RemoveFile, Snapshot, optionally with AsyncSignature
    WriteSync,  // can send SyncTransaction, AddFile, RemoveFile, always behind SyncSignature
    Compact,    // can send Compact, always behind SyncSignature
    RemoveWritePermission, // can send RemovePermission that remove the WriteAsync, WriteSync or RefreshWriteCap permissions from user. RefreshWriteCap will probably be needed by the user who does the RemovePermission

    AddBranch,    // can send AddBranch and Branch commits
    RemoveBranch, // can send removeBranch, always behind SyncSignature
    ChangeName,   // can send AddName and RemoveName

    RefreshReadCap, // can send RootCapRefresh or BranchCapRefresh that do not contain a write_cap, followed by UpdateRootBranch and/or UpdateBranch commits, with or without renewed topicIds. Always behind SyncSignature
    RefreshWriteCap, // can send RootCapRefresh that contains a write_cap and associated BranchCapRefreshes, followed by UpdateRootBranch and associated UpdateBranch commits on all branches, with renewed topicIds and RepoWriteCapSecret. Always behind SyncSignature

    //
    // permissions delegated by owners:
    //
    ChangeQuorum, // can add and remove Signers, change the quorum thresholds for total order and partial order. implies the RefreshReadCap perm (without changing topicids). Always behind SyncSignature
    Admin, // can administer the repo: assigns perms to other user with AddPermission and RemovePermission. RemovePermission always behind SyncSignature
    ChangeMainBranch,

    // other permissions. TODO: specify them more in details
    Chat,           // can chat
    Inbox,          // can read inbox
    PermaShare,     // can create and answer to PermaCap (PermaLink)
    UpdateStore,    // only for store root repo (add repo, remove repo) to the store special branch
    RefreshOverlay, // Equivalent to BranchCapRefresh for the overlay special branch.
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
    /// if the added permission is a write one, a crypto_box containing the RepoWriteCapSecret should be included here for the member that receives the perm.
    ///
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
    Commit(ObjectRef),
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RepoNamedItem {
    V0(RepoNamedItemV0),
}

/// Add a new name in the repo that can point to a branch or a commit
///
/// Or change the value of a name
/// DEPS: if it is a change of value: all the previous AddName commits seen for this name
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AddNameV0 {
    /// the name. in case of conflict, the smallest Id is taken.
    pub name: String,

    /// A branch or commit
    pub item: RepoNamedItem,

    /// Metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AddName {
    V0(AddNameV0),
}

/// Remove a name from the repo, using ORset CRDT logic
///
/// DEPS: all the AddName commits seen for this name
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RemoveNameV0 {
    /// name to remove
    pub name: String,

    /// Metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RemoveName {
    V0(RemoveNameV0),
}

//
// Commits on Store branch
//

/// Adds a repo into the store branch.
///
/// The repo's `store` field should match the destination store
/// DEPS to the previous AddRepo commit(s) if it is an update. in this case, repo_id of the referenced rootbranch definition(s) should match
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AddRepoV0 {
    pub read_cap: ReadCap,

    /// Metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AddRepo {
    V0(AddRepoV0),
}

impl AddRepo {
    pub fn read_cap(&self) -> &ReadCap {
        match self {
            Self::V0(v0) => &v0.read_cap,
        }
    }
}

/// Removes a repo from the store branch.
///
/// DEPS to the previous AddRepo commit(s) (ORset logic) with matching repo_id
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RemoveRepoV0 {
    pub id: RepoId,

    /// Metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RemoveRepo {
    V0(RemoveRepoV0),
}

// TODO: publish (for public site only)

//
// Commits on User branch
//

/// Adds a link into the user branch, so that a user can share with all its device a new Link they received.
///
/// The repo's `store` field should not match with any store of the user. Only external repos are accepted here.
/// DEPS to the previous AddLink commit(s) if it is an update. in this case, repo_id of the referenced rootbranch definition(s) should match
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AddLinkV0 {
    pub read_cap: ReadCap,

    /// Metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AddLink {
    V0(AddLinkV0),
}

/// Removes a link from the `user` branch.
///
/// DEPS to the previous AddLink commit(s) (ORset logic) with matching repo_id
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RemoveLinkV0 {
    pub id: RepoId,

    /// Metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RemoveLink {
    V0(RemoveLinkV0),
}

/// Adds a SignerCap into the user branch,
///
/// so that a user can share with all its device a new signing capability that was just created.
/// The cap's `epoch` field should be dereferenced and the user must be part of the quorum/owners.
/// DEPS to the previous AddSignerCap commit(s) if it is an update. in this case, repo_ids have to match,
/// and the referenced rootbranch definition(s) should have compatible causal past (the newer AddSignerCap must have a newer epoch compared to the one of the replaced cap )
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AddSignerCapV0 {
    pub cap: SignerCap,

    /// Metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AddSignerCap {
    V0(AddSignerCapV0),
}

impl fmt::Display for AddSignerCap {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "V0")?;
                writeln!(f, "cap:   {:?}", v0.cap)?;

                Ok(())
            }
        }
    }
}

/// Removes a SignerCap from the `user` branch.
///
/// DEPS to the previous AddSignerCap commit(s) (ORset logic) with matching repo_id
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RemoveSignerCapV0 {
    pub id: RepoId,

    /// Metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RemoveSignerCap {
    V0(RemoveSignerCapV0),
}

/// Adds a wallet operation so all the devices can sync their locally saved wallet on disk (at the next wallet opening)
///
/// DEPS are the last HEAD of wallet updates.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct WalletUpdateV0 {
    #[serde(with = "serde_bytes")]
    pub op: Vec<u8>,

    /// Metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum WalletUpdate {
    V0(WalletUpdateV0),
}

/// Updates the ReadCap of the public, protected sites, Group and Dialog stores of the User
///
/// DEPS to the previous ones.
/// this is used to speedup joining the overlay of such stores, for new devices on new brokers
/// so they don't have to read the whole pub/sub of the StoreRepo in order to get the last ReadCap
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct StoreUpdateV0 {
    // id of the store.
    pub store: StoreRepo,

    pub store_read_cap: ReadCap,

    pub overlay_branch_read_cap: ReadCap,

    /// Metadata
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum StoreUpdate {
    V0(StoreUpdateV0),
}

impl fmt::Display for StoreUpdate {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "V0")?;
                writeln!(f, "store:   {}", v0.store)?;
                writeln!(f, "store_read_cap:  {}", v0.store_read_cap)?;
                write!(
                    f,
                    "overlay_branch_read_cap:     {}",
                    v0.overlay_branch_read_cap
                )?;
                Ok(())
            }
        }
    }
}

//
//  Commits on transaction branches
//

/// Transaction with CRDT operations
// TODO: edeps: List<(repo_id,ObjectRef)>
// TODO: rcpts: List<repo_id>
pub type TransactionV0 = Vec<u8>;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Transaction {
    #[serde(with = "serde_bytes")]
    V0(TransactionV0),
}

impl Transaction {
    pub fn body_type(&self) -> u8 {
        match self {
            Self::V0(v0) => v0[0],
        }
    }
}

/// Add a new binary file in a branch
///
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

impl fmt::Display for AddFile {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "V0")?;
                writeln!(f, "name: {:?}", v0.name)
            }
        }
    }
}

impl AddFile {
    pub fn name(&self) -> &Option<String> {
        match self {
            Self::V0(v0) => &v0.name,
        }
    }
}

/// Remove a file from the branch, using ORset CRDT logic
///
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

    /// Reference to Object containing Snapshot data structure
    pub content: ObjectRef,
}

/// Snapshot of a Branch
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Snapshot {
    V0(SnapshotV0),
}

impl Snapshot {
    pub fn snapshot_ref(&self) -> &ObjectRef {
        match self {
            Self::V0(v0) => &v0.content,
        }
    }
}

impl fmt::Display for Snapshot {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "V0\r\nheads:")?;
                for h in v0.heads.iter() {
                    writeln!(f, "{h}")?;
                }
                writeln!(f, "content: {}", v0.content)?;
                Ok(())
            }
        }
    }
}

/// Compact: Hard Snapshot of a Branch
///
/// Contains a data structure
/// computed from the commits at the specified head.
/// ACKS contains the head the snapshot was made from
///
/// hard snapshot will erase all the CommitBody of ancestors in the branch
/// the compact boolean should be set in the Header too.
/// after a hard snapshot, it is recommended to refresh the read capability (to empty the topics of the keys they still hold)
/// If a branch is based on a hard snapshot, it cannot be merged back into the branch where the hard snapshot was made.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CompactV0 {
    // Branch heads the snapshot was made from, can be useful when shared outside and the commit_header_key is set to None. otherwise it is redundant to ACKS
    pub heads: Vec<ObjectId>,

    // optional serialization of a ReadBranchLink, if the snapshot is made from another repo.
    #[serde(with = "serde_bytes")]
    pub origin: Vec<u8>,

    /// Reference to Object containing Snapshot data structure
    pub content: ObjectRef,
}

/// Snapshot of a Branch
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Compact {
    V0(CompactV0),
}

// Async Threshold Signature of a commit (or commits) V0 based on the partial order quorum
//
// Can sign Transaction, AddFile, and Snapshot, after they have been committed to the DAG.
// DEPS: the signed commits
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

impl AsyncSignature {
    pub fn verify_(&self) -> bool {
        // check that the signature object referenced here, is of type threshold_sig Partial
        unimplemented!();
    }
    pub fn reference(&self) -> &ObjectRef {
        match self {
            Self::V0(v0) => v0,
        }
    }
}

impl fmt::Display for AsyncSignature {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "V0\r\nsignature object ref: {}", v0)?;
                Ok(())
            }
        }
    }
}

/// Sync Threshold Signature of one or a chain of commits . V0
///
/// points to the new Signature Object
/// based on the total order quorum (or owners quorum)
/// mandatory for UpdateRootBranch, UpdateBranch, some AddBranch, RemoveBranch, RemoveMember, RemovePermission, Quorum, Compact, sync Transaction, RootCapRefresh, BranchCapRefresh
/// DEPS: the last signed commit in chain
/// ACKS: previous head before the chain of signed commit(s). should be identical to the HEADS (marked as DEPS) of first commit in chain
// #[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
// pub struct SyncSignatureV0 {
//     /// An Object containing the Threshold signature
//     pub signature: ObjectRef,
// }
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum SyncSignature {
    V0(ObjectRef),
}

impl SyncSignature {
    pub fn verify_quorum(&self) -> bool {
        // check that the signature object referenced here, is of type threshold_sig Total or Owner
        unimplemented!();
    }
    pub fn reference(&self) -> &ObjectRef {
        match self {
            Self::V0(v0) => v0,
        }
    }
}

impl fmt::Display for SyncSignature {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "V0")?;
                writeln!(f, "{}", v0)?;
                Ok(())
            }
        }
    }
}

/// the second tuple member is only set when a write_cap refresh is performed, and for users that are Editor (any Member that also has at least one permission, plus all the Owners)
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RefreshSecretV0(SymKey, Option<SymKey>);

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RefreshCapV0 {
    /// an ordered list of user IDs, with their corresponding crypto_box of a RefreshSecretV0.
    /// A hashed User ID for each Member (use author_digest()), Signer and Owner of the repo (except the one that is being excluded, if any)
    /// the ordering is important as it allows receivers to perform a binary search on the array (searching for their own ID)
    /// the refresh secret is used for encrypting the SyncSignature commit's key in the event sent in old topic (RefreshSecretV0.0) and for an optional write_cap refresh (RefreshSecretV0.1)
    pub refresh_secret: Vec<(Digest, serde_bytes::ByteBuf)>,
}

/// RefreshCap
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RefreshCap {
    V0(RefreshCapV0),
}

/// RootCapRefresh. renew the capabilities of the root branch, or all transactional branches and the root_branch.
///
/// Each branch forms its separate chain for that purpose.
/// can refresh the topic ids, or not
/// ACKS: current HEADS in the branch at the moment of refresh. DEPS to the previous RootBranch commit that will be superseded.
/// the chain on the root_branch is : RootCapRefresh -> RemovePermission/RemoveMember -> UpdateRootBranch -> optional AddPermission(s) -> AddBranch x for each branch
/// and on each transactional branch: BranchCapRefresh -> UpdateBranch
/// always eventually followed at the end of each chain by a SyncSignature (each branch its own).
/// The key used in EventV0 to encrypt the key for that SyncSignature commit is the refresh_secret (RefreshSecretV0.0).
///
/// On each new topic, the first commit (singleton) is a BranchCapRefreshed that contains internal references to the old branch (but no DEPS or ACKS).

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RootCapRefreshV0 {
    // ObjectRef to the RefreshCap object
    pub refresh_ref: ObjectRef,

    /// write cap encrypted with the refresh_secret RefreshSecretV0.1
    /// only allowed if the user has RefreshWriteCap permission
    pub write_cap: Option<RepoWriteCapSecret>,
}

///
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum RootCapRefresh {
    V0(RootCapRefreshV0),
}

/// BranchCapRefresh renew the capabilities of one specific transactional branch
///
/// ACKS: current HEADS in the branch at the moment of refresh.  DEPS to the previous Branch commit that will be superseded.
/// the chain is, on the transactional branch: BranchCapRefresh -> UpdateBranch
/// if this is an isolated branch refresh (not part of a rootcaprefresh), then the root branch chain is : AddBranch (ACKS to HEADS, quorumtype:TotalOrder )
/// always eventually followed at the end of each chain by a SyncSignature (each branch its own)
/// The key used in EventV0 to encrypt the key for that SyncSignature commit is the refresh_secret (RefreshSecretV0.0), but not on the root branch if it is an isolated branch refresh
///
/// On the new topic, the first commit (singleton) is a BranchCapRefreshed that contains internal references to the old branch (but no DEPS or ACKS).

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BranchCapRefreshV0 {
    /// ObjectRef to the RefreshCap object (shared with a root branch and other transac branches, or specially crafted for this branch if it is an isolated branch refresh)
    pub refresh_ref: ObjectRef,
}

/// BranchCapRefresh
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum BranchCapRefresh {
    V0(BranchCapRefreshV0),
}

/// BranchCapRefreshed is a singleton in a new topic. it has no ACKS nor DEPS.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BranchCapRefreshedV0 {
    /// reference to the previous read_cap of the branch
    pub continuation_of: ReadCap,

    /// reference to the SyncSignature commit that did the refresh
    pub refresh: ObjectRef,

    /// reference to the UpdateBranch/UpdateRootBranch commit within the event  of the SyncSignature
    pub new_read_cap: ReadCap,
}

/// BranchCapRefreshed
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum BranchCapRefreshed {
    V0(BranchCapRefreshedV0),
}

/// A Threshold Signature content
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct SignatureContentV0 {
    /// list of all the "end of chain" commit for each branch when doing a SyncSignature, or a list of arbitrary commits to sign, for AsyncSignature.
    pub commits: Vec<ObjectId>,
}

/// A Signature content
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum SignatureContent {
    V0(SignatureContentV0),
}

impl fmt::Display for SignatureContent {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "V0 == Commits: {}", v0.commits.len())?;
                let mut i = 0;
                for block_id in &v0.commits {
                    writeln!(f, "========== {:03}: {}", i, block_id)?;
                    i += 1;
                }
                Ok(())
            }
        }
    }
}

/// A Threshold Signature and the set used to generate it
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum ThresholdSignatureV0 {
    PartialOrder(threshold_crypto::Signature),
    TotalOrder(threshold_crypto::Signature),
    Owners(threshold_crypto::Signature),
}

impl fmt::Display for ThresholdSignatureV0 {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::PartialOrder(_) => {
                writeln!(f, "PartialOrder")
            }
            Self::TotalOrder(_) => {
                writeln!(f, "TotalOrder")
            }
            Self::Owners(_) => {
                writeln!(f, "Owners")
            }
        }
    }
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

impl fmt::Display for Signature {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "V0")?;
                writeln!(f, "content:        {}", v0.content)?;
                writeln!(f, "threshold_sig:  {}", v0.threshold_sig)?;
                writeln!(f, "certificate_ref:{}", v0.certificate_ref)?;
                Ok(())
            }
        }
    }
}

impl Signature {
    pub fn certificate_ref(&self) -> &ObjectRef {
        match self {
            Self::V0(v0) => &v0.certificate_ref,
        }
    }
    pub fn signed_commits(&self) -> &[ObjectId] {
        match self {
            Self::V0(v0) => match &v0.content {
                SignatureContent::V0(v0) => &v0.commits,
            },
        }
    }
}

/// A Signature object (it is not a commit), referenced in AsyncSignature or SyncSignature
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Signature {
    V0(SignatureV0),
}

/// Enum for "orders" PKsets.
///
/// Can be inherited from the store, in this case, it is an ObjectRef pointing to the latest Certificate of the store.
/// Or can be 2 PublicKey defined specially for this repo,
/// .0 one for the total_order (first one).
/// .1 the other for the partial_order (second one. a PublicKey. is optional, as some repos are forcefully totally ordered and do not have this set).
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum OrdersPublicKeySetsV0 {
    Store(ObjectRef),
    Repo(
        (
            threshold_crypto::PublicKey,
            Option<threshold_crypto::PublicKey>,
        ),
    ),
    None, // the total_order quorum is not defined (yet, or anymore). there are no signers for the total_order, neither for the partial_order. The owners replace them.
}

/// A Certificate content, that will be signed by the previous certificate signers.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CertificateContentV0 {
    /// the previous certificate in the chain of trust. Can be another Certificate or the Repository commit when we are at the root of the chain of trust.
    pub previous: ObjectRef,

    /// The Commit Id of the latest RootBranch definition (= the ReadCap ID) in order to keep in sync with the options for signing.
    /// not used for verifying (this is why the secret is not present).
    pub readcap_id: ObjectId,

    /// PublicKey used by the Owners. verifier uses this PK if the signature was issued by the Owners.
    pub owners_pk_set: threshold_crypto::PublicKey,

    /// two "orders" PublicKeys (total_order and partial_order).
    pub orders_pk_sets: OrdersPublicKeySetsV0,
}

/// A Signature of a Certificate, with an indication of which the threshold keyset or private key used to generate it
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum CertificateSignatureV0 {
    /// the root CertificateContentV0 is signed with the PrivKey of the Repo
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
    RootCapRefresh(RootCapRefresh), // total order enforced with total_order_quorum
    AddMember(AddMember),   // total order enforced with total_order_quorum
    RemoveMember(RemoveMember), // total order enforced with total_order_quorum
    AddPermission(AddPermission),
    RemovePermission(RemovePermission),
    AddBranch(AddBranch),
    RemoveBranch(RemoveBranch),
    AddName(AddName),
    RemoveName(RemoveName),
    Delete(()), // signed with owners key. Deletes the repo

    // TODO? Quorum(Quorum), // changes the quorum without changing the RootBranch

    //
    // For transactional branches:
    //
    Branch(Branch),                     // singleton and should be first in branch
    BranchCapRefresh(BranchCapRefresh), // total order enforced with total_order_quorum
    UpdateBranch(Branch),               // total order enforced with total_order_quorum
    Snapshot(Snapshot),                 // a soft snapshot
    AsyncTransaction(Transaction),      // partial_order
    SyncTransaction(Transaction),       // total_order
    AddFile(AddFile),
    RemoveFile(RemoveFile),
    Compact(Compact), // a hard snapshot. total order enforced with total_order_quorum
    //Merge(Merge),
    //Revert(Revert), // only possible on partial order commit
    AsyncSignature(AsyncSignature),

    //
    // For both
    //
    CapRefreshed(BranchCapRefreshed), // singleton and should be first in renewed branch
    SyncSignature(SyncSignature),

    //
    // For store branch:
    //
    AddRepo(AddRepo),
    RemoveRepo(RemoveRepo),

    //
    // For user branch:
    //
    AddLink(AddLink),
    RemoveLink(RemoveLink),
    AddSignerCap(AddSignerCap),
    RemoveSignerCap(RemoveSignerCap),
    WalletUpdate(WalletUpdate),
    StoreUpdate(StoreUpdate),
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
    IamTheSignature,
}

impl QuorumType {
    pub fn final_consistency(&self) -> bool {
        match self {
            Self::TotalOrder => true,
            _ => false,
        }
    }
}

impl CommitBody {
    pub fn get_type(&self) -> CommitType {
        match self {
            Self::V0(v0) => v0.get_type(),
        }
    }
    pub fn get_signature_reference(&self) -> Option<ObjectRef> {
        match self {
            Self::V0(v0) => v0.get_signature_reference(),
        }
    }
}

impl CommitBodyV0 {
    pub fn get_type(&self) -> CommitType {
        match self {
            Self::Branch(_) => CommitType::Branch,
            Self::BranchCapRefresh(_) => CommitType::BranchCapRefresh,
            Self::UpdateBranch(_) => CommitType::UpdateBranch,
            Self::Snapshot(_) => CommitType::Snapshot,
            Self::AsyncTransaction(t) | Self::SyncTransaction(t) => match t.body_type() {
                0 => CommitType::TransactionGraph,
                1 => CommitType::TransactionDiscrete,
                2 => CommitType::TransactionBoth,
                _ => panic!("invalid TransactionBody"),
            },
            Self::AddFile(_) => CommitType::FileAdd,
            Self::RemoveFile(_) => CommitType::FileRemove,
            Self::Compact(_) => CommitType::Compact,
            Self::AsyncSignature(_) => CommitType::AsyncSignature,
            Self::CapRefreshed(_) => CommitType::CapRefreshed,
            Self::SyncSignature(_) => CommitType::SyncSignature,
            _ => CommitType::Other,
        }
    }

    pub fn get_signature_reference(&self) -> Option<ObjectRef> {
        match self {
            Self::AsyncSignature(s) => Some(s.reference().clone()),
            Self::SyncSignature(s) => Some(s.reference().clone()),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum CommitType {
    TransactionGraph,
    TransactionDiscrete,
    TransactionBoth,
    FileAdd,
    FileRemove,
    Snapshot,
    Compact,
    AsyncSignature,
    SyncSignature,
    Branch,
    UpdateBranch,
    BranchCapRefresh,
    CapRefreshed,
    Other,
}

/// Content of a Commit
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CommitContentV0 {
    /// Commit author (a hash of UserId)
    /// BLAKE3 keyed hash over UserId
    /// - key: BLAKE3 derive_key ("NextGraph UserId Hash Overlay Id for Commit BLAKE3 key", overlayId)
    /// hash will be different than for ForwardedPeerAdvertV0 so that core brokers dealing with public sites wont be able to correlate commits and editing peers (via common author's hash).
    /// only the brokers of the authors that pin a repo for outeroverlay exposure, will be able to correlate.
    /// it also is a different hash than the InboxId, and the OuterOverlayId, which is good to prevent correlation when the RepoId is used as author (for Repository, RootBranch and Branch commits)
    pub author: Digest,

    // Peer's sequence number
    // pub seq: u64,
    /// BranchId the commit belongs to (not a ref, as readers do not need to access the branch definition)
    pub branch: BranchId,

    /// optional list of dependencies on some commits in the root branch that contain the write permission needed for this commit
    pub perms: Vec<ObjectId>,

    /// Keys to be able to open all the references (deps, acks, files, etc...)
    pub header_keys: Option<CommitHeaderKeys>,

    /// This commit can only be accepted if signed by this quorum
    pub quorum: QuorumType,

    pub timestamp: Timestamp,

    /// App-specific metadata (commit message?)
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
    pub fn timestamp(&self) -> Timestamp {
        match self {
            CommitContent::V0(v0) => v0.timestamp,
        }
    }
    pub fn branch(&self) -> &BranchId {
        match self {
            CommitContent::V0(v0) => &v0.branch,
        }
    }

    pub fn final_consistency(&self) -> bool {
        match self {
            CommitContent::V0(v0) => v0.quorum.final_consistency(),
        }
    }

    pub fn author_digest(author: &UserId, overlay: OverlayId) -> Digest {
        let author_id = serde_bare::to_vec(author).unwrap();
        let overlay_id = serde_bare::to_vec(&overlay).unwrap();
        let mut key: [u8; 32] = blake3::derive_key(
            "NextGraph UserId Hash Overlay Id for Commit BLAKE3 key",
            overlay_id.as_slice(),
        );
        let key_hash = blake3::keyed_hash(&key, &author_id);
        key.zeroize();
        Digest::from_slice(*key_hash.as_bytes())
    }
}

/// Commit object
///
/// Signed by member key authorized to publish this commit type
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

    /// optional Commit Body
    #[serde(skip)]
    pub body: OnceCell<CommitBody>,

    /// optional List of blocks, including the header and body ones. First one is the ObjectId of commit. Vec is ready to be sent in Event
    #[serde(skip)]
    pub blocks: Vec<BlockId>,

    /// Commit content
    pub content: CommitContent,

    /// Signature over the content (a CommitContent) by the author. an editor (UserId)
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
    RefreshCap(RefreshCap),
    #[serde(with = "serde_bytes")]
    Snapshot(Vec<u8>), // JSON serialization (UTF8)
}

/// Immutable data stored encrypted in a Merkle tree
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum ObjectContent {
    V0(ObjectContentV0),
}

//
// COMMON TYPES FOR MESSAGES
//

pub trait IObject {
    fn block_ids(&self) -> Vec<BlockId>;

    fn id(&self) -> Option<ObjectId>;

    fn key(&self) -> Option<SymKey>;
}

pub type DirectPeerId = PubKey;

pub type ForwardedPeerId = PubKey;

/// Peer ID: public key of the node, or an encrypted version of it
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum PeerId {
    Direct(DirectPeerId),
    Forwarded(ForwardedPeerId),
    /// BLAKE3 keyed hash over ForwardedPeerId
    /// - key: BLAKE3 derive_key ("NextGraph ForwardedPeerId Hash Overlay Id BLAKE3 key", overlayId)
    ForwardedObfuscated(Digest),
}

impl fmt::Display for PeerId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Direct(p) => {
                write!(f, "Direct    : {}", p)
            }
            Self::Forwarded(p) => {
                write!(f, "Forwarded    : {}", p)
            }
            Self::ForwardedObfuscated(p) => {
                write!(f, "ForwardedObfuscated    : {}", p)
            }
        }
    }
}

impl PeerId {
    pub fn get_pub_key(&self) -> PubKey {
        match self {
            Self::Direct(pk) | Self::Forwarded(pk) => pk.clone(),
            _ => panic!("cannot get a pubkey for ForwardedObfuscated"),
        }
    }
}

/// Content of EventV0
///
/// Contains the objects of newly published Commit, its optional blocks, and optional FILES and their blocks.
/// If a block is not present in the Event, its ID should be present in block_ids and the block should be put on the emitting broker beforehand with BlocksPut.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EventContentV0 {
    /// Pub/sub topic
    pub topic: TopicId,

    // TODO: could be obfuscated (or not, if we want to be able to recall events)
    // on public repos, should be obfuscated
    pub publisher: PeerId,

    /// Commit sequence number of publisher
    pub seq: u64,

    /// Blocks with encrypted content. First in the list is always the commit block followed by its children, then its optional header and body blocks (and eventual children),
    /// blocks of the FILES are optional (only sent here if user specifically want to push them to the pub/sub).
    /// the first in the list MUST contain a commit_header_key
    /// When saved locally (the broker keeps the associated event, until the topic is refreshed(the last heads retain their events) ),
    /// so, this `blocks` list is emptied (as the blocked are saved in the overlay storage anyway) and their IDs are kept on the side.
    /// then when the event needs to be send in reply to a *TopicSyncReq, the blocks list is regenerated from the IDs,
    /// so that a valid EventContent can be sent (and so that its signature can be verified successfully)
    pub blocks: Vec<Block>,

    /// Ids of additional Blocks (FILES or Objects) with encrypted content that are not to be pushed in the pub/sub
    /// they will be retrieved later by interested users
    pub file_ids: Vec<BlockId>,

    /// can be :
    /// * Encrypted key for the Commit object (the first Block in blocks vec)
    ///   The ObjectKey is encrypted using ChaCha20:
    ///   - key: BLAKE3 derive_key ("NextGraph Event Commit ObjectKey ChaCha20 key",
    ///                             RepoId + BranchId + branch_secret(ReadCapSecret of the branch) + publisher)
    ///   - nonce: commit_seq
    /// * If it is a CertificateRefresh, both the blocks and file_ids vectors are empty.
    ///   the key here contains an encrypted ObjectRef to the new Certificate.
    ///   The whole ObjectRef is encrypted (including the ID) to avoid correlation of topics who will have the same Certificate ID (belong to the same repo)
    ///   Encrypted using ChaCha20, with :
    ///   - key: BLAKE3 derive_key ("NextGraph Event Certificate ObjectRef ChaCha20 key",
    ///                             RepoId + BranchId + branch_secret(ReadCapSecret of the branch) + publisher)
    ///                             it is the same key as above, because the commit_seq will be different (incremented anyway)
    ///   - nonce: commit_seq
    #[serde(with = "serde_bytes")]
    pub key: Vec<u8>,
}

/// Pub/sub event published in a topic
///
/// Forwarded along event routing table entries
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EventV0 {
    pub content: EventContentV0,

    /// Signature over content by topic key
    pub topic_sig: Sig,

    /// Signature over content by publisher PeerID priv key
    pub peer_sig: Sig,
}

/// Pub/sub event published in a topic
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum Event {
    V0(EventV0),
}
