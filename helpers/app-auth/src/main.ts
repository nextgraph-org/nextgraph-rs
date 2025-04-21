// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import "./app.postcss";
import "../../../common/src/styles.css";
import App from "./App.svelte";
import { fromWritablePort } from 'remote-web-streams';
import web_api from "@nextgraph-monorepo/app-api-web";
import {init_api} from "@nextgraph-monorepo/common/api";
import {manifest} from "./store";
init_api(web_api);
import {
  active_wallet,
  has_wallets,
  derived,
} from "@nextgraph-monorepo/common/store";
import {
  get,
} from "svelte/store";
import { push } from "svelte-spa-router";
import { select_default_lang } from "@nextgraph-monorepo/common/lang";
select_default_lang(()=>{return window.navigator.languages;}).then(() => {});

const origin = import.meta.env.NG_DEV ? "http://localhost:1421" : "https://nextgraph.net";

// for development purpose, when testing net-auth
//const origin = "http://localhost:14402"

//let status_callback : WritableStreamDefaultWriter<any> | undefined = undefined;

const AUTH_HOME = "#/";
// const AUTH_USER_PANEL = "#/user";
// const AUTH_USER_ACCOUNTS = "#/user/accounts";
// const AUTH_WALLET = "#/wallet";

window.addEventListener("message", async (event)=>{
  //console.log("got msg in app-auth",event)
  const { method, port } = event.data;
  const writable = fromWritablePort(port);
  const writer = writable.getWriter();
  if (event.origin !== origin) {
    writer.write({status:'error', error:'invalid origin'});
    writer.close();
  } else if ( method === "init" ) {
    
    //console.log("app-auth init done, ng_status_callback set");
    (<any>window).ng_status_callback = writer;
    
    manifest.set(event.data.manifest);

  } else if ( method === "login" ) {

    if (get(active_wallet)) {
      writer.write({ok:true, ret:true});
      writer.close();
    } else {
      //if not logged in
      // go to login and return false
      push(AUTH_HOME);
      writer.write({ok:true, ret:false});
      writer.close();
    }

  } else if ( method === "doc_subscribe" ) {

    let args = event.data.args;
    //console.log("processing doc_subscribe...",method, args);
    args.push((callbacked)=> {
      writer.write({stream:true, ret:callbacked});
    });

    // TODO: deal with cancel and end of stream (call writer.close())

    try {
      let cancel_function = await Reflect.apply(web_api[method], null, args);
    } catch (e) {
      writer.write({ok:false, ret:e});
      writer.close();
    }

  } else {

    // forwarding to ng
    //console.log("processing...",method, event.data.args);
    try {
      let res = await Reflect.apply(web_api[method], null, event.data.args);
      writer.write({ok:true, ret:res});
      writer.close();
    } catch (e) {
      writer.write({ok:false, ret:e});
      writer.close();
    }

  }

}, false);

//console.log("addEventListener for message in app-auth done")
parent.postMessage({ready:true},origin);

const app = new App({
  target: document.getElementById("app"),
});

export default app;