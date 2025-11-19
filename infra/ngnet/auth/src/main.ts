// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

const searchParams = new URLSearchParams(window.location.search);
let o = searchParams.get("o");
let parent_origin = (new URL(o)).origin;

let web_origin;
let web_redirect;
let wallet_port;
//let web_origin_host;
let session;

async function rpc( method:string, port: MessagePort, streamed: boolean, args?: any) : Promise<any> {

  wallet_port.postMessage({ method, args, streamed, port: port }, [port]);

}

window.addEventListener("message", async (event)=>{
  //console.log("ngnet auth got msg from", event.origin, event.data);
  const { method, port, streamed } = event.data;
  if (event.origin === parent_origin) {
    if (event.data.ready) return;
    if ( method === "init" ) {
      web_redirect = event.data.manifest.origin;
      let url = new URL(web_redirect);
      web_origin = url.origin;
      //web_origin_host = url.host;
      session = event.data.session;
      port.onclose = () => {
        console.error("BSP parent window closed its port with us, te redirecting server");
      };
      wallet_port = port;

      let iframe = window.document.getElementById("nextgraph-app-iframe");
      iframe.src = web_redirect;
    }
  } else if (event.origin === web_origin) {

    if ( method === "init" ) {
      //console.log("sending back session", session);
      port.postMessage({ok:true, ret:session});
      port.close();
    } else if ( method === "close" ) {
      wallet_port.postMessage({done:true});
      wallet_port.close();
      port.close();
    } else {
      //console.log("ngnet forward to Broker", method, event.data.args)
      // forward to app auth window
      await rpc(method, port, streamed, event.data.args);
    }

  }
  else {
    console.error("invalid origin",event.origin,o, web_origin)
    port.postMessage({status:'error', error:'invalid origin'});
    port.close();
  }

}, false);

parent.postMessage({ready:true},o);