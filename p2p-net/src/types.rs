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
use p2p_repo::types::*;
use serde::{Deserialize, Serialize};
use std::{
    any::{Any, TypeId},
    net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr},
};

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

/// Bind address
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct BindAddress {
    pub port: u16,
    pub ip: IP,
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

/// BrokerServerTypeV0 type
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum BrokerServerTypeV0 {
    Localhost(u16), // optional port number
    BoxPrivate(Vec<BindAddress>),
    BoxPublic(Vec<BindAddress>),
    BoxPublicDyn(Vec<BindAddress>), // can be empty
    Domain(String),                 // accepts an option trailing ":port" number
}

/// BrokerServer details Version 0
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BrokerServerV0 {
    /// Network addresses
    pub server_type: BrokerServerTypeV0,

    /// peerId of the server
    pub peer_id: PubKey,
}

/// Bootstrap content Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BootstrapContentV0 {
    /// list of servers, in order of preference
    pub servers: Vec<BrokerServerV0>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BootstrapContent {
    V0(BootstrapContentV0),
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
    // if the ip is local or private, and the forwarding is not PublicDyn nor PublicStatic, (if is_private) then the app is served on HTTP get of /

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

    pub fn get_bootstraps(&self, addrs: Vec<BindAddress>) -> Vec<BrokerServerTypeV0> {
        let mut res: Vec<BrokerServerTypeV0> = vec![];
        match self.accept_forward_for {
            AcceptForwardForV0::PublicStatic(_) => {
                if !self.refuse_clients {
                    res.push(BrokerServerTypeV0::BoxPublic(
                        self.accept_forward_for.get_public_bind_addresses(),
                    ));
                }
                if self.accept_direct {
                    res.push(BrokerServerTypeV0::BoxPrivate(addrs));
                }
            }
            AcceptForwardForV0::PublicDyn(_) => {
                if !self.refuse_clients {
                    res.push(BrokerServerTypeV0::BoxPublicDyn(
                        // self.accept_forward_for.get_public_bind_addresses(), //FIXME. we should use this, but for now it isnt implemented
                        vec![],
                    ));
                }
                if self.accept_direct {
                    res.push(BrokerServerTypeV0::BoxPrivate(addrs));
                }
            }
            AcceptForwardForV0::PublicDomain(_) | AcceptForwardForV0::PublicDomainPeer(_) => {
                res.push(BrokerServerTypeV0::Domain(
                    self.accept_forward_for.get_domain().to_string(),
                ));
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
                } else if self.if_type == InterfaceType::Public && !self.refuse_clients {
                    res.push(BrokerServerTypeV0::BoxPublic(addrs));
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

/// Content of OverlayRequestV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OverlayRequestContentV0 {
    EventReq(EventReq),
    BranchHeadsReq(BranchHeadsReq),
    BranchSyncReq(BranchSyncReq),
}

/// Request sent to an overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OverlayRequestV0 {
    /// Request ID
    pub id: i64,

    /// Request content
    pub content: OverlayRequestContentV0,
}

/// Request sent to an overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OverlayRequest {
    V0(OverlayRequestV0),
}

/// Content of OverlayResponseV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OverlayResponseContentV0 {
    EmptyResponse(()),
    Block(Block),
    EventResp(EventResp),
    Event(Event),
}

/// Request sent to an overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OverlayResponseV0 {
    /// Request ID
    pub id: i64,

    /// Result
    pub result: u16,

    /// Response content
    pub content: OverlayResponseContentV0,
}

/// Request sent to an OverlayRequest
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OverlayResponse {
    V0(OverlayResponseV0),
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

/// Content of OverlayMessagePaddedV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OverlayMessageContentV0 {
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
    OverlayRequest(OverlayRequest),
    OverlayResponse(OverlayResponse),
}

/// Padded content of OverlayMessageV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OverlayMessageContentPaddedV0 {
    pub content: OverlayMessageContentV0,

    /// Optional padding
    #[serde(with = "serde_bytes")]
    pub padding: Vec<u8>,
}

/// Overlay message
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OverlayMessageV0 {
    /// Overlay ID
    pub overlay: OverlayId,

    /// Session ID
    pub session: SessionId,

    /// Padded content encrypted with ChaCha20
    /// - overlay_secret: BLAKE3 derive_key ("NextGraph Overlay BLAKE3 key",
    ///                                      repo_pubkey + repo_secret)
    /// - key: BLAKE3 derive_key ("NextGraph OverlayMessage ChaCha20 key",
    ///                           overlay_secret + session_id)
    /// - nonce: per-session message sequence number of sending peer
    pub content: OverlayMessageContentPaddedV0,

    /// BLAKE3 MAC
    /// BLAKE3 keyed hash over the encrypted content
    /// - key:  BLAKE3 derive_key ("NextGraph OverlayMessage BLAKE3 key",
    ///                            overlay_secret + session_id)
    pub mac: Digest,
}

/// Overlay message
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OverlayMessage {
    V0(OverlayMessageV0),
}

//
// BROKER PROTOCOL
//

/// Content of AddUserV0
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct AddUserContentV0 {
    /// User pub key
    pub user: PubKey,
}

/// Add user account
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct AddUserV0 {
    pub content: AddUserContentV0,

    /// Signature by admin key
    pub sig: Sig,
}

/// Add user account
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum AddUser {
    V0(AddUserV0),
}

impl AddUser {
    pub fn content_v0(&self) -> AddUserContentV0 {
        match self {
            AddUser::V0(o) => o.content,
        }
    }
    pub fn sig(&self) -> Sig {
        match self {
            AddUser::V0(o) => o.sig,
        }
    }
    pub fn user(&self) -> PubKey {
        match self {
            AddUser::V0(o) => o.content.user,
        }
    }
}

/// Content of DelUserV0
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct DelUserContentV0 {
    /// User pub key
    pub user: PubKey,
}

/// Delete user account
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct DelUserV0 {
    pub content: DelUserContentV0,

    /// Signature by admin key
    pub sig: Sig,
}

/// Delete user account
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum DelUser {
    V0(DelUserV0),
}

impl DelUser {
    pub fn content_v0(&self) -> DelUserContentV0 {
        match self {
            DelUser::V0(o) => o.content,
        }
    }
    pub fn sig(&self) -> Sig {
        match self {
            DelUser::V0(o) => o.sig,
        }
    }
    pub fn user(&self) -> PubKey {
        match self {
            DelUser::V0(o) => o.content.user,
        }
    }
}

/// Content of `AddClientV0`
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct AddClientContentV0 {
    /// Client pub key
    pub client: PubKey,
}
/// Add a client
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct AddClientV0 {
    pub content: AddClientContentV0,

    /// Signature by user key
    pub sig: Sig,
}

/// Add a client
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum AddClient {
    V0(AddClientV0),
}

impl AddClient {
    pub fn content_v0(&self) -> AddClientContentV0 {
        match self {
            AddClient::V0(o) => o.content,
        }
    }
    pub fn sig(&self) -> Sig {
        match self {
            AddClient::V0(o) => o.sig,
        }
    }
    pub fn client(&self) -> PubKey {
        match self {
            AddClient::V0(o) => o.content.client,
        }
    }
}

/// Content of `DelClientV0`
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct DelClientContentV0 {
    /// Client pub key
    pub client: PubKey,
}

/// Remove a client
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct DelClientV0 {
    pub content: DelClientContentV0,

    /// Signature by user key
    pub sig: Sig,
}

/// Remove a client
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum DelClient {
    V0(DelClientV0),
}

impl DelClient {
    pub fn content_v0(&self) -> DelClientContentV0 {
        match self {
            DelClient::V0(o) => o.content,
        }
    }
    pub fn sig(&self) -> Sig {
        match self {
            DelClient::V0(o) => o.sig,
        }
    }
    pub fn client(&self) -> PubKey {
        match self {
            DelClient::V0(o) => o.content.client,
        }
    }
}

/// Content of `BrokerRequestV0`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BrokerRequestContentV0 {
    AddUser(AddUser),
    DelUser(DelUser),
    AddClient(AddClient),
    DelClient(DelClient),
}
impl BrokerRequestContentV0 {
    pub fn type_id(&self) -> TypeId {
        match self {
            BrokerRequestContentV0::AddUser(a) => a.type_id(),
            BrokerRequestContentV0::DelUser(a) => a.type_id(),
            BrokerRequestContentV0::AddClient(a) => a.type_id(),
            BrokerRequestContentV0::DelClient(a) => a.type_id(),
        }
    }
}

/// Broker request
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BrokerRequestV0 {
    /// Request ID
    pub id: i64,

    /// Request content
    pub content: BrokerRequestContentV0,
}

/// Broker request
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BrokerRequest {
    V0(BrokerRequestV0),
}

impl BrokerRequest {
    pub fn id(&self) -> i64 {
        match self {
            BrokerRequest::V0(o) => o.id,
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            BrokerRequest::V0(v0) => {
                v0.id = id;
            }
        }
    }
    pub fn type_id(&self) -> TypeId {
        match self {
            BrokerRequest::V0(o) => o.content.type_id(),
        }
    }
    pub fn content_v0(&self) -> BrokerRequestContentV0 {
        match self {
            BrokerRequest::V0(o) => o.content.clone(),
        }
    }
}

/// Content of `BrokerResponseV0`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BrokerResponseContentV0 {
    EmptyResponse(()),
}

/// Response to a `BrokerRequest`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BrokerResponseV0 {
    /// Request ID
    pub id: i64,

    /// Result (including but not limited to Result)
    pub result: u16,

    pub content: BrokerResponseContentV0,
}

/// Response to a `BrokerRequest`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BrokerResponse {
    V0(BrokerResponseV0),
}

impl BrokerResponse {
    pub fn id(&self) -> i64 {
        match self {
            BrokerResponse::V0(o) => o.id,
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            BrokerResponse::V0(v0) => {
                v0.id = id;
            }
        }
    }
    pub fn result(&self) -> u16 {
        match self {
            BrokerResponse::V0(o) => o.result,
        }
    }
}

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
    pub fn secret(&self) -> SymKey {
        match self {
            OverlayJoin::V0(o) => o.secret,
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

/// Content of `BrokerOverlayRequestV0`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BrokerOverlayRequestContentV0 {
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
pub struct BrokerOverlayRequestV0 {
    /// Request ID
    pub id: i64,

    /// Request content
    pub content: BrokerOverlayRequestContentV0,
}

/// Broker overlay request
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BrokerOverlayRequest {
    V0(BrokerOverlayRequestV0),
}

impl BrokerOverlayRequest {
    pub fn id(&self) -> i64 {
        match self {
            BrokerOverlayRequest::V0(o) => o.id,
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            BrokerOverlayRequest::V0(v0) => {
                v0.id = id;
            }
        }
    }
    pub fn content_v0(&self) -> &BrokerOverlayRequestContentV0 {
        match self {
            BrokerOverlayRequest::V0(o) => &o.content,
        }
    }
}

/// Content of `BrokerOverlayResponseV0`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BrokerOverlayResponseContentV0 {
    EmptyResponse(()),
    Block(Block),
    ObjectId(ObjectId),
    OverlayStatusResp(OverlayStatusResp),
}

/// Response to a `BrokerOverlayRequest`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BrokerOverlayResponseV0 {
    /// Request ID
    pub id: i64,

    /// Result (including but not limited to Result)
    pub result: u16,

    /// Response content
    pub content: BrokerOverlayResponseContentV0,
}

/// Response to a `BrokerOverlayRequest`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BrokerOverlayResponse {
    V0(BrokerOverlayResponseV0),
}

impl BrokerOverlayResponse {
    pub fn id(&self) -> i64 {
        match self {
            BrokerOverlayResponse::V0(o) => o.id,
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            BrokerOverlayResponse::V0(v0) => {
                v0.id = id;
            }
        }
    }
    pub fn result(&self) -> u16 {
        match self {
            BrokerOverlayResponse::V0(o) => o.result,
        }
    }
    pub fn block(&self) -> Option<&Block> {
        match self {
            BrokerOverlayResponse::V0(o) => match &o.content {
                BrokerOverlayResponseContentV0::Block(b) => Some(b),
                _ => panic!("this not a block response"),
            },
        }
    }
    pub fn object_id(&self) -> ObjectId {
        match self {
            BrokerOverlayResponse::V0(o) => match &o.content {
                BrokerOverlayResponseContentV0::ObjectId(id) => id.clone(),
                _ => panic!("this not an objectId reponse"),
            },
        }
    }
}

/// Content of `BrokerOverlayMessageV0`
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BrokerOverlayMessageContentV0 {
    BrokerOverlayRequest(BrokerOverlayRequest),
    BrokerOverlayResponse(BrokerOverlayResponse),
    Event(Event),
}
/// Broker message for an overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BrokerOverlayMessageV0 {
    pub overlay: OverlayId,
    pub content: BrokerOverlayMessageContentV0,
}

/// Broker message for an overlay
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BrokerOverlayMessage {
    V0(BrokerOverlayMessageV0),
}

impl BrokerOverlayMessage {
    pub fn content_v0(&self) -> &BrokerOverlayMessageContentV0 {
        match self {
            BrokerOverlayMessage::V0(o) => &o.content,
        }
    }
    pub fn overlay_request(&self) -> &BrokerOverlayRequest {
        match self {
            BrokerOverlayMessage::V0(o) => match &o.content {
                BrokerOverlayMessageContentV0::BrokerOverlayRequest(r) => &r,
                _ => panic!("not an overlay request"),
            },
        }
    }
    pub fn overlay_id(&self) -> OverlayId {
        match self {
            BrokerOverlayMessage::V0(o) => o.overlay,
        }
    }
    pub fn is_request(&self) -> bool {
        match self {
            BrokerOverlayMessage::V0(o) => matches!(
                o.content,
                BrokerOverlayMessageContentV0::BrokerOverlayRequest { .. }
            ),
        }
    }
    pub fn is_response(&self) -> bool {
        match self {
            BrokerOverlayMessage::V0(o) => matches!(
                o.content,
                BrokerOverlayMessageContentV0::BrokerOverlayResponse { .. }
            ),
        }
    }
    pub fn id(&self) -> i64 {
        match self {
            BrokerOverlayMessage::V0(o) => match &o.content {
                BrokerOverlayMessageContentV0::BrokerOverlayResponse(r) => r.id(),
                BrokerOverlayMessageContentV0::BrokerOverlayRequest(r) => r.id(),
                BrokerOverlayMessageContentV0::Event(_) => {
                    panic!("it is an event")
                }
            },
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            BrokerOverlayMessage::V0(o) => match &mut o.content {
                BrokerOverlayMessageContentV0::BrokerOverlayResponse(ref mut r) => r.set_id(id),
                BrokerOverlayMessageContentV0::BrokerOverlayRequest(ref mut r) => r.set_id(id),
                BrokerOverlayMessageContentV0::Event(_) => {
                    panic!("it is an event")
                }
            },
        }
    }
    pub fn result(&self) -> u16 {
        match self {
            BrokerOverlayMessage::V0(o) => match &o.content {
                BrokerOverlayMessageContentV0::BrokerOverlayResponse(r) => r.result(),
                BrokerOverlayMessageContentV0::BrokerOverlayRequest(r) => {
                    panic!("it is not a response");
                }
                BrokerOverlayMessageContentV0::Event(_) => {
                    panic!("it is not a response");
                }
            },
        }
    }
    pub fn block<'a>(&self) -> Option<&Block> {
        match self {
            BrokerOverlayMessage::V0(o) => match &o.content {
                BrokerOverlayMessageContentV0::BrokerOverlayResponse(r) => r.block(),
                BrokerOverlayMessageContentV0::BrokerOverlayRequest(r) => {
                    panic!("it is not a response");
                }
                BrokerOverlayMessageContentV0::Event(_) => {
                    panic!("it is not a response");
                }
            },
        }
    }
    pub fn object_id<'a>(&self) -> ObjectId {
        match self {
            BrokerOverlayMessage::V0(o) => match &o.content {
                BrokerOverlayMessageContentV0::BrokerOverlayResponse(r) => r.object_id(),
                BrokerOverlayMessageContentV0::BrokerOverlayRequest(r) => {
                    panic!("it is not a response");
                }
                BrokerOverlayMessageContentV0::Event(_) => {
                    panic!("it is not a response");
                }
            },
        }
    }
}

/// Content of BrokerMessageV0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BrokerMessageContentV0 {
    BrokerRequest(BrokerRequest),
    BrokerResponse(BrokerResponse),
    BrokerOverlayMessage(BrokerOverlayMessage),
}

/// Broker message
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BrokerMessageV0 {
    /// Message content
    pub content: BrokerMessageContentV0,

    /// Optional padding
    #[serde(with = "serde_bytes")]
    pub padding: Vec<u8>,
}

/// Broker message
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum BrokerMessage {
    V0(BrokerMessageV0),
    Close, //TODO: remove Close.
}

impl BrokerMessage {
    pub fn type_id(&self) -> TypeId {
        match self {
            BrokerMessage::V0(a) => match &a.content {
                BrokerMessageContentV0::BrokerOverlayMessage(p) => p.type_id(),
                BrokerMessageContentV0::BrokerResponse(p) => p.type_id(),
                BrokerMessageContentV0::BrokerRequest(p) => p.type_id(),
            },
            BrokerMessage::Close => TypeId::of::<BrokerMessage>(),
        }
    }
    pub fn is_close(&self) -> bool {
        match self {
            BrokerMessage::V0(o) => false,
            BrokerMessage::Close => true,
        }
    }
    /// Get the content
    pub fn content(&self) -> BrokerMessageContentV0 {
        match self {
            BrokerMessage::V0(o) => o.content.clone(),
            BrokerMessage::Close => panic!("Close not implemented"),
        }
    }
    pub fn is_request(&self) -> bool {
        match self {
            BrokerMessage::V0(o) => match &o.content {
                BrokerMessageContentV0::BrokerOverlayMessage(p) => p.is_request(),
                BrokerMessageContentV0::BrokerResponse(_) => false,
                BrokerMessageContentV0::BrokerRequest(_) => true,
            },
            BrokerMessage::Close => panic!("Close not implemented"),
        }
    }
    pub fn is_response(&self) -> bool {
        match self {
            BrokerMessage::V0(o) => match &o.content {
                BrokerMessageContentV0::BrokerOverlayMessage(p) => p.is_response(),
                BrokerMessageContentV0::BrokerResponse(_) => true,
                BrokerMessageContentV0::BrokerRequest(_) => false,
            },
            BrokerMessage::Close => panic!("Close not implemented"),
        }
    }
    pub fn id(&self) -> i64 {
        match self {
            BrokerMessage::V0(o) => match &o.content {
                BrokerMessageContentV0::BrokerOverlayMessage(p) => p.id(),
                BrokerMessageContentV0::BrokerResponse(r) => r.id(),
                BrokerMessageContentV0::BrokerRequest(r) => r.id(),
            },
            BrokerMessage::Close => panic!("Close not implemented"),
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            BrokerMessage::V0(o) => match &mut o.content {
                BrokerMessageContentV0::BrokerOverlayMessage(ref mut p) => p.set_id(id),
                BrokerMessageContentV0::BrokerResponse(ref mut r) => r.set_id(id),
                BrokerMessageContentV0::BrokerRequest(ref mut r) => r.set_id(id),
            },
            BrokerMessage::Close => panic!("Close not implemented"),
        }
    }
    pub fn result(&self) -> u16 {
        match self {
            BrokerMessage::V0(o) => match &o.content {
                BrokerMessageContentV0::BrokerOverlayMessage(p) => p.result(),
                BrokerMessageContentV0::BrokerResponse(r) => r.result(),
                BrokerMessageContentV0::BrokerRequest(_) => {
                    panic!("it is not a response");
                }
            },
            BrokerMessage::Close => panic!("Close not implemented"),
        }
    }
    pub fn is_overlay(&self) -> bool {
        match self {
            BrokerMessage::V0(o) => match &o.content {
                BrokerMessageContentV0::BrokerOverlayMessage(p) => true,
                BrokerMessageContentV0::BrokerResponse(r) => false,
                BrokerMessageContentV0::BrokerRequest(r) => false,
            },
            BrokerMessage::Close => panic!("Close not implemented"),
        }
    }
    pub fn response_block(&self) -> Option<&Block> {
        match self {
            BrokerMessage::V0(o) => match &o.content {
                BrokerMessageContentV0::BrokerOverlayMessage(p) => p.block(),
                BrokerMessageContentV0::BrokerResponse(r) => {
                    panic!("it doesn't have a response block. it is not an overlay response");
                }
                BrokerMessageContentV0::BrokerRequest(_) => {
                    panic!("it is not a response");
                }
            },
            BrokerMessage::Close => panic!("Close not implemented"),
        }
    }

    pub fn response_object_id(&self) -> ObjectId {
        match self {
            BrokerMessage::V0(o) => match &o.content {
                BrokerMessageContentV0::BrokerOverlayMessage(p) => p.object_id(),
                BrokerMessageContentV0::BrokerResponse(r) => {
                    panic!("it doesn't have a response ObjectId. it is not an overlay response");
                }
                BrokerMessageContentV0::BrokerRequest(_) => {
                    panic!("it is not a response");
                }
            },
            BrokerMessage::Close => panic!("Close not implemented"),
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
    Client,
    Core,
    Admin,
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
    BrokerMessage(BrokerMessage),
}

impl ProtocolMessage {
    pub fn id(&self) -> i64 {
        match self {
            ProtocolMessage::ExtRequest(ext_req) => ext_req.id(),
            ProtocolMessage::ExtResponse(ext_res) => ext_res.id(),
            ProtocolMessage::BrokerMessage(broker_msg) => broker_msg.id(),
            _ => 0,
        }
    }
    pub fn set_id(&mut self, id: i64) {
        match self {
            ProtocolMessage::ExtRequest(ext_req) => ext_req.set_id(id),
            ProtocolMessage::ExtResponse(ext_res) => ext_res.set_id(id),
            ProtocolMessage::BrokerMessage(broker_msg) => broker_msg.set_id(id),
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
            ProtocolMessage::BrokerMessage(a) => a.type_id(),
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

    /// Nonce from ServerHello
    #[serde(with = "serde_bytes")]
    pub nonce: Vec<u8>,
}

/// Client authentication
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ClientAuthV0 {
    /// Authentication data
    pub content: ClientAuthContentV0,

    /// Signature by client key
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

    /// Peers to connect to
    pub peers: Vec<PeerAdvert>,
}

/// Link/invitation to the repository
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RepoLink {
    V0(RepoLinkV0),
}

impl RepoLink {
    pub fn id(&self) -> PubKey {
        match self {
            RepoLink::V0(o) => o.id,
        }
    }
    pub fn secret(&self) -> SymKey {
        match self {
            RepoLink::V0(o) => o.secret,
        }
    }
    pub fn peers(&self) -> Vec<PeerAdvert> {
        match self {
            RepoLink::V0(o) => o.peers.clone(),
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
