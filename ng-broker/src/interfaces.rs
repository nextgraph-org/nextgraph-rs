/*
 * Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
 */
use ng_net::types::{Interface, InterfaceType};
use ng_net::utils::{is_ipv4_private, is_public_ipv4};

#[cfg(not(target_arch = "wasm32"))]
pub fn print_ipv4(ip: &netdev::ip::Ipv4Net) -> String {
    format!("{}/{}", ip.addr, ip.prefix_len)
}
#[cfg(not(target_arch = "wasm32"))]
pub fn print_ipv6(ip: &netdev::ip::Ipv6Net) -> String {
    format!("{}/{}", ip.addr, ip.prefix_len)
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

#[cfg(not(target_arch = "wasm32"))]
pub fn get_interface() -> Vec<Interface> {
    let mut res: Vec<Interface> = vec![];
    let interfaces = netdev::get_interfaces();
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
