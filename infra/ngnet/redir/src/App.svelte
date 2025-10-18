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
  import { isLoading } from "svelte-i18n";

  import { onMount, tick, onDestroy } from "svelte";
  import { brokers_info, web_origin, host } from "./store";
  import { 
    NotFound,
  } from "@ng-org/ui-common/routes";

  import Home from "./routes/Home.svelte";

  const routes = new Map();
  routes.set("/", Home);
  routes.set("*", NotFound);

  function load_bootstraps(bs: string | null) {
    if (bs) {
      let bootstrap_map = JSON.parse(bs);
      brokers_info.set(bootstrap_map);
      //console.log(bootstrap_map);
    }
  }

  const param = new URLSearchParams($querystring);
  let origin_url = decodeURIComponent(param.get("o"));
  try {
    let host_ = new URL(origin_url).host;
    //console.log(host_);
    web_origin.set(origin_url);
    host.set(host_);
  } catch {
    
  }

  onMount(async () => {

    window.document.getElementById("splash").className="noshow";
    window.document.getElementById("app").className="";

    window.addEventListener("storage", (event) => {
      //console.log("localStorage event", event);
      if (event.storageArea != localStorage) return;
      if (event.key === "ng_bootstrap") {
        load_bootstraps(event.newValue);
      }
    });


    try {
      load_bootstraps(localStorage.getItem("ng_bootstrap"));
    } catch (e) {
      console.log("load_bootstraps failed", e)
    }

   
});

</script>

{#if $isLoading}
  <p class="text-center">Loading translations...</p>
{:else}
  <Router {routes} />
{/if}

