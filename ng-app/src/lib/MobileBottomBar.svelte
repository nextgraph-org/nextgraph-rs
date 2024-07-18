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
  import { setContext } from "svelte";
  import { writable } from "svelte/store";

  export let activeUrl: string = "";

  const activeUrlStore = writable("");

  $: {
    activeUrlStore.set(activeUrl);
  }
  setContext("activeUrl", activeUrlStore);
</script>

<nav
  style="background-color: #f6f6f6;" class="border-t border-solid border-gray-200  text-gray-700 dark:text-gray-200 dark:border-gray-700 divide-gray-100 dark:divide-gray-700 px-2 sm:px-4 py-2.5 w-full fixed bottom-0 left-0 z-20"
>
  <div
    class="mx-auto flex flex-wrap justify-between items-center w-full px-2 xxs:px-8 xs:px-10"
  >
    <slot />
  </div>
</nav>
