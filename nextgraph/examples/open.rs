// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use nextgraph::local_broker::{
    doc_fetch, init_local_broker, session_start, session_stop, user_connect, user_disconnect,
    wallet_close, wallet_create_v0, wallet_get, wallet_get_file, wallet_import,
    wallet_open_with_pazzle, wallet_open_with_pazzle_words, wallet_read_file, wallet_was_opened,
    LocalBrokerConfig, SessionConfig,
};
use nextgraph::net::types::BootstrapContentV0;
use nextgraph::repo::errors::NgError;
use nextgraph::repo::types::PubKey;
use nextgraph::wallet::types::CreateWalletV0;
use nextgraph::wallet::{display_mnemonic, emojis::display_pazzle};

use std::env::current_dir;
use std::fs::create_dir_all;
use std::fs::read;

#[async_std::main]
async fn main() -> std::io::Result<()> {
    // get the current working directory
    let mut current_path = current_dir()?;
    current_path.push(".ng");
    current_path.push("example");
    create_dir_all(current_path.clone())?;

    // initialize the local_broker with config to save to disk in a folder called `.ng/example` in the current directory
    init_local_broker(Box::new(move || {
        LocalBrokerConfig::BasePath(current_path.clone())
    }))
    .await;

    let wallet_name = "9ivXl3TpgcQlDKTmR9NOipjhPWxQw6Yg5jkWBTlJuXw".to_string();

    // as we have previously saved the wallet,
    // we can retrieve it, display the security phrase and image to the user, ask for the pazzle or mnemonic, and then open the wallet
    let wallet = wallet_get(&wallet_name).await?;

    // at this point, the wallet is kept in the internal memory of the LocalBroker
    // and it hasn't been opened yet, so it is not usable right away.
    // now let's open the wallet, by providing the pazzle and PIN code
    let opened_wallet = wallet_open_with_pazzle(
        &wallet,
        vec![110, 139, 115, 94, 9, 40, 74, 25, 52],
        [2, 3, 2, 3],
    )?;

    let user_id = opened_wallet.personal_identity();

    // once the wallet is opened, we notify the LocalBroker that we have opened it.
    let _client = wallet_was_opened(opened_wallet).await?;

    // now that the wallet is opened, let's start a session.
    // we pass the user_id and the wallet_name
    let _session = session_start(SessionConfig::new_save(&user_id, &wallet_name)).await?;

    // if the user has internet access, they can now decide to connect to its Server Broker, in order to sync data
    let status = user_connect(&user_id).await?;

    // The connection cannot succeed because we miss-configured the core_bootstrap of the wallet. its Peer ID is invalid.
    println!("Connection was : {:?}", status[0]);
    //assert!(error_reason == "NoiseHandshakeFailed" || error_reason == "ConnectionError");

    // Then we should disconnect
    user_disconnect(&user_id).await?;

    // stop the session
    session_stop(&user_id).await?;

    // closes the wallet
    wallet_close(&wallet_name).await?;

    Ok(())
}
