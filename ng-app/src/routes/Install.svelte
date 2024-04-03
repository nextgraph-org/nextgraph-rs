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

<script type="ts">
  import { Button } from "flowbite-svelte";
  import { link } from "svelte-spa-router";
  import Install from "../lib/Install.svelte";
  import { push } from "svelte-spa-router";
  import { onMount, onDestroy } from "svelte";
  import CenteredLayout from "../lib/CenteredLayout.svelte";
  import { has_wallets } from "../store";

  let display_has_wallets_warning: boolean = $has_wallets != 0;
  let unsubscribe;
  onMount(() => {});

  onDestroy(() => {
    unsubscribe();
  });
</script>

<CenteredLayout>
  <Install {display_has_wallets_warning} />
</CenteredLayout>
