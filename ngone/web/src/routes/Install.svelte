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
  import Install from "../../../../ng-app/src/lib/Install.svelte";
  import { push } from "svelte-spa-router";
  import { onMount, onDestroy } from "svelte";

  let display_has_wallets_warning = false;
  let unsubscribe;
  onMount(() => {});

  onDestroy(() => {
    //unsubscribe();
  });
</script>

<Install {display_has_wallets_warning} />
