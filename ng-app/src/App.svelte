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

<script lang="ts">
  // this line is needed to have the SDK working when compiling for a single file bundle (pnpm filebuild)
  // import * as api from "ng-sdk-js";
  import Router from "svelte-spa-router";
  import { onMount, tick } from "svelte";

  import Home from "./routes/Home.svelte";
  import Test from "./routes/Test.svelte";
  import Grid from "./routes/Grid.svelte";
  import URI from "./routes/URI.svelte";
  import NotFound from "./routes/NotFound.svelte";
  import ng from "./api";

  ng.test();

  const routes = new Map();
  routes.set("/", Home);
  routes.set("/test", Test);
  routes.set("/grid", Grid);
  routes.set(/^\/ng(.*)/i, URI);
  routes.set("*", NotFound);
</script>

<main class="">
  <Router {routes} />
</main>
