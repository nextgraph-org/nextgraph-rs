// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::fs::{self, create_dir_all, File};
use std::io::{Read, Write};
use std::path::PathBuf;

use crate::local_broker::{
    doc_create, doc_sparql_update, init_local_broker, session_start, session_stop, user_disconnect,
    wallet_close, wallet_create_v0, wallet_get_file, wallet_import,
    wallet_open_with_mnemonic_words, wallet_read_file, LocalBrokerConfig, SessionConfig,
};
use ng_net::types::BootstrapContentV0;
use ng_repo::log_info;
use ng_repo::types::PubKey;
use ng_wallet::types::{CreateWalletV0, SensitiveWallet};
use once_cell::sync::OnceCell;

static WALLET_PIN: [u8; 4] = [2, 3, 2, 3];

// Persistent test assets (wallet base path + stored credentials)
fn test_base_path() -> PathBuf {
    // Use the crate manifest dir so tests find files regardless of the
    // process current working directory when `cargo test` runs.
    let mut base = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    base.push("src");
    base.push("tests");
    base
}

fn build_wallet_and_creds_paths() -> (PathBuf, PathBuf) {
    let mut base = test_base_path();
    base.push(".ng");
    create_dir_all(&base).expect("create test base path");
    (base.join("test_wallet.ngw"), base.join("wallet_creds.txt"))
}

static INIT: OnceCell<()> = OnceCell::new();

async fn init_broker() {
    if INIT.get().is_none() {
        let base = test_base_path();
        fs::create_dir_all(&base).expect("create base path");
        init_local_broker(Box::new(move || LocalBrokerConfig::BasePath(base.clone()))).await;
        let _ = INIT.set(());
    }
}

async fn create_or_open_wallet() -> (SensitiveWallet, u64) {
    init_broker().await;

    let wallet;
    let session_id: u64;

    let (wallet_path, creds_path) = build_wallet_and_creds_paths();

    // Don't load from file due to a bug which makes reloading wallets fail.
    if wallet_path.exists() && false {
        // Read the wallet file from the known test base path (not the process cwd)
        let wallet_file = fs::read(&wallet_path).expect("read wallet file");
        // load stored wallet_name + mnemonic
        let mut s = String::new();
        File::open(creds_path)
            .expect("open creds")
            .read_to_string(&mut s)
            .expect("read creds");
        let mut lines = s.lines();
        let mnemonic_line = lines.next().expect("missing mnemonic").to_string();
        let mnemonic_words: Vec<String> = mnemonic_line
            .split_whitespace()
            .map(|s| s.to_string())
            .collect();

        let read_wallet = wallet_read_file(wallet_file).await.unwrap();
        wallet =
            wallet_open_with_mnemonic_words(&read_wallet, &mnemonic_words, WALLET_PIN).unwrap();

        let _client = wallet_import(read_wallet.clone(), wallet.clone(), true)
            .await
            .unwrap();

        let session = session_start(SessionConfig::new_in_memory(
            &wallet.personal_identity(),
            &read_wallet.name(),
        ))
        .await
        .unwrap();
        session_id = session.session_id;
    } else {
        // first run: create wallet
        // Load a real security image from the crate so tests don't depend on cwd.
        // Try a few known candidate locations inside the crate.
        let manifest_dir = test_base_path();

        let security_img =
            fs::read(manifest_dir.join("security-image.png")).expect("read sec image file");

        let peer_id_of_server_broker = PubKey::nil();
        let result = wallet_create_v0(CreateWalletV0 {
            security_img,
            security_txt: "know yourself".to_string(),
            pin: WALLET_PIN,
            pazzle_length: 9,
            send_bootstrap: false,
            send_wallet: false,
            result_with_wallet_file: false,
            local_save: false,
            core_bootstrap: BootstrapContentV0::new_localhost(peer_id_of_server_broker),
            core_registration: None,
            additional_bootstrap: None,
            pdf: false,
            device_name: "test".to_string(),
        })
        .await
        .expect("wallet_create_v0");

        // Save wallet to file.
        let wallet_bin = wallet_get_file(&result.wallet_name).await.unwrap();
        let mut creds_file = File::create(creds_path).expect("create creds file");
        let mut wallet_file = File::create(wallet_path).expect("create wallet file");

        // Use the mnemonic_str already provided (list of words) to avoid mistakes
        let mnemonic_words: Vec<String> = result.mnemonic_str.clone();
        writeln!(creds_file, "{}", mnemonic_words.join(" ")).expect("write mnemonic to creds file");
        creds_file.flush().expect("flush creds file");

        wallet_file
            .write_all(&wallet_bin)
            .expect("write wallet file");

        wallet = wallet_open_with_mnemonic_words(&result.wallet, &mnemonic_words, WALLET_PIN)
            .expect("open wallet");
        session_id = result.session_id;
    }

    return (wallet, session_id);
}

fn build_insert_sparql() -> String {
    // Data conforms to testShape.shex
    // Shape requires: a ex:TestObject + required fields.
    r#"
PREFIX ex: <http://example.org/>
INSERT DATA {
  GRAPH <urn:ng:testShapeGraph> {
    <urn:test:obj1> a ex:TestObject ;
      ex:stringValue "hello world" ;
      ex:numValue 42 ;
      ex:boolValue true ;
      ex:arrayValue 1,2,3 ;
      ex:objectValue [
        ex:nestedString "nested" ;
        ex:nestedNum 7 ;
        ex:nestedArray 5,6
      ] ;
      ex:anotherObject [
        ex:prop1 "one" ;
        ex:prop2 1
      ], [
        ex:prop1 "two" ;
        ex:prop2 2
      ] ;
      ex:numOrStr "either" ;
      ex:lit1Or2 "lit1" .
  }
}
"#
    .trim()
    .to_string()
}

#[async_std::test]
async fn test_wallet_and_sparql_insert() {
    let (wallet, session_id) = create_or_open_wallet().await;

    let sparql = build_insert_sparql();
    let doc_nuri = doc_create(
        session_id,
        "Graph".to_string(),
        "test".to_string(),
        "store".to_string(),
        None,
        None,
    )
    .await
    .expect("error");

    log_info!("session_id: {:?} doc nuri: {:?}", session_id, doc_nuri);

    let result = doc_sparql_update(session_id, sparql.clone(), Some(doc_nuri)).await;
    assert!(result.is_ok(), "SPARQL update failed: {:?}", result.err());

    // Optional: a second idempotent insert should not duplicate (implementation dependent)
    let second = doc_sparql_update(session_id, "doc_id".to_string(), Some(sparql)).await;
    assert!(second.is_ok());

    user_disconnect(&wallet.personal_identity())
        .await
        .expect("disconnect user");
    session_stop(&wallet.personal_identity())
        .await
        .expect("close session");

    wallet_close(&wallet.name()).await.expect("close wallet");
}
