<!--
// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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
    ArrowDownOnSquare,
    Camera,
    CheckBadge,
  } from "svelte-heros-v2";
  import { onMount, tick } from "svelte";
  import { Sidebar, SidebarGroup, SidebarWrapper } from "flowbite-svelte";
  import { t } from "svelte-i18n";
  import {
    type Html5QrcodeResult,
    type Html5QrcodeScanner,
  } from "html5-qrcode";

  import {
    close_active_wallet,
    active_session,
    active_wallet,
    online,
  } from "../store";

  import { default as ng } from "../api";

  let WebQRScannerClassPromise: Promise<typeof Html5QrcodeScanner>;

  let tauri_platform = import.meta.env.TAURI_PLATFORM;
  let error;
  let nonActiveClass =
    "flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700";

  let top;

  let sub_menu: "scan_qr" | "generate_qr" | "text_code" | null = null;

  /** QR source / blob URL */
  let generation_state: "loading" | "generated" | null = null;
  let generated_qr: string | undefined = undefined;

  let generated_text_code: string | null = null;

  let scanner_open = false;
  let scanned_qr = null;
  let scan_successful: null | true = null;

  let html5QrcodeScanner: Html5QrcodeScanner;
  async function load_qr_scanner_lib() {
    // Load in browser only
    if (!tauri_platform && !WebQRScannerClassPromise) {
      WebQRScannerClassPromise = new Promise((resolve) => {
        import("html5-qrcode").then((lib) => resolve(lib.Html5QrcodeScanner));
      });
    }
    // TODO: Load alternative for native apps?
  }

  async function scrollToTop() {
    await tick();
    top.scrollIntoView();
  }
  onMount(async () => {
    if (!$active_session) {
      push("#/");
    } else {
      await scrollToTop();
    }
  });

  function open_scan_menu() {
    sub_menu = "scan_qr";
    load_qr_scanner_lib();
  }

  async function open_gen_menu() {
    sub_menu = "generate_qr";
    generation_state = null;
  }

  async function gen_qr() {
    generation_state = "loading"; // TODO: @niko  = await ng.generate_export_qr();
    // ToRemove:
    setTimeout(() => {
      generation_state = "generated";
      generated_qr = "dummy";
    }, 3000);
  }

  function on_qr_scanned(text: string) {
    scanned_qr = text;
    // TODO: API calls for synchronization @niko
    // ToRemove:
    setTimeout(() => {
      scan_successful = true;
    }, 2_000);
  }

  async function open_scanner() {
    scanner_open = true;

    const onScanSuccess = (
      decoded_text: string,
      decoded_result: Html5QrcodeResult
    ) => {
      // handle the scanned code as you like, for example:
      on_qr_scanned(decoded_text);
      close_scanner();
      // console.log(`Code matched = ${decoded_text}`, decodedResult);
    };

    const WebQRScanner = await WebQRScannerClassPromise;
    html5QrcodeScanner = new WebQRScanner(
      "scanner-div",
      { fps: 10, qrbox: { width: 300, height: 300 }, formatsToSupport: [0] },
      false
    );
    html5QrcodeScanner.render(onScanSuccess, undefined);

    // Auto-Request camera permissions (there's no native way, unfortunately...)
    setTimeout(() => {
      // Auto-start by clicking button
      document.getElementById("html5-qrcode-button-camera-permission")?.click();
    }, 100);
  }

  function close_scanner() {
    scanner_open = false;
    if (html5QrcodeScanner) html5QrcodeScanner.clear();
    html5QrcodeScanner = null;
  }

  function to_main_menu() {
    sub_menu = null;
    generated_qr = "loading";
    generated_text_code = null;
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
  function remove_wallet_clicked() {
    wallet_remove_modal_open = true;
  }

  const close_modal = () => {
    wallet_remove_modal_open = false;
  };

  async function remove_wallet_confirmed() {
    if (!active_wallet) return;
    // TODO: Wait for implementation
    // await ng.wallet_remove($active_wallet.id);
    close_active_wallet();
  }
</script>

<CenteredLayout>
  <div class="container3" bind:this={top}>
    <div class="row mb-20">
      <Sidebar {nonActiveClass}>
        <SidebarWrapper
          divClass="bg-gray-60 overflow-y-auto py-4 px-3 rounded dark:bg-gray-800"
        >
          {#if sub_menu === null}
            <SidebarGroup ulClass="space-y-2" role="menu">
              <li>
                <h2 class="text-xl mb-6">{$t("pages.wallet_info.title")}</h2>
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

              <!-- Scan QR Code to log in with another device -->
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
                <span class="ml-3">{$t("pages.wallet_info.scan_qr")}</span>
              </li>

              <!-- Generate QR Code to log in with another device -->
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
                <span class="ml-3">{$t("pages.wallet_info.generate_qr")}</span>
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
              <li
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
              </li>
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

              <!-- TODO: Copy Wallet Link -->
              {#if false}
                <li
                  tabindex="0"
                  role="menuitem"
                  class="text-left flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <div>
                    <Link
                      tabindex="-1"
                      class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                    />
                  </div>
                  <span class="ml-3">{$t("pages.login.copy_wallet_link")}</span>
                </li>
              {/if}

              <!-- TODO: Save to Device -->
              {#if false}
                <li
                  tabindex="0"
                  role="menuitem"
                  class="text-left flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <!-- TODO: Same as with the trash icon, this is not same-sized as the others. -->
                  <ArrowDownOnSquare
                    tabindex="-1"
                    class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                  />
                  <span class="ml-3">{$t("pages.login.keep_wallet")}</span>
                </li>
              {/if}
            </SidebarGroup>
          {:else if sub_menu === "scan_qr"}
            <SidebarGroup ulClass="space-y-2" role="menu">
              <li>
                <h2 class="text-xl mb-6">
                  {$t("pages.wallet_info.scan_qr.title")}
                </h2>
              </li>
              <!-- Go Back -->
              <li
                tabindex="0"
                role="menuitem"
                class="text-left flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                on:keypress={to_main_menu}
                on:click={to_main_menu}
              >
                <ArrowLeft
                  tabindex="-1"
                  class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                />
                <span class="ml-3">{$t("buttons.back")}</span>
              </li>

              <!-- NOTES ABOUT QR-->
              <li class="text-left">
                {@html $t("pages.wallet_info.scan_qr.notes")}
              </li>

              <!-- Warning if offline -->
              {#if !$online}
                <li class="text-left">
                  <Alert color="red">
                    {@html $t("pages.wallet_info.offline_warning")}
                  </Alert>
                </li>
              {/if}

              {#if scan_successful}
                <li class="text-green-800 flex flex-col items-center">
                  <div class="mt-4">
                    <CheckBadge color="green" size="3em" />
                  </div>
                  <div class="mt-4">
                    {@html $t("pages.wallet_info.scan_qr.scan_successful")}
                  </div>
                </li>
              {:else if scanned_qr}
                <li class="">
                  <Spinner class="mt-4 mb-2" />
                  <div>
                    {@html $t("pages.wallet_info.scan_qr.syncing")}...
                    <br />
                    <br />
                    {scanned_qr}
                  </div>
                </li>
              {:else if !scanner_open}
                <Button
                  on:click={open_scanner}
                  disabled={false || !$online}
                  class="w-full text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
                >
                  {#if false}
                    <Spinner class="mr-2" size="6" />
                  {/if}
                  {$t("pages.wallet_info.scan_qr.scan_btn")}
                </Button>
              {:else}
                <!-- Scanner Open-->
                <Modal
                  title={$t("pages.wallet_info.scan_qr.scanner.title")}
                  placement="center"
                  on:hide={close_scanner}
                  open={scanner_open}
                  class="h-[90vh]"
                >
                  <div id="scanner-div" class="h-full">
                    {$t("pages.wallet_info.scan_qr.scanner.loading")}...
                  </div>
                </Modal>
              {/if}
            </SidebarGroup>
            <!-- Generate QR-Code screen -->
          {:else if sub_menu === "generate_qr"}
            <SidebarGroup ulClass="space-y-2" role="menu">
              <li>
                <h2 class="text-xl mb-6">
                  {$t("pages.wallet_info.gen_qr.title")}
                </h2>
              </li>

              <!-- Go Back -->
              <li
                tabindex="0"
                role="menuitem"
                class="text-left flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                on:keypress={to_main_menu}
                on:click={to_main_menu}
              >
                <ArrowLeft
                  tabindex="-1"
                  class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                />
                <span class="ml-3">{$t("buttons.back")}</span>
              </li>

              <!-- Notes about generated QR -->
              <li class="text-left">
                {@html $t("pages.wallet_info.gen_qr.notes")}
              </li>

              <!-- Warning if offline -->
              {#if !$online}
                <li class="text-left">
                  <Alert color="red">
                    {@html $t("pages.wallet_info.offline_warning")}
                  </Alert>
                </li>
              {/if}

              {#if !generated_qr || generation_state === "loading"}
                <Button
                  on:click={gen_qr}
                  disabled={generation_state === "loading" || !$online}
                  class="w-full text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
                >
                  {#if generation_state === "loading"}
                    <Spinner class="mr-2" size="6" />
                  {/if}
                  {$t("pages.wallet_info.gen_qr.gen_button")}
                </Button>
              {:else}
                <!-- QR Code -->
                <div>
                  {#if generated_qr === "dummy"}
                    <div title={$t("pages.wallet_info.gen_qr.img_title")}>
                      <QrCode class="w-full h-full" />
                    </div>
                  {:else}
                    <img
                      src={generated_qr}
                      title={$t("pages.wallet_info.gen_qr.img_title")}
                      alt="pages.wallet_info.gen_qr_alt"
                      class="w-full h-full"
                    />
                  {/if}
                </div>
              {/if}
            </SidebarGroup>
          {:else if sub_menu === "text_code"}
            TODO: Export with text code
          {/if}
        </SidebarWrapper>
      </Sidebar>
    </div>
    {#if error}
      <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
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
        {#if error == "AlreadyExists"}
          <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
            {@html $t("errors.AlreadyExists")}
          </p>
          <a use:link href="/">
            <button
              tabindex="-1"
              class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
            >
              {$t("buttons.login")}
            </button>
          </a>
        {:else}
          <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
            {@html $t("errors.error_occurred", {
              values: { message: $t("errors." + error) },
            })}
          </p>
          <a use:link href="/">
            <button
              tabindex="-1"
              class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
            >
              {$t("buttons.back_to_homepage")}
            </button>
          </a>
        {/if}
      </div>
    {/if}
  </div>
</CenteredLayout>

<style>
  li.clickable {
    cursor: pointer;
  }
</style>
