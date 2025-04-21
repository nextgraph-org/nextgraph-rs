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
import { link, push } from "svelte-spa-router";
import App from "./App.svelte";
import { fromWritablePort, RemoteReadableStream } from 'remote-web-streams';
import { web_origin } from './store';

import { select_default_lang } from "@nextgraph-monorepo/common/lang";
select_default_lang(()=>{return window.navigator.languages;}).then(() => {});

//let status_callback : WritableStreamDefaultWriter<any> | undefined = undefined;

const origin = decodeURIComponent(location.search.substring(3));

document.getElementById("banner").innerText = "Opening Wallet for "+ new URL(origin).host;

async function rpc( method:string, args?: any) : Promise<any> {
  const { readable, writablePort } = new RemoteReadableStream();
  (<any>window).ng_broker_selected.postMessage({ method, args, port: writablePort }, (<any>window).ng_iframe_origin, [writablePort]);
  const reader = readable.getReader();
  let ret = await reader.read();
  await reader.read(); // the close
  return ret.value;
}

async function rpc_stream( method:string, args: any, writer:WritableStreamDefaultWriter<any>) {
  const { readable, writablePort } = new RemoteReadableStream();
  (<any>window).ng_broker_selected.postMessage({ method, args, port: writablePort }, (<any>window).ng_iframe_origin, [writablePort]);
  const reader = readable.getReader();
  for (var msg; msg = await reader.read(); ) {
    if (msg.done) {
      writer.close();
      break;
    }
    if (msg.value.error) {
      writer.write(msg.value);
      writer.close();
      break;
    } else if (msg.value.stream) {
      writer.write(msg.value);
    }
    // TODO: deal with end of stream
  }
}

const AUTH_HOME = "#/";
// const AUTH_USER_PANEL = "#/user";
// const AUTH_USER_ACCOUNTS = "#/user/accounts";
// const AUTH_WALLET = "#/wallet";

window.addEventListener("message", async (event)=>{
  if (event.data.ready) return;
  const { method, port } = event.data;
  const writable = fromWritablePort(port);
  const writer = writable.getWriter();
  if (event.origin !== origin) {
    console.error("invalid origin",event.origin,origin)
    writer.write({status:'error', error:'invalid origin'});
    writer.close();
  } else if ( method === "init" ) {
    
    (<any>window).ng_status_callback = writer;
    web_origin.set(new URL(origin).host);

    // make API call with origin, event.data.singleton and event.data.access_requests
    // in order to get full manifest (including security info)

    (<any>window).ng_manifest = {
      origin: origin,
      singleton: event.data.singleton,
      access_request: event.data.access_requests,
      name: "",
      title: "",
      description: "", // etc...
      security_info: {}
    };

  } else if ( method === "login" ) {

    if (!(<any>window).ng_broker_selected) {
      push(AUTH_HOME);
      writer.write({ok:true, ret: false});
      writer.close();
    } else {
      writer.write(await rpc("login"));
      writer.close();
    }
  } else if ( method === "doc_subscribe" ) {

    //console.log("net forward doc_subscribe to app", method, event.data.args)
    await rpc_stream(method, event.data.args, writer);

  } else {
    //console.log("net forward to app", method, event.data.args)
    // forward to app auth iframe
    writer.write(await rpc(method, event.data.args));
    writer.close();

  }

}, false);

/// for test purposes only, when testing with http://localhost:14402/?o=http://localhost:14402
// const { readable, writablePort } = new RemoteReadableStream();
// window.postMessage({method:"init", port: writablePort }, location.origin, [writablePort]);

const app = new App({
  target: document.getElementById("app"),
});

export default app;