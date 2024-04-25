// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! NextGraph network protocol types
//!
//! Corresponds to the BARE schema

use crate::utils::{
    get_domain_without_port_443, is_ipv4_private, is_ipv6_private, is_private_ip, is_public_ip,
    is_public_ipv4, is_public_ipv6,
};
use crate::WS_PORT_ALTERNATE;
use crate::{actor::EActor, actors::*};
use core::fmt;
use ng_repo::errors::*;
use ng_repo::log::*;
use ng_repo::types::*;
use serde::{Deserialize, Serialize};
use std::{
    any::{Any, TypeId},
    net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr},
};
use web_time::SystemTime;

//
//  Network common types
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

//
// BROKER common types
//

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
    Public(Vec<BindAddress>),
    BoxPublicDyn(Vec<BindAddress>), // can be empty
    Domain(String),                 // accepts an optional trailing ":port" number
                                    //Core(Vec<BindAddress>),
}

/// BrokerServer details Version 0
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct BrokerServerV0 {
    /// Network addresses
    pub server_type: BrokerServerTypeV0,

    /// is this server capable of running a verifier
    pub can_verify: bool,

    /// is this server capable of forwarding client connections to another broker
    pub can_forward: bool,

    /// peerId of the server
    pub peer_id: PubKey,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum BrokerServer {
    V0(BrokerServerV0),
}

impl BrokerServerV0 {
    pub fn new_localhost(peer_id: PubKey) -> Self {
        BrokerServerV0 {
            server_type: BrokerServerTypeV0::Localhost(WS_PORT_ALTERNATE[0]),
            can_verify: false,
            can_forward: true,
            peer_id,
        }
    }
}

#[doc(hidden)]
pub const APP_ACCOUNT_REGISTERED_SUFFIX: &str = "/#/user/registered";

#[doc(hidden)]
pub const NG_ONE_URL: &str = "https://nextgraph.one";

#[doc(hidden)]
pub const APP_NG_ONE_URL: &str = "https://app.nextgraph.one";

#[doc(hidden)]
pub const APP_NG_ONE_WS_URL: &str = "wss://app.nextgraph.one";

#[allow(dead_code)]
fn api_dyn_peer_url(peer_id: &PubKey) -> String {
    format!("https://nextgraph.one/api/v1/dynpeer/{}", peer_id)
}

#[doc(hidden)]
pub const LOCAL_HOSTS: [&str; 3] = ["localhost", "127.0.0.1", "[::1]"];

fn local_ws_url(port: &u16) -> String {
    format!("ws://localhost:{}", if *port == 0 { 80 } else { *port })
}
#[doc(hidden)]
pub(crate) fn local_http_url(port: &u16) -> String {
    format!("http://localhost:{}", if *port == 0 { 80 } else { *port })
}

#[doc(hidden)]
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
            BrokerServerTypeV0::Public(addrs) => {
                Self::app_ng_one_bootstrap_url_with_first_ipv6_or_ipv4(
                    ipv4,
                    ipv6,
                    addrs,
                    self.peer_id,
                )
            }
            BrokerServerTypeV0::BoxPublicDyn(addrs) => {
                // let resp = reqwest::get(api_dyn_peer_url(&self.peer_id)).await;
                // if resp.is_ok() {
                //     let resp = resp.unwrap().json::<Vec<BindAddress>>().await;
                //     if resp.is_ok() {
                //         return Self::app_ng_one_bootstrap_url_with_first_ipv6_or_ipv4(
                //             ipv4,
                //             ipv6,
                //             &resp.unwrap(),
                //             self.peer_id,
                //         );
                //     }
                // }
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
        }
    }

    pub fn is_public_server(&self) -> bool {
        match &self.server_type {
            BrokerServerTypeV0::Localhost(_) => false,
            BrokerServerTypeV0::BoxPrivate(_) => false,
            BrokerServerTypeV0::Public(_) => true,
            BrokerServerTypeV0::BoxPublicDyn(_) => true,
            BrokerServerTypeV0::Domain(_) => true,
        }
    }

    /// on web browser, returns the connection URL and an optional list of BindAddress if a relay is needed
    /// filtered by the current location url of the webpage
    /// on native apps (do not pass a location), returns or the connection URL without optional BindAddress or an empty string with
    /// several BindAddresses to try to connect to with .to_ws_url()
    pub async fn get_ws_url(
        &self,
        location: &Option<String>,
    ) -> Option<(String, Vec<BindAddress>)> {
        if location.is_some() {
            let location = location.as_ref().unwrap();
            if location.starts_with(APP_NG_ONE_URL) {
                match &self.server_type {
                    BrokerServerTypeV0::Public(addrs) => {
                        Some((APP_NG_ONE_WS_URL.to_string(), addrs.clone()))
                    }
                    BrokerServerTypeV0::BoxPublicDyn(addrs) => {
                        // let resp = reqwest::get(api_dyn_peer_url(&self.peer_id)).await;
                        // if resp.is_ok() {
                        //     let resp = resp.unwrap().json::<Vec<BindAddress>>().await;
                        //     if resp.is_ok() {
                        //         return Some((APP_NG_ONE_WS_URL.to_string(), resp.unwrap()));
                        //     }
                        // }
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
                BrokerServerTypeV0::Public(addrs) => Some((String::new(), addrs.clone())),
                BrokerServerTypeV0::BoxPublicDyn(addrs) => {
                    // let resp = reqwest::get(api_dyn_peer_url(&self.peer_id)).await;
                    // if resp.is_ok() {
                    //     let resp = resp.unwrap().json::<Vec<BindAddress>>().await;
                    //     if resp.is_ok() {
                    //         return Some((String::new(), resp.unwrap()));
                    //     }
                    // }
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
    pub fn new_localhost(peer_id: PubKey) -> Self {
        BootstrapContentV0 {
            servers: vec![BrokerServerV0::new_localhost(peer_id)],
        }
    }
    pub fn new_empty() -> Self {
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

    pub fn get_domain(&self) -> Option<String> {
        for server in self.servers.iter() {
            if let BrokerServerTypeV0::Domain(name) = &server.server_type {
                return Some(name.clone());
            }
        }
        None
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

/// Local Bootstrap info Version 0, served at /.ng_bootstrap
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LocalBootstrapInfoV0 {
    /// list of servers, in order of preference
    pub bootstrap: BootstrapContentV0,

    /// optional registration_url for public server that accept to be BSP for new clients
    pub registration_url: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum LocalBootstrapInfo {
    V0(LocalBootstrapInfoV0),
}

impl LocalBootstrapInfo {
    pub fn servers(&self) -> &Vec<BrokerServerV0> {
        match self {
            Self::V0(v0) => &v0.bootstrap.servers,
        }
    }
}

impl From<LocalBootstrapInfo> for Invitation {
    fn from(value: LocalBootstrapInfo) -> Self {
        let LocalBootstrapInfo::V0(info) = value;
        let name = info.bootstrap.get_domain();
        let url = info.registration_url.clone();
        Invitation::V0(InvitationV0 {
            bootstrap: info.bootstrap,
            code: None,
            name,
            url,
        })
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
            bootstrap: BootstrapContentV0::new_empty(),
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
            bootstrap: BootstrapContentV0::new_empty(),
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

// impl From<BootstrapContent> for Invitation {
//     fn from(value: BootstrapContent) -> Self {
//         let BootstrapContent::V0(boot) = value;
//         let name = boot.get_domain();
//         Invitation::V0(InvitationV0 {
//             bootstrap: boot,
//             code: None,
//             name,
//             url: None,
//         })
//     }
// }

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
///
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
    /// domain can take an optional port (trailing `:port`)
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
            AcceptForwardForV0::PublicStatic((_ipv4, ipv6, _)) => {
                //let _res = vec![ipv4.clone()];
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

    /// force a private or localhost interface to be accepted as a core interface
    pub private_core: bool,

    /// should the server serve the app files in HTTP mode (not WS). this setting will be discarded and app will not be served anyway if remote IP is public or listener is public
    pub serve_app: bool,

    /// when the box is behind a DMZ, and ipv6 is enabled, the private interface will get the external public IpV6. with this option we allow binding to it
    pub bind_public_ipv6: bool,

    /// default to false. Set to true by --core (use --core-with-clients to override to false). only useful for a public IP listener, if the clients should use another listener like --domain or --domain-private.
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
            private_core: false,
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
            AcceptForwardForV0::No => {
                self.if_type == InterfaceType::Public
                    || (self.private_core && self.if_type != InterfaceType::Invalid)
            }
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
                    res.push(BrokerServerTypeV0::Public(pub_addrs));
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
                //// this is removed since a server serving domain requests often needs a local interface too (for ngaccount), but does not want to expose this local interface to clients.
                // if self.accept_direct {
                //     if self.if_type == InterfaceType::Private {
                //         res.push(BrokerServerTypeV0::BoxPrivate(addrs));
                //     } else if self.if_type == InterfaceType::Loopback {
                //         res.push(BrokerServerTypeV0::Localhost(addrs[0].port));
                //     }
                // }
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
                        res.push(BrokerServerTypeV0::Public(addrs));
                    }
                } else if self.if_type == InterfaceType::Private {
                    res.push(BrokerServerTypeV0::BoxPrivate(addrs));
                }
            }
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

/// Overlay Access
///
/// Used by the Client when opening or pinning a repo.
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum OverlayAccess {
    /// The repo will be accessed on the Outer Overlay in Read Only mode
    /// This can be used for Public, Protected or Group overlays
    /// Value should be an OverlayId::Outer
    ReadOnly(OverlayId),
    /// The repo will be accessed on the Inner Overlay in Write mode, and the associated Outer overlay is also given
    /// This is used for Public, Protected and Group overlays
    /// First value in tuple should be the OverlayId::Inner, second the OverlayId::Outer
    ReadWrite((OverlayId, OverlayId)),
    /// The repo will be accessed on the Inner Overlay in Write mode, and it doesn't have an Outer overlay
    /// This is used for Private and Dialog overlays
    /// Value should be an OverlayId::Inner
    WriteOnly(OverlayId),
}

impl OverlayAccess {
    pub fn new_ro(outer_overlay: OverlayId) -> Result<Self, NgError> {
        if let OverlayId::Outer(_digest) = outer_overlay {
            Ok(OverlayAccess::ReadOnly(outer_overlay))
        } else {
            Err(NgError::InvalidArgument)
        }
    }
    pub fn new_rw(inner_overlay: OverlayId, outer_overlay: OverlayId) -> Result<Self, NgError> {
        if let OverlayId::Inner(_digest) = inner_overlay {
            if let OverlayId::Outer(_digest) = outer_overlay {
                Ok(OverlayAccess::ReadWrite((inner_overlay, outer_overlay)))
            } else {
                Err(NgError::InvalidArgument)
            }
        } else {
            Err(NgError::InvalidArgument)
        }
    }
    pub fn new_wo(inner_overlay: OverlayId) -> Result<Self, NgError> {
        if let OverlayId::Inner(_digest) = inner_overlay {
            Ok(OverlayAccess::WriteOnly(inner_overlay))
        } else {
            Err(NgError::InvalidArgument)
        }
    }
    pub fn overlay_id_for_client_protocol_purpose(&self) -> &OverlayId {
        match self {
            Self::ReadOnly(ro) => ro,
            Self::ReadWrite((inner, outer)) => inner,
            Self::WriteOnly(wo) => wo,
        }
    }
}

/// Inner Overlay Link
///
/// Details of the inner overlay of an NgLink
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InnerOverlayLink {
    /// overlay public key ID
    pub id: StoreOverlay,

    /// The store has a special branch called `overlay` that is used to manage access to the InnerOverlay
    /// only the ReadCapSecret is needed to access the InnerOverlay
    /// the full readcap of this branch is needed in order to subscribe to the topic and decrypt the events. The branchId can be found in the branch Definition
    /// it can be useful to subscribe to this topic if the user is a member of the store's repo, so it will be notified of refreshReadCap on the overlay
    /// if the user is an external user to the store, it will lose access to the InnerOverlay after a RefreshReadCap of the overlay branch of the store.
    pub store_overlay_readcap: ReadCap,
}

/// Overlay Link
///
/// Details of the overlay of an NgLink
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum OverlayLink {
    Outer(StoreOverlay),
    Inner(InnerOverlayLink),
    Inherit,
}

/// Overlay session ID
///
/// It is a pubkey used for signing all OverlayMessage sent by the peer.
/// Each peer generates it randomly when (re)joining the overlay network.
pub type SessionId = PubKey;

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
    Box,
    Stick,
    WalletMaster,
    ClientBroker,
    Cli,
}

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

/// Overlay leave request
///
/// In outerOverlay: informs the broker that the overlay is not needed anymore
/// In innerOverlay: Sent to all connected overlay participants to terminate a session
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum OverlayLeave {
    V0(),
}

/// Content of PublisherAdvertV0
///
/// the peer is matched with the InnerOverlayMessageV0.Session -> peerId.
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct PublisherAdvertContentV0 {
    /// Topic public key
    pub topic: TopicId,

    /// Peer public key
    pub peer: DirectPeerId,
}

/// Topic advertisement by a publisher
///
/// Flooded to all peers in overlay
/// Creates subscription routing table entries
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct PublisherAdvertV0 {
    pub content: PublisherAdvertContentV0,

    /// Signature over content by topic key
    pub sig: Sig,
}

/// Topic advertisement by a publisher
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum PublisherAdvert {
    V0(PublisherAdvertV0),
}

use ng_repo::utils::sign;

impl PublisherAdvert {
    pub fn new(
        topic_id: TopicId,
        topic_key: BranchWriteCapSecret,
        broker_peer: DirectPeerId,
    ) -> PublisherAdvert {
        let content = PublisherAdvertContentV0 {
            peer: broker_peer,
            topic: topic_id,
        };
        let content_ser = serde_bare::to_vec(&content).unwrap();
        let sig = sign(&topic_key, &topic_id, &content_ser).unwrap();
        PublisherAdvert::V0(PublisherAdvertV0 { content, sig })
    }
    pub fn topic_id(&self) -> &TopicId {
        match self {
            Self::V0(v0) => &v0.content.topic,
        }
    }
}

/// Topic subscription request by a peer
///
/// Forwarded towards all publishers along subscription routing table entries
/// that are created by PublisherAdverts
/// Creates event routing table entries along the path
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct SubReqV0 {
    /// Topic public key
    pub topic: TopicId,

    /// For initial subscription, should be None,
    /// When updating a subscription after a new publisher has joined (with a PublisherAdvert),
    /// then the target publisher should be entered here.
    /// The brokers will only forward the SubscriptionRequest to that publisher (on all available paths)
    pub publisher: Option<DirectPeerId>,
}

/// Topic subscription request by a peer
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum SubReq {
    V0(SubReqV0),
}

/// Topic subscription marker sent by all publishers, back to subscriber
///
/// Forwarded to all subscribers.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SubMarkerV0 {
    /// The publisher broker that marks its starting cut
    /// TODO: that could be omitted, because we can retrieve it with the SessionId
    pub publisher: DirectPeerId,

    /// The subscribed topic
    pub topic: TopicId,

    /// The subscriber
    pub subscriber: DirectPeerId,

    /// Current heads at the broker when receiving the SubReq. Can be used to safely do a CoreTopicSyncReq
    pub known_heads: Vec<ObjectId>,
}

/// Topic subscription acknowledgement by a publisher
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum SubMarker {
    V0(SubMarkerV0),
}

/// Topic unsubscription request by a subscriber
///
/// A broker unsubscribes from all publisher brokers in the overlay
/// when it has no more local subscribers left
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

/// Object search in a pub/sub topic
///
/// Sent along the reverse path of a pub/sub topic
/// from a subscriber to one publisher at a time.
/// fanout is always 1
/// if result is none, tries another path if several paths available locally
/// answered with a stream of BlockResult
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BlockSearchTopicV0 {
    /// Topic to forward the request in
    pub topic: TopicId,

    /// Also search in subscribers
    pub search_in_subs: bool,

    /// List of Object IDs to request
    pub ids: Vec<ObjectId>,

    /// Whether or not to include all children recursively in the response
    pub include_children: bool,

    /// List of Peer IDs the request traversed so far
    pub path: Vec<PeerId>,
}

/// Object request by ID to publishers
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BlockSearchTopic {
    V0(BlockSearchTopicV0),
}

/// Block search along a random walk in the overlay
///
/// fanout is always 1
/// if result is none, tries another path if several paths available locally
/// answered with a stream BlockResult
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BlockSearchRandomV0 {
    /// List of Block IDs to request
    pub ids: Vec<BlockId>,

    /// Whether or not to include all children recursively in the response
    pub include_children: bool,

    /// Number of random nodes to forward the request to at each step
    // pub fanout: u8,
    // for now fanout is always 1

    /// List of Broker Peer IDs the request traversed so far
    pub path: Vec<DirectPeerId>,
}

/// Block request by ID using a random walk in the overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BlockSearchRandom {
    V0(BlockSearchRandomV0),
}

/// Response to a BlockSearch* request
///
/// can be a stream
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BlockResultV0 {
    /// Resulting Blocks(s)
    pub payload: Vec<Block>,
}

/// Response to a BlockSearch* request
///
/// can be a stream
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BlockResult {
    V0(BlockResultV0),
}

/// Topic synchronization request
///
/// In response a stream of `TopicSyncRes`s containing the missing Commits or events are sent
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TopicSyncReqV0 {
    /// Topic public key
    pub topic: TopicId,

    /// Fully synchronized until these commits
    pub known_heads: Vec<ObjectId>,

    /// Stop synchronizing when these commits are met.
    /// if empty, the local HEAD at the responder is used instead
    pub target_heads: Vec<ObjectId>,
}

/// Topic synchronization request
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum TopicSyncReq {
    V0(TopicSyncReqV0),
}

impl TopicSyncReq {
    pub fn topic(&self) -> &TopicId {
        match self {
            TopicSyncReq::V0(o) => &o.topic,
        }
    }
    pub fn known_heads(&self) -> &Vec<ObjectId> {
        match self {
            TopicSyncReq::V0(o) => &o.known_heads,
        }
    }
}

/// Status of a Forwarded Peer, sent in the Advert
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum PeerStatus {
    Connected,
    Disconnected,
}

/// ForwardedPeerAdvertV0
///
/// peer_advert.forwarded_by is matched with sessionid->peerid
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ForwardedPeerAdvertV0 {
    /// PeerAdvert received from Client
    // TODO: this could be obfuscated when user doesnt want to recall events.
    pub peer_advert: PeerAdvertV0,

    /// Hashed user Id, used to prevent concurrent connection from different brokers
    /// BLAKE3 keyed hash over the UserId
    ///   - key: BLAKE3 derive_key ("NextGraph UserId Hash Overlay Id ForwardedPeerAdvertV0 BLAKE3 key", overlayId) // will always be an Inner overlay
    pub user_hash: Digest,

    /// whether the Advert is about connection or disconnection
    pub status: PeerStatus,
}

/// Forwarded Peer advertisement
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ForwardedPeerAdvert {
    V0(ForwardedPeerAdvertV0),
}

/// ForwardedPeerConflictV0
///
/// peer_advert.forwarded_by is matched with sessionid->peerid
/// When the forwarding broker receives the conflict (or notices it), it sends a notification
/// In order to avoid conflicts, the highest version of PeerAdvert should win, when the Forwarding Broker is different.
/// Disconnect wins over connect, for the exact same peer, version and forwarding broker.
/// Conflict can occur when same user_hash, on 2 different Forwarding Broker
/// Or when same peerId appears on 2 different Forwarding Broker.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ForwardedPeerConflictV0 {
    /// First conflicting PeerAdvert
    pub advert_1: ForwardedPeerAdvertV0,
    /// Second conflicting PeerAdvert
    pub advert_2: ForwardedPeerAdvertV0,

    pub error_code: u16,
}

/// Forwarded Peer advertisement conflict
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ForwardedPeerConflict {
    V0(ForwardedPeerConflictV0),
}

/// Content of PeerAdvertV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PeerAdvertContentV0 {
    /// Peer ID
    pub peer: PeerId,

    /// Id of the broker that is forwarding the peer
    pub forwarded_by: Option<DirectPeerId>,

    /// Topic subscriptions
    // pub subs: BloomFilter128,

    /// Network addresses, must be empty for forwarded peers
    pub address: Vec<NetAddr>,

    /// Version number
    pub version: u32,

    /// App-specific metadata (profile, cryptographic material, etc)
    #[serde(with = "serde_bytes")]
    pub metadata: Vec<u8>,
}

/// Peer advertisement
///
/// Sent when a peer joins an inner overlay.
/// Used only for forwardedPeer for now.
/// In the future, Core brokers could exchange PeerAdvert on the global overlay, and also do some PeerSearch to search for IPs/newer version of PeerAdvert
/// When the forwarding broker receives a client connection, it checks that the peer isn't
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PeerAdvertV0 {
    /// Peer advertisement content
    pub content: PeerAdvertContentV0,

    /// Signature over content by peer's private key
    pub sig: Sig,
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

/// Content of InnerOverlayMessageV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum InnerOverlayMessageContentV0 {
    OverlayLeave(OverlayLeave),
    ForwardedPeerAdvert(ForwardedPeerAdvert),
    ForwardedPeerConflict(ForwardedPeerConflict),
    PublisherJoined(PublisherAdvert),
    PublisherLeft(PublisherAdvert),
    SubReq(SubReq),
    SubMarker(SubMarker),
    UnsubReq(UnsubReq),
    Event(Event),
    //PostInboxRequest(PostInboxRequest),
    //PostInboxResponse(PostInboxResponse),
}

/// Inner Overlay message payload V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InnerOverlayMessagePayloadV0 {
    /// Sequence number incremented by peer when sending every overlay message in a session
    /// Used to prevent replay attacks inside the overlay
    pub seq: u64,

    pub content: InnerOverlayMessageContentV0,
}

/// Inner Overlay message V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InnerOverlayMessageV0 {
    /// Session ID
    pub session: SessionId,

    pub payload: InnerOverlayMessagePayloadV0,

    /// Signature with Session private key, over payload
    pub sig: Sig,

    /// Optional padding
    #[serde(with = "serde_bytes")]
    pub padding: Vec<u8>,
}

/// Inner Overlay message
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum InnerOverlayMessage {
    V0(InnerOverlayMessageV0),
}

/// Overlay Advert Payload V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OverlayAdvertPayloadV0 {
    /// the target Overlay ID (cannot be an Outer overlay)
    pub overlay: OverlayId,

    /// the newly generated session ID the peer will use in this overlay
    /// All the revoked sessionIDs are kept locally by their initiator.
    pub session: SessionId,

    /// Current sequence number. For a new session, must be zero.
    pub seq: u64,

    /// the previous session ID the peer was using in this overlay. Used to cleanup seq counters maintained in each other peer
    /// if the previous session is empty (because it is the first time broker joins this overlay)
    /// or if a remote peer doesn't find this session kept locally, it is not an error.
    /// In the later case (if broker missed some intermediary sessions), the remote peer can ask the initiator peer if the last known
    /// session can be locally revoked with a ConfirmRevokedSession message (answered with yes or no)
    pub previous_session: Option<SessionId>,

    /// peer ID of the broker issuing this Advert
    pub peer: DirectPeerId,
}

/// Overlay Advert V0 : used by a broker peer every time it (re)joins an overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OverlayAdvertV0 {
    pub payload: OverlayAdvertPayloadV0,

    /// Signature with peerId private key, over payload
    pub sig: Sig,
}

/// Overlay Advert : used by a broker peer every time it (re)joins an overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OverlayAdvert {
    V0(OverlayAdvertV0),
}

/// CoreBrokerJoinedAdvert V0
///
/// Each broker that is already part of an overlay, when receiving the CoreBrokerJoinedAdvert, should answer with one direct message
/// to the joining peer (found in OverlayAdvertPayloadV0.peer) for each overlay, containing an OverlayAdvertMarker containing their current sequence number.
/// This is sent for each path (in case multiple paths arrive to the same broker). Only the first sequence number received by joining peer is kept locally
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreBrokerJoinedAdvertV0 {
    /// list of overlays joined by an initiator broker, and that the forwarding broker has also previously joined
    /// the forwarding broker keeps the ingress edge and all egress edges in the coreRoutingTable
    pub overlays: Vec<OverlayAdvertV0>,
}

/// CoreBrokerLeftAdvert V0
///
/// A broker has disconnected from another broker, and the routes need to be updated
/// this is not used to leave one specific overlay. see OverlayLeave message for that purpose
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreBrokerLeftAdvertV0 {
    /// The broker that disconnected from the one that is emitting this advert.
    pub disconnected: DirectPeerId,
}

/// CoreOverlayJoinedAdvert V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreOverlayJoinedAdvertV0 {
    /// One additional overlay joined by an initiator broker, and that the forwarding broker has also previously joined
    /// the forwarding broker keeps the ingress edge and all egress edges in the coreRoutingTable
    pub overlay: OverlayAdvertV0,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreBrokerJoinedAdvert {
    V0(CoreBrokerJoinedAdvertV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreBrokerLeftAdvert {
    V0(CoreBrokerLeftAdvertV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreOverlayJoinedAdvert {
    V0(CoreOverlayJoinedAdvertV0),
}

/// Content of CoreAdvert V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreAdvertContentV0 {
    BrokerJoined(CoreBrokerJoinedAdvert),
    BrokerLeft(CoreBrokerLeftAdvert),
    OverlayJoined(CoreOverlayJoinedAdvert),
}

/// CoreAdvert V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreAdvertV0 {
    pub content: CoreAdvertContentV0,

    /// list of brokers on the path that was followed to deliver this advert.
    /// new entry pushed each time a forward is happening in the core network
    pub path: Vec<DirectPeerId>,

    /// content signed by the first broker in the path
    pub sig: Sig,

    /// Optional padding
    #[serde(with = "serde_bytes")]
    pub padding: Vec<u8>,
}

/// OverlayAdvertMarker V0
///
/// when receiving a marker, the broker saves the ingress edge and the corresponding remote peer and
/// overlay that can be reached (the OverlayAdvertPayloadV0.peer and .overlay) in the CoreRoutingTable
/// It also saves the sessionId and seq number
/// then a ReturnPathTimingAdvert is sent back
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OverlayAdvertMarkerV0 {
    pub marker: OverlayAdvertV0,

    /// New SessionId that triggered this marker (to avoid replay attacks in the core network)
    pub in_reply_to: SessionId,

    /// path from the new broker who started a session, to the broker that is sending the marker
    pub path: Vec<DirectPeerId>,

    /// randomly generated nonce used for the reply (a ReturnPathTimingMarker) that will be sent back after this marker has been received on the other end
    pub reply_nonce: u64,
}

/// Core Block Get V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreBlockGetV0 {
    /// Block ID to request
    pub ids: Vec<BlockId>,

    /// Whether or not to include all children recursively
    pub include_children: bool,

    /// randomly generated number by requester, used for sending reply.
    /// the requester keeps track of req_nonce and requested peerid.
    /// used for handling the stream
    pub req_nonce: u64,
}

/// Core Block Result V0
///
/// can be a stream
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreBlockResultV0 {
    /// Resulting Object(s)
    pub payload: Vec<Block>,

    /// randomly generated number by requester, as received in the request
    pub req_nonce: u64,
}

/// ReturnPathTimingAdvertV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReturnPathTimingAdvertV0 {
    /// Signature over nonce, by sessionId
    pub sig: Sig,

    /// randomly generated number as received in the OverlayAdvertMarker
    pub nonce: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OverlayAdvertMarker {
    V0(OverlayAdvertMarkerV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ReturnPathTimingAdvert {
    V0(ReturnPathTimingAdvertV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreBlockGet {
    V0(CoreBlockGetV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreBlockResult {
    V0(CoreBlockResultV0),
}

/// Content of CoreDirectMessage V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreDirectMessageContentV0 {
    OverlayAdvertMarker(OverlayAdvertMarker),
    ReturnPathTimingAdvert(ReturnPathTimingAdvert),
    BlockGet(CoreBlockGet),
    BlockResult(CoreBlockResult),
    //PostInbox,
    //PartialSignature,
    //ClientDirectMessage //for messages between forwarded or direct peers
}

/// CoreDirectMessage V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreDirectMessageV0 {
    pub content: CoreDirectMessageContentV0,

    /// list of brokers on the path that must be followed to deliver this message, next hop is at the bottom of the list.
    /// last entry on the list is popped each time a broker is forwarding upstream
    /// when list size is zero, the final destination is reached.
    /// if only one peer in list, and peer not found in local CoreRoutingTable, use the best route to reach it (without popping)
    pub reverse_path: Vec<DirectPeerId>,

    /// The sender
    pub from: DirectPeerId,

    /// content signed by the sender
    pub sig: Sig,

    /// Optional padding
    #[serde(with = "serde_bytes")]
    pub padding: Vec<u8>,
}

/// CoreBrokerConnect V0
///
/// replied with CoreBrokerConnectResponse
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreBrokerConnectV0 {
    pub inner_overlays: Vec<OverlayAdvertV0>,
    pub outer_overlays: Vec<Digest>,
}

/// CoreBrokerConnect
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreBrokerConnect {
    V0(CoreBrokerConnectV0),
}

/// CoreBrokerConnectResponse
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreBrokerConnectResponse {
    V0(CoreBrokerConnectResponseV0),
}

impl CoreBrokerConnect {
    pub fn core_message(&self, id: i64) -> CoreMessage {
        match self {
            CoreBrokerConnect::V0(v0) => {
                CoreMessage::V0(CoreMessageV0::Request(CoreRequest::V0(CoreRequestV0 {
                    padding: vec![],
                    id,
                    content: CoreRequestContentV0::BrokerConnect(CoreBrokerConnect::V0(v0.clone())),
                })))
            }
        }
    }
}

/// sent to a direct peer just before closing the connection
pub type CoreBrokerDisconnectV0 = ();

/// Content of CoreOverlayJoin V0
///
/// replied with an emptyResponse, and an error code if OverlayId not present on remote broker
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreOverlayJoinV0 {
    Inner(OverlayAdvert),
    Outer(Digest),
}

/// Content of OuterOverlayResponse V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OuterOverlayResponseContentV0 {
    EmptyResponse(()),
    Block(Block),
    TopicSyncRes(TopicSyncRes),
    //PostInboxResponse(PostInboxResponse),
}

/// Content of OuterOverlayRequest V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OuterOverlayRequestContentV0 {
    TopicSyncReq(TopicSyncReq),
    OverlayLeave(OverlayLeave),
    TopicSub(PubKey),
    TopicUnsub(PubKey),
    BlockGet(BlockGet),
    //PostInboxRequest(PostInboxRequest),
}

/// OuterOverlayRequestV0 V0
///
/// replied with OuterOverlayResponseV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OuterOverlayRequestV0 {
    pub overlay: Digest,
    pub content: OuterOverlayRequestContentV0,
}

/// OuterOverlayResponse V0
///
/// reply to an OuterOverlayRequest V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OuterOverlayResponseV0 {
    pub overlay: Digest,
    pub content: OuterOverlayResponseContentV0,
}

/// Core Topic synchronization request
///
/// behaves like BlockSearchTopic (primarily searches among the publishers, except if search_in_subs is set to true)
/// fanout is 1 for now
///
/// If some target_heads are not found locally, all successors of known_heads are sent anyway,
/// and then this temporary HEAD is used to propagate/fanout the CoreTopicSyncReq to upstream brokers
///
/// Answered with one or many TopicSyncRes a stream of `Block`s or Event of the commits
/// If the responder has an Event for the commit(s) in its HEAD, it will send the event instead of the plain commit's blocks.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreTopicSyncReqV0 {
    /// Topic public key
    pub topic: TopicId,

    /// Also search in subscribers, in addition to publishers
    pub search_in_subs: bool,

    /// Fully synchronized until these commits
    pub known_heads: Vec<ObjectId>,

    /// Stop synchronizing when these commits are met.
    /// if empty, the local HEAD at the responder is used instead
    pub target_heads: Vec<ObjectId>,
}

/// Topic synchronization request
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreTopicSyncReq {
    V0(CoreTopicSyncReqV0),
}

/// Topic synchronization response V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum TopicSyncResV0 {
    Event(Event),
    Block(Block),
}

/// Topic synchronization response
///
/// it is a stream of blocks and or events.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum TopicSyncRes {
    V0(TopicSyncResV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreBrokerDisconnect {
    V0(CoreBrokerDisconnectV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreOverlayJoin {
    V0(CoreOverlayJoinV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OuterOverlayRequest {
    V0(OuterOverlayRequestV0),
}

/// Content of CoreRequest V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreRequestContentV0 {
    BrokerConnect(CoreBrokerConnect),
    BrokerDisconnect(CoreBrokerDisconnect),
    OverlayJoin(CoreOverlayJoin),
    BlockSearchTopic(BlockSearchTopic),
    BlockSearchRandom(BlockSearchRandom),
    TopicSyncReq(CoreTopicSyncReq),
    OuterOverlayRequest(OuterOverlayRequest),
}

/// CoreRequest V0
///
/// replied with CoreResponse V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreRequestV0 {
    /// Request ID
    pub id: i64,
    pub content: CoreRequestContentV0,

    /// Optional padding
    #[serde(with = "serde_bytes")]
    pub padding: Vec<u8>,
}

/// Request sent to a broker in the core network
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreRequest {
    V0(CoreRequestV0),
}

/// CoreBrokerConnectResponse V0
///
/// reply to a CoreBrokerConnect V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreBrokerConnectResponseV0 {
    pub successes: Vec<OverlayId>,
    pub errors: Vec<OverlayId>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OuterOverlayResponse {
    V0(OuterOverlayResponseV0),
}

/// Content CoreResponse V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreResponseContentV0 {
    BrokerConnectResponse(CoreBrokerConnectResponse),
    BlockResult(BlockResult),
    TopicSyncRes(TopicSyncRes),
    OuterOverlayResponse(OuterOverlayResponse),
    EmptyResponse(()),
}

/// CoreResponse V0
///
/// reply to a CoreRequest V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CoreResponseV0 {
    /// Request ID
    pub id: i64,

    /// Result
    pub result: u16,
    pub content: CoreResponseContentV0,

    /// Optional padding
    #[serde(with = "serde_bytes")]
    pub padding: Vec<u8>,
}

/// Response to a Request sent to a broker in the core network
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreResponse {
    V0(CoreResponseV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OuterOverlayMessageContentV0 {
    Event(Event),
}

/// OuterOverlayMessage V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OuterOverlayMessageV0 {
    pub overlay: Digest,

    pub content: OuterOverlayMessageContentV0,

    /// Optional padding
    #[serde(with = "serde_bytes")]
    pub padding: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreAdvert {
    V0(CoreAdvertV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreDirectMessage {
    V0(CoreDirectMessageV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OuterOverlayMessage {
    V0(OuterOverlayMessageV0),
}

/// CoreMessageV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CoreMessageV0 {
    Request(CoreRequest),
    Response(CoreResponse),
    Advert(CoreAdvert),
    Direct(CoreDirectMessage),
    InnerOverlay(InnerOverlayMessage),
    OuterOverlay(OuterOverlayMessage),
}

/// Core message
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

/// Request to open a repo in a non-durable way (without pinning it).
///
/// When client will disconnect, the subscriptions and publisherAdvert of the topics will be removed,
/// except if a PinRepo occurred before or after the OpenRepo
/// replied with a RepoOpened
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenRepoV0 {
    /// Repo Hash
    pub hash: RepoHash,

    // for RW overlay, the overlay that should be used in the clientmessage is the innerOverlay
    pub overlay: OverlayAccess,

    /// Broker peers to connect to in order to join the overlay
    /// can be empty for private store (the broker will not connect to any other broker)
    /// but if the private repo is pinned in other brokers, those brokers should be entered here for syncing.
    /// can be empty also when we just created the repo, and there are no other brokers in the overlay
    pub peers: Vec<PeerAdvert>,

    /// a list of core brokers that are allowed to connect to the overlay (only valid for an inner (RW/WO) overlay).
    /// an empty list means any core broker is allowed. this is the default behaviour.
    /// to restrict the overlay to only the current core, its DirectPeerId should be entered here.
    pub allowed_peers: Vec<DirectPeerId>,

    /// Maximum number of peers to connect to for this overlay (only valid for an inner (RW/WO) overlay)
    /// 0 means automatic/unlimited
    pub max_peer_count: u16,

    /// list of topics that should be subscribed to
    pub ro_topics: Vec<TopicId>,

    /// list of topics for which we will be a publisher
    /// only possible with inner (RW or WO) overlays.
    /// implies also subscribing to it (no need to put it also in ro_topics)
    pub rw_topics: Vec<PublisherAdvert>,
}

/// Request to open a repo
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OpenRepo {
    V0(OpenRepoV0),
}

impl OpenRepo {
    pub fn peers(&self) -> &Vec<PeerAdvert> {
        match self {
            OpenRepo::V0(o) => &o.peers,
        }
    }
}

/// Request to pin a repo on the broker.
///
/// When client will disconnect, the subscriptions and publisherAdvert of the topics will be remain active on the broker.
/// replied with a RepoOpened
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PinRepoV0 {
    /// Repo Hash
    pub hash: RepoHash,

    /// for RW overlay, the overlay that should be used in the clientmessage is the innerOverlay
    pub overlay: OverlayAccess,

    /// Root topic of the overlay, used to listen to overlay refreshes. Only used for inner (RW or WO) overlays
    pub overlay_root_topic: Option<TopicId>,

    /// only possible for RW overlays. not allowed for private or dialog overlay
    pub expose_outer: bool,

    /// Broker peers to connect to in order to join the overlay
    /// If the repo has previously been opened (during the same session) or if it is a private overlay, then peers info can be omitted.
    /// If there are no known peers in the overlay yet, vector is left empty (creation of a store, or repo in a store that is owned by user).
    pub peers: Vec<PeerAdvert>,

    /// Maximum number of peers to connect to for this overlay (only valid for an inner (RW/WO) overlay)
    pub max_peer_count: u16,

    /// a list of core brokers that are allowed to connect to the overlay (only valid for an inner (RW/WO) overlay).
    /// an empty list means any core broker is allowed. this is the default behaviour.
    /// to restrict the overlay to only the current core, its DirectPeerId should be entered here.
    /// not compatible with expose_outer
    pub allowed_peers: Vec<DirectPeerId>,

    /// list of topics that should be subscribed to
    /// If the repo has previously been opened (during the same session) then ro_topics info can be omitted
    pub ro_topics: Vec<TopicId>,

    /// list of topics for which we will be a publisher
    /// only possible with inner (RW or WO) overlays.
    /// If the repo has previously been opened (during the same session) then rw_topics info can be omitted
    pub rw_topics: Vec<PublisherAdvert>,
    // TODO pub inbox_proof
    // TODO pub signer_proof
}

/// Request to pin a repo
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum PinRepo {
    V0(PinRepoV0),
}

impl PinRepo {
    pub fn peers(&self) -> &Vec<PeerAdvert> {
        match self {
            PinRepo::V0(o) => &o.peers,
        }
    }
    pub fn hash(&self) -> &RepoHash {
        match self {
            PinRepo::V0(o) => &o.hash,
        }
    }
    pub fn ro_topics(&self) -> &Vec<TopicId> {
        match self {
            PinRepo::V0(o) => &o.ro_topics,
        }
    }
    pub fn rw_topics(&self) -> &Vec<PublisherAdvert> {
        match self {
            PinRepo::V0(o) => &o.rw_topics,
        }
    }
    pub fn overlay(&self) -> &OverlayId {
        match self {
            PinRepo::V0(o) => &o.overlay.overlay_id_for_client_protocol_purpose(),
        }
    }
}

/// Request to refresh the Pinning of a previously pinned repo.
///
/// it can consist of updating the expose_outer, the list of ro_topics and/or rw_topics,
/// and in case of a ban_member, the broker will effectively flush the topics locally after all local members except the banned one, have refreshed
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RefreshPinRepoV0 {
    /// The new PinRepo info
    pub pin: PinRepo,

    /// optional hashed member ID that should be banned
    pub ban_member: Option<Digest>,

    /// when banning, list of topics that are to be flushed (once all the local members have left, except the one to be banned)
    /// All the honest local members have to send this list in order for the banned one to be effectively banned
    /// for each Topic, a signature over the hashed UserId to ban, by the Topic private key.
    /// The banning process on the broker is meant to flush topics that would remain dangling if the malicious member would not unpin them after being removed from members of repo.
    /// The userId of banned user is revealed to the local broker where it was attached, which is a breach of privacy deemed acceptable
    /// as only a broker that already knew the userid will enforce it, and
    /// that broker might be interested to know that the offending user was banned from a repo, as only malicious users are banned.
    /// The broker might also discard this information, and just proceed with the flush without much ado.
    /// Of course, if the broker is controlled by the malicious user, it might not proceed with the ban/flush. But who cares. That broker will keep old data forever, but it is a malicious broker anyway.
    pub flush_topics: Vec<(TopicId, Sig)>,
}

/// Request to pin a repo
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RefreshPinRepo {
    V0(RefreshPinRepoV0),
}

/// Request to unpin a repo on the broker.
///
/// When client will disconnect, the subscriptions and publisherAdvert of the topics will be removed on the broker
/// (for that user only. other users might continue to have the repo pinned)

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UnpinRepoV0 {
    /// Repo Hash
    pub hash: RepoHash,
}

/// Request to unpin a repo
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum UnpinRepo {
    V0(UnpinRepoV0),
}

impl UnpinRepo {
    pub fn hash(&self) -> &RepoHash {
        match self {
            UnpinRepo::V0(o) => &o.hash,
        }
    }
}

/// Request the status of pinning for a repo on the broker. V0
///
/// returns an error code if not pinned, otherwise returns a RepoPinStatusV0
/// the overlay entered in ClientMessage is important. if it is the outer, only outer pinning will be checked.
/// if it is the inner overlay, only the inner pinning will be checked.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RepoPinStatusReqV0 {
    /// Repo Hash
    pub hash: RepoHash,

    #[serde(skip)]
    pub overlay: Option<OverlayId>,
}

/// Request the status of pinning for a repo on the broker.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RepoPinStatusReq {
    V0(RepoPinStatusReqV0),
}

impl RepoPinStatusReq {
    pub fn hash(&self) -> &RepoHash {
        match self {
            RepoPinStatusReq::V0(o) => &o.hash,
        }
    }
    pub fn set_overlay(&mut self, overlay: OverlayId) {
        match self {
            Self::V0(v0) => v0.overlay = Some(overlay),
        }
    }

    pub fn overlay(&self) -> &OverlayId {
        match self {
            Self::V0(v0) => v0.overlay.as_ref().unwrap(),
        }
    }
}

/// Response with the status of pinning for a repo on the broker. V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RepoPinStatusV0 {
    /// Repo Hash
    pub hash: RepoHash,

    /// only possible for RW overlays
    pub expose_outer: bool,

    /// list of topics that are subscribed to
    pub topics: Vec<TopicSubRes>,
    // TODO pub inbox_proof

    // TODO pub signer_proof
}

/// Response with the status of pinning for a repo on the broker.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RepoPinStatus {
    V0(RepoPinStatusV0),
}

impl RepoPinStatus {
    pub fn hash(&self) -> &RepoHash {
        match self {
            RepoPinStatus::V0(o) => &o.hash,
        }
    }
    pub fn is_topic_subscribed_as_publisher(&self, topic: &TopicId) -> bool {
        match self {
            Self::V0(v0) => {
                for sub in &v0.topics {
                    if sub.topic_id() == topic {
                        return sub.is_publisher();
                    }
                }
                false
            }
        }
    }
}

/// Request subscription to a `Topic` of an already opened or pinned Repo
///
/// replied with a TopicSubRes containing the current heads that should be used to do a TopicSync
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct TopicSubV0 {
    /// Topic to subscribe
    pub topic: TopicId,

    /// Hash of the repo that was previously opened or pinned
    pub repo_hash: RepoHash,

    /// Publisher need to provide a signed `PublisherAdvert` for the PeerId of the broker
    pub publisher: Option<PublisherAdvert>,

    #[serde(skip)]
    pub overlay: Option<OverlayId>,
}

/// Request subscription to a `Topic` of an already opened or pinned Repo
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum TopicSub {
    V0(TopicSubV0),
}

impl TopicSub {
    pub fn overlay(&self) -> &OverlayId {
        match self {
            Self::V0(v0) => v0.overlay.as_ref().unwrap(),
        }
    }
    pub fn hash(&self) -> &RepoHash {
        match self {
            Self::V0(o) => &o.repo_hash,
        }
    }
    pub fn topic(&self) -> &TopicId {
        match self {
            Self::V0(o) => &o.topic,
        }
    }
    pub fn publisher(&self) -> Option<&PublisherAdvert> {
        match self {
            Self::V0(o) => o.publisher.as_ref(),
        }
    }
    pub fn set_overlay(&mut self, overlay: OverlayId) {
        match self {
            Self::V0(v0) => v0.overlay = Some(overlay),
        }
    }
}

/// Request unsubscription from a `Topic` of an already opened or pinned Repo
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct TopicUnsubV0 {
    /// Topic to unsubscribe
    pub topic: PubKey,

    /// Hash of the repo that was previously opened or pinned
    pub repo_hash: RepoHash,
}

/// Request unsubscription from a `Topic` of an already opened or pinned Repo
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum TopicUnsub {
    V0(TopicUnsubV0),
}

/// Request a Block by ID
///
/// commit_header_key is always set to None in the reply when request is made on OuterOverlay of protected or Group overlays
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BlockGetV0 {
    /// Block IDs to request
    pub ids: Vec<BlockId>,

    /// Whether or not to include all children recursively
    pub include_children: bool,

    /// Topic the object is referenced from, if it is known by the requester.
    /// can be used to do a BlockSearchTopic in the core overlay.
    pub topic: Option<TopicId>,
}

/// Request an object by ID
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BlockGet {
    V0(BlockGetV0),
}

impl BlockGet {
    pub fn ids(&self) -> &Vec<BlockId> {
        match self {
            BlockGet::V0(o) => &o.ids,
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

/// Request a Commit by ID
///
/// commit_header_key is always set to None in the reply when request is made on OuterOverlay of protected or Group overlays
/// The difference with BlockGet is that the Broker will try to return all the commit blocks as they were sent in the Pub/Sub Event, if it has it.
/// This will help in having all the blocks (including the header and body blocks), while a BlockGet would inevitably return only the blocks of the ObjectContent,
/// and not the header nor the body. And the load() would fail with CommitLoadError::MissingBlocks. That's what happens when the Commit is not present in the pubsub,
/// and we need to default to using BlockGet instead.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CommitGetV0 {
    /// Block IDs to request
    pub id: ObjectId,

    /// Topic the commit is referenced from, if it is known by the requester.
    /// can be used to do a BlockSearchTopic in the core overlay.
    pub topic: Option<TopicId>,

    #[serde(skip)]
    pub overlay: Option<OverlayId>,
}

/// Request a Commit by ID (see [CommitGetV0] for more details)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CommitGet {
    V0(CommitGetV0),
}
impl CommitGet {
    pub fn id(&self) -> &ObjectId {
        match self {
            CommitGet::V0(o) => &o.id,
        }
    }
}

/// Request to store one or more blocks
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BlocksPutV0 {
    /// Blocks to store
    pub blocks: Vec<Block>,
}

/// Request to store one or more blocks
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BlocksPut {
    V0(BlocksPutV0),
}

impl BlocksPut {
    pub fn blocks(&self) -> &Vec<Block> {
        match self {
            BlocksPut::V0(o) => &o.blocks,
        }
    }
}

/// Request to know if some blocks are present locally
///
/// used by client before publishing an event, to know what to push
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BlocksExistV0 {
    /// Ids of Blocks to check
    pub blocks: Vec<BlockId>,
}

/// Request to store one or more blocks
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BlocksExist {
    V0(BlocksExistV0),
}

impl BlocksExist {
    pub fn blocks(&self) -> &Vec<BlockId> {
        match self {
            BlocksExist::V0(o) => &o.blocks,
        }
    }
}

/// Request to pin an object
///
/// Brokers maintain an LRU cache of objects,
/// where old, unused objects might get deleted to free up space for new ones.
/// Pinned objects are retained, regardless of last access.
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

/// Request to delete an object
///
/// only effective if the refcount for this object is zero (basically it removes it from LRU)
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

/// Request to delete an object
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PublishEvent(pub Event, #[serde(skip)] pub Option<OverlayId>);

/// Content of `ClientRequestV0`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ClientRequestContentV0 {
    OpenRepo(OpenRepo),
    PinRepo(PinRepo),
    UnpinRepo(UnpinRepo),
    RepoPinStatusReq(RepoPinStatusReq),

    // once repo is opened or pinned:
    TopicSub(TopicSub),
    TopicUnsub(TopicUnsub),

    BlocksExist(BlocksExist),
    BlockGet(BlockGet),
    CommitGet(CommitGet),
    TopicSyncReq(TopicSyncReq),

    // For Pinned Repos only :
    ObjectPin(ObjectPin),
    ObjectUnpin(ObjectUnpin),
    ObjectDel(ObjectDel),

    // For InnerOverlay's only :
    BlocksPut(BlocksPut),
    PublishEvent(PublishEvent),
}

impl ClientRequestContentV0 {
    pub fn set_overlay(&mut self, overlay: OverlayId) {
        match self {
            ClientRequestContentV0::RepoPinStatusReq(a) => a.set_overlay(overlay),
            ClientRequestContentV0::TopicSub(a) => a.set_overlay(overlay),
            ClientRequestContentV0::PinRepo(a) => {}
            ClientRequestContentV0::PublishEvent(a) => a.set_overlay(overlay),
            ClientRequestContentV0::CommitGet(a) => a.set_overlay(overlay),
            _ => unimplemented!(),
        }
    }
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
    pub fn get_actor(&self) -> Box<dyn EActor> {
        match self {
            Self::V0(ClientRequestV0 { content, .. }) => match content {
                ClientRequestContentV0::RepoPinStatusReq(r) => r.get_actor(self.id()),
                ClientRequestContentV0::PinRepo(r) => r.get_actor(self.id()),
                ClientRequestContentV0::TopicSub(r) => r.get_actor(self.id()),
                ClientRequestContentV0::PublishEvent(r) => r.get_actor(self.id()),
                ClientRequestContentV0::CommitGet(r) => r.get_actor(self.id()),
                _ => unimplemented!(),
            },
        }
    }
}

impl TryFrom<ProtocolMessage> for ClientRequestContentV0 {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::ClientMessage(ClientMessage::V0(ClientMessageV0 {
            overlay,
            content:
                ClientMessageContentV0::ClientRequest(ClientRequest::V0(ClientRequestV0 {
                    mut content,
                    ..
                })),
            ..
        })) = msg
        {
            content.set_overlay(overlay);
            Ok(content)
        } else {
            log_debug!("INVALID {:?}", msg);
            Err(ProtocolError::InvalidValue)
        }
    }
}

/// Response which blocks have been found locally. V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BlocksFoundV0 {
    /// Ids of Blocks that were found locally
    pub found: Vec<BlockId>,

    /// Ids of Blocks that were missing locally
    pub missing: Vec<BlockId>,
}

/// Response which blocks have been found locally.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BlocksFound {
    V0(BlocksFoundV0),
}

impl BlocksFound {
    pub fn found(&self) -> &Vec<BlockId> {
        match self {
            BlocksFound::V0(o) => &o.found,
        }
    }
    pub fn missing(&self) -> &Vec<BlockId> {
        match self {
            BlocksFound::V0(o) => &o.missing,
        }
    }
}

/// Topic subscription response V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TopicSubResV0 {
    /// Topic subscribed
    pub topic: TopicId,
    pub known_heads: Vec<ObjectId>,
    pub publisher: bool,
}

/// Topic subscription response
///
/// it is a stream of blocks and or events.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum TopicSubRes {
    V0(TopicSubResV0),
}

impl TopicSubRes {
    pub fn topic_id(&self) -> &TopicId {
        match self {
            Self::V0(v0) => &v0.topic,
        }
    }
    pub fn is_publisher(&self) -> bool {
        match self {
            Self::V0(v0) => v0.publisher,
        }
    }
}

impl From<TopicId> for TopicSubRes {
    fn from(topic: TopicId) -> Self {
        TopicSubRes::V0(TopicSubResV0 {
            topic,
            known_heads: vec![],
            publisher: false,
        })
    }
}

impl From<PublisherAdvert> for TopicSubRes {
    fn from(topic: PublisherAdvert) -> Self {
        TopicSubRes::V0(TopicSubResV0 {
            topic: topic.topic_id().clone(),
            known_heads: vec![],
            publisher: true,
        })
    }
}

pub type RepoOpened = Vec<TopicSubRes>;

/// Content of `ClientResponseV0`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ClientResponseContentV0 {
    EmptyResponse,
    Block(Block),
    RepoOpened(RepoOpened),
    TopicSubRes(TopicSubRes),
    TopicSyncRes(TopicSyncRes),
    BlocksFound(BlocksFound),
    RepoPinStatus(RepoPinStatus),
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

impl ClientResponse {
    pub fn set_result(&mut self, res: u16) {
        match self {
            Self::V0(v0) => v0.result = res,
        }
    }
}

/// Response to a `ClientRequest`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ClientResponse {
    V0(ClientResponseV0),
}

impl From<ServerError> for ClientResponse {
    fn from(err: ServerError) -> ClientResponse {
        ClientResponse::V0(ClientResponseV0 {
            id: 0,
            result: err.into(),
            content: ClientResponseContentV0::EmptyResponse,
        })
    }
}

impl<A> From<Result<A, ServerError>> for ProtocolMessage
where
    A: Into<ProtocolMessage> + std::fmt::Debug,
{
    fn from(res: Result<A, ServerError>) -> ProtocolMessage {
        match res {
            Ok(a) => a.into(),
            Err(e) => ProtocolMessage::from_client_response_err(e),
        }
    }
}

impl From<()> for ProtocolMessage {
    fn from(_msg: ()) -> ProtocolMessage {
        let cm: ClientResponse = ServerError::Ok.into();
        cm.into()
    }
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
}

impl TryFrom<ProtocolMessage> for ClientResponseContentV0 {
    type Error = ProtocolError;
    fn try_from(msg: ProtocolMessage) -> Result<Self, Self::Error> {
        if let ProtocolMessage::ClientMessage(ClientMessage::V0(ClientMessageV0 {
            content:
                ClientMessageContentV0::ClientResponse(ClientResponse::V0(ClientResponseV0 {
                    content: content,
                    result: res,
                    ..
                })),
            ..
        })) = msg
        {
            let err = ServerError::try_from(res).unwrap();
            if !err.is_err() {
                Ok(content)
            } else {
                Err(ProtocolError::ServerError)
            }
        } else {
            log_debug!("INVALID {:?}", msg);
            Err(ProtocolError::InvalidValue)
        }
    }
}

/// Content of `ClientMessageV0`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ClientMessageContentV0 {
    ClientRequest(ClientRequest),
    ClientResponse(ClientResponse),
    ForwardedEvent(Event),
    ForwardedBlock(Block),
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
                ClientMessageContentV0::ForwardedEvent(_)
                | ClientMessageContentV0::ForwardedBlock(_) => {
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
                ClientMessageContentV0::ForwardedEvent(_)
                | ClientMessageContentV0::ForwardedBlock(_) => {
                    panic!("it is an event")
                }
            },
        }
    }
    pub fn result(&self) -> u16 {
        match self {
            ClientMessage::V0(o) => match &o.content {
                ClientMessageContentV0::ClientResponse(r) => r.result(),
                ClientMessageContentV0::ClientRequest(_)
                | ClientMessageContentV0::ForwardedEvent(_)
                | ClientMessageContentV0::ForwardedBlock(_) => {
                    panic!("it is not a response");
                }
            },
        }
    }
    pub fn block<'a>(&self) -> Option<&Block> {
        match self {
            ClientMessage::V0(o) => match &o.content {
                ClientMessageContentV0::ClientResponse(r) => r.block(),
                ClientMessageContentV0::ClientRequest(_)
                | ClientMessageContentV0::ForwardedEvent(_)
                | ClientMessageContentV0::ForwardedBlock(_) => {
                    panic!("it is not a response");
                }
            },
        }
    }

    pub fn get_actor(&self) -> Box<dyn EActor> {
        match self {
            ClientMessage::V0(o) => match &o.content {
                ClientMessageContentV0::ClientRequest(req) => req.get_actor(),
                ClientMessageContentV0::ClientResponse(_)
                | ClientMessageContentV0::ForwardedEvent(_)
                | ClientMessageContentV0::ForwardedBlock(_) => {
                    panic!("it is not a request");
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

/// Topic synchronization request
pub type ExtTopicSyncReq = TopicSyncReq;

/// Content of ExtRequestV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ExtRequestContentV0 {
    ExtObjectGet(ExtObjectGet),
    ExtTopicSyncReq(ExtTopicSyncReq),
    // TODO inbox requests
    // TODO subreq ?
}

/// External request with its request ID
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExtRequestV0 {
    /// outer overlayId
    pub overlay: Digest,

    /// Request ID
    pub id: i64,

    /// Request content
    pub content: ExtRequestContentV0,
}

/// External request are made by clients directly to a core broker of their choice.
///
/// They differ from OuterOverlayRequests in the sense that the broker where the client is attached, is not involved in the request.
/// It is a direct connection that is established between the client and the core broker that will give the response.
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
    // TODO  inbox related replies
    // TODO event ?
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

//
// PROTOCOL MESSAGES
//
#[doc(hidden)]
pub static MAGIC_NG_REQUEST: [u8; 2] = [78u8, 71u8];
#[doc(hidden)]
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

impl TryFrom<&ProtocolMessage> for ServerError {
    type Error = NgError;
    fn try_from(msg: &ProtocolMessage) -> Result<Self, NgError> {
        if let ProtocolMessage::ClientMessage(ref bm) = msg {
            let res = bm.result();
            if res != 0 {
                return Ok(ServerError::try_from(res).unwrap());
            }
        }
        Err(NgError::NotAServerError)
    }
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
            ProtocolMessage::ClientMessage(a) => a.get_actor(),
            // ProtocolMessage::ServerHello(a) => a.get_actor(),
            // ProtocolMessage::ClientAuth(a) => a.get_actor(),
            // ProtocolMessage::AuthResult(a) => a.get_actor(),
            // ProtocolMessage::ExtRequest(a) => a.get_actor(),
            // ProtocolMessage::ExtResponse(a) => a.get_actor(),
            // ProtocolMessage::BrokerMessage(a) => a.get_actor(),
            _ => unimplemented!(),
        }
    }

    pub fn from_client_response_err(err: ServerError) -> ProtocolMessage {
        let res: ClientResponse = err.into();
        res.into()
    }

    pub fn from_client_request_v0(
        req: ClientRequestContentV0,
        overlay: OverlayId,
    ) -> ProtocolMessage {
        ProtocolMessage::ClientMessage(ClientMessage::V0(ClientMessageV0 {
            overlay,
            content: ClientMessageContentV0::ClientRequest(ClientRequest::V0(ClientRequestV0 {
                id: 0,
                content: req,
            })),
            padding: vec![],
        }))
    }
}

impl From<ClientResponseContentV0> for ClientResponse {
    fn from(msg: ClientResponseContentV0) -> ClientResponse {
        ClientResponse::V0(ClientResponseV0 {
            id: 0,
            result: 0,
            content: msg,
        })
    }
}

impl From<ClientResponseContentV0> for ProtocolMessage {
    fn from(msg: ClientResponseContentV0) -> ProtocolMessage {
        let client_res = ClientResponse::V0(ClientResponseV0 {
            id: 0,
            result: 0,
            content: msg,
        });
        client_res.into()
    }
}

impl From<ClientResponse> for ProtocolMessage {
    fn from(msg: ClientResponse) -> ProtocolMessage {
        ProtocolMessage::ClientMessage(ClientMessage::V0(ClientMessageV0 {
            overlay: OverlayId::nil(),
            content: ClientMessageContentV0::ClientResponse(msg),
            padding: vec![],
        }))
    }
}

//
// AUTHENTICATION MESSAGES
//

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

    /// Signature by client key
    pub client_sig: Sig,
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
// LINKS
//

/// Link to a repository
///
/// Consists of an identifier (repoid), a ReadCap or WriteCap, and a locator (peers and overlayLink)
/// Those capabilities are not durable: They can be refreshed by the members and previously shared Caps will become obsolete/revoked.
/// As long as the user is a member of the repo and subscribes to the root topic (of the repo, and of the store if needed/applicable), they will receive the updated capabilities.
/// But if they don't subscribe, they will lose access after the refresh.
/// For durable capabilities, see PermaCap.
/// In most cases, the link is shared and then the recipient opens it and subscribes soon afterward, so there is no need for a PermaCap
/// Perma capabilities are needed only when the link is stored on disk and kept there unopened for a long period.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RepoLinkV0 {
    /// Repository ID
    pub id: RepoId,

    /// read capability for the whole repo
    /// current (at the time of sharing the link) root branch definition commit
    pub read_cap: ReadCap,

    /// Write capability secret. Only set for editors. in this case, overlay MUST be set to an InnerOverlay
    // pub write_cap_secret: Option<RepoWriteCapSecret>,

    /// Current overlay link, used to join the overlay
    pub overlay: OverlayLink,

    /// Peer brokers to connect to
    pub peers: Vec<PeerAdvert>,
}

/// Link to a repository
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RepoLink {
    V0(RepoLinkV0),
}

impl RepoLink {
    pub fn id(&self) -> &RepoId {
        match self {
            RepoLink::V0(o) => &o.id,
        }
    }
    pub fn peers(&self) -> &Vec<PeerAdvert> {
        match self {
            RepoLink::V0(o) => &o.peers,
        }
    }
}

/// Link for a Public Repo
///
/// The latest ReadCap of the branch (or main branch) will be downloaded from the outerOverlay, if the peer brokers listed below allow it.
/// The snapshot can be downloaded instead
/// This link is durable, because the public site are served differently by brokers.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PublicRepoLinkV0 {
    /// Repository ID
    pub repo: RepoId,

    /// optional branchId to access. a specific public branch,
    /// if not set, the main branch of the repo will be used.
    pub branch: Option<BranchId>,

    /// optional commits of head to access.
    /// if not set, the main branch of the repo will be used.
    pub heads: Vec<ObjectRef>,

    /// optional snapshot to download, in order to display the content quicker to end-user.
    pub snapshot: Option<ObjectRef>,

    /// The public site store
    pub public_store: PubKey,

    /// Peer brokers to connect to
    pub peers: Vec<PeerAdvert>,
}

/// Link to a public repository
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum PublicRepoLink {
    V0(PublicRepoLinkV0),
}

/// Read access to a branch of a Public, Protected or Group store.
///
/// The overlay to join can be the outer or the inner, depending on what was offered in the link.
/// The difference between the two is that in the outer overlay, only one broker is contacted.
/// In the inner overlay, all the publisher's brokers are contacted, so subscription to the pub/sub is more reliable, less prone to outage.
/// This is not a durable link. If the topic has been refreshed, the pubsub won't be able to be subscribed to,
/// but TopicSyncReq will still work (answering the commits up until the moment the topic was refreshed)
/// and the optional heads will always be retrievable
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReadBranchLinkV0 {
    /// Repository ID
    pub repo: RepoId,

    pub branch: BranchId, // must match the one in read_cap

    pub topic: TopicId,

    /// an optional list of heads that can be fetched in this branch
    /// useful if a specific head is to be shared
    pub heads: Vec<ObjectRef>,

    /// read capability for the branch
    /// current (at the time of sharing the link) branch definition commit
    pub read_cap: ReadCap,

    /// Current overlay link, used to join the overlay, most of the time, an outerOverlay is preferred
    pub overlay: OverlayLink,

    /// Peer brokers to connect to
    pub peers: Vec<PeerAdvert>,
}

/// Link to a repository
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ReadBranchLink {
    V0(ReadBranchLinkV0),
}

/// Obtains one or more objects of a repo (Commit, File) by their ID.
///
/// On an outerOverlay, the header is always emptied (no way to reconstruct the DAG of commits) except on public overlays or if a topicId is provided
/// If the intent is to share a whole DAG of commits at a definite CommitID/HEAD, then ReadBranchLink should be used instead (or PublicRepoLink if public site)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ObjectLinkV0 {
    /// Repository ID: not used to make the request. but useful for commits, to know which repo they are from without needing to fetch and open the full DAG of commits.
    /// (but the one here might be wrong. only when opening the DAG can the real repo be known. also note that on outerOverlay of non public stores, the DAG is not accessible)
    /// note that it could be omitted, specially if the objects are files. As files are content-addressable and belong to an overlay but not to a specific repo or topic.
    pub repo: Option<RepoId>,

    /// An optional topic that will be used to retrieve the Certificate of a commit, if needed
    /// (topic has to be checked with the one inside the commit. the one here might be wrong. it is provided here as an optimization)
    /// or can be used to help with BlockSearchTopic.
    /// If the topic is provided, a TopicSyncReq can be performed, and the causal past of the commit will appear (by repeated tries while narrowing down on the ancestors),
    /// hence defeating the "emptied header" protection
    pub topic: Option<TopicId>,

    pub objects: Vec<ObjectRef>,

    /// Overlay to join
    pub overlay: OverlayLink,

    /// Peer brokers to connect to
    pub peers: Vec<PeerAdvert>,
}

/// Link to a specific commit, without its causal past
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ObjectLink {
    V0(ObjectLinkV0),
}

/// NextGraph Link V0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum NgLinkV0 {
    Repo(RepoLink),
    PublicRepo(PublicRepoLink),
    Branch(ReadBranchLink),
    Object(ObjectLink),
}

/// NextGraph Link
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum NgLink {
    V0(NgLinkV0),
}

// TODO: PermaLinks and PostInbox (and ExtRequests)

#[cfg(test)]
mod test {

    use crate::types::{BootstrapContentV0, BrokerServerTypeV0, BrokerServerV0, Invitation};
    use ng_repo::types::PubKey;

    #[test]
    pub fn invitation() {
        let inv = Invitation::new_v0(
            BootstrapContentV0 {
                servers: vec![BrokerServerV0 {
                    server_type: BrokerServerTypeV0::Localhost(14400),
                    can_verify: false,
                    can_forward: false,
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
