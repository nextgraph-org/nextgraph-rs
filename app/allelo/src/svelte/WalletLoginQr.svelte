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
  import Button, { Label } from "@smui/button";
  import CircularProgress from "@smui/circular-progress";
  import Typography from "./lib/components/Typography.svelte";
  import {
    ArrowLeft,
    Camera,
    ExclamationTriangle,
    QrCode,
  } from "svelte-heros-v2";
  import { onDestroy, onMount } from "svelte";
  import CenteredLayout from "./lib/CenteredLayout.svelte";
  import {
    wallet_from_import,
    scanned_qr_code,
    display_error,
    check_has_camera,
    redirect_after_scanned_qr_code,
    boot
  } from "./store";
  import { default as ng } from "../.auth-react/api";
  import { push } from "./index";

  // <a href="/scanqr" use:link>

  let top: HTMLElement;

  const set_online = () => {
    connected = true;
  };
  const set_offline = () => {
    connected = false;
  };

  let login_method: "scan" | "gen" | undefined = undefined;

  let error;
  let connected = true;

  let scan_state: "before_start" | "importing" = "before_start";

  let gen_state: "before_start" | "generating" | "generated" = "before_start";
  let qr_code_html: string | undefined = undefined;
  let rendezvous_code;

  const open_scanner = () => {
    redirect_after_scanned_qr_code.set("#/wallet/login-qr");
    push("#/scanqr");
  };

  async function on_qr_scanned(code) {
    login_method = "scan";
    scan_state = "importing";
    try {
      const imported_wallet = await ng.wallet_import_from_code(code);
      wallet_from_import.set(imported_wallet);
      // Login in with imported wallet.
      push("#/wallet/login");
    } catch (e) {
      scanned_qr_code.set("");
      error = e;
    }
  }

  async function generate_qr() {
    gen_state = "generating";
    try {
      const [qr_code_el, code] = await ng.wallet_import_rendezvous(
        top.clientWidth
      );
      rendezvous_code = code;
      qr_code_html = qr_code_el;
      gen_state = "generated";
      const imported_wallet = await ng.wallet_import_from_code(code);
      // Login with imported wallet.
      wallet_from_import.set(imported_wallet);
      push("#/wallet/login");
    } catch (e) {
      error = e;
    }
  }

  function scrollToTop() {
    top.scrollIntoView();
  }

  onMount(async () => {
    await boot();
    connected = window.navigator.onLine;
    window.addEventListener("offline", set_offline);
    window.addEventListener("online", set_online);
    // Handle return from QR scanner.
    if ($scanned_qr_code) {
      on_qr_scanned($scanned_qr_code);
      scanned_qr_code.set("");
    } else {
      // Or check, if a camera exists and offer scanner or QR generator, respectively.
      login_method = (await check_has_camera()) ? "scan" : "gen";
    }
    scrollToTop();
  });
  onDestroy(() => {
    window.removeEventListener("offline", set_offline);
    window.removeEventListener("online", set_online);
    if (rendezvous_code) {
      // TODO: Destroy
    }
  });
</script>

<CenteredLayout>
  <div class="form-layout" bind:this={top}>
    <div class="surface-section">
      <!-- Title -->
      <Typography variant="h4" component="h2" style="margin-bottom: calc(var(--mui-spacing) * 3); margin-top: calc(var(--mui-spacing) * 5);">
        {$t("pages.wallet_login_qr.title")}
      </Typography>

      <!-- Checking, if camera is available... -->
      {#if login_method === undefined}
        <div class="status-surface status-info">
          <CircularProgress style="height: 48px; width: 48px" indeterminate />
        </div>
      {:else if !connected}
        <!-- Warning, if offline -->
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
      {:else if error}
        <div class="status-surface status-error">
          <ExclamationTriangle class="status-icon status-icon--bounce" />
          <Typography variant="body1" className="status-message">
            {@html $t("errors.error_occurred", {
              values: { message: display_error(error) },
            })}
          </Typography>
        </div>
      {:else if login_method === "scan"}
        {#if scan_state === "before_start"}
          <!-- Scan Mode -->
          <!-- Notes about QR -->
          <div style="margin-bottom: calc(var(--mui-spacing) * 2);">
            <Typography variant="body2" className="text-muted">
              {@html $t("pages.wallet_login_qr.scan.description")}
              <br />
              {@html $t("wallet_sync.server_transfer_notice")}
            </Typography>
          </div>
        {:else if scan_state === "importing"}
          <div class="status-surface status-info">
            <CircularProgress style="height: 48px; width: 48px" indeterminate />
            <Typography variant="body1" className="status-message" style="margin-top: calc(var(--mui-spacing) * 2);">
              {@html $t("wallet_sync.importing")}
            </Typography>
          </div>
        {/if}
      {:else if login_method === "gen"}
        <!-- Generate QR Code to log in with another device -->
        {#if gen_state == "before_start"}
          <!-- Notes about QR Generation -->
          <div style="margin-bottom: calc(var(--mui-spacing) * 2);">
            <Typography variant="body2" className="text-muted">
              {@html $t("pages.wallet_login_qr.gen.description")}
              {@html $t("wallet_sync.no_camera_alternatives")}
              <br /><br />
              {@html $t("pages.wallet_login_qr.gen.letsgo")}
              <br /><br />
              {@html $t("wallet_sync.server_transfer_notice")}
            </Typography>
          </div>
        {:else if gen_state === "generating"}
          <div class="status-surface status-info">
            <CircularProgress style="height: 48px; width: 48px" indeterminate />
          </div>
        {:else if gen_state === "generated"}
          <!-- Notes about generated QR -->
          <Typography variant="body1" align="center" style="margin-bottom: calc(var(--mui-spacing) * 2);">
            {@html $t("pages.wallet_login_qr.gen.generated")}
          </Typography>

          <!-- Generated QR Code -->
          <div class="qr-code-container">
            {@html qr_code_html}
          </div>
        {/if}
      {/if}

      <!-- Actions -->
      <div class="form-actions form-actions--stack">
        {#if login_method === "scan" && scan_state === "before_start"}
          <!-- Open Scanner Button-->
          <Button
            variant="raised"
            class="mui-button-primary form-button"
            onclick={open_scanner}
          >
            <div class="button-icon">
              <Camera />
            </div>
            <Label>{$t("buttons.scan_qr")}</Label>
          </Button>
        {:else if login_method === "gen" && gen_state === "before_start"}
          <!-- Generate QR Button -->
          <Button
            variant="raised"
            class="mui-button-primary form-button"
            disabled={!connected}
            onclick={generate_qr}
          >
            <div class="button-icon">
              <QrCode />
            </div>
            <Label>{$t("pages.wallet_login_qr.gen.button")}</Label>
          </Button>
        {/if}

        <!-- Go Back -->
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
  .qr-code-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: calc(var(--mui-spacing) * 2) auto;
  }
</style>
