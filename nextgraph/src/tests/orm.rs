// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::env::current_dir;
use std::error::Error;
use std::fs::{self, create_dir_all, read, File};
use std::io::{Read, Write};
use std::path::PathBuf;

use crate::local_broker::{
    doc_sparql_update, init_local_broker, session_start, session_stop, user_connect,
    user_disconnect, wallet_close, wallet_create_v0, wallet_get, wallet_get_file,
    wallet_open_with_mnemonic_words, wallet_read_file, wallet_was_opened, LocalBrokerConfig,
    SessionConfig,
};
use ng_net::types::BootstrapContentV0;
use ng_repo::types::PubKey;
use ng_wallet::display_mnemonic; // to persist mnemonic as words
use ng_wallet::types::{CreateWalletV0, SensitiveWallet, SensitiveWalletV0};
use once_cell::sync::OnceCell;

static WALLET_PIN: [u8; 4] = [2, 3, 2, 3];

// Persistent test assets (wallet base path + stored credentials)
fn test_base_path() -> PathBuf {
    let mut current_path = current_dir().expect("current_dir");
    current_path.push(".ng");
    create_dir_all(current_path.clone()).expect("create test base path");
    current_path
}

fn build_wallet_and_creds_paths() -> (PathBuf, PathBuf) {
    let mut current_path = current_dir().expect("current_dir");
    current_path.push(".ng");
    create_dir_all(current_path.clone()).expect("create test base path");

    return (
        current_path.join("test_wallet.ngw"),
        current_path.join("wallet_creds.txt"),
    );
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
    if wallet_path.exists() {
        let wallet_file = read("./.ng/test-wallet.ngw").expect("read wallet file");
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

        let session = session_start(SessionConfig::new_in_memory(
            &wallet.personal_identity(),
            &read_wallet.name(),
        ))
        .await
        .unwrap();
        session_id = session.session_id;
    } else {
        // first run: create wallet
        // Load a real security image from the nextgraph examples to satisfy validation
        let security_img = read("./1-pixel.png").unwrap();
        // .or_else(|_| read("../nextgraph/examples/wallet-security-image-white.png"))
        // .expect("security image");

        let peer_id_of_server_broker = PubKey::nil();
        let result = wallet_create_v0(CreateWalletV0 {
            security_img,
            security_txt: "know yourself".to_string(),
            pin: WALLET_PIN,
            pazzle_length: 9,
            send_bootstrap: false,
            send_wallet: false,
            result_with_wallet_file: false,
            local_save: true,
            core_bootstrap: BootstrapContentV0::new_localhost(peer_id_of_server_broker),
            core_registration: None,
            additional_bootstrap: None,
            pdf: false,
            device_name: "test".to_string(),
        })
        .await
        .expect("wallet_create_v0");

        // Save wallet to file.
        let wallet_file_bin = wallet_get_file(&result.wallet_name).await.unwrap();
        let mut creds_file = File::create(creds_path).expect("create creds file");
        let mut wallet_file = File::create(wallet_path).expect("create wallet file");

        // Use the mnemonic_str already provided (list of words) to avoid mistakes
        let mnemonic_words: Vec<String> = result.mnemonic_str.clone();
        writeln!(creds_file, "{}", mnemonic_words.join(" ")).expect("write mnemonic to creds file");

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
    let doc_id = "urn:ng:testShapeGraph".to_string();
    let result = doc_sparql_update(session_id, doc_id.clone(), Some(sparql.clone())).await;
    assert!(result.is_ok(), "SPARQL update failed: {:?}", result.err());

    // Optional: a second idempotent insert should not duplicate (implementation dependent)
    let second = doc_sparql_update(session_id, doc_id, Some(sparql)).await;
    assert!(second.is_ok());

    user_disconnect(&wallet.personal_identity());
    session_stop(&wallet.personal_identity()).await.ok();

    wallet_close(&wallet.name());
}
