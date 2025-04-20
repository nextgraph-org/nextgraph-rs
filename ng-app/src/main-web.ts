// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import "./app.postcss";
import "./styles.css";
import * as api from "@nextgraph-monorepo/ng-sdk-js";
import App from "./App.svelte";

if (!import.meta.env.TAURI_PLATFORM) {
  // cleaning old wallets :(
  try {
    let version = localStorage.getItem("ng_wallet_version");
    if (!version || version != "0.1.1") {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("ng_wallet_version","0.1.1")
    }
  }
  catch (e) {
    // it is ok to fail. it means access denied for local storage.
  }
}

const app = new App({
  target: document.getElementById("app"),
});

export default app;
