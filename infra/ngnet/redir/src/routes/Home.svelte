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

<!--
  Home page of ngnet redirect
-->

<script>
  import Home from "../lib/Home.svelte";
  import { t, locale } from "svelte-i18n";
  import { brokers_info, web_origin } from "../store";

</script>
{#if $web_origin}
  {#if Object.keys($brokers_info).length == 0}
    {#if import.meta.env.NG_DEV}
      <div class="text-center max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
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
          <p class="mb-5">
            We could not find a wallet in your browser.<br/>
            This is probably due to the recent changes made to the framework.<br/>
            Please create a new wallet from this browser and try again,
          </p>
      </div>
    {:else}
      <div class="text-center max-w-6xl lg:px-8 mx-auto px-4 text-blue-600">
        
        <svg
          class="y-10 h-16 w-16 mx-auto mb-3"
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
        We could not find a wallet in your browser.<br/>
        For now, creating a new wallet while a Web App<br/>
        is authenticating, is not implemented. Please<br/>
        create or import your wallet in a new tab by<br/><a href="https://nextgraph.eu" target="_blank">clicking here</a>
      </div>
    {/if}
  {:else}
    <Home />
  {/if}
{:else}
<div class="text-center max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
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
      <p class="mb-5">
        {@html $t("auth.unexpected_error")}
      </p>
</div>
{/if}
