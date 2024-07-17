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
  "Accounts Info" user panel sub menu.
  Provides info about wallet, broker, etc. and download option.
-->

<script lang="ts">
  import { link, push } from "svelte-spa-router";
  import CenteredLayout from "../lib/CenteredLayout.svelte";
  import { ArrowLeft, ServerStack } from "svelte-heros-v2";
  import { onMount, tick } from "svelte";
  import { Sidebar, SidebarGroup, SidebarWrapper } from "flowbite-svelte";
  import { t } from "svelte-i18n";
  import { active_session, active_wallet, connections, display_error } from "../store";

  import { default as ng } from "../api";
  import DeviceIcon from "../lib/components/DeviceIcon.svelte";

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

  $: wallet_unlocked = $active_wallet?.wallet?.V0;

  $: personal_site_id = wallet_unlocked?.personal_site_id;

  /**
   * brokers:
      ZBY5Y8DTyhMo5xfo5K4FCsJHVaN3O15vKeQBwZxr76YA: [
         ServerV0:
          can_forward: true
          can_verify: false
          peer_id: Object { Ed25519PubKey: (32) […] }
          server_type: Object {
            Domain
            Localhost: 1440 // if domain not exist
            BoxPrivate  // one IPv4 and optionally one IPv6 to connect to an NGbox on private LAN rs type Vec<BindAddress>
            Public  // one IPv4 and optionally one IPv6 to connect to an NGbox on public (edge) internet. rs type Vec<BindAddress>
            BoxPublicDyn  // same but with dynamic IPs that can be retrieved with a special API. rs type Vec<BindAddress>
            }
      ]
   */

  /*
   * Connections Is a record of string to those objects:
    error: undefined​​
    server_id: "ZBY5Y8DTyhMo5xfo5K4FCsJHVaN3O15vKeQBwZxr76YA"
    server_ip: "ws://localhost:1440"
    since: Date Fri Jul 05 2024 09:46:30 GMT+0200 (Central European Summer Time)
  */
  // let connections;

  /**
   * bootstraps: Array [ {…} ]
   * cores: Array [ (2) […] ]
   * id: Object { Ed25519PubKey: (32) […] }
   * name: "Personal"
   * private: Object { id: {…}, store_type: "Private" }
   * protected: Object { id: {…}, store_type: "Protected" }
   * public: Object { id: {…}, store_type: "Public" }
   * site_type: Object { Individual: (2) […] } // Some key data as well
   */
  $: walletSites = wallet_unlocked?.sites;

  /** Type:
   * client_type: "Web"
   * details: '{"browser":{"name":"Firefox","version":"127.0","appVersion":"5.0 (X11)","arch":"Linux x86_64","vendor":"","ua":"Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0"},"os":{"name":"Linux"},"platform":{"type":"desktop"},"engine":{"name":"Gecko","version":"20100101","sdk":"0.1.0-preview.1"}}'
   * timestamp_install: 0
   * timestamp_updated: 0
   * version: "0.1.0"
   */
  var device_info;

  $: display_sites = Object.entries(walletSites || {})
    ?.map(([user_id, site]) => {
      // Try to extract device details (for now only of the connected device).
      // TODO: API for all devices
      const devices = (!device_info ? [] : [device_info.V0]).map((device) => {
        const device_details = JSON.parse(device.details);
        return {
          name: device.name, // TODO: API device.name is not provided
          peer_id: device.id, // TODO: API device id is is not provided
          version: device.version,
          details: device_details,
          device_name:
            device.client_type === "web"
              ? `${device_details?.browser?.name}${" - " + device_details?.browser.arch || ""}`
              : `${device_details?.os?.name_uname || device_details?.os?.name_rust || device_details?.os?.name} - ${device_details?.os?.version_uname || device_details?.os?.version_rust}`,
          type: device.client_type,
        };
      });

      return {
        id: user_id,
        connection: $connections[user_id], // error, server_id, server_ip, since
        devices,
        // @ts-ignore
        name: site.name,
      };
    })
    .filter((site) => site.id === personal_site_id);

  $: display_brokers = Object.entries(wallet_unlocked?.brokers || {}).map(
    // @ts-ignore
    ([broker_id, [broker]]) => {
      //TODO: there can be several broker definitions for the same broker_id (if the broker can be reached by different means)
      return {
        id: broker_id,
        can_forward: broker.ServerV0.can_forward,
        can_verify: broker.ServerV0.can_verify,
        address:
          broker.ServerV0.server_type.Domain ||
          `localhost:${broker.ServerV0.server_type.Localhost}`,
        last_connected: new Date("1970-01-01T00:00:00Z").toLocaleString(), // TODO: API
      };
    }
  );

  // $: console.info(JSON.stringify(device_info));

  // $: console.debug(
  //   "info",
  //   device_info,
  //   "walletSites",
  //   walletSites,
  //   "wallet",
  //   $active_wallet,
  //   "connections",
  //   $connections,
  //   "display_brokers",
  //   display_brokers,
  //   "display_sites",
  //   display_sites
  // );

  onMount(async () => {
    ng.client_info().then((res) => {
      device_info = res;
    });
  });
</script>

<CenteredLayout>
  <div class="container3" bind:this={top}>
    <div class="row mb-20">
      <Sidebar {nonActiveClass}>
        <SidebarWrapper
          divClass="bg-gray-60 overflow-y-auto py-4 px-3 rounded dark:bg-gray-800"
        >
          <!-- Go Back-->
          <SidebarGroup ulClass="space-y-2" role="menu">
            <li>
              <h2 class="text-xl mb-6">{$t("pages.account_info.title")}</h2>
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
                class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
              <span class="ml-3">{$t("buttons.back")}</span>
            </li>
          </SidebarGroup>

          <!-- For now this will only consist of the `Personal` one-->
          {#each display_sites as site}
            <li
              class="flex items-center p-2 text-base font-normal text-gray-900"
            >
              <h3 class="flex items-center mt-2 text-lg font-normal">
                {$t("pages.account_info.site", { values: { name: site.name } })}
              </h3>
            </li>

            <!-- Device Details -->
            <SidebarGroup ulClass="space-y-1">
              <li
                class="flex items-center p-2 text-base font-normal text-gray-900"
              >
                <h4
                  class="flex items-center mt-2 text-base font-normal text-gray-600"
                >
                  {$t("pages.account_info.devices")}
                </h4>
              </li>
              {#each site.devices as device, index}
                <li
                  class="flex items-center p-2 text-base font-normal text-gray-900 bg-white shadow-md rounded-lg"
                  class:border-b={index !== site.devices.length - 1}
                >
                  <div>
                    <DeviceIcon device={device.type} />
                  </div>
                  <div
                    class="flex flex-col ml-3 items-start text-left overflow-auto"
                  >
                    <div>
                      <span class="text-gray-500">Name</span>
                      <span class="break-all">{device.name}</span>
                    </div>
                    <div>
                      <span class="text-gray-500">ID</span>
                      <span class="break-all">{device.peer_id}</span>
                    </div>
                    <div>
                      <span class="text-gray-500">Version</span>
                      <span>{device.version}</span>
                    </div>
                    <div>
                      <span class="text-gray-500">System</span>
                      <span> {device.device_name}</span>
                    </div>
                  </div>
                </li>
              {/each}
            </SidebarGroup>

            <!-- Broker Details -->
            <SidebarGroup ulClass="space-y-1">
              <li
                class="flex items-center p-2 text-base font-normal text-gray-900"
              >
                <h4
                  class="flex items-center mt-2 text-base font-normal text-gray-600"
                >
                  Brokers
                </h4>
              </li>

              {#if display_brokers.length > 0}
                {#each Object.values(display_brokers) as broker, index}
                  <!--
                         (peerId, IP/port or domain, last time connected)
                        -->
                  <li
                    class="flex items-center p-2 text-base font-normal text-gray-900 bg-white shadow-md rounded-lg"
                    class:border-b={index !== display_brokers.length - 1}
                  >
                    <div>
                      <ServerStack
                        tabindex="-1"
                        class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
                      />
                    </div>

                    <div class="flex flex-col ml-3 items-start text-left">
                      <div>
                        <span class="text-gray-500">Address</span><br />
                        <span class="break-all">{broker.address}</span>
                      </div>
                      <div>
                        <span class="text-gray-500">Last Connected</span><br />
                        <span class="break-all">{broker.last_connected}</span>
                      </div>
                      <div>
                        <span class="text-gray-500">ID</span>
                        <span class="break-all">{broker.id}</span>
                      </div>
                      <!-- <div>
                        <span class="text-gray-500">Can Forward?</span>
                        <span>{broker.can_forward}</span>
                      </div>
                      <div>
                        <span class="text-gray-500">Can Verify?</span>
                        <span>{broker.can_verify}</span>
                      </div> -->
                    </div>
                  </li>
                {/each}
              {:else}
                <li
                  class="flex items-center p-2 text-base font-normal text-gray-900"
                >
                  <span class="ml-3"
                    >{$t("pages.account_info.no_brokers_connected")}</span
                  >
                </li>
              {/if}
            </SidebarGroup>
          {/each}
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
              Login
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

</style>
