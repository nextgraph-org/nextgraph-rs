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

<script>
  import { Modal } from "flowbite-svelte";
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
  } from "svelte-heros-v2";
  import { onMount, tick } from "svelte";
  import { Sidebar, SidebarGroup, SidebarWrapper } from "flowbite-svelte";

  import { close_active_wallet, active_session, active_wallet } from "../store";

  import { default as ng } from "../api";

  let tauri_platform = import.meta.env.TAURI_PLATFORM;
  let error;
  let nonActiveClass =
    "flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700";

  let top;

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
          <SidebarGroup ulClass="space-y-2" role="menu">
            <li>
              <h2 class="text-xl mb-6">Wallet Info</h2>
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
              <span class="ml-3">Back</span>
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
                <span class="ml-3">Download Wallet File</span>
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
                  >Download failed:<br /> {download_error}</span
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
                <span class="ml-3 text-left">Download in progress...</span>
              </li>
            {:else if download_link === true}
              <li
                tabindex="-1"
                class="flex p-2 text-sm text-left break-all font-normal text-blue-700 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <span
                  >You will find the file named "{wallet_file_ready}" <br />in
                  your Downloads folder</span
                >
              </li>
            {:else}
              <li
                tabindex="-1"
                class="flex items-center text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <a
                  href={download_link}
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
                    Click here to download the wallet file
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
              <span class="ml-3">Remove Wallet from Device</span>
            </li>
            <Modal
              autoclose
              outsideclose
              bind:open={wallet_remove_modal_open}
              title="Remove Wallet"
            >
              <p class="mt-4">
                Are you sure you want to remove this wallet from your device?
              </p>
              <div class="mt-4 flex justify-end">
                <button on:click={close_modal}> Cancel </button>

                <button
                  class="mr-2 bg-primary-700 text-white"
                  on:click={remove_wallet_confirmed}
                >
                  Remove
                </button>
              </div>
            </Modal>

            <!-- TODO: Show QR-Code -->
            {#if false}
              <li
                tabindex="0"
                role="menuitem"
                class="text-left flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <div>
                  <QrCode
                    tabindex="-1"
                    class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                  />
                </div>
                <span class="ml-3">Wallet QR-Code</span>
              </li>
              <Modal autoclose outsideclose title="My Wallet QR-Code"
                >Use this QR-Code to log in with your wallet on new devices.
              </Modal>
            {/if}

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
                <span class="ml-3">Copy Wallet Link</span>
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
                <span class="ml-3">Save to Device for Future Logins</span>
              </li>
            {/if}
          </SidebarGroup>
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
            The user is already registered with the selected broker.<br /> Try logging
            in instead
          </p>
          <a use:link href="/">
            <button
              tabindex="-1"
              class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
            >
              Login
            </button>
          </a>
        {:else}
          <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
            An error occurred:<br />{error}
          </p>
          <a use:link href="/">
            <button
              tabindex="-1"
              class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
            >
              Go back to homepage
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
