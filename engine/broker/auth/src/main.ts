// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import "./app.postcss";
import "../../../../app/ui-common/src/styles.css";
import App from "./App.svelte";
import web_api from "@ng-org/api-web";
import {init_api} from "@ng-org/ui-common/api";
init_api(web_api);

import { select_default_lang } from "@ng-org/ui-common/lang";
select_default_lang(()=>{return window.navigator.languages;}).then(() => {});

const app = new App({
  target: document.getElementById("app"),
});

export default app;