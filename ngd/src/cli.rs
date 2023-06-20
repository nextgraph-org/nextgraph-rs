// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use clap::Parser;

use p2p_net::WS_PORT;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub(crate) struct Cli {
    /// List all network interfaces available on the host
    #[arg(short('i'), long)]
    pub list_interfaces: bool,

    /// Increase the logging output. once : info, twice : debug, 3 times : trace
    #[arg(short, long, action = clap::ArgAction::Count)]
    pub verbose: u8,

    /// Base path for server home folder containing all persistent files
    #[arg(short, long, default_value = ".ng", value_name("PATH"))]
    pub base: String,

    /// Master key of the server. Should be a base64-url encoded serde serialization of a [u8; 32]. if not provided, a new key will be generated for you
    #[arg(short, long, env = "NG_SERVER_KEY")]
    pub key: Option<String>,

    /// Saves to disk the provided or automatically generated key. Only used if file storage is secure. Alternatives are passing the key at every start with --key or NG_SERVER_KEY env var.
    #[arg(long)]
    pub save_key: bool,

    /// Quick config to listen for clients on localhost port PORT. Defaults to port 80
    #[arg(short, long, value_name("PORT"), default_missing_value("80"), num_args(0..=1))]
    pub local: Option<u16>,

    /// Quick config to listen for core brokers on public INTERFACE (and optional :PORT). Defaults to first public interface on the host, port 80
    #[arg(short, long, value_name("INTERFACE:PORT"), default_missing_value("default"), num_args(0..=1))]
    pub core: Option<String>,

    /// Quick config to forward all requests to another BROKER. format is "DOMAIN/IP[:PORT]@PEERID"
    #[arg(
        short,
        long,
        value_name("BROKER"),
        conflicts_with("core"),
        conflicts_with("public"),
        conflicts_with("dynamic")
    )]
    pub forward: Option<String>,

    /// Quick config to listen for clients on private INTERFACE (and optional :PORT). Defaults to first private interface on the host, port 80
    #[arg(short, long, value_name("INTERFACE:PORT"), default_missing_value("default"), num_args(0..=1))]
    pub private: Option<String>,

    /// Quick config to listen for clients and core brokers on PRIVATE_INTERFACE, behind a DMZ or port forwarding of a public static IP. PORTs defaults to 80
    #[arg(
        short('g'),
        long,
        value_name("PRIVATE_INTERFACE:PORT,[PUBLIC_IPV6,]PUBLIC_IPV4:PORT")
    )]
    pub public: Option<String>,

    /// Quick config to listen for clients and core brokers on PRIVATE_INTERFACE, behind a DMZ or port forwarding of a public dynamic IP. PORTs defaults to 80
    #[arg(short('n'), long, value_name("PRIVATE_INTERFACE:PORT,PORT"), default_missing_value("default"), num_args(0..=1))]
    pub dynamic: Option<String>,

    /// Quick config to listen for clients on localhost port PORT, behind a reverse proxy that sends X-Forwarded-For for a TLS terminated DOMAIN name
    #[arg(short, long, value_name("DOMAIN:PORT"))]
    pub domain: Option<String>,

    /// Option for --domain if this host is part of a pool of load-balanced servers behind a reverse proxy, and the same PeerId should be shared among them all
    #[arg(short('e'), long, value_name("PEER_KEY"))]
    pub domain_peer: Option<String>,

    /// Option for quick config: does not listen on any IPv6 interfaces
    #[arg(long)]
    pub no_ipv6: bool,

    /// Saves the quick config into a file on disk, that can then be modified for advanced configs
    #[arg(long)]
    pub save_config: bool,
}
