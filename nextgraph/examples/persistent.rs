// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::env::current_dir;
use std::fs::create_dir_all;
use std::fs::read;

#[allow(unused_imports)]
use nextgraph::local_broker::{
    app_request, app_request_stream, init_local_broker, session_start, session_stop, user_connect,
    user_disconnect, wallet_close, wallet_create_v0, wallet_get, wallet_get_file, wallet_import,
    wallet_open_with_pazzle_words, wallet_read_file, wallet_was_opened, LocalBrokerConfig,
    SessionConfig,
};
use nextgraph::net::types::BootstrapContentV0;
use nextgraph::repo::types::PubKey;
use nextgraph::wallet::types::CreateWalletV0;
use nextgraph::wallet::{display_mnemonic, emojis::display_pazzle};

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

    // load some image that will be used as security_img
    // we assume here for the sake of this example,
    // that the current directory contains this demo image file
    let security_img = read("nextgraph/examples/wallet-security-image-demo.png")?;

    // the peer_id should come from somewhere else.
    // this is just given for the sake of an example
    let peer_id_of_server_broker = PubKey::nil();

    // Create your wallet
    // this will take some time !
    println!("Creating the wallet. this will take some time...");

    let wallet_result = wallet_create_v0(CreateWalletV0 {
        security_img,
        security_txt: "know yourself".to_string(),
        pin: [1, 2, 1, 2],
        pazzle_length: 9,
        send_bootstrap: false,
        send_wallet: false,
        result_with_wallet_file: true,
        local_save: true,
        // we default to localhost:14400. this is just for the sake of an example
        core_bootstrap: BootstrapContentV0::new_localhost(peer_id_of_server_broker),
        core_registration: None,
        additional_bootstrap: None,
    })
    .await?;

    println!("Your wallet name is : {}", wallet_result.wallet_name);

    let pazzle = display_pazzle(&wallet_result.pazzle);
    let mut pazzle_words = vec![];
    println!("Your pazzle is: {:?}", wallet_result.pazzle);
    for emoji in pazzle {
        println!(
            "\t{}:\t{}{}",
            emoji.0,
            if emoji.0.len() > 12 { "" } else { "\t" },
            emoji.1
        );
        pazzle_words.push(emoji.1.to_string());
    }
    println!("Your mnemonic is:");
    display_mnemonic(&wallet_result.mnemonic)
        .iter()
        .for_each(|word| print!("{} ", word.as_str()));
    println!("");

    // A session has been opened for you and you can directly use it without the need to call [wallet_was_opened] nor [session_start].
    let user_id = wallet_result.personal_identity();

    // if the user has internet access, they can now decide to connect to its Server Broker, in order to sync data
    let status = user_connect(&user_id).await?;

    // The connection cannot succeed because we miss-configured the core_bootstrap of the wallet. its Peer ID is invalid.
    let error_reason = status[0].3.as_ref().unwrap();
    assert!(error_reason == "NoiseHandshakeFailed" || error_reason == "ConnectionError");

    // a session ID has been assigned to you in `wallet_result.session_id` you can use it to fetch a document
    //let _ = doc_fetch(wallet_result.session_id, "ng:example".to_string(), None).await?;

    // Then we should disconnect
    user_disconnect(&user_id).await?;

    // if you need the Wallet File again (if you didn't select `result_with_wallet_file` by example), you can retrieve it with:
    let wallet_file = wallet_get_file(&wallet_result.wallet_name).await?;

    // if you did ask for `result_with_wallet_file`, as we did above, then the 2 vectors should be identical
    assert_eq!(wallet_file, wallet_result.wallet_file);

    // stop the session
    session_stop(&user_id).await?;

    // closes the wallet
    wallet_close(&wallet_result.wallet_name).await?;

    // as we have saved the wallet, the next time we want to connect,
    // we can retrieve the wallet, display the security phrase and image to the user, ask for the pazzle or mnemonic, and then open the wallet
    let _wallet = wallet_get(&wallet_result.wallet_name).await?;

    // at this point, the wallet is kept in the internal memory of the LocalBroker
    // and it hasn't been opened yet, so it is not usable right away.
    // now let's open the wallet, by providing the pazzle and PIN code
    let opened_wallet =
        wallet_open_with_pazzle_words(&wallet_result.wallet, &pazzle_words, [1, 2, 1, 2])?;

    // once the wallet is opened, we notify the LocalBroker that we have opened it.
    let _client = wallet_was_opened(opened_wallet).await?;

    // now that the wallet is opened, let's start a session.
    // we pass the user_id and the wallet_name
    let _session = session_start(SessionConfig::new_save(
        &user_id,
        &wallet_result.wallet_name,
    ))
    .await?;

    // if the user has internet access, they can now decide to connect to its Server Broker, in order to sync data
    let status = user_connect(&user_id).await?;

    // The connection cannot succeed because we miss-configured the core_bootstrap of the wallet. its Peer ID is invalid.
    let error_reason = status[0].3.as_ref().unwrap();
    assert!(error_reason == "NoiseHandshakeFailed" || error_reason == "ConnectionError");

    // Then we should disconnect
    user_disconnect(&user_id).await?;

    // stop the session
    session_stop(&user_id).await?;

    // closes the wallet
    wallet_close(&wallet_result.wallet_name).await?;

    Ok(())
}
