// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use serde::{Deserialize, Serialize};
use serde_big_array::BigArray;
use std::collections::hash_map::{DefaultHasher, Keys};
use std::hash::{Hash, Hasher};
use std::{collections::HashMap, fmt};
use web_time::SystemTime;
use zeroize::{Zeroize, ZeroizeOnDrop};

use ng_repo::errors::NgError;
#[allow(unused_imports)]
use ng_repo::log::*;
use ng_repo::types::*;
use ng_repo::utils::{encrypt_in_place, generate_keypair};

use ng_net::types::*;

use ng_verifier::site::SiteV0;

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
    pub fn dec_session(
        wallet_key: PrivKey,
        vec: &Vec<u8>,
    ) -> Result<SessionWalletStorageV0, NgWalletError> {
        let session_ser = crypto_box::seal_open(&(*wallet_key.to_dh().slice()).into(), vec)
            .map_err(|_| NgWalletError::DecryptionError)?;
        let session: SessionWalletStorage =
            serde_bare::from_slice(&session_ser).map_err(|_| NgWalletError::SerializationError)?;
        let SessionWalletStorage::V0(v0) = session;
        Ok(v0)
    }

    pub fn create_new_session(
        wallet_id: &PubKey,
        user: PubKey,
    ) -> Result<(SessionPeerStorageV0, Vec<u8>), NgWalletError> {
        let mut sws = SessionWalletStorageV0::new();
        let sps = SessionPeerStorageV0::new(user);
        sws.users.insert(sps.user.to_string(), sps.clone());
        let cipher = sws.enc_session(wallet_id)?;
        Ok((sps, cipher))
    }

    pub fn enc_session(&self, wallet_id: &PubKey) -> Result<Vec<u8>, NgWalletError> {
        let sws_ser = serde_bare::to_vec(&SessionWalletStorage::V0(self.clone())).unwrap();
        let mut rng = crypto_box::aead::OsRng {};
        let cipher = crypto_box::seal(&mut rng, &wallet_id.to_dh_slice().into(), &sws_ser)
            .map_err(|_| NgWalletError::EncryptionError)?;
        Ok(cipher)
    }

    // pub fn get_first_user_peer_nonce(&self) -> Result<(PubKey, u64), NgWalletError> {
    //     if self.users.len() > 1 {
    //         panic!("get_first_user_peer_nonce does not work as soon as there are more than one user in SessionWalletStorageV0")
    //     };
    //     let first = self.users.values().next();
    //     if first.is_none() {
    //         return Err(NgWalletError::InternalError);
    //     }
    //     let sps = first.unwrap();
    //     Ok((sps.peer_key.to_pub(), sps.last_wallet_nonce))
    // }
}

#[derive(Serialize, Deserialize)]
pub struct SessionInfoString {
    pub session_id: u64,
    pub user: String,
    pub private_store_id: String,
}

impl From<SessionInfo> for SessionInfoString {
    fn from(f: SessionInfo) -> Self {
        SessionInfoString {
            session_id: f.session_id,
            private_store_id: f.private_store_id,
            user: f.user.to_string(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SessionInfo {
    pub session_id: u64,
    pub user: UserId,
    pub private_store_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SessionPeerStorageV0 {
    pub user: UserId,
    pub peer_key: PrivKey,
    /// The current nonce used for encrypting this wallet by the user on this device.
    /// It should be incremented BEFORE encrypting the wallet again
    /// when some new operations have been added to the log of the Wallet.
    /// The nonce is by PeerId. It is saved together with the PeerId in the SessionPeerStorage.
    /// If the session is not saved (in-memory) it is lost, but it is fine, as the PeerId is also lost, and a new one
    /// will be generated for the next session.
    pub last_wallet_nonce: u64,
}

impl SessionPeerStorageV0 {
    pub fn new(user: UserId) -> Self {
        let peer = generate_keypair();
        SessionPeerStorageV0 {
            user,
            peer_key: peer.0,
            last_wallet_nonce: 0,
        }
    }
}

#[derive(Clone, Debug, Zeroize, ZeroizeOnDrop, Serialize, Deserialize)]
pub struct LocalClientStorageV0 {
    pub priv_key: PrivKey,
    pub storage_master_key: SymKey,
}

impl LocalClientStorageV0 {
    fn crypt(text: &mut Vec<u8>, client: ClientId, wallet_privkey: PrivKey) {
        let client_ser = serde_bare::to_vec(&client).unwrap();
        let wallet_privkey_ser = serde_bare::to_vec(&wallet_privkey).unwrap();
        let mut key_material = [client_ser, wallet_privkey_ser].concat();

        let mut key: [u8; 32] = blake3::derive_key(
            "NextGraph LocalClientStorageV0 BLAKE3 key",
            key_material.as_slice(),
        );

        encrypt_in_place(text, key, [0; 12]);
        key.zeroize();
        key_material.zeroize();
    }

    pub fn decrypt(
        ciphertext: &mut Vec<u8>,
        client: ClientId,
        wallet_privkey: PrivKey,
    ) -> Result<LocalClientStorageV0, NgWalletError> {
        Self::crypt(ciphertext, client, wallet_privkey);

        let res =
            serde_bare::from_slice(&ciphertext).map_err(|_| NgWalletError::DecryptionError)?;

        ciphertext.zeroize();

        Ok(res)
    }

    pub fn encrypt(
        &self,
        client: ClientId,
        wallet_privkey: PrivKey,
    ) -> Result<Vec<u8>, NgWalletError> {
        let mut ser = serde_bare::to_vec(self).map_err(|_| NgWalletError::EncryptionError)?;

        Self::crypt(&mut ser, client, wallet_privkey);

        Ok(ser)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LocalWalletStorageV0 {
    pub in_memory: bool,
    pub bootstrap: BootstrapContent,
    pub wallet: Wallet,
    pub client_id: ClientId,
    pub client_auto_open: Vec<PubKey>,
    pub client_name: Option<String>,
    #[serde(with = "serde_bytes")]
    pub encrypted_client_storage: Vec<u8>,
}

impl From<&CreateWalletIntermediaryV0> for LocalWalletStorageV0 {
    fn from(res: &CreateWalletIntermediaryV0) -> Self {
        LocalWalletStorageV0 {
            bootstrap: BootstrapContent::V0(BootstrapContentV0::new_empty()),
            wallet: Wallet::TemporarilyEmpty,
            in_memory: res.in_memory,
            client_id: res.client.id,
            client_auto_open: res.client.auto_open.clone(),
            client_name: res.client.name.clone(),
            encrypted_client_storage: res
                .client
                .sensitive_client_storage
                .encrypt(res.client.id, res.wallet_privkey.clone())
                .unwrap(),
        }
    }
}

impl From<&CreateWalletIntermediaryV0> for SensitiveWalletV0 {
    fn from(res: &CreateWalletIntermediaryV0) -> Self {
        SensitiveWalletV0 {
            wallet_privkey: res.wallet_privkey.clone(),
            wallet_id: res.wallet_name.clone(),
            save_to_ng_one: if res.send_wallet {
                SaveToNGOne::Wallet
            } else if res.send_bootstrap {
                SaveToNGOne::Bootstrap
            } else {
                SaveToNGOne::No
            },
            // for now, personal_site is null. will be replaced later
            personal_site: PubKey::nil(),
            personal_site_id: "".to_string(),
            sites: HashMap::new(),
            brokers: HashMap::new(),
            overlay_core_overrides: HashMap::new(),
            third_parties: HashMap::new(),
            log: None,
            master_key: None,
            client: None,
        }
    }
}

impl From<&CreateWalletIntermediaryV0> for SensitiveWallet {
    fn from(res: &CreateWalletIntermediaryV0) -> SensitiveWallet {
        SensitiveWallet::V0(res.into())
    }
}

impl LocalWalletStorageV0 {
    #[doc(hidden)]
    pub fn new(
        encrypted_wallet: Wallet,
        wallet_priv_key: PrivKey,
        client: &ClientV0,
        in_memory: bool,
    ) -> Result<Self, NgWalletError> {
        Ok(LocalWalletStorageV0 {
            bootstrap: BootstrapContent::V0(BootstrapContentV0::new_empty()),
            wallet: encrypted_wallet,
            in_memory,
            client_id: client.id,
            client_auto_open: client.auto_open.clone(),
            client_name: client.name.clone(),
            encrypted_client_storage: client
                .sensitive_client_storage
                .encrypt(client.id, wallet_priv_key)?,
        })
    }
    #[doc(hidden)]
    pub fn to_client_v0(&self, wallet_privkey: PrivKey) -> Result<ClientV0, NgWalletError> {
        Ok(ClientV0 {
            id: self.client_id,
            auto_open: self.client_auto_open.clone(),
            name: self.client_name.clone(),
            sensitive_client_storage: self.local_client_storage_v0(wallet_privkey)?,
        })
    }

    /// decrypts the client_storage field, given the wallet PrivKey
    pub fn local_client_storage_v0(
        &self,
        wallet_privkey: PrivKey,
    ) -> Result<LocalClientStorageV0, NgWalletError> {
        let mut cipher = self.encrypted_client_storage.clone();
        LocalClientStorageV0::decrypt(&mut cipher, self.client_id, wallet_privkey)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum LocalWalletStorage {
    V0(HashMap<String, LocalWalletStorageV0>),
}

impl LocalWalletStorage {
    pub fn v0_from_vec(vec: &Vec<u8>) -> Result<Self, NgError> {
        let wallets: LocalWalletStorage = serde_bare::from_slice(vec)?;
        Ok(wallets)
    }
    pub fn v0_to_vec(wallets: &HashMap<String, LocalWalletStorageV0>) -> Vec<u8> {
        serde_bare::to_vec(&LocalWalletStorage::V0(wallets.clone())).unwrap()
    }
}

/// Device info Version 0
#[derive(Clone, Debug, Zeroize, ZeroizeOnDrop, Serialize, Deserialize)]
pub struct ClientV0 {
    #[zeroize(skip)]
    /// ClientID
    pub id: PubKey,

    /// list of users that should be opened automatically (at launch, after wallet opened) on this device
    #[zeroize(skip)]
    pub auto_open: Vec<PubKey>,

    /// user supplied Device name. can be useful to distinguish between several devices (phone, tablet, laptop, office desktop, etc...)
    #[zeroize(skip)]
    pub name: Option<String>,

    /// contains the decrypted information needed when user is opening their wallet on this client.
    pub sensitive_client_storage: LocalClientStorageV0,
}

impl ClientV0 {
    pub fn id(&self) -> String {
        self.id.to_string()
    }

    #[deprecated(note = "**Don't use nil method**")]
    #[allow(deprecated)]
    pub fn nil() -> Self {
        ClientV0 {
            id: PubKey::nil(),
            sensitive_client_storage: LocalClientStorageV0 {
                priv_key: PrivKey::nil(),
                storage_master_key: SymKey::nil(),
            },
            auto_open: vec![],
            name: None,
        }
    }

    #[cfg(test)]
    #[allow(deprecated)]
    pub fn dummy() -> Self {
        Self::nil()
    }

    pub fn new_with_auto_open(user: PubKey) -> Self {
        let (priv_key, id) = generate_keypair();
        ClientV0 {
            id,
            sensitive_client_storage: LocalClientStorageV0 {
                priv_key,
                storage_master_key: SymKey::random(),
            },
            auto_open: vec![user],
            name: None,
        }
    }

    pub fn new() -> Self {
        let (priv_key, id) = generate_keypair();
        ClientV0 {
            id,
            sensitive_client_storage: LocalClientStorageV0 {
                priv_key,
                storage_master_key: SymKey::random(),
            },
            auto_open: vec![],
            name: None,
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

/// SensitiveWallet block Version 0
#[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize)]
pub struct SensitiveWalletV0 {
    pub wallet_privkey: PrivKey,

    #[zeroize(skip)]
    pub wallet_id: String,

    //#[serde(with = "serde_bytes")]
    //pub pazzle: Vec<u8>,

    //pub mnemonic: [u16; 12],

    //pub pin: [u8; 4],
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
    //#[zeroize(skip)]
    //pub clients: HashMap<String, ClientV0>,
    #[zeroize(skip)]
    pub overlay_core_overrides: HashMap<String, Vec<PubKey>>,

    /// third parties data saved in the wallet. the string (key) in the hashmap should be unique among vendors.
    /// the format of the byte array (value) is up to the vendor, to serde as needed.
    #[zeroize(skip)]
    pub third_parties: HashMap<String, serde_bytes::ByteBuf>,

    #[zeroize(skip)]
    pub log: Option<WalletLogV0>,

    pub master_key: Option<[u8; 32]>,

    pub client: Option<ClientV0>,
}

/// SensitiveWallet block
#[derive(Clone, Debug, Zeroize, ZeroizeOnDrop, Serialize, Deserialize)]
pub enum SensitiveWallet {
    V0(SensitiveWalletV0),
}

impl SensitiveWallet {
    pub fn privkey(&self) -> PrivKey {
        match self {
            Self::V0(v0) => v0.wallet_privkey.clone(),
        }
    }
    pub fn id(&self) -> String {
        match self {
            Self::V0(v0) => v0.wallet_id.clone(),
        }
    }
    // TODO: this is unfortunate. id should return the PubKey, name should return the String
    pub fn name(&self) -> String {
        self.id()
    }
    pub fn client(&self) -> &Option<ClientV0> {
        match self {
            Self::V0(v0) => &v0.client,
        }
    }
    pub fn site_names(&self) -> Keys<String, SiteV0> {
        match self {
            Self::V0(v0) => v0.sites.keys(),
        }
    }
    pub fn site(&self, user_id: &UserId) -> Result<&SiteV0, NgError> {
        match self {
            Self::V0(v0) => match v0.sites.get(&user_id.to_string()) {
                Some(site) => Ok(site),
                None => Err(NgError::UserNotFound),
            },
        }
    }
    pub fn set_client(&mut self, client: ClientV0) {
        match self {
            Self::V0(v0) => v0.client = Some(client),
        }
    }
    pub fn individual_site(
        &self,
        user_id: &UserId,
    ) -> Option<(
        PrivKey,
        Option<ReadCap>,
        Option<RepoId>,
        Option<RepoId>,
        Option<RepoId>,
    )> {
        match self {
            Self::V0(v0) => match v0.sites.get(&user_id.to_string()) {
                Some(site) => match &site.site_type {
                    SiteType::Individual((user, readcap)) => Some((
                        user.clone(),
                        Some(readcap.clone()),
                        Some(site.private.id),
                        Some(site.protected.id),
                        Some(site.public.id),
                    )),
                    _ => None,
                },
                None => None,
            },
        }
    }
    pub fn has_user(&self, user_id: &UserId) -> bool {
        match self {
            Self::V0(v0) => v0.sites.get(&user_id.to_string()).is_some(),
        }
    }
    pub fn personal_identity(&self) -> UserId {
        match self {
            Self::V0(v0) => v0.personal_site,
        }
    }
    pub fn import_v0(
        &mut self,
        encrypted_wallet: Wallet,
        in_memory: bool,
    ) -> Result<LocalWalletStorageV0, NgWalletError> {
        match self {
            Self::V0(v0) => v0.import(encrypted_wallet, in_memory),
        }
    }

    pub fn complete_with_site_and_brokers(
        &mut self,
        site: SiteV0,
        brokers: HashMap<String, Vec<BrokerInfoV0>>,
    ) {
        match self {
            Self::V0(v0) => v0.complete_with_site_and_brokers(site, brokers),
        }
    }
}

impl SensitiveWalletV0 {
    pub fn import(
        &mut self,
        encrypted_wallet: Wallet,
        in_memory: bool,
    ) -> Result<LocalWalletStorageV0, NgWalletError> {
        // Creating a new client
        // TODO, create client with auto_open taken from wallet log ?
        let client = ClientV0::new_with_auto_open(self.personal_site);

        let lws = LocalWalletStorageV0::new(
            encrypted_wallet,
            self.wallet_privkey.clone(),
            &client,
            in_memory,
        )?;

        self.client = Some(client);

        Ok(lws)
    }
    pub fn add_site(&mut self, site: SiteV0) {
        let site_id = site.id;
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
    // pub fn add_client(&mut self, client: ClientV0) {
    //     let client_id = client.priv_key.to_pub().to_string();
    //     let _ = self.clients.insert(client_id, client);
    // }
    pub fn add_overlay_core_overrides(&mut self, overlay: &OverlayId, cores: &Vec<PubKey>) {
        let _ = self
            .overlay_core_overrides
            .insert(overlay.to_string(), cores.to_vec());
    }

    pub fn complete_with_site_and_brokers(
        &mut self,
        site: SiteV0,
        brokers: HashMap<String, Vec<BrokerInfoV0>>,
    ) {
        let personal_site = site.id;
        let personal_site_id = personal_site.to_string();
        self.personal_site = personal_site;
        self.personal_site_id = personal_site_id.clone();
        self.sites.insert(personal_site_id, site);
        self.brokers = brokers;
    }
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
    pub fn reduce(self, master_key: [u8; 32]) -> Result<SensitiveWalletV0, NgWalletError> {
        if self.log.len() < 1 {
            Err(NgWalletError::NoCreateWalletPresent)
        } else if let (_, WalletOperation::CreateWalletV0(create_op)) = &self.log[0] {
            let mut wallet: SensitiveWalletV0 = create_op.into();
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
                    // WalletOperation::SetClientV0(o) => {
                    //     if self.is_last_occurrence(op.0, &op.1) != 0 {
                    //         wallet.add_client(o.clone());
                    //     }
                    // }
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
                            let _ = wallet.third_parties.insert(key.to_string(), value.clone());
                        }
                    }
                    WalletOperation::RemoveThirdPartyDataV0(_) => {} // WalletOperation::SetSiteRBDRefV0((site, store_type, rbdr)) => {
                                                                     //     if self.is_last_occurrence(op.0, &op.1) != 0 {
                                                                     //         let _ = wallet.sites.get_mut(&site.to_string()).and_then(|site| {
                                                                     //             match store_type {
                                                                     //                 SiteStoreType::Public => site.public.read_cap = rbdr.clone(),
                                                                     //                 SiteStoreType::Protected => {
                                                                     //                     site.protected.read_cap = rbdr.clone()
                                                                     //                 }
                                                                     //                 SiteStoreType::Private => site.private.read_cap = rbdr.clone(),
                                                                     //             };
                                                                     //             None::<SiteV0>
                                                                     //         });
                                                                     //     }
                                                                     // }
                                                                     // WalletOperation::SetSiteRepoSecretV0((site, store_type, secret)) => {
                                                                     //     if self.is_last_occurrence(op.0, &op.1) != 0 {
                                                                     //         let _ = wallet.sites.get_mut(&site.to_string()).and_then(|site| {
                                                                     //             match store_type {
                                                                     //                 SiteStoreType::Public => site.public.write_cap = secret.clone(),
                                                                     //                 SiteStoreType::Protected => {
                                                                     //                     site.protected.write_cap = secret.clone()
                                                                     //                 }
                                                                     //                 SiteStoreType::Private => {
                                                                     //                     site.private.write_cap = secret.clone()
                                                                     //                 }
                                                                     //             };
                                                                     //             None::<SiteV0>
                                                                     //         });
                                                                     //     }
                                                                     // }
                }
            }
            //log_debug!("reduced {:?}", wallet);
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
    //SetClientV0(ClientV0),
    AddOverlayCoreOverrideV0((OverlayId, Vec<PubKey>)),
    RemoveOverlayCoreOverrideV0(OverlayId),
    AddSiteCoreV0((PubKey, PubKey, Option<[u8; 32]>)),
    RemoveSiteCoreV0((PubKey, PubKey)),
    AddSiteBootstrapV0((PubKey, PubKey)),
    RemoveSiteBootstrapV0((PubKey, PubKey)),
    AddThirdPartyDataV0((String, serde_bytes::ByteBuf)),
    RemoveThirdPartyDataV0(String),
    //SetSiteRBDRefV0((PubKey, SiteStoreType, ObjectRef)),
    //SetSiteRepoSecretV0((PubKey, SiteStoreType, RepoWriteCapSecret)),
}

impl WalletOperation {
    pub fn hash(&self) -> (u64, &str) {
        let mut s = DefaultHasher::new();
        match self {
            Self::CreateWalletV0(_t) => (0, "CreateWalletV0"),
            Self::AddSiteV0(t) => {
                t.id.hash(&mut s);
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
            Self::SetSaveToNGOneV0(_t) => (0, "SetSaveToNGOneV0"),
            Self::SetBrokerCoreV0(t) => {
                t.peer_id.hash(&mut s);
                (s.finish(), "SetBrokerCoreV0")
            }
            // Self::SetClientV0(t) => {
            //     t.priv_key.hash(&mut s);
            //     (s.finish(), "SetClientV0")
            // }
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
            } // Self::SetSiteRBDRefV0(t) => {
              //     t.0.hash(&mut s);
              //     t.1.hash(&mut s);
              //     (s.finish(), "SetSiteRBDRefV0")
              // }
              // Self::SetSiteRepoSecretV0(t) => {
              //     t.0.hash(&mut s);
              //     t.1.hash(&mut s);
              //     (s.finish(), "SetSiteRepoSecretV0")
              // }
        }
    }
}

/// WalletOp Create V0
/// first operation in the log
/// also serialized and encoded in Rescue QRcode
#[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize)]
pub struct WalletOpCreateV0 {
    pub wallet_privkey: PrivKey,

    // #[serde(skip)]
    // pub pazzle: Vec<u8>,

    // #[serde(skip)]
    // pub mnemonic: [u16; 12],

    // #[serde(skip)]
    // pub pin: [u8; 4],
    #[zeroize(skip)]
    pub save_to_ng_one: SaveToNGOne,

    #[zeroize(skip)]
    pub personal_site: SiteV0,
    // list of brokers and their connection details
    //#[zeroize(skip)]
    //pub brokers: Vec<BrokerInfoV0>,
    //#[serde(skip)]
    //pub client: ClientV0,
}

impl From<&WalletOpCreateV0> for SensitiveWalletV0 {
    fn from(op: &WalletOpCreateV0) -> Self {
        let personal_site = op.personal_site.id;
        let mut wallet = SensitiveWalletV0 {
            wallet_privkey: op.wallet_privkey.clone(),
            wallet_id: op.wallet_privkey.to_pub().to_string(),
            //pazzle: op.pazzle.clone(),
            //mnemonic: op.mnemonic.clone(),
            //pin: op.pin.clone(),
            save_to_ng_one: op.save_to_ng_one.clone(),
            personal_site,
            personal_site_id: personal_site.to_string(),
            sites: HashMap::new(),
            brokers: HashMap::new(),
            //clients: HashMap::new(),
            overlay_core_overrides: HashMap::new(),
            third_parties: HashMap::new(),
            log: None,
            master_key: None,
            client: None, //Some(op.client.clone()),
        };
        wallet.add_site(op.personal_site.clone());
        //wallet.add_brokers(op.brokers.clone());
        //wallet.add_client(op.client.clone());
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

    // ReducedSensitiveWalletV0 content encrypted with XChaCha20Poly1305, AD = timestamp and walletID
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

/// ReducedSensitiveWallet block Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReducedSensitiveWalletV0 {
    pub save_to_ng_one: SaveToNGOne,

    // main Site (Personal)
    pub personal_site: ReducedSiteV0,

    // list of brokers and their connection details
    pub brokers: Vec<BrokerInfoV0>,

    pub client: ClientV0,
}

/// ReducedSensitiveWallet block
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ReducedSensitiveWallet {
    V0(ReducedSensitiveWalletV0),
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
    TemporarilyEmpty,
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

/// Create Wallet Version 0, used by the API create_wallet_v0 as a list of arguments
#[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize)]
pub struct CreateWalletV0 {
    /// a vector containing the binary content of an image file that will be used at every login, displayed (on devices that can)
    /// to the user so they can check the wallet is theirs and that entering their pazzle and PIN is safe and there is no phishing attack.
    /// an attacker would redirect the user to a clone of the wallet opener app, and would try to steal what the user enters
    /// but this attacker would not possess the security_img of the user as it is only present locally in the wallet file.
    /// the image should be bigger than 150x150px. There is no need to provide more than 400x400px as it will be scaled down anyway.
    /// We accept several formats like JPEG, PNG, GIF, WEBP and more.
    /// The image should be unique to the user. But it should not be too personal neither. Do not upload face picture, this is not a profile pic.
    /// The best would be any picture that the user recognizes as unique.
    /// Please be aware that other users who are sharing the same device, will be able to see this image.
    #[zeroize(skip)]
    #[serde(with = "serde_bytes")]
    pub security_img: Vec<u8>,
    /// A string of characters of minimum length 10.
    /// This phrase will be presented to the user every time they are about to enter their pazzle and PIN in order to unlock their wallet.
    /// It should be something the user will remember, but not something too personal.
    /// Do not enter full name, nor address, nor phone number.
    /// Instead, the user can enter a quote, a small phrase that they like, or something meaningless to others, but unique to them.
    /// Please be aware that other users who are sharing the same device, will be able to see this phrase.
    pub security_txt: String,
    /// chose a PIN code.
    /// We recommend the user to choose a PIN code they already know very well (unlock phone, credit card).
    /// The PIN and the rest of the Wallet will never be sent to NextGraph or any other third party (check the source code if you don't believe us).
    /// It cannot be a series like 1234 or 8765. The same digit cannot repeat more than once. By example 4484 is invalid.
    /// Try to avoid birth date, last digits of phone number, or zip code for privacy concern
    pub pin: [u8; 4],
    /// For now, only 9 is supported. 12 and 15 are planned.
    /// A value of 0 will deactivate the pazzle mechanism on this Wallet, and only the mnemonic could be used to open it.
    pub pazzle_length: u8,
    #[zeroize(skip)]
    /// Not implemented yet. Will send the bootstrap to our cloud servers, if needed
    pub send_bootstrap: bool,
    #[zeroize(skip)]
    /// Not implemented yet. Will send an encrypted Wallet file to our cloud servers, if needed. (and no, it does not contain the user's pazzle nor PIN)
    pub send_wallet: bool,
    #[zeroize(skip)]
    /// Do you want a binary file containing the whole Wallet ?
    pub result_with_wallet_file: bool,
    #[zeroize(skip)]
    /// Should the wallet be saved locally on disk, by the LocalBroker. It will not work on a in-memory LocalBroker, obviously.
    pub local_save: bool,
    #[zeroize(skip)]
    /// What Broker Server to contact when there is internet and we want to sync.
    pub core_bootstrap: BootstrapContentV0,
    #[zeroize(skip)]
    /// What is the registration code at that Broker Server. Only useful the first time you connect to the Server.
    /// Can be None the rest of the time, or if your server does not need an Invitation.
    pub core_registration: Option<[u8; 32]>,
    #[zeroize(skip)]
    /// Bootstrap of another server that you might use in order to connect to NextGraph network. It can be another interface on the same `core` server.
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

// #[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize)]
// pub struct WalletCreationSiteEventsV0 {
//     store_id: RepoId,
//     store_read_cap: ReadCap,
//     topic_id: TopicId,
//     topic_priv_key: BranchWriteCapSecret,
//     events: Vec<(Commit, Vec<Digest>)>,
// }

// #[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize)]
// pub struct WalletCreationEventsV0 {}

#[derive(Clone, Zeroize, ZeroizeOnDrop, Debug, Serialize, Deserialize)]
pub struct CreateWalletResultV0 {
    #[zeroize(skip)]
    /// The encrypted form of the Wallet object that was created.
    /// basically the same as what the file contains.
    pub wallet: Wallet,
    // #[serde(skip)]
    // /// The private key of the Wallet. Used for signing the wallet and other internal purposes.
    // /// it is contained in the opened wallet. No need to save it anywhere.
    // pub wallet_privkey: PrivKey,
    #[serde(with = "serde_bytes")]
    #[zeroize(skip)]
    /// The binary file that can be saved to disk and given to the user
    pub wallet_file: Vec<u8>,
    /// randomly generated pazzle
    pub pazzle: Vec<u8>,
    /// randomly generated mnemonic. It is an alternate way to open the wallet.
    /// A BIP39 list of 12 words. We argue that the Pazzle is easier to remember than this.
    pub mnemonic: [u16; 12],
    /// The words of the mnemonic, in a human readable form.
    pub mnemonic_str: Vec<String>,
    #[zeroize(skip)]
    /// a string identifying uniquely the wallet
    pub wallet_name: String,
    /// newly created Client that uniquely identifies the device where the wallet has been created.
    pub client: ClientV0,
    #[zeroize(skip)]
    /// UserId of the "personal identity" of the user
    pub user: PubKey,
    #[zeroize(skip)]
    /// is this an in_memory wallet that should not be saved to disk by the LocalBroker?
    pub in_memory: bool,

    pub session_id: u64,
}

impl CreateWalletResultV0 {
    pub fn personal_identity(&self) -> UserId {
        self.user
    }
}

#[derive(Clone, Zeroize, ZeroizeOnDrop, Debug)]
pub struct CreateWalletIntermediaryV0 {
    /// The private key of the Wallet. Used for signing the wallet and other internal purposes.
    /// it is contained in the opened wallet. No need to save it anywhere.
    pub wallet_privkey: PrivKey,
    #[zeroize(skip)]
    /// a string identifying uniquely the wallet
    pub wallet_name: String,
    /// newly created Client that uniquely identifies the device where the wallet has been created.
    pub client: ClientV0,

    /// User priv key of the "personal identity" of the user
    pub user_privkey: PrivKey,
    #[zeroize(skip)]
    /// is this an in_memory wallet that should not be saved to disk by the LocalBroker?
    pub in_memory: bool,

    #[zeroize(skip)]
    pub security_img: Vec<u8>,

    pub security_txt: String,

    pub pazzle_length: u8,

    pub pin: [u8; 4],

    #[zeroize(skip)]
    pub send_bootstrap: bool,
    #[zeroize(skip)]
    pub send_wallet: bool,
    #[zeroize(skip)]
    pub result_with_wallet_file: bool,
    #[zeroize(skip)]
    pub core_bootstrap: BootstrapContentV0,
    pub core_registration: Option<[u8; 32]>,
    #[zeroize(skip)]
    pub additional_bootstrap: Option<BootstrapContentV0>,
}

#[derive(Debug, Eq, PartialEq, Clone)]
pub enum NgWalletError {
    InvalidPin,
    InvalidPazzle,
    InvalidPazzleLength,
    InvalidMnemonic,
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

impl From<NgWalletError> for NgError {
    fn from(wallet_error: NgWalletError) -> NgError {
        match wallet_error {
            NgWalletError::SerializationError => NgError::SerializationError,
            NgWalletError::InvalidSignature => NgError::InvalidSignature,
            NgWalletError::EncryptionError | NgWalletError::DecryptionError => {
                NgError::EncryptionError
            }
            _ => NgError::WalletError(wallet_error.to_string()),
        }
    }
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
