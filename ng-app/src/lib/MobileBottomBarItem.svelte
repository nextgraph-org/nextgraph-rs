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
  import { getContext } from "svelte";
  import type { ComponentType } from "svelte";
  import { Icon } from "svelte-heros-v2";
  import { onMount, onDestroy, tick } from "svelte";

  export let href: string = "";
  export let icon: ComponentType;

  const activeUrlStore = getContext("activeUrl") as {
    subscribe: (callback: (value: string) => void) => void;
  };

  let sidebarUrl = "";
  let unsub;
  onMount( () => {
    unsub = activeUrlStore.subscribe((value) => {
      sidebarUrl = value;
    });
  });
  onDestroy( () => {
    if (unsub) unsub();
  });

  $: active = sidebarUrl ? href === sidebarUrl : false;
</script>

<a {href} class="flex items-center">
  <Icon
    tabindex="-1"
    color="black"
    variation={active ? "solid" : "outline"}
    class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white focus:outline-none"
    {icon}
  />
  <slot />
</a>
