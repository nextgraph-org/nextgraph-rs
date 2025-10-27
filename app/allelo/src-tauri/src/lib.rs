// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::collections::HashMap;
use std::fs::write;

use async_std::stream::StreamExt;
use oxrdf::Triple;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sys_locale::get_locales;
use tauri::utils::config::WindowConfig;
use tauri::Emitter;
use tauri::{path::BaseDirectory, App, Manager};
use zeroize::Zeroize;

use ng_repo::errors::NgError;
use ng_repo::log::*;
use ng_repo::types::*;
use ng_repo::utils::decode_key;

use ng_net::app_protocol::*;
use ng_net::types::{ClientInfo, CreateAccountBSP, Invitation};
use ng_net::utils::{decode_invitation_string, spawn_and_log_error, Receiver, ResultSend};

use ng_wallet::types::*;
use ng_wallet::*;

use nextgraph::local_broker::*;

#[cfg(mobile)]
mod mobile;
#[cfg(mobile)]
pub use mobile::*;

pub type SetupHook = Box<dyn FnOnce(&mut App) -> Result<(), Box<dyn std::error::Error>> + Send>;

#[tauri::command(rename_all = "snake_case")]
async fn privkey_to_string(privkey: PrivKey) -> Result<String, String> {
    Ok(format!("{privkey}"))
}

#[tauri::command(rename_all = "snake_case")]
async fn locales() -> Result<Vec<String>, ()> {
    Ok(get_locales()
        .filter_map(|lang| {
            if lang == "C" || lang == "c" {
                None
            } else {
                let mut split = lang.split('.');
                let code = split.next().unwrap();
                let code = code.replace("_", "-");
                let mut split = code.rsplitn(2, '-');
                let country = split.next().unwrap();
                Some(match split.next() {
                    Some(next) => format!("{}-{}", next, country.to_uppercase()),
                    None => country.to_string(),
                })
            }
        })
        .collect())
}

#[tauri::command(rename_all = "snake_case")]
async fn test(app: tauri::AppHandle) -> Result<(), ()> {
    let path = app
        .path()
        .resolve("", BaseDirectory::AppLocalData)
        .map_err(|_| NgError::SerializationError)
        .unwrap();
    init_local_broker(Box::new(move || LocalBrokerConfig::BasePath(path.clone()))).await;

    //log_debug!("test is {}", BROKER.read().await.test());
    // let path = app
    //     .path()
    //     .resolve("storage", BaseDirectory::AppLocalData)
    //     .map_err(|_| ())?;

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
    _app: tauri::AppHandle,
) -> Result<SensitiveWallet, String> {
    //log_debug!("wallet_open_with_pazzle from rust {:?}", pazzle);
    let wallet = nextgraph::local_broker::wallet_open_with_pazzle(&wallet, pazzle, pin)
        .map_err(|e| e.to_string())?;
    Ok(wallet)
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_open_with_mnemonic(
    wallet: Wallet,
    mnemonic: [u16; 12],
    pin: [u8; 4],
    _app: tauri::AppHandle,
) -> Result<SensitiveWallet, String> {
    let wallet =
        ng_wallet::open_wallet_with_mnemonic(&wallet, mnemonic, pin).map_err(|e| e.to_string())?;
    Ok(wallet)
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_open_with_mnemonic_words(
    wallet: Wallet,
    mnemonic_words: Vec<String>,
    pin: [u8; 4],
    _app: tauri::AppHandle,
) -> Result<SensitiveWallet, String> {
    let wallet =
        nextgraph::local_broker::wallet_open_with_mnemonic_words(&wallet, &mnemonic_words, pin)
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
    let pdf = params.pdf;
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
        cwr.wallet_file.zeroize();
        cwr.wallet_file = vec![];
    }
    if pdf {
        // save pdf file to Downloads folder
        let path = app
            .path()
            .resolve(
                format!("wallet-{}.pdf", cwr.wallet_name),
                BaseDirectory::Download,
            )
            .unwrap();
        let _r = write(path, &cwr.pdf_file);
        cwr.pdf_file.zeroize();
        cwr.pdf_file = vec![];
    }
    Ok(cwr)
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_read_file(file: Vec<u8>, _app: tauri::AppHandle) -> Result<Wallet, String> {
    nextgraph::local_broker::wallet_read_file(file)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_was_opened(
    opened_wallet: SensitiveWallet,
    _app: tauri::AppHandle,
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
    _app: tauri::AppHandle,
) -> Result<ClientV0, String> {
    nextgraph::local_broker::wallet_import(encrypted_wallet, opened_wallet, in_memory)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_export_rendezvous(
    session_id: u64,
    code: String,
    _app: tauri::AppHandle,
) -> Result<(), String> {
    nextgraph::local_broker::wallet_export_rendezvous(session_id, code)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_export_get_qrcode(
    session_id: u64,
    size: u32,
    _app: tauri::AppHandle,
) -> Result<String, String> {
    nextgraph::local_broker::wallet_export_get_qrcode(session_id, size)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_export_get_textcode(
    session_id: u64,
    _app: tauri::AppHandle,
) -> Result<String, String> {
    nextgraph::local_broker::wallet_export_get_textcode(session_id)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_import_rendezvous(
    size: u32,
    _app: tauri::AppHandle,
) -> Result<(String, String), String> {
    nextgraph::local_broker::wallet_import_rendezvous(size)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_import_from_code(code: String, _app: tauri::AppHandle) -> Result<Wallet, String> {
    nextgraph::local_broker::wallet_import_from_code(code)
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
    _app: tauri::AppHandle,
) -> Result<SessionInfoString, String> {
    let config = SessionConfig::new_save(&user, &wallet_name);
    nextgraph::local_broker::session_start(config)
        .await
        .map_err(|e: NgError| e.to_string())
        .map(|s| s.into())
}

#[tauri::command(rename_all = "snake_case")]
async fn session_start_remote(
    wallet_name: String,
    user: PubKey,
    peer_id: Option<PubKey>,
    _app: tauri::AppHandle,
) -> Result<SessionInfoString, String> {
    let config = SessionConfig::new_remote(&user, &wallet_name, peer_id);
    nextgraph::local_broker::session_start(config)
        .await
        .map_err(|e: NgError| e.to_string())
        .map(|s| s.into())
}

#[tauri::command(rename_all = "snake_case")]
async fn encode_create_account(payload: CreateAccountBSP) -> Result<String, ()> {
    //log_debug!("{:?}", payload);
    payload.encode().ok_or(())
}

#[tauri::command(rename_all = "snake_case")]
async fn open_window(
    url: String,
    label: String,
    title: String,
    app: tauri::AppHandle,
) -> Result<bool, ()> {
    log_debug!("open window url {:?}", url);
    let _already_exists = app.get_window(&label);
    #[cfg(desktop)]
    if _already_exists.is_some() {
        log_info!("already exists");
        //let _ = _already_exists.unwrap().close();
        //std::thread::sleep(std::time::Duration::from_secs(1));
        return Ok(true);
    }

    let mut config = WindowConfig::default();
    config.label = label;
    config.url = tauri::WebviewUrl::External(url.parse().unwrap());
    config.title = title;
    match tauri::WebviewWindowBuilder::from_config(&app, &config)
        .unwrap()
        .build()
    {
        Ok(_) => {}
        Err(e) => {
            return Ok(true);
        }
    }
    Ok(false)
}

#[tauri::command(rename_all = "snake_case")]
async fn decode_invitation(invite: String) -> Option<Invitation> {
    decode_invitation_string(invite)
}

#[tauri::command(rename_all = "snake_case")]
async fn retrieve_ng_bootstrap(
    location: String,
) -> Result<ng_net::types::LocalBootstrapInfo, String> {
    ng_net::utils::retrieve_ng_bootstrap(&location)
        .await
        .ok_or("cannot retrieve bootstrap".to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn file_get(
    session_id: u64,
    stream_id: &str,
    reference: BlockRef,
    branch_nuri: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let branch_nuri =
        NuriV0::new_from(&branch_nuri).map_err(|e| format!("branch_nuri: {}", e.to_string()))?;
    let mut nuri = NuriV0::new_from_obj_ref(&reference);
    nuri.copy_target_from(&branch_nuri);

    let mut request = AppRequest::new(AppRequestCommandV0::FileGet, nuri, None);
    request.set_session_id(session_id);

    app_request_stream(request, stream_id, app).await
}

#[tauri::command(rename_all = "snake_case")]
async fn app_request_stream(
    request: AppRequest,
    stream_id: &str,
    app: tauri::AppHandle,
) -> Result<(), String> {
    //log_debug!("app request stream {} {:?}", stream_id, request);
    let main_window = app.get_webview_window("main").unwrap();

    let reader;
    {
        let cancel;
        (reader, cancel) = nextgraph::local_broker::app_request_stream(request)
            .await
            .map_err(|e| e.to_string())?;

        nextgraph::local_broker::tauri_stream_add(stream_id.to_string(), cancel)
            .await
            .map_err(|e| e.to_string())?;
    }

    async fn inner_task(
        mut reader: Receiver<AppResponse>,
        stream_id: String,
        main_window: tauri::WebviewWindow,
    ) -> ResultSend<()> {
        while let Some(app_response) = reader.next().await {
            let app_response = nextgraph::verifier::prepare_app_response_for_js(app_response)?;
            main_window
                .emit_to("main", &stream_id, app_response)
                .unwrap();
        }

        nextgraph::local_broker::tauri_stream_cancel(stream_id)
            .await
            .map_err(|e| e.to_string())?;

        //log_debug!("END OF LOOP");
        Ok(())
    }

    spawn_and_log_error(inner_task(reader, stream_id.to_string(), main_window));

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn discrete_update(
    session_id: u64,
    update: serde_bytes::ByteBuf,
    heads: Vec<String>,
    crdt: String,
    nuri: String,
) -> Result<(), String> {
    let nuri = NuriV0::new_from(&nuri).map_err(|e| e.to_string())?;

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_update(),
        nuri,
        payload: Some(
            AppRequestPayload::new_discrete_update(heads, crdt, update.into_vec())
                .map_err(|e| format!("Deserialization error of heads: {e}"))?,
        ),
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;
    if let AppResponse::V0(AppResponseV0::Error(e)) = res {
        Err(e)
    } else {
        Ok(())
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn file_save_to_downloads(
    session_id: u64,
    reference: ObjectRef,
    filename: String,
    branch_nuri: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let branch_nuri =
        NuriV0::new_from(&branch_nuri).map_err(|e| format!("branch_nuri: {}", e.to_string()))?;
    let mut nuri = NuriV0::new_from_obj_ref(&reference);
    nuri.copy_target_from(&branch_nuri);

    let mut request = AppRequest::new(AppRequestCommandV0::FileGet, nuri, None);
    request.set_session_id(session_id);

    let (mut reader, _cancel) = nextgraph::local_broker::app_request_stream(request)
        .await
        .map_err(|e| e.to_string())?;

    let mut file_vec: Vec<u8> = vec![];
    while let Some(app_response) = reader.next().await {
        match app_response {
            AppResponse::V0(AppResponseV0::FileMeta(filemeta)) => {
                file_vec = Vec::with_capacity(filemeta.size as usize);
            }
            AppResponse::V0(AppResponseV0::FileBinary(mut bin)) => {
                if !bin.is_empty() {
                    file_vec.append(&mut bin);
                }
            }
            AppResponse::V0(AppResponseV0::EndOfStream) => break,
            _ => return Err("invalid response".to_string()),
        }
    }

    let mut i: usize = 0;
    loop {
        let dest_filename = if i == 0 {
            filename.clone()
        } else {
            filename
                .rsplit_once(".")
                .map(|(l, r)| format!("{l} ({}).{r}", i.to_string()))
                .or_else(|| Some(format!("{filename} ({})", i.to_string())))
                .unwrap()
        };

        let path = app
            .path()
            .resolve(dest_filename, BaseDirectory::Download)
            .unwrap();

        if path.exists() {
            i = i + 1;
        } else {
            write(path, &file_vec).map_err(|e| e.to_string())?;
            break;
        }
    }
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn doc_fetch_private_subscribe() -> Result<AppRequest, String> {
    let request = AppRequest::new(
        AppRequestCommandV0::Fetch(AppFetchContentV0::get_or_subscribe(true)),
        NuriV0::new_private_store_target(),
        None,
    );
    Ok(request)
}

#[tauri::command(rename_all = "snake_case")]
async fn doc_fetch_repo_subscribe(repo_o: String) -> Result<AppRequest, String> {
    AppRequest::doc_fetch_repo_subscribe(repo_o).map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn branch_history(session_id: u64, nuri: String) -> Result<AppHistoryJs, String> {
    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_history(),
        nuri: NuriV0::new_from(&nuri).map_err(|e| e.to_string())?,
        payload: None,
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    let AppResponse::V0(res) = res;
    //log_debug!("{:?}", res);
    match res {
        AppResponseV0::History(s) => Ok(s.to_js()),
        _ => Err("invalid response".to_string()),
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn update_header(
    session_id: u64,
    nuri: String,
    title: Option<String>,
    about: Option<String>,
) -> Result<(), String> {
    let nuri = NuriV0::new_from(&nuri).map_err(|e| e.to_string())?;

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_header(),
        nuri,
        payload: Some(AppRequestPayload::new_header(title, about)),
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;
    if let AppResponse::V0(AppResponseV0::Error(e)) = res {
        Err(e)
    } else {
        Ok(())
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn fetch_header(session_id: u64, nuri: String) -> Result<AppHeader, String> {
    let nuri = NuriV0::new_from(&nuri).map_err(|e| e.to_string())?;

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_fetch_header(),
        nuri,
        payload: None,
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;
    match res {
        AppResponse::V0(AppResponseV0::Error(e)) => Err(e),
        AppResponse::V0(AppResponseV0::Header(h)) => Ok(h),
        _ => Err("invalid response".to_string()),
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn sparql_update(
    session_id: u64,
    sparql: String,
    nuri: Option<String>,
) -> Result<Vec<String>, String> {
    let (nuri, base) = if let Some(n) = nuri {
        let nuri = NuriV0::new_from(&n).map_err(|e| e.to_string())?;
        let b = nuri.repo();
        (nuri, Some(b))
    } else {
        (NuriV0::new_private_store_target(), None)
    };

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_write_query(),
        nuri,
        payload: Some(AppRequestPayload::new_sparql_query(sparql, base)),
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;
    match res {
        AppResponse::V0(AppResponseV0::Error(e)) => Err(e),
        AppResponse::V0(AppResponseV0::Commits(commits)) => Ok(commits),
        _ => Err(NgError::InvalidResponse.to_string()),
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn sparql_query(
    session_id: u64,
    sparql: String,
    base: Option<String>,
    nuri: Option<String>,
) -> Result<Value, String> {
    let nuri = if nuri.is_some() {
        NuriV0::new_from(&nuri.unwrap()).map_err(|e| e.to_string())?
    } else {
        NuriV0::new_entire_user_site()
    };

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_read_query(),
        nuri,
        payload: Some(AppRequestPayload::new_sparql_query(sparql, base)),
        session_id,
    });

    let response = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    let AppResponse::V0(res) = response;
    match res {
        AppResponseV0::False => return Ok(Value::Bool(false)),
        AppResponseV0::True => return Ok(Value::Bool(true)),
        AppResponseV0::Graph(graph) => {
            let triples: Vec<Triple> = serde_bare::from_slice(&graph)
                .map_err(|_| "Deserialization error of graph".to_string())?;

            Ok(Value::Array(
                triples
                    .into_iter()
                    .map(|t| Value::String(t.to_string()))
                    .collect(),
            ))
        }
        AppResponseV0::QueryResult(buf) => {
            let string = String::from_utf8(buf)
                .map_err(|_| "Deserialization error of JSON QueryResult String".to_string())?;
            Ok(serde_json::from_str(&string)
                .map_err(|_| "Parsing error of JSON QueryResult String".to_string())?)
        }
        AppResponseV0::Error(e) => Err(e.to_string().into()),
        _ => Err("invalid AppResponse".to_string().into()),
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn app_request(request: AppRequest) -> Result<AppResponse, String> {
    //log_debug!("app request {:?}", request);

    nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn signature_status(
    session_id: u64,
    nuri: Option<String>,
) -> Result<Vec<(String, Option<String>, bool)>, String> {
    let nuri = if nuri.is_some() {
        NuriV0::new_from(&nuri.unwrap()).map_err(|e| e.to_string())?
    } else {
        NuriV0::new_private_store_target()
    };

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_signature_status(),
        nuri,
        payload: None,
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    let AppResponse::V0(res) = res;
    //log_debug!("{:?}", res);
    match res {
        AppResponseV0::SignatureStatus(s) => Ok(s),
        _ => Err("invalid response".to_string()),
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn signed_snapshot_request(session_id: u64, nuri: Option<String>) -> Result<bool, String> {
    let nuri = if nuri.is_some() {
        NuriV0::new_from(&nuri.unwrap()).map_err(|e| e.to_string())?
    } else {
        NuriV0::new_private_store_target()
    };

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_signed_snapshot_request(),
        nuri,
        payload: None,
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    let AppResponse::V0(res) = res;
    //log_debug!("{:?}", res);
    match res {
        AppResponseV0::True => Ok(true),
        AppResponseV0::False => Ok(false),
        AppResponseV0::Error(e) => Err(e),
        _ => Err("invalid response".to_string()),
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn signature_request(session_id: u64, nuri: Option<String>) -> Result<bool, String> {
    let nuri = if nuri.is_some() {
        NuriV0::new_from(&nuri.unwrap()).map_err(|e| e.to_string())?
    } else {
        NuriV0::new_private_store_target()
    };

    let request = AppRequest::V0(AppRequestV0 {
        command: AppRequestCommandV0::new_signature_request(),
        nuri,
        payload: None,
        session_id,
    });

    let res = nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e: NgError| e.to_string())?;

    let AppResponse::V0(res) = res;
    //log_debug!("{:?}", res);
    match res {
        AppResponseV0::True => Ok(true),
        AppResponseV0::False => Ok(false),
        AppResponseV0::Error(e) => Err(e),
        _ => Err("invalid response".to_string()),
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn doc_create(
    session_id: u64,
    crdt: String,
    class_name: String,
    destination: String,
    store_repo: Option<StoreRepo>,
) -> Result<String, String> {
    nextgraph::local_broker::doc_create_with_store_repo(
        session_id,
        crdt,
        class_name,
        destination,
        store_repo,
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn app_request_with_nuri_command(
    nuri: String,
    command: AppRequestCommandV0,
    session_id: u64,
    payload: Option<AppRequestPayloadV0>,
) -> Result<AppResponse, String> {
    let nuri = NuriV0::new_from(&nuri).map_err(|e| e.to_string())?;

    let payload = payload.map(|p| AppRequestPayload::V0(p));

    let request = AppRequest::V0(AppRequestV0 {
        session_id,
        command,
        nuri,
        payload,
    });

    app_request(request).await
}

#[tauri::command(rename_all = "snake_case")]
async fn upload_chunk(
    session_id: u64,
    upload_id: u32,
    chunk: serde_bytes::ByteBuf,
    nuri: String,
    _app: tauri::AppHandle,
) -> Result<AppResponse, String> {
    //log_debug!("upload_chunk {:?}", chunk);

    let mut request = AppRequest::new(
        AppRequestCommandV0::FilePut,
        NuriV0::new_from(&nuri).map_err(|e| e.to_string())?,
        Some(AppRequestPayload::V0(
            AppRequestPayloadV0::RandomAccessFilePutChunk((upload_id, chunk)),
        )),
    );
    request.set_session_id(session_id);

    nextgraph::local_broker::app_request(request)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn cancel_stream(stream_id: &str) -> Result<(), String> {
    //log_debug!("cancel stream {}", stream_id);
    Ok(
        nextgraph::local_broker::tauri_stream_cancel(stream_id.to_string())
            .await
            .map_err(|e: NgError| e.to_string())?,
    )
}

#[tauri::command(rename_all = "snake_case")]
async fn disconnections_subscribe(app: tauri::AppHandle) -> Result<(), String> {
    let path = app
        .path()
        .resolve("", BaseDirectory::AppLocalData)
        .map_err(|_| NgError::SerializationError)
        .unwrap();
    init_local_broker(Box::new(move || LocalBrokerConfig::BasePath(path.clone()))).await;

    let main_window = app.get_webview_window("main").unwrap();

    let reader = nextgraph::local_broker::take_disconnections_receiver()
        .await
        .map_err(|e: NgError| e.to_string())?;

    async fn inner_task(
        mut reader: Receiver<String>,
        main_window: tauri::WebviewWindow,
    ) -> ResultSend<()> {
        while let Some(user_id) = reader.next().await {
            log_debug!("DISCONNECTION FOR {user_id}");
            main_window
                .emit_to("main", "disconnections", user_id)
                .unwrap();
        }
        log_debug!("END OF disconnections listener");
        Ok(())
    }

    spawn_and_log_error(inner_task(reader, main_window));

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn session_stop(user_id: String) -> Result<(), String> {
    let user_id = decode_key(&user_id).map_err(|_| "Invalid user_id")?;
    nextgraph::local_broker::session_stop(&user_id)
        .await
        .map_err(|e: NgError| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn user_disconnect(user_id: String) -> Result<(), String> {
    let user_id = decode_key(&user_id).map_err(|_| "Invalid user_id")?;
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
    user_id: String,
    _location: Option<String>,
) -> Result<HashMap<String, ConnectionInfo>, String> {
    let user_id = decode_key(&user_id).map_err(|_| "Invalid user_id")?;
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

#[tauri::command(rename_all = "snake_case")]
fn get_device_name() -> Result<String, String> {
    Ok(nextgraph::get_device_name())
}

#[derive(Default)]
pub struct AppBuilder {
    setup: Option<SetupHook>,
}

#[cfg(debug_assertions)]
const ALLOWED_BSP_DOMAINS: [&str; 2] = ["account-dev.nextgraph.eu", "account-dev.nextgraph.one"];
#[cfg(not(debug_assertions))]
const ALLOWED_BSP_DOMAINS: [&str; 2] = ["account.nextgraph.eu", "account.nextgraph.one"];

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

        #[allow(unused_mut)]
        let mut builder = tauri::Builder::default().setup(move |app| {
            if let Some(setup) = setup {
                (setup)(app)?;
            }

            // for domain in ALLOWED_BSP_DOMAINS {
            //     app.ipc_scope().configure_remote_access(
            //         RemoteDomainAccessScope::new(domain)
            //             .add_window("registration")
            //             .add_window("main")
            //             .add_plugins(["window", "event"]),
            //     );
            // }
            // if cfg!(debug_assertions) {
            //     app.handle().plugin(
            //         tauri_plugin_log::Builder::default()
            //             .level(log::LevelFilter::Info)
            //             .build(),
            //     )?;
            // }
            Ok(())
        });
        builder = builder.plugin(tauri_plugin_opener::init());
        #[cfg(mobile)]
        {
            builder = builder
                .plugin(tauri_plugin_barcode_scanner::init())
                .plugin(tauri_plugin_contacts_importer::init());
        }

        builder
            .invoke_handler(tauri::generate_handler![
                test,
                locales,
                privkey_to_string,
                wallet_gen_shuffle_for_pazzle_opening,
                wallet_gen_shuffle_for_pin,
                wallet_open_with_pazzle,
                wallet_open_with_mnemonic,
                wallet_open_with_mnemonic_words,
                wallet_was_opened,
                wallet_create,
                wallet_read_file,
                wallet_get_file,
                wallet_import,
                wallet_export_rendezvous,
                wallet_export_get_qrcode,
                wallet_export_get_textcode,
                wallet_import_rendezvous,
                wallet_import_from_code,
                wallet_close,
                encode_create_account,
                session_start,
                session_start_remote,
                session_stop,
                get_wallets,
                open_window,
                decode_invitation,
                disconnections_subscribe,
                user_connect,
                user_disconnect,
                client_info_rust,
                doc_fetch_private_subscribe,
                doc_fetch_repo_subscribe,
                doc_create,
                cancel_stream,
                discrete_update,
                app_request_stream,
                file_get,
                file_save_to_downloads,
                app_request,
                app_request_with_nuri_command,
                upload_chunk,
                get_device_name,
                sparql_query,
                sparql_update,
                branch_history,
                signature_status,
                signature_request,
                signed_snapshot_request,
                update_header,
                fetch_header,
                retrieve_ng_bootstrap,
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
}
