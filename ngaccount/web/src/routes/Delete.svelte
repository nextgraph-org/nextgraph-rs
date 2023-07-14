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

<script>
  import { Button } from "flowbite-svelte";
  import EULogo from "../assets/EU.svg?component";
  import Logo from "../assets/nextgraph.svg?component";
  import { link, querystring } from "svelte-spa-router";

  import { onMount } from "svelte";

  const param = new URLSearchParams($querystring);
  let ca = param.get("ca");

  let domain = import.meta.env.NG_ACCOUNT_DOMAIN;

  let top;
  const api_url = import.meta.env.PROD
    ? "api/v1/"
    : "http://localhost:3031/api/v1/";

  async function bootstrap() {}
  let error;

  onMount(() => bootstrap());

  const accept = (event) => {};
  const refuse = (event) => {
    window.history.go(-1);
  };
</script>

<main class="container3" bind:this={top}>
  <div class="row">
    <Logo class="logo block h-24" alt="NextGraph Logo" />
    {#if domain == "nextgraph.eu"}
      <EULogo
        class="logo block h-20"
        style="margin-top: 0.5em;"
        alt="European Union Logo"
      />
    {/if}
  </div>
  {#if error}
    <div class=" max-w-6xl lg:px-8 mx-auto px-4">
      <p class="max-w-xl md:mx-auto lg:max-w-2xl">
        An error occurred while deleting your account on this broker :<br />
        {error}
      </p>
    </div>
  {:else}
    <div class=" max-w-6xl lg:px-8 mx-auto px-4">
      <p class="max-w-xl md:mx-auto lg:max-w-2xl">
        You want to delete your account at <b>{domain}</b>?<br />Please read
        carefully the details below before you do so.
      </p>
    </div>
    <div class="px-4 pt-5 mx-auto max-w-6xl lg:px-8 lg:pt-10 dark:bg-slate-800">
      <div class="max-w-xl md:mx-auto sm:text-center lg:max-w-2xl">
        <h2 class="pb-5 text-xl">Delete your account at {domain}</h2>

        <ul class="mb-8 space-y-4 text-left text-gray-500 dark:text-gray-400">
          <li class="flex space-x-3">
            <svg
              class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
            <span
              >Your personal data on this broker will be permanently removed
              (UserId, ClientId) and the data of your documents will be removed,
              except if they are shared with other users who are using this
              broker as well.</span
            >
          </li>
          <li class="flex space-x-3">
            <svg
              class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
            <span
              >You can come back anytime. Please understand that you must have
              at least one broker configured in your wallet in order to be able
              to use NextGraph. You have other options to select a new broker,
              like hosting it yourself, or buying an NG Box. Please visit <a
                target="_blank"
                href="https://nextgraph.one/#/account/register"
                >https://nextgraph.one/#/account/register</a
              > in order to choose a new broker.
            </span>
          </li>
          <li class="flex space-x-3">
            <svg
              class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
                d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
              />
            </svg>

            <span
              >All the data you still have locally on your devices (if you
              installed the NextGraph application) will remain accessible to you
              even after you delete your account from this broker.<br /> If you
              haven't installed any NextGraph app yet, maybe it is a good idea
              to do so now, before you delete your account from here. This way,
              you will keep a copy of all your documents data locally. To
              install the app,
              <a target="_blank" href="https://nextgraph.one/#/install"
                >go here</a
              >. After installing the app, you will have to go to the menu and
              select "Sync all my documents now".</span
            >
          </li>
        </ul>
      </div>
    </div>
    <div class="row mb-20">
      <button
        on:click|once={accept}
        role="button"
        class="mr-5 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:outline-none focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
      >
        <svg
          class="w-8 h-8 mr-2 -ml-1"
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
            d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
          />
        </svg>
        Delete my account
      </button>
      <button
        on:click|once={refuse}
        class="text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:outline-none focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mr-2 mb-2"
      >
        Cancel
      </button>
    </div>
  {/if}
</main>
