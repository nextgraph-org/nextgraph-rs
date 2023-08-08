<!--
// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->
<script>
  import Router from "svelte-spa-router";
  import { onMount, tick } from "svelte";

  import Home from "./routes/Home.svelte";
  import WalletCreate from "./routes/WalletCreate.svelte";
  import Install from "./routes/Install.svelte";

  //import URI from "./routes/URI.svelte";
  import NotFound from "./routes/NotFound.svelte";

  const routes = new Map();
  routes.set("/", Home);
  routes.set("/wallet/create", WalletCreate);
  routes.set("/install", Install);
  //routes.set(/^\/ng(.*)/i, URI);
  routes.set("*", NotFound);
</script>

<main class="">
  <Router {routes} />
</main>
