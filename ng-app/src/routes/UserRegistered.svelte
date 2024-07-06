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

<script>
  import { t } from "svelte-i18n";
  import { link, querystring } from "svelte-spa-router";
  import CenteredLayout from "../lib/CenteredLayout.svelte";
  // @ts-ignore
  import Logo from "../assets/nextgraph.svg?component";

  import { onMount, tick } from "svelte";

  import { default as ng } from "../api";

  const param = new URLSearchParams($querystring);

  let tauri_platform = import.meta.env.TAURI_PLATFORM;

  let mobile = tauri_platform == "android" || tauri_platform == "ios";

  let error = param.get("e");

  let invite = param.get("i");
  let invitation;

  let user = param.get("u");

  onMount(async () => {
    if (invite) {
      invitation = await ng.decode_invitation(invite);
    }
  });
</script>

<CenteredLayout displayFooter={true}>
  <div class="container3">
    <div class="row">
      <a href="#/">
        <Logo class="logo block h-40" alt={$t("common.logo")} />
      </a>
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
            {$t("pages.user_registered.already_exists")}
          </p>
          <a use:link href="/">
            <button
              tabindex="-1"
              class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
            >
              {$t("common.login")}
            </button>
          </a>
        {:else}
          <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
            {$t("pages.user_registered.error", { values: { error } })}
          </p>
          <a use:link href="/">
            <button
              tabindex="-1"
              class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
            >
              {$t("common.back_to_homepage")}
            </button>
          </a>
        {/if}
      </div>
    {:else if invite && user}
      <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-green-800">
        <svg
          class="mt-10 h-16 w-16 mx-auto"
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
            d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
          />
        </svg>
        <p class="max-w-xl md:mx-auto lg:max-w-2xl">
          {$t("pages.user_registered.success", {
            values: { invitation_name: invitation?.V0?.name },
          })}
        </p>
      </div>
    {/if}
  </div>
</CenteredLayout>

<style>
</style>
