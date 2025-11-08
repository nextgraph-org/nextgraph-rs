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
  @component  
  "Wallet Info" user panel sub menu.
  Provides info about wallet, broker, etc. and download option.
-->

<script lang="ts">
  import { Alert, Button, Modal, Spinner } from "flowbite-svelte";
  import { link, push } from "svelte-spa-router";
  import CenteredLayout from "../lib/CenteredLayout.svelte";
  import {
    ArrowLeft,
    Trash,
    DocumentArrowDown,
    NoSymbol,
    QrCode,
    Link,
    Camera,
    CheckBadge,
    ExclamationTriangle,
  } from "svelte-heros-v2";
  import { onDestroy, onMount, tick } from "svelte";
  import { Sidebar, SidebarGroup, SidebarWrapper } from "flowbite-svelte";
  import { t } from "svelte-i18n";

  import {
    close_active_wallet,
    active_session,
    active_wallet,
    display_error,
    online,
    scanned_qr_code,
    check_has_camera,
  } from "../store";

  import { default as ng } from "../api";
  import CopyToClipboard from "../lib/components/CopyToClipboard.svelte";

  let tauri_platform = import.meta.env.TAURI_ENV_PLATFORM;
  let error;
  let nonActiveClass =
    "flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700";

  let container: HTMLElement;

  let sub_menu: "scan_qr" | "generate_qr" | "text_code" | null = null;

  let generation_state: "before_start" | "loading" | "generated" =
    "before_start";

  let generated_qr: string | undefined = undefined;
  let generated_text_code: string | null = null;

  let scanner_state: "before_start" | "scanned" | "success" = "before_start";

  let has_camera = false;

  async function scrollToTop() {
    await tick();
    container.scrollIntoView();
  }
  onMount(async () => {
    if (!$active_session) {
      push("#/");
      return;
    }
    if ($scanned_qr_code) {
      sub_menu = "scan_qr";
      on_qr_scanned($scanned_qr_code);
      scanned_qr_code.set("");
    }
    await scrollToTop();
    has_camera = await check_has_camera();
  });

  function open_scan_menu() {
    sub_menu = "scan_qr";
  }

  async function open_gen_menu() {
    sub_menu = "generate_qr";
    generation_state = "before_start";
  }

  function open_textcode_menu() {
    sub_menu = "text_code";
    scanner_state = "before_start";
  }

  async function generate_qr_code() {
    generation_state = "loading";
    generated_qr = await ng.wallet_export_get_qrcode(
      $active_session.session_id,
      container.clientWidth
    );
    generation_state = "generated";
  }

  async function on_qr_scanned(text: string) {
    try {
      await ng.wallet_export_rendezvous($active_session.session_id, text);
      scanner_state = "success";
    } catch (e) {
      error = e;
    }
  }

  async function open_scanner() {
    push("#/scanqr");
  }

  async function generate_text_code() {
    generation_state = "loading";
    generated_text_code = await ng.wallet_export_get_textcode(
      $active_session.session_id
    );
    generation_state = "generated";
  }

  function to_main_menu() {
    cancel_wallet_transfers();

    sub_menu = null;
    generated_qr = undefined;
    generated_text_code = null;
    generation_state = "before_start";
    scanner_state = "before_start";
  }

  let downloading = false;
  let wallet_file_ready = false;
  let download_link = false;
  let download_error = false;
  async function download_wallet() {
    try {
      downloading = true;
      let file = await ng.wallet_get_file($active_wallet.id);
      // @ts-ignore
      wallet_file_ready = "wallet-" + $active_wallet.id + ".ngw";
      if (!tauri_platform) {
        const blob = new Blob([file], {
          type: "application/octet-stream",
        });
        // @ts-ignore
        download_link = URL.createObjectURL(blob);
      } else {
        download_link = true;
      }
    } catch (e) {
      download_error = e;
    }
  }

  let wallet_remove_modal_open = false;
  async function remove_wallet_clicked() {
    wallet_remove_modal_open = true;
  }

  const close_modal = () => {
    wallet_remove_modal_open = false;
  };

  async function remove_wallet_confirmed() {
    if (!$active_wallet) return;
    // TODO: Wait for implementation
    // await ng.wallet_remove($active_wallet.id);
    close_active_wallet();
  }

  async function cancel_wallet_transfers() {
    // TODO
  }

  onDestroy(() => {
    cancel_wallet_transfers();
  });
</script>

<CenteredLayout>
  <div class="container3 mb-20" bind:this={container}>
    {#if sub_menu === null}
      <Sidebar {nonActiveClass}>
        <SidebarWrapper
          divClass="bg-gray-60 overflow-y-auto py-4 px-3 rounded dark:bg-gray-800"
        >
          <SidebarGroup ulClass="space-y-2" class="text-left" role="menu">
            <li>
              <h2 class="text-xl mb-6">{$t("pages.wallet_info.title")}</h2>
              <span class="break-all">ID: {$active_wallet?.id}</span>
            </li>

            <!-- Go Back -->
            <li
              tabindex="0"
              role="menuitem"
              class="text-left flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              on:keypress={() => window.history.go(-1)}
              on:click={() => window.history.go(-1)}
            >
              <ArrowLeft
                tabindex="-1"
                class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
              <span class="ml-3">{$t("buttons.back")}</span>
            </li>

            <!-- Scan QR Code to export wallet to another device -->
            <li
              tabindex="0"
              role="menuitem"
              class="flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              on:keypress={open_scan_menu}
              on:click={open_scan_menu}
            >
              <div>
                <Camera
                  tabindex="-1"
                  class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                />
              </div>
              <span class="ml-3">{$t("pages.wallet_info.scan_qr.title")}</span>
            </li>

            <!-- Generate QR Code export wallet to another device -->
            <li
              tabindex="0"
              role="menuitem"
              class="flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              on:keypress={open_gen_menu}
              on:click={open_gen_menu}
            >
              <div>
                <QrCode
                  tabindex="-1"
                  class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                />
              </div>
              <span class="ml-3">{$t("pages.wallet_info.gen_qr.title")}</span>
            </li>

            <!-- Copy Wallet TextCode -->
            <li
              tabindex="0"
              role="menuitem"
              class="text-left flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              on:keypress={open_textcode_menu}
              on:click={open_textcode_menu}
            >
              <div>
                <Link
                  tabindex="-1"
                  class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                />
              </div>
              <span class="ml-3"
                >{$t("pages.wallet_info.create_text_code")}</span
              >
            </li>

            <!-- Download Wallet -->
            {#if !downloading}
              <li
                tabindex="0"
                role="menuitem"
                class="flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                on:keypress={download_wallet}
                on:click={download_wallet}
              >
                <div>
                  <DocumentArrowDown
                    tabindex="-1"
                    class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                  />
                </div>
                <span class="ml-3">{$t("pages.wallet_info.download")}</span>
              </li>
            {:else if download_error}
              <li
                tabindex="-1"
                class="flex items-center p-2 text-base font-normal text-red-700 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <div>
                  <NoSymbol
                    tabindex="-1"
                    class="w-7 h-7 text-red-700 transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                  />
                </div>
                <span class="ml-3 text-left"
                  >{$t("pages.wallet_info.download_failed", {
                    values: { error: download_error },
                  })}</span
                >
              </li>
            {:else if !wallet_file_ready}
              <li
                tabindex="-1"
                class="flex items-center p-2 text-base font-normal text-blue-700 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <div>
                  <DocumentArrowDown
                    tabindex="-1"
                    class="w-7 h-7 text-blue-700  transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                  />
                </div>
                <span class="ml-3 text-left"
                  >{$t("pages.wallet_info.download_in_progress")}</span
                >
              </li>
            {:else if download_link === true}
              <li
                tabindex="-1"
                class="flex p-2 text-sm text-left break-all font-normal text-blue-700 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <span
                  >{@html $t("pages.wallet_info.download_successful", {
                    values: { wallet_file: wallet_file_ready },
                  })}</span
                >
              </li>
            {:else}
              <li
                tabindex="-1"
                class="flex items-center text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <a
                  href={download_link || ""}
                  target="_blank"
                  download={wallet_file_ready}
                >
                  <button
                    tabindex="-1"
                    class=" text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
                  >
                    <div>
                      <DocumentArrowDown
                        tabindex="-1"
                        class="w-14 h-14  transition duration-75 dark:text-white  dark:group-hover:text-white"
                      />
                    </div>
                    {$t("pages.wallet_info.download_file_button")}
                  </button>
                </a>
              </li>
            {/if}

            <!-- Remove Wallet -->
            <!-- <li
                tabindex="0"
                role="menuitem"
                class="text-left flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                on:keypress={remove_wallet_clicked}
                on:click={remove_wallet_clicked}
              >
                <div>
                  <Trash
                    tabindex="-1"
                    class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                  />
                </div>
                <span class="ml-3">{$t("pages.wallet_info.remove_wallet")}</span
                >
              </li> -->
            <!-- Confirm Remove Wallet Modal -->
            <Modal
              autoclose
              outsideclose
              bind:open={wallet_remove_modal_open}
              title={$t("pages.wallet_info.remove_wallet_modal.title")}
            >
              <p class="mt-4">
                {$t("pages.wallet_info.remove_wallet_modal.confirm")}
              </p>
              <div class="mt-4 flex justify-end">
                <button class="mr-2" on:click={close_modal}
                  >{$t("buttons.cancel")}</button
                >
                <button
                  class=" text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
                  on:click={remove_wallet_confirmed}
                >
                  {$t("buttons.remove")}
                </button>
              </div>
            </Modal>
          </SidebarGroup>
        </SidebarWrapper>
      </Sidebar>
    {:else if sub_menu === "scan_qr"}
      <Sidebar {nonActiveClass}>
        <SidebarWrapper
          divClass="bg-gray-60 overflow-y-auto py-4 px-3 rounded dark:bg-gray-800"
        >
          <SidebarGroup ulClass="space-y-6" role="menu">
            <li>
              <h2 class="text-xl mb-6">
                {$t("pages.wallet_info.scan_qr.title")}
              </h2>
            </li>
            <!-- Go Back -->
            <li
              tabindex="0"
              role="menuitem"
              class="mb-2 text-left flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              on:keypress={to_main_menu}
              on:click={to_main_menu}
            >
              <ArrowLeft
                tabindex="-1"
                class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
              <span class="ml-3">{$t("buttons.back")}</span>
            </li>
            {#if !has_camera}
              <li class="text-left">
                <Alert color="red">
                  {@html $t("wallet_sync.no_camera")}
                </Alert>
                <Alert color="blue" class="mt-4">
                  {@html $t("pages.wallet_info.scan_qr.other_has_camera")}
                </Alert>
                <Alert color="blue" class="mt-4">
                  {@html $t("pages.wallet_info.scan_qr.no_camera")}
                  {@html $t("wallet_sync.no_camera_alternatives")}
                </Alert>
              </li>
            {:else if scanner_state === "before_start"}
              <!-- NOTES ABOUT QR-->
              <li class="text-left">
                {@html $t("pages.wallet_info.scan_qr.notes")}
                <br /><br />
                {@html $t("wallet_sync.server_transfer_notice")}
              </li>

              <!-- Warning if offline -->
              {#if !$online}
                <li class="text-left">
                  <Alert color="red">
                    {@html $t("wallet_sync.offline_warning")}
                  </Alert>
                </li>
              {/if}
              <li class="">
                <Button
                  on:click={open_scanner}
                  disabled={false || !$online}
                  class="w-full text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
                >
                  {$t("buttons.scan_qr")}
                </Button>
              </li>
            {:else if scanner_state === "scanned"}
              <li class="">
                <Spinner class="mt-4 mb-2" />
                <div>
                  {@html $t("pages.wallet_info.scan_qr.syncing")}...
                  <br />
                  <br />
                  {scanned_qr_code}
                </div>
              </li>
            {:else if scanner_state === "success"}
              <li class="text-green-800 flex flex-col items-center">
                <div class="mt-4">
                  <CheckBadge color="green" size="3em" />
                </div>
                <div class="mt-4 mb-4">
                  {@html $t("pages.wallet_info.scan_qr.scan_successful")}
                </div>
                <Button
                  on:click={to_main_menu}
                  class="w-full text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
                >
                  {$t("buttons.go_back")}
                </Button>
              </li>
            {/if}
          </SidebarGroup>
        </SidebarWrapper>
      </Sidebar>
      <!-- Generate QR-Code screen -->
    {:else if sub_menu === "generate_qr"}
      {#if generation_state !== "generated"}
        <div
          class="flex flex-col justify-center max-w-md mb-10 bg-gray-60 overflow-y-auto py-4 dark:bg-gray-800"
        >
          <div class="mx-6">
            <h2 class="text-xl mb-6">
              {$t("pages.wallet_info.gen_qr.title")}
            </h2>
          </div>

          <!-- Go Back -->
          <!-- Go Back -->

          <!-- Notes about generated QR -->
          <div class="mx-6 text-left">
            {@html $t("pages.wallet_info.gen_qr.notes")}
            <br /><br />
            {@html $t("pages.wallet_info.gen_qr.no_camera")}
            {@html $t("wallet_sync.no_camera_alternatives")}
            <br /><br />
            {@html $t("wallet_sync.server_transfer_notice")}
          </div>

          <!-- Warning if offline -->
          {#if !$online}
            <div class="mx-6 text-left">
              <Alert color="red">
                {@html $t("wallet_sync.offline_warning")}
              </Alert>
            </div>
          {/if}

          {#if generation_state === "before_start"}
            <div class="mx-6">
              <div class="mx-auto">
                <div class="my-4 mx-1">
                  <Button
                    on:click={generate_qr_code}
                    disabled={!$online}
                    class="w-full text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
                  >
                    {$t("pages.wallet_info.gen_qr.gen_button")}
                  </Button>
                </div>
              </div>
            </div>
          {:else if generation_state === "loading"}
            <Spinner class="mx-auto" size="6" />
          {/if}

          <button
            on:click={to_main_menu}
            class="mt-4 mx-6 text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            ><ArrowLeft
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
            />{$t("buttons.back")}</button
          >
        </div>
      {:else}
        <div
          class="flex flex-col justify-center max-w-md mb-20 bg-gray-60 overflow-y-auto py-4 dark:bg-gray-800"
        >
          <h2 class="text-xl mb-6">
            {$t("pages.wallet_info.gen_qr.title")}
          </h2>
          <div class="text-center mb-2 mx-6">
            {@html $t("pages.wallet_login_qr.gen.generated")}
          </div>

          <!-- Generated QR Code -->
          <div class="my-4 mx-auto">
            {@html generated_qr}
          </div>

          <button
            on:click={to_main_menu}
            class="mt-8 mx-6 text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            ><ArrowLeft
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
            />{$t("buttons.back")}</button
          >
        </div>
      {/if}
    {:else if sub_menu === "text_code"}
      <div
        class="flex flex-col justify-center max-w-md mx-6 mb-20 bg-gray-60 overflow-y-auto py-4 dark:bg-gray-800"
      >
        <div>
          <h2 class="text-xl mb-6">
            {$t("pages.wallet_info.gen_text_code.title")}
          </h2>
        </div>

        <!-- Go Back -->
        <button
          on:click={to_main_menu}
          class="w-full text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
          ><ArrowLeft
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
          />{$t("buttons.back")}</button
        >

        <!-- Warning to prefer QR codes or wallet downloads -->
        {#if generation_state === "before_start"}
          <div class="text-left my-4">
            <Alert color="yellow">
              {@html $t("wallet_sync.textcode.usage_warning")}
            </Alert>
          </div>
        {/if}
        <!-- Warning if offline -->
        <div class="text-left my-4">
          {#if !$online}
            <Alert color="red">
              {@html $t("wallet_sync.offline_warning")}
            </Alert>
          {:else}
            {@html $t("wallet_sync.expiry")}
          {/if}
        </div>

        <div class="mt-4">
          {#if generation_state === "before_start"}
            <Button
              on:click={generate_text_code}
              disabled={!$online}
              class="my-4 w-full text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            >
              {$t("pages.wallet_info.gen_text_code.gen_btn")}
            </Button>
          {:else if generation_state == "loading"}
            <Spinner class="mx-auto" size="6" />
          {:else}
            <!-- TextCode Code -->
            <span>{$t("pages.wallet_info.gen_text_code.label")}</span>
            <div>
              <CopyToClipboard rows={8} value={generated_text_code} />
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
  {#if error}
    <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
      <ExclamationTriangle class="animate-bounce mt-10 h-16 w-16 mx-auto" />

      <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
        {@html $t("errors.error_occurred", {
          values: { message: display_error(error) },
        })}
      </p>
    </div>
  {/if}
</CenteredLayout>

<style>
</style>
