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
  import {
    Sidebar,
    SidebarGroup,
    SidebarItem,
    SidebarWrapper,
  } from "flowbite-svelte";
  import { link, location } from "svelte-spa-router";
  import MobileBottomBarItem from "./MobileBottomBarItem.svelte";
  import MobileBottomBar from "./MobileBottomBar.svelte";
  // @ts-ignore
  import Logo from "../assets/nextgraph.svg?component";
  // @ts-ignore
  import { t } from "svelte-i18n";
  import { onMount, tick } from "svelte";

  import {
    Home,
    Bolt,
    MagnifyingGlass,
    PlusCircle,
    PaperAirplane,
    Bell,
    User,
    Users,
  } from "svelte-heros-v2";

  let width: number;
  let breakPoint: number = 662;
  let mobile = false;

  $: if (width >= breakPoint) {
    mobile = false;
  } else {
    mobile = true;
  }

  let top;
  async function scrollToTop() {
    await tick();
    top.scrollIntoView();
  }
  onMount(async () => await scrollToTop());

  $: activeUrl = "#" + $location;

  let asideClass = "w-48";
  let spanClass = "flex-1 ml-3 whitespace-nowrap";
  let nonActiveClass =
    "flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700";
</script>

<svelte:window bind:innerWidth={width} />
{#if mobile}
  <div class="full-layout">
    <main class="pb-14" bind:this={top}>
      <slot />
    </main>
    <MobileBottomBar {activeUrl}>
      <MobileBottomBarItem href="#/" icon={Home} on:click={scrollToTop}>
        <span
          class="inline-flex justify-center items-center p-3 mt-1 -ml-2 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
        >
          13
        </span>
      </MobileBottomBarItem>
      <MobileBottomBarItem href="#/stream" icon={Bolt} on:click={scrollToTop} />
      <MobileBottomBarItem
        href="#/search"
        icon={MagnifyingGlass}
        on:click={scrollToTop}
      />
      <MobileBottomBarItem href="#/create" icon={PlusCircle} />
      <MobileBottomBarItem href="#/site" icon={User} on:click={scrollToTop} />
    </MobileBottomBar>
  </div>
{:else}
  <div class="full-layout">
    <Sidebar {activeUrl} {asideClass} {nonActiveClass} class="fixed">
      <SidebarWrapper
        divClass="bg-gray-60 overflow-y-auto tall-xs:py-4 px-3 rounded dark:bg-gray-800"
      >
        <SidebarGroup ulClass="space-y-1 tall-xs:space-y-2">
          <SidebarItem label="NextGraph" href="#/user" class="mt-1">
            <svelte:fragment slot="icon">
              <Logo className="w-7 h-7 tall:w-10 tall:h-10" />
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.home")}
            href="#/"
            on:click={scrollToTop}
            class="py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <Home
                tabindex="-1"
                class="w-7 h-7 text-black transition duration-75 focus:outline-none  dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.stream")}
            href="#/stream"
            class="py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <Bolt
                tabindex="-1"
                class="w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.search")}
            href="#/search"
            class="py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <MagnifyingGlass
                tabindex="-1"
                class="w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.create")}
            href="#/create"
            class="py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <PlusCircle
                tabindex="-1"
                class="w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.shared")}
            href="#/shared"
            class="py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <Users
                tabindex="-1"
                class="w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.site")}
            href="#/site"
            class="py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <User
                tabindex="-1"
                class="w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.messages")}
            href="#/messages"
            class="py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <PaperAirplane
                tabindex="-1"
                class="-rotate-45 w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
              <span
                class="inline-flex justify-center items-center p-3 mt-1 -ml-3 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
              >
                3
              </span>
            </svelte:fragment>
          </SidebarItem>
          <SidebarItem
            label={$t("pages.full_layout.notifications")}
            href="#/notifications"
            class="mt-1 py-1 tall-xs:p-2"
          >
            <svelte:fragment slot="icon">
              <Bell
                tabindex="-1"
                class="w-7 h-7 text-black transition duration-75 focus:outline-none dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
              />
              <span
                class="inline-flex justify-center items-center p-3 mt-1 -ml-3 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
              >
                10
              </span>
            </svelte:fragment>
          </SidebarItem>
        </SidebarGroup>
      </SidebarWrapper>
    </Sidebar>

    <main class="ml-48" bind:this={top}>
      <slot />
    </main>
  </div>
{/if}

<style>
  .full-layout {
    height: 100vh;
  }
  main {
    overflow: hidden;
    overflow-wrap: break-word;
  }
</style>
