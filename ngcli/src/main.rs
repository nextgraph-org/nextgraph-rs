// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use core::fmt;
use std::error::Error;
use std::fs::{read_to_string, write};
use std::net::IpAddr;
use std::path::PathBuf;
use std::str::FromStr;

use clap::{arg, command, value_parser, Command};
use duration_str::parse;
use serde::{Deserialize, Serialize};
use serde_json::{from_str, to_string_pretty};
use zeroize::Zeroize;

use ng_repo::errors::*;
use ng_repo::log::*;
use ng_repo::types::*;
use ng_repo::utils::{decode_priv_key, display_timestamp, generate_keypair, timestamp_after};

use ng_net::actors::admin::*;
use ng_net::broker::BROKER;
use ng_net::types::*;

use ng_client_ws::remote_ws::ConnectionWebSocket;

/// CliConfig Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CliConfigV0 {
    pub ip: IpAddr,
    pub port: u16,
    pub peer_id: PubKey,
    pub user: Option<PrivKey>,
}

/// Cli config
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CliConfig {
    V0(CliConfigV0),
}

impl CliConfig {
    fn new_v0(ip: IpAddr, port: u16, peer_id: PubKey) -> Self {
        CliConfig::V0(CliConfigV0 {
            ip,
            port,
            peer_id,
            user: None,
        })
    }
}

#[derive(Debug)]
pub enum NgcliError {
    IoError(std::io::Error),
    NgError(NgError),
    InvalidKeyFile(String),
    CannotSaveKey(String),
    InvalidConfigFile(String),
    ProtocolError(ProtocolError),
    OtherConfigError(String),
    OtherConfigErrorStr(&'static str),
    CannotSaveConfig(String),
}

impl Error for NgcliError {}

impl From<NgcliError> for std::io::Error {
    fn from(err: NgcliError) -> std::io::Error {
        match err {
            NgcliError::NgError(e) => e.into(),
            NgcliError::ProtocolError(e) => Into::<NgError>::into(e).into(),
            NgcliError::IoError(e) => e,
            _ => std::io::Error::new(std::io::ErrorKind::Other, err.to_string().as_str()),
        }
    }
}

impl From<NgError> for NgcliError {
    fn from(err: NgError) -> NgcliError {
        Self::NgError(err)
    }
}

impl From<ProtocolError> for NgcliError {
    fn from(err: ProtocolError) -> NgcliError {
        Self::ProtocolError(err)
    }
}

impl From<std::io::Error> for NgcliError {
    fn from(io: std::io::Error) -> NgcliError {
        NgcliError::IoError(io)
    }
}

impl fmt::Display for NgcliError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidKeyFile(s) => write!(f, "provided key file is invalid. {}", s),
            Self::CannotSaveKey(s) => write!(f, "cannot save key to file. {}", s),
            Self::NgError(e) => write!(f, "{}", e.to_string()),
            Self::InvalidConfigFile(s) => write!(f, "provided config file is invalid. {}", s),
            Self::IoError(e) => write!(f, "IoError : {:?}", e),
            Self::ProtocolError(e) => write!(f, "{}", e),
            Self::OtherConfigError(s) => write!(f, "{}", s),
            Self::OtherConfigErrorStr(s) => write!(f, "{}", s),
            _ => write!(f, "{:?}", self),
        }
    }
}

fn gen_client_keys(key: Option<[u8; 32]>) -> [[u8; 32]; 4] {
    let key = match key {
        None => {
            let mut master_key = [0u8; 32];
            log_warn!("gen_client_keys: No key provided, generating one");
            getrandom::getrandom(&mut master_key).expect("getrandom failed");
            master_key
        }
        Some(k) => k,
    };
    let peerid: [u8; 32];
    let wallet: [u8; 32];
    let sig: [u8; 32];

    peerid = blake3::derive_key("NextGraph Client BLAKE3 key PeerId privkey", &key);
    wallet = blake3::derive_key("NextGraph Client BLAKE3 key wallet encryption", &key);
    sig = blake3::derive_key("NextGraph Client BLAKE3 key config signature", &key);

    [key, peerid, wallet, sig]
}

#[async_std::main]
async fn main() -> std::io::Result<()> {
    if let Err(err) = main_inner().await {
        log_err!("An error occurred: {}", err.to_string());
        return Err(err.into());
    }
    Ok(())
}
async fn main_inner() -> Result<(), NgcliError> {
    let matches = command!()
            .arg(arg!(
                -v --verbose ... "Increase the logging output. once : info, twice : debug, 3 times : trace"
            ))
            .arg(arg!(-b --base <PATH> "Base path for client home folder containing all persistent files, config, and key")
            .required(false)
            .value_parser(value_parser!(PathBuf))
            .default_value(".ng"))
            .arg(
                arg!(
                    -k --key <KEY> "Master key of the client. Should be a base64-url encoded serde serialization of PrivKey. 
                    If not provided, a new key will be generated for you"
                )
                .required(false)
                .env("NG_CLIENT_KEY"),
            )
            .arg(
                arg!(
                    -u --user <USER_PRIVKEY> "User ID to use to connect to the server. Should be a base64-url encoded serde 
                    serialization of a PrivKey representing the user private key"
                )
                .required(false)
                .env("NG_CLIENT_USER"),
            )
            .arg(
                arg!(
                    -s --server <IP_PORT_PEER_ID> "Server to connect to. IP can be IpV4 or IPv6, followed by a 
                    comma and port as u16 and another comma and PEER_ID 
                    should be a base64-url encoded serde serialization of a PubKey"
                )
                .required(false)
                .env("NG_CLIENT_SERVER"),
            )
            .arg(arg!(
                --save_key "Saves to disk the provided or automatically generated key. Only use if file storage is secure. 
                Alternatives are passing the key at every start with --key or NG_CLIENT_KEY env var."
                ).long("save-key").required(false))
            .arg(arg!(
                --save_config "Saves to disk the provided config of the <USER_PRIVKEY> and server <IP_PORT_PEER_ID>."
                ).long("save-config").required(false))
            .subcommand(
                Command::new("admin")
                    .about("admin users can administrate their broker (add user, create invite links)")
                    .subcommand_required(true)
                    .subcommand(
                        Command::new("add-user")
                            .about("add a user to the server, so it can connect to it")
                            .arg(arg!(<USER_ID> "userId of the user to add. should be a base64-url encoded serde serialization of its pubkey [u8; 32]").required(true))
                            .arg(arg!(-a --admin "make this user admin as well").required(false)))
                    .subcommand(
                        Command::new("del-user")
                            .about("removes a user from the broker")
                            .arg(arg!(<USER_ID> "userId of the user to remove. should be a base64-url encoded serde serialization of its pubkey [u8; 32]").required(true)))
                    .subcommand(
                        Command::new("list-users")
                            .about("list all users registered in the broker")
                            .arg(arg!(-a --admin "only lists admin users. otherwise, lists only non admin users").required(false)))
                    .subcommand(
                        Command::new("add-invitation")
                            .about("add an invitation to register on the server")
                            .arg(arg!([EXPIRES] "offset (from now) of time after which the invitation should expire. Format example: 1w 1d 1m. default unit is second. see https://crates.io/crates/duration-str for format").conflicts_with("forever"))
                        .arg(arg!(-a --admin "user registered with this invitation will have admin permissions").required(false))
                        .arg(arg!(-i --multi "many users can use this invitation to register themselves, until the invitation code is deleted by an admin").required(false).conflicts_with("admin").conflicts_with("unique"))
                        .arg(arg!(-u --unique "this invitation can be used only once. this is the default").required(false).conflicts_with("admin"))
                        .arg(arg!(-f --forever "this invitation does not expire. it can be used forever (or until deleted by an admin). default if no EXPIRES provided").required(false))
                        .arg(arg!(-n --name <NAME> "optional name of this broker that will be displayed to the user when registering: You have been invited to register an account at [NAME]").required(false))
                        .arg(arg!(-m --memo <MEMO> "optional memo about this invitation that will be kept in the server. it will help you to remember who you invited and to manage the invitation").required(false))
                        .arg(arg!(--notos "the TOS have already been accepted by the user. No need to redirect to a page for TOS acceptance.").required(false)))
                    .subcommand(
                        Command::new("list-invitations")
                            .about("list all invitations")
                            .arg(arg!(-a --admin "only lists admin invitations").required(false))
                            .arg(arg!(-m --multi "only lists multiple-use invitations").required(false))
                            .arg(arg!(-u --unique "only lists unique-use invitations").required(false)))
            )
            .subcommand(
                Command::new("gen-key")
                    .about("Generates a new key pair () public key and private key ) to be used by example for user authentication.")
            )
            .get_matches();

    if std::env::var("RUST_LOG").is_err() {
        match matches.get_one::<u8>("verbose").unwrap() {
            0 => std::env::set_var("RUST_LOG", "warn"),
            1 => std::env::set_var("RUST_LOG", "info"),
            2 => std::env::set_var("RUST_LOG", "debug"),
            3 => std::env::set_var("RUST_LOG", "trace"),
            _ => std::env::set_var("RUST_LOG", "trace"),
        }
    }
    env_logger::init();

    if let Some(_matches) = matches.subcommand_matches("gen-key") {
        let (privkey, pubkey) = generate_keypair();
        println!("Your UserId is: {pubkey}");
        println!("Your Private key is: {privkey}");
        return Ok(());
    }

    let base = matches.get_one::<PathBuf>("base").unwrap();
    log_debug!("base {:?}", base);

    let mut path = base.clone();
    path.push("client");
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
                .ok_or(NgcliError::InvalidKeyFile("empty file".to_string()))?;
            let res = decode_priv_key(first_line.trim())
                .map_err(|_| NgcliError::InvalidKeyFile("deserialization error".to_string()))?;
            file.zeroize();
            Some(*res.slice())
        }
    };

    let keys: [[u8; 32]; 4] = match matches.get_one::<String>("key") {
        Some(key_string) => {
            if key_from_file.is_some() {
                log_err!("provided --key option or NG_CLIENT_KEY var env will not be used as a key file is already present");
                //key_string.as_mut().zeroize();
                gen_client_keys(key_from_file)
            } else {
                let res = decode_priv_key(key_string.as_str()).map_err(|_| {
                    NgcliError::InvalidKeyFile(
                        "check the argument provided in command line".to_string(),
                    )
                })?;
                if matches.get_flag("save_key") {
                    let mut master_key = res.to_string();
                    write(key_path.clone(), &master_key)
                        .map_err(|e| NgcliError::CannotSaveKey(e.to_string()))?;
                    master_key.zeroize();
                    log_info!("The key has been saved to {}", key_path.to_str().unwrap());
                }
                //key_string.as_mut().zeroize();
                gen_client_keys(Some(*res.slice()))
            }
        }
        None => {
            if key_from_file.is_some() {
                gen_client_keys(key_from_file)
            } else {
                let res = gen_client_keys(None);
                let key = PrivKey::Ed25519PrivKey(res[0]);
                let mut master_key = key.to_string();
                if matches.get_flag("save_key") {
                    write(key_path.clone(), &master_key)
                        .map_err(|e| NgcliError::CannotSaveKey(e.to_string()))?;
                    log_info!("The key has been saved to {}", key_path.to_str().unwrap());
                } else {
                    // on purpose we don't log the key, just print it out to stdout, as it should not be saved in logger's files
                    println!("YOUR GENERATED KEY IS: {}", master_key);
                    log_err!("At your request, the key wasn't saved. If you want to save it to disk, use ---save-key");
                    log_err!("provide it again to the next start of ngcli with --key option or NG_CLIENT_KEY env variable");
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

    // reading config from file, if any
    let mut config_path = path.clone();
    config_path.push("config.json");
    let mut config: Option<CliConfig> = match read_to_string(config_path.clone()) {
        Err(_) => None,
        Ok(file) => {
            Some(from_str(&file).map_err(|e| NgcliError::InvalidConfigFile(e.to_string()))?)
        }
    };

    if let Some(server) = matches.get_one::<String>("server") {
        let addr: Vec<&str> = server.split(',').collect();
        if addr.len() != 3 {
            return Err(NgcliError::OtherConfigErrorStr(
                "NG_CLIENT_SERVER or the --server option is invalid. format is IP,PORT,PEER_ID.",
            ));
        }
        let ip = IpAddr::from_str(addr[0]).map_err(|_| {
            NgcliError::OtherConfigErrorStr("NG_CLIENT_SERVER or the --server option is invalid. format is IP,PORT,PEER_ID. The first part is not an IP address.")
            })?;

        let port = from_str::<u16>(addr[1]).map_err(|_| {
            NgcliError::OtherConfigErrorStr("NG_CLIENT_SERVER or the --server option is invalid. format is IP,PORT,PEER_ID. The port is invalid. It should be a number.")
        })?;
        let peer_id: PubKey = addr[2].try_into().map_err(|_| {
            NgcliError::OtherConfigErrorStr(
                "NG_CLIENT_SERVER or the --server option is invalid. format is IP,PORT,PEER_ID. The PEER_ID is invalid. It should be a base64-url encoded serde serialization of a PubKey."
            )
        })?;
        if config.is_some() {
            log_warn!("Overriding the config found in file with new server parameters provided on command line!");
            let CliConfig::V0(c) = config.as_mut().unwrap();
            c.ip = ip;
            c.port = port;
            c.peer_id = peer_id;
        } else {
            config = Some(CliConfig::new_v0(ip, port, peer_id));
        }
    }

    if config.is_none() {
        return Err(NgcliError::OtherConfigErrorStr(
            "No config found for the server to connect to. The config file is missing. You must provide NG_CLIENT_SERVER or the --server option.",
        ));
    }

    if let Some(user) = matches.get_one::<String>("user") {
        let privkey: PrivKey = user.as_str().try_into().map_err(|_| {
            NgcliError::OtherConfigErrorStr(
                "NG_CLIENT_USER or the --user option is invalid. It should be a base64-url encoded serde serialization of a PrivKey for a user.",
            )
        })?;
        if config.is_some() {
            let CliConfig::V0(c) = config.as_mut().unwrap();
            if c.user.is_some() {
                log_warn!("Overriding the config found in file with new user parameter provided on command line!");
            }
            c.user = Some(privkey);
        } else {
            panic!("should not happen. no config and no server params. cannot set user");
        }
    }

    let CliConfig::V0(config_v0) = config.as_ref().unwrap();
    if config_v0.user.is_none() {
        return Err(NgcliError::OtherConfigErrorStr(
            "No config found for the user. The config file is missing. You must provide NG_CLIENT_USER or the --user option.",
        ));
    }

    if matches.get_flag("save_config") {
        // saves the config to file
        let json_string = to_string_pretty(config.as_ref().unwrap()).unwrap();
        write(config_path.clone(), json_string).map_err(|e| {
            NgcliError::CannotSaveConfig(format!("cannot save config to file. {}.", e.to_string()))
        })?;

        log_info!(
            "The config file has been saved to {}",
            config_path.to_str().unwrap()
        );
    }

    async fn do_admin_call<
        A: Into<ProtocolMessage>
            + Into<AdminRequestContentV0>
            + std::fmt::Debug
            + Sync
            + Send
            + 'static,
    >(
        privk: [u8; 32],
        config_v0: &CliConfigV0,
        cmd: A,
    ) -> Result<AdminResponseContentV0, ProtocolError> {
        let peer_privk = PrivKey::Ed25519PrivKey(privk);
        let peer_pubk = peer_privk.to_pub();
        BROKER
            .write()
            .await
            .admin(
                Box::new(ConnectionWebSocket {}),
                peer_privk,
                peer_pubk,
                config_v0.peer_id,
                config_v0.user.as_ref().unwrap().to_pub(),
                config_v0.user.as_ref().unwrap().clone(),
                BindAddress {
                    port: config_v0.port,
                    ip: (&config_v0.ip).into(),
                },
                cmd,
            )
            .await
    }

    //log_debug!("{:?}", config);
    match matches.subcommand() {
        Some(("admin", sub_matches)) => match sub_matches.subcommand() {
            Some(("add-user", sub2_matches)) => {
                log_debug!("add-user");
                let _res = do_admin_call(
                    keys[1],
                    config_v0,
                    AddUser::V0(AddUserV0 {
                        user: sub2_matches
                            .get_one::<String>("USER_ID")
                            .unwrap()
                            .as_str()
                            .try_into()
                            .map_err(|_| {
                                NgcliError::OtherConfigErrorStr("supplied USER_ID is invalid")
                            })?,
                        is_admin: sub2_matches.get_flag("admin"),
                    }),
                )
                .await?;

                println!("User added successfully");
                return Ok(());
            }
            Some(("del-user", sub2_matches)) => {
                log_debug!("add-user");
                let _res = do_admin_call(
                    keys[1],
                    config_v0,
                    DelUser::V0(DelUserV0 {
                        user: sub2_matches
                            .get_one::<String>("USER_ID")
                            .unwrap()
                            .as_str()
                            .try_into()
                            .map_err(|_| {
                                NgcliError::OtherConfigErrorStr("supplied USER_ID is invalid")
                            })?,
                    }),
                )
                .await?;
                println!("User removed successfully");
                return Ok(());
            }
            Some(("list-users", sub2_matches)) => {
                log_debug!("list-users");
                let admins = sub2_matches.get_flag("admin");
                let res = do_admin_call(keys[1], config_v0, ListUsers::V0(ListUsersV0 { admins }))
                    .await?;
                match &res {
                    AdminResponseContentV0::Users(list) => {
                        println!(
                            "Found {} {}users",
                            list.len(),
                            if admins { "admin " } else { "" }
                        );
                        for user in list {
                            println!("{user}");
                        }
                    }
                    _ => return Err(NgError::InvalidResponse.into()),
                }
                return Ok(());
            }
            Some(("add-invitation", sub2_matches)) => {
                log_debug!("add-invitation");
                let expires = sub2_matches.get_one::<String>("EXPIRES");
                let expiry = if expires.is_some() {
                    let duration = parse(expires.unwrap().as_str()).unwrap();
                    timestamp_after(duration)
                } else {
                    0
                };
                let admin = sub2_matches.get_flag("admin");
                let multi = sub2_matches.get_flag("multi");
                let _unique = sub2_matches.get_flag("unique");

                let symkey = SymKey::random();
                let invite_code = if admin {
                    InvitationCode::Admin(symkey.clone())
                } else if multi {
                    InvitationCode::Multi(symkey.clone())
                } else {
                    InvitationCode::Unique(symkey.clone())
                };

                let mut res = do_admin_call(
                    keys[1],
                    config_v0,
                    AddInvitation::V0(AddInvitationV0 {
                        invite_code,
                        expiry,
                        memo: sub2_matches.get_one::<String>("memo").map(|s| s.clone()),
                        tos_url: !sub2_matches.get_flag("notos"),
                    }),
                )
                .await?;
                match &mut res {
                    AdminResponseContentV0::Invitation(invitation) => {
                        invitation
                            .set_name(sub2_matches.get_one::<String>("name").map(|s| s.clone()));

                        log_debug!("{:?}", invitation);
                        println!("Invitation created successfully. please note carefully the following links. share one of them with the invited user(s)");
                        for link in invitation.get_urls() {
                            println!("The invitation link is: {}", link)
                        }
                    }
                    _ => return Err(NgError::InvalidResponse.into()),
                }
                return Ok(());
            }
            Some(("list-invitations", sub2_matches)) => {
                log_debug!("invitations");
                let admin = sub2_matches.get_flag("admin");
                let multi = sub2_matches.get_flag("multi");
                let unique = sub2_matches.get_flag("unique");
                let res = do_admin_call(
                    keys[1],
                    config_v0,
                    ListInvitations::V0(ListInvitationsV0 {
                        admin,
                        multi,
                        unique,
                    }),
                )
                .await?;
                match &res {
                    AdminResponseContentV0::Invitations(list) => {
                        println!(
                            "Found {} {}invitations",
                            list.len(),
                            if admin && multi && unique {
                                "".to_string()
                            } else {
                                let mut name = vec![];
                                if admin {
                                    name.push("admin ");
                                }
                                if multi {
                                    name.push("multi ");
                                }
                                if unique {
                                    name.push("unique ");
                                }
                                name.join("or ")
                            }
                        );
                        for invite in list {
                            println!(
                                "{} expires {}. memo={}",
                                invite.0,
                                if invite.1 == 0 {
                                    "never".to_string()
                                } else {
                                    display_timestamp(&invite.1)
                                },
                                invite.2.as_ref().unwrap_or(&"".to_string())
                            );
                        }
                    }
                    _ => return Err(NgError::InvalidResponse.into()),
                }
                return Ok(());
            }
            _ => panic!("shouldn't happen"),
        },
        _ => println!("Nothing to do."),
    }

    Ok(())
}

// #[cfg(test)]
// mod test {

//     #[async_std::test]
//     pub async fn test_local_cnx() {}

//     //test_local_connection().await;

//     //test_remote_connection("ws://127.0.0.1:3012").await;

//     use async_std::task;
//     use ng_broker::server_ws::*;
//     use ng_net::utils::gen_dh_keys;
//     use ng_net::WS_PORT;
//     use ng_repo::log::*;
//     use ng_repo::types::PubKey;

//     //#[async_std::test]
// }
