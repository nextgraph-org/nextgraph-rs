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
  import { onMount, tick } from "svelte";
  import { t } from "svelte-i18n";
  import FullLayout from "./FullLayout.svelte";
  import Document from "./Document.svelte";
  import { active_session } from "../store";
  import { change_nav_bar, reset_in_memory } from "../tab";
  import {
    PaperAirplane,
    Bell,
    ArrowRightOnRectangle,
    User,
    Bookmark,
    Sparkles,
    Square3Stack3d,
    ArchiveBox,
  } from "svelte-heros-v2";
  import Logo from "./components/Logo.svelte";
  import NavBar from "./components/NavBar.svelte";

  let top;
  let width: number;
  let breakPoint: number = 662;
  let mobile = false;
  $: if (width >= breakPoint) {
    mobile = false;
  } else {
    mobile = true;
  }

  function scrollToTop() {
    top.scrollIntoView();
  }
  onMount(() => {
    change_nav_bar("nav:private", $t("doc.private_store"), false);
    reset_in_memory();
  });

  let nuri = $active_session && $active_session.private_store_id;
</script>

<FullLayout withoutNavBar={true}>
  {#if mobile}
    <nav
      bind:this={top}
      style="background-color: #f6f6f6;"
      class="border-t border-solid border-gray-200 text-gray-700 dark:text-gray-200 dark:border-gray-700 divide-gray-100 dark:divide-gray-700 px-2 sm:px-4 py-2.5 w-full"
    >
      <div
        class="mx-auto flex flex-wrap justify-between items-center w-full xxs:px-8 xs:px-10"
      >
        <a href="#/user" class="flex items-center">
          <Logo className="w-7 h-7 tall:w-10 tall:h-10" />
          <span
            class="ml-2 self-center text-base font-normal text-gray-900 rounded-lg dark:text-white whitespace-nowrap"
            >NextGraph</span
          >
        </a>
        <div class="w-auto flex row">
          <a href="#/site" class="row items-center" on:click={scrollToTop}>
            <User
              tabindex="-1"
              class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white focus:outline-none"
            />
          </a>
          <a href="#/messages" class="ml-4 row items-center">
            <PaperAirplane
              tabindex="-1"
              class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white focus:outline-none"
            />
            <!-- <span
              class="inline-flex justify-center items-center p-3 mt-1 -ml-2 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
            >
              3
            </span> -->
          </a>

          <a href="#/notifications" class="ml-4 row items-center">
            <Bell
              tabindex="-1"
              class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white focus:outline-none"
            />
            <!-- <span
              class="inline-flex justify-center items-center p-3 mt-1 -ml-2 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
            >
              10
            </span> -->
          </a>
        </div>
      </div>
    </nav>
    <div class="sticky top-0 w-full" style="z-index:39;">
      <NavBar {scrollToTop} />
    </div>
  {/if}
  <div
    class="bg-gray-100 flex p-1 justify-around md:justify-start h-11 gap-0 xs:gap-3 text-gray-500"
  >
    <div
      class="overflow-hidden w-24 sm:ml-3 flex justify-start mr-1"
      role="button"
      tabindex="0"
    >
      <Bookmark
        tabindex="-1"
        class="mt-1 flex-none w-7 h-7 mr-1 focus:outline-none "
      />
      <div class="text-xs xs:text-sm flex items-center">
        <div style="overflow-wrap: anywhere;" class="max-h-8 xs:max-h-10">
          {$t("doc.header.buttons.bookmarked")}
        </div>
      </div>
    </div>
    <!-- <div class="overflow-hidden w-32 sm:ml-3 flex justify-start mr-1" role="button" tabindex="0" title={$t("doc.menu.items.mc.desc")}>
      <Sparkles tabindex="-1" class="mt-1 flex-none w-7 h-7 mr-1 focus:outline-none "/><div class="text-xs xs:text-sm flex items-center"><div style="overflow-wrap: anywhere;" class="max-h-8 xs:max-h-10">{$t("doc.menu.items.mc.label")}</div></div>
    </div> -->
    <div
      class="overflow-hidden w-28 sm:ml-3 flex justify-start"
      role="button"
      tabindex="0"
    >
      <Square3Stack3d
        tabindex="-1"
        class="mt-1 flex-none w-7 h-7 mr-1 focus:outline-none "
      />
      <div class="text-xs xs:text-sm flex items-center">
        <div style="overflow-wrap: anywhere;" class="max-h-8 xs:max-h-10">
          {$t("doc.header.buttons.all_docs")}
        </div>
      </div>
    </div>
  </div>

  <Document {nuri} />
</FullLayout>
<svelte:window bind:innerWidth={width} />
