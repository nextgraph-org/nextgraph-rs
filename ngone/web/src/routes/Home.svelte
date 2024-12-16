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

<script>
  import { Button } from "flowbite-svelte";
  import { link } from "svelte-spa-router";
  import NoWallet from "../../../../ng-app/src/lib/NoWallet.svelte";

  import { onMount } from "svelte";

  const api_url = import.meta.env.PROD
    ? "api/v1/"
    : "http://localhost:3030/api/v1/";

  let display_login_create = false;

  async function bootstrap() {
    let bs;
    try {
      bs = localStorage.getItem("ng_wallets");
    } catch (e) {}
    if (bs) {
    } else {
      // probe localhost and LAN

      // if nothing found, displays login/create account
      console.log("no wallet found");
      display_login_create = true;
    }
  }

  async function getWallet() {
    const opts = {
      method: "get",
    };
    const response = await fetch(
      api_url + "bootstrap/I8tuoVE-LRH1wuWQpDBPivlSX8Wle39uHSL576BTxsk",
      opts
    );
    const result = await response.json();
    console.log("Result:", result);
  }

  onMount(() => bootstrap());
</script>

{#if display_login_create}
  <NoWallet />
{/if}
