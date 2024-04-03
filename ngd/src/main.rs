// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

pub mod types;

mod cli;

use crate::cli::*;
use crate::types::*;
use clap::Parser;
use ng_broker::interfaces::*;
use ng_broker::server_ws::run_server_v0;
use ng_broker::types::*;
use ng_broker::utils::*;
use ng_net::types::*;
use ng_net::utils::is_private_ip;
use ng_net::utils::is_public_ip;
use ng_net::utils::is_public_ipv4;
use ng_net::utils::is_public_ipv6;
use ng_net::utils::{
    gen_dh_keys, is_ipv4_global, is_ipv4_private, is_ipv6_global, is_ipv6_private,
};
use ng_net::{WS_PORT, WS_PORT_REVERSE_PROXY};
use ng_repo::log::*;
use ng_repo::types::Sig;
use ng_repo::types::SymKey;
use ng_repo::utils::ed_keypair_from_priv_bytes;
use ng_repo::{
    types::{PrivKey, PubKey},
    utils::{decode_key, generate_keypair, sign, verify},
};
use serde_json::{from_str, to_string_pretty};
use std::fs::{read_to_string, write};
use std::io::ErrorKind;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::path::PathBuf;
use zeroize::Zeroize;

use addr::parser::DnsName;
use addr::psl::List;
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

pub static DEFAULT_PORT: u16 = WS_PORT;

pub static DEFAULT_TLS_PORT: u16 = 443;

fn parse_interface_and_port_for(
    string: &String,
    for_option: &str,
    default_port: u16,
) -> Result<(String, u16), ()> {
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
        log_err!(
            "The <INTERFACE:PORT> value submitted for the {} option is invalid. It should be the name of an interface found with --list-interfaces, with an optional port suffix of the form :123. cannot start",
            for_option
        );
        Err(())
    }
}

fn parse_ipv6_for(string: String, for_option: &str) -> Result<Ipv6Addr, ()> {
    string.parse::<Ipv6Addr>().map_err(|_| {
        log_err!(
            "The <IPv6> value submitted for the {} option is invalid. cannot start",
            for_option
        )
    })
}

fn parse_ipv4_and_port_for(
    string: String,
    for_option: &str,
    default_port: u16,
) -> Result<(Ipv4Addr, u16), ()> {
    let parts: Vec<&str> = string.split(":").collect();
    let ipv4 = parts[0].parse::<Ipv4Addr>().map_err(|_| {
        log_err!(
            "The <IPv4:PORT> value submitted for the {} option is invalid. cannot start",
            for_option
        )
    })?;

    let port;
    if parts.len() > 1 {
        port = match from_str::<u16>(parts[1]) {
            Err(_) => default_port,
            Ok(p) => {
                if p == 0 {
                    default_port
                } else {
                    p
                }
            }
        };
    } else {
        port = default_port;
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
                    Ok(p) => {
                        if p == 0 {
                            DEFAULT_PORT
                        } else {
                            p
                        }
                    }
                }
            }
        };
        let ipv6 = ipv6_str.parse::<Ipv6Addr>().map_err(|_| {
            log_err!(
                "The <[IPv6]:PORT> value submitted for the {} option is invalid. cannot start",
                for_option
            )
        })?;
        return Ok((IpAddr::V6(ipv6), port));
    } else {
        // we try just an IPV6 without port
        let ipv6_res = string.parse::<Ipv6Addr>();
        if ipv6_res.is_err() {
            // let's try IPv4

            return parse_ipv4_and_port_for(string, for_option, DEFAULT_PORT)
                .map(|ipv4| (IpAddr::V4(ipv4.0), ipv4.1));
        } else {
            ipv6 = ipv6_res.unwrap();
            port = DEFAULT_PORT;
            return Ok((IpAddr::V6(ipv6), port));
        }
    }
}

fn parse_triple_interface_and_port_for(
    string: &String,
    for_option: &str,
) -> Result<((String, u16), (Option<Ipv6Addr>, (Ipv4Addr, u16))), ()> {
    let parts: Vec<&str> = string.split(',').collect();
    if parts.len() < 2 {
        log_err!(
            "The <PRIVATE_INTERFACE:PORT,[PUBLIC_IPV6,]PUBLIC_IPV4:PORT> value submitted for the {} option is invalid. It should be composed of at least 2 parts separated by a comma. cannot start",
            for_option
        );
        return Err(());
    }
    let first_part = parse_interface_and_port_for(
        &parts[0].to_string(),
        &format!("private interface+PORT (left) part of the {}", for_option),
        DEFAULT_PORT,
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
        DEFAULT_PORT,
    );
    if last_part.is_err() {
        return Err(());
    }

    Ok((first_part.unwrap(), (middle_part, last_part.unwrap())))
}

fn parse_domain_and_port(
    domain_string: &String,
    option: &str,
    default_port: u16,
) -> Result<(String, String, u16), ()> {
    let parts: Vec<&str> = domain_string.split(':').collect();

    // check validity of domain name
    let valid_domain = List.parse_dns_name(parts[0]);
    match valid_domain {
        Err(e) => {
            log_err!(
                "The domain name provided for option {} is invalid. {}. cannot start",
                option,
                e.to_string()
            );
            return Err(());
        }
        Ok(name) => {
            if !name.has_known_suffix() {
                log_err!(
                            "The domain name provided for option {} is invalid. Unknown suffix in public list. cannot start", option
                        );
                return Err(());
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
    let mut domain_with_port = parts[0].clone().to_string();
    if port != default_port {
        domain_with_port.push_str(&format!(":{}", port));
    }
    Ok((parts[0].to_string(), domain_with_port, port))
}

fn prepare_accept_forward_for_domain(
    domain: String,
    args: &mut Cli,
) -> Result<AcceptForwardForV0, ()> {
    if args.domain_peer.is_some() {
        let key = decode_key(args.domain_peer.as_ref().unwrap().as_str())?;
        args.domain_peer.as_mut().unwrap().zeroize();

        Ok(AcceptForwardForV0::PublicDomainPeer((
            domain,
            PrivKey::Ed25519PrivKey(key),
            "".to_string(),
        )))
    } else {
        Ok(AcceptForwardForV0::PublicDomain((domain, "".to_string())))
    }
}

#[async_std::main]
async fn main() -> std::io::Result<()> {
    main_inner()
        .await
        .map_err(|_| ErrorKind::InvalidInput.into())
}

async fn main_inner() -> Result<(), ()> {
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
        let mut file = read_to_string(key_path).map_err(|_| "")?;
        let first_line = file.lines().nth(0).ok_or("empty file")?;
        let res = decode_key(first_line.trim()).map_err(|_| "invalid file");
        file.zeroize();
        res
    }(&key_path);

    if res.is_err() && res.unwrap_err().len() > 0 {
        log_err!(
            "provided key file is incorrect. {}. cannot start",
            res.unwrap_err()
        );
        return Err(());
    }
    key_from_file = res.ok();

    let mut keys: [[u8; 32]; 4] = match &args.key {
        Some(key_string) => {
            if key_from_file.is_some() {
                log_err!("provided --key option will not be used as a key file is already present");
                args.key.as_mut().unwrap().zeroize();
                gen_broker_keys(key_from_file)
            } else {
                let res = decode_key(key_string.as_str())
                    .map_err(|_| log_err!("provided key is invalid. cannot start"))?;
                if args.save_key {
                    let mut master_key = base64_url::encode(&res);
                    write(key_path.clone(), &master_key).map_err(|e| {
                        log_err!("cannot save key to file. {}.cannot start", e.to_string())
                    })?;
                    master_key.zeroize();
                    log_info!("The key has been saved to {}", key_path.to_str().unwrap());
                }
                args.key.as_mut().unwrap().zeroize();
                gen_broker_keys(Some(res))
            }
        }
        None => {
            if key_from_file.is_some() {
                gen_broker_keys(key_from_file)
            } else {
                let res = gen_broker_keys(None);
                let mut master_key = base64_url::encode(&res[0]);
                if args.save_key {
                    write(key_path.clone(), &master_key).map_err(|e| {
                        log_err!("cannot save key to file. {}.cannot start", e.to_string())
                    })?;
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
    let sign_from_file: Option<[u8; 32]>;
    let res = |sign_path| -> Result<(), &str> {
        let file = std::fs::read(sign_path).map_err(|_| "")?;
        let sig: Sig = serde_bare::from_slice(&file).map_err(|_| "invalid serialization")?;
        let privkey: PrivKey = keys[3].into();
        let pubkey = privkey.to_pub();
        verify(&vec![110u8, 103u8, 100u8], sig, pubkey).map_err(|_| "invalid signature")?;
        Ok(())
    }(&sign_path);

    if res.is_err() {
        if res.unwrap_err().len() > 0 {
            log_err!(
                "provided key is invalid. {}. cannot start",
                res.unwrap_err()
            );
            return Err(());
        } else {
            // time to save the signature
            let privkey: PrivKey = keys[3].into();
            let pubkey = privkey.to_pub();
            let sig = sign(&privkey, &pubkey, &vec![110u8, 103u8, 100u8]);
            if sig.is_err() {
                log_err!("cannot save signature. cannot start");
                return Err(());
            }
            let sig_ser = serde_bare::to_vec(&sig.unwrap()).unwrap();
            let res = std::fs::write(sign_path, sig_ser);
            if res.is_err() {
                log_err!("cannot save signature. {}. cannot start", res.unwrap_err());
                return Err(());
            }
        }
    }

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
            "provided config file is incorrect. {}. cannot start",
            res.unwrap_err()
        );
        return Err(());
    }
    config = res.ok();

    if config.is_some() && args.save_config {
        log_err!("A config file is present. We cannot override it with Quick config options. cannot start");
        return Err(());
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
            log_err!(
                "A config file is present. You cannot use the Quick config options on the command-line. In order to use them, delete your config file first. cannot start"
            );
            return Err(());
        }

        if args.domain_peer.is_some() && args.domain_private.is_none() && args.domain.is_none() {
            log_err!(
                "The --domain-peer option can only be set when the --domain or --domain-private option is also present on the command line. cannot start"
            );
            return Err(());
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
                    log_err!(
                        "That's pretty unusual, but no loopback interface could be found on your host. --domain option failed for that reason. cannot start"
                    );
                    return Err(());
                }
                Some(loopback) => {
                    overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;
                    let mut listener = ListenerV0::new_direct(loopback, !args.no_ipv6, local_port);
                    listener.accept_direct = false;
                    let res = prepare_accept_forward_for_domain(domain, &mut args).map_err(|_| {
                        log_err!("The --domain-peer option has an invalid key. it must be a base64_url encoded serialization of a PrivKey. cannot start")
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
                    log_err!(
                        "That's pretty unusual, but no loopback interface could be found on your host. cannot start"
                    );
                    return Err(());
                }
                Some(loopback) => {
                    overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;

                    if listeners.last().is_some()
                        && listeners.last().unwrap().interface_name == loopback.name
                        && listeners.last().unwrap().port == args.local.unwrap()
                    {
                        if args.domain_peer.is_some() {
                            log_err!(
                                "--local is not allowed if --domain-peer is selected, as they both use the same port. change the port of one of them. cannot start"
                            );
                            return Err(());
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
                    log_err!(
                        "{}",
                        if if_name == "default" {
                            "We could not find a public IP interface on your host. If you are setting up a server behind a reverse proxy, enter the config manually in the config file. cannot start".to_string()
                        } else {
                            format!(
                                "We could not find a public IP interface named {} on your host. use --list-interfaces to find the available interfaces on your host. cannot start",
                                if_name
                            )
                        }
                    );
                    return Err(());
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
                    log_err!(
                        "{}",
                        if if_name == "default" {
                            "We could not find a private IP interface on your host for --public option. cannot start"
                                .to_string()
                        } else {
                            format!(
                                "We could not find a private IP interface named {} on your host. use --list-interfaces to find the available interfaces on your host. cannot start",
                                if_name
                            )
                        }
                    );
                    return Err(());
                }
                Some(inter) => {
                    private_interface = inter;
                }
            }

            if !is_public_ipv4(&public_part.1 .0)
                || public_part.0.is_some() && !is_public_ipv6(public_part.0.as_ref().unwrap())
            {
                log_err!("The provided IPs are not public. cannot start");
                return Err(());
            }

            if args.no_ipv6 && public_part.0.is_some() {
                log_err!(
                    "The public IP is IPv6 but you selected the --no-ipv6 option. cannot start"
                );
                return Err(());
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
                    log_err!(
                        "{}",
                        if if_name == "default" {
                            "We could not find a private IP interface on your host for --dynamic option. cannot start"
                                .to_string()
                        } else {
                            format!(
                                "We could not find a private IP interface named {} on your host. use --list-interfaces to find the available interfaces on your host. cannot start",
                                if_name
                            )
                        }
                    );
                    return Err(());
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
                            log_err!("The same private interface is already forwarding with a different setting, probably because of a --public option conflicting with a --dynamic option. Changing the port on one of the interfaces can help. cannot start");
                            return Err(());
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
                    log_err!(
                        "{}",
                        if if_name == "default" {
                            "We could not find a private IP interface on your host for --domain-private option. cannot start"
                                .to_string()
                        } else {
                            format!(
                                "We could not find a private IP interface named {} on your host. use --list-interfaces to find the available interfaces on your host. cannot start",
                                if_name
                            )
                        }
                    );
                    return Err(());
                }
                Some(inter) => {
                    overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;

                    let res = prepare_accept_forward_for_domain(domain, &mut args).map_err(|_| {
                        log_err!("The --domain-peer option has an invalid key. it must be a base64_url encoded serialization of a PrivKey. cannot start")})?;

                    if listeners.last().is_some()
                        && listeners.last().unwrap().interface_name == inter.name
                        && listeners.last().unwrap().port == arg_value.1
                    {
                        let r = listeners.last_mut().unwrap();
                        if r.accept_forward_for != AcceptForwardForV0::No {
                            log_err!("The same private interface is already forwarding with a different setting, probably because of a --public or --dynamic option conflicting with the --domain-private option. Changing the port on one of the interfaces can help. cannot start");
                            return Err(());
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
                    log_err!(
                        "{}",
                        if if_name == "default" {
                            "We could not find a private IP interface on your host. cannot start"
                                .to_string()
                        } else {
                            format!(
                                        "We could not find a private IP interface named {} on your host. use --list-interfaces to find the available interfaces on your host. cannot start",
                                        if_name
                                    )
                        }
                    );
                    return Err(());
                }
                Some(inter) => {
                    overlays_config.server = BrokerOverlayPermission::AllRegisteredUser;

                    if listeners.last().is_some()
                        && listeners.last().unwrap().interface_name == inter.name
                        && listeners.last().unwrap().port == arg_value.1
                    {
                        if args.domain_peer.is_some() {
                            log_err!(
                                "--private is not allowed if --domain-peer is selected, and they both use the same port. change the port of one of them. cannot start"
                            );
                            return Err(());
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
                log_err!(
                    "The option --forward is invalid. It must contain two parts separated by a @ character. cannot start"
                );
                return Err(());
            }
            let pub_key_array = decode_key(parts[1])
                .map_err(|_| log_err!("The PEER_ID provided in the --forward option is invalid"))?;
            let peer_id = PubKey::Ed25519PubKey(pub_key_array);

            let server_type = if parts[0].len() > 0 {
                let first_char = parts[0].chars().next().unwrap();

                if first_char == '[' || first_char.is_numeric() {
                    // an IPv6 or IPv4
                    let bind = parse_ip_and_port_for(parts[0].to_string(), "--forward")?;
                    let bind_addr = BindAddress {
                        ip: (&bind.0).into(),
                        port: bind.1,
                    };
                    if is_private_ip(&bind.0) {
                        BrokerServerTypeV0::BoxPrivate(vec![bind_addr])
                    } else if is_public_ip(&bind.0) {
                        BrokerServerTypeV0::Public(vec![bind_addr])
                    } else {
                        log_err!("Invalid IP address given for --forward option. cannot start");
                        return Err(());
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
                .map_err(|e| {
                    log_warn!("The admin UserId supplied is invalid. no admin user configured.");
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
                log_err!(
                    "cannot save config to file. {}. cannot start",
                    e.to_string()
                )
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
            log_err!(
                "No Quick config option passed, neither is a config file present. We cannot start the server. Choose at least one Quick config option. see --help for details"
            );
            return Err(());
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
