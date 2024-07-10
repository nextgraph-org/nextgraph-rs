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
  Home page to display for logged in users.
  Redirects to no-wallet or login page, if not logged in.
-->

<script>
  import { onMount, onDestroy } from "svelte";
  import {
    wallet_import_qrcode
  } from "../store";

  let tauri_platform = import.meta.env.TAURI_PLATFORM;
  let mobile = tauri_platform == "android" || tauri_platform == "ios";
  
  onMount(async () => {
    //TODO: here we should also take into account the case of a webapp with camera feature, and sue the lib https://www.npmjs.com/package/html5-qrcode
    if (mobile) {
      const scanner = await import("@tauri-apps/plugin-barcode-scanner");
      let perms = await scanner.requestPermissions();
      console.log(perms);
      wallet_import_qrcode.set("");
      let result = await scanner.scan({ windowed: false, cameraDirection: "back", formats: [scanner.Format.QRCode] })
      console.log(result)
      wallet_import_qrcode.set(result.content);
      window.history.go(-1);
    }
  });

  onDestroy(async () => {
    if (mobile) {
      const scanner = await import("@tauri-apps/plugin-barcode-scanner");
      await scanner.cancel();
    }
  });
</script>

<div class="text-center">
  <!-- please translate this too. i didnt want to do it to avoid a merge conflict-->
  Scanning the QRcode
</div>