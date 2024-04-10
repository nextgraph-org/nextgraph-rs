// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
#[macro_use]
extern crate slice_as_array;

mod store;
mod types;

use ng_repo::errors::StorageError;
use warp::reply::Response;
use warp::{Filter, Reply};

use rust_embed::RustEmbed;
use serde_bare::{from_slice, to_vec};
use serde_json::json;
use std::sync::Arc;
use std::{env, fs};

use crate::store::wallet_record::*;
use crate::types::*;
use ng_net::types::{APP_NG_ONE_URL, NG_ONE_URL};
use ng_repo::log::*;
use ng_repo::types::*;
use ng_repo::utils::{generate_keypair, sign, verify};
use ng_storage_rocksdb::kcv_storage::RocksdbKCVStore;
use ng_wallet::types::*;

#[derive(RustEmbed)]
#[folder = "web/dist"]
struct Static;

struct Server {
    store: RocksdbKCVStore,
}

impl Server {
    fn add_wallet(&self, bytes: Vec<u8>) -> Result<Response, NgHttpError> {
        let add_wallet = from_slice::<AddWallet>(&bytes).map_err(|e| NgHttpError::InvalidParams)?;

        let bootstrap = add_wallet.bootstrap();

        log_debug!("ADDING wallet {}", bootstrap.id());

        verify(
            &bootstrap.content_as_bytes(),
            bootstrap.sig(),
            bootstrap.id(),
        )
        .map_err(|e| NgHttpError::InvalidParams)?;

        match add_wallet.wallet() {
            Some(wallet) => {
                verify(&wallet.content_as_bytes(), wallet.sig(), wallet.id())
                    .map_err(|e| NgHttpError::InvalidParams)?;
            }
            None => {}
        }

        let create_wallet_res = WalletRecord::create(&bootstrap.id(), bootstrap, &self.store);
        match create_wallet_res {
            Ok(wallet_record) => {
                match add_wallet.wallet() {
                    Some(wallet) => {
                        let _ = wallet_record.replace_wallet(wallet);
                    }
                    None => {}
                }
                return Ok(warp::http::StatusCode::CREATED.into_response());
            }
            Err(StorageError::AlreadyExists) => return Err(NgHttpError::AlreadyExists),
            Err(_) => return Err(NgHttpError::InternalError),
        }
    }

    pub fn upload_wallet(&self, bytes: Vec<u8>) -> Response {
        match self.add_wallet(bytes) {
            Ok(_) => warp::http::StatusCode::CREATED.into_response(),
            Err(e) => e.into_response(),
        }
    }

    fn get_wallet(&self, encoded_id: String) -> Result<Response, NgHttpError> {
        log_debug!("DOWNLOAD wallet {}", encoded_id);
        let id = base64_url::decode(&encoded_id).map_err(|e| NgHttpError::InvalidParams)?;
        let array = slice_as_array!(&id, [u8; 32]).ok_or(NgHttpError::InvalidParams)?;
        let wallet_id = PubKey::Ed25519PubKey(*array);
        let wallet_record =
            WalletRecord::open(&wallet_id, &self.store).map_err(|e| NgHttpError::NotFound)?;
        let wallet = wallet_record.wallet().map_err(|e| NgHttpError::NotFound)?;
        let data = to_vec(&wallet).map_err(|e| NgHttpError::NotFound)?;
        Ok(Response::new(data.into()))
    }

    pub fn download_wallet(&self, encoded_id: String) -> Response {
        match self.get_wallet(encoded_id) {
            Ok(res) => res,
            Err(e) => e.into_response(),
        }
    }

    fn get_bootstrap(&self, encoded_id: String) -> Result<Response, NgHttpError> {
        log_debug!("DOWNLOAD bootstrap {}", encoded_id);

        let id = base64_url::decode(&encoded_id).map_err(|e| NgHttpError::InvalidParams)?;
        let array = slice_as_array!(&id, [u8; 32]).ok_or(NgHttpError::InvalidParams)?;
        let wallet_id = PubKey::Ed25519PubKey(*array);
        let wallet_record =
            WalletRecord::open(&wallet_id, &self.store).map_err(|e| NgHttpError::NotFound)?;
        let bootstrap = wallet_record
            .bootstrap()
            .map_err(|e| NgHttpError::NotFound)?;
        let data = json!(bootstrap).to_string();
        Ok(Response::new(data.into()))
    }

    pub fn download_bootstrap(&self, encoded_id: String) -> Response {
        match self.get_bootstrap(encoded_id) {
            Ok(res) => res,
            Err(e) => e.into_response(),
        }
    }

    // pub fn create_wallet_record(&self, bootstrap: &Bootstrap) {
    //     let wallet = WalletRecord::create(&bootstrap.id(), bootstrap, &self.store).unwrap();
    //     log_debug!(
    //         "wallet created {}",
    //         base64_url::encode(&wallet.id().slice())
    //     );
    // }

    // pub fn open_wallet_record(&self, wallet_id: &WalletId) -> WalletRecord {
    //     let wallet2 = WalletRecord::open(wallet_id, &self.store).unwrap();
    //     log_debug!(
    //         "wallet opened {}",
    //         base64_url::encode(&wallet2.id().slice())
    //     );
    //     wallet2
    // }
}

#[tokio::main]
async fn main() {
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "info"); //trace
    }
    env_logger::init();

    let path_str = "data";
    let mut dir = env::current_dir().unwrap();
    dir.push(path_str);
    // FIXME: use a real key for encryption at rest
    let key: [u8; 32] = [0; 32];
    log_debug!("data directory: {}", dir.to_str().unwrap());
    fs::create_dir_all(dir.clone()).unwrap();
    let store = RocksdbKCVStore::open(&dir, key);
    if store.is_err() {
        return;
    }
    let server = Arc::new(Server {
        store: store.unwrap(),
    });

    // let (wallet_key, wallet_id) = generate_keypair();
    // let content = BootstrapContentV0 { servers: vec![] };
    // let ser = serde_bare::to_vec(&content).unwrap();
    // let sig = sign(wallet_key, wallet_id, &ser).unwrap();

    // let bootstrap = Bootstrap::V0(BootstrapV0 {
    //     id: wallet_id,
    //     content,
    //     sig,
    // });

    // POST /api/v1/wallet with body containing a serialized AddWallet => 201 CREATED
    let server_for_move = Arc::clone(&server);
    let wallet_post_api = warp::post()
        .and(warp::body::content_length_limit(1024 * 1024)) // 1 MB max
        .and(warp::path!("wallet"))
        .and(warp::body::bytes())
        .map(move |bytes: bytes::Bytes| server_for_move.upload_wallet(bytes.to_vec()));
    // GET /api/v1/wallet/:walletid => 200 OK with body serialized wallet
    let server_for_move = Arc::clone(&server);
    let wallet_get_api = warp::get()
        .and(warp::path!("wallet" / String))
        .map(move |id| server_for_move.download_wallet(id));
    // GET /api/v1/bootstrap/:walletid => 200 OK with body serialized bootstrap
    let server_for_move = Arc::clone(&server);
    let bootstrap_get_api = warp::get()
        .and(warp::path!("bootstrap" / String))
        .map(move |id| server_for_move.download_bootstrap(id));
    let api_v1 = warp::path!("api" / "v1" / ..)
        .and(wallet_get_api.or(bootstrap_get_api).or(wallet_post_api));
    //.with(warp::log("request"));

    let static_files = warp::get().and(warp_embed::embed(&Static)).boxed();

    let mut cors = warp::cors()
        .allow_methods(vec!["GET", "POST"])
        .allow_headers(vec!["Content-Type"]);

    #[cfg(not(debug_assertions))]
    {
        cors = cors
            .allow_origin(NG_ONE_URL)
            .allow_origin(APP_NG_ONE_URL)
            .allow_origin("https://nextgraph.eu")
            .allow_origin("https://nextgraph.net");
    }
    #[cfg(debug_assertions)]
    {
        log_debug!("CORS: any origin");
        cors = cors.allow_any_origin();
    }
    log::info!("Starting server on http://localhost:3032");
    warp::serve(api_v1.or(static_files).with(cors))
        .run(([127, 0, 0, 1], 3032))
        .await;
}
