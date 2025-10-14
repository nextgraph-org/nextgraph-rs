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
  import { push, default as Router } from "svelte-spa-router";
  import { isLoading } from "svelte-i18n";

  import { onMount, tick, onDestroy } from "svelte";
  import { ng, brokers_info } from "./store";
  import { 
    NotFound,
    Test,
    WalletCreate,
    Invitation,
    WalletLogin,
    WalletInfo,
    User,
    UserRegistered,
    Install,
    ScanQRWeb,
    AccountInfo,
    WalletLoginUsername,
    WalletLoginQr,
    WalletLoginTextCode
  } from "@ng-org/ui-common/routes";
  import { Bowser } from "../../../ng-sdk-js/js/bowser.js"; 

  import Home from "./routes/Home.svelte";

  const routes = new Map();
  routes.set("/", Home);
  // routes.set("/test", Test);
  // routes.set("/wallet/login", WalletLogin);
  // routes.set("/wallet/username", WalletLoginUsername);
  // routes.set("/wallet/login-qr", WalletLoginQr);
  // routes.set("/wallet/login-text-code", WalletLoginTextCode);
  // routes.set("/wallet/create", WalletCreate);
  // routes.set("/i/:invitation", Invitation);
  // routes.set("/user", User);
  // routes.set("/user/registered", UserRegistered);
  // routes.set("/wallet", WalletInfo);
  // routes.set("/user/accounts", AccountInfo);
  // routes.set("/scanqr", ScanQRWeb);
  // routes.set("/install", Install);
  routes.set("*", NotFound);

  // window.refresh_wallets = async () => {
  //   let walls = await ng.get_wallets();
  //   wallets.set(walls);
  // };

  let no_local_storage = false;
  let is_safari = false;

  function load_bootstraps(bs: string | null) {
    if (bs) {
      let bootstrap_map = JSON.parse(bs);
      brokers_info.set(bootstrap_map);
    }
  }

  onMount(async () => {

    window.document.getElementById("splash").className="noshow";
    window.document.getElementById("app").className="";

    let info = Bowser.parse(window.navigator.userAgent);
    //console.log(info);
    is_safari = info.browser.name == "Safari";
    if (is_safari) return;

    window.addEventListener("storage", (event) => {
      //console.log("localStorage event", event);
      if (event.storageArea != localStorage) return;
      if (event.key === "ng_bootstrap") {
        load_bootstraps(event.newValue);
      }
    });

    let ls;
    try {
      ls = localStorage;

      try {
        let ret = await document.requestStorageAccess({ localStorage: true });
        ls = ret.localStorage;
        console.log("REQUEST STORAGE ACCESS GRANTED by chrome");
      }
      catch(e) {
        console.warn("requestStorageAccess of chrome failed. falling back to previous api", e)
        try {
          await document.requestStorageAccess();
          localStorage;
          console.log("REQUEST STORAGE ACCESS GRANTED");
        } catch (e) {
          console.error("REQUEST STORAGE ACCESS DENIED",e);
          no_local_storage = true;
        }
      }

    } catch (e) {
      no_local_storage = true;
      console.log("no access to localStorage",e)
    }
    
  if (!no_local_storage) {
    try {
      load_bootstraps(ls.getItem("ng_bootstrap"));
    } catch (e) {
      console.log("load_bootstraps failed")
    }
  }
   
});

</script>
{#if is_safari}

<div class="text-center max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
  <svg
    class="animate-bounce mt-10 h-16 w-16 mx-auto"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
    <p class="mb-5">
      We are sorry but Safari is not supported yet<br/>for WebApps authentication with your Wallet.<br/>Please use another browser.
    </p>
</div>

{:else if no_local_storage}

<div class="text-center max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
  <svg
    class="animate-bounce mt-10 h-16 w-16 mx-auto"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
    <p class="mb-5">
      Please give access to localStorage for the website<br/>
      {location.origin}
    </p>
</div>

{:else}

  {#if $isLoading}
    <p class="text-center">Loading translations...</p>
  {:else}
    <Router {routes} />
  {/if}

{/if}