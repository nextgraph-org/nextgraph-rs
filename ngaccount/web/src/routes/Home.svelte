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
  import { Button } from "flowbite-svelte";
  import { link } from "svelte-spa-router";

  import { onMount } from "svelte";

  const api_url = import.meta.env.PROD
    ? "api/v1/"
    : "http://localhost:3030/api/v1/";

  async function bootstrap() {}

  onMount(() => bootstrap());
</script>

<div />
