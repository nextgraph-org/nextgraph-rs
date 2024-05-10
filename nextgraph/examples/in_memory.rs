// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::fs::read;

#[allow(unused_imports)]
use nextgraph::local_broker::{
    app_request, app_request_stream, init_local_broker, session_start, session_stop, user_connect,
    user_disconnect, wallet_close, wallet_create_v0, wallet_get, wallet_get_file, wallet_import,
    wallet_open_with_pazzle_words, wallet_read_file, wallet_was_opened, LocalBrokerConfig,
    SessionConfig,
};
use nextgraph::net::types::BootstrapContentV0;
use nextgraph::repo::errors::NgError;
use nextgraph::repo::types::PubKey;
use nextgraph::wallet::types::CreateWalletV0;
use nextgraph::wallet::{display_mnemonic, emojis::display_pazzle};

#[async_std::main]
async fn main() -> std::io::Result<()> {
    // initialize the local_broker with in-memory config.
    // all sessions will be lost when the program exits
    init_local_broker(Box::new(|| LocalBrokerConfig::InMemory)).await;

    // load some image that will be used as security_img
    // we assume here for the sake of this example,
    // that the current directory contains this demo image file
    let security_img = read("nextgraph/examples/wallet-security-image-demo.png")?;

    // the peer_id should come from somewhere else.
    // this is just given for the sake of an example
    #[allow(deprecated)]
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
        local_save: false,
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

    // if you have saved the wallet locally (which we haven't done in the example above, see `local_save: false`), next time you want to connect,
    // you can retrieve the wallet, display the security phrase and image to the user, ask for the pazzle or mnemonic, and then open the wallet
    // if you haven't saved the wallet, the next line will not work once you restart the LocalBroker.
    let _wallet = wallet_get(&wallet_result.wallet_name).await?;

    // at this point, the wallet is kept in the internal memory of the LocalBroker
    // and it hasn't been opened yet, so it is not usable right away.
    // now let's open the wallet, by providing the pazzle and PIN code
    let opened_wallet =
        wallet_open_with_pazzle_words(&wallet_result.wallet, &pazzle_words, [1, 2, 1, 2])?;

    // once the wallet is opened, we notify the LocalBroker that we have opened it.
    let _client = wallet_was_opened(opened_wallet).await?;

    // if instead of saving the wallet locally, you want to provide the Wallet File for every login,
    // then you have to import the wallet. here is an example:
    {
        // this part should happen on another device or on the same machine if you haven't saved the wallet locally

        // you could use the Wallet File and import it there so it could be used for login.
        // first you would read and decode the Wallet File
        // this fails here because we already added this wallet in the LocalBroker (when we created it).
        // But on another device or after a restart of LocalBroker, it would work.
        let wallet = wallet_read_file(wallet_file).await;
        assert_eq!(wallet.unwrap_err(), NgError::WalletAlreadyAdded);

        // we would then open the wallet
        // (here we take the Wallet as we received it from wallet_create_v0, but in real case you would use `wallet`)
        let opened_wallet2 =
            wallet_open_with_pazzle_words(&wallet_result.wallet, &pazzle_words, [1, 2, 1, 2])?;

        // once it has been opened, the Wallet can be imported into the LocalBroker
        // if you try to import the same wallet in a LocalBroker where it is already opened, it will fail.
        // So here it fails. But on another device, it would work.
        let client_fail = wallet_import(wallet_result.wallet.clone(), opened_wallet2, true).await;
        assert_eq!(client_fail.unwrap_err(), NgError::WalletAlreadyAdded);
    }

    // now that the wallet is opened or imported, let's start a session.
    // we pass the user_id and the wallet_name
    let _session = session_start(SessionConfig::new_in_memory(
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
