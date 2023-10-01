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
  // @ts-ignore
  import EULogo from "../assets/EU.svg?component";
  // @ts-ignore
  import Logo from "../assets/nextgraph.svg?component";
  import { link, querystring } from "svelte-spa-router";

  import { onMount } from "svelte";
  let domain = import.meta.env.NG_ACCOUNT_DOMAIN;
  const param = new URLSearchParams($querystring);
  let ca = param.get("ca");
  let go_back = true;
  let wait = false;

  let top;
  const api_url = import.meta.env.PROD
    ? "api/v1/"
    : "http://192.168.192.2:3031/api/v1/";

  async function register() {
    wait = true;
    const opts = {
      method: "get",
    };
    try {
      const response = await fetch(api_url + "register/" + ca, opts);

      const result = await response.json();
      console.log("Result:", response.status, result); // 400 is error with redirect, 200 ok, 406 is error without known redirect
      if (response.status == 406) {
        await close();
      } else if (response.status == 400) {
        await close(result);
      } else {
        //console.log(result);
        await success(result);
      }
    } catch (e) {
      wait = false;
      error = e.message;
    }
  }

  async function close(result) {
    // @ts-ignore
    if (window.__TAURI__) {
      go_back = false;
      if (result) {
        error = "Closing due to " + (result.error || "an error");
      }
      let window_api = await import("@tauri-apps/plugin-window");
      let main = window_api.Window.getByLabel("main");
      if (main) {
        wait = true;
        await main.emit("error", result);
      } else {
        await window_api.getCurrent().close();
      }
    } else {
      if (result && result.url) {
        error = "We are redirecting you...";
        go_back = false;
        window.location.href = result.url;
      } else {
        wait = true;
        window.history.go(-1);
      }
    }
  }

  async function success(result) {
    // @ts-ignore
    if (window.__TAURI__) {
      let window_api = await import("@tauri-apps/plugin-window");
      let main = window_api.Window.getByLabel("main");
      if (main) {
        await main.emit("accepted", result);
      } else {
        await window_api.getCurrent().close();
      }
    } else {
      window.location.href = result.url;
    }
  }

  async function bootstrap() {}
  let error;

  onMount(() => bootstrap());

  const accept = async (event) => {
    await register();
  };
  const refuse = (event) => {
    close();
  };
</script>

{#if wait}
  <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-primary-700">
    Please wait...
    <svg
      class="animate-spin mt-10 h-14 w-14 mx-auto"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </div>
{:else}
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

        <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
          An error occurred while registering on this broker:<br />{error}
        </p>
        {#if go_back}
          <button
            on:click|once={close}
            class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
          >
            Go back
          </button>
        {/if}
      </div>
    {:else}
      {#if ca}
        <div class=" max-w-6xl lg:px-8 mx-auto px-4">
          <p class="max-w-xl md:mx-auto lg:max-w-2xl">
            You would like to choose <b>{domain}</b> as your Broker Service
            Provider.<br />Please read carefully the Terms of Service below,
            before accepting them.
          </p>
        </div>
      {/if}
      <div
        class="px-4 pt-5 mx-auto max-w-6xl lg:px-8 lg:pt-10 dark:bg-slate-800"
      >
        <div class="max-w-xl md:mx-auto sm:text-center lg:max-w-2xl">
          <h2 class="pb-5 text-xl">{domain} Terms of Service</h2>

          <ul class="mb-8 space-y-4 text-left text-gray-500 dark:text-gray-400">
            {#if domain == "nextgraph.eu"}
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
                    d="M20.893 13.393l-1.135-1.135a2.252 2.252 0 01-.421-.585l-1.08-2.16a.414.414 0 00-.663-.107.827.827 0 01-.812.21l-1.273-.363a.89.89 0 00-.738 1.595l.587.39c.59.395.674 1.23.172 1.732l-.2.2c-.212.212-.33.498-.33.796v.41c0 .409-.11.809-.32 1.158l-1.315 2.191a2.11 2.11 0 01-1.81 1.025 1.055 1.055 0 01-1.055-1.055v-1.172c0-.92-.56-1.747-1.414-2.089l-.655-.261a2.25 2.25 0 01-1.383-2.46l.007-.042a2.25 2.25 0 01.29-.787l.09-.15a2.25 2.25 0 012.37-1.048l1.178.236a1.125 1.125 0 001.302-.795l.208-.73a1.125 1.125 0 00-.578-1.315l-.665-.332-.091.091a2.25 2.25 0 01-1.591.659h-.18c-.249 0-.487.1-.662.274a.931.931 0 01-1.458-1.137l1.411-2.353a2.25 2.25 0 00.286-.76m11.928 9.869A9 9 0 008.965 3.525m11.928 9.868A9 9 0 118.965 3.525"
                  />
                </svg>
                <span
                  >Our servers are located in Germany, and we comply with the
                  GDPR regulation.</span
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
                    d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75"
                  />
                </svg>
                <span>legal details about GDPR... TBD</span>
              </li>
            {/if}
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
                  d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                />
              </svg>
              <span
                >All the data you exchange with us while using the broker is
                end-to-end encrypted and we do not have access to your
                decryption keys, meaning that we cannot see the content of your
                documents.</span
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
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
              <span
                >We do not log any private information about you (nor IP, nor
                country, nor statistics of any kind). Only your UserId is kept,
                together with the list of devices (clientId) you use to connect
                to the broker. We collect general purpose information about your
                device (OS version, browser version, and if you use the app, the
                version and date of last update). We do not have access to any
                unique tracking identifier of your device (like Android MAID or
                iPhone IDFA). We could nevertheless be asked by law enforcement
                authorities, depending on the jurisdiction of the server, to log
                the IP you use when connecting to the broker, and/or to provide
                them with the encrypted content you have stored on our servers.
                If you prefer to avoid that eventually, please refrain from any
                illegal activity while using this broker.</span
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
                  d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                You can delete your account with us at any time by going to the
                link <a target="_blank" href="https://account.{domain}/#/delete"
                  >account.{domain}/#/delete</a
                > or by entering in your NextGraph application and selecting the
                menu, then Accounts, then under broker "delete registration"</span
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
                  d="M14.25 7.756a4.5 4.5 0 100 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span
                >Registration is free of charge. And it would be very nice of
                you if you wanted to donate a small amount to help us cover the
                fees we have to pay for operating the servers. Here is the
                donation link: <a
                  target="_blank"
                  href="https://nextgraph.org/donate"
                  >https://nextgraph.org/donate</a
                >
              </span>
            </li>
            {#if !window.__TAURI__}
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
                    d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"
                  />
                </svg>

                <span
                  >By agreeing to those terms, you allow this software to store
                  some personal data locally in localStorage, the equivalent of
                  a cookie. This cookie contains your wallet and is never sent
                  to us. If you delete this cookie without keeping a copy of
                  your wallet somewhere else, then you will permanently loose
                  your wallet.
                </span>
              </li>
            {/if}
          </ul>
        </div>
      </div>
      {#if ca}
        <div class="row mb-20">
          <button
            on:click|once={accept}
            class="mr-5 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
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
            I accept
          </button>
          <button
            on:click|once={refuse}
            class="text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mr-2 mb-2"
          >
            I refuse
          </button>
        </div>
      {/if}
    {/if}
  </main>
{/if}
