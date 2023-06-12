// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
import {createAsyncProxy} from "async-proxy";
import { writable } from "svelte/store";

const mapping = {

    "doc_get_file_from_store_with_object_ref": [ "nuri","obj_ref" ],
    "wallet_gen_shuffle_for_pazzle_opening": ["pazzle_length"],
    "wallet_gen_shuffle_for_pin": [],
    "wallet_open_wallet_with_pazzle": ["wallet","pazzle","pin"],
    "wallet_create_wallet": ["params"],
    "test": [ ]
}

let lastStreamId = 0;

const handler = {
    async apply(target, path, caller, args) {
        
        if (import.meta.env.NG_APP_WEB) {
            let sdk = await import("ng-sdk-js")
            return Reflect.apply(sdk[path], caller, args)
        } else {
            let tauri = await import("@tauri-apps/api/tauri");

            if (path[0] === "doc_sync_branch") {
                let stream_id = (lastStreamId += 1).toString();
                console.log("stream_id",stream_id);
                let { listen } = await import("@tauri-apps/api/event");
                let nuri = args[0];
                let callback = args[1];

                let unlisten = await listen(stream_id, (event) => {
                    callback(event.payload).then(()=> {})
                })
                await tauri.invoke("doc_sync_branch",{nuri, stream_id});
                
                return () => {
                    unlisten();
                    tauri.invoke("cancel_doc_sync_branch", {stream_id});
                }
            } else if (path[0] === "doc_get_file_from_store_with_object_ref") {
                let arg = {};
                args.map((el,ix) => arg[mapping[path[0]][ix]]=el)
                let res = await tauri.invoke(path[0],arg);
                res['File'].V0.content = Uint8Array.from(res['File'].V0.content);
                res['File'].V0.metadata = Uint8Array.from(res['File'].V0.metadata);
                return res
            }
            else {
                let arg = {};
                args.map((el,ix) => arg[mapping[path[0]][ix]]=el)
                return tauri.invoke(path[0],arg)
            }
        }
    },
  };
  
const api = createAsyncProxy({}, handler);

export default api;