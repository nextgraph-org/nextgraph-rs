// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
use async_std::stream::StreamExt;
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
#[tauri::command(rename_all = "snake_case")]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command(rename_all = "snake_case")]
async fn test() -> Result<(), ()> {
    log!("test is {}", BROKER.read().await.test());
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn create_wallet(name: &str) -> Result<String, ()> {
    log!("create wallet from rust {}", name);
    Ok(format!("create wallet from rust {}", name))
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
                greet,
                create_wallet,
                doc_sync_branch,
                cancel_doc_sync_branch,
                doc_get_file_from_store_with_object_ref
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
}
