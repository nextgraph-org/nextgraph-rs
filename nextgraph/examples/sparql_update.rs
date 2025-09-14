// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::fs::read;

use async_std::stream::StreamExt;
#[allow(unused_imports)]
use nextgraph::local_broker::{
    app_request, app_request_stream, doc_fetch_repo_subscribe, doc_sparql_update,
    init_local_broker, session_start, session_stop, user_connect, user_disconnect, wallet_close,
    wallet_create_v0, wallet_get, wallet_get_file, wallet_import, wallet_open_with_mnemonic_words,
    wallet_read_file, wallet_was_opened, LocalBrokerConfig, SessionConfig,
};
use nextgraph::net::types::BootstrapContentV0;
use nextgraph::repo::errors::NgError;
use nextgraph::repo::log::*;
use nextgraph::repo::types::PubKey;
use nextgraph::wallet::types::CreateWalletV0;
use nextgraph::wallet::{display_mnemonic, emojis::display_pazzle};

#[async_std::main]
async fn main() -> std::io::Result<()> {
    // initialize the local_broker with in-memory config.
    // all sessions will be lost when the program exits
    init_local_broker(Box::new(|| LocalBrokerConfig::InMemory)).await;

    let wallet_file =
        read("/Users/nl/Downloads/wallet-Hr-UITwGtjE1k6lXBoVGzD4FQMiDkM3T6bSeAi9PXt4A.ngw")
            .expect("read wallet file");

    let wallet = wallet_read_file(wallet_file).await?;

    let mnemonic_words = vec![
        "jealous".to_string(),
        "during".to_string(),
        "elevator".to_string(),
        "swallow".to_string(),
        "pen".to_string(),
        "phone".to_string(),
        "like".to_string(),
        "employ".to_string(),
        "myth".to_string(),
        "remember".to_string(),
        "question".to_string(),
        "lemon".to_string(),
    ];

    let opened_wallet = wallet_open_with_mnemonic_words(&wallet, &mnemonic_words, [2, 3, 2, 3])?;

    let user_id = opened_wallet.personal_identity();
    let wallet_name = opened_wallet.name();

    let client = wallet_import(wallet.clone(), opened_wallet, true).await?;

    let session = session_start(SessionConfig::new_in_memory(&user_id, &wallet_name)).await?;

    // let session = session_start(SessionConfig::new_remote(&user_id, &wallet_name, None)).await?;

    // if the user has internet access, they can now decide to connect to its Server Broker, in order to sync data
    let status = user_connect(&user_id).await?;

    let result = doc_sparql_update(
        session.session_id,
        "INSERT DATA { <did:ng:_> <example:predicate> \"An example value10\". }".to_string(),
        Some("did:ng:o:Dn0QpE9_4jhta1mUWRl_LZh1SbXUkXfOB5eu38PNIk4A:v:Z4ihjV3KMVIqBxzjP6hogVLyjkZunLsb7MMsCR0kizQA".to_string()),
    )
    .await;

    log_debug!("{:?}", result);

    // // a session ID has been assigned to you in `session.session_id` you can use it to fetch a document
    // let (mut receiver, cancel) = doc_fetch_repo_subscribe(
    //     session.session_id,
    //     "did:ng:o:Dn0QpE9_4jhta1mUWRl_LZh1SbXUkXfOB5eu38PNIk4A".to_string(),
    // )
    // .await?;

    // cancel();

    // while let Some(app_response) = receiver.next().await {
    //     let (inserts, removes) =
    //         nextgraph::verifier::read_triples_in_app_response_from_rust(app_response)?;
    //     log_debug!("inserts {:?}", inserts);
    //     log_debug!("removes {:?}", removes);
    // }

    // Then we should disconnect
    user_disconnect(&user_id).await?;

    // stop the session
    session_stop(&user_id).await?;

    // closes the wallet
    wallet_close(&wallet_name).await?;

    Ok(())
}
