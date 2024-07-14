<!--
// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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
  import { scanned_qr_code } from "../store";
  import { ArrowLeft } from "svelte-heros-v2";
  import { Spinner } from "flowbite-svelte";

  let tauri_platform = import.meta.env.TAURI_PLATFORM;
  let mobile = tauri_platform == "android" || tauri_platform == "ios";

  let webScanner;
  let nativeScanner;

  function on_qr_scanned(content) {
    scanned_qr_code.set(content);
    window.history.go(-1);
  }

  onMount(async () => {
    if (mobile) {
      // Load Native Scanner
      nativeScanner = await import("@tauri-apps/plugin-barcode-scanner");

      let perms = await nativeScanner.requestPermissions();
      console.log(perms);
      scanned_qr_code.set("");
      let result = await nativeScanner.scan({
        windowed: false,
        cameraDirection: "back",
        formats: [nativeScanner.Format.QRCode],
      });
      console.log(result);
      on_qr_scanned(result.content);
    } else {
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
        webScanner.start({ facingMode: { exact: "environment"} }, { fps: 10, qrbox: { width: 300, height: 300 }, formatsToSupport: [0] }, (decoded_text, decoded_result) => {
          //console.log(decoded_result);
          // Handle scan result
          on_qr_scanned(decoded_text);
        });
      } catch (e) {
        webScanner = new Html5Qrcode ("scanner-div");
        webScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 300, height: 300 }, formatsToSupport: [0] }, (decoded_text, decoded_result) => {
          //console.log(decoded_result);
          // Handle scan result
          on_qr_scanned(decoded_text);
        });
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

    }
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
    if (mobile) {
      if (nativeScanner) await nativeScanner.cancel();
    } else {
      if (webScanner) webScanner.stop();
    }
  });
</script>

<div class="text-center max-w-4xl mx-auto">
  <div>
    <h2 class="text-xl mb-6">{$t("pages.scan_qr.scanning")}</h2>
  </div>
  <Spinner />
  <!-- Web Scanner -->
  <div id="scanner-div"></div>

  <div class="mx-auto max-w-xs">
    <button
      on:click={() => window.history.go(-1)}
      class="mt-8 w-full text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
      ><ArrowLeft
        tabindex="-1"
        class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
      />{$t("buttons.back")}</button
    >
  </div>
</div>
