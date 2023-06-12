// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::fmt;

use serde::{Deserialize, Serialize};
use serde_big_array::BigArray;

use p2p_net::types::NetAddr;
use p2p_repo::types::*;

/// WalletId is a PubKey
pub type WalletId = PubKey;

/// BootstrapId is a WalletId
pub type BootstrapId = WalletId;

/// BootstrapServer type
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum BoostrapServerTypeV0 {
    Localhost,
    BoxPrivate(Vec<NetAddr>),
    BoxPublic(Vec<NetAddr>),
    BoxPublicDyn(Vec<NetAddr>), // can be empty
    Domain(String),
}

/// BootstrapServer details Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BootstrapServerV0 {
    /// Network addresses
    pub server_type: BoostrapServerTypeV0,

    /// peerId of the server
    pub peer_id: PubKey,
}

/// Bootstrap content Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BootstrapContentV0 {
    /// list of servers, in order of preference
    pub servers: Vec<BootstrapServerV0>,
}

/// Bootstrap Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BootstrapV0 {
    /// ID
    pub id: BootstrapId,

    /// Content
    pub content: BootstrapContentV0,

    /// Signature over content by wallet's private key
    pub sig: Sig,
}

/// Bootstrap info
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum Bootstrap {
    V0(BootstrapV0),
}

impl Bootstrap {
    pub fn id(&self) -> BootstrapId {
        match self {
            Bootstrap::V0(v0) => v0.id,
        }
    }
    pub fn content_as_bytes(&self) -> Vec<u8> {
        match self {
            Bootstrap::V0(v0) => serde_bare::to_vec(&v0.content).unwrap(),
        }
    }
    pub fn sig(&self) -> Sig {
        match self {
            Bootstrap::V0(v0) => v0.sig,
        }
    }
}

/// EncryptedWallet block Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EncryptedWalletV0 {
    #[serde(with = "serde_bytes")]
    pub pazzle: Vec<u8>,

    pub mnemonic: [u16; 12],

    pub pin: [u8; 4],

    // first in the list is the main Site (Personal)
    pub sites: Vec<Site>,
}

/// EncryptedWallet block
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum EncryptedWallet {
    V0(EncryptedWalletV0),
}

/// Wallet content Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WalletContentV0 {
    #[serde(with = "serde_bytes")]
    pub security_img: Vec<u8>,

    pub security_txt: String,

    pub salt_pazzle: [u8; 16],

    pub salt_mnemonic: [u8; 16],

    // encrypted master keys. first is encrypted with pazzle, second is encrypted with mnemonic
    // AD = wallet_id
    #[serde(with = "BigArray")]
    pub enc_master_key_pazzle: [u8; 48],
    #[serde(with = "BigArray")]
    pub enc_master_key_mnemonic: [u8; 48],

    // nonce for the encryption of masterkey
    // incremented only if the masterkey changes
    // be very careful with incrementing this, as a conflict would result in total loss of crypto guarantees.
    pub master_nonce: u8,

    pub timestamp: Timestamp,

    // the peerId that update this version of the Wallet. this value is truncated by half and concatenated with the nonce
    pub peer_id: PubKey,
    pub nonce: u64,

    // EncryptedWallet content encrypted with XChaCha20Poly1305, AD = timestamp and walletID
    #[serde(with = "serde_bytes")]
    pub encrypted: Vec<u8>,
}

/// Wallet Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WalletV0 {
    /// ID
    pub id: WalletId,

    /// Content
    pub content: WalletContentV0,

    /// Signature over content by wallet's private key
    pub sig: Sig,
}

/// Wallet info
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum Wallet {
    V0(WalletV0),
}

impl Wallet {
    pub fn id(&self) -> WalletId {
        match self {
            Wallet::V0(v0) => v0.id,
        }
    }
    pub fn content_as_bytes(&self) -> Vec<u8> {
        match self {
            Wallet::V0(v0) => serde_bare::to_vec(&v0.content).unwrap(),
        }
    }
    pub fn sig(&self) -> Sig {
        match self {
            Wallet::V0(v0) => v0.sig,
        }
    }
}

/// Add Wallet Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddWalletV0 {
    /// wallet. optional (for those who chose not to upload their wallet to nextgraph.one server)
    pub wallet: Option<Wallet>,

    /// bootstrap
    pub bootstrap: Bootstrap,
}

/// Add Wallet
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AddWallet {
    V0(AddWalletV0),
}

impl AddWallet {
    pub fn id(&self) -> BootstrapId {
        match self {
            AddWallet::V0(v0) => v0.bootstrap.id(),
        }
    }
    pub fn bootstrap(&self) -> &Bootstrap {
        match self {
            AddWallet::V0(v0) => &v0.bootstrap,
        }
    }
    pub fn wallet(&self) -> Option<&Wallet> {
        match self {
            AddWallet::V0(v0) => v0.wallet.as_ref(),
        }
    }
}

/// Create Wallet Version 0, used by the API create_wallet_v0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateWalletV0 {
    #[serde(with = "serde_bytes")]
    pub security_img: Vec<u8>,

    pub security_txt: String,
    pub pin: [u8; 4],
    pub pazzle_length: u8,
    pub send_bootstrap: Option<Bootstrap>,
    pub send_wallet: bool,
    pub peer_id: PubKey,
    pub nonce: u64,
}

impl CreateWalletV0 {
    pub fn new(
        security_img: Vec<u8>,
        security_txt: String,
        pin: [u8; 4],
        pazzle_length: u8,
        send_bootstrap: Option<Bootstrap>,
        send_wallet: bool,
        peer_id: PubKey,
        nonce: u64,
    ) -> Self {
        CreateWalletV0 {
            security_img,
            security_txt,
            pin,
            pazzle_length,
            send_bootstrap,
            send_wallet,
            peer_id,
            nonce,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateWalletResultV0 {
    pub wallet: Wallet,
    pub pazzle: Vec<u8>,
    pub mnemonic: [u16; 12],
}

#[derive(Debug, Eq, PartialEq, Clone)]
pub enum NgWalletError {
    InvalidPin,
    InvalidPazzle,
    InvalidPazzleLength,
    InvalidSecurityImage,
    InvalidSecurityText,
    SubmissionError,
    InternalError,
    EncryptionError,
    DecryptionError,
    InvalidSignature,
}

impl fmt::Display for NgWalletError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum NgFileV0 {
    Wallet(Wallet),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum NgFile {
    V0(NgFileV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ShuffledPazzle {
    pub category_indices: Vec<u8>,
    pub emoji_indices: Vec<Vec<u8>>,
}
