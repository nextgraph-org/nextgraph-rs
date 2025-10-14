// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import is_ip_private from 'private-ip';

import { fromWritablePort } from 'remote-web-streams';

// TODO: take this list from local API
const bsp_list = [
  "https://nextgraph.eu",
  "https://nextgraph.one",
];

let channel;
try {
  channel = new BroadcastChannel("ng_bootstrap");
  channel.onmessage = (event) => {
    if (event.origin !== location.origin) return;
    if (!event.data.key) return;
    (async () => {
      try {
        let ls = localStorage;
        try {
          let ret = await document.requestStorageAccess({ localStorage: true });
          ls = ret.localStorage;
          console.log("BroadcastChannel: REQUEST STORAGE ACCESS GRANTED by chrome");
        }
        catch(e) {
          console.warn("BroadcastChannel: requestStorageAccess of chrome failed. falling back to previous api", e)
          try {
            await document.requestStorageAccess();
            console.log("BroadcastChannel: REQUEST STORAGE ACCESS GRANTED");
          } catch (e) {
            console.error("BroadcastChannel: REQUEST STORAGE ACCESS DENIED",e);
            return;
          }
        }
        let bootstraps = JSON.parse(ls.getItem("ng_bootstrap") || "{}");
        if (event.data.value){
          console.log("received added",event.data.key, event.data.value);
          if(!bootstraps[event.data.key]) {
            bootstraps[event.data.key] = event.data.value;
            ls.setItem("ng_bootstrap",JSON.stringify(bootstraps));
          }
        } else {
          console.log("received removed", event.data.key);
          if ( bootstraps[event.data.key]) {
            delete bootstraps[event.data.key];
            ls.setItem("ng_bootstrap",JSON.stringify(bootstraps));
          }
        }
      } catch (e) {
        console.log("localStorage error in BroadcastChannel",e)
      }
    })();
  }
}
catch (e) {
  console.error("error in BroadcastChannel",e)
}

window.addEventListener("message", async (event)=>{

  //console.log("net-bootstrap got msg", event.data, event.origin)
  const {method, port, msgs} = event.data;
  const writable = fromWritablePort(port);
  const writer = writable.getWriter();

  if (method === "test") {
    try {
      let ls = localStorage;
      try {
        let ret = await document.requestStorageAccess({ localStorage: true });
        ls = ret.localStorage;
        console.log("REQUEST STORAGE ACCESS GRANTED by chrome");
      }
      catch(e) {
        console.warn("requestStorageAccess of chrome failed. falling back to previous api", e)
        try {
          await document.requestStorageAccess();
          console.log("REQUEST STORAGE ACCESS GRANTED");
        } catch (e) {
          console.error("REQUEST STORAGE ACCESS DENIED",e);
          writer.write({status:'error', error:e});
          writer.close();
          return;
        }
      }
      localStorage
      //console.log("net-bootstrap writes back ok")
      writer.write({status:'ok'});
      //console.log(`localStorage on bootstrap ${location.origin} is ok`)
    } catch (e) {
      console.log("net-bootstrap writes back error")
      writer.write({status:'error', error:e});
      console.error(`localStorage on bootstrap ${location.origin} is blocked`, e)
    }
    writer.close();
    return;
  }

  let is_ng_box = event.origin === "https://nextgraph.app";
  let is_domain = false;
  let is_lan = false;
  let is_local = false;
  if (!is_ng_box) {
    is_local = event.origin.startsWith("http://localhost");
    if (!is_local) {
      is_lan = !!is_ip_private(new URL(event.origin).hostname);
      if (!is_lan)
        is_domain = bsp_list.includes(event.origin);
    }
  }
  
  let keys: Array<string> = [];
  for (const data of msgs) {

    let key;

    //console.log("ng_bootstrap received msg",JSON.stringify(data), is_ng_box, is_domain,is_lan,is_local,new URL(event.origin).hostname, new URL(event.origin).hostname === data.domain, data.domain && is_domain && new URL(event.origin).hostname === data.domain  )

    if (data.ngbox && (is_ng_box || is_lan || is_local || is_domain)) {
      key = "Self-hosted / NGbox";
    } else if (data.domain && is_domain && new URL(event.origin).hostname === data.domain ) {
      key = data.domain;
      //console.log("key for domain is", key)
    } else if (data.localhost && (is_local || is_lan)) {
      if (!data.peer_id) {
        writer.write({status:'error', error:"missing peer_id of localhost"});
        writer.close();
        return;
      }
      let port = Number(new URL(event.origin).port || '80');
      if (!import.meta.env.NG_DEV && is_local && port !== data.localhost) {
        writer.write({status:'error', error:"mismatch of localhost port"});
        writer.close();
        return;
      }
      key = `Local port ${data.localhost}`;
    } else if (data.private && (is_lan || is_local )) {
      if (!data.peer_id) {
        writer.write({status:'error', error:"missing peer_id of LAN"});
        writer.close();
        return;
      }
      key = `Network ${data.peer_id.substring(0,7)}`;
    } else {
      writer.write({status:'error', error:"mismatch between origin and msg"});
      writer.close();
      return;
    }
    keys.push(key);
  }

  try {
    let ls = localStorage;
    try {
      let ret = await document.requestStorageAccess({ localStorage: true });
      ls = ret.localStorage;
      console.log("REQUEST STORAGE ACCESS GRANTED by chrome");
    }
    catch(e) {
      console.warn("requestStorageAccess of chrome failed. falling back to previous api", e)
      try {
        await document.requestStorageAccess();
        console.log("REQUEST STORAGE ACCESS GRANTED");
      } catch (e) {
        console.error("REQUEST STORAGE ACCESS DENIED",e);
        writer.write({status:'error', error:`REQUEST STORAGE ACCESS DENIED : ${e}`});
        writer.close();
        return;
      }
    }
    let bootstraps = JSON.parse(ls.getItem("ng_bootstrap") || "{}");
    for (const [i, key] of keys.entries()) {
      //console.log(method, method === "add",bootstraps, !bootstraps[key])
      const value = msgs[i];
      if ( method === "add" && !bootstraps[key]) {
        //console.log("adding..."+key)
        bootstraps[key] = value;
        if (channel) channel.postMessage({ key, value });
        //console.log("added",key,value);
      } else if ( method === "remove" && bootstraps[key]) {
        delete bootstraps[key];
        if (channel) channel.postMessage({ key });
        //console.log("removed",key);
      }
    }
    ls.setItem("ng_bootstrap",JSON.stringify(bootstraps));
    writer.write({status:'ok'});
    writer.close();

  }
  catch (e) {
    console.error("access to local Storage for nextgraph.net is blocked")
    writer.write({status:'error', error:`access to local Storage for nextgraph.net is blocked : ${e}`});
    writer.close();
    return;
  }
}, false);
