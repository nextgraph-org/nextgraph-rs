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
  import Create from "./routes/Create.svelte";
  import Delete from "./routes/Delete.svelte";

  import NotFound from "./routes/NotFound.svelte";

  const routes = new Map();
  routes.set("/", Home);
  routes.set("/create", Create);
  routes.set("/delete", Delete);
  routes.set("*", NotFound);
</script>

<main class="">
  <Router {routes} />
</main>

<style>
  main {
    margin: 0 auto;
    padding: 0rem;
    text-align: center;
  }
</style>
