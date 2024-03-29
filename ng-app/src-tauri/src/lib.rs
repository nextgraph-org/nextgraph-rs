// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
use async_std::stream::StreamExt;
use ng_wallet::types::*;
use ng_wallet::*;
use p2p_client_ws::remote_ws::ConnectionWebSocket;
use p2p_net::broker::*;
use p2p_net::types::{ClientInfo, CreateAccountBSP, Invitation};
use p2p_net::utils::{decode_invitation_string, spawn_and_log_error, Receiver, ResultSend};
use p2p_repo::errors::NgError;
use p2p_repo::log::*;
use p2p_repo::types::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{read, write};
use tauri::scope::ipc::RemoteDomainAccessScope;
use tauri::utils::config::WindowConfig;
use tauri::{path::BaseDirectory, App, Manager, Window};

#[cfg(mobile)]
mod mobile;
#[cfg(mobile)]
pub use mobile::*;

pub type SetupHook = Box<dyn FnOnce(&mut App) -> Result<(), Box<dyn std::error::Error>> + Send>;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
// #[tauri::command(rename_all = "snake_case")]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

#[tauri::command(rename_all = "snake_case")]
async fn test(app: tauri::AppHandle) -> Result<(), ()> {
    log_debug!("test is {}", BROKER.read().await.test());
    let path = app
        .path()
        .resolve("storage", BaseDirectory::AppLocalData)
        .map_err(|_| ())?;

    //BROKER.read().await.test_storage(path);

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_gen_shuffle_for_pazzle_opening(pazzle_length: u8) -> Result<ShuffledPazzle, ()> {
    log_debug!(
        "wallet_gen_shuffle_for_pazzle_opening from rust {}",
        pazzle_length
    );
    Ok(gen_shuffle_for_pazzle_opening(pazzle_length))
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_gen_shuffle_for_pin() -> Result<Vec<u8>, ()> {
    log_debug!("wallet_gen_shuffle_for_pin from rust");
    Ok(gen_shuffle_for_pin())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_open_wallet_with_pazzle(
    wallet: Wallet,
    pazzle: Vec<u8>,
    pin: [u8; 4],
) -> Result<EncryptedWallet, String> {
    log_debug!("wallet_open_wallet_with_pazzle from rust {:?}", pazzle);
    open_wallet_with_pazzle(wallet, pazzle, pin).map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_create_wallet(
    mut params: CreateWalletV0,
    app: tauri::AppHandle,
) -> Result<(CreateWalletResultV0, Option<SessionWalletStorageV0>), String> {
    //log_debug!("wallet_create_wallet from rust {:?}", params);
    params.result_with_wallet_file = !params.local_save;
    let local_save = params.local_save;
    let res = create_wallet_v0(params).await.map_err(|e| e.to_string());
    if res.is_ok() {
        let mut cwr = res.unwrap();
        if local_save {
            // save in local store

            let session = save_wallet_locally(&cwr, app).await;
            if session.is_err() {
                return Err("Cannot save wallet locally".to_string());
            }
            return Ok((cwr, Some(session.unwrap())));
        } else {
            // save wallet file to Downloads folder
            let path = app
                .path()
                .resolve(
                    format!("wallet-{}.ngw", cwr.wallet_name),
                    BaseDirectory::Download,
                )
                .unwrap();
            let _r = write(path, &cwr.wallet_file);
            cwr.wallet_file = vec![];
            return Ok((cwr, None));
        }
    }
    Err(res.unwrap_err())
}

async fn save_wallet_locally(
    res: &CreateWalletResultV0,
    app: tauri::AppHandle,
) -> Result<SessionWalletStorageV0, ()> {
    let path = app
        .path()
        .resolve("wallets", BaseDirectory::AppLocalData)
        .map_err(|_| ())?;
    let mut wallets: HashMap<String, LocalWalletStorageV0> =
        get_wallets_from_localstorage(app.clone())
            .await
            .unwrap_or(Some(HashMap::new()))
            .unwrap_or(HashMap::new());
    // check that the wallet is not already present in localStorage
    if wallets.get(&res.wallet_name).is_none() {
        let lws: LocalWalletStorageV0 = res.into();
        wallets.insert(res.wallet_name.clone(), lws);
        let lws_ser = LocalWalletStorage::v0_to_vec(wallets);
        let r = write(path.clone(), &lws_ser);
        if r.is_err() {
            log_debug!("write {:?} {}", path, r.unwrap_err());
            return Err(());
        }
        let sws = save_new_session(&res.wallet_name, res.wallet.id(), res.user, app)?;
        Ok(sws)
    } else {
        Err(())
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_open_file(file: Vec<u8>, app: tauri::AppHandle) -> Result<Wallet, String> {
    let ngf: NgFile = file.try_into().map_err(|e: NgError| e.to_string())?;
    if let NgFile::V0(NgFileV0::Wallet(wallet)) = ngf {
        let mut wallets: HashMap<String, LocalWalletStorageV0> =
            get_wallets_from_localstorage(app.clone())
                .await
                .unwrap_or(Some(HashMap::new()))
                .unwrap_or(HashMap::new());
        // check that the wallet is not already present in localStorage
        let wallet_name = wallet.name();
        if wallets.get(&wallet_name).is_none() {
            Ok(wallet)
        } else {
            Err("Wallet already present on this device".to_string())
        }
    } else {
        Err("File does not contain a wallet".to_string())
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_import(
    previous_wallet: Wallet,
    opened_wallet: EncryptedWallet,
    app: tauri::AppHandle,
) -> Result<(String, ClientV0), String> {
    let path = app
        .path()
        .resolve("wallets", BaseDirectory::AppLocalData)
        .map_err(|_| "wallet directory error".to_string())?;
    let mut wallets: HashMap<String, LocalWalletStorageV0> =
        get_wallets_from_localstorage(app.clone())
            .await
            .unwrap_or(Some(HashMap::new()))
            .unwrap_or(HashMap::new());
    // check that the wallet is not already present in localStorage
    let EncryptedWallet::V0(mut opened_wallet_v0) = opened_wallet;
    let wallet_name = opened_wallet_v0.wallet_id.clone();
    if wallets.get(&wallet_name).is_none() {
        let session = save_new_session(
            &wallet_name,
            opened_wallet_v0.wallet_privkey.to_pub(),
            opened_wallet_v0.personal_site,
            app,
        )
        .map_err(|_| "Cannot create new session".to_string())?;
        let (wallet, client_id, client) = opened_wallet_v0
            .import(previous_wallet, session)
            .map_err(|e| e.to_string())?;
        let lws = LocalWalletStorageV0::new(wallet, &client);

        wallets.insert(wallet_name, lws);
        let lws_ser = LocalWalletStorage::v0_to_vec(wallets);
        let r = write(path.clone(), &lws_ser);
        if r.is_err() {
            log_debug!("write {:?} {}", path, r.unwrap_err());
            Err("Write error".to_string())
        } else {
            Ok((client_id, client))
        }
    } else {
        Err("Already present on this device".to_string())
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn get_wallets_from_localstorage(
    app: tauri::AppHandle,
) -> Result<Option<HashMap<String, LocalWalletStorageV0>>, ()> {
    let path = app
        .path()
        .resolve("wallets", BaseDirectory::AppLocalData)
        .map_err(|_| ())?;
    let map_ser = read(path);
    if map_ser.is_ok() {
        let wallets = LocalWalletStorage::v0_from_vec(&map_ser.unwrap());
        let LocalWalletStorage::V0(v0) = wallets;
        return Ok(Some(v0));
    }
    Ok(None)
}

fn save_new_session(
    wallet_name: &String,
    wallet_id: PubKey,
    user: PubKey,
    app: tauri::AppHandle,
) -> Result<SessionWalletStorageV0, ()> {
    let mut path = app
        .path()
        .resolve("sessions", BaseDirectory::AppLocalData)
        .map_err(|_| ())?;
    let session_v0 = create_new_session(wallet_id, user);
    if session_v0.is_err() {
        log_debug!("create_new_session failed {}", session_v0.unwrap_err());
        return Err(());
    }
    let sws = session_v0.unwrap();
    std::fs::create_dir_all(path.clone()).unwrap();
    path.push(wallet_name);
    let res = write(path.clone(), &sws.1);
    if res.is_err() {
        log_debug!("write {:?} {}", path, res.unwrap_err());
        return Err(());
    }
    Ok(sws.0)
}

#[tauri::command(rename_all = "snake_case")]
async fn get_local_session(
    id: String,
    key: PrivKey,
    user: PubKey,
    app: tauri::AppHandle,
) -> Result<SessionWalletStorageV0, ()> {
    let path = app
        .path()
        .resolve(format!("sessions/{id}"), BaseDirectory::AppLocalData)
        .map_err(|_| ())?;
    let res = read(path.clone());
    if res.is_ok() {
        log_debug!("RESUMING SESSION");
        let v0 = dec_session(key, &res.unwrap());
        if v0.is_ok() {
            return Ok(v0.unwrap());
        }
    }

    // create a new session
    let wallet_id: PubKey = id.as_str().try_into().unwrap();
    save_new_session(&id, wallet_id, user, app)
}

#[tauri::command(rename_all = "snake_case")]
async fn encode_create_account(payload: CreateAccountBSP) -> Result<String, ()> {
    log_debug!("{:?}", payload);
    payload.encode().ok_or(())
}

#[tauri::command(rename_all = "snake_case")]
async fn open_window(
    url: String,
    label: String,
    title: String,
    app: tauri::AppHandle,
) -> Result<(), ()> {
    log_debug!("open window url {:?}", url);
    let already_exists = app.get_window(&label);
    #[cfg(desktop)]
    if already_exists.is_some() {
        let _ = already_exists.unwrap().close();
        std::thread::sleep(std::time::Duration::from_secs(1));
    }
    let mut config = WindowConfig::default();
    config.label = label;
    config.url = tauri::WindowUrl::External(url.parse().unwrap());
    config.title = title;
    let _register_window = tauri::WindowBuilder::from_config(&app, config)
        .build()
        .unwrap();
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn decode_invitation(invite: String) -> Option<Invitation> {
    decode_invitation_string(invite)
}

#[tauri::command(rename_all = "snake_case")]
async fn doc_sync_branch(nuri: &str, stream_id: &str, app: tauri::AppHandle) -> Result<(), ()> {
    log_debug!("doc_sync_branch {} {}", nuri, stream_id);
    let main_window = app.get_window("main").unwrap();

    let mut reader;
    {
        let mut sender;
        let mut broker = BROKER.write().await;
        (reader, sender) = broker.doc_sync_branch(nuri.to_string().clone()).await;

        broker.tauri_stream_add(stream_id.to_string(), sender);
    }

    async fn inner_task(
        mut reader: Receiver<Commit>,
        stream_id: String,
        main_window: tauri::Window,
    ) -> ResultSend<()> {
        while let Some(commit) = reader.next().await {
            main_window.emit(&stream_id, commit).unwrap();
        }

        BROKER.write().await.tauri_stream_cancel(stream_id);

        log_debug!("END OF LOOP");
        Ok(())
    }

    spawn_and_log_error(inner_task(reader, stream_id.to_string(), main_window));

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn cancel_doc_sync_branch(stream_id: &str) -> Result<(), ()> {
    log_debug!("cancel stream {}", stream_id);
    BROKER
        .write()
        .await
        .tauri_stream_cancel(stream_id.to_string());
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn disconnections_subscribe(app: tauri::AppHandle) -> Result<(), ()> {
    let main_window = app.get_window("main").unwrap();

    let reader = BROKER
        .write()
        .await
        .take_disconnections_receiver()
        .ok_or(())?;

    async fn inner_task(
        mut reader: Receiver<String>,
        main_window: tauri::Window,
    ) -> ResultSend<()> {
        while let Some(user_id) = reader.next().await {
            main_window.emit("disconnections", user_id).unwrap();
        }
        log_debug!("END OF disconnections listener");
        Ok(())
    }

    spawn_and_log_error(inner_task(reader, main_window));

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn doc_get_file_from_store_with_object_ref(
    nuri: &str,
    obj_ref: ObjectRef,
) -> Result<ObjectContent, String> {
    log_debug!(
        "doc_get_file_from_store_with_object_ref {} {:?}",
        nuri,
        obj_ref
    );
    // let ret = ObjectContent::File(File::V0(FileV0 {
    //     content_type: "text/plain".to_string(),
    //     metadata: vec![],
    //     content: vec![45; 20],
    // }));
    // Ok(ret)
    let obj_content = BROKER
        .write()
        .await
        .get_object_from_store_with_object_ref(nuri.to_string(), obj_ref)
        .await
        .map_err(|e| e.to_string())?;

    Ok(obj_content)
}

#[tauri::command(rename_all = "snake_case")]
async fn broker_disconnect() {
    Broker::close_all_connections().await;
}

#[derive(Serialize, Deserialize)]
struct ConnectionInfo {
    pub server_id: String,
    pub server_ip: String,
    pub error: Option<String>,
    pub since: u64,
}

#[tauri::command(rename_all = "snake_case")]
async fn broker_connect(
    client: PubKey,
    info: ClientInfo,
    session: HashMap<String, SessionPeerStorageV0>,
    opened_wallet: EncryptedWallet,
    location: Option<String>,
) -> Result<HashMap<String, ConnectionInfo>, String> {
    let mut opened_connections: HashMap<String, ConnectionInfo> = HashMap::new();

    let results = connect_wallet(
        client,
        info,
        session,
        opened_wallet,
        None,
        Box::new(ConnectionWebSocket {}),
    )
    .await?;

    log_debug!("{:?}", results);

    for result in results {
        opened_connections.insert(
            result.0,
            ConnectionInfo {
                server_id: result.1,
                server_ip: result.2,
                error: result.3,
                since: result.4 as u64,
            },
        );
    }

    BROKER.read().await.print_status();

    Ok(opened_connections)
}

#[derive(Default)]
pub struct AppBuilder {
    setup: Option<SetupHook>,
}

#[cfg(debug_assertions)]
const ALLOWED_BSP_DOMAINS: [&str; 2] = ["account-dev.nextgraph.eu", "account-dev.nextgraph.net"];
#[cfg(not(debug_assertions))]
const ALLOWED_BSP_DOMAINS: [&str; 2] = ["account.nextgraph.eu", "account.nextgraph.net"];

impl AppBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    #[must_use]
    pub fn setup<F>(mut self, setup: F) -> Self
    where
        F: FnOnce(&mut App) -> Result<(), Box<dyn std::error::Error>> + Send + 'static,
    {
        self.setup.replace(Box::new(setup));
        self
    }

    pub fn run(self) {
        let setup = self.setup;
        tauri::Builder::default()
            .setup(move |app| {
                if let Some(setup) = setup {
                    (setup)(app)?;
                }
                for domain in ALLOWED_BSP_DOMAINS {
                    app.ipc_scope().configure_remote_access(
                        RemoteDomainAccessScope::new(domain)
                            .add_window("registration")
                            .add_window("main")
                            .add_plugins(["window", "event"]),
                    );
                }
                Ok(())
            })
            .plugin(tauri_plugin_window::init())
            .invoke_handler(tauri::generate_handler![
                test,
                doc_sync_branch,
                cancel_doc_sync_branch,
                doc_get_file_from_store_with_object_ref,
                wallet_gen_shuffle_for_pazzle_opening,
                wallet_gen_shuffle_for_pin,
                wallet_open_wallet_with_pazzle,
                wallet_create_wallet,
                wallet_open_file,
                wallet_import,
                encode_create_account,
                get_local_session,
                get_wallets_from_localstorage,
                open_window,
                decode_invitation,
                disconnections_subscribe,
                broker_connect,
                broker_disconnect,
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
}
