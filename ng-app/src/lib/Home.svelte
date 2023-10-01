<!--
// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->

<script lang="ts">
  import { close_active_wallet, online } from "../store";
  import FullLayout from "./FullLayout.svelte";
  import { PaperAirplane, Bell, ArrowRightOnRectangle } from "svelte-heros-v2";
  // @ts-ignore
  import Logo from "../assets/nextgraph.svg?component";
  // @ts-ignore
  import LogoGray from "../assets/nextgraph-gray.svg?component";
  function logout() {
    close_active_wallet();
  }

  let width: number;
  let breakPoint: number = 662;
  let mobile = false;
  $: if (width >= breakPoint) {
    mobile = false;
  } else {
    mobile = true;
  }
</script>

<FullLayout>
  {#if mobile}
    <nav
      class="border-t border-solid border-gray-200 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 dark:border-gray-700 divide-gray-100 dark:divide-gray-700 px-2 sm:px-4 py-2.5 w-full"
    >
      <div
        class="mx-auto flex flex-wrap justify-between items-center w-full px-2 xxs:px-8 xs:px-10"
      >
        <a href="#/user" class="flex items-center" on:click>
          {#if $online}
            <Logo class="w-7 h-7 tall:w-10 tall:h-10" />
          {:else}
            <LogoGray class="w-7 h-7 tall:w-10 tall:h-10" />
          {/if}
          <span
            class="ml-4 self-center text-base font-normal text-gray-900 rounded-lg dark:text-white whitespace-nowrap"
            >NextGraph</span
          >
        </a>
        <div class="w-auto flex flex-col">
          <a href="#/messages" class="row items-center" on:click>
            <PaperAirplane
              tabindex="-1"
              class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white focus:outline-none"
            />
            <span
              class="inline-flex justify-center items-center p-3 mt-1 -ml-2 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
            >
              3
            </span>
          </a>

          <a href="#/notifications" class="ml-4 row items-center" on:click>
            <Bell
              tabindex="-1"
              class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white focus:outline-none"
            />
            <span
              class="inline-flex justify-center items-center p-3 mt-1 -ml-2 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
            >
              10
            </span>
          </a>
        </div>
      </div>
    </nav>
  {/if}

  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>

  <h1>Welcome</h1>

  <div class="row mt-10">
    <button
      on:click={logout}
      class="text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mr-2 mb-2"
    >
      <ArrowRightOnRectangle tabindex="-1" class="w-8 h-8 mr-2 -ml-1" />

      Logout
    </button>
  </div>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>End</h1>
</FullLayout>
<svelte:window bind:innerWidth={width} />
