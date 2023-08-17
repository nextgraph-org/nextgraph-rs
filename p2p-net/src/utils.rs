/*
 * Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
*/

use crate::broker::BROKER;
use crate::types::*;
use crate::NG_BOOTSTRAP_LOCAL_PATH;
use async_std::task;
use ed25519_dalek::*;
use futures::{channel::mpsc, select, Future, FutureExt, SinkExt};
use noise_protocol::U8Array;
use noise_protocol::DH;
use noise_rust_crypto::sensitive::Sensitive;
use p2p_repo::errors::NgError;
use p2p_repo::types::PubKey;
use p2p_repo::{log::*, types::PrivKey};
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use url::Host;
use url::Url;

#[cfg(target_arch = "wasm32")]
pub fn spawn_and_log_error<F>(fut: F) -> task::JoinHandle<()>
where
    F: Future<Output = ResultSend<()>> + 'static,
{
    task::spawn_local(async move {
        if let Err(e) = fut.await {
            log_err!("EXCEPTION {}", e)
        }
    })
}
#[cfg(target_arch = "wasm32")]
pub type ResultSend<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

#[cfg(not(target_arch = "wasm32"))]
pub type ResultSend<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

#[cfg(not(target_arch = "wasm32"))]
pub fn spawn_and_log_error<F>(fut: F) -> task::JoinHandle<()>
where
    F: Future<Output = ResultSend<()>> + Send + 'static,
{
    task::spawn(async move {
        if let Err(e) = fut.await {
            log_err!("{}", e)
        }
    })
}

#[cfg(debug_assertions)]
const APP_PREFIX: &str = "http://localhost:14400";

#[cfg(not(debug_assertions))]
const APP_PREFIX: &str = "";

pub fn decode_invitation_string(string: String) -> Option<Invitation> {
    Invitation::try_from(string).ok()
}

pub fn check_is_local_url(bootstrap: &BrokerServerV0, location: &String) -> Option<String> {
    if location.starts_with(APP_NG_ONE_URL) {
        match &bootstrap.server_type {
            BrokerServerTypeV0::BoxPublic(_) | BrokerServerTypeV0::BoxPublicDyn(_) => {
                return Some(APP_NG_ONE_WS_URL.to_string());
            }
            _ => {}
        }
    } else if let BrokerServerTypeV0::Domain(domain) = &bootstrap.server_type {
        let url = format!("https://{}", domain);
        if location.starts_with(&url) {
            return Some(url);
        }
    } else {
        // localhost
        if location.starts_with(LOCAL_URLS[0])
            || location.starts_with(LOCAL_URLS[1])
            || location.starts_with(LOCAL_URLS[2])
        {
            if let BrokerServerTypeV0::Localhost(port) = bootstrap.server_type {
                return Some(local_http_url(&port));
            }
        }
        // a private address
        else if location.starts_with("http://") {
            let url = Url::parse(location).unwrap();
            match url.host() {
                Some(Host::Ipv4(ip)) => {
                    if is_ipv4_private(&ip) {
                        let res = bootstrap.first_ipv4_http();
                        if res.is_some() {
                            return res;
                        }
                    }
                }
                Some(Host::Ipv6(ip)) => {
                    if is_ipv6_private(&ip) {
                        let res = bootstrap.first_ipv6_http();
                        if res.is_some() {
                            return res;
                        }
                    }
                }
                _ => {}
            }
        }
    }
    None
}

#[cfg(target_arch = "wasm32")]
pub async fn retrieve_local_url(location: String) -> Option<String> {
    let bootstraps: BootstrapContent = {
        let resp = reqwest::get(format!("{}{}", APP_PREFIX, NG_BOOTSTRAP_LOCAL_PATH)).await;
        if resp.is_ok() {
            let resp = resp.unwrap().json::<BootstrapContent>().await;
            resp.unwrap()
        } else {
            return None;
        }
    };
    for bootstrap in bootstraps.servers() {
        let res = check_is_local_url(bootstrap, &location);
        if res.is_some() {
            return res;
        }
    }
    None
}

pub async fn retrieve_local_bootstrap(
    location_string: String,
    invite_string: Option<String>,
    must_be_public: bool,
) -> Option<Invitation> {
    let invite1: Option<Invitation> = if invite_string.is_some() {
        let invitation: Result<Invitation, NgError> = invite_string.clone().unwrap().try_into();
        invitation.ok()
    } else {
        None
    };
    log_debug!("{}", location_string);
    log_debug!("invite_String {:?} invite1{:?}", invite_string, invite1);

    let invite2: Option<Invitation> = {
        // let resp = reqwest::get(format!("{}{}", APP_PREFIX, NG_BOOTSTRAP_LOCAL_PATH)).await;
        // if resp.is_ok() {
        //     let resp = resp.unwrap().json::<BootstrapContent>().await;
        //     if resp.is_ok() {
        //         let mut inv: Invitation = resp.unwrap().into();
        //         inv.set_url(BROKER.read().await.get_registration_url());
        //         Some(inv)
        //     } else {
        //         None
        //     }
        // } else {
        None
        //}
    };

    let res = if invite1.is_none() {
        invite2
    } else if invite2.is_none() {
        invite1
    } else {
        invite1.map(|i| i.intersects(invite2.unwrap()))
    };

    if res.is_some() {
        for server in res.as_ref().unwrap().get_servers() {
            if must_be_public && server.is_public_server()
                || !must_be_public && check_is_local_url(server, &location_string).is_some()
            {
                return res;
            }
        }
        return None;
    }
    res
}

pub fn sensitive_from_privkey(privkey: PrivKey) -> Sensitive<[u8; 32]> {
    // we copy the key here, because otherwise the 2 zeroize would conflict. as the drop of the PrivKey might be called before the one of Sensitive
    let mut bits: [u8; 32] = [0u8; 32];
    bits.copy_from_slice(privkey.slice());
    Sensitive::<[u8; 32]>::from_slice(&bits)
}

pub fn dh_privkey_from_sensitive(privkey: Sensitive<[u8; 32]>) -> PrivKey {
    // we copy the key here, because otherwise the 2 zeroize would conflict. as the drop of the Sensitive might be called before the one of PrivKey
    let mut bits: [u8; 32] = [0u8; 32];
    bits.copy_from_slice(privkey.as_slice());
    PrivKey::X25519PrivKey(bits)
}

pub type Sender<T> = mpsc::UnboundedSender<T>;
pub type Receiver<T> = mpsc::UnboundedReceiver<T>;

pub fn gen_dh_keys() -> (PrivKey, PubKey) {
    let pri = noise_rust_crypto::X25519::genkey();
    let publ = noise_rust_crypto::X25519::pubkey(&pri);

    (dh_privkey_from_sensitive(pri), PubKey::X25519PubKey(publ))
}

pub struct Dual25519Keys {
    pub x25519_priv: Sensitive<[u8; 32]>,
    pub x25519_public: [u8; 32],
    pub ed25519_priv: SecretKey,
    pub ed25519_pub: PublicKey,
}

impl Dual25519Keys {
    pub fn generate() -> Self {
        let mut random = Sensitive::<[u8; 32]>::new();
        getrandom::getrandom(&mut *random).expect("getrandom failed");

        let ed25519_priv = SecretKey::from_bytes(&random.as_slice()).unwrap();
        let exp: ExpandedSecretKey = (&ed25519_priv).into();
        let mut exp_bytes = exp.to_bytes();
        let ed25519_pub: PublicKey = (&ed25519_priv).into();
        for byte in &mut exp_bytes[32..] {
            *byte = 0;
        }
        let mut bits = Sensitive::<[u8; 32]>::from_slice(&exp_bytes[0..32]);
        bits[0] &= 248;
        bits[31] &= 127;
        bits[31] |= 64;

        let x25519_public = noise_rust_crypto::X25519::pubkey(&bits);

        Self {
            x25519_priv: bits,
            x25519_public,
            ed25519_priv,
            ed25519_pub,
        }
    }
}

pub fn get_domain_without_port(domain: &String) -> String {
    let parts: Vec<&str> = domain.split(':').collect();
    parts[0].to_string()
}

pub fn get_domain_without_port_443(domain: &str) -> &str {
    let parts: Vec<&str> = domain.split(':').collect();
    if parts.len() > 1 && parts[1] == "443" {
        return parts[0];
    }
    domain
}

pub fn is_public_ipv4(ip: &Ipv4Addr) -> bool {
    // TODO, use core::net::Ipv6Addr.is_global when it will be stable
    return is_ipv4_global(ip);
}

pub fn is_public_ipv6(ip: &Ipv6Addr) -> bool {
    // TODO, use core::net::Ipv6Addr.is_global when it will be stable
    return is_ipv6_global(ip);
}

pub fn is_public_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => is_public_ipv4(v4),
        IpAddr::V6(v6) => is_public_ipv6(v6),
    }
}

pub fn is_private_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => is_ipv4_private(v4),
        IpAddr::V6(v6) => is_ipv6_private(v6),
    }
}

#[must_use]
#[inline]
pub const fn is_ipv4_shared(addr: &Ipv4Addr) -> bool {
    addr.octets()[0] == 100 && (addr.octets()[1] & 0b1100_0000 == 0b0100_0000)
}

#[must_use]
#[inline]
pub const fn is_ipv4_benchmarking(addr: &Ipv4Addr) -> bool {
    addr.octets()[0] == 198 && (addr.octets()[1] & 0xfe) == 18
}

#[must_use]
#[inline]
pub const fn is_ipv4_reserved(addr: &Ipv4Addr) -> bool {
    addr.octets()[0] & 240 == 240 && !addr.is_broadcast()
}

#[must_use]
#[inline]
pub const fn is_ipv4_private(addr: &Ipv4Addr) -> bool {
    addr.is_private() || addr.is_link_local()
}

#[must_use]
#[inline]
pub const fn is_ipv4_global(addr: &Ipv4Addr) -> bool {
    !(addr.octets()[0] == 0 // "This network"
            || addr.is_private()
            || is_ipv4_shared(addr)
            || addr.is_loopback()
            || addr.is_link_local()
            // addresses reserved for future protocols (`192.0.0.0/24`)
            ||(addr.octets()[0] == 192 && addr.octets()[1] == 0 && addr.octets()[2] == 0)
            || addr.is_documentation()
            || is_ipv4_benchmarking(addr)
            || is_ipv4_reserved(addr)
            || addr.is_broadcast())
}

#[must_use]
#[inline]
pub const fn is_ipv6_unique_local(addr: &Ipv6Addr) -> bool {
    (addr.segments()[0] & 0xfe00) == 0xfc00
}

#[must_use]
#[inline]
pub const fn is_ipv6_unicast_link_local(addr: &Ipv6Addr) -> bool {
    (addr.segments()[0] & 0xffc0) == 0xfe80
}

#[must_use]
#[inline]
pub const fn is_ipv6_documentation(addr: &Ipv6Addr) -> bool {
    (addr.segments()[0] == 0x2001) && (addr.segments()[1] == 0xdb8)
}

#[must_use]
#[inline]
pub const fn is_ipv6_private(addr: &Ipv6Addr) -> bool {
    is_ipv6_unique_local(addr)
}

#[must_use]
#[inline]
pub const fn is_ipv6_global(addr: &Ipv6Addr) -> bool {
    !(addr.is_unspecified()
        || addr.is_loopback()
        // IPv4-mapped Address (`::ffff:0:0/96`)
        || matches!(addr.segments(), [0, 0, 0, 0, 0, 0xffff, _, _])
        // IPv4-IPv6 Translat. (`64:ff9b:1::/48`)
        || matches!(addr.segments(), [0x64, 0xff9b, 1, _, _, _, _, _])
        // Discard-Only Address Block (`100::/64`)
        || matches!(addr.segments(), [0x100, 0, 0, 0, _, _, _, _])
        // IETF Protocol Assignments (`2001::/23`)
        || (matches!(addr.segments(), [0x2001, b, _, _, _, _, _, _] if b < 0x200)
            && !(
                // Port Control Protocol Anycast (`2001:1::1`)
                u128::from_be_bytes(addr.octets()) == 0x2001_0001_0000_0000_0000_0000_0000_0001
                // Traversal Using Relays around NAT Anycast (`2001:1::2`)
                || u128::from_be_bytes(addr.octets()) == 0x2001_0001_0000_0000_0000_0000_0000_0002
                // AMT (`2001:3::/32`)
                || matches!(addr.segments(), [0x2001, 3, _, _, _, _, _, _])
                // AS112-v6 (`2001:4:112::/48`)
                || matches!(addr.segments(), [0x2001, 4, 0x112, _, _, _, _, _])
                // ORCHIDv2 (`2001:20::/28`)
                || matches!(addr.segments(), [0x2001, b, _, _, _, _, _, _] if b >= 0x20 && b <= 0x2F)
            ))
        || is_ipv6_documentation(addr)
        || is_ipv6_unique_local(addr)
        || is_ipv6_unicast_link_local(addr))
}
