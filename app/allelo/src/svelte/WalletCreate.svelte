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
  import Button, { Label } from '@smui/button';
  import Typography from "./lib/components/Typography.svelte";
  import Textfield from "@smui/textfield";
  import { t } from "svelte-i18n";
  import CenteredLayout from "./lib/CenteredLayout.svelte";
  import PasswordInput from "./lib/components/PasswordInput.svelte";
  import { redirect_server, bootstrap_redirect, base64UrlEncode, push } from "./index";
  import {
    NG_EU_BSP_REGISTER,
    NG_ONE_BSP_REGISTER,
    APP_WALLET_CREATE_SUFFIX,
    default as ng,
  } from "../.auth-react/api";

  import CircleLogo from "./lib/components/CircleLogo.svelte";

  import { onMount, onDestroy, tick } from "svelte";
  import { wallets, display_error, boot } from "./store";
  import Spinner from "./lib/components/Spinner.svelte";

  console.log("WalletCreate called")

  let search = window.location.href.split("?")[1] || "";
  const param = new URLSearchParams(search);
    for (const [key, value] of param) {
    console.log("PARAM",key,value);
  }

  let tauri_platform = import.meta.env.TAURI_ENV_PLATFORM;

  let wait: any = "Please wait...";
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
        wait = $t("pages.wallet_create.creating");
        await tick();
        await do_wallet();
      }
    }
  };

  function scrollToTop() {
    if (top)
    top.scrollIntoView();
  }

  async function bootstrap() {
    await boot();
    //console.log(await ng.client_info());
    if (!tauri_platform || tauri_platform == "android") {
      if (param.get("re")) {
        registration_error = param.get("re");
        console.error("registration_error", registration_error);
      } else if (
        (param.get("rs") || param.get("i")) &&
        !tauri_platform &&
        !param.get("ab") &&
        !import.meta.env.NG_ENV_NO_REDIRECT
      ) {
        //registration_success = param.get("rs");
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
        wait = false;
        //window.location.replace(window.location.href.split("?")[0]);
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
          wait = false;
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
    if (!invitation) {
      if (pre_invitation) {
        await select_bsp(pre_invitation.V0.url, pre_invitation.V0.name);
      } else if (!registration_error) {
        selectEU(false);
      }
    } else {
      //await do_wallet();
      wait = false;
    }
    scrollToTop();
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
    console.log("do wallet with params", params);
    try {
      ready = await ng.wallet_create(params);
      wallets.set(await ng.get_wallets());
      console.log($wallets);
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
    console.log("select bsp")
    if (!tauri_platform || tauri_platform == "android") {
      wait = $t("pages.wallet_create.redirecting_to_registration_page");
      await tick();
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
      let unsub_register;
      let temp = await ng.open_window(
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
            else registration_error = "You refused the registration";
            unsub_register = undefined;
          } else if (result == "close") {
            console.log("onCloseOfRegistrationWindow");
            wait = false;
            registration_error = "You cancelled the registration";
            unsub_register = undefined;
          }
        }
      );
      console.log("temp",temp)
      if (temp) unsub_register = temp;
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

  const onUsernameKeydown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      username_password_ok(event);
    }
  };
</script>

<CenteredLayout>
  <div class="form-layout" bind:this={top}>
    {#if wait}
      <div class="surface-section status-surface status-info">
        <Typography variant="body1" className="status-message">
          {wait}
        </Typography>
        <Spinner className="status-spinner" />
      </div>
    {:else}
      <div class="row">
        <a href="#/">
          <CircleLogo aria-label={$t("common.logo")} />
        </a>
      </div>
        {#if registration_error}
          <div class="surface-section status-surface status-error">
            <svg
              class="status-icon status-icon--bounce"
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
              <Typography variant="body1" className="status-message">
                {@html $t("pages.user_registered.already_exists")}
              </Typography>
              <a href="#/wallet/login">
                <Button
                  variant="raised"
                  class="mui-button-primary form-button"
                  type="button"
                >
                  <Label>{$t("buttons.login")}</Label>
                </Button>
              </a>
            {:else}
              <Typography variant="body1" className="status-message">
                {@html $t("errors.error_occurred", {
                  values: { message: display_error(registration_error) },
                })}
              </Typography>
              <a href="#/">
                <Button
                  variant="raised"
                  class="mui-button-primary form-button"
                  type="button"
                >
                  <Label>{$t("buttons.back_to_homepage")}</Label>
                </Button>
              </a>
            {/if}
          </div>
        {:else if !username_pass_ok}
          <div class="surface-section">
            {#if registration_success}
              <div class="mui-alert mui-alert-success">
                <Typography variant="subtitle1">
                  {@html $t("pages.wallet_create.registration_success", {
                    values: { broker: registration_success },
                  })}
                </Typography>
              </div>
            {/if}

            <Typography variant="h5">
              {$t("pages.wallet_create.choose_username.title")}
            </Typography>
            <div class="mui-alert mui-alert-warning">
              <Typography variant="body2">
                {@html $t("pages.wallet_create.choose_username.warning")}
              </Typography>
            </div>

            <div class="form-field">
              <Textfield
                variant="outlined"
                bind:value={username}
                label={$t("pages.wallet_create.type_username_placeholder")}
                input$id="username-input"
                input$autocomplete="username"
                input$autofocus={true}
                input$bind:this={username_input}
                class="mui-textfield shaped-outlined"
                input$onkeydown={onUsernameKeydown}
              />
            </div>

            <div class="form-field">
              <PasswordInput
                bind:this={password_input}
                id="password-input"
                label={$t("pages.wallet_create.type_password_placeholder")}
                bind:value={password}
                auto_complete="password"
                on:enter={username_password_ok}
              />
            </div>

            <div class="form-actions form-actions--stack">
              <Button
                variant="raised"
                class="mui-button-primary form-button"
                type="button"
                disabled={!username || !password}
                onclick={() => {
                  username_password_ok(false);
                }}
              >
                <Label>{@html $t("pages.wallet_create.create_wallet_now")}</Label>
              </Button>
            </div>
          </div>
        {:else if !error}
          {#if !ready}
            <div class="surface-section status-surface status-info">
              <Typography variant="body1" className="status-message">
                {$t("pages.wallet_create.creating")}
              </Typography>
              <Spinner className="status-spinner" />
            </div>
          {:else}
            <div class="surface-section status-surface status-success">
              <Typography variant="body1" className="status-message">
                {$t("pages.wallet_create.ready")}
              </Typography>
              <svg
                class="status-icon"
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
        {:else}
          <div class="surface-section status-surface status-error">
            <Typography variant="body1" className="status-message">
              {$t("errors.an_error_occurred")}
            </Typography>
            <svg
              fill="none"
              class="status-icon status-icon--bounce"
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
            <div class="mui-alert mui-alert-error">
              <Typography variant="body2">
                {display_error(error)}
              </Typography>
            </div>
            <div class="form-actions form-actions--stack">
              <Button
                variant="raised"
                class="mui-button-primary form-button"
                type="button"
                onclick={() => {
                  window.location.href = window.location.origin;
                }}
              >
                <Label>{$t("buttons.start_over")}</Label>
              </Button>
            </div>
          </div>
        {/if}
    {/if}
  </div>
</CenteredLayout>

