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
  @component
  Wallet creation page.
  This component manages the whole UX flow, gives infos about wallets,
   offers available brokers, handles wallet creation,
   and shows the generated pazzle and mnemonic (if applicable).
-->

<script lang="ts">
  import { Button, Alert } from "flowbite-svelte";
  import { link, querystring, push } from "svelte-spa-router";
  import { t } from "svelte-i18n";
  import CenteredLayout from "../lib/CenteredLayout.svelte";
  import PasswordInput from "../lib/components/PasswordInput.svelte";

  // @ts-ignore
  import Logo from "../assets/nextgraph.svg?component";
  import {
    NG_EU_BSP_REGISTER,
    NG_ONE_BSP_REGISTER,
    APP_WALLET_CREATE_SUFFIX,
    default as ng,
  } from "../api";

  import { onMount, onDestroy, tick } from "svelte";
  import { wallets, display_error } from "../store";
  import Spinner from "../lib/components/Spinner.svelte";

  const param = new URLSearchParams($querystring);

  function base64UrlEncode(str) {
    const base64 = btoa(str); // Standard Base64 encoding
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  let tauri_platform = import.meta.env.TAURI_ENV_PLATFORM;

  let wait: any = false;
  let registration_error;
  let registration_success;
  let top;
  let error;
  let ready;
  let invitation;
  let pre_invitation;
  let username = "";
  let password = "";
  let username_pass_ok = false;
  let password_input;
  let username_input;

  const username_password_ok = async (e) => {
    if (!e || e.key == "Enter" || e.keyCode == 13 || e.type == "enter") {
      await tick();
      if (!password) {
        password_input.scrollIntoView();
        password_input.focus();
      } else if (!username) {
        username_input.scrollIntoView();
        username_input.focus();
      } else {
        username_pass_ok = true;
        await do_wallet();
      }
    }
  };

  function scrollToTop() {
    top.scrollIntoView();
  }

  const redirect_server = import.meta.env.NG_REDIR_SERVER || "nextgraph.net";
  const bootstrap_redirect = import.meta.env.NG_DEV
    ? "http://localhost:1421/bootstrap.html#/?b="
    : import.meta.env.DEV
      ? "http://localhost:14403/#/?b="
      : import.meta.env.NG_DEV3
        ? "http://127.0.0.1:3033/bootstrap/#/?b="
        : `https://${redirect_server}/bootstrap/#/?b=`;

  async function bootstrap() {
    //console.log(await ng.client_info());
    if (!tauri_platform || tauri_platform == "android") {
      if (!tauri_platform) {
        try {
          sessionStorage.getItem("test");
          localStorage.getItem("test");
        } catch (e) {
          registration_error = "NoLocalStorage";
          return;
        }
        try {
          let worker_import = await import("../workertest.js?worker&inline");
          const myWorker = new worker_import.default();
        } catch (e) {
          registration_error = "BrowserTooOld";
          return;
        }
      }

      if (param.get("re")) {
        registration_error = param.get("re");
        console.error("registration_error", registration_error);
      } else if (
        (param.get("rs") || param.get("i")) &&
        !tauri_platform &&
        !param.get("ab") &&
        !import.meta.env.NG_ENV_NO_REDIRECT
      ) {
        registration_success = param.get("rs");

        // doing the bootstrap recording at nextgraph.net
        let i = param.get("i");
        invitation = await ng.decode_invitation(i);
        let bootstrap_iframe_msgs = await ng.bootstrap_to_iframe_msgs(
          invitation.V0.bootstrap
        );
        let local_invitation = await ng.get_local_bootstrap(location.href);
        if (local_invitation) {
          bootstrap_iframe_msgs.push(
            ...(await ng.bootstrap_to_iframe_msgs(
              local_invitation.V0.bootstrap
            ))
          );
        }
        let encoded = base64UrlEncode(JSON.stringify(bootstrap_iframe_msgs));
        window.location.href =
          bootstrap_redirect +
          encoded +
          "&m=add&ab=" +
          encodeURIComponent(window.location.href);
        return;
      } else if (param.get("rs")) {
        registration_success = param.get("rs");
        invitation = await ng.decode_invitation(param.get("i"));
        window.location.replace(window.location.href.split("?")[0]);
      } else if (param.get("i")) {
        invitation = await ng.get_local_bootstrap_with_public(
          location.href,
          param.get("i"),
          false //import.meta.env.PROD
        );
        console.log("invitation", invitation);
        if (invitation && invitation.V0.url) {
          pre_invitation = invitation;
          invitation = undefined;
        } else if (!invitation) {
          let redirect = await ng.get_ngnet_url_of_invitation(param.get("i"));
          if (redirect) {
            console.error("got an invitation for another broker. redirecting");
            window.location.href = redirect;
          } else {
            //let i = await ng.decode_invitation(param.get("i"));
            console.error("invalid invitation. ignoring it");
          }
        } else {
          registration_success = window.location.host;
        }
      } else {
        pre_invitation = await ng.get_local_bootstrap_with_public(
          location.href,
          undefined,
          true
        );
        console.log("pre_invitation", pre_invitation);
      }
    }
    scrollToTop();
    if (!invitation) {
      if (pre_invitation) {
        await select_bsp(pre_invitation.V0.url, pre_invitation.V0.name);
      } else if (!registration_error) {
        selectEU(false);
      }
    } else {
      //await do_wallet();
    }
  }

  async function do_wallet() {
    let local_invitation = await ng.get_local_bootstrap(location.href);
    let additional_bootstrap;
    if (local_invitation) {
      additional_bootstrap = local_invitation.V0.bootstrap;
    }
    let core_registration;
    if (invitation.V0.code) {
      core_registration = invitation.V0.code.ChaCha20Key;
    }
    let params = {
      pazzle_length: 0,
      security_txt: username,
      security_img: undefined,
      password: password,
      mnemonic: false,
      send_bootstrap: false, //options.cloud || options.bootstrap ?  : undefined,
      send_wallet: false,
      local_save: true,
      result_with_wallet_file: false, // this will be automatically changed to true for browser app
      core_bootstrap: invitation.V0.bootstrap,
      core_registration,
      additional_bootstrap,
      device_name: "",
      pdf: false,
    };
    //console.log("do wallet with params", params);
    try {
      ready = await ng.wallet_create(params);
      wallets.set(await ng.get_wallets());
      push("#/wallet/login");
    } catch (e) {
      console.error(e);
      error = e;
    }
  }

  onMount(async () => await bootstrap());

  ready = false;

  let unsub_register = () => {};

  onDestroy(async () => {
    if (unsub_register) unsub_register();
    unsub_register = undefined;
  });

  const select_bsp = async (bsp_url, bsp_name) => {
    if (!tauri_platform || tauri_platform == "android") {
      let redirect_url;
      if (tauri_platform) {
        redirect_url = window.location.href;
      } else {
        let local_url;
        if (!import.meta.env.PROD) {
          local_url = "http://localhost:1421";
        } else {
          let from_url = window.location.href;
          if (from_url.startsWith("https://")) from_url = `https://${bsp_name}`;
          local_url = await ng.get_local_url(from_url);
        }
        if (local_url) redirect_url = local_url + APP_WALLET_CREATE_SUFFIX;
      }

      let create = {
        V0: {
          redirect_url,
        },
      };
      let ca = await ng.encode_create_account(create);
      wait = $t("pages.wallet_create.redirecting_to_registration_page");
      window.location.href = bsp_url + "?ca=" + ca;
      //window.open(), "_self").focus();
    } else {
      let create = {
        V0: {
          redirect_url: undefined,
        },
      };
      wait = $t("pages.wallet_create.complete_in_popup");
      let ca = await ng.encode_create_account(create);
      let unsub_register = await ng.open_window(
        bsp_url + "?ca=" + ca,
        "registration",
        "Registration at a Broker",
        async (result, payload) => {
          if (result == "accepted") {
            wait = false;
            console.log("got accepted with payload", payload);
            registration_success = bsp_name;
            invitation = await ng.decode_invitation(payload.invite);
            unsub_register = undefined;
          } else if (result == "error") {
            wait = false;
            console.log("got error with payload", payload);
            if (payload) registration_error = payload.error;
            unsub_register = undefined;
          } else if (result == "close") {
            console.log("onCloseRequested");
            wait = false;
            username_pass_ok = false;
            unsub_register = undefined;
          }
        }
      );
    }
  };
  const selectONE = async (event) => {
    await select_bsp(NG_ONE_BSP_REGISTER, "nextgraph.one");
  };
  const selectEU = async (event) => {
    await select_bsp(
      NG_EU_BSP_REGISTER,
      import.meta.env.NG_ENV_ALT ? import.meta.env.NG_ENV_ALT : "nextgraph.eu"
    );
  };
</script>

<CenteredLayout>
  <div class="max-w-2xl lg:px-8 mx-auto mb-20">
    {#if wait}
      <div class="lg:px-8 text-primary-700">
        {#if wait === true}
          {$t("pages.wallet_create.please_wait")}...
        {:else}
          {wait}
        {/if}
        <Spinner className="mt-10 h-14 w-14 mx-auto" />
      </div>
    {:else}
      <div class="container3" bind:this={top}>
        <div class="row">
          <a href="#/">
            <Logo class="logo block h-[8em]" alt={$t("common.logo")} />
          </a>
        </div>
        {#if registration_error}
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
            {#if registration_error == "AlreadyExists"}
              <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
                {@html $t("pages.user_registered.already_exists")}
              </p>
              <a use:link href="/wallet/login">
                <button
                  tabindex="-1"
                  class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
                >
                  {$t("buttons.login")}
                </button>
              </a>
            {:else}
              <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
                {@html $t("errors.error_occurred", {
                  values: { message: display_error(registration_error) },
                })}
              </p>
              <a use:link href="/">
                <button
                  tabindex="-1"
                  class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
                >
                  {$t("buttons.back_to_homepage")}
                </button>
              </a>
            {/if}
          </div>
        {:else if !username_pass_ok}
          <div class=" max-w-6xl lg:px-8 mx-auto">
            {#if registration_success}
              <Alert color="green" class="mb-5">
                <span class="font-bold text-xl"
                  >{$t("pages.wallet_create.registration_success", {
                    values: { broker: registration_success },
                  })}</span
                >
              </Alert>
            {/if}
            <p class="max-w-xl md:mx-auto lg:max-w-2xl">
              <span class="text-xl"
                >{$t("pages.wallet_create.choose_username.title")}</span
              >
              <Alert color="yellow" class="mt-5">
                {@html $t("pages.wallet_create.choose_username.warning")}
              </Alert>
            </p>
            <input
              bind:this={username_input}
              class="mt-10 mr-0 mb-5 text-md bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              id="username-input"
              placeholder={$t("pages.wallet_create.type_username_placeholder")}
              autocomplete="username"
              autofocus
              bind:value={username}
              on:keypress={username_password_ok}
            />

            <PasswordInput
              bind:input={password_input}
              id="password-input"
              placeholder={$t("pages.wallet_create.type_password_placeholder")}
              bind:value={password}
              className="mb-5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              auto_complete="password"
              on:enter={username_password_ok}
            />
            <Button
              disabled={!username || !password}
              on:click|once={() => {
                username_password_ok(false);
              }}
              class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
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
              {@html $t("pages.wallet_create.create_wallet_now")}
            </Button>
          </div>
        {:else if !error}
          {#if !ready}
            <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-primary-700">
              {$t("pages.wallet_create.creating")}
              <svg
                class="animate-spin mt-10 h-6 w-6 mx-auto"
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
            <div class="text-left mx-4">
              <div class="text-green-800 mx-auto flex flex-col items-center">
                <div>{$t("pages.wallet_create.ready")}</div>
                <svg
                  class="my-4 h-16 w-16"
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
            </div>
          {/if}
        {:else}
          <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
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
            <button
              class="mt-10 select-none"
              on:click={async () => {
                window.location.href = window.location.origin;
              }}
            >
              {$t("buttons.start_over")}
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</CenteredLayout>

<style>
</style>
