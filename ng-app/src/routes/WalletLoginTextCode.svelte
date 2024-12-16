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
  import { t } from "svelte-i18n";
  import { onMount } from "svelte";
  import { Alert, Modal, Spinner } from "flowbite-svelte";
  import {
    ArrowLeft,
    ArrowRightCircle,
    CheckCircle,
    ExclamationTriangle,
  } from "svelte-heros-v2";
  import CenteredLayout from "../lib/CenteredLayout.svelte";
  import { display_error, wallet_from_import } from "../store";
  import { push } from "svelte-spa-router";
  import ng from "../api";

  let top;

  let error;
  let state: "importing" | null = null;
  let textcode: string | undefined = undefined;

  // TODO: Check connectivity to sync service.
  let connected = true;

  const textcode_submit = async () => {
    state = "importing";
    try {
      const imported_wallet = await ng.wallet_import_from_code(textcode);
      wallet_from_import.set(imported_wallet);
      // Login in with imported wallet.
      push("#/wallet/login");
    } catch (e) {
      error = e;
    }
  };

  function scrollToTop() {
    top.scrollIntoView();
  }
  onMount(() => scrollToTop());
</script>

<CenteredLayout>
  <div class="container3" bind:this={top}>
    <div
      class="flex flex-col justify-center max-w-md mx-6 mb-20 bg-gray-60 overflow-y-auto py-4 dark:bg-gray-800"
    >
      <!-- Title -->
      <div>
        <h2 class="text-xl mb-6">{$t("pages.wallet_login_textcode.title")}</h2>
      </div>

      <div class="text-left my-4">
        <Alert color="yellow">
          {@html $t("wallet_sync.textcode.usage_warning")}
        </Alert>
      </div>

      <!-- Disconnection Warning -->
      {#if !connected}
        <div class="text-left my-4">
          <Alert color="red">
            {@html $t("wallet_sync.offline_warning")}
          </Alert>
        </div>
      {/if}

      <!-- Notes about TextCode entering -->
      <div class="text-left text-sm mt-4">
        {@html $t("pages.wallet_login_textcode.description")}
        <br />
        {@html $t("wallet_sync.server_transfer_notice")}
      </div>
      
      <p><br/>{@html $t("pages.wallet_login_textcode.enter_here")}</p>

      <!-- TextCode Input -->
      <textarea
        rows="6"
        bind:value={textcode}
        disabled={state === "importing"}
        class="my-4 col-span-6 pr-11 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
      />

      {#if error}
        <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
          <ExclamationTriangle class="animate-bounce mt-10 h-16 w-16 mx-auto" />
          <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
            {@html $t("errors.error_occurred", {
              values: { message: display_error(error) },
            })}
          </p>
        </div>
      {:else if state === "importing"}
        <Spinner class="mx-auto" />
      {/if}

      <div class="mx-auto">
        <!-- Submit Button-->
        <div class="my-4 mx-1">
          <button
            class="mt-4 mb-8 w-full text-white bg-primary-700 disabled:bg-primary-700/50 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            on:click={textcode_submit}
            disabled={!connected || !textcode}
            class:hidden={state === "importing" || error}
          >
            <CheckCircle
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
            />
            {$t("pages.wallet_login_textcode.import_btn")}
          </button>

          <!-- Back Button -->
          <button
            on:click={() => window.history.go(-1)}
            class="w-full text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            ><ArrowLeft
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
            />{$t("buttons.back")}</button
          >
        </div>
      </div>
    </div>
  </div>
</CenteredLayout>
