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
  import { Alert, Modal, Spinner, Button } from "flowbite-svelte";
  import {
    ArrowLeft,
    Camera,
    ExclamationTriangle,
    QrCode,
  } from "svelte-heros-v2";
  import { onDestroy, onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import CenteredLayout from "../lib/CenteredLayout.svelte";
  import { wallet_from_import, scanned_qr_code, display_error, check_has_camera } from "../store";
  import ng from "../api";

  // <a href="/scanqr" use:link>

  let top: HTMLElement;

  const set_online = () => { connected = true; };
  const set_offline = () => { connected = false; };


  let login_method: "scan" | "gen" | undefined = undefined;

  let error;
  let connected = true;

  let scan_state: "before_start" | "importing" = "before_start";

  let gen_state: "before_start" | "generating" | "generated" = "before_start";
  let qr_code_html: string | undefined = undefined;
  let rendezvous_code;

  const open_scanner = () => {
    push("#/scanqr");
  };



  async function on_qr_scanned(code) {
    login_method = "scan";
    scan_state = "importing";
    try {
      const imported_wallet = await ng.wallet_import_from_code(code);
      wallet_from_import.set(imported_wallet);
      // Login in with imported wallet.
      push("#/wallet/login");
    } catch (e) {
      error = e;
    }
  }

  async function generate_qr() {
    gen_state = "generating";
    try {
      const [qr_code_el, code] = await ng.wallet_import_rendezvous(
        top.clientWidth
      );
      rendezvous_code = code;
      qr_code_html = qr_code_el;
      gen_state = "generated";
      const imported_wallet = await ng.wallet_import_from_code(code);
      // Login with imported wallet.
      wallet_from_import.set(imported_wallet);
      push("#/wallet/login");
    } catch (e) {
      error = e;
    }
  }

  function scrollToTop() {
    top.scrollIntoView();
  }

  onMount(async () => {
    connected = window.navigator.onLine;
    window.addEventListener("offline", set_offline);
    window.addEventListener("online", set_online);
    // Handle return from QR scanner.
    if ($scanned_qr_code) {
      on_qr_scanned($scanned_qr_code);
      scanned_qr_code.set("");
    } else {
      // Or check, if a camera exists and offer scanner or QR generator, respectively.
      login_method = await check_has_camera() ? "scan" : "gen";
    }
    scrollToTop();
  });
  onDestroy(() => {
    window.removeEventListener("offline", set_offline);
    window.removeEventListener("online", set_online);
    if (rendezvous_code) {
      // TODO: Destroy
    }
  });
</script>

<CenteredLayout>
  <div class="container3" bind:this={top}>
    <div
      class="flex flex-col justify-center max-w-md mb-20 bg-gray-60 overflow-y-auto py-4 dark:bg-gray-800"
    >
      <!-- Title -->
      <div class="mx-6 mt-10">
        <h2 class="text-xl mb-6">{$t("pages.wallet_login_qr.title")}</h2>
      </div>

      <!-- Checking, if camera is available... -->
      {#if login_method === undefined}
        <div><Spinner /></div>
      {:else if !connected}
        <!-- Warning, if offline -->
        <div class="text-left mx-6">
          <Alert color="red">
            {@html $t("wallet_sync.offline_warning")}
          </Alert>
          <Alert color="blue" class="mt-4">
            {@html $t("pages.wallet_login.offline_advice")}
          </Alert>
        </div>
      {:else if error}
        <div class="max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
          <ExclamationTriangle class="animate-bounce mt-10 h-16 w-16 mx-auto" />

          <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
            {@html $t("errors.error_occurred", {
              values: { message: display_error(error) },
            })}
          </p>
        </div>
      {:else if login_method === "scan"}
        <div class="mx-6">
          {#if scan_state === "before_start"}
            <!-- Scan Mode -->
            <!-- Notes about QR -->
            <div class="text-left">
              {@html $t("pages.wallet_login_qr.scan.description")}
              <br />
              {@html $t("wallet_sync.server_transfer_notice")}
            </div>
          {:else if scan_state === "importing"}
            <div class="mb-4 w-full">
              {@html $t("wallet_sync.importing")}
            </div>

            <div class="w-full"><Spinner /></div>
          {/if}
        </div>
      {:else if login_method === "gen"}
        <!-- Generate QR Code to log in with another device -->
        {#if gen_state == "before_start"}
          <!-- Notes about QR Generation -->
          <div class="text-left mx-6">
            {@html $t("pages.wallet_login_qr.gen.description")}
            {@html $t("wallet_sync.no_camera_alternatives")}
            <br /><br />
            {@html $t("pages.wallet_login_qr.gen.letsgo")}
            <br /><br />
            {@html $t("wallet_sync.server_transfer_notice")}
          </div>
        {:else if gen_state === "generating"}
          <div>
            <Spinner class="w-full" />
          </div>
        {:else if gen_state === "generated"}
          <!-- Notes about generated QR -->
          <div class="text-center mb-2 mx-6">
            {@html $t("pages.wallet_login_qr.gen.generated")}
          </div>

          <!-- Generated QR Code -->
          <div class="my-4 mx-auto">
            {@html qr_code_html}
          </div>
        {/if}
      {/if}
      <div class="mx-6">
        <div class="mx-auto">
          <div class="my-4 mx-1">
            {#if login_method === "scan" && scan_state === "before_start"}
              <!-- Open Scanner Button-->
              <button
                on:click={open_scanner}
                class="mt-4 w-full text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
              >
                <Camera
                  tabindex="-1"
                  class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
                />
                {$t("buttons.scan_qr")}
              </button>
            {:else if login_method === "gen" && gen_state === "before_start"}
              <!-- Generate QR Button -->
              <Button
                disabled={!connected}
                on:click={generate_qr}
                class="mt-4 w-full text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
              >
                <QrCode
                  tabindex="-1"
                  class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
                />
                {$t("pages.wallet_login_qr.gen.button")}
              </Button>
            {/if}

            <!-- Go Back -->
            <button
              on:click={() => window.history.go(-1)}
              class="mt-8 w-full text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
              ><ArrowLeft
                tabindex="-1"
                class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
              />{$t("buttons.back")}</button
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</CenteredLayout>
