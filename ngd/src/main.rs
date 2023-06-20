// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
#[macro_use]
extern crate slice_as_array;

pub mod types;

mod cli;

use crate::cli::*;
use crate::types::*;
use clap::Parser;
use p2p_broker::server_ws::run_server;
use p2p_broker::types::*;
use p2p_broker::utils::*;
use p2p_net::types::*;
use p2p_net::utils::{gen_keys, keys_from_bytes, Dual25519Keys, Sensitive, U8Array};
use p2p_net::WS_PORT;
use p2p_repo::log::*;
use p2p_repo::{
    types::{PrivKey, PubKey},
    utils::{generate_keypair, keypair_from_ed, sign, verify},
};
use serde_json::{from_str, json, to_string_pretty};
use std::fs::{read_to_string, write};
use std::io::Read;
use std::io::Write;
use std::io::{BufReader, ErrorKind};
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::path::{Path, PathBuf};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum InterfaceType {
    Loopback,
    Private,
    Public,
    Invalid,
}

pub fn print_ipv4(ip: &default_net::ip::Ipv4Net) -> String {
    format!("{}/{}", ip.addr, ip.prefix_len)
}

pub fn print_ipv6(ip: &default_net::ip::Ipv6Net) -> String {
    format!("{}/{}", ip.addr, ip.prefix_len)
}

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

fn find_first(list: &Vec<Interface>, iftype: InterfaceType) -> Option<Interface> {
    for inf in list {
        if inf.if_type == iftype {
            return Some(inf.clone());
        }
    }
    None
}

fn find_first_or_name(
    list: &Vec<Interface>,
    iftype: InterfaceType,
    name: &String,
) -> Option<Interface> {
    for inf in list {
        if (name == "default" || *name == inf.name) && inf.if_type == iftype {
            return Some(inf.clone());
        }
    }
    None
}

pub fn get_interface() -> Vec<Interface> {
    let mut res: Vec<Interface> = vec![];
    let interfaces = default_net::get_interfaces();
    for interface in interfaces {
        if interface.ipv4.len() > 0 {
            let first_v4 = interface.ipv4[0].addr;
            let if_type = if first_v4.is_loopback() {
                InterfaceType::Loopback
            } else if first_v4.is_private() || first_v4.is_link_local() {
                InterfaceType::Private
            } else if !first_v4.is_unspecified()
                && !first_v4.is_documentation()
                && !first_v4.is_broadcast()
                && !first_v4.is_multicast()
            {
                InterfaceType::Public
            } else {
                InterfaceType::Invalid
            };
            if if_type == InterfaceType::Invalid {
                continue;
            }
            let interf = Interface {
                if_type,
                name: interface.name,
                mac_addr: interface.mac_addr,
                ipv4: interface.ipv4,
                ipv6: interface.ipv6,
            };
            res.push(interf);
        }
    }
    res
}

pub fn print_interfaces() {
    let interfaces = get_interface();
    for interface in interfaces {
        println!("{} \t{:?}", interface.name, interface.if_type);

        println!(
            "\tIPv4: {}",
            interface
                .ipv4
                .iter()
                .map(|ip| print_ipv4(ip))
                .collect::<Vec<String>>()
                .join(" ")
        );
        println!(
            "\tIPv6: {}",
            interface
                .ipv6
                .iter()
                .map(|ip| print_ipv6(ip))
                .collect::<Vec<String>>()
                .join(" ")
        );
        if let Some(mac_addr) = interface.mac_addr {
            println!("\tMAC: {}", mac_addr);
        }
    }
}

fn decode_key(key_string: String) -> Result<[u8; 32], ()> {
    let vec = base64_url::decode(&key_string).map_err(|_| log_err!("key has invalid content"))?;
    Ok(*slice_as_array!(&vec, [u8; 32])
        .ok_or(())
        .map_err(|_| log_err!("key has invalid content array"))?)
}

use lazy_static::lazy_static;
use regex::Regex;

//For windows: {846EE342-7039-11DE-9D20-806E6F6E6963}
//For the other OSes: en0 lo ...
#[cfg(not(target_os = "windows"))]
lazy_static! {
    static ref RE_INTERFACE: Regex = Regex::new(r"^([0-9a-z]{2,16})(\:\d{1,5})?$").unwrap();
}
#[cfg(target_os = "windows")]
lazy_static! {
    static ref RE_INTERFACE: Regex = Regex::new(
        r"^(\{[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}\})(\:\d{1,5})?$"
    )
    .unwrap();
}

lazy_static! {
    static ref RE_IPV6_WITH_PORT: Regex =
        Regex::new(r"^\[([0-9a-fA-F:]{3,39})\](\:\d{1,5})?$").unwrap();
}

pub static DEFAULT_PORT: u16 = 80;

fn parse_interface_and_port_for(string: String, for_option: &str) -> Result<(String, u16), ()> {
    let c = RE_INTERFACE.captures(&string);

    if c.is_some() && c.as_ref().unwrap().get(1).is_some() {
        let cap = c.unwrap();
        let interface = cap.get(1).unwrap().as_str();
        let port = match cap.get(2) {
            None => DEFAULT_PORT,
            Some(p) => {
                let mut chars = p.as_str().chars();
                chars.next();
                match from_str::<u16>(chars.as_str()) {
                    Err(_) => DEFAULT_PORT,
                    Ok(p) => p,
                }
            }
        };
        Ok((interface.to_string(), port))
    } else {
        log_err!(
            "The <INTERFACE:PORT> value submitted for the {} option is invalid. It should be the name of an interface found with --list-interfaces, with an optional port suffix of the form :123. Stopping here",
            for_option
        );
        Err(())
    }
}

fn parse_ipv6_for(string: String, for_option: &str) -> Result<Ipv6Addr, ()> {
    string.parse::<Ipv6Addr>().map_err(|_| ())
}

fn parse_ipv4_and_port_for(string: String, for_option: &str) -> Result<(Ipv4Addr, u16), ()> {
    let parts: Vec<&str> = string.split(":").collect();
    let ipv4_res = parts[0].parse::<Ipv4Addr>();

    if ipv4_res.is_err() {
        log_err!(
            "The <IPv4:PORT> value submitted for the {} option is invalid. Stopping here",
            for_option
        );
        return Err(());
    }
    let port;
    let ipv4 = ipv4_res.unwrap();
    if parts.len() > 1 {
        port = match from_str::<u16>(parts[1]) {
            Err(_) => DEFAULT_PORT,
            Ok(p) => p,
        };
    } else {
        port = DEFAULT_PORT;
    }
    return Ok((ipv4, port));
}

fn parse_ip_and_port_for(string: String, for_option: &str) -> Result<(IpAddr, u16), ()> {
    let c = RE_IPV6_WITH_PORT.captures(&string);
    let ipv6;
    let port;
    if c.is_some() && c.as_ref().unwrap().get(1).is_some() {
        let cap = c.unwrap();
        let ipv6_str = cap.get(1).unwrap().as_str();
        port = match cap.get(2) {
            None => DEFAULT_PORT,
            Some(p) => {
                let mut chars = p.as_str().chars();
                chars.next();
                match from_str::<u16>(chars.as_str()) {
                    Err(_) => DEFAULT_PORT,
                    Ok(p) => p,
                }
            }
        };
        let ipv6_res = ipv6_str.parse::<Ipv6Addr>();
        if ipv6_res.is_err() {
            log_err!(
                "The <[IPv6]:PORT> value submitted for the {} option is invalid. Stopping here",
                for_option
            );
            return Err(());
        }
        ipv6 = ipv6_res.unwrap();
        return Ok((IpAddr::V6(ipv6), port));
    } else {
        // we try just an IPV6 without port
        let ipv6_res = string.parse::<Ipv6Addr>();
        if ipv6_res.is_err() {
            // let's try IPv4

            return parse_ipv4_and_port_for(string, for_option)
                .map(|ipv4| (IpAddr::V4(ipv4.0), ipv4.1));
        } else {
            ipv6 = ipv6_res.unwrap();
            port = DEFAULT_PORT;
            return Ok((IpAddr::V6(ipv6), port));
        }
    }
}

fn parse_triple_interface_and_port_for(
    string: String,
    for_option: &str,
) -> Result<((String, u16), (Option<Ipv6Addr>, (Ipv4Addr, u16))), ()> {
    let parts: Vec<&str> = string.split(',').collect();
    if parts.len() < 2 {
        log_err!(
            "The <PRIVATE_INTERFACE:PORT,[PUBLIC_IPV6,]PUBLIC_IPV4:PORT> value submitted for the {} option is invalid. It should be composed of at least 2 parts separated by a comma. Stopping here",
            for_option
        );
        return Err(());
    }
    let first_part = parse_interface_and_port_for(
        parts[0].to_string(),
        &format!("private interface+PORT (left) part of the {}", for_option),
    );
    if first_part.is_err() {
        return Err(());
    }

    let mut middle_part = None;
    if parts.len() == 3 {
        let middle_part_res = parse_ipv6_for(
            parts[1].to_string(),
            &format!("public IPv6 (middle) part of the {}", for_option),
        );
        if middle_part_res.is_err() {
            return Err(());
        }
        middle_part = middle_part_res.ok();
    }

    let last_part = parse_ipv4_and_port_for(
        parts[parts.len() - 1].to_string(),
        &format!("public IPv4+PORT (right) part of the {}", for_option),
    );
    if last_part.is_err() {
        return Err(());
    }

    Ok((first_part.unwrap(), (middle_part, last_part.unwrap())))
}

#[async_std::main]
async fn main() -> std::io::Result<()> {
    let args = Cli::parse();

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

    log_info!("Starting NextGraph daemon (ngd)");

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
    let key_from_file: Option<[u8; 32]>;
    let res = |key_path| -> Result<[u8; 32], &str> {
        let file = read_to_string(key_path).map_err(|_| "")?;
        decode_key(
            file.lines()
                .nth(0)
                .ok_or("empty file")?
                .to_string()
                .trim()
                .to_string(),
        )
        .map_err(|_| "invalid file")
    }(&key_path);

    if res.is_err() && res.unwrap_err().len() > 0 {
        log_err!(
            "provided key file is incorrect. {}. aborting start",
            res.unwrap_err()
        );
        return Err(ErrorKind::InvalidInput.into());
    }
    key_from_file = res.ok();

    let keys: [[u8; 32]; 4] = match args.key {
        Some(key_string) => {
            if key_from_file.is_some() {
                log_err!("provided key option will not be used as a key file is already present");
                gen_broker_keys(Some(key_from_file.unwrap()))
            } else {
                let res = decode_key(key_string);
                if res.is_err() {
                    log_err!("provided key is invalid. cannot start");
                    return Err(ErrorKind::InvalidInput.into());
                }
                if args.save_key {
                    let master_key = base64_url::encode(&res.unwrap());
                    if let Err(e) = write(key_path.clone(), master_key) {
                        log_err!("cannot save key to file. aborting start");
                        return Err(e);
                    }
                    log_info!("The key has been saved to {}", key_path.to_str().unwrap());
                }
                gen_broker_keys(Some(res.unwrap()))
            }
        }
        None => {
            if key_from_file.is_some() {
                gen_broker_keys(Some(key_from_file.unwrap()))
            } else {
                let res = gen_broker_keys(None);
                let master_key = base64_url::encode(&res[0]);
                if args.save_key {
                    if let Err(e) = write(key_path.clone(), master_key) {
                        log_err!("cannot save key to file. aborting start");
                        return Err(e);
                    }
                    log_info!("The key has been saved to {}", key_path.to_str().unwrap());
                } else {
                    // on purpose we don't log the key, just print it out to stdout, as it should not be saved in logger's files
                    println!("YOUR GENERATED KEY IS: {}", master_key);
                    log_err!("At your request, the key wasn't saved.");
                    log_err!("provide it again to the next start of ngd with --key option or NG_SERVER_KEY env variable");
                }
                res
            }
        }
    };

    println!("{:?}", keys);

    // DEALING WITH CONFIG

    // reading config from file, if any
    let mut config_path = path.clone();
    config_path.push("config.json");
    let mut config: Option<DaemonConfig>;
    let res = |config_path| -> Result<DaemonConfig, String> {
        let file = read_to_string(config_path).map_err(|_| "".to_string())?;
        from_str(&file).map_err(|e| e.to_string())
    }(&config_path);

    if res.is_err() && res.as_ref().unwrap_err().len() > 0 {
        log_err!(
            "provided config file is incorrect. {}. aborting start",
            res.unwrap_err()
        );
        return Err(ErrorKind::InvalidInput.into());
    }
    config = res.ok();

    println!("CONFIG {:?}", config);

    if config.is_some() && args.save_config {
        log_err!("A config file is present. We cannot override it with Quick config options.");
        return Err(ErrorKind::InvalidInput.into());
    }

    if args.local.is_some()
        || args.forward.is_some()
        || args.core.is_some()
        || args.private.is_some()
        || args.public.is_some()
        || args.dynamic.is_some()
        || args.domain.is_some()
    {
        // QUICK CONFIG

        if config.is_some() {
            log_err!(
                "A config file is present. You can use the Quick config options of the command-line. In order to use them, delete your config file first."
            );
            return Err(ErrorKind::InvalidInput.into());
        }

        if args.domain_peer.is_some() && args.domain.is_none() {
            log_err!(
                "The --domain-peer option can only be set when the --domain option is also present on the command line"
            );
            return Err(ErrorKind::InvalidInput.into());
        }

        let mut listeners: Vec<ListenerV0> = vec![];
        let mut overlays_config: BrokerOverlayConfigV0 = BrokerOverlayConfigV0::new();

        let interfaces = get_interface();

        //// --local

        if args.local.is_some() {
            match find_first(&interfaces, InterfaceType::Loopback) {
                None => {
                    log_err!(
                        "That's pretty unusual, but no loopback interface could be found on your host"
                    );
                    return Err(ErrorKind::InvalidInput.into());
                }
                Some(loopback) => {
                    overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;
                    listeners.push(ListenerV0::new_direct(
                        loopback.name,
                        !args.no_ipv6,
                        args.local.unwrap(),
                    ));
                }
            }
        }

        //// --core

        if args.core.is_some() {
            let arg_value = parse_interface_and_port_for(args.core.unwrap(), "--core");
            if arg_value.is_err() {
                return Err(ErrorKind::InvalidInput.into());
            }

            let if_name = &arg_value.as_ref().unwrap().0;
            match find_first_or_name(&interfaces, InterfaceType::Public, &if_name) {
                None => {
                    log_err!(
                        "{}",
                        if if_name == "default" {
                            "We could not find a public IP interface on your host. If you are setting up a server behind a reverse proxy, enter the config manually in the config file".to_string()
                        } else {
                            format!(
                                "We could not find a public IP interface named {} on your host. use --list-interfaces to find the available interfaces on your host",
                                if_name
                            )
                        }
                    );
                    return Err(ErrorKind::InvalidInput.into());
                }
                Some(public) => {
                    overlays_config.core = BrokerOverlayPermission::AllRegisteredUser;
                    overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;
                    listeners.push(ListenerV0::new_direct(
                        public.name,
                        !args.no_ipv6,
                        arg_value.unwrap().1,
                    ));
                }
            }
        }

        //// --public

        if args.public.is_some() {
            let arg_value = parse_triple_interface_and_port_for(args.public.unwrap(), "--public");
            if arg_value.is_err() {
                return Err(ErrorKind::InvalidInput.into());
            }
            let public_part = &arg_value.as_ref().unwrap().1;
            let private_part = &arg_value.as_ref().unwrap().0;
            let private_interface;
            let if_name = &private_part.0;
            match find_first_or_name(&interfaces, InterfaceType::Private, &if_name) {
                None => {
                    log_err!(   "We could not find a private IP interface named {} on your host. use --list-interfaces to find the available interfaces on your host",
                                if_name
                            );
                    return Err(ErrorKind::InvalidInput.into());
                }
                Some(inter) => {
                    private_interface = inter;
                }
            }

            if args.no_ipv6 && public_part.0.is_some() {
                log_err!("The public IP is IPv6 but you selected the --no-ipv6 option");
                return Err(ErrorKind::InvalidInput.into());
            }

            overlays_config.core = BrokerOverlayPermission::AllRegisteredUser;
            overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;

            let ipv6 = public_part.0.map(|ipv6| BindAddress {
                port: public_part.1 .1,
                ip: (&IpAddr::V6(ipv6)).into(),
            });

            listeners.push(ListenerV0 {
                interface_name: private_interface.name,
                ipv6: public_part.0.is_some(),
                interface_refresh: 0,
                port: private_part.1,
                discoverable: false,
                accept_direct: false,
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

        //// --private

        if args.private.is_some() {
            let arg_value = parse_interface_and_port_for(args.private.unwrap(), "--private");
            if arg_value.is_err() {
                return Err(ErrorKind::InvalidInput.into());
            }

            let if_name = &arg_value.as_ref().unwrap().0;
            match find_first_or_name(&interfaces, InterfaceType::Private, &if_name) {
                None => {
                    log_err!(
                        "{}",
                        if if_name == "default" {
                            "We could not find a private IP interface on your host.".to_string()
                        } else {
                            format!(
                                "We could not find a private IP interface named {} on your host. use --list-interfaces to find the available interfaces on your host",
                                if_name
                            )
                        }
                    );
                    return Err(ErrorKind::InvalidInput.into());
                }
                Some(inter) => {
                    overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;

                    if listeners.last().is_some()
                        && listeners.last().unwrap().interface_name == inter.name
                        && listeners.last().unwrap().port == arg_value.as_ref().unwrap().1
                    {
                        let r = listeners.last_mut().unwrap();
                        r.accept_direct = true;
                        r.ipv6 = !args.no_ipv6;
                    } else {
                        listeners.push(ListenerV0::new_direct(
                            inter.name,
                            !args.no_ipv6,
                            arg_value.unwrap().1,
                        ));
                    }
                }
            }
        }

        //// --dynamic

        if args.dynamic.is_some() {
            let dynamic_string = args.dynamic.unwrap();
            let parts: Vec<&str> = dynamic_string.split(',').collect();

            let arg_value = parse_interface_and_port_for(parts[0].to_string(), "--dynamic");
            if arg_value.is_err() {
                return Err(ErrorKind::InvalidInput.into());
            }

            let public_port = if parts.len() == 2 {
                match from_str::<u16>(parts[1]) {
                    Err(_) => DEFAULT_PORT,
                    Ok(p) => p,
                }
            } else {
                DEFAULT_PORT
            };

            let if_name = &arg_value.as_ref().unwrap().0;

            match find_first_or_name(&interfaces, InterfaceType::Private, if_name) {
                None => {
                    log_err!(
                        "{}",
                        if if_name == "default" {
                            "We could not find a private IP interface on your host.".to_string()
                        } else {
                            format!(
                                "We could not find a private IP interface named {} on your host. use --list-interfaces to find the available interfaces on your host",
                                if_name
                            )
                        }
                    );
                    return Err(ErrorKind::InvalidInput.into());
                }
                Some(inter) => {
                    overlays_config.core = BrokerOverlayPermission::AllRegisteredUser;
                    overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;

                    if listeners.last().is_some()
                        && listeners.last().unwrap().interface_name == inter.name
                        && listeners.last().unwrap().port == arg_value.as_ref().unwrap().1
                    {
                        let r = listeners.last_mut().unwrap();
                        r.ipv6 = !args.no_ipv6;
                        if r.accept_forward_for != AcceptForwardForV0::No {
                            log_err!("The same private interface is already forwarding with a different setting, probably because of a --public option. Aborting");
                            return Err(ErrorKind::InvalidInput.into());
                        }
                        r.accept_forward_for =
                            AcceptForwardForV0::PublicDyn((public_port, 60, "".to_string()));
                    } else {
                        let mut listener =
                            ListenerV0::new_direct(inter.name, !args.no_ipv6, arg_value.unwrap().1);
                        listener.accept_direct = false;
                        listener.accept_forward_for =
                            AcceptForwardForV0::PublicDyn((public_port, 60, "".to_string()));
                        listeners.push(listener);
                    }
                }
            }
        }

        config = Some(DaemonConfig::V0(DaemonConfigV0 {
            listeners,
            overlays_config,
        }));

        if args.save_config {
            // saves the config to file
            let json_string = to_string_pretty(config.as_ref().unwrap()).unwrap();
            if let Err(e) = write(config_path.clone(), json_string) {
                log_err!("cannot save config to file. aborting start");
                return Err(e);
            }
            log_info!(
                "The config file has been saved to {}",
                config_path.to_str().unwrap()
            );
            log_info!(
                "You cannot use Quick config options anymore on the command line in your next start of the server. But you can go to modify the config file directly, or delete it.",
            );
        }
    } else {
        if config.is_none() {
            log_err!(
                "No Quick config option passed, neither is a config file present. We cannot start the server. Choose at least one Quick config option. see --help for details"
            );
            return Err(ErrorKind::InvalidInput.into());
        }
    }

    // let keys = gen_keys();
    // let pub_key = PubKey::Ed25519PubKey(keys.1);
    // let (ed_priv_key, ed_pub_key) = generate_keypair();

    // let duals = Dual25519Keys::generate();
    // let eds = keypair_from_ed(duals.ed25519_priv, duals.ed25519_pub);
    // let test_vector: Vec<u8> = vec![71, 51, 206, 126, 9, 84, 132];
    // let sig = sign(eds.0, eds.1, &test_vector).unwrap();
    // verify(&test_vector, sig, eds.1).unwrap();

    // let privkey = duals.x25519_priv;
    // let pubkey = PubKey::Ed25519PubKey(duals.x25519_public);

    // log_debug!("Public key of node: {:?}", keys.1);
    // log_debug!("Private key of node: {:?}", keys.0.as_slice());

    let (privkey, pubkey) = keys_from_bytes(keys[1]);

    // let pubkey = PubKey::Ed25519PubKey([
    //     95, 155, 249, 202, 41, 105, 71, 51, 206, 126, 9, 84, 132, 92, 60, 7, 74, 179, 46, 21, 21,
    //     242, 171, 27, 249, 79, 76, 176, 168, 43, 83, 2,
    // ]);
    // let privkey = Sensitive::<[u8; 32]>::from_slice(&[
    //     56, 86, 36, 0, 109, 59, 152, 66, 166, 71, 201, 20, 119, 64, 173, 99, 215, 52, 40, 189, 96,
    //     142, 3, 134, 167, 187, 235, 4, 39, 26, 31, 119,
    // ]);

    log_debug!("Public key of node: {:?}", pubkey);
    log_debug!("Private key of node: {:?}", privkey.as_slice());
    run_server("127.0.0.1", WS_PORT, privkey, pubkey, path).await?;

    Ok(())
}
