// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

#![doc(hidden)]

pub mod types;

mod cli;

use core::fmt;
use std::error::Error;
use std::fs::{read_to_string, write};
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::path::PathBuf;

use addr::parser::DnsName;
use addr::psl::List;
use clap::Parser;
use lazy_static::lazy_static;
use regex::Regex;
use serde_json::{from_str, to_string_pretty};
use zeroize::Zeroize;

use ng_repo::errors::NgError;
use ng_repo::log::*;
use ng_repo::types::{Sig, SymKey};
use ng_repo::utils::ed_keypair_from_priv_bytes;
use ng_repo::{
    types::PrivKey,
    utils::{decode_key, decode_priv_key, sign, verify},
};

use ng_net::types::*;
use ng_net::utils::*;
use ng_net::{WS_PORT, WS_PORT_REVERSE_PROXY};

use ng_broker::interfaces::*;
use ng_broker::server_ws::run_server_v0;
use ng_broker::types::*;
use ng_broker::utils::*;

use crate::cli::*;

//For windows: {846EE342-7039-11DE-9D20-806E6F6E6963}
//For the other OSes: en0 lo ...

#[cfg(not(target_os = "windows"))]
lazy_static! {
    #[doc(hidden)]
    static ref RE_INTERFACE: Regex = Regex::new(r"^([0-9a-z]{2,16})(\:\d{1,5})?$").unwrap();
}

#[cfg(target_os = "windows")]
lazy_static! {
    #[doc(hidden)]
    static ref RE_INTERFACE: Regex = Regex::new(
        r"^(\{[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}\})(\:\d{1,5})?$"
    )
    .unwrap();
}

pub static DEFAULT_PORT: u16 = WS_PORT;

pub static DEFAULT_TLS_PORT: u16 = 443;

fn parse_interface_and_port_for(
    string: &String,
    for_option: &str,
    default_port: u16,
) -> Result<(String, u16), NgdError> {
    let c = RE_INTERFACE.captures(string);

    if c.is_some() && c.as_ref().unwrap().get(1).is_some() {
        let cap = c.unwrap();
        let interface = cap.get(1).unwrap().as_str();
        let port = match cap.get(2) {
            None => default_port,
            Some(p) => {
                let mut chars = p.as_str().chars();
                chars.next();
                match from_str::<u16>(chars.as_str()) {
                    Err(_) => default_port,
                    Ok(p) => {
                        if p == 0 {
                            default_port
                        } else {
                            p
                        }
                    }
                }
            }
        };
        Ok((interface.to_string(), port))
    } else {
        Err(NgdError::OtherConfigError(format!(
            "The <INTERFACE:PORT> value submitted for the {} option is invalid. It should be the name of an interface found with --list-interfaces, with an optional port suffix of the form :123.",
            for_option
        )))
    }
}

fn parse_ipv6_for(string: String, for_option: &str) -> Result<Ipv6Addr, NgdError> {
    string.parse::<Ipv6Addr>().map_err(|_| {
        NgdError::OtherConfigError(format!(
            "The <IPv6> value submitted for the {} option is invalid.",
            for_option
        ))
    })
}

fn parse_triple_interface_and_port_for(
    string: &String,
    for_option: &str,
) -> Result<((String, u16), (Option<Ipv6Addr>, (Ipv4Addr, u16))), NgdError> {
    let parts: Vec<&str> = string.split(',').collect();
    if parts.len() < 2 {
        return Err(NgdError::OtherConfigError(format!(
            "The <PRIVATE_INTERFACE:PORT,[PUBLIC_IPV6,]PUBLIC_IPV4:PORT> value submitted for the {} option is invalid. It should be composed of at least 2 parts separated by a comma.",
            for_option
        )));
    }
    let first_part = parse_interface_and_port_for(
        &parts[0].to_string(),
        &format!("private interface+PORT (left) part of the {}", for_option),
        DEFAULT_PORT,
    )?;

    let mut middle_part = None;
    if parts.len() == 3 {
        let middle_part_res = parse_ipv6_for(
            parts[1].to_string(),
            &format!("public IPv6 (middle) part of the {}", for_option),
        )?;
        middle_part = Some(middle_part_res);
    }

    let last_part = parse_ipv4_and_port_for(
        parts[parts.len() - 1].to_string(),
        &format!("public IPv4+PORT (right) part of the {}", for_option),
        DEFAULT_PORT,
    )?;

    Ok((first_part, (middle_part, last_part)))
}

fn parse_domain_and_port(
    domain_string: &String,
    option: &str,
    default_port: u16,
) -> Result<(String, String, u16), NgdError> {
    let parts: Vec<&str> = domain_string.split(':').collect();

    // check validity of domain name
    let valid_domain = List.parse_dns_name(parts[0]);
    match valid_domain {
        Err(e) => {
            return Err(NgdError::OtherConfigError(format!(
                "The domain name provided for option {} is invalid. {}.",
                option,
                e.to_string()
            )));
        }
        Ok(name) => {
            if !name.has_known_suffix() {
                return Err(NgdError::OtherConfigError(format!(
                            "The domain name provided for option {} is invalid. Unknown suffix in public list.", option
                        )));
            }
        }
    }

    let port = if parts.len() > 1 {
        match from_str::<u16>(parts[1]) {
            Err(_) => default_port,
            Ok(p) => {
                if p == 0 {
                    default_port
                } else {
                    p
                }
            }
        }
    } else {
        default_port
    };
    let mut domain_with_port = parts[0].to_string();
    if port != default_port {
        domain_with_port.push_str(&format!(":{}", port));
    }
    Ok((parts[0].to_string(), domain_with_port, port))
}

fn prepare_accept_forward_for_domain(
    domain: String,
    args: &mut Cli,
) -> Result<AcceptForwardForV0, NgError> {
    if args.domain_peer.is_some() {
        let key = decode_priv_key(args.domain_peer.as_ref().unwrap().as_str())?;
        args.domain_peer.as_mut().unwrap().zeroize();

        Ok(AcceptForwardForV0::PublicDomainPeer((
            domain,
            key,
            "".to_string(),
        )))
    } else {
        Ok(AcceptForwardForV0::PublicDomain((domain, "".to_string())))
    }
}
#[derive(Debug)]
pub enum NgdError {
    IoError(std::io::Error),
    NgError(NgError),
    InvalidKeyFile(String),
    CannotSaveKey(String),
    InvalidSignature,
    CannotSaveSignature(String),
    InvalidConfigFile(String),
    ConfigCannotSave,
    ConfigFilePresent,
    ConfigDomainPeerConflict,
    NoLoopback,
    OtherConfigError(String),
    OtherConfigErrorStr(&'static str),
    CannotSaveConfig(String),
}

impl Error for NgdError {}

impl From<NgdError> for std::io::Error {
    fn from(err: NgdError) -> std::io::Error {
        match err {
            NgdError::NgError(e) => e.into(),
            NgdError::IoError(e) => e,
            _ => std::io::Error::new(std::io::ErrorKind::Other, err.to_string().as_str()),
        }
    }
}

impl From<NgError> for NgdError {
    fn from(err: NgError) -> NgdError {
        match err {
            NgError::ConfigError(c) => Self::OtherConfigError(c),
            _ => Self::NgError(err),
        }
    }
}

impl From<std::io::Error> for NgdError {
    fn from(io: std::io::Error) -> NgdError {
        NgdError::IoError(io)
    }
}

impl fmt::Display for NgdError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidKeyFile(s) => write!(f, "provided key file is invalid. {}", s),
            Self::CannotSaveKey(s) => write!(f, "cannot save key to file. {}", s),
            Self::NgError(e) => write!(f, "{}", e.to_string()),
            Self::InvalidConfigFile(s) => write!(f, "provided config file is invalid. {}", s),
            Self::IoError(e) => write!(f, "IoError : {:?}", e),
            Self::ConfigCannotSave => write!(
                f,
                "A config file is present. We cannot override it with Quick config options"
            ),
            Self::ConfigFilePresent => write!(
                f,
                "A config file is present. You cannot use the Quick config options on the command-line. In order to use them, delete your config file first."
            ),
            Self::ConfigDomainPeerConflict => write!(
                f,"The --domain-peer option can only be set when the --domain or --domain-private option is also present on the command line."),
            Self::NoLoopback => write!(
                f,"That's pretty unusual, but no loopback interface could be found on your host. --domain option failed for that reason."),
            Self::OtherConfigError(s) => write!(f, "{}", s),
            Self::OtherConfigErrorStr(s) => write!(f, "{}", s),
            _ => write!(f, "{:?}", self),
        }
    }
}

#[async_std::main]
async fn main() -> std::io::Result<()> {
    if let Err(err) = main_inner().await {
        log_err!("Cannot start: {}", err.to_string());
        return Err(err.into());
    }
    Ok(())
}
async fn main_inner() -> Result<(), NgdError> {
    let mut args = Cli::parse();

    if args.list_interfaces {
        println!("list of network interfaces");
        print_interfaces();
        return Ok(());
    }

    if std::env::var("RUST_LOG").is_err() {
        if args.verbose == 0 {
            std::env::set_var("RUST_LOG", "warn");
        } else if args.verbose == 1 {
            std::env::set_var("RUST_LOG", "info");
        } else if args.verbose == 2 {
            std::env::set_var("RUST_LOG", "debug");
        } else if args.verbose >= 3 {
            std::env::set_var("RUST_LOG", "trace");
        }
    }
    env_logger::init();

    log_info!(
        "Starting NextGraph daemon (ngd) version {}",
        env!("CARGO_PKG_VERSION").to_string()
    );

    log_debug!("base {:?}", args.base);

    let mut path = PathBuf::from(&args.base);
    path.push("server");
    if !path.is_absolute() {
        path = std::env::current_dir().unwrap().join(path);
    }

    log_debug!("cur {}", std::env::current_dir().unwrap().display());
    log_debug!("home {}", path.to_str().unwrap());
    std::fs::create_dir_all(path.clone()).unwrap();

    // reading key from file, if any
    let mut key_path = path.clone();
    key_path.push("key");

    let key_from_file: Option<[u8; 32]> = match read_to_string(key_path.clone()) {
        Err(_) => None,
        Ok(mut file) => {
            let first_line = file
                .lines()
                .nth(0)
                .ok_or(NgdError::InvalidKeyFile("empty file".to_string()))?;
            let res = decode_priv_key(first_line.trim())
                .map_err(|_| NgdError::InvalidKeyFile("deserialization error".to_string()))?;
            file.zeroize();
            Some(*res.slice())
        }
    };

    let mut keys: [[u8; 32]; 4] = match &args.key {
        Some(key_string) => {
            if key_from_file.is_some() {
                log_err!("provided --key option will not be used as a key file is already present");
                args.key.as_mut().unwrap().zeroize();
                gen_broker_keys(key_from_file)
            } else {
                let res = decode_priv_key(key_string.as_str()).map_err(|_| {
                    NgdError::InvalidKeyFile(
                        "check the argument provided in command line".to_string(),
                    )
                })?;
                if args.save_key {
                    write(key_path.clone(), res.to_string())
                        .map_err(|e| NgdError::CannotSaveKey(e.to_string()))?;
                    //master_key.zeroize();
                    log_info!("The key has been saved to {}", key_path.to_str().unwrap());
                }
                args.key.as_mut().unwrap().zeroize();
                gen_broker_keys(Some(*res.slice()))
            }
        }
        None => {
            if key_from_file.is_some() {
                gen_broker_keys(key_from_file)
            } else {
                let res = gen_broker_keys(None);
                let key = PrivKey::Ed25519PrivKey(res[0]);
                let mut master_key = key.to_string();
                if args.save_key {
                    write(key_path.clone(), &master_key)
                        .map_err(|e| NgdError::CannotSaveKey(e.to_string()))?;
                    log_info!("The key has been saved to {}", key_path.to_str().unwrap());
                } else {
                    // on purpose we don't log the key, just print it out to stdout, as it should not be saved in logger's files
                    println!("YOUR GENERATED KEY IS: {}", master_key);
                    log_err!("At your request, the key wasn't saved. If you want to save it to disk, use ---save-key");
                    log_err!("provide it again to the next start of ngd with --key option or NG_SERVER_KEY env variable");
                }
                master_key.zeroize();
                res
            }
        }
    };

    key_from_file.and_then(|mut key| {
        key.zeroize();
        None::<()>
    });

    let mut sign_path = path.clone();
    sign_path.push("sign");
    //let sign_from_file: Option<[u8; 32]>;
    let privkey: PrivKey = keys[3].into();
    let pubkey = privkey.to_pub();

    if match std::fs::read(sign_path.clone()) {
        Err(_) => true,
        Ok(file) => {
            let sig: Sig = serde_bare::from_slice(&file).map_err(|_| NgdError::InvalidSignature)?;
            verify(&vec![110u8, 103u8, 100u8], sig, pubkey)
                .map_err(|_| NgdError::InvalidSignature)?;
            false
        }
    } {
        // time to save the signature
        let sig = sign(&privkey, &pubkey, &vec![110u8, 103u8, 100u8])
            .map_err(|e| NgdError::CannotSaveSignature(e.to_string()))?;

        let sig_ser = serde_bare::to_vec(&sig).unwrap();
        std::fs::write(sign_path, sig_ser)
            .map_err(|e| NgdError::CannotSaveSignature(e.to_string()))?;
    }

    // DEALING WITH CONFIG

    // reading config from file, if any
    let mut config_path = path.clone();
    config_path.push("config.json");
    let mut config: Option<DaemonConfig> = match read_to_string(config_path.clone()) {
        Err(_) => None,
        Ok(file) => Some(from_str(&file).map_err(|e| NgdError::InvalidConfigFile(e.to_string()))?),
    };

    if config.is_some() && args.save_config {
        return Err(NgdError::ConfigCannotSave);
    }

    if args.local.is_some()
        || args.forward.is_some()
        || args.core.is_some()
        || args.private.is_some()
        || args.public.is_some()
        || args.dynamic.is_some()
        || args.domain.is_some()
        || args.domain_private.is_some()
    {
        // QUICK CONFIG

        if config.is_some() && !args.print_config {
            return Err(NgdError::ConfigFilePresent);
        }

        if args.domain_peer.is_some() && args.domain_private.is_none() && args.domain.is_none() {
            return Err(NgdError::ConfigCannotSave);
        }

        let mut listeners: Vec<ListenerV0> = vec![];
        let mut overlays_config: BrokerOverlayConfigV0 = BrokerOverlayConfigV0::new();

        let interfaces = get_interface();

        //// --domain

        if args.domain.is_some() {
            let domain_string = args.domain.as_ref().unwrap();
            let parts: Vec<&str> = domain_string.split(',').collect();
            let local_port;
            let (_, domain, _) = if parts.len() == 1 {
                local_port = WS_PORT_REVERSE_PROXY;
                parse_domain_and_port(domain_string, "--domain", DEFAULT_TLS_PORT)?
            } else {
                local_port = match from_str::<u16>(parts[1]) {
                    Err(_) => WS_PORT_REVERSE_PROXY,
                    Ok(p) => {
                        if p == 0 {
                            WS_PORT_REVERSE_PROXY
                        } else {
                            p
                        }
                    }
                };
                parse_domain_and_port(&parts[0].to_string(), "--domain", DEFAULT_TLS_PORT)?
            };

            match find_first(&interfaces, InterfaceType::Loopback) {
                None => {
                    return Err(NgdError::NoLoopback);
                }
                Some(loopback) => {
                    overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;
                    let mut listener = ListenerV0::new_direct(loopback, !args.no_ipv6, local_port);
                    listener.accept_direct = false;
                    let res = prepare_accept_forward_for_domain(domain, &mut args).map_err(|_| {
                        NgdError::OtherConfigErrorStr("The --domain-peer option has an invalid key. it must be a base64_url encoded serialization of a PrivKey.")
                    })?;
                    listener.accept_forward_for = res;
                    listeners.push(listener);
                }
            }
        }

        //// --local

        if args.local.is_some() {
            match find_first(&interfaces, InterfaceType::Loopback) {
                None => {
                    return Err(NgdError::OtherConfigErrorStr("That's pretty unusual, but no loopback interface could be found on your host."));
                }
                Some(loopback) => {
                    overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;

                    if listeners.last().is_some()
                        && listeners.last().unwrap().interface_name == loopback.name
                        && listeners.last().unwrap().port == args.local.unwrap()
                    {
                        if args.domain_peer.is_some() {
                            return Err(NgdError::OtherConfigErrorStr( "--local is not allowed if --domain-peer is selected, as they both use the same port. change the port of one of them"));
                        }
                        let r = listeners.last_mut().unwrap();
                        r.accept_direct = true;
                        r.ipv6 = !args.no_ipv6;
                    } else {
                        listeners.push(ListenerV0::new_direct(
                            loopback,
                            !args.no_ipv6,
                            args.local.unwrap(),
                        ));
                    }
                }
            }
        }

        // --core
        // core listeners always come after the domain ones, which is good as the first bootstrap in the list should be the domain (if there is also a core_with_clients that generates a Public bootstrap)
        if args.core.is_some() {
            let arg_value =
                parse_interface_and_port_for(args.core.as_ref().unwrap(), "--core", DEFAULT_PORT)?;

            let if_name = &arg_value.0;
            match find_first_or_name(&interfaces, InterfaceType::Public, &if_name) {
                None => {
                    if if_name == "default" {
                        return Err(NgdError::OtherConfigErrorStr("We could not find a public IP interface on your host. If you are setting up a server behind a reverse proxy, enter the config manually in the config file."));
                    } else {
                        return Err(NgdError::OtherConfigError(format!(
                                "We could not find a public IP interface named {} on your host. use --list-interfaces to find the available interfaces on your host.",
                                if_name
                            )));
                    }
                }
                Some(public) => {
                    overlays_config.core = BrokerOverlayPermission::AllRegisteredUser;
                    let mut listener = ListenerV0::new_direct(public, !args.no_ipv6, arg_value.1);
                    if args.core_with_clients {
                        overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;
                    } else {
                        listener.refuse_clients = true;
                    }
                    listener.serve_app = false;
                    listeners.push(listener);
                }
            }
        }

        //// --public

        if args.public.is_some() {
            let arg_value =
                parse_triple_interface_and_port_for(args.public.as_ref().unwrap(), "--public")?;

            let public_part = &arg_value.1;
            let private_part = &arg_value.0;
            let private_interface;
            let if_name = &private_part.0;
            match find_first_or_name(&interfaces, InterfaceType::Private, &if_name) {
                None => {
                    if if_name == "default" {
                        return Err(NgdError::OtherConfigErrorStr("We could not find a private IP interface on your host for --public option."));
                    } else {
                        return Err(NgdError::OtherConfigError(format!(
                                "We could not find a private IP interface named {} on your host. use --list-interfaces to find the available interfaces on your host.",
                                if_name
                            )));
                    }
                }
                Some(inter) => {
                    private_interface = inter;
                }
            }

            if !is_public_ipv4(&public_part.1 .0)
                || public_part.0.is_some() && !is_public_ipv6(public_part.0.as_ref().unwrap())
            {
                return Err(NgdError::OtherConfigErrorStr(
                    "The provided IPs are not public.",
                ));
            }

            if args.no_ipv6 && public_part.0.is_some() {
                return Err(NgdError::OtherConfigErrorStr(
                    "The public IP is IPv6 but you selected the --no-ipv6 option.",
                ));
            }

            overlays_config.core = BrokerOverlayPermission::AllRegisteredUser;
            if !args.public_without_clients {
                overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;
            }

            let ipv6 = public_part.0.map(|ipv6| BindAddress {
                port: public_part.1 .1,
                ip: (&IpAddr::V6(ipv6)).into(),
            });

            listeners.push(ListenerV0 {
                interface_name: private_interface.name,
                if_type: private_interface.if_type,
                ipv6: public_part.0.is_some(),
                interface_refresh: 0,
                port: private_part.1,
                private_core: false,
                discoverable: false,
                refuse_clients: args.public_without_clients,
                serve_app: false,
                accept_direct: false,
                bind_public_ipv6: ipv6.is_some() && args.bind_public_ipv6,
                accept_forward_for: AcceptForwardForV0::PublicStatic((
                    BindAddress {
                        port: public_part.1 .1,
                        ip: (&IpAddr::V4(public_part.1 .0)).into(),
                    },
                    ipv6,
                    "".to_string(),
                )),
            });
        }

        //// --dynamic

        if args.dynamic.is_some() {
            let dynamic_string = args.dynamic.as_ref().unwrap();
            let parts: Vec<&str> = dynamic_string.split(',').collect();

            let arg_value =
                parse_interface_and_port_for(&parts[0].to_string(), "--dynamic", DEFAULT_PORT)?;

            let public_port = if parts.len() == 2 {
                match from_str::<u16>(parts[1]) {
                    Err(_) => DEFAULT_PORT,
                    Ok(p) => {
                        if p == 0 {
                            DEFAULT_PORT
                        } else {
                            p
                        }
                    }
                }
            } else {
                DEFAULT_PORT
            };

            let if_name = &arg_value.0;

            match find_first_or_name(&interfaces, InterfaceType::Private, if_name) {
                None => {
                    if if_name == "default" {
                        return Err(NgdError::OtherConfigErrorStr("We could not find a private IP interface on your host for --dynamic option."));
                    } else {
                        return Err(NgdError::OtherConfigError(format!(
                                "We could not find a private IP interface named {} on your host. use --list-interfaces to find the available interfaces on your host.",
                                if_name
                            )));
                    }
                }
                Some(inter) => {
                    overlays_config.core = BrokerOverlayPermission::AllRegisteredUser;
                    if !args.public_without_clients {
                        overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;
                    }

                    if listeners.last().is_some()
                        && listeners.last().unwrap().interface_name == inter.name
                        && listeners.last().unwrap().port == arg_value.1
                    {
                        let r = listeners.last_mut().unwrap();
                        if r.accept_forward_for != AcceptForwardForV0::No {
                            return Err(NgdError::OtherConfigErrorStr("The same private interface is already forwarding with a different setting, probably because of a --public option conflicting with a --dynamic option. Changing the port on one of the interfaces can help."));
                        }
                        panic!("this should never happen. --dynamic created after a --private");
                        //r.ipv6 = !args.no_ipv6;
                        //r.accept_forward_for = AcceptForwardForV0::PublicDyn((public_port, 60, "".to_string()));
                    } else {
                        let mut listener =
                            ListenerV0::new_direct(inter, !args.no_ipv6, arg_value.1);
                        listener.accept_direct = false;
                        listener.refuse_clients = args.public_without_clients;
                        listener.serve_app = false;
                        listener.accept_forward_for =
                            AcceptForwardForV0::PublicDyn((public_port, 60, "".to_string()));
                        listeners.push(listener);
                    }
                }
            }
        }

        //// --domain-private

        if args.domain_private.is_some() {
            let domain_string = args.domain_private.as_ref().unwrap();
            let parts: Vec<&str> = domain_string.split(',').collect();

            let (_, domain, _) =
                parse_domain_and_port(&parts[0].to_string(), "--domain-private", DEFAULT_TLS_PORT)?;

            let bind_string = if parts.len() > 1 { parts[1] } else { "default" };

            let arg_value = parse_interface_and_port_for(
                &bind_string.to_string(),
                "--domain-private",
                WS_PORT_REVERSE_PROXY,
            )?;

            let if_name = &arg_value.0;
            match find_first_or_name(&interfaces, InterfaceType::Private, &if_name) {
                None => {
                    if if_name == "default" {
                        return Err(NgdError::OtherConfigErrorStr("We could not find a private IP interface on your host for --domain-private option."));
                    } else {
                        return Err(NgdError::OtherConfigError(format!(
                                "We could not find a private IP interface named {} on your host. use --list-interfaces to find the available interfaces on your host.",
                                if_name
                            )));
                    }
                }
                Some(inter) => {
                    overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;

                    let res = prepare_accept_forward_for_domain(domain, &mut args).map_err(|_| {
                        NgdError::OtherConfigErrorStr("The --domain-peer option has an invalid key. it must be a base64_url encoded serialization of a PrivKey.")})?;

                    if listeners.last().is_some()
                        && listeners.last().unwrap().interface_name == inter.name
                        && listeners.last().unwrap().port == arg_value.1
                    {
                        let r = listeners.last_mut().unwrap();
                        if r.accept_forward_for != AcceptForwardForV0::No {
                            return Err(NgdError::OtherConfigErrorStr("The same private interface is already forwarding with a different setting, probably because of a --public or --dynamic option conflicting with the --domain-private option. Changing the port on one of the interfaces can help."));
                        }
                        panic!(
                            "this should never happen. --domain-private created after a --private"
                        );
                        //r.ipv6 = !args.no_ipv6;
                        //r.accept_forward_for = res;
                    } else {
                        let mut listener =
                            ListenerV0::new_direct(inter, !args.no_ipv6, arg_value.1);
                        listener.accept_direct = false;
                        listener.accept_forward_for = res;

                        listeners.push(listener);
                    }
                }
            }
        }

        //// --private

        if args.private.is_some() {
            let arg_value = parse_interface_and_port_for(
                args.private.as_ref().unwrap(),
                "--private",
                DEFAULT_PORT,
            )?;

            let if_name = &arg_value.0;
            match find_first_or_name(&interfaces, InterfaceType::Private, &if_name) {
                None => {
                    if if_name == "default" {
                        return Err(NgdError::OtherConfigErrorStr(
                            "We could not find a private IP interface on your host.",
                        ));
                    } else {
                        return Err(NgdError::OtherConfigError(
                            format!(
                                        "We could not find a private IP interface named {} on your host. use --list-interfaces to find the available interfaces on your host.",
                                        if_name
                                    )));
                    }
                }
                Some(inter) => {
                    overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;

                    if listeners.last().is_some()
                        && listeners.last().unwrap().interface_name == inter.name
                        && listeners.last().unwrap().port == arg_value.1
                    {
                        if args.domain_peer.is_some() {
                            return Err(NgdError::OtherConfigErrorStr(
                                "--private is not allowed if --domain-peer is selected, and they both use the same port. change the port of one of them.")
                            );
                        }
                        let r = listeners.last_mut().unwrap();
                        r.accept_direct = true;
                        r.serve_app = true;
                        r.ipv6 = !args.no_ipv6;
                    } else {
                        listeners.push(ListenerV0::new_direct(inter, !args.no_ipv6, arg_value.1));
                    }
                }
            }
        }

        //// --forward

        if args.forward.is_some() {
            //"[DOMAIN/IP:PORT]@PEERID"
            let forward_string = args.forward.as_ref().unwrap();
            let parts: Vec<&str> = forward_string.split('@').collect();

            if parts.len() != 2 {
                return Err(NgdError::OtherConfigErrorStr(
                    "The option --forward is invalid. It must contain two parts separated by a @ character."
                ));
            }
            let pub_key_array = decode_key(parts[1]).map_err(|_| {
                NgdError::OtherConfigErrorStr(
                    "The PEER_ID provided in the --forward option is invalid",
                )
            })?;
            let peer_id = pub_key_array;

            let server_type = if parts[0].len() > 0 {
                let first_char = parts[0].chars().next().unwrap();

                if first_char == '[' || first_char.is_numeric() {
                    // an IPv6 or IPv4
                    let bind_addr = parse_ip_and_port_for(parts[0].to_string(), "--forward")?;
                    if bind_addr.ip.is_private() {
                        BrokerServerTypeV0::BoxPrivate(vec![bind_addr])
                    } else if bind_addr.ip.is_public() {
                        BrokerServerTypeV0::Public(vec![bind_addr])
                    } else {
                        return Err(NgdError::OtherConfigErrorStr(
                            "Invalid IP address given for --forward option.",
                        ));
                    }
                } else {
                    // a domain name
                    let (_, domain, _) = parse_domain_and_port(
                        &parts[0].to_string(),
                        "--forward",
                        DEFAULT_TLS_PORT,
                    )?;
                    BrokerServerTypeV0::Domain(domain)
                }
            } else {
                BrokerServerTypeV0::BoxPublicDyn(vec![])
            };
            overlays_config.forward = vec![BrokerServerV0 {
                server_type,
                can_verify: false,
                can_forward: false,
                peer_id,
            }];
        }

        let registration = if args.registration_off {
            RegistrationConfig::Closed
        } else if args.registration_open {
            RegistrationConfig::Open
        } else {
            RegistrationConfig::Invitation
        };

        let admin_user = if args.admin.is_some() {
            args.admin
                .unwrap()
                .as_str()
                .try_into()
                .map_err(|_e| {
                    log_warn!("The supplied admin UserId is invalid. no admin user configured.");
                })
                .ok()
        } else {
            None
        };

        config = Some(DaemonConfig::V0(DaemonConfigV0 {
            listeners,
            overlays_configs: vec![overlays_config],
            registration,
            admin_user,
            registration_url: args.registration_url,
        }));

        if args.print_config {
            let json_string = to_string_pretty(config.as_ref().unwrap()).unwrap();
            println!("The Quick config would be:\n{}", json_string);
            return Ok(());
        }

        if args.save_config {
            // saves the config to file
            let json_string = to_string_pretty(config.as_ref().unwrap()).unwrap();
            write(config_path.clone(), json_string).map_err(|e| {
                NgdError::CannotSaveConfig(format!(
                    "cannot save config to file. {}.",
                    e.to_string()
                ))
            })?;
            log_info!(
                "The config file has been saved to {}",
                config_path.to_str().unwrap()
            );
            log_info!(
                "You will not be able to use any Quick config options anymore on the command line at the next command-line start of the server. But you can go to modify the config file directly, or delete it.",
            );
        }
    } else {
        if config.is_none() {
            return Err(NgdError::OtherConfigErrorStr(
                "No Quick config option passed, neither is a config file present. Choose at least one Quick config option. see --help for details"
            ));
        }
        if args.print_config {
            let json_string = to_string_pretty(config.as_ref().unwrap()).unwrap();
            println!("The saved config is:\n{}", json_string);
            return Ok(());
        }
    }

    let (privkey, pubkey) = ed_keypair_from_priv_bytes(keys[1]);
    keys[1].zeroize();
    keys[0].zeroize();

    log_info!("PeerId of node: {}", pubkey);

    //debug_println!("Private key of peer: {}", privkey.to_string());

    //let x_from_ed = pubkey.to_dh_from_ed();
    //log_info!("du Pubkey from ed: {}", x_from_ed);

    match config.unwrap() {
        DaemonConfig::V0(v0) => {
            run_server_v0(
                privkey,
                pubkey,
                SymKey::from_array(keys[2]),
                v0,
                path,
                args.invite_admin,
            )
            .await?
        }
    }

    Ok(())
}
