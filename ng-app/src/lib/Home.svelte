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
  import {
    Sidebar,
    SidebarGroup,
    SidebarItem,
    SidebarWrapper,
  } from "flowbite-svelte";
  import { link, location } from "svelte-spa-router";

  // @ts-ignore
  import Logo from "../assets/nextgraph.svg?component";
  // @ts-ignore
  import LogoGray from "../assets/nextgraph-gray.svg?component";
  import { close_active_wallet, online } from "../store";

  import { onMount } from "svelte";

  import {
    Home,
    Bolt,
    MagnifyingGlass,
    PlusCircle,
    PaperAirplane,
    Bell,
    User,
    ArrowRightOnRectangle,
  } from "svelte-heros-v2";

  let width: number;
  let breakPoint: number = 660;
  let mobile = false;

  $: if (width >= breakPoint) {
    mobile = false;
  } else {
    mobile = true;
  }

  $: activeUrl = "#" + $location;

  function logout() {
    close_active_wallet();
  }

  let asideClass = "w-48";
  let spanClass = "flex-1 ml-3 whitespace-nowrap";
  let nonActiveClass =
    "flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700";
</script>

<div class="full-layout">
  <Sidebar {activeUrl} {asideClass} {nonActiveClass} class="fixed">
    <SidebarWrapper class="bg-gray-60">
      <SidebarGroup>
        <SidebarItem label="NextGraph" href="#/user">
          <svelte:fragment slot="icon">
            {#if $online}
              <Logo class="w-10 h-10" />
            {:else}
              <LogoGray class="w-10 h-10" />
            {/if}
          </svelte:fragment>
        </SidebarItem>
        <SidebarItem label="Home" href="#/">
          <svelte:fragment slot="icon">
            <Home
              tabindex="-1"
              class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
            />
          </svelte:fragment>
        </SidebarItem>
        <SidebarItem label="Stream" href="#/stream">
          <svelte:fragment slot="icon">
            <Bolt
              tabindex="-1"
              class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
            />
          </svelte:fragment>
        </SidebarItem>
        <SidebarItem label="Search" href="#/search">
          <svelte:fragment slot="icon">
            <MagnifyingGlass
              tabindex="-1"
              class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
            />
          </svelte:fragment>
        </SidebarItem>
        <SidebarItem label="Create" href="#/create">
          <svelte:fragment slot="icon">
            <PlusCircle
              tabindex="-1"
              class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
            />
          </svelte:fragment>
        </SidebarItem>
        <SidebarItem label="Site" href="#/site">
          <svelte:fragment slot="icon">
            <User
              tabindex="-1"
              class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
            />
          </svelte:fragment>
        </SidebarItem>
        <SidebarItem label="Messages" href="#/messages">
          <svelte:fragment slot="icon">
            <PaperAirplane
              tabindex="-1"
              class="-rotate-45 w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
            />
            <span
              class="inline-flex justify-center items-center p-3 mt-1 -ml-3 w-3 h-3 text-sm font-medium text-primary-600 bg-primary-200 rounded-full dark:bg-primary-900 dark:text-primary-200"
            >
              3
            </span>
          </svelte:fragment>
        </SidebarItem>
        <SidebarItem label="Notifications" href="#/notifications">
          <svelte:fragment slot="icon">
            <Bell
              tabindex="-1"
              class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
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

  <main class="ml-48">
    <h1>Welcoe {mobile}</h1>
    <div class="row mt-10">
      <button
        on:click={logout}
        class="text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mr-2 mb-2"
      >
        <ArrowRightOnRectangle tabindex="-1" class="w-8 h-8 mr-2 -ml-1" />

        Logout
      </button>
    </div>
  </main>
</div>
<svelte:window bind:innerWidth={width} />

<style>
  .full-layout {
    height: 100vh;
  }
</style>
