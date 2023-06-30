// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::hash::{Hash, Hasher};
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

impl ClientV0 {
    #[deprecated(note = "**Don't use dummy method**")]
    pub fn dummy() -> Self {
        ClientV0 {
            priv_key: PrivKey::dummy(),
            storage_master_key: SymKey::random(),
            auto_open: vec![],
        }
    }
}

/// EncryptedWallet block Version 0
#[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize)]
pub struct EncryptedWalletV0 {
    pub wallet_privkey: PrivKey,

    #[serde(with = "serde_bytes")]
    pub pazzle: Vec<u8>,

    pub mnemonic: [u16; 12],

    pub pin: [u8; 4],

    #[zeroize(skip)]
    pub personal_site: PubKey,

    #[zeroize(skip)]
    pub sites: HashMap<PubKey, SiteV0>,

    // map of brokers and their connection details
    #[zeroize(skip)]
    pub brokers: HashMap<PubKey, Vec<BrokerInfoV0>>,

    // map of all devices of the user
    #[zeroize(skip)]
    pub clients: HashMap<PubKey, ClientV0>,

    #[zeroize(skip)]
    pub overlay_core_overrides: HashMap<OverlayId, Vec<PubKey>>,

    /// third parties data saved in the wallet. the string (key) in the hashmap should be unique among vendors.
    /// the format of the byte array (value) is up to the vendor, to serde as needed.
    #[zeroize(skip)]
    pub third_parties: HashMap<String, Vec<u8>>,
}

impl EncryptedWalletV0 {
    pub fn add_site(&mut self, site: SiteV0) {
        let site_id = site.site_key.to_pub();
        let _ = self.sites.insert(site_id, site);
    }
    pub fn add_brokers(&mut self, brokers: Vec<BrokerInfoV0>) {
        for broker in brokers {
            let key = broker.get_id();
            let mut list = self.brokers.get_mut(&key);
            if list.is_none() {
                let new_list = vec![];
                self.brokers.insert(key, new_list);
                list = self.brokers.get_mut(&key);
            }
            list.unwrap().push(broker);
        }
    }
    pub fn add_client(&mut self, client: ClientV0) {
        let client_id = client.priv_key.to_pub();
        let _ = self.clients.insert(client_id, client);
    }
    pub fn add_overlay_core_overrides(&mut self, overlay: &OverlayId, cores: &Vec<PubKey>) {
        let _ = self.overlay_core_overrides.insert(*overlay, cores.to_vec());
    }
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

    // WalletLog content encrypted with XChaCha20Poly1305, AD = timestamp and walletID
    #[serde(with = "serde_bytes")]
    pub encrypted: Vec<u8>,
}

/// Wallet Log V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WalletLogV0 {
    pub log: Vec<(u128, WalletOperationV0)>,
}

/// Wallet Log
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum WalletLog {
    V0(WalletLogV0),
}

impl WalletLog {
    pub fn new_v0(create_op: WalletOpCreateV0) -> Self {
        WalletLog::V0(WalletLogV0::new(create_op))
    }
}

impl WalletLogV0 {
    pub fn new(create_op: WalletOpCreateV0) -> Self {
        let mut wallet = WalletLogV0 { log: vec![] };
        wallet.add(WalletOperationV0::CreateWalletV0(create_op));
        wallet
    }

    pub fn add(&mut self, op: WalletOperationV0) {
        let duration = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        self.log.push((duration, op));
    }

    /// applies all the operation and produces an encrypted wallet object.
    pub fn reduce(&self) -> Result<EncryptedWalletV0, NgWalletError> {
        if self.log.len() < 1 {
            Err(NgWalletError::NoCreateWalletPresent)
        } else if let (_, WalletOperationV0::CreateWalletV0(create_op)) = &self.log[0] {
            let mut wallet: EncryptedWalletV0 = create_op.into();

            for op in &self.log {
                match &op.1 {
                    WalletOperationV0::CreateWalletV0(_) => { /* intentionally left blank. this op is already reduced */
                    }
                    WalletOperationV0::AddSiteV0(o) => {
                        if self.is_first_and_not_deleted_afterwards(op, "RemoveSiteV0") {
                            wallet.add_site(o.clone());
                        }
                    }
                    WalletOperationV0::RemoveSiteV0(_) => {}
                    WalletOperationV0::AddBrokerServerV0(o) => {
                        if self.is_last_and_not_deleted_afterwards(op, "RemoveBrokerServerV0") {
                            wallet.add_brokers(vec![BrokerInfoV0::ServerV0(o.clone())]);
                        }
                    }
                    WalletOperationV0::RemoveBrokerServerV0(_) => {}
                    WalletOperationV0::SetBrokerCoreV0(o) => {
                        if self.is_last_occurrence(op.0, &op.1) != 0 {
                            wallet.add_brokers(vec![BrokerInfoV0::CoreV0(o.clone())]);
                        }
                    }
                    WalletOperationV0::SetClientV0(o) => {
                        if self.is_last_occurrence(op.0, &op.1) != 0 {
                            wallet.add_client(o.clone());
                        }
                    }
                    WalletOperationV0::AddOverlayCoreOverrideV0((overlay, cores)) => {
                        if self
                            .is_last_and_not_deleted_afterwards(op, "RemoveOverlayCoreOverrideV0")
                        {
                            wallet.add_overlay_core_overrides(overlay, cores);
                        }
                    }
                    WalletOperationV0::RemoveOverlayCoreOverrideV0(_) => {}
                    WalletOperationV0::AddSiteCoreV0((site, core)) => {
                        if self.is_first_and_not_deleted_afterwards(op, "RemoveSiteCoreV0") {
                            let _ = wallet.sites.get_mut(&site).and_then(|site| {
                                site.cores.push(*core);
                                None::<SiteV0>
                            });
                        }
                    }
                    WalletOperationV0::RemoveSiteCoreV0(_) => {}
                    WalletOperationV0::AddSiteBootstrapV0((site, server)) => {
                        if self.is_first_and_not_deleted_afterwards(op, "RemoveSiteBootstrapV0") {
                            let _ = wallet.sites.get_mut(&site).and_then(|site| {
                                site.bootstraps.push(*server);
                                None::<SiteV0>
                            });
                        }
                    }
                    WalletOperationV0::RemoveSiteBootstrapV0(_) => {}
                    WalletOperationV0::AddThirdPartyDataV0((key, value)) => {
                        if self.is_last_and_not_deleted_afterwards(op, "RemoveThirdPartyDataV0") {
                            let _ = wallet.third_parties.insert(key.to_string(), value.to_vec());
                        }
                    }
                    WalletOperationV0::RemoveThirdPartyDataV0(_) => {}
                    WalletOperationV0::SetSiteRBDRefV0((site, store_type, rbdr)) => {
                        if self.is_last_occurrence(op.0, &op.1) != 0 {
                            let _ = wallet.sites.get_mut(&site).and_then(|site| {
                                match store_type {
                                    SiteStoreType::Public => {
                                        site.public.root_branch_def_ref = rbdr.clone()
                                    }
                                    SiteStoreType::Protected => {
                                        site.protected.root_branch_def_ref = rbdr.clone()
                                    }
                                    SiteStoreType::Private => {
                                        site.private.root_branch_def_ref = rbdr.clone()
                                    }
                                };
                                None::<SiteV0>
                            });
                        }
                    }
                    WalletOperationV0::SetSiteRepoSecretV0((site, store_type, secret)) => {
                        if self.is_last_occurrence(op.0, &op.1) != 0 {
                            let _ = wallet.sites.get_mut(&site).and_then(|site| {
                                match store_type {
                                    SiteStoreType::Public => {
                                        site.public.repo_secret = secret.clone()
                                    }
                                    SiteStoreType::Protected => {
                                        site.protected.repo_secret = secret.clone()
                                    }
                                    SiteStoreType::Private => {
                                        site.private.repo_secret = secret.clone()
                                    }
                                };
                                None::<SiteV0>
                            });
                        }
                    }
                }
            }

            Ok(wallet)
        } else {
            Err(NgWalletError::NoCreateWalletPresent)
        }
    }

    pub fn is_first_and_not_deleted_afterwards(
        &self,
        item: &(u128, WalletOperationV0),
        delete_type: &str,
    ) -> bool {
        let hash = self.is_first_occurrence(item.0, &item.1);
        if hash != 0 {
            // check that it hasn't been deleted since the first occurrence
            let deleted = self.find_first_occurrence_of_type_and_hash_after_timestamp(
                delete_type,
                hash,
                item.0,
            );
            return deleted.is_none();
        }
        false
    }

    pub fn is_last_and_not_deleted_afterwards(
        &self,
        item: &(u128, WalletOperationV0),
        delete_type: &str,
    ) -> bool {
        let hash = self.is_last_occurrence(item.0, &item.1);
        if hash != 0 {
            // check that it hasn't been deleted since the last occurrence
            let deleted = self.find_first_occurrence_of_type_and_hash_after_timestamp(
                delete_type,
                hash,
                item.0,
            );
            return deleted.is_none();
        }
        false
    }

    pub fn is_first_occurrence(&self, timestamp: u128, searched_op: &WalletOperationV0) -> u64 {
        let searched_hash = searched_op.hash();
        //let mut timestamp = u128::MAX;
        //let mut found = searched_op;
        for op in &self.log {
            let hash = op.1.hash();
            if hash.0 == searched_hash.0 && op.0 < timestamp && hash.1 == searched_hash.1 {
                //timestamp = op.0;
                //found = &op.1;
                return 0;
            }
        }
        searched_hash.0
    }

    pub fn is_last_occurrence(&self, timestamp: u128, searched_op: &WalletOperationV0) -> u64 {
        let searched_hash = searched_op.hash();
        //let mut timestamp = 0u128;
        //let mut found = searched_op;
        for op in &self.log {
            let hash = op.1.hash();
            if hash.0 == searched_hash.0 && op.0 > timestamp && hash.1 == searched_hash.1 {
                //timestamp = op.0;
                //found = &op.1;
                return 0;
            }
        }
        searched_hash.0
    }

    pub fn find_first_occurrence_of_type_and_hash_after_timestamp(
        &self,
        searched_type: &str,
        searched_hash: u64,
        after: u128,
    ) -> Option<(u128, &WalletOperationV0)> {
        let mut timestamp = u128::MAX;
        let mut found = None;
        for op in &self.log {
            let hash = op.1.hash();
            if hash.0 == searched_hash
                && op.0 > after
                && op.0 < timestamp
                && hash.1 == searched_type
            {
                timestamp = op.0;
                found = Some(&op.1);
            }
        }
        found.map(|f| (timestamp, f))
    }
}

/// WalletOperation
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum WalletOperationV0 {
    CreateWalletV0(WalletOpCreateV0),
    AddSiteV0(SiteV0),
    RemoveSiteV0(PrivKey),
    AddBrokerServerV0(BrokerServerV0),
    RemoveBrokerServerV0(BrokerServerV0),
    SetBrokerCoreV0(BrokerCoreV0),
    SetClientV0(ClientV0),
    AddOverlayCoreOverrideV0((OverlayId, Vec<PubKey>)),
    RemoveOverlayCoreOverrideV0(OverlayId),
    AddSiteCoreV0((PubKey, PubKey)),
    RemoveSiteCoreV0((PubKey, PubKey)),
    AddSiteBootstrapV0((PubKey, PubKey)),
    RemoveSiteBootstrapV0((PubKey, PubKey)),
    AddThirdPartyDataV0((String, Vec<u8>)),
    RemoveThirdPartyDataV0(String),
    SetSiteRBDRefV0((PubKey, SiteStoreType, ObjectRef)),
    SetSiteRepoSecretV0((PubKey, SiteStoreType, SymKey)),
}
use std::collections::hash_map::DefaultHasher;

impl WalletOperationV0 {
    pub fn hash(&self) -> (u64, &str) {
        let mut s = DefaultHasher::new();
        match self {
            Self::CreateWalletV0(t) => (0, "CreateWalletV0"),
            Self::AddSiteV0(t) => {
                t.site_key.hash(&mut s);
                (s.finish(), "AddSiteV0")
            }
            Self::RemoveSiteV0(t) => {
                t.hash(&mut s);
                (s.finish(), "RemoveSiteV0")
            }
            Self::AddBrokerServerV0(t) => {
                t.hash(&mut s);
                (s.finish(), "AddBrokerServerV0")
            }
            Self::RemoveBrokerServerV0(t) => {
                t.hash(&mut s);
                (s.finish(), "RemoveBrokerServerV0")
            }
            Self::SetBrokerCoreV0(t) => {
                t.peer_id.hash(&mut s);
                (s.finish(), "SetBrokerCoreV0")
            }
            Self::SetClientV0(t) => {
                t.priv_key.hash(&mut s);
                (s.finish(), "SetClientV0")
            }
            Self::AddOverlayCoreOverrideV0(t) => {
                t.0.hash(&mut s);
                (s.finish(), "AddOverlayCoreOverrideV0")
            }
            Self::RemoveOverlayCoreOverrideV0(t) => {
                t.hash(&mut s);
                (s.finish(), "RemoveOverlayCoreOverrideV0")
            }
            Self::AddSiteCoreV0(t) => {
                t.0.hash(&mut s);
                t.1.hash(&mut s);
                (s.finish(), "AddSiteCoreV0")
            }
            Self::RemoveSiteCoreV0(t) => {
                t.0.hash(&mut s);
                t.1.hash(&mut s);
                (s.finish(), "RemoveSiteCoreV0")
            }
            Self::AddSiteBootstrapV0(t) => {
                t.0.hash(&mut s);
                t.1.hash(&mut s);
                (s.finish(), "AddSiteBootstrapV0")
            }
            Self::RemoveSiteBootstrapV0(t) => {
                t.0.hash(&mut s);
                t.1.hash(&mut s);
                (s.finish(), "RemoveSiteBootstrapV0")
            }
            Self::AddThirdPartyDataV0(t) => {
                t.0.hash(&mut s);
                (s.finish(), "AddThirdPartyDataV0")
            }
            Self::RemoveThirdPartyDataV0(t) => {
                t.hash(&mut s);
                (s.finish(), "RemoveThirdPartyDataV0")
            }
            Self::SetSiteRBDRefV0(t) => {
                t.0.hash(&mut s);
                t.1.hash(&mut s);
                (s.finish(), "SetSiteRBDRefV0")
            }
            Self::SetSiteRepoSecretV0(t) => {
                t.0.hash(&mut s);
                t.1.hash(&mut s);
                (s.finish(), "SetSiteRepoSecretV0")
            }
        }
    }
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

impl From<&WalletOpCreateV0> for EncryptedWalletV0 {
    fn from(op: &WalletOpCreateV0) -> Self {
        let mut wallet = EncryptedWalletV0 {
            wallet_privkey: op.wallet_privkey.clone(),
            pazzle: op.pazzle.clone(),
            mnemonic: op.mnemonic.clone(),
            pin: op.pin.clone(),
            personal_site: op.personal_site.site_key.to_pub(),
            sites: HashMap::new(),
            brokers: HashMap::new(),
            clients: HashMap::new(),
            overlay_core_overrides: HashMap::new(),
            third_parties: HashMap::new(),
        };
        wallet.add_site(op.personal_site.clone());
        wallet.add_brokers(op.brokers.clone());
        wallet.add_client(op.client.clone());
        wallet
    }
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

impl BrokerInfoV0 {
    pub fn get_id(&self) -> PubKey {
        match self {
            Self::CoreV0(c) => c.peer_id,
            Self::ServerV0(s) => s.peer_id,
        }
    }
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
    #[zeroize(skip)]
    pub client: ClientV0,
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
        client: ClientV0,
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
            client,
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
    NoCreateWalletPresent,
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
