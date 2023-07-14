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

//! P2P network protocol types
//!
//! Corresponds to the BARE schema

use crate::utils::{
    get_domain_without_port, get_domain_without_port_443, is_ipv4_private, is_ipv6_private,
    is_private_ip, is_public_ip, is_public_ipv4, is_public_ipv6,
};
use crate::{actor::EActor, actors::*, errors::ProtocolError};
use core::fmt;
use p2p_repo::errors::NgError;
use p2p_repo::types::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::{
    any::{Any, TypeId},
    net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr},
};
use web_time::SystemTime;

//
//  Broker common types
//

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum InterfaceType {
    Loopback,
    Private,
    Public,
    Invalid,
}

impl InterfaceType {
    pub fn is_ip_valid_for_type(&self, ip: &IP) -> bool {
        self.is_ipaddr_valid_for_type(&ip.into())
    }
    pub fn is_ipaddr_valid_for_type(&self, ip: &IpAddr) -> bool {
        match ip {
            IpAddr::V4(v4) => self.is_ipv4_valid_for_type(v4),
            IpAddr::V6(v6) => self.is_ipv6_valid_for_type(v6),
        }
    }

    pub fn is_ipv4_valid_for_type(&self, ip: &Ipv4Addr) -> bool {
        match self {
            InterfaceType::Loopback => ip.is_loopback(),
            InterfaceType::Public => is_public_ipv4(ip),
            // we allow to bind to link-local for IPv4
            InterfaceType::Private => is_ipv4_private(ip),
            _ => false,
        }
    }
    pub fn is_ipv6_valid_for_type(&self, ip: &Ipv6Addr) -> bool {
        match self {
            InterfaceType::Loopback => ip.is_loopback(),
            InterfaceType::Public => is_public_ipv6(ip),
            // we do NOT allow to bind to link-local for IPv6
            InterfaceType::Private => is_ipv6_private(ip),
            _ => false,
        }
    }
}

#[cfg(not(target_arch = "wasm32"))]
#[derive(Clone, Debug)]
pub struct Interface {
    pub if_type: InterfaceType,
    pub name: String,
    pub mac_addr: Option<default_net::interface::MacAddr>,
    /// List of Ipv4Net for the network interface
    pub ipv4: Vec<default_net::ip::Ipv4Net>,
    /// List of Ipv6Net for the network interface
    pub ipv6: Vec<default_net::ip::Ipv6Net>,
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

    // Identity::OrgPublic or Identity::IndividualPublic
    pub public: SiteStore,

    // Identity::OrgProtected or Identity::IndividualProtected
    pub protected: SiteStore,

    // Identity::OrgPrivate or Identity::IndividualPrivate
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

/// Bind address
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct BindAddress {
    pub port: u16,
    pub ip: IP,
}

impl BindAddress {
    pub fn to_ws_url(&self) -> String {
        format!(
            "ws://{}:{}",
            self.ip,
            if self.port == 0 { 80 } else { self.port }
        )
    }
}

impl From<&SocketAddr> for BindAddress {
    #[inline]
    fn from(addr: &SocketAddr) -> BindAddress {
        let ip_addr = addr.ip();
        let ip = IP::try_from(&ip_addr).unwrap();
        let port = addr.port();
        BindAddress { ip, port }
    }
}

/// Core Broker connection details Version 0
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct BrokerCoreV0 {
    /// peerId of the server
    pub peer_id: PubKey,

    /// network addresses of the broker, typically an IpV4 and an optional IPV6 addr. core broker should not be multi-homed.
    pub addrs: Vec<BindAddress>,
}

/// Core Broker connection details
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Hash)]
pub enum BrokerCore {
    V0(BrokerCoreV0),
}

/// BrokerServerTypeV0 type
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum BrokerServerTypeV0 {
    Localhost(u16), // optional port number
    BoxPrivate(Vec<BindAddress>),
    BoxPublic(Vec<BindAddress>),
    BoxPublicDyn(Vec<BindAddress>), // can be empty
    Domain(String),                 // accepts an option trailing ":port" number
                                    //Core(Vec<BindAddress>),
}

/// BrokerServer details Version 0
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct BrokerServerV0 {
    /// Network addresses
    pub server_type: BrokerServerTypeV0,

    /// peerId of the server
    pub peer_id: PubKey,
}

pub const APP_ACCOUNT_REGISTERED_SUFFIX: &str = "/#/user/registered";

pub const NG_ONE_URL: &str = "https://nextgraph.one";

pub const APP_NG_ONE_URL: &str = "https://app.nextgraph.one";

pub const APP_NG_ONE_WS_URL: &str = "wss://app.nextgraph.one";

fn api_dyn_peer_url(peer_id: &PubKey) -> String {
    format!("https://nextgraph.one/api/v1/dynpeer/{}", peer_id)
}

pub const LOCAL_HOSTS: [&str; 3] = ["localhost", "127.0.0.1", "[::1]"];

fn local_ws_url(port: &u16) -> String {
    format!("ws://localhost:{}", if *port == 0 { 80 } else { *port })
}

pub fn local_http_url(port: &u16) -> String {
    format!("http://localhost:{}", if *port == 0 { 80 } else { *port })
}

pub const LOCAL_URLS: [&str; 3] = ["http://localhost", "http://127.0.0.1", "http://[::1]"];
use url::{Host, Url};

impl BrokerServerTypeV0 {
    pub fn find_first_ipv4(&self) -> Option<&BindAddress> {
        match self {
            Self::BoxPrivate(addrs) => {
                for addr in addrs {
                    if addr.ip.is_v4() {
                        return Some(addr);
                    }
                }
                return None;
            }
            _ => None,
        }
    }
    pub fn find_first_ipv6(&self) -> Option<&BindAddress> {
        match self {
            Self::BoxPrivate(addrs) => {
                for addr in addrs {
                    if addr.ip.is_v6() {
                        return Some(addr);
                    }
                }
                return None;
            }
            _ => None,
        }
    }
}
impl BrokerServerV0 {
    fn first_ipv4(&self) -> Option<(String, Vec<BindAddress>)> {
        self.server_type.find_first_ipv4().map_or(None, |bindaddr| {
            Some((format!("ws://{}:{}", bindaddr.ip, bindaddr.port), vec![]))
        })
    }

    fn first_ipv6(&self) -> Option<(String, Vec<BindAddress>)> {
        self.server_type.find_first_ipv6().map_or(None, |bindaddr| {
            Some((format!("ws://{}:{}", bindaddr.ip, bindaddr.port), vec![]))
        })
    }

    pub fn first_ipv4_http(&self) -> Option<String> {
        self.server_type.find_first_ipv4().map_or(None, |bindaddr| {
            Some(format!("http://{}:{}", bindaddr.ip, bindaddr.port))
        })
    }

    pub fn first_ipv6_http(&self) -> Option<String> {
        self.server_type.find_first_ipv6().map_or(None, |bindaddr| {
            Some(format!("http://{}:{}", bindaddr.ip, bindaddr.port))
        })
    }

    fn first_ipv6_or_ipv4(
        ipv4: bool,
        ipv6: bool,
        addrs: &Vec<BindAddress>,
    ) -> Option<&BindAddress> {
        if ipv6 {
            for addr in addrs {
                if addr.ip.is_v6() {
                    return Some(addr);
                }
            }
        }
        if ipv4 {
            for addr in addrs {
                if addr.ip.is_v4() {
                    return Some(addr);
                }
            }
        }
        return None;
    }

    fn app_ng_one_bootstrap_url(addr: &BindAddress, key: PubKey) -> Option<String> {
        let payload = (addr, key);
        let payload_ser = serde_bare::to_vec(&payload).ok();
        if payload_ser.is_none() {
            return None;
        }
        Some(format!(
            "{}?b={}",
            APP_NG_ONE_URL,
            base64_url::encode(&payload_ser.unwrap())
        ))
    }

    fn app_ng_one_bootstrap_url_with_first_ipv6_or_ipv4(
        ipv4: bool,
        ipv6: bool,
        addrs: &Vec<BindAddress>,
        key: PubKey,
    ) -> Option<String> {
        if let Some(addr) = Self::first_ipv6_or_ipv4(ipv4, ipv6, addrs) {
            return Self::app_ng_one_bootstrap_url(addr, key);
        }
        None
    }

    /// set ipv6 only if the browser connected with a remote IPV6. always set ipv4 as a fallback (for now).
    pub async fn get_url_for_ngone(&self, ipv4: bool, ipv6: bool) -> Option<String> {
        match &self.server_type {
            BrokerServerTypeV0::BoxPublic(addrs) => {
                Self::app_ng_one_bootstrap_url_with_first_ipv6_or_ipv4(
                    ipv4,
                    ipv6,
                    addrs,
                    self.peer_id,
                )
            }
            BrokerServerTypeV0::BoxPublicDyn(addrs) => {
                let resp = reqwest::get(api_dyn_peer_url(&self.peer_id)).await;
                if resp.is_ok() {
                    let resp = resp.unwrap().json::<Vec<BindAddress>>().await;
                    if resp.is_ok() {
                        return Self::app_ng_one_bootstrap_url_with_first_ipv6_or_ipv4(
                            ipv4,
                            ipv6,
                            &resp.unwrap(),
                            self.peer_id,
                        );
                    }
                }
                if addrs.len() > 0 {
                    Self::app_ng_one_bootstrap_url_with_first_ipv6_or_ipv4(
                        ipv4,
                        ipv6,
                        &addrs,
                        self.peer_id,
                    )
                } else {
                    None
                }
            }
            BrokerServerTypeV0::Domain(domain) => Some(format!("https://{}", domain)),
            BrokerServerTypeV0::Localhost(port) => Some(local_http_url(&port)),
            BrokerServerTypeV0::BoxPrivate(_) => {
                if ipv6 {
                    let v6 = self.server_type.find_first_ipv6().map_or(None, |bindaddr| {
                        Some(format!("http://{}:{}", bindaddr.ip, bindaddr.port))
                    });
                    if v6.is_some() {
                        return v6;
                    }
                }
                if ipv4 {
                    self.server_type.find_first_ipv4().map_or(None, |bindaddr| {
                        Some(format!("http://{}:{}", bindaddr.ip, bindaddr.port))
                    })
                } else {
                    None
                }
            }
            _ => None,
        }
    }

    pub fn is_public_server(&self) -> bool {
        match &self.server_type {
            BrokerServerTypeV0::Localhost(_) => false,
            BrokerServerTypeV0::BoxPrivate(_) => false,
            BrokerServerTypeV0::BoxPublic(_) => true,
            BrokerServerTypeV0::BoxPublicDyn(_) => true,
            BrokerServerTypeV0::Domain(_) => true,
        }
    }

    /// on web browser, returns the connection URL and an optional list of BindAddress if a relay is needed
    /// filtered by the current location url of the webpage
    /// on native apps (do not pass a location), returns or the connection URL without optional BindAddress or an empty string with
    /// several BindAddresses to try to connect to with .to_ws_url()
    pub async fn get_ws_url(&self, location: Option<String>) -> Option<(String, Vec<BindAddress>)> {
        if location.is_some() {
            let location = location.unwrap();
            if location.starts_with(APP_NG_ONE_URL) {
                match &self.server_type {
                    BrokerServerTypeV0::BoxPublic(addrs) => {
                        Some((APP_NG_ONE_WS_URL.to_string(), addrs.clone()))
                    }
                    BrokerServerTypeV0::BoxPublicDyn(addrs) => {
                        let resp = reqwest::get(api_dyn_peer_url(&self.peer_id)).await;
                        if resp.is_ok() {
                            let resp = resp.unwrap().json::<Vec<BindAddress>>().await;
                            if resp.is_ok() {
                                return Some((APP_NG_ONE_WS_URL.to_string(), resp.unwrap()));
                            }
                        }
                        if addrs.len() > 0 {
                            Some((APP_NG_ONE_WS_URL.to_string(), addrs.clone()))
                        } else {
                            None
                        }
                    }
                    _ => None,
                }
            } else if let BrokerServerTypeV0::Domain(domain) = &self.server_type {
                let url = format!("https://{}", domain);
                if location.starts_with(&url) {
                    let wss_url = format!("wss://{}", domain);
                    Some((wss_url, vec![]))
                } else {
                    None
                }
            } else {
                // localhost
                if location.starts_with(LOCAL_URLS[0])
                    || location.starts_with(LOCAL_URLS[1])
                    || location.starts_with(LOCAL_URLS[2])
                {
                    if let BrokerServerTypeV0::Localhost(port) = self.server_type {
                        Some((local_ws_url(&port), vec![]))
                    } else {
                        None
                    }
                }
                // a private address
                else if location.starts_with("http://") {
                    let url = Url::parse(&location).unwrap();
                    match url.host() {
                        Some(Host::Ipv4(ip)) => {
                            if is_ipv4_private(&ip) {
                                self.first_ipv4()
                            } else {
                                None
                            }
                        }
                        Some(Host::Ipv6(ip)) => {
                            if is_ipv6_private(&ip) {
                                self.first_ipv6()
                            } else {
                                None
                            }
                        }
                        _ => None,
                    }
                } else {
                    None
                }
            }
        } else {
            // From native / tauri app
            match &self.server_type {
                //BrokerServerTypeV0::Core(_) => None,
                BrokerServerTypeV0::Localhost(port) => Some((local_ws_url(port), vec![])),
                BrokerServerTypeV0::BoxPrivate(addrs) => Some((String::new(), addrs.clone())),
                BrokerServerTypeV0::BoxPublic(addrs) => Some((String::new(), addrs.clone())),
                BrokerServerTypeV0::BoxPublicDyn(addrs) => {
                    let resp = reqwest::get(api_dyn_peer_url(&self.peer_id)).await;
                    if resp.is_ok() {
                        let resp = resp.unwrap().json::<Vec<BindAddress>>().await;
                        if resp.is_ok() {
                            return Some((String::new(), resp.unwrap()));
                        }
                    }
                    if addrs.len() > 0 {
                        Some((String::new(), addrs.clone()))
                    } else {
                        None
                    }
                }
                BrokerServerTypeV0::Domain(domain) => Some((format!("wss://{}", domain), vec![])),
            }
        }
    }
}

/// Bootstrap content Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BootstrapContentV0 {
    /// list of servers, in order of preference
    pub servers: Vec<BrokerServerV0>,
}

impl BootstrapContentV0 {
    pub fn new() -> Self {
        BootstrapContentV0 { servers: vec![] }
    }
    pub fn merge(&mut self, with: &BootstrapContentV0) {
        'outer: for server2 in &with.servers {
            for server1 in &self.servers {
                if *server1 == *server2 {
                    continue 'outer;
                }
            }
            self.servers.push(server2.clone());
        }
    }
    pub fn get_first_peer_id(&self) -> Option<PubKey> {
        self.servers.first().map(|s| s.peer_id)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BootstrapContent {
    V0(BootstrapContentV0),
}

impl BootstrapContent {
    pub fn servers(&self) -> &Vec<BrokerServerV0> {
        match self {
            Self::V0(v0) => &v0.servers,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum InvitationCode {
    Unique(SymKey),
    Admin(SymKey),
    Multi(SymKey),
}

impl InvitationCode {
    pub fn get_symkey(&self) -> SymKey {
        match self {
            Self::Unique(s) | Self::Admin(s) | Self::Multi(s) => s.clone(),
        }
    }
}

impl fmt::Display for InvitationCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unique(k) => write!(f, "unique {}", k),
            Self::Admin(k) => write!(f, "admin {}", k),
            Self::Multi(k) => write!(f, "multi {}", k),
        }
    }
}

/// Invitation to create an account at a broker. Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InvitationV0 {
    /// list of servers, in order of preference
    pub bootstrap: BootstrapContentV0,

    pub code: Option<SymKey>,

    /// an optional name to display to the invitee
    pub name: Option<String>,

    // an optional url to redirect the user to, for accepting ToS and making payment, if any.
    pub url: Option<String>,
}

impl InvitationV0 {
    pub fn set_bootstrap(&mut self, content: BootstrapContent) {
        match content {
            BootstrapContent::V0(v0) => self.bootstrap = v0,
        }
    }
    pub fn empty(name: Option<String>) -> Self {
        InvitationV0 {
            bootstrap: BootstrapContentV0 { servers: vec![] },
            code: None,
            name,
            url: None,
        }
    }
    pub fn new(
        bootstrap_content: BootstrapContent,
        code: Option<SymKey>,
        name: Option<String>,
        url: Option<String>,
    ) -> Self {
        match bootstrap_content {
            BootstrapContent::V0(v0) => InvitationV0 {
                bootstrap: v0,
                code,
                name,
                url,
            },
        }
    }
    pub fn append_bootstraps(&mut self, add: &mut Option<BootstrapContentV0>) {
        if add.is_some() {
            let add = add.as_mut().unwrap();
            self.bootstrap.servers.append(&mut add.servers);
        }
    }
}

impl Invitation {
    pub fn new_v0(
        bootstrap: BootstrapContentV0,
        name: Option<String>,
        url: Option<String>,
    ) -> Self {
        Invitation::V0(InvitationV0 {
            bootstrap,
            code: Some(SymKey::random()),
            name,
            url,
        })
    }

    pub fn new_v0_free(
        bootstrap: BootstrapContentV0,
        name: Option<String>,
        url: Option<String>,
    ) -> Self {
        Invitation::V0(InvitationV0 {
            bootstrap,
            code: None,
            name,
            url,
        })
    }

    pub fn intersects(&self, invite2: Invitation) -> Invitation {
        let Invitation::V0(v0) = self;
        let mut new_invite = InvitationV0 {
            bootstrap: BootstrapContentV0 { servers: vec![] },
            code: v0.code.clone(),
            name: v0.name.clone(),
            url: v0.url.clone(),
        };
        for server2 in invite2.get_servers() {
            for server1 in &v0.bootstrap.servers {
                if *server1 == *server2 {
                    new_invite.bootstrap.servers.push(server2.clone());
                    break;
                }
            }
        }
        Invitation::V0(new_invite)
    }

    pub fn get_servers(&self) -> &Vec<BrokerServerV0> {
        match self {
            Invitation::V0(v0) => &v0.bootstrap.servers,
        }
    }

    pub fn set_name(&mut self, name: Option<String>) {
        if name.is_some() {
            match self {
                Invitation::V0(v0) => v0.name = Some(name.unwrap()),
            }
        }
    }

    pub fn set_url(&mut self, url: Option<&String>) {
        if url.is_some() {
            match self {
                Invitation::V0(v0) => v0.url = Some(url.unwrap().clone()),
            }
        }
    }

    /// first URL in the list is the ngone one
    pub fn get_urls(&self) -> Vec<String> {
        match self {
            Invitation::V0(v0) => {
                let mut res = vec![];
                let ser = serde_bare::to_vec(&self).unwrap();
                let url_param = base64_url::encode(&ser);
                res.push(format!("{}/#/i/{}", NG_ONE_URL, url_param));
                for server in &v0.bootstrap.servers {
                    match &server.server_type {
                        BrokerServerTypeV0::Domain(domain) => {
                            res.push(format!("https://{}/#/i/{}", domain, url_param));
                        }
                        BrokerServerTypeV0::BoxPrivate(addrs) => {
                            for bindaddr in addrs {
                                res.push(format!(
                                    "http://{}:{}/#/i/{}",
                                    bindaddr.ip, bindaddr.port, url_param
                                ));
                            }
                        }
                        BrokerServerTypeV0::Localhost(port) => {
                            res.push(format!("{}/#/i/{}", local_http_url(&port), url_param));
                        }
                        _ => {}
                    }
                }
                res
            }
        }
    }
}

impl fmt::Display for Invitation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let ser = serde_bare::to_vec(&self).unwrap();
        let string = base64_url::encode(&ser);
        write!(f, "{}", string)
    }
}

impl TryFrom<String> for Invitation {
    type Error = NgError;
    fn try_from(value: String) -> Result<Self, NgError> {
        let ser = base64_url::decode(&value).map_err(|_| NgError::InvalidInvitation)?;
        let invite: Invitation =
            serde_bare::from_slice(&ser).map_err(|_| NgError::InvalidInvitation)?;
        Ok(invite)
    }
}

/// Invitation to create an account at a broker.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum Invitation {
    V0(InvitationV0),
}

impl From<BootstrapContent> for Invitation {
    fn from(value: BootstrapContent) -> Self {
        let BootstrapContent::V0(boot) = value;

        Invitation::V0(InvitationV0 {
            bootstrap: boot,
            code: None,
            name: None,
            url: None,
        })
    }
}

/// Create an account at a Broker Service Provider (BSP).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CreateAccountBSP {
    V0(CreateAccountBSPV0),
}

impl TryFrom<String> for CreateAccountBSP {
    type Error = NgError;
    fn try_from(value: String) -> Result<Self, NgError> {
        let ser = base64_url::decode(&value).map_err(|_| NgError::InvalidCreateAccount)?;
        let invite: CreateAccountBSP =
            serde_bare::from_slice(&ser).map_err(|_| NgError::InvalidCreateAccount)?;
        Ok(invite)
    }
}

impl CreateAccountBSP {
    pub fn encode(&self) -> Option<String> {
        let payload_ser = serde_bare::to_vec(self).ok();
        if payload_ser.is_none() {
            return None;
        }
        Some(base64_url::encode(&payload_ser.unwrap()))
    }
    // pub fn user(&self) -> PubKey {
    //     match self {
    //         Self::V0(v0) => v0.user,
    //     }
    // }
    pub fn redirect_url(&self) -> &Option<String> {
        match self {
            Self::V0(v0) => &v0.redirect_url,
        }
    }
    // pub fn invitation(&self) -> &Option<InvitationV0> {
    //     match self {
    //         Self::V0(v0) => &v0.invitation,
    //     }
    // }
    // pub fn additional_bootstrap(&mut self) -> &mut Option<BootstrapContentV0> {
    //     match self {
    //         Self::V0(v0) => &mut v0.additional_bootstrap,
    //     }
    // }
}

/// Create an account at a Broker Service Provider (BSP). Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CreateAccountBSPV0 {
    //pub invitation: Option<InvitationV0>,

    //pub additional_bootstrap: Option<BootstrapContentV0>,
    /// the user asking to create an account
    //pub user: PubKey,

    /// signature over serialized invitation code, with user key
    // pub sig: Sig,

    /// for web access, will redirect after successful signup. if left empty, it means user was on native app.
    pub redirect_url: Option<String>,
}

/// ListenerInfo
#[cfg(not(target_arch = "wasm32"))]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ListenerInfo {
    pub config: ListenerV0,

    /// list of BindAddresses
    pub addrs: Vec<BindAddress>,
}

/// AcceptForwardForV0 type
/// allow answers to connection requests originating from a client behind a reverse proxy
/// Format of last param in the tuple is a list of comma separated hosts or CIDR subnetworks IPv4 and/or IPv6 addresses accepted as X-Forwarded-For
/// Empty string means all addresses are accepted
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum AcceptForwardForV0 {
    /// X-Forwarded-For not allowed
    No,

    /// X-Forwarded-For accepted only for clients with private LAN addresses. First param is the domain of the proxy server
    PrivateDomain((String, String)),

    /// X-Forwarded-For accepted only for clients with public addresses. First param is the domain of the proxy server
    /// domain can take an option port (trailing `:port`)
    PublicDomain((String, String)),

    /// X-Forwarded-For accepted only for clients with public addresses. First param is the domain of the proxy server
    /// domain can take an option port (trailing `:port`)
    /// second param is the privKey of the PeerId of the proxy server, useful when the proxy server is load balancing to several daemons
    /// that should all use the same PeerId to answer requests
    PublicDomainPeer((String, PrivKey, String)),

    /// accepts only clients with public addresses that arrive on a LAN address binding. This is used for DMZ and port forwarding configs
    /// first param is the port, second param in tuple is the interval for periodic probe of the external IP
    PublicDyn((u16, u32, String)),

    /// accepts only clients with public addresses that arrive on a LAN address binding. This is used for DMZ and port forwarding configs
    /// First param is the IPv4 bind address of the reverse NAT server (DMZ, port forwarding)
    /// Second param is an optional IPv6 bind address of the reverse NAT server (DMZ, port forwarding)
    PublicStatic((BindAddress, Option<BindAddress>, String)),
}

impl AcceptForwardForV0 {
    pub fn get_public_bind_addresses(&self) -> Vec<BindAddress> {
        match self {
            AcceptForwardForV0::PublicStatic((ipv4, ipv6, _)) => {
                let mut res = vec![ipv4.clone()];
                if ipv6.is_some() {
                    res.push(ipv6.unwrap().clone())
                }
                res
            }
            AcceptForwardForV0::PublicDyn(_) => {
                todo!();
            }
            _ => panic!("cannot call get_public_bind_addresses"),
        }
    }

    pub fn get_public_bind_ipv6_address(&self) -> Option<IP> {
        match self {
            AcceptForwardForV0::PublicStatic((ipv4, ipv6, _)) => {
                let mut res = vec![ipv4.clone()];
                if ipv6.is_some() {
                    return Some(ipv6.unwrap().ip.clone());
                } else {
                    return None;
                }
            }
            AcceptForwardForV0::PublicDyn(_) => {
                todo!();
            }
            _ => None,
        }
    }

    pub fn is_public_domain(&self) -> bool {
        match self {
            AcceptForwardForV0::PublicDomainPeer(_) => true,
            AcceptForwardForV0::PublicDomain(_) => true,
            _ => false,
        }
    }
    pub fn is_public_static(&self) -> bool {
        match self {
            AcceptForwardForV0::PublicStatic(_) => true,
            _ => false,
        }
    }
    pub fn is_no(&self) -> bool {
        match self {
            AcceptForwardForV0::No => true,
            _ => false,
        }
    }
    pub fn is_public_dyn(&self) -> bool {
        match self {
            AcceptForwardForV0::PublicDyn(_) => true,
            _ => false,
        }
    }
    pub fn is_private_domain(&self) -> bool {
        match self {
            AcceptForwardForV0::PrivateDomain(_) => true,
            _ => false,
        }
    }
    pub fn domain_with_common_peer_id(&self) -> Option<PubKey> {
        match self {
            AcceptForwardForV0::PublicDomainPeer((_, privkey, _)) => Some(privkey.to_pub()),
            _ => None,
        }
    }
    pub fn get_domain(&self) -> &str {
        let domain = get_domain_without_port_443(match self {
            AcceptForwardForV0::PrivateDomain((d, _)) => d,
            AcceptForwardForV0::PublicDomain((d, _)) => d,
            AcceptForwardForV0::PublicDomainPeer((d, _, _)) => d,
            _ => panic!("cannot call get_domain if AcceptForwardForV0 is not a domain"),
        });
        //let mut url = "https://".to_string();
        //url.push_str(domain);
        domain
    }
}

#[cfg(not(target_arch = "wasm32"))]
/// DaemonConfig Listener Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ListenerV0 {
    /// local interface name to bind to
    /// names of interfaces can be retrieved with the --list-interfaces option
    pub interface_name: String,

    pub if_type: InterfaceType,

    /// optional number of seconds for an interval of periodic refresh
    /// of the actual IP(s) of the interface. Used for dynamic IP interfaces (DHCP)
    pub interface_refresh: u32,

    // if to bind to the ipv6 address of the interface
    pub ipv6: bool,

    /// local port to listen on
    pub port: u16,

    /// should the server serve the app files in HTTP mode (not WS). this setting will be discarded and app will not be served anyway if remote IP is public or listener is public
    pub serve_app: bool,

    /// when the box is behind a DMZ, and ipv6 is enabled, the private interface will get the external public IpV6. with this option we allow binding to it
    pub bind_public_ipv6: bool,

    /// default to false. Set to true by --core (use --core-and-clients to override to false). only useful for a public IP listener, if the clients should use another listener like --domain or --domain-private.
    /// do not set it on a --domain or --domain-private, as this will enable the relay_websocket feature, which should not be used except by app.nextgraph.one
    pub refuse_clients: bool,

    // will answer a probe coming from private LAN and if is_private, with its own peerId, so that guests on the network will be able to connect.
    pub discoverable: bool,

    /// Answers to connection requests originating from a direct client, without X-Forwarded-For headers
    /// Can be used in combination with a accept_forward_for config, when a local daemon is behind a proxy, and also serves as broker for local apps/webbrowsers
    pub accept_direct: bool,

    /// X-Forwarded-For config. only valid if IP/interface is localhost or private
    pub accept_forward_for: AcceptForwardForV0,
    // impl fn is_private()
    // returns false if public IP in interface, or if PublicDyn, PublicStatic

    // an interface with no accept_forward_for and no accept_direct, is de facto, disabled
}

#[cfg(not(target_arch = "wasm32"))]
impl ListenerV0 {
    pub fn should_bind_public_ipv6_to_private_interface(&self, ip: Ipv6Addr) -> bool {
        let public_ip = self.accept_forward_for.get_public_bind_ipv6_address();
        if public_ip.is_none() {
            return false;
        }
        let public_ipv6addr: IpAddr = public_ip.as_ref().unwrap().into();
        return if let IpAddr::V6(v6) = public_ipv6addr {
            self.bind_public_ipv6 && self.if_type == InterfaceType::Private && ip == v6
        } else {
            false
        };
    }

    pub fn new_direct(interface: Interface, ipv6: bool, port: u16) -> Self {
        Self {
            interface_name: interface.name,
            if_type: interface.if_type,
            interface_refresh: 0,
            ipv6,
            port,
            discoverable: false,
            accept_direct: true,
            refuse_clients: false,
            serve_app: true,
            bind_public_ipv6: false,
            accept_forward_for: AcceptForwardForV0::No,
        }
    }

    pub fn is_core(&self) -> bool {
        match self.accept_forward_for {
            AcceptForwardForV0::PublicStatic(_) => true,
            AcceptForwardForV0::PublicDyn(_) => true,
            AcceptForwardForV0::PublicDomain(_) | AcceptForwardForV0::PublicDomainPeer(_) => false,
            AcceptForwardForV0::PrivateDomain(_) => false,
            AcceptForwardForV0::No => self.if_type == InterfaceType::Public,
        }
    }

    pub fn accepts_client(&self) -> bool {
        match self.accept_forward_for {
            AcceptForwardForV0::PublicStatic(_)
            | AcceptForwardForV0::PublicDyn(_)
            | AcceptForwardForV0::PublicDomain(_)
            | AcceptForwardForV0::PublicDomainPeer(_) => self.accept_direct || !self.refuse_clients,
            AcceptForwardForV0::PrivateDomain(_) => true,
            AcceptForwardForV0::No => {
                self.if_type == InterfaceType::Public && !self.refuse_clients
                    || self.if_type != InterfaceType::Public
            }
        }
    }

    pub fn get_bootstraps(&self, addrs: Vec<BindAddress>) -> Vec<BrokerServerTypeV0> {
        let mut res: Vec<BrokerServerTypeV0> = vec![];
        match self.accept_forward_for {
            AcceptForwardForV0::PublicStatic(_) => {
                let pub_addrs = self.accept_forward_for.get_public_bind_addresses();
                //res.push(BrokerServerTypeV0::Core(pub_addrs.clone()));
                if !self.refuse_clients {
                    res.push(BrokerServerTypeV0::BoxPublic(pub_addrs));
                }
                if self.accept_direct {
                    res.push(BrokerServerTypeV0::BoxPrivate(addrs));
                }
            }
            AcceptForwardForV0::PublicDyn(_) => {
                let pub_addrs = self.accept_forward_for.get_public_bind_addresses();
                //res.push(BrokerServerTypeV0::Core(pub_addrs.clone()));
                if !self.refuse_clients {
                    res.push(BrokerServerTypeV0::BoxPublicDyn(pub_addrs));
                }
                if self.accept_direct {
                    res.push(BrokerServerTypeV0::BoxPrivate(addrs));
                }
            }
            AcceptForwardForV0::PublicDomain(_) | AcceptForwardForV0::PublicDomainPeer(_) => {
                if !self.refuse_clients {
                    res.push(BrokerServerTypeV0::Domain(
                        self.accept_forward_for.get_domain().to_string(),
                    ));
                }
                if self.accept_direct {
                    if self.if_type == InterfaceType::Private {
                        res.push(BrokerServerTypeV0::BoxPrivate(addrs));
                    } else if self.if_type == InterfaceType::Loopback {
                        res.push(BrokerServerTypeV0::Localhost(addrs[0].port));
                    }
                }
            }
            AcceptForwardForV0::PrivateDomain(_) => {
                res.push(BrokerServerTypeV0::Domain(
                    self.accept_forward_for.get_domain().to_string(),
                ));
            }
            AcceptForwardForV0::No => {
                if self.if_type == InterfaceType::Loopback {
                    res.push(BrokerServerTypeV0::Localhost(addrs[0].port));
                } else if self.if_type == InterfaceType::Public {
                    //res.push(BrokerServerTypeV0::Core(addrs.clone()));
                    if !self.refuse_clients {
                        res.push(BrokerServerTypeV0::BoxPublic(addrs));
                    }
                } else if self.if_type == InterfaceType::Private {
                    res.push(BrokerServerTypeV0::BoxPrivate(addrs));
                }
            }
            _ => panic!("get_bootstrap missing"),
        }
        res
    }
}
#[cfg(not(target_arch = "wasm32"))]
impl fmt::Display for ListenerV0 {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let mut id = self.interface_name.clone();
        id.push('@');
        id.push_str(&self.port.to_string());
        write!(f, "{}", id)
    }
}

/// Broker Overlay Permission
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum BrokerOverlayPermission {
    Nobody,
    Anybody,
    AllRegisteredUser,
    UsersList(Vec<UserId>),
}

/// Broker Overlay Config
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BrokerOverlayConfigV0 {
    // list of overlays this config applies to. empty array means applying to all
    pub overlays: Vec<OverlayId>,
    // Who can ask to join an overlay on the core
    pub core: BrokerOverlayPermission,
    // Who can connect as a client to this server
    pub server: BrokerOverlayPermission,
    // if core == Nobody and server == Nobody then the listeners will not be started

    // are ExtRequest allowed on the server? this requires the core to be ON.
    pub allow_read: bool,

    /// an empty list means to forward to the peer known for each overlay.
    /// forward and core are mutually exclusive. forward becomes the default when core is disabled (set to Nobody).
    /// core always takes precedence.
    pub forward: Vec<BrokerServerV0>,
}

impl BrokerOverlayConfigV0 {
    pub fn new() -> Self {
        BrokerOverlayConfigV0 {
            overlays: vec![],
            core: BrokerOverlayPermission::Nobody,
            server: BrokerOverlayPermission::Nobody,
            allow_read: false,
            forward: vec![],
        }
    }
}

/// Registration config
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RegistrationConfig {
    Closed,
    Invitation,
    Open,
}

//
// COMMON TYPES FOR MESSAGES
//

pub type DirectPeerId = PubKey;

/// Peer ID: public key of the node, or an encrypted version of it
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum PeerId {
    DIRECT(DirectPeerId),
    FORWARDED([u8; 32]),
}

/// Overlay ID
///
/// - for read overlays that need to be discovered by public key:
///   BLAKE3 hash over the repository public key (of root doc)
/// - for write overlays:
///   BLAKE3 keyed hash over the repository public key
///   - key: BLAKE3 derive_key ("NextGraph OverlayId BLAKE3 key", repo_secret, root_secret)
pub type OverlayId = Digest;

/// Overlay session ID
///
/// Used as a component for key derivation.
/// Each peer generates it randomly when (re)joining the overlay network.
pub type SessionId = u64;

/// Topic ID: public key of the topic
pub type TopicId = PubKey;

/// User ID: user account for broker
pub type UserId = PubKey;

/// Client ID: client of a user
pub type ClientId = PubKey;

/// IPv4 address
pub type IPv4 = [u8; 4];

/// IPv6 address
pub type IPv6 = [u8; 16];

/// IP address
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum IP {
    IPv4(IPv4),
    IPv6(IPv6),
}

impl IP {
    pub fn is_public(&self) -> bool {
        is_public_ip(&self.into())
    }
    pub fn is_private(&self) -> bool {
        is_private_ip(&self.into())
    }
    pub fn is_loopback(&self) -> bool {
        let t: &IpAddr = &self.into();
        t.is_loopback()
    }
    pub fn is_v6(&self) -> bool {
        if let Self::IPv6(_) = self {
            true
        } else {
            false
        }
    }
    pub fn is_v4(&self) -> bool {
        if let Self::IPv4(_) = self {
            true
        } else {
            false
        }
    }
}

impl fmt::Display for IP {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let t: IpAddr = self.try_into().unwrap();
        match self {
            IP::IPv4(_) => write!(f, "{}", t),
            IP::IPv6(_) => write!(f, "[{}]", t),
        }
    }
}

impl From<&IpAddr> for IP {
    #[inline]
    fn from(ip: &IpAddr) -> IP {
        match ip {
            IpAddr::V4(v4) => IP::IPv4(v4.octets()),
            IpAddr::V6(v6) => IP::IPv6(v6.octets()),
        }
    }
}

impl From<&IP> for IpAddr {
    #[inline]
    fn from(ip: &IP) -> IpAddr {
        match ip {
            IP::IPv4(v4) => IpAddr::from(*v4),
            IP::IPv6(v6) => IpAddr::from(*v6),
        }
    }
}

/// IP transport protocol
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum TransportProtocol {
    WS,
    QUIC,
    Local,
}

/// IP transport address
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct IPTransportAddr {
    pub ip: IP,
    pub port: u16,
    pub protocol: TransportProtocol,
}

/// Network address
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum NetAddr {
    IPTransport(IPTransportAddr),
}

/**
* info : {
     type : WEB | NATIVE-IOS | NATIVE-ANDROID | NATIVE-MACOS | NATIVE-LINUX | NATIVE-WIN
            NATIVE-SERVICE | NODE-SERVICE | VERIFIER | CLIENT-BROKER | CLI
     vendor : (UA, node version, tauri webview, rust version)
     os : operating system string
     version : version of client
     date_install
     date_updated : last update
   }
*/

/// Client Type
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ClientType {
    Web,
    NativeIos,
    NativeAndroid,
    NativeMacOS,
    NativeLinux,
    NativeWin,
    NativeService,
    NodeService,
    Verifier,
    ClientBroker,
    Cli,
}

/// IP transport address
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ClientInfoV0 {
    pub client_type: ClientType,
    pub details: String,
    pub version: String,
    pub timestamp_install: u64,
    pub timestamp_updated: u64,
}

/// Client Info
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ClientInfo {
    V0(ClientInfoV0),
}

impl ClientInfo {
    pub fn new(client_type: ClientType, details: String, version: String) -> ClientInfo {
        let timestamp_install = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        ClientInfo::V0(ClientInfoV0 {
            details,
            version,
            client_type,
            timestamp_install,
            timestamp_updated: timestamp_install,
        })
    }
}

//
// OVERLAY MESSAGES
//

/// Overlay connection request
///
/// Sent to an existing overlay member to initiate a session
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum OverlayConnect {
    V0(),
}

/// Overlay disconnection request
///
/// Sent to a connected overlay member to terminate a session
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum OverlayDisconnect {
    V0(),
}

/// Content of TopicAdvertV0
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct TopicAdvertContentV0 {
    /// Topic public key
    pub topic: TopicId,

    /// Peer public key
    pub peer: PeerId,
}

/// Topic advertisement by a publisher
///
/// Flooded to all peers in overlay
/// Creates subscription routing table entries
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct TopicAdvertV0 {
    pub content: TopicAdvertContentV0,

    /// Signature over content by topic key
    pub sig: Sig,
}

/// Topic advertisement by a publisher
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum TopicAdvert {
    V0(TopicAdvertV0),
}

/// Topic subscription request by a peer
///
/// Forwarded towards all publishers along subscription routing table entries
/// that are created by TopicAdverts
/// Creates event routing table entries along the path
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct SubReqV0 {
    /// Random ID generated by the subscriber
    pub id: u64,

    /// Topic public key
    pub topic: TopicId,
}

/// Topic subscription request by a peer
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum SubReq {
    V0(SubReqV0),
}

/// Topic subscription acknowledgement by a publisher
///
/// Sent to all subscribers in an Event.
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct SubAckV0 {
    /// SubReq ID to acknowledge
    pub id: u64,
}

/// Topic subscription acknowledgement by a publisher
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum SubAck {
    V0(SubAckV0),
}

/// Topic unsubscription request by a subscriber
///
/// A broker unsubscribes from upstream brokers
/// when it has no more subscribers left
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct UnsubReqV0 {
    /// Topic public key
    pub topic: TopicId,
}

/// Topic unsubscription request by a subscriber
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum UnsubReq {
    V0(UnsubReqV0),
}

/// Topic unsubscription acknowledgement
/// Sent to the requestor in response to an UnsubReq
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct UnsubAckV0 {
    /// Topic public key
    pub topic: TopicId,
}
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum UnsubAck {
    V0(UnsubAckV0),
}

/// Branch change notification
/// Contains a chunk of a newly added Commit or File referenced by a commit.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ChangeV0 {
    /// Block with encrypted content
    pub content: Block,

    /// Encrypted key for the Commit object in content
    /// Only set for the root block of the object
    /// The key is encrypted using ChaCha20:
    /// - key: BLAKE3 derive_key ("NextGraph Event ObjectRef ChaCha20 key",
    ///                           branch_pubkey + branch_secret + publisher_pubkey)
    /// - nonce: commit_seq
    pub key: Option<SymKey>,
}

/// Body of EventContentV0
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum EventBodyV0 {
    SubAck,
    Change,
}

/// Content of EventV0
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct EventContentV0 {
    /// Pub/sub topic
    pub topic: TopicId,

    /// Publisher pubkey encrypted with ChaCha20:
    /// - key: BLAKE3 derive_key ("NextGraph Event Publisher ChaCha20 key",
    ///                           repo_pubkey + repo_secret +
    ///                           branch_pubkey + branch_secret)
    pub publisher: [u8; 32], // PubKey

    /// Commit sequence number of publisher
    pub seq: u32,

    /// Event body
    pub body: EventBodyV0,
}

/// Pub/sub event published in a topic
///
/// Forwarded along event routing table entries
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct EventV0 {
    pub content: EventContentV0,

    /// Signature over content by topic key
    pub sig: Sig,
}

/// Pub/sub event published in a topic
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum Event {
    V0(EventV0),
}

/// Object search in a pub/sub topic
///
/// Sent along the reverse path of a pub/sub topic
/// from a subscriber to all publishers.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BlockSearchTopicV0 {
    /// Topic to forward the request in
    pub topic: TopicId,

    /// List of Object IDs to request
    pub ids: Vec<ObjectId>,

    /// Whether or not to include all children recursively in the response
    pub include_children: bool,

    /// List of Peer IDs the request traversed so far
    pub path: Vec<PeerId>,
}

/// Object request by ID
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BlockSearchTopic {
    V0(BlockSearchTopicV0),
}

/// Block search along a random walk
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BlockSearchRandomV0 {
    /// List of Block IDs to request
    pub ids: Vec<BlockId>,

    /// Whether or not to include all children recursively in the response
    pub include_children: bool,

    /// Number of random nodes to forward the request to at each step
    pub fanout: u8,

    /// List of Peer IDs the request traversed so far
    pub path: Vec<PeerId>,
}

/// Block request by ID using a random walk
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BlockSearchRandom {
    V0(BlockSearchRandomV0),
}

/// Response to a BlockSearch* request
///
/// Follows request path with possible shortcuts.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BlockResultV0 {
    /// Response path
    pub path: Vec<PeerId>,

    /// Resulting Object(s)
    pub payload: Vec<Block>,
}

/// Response to a BlockSearch* request
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BlockResult {
    V0(BlockResultV0),
}

/// Request latest events corresponding to the branch heads in a pub/sub topic
///
/// In response an Event is sent for each commit chunk that belong to branch heads
/// that are not present in the requestor's known heads
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BranchHeadsReqV0 {
    /// Topic public key of the branch
    pub topic: TopicId,

    /// Known heads
    pub known_heads: Vec<ObjectId>,
}

/// Request latest events corresponding to the branch heads in a pub/sub topic
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BranchHeadsReq {
    V0(BranchHeadsReqV0),
}

/// Branch synchronization request
///
/// In response a stream of `Block`s of the requested Objects are sent
/// that are not present in the requestor's known heads and commits
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BranchSyncReqV0 {
    /// Heads to request, including all their dependencies
    pub heads: Vec<ObjectId>,

    /// Fully synchronized until these commits
    pub known_heads: Vec<ObjectId>,

    /// Known commit IDs since known_heads
    pub known_commits: BloomFilter,
}

/// Branch synchronization request
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BranchSyncReq {
    V0(BranchSyncReqV0),
}

impl BranchSyncReq {
    pub fn heads(&self) -> &Vec<ObjectId> {
        match self {
            BranchSyncReq::V0(o) => &o.heads,
        }
    }
    pub fn known_heads(&self) -> &Vec<ObjectId> {
        match self {
            BranchSyncReq::V0(o) => &o.known_heads,
        }
    }
    pub fn known_commits(&self) -> &BloomFilter {
        match self {
            BranchSyncReq::V0(o) => &o.known_commits,
        }
    }
}

/// Events the requestor needs, see EventReqV0
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct NeedEventsV0 {
    /// Publisher ID
    pub publisher: Digest,

    /// First sequence number to request
    pub from: u32,

    /// Last sequence number to request
    pub to: u32,
}

/// Events the responder has, see EventRespV0
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct HaveEventsV0 {
    /// Publisher ID
    pub publisher: Digest,

    /// First sequence number to send
    pub from: u32,

    /// Last sequence number to send
    pub to: u32,
}

/// Request missed events for a pub/sub topic
/// for the specified range of publisher sequence numbers
///
/// In response an EventResp then a stream of Events are sent
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EventReqV0 {
    /// Topic public key
    pub topic: TopicId,

    /// Events needed by the requestor
    pub need: Vec<NeedEventsV0>,
}

/// Request missed events for a pub/sub topic
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum EventReq {
    V0(EventReqV0),
}

/// Response to an EventReq
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EventRespV0 {
    /// Events the responder has
    pub have: Vec<HaveEventsV0>,
}

/// Response to an EventReq
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum EventResp {
    V0(EventRespV0),
}

/// Content of CoreRequestV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreRequestContentV0 {
    EventReq(EventReq),
    BranchHeadsReq(BranchHeadsReq),
    BranchSyncReq(BranchSyncReq),
}

/// Request sent to an overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreRequestV0 {
    /// Request ID
    pub id: i64,

    /// Request content
    pub content: CoreRequestContentV0,
}

/// Request sent to an overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreRequest {
    V0(CoreRequestV0),
}

/// Content of CoreResponseV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreResponseContentV0 {
    EmptyResponse(()),
    Block(Block),
    EventResp(EventResp),
    Event(Event),
}

/// Request sent to an overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreResponseV0 {
    /// Request ID
    pub id: i64,

    /// Result
    pub result: u16,

    /// Response content
    pub content: CoreResponseContentV0,
}

/// Request sent to an CoreRequest
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreResponse {
    V0(CoreResponseV0),
}

/// Content of PeerAdvertV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PeerAdvertContentV0 {
    /// Peer ID
    pub peer: PeerId,

    /// Topic subscriptions
    pub subs: BloomFilter128,

    /// Network addresses
    pub address: Vec<NetAddr>,

    /// Version number
    pub version: u32,

    /// App-specific metadata (profile, cryptographic material, etc)
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

/// Peer advertisement
///
/// Sent periodically across the overlay along random walks.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PeerAdvertV0 {
    /// Peer advertisement content
    pub content: PeerAdvertContentV0,

    /// Signature over content by peer's private key
    pub sig: Sig,

    /// Time-to-live, decremented at each hop
    pub ttl: u8,
}

/// Peer advertisement
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum PeerAdvert {
    V0(PeerAdvertV0),
}

impl PeerAdvert {
    pub fn version(&self) -> u32 {
        match self {
            PeerAdvert::V0(o) => o.content.version,
        }
    }
    pub fn peer(&self) -> &PeerId {
        match self {
            PeerAdvert::V0(o) => &o.content.peer,
        }
    }
}

/// Content of CoreMessagePaddedV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreMessageContentV0 {
    OverlayConnect(OverlayConnect),
    OverlayDisconnect(OverlayDisconnect),
    PeerAdvert(PeerAdvert),
    TopicAdvert(TopicAdvert),
    SubReq(SubReq),
    SubAck(SubAck),
    UnsubReq(UnsubReq),
    UnsubAck(UnsubAck),
    Event(Event),
    BlockSearchTopic(BlockSearchTopic),
    BlockSearchRandom(BlockSearchRandom),
    BlockResult(BlockResult),
    CoreRequest(CoreRequest),
    CoreResponse(CoreResponse),
}

/// Overlay message
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreMessageV0 {
    /// Overlay ID
    pub overlay: OverlayId,

    /// Session ID
    pub session: SessionId,

    /// Padded content encrypted with ChaCha20
    /// - overlay_secret: BLAKE3 derive_key ("NextGraph Overlay BLAKE3 key",
    ///                                      repo_pubkey + repo_secret)
    /// - key: BLAKE3 derive_key ("NextGraph CoreMessage ChaCha20 key",
    ///                           overlay_secret + session_id)
    /// - nonce: per-session message sequence number of sending peer
    pub content: CoreMessageContentV0,

    /// Optional padding
    #[serde(with = "serde_bytes")]
    pub padding: Vec<u8>,

    /// BLAKE3 MAC
    /// BLAKE3 keyed hash over the encrypted content
    /// - key:  BLAKE3 derive_key ("NextGraph CoreMessage BLAKE3 key",
    ///                            overlay_secret + session_id)
    pub mac: Digest,
}

/// Overlay message
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreMessage {
    V0(CoreMessageV0),
}

//
// ADMIN PROTOCOL
//

/// Content of `AdminRequestV0`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AdminRequestContentV0 {
    AddUser(AddUser),
    DelUser(DelUser),
    ListUsers(ListUsers),
    ListInvitations(ListInvitations),
    AddInvitation(AddInvitation),
}
impl AdminRequestContentV0 {
    pub fn type_id(&self) -> TypeId {
        match self {
            Self::AddUser(a) => a.type_id(),
            Self::DelUser(a) => a.type_id(),
            Self::ListUsers(a) => a.type_id(),
            Self::ListInvitations(a) => a.type_id(),
            Self::AddInvitation(a) => a.type_id(),
        }
    }
    pub fn get_actor(&self) -> Box<dyn EActor> {
        match self {
            Self::AddUser(a) => a.get_actor(),
            Self::DelUser(a) => a.get_actor(),
            Self::ListUsers(a) => a.get_actor(),
            Self::ListInvitations(a) => a.get_actor(),
            Self::AddInvitation(a) => a.get_actor(),
        }
    }
}

/// Admin request
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AdminRequestV0 {
    /// Request ID
    pub id: i64,

    /// Request content
    pub content: AdminRequestContentV0,

    /// Signature over content by admin key
    pub sig: Sig,

    /// THe admin user requesting this operation
    pub admin_user: PubKey,

    /// Optional padding
    #[serde(with = "serde_bytes")]
    pub padding: Vec<u8>,
}

impl AdminRequestV0 {
    pub fn get_actor(&self) -> Box<dyn EActor> {
        self.content.get_actor()
    }
}

/// Admin request
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AdminRequest {
    V0(AdminRequestV0),
}

impl AdminRequest {
    pub fn id(&self) -> i64 {
        match self {
            Self::V0(o) => o.id,
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            Self::V0(v0) => {
                v0.id = id;
            }
        }
    }
    pub fn type_id(&self) -> TypeId {
        match self {
            Self::V0(o) => o.content.type_id(),
        }
    }
    pub fn sig(&self) -> Sig {
        match self {
            Self::V0(o) => o.sig,
        }
    }
    pub fn admin_user(&self) -> PubKey {
        match self {
            Self::V0(o) => o.admin_user,
        }
    }
    pub fn get_actor(&self) -> Box<dyn EActor> {
        match self {
            Self::V0(a) => a.get_actor(),
        }
    }
}

impl From<AdminRequest> for ProtocolMessage {
    fn from(msg: AdminRequest) -> ProtocolMessage {
        ProtocolMessage::Start(StartProtocol::Admin(msg))
    }
}

/// Content of `AdminResponseV0`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AdminResponseContentV0 {
    EmptyResponse,
    Users(Vec<PubKey>),
    Invitations(Vec<(InvitationCode, u32, Option<String>)>),
    Invitation(Invitation),
}

/// Response to an `AdminRequest` V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AdminResponseV0 {
    /// Request ID
    pub id: i64,

    /// Result (including but not limited to Result)
    pub result: u16,

    pub content: AdminResponseContentV0,

    /// Optional padding
    #[serde(with = "serde_bytes")]
    pub padding: Vec<u8>,
}

/// Response to an `AdminRequest`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AdminResponse {
    V0(AdminResponseV0),
}

impl From<Result<(), ProtocolError>> for AdminResponseV0 {
    fn from(res: Result<(), ProtocolError>) -> AdminResponseV0 {
        AdminResponseV0 {
            id: 0,
            result: res.map(|_| 0).unwrap_or_else(|e| e.into()),
            content: AdminResponseContentV0::EmptyResponse,
            padding: vec![],
        }
    }
}

impl From<Result<Vec<PubKey>, ProtocolError>> for AdminResponseV0 {
    fn from(res: Result<Vec<PubKey>, ProtocolError>) -> AdminResponseV0 {
        match res {
            Err(e) => AdminResponseV0 {
                id: 0,
                result: e.into(),
                content: AdminResponseContentV0::EmptyResponse,
                padding: vec![],
            },
            Ok(vec) => AdminResponseV0 {
                id: 0,
                result: 0,
                content: AdminResponseContentV0::Users(vec),
                padding: vec![],
            },
        }
    }
}

impl From<AdminResponseV0> for ProtocolMessage {
    fn from(msg: AdminResponseV0) -> ProtocolMessage {
        ProtocolMessage::AdminResponse(AdminResponse::V0(msg))
    }
}

impl From<AdminResponse> for ProtocolMessage {
    fn from(msg: AdminResponse) -> ProtocolMessage {
        ProtocolMessage::AdminResponse(msg)
    }
}

impl TryFrom<ProtocolMessage> for AdminResponse {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::AdminResponse(res) = msg {
            Ok(res)
        } else {
            Err(ProtocolError::InvalidValue)
        }
    }
}

impl AdminResponse {
    pub fn id(&self) -> i64 {
        match self {
            Self::V0(o) => o.id,
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            Self::V0(v0) => {
                v0.id = id;
            }
        }
    }
    pub fn result(&self) -> u16 {
        match self {
            Self::V0(o) => o.result,
        }
    }
    pub fn content_v0(&self) -> AdminResponseContentV0 {
        match self {
            Self::V0(o) => o.content.clone(),
        }
    }
}

//
// CLIENT PROTOCOL
//

/// Request to join an overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OverlayJoinV0 {
    /// Overlay secret
    pub secret: SymKey,

    /// Repository the overlay belongs to.
    /// Only set for local brokers.
    pub repo_pubkey: Option<PubKey>,

    /// Peers to connect to
    pub peers: Vec<PeerAdvert>,
}

/// Request to join an overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OverlayJoin {
    V0(OverlayJoinV0),
}

impl OverlayJoin {
    pub fn repo_pubkey(&self) -> Option<PubKey> {
        match self {
            OverlayJoin::V0(o) => o.repo_pubkey,
        }
    }
    pub fn secret(&self) -> &SymKey {
        match self {
            OverlayJoin::V0(o) => &o.secret,
        }
    }
    pub fn peers(&self) -> &Vec<PeerAdvert> {
        match self {
            OverlayJoin::V0(o) => &o.peers,
        }
    }
}

/// Request to leave an overlay
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum OverlayLeave {
    V0(),
}

/// Overlay status request
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum OverlayStatusReq {
    V0(),
}

/// Overlay status response
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OverlayStatusRespV0 {
    /// Whether or not the broker has joined the overlay
    pub joined: bool,

    /// List of peers currently connected in the overlay
    pub peers: Vec<PeerAdvert>,
}

/// Overlay status response
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OverlayStatusResp {
    V0(OverlayStatusRespV0),
}

/// Request a Block by ID
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BlockGetV0 {
    /// Block ID to request
    pub id: BlockId,

    /// Whether or not to include all children recursively
    pub include_children: bool,

    /// Topic the object is referenced from
    pub topic: Option<PubKey>,
}

/// Request an object by ID
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BlockGet {
    V0(BlockGetV0),
}

impl BlockGet {
    pub fn id(&self) -> BlockId {
        match self {
            BlockGet::V0(o) => o.id,
        }
    }
    pub fn include_children(&self) -> bool {
        match self {
            BlockGet::V0(o) => o.include_children,
        }
    }
    pub fn topic(&self) -> Option<PubKey> {
        match self {
            BlockGet::V0(o) => o.topic,
        }
    }
}

/// Request to store an object
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BlockPut {
    V0(Block),
}

impl BlockPut {
    pub fn block(&self) -> &Block {
        match self {
            BlockPut::V0(o) => &o,
        }
    }
}

/// Request to pin an object
///
/// Brokers maintain an LRU cache of objects,
/// where old, unused objects might get deleted to free up space for new ones.
/// Pinned objects are retained, regardless of last access.
/// Note that expiry is still observed in case of pinned objects.
/// To make an object survive its expiry,
/// it needs to be copied with a different expiry time.
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct ObjectPinV0 {
    pub id: ObjectId,
}

/// Request to pin an object
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum ObjectPin {
    V0(ObjectPinV0),
}

impl ObjectPin {
    pub fn id(&self) -> ObjectId {
        match self {
            ObjectPin::V0(o) => o.id,
        }
    }
}

/// Request to unpin an object
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct ObjectUnpinV0 {
    pub id: ObjectId,
}

/// Request to unpin an object
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum ObjectUnpin {
    V0(ObjectUnpinV0),
}

impl ObjectUnpin {
    pub fn id(&self) -> ObjectId {
        match self {
            ObjectUnpin::V0(o) => o.id,
        }
    }
}

/// Request to copy an object with a different expiry time
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct ObjectCopyV0 {
    /// Object ID to copy
    pub id: ObjectId,

    /// New expiry time
    pub expiry: Option<Timestamp>,
}

/// Request to copy an object with a different expiry time
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum ObjectCopy {
    V0(ObjectCopyV0),
}

impl ObjectCopy {
    pub fn id(&self) -> ObjectId {
        match self {
            ObjectCopy::V0(o) => o.id,
        }
    }
    pub fn expiry(&self) -> Option<Timestamp> {
        match self {
            ObjectCopy::V0(o) => o.expiry,
        }
    }
}

/// Request to delete an object
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct ObjectDelV0 {
    pub id: ObjectId,
}

/// Request to delete an object
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum ObjectDel {
    V0(ObjectDelV0),
}

impl ObjectDel {
    pub fn id(&self) -> ObjectId {
        match self {
            ObjectDel::V0(o) => o.id,
        }
    }
}

/// Request subscription to a `Topic`
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct TopicSubV0 {
    /// Topic to subscribe
    pub topic: PubKey,

    /// Publisher need to provide a signed `TopicAdvert` for the PeerId of the broker
    pub advert: Option<TopicAdvert>,
}

/// Request subscription to a `Topic`
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum TopicSub {
    V0(TopicSubV0),
}

/// Request unsubscription from a `Topic`
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct TopicUnsubV0 {
    /// Topic to unsubscribe
    pub topic: PubKey,
}

/// Request unsubscription from a `Topic`
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum TopicUnsub {
    V0(TopicUnsubV0),
}

/// Connect to an already subscribed `Topic`, and start receiving its `Event`s
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct TopicConnectV0 {
    /// Topic to connect
    pub topic: PubKey,
}

/// Connect to an already subscribed `Topic`, and start receiving its `Event`s
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum TopicConnect {
    V0(TopicConnectV0),
}

/// Disconnect from a Topic, and stop receiving its `Event`s
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct TopicDisconnectV0 {
    /// Topic to disconnect
    pub topic: PubKey,
}

/// Disconnect from a Topic, and stop receiving its `Event`s
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum TopicDisconnect {
    V0(TopicDisconnectV0),
}

/// Content of `ClientRequestV0`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ClientRequestContentV0 {
    OverlayConnect(OverlayConnect), // FIXME remove
    OverlayStatusReq(OverlayStatusReq),
    OverlayJoin(OverlayJoin),
    OverlayLeave(OverlayLeave),
    TopicSub(TopicSub),
    TopicUnsub(TopicUnsub),
    TopicConnect(TopicConnect),
    TopicDisconnect(TopicDisconnect),
    Event(Event),
    BlockGet(BlockGet),
    BlockPut(BlockPut),
    ObjectPin(ObjectPin),
    ObjectUnpin(ObjectUnpin),
    ObjectCopy(ObjectCopy),
    ObjectDel(ObjectDel),
    BranchHeadsReq(BranchHeadsReq),
    BranchSyncReq(BranchSyncReq),
}
/// Broker overlay request
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ClientRequestV0 {
    /// Request ID
    pub id: i64,

    /// Request content
    pub content: ClientRequestContentV0,
}

/// Broker overlay request
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ClientRequest {
    V0(ClientRequestV0),
}

impl ClientRequest {
    pub fn id(&self) -> i64 {
        match self {
            ClientRequest::V0(o) => o.id,
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            ClientRequest::V0(v0) => {
                v0.id = id;
            }
        }
    }
    pub fn content_v0(&self) -> &ClientRequestContentV0 {
        match self {
            ClientRequest::V0(o) => &o.content,
        }
    }
}

/// Content of `ClientResponseV0`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ClientResponseContentV0 {
    EmptyResponse,
    Block(Block),
    ObjectId(ObjectId),
    OverlayStatusResp(OverlayStatusResp),
}

/// Response to a `ClientRequest`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ClientResponseV0 {
    /// Request ID
    pub id: i64,

    /// Result (including but not limited to Result)
    pub result: u16,

    /// Response content
    pub content: ClientResponseContentV0,
}

/// Response to a `ClientRequest`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ClientResponse {
    V0(ClientResponseV0),
}

impl ClientResponse {
    pub fn id(&self) -> i64 {
        match self {
            ClientResponse::V0(o) => o.id,
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            ClientResponse::V0(v0) => {
                v0.id = id;
            }
        }
    }
    pub fn result(&self) -> u16 {
        match self {
            ClientResponse::V0(o) => o.result,
        }
    }
    pub fn block(&self) -> Option<&Block> {
        match self {
            ClientResponse::V0(o) => match &o.content {
                ClientResponseContentV0::Block(b) => Some(b),
                _ => panic!("this not a block response"),
            },
        }
    }
    pub fn object_id(&self) -> ObjectId {
        match self {
            ClientResponse::V0(o) => match &o.content {
                ClientResponseContentV0::ObjectId(id) => id.clone(),
                _ => panic!("this not an objectId response"),
            },
        }
    }
}

/// Content of `ClientMessageV0`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ClientMessageContentV0 {
    ClientRequest(ClientRequest),
    ClientResponse(ClientResponse),
    Event(Event),
}
/// Broker message for an overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ClientMessageV0 {
    pub overlay: OverlayId,
    pub content: ClientMessageContentV0,
    /// Optional padding
    #[serde(with = "serde_bytes")]
    pub padding: Vec<u8>,
}

/// Broker message for an overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ClientMessage {
    V0(ClientMessageV0),
}

impl ClientMessage {
    pub fn content_v0(&self) -> &ClientMessageContentV0 {
        match self {
            ClientMessage::V0(o) => &o.content,
        }
    }
    pub fn overlay_request(&self) -> &ClientRequest {
        match self {
            ClientMessage::V0(o) => match &o.content {
                ClientMessageContentV0::ClientRequest(r) => &r,
                _ => panic!("not an overlay request"),
            },
        }
    }
    pub fn overlay_id(&self) -> OverlayId {
        match self {
            ClientMessage::V0(o) => o.overlay,
        }
    }
    pub fn is_request(&self) -> bool {
        match self {
            ClientMessage::V0(o) => {
                matches!(o.content, ClientMessageContentV0::ClientRequest { .. })
            }
        }
    }
    pub fn is_response(&self) -> bool {
        match self {
            ClientMessage::V0(o) => {
                matches!(o.content, ClientMessageContentV0::ClientResponse { .. })
            }
        }
    }
    pub fn id(&self) -> i64 {
        match self {
            ClientMessage::V0(o) => match &o.content {
                ClientMessageContentV0::ClientResponse(r) => r.id(),
                ClientMessageContentV0::ClientRequest(r) => r.id(),
                ClientMessageContentV0::Event(_) => {
                    panic!("it is an event")
                }
            },
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            ClientMessage::V0(o) => match &mut o.content {
                ClientMessageContentV0::ClientResponse(ref mut r) => r.set_id(id),
                ClientMessageContentV0::ClientRequest(ref mut r) => r.set_id(id),
                ClientMessageContentV0::Event(_) => {
                    panic!("it is an event")
                }
            },
        }
    }
    pub fn result(&self) -> u16 {
        match self {
            ClientMessage::V0(o) => match &o.content {
                ClientMessageContentV0::ClientResponse(r) => r.result(),
                ClientMessageContentV0::ClientRequest(r) => {
                    panic!("it is not a response");
                }
                ClientMessageContentV0::Event(_) => {
                    panic!("it is not a response");
                }
            },
        }
    }
    pub fn block<'a>(&self) -> Option<&Block> {
        match self {
            ClientMessage::V0(o) => match &o.content {
                ClientMessageContentV0::ClientResponse(r) => r.block(),
                ClientMessageContentV0::ClientRequest(r) => {
                    panic!("it is not a response");
                }
                ClientMessageContentV0::Event(_) => {
                    panic!("it is not a response");
                }
            },
        }
    }
    pub fn object_id<'a>(&self) -> ObjectId {
        match self {
            ClientMessage::V0(o) => match &o.content {
                ClientMessageContentV0::ClientResponse(r) => r.object_id(),
                ClientMessageContentV0::ClientRequest(r) => {
                    panic!("it is not a response");
                }
                ClientMessageContentV0::Event(_) => {
                    panic!("it is not a response");
                }
            },
        }
    }
}

//
// EXTERNAL REQUESTS
//

/// Request object(s) by ID from a repository by non-members
///
/// The request is sent by a non-member to an overlay member node,
/// which has a replica of the repository.
///
/// The response includes the requested objects and all their children recursively,
/// and optionally all object dependencies recursively.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExtObjectGetV0 {
    /// Repository to request the objects from
    pub repo: PubKey,

    /// List of Object IDs to request, including their children
    pub ids: Vec<ObjectId>,

    /// Whether or not to include all children recursively
    pub include_children: bool,

    /// Expiry time after which the link becomes invalid
    pub expiry: Option<Timestamp>,
}

/// Request object(s) by ID from a repository by non-members
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ExtObjectGet {
    V0(ExtObjectGetV0),
}

/// Branch heads request
pub type ExtBranchHeadsReq = BranchHeadsReq;

/// Branch synchronization request
pub type ExtBranchSyncReq = BranchSyncReq;

/// Content of ExtRequestV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ExtRequestContentV0 {
    ExtObjectGet(ExtObjectGet),
    ExtBranchHeadsReq(ExtBranchHeadsReq),
    ExtBranchSyncReq(ExtBranchSyncReq),
}

/// External Request Payload V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExtRequestPayload {
    content: ExtRequestContentV0,
    // ...
}

/// External request with its request ID
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExtRequestV0 {
    /// Request ID
    pub id: i64,

    /// Request payload
    pub payload: ExtRequestPayload,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ExtRequest {
    V0(ExtRequestV0),
}

impl ExtRequest {
    pub fn id(&self) -> i64 {
        match self {
            ExtRequest::V0(v0) => v0.id,
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            ExtRequest::V0(v0) => {
                v0.id = id;
            }
        }
    }
}

/// Content of ExtResponseV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ExtResponseContentV0 {
    Block(Block),
    EventResp(EventResp),
    Event(Event),
}

/// Response to an ExtRequest
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExtResponseV0 {
    /// Request ID
    pub id: i64,

    /// Result code
    pub result: u16,

    /// Response content
    pub content: Option<ExtResponseContentV0>,
}

/// Response to an ExtRequest
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ExtResponse {
    V0(ExtResponseV0),
}

impl ExtResponse {
    pub fn id(&self) -> i64 {
        match self {
            ExtResponse::V0(v0) => v0.id,
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            ExtResponse::V0(v0) => {
                v0.id = id;
            }
        }
    }
}

impl TryFrom<ProtocolMessage> for ExtResponse {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::ExtResponse(ext_res) = msg {
            Ok(ext_res)
        } else {
            Err(ProtocolError::InvalidValue)
        }
    }
}

///
/// PROTOCOL MESSAGES
///

pub static MAGIC_NG_REQUEST: [u8; 2] = [78u8, 71u8];
pub static MAGIC_NG_RESPONSE: [u8; 4] = [89u8, 88u8, 78u8, 75u8];

#[derive(Clone, Debug)]
pub enum Authorization {
    Discover,
    ExtMessage,
    Core,
    Client((PubKey, Option<Option<[u8; 32]>>)),
    OverlayJoin(PubKey),
    Admin(PubKey),
}

/// ProbeResponse
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProbeResponse {
    /// Response Magic number
    #[serde(with = "serde_bytes")]
    pub magic: Vec<u8>,

    /// Used for discovery of broker on private LAN
    /// see ListenerV0.discoverable
    pub peer_id: Option<PubKey>,
}

/// RelayRequest
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RelayRequest {
    /// The BindAddress of the broker to relay to should be of the same IP family than the TunnelRequest.remote_addr
    pub address: BindAddress,
}

/// RelayResponse
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RelayResponse {
    /// Response Magic number
    #[serde(with = "serde_bytes")]
    pub magic: Vec<u8>,

    /// result to the relay request (accept, refuse)
    pub result: u16,
}

/// Tunnel Request
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TunnelRequest {
    /// Request Magic number
    #[serde(with = "serde_bytes")]
    pub magic: Vec<u8>,

    // Bind address of client as connected to the relaying broker.
    pub remote_addr: BindAddress,
}

/// Tunnel Response
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TunnelResponse {
    /// Response Magic number
    #[serde(with = "serde_bytes")]
    pub magic: Vec<u8>,

    /// result to the tunnel request (accept, refuse)
    pub result: u16,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ProtocolMessage {
    Probe([u8; 2]),
    ProbeResponse(ProbeResponse),
    Relay(RelayRequest),
    RelayResponse(RelayResponse),
    Tunnel(TunnelRequest),
    TunnelResponse(TunnelResponse),
    Noise(Noise),
    Start(StartProtocol),
    ServerHello(ServerHello),
    ClientAuth(ClientAuth),
    AuthResult(AuthResult),
    ExtRequest(ExtRequest),
    ExtResponse(ExtResponse),
    //AdminRequest(AdminRequest),
    AdminResponse(AdminResponse),
    ClientMessage(ClientMessage),
    CoreMessage(CoreMessage),
}

impl ProtocolMessage {
    pub fn id(&self) -> i64 {
        match self {
            ProtocolMessage::ExtRequest(ext_req) => ext_req.id(),
            ProtocolMessage::ExtResponse(ext_res) => ext_res.id(),
            ProtocolMessage::ClientMessage(client_msg) => client_msg.id(),
            _ => 0,
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            ProtocolMessage::ExtRequest(ext_req) => ext_req.set_id(id),
            ProtocolMessage::ExtResponse(ext_res) => ext_res.set_id(id),
            ProtocolMessage::ClientMessage(client_msg) => client_msg.set_id(id),
            _ => panic!("cannot set ID"),
        }
    }
    pub fn type_id(&self) -> TypeId {
        match self {
            ProtocolMessage::Noise(a) => a.type_id(),
            ProtocolMessage::Start(a) => a.type_id(),
            ProtocolMessage::ServerHello(a) => a.type_id(),
            ProtocolMessage::ClientAuth(a) => a.type_id(),
            ProtocolMessage::AuthResult(a) => a.type_id(),
            ProtocolMessage::ExtRequest(a) => a.type_id(),
            ProtocolMessage::ExtResponse(a) => a.type_id(),
            ProtocolMessage::ClientMessage(a) => a.type_id(),
            ProtocolMessage::CoreMessage(a) => a.type_id(),
            //ProtocolMessage::AdminRequest(a) => a.type_id(),
            ProtocolMessage::AdminResponse(a) => a.type_id(),
            ProtocolMessage::Probe(a) => a.type_id(),
            ProtocolMessage::ProbeResponse(a) => a.type_id(),
            ProtocolMessage::Relay(a) => a.type_id(),
            ProtocolMessage::RelayResponse(a) => a.type_id(),
            ProtocolMessage::Tunnel(a) => a.type_id(),
            ProtocolMessage::TunnelResponse(a) => a.type_id(),
        }
    }

    pub fn get_actor(&self) -> Box<dyn EActor> {
        match self {
            //ProtocolMessage::Noise(a) => a.get_actor(),
            ProtocolMessage::Start(a) => a.get_actor(),
            // ProtocolMessage::ServerHello(a) => a.get_actor(),
            // ProtocolMessage::ClientAuth(a) => a.get_actor(),
            // ProtocolMessage::AuthResult(a) => a.get_actor(),
            // ProtocolMessage::ExtRequest(a) => a.get_actor(),
            // ProtocolMessage::ExtResponse(a) => a.get_actor(),
            // ProtocolMessage::BrokerMessage(a) => a.get_actor(),
            _ => unimplemented!(),
        }
    }
}

///
/// AUTHENTICATION MESSAGES
///

/// Content of ClientAuthV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ClientAuthContentV0 {
    /// User pub key
    pub user: PubKey,

    /// Client pub key
    pub client: PubKey,

    pub info: ClientInfoV0,

    pub registration: Option<Option<[u8; 32]>>,

    /// Nonce from ServerHello
    #[serde(with = "serde_bytes")]
    pub nonce: Vec<u8>,
}

/// Client authentication
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ClientAuthV0 {
    /// Authentication data
    pub content: ClientAuthContentV0,

    /// Signature by user key
    pub sig: Sig,
}

/// Client authentication
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ClientAuth {
    V0(ClientAuthV0),
}

impl ClientAuth {
    pub fn content_v0(&self) -> ClientAuthContentV0 {
        match self {
            ClientAuth::V0(o) => o.content.clone(),
        }
    }
    pub fn sig(&self) -> Sig {
        match self {
            ClientAuth::V0(o) => o.sig,
        }
    }
    pub fn user(&self) -> PubKey {
        match self {
            ClientAuth::V0(o) => o.content.user,
        }
    }
    pub fn client(&self) -> PubKey {
        match self {
            ClientAuth::V0(o) => o.content.client,
        }
    }
    pub fn nonce(&self) -> &Vec<u8> {
        match self {
            ClientAuth::V0(o) => &o.content.nonce,
        }
    }
    pub fn registration(&self) -> Option<Option<[u8; 32]>> {
        match self {
            ClientAuth::V0(o) => o.content.registration,
        }
    }
}

impl From<ClientAuth> for ProtocolMessage {
    fn from(msg: ClientAuth) -> ProtocolMessage {
        ProtocolMessage::ClientAuth(msg)
    }
}

/// Authentication result
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AuthResultV0 {
    pub result: u16,
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

/// Authentication result
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AuthResult {
    V0(AuthResultV0),
}

impl AuthResult {
    pub fn result(&self) -> u16 {
        match self {
            AuthResult::V0(o) => o.result,
        }
    }
    pub fn metadata(&self) -> &Vec<u8> {
        match self {
            AuthResult::V0(o) => &o.metadata,
        }
    }
}

impl From<AuthResult> for ProtocolMessage {
    fn from(msg: AuthResult) -> ProtocolMessage {
        ProtocolMessage::AuthResult(msg)
    }
}

//
// DIRECT / OUT-OF-BAND MESSAGES
//

/// Link/invitation to the repository
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RepoLinkV0 {
    /// Repository public key ID
    pub id: PubKey,

    /// Repository secret
    pub secret: SymKey,

    /// current root branch definition commit
    pub root_branch_def_ref: ObjectRef,

    /// Peers to connect to
    pub peers: Vec<PeerAdvert>,
}

/// Link/invitation to the repository
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RepoLink {
    V0(RepoLinkV0),
}

impl RepoLink {
    pub fn id(&self) -> &PubKey {
        match self {
            RepoLink::V0(o) => &o.id,
        }
    }
    pub fn secret(&self) -> &SymKey {
        match self {
            RepoLink::V0(o) => &o.secret,
        }
    }
    pub fn peers(&self) -> &Vec<PeerAdvert> {
        match self {
            RepoLink::V0(o) => &o.peers,
        }
    }
}

/// Link to object(s) or to a branch from a repository
/// that can be shared to non-members
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ObjectLinkV0 {
    /// Request to send to an overlay peer
    pub req: ExtRequest,

    /// Keys for the root blocks of the requested objects
    pub keys: Vec<ObjectRef>,
}

/// Link to object(s) or to a branch from a repository
/// that can be shared to non-members
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ObjectLink {
    V0(ObjectLinkV0),
}

/// Owned repository with private key
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RepoKeysV0 {
    /// Repository private key
    pub key: PrivKey,

    /// Repository secret
    pub secret: SymKey,

    /// Peers to connect to
    pub peers: Vec<PeerAdvert>,
}

/// Owned repository with private key
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RepoKeys {
    V0(RepoKeysV0),
}

#[cfg(test)]
mod test {

    use crate::types::{BootstrapContentV0, BrokerServerTypeV0, BrokerServerV0, Invitation};
    use p2p_repo::types::PubKey;

    #[test]
    pub fn invitation() {
        let inv = Invitation::new_v0(
            BootstrapContentV0 {
                servers: vec![BrokerServerV0 {
                    server_type: BrokerServerTypeV0::Localhost(14400),
                    peer_id: PubKey::Ed25519PubKey([
                        95, 73, 225, 250, 3, 147, 24, 164, 177, 211, 34, 244, 45, 130, 111, 136,
                        229, 145, 53, 167, 50, 168, 140, 227, 65, 111, 203, 41, 210, 186, 162, 149,
                    ]),
                }],
            },
            Some("test invitation".to_string()),
            None,
        );

        println!("{:?}", inv.get_urls());
    }
}
