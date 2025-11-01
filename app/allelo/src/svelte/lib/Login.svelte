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
    import { onMount, createEventDispatcher, tick } from "svelte";
    import { t } from "svelte-i18n";
    import {
        default as ng,
    } from "../../.auth-react/api";

    import {
        XCircle,
        ArrowPath,
        LockOpen,
        CheckCircle,
        ArrowLeft,
    } from "svelte-heros-v2";
    import PasswordInput from "./components/PasswordInput.svelte";
    import Typography from "./components/Typography.svelte";
    import Textfield from "@smui/textfield";
    import CircularProgress from '@smui/circular-progress';
    import Button, { Label, Icon } from "@smui/button";
    import Switch from "@smui/switch";
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
                    await ng.wallet_open_with_password(wallet, password);
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

  const trustLabelId = "login-trust-label";

    function cancel() {
        dispatch("cancel");
    }

    function start_with_password(event?: Event) {
        event?.preventDefault?.();
        error = undefined;
        unlockWith = "password";
        step = "password";
        password = "";
        scrollToTop();
    }


    function go_back() {
        if (step === "password") {
            init_simple();
        }
    }
</script>

<div
    class="form-layout"
    bind:this={top}
>
  {#if step == "import"}
    <div class="surface-section">
      {#if no_local_storage}
        <div class="mui-alert mui-alert-warning">
          <Typography variant="body1">
            Access to local storage is denied. <br />
            You won't be able to save your wallet in this browser.<br />
            If you wanted to save it, please allow storing local data<br />
            for the websites {location.origin} <br />
            and https://nextgraph.net and then reload the page.
          </Typography>
        </div>
      {:else}
        <Typography variant="h6" className="form-section-title">
          {$t("pages.wallet_create.save_wallet_options.trust")}
        </Typography>
        <Typography variant="body2" className="text-muted">
          {$t("pages.wallet_create.save_wallet_options.trust_description")}
          {#if !tauri_platform}
            {$t("pages.login.trust_device_allow_cookies")}
          {/if}
        </Typography>
        <div class="toggle-row">
          <Switch
            bind:checked={trusted}
            aria-labelledby={trustLabelId}
            class="toggle-control"
          />
          <Typography id={trustLabelId} variant="body2">
            {$t("pages.login.trust_device_yes")}
          </Typography>
        </div>
        {#if trusted}
          <div class="form-field">
            <Textfield
              variant="outlined"
              bind:value={device_name}
              label={$t("pages.login.device_name_label")}
              input$id="device-name-input"
              input$type="text"
              input$autocomplete="off"
              class="mui-textfield shaped-outlined"
            />
          </div>
        {/if}
      {/if}

      <div class="form-actions form-actions--stack">
        <Button
          type="button"
          variant="raised"
          class="mui-button-primary form-button"
          onclick={start_with_password}
        >
          <Icon class="button-icon">
            <LockOpen tabindex="-1" aria-hidden="true" />
          </Icon>
          <Label>{$t("pages.login.open")}</Label>
        </Button>

        <Button
          type="button"
          variant="outlined"
          class="mui-button-outlined form-button"
          onclick={cancel}
        >
          <Icon class="button-icon">
            <ArrowLeft tabindex="-1" aria-hidden="true" />
          </Icon>
          <Label>{$t("pages.login.login_cancel")}</Label>
        </Button>
      </div>
    </div>
  {:else if step == "password"}
    <div class="surface-section">
      <PasswordInput
        id="password-input"
        bind:value={password}
        label={$t("pages.login.enter_password")}
        auto_complete="password"
        autofocus={true}
        on:enter={finish}
      />
      <div class="form-actions">
        <Button
          type="button"
          variant="outlined"
          class="mui-button-error-outlined form-button"
          onclick={cancel}
        >
          <Icon class="button-icon">
            <XCircle tabindex="-1" aria-hidden="true" />
          </Icon>
          <Label>{$t("buttons.cancel")}</Label>
        </Button>
        <Button
          type="button"
          variant="raised"
          class="mui-button-primary form-button"
          onclick={finish}
          disabled={password.trim().length < 2}
        >
          <Icon class="button-icon">
            <CheckCircle tabindex="-1" aria-hidden="true" />
          </Icon>
          <Label>{$t("buttons.confirm")}</Label>
        </Button>
      </div>
    </div>

    <!-- The following steps have navigation buttons and fixed layout -->
  {:else if step == "opening"}
    <div class="surface-section status-surface status-info">
      <Typography variant="body1" className="status-message">
        {@html $t("pages.login.opening_wallet")}
      </Typography>
      <CircularProgress style="align-self: center;height: 32px; width: 32px" indeterminate/>
    </div>
  {:else if step == "end"}
    {#if error}
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
        <div class="form-actions form-actions--space-between">
          <Button
            type="button"
            variant="outlined"
            class="mui-button-error-outlined form-button"
            onclick={cancel}
          >
            <Icon class="button-icon">
              <XCircle tabindex="-1" aria-hidden="true" />
            </Icon>
            <Label>{$t("buttons.cancel")}</Label>
          </Button>
          <Button
            type="button"
            variant="raised"
            class="mui-button-primary form-button"
            onclick={init_simple}
          >
            <Icon class="button-icon">
              <ArrowPath tabindex="-1" aria-hidden="true" />
            </Icon>
            <Label>{$t("buttons.try_again")}</Label>
          </Button>
        </div>
      </div>
    {:else}
      <div class="surface-section status-surface status-success">
        <Typography variant="body1" className="status-message">
          {@html $t("pages.login.wallet_opened")}
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
  {/if}
</div>

<style>

</style>
