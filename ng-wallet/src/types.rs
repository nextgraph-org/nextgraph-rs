// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::{collections::HashMap, fmt};
use web_time::SystemTime;
use zeroize::{Zeroize, ZeroizeOnDrop};

use serde::{Deserialize, Serialize};
use serde_big_array::BigArray;

use p2p_net::types::*;
use p2p_repo::types::*;

/// WalletId is a PubKey
pub type WalletId = PubKey;

/// BootstrapId is a WalletId
pub type BootstrapId = WalletId;

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

/// Device info Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ClientV0 {
    pub priv_key: PrivKey,

    pub storage_master_key: SymKey,

    /// list of users that should be opened automatically (at launch, after wallet opened) on this device
    pub auto_open: Vec<Identity>,
}

/// EncryptedWallet block Version 0
#[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize)]
pub struct EncryptedWalletV0 {
    pub wallet_privkey: PrivKey,

    #[serde(with = "serde_bytes")]
    pub pazzle: Vec<u8>,

    pub mnemonic: [u16; 12],

    pub pin: [u8; 4],

    // first in the list is the main Site (Personal)
    #[zeroize(skip)]
    pub sites: Vec<SiteV0>,

    // list of brokers and their connection details
    #[zeroize(skip)]
    pub brokers: Vec<BrokerInfoV0>,

    // list of all devices of the user
    #[zeroize(skip)]
    pub clients: Vec<ClientV0>,

    #[zeroize(skip)]
    pub overlay_core_overrides: HashMap<OverlayId, Vec<PubKey>>,

    /// third parties data saved in the wallet. the string (key) in the hashmap should be unique among vendors.
    /// the format of the byte array (value) is up to the vendor, to serde as needed.
    #[zeroize(skip)]
    pub third_parties: HashMap<String, Vec<u8>>,
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

    /// can be 9, 12 or 15 (or 0, in this case salt_pazzle and enc_master_key_pazzle are filled with zeros and should not be used)
    pub pazzle_length: u8,

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

    // the peerId that updated this version of the Wallet. this value is truncated by half and concatenated with the nonce
    pub peer_id: PubKey,
    pub nonce: u64,

    // WalletLog0 content encrypted with XChaCha20Poly1305, AD = timestamp and walletID
    #[serde(with = "serde_bytes")]
    pub encrypted: Vec<u8>,
}

/// Wallet Log
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WalletLog0 {
    pub log: Vec<(SystemTime, WalletOperationV0)>,
}

/// WalletOperation
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum WalletOperationV0 {
    CreateWalletV0(WalletOpCreateV0),
    AddSiteV0(SiteV0),
    RemoveSiteV0(Identity),
    AddBrokerV0(BrokerInfoV0),
    RemoveBrokerV0(BrokerInfoV0),
    AddClientV0(ClientV0),
    AddOverlayCoreOverrideV0((OverlayId, Vec<PubKey>)),
    RemoveOverlayCoreOverrideV0(OverlayId),
    AddSiteCoreV0((Identity, PubKey)),
    RemoveSiteCoreV0((Identity, PubKey)),
    AddSiteBootstrapV0((Identity, PubKey)),
    RemoveSiteBootstrapV0((Identity, PubKey)),
    AddThirdPartyDataV0((String, Vec<u8>)),
    RemoveThirdPartyDataV0(String),
    SetSiteRBDRefV0((Identity, ObjectRef)),
    SetSiteRepoSecretV0((Identity, SymKey)),
}

/// WalletOp Create V0
/// first operation in the log
/// also serialized and encoded in Rescue QRcode
#[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize)]
pub struct WalletOpCreateV0 {
    pub wallet_privkey: PrivKey,

    #[serde(with = "serde_bytes")]
    pub pazzle: Vec<u8>,

    pub mnemonic: [u16; 12],

    pub pin: [u8; 4],

    #[zeroize(skip)]
    pub personal_site: SiteV0,

    // list of brokers and their connection details
    #[zeroize(skip)]
    pub brokers: Vec<BrokerInfoV0>,

    #[zeroize(skip)]
    pub client: ClientV0,
}

/// Reduced Wallet content Version 0, for Login QRcode
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReducedWalletContentV0 {
    /// can be 9, 12 or 15 (or 0, in this case salt_pazzle and enc_master_key_pazzle are filled with zeros and should not be used)
    pub pazzle_length: u8,

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

    // the peerId that updated this version of the Wallet. this value is truncated by half and concatenated with the nonce
    pub peer_id: PubKey,
    pub nonce: u64,

    // ReducedEncryptedWalletV0 content encrypted with XChaCha20Poly1305, AD = timestamp and walletID
    #[serde(with = "serde_bytes")]
    pub encrypted: Vec<u8>,
}

/// Broker Info Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BrokerInfoV0 {
    ServerV0(BrokerServerV0),
    CoreV0(BrokerCoreV0),
}

/// ReducedEncryptedWallet block Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReducedEncryptedWalletV0 {
    // main Site (Personal)
    pub personal_site: ReducedSiteV0,

    // list of brokers and their connection details
    pub brokers: Vec<BrokerInfoV0>,

    pub client: ClientV0,
}

/// ReducedEncryptedWallet block
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ReducedEncryptedWallet {
    V0(ReducedEncryptedWalletV0),
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
    pub fn pazzle_length(&self) -> u8 {
        match self {
            Wallet::V0(v0) => v0.content.pazzle_length,
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
#[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize)]
pub struct CreateWalletV0 {
    #[zeroize(skip)]
    #[serde(with = "serde_bytes")]
    pub security_img: Vec<u8>,
    pub security_txt: String,
    pub pin: [u8; 4],
    pub pazzle_length: u8,
    #[zeroize(skip)]
    pub send_bootstrap: Option<Bootstrap>,
    #[zeroize(skip)]
    pub send_wallet: bool,
    #[zeroize(skip)]
    pub result_with_wallet_file: bool,
    #[zeroize(skip)]
    pub local_save: bool,
    #[zeroize(skip)]
    pub peer_id: PubKey,
    #[zeroize(skip)]
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
            result_with_wallet_file: false,
            local_save: true,
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

#[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize)]
pub struct CreateWalletResultV0 {
    #[zeroize(skip)]
    pub wallet: Wallet,
    #[serde(with = "serde_bytes")]
    #[zeroize(skip)]
    pub wallet_file: Vec<u8>,
    pub pazzle: Vec<u8>,
    pub mnemonic: [u16; 12],
    #[zeroize(skip)]
    pub wallet_name: String,
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
