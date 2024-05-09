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

<script lang="ts">
  import { online } from "../store";
  import FullLayout from "./FullLayout.svelte";
  import Test from "./Test.svelte";
  import {
    PaperAirplane,
    Bell,
    ArrowRightOnRectangle,
    Share,
  } from "svelte-heros-v2";
  // @ts-ignore
  import Logo from "../assets/nextgraph.svg?component";
  // @ts-ignore
  import LogoGray from "../assets/nextgraph-gray.svg?component";

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
            class="ml-4 self-center text-lg font-normal text-gray-900 rounded-lg dark:text-white whitespace-nowrap"
            >NextGraph</span
          >
        </a>
        <div class="w-auto flex row">
          <a href="#/shared" class="row items-center" on:click>
            <Share
              tabindex="-1"
              class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white focus:outline-none"
            />
          </a>
          <a href="#/messages" class="ml-6 row items-center" on:click>
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
  <div />

  <Test />
</FullLayout>
<svelte:window bind:innerWidth={width} />
