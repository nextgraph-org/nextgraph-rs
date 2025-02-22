// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use clap::Parser;

use crate::DEFAULT_PORT;

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

    /// Master key of the server. Should be a base64-url encoded serde serialization of a PrivKey. if not provided, a new key will be generated for you
    #[arg(short, long, env = "NG_SERVER_KEY")]
    pub key: Option<String>,

    /// Saves to disk the provided or automatically generated key. Only use for development purpose. Alternatives are passing the key at every start with --key or NG_SERVER_KEY env var.
    #[arg(long)]
    pub save_key: bool,

    /// Quick config to listen for clients on localhost port PORT. Defaults to port 80
    #[arg(short, long, value_name("PORT"), default_missing_value(format!("{}",DEFAULT_PORT)), num_args(0..=1))]
    pub local: Option<u16>,

    /// Quick config to listen for core brokers on public INTERFACE (and optional :PORT). Defaults to first public interface on the host, port 80
    #[arg(short, long, value_name("INTERFACE:PORT"), default_missing_value("default"), num_args(0..=1))]
    pub core: Option<String>,

    /// When --core is used, this option will allow clients to connect to the public interface too. Otherwise, by default, they cannot.
    #[arg(long, requires("core"))]
    pub core_with_clients: bool,

    /// Quick config to forward all requests to another BROKER. format is "[DOMAIN/IP:PORT]@PEER_ID". An IPv6 should be encased in square brackets `[IPv6]` and the whole option should be between double quotes. Port defaults to 80 for IPs and 443 for domains
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

    /// Quick config to listen for clients and core brokers on PRIVATE_INTERFACE (can be "default"), behind a DMZ or port forwarding of a public static IP. PUBLIC_IPV6 is optional. PORTs defaults to 80.
    #[arg(
        short('u'),
        long,
        value_name("PRIVATE_INTERFACE:PORT,[PUBLIC_IPV6,]PUBLIC_IPV4:PORT"),
        conflicts_with("core")
    )]
    pub public: Option<String>,

    /// When --public or --dynamic is used, this option will disallow clients to connect to the public interface too. Otherwise, by default, they can. Should be used in combination with a --domain option
    #[arg(long, conflicts_with("private"))]
    pub public_without_clients: bool,

    /// When --public is used with a public IPV6, this option will bind the IPV6 to the private interface. This is how DMZ works for IpV6
    #[arg(long, requires("public"), conflicts_with("no_ipv6"))]
    pub bind_public_ipv6: bool,

    /// Quick config to listen for clients and core brokers on PRIVATE_INTERFACE, behind a DMZ or port forwarding of a public dynamic IP. PORTs defaults to 80
    #[arg(short('y'), long, value_name("PRIVATE_INTERFACE:PORT,PUBLIC_PORT"), default_missing_value("default"), num_args(0..=1), conflicts_with("public"), conflicts_with("core"))]
    pub dynamic: Option<String>,

    /// Quick config to listen for clients on localhost interface with port LOCAL_PORT (defaults to 1440), behind a reverse proxy that sends X-Forwarded-For for a TLS terminated DOMAIN name
    #[arg(short, long, value_name("DOMAIN:PORT,LOCAL_PORT"))]
    pub domain: Option<String>,

    /// Quick config to listen for clients on private INTERFACE:PORT (defaults to first private interface and/or port 1440), behind a reverse proxy that sends X-Forwarded-For for a TLS terminated DOMAIN name. Domain Port defaults to 443
    #[arg(
        short('x'),
        long,
        value_name("DOMAIN:PORT,INTERFACE:PORT"),
        conflicts_with("domain")
    )]
    pub domain_private: Option<String>,

    /// Option for --domain if this host is part of a pool of load-balanced servers behind a reverse proxy, and the same PeerId should be shared among them all
    #[arg(short('e'), long, value_name("PEER_KEY"))]
    pub domain_peer: Option<String>,

    /// Option for quick config: does not listen on any IPv6 interfaces
    #[arg(long)]
    pub no_ipv6: bool,

    /// Registration of new users is off. default is invitation-only registration
    #[arg(long)]
    pub registration_off: bool,

    /// Registration of new users is open to anybody without restriction. default is invitation-only registration
    #[arg(long, conflicts_with("registration_off"))]
    pub registration_open: bool,

    /// Registration URL used when creating invitation links, an optional url to redirect the user to, for accepting ToS and making payment, if any.
    #[arg(long)]
    pub registration_url: Option<String>,

    /// Admin userID
    #[arg(long)]
    pub admin: Option<String>,

    /// Admin invitation
    // #[arg(long, conflicts_with("admin"))]
    // pub invite_admin: bool,

    /// Saves the quick config into a file on disk, that can then be modified for advanced configs
    #[arg(long)]
    pub save_config: bool,

    /// Prints on stdout the Quick config submitted on command-line, or alternatively, the config already saved on disk
    #[arg(long)]
    pub print_config: bool,
    //TODO: to switch lang of error messages and CLI interface
    // pub lang: Option<String>,
}
