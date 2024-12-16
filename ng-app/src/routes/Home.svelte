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

<!--
  Home page to display for logged in users.
  Redirects to no-wallet or login page, if not logged in.
-->

<script>
  import Home from "../lib/Home.svelte";
  import NoWallet from "../lib/NoWallet.svelte";
  import { push } from "svelte-spa-router";
  import { onMount, onDestroy } from "svelte";
  import {
    active_wallet,
    has_wallets,
    derived,
    cannot_load_offline,
  } from "../store";

  let display_login_create = !$has_wallets || !$active_wallet;
  let unsubscribe;
  onMount(() => {
    //setTimeout(function () {}, 2);
    const combined = derived([active_wallet, has_wallets], ([$s1, $s2]) => [
      $s1,
      $s2,
    ]);
    unsubscribe = combined.subscribe((value) => {
      //console.log(value);
      if (!value[0] && value[1]) {
        push("#/wallet/login");
      }
    });
  });

  onDestroy(() => {
    unsubscribe();
  });
</script>

{#if display_login_create}
  <NoWallet />
{:else}
  <Home />
{/if}
