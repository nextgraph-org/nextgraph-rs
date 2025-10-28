// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
import {createAsyncProxy} from "async-proxy";
import {version} from './package.json';
import * as sdk from "@ng-org/lib-wasm";
//import * as sdk from "../lib-wasm/pkg";
import { Bowser } from "../lib-wasm/jsland/bowser.js"; 

const web_handler = {
    async apply(target, path, caller, args) {
        
        if (path[0] === "get_bowser") {
            let info = Bowser.parse(window.navigator.userAgent);
            return info.browser.name;
        } else if (path[0] === "client_info") {
            let client_info = await Reflect.apply(sdk[path], caller, args);
            client_info.V0.version=version;
            //console.log(client_info);
            return client_info;
        } else if (path[0] === "get_worker") {
            return await import("./worker.js?worker&inline");
        } else if (path[0] === "get_wallets") {
            let wallets = await Reflect.apply(sdk[path], caller, args);
            return Object.fromEntries(wallets || []);
        // } else if (path[0] === "session_start") {
        //     let res = await Reflect.apply(sdk[path], caller, args);
        //     return res;
        // } else if (path[0] === "wallet_create") {
        //     let res = await Reflect.apply(sdk[path], caller, args);
        //     return res;
        } else if (path[0] === "app_request_stream") {
            let callback = args[1];
            let new_callback = (event) => {
                if (event.V0.State?.graph?.triples) {
                    let json_str = new TextDecoder().decode(event.V0.State.graph.triples);
                    event.V0.State.graph.triples = JSON.parse(json_str);
                } else if (event.V0.Patch?.graph) {
                    let inserts_json_str = new TextDecoder().decode(event.V0.Patch.graph.inserts);
                    event.V0.Patch.graph.inserts = JSON.parse(inserts_json_str);
                    let removes_json_str = new TextDecoder().decode(event.V0.Patch.graph.removes);
                    event.V0.Patch.graph.removes = JSON.parse(removes_json_str);
                }
                callback(event).then(()=> {})
            };
            args[1] = new_callback;
            return Reflect.apply(sdk[path], caller, args)
        } else {
            return Reflect.apply(sdk[path], caller, args)
        }

    }
};
const web_api = createAsyncProxy({}, web_handler);

export default web_api;

