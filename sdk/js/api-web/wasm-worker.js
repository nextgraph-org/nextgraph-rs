// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

// const mapping = {
//     "privkey_to_string": ["privkey"],
//     "client_info": [],
//     "locales": [],
//     "file_get": ["session_id", "reference", "branch_nuri", "callback"],
//     "disconnections_subscribe": ["callback"],
//     "upload_chunk": ["session_id", "upload_id", "chunk", "nuri"],
//     "get_local_bootstrap": ["location", "invite"],
//     "get_local_url": ["location"],
//     "wallet_gen_shuffle_for_pazzle_opening": ["pazzle_length"],
//     "wallet_gen_shuffle_for_pin": [],
//     "wallet_open_with_pazzle": ["wallet","pazzle","pin"],
//     "wallet_open_with_password": ["wallet", "password"],
//     "wallet_open_with_mnemonic_words": ["wallet","mnemonic_words","pin"],
//     "wallet_open_with_mnemonic": ["wallet","mnemonic","pin"],
//     "wallet_was_opened": ["opened_wallet"],
//     "wallet_create": ["params"],
//     "wallet_read_file": ["file"],
//     "wallet_get_file": ["wallet_name"],
//     "wallet_import": ["encrypted_wallet","opened_wallet","in_memory"],
//     "wallet_export_rendezvous": ["session_id", "code"],
//     "wallet_export_get_qrcode": ["session_id", "size"],
//     "wallet_export_get_textcode": ["session_id"],
//     "wallet_import_rendezvous": ["size"],
//     "wallet_import_from_code": ["code"],
//     "wallet_close": ["wallet_name"],
//     "encode_create_account": ["payload"],
//     "session_start": ["wallet_name","user"],
//     "session_start_remote": ["wallet_name","user","peer_id"],
//     "session_stop": ["user_id"],
//     "get_wallets": [],
//     "open_window": ["url","label","title"],
//     "decode_invitation": ["invite"],
//     "user_connect": ["info","user_id","location"],
//     "user_disconnect": ["user_id"],
//     "discrete_update": ["session_id", "update", "heads", "crdt", "nuri"],
//     "app_request": ["request"],
//     "app_request_with_nuri_command": ["nuri", "command", "session_id", "payload"],
//     "sparql_query": ["session_id","sparql","base","nuri"],
//     "sparql_update": ["session_id","sparql","nuri"],
//     "test": [ ],
//     "get_device_name": [],
//     "doc_create": [ "session_id", "crdt", "class_name", "destination", "store_repo" ],
//     "doc_fetch_private_subscribe": [],
//     "doc_fetch_repo_subscribe": ["repo_o"],
//     "branch_history": ["session_id", "nuri"],
//     "file_save_to_downloads": ["session_id", "reference", "filename", "branch_nuri"],
//     "signature_status": ["session_id", "nuri"],
//     "signed_snapshot_request": ["session_id", "nuri"],
//     "signature_request": ["session_id", "nuri"],
//     "update_header": ["session_id","nuri","title","about"],
//     "fetch_header": ["session_id", "nuri"],
//     "retrieve_ng_bootstrap": ["location"],
// }

import * as ng from "@ng-org/lib-wasm";

onmessage = (e) => {
  //console.log("Message received by worker", e.data);
  (async function() {
    try {
        const method = e.data.method;
        const args = e.data.args;
        const port = e.data.port;
        if ( e.data.streamed ) {
            //console.log("processing streamed request ...",method, args);
            args.push((callbacked)=> {
                port.postMessage({stream:true, ret:callbacked});
            });
            try {
                let cancel_function = () => {};
                port.onclose = () => {
                    cancel_function();
                };
                cancel_function = await Reflect.apply(ng[method], null, args);
            } catch (e) {
                port.postMessage({ok:false, ret:e});
                port.close();
            }
        } else {
            // forwarding to ng
            //console.log("processing...",method, args);
            try {
                let res = await Reflect.apply(ng[method], null, args);
                //console.log("got res=",res)
                port.postMessage({ok:true, ret:res});
                port.close();
            } catch (e) {
                port.postMessage({ok:false, ret:e});
                port.close();
            }
        }
    } catch (e) {
      postMessage({error:e});
    }
  })();
};

console.log("worker loaded");
postMessage({loaded:true});