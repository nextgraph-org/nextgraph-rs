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
import { Bowser } from "../../ng-sdk-js/js/bowser.js"; 
import {version} from '../package.json';

const mapping = {

    "doc_get_file_from_store_with_object_ref": [ "nuri","obj_ref" ],
    "wallet_gen_shuffle_for_pazzle_opening": ["pazzle_length"],
    "wallet_gen_shuffle_for_pin": [],
    "wallet_open_wallet_with_pazzle": ["wallet","pazzle","pin"],
    "wallet_create_wallet": ["params"],
    "encode_create_account": ["payload"],
    "test": [ ]
}

let lastStreamId = 0;

const handler = {
    async apply(target, path, caller, args) {
        
        if (import.meta.env.NG_APP_WEB) {
            let sdk = await import("ng-sdk-js")
            if (path[0] === "client_info") {
                let client_info = await Reflect.apply(sdk[path], caller, args);
                client_info.version=version;
                //console.log(client_info);
                return client_info;
            } else {
                return Reflect.apply(sdk[path], caller, args)
            }
        } else {
            let tauri = await import("@tauri-apps/api/tauri");
            if (path[0] === "client_info") {

                let tauri_platform = import.meta.env.TAURI_PLATFORM;
                let client_type;
                switch (tauri_platform) {
                    case 'macos': client_type = "NativeMacOS";break;
                    case 'linux': client_type = "NativeLinux";break;
                    case 'windows': client_type = "NativeWindows";break;
                    case 'android': client_type = "NativeAndroid";break;
                    case 'ios': client_type = "NativeIos";break;
                }
                let info = Bowser.parse(window.navigator.userAgent);
                info.platform.arch = import.meta.env.TAURI_ARCH;
                info.platform.tauri = {
                    family: import.meta.env.TAURI_FAMILY,
                    os_version: import.meta.env.TAURI_PLATFORM_VERSION,
                    type: import.meta.env.TAURI_PLATFORM_TYPE,
                    debug: import.meta.env.TAURI_DEBUG,
                    target: import.meta.env.TAURI_TARGET_TRIPLE
                };
                info.browser.ua = window.navigator.userAgent;
                let res = {
                    // TODO: install timestamp 
                    V0 : { client_type, details: JSON.stringify(info), version, timestamp_install:0, timestamp_updated:0 }
                };
                //console.log(res);
                return res;
            } else if (path[0] === "doc_sync_branch") {
                let stream_id = (lastStreamId += 1).toString();
                console.log("stream_id",stream_id);
                let { appWindow } = await import("@tauri-apps/plugin-window");
                let nuri = args[0];
                let callback = args[1];

                let unlisten = await appWindow.listen(stream_id, (event) => {
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
            } else if (path[0] === "wallet_create_wallet") {
                let params = args[0];
                params.result_with_wallet_file = false;
                params.security_img = Array.from(new Uint8Array(params.security_img));
                return await tauri.invoke(path[0],{params})
            } else if (path[0].starts_with("get_local_bootstrap")) {
                return false;
            } else if (path[0].starts_with("get_local_url")) {
                return false;
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

export const NG_EU_BSP = "https://nextgraph.eu";
export const NG_EU_BSP_REGISTER = "https://account.nextgraph.eu/#/create";
export const NG_EU_BSP_REGISTERED = "https://nextgraph.eu/#/user/registered";

export const APP_ACCOUNT_REGISTERED_SUFFIX = "/#/user/registered";

export const NG_NET_BSP = "https://nextgraph.net";
export const NG_NET_BSP_REGISTER = "https://account.nextgraph.net/#/create";
export const NG_NET_BSP_REGISTERED = "https://nextgraph.net/#/user/registered";


export default api;