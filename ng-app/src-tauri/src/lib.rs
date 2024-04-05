// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
use async_std::stream::StreamExt;
use nextgraph::local_broker::*;
use ng_net::broker::*;
use ng_net::types::{ClientInfo, CreateAccountBSP, Invitation};
use ng_net::utils::{decode_invitation_string, spawn_and_log_error, Receiver, ResultSend};
use ng_repo::errors::NgError;
use ng_repo::log::*;
use ng_repo::types::*;
use ng_wallet::types::*;
use ng_wallet::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs::{read, write, File, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use tauri::scope::ipc::RemoteDomainAccessScope;
use tauri::utils::config::WindowConfig;
use tauri::{path::BaseDirectory, App, Manager, Window};

#[cfg(mobile)]
mod mobile;
#[cfg(mobile)]
pub use mobile::*;

pub type SetupHook = Box<dyn FnOnce(&mut App) -> Result<(), Box<dyn std::error::Error>> + Send>;

#[tauri::command(rename_all = "snake_case")]
async fn test(app: tauri::AppHandle) -> Result<(), ()> {
    let path = app
        .path()
        .resolve("", BaseDirectory::AppLocalData)
        .map_err(|_| NgError::SerializationError)
        .unwrap();
    init_local_broker(Box::new(move || LocalBrokerConfig::BasePath(path.clone()))).await;

    // init_local_broker(&Lazy::new(|| {
    //     Box::new(move || LocalBrokerConfig::BasePath(path.clone()))
    // }))
    // .await;
    //pub type LastSeqFn = dyn Fn(PubKey, u16) -> Result<u64, NgError> + 'static + Sync + Send;

    // let test: Box<LastSeqFn> = Box::new(move |peer_id: PubKey, qty: u16| {
    //     take_some_peer_last_seq_numbers(peer_id, qty, path.clone())
    // });
    //pub type ConfigInitFn = dyn Fn() -> LocalBrokerConfig + 'static + Sync + Send;

    //log_debug!("test is {}", BROKER.read().await.test());
    let path = app
        .path()
        .resolve("storage", BaseDirectory::AppLocalData)
        .map_err(|_| ())?;

    //BROKER.read().await.test_storage(path);

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_gen_shuffle_for_pazzle_opening(pazzle_length: u8) -> Result<ShuffledPazzle, ()> {
    // log_debug!(
    //     "wallet_gen_shuffle_for_pazzle_opening from rust {}",
    //     pazzle_length
    // );
    Ok(gen_shuffle_for_pazzle_opening(pazzle_length))
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_gen_shuffle_for_pin() -> Result<Vec<u8>, ()> {
    //log_debug!("wallet_gen_shuffle_for_pin from rust");
    Ok(gen_shuffle_for_pin())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_open_with_pazzle(
    wallet: Wallet,
    pazzle: Vec<u8>,
    pin: [u8; 4],
    app: tauri::AppHandle,
) -> Result<SensitiveWallet, String> {
    //log_debug!("wallet_open_with_pazzle from rust {:?}", pazzle);
    let wallet = nextgraph::local_broker::wallet_open_with_pazzle(&wallet, pazzle, pin)
        .map_err(|e| e.to_string())?;
    Ok(wallet)
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_get_file(wallet_name: String, app: tauri::AppHandle) -> Result<(), String> {
    let ser = nextgraph::local_broker::wallet_get_file(&wallet_name)
        .await
        .map_err(|e| e.to_string())?;

    // save wallet file to Downloads folder
    let path = app
        .path()
        .resolve(
            format!("wallet-{}.ngw", wallet_name),
            BaseDirectory::Download,
        )
        .unwrap();
    write(path, &ser).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_create(
    mut params: CreateWalletV0,
    app: tauri::AppHandle,
) -> Result<CreateWalletResultV0, String> {
    //log_debug!("wallet_create from rust {:?}", params);
    params.result_with_wallet_file = !params.local_save;
    let local_save = params.local_save;
    let mut cwr = nextgraph::local_broker::wallet_create_v0(params)
        .await
        .map_err(|e| e.to_string())?;
    if !local_save {
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
    }
    Ok(cwr)
}

fn take_some_peer_last_seq_numbers(
    peer_id: PubKey,
    qty: u16,
    mut path: PathBuf,
) -> Result<u64, NgError> {
    std::fs::create_dir_all(path.clone()).unwrap();
    path.push(peer_id.to_string());
    log_debug!("{}", path.display());

    let file = read(path.clone());
    let (mut file_save, val) = match file {
        Ok(ser) => {
            let old_val = match SessionPeerLastSeq::deser(&ser)? {
                SessionPeerLastSeq::V0(v) => v,
                _ => unimplemented!(),
            };
            (
                OpenOptions::new()
                    .write(true)
                    .open(path)
                    .map_err(|_| NgError::SerializationError)?,
                old_val,
            )
        }
        Err(_) => (
            File::create(path).map_err(|_| NgError::SerializationError)?,
            0,
        ),
    };
    let new_val = val + qty as u64;
    let spls = SessionPeerLastSeq::V0(new_val);
    let ser = spls.ser()?;
    file_save
        .write_all(&ser)
        .map_err(|_| NgError::SerializationError)?;

    file_save
        .sync_data()
        .map_err(|_| NgError::SerializationError)?;

    Ok(val)
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_read_file(file: Vec<u8>, app: tauri::AppHandle) -> Result<Wallet, String> {
    nextgraph::local_broker::wallet_read_file(file)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_was_opened(
    opened_wallet: SensitiveWallet,
    app: tauri::AppHandle,
) -> Result<ClientV0, String> {
    nextgraph::local_broker::wallet_was_opened(opened_wallet)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_import(
    encrypted_wallet: Wallet,
    opened_wallet: SensitiveWallet,
    in_memory: bool,
    app: tauri::AppHandle,
) -> Result<ClientV0, String> {
    nextgraph::local_broker::wallet_import(encrypted_wallet, opened_wallet, in_memory)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn get_wallets(
    app: tauri::AppHandle,
) -> Result<Option<HashMap<String, LocalWalletStorageV0>>, String> {
    let path = app
        .path()
        .resolve("", BaseDirectory::AppLocalData)
        .map_err(|_| NgError::SerializationError)
        .unwrap();
    init_local_broker(Box::new(move || LocalBrokerConfig::BasePath(path.clone()))).await;

    let res = wallets_get_all().await.map_err(|e| {
        log_err!("wallets_get_all error {}", e.to_string());
    });
    if res.is_ok() {
        return Ok(Some(res.unwrap()));
    }
    Ok(None)
}

#[tauri::command(rename_all = "snake_case")]
async fn session_start(
    wallet_name: String,
    user: PubKey,
    app: tauri::AppHandle,
) -> Result<SessionPeerStorageV0, String> {
    let config = SessionConfig::V0(SessionConfigV0 {
        user_id: user,
        wallet_name,
    });
    nextgraph::local_broker::session_start(config)
        .await
        .map_err(|e: NgError| e.to_string())
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
            log_debug!("DISCONNECTION FOR {user_id}");
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
async fn session_stop(user_id: UserId) -> Result<(), String> {
    nextgraph::local_broker::session_stop(&user_id)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn user_disconnect(user_id: UserId) -> Result<(), String> {
    nextgraph::local_broker::user_disconnect(&user_id)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_close(wallet_name: String) -> Result<(), String> {
    nextgraph::local_broker::wallet_close(&wallet_name)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[derive(Serialize, Deserialize)]
struct ConnectionInfo {
    pub server_id: String,
    pub server_ip: String,
    pub error: Option<String>,
    pub since: u64,
}

#[tauri::command(rename_all = "snake_case")]
async fn user_connect(
    info: ClientInfo,
    user_id: UserId,
    location: Option<String>,
) -> Result<HashMap<String, ConnectionInfo>, String> {
    let mut opened_connections: HashMap<String, ConnectionInfo> = HashMap::new();

    let results = nextgraph::local_broker::user_connect_with_device_info(info, &user_id, None)
        .await
        .map_err(|e| e.to_string())?;

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

    Ok(opened_connections)
}

#[tauri::command(rename_all = "snake_case")]
fn client_info_rust() -> Result<Value, String> {
    Ok(ng_repo::os_info::get_os_info())
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
                wallet_open_with_pazzle,
                wallet_was_opened,
                wallet_create,
                wallet_read_file,
                wallet_get_file,
                wallet_import,
                wallet_close,
                encode_create_account,
                session_start,
                session_stop,
                get_wallets,
                open_window,
                decode_invitation,
                disconnections_subscribe,
                user_connect,
                user_disconnect,
                client_info_rust,
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
}
