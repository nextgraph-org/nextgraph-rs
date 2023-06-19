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
use clap::Parser;
use p2p_broker::server_ws::run_server;
use p2p_broker::utils::*;
use p2p_net::utils::{gen_keys, keys_from_bytes, Dual25519Keys, Sensitive, U8Array};
use p2p_net::WS_PORT;
use p2p_repo::log::*;
use p2p_repo::{
    types::{PrivKey, PubKey},
    utils::{generate_keypair, keypair_from_ed, sign, verify},
};
use std::fs::{read_to_string, write};
use std::io::Read;
use std::io::Write;
use std::io::{BufReader, ErrorKind};
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

pub struct Interface {
    pub if_type: InterfaceType,
    pub name: String,
    pub mac_addr: Option<default_net::interface::MacAddr>,
    /// List of Ipv4Net for the network interface
    pub ipv4: Vec<default_net::ip::Ipv4Net>,
    /// List of Ipv6Net for the network interface
    pub ipv6: Vec<default_net::ip::Ipv6Net>,
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
    key_from_file = match res {
        Err(_) => None,
        Ok(k) => Some(k),
    };

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
                    // on purpose we don't log the key, just print it out stdout, as it should be saved in logger's files
                    println!("YOUR GENERATED KEY IS: {}", master_key);
                    log_err!("At your request, the key wasn't saved.");
                    log_err!("provide it again to the next start of ngd with --key option or NG_SERVER_KEY env variable");
                }
                res
            }
        }
    };

    println!("{:?}", keys);

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
