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
  import { t, format } from "svelte-i18n";
  import { Alert, Spinner } from "flowbite-svelte";
  import {
    ArrowLeft,
    ExclamationTriangle,
    Cloud,
    ChevronDoubleRight,
  } from "svelte-heros-v2";
  import { onDestroy, onMount, tick } from "svelte";
  import { push } from "svelte-spa-router";
  import CenteredLayout from "../lib/CenteredLayout.svelte";
  import PasswordInput from "../lib/components/PasswordInput.svelte";
  import { wallet_from_import, display_error } from "../store";
  import ng from "../api";

  let top: HTMLElement;

  const set_online = () => {
    connected = true;
  };
  const set_offline = () => {
    connected = false;
  };

  let error;
  let connected = true;
  let tauri_platform = import.meta.env.TAURI_ENV_PLATFORM;
  let pre_invitation = false;
  let domain = undefined;
  let for_opaque = undefined;
  let state: "username" | "password" | "connecting" = "username";

  function scrollToTop() {
    top.scrollIntoView();
  }

  onMount(async () => {
    connected = window.navigator.onLine;
    window.addEventListener("offline", set_offline);
    window.addEventListener("online", set_online);
    state = "username";
    username = "";
    if (!tauri_platform) {
      let res = await ng.get_local_bootstrap_and_domain(
        import.meta.env.PROD ? location.href : "http://localhost:14400"
      );
      pre_invitation = res[0];
      domain = res[1];
      console.log("pre_invitation", pre_invitation, domain);
    }
    scrollToTop();
    await tick();
    username_input.focus();
  });
  onDestroy(() => {
    window.removeEventListener("offline", set_offline);
    window.removeEventListener("online", set_online);
  });

  let password = "";
  const validate_password = async () => {
    console.log(password, for_opaque);
  };
  let username_input;
  let username = "";
  let redirect = undefined;
  const domainRegex =
    /^((?=[a-z0-9-]{1,63}\.)(xn--)?[a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,63}$/i;
  const usernameRegex = /^[a-zA-Z_]+[a-zA-Z0-9_-]*\.[0-9]+$/;
  const validate_username = async (e: any) => {
    if (!e || e.key == "Enter" || e.keyCode == 13) {
      username_input.blur();
      if (pre_invitation) {
        if (!domain) {
          let u = username.trim();
          if (u.includes("@")) {
            syntax_error = $t(
              "pages.wallet_login_username.error.nodomainplease"
            );
          } else if (!usernameRegex.test(u)) {
            syntax_error = $t("pages.wallet_login_username.error.username");
          } else {
            for_opaque = pre_invitation.V0.bootstrap;
            for_opaque.username = u;
            next();
          }
        } else {
          let parts = username.trim().split("@");
          if (!usernameRegex.test(parts[0])) {
            syntax_error = $t("pages.wallet_login_username.error.username");
          } else if (parts[1] === domain || !parts[1]) {
            username = parts[0];
            for_opaque = pre_invitation.V0.bootstrap;
            for_opaque.username = username;
            next();
          } else {
            // testing that domain is valid
            if (!domainRegex.test(parts[1])) {
              syntax_error = $t(
                "pages.wallet_login_username.error.invalid_domain"
              );
            } else {
              redirect = `https://${parts[1]}/#/wallet/username?u=${parts[0]}`;
              syntax_error = $t(
                "pages.wallet_login_username.error.need_redirect"
              );
              // TODO: when receiving a ?u=... after fetching it with opaque, if the wallet is already present locally, dont show an error, just log in with the username/password.
            }
          }
        }
      } else if (tauri_platform) {
        let parts = username.trim().split("@");
        if (!usernameRegex.test(parts[0])) {
          syntax_error = $t("pages.wallet_login_username.error.username");
        } else if (!parts[1]) {
          syntax_error = $t(
            "pages.wallet_login_username.error.mandatory_domain"
          );
        } else {
          // testing that domain is valid
          if (!domainRegex.test(parts[1])) {
            syntax_error = $t(
              "pages.wallet_login_username.error.invalid_domain"
            );
          } else {
            // fetching the .ng_bootstrap of the domain
            state = "connecting";
            try {
              let bootstrap_info = await ng.retrieve_ng_bootstrap(
                `https://${parts[1]}`
              );
              for_opaque = bootstrap_info.V0.bootstrap;
              for_opaque.username = parts[0];
              // do opaque with that
              next();
            } catch (e) {
              error = e;
              return;
            }
          }
        }
      } else {
        syntax_error = "your local broker cannot be found (unexpected error)";
      }
    }
  };
  let placeholder = "";
  $: placeholder = pre_invitation
    ? domain
      ? $format(
          "pages.wallet_login_username.username_placeholder_without_domain",
          {
            values: { domain },
          }
        )
      : $t("pages.wallet_login_username.username_placeholder_without_at")
    : $t("pages.wallet_login_username.username_placeholder_domain");
  let warning = "";
  $: warning =
    (domain &&
      username.trim().endsWith("@" + domain) &&
      $format("pages.wallet_login_username.warning.nospecificdomainplease", {
        values: { domain },
      })) ||
    (pre_invitation &&
      !domain &&
      username.includes("@") &&
      $t("pages.wallet_login_username.warning.nodomainplease")) ||
    "";
  const next = () => {
    for_opaque.username = for_opaque.username.toLowerCase();
    state = "password";
  };

  let syntax_error = "";
</script>

<CenteredLayout>
  <div class="container3" bind:this={top}>
    <div
      class="flex flex-col justify-center max-w-md mb-5 bg-gray-60 overflow-y-auto py-4 dark:bg-gray-800"
    >
      <!-- Title -->
      <div class="mx-6">
        <h2 class="text-xl mb-6">{$t("pages.wallet_login_username.title")}</h2>
      </div>

      {#if !connected}
        <!-- Warning, if offline -->
        <div class="text-left mx-6">
          <Alert color="red">
            {@html $t("wallet_sync.offline_warning")}
          </Alert>
          <Alert color="blue" class="mt-4">
            {@html $t("pages.wallet_login.offline_advice")}
          </Alert>
          <!-- Go Back -->
          <button
            on:click={() => window.history.go(-1)}
            class="mt-8 w-full text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            ><ArrowLeft
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
            />{$t("buttons.back")}</button
          >
        </div>
      {:else if error}
        <div class="max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
          <ExclamationTriangle class="animate-bounce mt-10 h-16 w-16 mx-auto" />
          <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
            {@html $t("errors.error_occurred", {
              values: { message: display_error(error) },
            })}
          </p>
          <button
            on:click={() => window.history.go(-1)}
            class="mt-8 mr-2 text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            ><ArrowLeft
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
            />{$t("buttons.back")}</button
          >
        </div>
      {:else if state == "username"}
        <div class="mx-6">
          <div class="mx-auto">
            <div class="my-4 mx-1 mt-4">
              {#if syntax_error}
                <Alert color="red" class="mb-3">
                  {syntax_error}
                </Alert>
              {/if}
              {#if warning}
                <Alert color="blue" class="mb-3">
                  {warning}
                </Alert>
              {/if}
              {$t("pages.wallet_login_username.username")} :
              <input
                bind:this={username_input}
                class="w-[240px] mr-0"
                id="username_input"
                {placeholder}
                bind:value={username}
                on:keypress={validate_username}
                on:focus={() => {
                  syntax_error = "";
                  redirect = undefined;
                }}
              />
              <!-- Go Back -->
              <button
                on:click={() => {
                  if (redirect) {
                    username_input.focus();
                  } else {
                    window.history.go(-1);
                  }
                }}
                class="mt-8 mr-2 text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
                ><ArrowLeft
                  tabindex="-1"
                  class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
                />{$t("buttons.back")}</button
              >
              {#if redirect}
                <button
                  on:click={() => {
                    window.location.href = redirect;
                  }}
                  class="mt-4 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
                >
                  <ChevronDoubleRight
                    tabindex="-1"
                    class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
                  />
                  {$t("pages.wallet_login_username.redirect")}
                </button>
              {:else}
                <button
                  on:click={() => validate_username(null)}
                  class="mt-4 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
                >
                  <ChevronDoubleRight
                    tabindex="-1"
                    class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
                  />
                  {$t("pages.wallet_login_username.next")}
                </button>
              {/if}
            </div>
          </div>
        </div>
      {:else if state === "password"}
        <div class="mx-6">
          <div class="mx-auto">
            <div class="my-4 mx-1 mt-4">
              {$t("pages.wallet_login_username.password")} :
              <!-- <input
                bind:this={password_input}
                class="w-[240px] mr-0"
                id="password_input"
                bind:value={password}
                on:keypress={validate_password}
              /> -->
              <PasswordInput
                id="password_input"
                placeholder={$t(
                  "pages.wallet_login_username.password_placeholder"
                )}
                bind:value={password}
                on:enter={validate_password}
                classNameToggle="right-[-26px]"
                className="w-[240px] bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              />
              <!-- Go Back -->
              <button
                on:click={async () => {
                  state = "username";
                  for_opaque = undefined;
                  await tick();
                  username_input.focus();
                }}
                class="mt-8 mr-1 text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
                ><ArrowLeft
                  tabindex="-1"
                  class="w-8 h-8 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
                />{$t("buttons.back")}</button
              >
              <button
                on:click={validate_password}
                class="mt-4 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
              >
                <ChevronDoubleRight
                  tabindex="-1"
                  class="w-8 h-8 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
                />
                {$t("pages.wallet_login_username.connect")}
              </button>
            </div>
          </div>
        </div>
      {:else if state === "connecting"}
        <div>
          <Spinner class="w-full" />
        </div>
      {/if}
    </div>
  </div>
</CenteredLayout>
