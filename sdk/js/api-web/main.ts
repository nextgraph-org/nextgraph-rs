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
import { Bowser } from "../lib-wasm/jsland/bowser.js"; 

import worker from "./wasm-worker.js?worker&inline";

let myWorker = new worker();

function convert_error(e) {
    if (
        e == "The operation is insecure." ||
        e ==
          "Failed to read the 'sessionStorage' property from 'Window': Access is denied for this document." ||
        e ==
          "Failed to read the 'localStorage' property from 'Window': Access is denied for this document."
      ) {
        return "Please allow this website to store cookies, session and local storage.";
      } else {
        return e
      }
}

export const worker_ready = new Promise<void>((resolve) => {

myWorker.onerror = (e) => {
    console.error(e);
};
myWorker.onmessageerror = (e) => {
    console.error(e);
};

myWorker.onmessage = async (msg) => {
    //console.log("Message received from worker", msg.data);
    if (msg.data.loaded) {
        resolve();
        console.log("WASM worker loaded");
    }
    else if (msg.data.method == "session_save") {
        try {
            sessionStorage.setItem(msg.data.key, msg.data.value);
            msg.data.port.postMessage({ok:true});
        } catch(e) {
            console.error(e);
            msg.data.port.postMessage({ error:convert_error(e.message)});
        }
        msg.data.port.close();
    } else if (msg.data.method == "session_get") {
        try {
            msg.data.port.postMessage({ ok:sessionStorage.getItem(msg.data.key)});
        } catch(e) {
            msg.data.port.postMessage({ error:e.message});
            console.error(e);
        }
        msg.data.port.close();
    } else if (msg.data.method == "session_remove") {
        try {
            sessionStorage.removeItem(msg.data.key);
        } catch(e) {
            console.error(e);
        }
    } else if (msg.data.method == "local_save") {
        try {
            localStorage.setItem(msg.data.key, msg.data.value);
            msg.data.port.postMessage({ok:true});
        } catch(e) {
            console.error(e);
            msg.data.port.postMessage({error:convert_error(e.message)});
        }
        msg.data.port.close();
    } else if (msg.data.method == "storage_clear") {
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch(e) {
            console.error(e);
        }
    } else if (msg.data.method == "local_get") {
        try {
            msg.data.port.postMessage({ok:localStorage.getItem(msg.data.key)});
        } catch(e) {
            msg.data.port.postMessage({ error:e.message});
            console.error(e);
        }
        msg.data.port.close();
    }
};

});

//TODO: add all the streamed functions
const streamed_api: Record<string,number> = {
  "doc_subscribe": 2,
  "orm_start": 4,
  "file_get": 3,
  "app_request_stream": 1,
  "disconnections_subscribe": 0,
};

function call_sdk(method:string, args?: any) {

    //console.log("call_sdk", method, args)

    const { port1, port2 } = new MessageChannel();

    let callback_idx = streamed_api[method];
    if (callback_idx !== undefined) { 
        let callback = args[callback_idx];
        let new_args = args.slice(0, -1);
        myWorker.postMessage({ method, streamed: true, args:new_args, port: port2 }, [port2]);
        let unsub = new Promise((resolve, reject)=> {
            let resolved = false;
            
            port1.onmessage = (m) => {
                if (m.data.stream) {
                    if (!resolved) {
                        resolve(()=>{ 
                            port1.postMessage({close:true});
                            port1.close();
                        });
                        resolved = true;
                    }
                    if (m.data.ret !== undefined) {
                        let cbret = (callback)(m.data.ret);
                        if (cbret?.then) {
                            cbret.then((val)=> { 
                                if (val === true) {
                                    port1.postMessage({close:true});
                                    port1.close();
                                }
                            });
                        } else if (cbret === true) {
                            port1.postMessage({close:true});
                            port1.close();
                        }
                    }
                } else if (!m.data.ok) {
                    console.error("error in call_sdk", m.data.ret);
                    if (!resolved) {
                        reject(m.data.ret);
                        resolved = true;
                    } else {
                        throw new Error(m.data.ret);
                    }
                } 
            }; 
        });
        
        //port2.onclose = ()
        return unsub;

    } else {
        myWorker.postMessage({ method, args, port: port2 }, [port2]);
        return new Promise((resolve, reject)=> {
            port1.onmessage = (m) => {
                //console.log("GOT",m.data);
                if (m.data.ok) {
                    resolve(m.data.ret);
                } else {
                    console.error("method "+method+" with args ", args, " failed with ",m.data.ret);
                    reject(new Error(m.data.ret));
                } 
            };
        });
    }

}

const web_handler = {
    async apply(_target: object, path: PropertyKey[], _caller: any, args?: any) :Promise<any> {
        //console.log("web_handler", path, args )
        if (path[0] === "get_bowser") {
            let info = Bowser.parse(window.navigator.userAgent);
            return info.browser.name;
        } else if (path[0] === "client_info") {
            let client_info = await Reflect.apply(sdk[path[0]], _caller, args);
            client_info.V0.version=version;
            //console.log(client_info);
            return client_info;
        } else if (path[0] === "get_worker") {
            return await import("./worker.js?worker&inline");
        } else if (path[0] === "get_wallets") {
            let wallets = await call_sdk(<string>path[0], args);
            return Object.fromEntries(wallets || []);
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
            return call_sdk(<string>path[0], args)
        } else {
            return call_sdk(<string>path[0], args)
        }

    }
};
const web_api = createAsyncProxy({}, web_handler);

export default web_api;

