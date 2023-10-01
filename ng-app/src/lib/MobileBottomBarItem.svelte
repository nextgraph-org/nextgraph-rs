<script lang="ts">
  import { getContext } from "svelte";
  import type { ComponentType } from "svelte";
  import { Icon } from "svelte-heros-v2";

  export let href: string = "";
  export let icon: ComponentType;

  const activeUrlStore = getContext("activeUrl") as {
    subscribe: (callback: (value: string) => void) => void;
  };

  let sidebarUrl = "";
  activeUrlStore.subscribe((value) => {
    sidebarUrl = value;
  });

  $: active = sidebarUrl ? href === sidebarUrl : false;
</script>

<a {href} class="flex items-center" on:click>
  <Icon
    tabindex="-1"
    color="black"
    variation={active ? "solid" : "outline"}
    class="w-7 h-7 text-black transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white focus:outline-none"
    {icon}
  />
  <slot />
</a>
