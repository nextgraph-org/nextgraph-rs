<!--
// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->

<script lang="ts">
  import { push, default as Router, querystring } from "svelte-spa-router";
  import { onMount, tick, onDestroy } from "svelte";
  import { 
    NotFound,
  } from "@ng-org/ui-common/routes";
  import {error} from "./store";

  import Home from "./routes/Home.svelte";
  import Error from "./routes/Error.svelte";
  import is_ip_private from 'private-ip';

  function base64UrlDecode(str) {
    const padding = '='.repeat((4 - str.length % 4) % 4);
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
    return atob(base64);
  }

  const routes = new Map();
  routes.set("/", Home);
  routes.set("/error", Error);
  routes.set("*", NotFound);

  // TODO: take this list from local API
  let bsp_list = [
    "https://nextgraph.eu",
    "https://nextgraph.one",
    "https://stage1.nextgraph.eu",
    "https://pnm.allelo.eco"
  ];

  if (import.meta.env.NG_ENV_ALT) {
    bsp_list.push("https://"+import.meta.env.NG_ENV_ALT);
  }

  let channel;
  try {
    channel = new BroadcastChannel("ng_bootstrap");
    channel.onmessage = (event) => {
      if (event.origin !== location.origin) return;
      if (!event.data.key) return;
      (async () => {
        try {
          let bootstraps = JSON.parse(localStorage.getItem("ng_bootstrap") || "{}");
          if (event.data.value){
            //console.log("received added",event.data.key, event.data.value);
            if(!bootstraps[event.data.key]) {
              bootstraps[event.data.key] = event.data.value;
              localStorage.setItem("ng_bootstrap",JSON.stringify(bootstraps));
            }
          } else {
            //console.log("received removed", event.data.key);
            if ( bootstraps[event.data.key]) {
              delete bootstraps[event.data.key];
              localStorage.setItem("ng_bootstrap",JSON.stringify(bootstraps));
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

  onMount(() => {
  
  const param = new URLSearchParams($querystring);
  let method = param.get("m");
  let url;
  let msgs;
  try {
    url = new URL(decodeURIComponent(param.get("ab")));
    msgs = JSON.parse(base64UrlDecode(param.get("b")));
    console.log(JSON.stringify(msgs));
    if (!method)
      throw new Error("InvalidValue");
  }
  catch (e) {
    console.error(e);
    error.set(e);
    push("#/error");
    return;
  }
  let origin_url = url.origin;
  let hostname = url.hostname;


  let is_ng_box = origin_url === "https://nextgraph.app";
  let is_domain = false;
  let is_lan = false;
  let is_local = false;
  if (!is_ng_box) {
    is_local = origin_url.startsWith("http://localhost");
    if (!is_local) {
      is_lan = !!is_ip_private(hostname);
      if (!is_lan)
        is_domain = bsp_list.includes(origin_url);
    }
  }

  function abort(error) {
    console.error(error);
    let u = url.toString();
    window.location.href = u + "&re=" + error;
    throw new Error(error);
  }
  try {
    let keys: Array<string> = [];
    for (const data of msgs) {

      let key;

      console.log("ng_bootstrap received msg",JSON.stringify(data), is_ng_box, is_domain,is_lan,is_local,new URL(origin_url).hostname, new URL(origin_url).hostname === data.domain, data.domain && is_domain && new URL(origin_url).hostname === data.domain  )

      if (data.ngbox && (is_ng_box || is_lan || is_local || is_domain)) {
        key = "Self-hosted / NGbox";
      } else if (data.domain && is_domain && new URL(origin_url).hostname === data.domain ) {
        key = data.domain;
        //console.log("key for domain is", key)
      } else if (data.localhost && (is_local || is_lan)) {
        if (!data.peer_id) {
          abort("missing peer_id of localhost");
        }
        let port = Number(new URL(origin_url).port || '80');
        if (!import.meta.env.NG_DEV && !import.meta.env.DEV && is_local && port !== data.localhost) {
          abort("mismatch of localhost port");
        }
        key = `Local port ${data.localhost}`;
      } else if (data.private && (is_lan || is_local )) {
        if (!data.peer_id) {
          abort("missing peer_id of LAN");
        }
        key = `Network ${data.peer_id.substring(0,7)}`;
      } else {
        abort("mismatch between origin and msg");
      }
      keys.push(key);
    }

    try {
      let bootstraps = JSON.parse(localStorage.getItem("ng_bootstrap") || "{}");
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
      console.log(JSON.stringify(bootstraps));
      localStorage.setItem("ng_bootstrap",JSON.stringify(bootstraps));
    } catch (e) {
      abort("NoLocalStorage");
    }

    let u = url.toString();
    // url.searchParams.set('i', param.get("i"));
    // url.searchParams.set('rs', param.get("rs"));
    // url.searchParams.set('ab', "1");
    if (param.get("close")) {
      window.close();
    } else {
      window.location.href = u + "&ab=1";
    }
  }catch {}
});

</script>

<Router {routes} />

