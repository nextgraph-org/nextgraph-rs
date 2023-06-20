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
use p2p_net::utils::{is_ipv4_global, is_ipv4_private, is_ipv6_global, is_ipv6_private};
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum InterfaceType {
    Loopback,
    Private,
    Public,
    Invalid,
}

impl InterfaceType {
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

pub fn find_first(list: &Vec<Interface>, iftype: InterfaceType) -> Option<Interface> {
    for inf in list {
        if inf.if_type == iftype {
            return Some(inf.clone());
        }
    }
    None
}

pub fn find_first_or_name(
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

pub fn find_name(list: &Vec<Interface>, name: &String) -> Option<Interface> {
    for inf in list {
        if *name == inf.name {
            return Some(inf.clone());
        }
    }
    None
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

pub fn get_interface() -> Vec<Interface> {
    let mut res: Vec<Interface> = vec![];
    let interfaces = default_net::get_interfaces();
    for interface in interfaces {
        if interface.ipv4.len() > 0 {
            let first_v4 = interface.ipv4[0].addr;
            let if_type = if first_v4.is_loopback() {
                InterfaceType::Loopback
            } else if is_ipv4_private(&first_v4) {
                InterfaceType::Private
            } else if is_public_ipv4(&first_v4) {
                InterfaceType::Public
            } else {
                continue;
            };
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
