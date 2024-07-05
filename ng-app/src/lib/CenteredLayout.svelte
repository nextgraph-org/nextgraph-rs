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

<script lang="ts">
  import ng from "../api";
  import { onMount } from "svelte";

  let locales = [];
  onMount(async () => {
    locales = await ng.locales();
  });
</script>

<div class="centered">
  {#each locales as loc}
    {loc}&nbsp;
  {/each}
  <slot />
</div>

<style>
  .centered {
    /*max-width: 1280px;*/
    margin: 0 auto;
    padding: 0rem;
    text-align: center;
    width: fit-content;
  }
</style>
