// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
import {createAsyncProxy} from "async-proxy";
import { Bowser } from "../../../sdk/js/lib-wasm/jsland/bowser.js"; 
import {version} from '../package.json';
import { Window } from '@tauri-apps/api/window';
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const mapping = {
    "privkey_to_string": ["privkey"],
    "wallet_gen_shuffle_for_pazzle_opening": ["pazzle_length"],
    "wallet_gen_shuffle_for_pin": [],
    "wallet_open_with_pazzle": ["wallet","pazzle","pin"],
    "wallet_open_with_password": ["wallet","password"],
    "wallet_open_with_mnemonic_words": ["wallet","mnemonic_words","pin"],
    "wallet_open_with_mnemonic": ["wallet","mnemonic","pin"],
    "wallet_was_opened": ["opened_wallet"],
    "wallet_create": ["params"],
    "wallet_read_file": ["file"],
    "wallet_get_file": ["wallet_name"],
    "wallet_import": ["encrypted_wallet","opened_wallet","in_memory"],
    "wallet_export_rendezvous": ["session_id", "code"],
    "wallet_export_get_qrcode": ["session_id", "size"],
    "wallet_export_get_textcode": ["session_id"],
    "wallet_import_rendezvous": ["size"],
    "wallet_import_from_code": ["code"],
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
    "discrete_update": ["session_id", "update", "heads", "crdt", "nuri"],
    "app_request": ["request"],
    "app_request_with_nuri_command": ["nuri", "command", "session_id", "payload"],
    "sparql_query": ["session_id","sparql","base","nuri"],
    "sparql_update": ["session_id","sparql","nuri"],
    "test": [ ],
    "get_device_name": [],
    "doc_create": [ "session_id", "crdt", "class_name", "destination", "store_repo" ],
    "doc_fetch_private_subscribe": [],
    "doc_fetch_repo_subscribe": ["repo_o"],
    "branch_history": ["session_id", "nuri"],
    "file_save_to_downloads": ["session_id", "reference", "filename", "branch_nuri"],
    "signature_status": ["session_id", "nuri"],
    "signed_snapshot_request": ["session_id", "nuri"],
    "signature_request": ["session_id", "nuri"],
    "update_header": ["session_id","nuri","title","about"],
    "fetch_header": ["session_id", "nuri"],
    "retrieve_ng_bootstrap": ["location"],
    "upload_start": ["session_id", "nuri", "mimetype"],
    "upload_done": ["upload_id","session_id","nuri","filename"],
}


let lastStreamId = 0;
    
const tauri_handler = {
    async apply(target, path, caller, args) {
            try {
                if (path[0] === "open_window") {
                    let callback = args[3];
                    let already_exists = await invoke(path[0],{url:args[0],label:args[1],title:args[2]});
                    if (already_exists) return;

                    let unsub_register_accepted;
                    let unsub_register_error;
                    let unsub_register_close;

                    const unsub_register = function() {
                        if (unsub_register_accepted) unsub_register_accepted();
                        if (unsub_register_error) unsub_register_error();
                        if (unsub_register_close) unsub_register_close();
                        unsub_register_close = undefined;
                        unsub_register_error = undefined;
                        unsub_register_accepted = undefined;
                    };

                    unsub_register_accepted = await listen(
                        "accepted",
                        async (event) => {
                            unsub_register();
                            let reg_popup = await Window.getByLabel("registration");
                            try {
                                await reg_popup.close();
                            } catch (e) {
                                console.error(e);
                            }
                            await (callback)("accepted",event.payload);
                        }
                    );
                    unsub_register_error = await listen("error", async (event) => {
                        unsub_register();
                        let reg_popup = await Window.getByLabel("registration");
                        await reg_popup.close();
                        await (callback)("error",event.payload);
                    });
                    unsub_register_close = await listen("close", async (event) => {
                        console.log("got close", event)
                        unsub_register_close = undefined;
                        unsub_register();
                        await (callback)("close");
                     });

                    return unsub_register;
            } else if (path[0] === "client_info") {
                let from_rust = await invoke("client_info_rust",{});
                let tauri_platform = import.meta.env.TAURI_ENV_PLATFORM;
                let client_type;
                switch (tauri_platform) {
                    case 'macos':
                    case 'darwin': 
                        client_type = "NativeMacOS";break;
                    case 'linux': client_type = "NativeLinux";break;
                    case 'windows': client_type = "NativeWin";break;
                    case 'android': client_type = "NativeAndroid";break;
                    case 'ios': client_type = "NativeIos";break;
                }
                let info = Bowser.parse(window.navigator.userAgent);
                // info.os.type = import.meta.env.TAURI_ENV_PLATFORM_TYPE;
                info.os.family = import.meta.env.TAURI_ENV_FAMILY;
                info.os.version_tauri = import.meta.env.TAURI_ENV_PLATFORM_VERSION;
                info.os.version_uname = from_rust.uname.version;
                info.os.name_rust = from_rust.rust.os_name;
                info.os.name_uname = from_rust.uname.os_name;
                info.platform.arch = import.meta.env.TAURI_ENV_ARCH;
                info.platform.debug = import.meta.env.TAURI_ENV_DEBUG;
                info.platform.target = import.meta.env.TAURI_ENV_TARGET_TRIPLE;
                info.platform.arch_uname = from_rust.uname.arch;
                info.platform.bitness = from_rust.uname.bitness;
                info.platform.codename = from_rust.uname.codename || undefined;
                info.platform.edition = from_rust.uname.edition || undefined;
                info.browser.ua = window.navigator.userAgent;
                let res = {
                    // TODO: install timestamp 
                    V0 : { client_type, details: JSON.stringify(info), version, timestamp_install:0, timestamp_updated:0 }
                };
                //console.log(info,res);
                return res;
            } else if (path[0] === "get_device_name") {
                let tauri_platform = import.meta.env.TAURI_ENV_PLATFORM;
                if (tauri_platform == 'android') return "Android Phone";
                else if (tauri_platform == 'ios') return "iPhone";
                else return await invoke(path[0],{});
            } else if (path[0] === "locales") {
                let from_rust = await invoke("locales",{});
                let from_js = window.navigator.languages;
                console.log(from_rust,from_js);
                for (let lang of from_js) {
                    let split = lang.split("-");
                    if (split[1]) {
                        lang = split[0] + "-" + split[1].toUpperCase();
                    }
                    if (!from_rust.includes(lang)) { from_rust.push(lang);}
                }
                return from_rust;

            } else if (path[0] === "disconnections_subscribe") {
                let callback = args[0];
                let unlisten = await Window.getCurrent().listen("disconnections", (event) => {
                    callback(event.payload).then(()=> {})
                })
                await invoke(path[0],{});
                return () => {
                    unlisten();
                }
            } else if (path[0] === "user_connect") {
                let arg = {};
                args.map((el,ix) => arg[mapping[path[0]][ix]]=el)
                let ret = await invoke(path[0],arg);
                for (let e of Object.entries(ret)) {
                    e[1].since = new Date(e[1].since);
                }
                return ret;
            }
            else if (path[0] === "discrete_update") {
                let arg = {};
                args.map((el,ix) => arg[mapping[path[0]][ix]]=el)
                arg.update = Array.from(new Uint8Array(arg.update));
                return await invoke(path[0],arg)
            } else if (path[0] === "app_request_stream" || path[0] === "doc_subscribe" || path[0] === "orm_start" || path[0] === "file_get") {
                let stream_id = (lastStreamId += 1).toString();
                //console.log("stream_id",stream_id);
                //let session_id = args[0];
                let request; let callback;
                if (path[0] === "app_request_stream") { request = args[0]; callback = args[1]; }
                else if (path[0] === "doc_subscribe") { request = await invoke("doc_fetch_repo_subscribe", {repo_o:args[0]}); request.V0.session_id = args[1]; callback = args[2]; }
                else if (path[0] === "orm_start") { request = await invoke("new_orm_start", {graph_scope:args[0], subject_scope: args[1], shape_type:args[2], session_id:args[3] }); callback = args[4]; }
                else if (path[0] === "file_get") { request = await invoke("new_file_get", {nuri:args[1], branch_nuri:args[2], session_id:args[0] }); callback = args[3]; }

                let unlisten = await getCurrentWindow().listen(stream_id, async (event) => {
                    //console.log(event.payload);
                    if (event.payload.V0) {
                        if (event.payload.V0.FileBinary) {
                            event.payload.V0.FileBinary = Uint8Array.from(event.payload.V0.FileBinary);
                        }
                        // if (event.payload.V0.State?.graph?.triples) {
                        //     let json_str = new TextDecoder().decode(Uint8Array.from(event.payload.V0.State.graph.triples));
                        //     event.payload.V0.State.graph.triples = JSON.parse(json_str);
                        // } else if (event.payload.V0.Patch?.graph) {
                        //     let inserts_json_str = new TextDecoder().decode(Uint8Array.from(event.payload.V0.Patch.graph.inserts));
                        //     event.payload.V0.Patch.graph.inserts = JSON.parse(inserts_json_str);
                        //     let removes_json_str = new TextDecoder().decode(Uint8Array.from(event.payload.V0.Patch.graph.removes));
                        //     event.payload.V0.Patch.graph.removes = JSON.parse(removes_json_str);
                        // }
                        if (event.payload.V0.State?.graph?.triples) {
                            event.payload.V0.State.graph.triples = Uint8Array.from(event.payload.V0.State.graph.triples);
                        } else if (event.payload.V0.Patch?.graph) {
                            event.payload.V0.Patch.graph.inserts = Uint8Array.from(event.payload.V0.Patch.graph.inserts);
                            event.payload.V0.Patch.graph.removes = Uint8Array.from(event.payload.V0.Patch.graph.removes)
                        }
                        if (event.payload.V0.State?.discrete) {
                            let crdt = Object.getOwnPropertyNames(event.payload.V0.State.discrete)[0];
                            event.payload.V0.State.discrete[crdt] = Uint8Array.from(event.payload.V0.State.discrete[crdt]);
                        } else if (event.payload.V0.Patch?.discrete) { 
                            let crdt = Object.getOwnPropertyNames(event.payload.V0.Patch.discrete)[0];
                            event.payload.V0.Patch.discrete[crdt] = Uint8Array.from(event.payload.V0.Patch.discrete[crdt]);
                        }
                    }
                    let ret = callback(event.payload);
                    if (ret === true) {
                        await invoke("cancel_stream", {stream_id});
                    } else if (ret?.then) {
                        ret.then(async (val)=> { 
                            if (val === true) {
                                await invoke("cancel_stream", {stream_id});
                            }
                        });
                    }
                })
                try {
                    await invoke("app_request_stream",{stream_id, request});
                } catch (e) {
                    unlisten();
                    await invoke("cancel_stream", {stream_id});
                    throw e;
                } 
                return () => {
                    unlisten();
                    invoke("cancel_stream", {stream_id});
                }
                
            } else if (path[0] === "get_wallets") {
                let res = await invoke(path[0],{});
                if (res) for (let e of Object.entries(res)) {
                    const sec = e[1].wallet.V0.content.security_img;
                    if (sec)
                    e[1].wallet.V0.content.security_img = Uint8Array.from(sec);
                }
                return res || {};

            } else if (path[0] === "wallet_import_from_code") {
                let arg = {};
                args.map((el,ix) => arg[mapping[path[0]][ix]]=el);
                let res = await invoke(path[0],arg);
                if (res && res.V0.content.security_img) {
                    res.V0.content.security_img = Uint8Array.from(res.V0.content.security_img);
                }
                return res || {};

            } else if (path[0] === "upload_chunk") {
                let session_id = args[0];
                let upload_id = args[1];
                let chunk = args[2];
                let nuri = args[3];
                chunk = Array.from(new Uint8Array(chunk));
                return await invoke(path[0],{session_id, upload_id, chunk, nuri})
            } else if (path[0] === "wallet_create") {
                let params = args[0];
                params.result_with_wallet_file = false;
                //params.security_img = Array.from(new Uint8Array(params.security_img));
                return await invoke(path[0],{params})
            } else if (path[0] === "wallet_read_file") {
                let file = args[0];
                file = Array.from(new Uint8Array(file));
                return await invoke(path[0],{file})
            } else if (path[0] === "wallet_import") {
                let encrypted_wallet = args[0];
                encrypted_wallet.V0.content.security_img = Array.from(new Uint8Array(encrypted_wallet.V0.content.security_img));
                return await invoke(path[0],{encrypted_wallet, opened_wallet:args[1], in_memory:args[2]})
            } else if (path[0] && path[0].startsWith("get_local_bootstrap")) {
                return false;
            } else if (path[0] === "get_local_url") {
                return false;
            } else if (path[0] === "wallet_open_with_pazzle" || path[0] === "wallet_open_with_mnemonic_words" || path[0] === "wallet_open_with_mnemonic") {
                let arg:any = {};
                args.map((el,ix) => arg[mapping[path[0]][ix]]=el)
                let img = Array.from(new Uint8Array(arg.wallet.V0.content.security_img));
                let old_content = arg.wallet.V0.content;
                arg.wallet = {V0:{id:arg.wallet.V0.id, sig:arg.wallet.V0.sig, content:{}}};
                Object.assign(arg.wallet.V0.content,old_content);
                arg.wallet.V0.content.security_img = img;
                return await invoke(path[0],arg);
            } else {
                let arg = {};
                args.map((el,ix) => arg[mapping[path[0]][ix]]=el)
                return await invoke(path[0],arg)
            }
        } catch (e) {
            let error;
            try {
                error = JSON.parse(e);
            } catch (f) {
                error = e;
            }
            throw error;
        }
        }
    };

const tauri_api = createAsyncProxy({}, tauri_handler);

export default tauri_api;