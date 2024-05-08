// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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

    "wallet_gen_shuffle_for_pazzle_opening": ["pazzle_length"],
    "wallet_gen_shuffle_for_pin": [],
    "wallet_open_with_pazzle": ["wallet","pazzle","pin"],
    "wallet_was_opened": ["opened_wallet"],
    "wallet_create": ["params"],
    "wallet_read_file": ["file"],
    "wallet_get_file": ["wallet_name"],
    "wallet_import": ["encrypted_wallet","opened_wallet","in_memory"],
    "wallet_close": ["wallet_name"],
    "encode_create_account": ["payload"],
    "session_start": ["wallet_name","user"],
    "session_start_remote": ["wallet_name","user","peer_id"],
    "session_stop": ["user_id"],
    "get_wallets": [],
    "open_window": ["url","label","title"],
    "decode_invitation": ["invite"],
    "user_connect": ["info","user_id","location"],
    "user_disconnect": ["user_id"],
    "app_request": ["session_id","request"],
    "test": [ ],
    "doc_fetch_private_subscribe": []
}


let lastStreamId = 0;

const handler = {
    async apply(target, path, caller, args) {
        
        if (import.meta.env.NG_APP_WEB) {
            let sdk = await import("ng-sdk-js")
            if (path[0] === "client_info") {
                let client_info = await Reflect.apply(sdk[path], caller, args);
                client_info.V0.version=version;
                //console.log(client_info);
                return client_info;
            } else if (path[0] === "get_wallets") {
                let wallets = await Reflect.apply(sdk[path], caller, args);
                return Object.fromEntries(wallets || []);
            // } else if (path[0] === "session_start") {
            //     let res = await Reflect.apply(sdk[path], caller, args);
            //     return res;
            // } else if (path[0] === "wallet_create") {
            //     let res = await Reflect.apply(sdk[path], caller, args);
            //     return res;
            } else {
                return Reflect.apply(sdk[path], caller, args)
            }
        } else {
            let tauri = await import("@tauri-apps/api/tauri");
            if (path[0] === "client_info") {
                let from_rust = await tauri.invoke("client_info_rust",{});
                
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
                info.os.type = import.meta.env.TAURI_PLATFORM_TYPE;
                info.os.family = import.meta.env.TAURI_FAMILY;
                info.os.version_tauri = import.meta.env.TAURI_PLATFORM_VERSION;
                info.os.version_uname = from_rust.uname.version;
                info.os.name_rust = from_rust.rust.os_name;
                info.os.name_uname = from_rust.uname.os_name;
                info.platform.arch = import.meta.env.TAURI_ARCH;
                info.platform.debug = import.meta.env.TAURI_DEBUG;
                info.platform.target = import.meta.env.TAURI_TARGET_TRIPLE;
                info.platform.arch_uname = from_rust.uname.arch;
                info.platform.bitness = from_rust.uname.bitness;
                info.platform.codename = from_rust.uname.codename || undefined;
                info.platform.edition = from_rust.uname.edition || undefined;
                info.browser.ua = window.navigator.userAgent;
                let res = {
                    // TODO: install timestamp 
                    V0 : { client_type, details: JSON.stringify(info), version, timestamp_install:0, timestamp_updated:0 }
                };
                console.log(info,res);
                return res;
            } else if (path[0] === "disconnections_subscribe") {
                let { getCurrent } = await import("@tauri-apps/plugin-window");
                let callback = args[0];
                let unlisten = await getCurrent().listen("disconnections", (event) => {
                    callback(event.payload).then(()=> {})
                })
                await tauri.invoke(path[0],{});
                return () => {
                    unlisten();
                }
            } else if (path[0] === "user_connect") {
                let arg = {};
                args.map((el,ix) => arg[mapping[path[0]][ix]]=el)
                let ret = await tauri.invoke(path[0],arg);
                for (let e of Object.entries(ret)) {
                    e[1].since = new Date(e[1].since);
                }
                return ret;
            }
            else if (path[0] === "app_request_stream") {
                let stream_id = (lastStreamId += 1).toString();
                console.log("stream_id",stream_id);
                let { getCurrent } = await import("@tauri-apps/plugin-window");
                let session_id = args[0];
                let request = args[1];
                let callback = args[2];

                let unlisten = await getCurrent().listen(stream_id, (event) => {
                    callback(event.payload).then(()=> {})
                })
                await tauri.invoke("app_request_stream",{session_id, stream_id, request});
                
                return () => {
                    unlisten();
                    tauri.invoke("cancel_stream", {stream_id});
                }
                
            } else if (path[0] === "get_wallets") {
                let res = await tauri.invoke(path[0],{});
                if (res) for (let e of Object.entries(res)) {
                    e[1].wallet.V0.content.security_img = Uint8Array.from(e[1].wallet.V0.content.security_img);
                }
                return res || {};

            } else if (path[0] === "upload_chunk") {
                let session_id = args[0];
                let upload_id = args[1];
                let chunk = args[2];
                let nuri = args[3];
                chunk = Array.from(new Uint8Array(chunk));
                return await tauri.invoke(path[0],{session_id, upload_id, chunk, nuri})
            } else if (path[0] === "wallet_create") {
                let params = args[0];
                params.result_with_wallet_file = false;
                params.security_img = Array.from(new Uint8Array(params.security_img));
                return await tauri.invoke(path[0],{params})
            } else if (path[0] === "wallet_read_file") {
                let file = args[0];
                file = Array.from(new Uint8Array(file));
                return await tauri.invoke(path[0],{file})
            } else if (path[0] === "wallet_import") {
                let encrypted_wallet = args[0];
                encrypted_wallet.V0.content.security_img = Array.from(new Uint8Array(encrypted_wallet.V0.content.security_img));
                return await tauri.invoke(path[0],{encrypted_wallet, opened_wallet:args[1], in_memory:args[2]})
            } else if (path[0] && path[0].startsWith("get_local_bootstrap")) {
                return false;
            } else if (path[0] === "get_local_url") {
                return false;
            } else if (path[0] === "wallet_open_with_pazzle") {
                let arg:any = {};
                args.map((el,ix) => arg[mapping[path[0]][ix]]=el)
                let img = Array.from(new Uint8Array(arg.wallet.V0.content.security_img));
                let old_content = arg.wallet.V0.content;
                arg.wallet = {V0:{id:arg.wallet.V0.id, sig:arg.wallet.V0.sig, content:{}}};
                Object.assign(arg.wallet.V0.content,old_content);
                arg.wallet.V0.content.security_img = img;
                return tauri.invoke(path[0],arg)
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
export const NG_EU_BSP_REGISTER = import.meta.env.PROD
? "https://account.nextgraph.eu/#/create"
: "http://account-dev.nextgraph.eu:5173/#/create";

export const NG_NET_BSP = "https://nextgraph.net";
export const NG_NET_BSP_REGISTER = import.meta.env.PROD
? "https://account.nextgraph.net/#/create"
: "http://account-dev.nextgraph.net:5173/#/create";

export const APP_ACCOUNT_REGISTERED_SUFFIX = "/#/user/registered";
export const APP_WALLET_CREATE_SUFFIX = "/#/wallet/create";

export const LINK_NG_BOX = "https://nextgraph.org/ng-box/";
export const LINK_SELF_HOST = "https://nextgraph.org/self-host/";


export default api;