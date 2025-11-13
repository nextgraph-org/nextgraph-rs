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
  import { t } from "svelte-i18n";
  import { onMount } from "svelte";
  import Button, { Label } from "@smui/button";
  import CircularProgress from "@smui/circular-progress";
  import Typography from "./lib/components/Typography.svelte";
  import {
    ArrowLeft,
    CheckCircle,
    ExclamationTriangle,
  } from "svelte-heros-v2";
  import CenteredLayout from "./lib/CenteredLayout.svelte";
  import { display_error, wallet_from_import } from "./store";
  import { push } from "./index";
  import { default as ng } from "../.auth-react/api";

  let top;

  let error;
  let state: "importing" | null = null;
  let textcode: string | undefined = undefined;

  // TODO: Check connectivity to sync service.
  let connected = true;

  const textcode_submit = async () => {
    state = "importing";
    try {
      const imported_wallet = await ng.wallet_import_from_code(textcode);
      wallet_from_import.set(imported_wallet);
      // Login in with imported wallet.
      push("#/wallet/login");
    } catch (e) {
      error = e;
    }
  };

  function scrollToTop() {
    top.scrollIntoView();
  }
  onMount(() => scrollToTop());
</script>

<CenteredLayout>
  <div class="form-layout" bind:this={top}>
    <div class="surface-section">
      <!-- Title -->
      <Typography variant="h4" component="h2" style="margin-bottom: calc(var(--mui-spacing) * 3); margin-top: calc(var(--mui-spacing) * 5);">
        {$t("pages.wallet_login_textcode.title")}
      </Typography>

      <!-- Warning Alert -->
      <div class="mui-alert mui-alert-warning" style="margin-bottom: calc(var(--mui-spacing) * 2);">
        <Typography variant="body2">
          {@html $t("wallet_sync.textcode.usage_warning")}
        </Typography>
      </div>

      <!-- Disconnection Warning -->
      {#if !connected}
        <div class="mui-alert mui-alert-error" style="margin-bottom: calc(var(--mui-spacing) * 2);">
          <Typography variant="body2">
            {@html $t("wallet_sync.offline_warning")}
          </Typography>
        </div>
        <div class="mui-alert mui-alert-info" style="margin-bottom: calc(var(--mui-spacing) * 2);">
          <Typography variant="body2">
            {@html $t("pages.wallet_login.offline_advice")}
          </Typography>
        </div>
      {/if}

      <!-- Notes about TextCode entering -->
      <div style="margin-top: calc(var(--mui-spacing) * 2); margin-bottom: calc(var(--mui-spacing) * 2);">
        <Typography variant="body2" className="text-muted">
          {@html $t("pages.wallet_login_textcode.description")}
          <br />
          {@html $t("wallet_sync.server_transfer_notice")}
        </Typography>
      </div>

      <Typography variant="body1" style="margin-bottom: calc(var(--mui-spacing) * 1);">
        {@html $t("pages.wallet_login_textcode.enter_here")}
      </Typography>

      <!-- TextCode Input -->
      <textarea
        rows="6"
        bind:value={textcode}
        disabled={state === "importing"}
        class="textcode-input"
        placeholder=""
      />

      {#if error}
        <div class="status-surface status-error">
          <ExclamationTriangle class="status-icon status-icon--bounce" />
          <Typography variant="body1" className="status-message">
            {@html $t("errors.error_occurred", {
              values: { message: display_error(error) },
            })}
          </Typography>
        </div>
      {:else if state === "importing"}
        <div class="status-surface status-info">
          <CircularProgress style="height: 48px; width: 48px" indeterminate />
          <Typography variant="body1" className="status-message" style="margin-top: calc(var(--mui-spacing) * 2);">
            {$t("wallet_sync.importing")}
          </Typography>
        </div>
      {/if}

      <!-- Actions -->
      <div class="form-actions form-actions--stack">
        {#if state !== "importing" && !error}
          <Button
            variant="raised"
            class="mui-button-primary form-button"
            onclick={textcode_submit}
            disabled={!connected || !textcode}
          >
            <div class="button-icon">
              <CheckCircle />
            </div>
            <Label>{$t("pages.wallet_login_textcode.import_btn")}</Label>
          </Button>
        {/if}

        <!-- Back Button -->
        <Button
          variant="outlined"
          class="mui-button-outlined form-button"
          onclick={() => push("#/")}
        >
          <div class="button-icon">
            <ArrowLeft />
          </div>
          <Label>{$t("buttons.back")}</Label>
        </Button>
      </div>
    </div>
  </div>
</CenteredLayout>

<style>
  .textcode-input {
    resize: vertical;
    display: block;
    padding: calc(var(--mui-spacing) * 1.5);
      padding-left: 30px;
    margin: calc(var(--mui-spacing) * 2) 0;
    font-size: var(--mui-typography-body2-fontSize);
    line-height: var(--mui-typography-body2-lineHeight);
    color: var(--mui-palette-text-primary);
    background-color: var(--mui-palette-background-default);
    border: 1px solid var(--mui-palette-divider);
    border-radius: var(--textfield-border-radius);
    font-family: var(--mui-typography-fontFamily);
    transition: border-color 0.2s ease;
  }

  .textcode-input:focus {
    outline: none;
    border-color: var(--mui-palette-primary-main);
  }

  .textcode-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
