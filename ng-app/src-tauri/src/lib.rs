// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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
use p2p_net::broker::*;
use p2p_net::log;
use p2p_net::utils::{spawn_and_log_error, Receiver, ResultSend};
use p2p_repo::types::*;
use tauri::{App, Manager};

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
async fn test() -> Result<(), ()> {
    log!("test is {}", BROKER.read().await.test());
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_gen_shuffle_for_pazzle_opening(pazzle_length: u8) -> Result<ShuffledPazzle, ()> {
    log!(
        "wallet_gen_shuffle_for_pazzle_opening from rust {}",
        pazzle_length
    );
    Ok(gen_shuffle_for_pazzle_opening(pazzle_length))
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_gen_shuffle_for_pin() -> Result<Vec<u8>, ()> {
    log!("wallet_gen_shuffle_for_pin from rust");
    Ok(gen_shuffle_for_pin())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_open_wallet_with_pazzle(
    wallet: Wallet,
    pazzle: Vec<u8>,
    pin: [u8; 4],
) -> Result<EncryptedWallet, String> {
    log!("wallet_open_wallet_with_pazzle from rust {:?}", pazzle);
    open_wallet_with_pazzle(wallet, pazzle, pin).map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn wallet_create_wallet(mut params: CreateWalletV0) -> Result<CreateWalletResultV0, String> {
    //log!("wallet_create_wallet from rust {:?}", params);
    params.result_with_wallet_file = false;
    let local_save = params.local_save;
    let res = create_wallet_v0(params).await.map_err(|e| e.to_string());

    if local_save {
        // TODO save in user store
    } else {
        // TODO save wallet file to Downloads folder
    }

    res
}

#[tauri::command(rename_all = "snake_case")]
async fn doc_sync_branch(nuri: &str, stream_id: &str, app: tauri::AppHandle) -> Result<(), ()> {
    log!("doc_sync_branch {} {}", nuri, stream_id);

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
        app: tauri::AppHandle,
    ) -> ResultSend<()> {
        while let Some(commit) = reader.next().await {
            app.emit_all(&stream_id, commit).unwrap();
        }

        BROKER.write().await.tauri_stream_cancel(stream_id);

        log!("END OF LOOP");
        Ok(())
    }

    spawn_and_log_error(inner_task(reader, stream_id.to_string(), app));

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn cancel_doc_sync_branch(stream_id: &str) -> Result<(), ()> {
    log!("cancel stream {}", stream_id);
    BROKER
        .write()
        .await
        .tauri_stream_cancel(stream_id.to_string());
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn doc_get_file_from_store_with_object_ref(
    nuri: &str,
    obj_ref: ObjectRef,
) -> Result<ObjectContent, String> {
    log!(
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

#[derive(Default)]
pub struct AppBuilder {
    setup: Option<SetupHook>,
}

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

                Ok(())
            })
            .invoke_handler(tauri::generate_handler![
                test,
                doc_sync_branch,
                cancel_doc_sync_branch,
                doc_get_file_from_store_with_object_ref,
                wallet_gen_shuffle_for_pazzle_opening,
                wallet_gen_shuffle_for_pin,
                wallet_open_wallet_with_pazzle,
                wallet_create_wallet,
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
}
