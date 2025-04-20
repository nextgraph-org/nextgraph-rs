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
  Component to inform the user, that no wallet is registered on this device.
  Offers login or create wallet buttons.
-->

<script>
  // @ts-ignore
  import Logo from "../assets/nextgraph.svg?component";
  import { link } from "svelte-spa-router";
  import CenteredLayout from "./CenteredLayout.svelte";
  import { t } from "svelte-i18n";
  import { Alert } from "flowbite-svelte";
</script>

<CenteredLayout displayFooter={true}>
  <div class="container3">
    <div class="row">
      <Logo class="logo block h-40" alt={$t("common.logo")} />
    </div>
    <h1 class="text-2xl text-center mb-10">{$t("pages.no_wallet.welcome")}</h1>

    <p class="max-w-sm">
      {@html $t("pages.no_wallet.description")}
    </p>
    <Alert color="blue" class="max-w-sm mt-3">
      If you had created a wallet before 17 April 2025, it doesn't work anymore. please create a new wallet. We are still in alpha, and this can happen again.
    </Alert>
    <div class="row mt-5">
      <a href="/wallet/create" use:link>
        <button
          tabindex="-1"
          class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
        >
          <svg
            class="w-8 h-8 -ml-1 mr-2"
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
              d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
            />
          </svg>
          {$t("pages.no_wallet.create_wallet")}
        </button>
      </a>
    </div>
    <div class="row mt-5">
      <a href="/wallet/login" use:link>
        <button
          tabindex="-1"
          class="text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mb-2"
        >
          <svg
            class="w-8 h-8 mr-2 -ml-1"
            fill="currentColor"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
          {$t("buttons.login")}
        </button>
      </a>
    </div>
  </div>
</CenteredLayout>
