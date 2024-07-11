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
  "User Panel" page.
  Provides wallet, logout, offline/online switch, and other user actions.
-->

<script>
  // @ts-nocheck

  import { Button, Alert, Dropzone, Toggle } from "flowbite-svelte";
  import { link, push } from "svelte-spa-router";
  import CenteredLayout from "../lib/CenteredLayout.svelte";
  import { version } from "../../package.json";
  import Time from "svelte-time";
  import { t } from "svelte-i18n";
  // @ts-ignore
  import Logo from "../assets/nextgraph.svg?component";
  import {
    ArrowLeft,
    Signal,
    SignalSlash,
    ArrowRightOnRectangle,
    ArrowsRightLeft,
    Cog6Tooth,
    PuzzlePiece,
    Key,
    User,
    Gift,
    InformationCircle,
    DocumentArrowDown,
    NoSymbol,
  } from "svelte-heros-v2";
  import { onMount, tick } from "svelte";
  import {
    Sidebar,
    SidebarGroup,
    SidebarItem,
    SidebarWrapper,
  } from "flowbite-svelte";

  import {
    online,
    close_active_wallet,
    close_active_session,
    active_session,
    active_wallet,
    connections,
    reconnect,
  } from "../store";

  import {
    NG_EU_BSP,
    NG_NET_BSP,
    APP_ACCOUNT_REGISTERED_SUFFIX,
    default as ng,
  } from "../api";

  let tauri_platform = import.meta.env.TAURI_PLATFORM;
  let error;
  let mobile = tauri_platform == "android" || tauri_platform == "ios";
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

  async function logout() {
    await close_active_wallet();
  }

  async function close_session() {
    await close_active_session();
    active_wallet.set(undefined);
    push("#/wallet/login");
  }

  $: personal_site = $active_wallet?.wallet?.V0.personal_site_id;

  $: personal_site_id = $active_wallet?.wallet?.V0.personal_site;

  $: personal_site_status = $connections[personal_site];

  const displayPopup = async (url, title) => {
    if (!tauri_platform || tauri_platform == "android") {
      window.open(url, "_blank").focus();
    } else {
      await ng.open_window(url, "viewer", title);
    }
  };
  const donate = async () => {
    await displayPopup(
      "https://nextgraph.org/donate",
      $t("common.support_nextgraph")
    );
  };
  const about = async () => {
    await displayPopup("https://nextgraph.org", $t("common.about_nextgraph"));
  };
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
              <h2 class="text-xl mb-6">{$t("pages.user_panel.title")}</h2>
            </li>
            <li
              tabindex="0"
              role="menuitem"
              class="flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              on:keypress={() => window.history.go(-1)}
              on:click={() => window.history.go(-1)}
            >
              <ArrowLeft
                tabindex="-1"
                class="w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
              <span class="ml-3">{$t("buttons.back")}</span>
            </li>

            <li
              class="flex items-center p-2 text-base font-normal text-gray-900"
            >
              {#if $online}
                <Signal
                  tabindex="-1"
                  class="w-7 h-7 text-green-600 transition duration-75 focus:outline-none dark:text-green-400 "
                />
                <span class="ml-3 text-green-600 dark:text-green-400"
                  >{$t("connectivity.online")}</span
                >
              {:else}
                <SignalSlash
                  tabindex="-1"
                  class="w-7 h-7 text-red-600 transition duration-75 focus:outline-none dark:text-red-400 "
                />
                <span class="ml-3 text-red-600 dark:text-red-400"
                  >{$t("connectivity.offline")}</span
                >
              {/if}
            </li>

            <li
              tabindex="0"
              role="menuitem"
              class="flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              on:keypress={logout}
              on:click={logout}
            >
              <ArrowRightOnRectangle
                tabindex="-1"
                class="w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
              <span class="ml-3">{$t("buttons.logout")}</span>
            </li>
            <!-- <li
              tabindex="0"
              class="flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              on:keypress={close_session}
              on:click={close_session}
            >
              <ArrowsRightLeft
                tabindex="-1"
                class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
              <span class="ml-3">Switch wallet</span>
            </li> -->
            <SidebarItem
              label="Settings"
              href="#/user/settings"
              class="p-2 opacity-50 pointer-events-none"
              disabled
            >
              <svelte:fragment slot="icon">
                <Cog6Tooth
                  tabindex="-1"
                  class="w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                />
              </svelte:fragment>
            </SidebarItem>
            <SidebarItem
              label={$t("pages.wallet_info.title")}
              href="#/wallet"
              class="p-2"
            >
              <svelte:fragment slot="icon">
                <PuzzlePiece
                  tabindex="-1"
                  class="w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                />
              </svelte:fragment>
            </SidebarItem>
            <SidebarItem
              label={$t("pages.admin.title")}
              href="#/user/admin"
              class="p-2 opacity-50 pointer-events-none"
            >
              <svelte:fragment slot="icon">
                <Key
                  tabindex="-1"
                  class="w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                />
              </svelte:fragment>
            </SidebarItem>
            <SidebarItem
              label={$t("pages.accounts.title")}
              href="#/user/accounts"
              class="p-2"
            >
              <svelte:fragment slot="icon">
                <User
                  tabindex="-1"
                  class="w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                />
              </svelte:fragment>
            </SidebarItem>
            <li
              class="flex items-center p-2 text-base font-normal text-gray-900"
              title={(personal_site_status &&
                personal_site_status.server_ip +
                  " " +
                  personal_site_status.server_id) ||
                $t("pages.user_panel.offline")}
            >
              <Toggle
                on:change={async () => {
                  if (personal_site_status.error) {
                    $connections[personal_site].connecting = true;
                    await reconnect();
                  } else {
                    $connections[personal_site].error = $t(
                      "connectivity.stopped"
                    );
                    personal_site_status.since = new Date();
                    await ng.user_disconnect(personal_site);
                  }
                }}
                checked={personal_site_status &&
                  (personal_site_status.connecting ||
                    !personal_site_status.error)}
                >{$t("connectivity.personal")}</Toggle
              >
            </li>
            {#if personal_site_status}
              <li
                class="site-cnx-details flex items-center px-2 text-sm text-left font-normal text-gray-600"
              >
                {#if personal_site_status.connecting}
                  {$t("connectivity.connecting")}...
                {:else}
                  {#if !personal_site_status.error}
                    {$t("connectivity.connected")}
                  {:else}
                    {$t("connectivity.connection_error_short", {
                      values: { error: personal_site_status.error },
                    })}
                  {/if}
                  <Time
                    style="display:contents;"
                    live={5 * 1_000}
                    relative
                    format="dddd @ h:mm A · MMMM D, YYYY"
                    timestamp={personal_site_status.since}
                  />
                {/if}
              </li>
            {/if}
          </SidebarGroup>
          <SidebarGroup border>
            <li
              tabindex="0"
              role="menuitem"
              class="flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              on:keypress={donate}
              on:click={donate}
            >
              <Gift
                tabindex="-1"
                class="w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
              <span class="ml-3">{$t("common.donate_nextgraph")}</span>
            </li>

            <li
              tabindex="0"
              role="menuitem"
              class="flex items-center p-2 text-base font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              on:keypress={about}
              on:click={about}
            >
              <InformationCircle
                tabindex="-1"
                class="w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
              <span class="ml-3">
                {$t("common.about_nextgraph")}
              </span>
            </li>

            <li
              class="flex items-center p-2 text-base font-normal text-gray-900"
            >
              {$t("common.version", { values: { version } })}
            </li>
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
              values: { message: display_error(error) },
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
  .site-cnx-details {
    @apply mt-0 !important;
  }
</style>
