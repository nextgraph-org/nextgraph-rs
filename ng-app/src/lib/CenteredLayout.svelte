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
  import ng from "../api";
  import { onMount, tick } from "svelte";
  import { locale } from "svelte-i18n";
  import { available_languages } from "../locales/i18n-init";
  import { Language } from "svelte-heros-v2";
  import { t } from "svelte-i18n";

  export let displayFooter = false;

  let changingLang = false;

  const changeLang = () => {
    changingLang = true;
    scrollToTop();
  };

  let top;
  function scrollToTop() {
    top.scrollIntoView();
  }

  const selectLang = async (lang) => {
    locale.set(lang);
    changingLang = false;
    await tick();
    scrollToTop();
  };

  let tauri_platform = import.meta.env.TAURI_PLATFORM;

  const displayPopup = async (url, title) => {
    if (!tauri_platform || tauri_platform == "android") {
      window.open(url, "_blank").focus();
    } else {
      await ng.open_window(url, "viewer", title);
    }
  };

  const displayNextgraphOrg = async () => {
    await displayPopup("https://nextgraph.org", "NextGraph.org");
  };
</script>

<div bind:this={top}>
  {#if !changingLang}
    <div class="centered">
      <slot />
    </div>
    {#if displayFooter}
      <div class="centered">
        <div class="mb-20 mt-10">
          <button
            on:click={changeLang}
            class="text-primary-700 bg-[#f6f6f6] bg-none ring-0 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55"
          >
            <Language
              tabindex="-1"
              class="w-7 h-7 mr-2 transition duration-75  "
            />Change language <!--note to translator: DO NOT TRANSLATE! it should stay in english always-->
          </button>
          <br />
          <button
            on:click={displayNextgraphOrg}
            class="text-primary-700 bg-[#f6f6f6] bg-none ring-0 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mb-2"
          >
            {$t("common.about_nextgraph")}
          </button>
        </div>
      </div>
    {/if}
  {:else}
    <div class="centered">
      <ul class="mb-20 mt-10">
        {#each Object.entries(available_languages) as lang}
          <li
            tabindex="0"
            role="menuitem"
            class="flex items-center p-2 text-lg mb-2 font-normal text-gray-900 clickable rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
            on:keypress={() => selectLang(lang[0])}
            on:click={() => selectLang(lang[0])}
          >
            <span class="mx-3">{lang[1]}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .centered {
    /*max-width: 1280px;*/
    margin: 0 auto;
    padding: 0rem;
    text-align: center;
    width: fit-content;
  }
  li.clickable {
    cursor: pointer;
  }
</style>
