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
  The Login Procedure.
  Has multiple states (steps) through the user flow.
  -->

<script lang="ts">
  import { Alert, Toggle, Button } from "flowbite-svelte";
  import { onMount, createEventDispatcher, tick } from "svelte";
  import { t } from "svelte-i18n";
  import {
    default as ng,
  } from "../../.auth-react/api";

  import {
    PuzzlePiece,
    XCircle,
    Backspace,
    ArrowPath,
    LockOpen,
    CheckCircle,
    ArrowLeft,
  } from "svelte-heros-v2";
  import PasswordInput from "./components/PasswordInput.svelte";
  import Spinner from "./components/Spinner.svelte";
  import { display_error } from "../store";
  //import Worker from "../worker.js?worker&inline";
  export let wallet;
  export let for_import = false;

  let top;
  function scrollToTop() {
    top.scrollIntoView();
  }

  let tauri_platform = import.meta.env.TAURI_ENV_PLATFORM;

  const dispatch = createEventDispatcher();

  function init_simple() {
    error = undefined;
    step = "password";
    scrollToTop();
  }

  onMount(async () => {
    loaded = false;
    if (for_import) {
      device_name = await ng.get_device_name();
      step = "import";
    }
    //load_svg();
    //console.log(wallet);
    //await init();
    init_simple();

    if (!tauri_platform) {
      try {
        localStorage;
      } catch (e) {
        trusted = false;
        no_local_storage = true;
        console.log("no access to localStorage");
      }
    }
  });


  let step = "password";

  let loaded = false;
  
  let error;

  let trusted = true;
  let no_local_storage = false;

  let password = "";

  let unlockWith: "pazzle" | "mnemonic" | "password" | undefined = "password";

  let device_name;

  async function finish() {
    step = "opening";
    await tick();
    // open the wallet
    try {
      if (tauri_platform) {
        // TODO @niko: Add device_name as param to open_with_* APIs
        let opened_wallet =
          await ng.wallet_open_with_password(password);
        // try {
        //   let client = await ng.wallet_was_opened(opened_wallet);
        //   opened_wallet.V0.client = client;
        // } catch (e) {
        //   console.log(e);
        //   error = e;
        //   step = "end";
        //   dispatch("error", { error: e });
        //   return;
        // }
        step = "end";
        dispatch("opened", {
          wallet: opened_wallet,
          id: opened_wallet.V0.wallet_id,
          trusted,
          device_name,
        });
      } else {
        let worker_import = await ng.get_worker();
        const myWorker = new worker_import.default();
        myWorker.onerror = (e) => {
          console.error(e);
          error = "WebWorker error";
          step = "end";
          dispatch("error", { error });
        };
        myWorker.onmessageerror = (e) => {
          console.error(e);
          error = e;
          step = "end";
          dispatch("error", { error: e });
        };
        myWorker.onmessage = async (msg) => {
          //console.log("Message received from worker", msg.data);
          if (msg.data.loaded) {
            if (unlockWith === "password") {
              myWorker.postMessage({ wallet, password, device_name });
            } 
            //console.log("postMessage");
          } else if (msg.data.success) {
            //console.log(msg.data);
            // try {
            //   let client = await ng.wallet_was_opened(msg.data.success);
            //   msg.data.success.V0.client = client;
            // } catch (e) {
            //   console.log(e);
            //   error = e;
            //   step = "end";
            //   dispatch("error", { error: e });
            //   return;
            // }
            step = "end";
            dispatch("opened", {
              wallet: msg.data.success,
              id: msg.data.success.V0.wallet_id,
              trusted,
              device_name,
            });
          } else {
            console.error(msg.data.error);
            error = msg.data.error;
            step = "end";
            dispatch("error", { error: msg.data.error });
          }
        };
      }
    } catch (e) {
      console.error(e);
      if (
        (e.message && e.message.includes("constructor")) ||
        (typeof e === "string" && e.includes("constructor"))
      )
        e = "BrowserTooOld";
      error = e;
      step = "end";
      dispatch("error", { error: e });
    }

    // display the result
  }

  function cancel() {
    dispatch("cancel");
  }


  function go_back() {
    if (step === "password") {
      init_simple();
    } 
  }
</script>

<div
  class="flex-col justify-center md:max-w-2xl py-4 sm:px-8"
  bind:this={top}
>
  
  {#if step == "import"}
    {#if no_local_storage}
      <div class="max-w-xl lg:px-8 mx-auto px-4 mb-2">
        <Alert color="orange" class="">
          Access to local storage is denied. <br />You won't be able to save
          your wallet in this browser.<br />
          If you wanted to save it, please allow storing local data<br />
          for the websites {location.origin} <br />
          and https://nextgraph.net and then reload the page. <br />
        </Alert>
      </div>
    {:else}
      <div class="max-w-xl lg:px-8 mx-auto px-4 mb-2">
        <span class="text-xl"
          >{$t("pages.wallet_create.save_wallet_options.trust")}
        </span> <br />
        <p class="text-sm">
          {$t("pages.wallet_create.save_wallet_options.trust_description")}
          {#if !tauri_platform}
            {$t("pages.login.trust_device_allow_cookies")}{/if}<br />
        </p>
        <div class="flex justify-center items-center my-4">
          <Toggle class="" bind:checked={trusted}
            >{$t("pages.login.trust_device_yes")}</Toggle
          >
        </div>
      </div>
    {/if}

    <div class="max-w-xl lg:px-8 mx-auto px-4 text-primary-700">
      <div class="flex flex-col justify-centerspace-x-12 mt-4 mb-4">
        <!-- Device Name, if trusted-->
        {#if trusted}
          <label for="device-name-input" class="text-sm text-black">
            {$t("pages.login.device_name_label")}
          </label>
          <input
            id="device-name-input"
            bind:value={device_name}
            placeholder={$t("pages.login.device_name_placeholder")}
            type="text"
            class="w-full mb-10 lg:px-8 mx-auto px-4 bg-gray-50 border border-gray-300 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          />
        {/if}

        <button
          on:click={start_with_password}
          on:keypress={start_with_password}
          class="mt-1 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
        >
          <LockOpen
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
          />
          {$t("pages.login.open")}
        </button>

        <button
          on:click={cancel}
          class="mt-3 mb-2 text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
          ><ArrowLeft
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
          />{$t("pages.login.login_cancel")}
        </button>
      </div>
    </div>
  {:else if step == "password"}

      <label
        for="password-input"
        class="block mb-2 text-xl text-gray-900 dark:text-white"
        >{$t("pages.login.enter_password")}</label
      >
      <PasswordInput
        id="password-input"
        bind:value={password}
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        auto_complete="password"
        autofocus={true}
        on:enter={finish}
      />
      <div class="flex">
        <button
          on:click={cancel}
          class="mt-3 mr-2 mb-2 ml-auto bg-red-100 hover:bg-red-100/90 disabled:opacity-65 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
          ><XCircle
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition focus:outline-none duration-75 group-hover:text-gray-900 dark:group-hover:text-white"
          />{$t("buttons.cancel")}</button
        >
        <Button
          onclick={finish}
          class="mt-3 mb-2 ml-auto text-white bg-primary-700 hover:bg-primary-700/90 disabled:opacity-65 focus:ring-4 focus:ring-blue-500 focus:border-blue-500 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-blue-500 dark:focus:border-blue-500"
          disabled={password.trim().length < 2}
          ><CheckCircle
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
          />{$t("buttons.confirm")}</Button
        >
      </div>

    <!-- The following steps have navigation buttons and fixed layout -->
  {:else if step == "opening"}
    <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-primary-700">
      {@html $t("pages.login.opening_wallet")}
      <Spinner className="mt-10 h-14 w-14 mx-auto" />
    </div>
  {:else if step == "end"}
    {#if error}
      <div class=" max-w-6xl lg:px-8 mx-auto text-red-800">
        <div class="mt-auto max-w-6xl lg:px-8">
          {$t("errors.an_error_occurred")}
          <svg
            fill="none"
            class="animate-bounce mt-10 h-10 w-10 mx-auto"
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
          <Alert color="red" class="mt-5">
            {display_error(error)}
          </Alert>
        </div>
        <div class="flex justify-between mt-auto gap-4 mr-3 ml-3">
          <button
            on:click={cancel}
            class="mt-10 bg-red-100 hover:bg-red-100/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            ><XCircle
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none group-hover:text-gray-900 dark:group-hover:text-white"
            />{$t("buttons.cancel")}</button
          >
          <button
            class="mt-10 ml-2 select-none text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            on:click={init_simple}
          >
            <ArrowPath
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none group-hover:text-gray-900 dark:group-hover:text-white"
            />
            {$t("buttons.try_again")}
          </button>
        </div>
      </div>
    {:else}
      <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-green-800">
        {@html $t("pages.login.wallet_opened")}
        <svg
          class="my-10 h-16 w-16 mx-auto"
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
      </div>
    {/if}
  {/if}
</div>

<style>

</style>
