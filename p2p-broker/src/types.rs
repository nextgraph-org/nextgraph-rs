// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
use p2p_net::types::{BindAddress, BrokerServerV0, OverlayId, UserId, IP};
use p2p_repo::types::PrivKey;
use serde::{Deserialize, Serialize};

/// AcceptForwardForV0 type
/// allow answers to connection requests originating from a client behind a reverse proxy
/// Format of last param in the tuple is a list of comma separated hosts or CIDR subnetworks IPv4 and/or IPv6 addresses accepted as X-Forwarded-For
/// Empty string means all addresses are accepted
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum AcceptForwardForV0 {
    /// X-Forwarded-For not allowed
    No,
    /// X-Forwarded-For accepted only for clients with private LAN addresses. First param is the bind address of the proxy server
    Private((BindAddress, String)),
    /// X-Forwarded-For accepted only for clients with public addresses. First param is the domain of the proxy server
    /// domain can take an option port with a trailing `:port`
    PublicDomain((String, String)),
    /// X-Forwarded-For accepted only for clients with public addresses. First param is the domain of the proxy server
    /// domain can take an option port with a trailing `:port`
    /// second param is the privKey of the PeerId of the proxy server, useful when the proxy server is load balancing to several daemons
    /// that should all use the same PeerId to answer requests
    PublicDomainPeer((String, PrivKey, String)),
    PublicDyn((u16, u32, String)), // first param is the port, second param in tuple is the interval for periodic probe of the external IP
    PublicStatic((BindAddress, String)),
}

/// DaemonConfig Listener Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ListenerV0 {
    /// local interface name to bind to
    /// names of interfaces can be retrieved with the --list-interfaces option
    /// the string can take an optional trailing option of the form `:3600` for number of seconds
    /// for an interval periodic refresh of the actual IP(s) of the interface. Used for dynamic IP interfaces.
    pub interface_name: String,

    // if to bind to the ipv6 address of the interface
    pub ipv6: bool,

    /// local port to listen on
    pub port: u16,

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
pub struct BrokerOverlayConfig {
    // list of overlays this config applies to. empty array means applying to all
    pub overlays: Vec<OverlayId>,
    // Who can ask to join an overlay on the core protocol
    pub core: BrokerOverlayPermission,
    // Who can connect as a client to this server
    pub server: BrokerOverlayPermission,
    // if core == Nobody and server == Nobody then the listeners will not be started

    // are ExtRequest allowed on the server? this requires the core to be ON.
    pub allow_read: bool,

    /// an empty list means to forward to the peer known for each overlay.
    /// forward becomes the default when core is disabled
    pub forward: Vec<BrokerServerV0>,
}
