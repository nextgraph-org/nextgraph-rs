// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use p2p_repo::log::*;
use std::hash::{Hash, Hasher};
use std::{collections::HashMap, fmt};
use web_time::SystemTime;
use zeroize::{Zeroize, ZeroizeOnDrop};

use serde::{Deserialize, Serialize};
use serde_big_array::BigArray;

use p2p_net::types::*;
use p2p_repo::errors::NgError;
use p2p_repo::types::*;
use p2p_repo::utils::{now_timestamp, sign};

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

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SessionWalletStorageV0 {
    // string is base64_url encoding of userId(pubkey)
    pub users: HashMap<String, SessionPeerStorageV0>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum SessionWalletStorage {
    V0(SessionWalletStorageV0),
}

impl SessionWalletStorageV0 {
    pub fn new() -> Self {
        SessionWalletStorageV0 {
            users: HashMap::new(),
        }
    }
    pub fn get_first_user_peer_nonce(&self) -> Result<(PubKey, u64), NgWalletError> {
        if self.users.len() > 1 {
            panic!("get_first_user_peer_nonce does not work as soon as there are more than one user in SessionWalletStorageV0")
        };
        let first = self.users.values().next();
        if first.is_none() {
            return Err(NgWalletError::InternalError);
        }
        let sps = first.unwrap();
        Ok((sps.peer_key.to_pub(), sps.last_wallet_nonce))
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SessionPeerStorageV0 {
    pub user: UserId,
    pub peer_key: PrivKey,
    pub last_wallet_nonce: u64,
    // string is base64_url encoding of branchId(pubkey)
    pub branches_last_seq: HashMap<String, u64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LocalWalletStorageV0 {
    pub bootstrap: BootstrapContent,
    pub wallet: Wallet,
    pub client: ClientId,
}

impl From<&CreateWalletResultV0> for LocalWalletStorageV0 {
    fn from(res: &CreateWalletResultV0) -> Self {
        LocalWalletStorageV0 {
            bootstrap: BootstrapContent::V0(BootstrapContentV0::new()),
            wallet: res.wallet.clone(),
            client: res.client.priv_key.to_pub(),
        }
    }
}

impl LocalWalletStorageV0 {
    pub fn new(wallet: Wallet, client: &ClientV0) -> Self {
        LocalWalletStorageV0 {
            bootstrap: BootstrapContent::V0(BootstrapContentV0::new()),
            wallet,
            client: client.priv_key.to_pub(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum LocalWalletStorage {
    V0(HashMap<String, LocalWalletStorageV0>),
}

impl LocalWalletStorage {
    pub fn v0_from_vec(vec: &Vec<u8>) -> Self {
        let wallets: LocalWalletStorage = serde_bare::from_slice(vec).unwrap();
        wallets
    }
    pub fn v0_to_vec(wallets: HashMap<String, LocalWalletStorageV0>) -> Vec<u8> {
        serde_bare::to_vec(&LocalWalletStorage::V0(wallets)).unwrap()
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
    pub fn id(&self) -> String {
        self.priv_key.to_pub().to_string()
    }
    #[deprecated(note = "**Don't use dummy method**")]
    pub fn dummy() -> Self {
        ClientV0 {
            priv_key: PrivKey::dummy(),
            storage_master_key: SymKey::random(),
            auto_open: vec![],
        }
    }

    pub fn new_with_auto_open(user: PubKey) -> Self {
        ClientV0 {
            priv_key: PrivKey::random_ed(),
            storage_master_key: SymKey::random(),
            auto_open: vec![Identity::IndividualSite(user)],
        }
    }

    pub fn new() -> Self {
        ClientV0 {
            priv_key: PrivKey::random_ed(),
            storage_master_key: SymKey::random(),
            auto_open: vec![],
        }
    }
}

/// Save to nextgraph.one
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum SaveToNGOne {
    No,
    Bootstrap,
    Wallet,
}

/// EncryptedWallet block Version 0
#[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize)]
pub struct EncryptedWalletV0 {
    pub wallet_privkey: PrivKey,

    #[zeroize(skip)]
    pub wallet_id: String,

    #[serde(with = "serde_bytes")]
    pub pazzle: Vec<u8>,

    pub mnemonic: [u16; 12],

    pub pin: [u8; 4],

    #[zeroize(skip)]
    pub save_to_ng_one: SaveToNGOne,

    #[zeroize(skip)]
    pub personal_site: PubKey,

    #[zeroize(skip)]
    pub personal_site_id: String,

    #[zeroize(skip)]
    pub sites: HashMap<String, SiteV0>,

    // map of brokers and their connection details
    #[zeroize(skip)]
    pub brokers: HashMap<String, Vec<BrokerInfoV0>>,

    // map of all devices of the user
    #[zeroize(skip)]
    pub clients: HashMap<String, ClientV0>,

    #[zeroize(skip)]
    pub overlay_core_overrides: HashMap<String, Vec<PubKey>>,

    /// third parties data saved in the wallet. the string (key) in the hashmap should be unique among vendors.
    /// the format of the byte array (value) is up to the vendor, to serde as needed.
    #[zeroize(skip)]
    pub third_parties: HashMap<String, Vec<u8>>,

    #[zeroize(skip)]
    pub log: Option<WalletLogV0>,

    pub master_key: Option<[u8; 32]>,
}

impl EncryptedWalletV0 {
    pub fn import(
        &mut self,
        previous_wallet: Wallet,
        session: SessionWalletStorageV0,
    ) -> Result<(Wallet, String, ClientV0), NgWalletError> {
        if self.log.is_none() {
            return Err(NgWalletError::InternalError);
        }
        // Creating a new client
        let client = ClientV0::new_with_auto_open(self.personal_site);
        self.add_client(client.clone());
        let mut log = self.log.as_mut().unwrap();
        log.add(WalletOperation::SetClientV0(client.clone()));
        let (peer_id, nonce) = session.get_first_user_peer_nonce()?;
        Ok((
            previous_wallet.encrypt(
                &WalletLog::V0(log.clone()),
                self.master_key.as_ref().unwrap(),
                peer_id,
                nonce,
                self.wallet_privkey.clone(),
            )?,
            client.id(),
            client,
        ))
    }
    pub fn add_site(&mut self, site: SiteV0) {
        let site_id = site.site_key.to_pub();
        let _ = self.sites.insert(site_id.to_string(), site);
    }
    pub fn add_brokers(&mut self, brokers: Vec<BrokerInfoV0>) {
        for broker in brokers {
            let key = broker.get_id().to_string();
            let mut list = self.brokers.get_mut(&key);
            if list.is_none() {
                let new_list = vec![];
                self.brokers.insert(key.clone(), new_list);
                list = self.brokers.get_mut(&key);
            }
            list.unwrap().push(broker);
        }
    }
    pub fn add_client(&mut self, client: ClientV0) {
        let client_id = client.priv_key.to_pub().to_string();
        let _ = self.clients.insert(client_id, client);
    }
    pub fn add_overlay_core_overrides(&mut self, overlay: &OverlayId, cores: &Vec<PubKey>) {
        let _ = self
            .overlay_core_overrides
            .insert(overlay.to_string(), cores.to_vec());
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
    pub log: Vec<(u128, WalletOperation)>,
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
    pub fn add(&mut self, op: WalletOperation) {
        match self {
            Self::V0(v0) => v0.add(op),
        }
    }
}

impl WalletLogV0 {
    pub fn new(create_op: WalletOpCreateV0) -> Self {
        let mut wallet = WalletLogV0 { log: vec![] };
        wallet.add(WalletOperation::CreateWalletV0(create_op));
        wallet
    }

    pub fn add(&mut self, op: WalletOperation) {
        let duration = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        self.log.push((duration, op));
    }

    /// applies all the operation and produces an encrypted wallet object.
    pub fn reduce(self, master_key: [u8; 32]) -> Result<EncryptedWalletV0, NgWalletError> {
        if self.log.len() < 1 {
            Err(NgWalletError::NoCreateWalletPresent)
        } else if let (_, WalletOperation::CreateWalletV0(create_op)) = &self.log[0] {
            let mut wallet: EncryptedWalletV0 = create_op.into();
            wallet.master_key = Some(master_key);

            for op in &self.log {
                match &op.1 {
                    WalletOperation::CreateWalletV0(_) => { /* intentionally left blank. this op is already reduced */
                    }
                    WalletOperation::AddSiteV0(o) => {
                        if self.is_first_and_not_deleted_afterwards(op, "RemoveSiteV0") {
                            wallet.add_site(o.clone());
                        }
                    }
                    WalletOperation::RemoveSiteV0(_) => {}
                    WalletOperation::AddBrokerServerV0(o) => {
                        if self.is_last_and_not_deleted_afterwards(op, "RemoveBrokerServerV0") {
                            wallet.add_brokers(vec![BrokerInfoV0::ServerV0(o.clone())]);
                        }
                    }
                    WalletOperation::RemoveBrokerServerV0(_) => {}
                    WalletOperation::SetSaveToNGOneV0(o) => {
                        if self.is_last_occurrence(op.0, &op.1) != 0 {
                            wallet.save_to_ng_one = o.clone();
                        }
                    }
                    WalletOperation::SetBrokerCoreV0(o) => {
                        if self.is_last_occurrence(op.0, &op.1) != 0 {
                            wallet.add_brokers(vec![BrokerInfoV0::CoreV0(o.clone())]);
                        }
                    }
                    WalletOperation::SetClientV0(o) => {
                        if self.is_last_occurrence(op.0, &op.1) != 0 {
                            wallet.add_client(o.clone());
                        }
                    }
                    WalletOperation::AddOverlayCoreOverrideV0((overlay, cores)) => {
                        if self
                            .is_last_and_not_deleted_afterwards(op, "RemoveOverlayCoreOverrideV0")
                        {
                            wallet.add_overlay_core_overrides(overlay, cores);
                        }
                    }
                    WalletOperation::RemoveOverlayCoreOverrideV0(_) => {}
                    WalletOperation::AddSiteCoreV0((site, core, registration)) => {
                        if self.is_first_and_not_deleted_afterwards(op, "RemoveSiteCoreV0") {
                            let _ = wallet.sites.get_mut(&site.to_string()).and_then(|site| {
                                site.cores.push((*core, *registration));
                                None::<SiteV0>
                            });
                        }
                    }
                    WalletOperation::RemoveSiteCoreV0(_) => {}
                    WalletOperation::AddSiteBootstrapV0((site, server)) => {
                        if self.is_first_and_not_deleted_afterwards(op, "RemoveSiteBootstrapV0") {
                            let _ = wallet.sites.get_mut(&site.to_string()).and_then(|site| {
                                site.bootstraps.push(*server);
                                None::<SiteV0>
                            });
                        }
                    }
                    WalletOperation::RemoveSiteBootstrapV0(_) => {}
                    WalletOperation::AddThirdPartyDataV0((key, value)) => {
                        if self.is_last_and_not_deleted_afterwards(op, "RemoveThirdPartyDataV0") {
                            let _ = wallet.third_parties.insert(key.to_string(), value.to_vec());
                        }
                    }
                    WalletOperation::RemoveThirdPartyDataV0(_) => {}
                    WalletOperation::SetSiteRBDRefV0((site, store_type, rbdr)) => {
                        if self.is_last_occurrence(op.0, &op.1) != 0 {
                            let _ = wallet.sites.get_mut(&site.to_string()).and_then(|site| {
                                match store_type {
                                    SiteStoreType::Public => site.public.read_cap = rbdr.clone(),
                                    SiteStoreType::Protected => {
                                        site.protected.read_cap = rbdr.clone()
                                    }
                                    SiteStoreType::Private => site.private.read_cap = rbdr.clone(),
                                };
                                None::<SiteV0>
                            });
                        }
                    }
                    WalletOperation::SetSiteRepoSecretV0((site, store_type, secret)) => {
                        if self.is_last_occurrence(op.0, &op.1) != 0 {
                            let _ = wallet.sites.get_mut(&site.to_string()).and_then(|site| {
                                match store_type {
                                    SiteStoreType::Public => site.public.write_cap = secret.clone(),
                                    SiteStoreType::Protected => {
                                        site.protected.write_cap = secret.clone()
                                    }
                                    SiteStoreType::Private => {
                                        site.private.write_cap = secret.clone()
                                    }
                                };
                                None::<SiteV0>
                            });
                        }
                    }
                }
            }
            log_debug!("reduced {:?}", wallet);
            wallet.log = Some(self);
            Ok(wallet)
        } else {
            Err(NgWalletError::NoCreateWalletPresent)
        }
    }

    pub fn is_first_and_not_deleted_afterwards(
        &self,
        item: &(u128, WalletOperation),
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
        item: &(u128, WalletOperation),
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

    pub fn is_first_occurrence(&self, timestamp: u128, searched_op: &WalletOperation) -> u64 {
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

    pub fn is_last_occurrence(&self, timestamp: u128, searched_op: &WalletOperation) -> u64 {
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
    ) -> Option<(u128, &WalletOperation)> {
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
pub enum WalletOperation {
    CreateWalletV0(WalletOpCreateV0),
    AddSiteV0(SiteV0),
    RemoveSiteV0(PrivKey),
    AddBrokerServerV0(BrokerServerV0),
    RemoveBrokerServerV0(BrokerServerV0),
    SetSaveToNGOneV0(SaveToNGOne),
    SetBrokerCoreV0(BrokerCoreV0),
    SetClientV0(ClientV0),
    AddOverlayCoreOverrideV0((OverlayId, Vec<PubKey>)),
    RemoveOverlayCoreOverrideV0(OverlayId),
    AddSiteCoreV0((PubKey, PubKey, Option<[u8; 32]>)),
    RemoveSiteCoreV0((PubKey, PubKey)),
    AddSiteBootstrapV0((PubKey, PubKey)),
    RemoveSiteBootstrapV0((PubKey, PubKey)),
    AddThirdPartyDataV0((String, Vec<u8>)),
    RemoveThirdPartyDataV0(String),
    SetSiteRBDRefV0((PubKey, SiteStoreType, ObjectRef)),
    SetSiteRepoSecretV0((PubKey, SiteStoreType, RepoWriteCapSecret)),
}
use std::collections::hash_map::DefaultHasher;

impl WalletOperation {
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
            Self::SetSaveToNGOneV0(t) => (0, "SetSaveToNGOneV0"),
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
    pub save_to_ng_one: SaveToNGOne,

    #[zeroize(skip)]
    pub personal_site: SiteV0,

    // list of brokers and their connection details
    //#[zeroize(skip)]
    //pub brokers: Vec<BrokerInfoV0>,
    #[zeroize(skip)]
    pub client: ClientV0,
}

impl From<&WalletOpCreateV0> for EncryptedWalletV0 {
    fn from(op: &WalletOpCreateV0) -> Self {
        let personal_site = op.personal_site.site_key.to_pub();
        let mut wallet = EncryptedWalletV0 {
            wallet_privkey: op.wallet_privkey.clone(),
            wallet_id: op.wallet_privkey.to_pub().to_string(),
            pazzle: op.pazzle.clone(),
            mnemonic: op.mnemonic.clone(),
            pin: op.pin.clone(),
            save_to_ng_one: op.save_to_ng_one.clone(),
            personal_site,
            personal_site_id: personal_site.to_string(),
            sites: HashMap::new(),
            brokers: HashMap::new(),
            clients: HashMap::new(),
            overlay_core_overrides: HashMap::new(),
            third_parties: HashMap::new(),
            log: None,
            master_key: None,
        };
        wallet.add_site(op.personal_site.clone());
        //wallet.add_brokers(op.brokers.clone());
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
    pub save_to_ng_one: SaveToNGOne,

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
    pub send_bootstrap: bool,
    #[zeroize(skip)]
    pub send_wallet: bool,
    #[zeroize(skip)]
    pub result_with_wallet_file: bool,
    #[zeroize(skip)]
    pub local_save: bool,
    #[zeroize(skip)]
    pub core_bootstrap: BootstrapContentV0,
    #[zeroize(skip)]
    pub core_registration: Option<[u8; 32]>,
    #[zeroize(skip)]
    pub additional_bootstrap: Option<BootstrapContentV0>,
}

impl CreateWalletV0 {
    pub fn new(
        security_img: Vec<u8>,
        security_txt: String,
        pin: [u8; 4],
        pazzle_length: u8,
        send_bootstrap: bool,
        send_wallet: bool,
        core_bootstrap: BootstrapContentV0,
        core_registration: Option<[u8; 32]>,
        additional_bootstrap: Option<BootstrapContentV0>,
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
            core_bootstrap,
            core_registration,
            additional_bootstrap,
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
    #[zeroize(skip)]
    pub peer_id: PubKey,
    pub peer_key: PrivKey,
    #[zeroize(skip)]
    pub nonce: u64,
    #[zeroize(skip)]
    pub client: ClientV0,
    #[zeroize(skip)]
    pub user: PubKey,
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
    InvalidBootstrap,
    SerializationError,
}

impl fmt::Display for NgWalletError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum NgFileV0 {
    Wallet(Wallet),
    Other,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum NgFile {
    V0(NgFileV0),
}

impl TryFrom<Vec<u8>> for NgFile {
    type Error = NgError;
    fn try_from(file: Vec<u8>) -> Result<Self, Self::Error> {
        let ngf: Self = serde_bare::from_slice(&file).map_err(|_| NgError::InvalidFileFormat)?;
        Ok(ngf)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ShuffledPazzle {
    pub category_indices: Vec<u8>,
    pub emoji_indices: Vec<Vec<u8>>,
}
