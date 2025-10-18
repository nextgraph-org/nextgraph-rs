// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import { createAsyncProxy } from "async-proxy";

let initialized = false;

const redirect_server = import.meta.env.NG_REDIR_SERVER || "nextgraph.net";
const config = import.meta.env.NG_DEV ? {redirect:"http://localhost:14402/#/?o=", origin: "http://localhost:14404"} :
      import.meta.env.NG_DEV_LOCAL_BROKER ? {redirect:"http://localhost:1421/redir.html#/?o=", origin: "http://localhost:1421"} : 
                                {redirect:`https://${redirect_server}/redir/#/?o=`, origin: `https://${redirect_server}`} ;
// to test ngnet
//const config = {redirect:"http://127.0.0.1:3033/auth/#/?o=", origin: "http://127.0.0.1:3033"}; 

export const init = async function(callback:Function | null, singleton:boolean, access_requests:any) {
  if (!window) throw new Error("init(callback,..) can only be called from a browser's window");
  if (window.self === window.top){
    window.location.href = config.redirect + encodeURIComponent(window.location.href);
  } else if (initialized === false) {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = async (m) => {
      //console.log("got message in ng-web", m);
      if (m.data.ok) {
        initialized = m.data.ret;
        if (callback) { await (callback)({status:"loggedin", session:initialized}); }
      }
      port1.close();
    };
    parent.postMessage({ method: "init", origin: window.location.href, singleton, access_requests, port: port2 }, config.origin, [port2]);
  } else {
    throw new Error("you must call init() only once");
  }
}

function rpc( method:string, args?: any) : Promise<any> {
  const { port1, port2 } = new MessageChannel();
  //console.log("POSTING",method, args);
  if (method==="doc_subscribe") { //TODO: add all the streamed functions
    let callback = args[2];
    let new_args = [args[0],args[1]];
    parent.postMessage({ method, args:new_args, port: port2 }, config.origin, [port2]);
    let unsub = new Promise(async (resolve)=> {
      resolve(()=>{ 
        port1.close();
      });
    });
    port1.onmessage = async (m) => {
      if (m.data.stream) {
        await (callback)(m.data.ret);
      } else if (!m.data.ok) {
        throw new Error(m.data.ret);
      } 
    };
    //port2.onclose = ()
    return unsub;

  } else {
    parent.postMessage({ method, args, port: port2 }, config.origin, [port2]);
    return new Promise((resolve, reject)=> {
      port1.onmessage = (m) => {
        //console.log(m.data);
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

const handler = {
  apply(_target: object, path: PropertyKey[], _caller: any, args?: any) :Promise<any> {
    if (initialized === false) {
      throw new Error("you must call init() first (and once)");
    }
    // if (path[0] === "login") {
    //   if (await rpc("login") !== true) {
    //     return false;
    //   } else {
    //     return true;
    //   }
    // } else {
      return rpc(<string>path[0], args);
    //}
  }
};

export const ng = createAsyncProxy({}, handler);