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
  QR Scanner Component and Route
-->

<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { t } from "svelte-i18n";
  import { scanned_qr_code, redirect_after_scanned_qr_code } from "./store";
  import { ArrowLeft, ExclamationTriangle } from "svelte-heros-v2";
  import CircularProgress from "@smui/circular-progress";
  import Button, { Label } from "@smui/button";
  import Typography from "./lib/components/Typography.svelte";
  import { push } from "./index";

  let webScanner;
  let error = false;

  function on_qr_scanned(content) {
    scanned_qr_code.set(content);
    webScanner.stop();
    push($redirect_after_scanned_qr_code);
    //window.history.go(-1);
  }

  onMount(async () => {
      // Load Web Scanner
      const { Html5QrcodeScanner, Html5Qrcode } = await import("html5-qrcode");
      // Init scanner object
      // webScanner = new Html5QrcodeScanner(
      //   "scanner-div",
      //   { fps: 10, qrbox: { width: 300, height: 300 }, formatsToSupport: [0] },
      //   false
      // );
      try {
        webScanner = new Html5Qrcode ("scanner-div");
        await webScanner.start({ facingMode: { exact: "environment"} }, { fps: 10, qrbox: { width: 300, height: 300 }, formatsToSupport: [0] }, (decoded_text, decoded_result) => {
          //console.log(decoded_result);
          // Handle scan result
          on_qr_scanned(decoded_text);
        });
      } catch (e) {
        try {
          webScanner = new Html5Qrcode ("scanner-div");
          await webScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 300, height: 300 }, formatsToSupport: [0] }, (decoded_text, decoded_result) => {
            //console.log(decoded_result);
            // Handle scan result
            on_qr_scanned(decoded_text);
          });
        } catch (e) {
          webScanner = null;
          error = true;
        }
      }

      // // Add scanner to Screen.
      // webScanner.render((decoded_text, decoded_result) => {
      //   //console.log(decoded_result);
      //   // Handle scan result
      //   on_qr_scanned(decoded_text);
      // }, (error) => {
      //   //console.error(error);
      // });

      // Auto-Request camera permissions (there's no native way, unfortunately...)
      // setTimeout(() => {
      //   // Auto-start by clicking button
      //   document
      //     .getElementById("html5-qrcode-button-camera-permission")
      //     ?.click();
      // }, 100);

      // setTimeout(check_ready_and_start, 1000);

    
  });

  // const check_ready_and_start = () => {
  //       // Auto-start by clicking button
  //       let start_btn = document
  //         .getElementById("html5-qrcode-button-camera-start");
  //       if (start_btn) {
  //         start_btn.click();
  //       } else {
  //         setTimeout(check_ready_and_start, 1000);
  //       }
  //     };

  onDestroy(async () => {

    if (webScanner) webScanner.stop();
    
  });
</script>

<div class="scanner-container">
  <div class="scanner-header">
    <Typography variant="h5" component="h2">
      {$t("pages.scan_qr.scanning")}
    </Typography>
  </div>

  {#if !error}
    <div class="scanner-loading">
      <CircularProgress style="height: 48px; width: 48px" indeterminate />
    </div>
  {/if}

  <!-- Web Scanner -->
  <div id="scanner-div" class="scanner-viewport"></div>

  {#if error}
    <div class="scanner-error">
      <ExclamationTriangle class="error-icon" />
      <Typography variant="body1" className="error-message">
        {@html $t("errors.camera_unavailable")}
      </Typography>
    </div>
  {/if}

  <div class="scanner-actions">
    <Button
      variant="outlined"
      class="mui-button-outlined form-button"
      onclick={() => {webScanner.stop(); push($redirect_after_scanned_qr_code)}}
    >
      <div class="button-icon">
        <ArrowLeft />
      </div>
      <Label>{$t("buttons.back")}</Label>
    </Button>
  </div>
</div>

<style>
  .scanner-container {
    max-width: 896px;
    margin: 0 auto;
    text-align: center;
    padding: calc(var(--mui-spacing) * 2);
  }

  .scanner-header {
    margin-bottom: calc(var(--mui-spacing) * 3);
  }

  .scanner-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: calc(var(--mui-spacing) * 4) 0;
  }

  .scanner-viewport {
    margin: 0 auto;
    max-width: 100%;
  }

  /* Style the html5-qrcode scanner elements */
  :global(#scanner-div) {
    border-radius: var(--button-border-radius);
    overflow: hidden;
  }

  :global(#scanner-div video) {
    border-radius: var(--button-border-radius);
    max-width: 100%;
  }

  :global(#scanner-div canvas) {
    border-radius: var(--button-border-radius);
  }

  .scanner-error {
    max-width: 1152px;
    margin: 0 auto;
    padding: calc(var(--mui-spacing) * 4) calc(var(--mui-spacing) * 2);
    color: var(--mui-palette-error-main);
  }

  @media (min-width: 1024px) {
    .scanner-error {
      padding-left: calc(var(--mui-spacing) * 4);
      padding-right: calc(var(--mui-spacing) * 4);
    }
  }

  .error-icon {
    animation: bounce 1s infinite;
    margin: calc(var(--mui-spacing) * 5) auto calc(var(--mui-spacing) * 2);
    height: 64px;
    width: 64px;
    display: block;
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(-25%);
      animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
    }
    50% {
      transform: translateY(0);
      animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
    }
  }

  .error-message {
    margin-top: calc(var(--mui-spacing) * 2);
  }

  .scanner-actions {
    margin: calc(var(--mui-spacing) * 4) auto 0;
    max-width: 320px;
  }

  .scanner-actions :global(.form-button) {
    width: 100%;
  }
</style>
