// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import * as web_api from "@ng-org/lib-wasm";
import {init_api} from "@ng-org/ui-common/api";
init_api(web_api);

const NEW_VERSION = "0.1.2-alpha.1";

// cleaning old wallets :(
try {
  let version = localStorage.getItem("ng_wallet_version");
  if (!version || version != NEW_VERSION) {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("ng_wallet_version",NEW_VERSION)
  }
}
catch (e) {
  // it is ok to fail. it means access denied for local storage.
}

import { mount } from "svelte";
import App from "./App.svelte";

const app = mount(App, { target: document.getElementById("app") as Element });

export default app;
