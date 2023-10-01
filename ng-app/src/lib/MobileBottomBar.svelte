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
  class="border-t border-solid border-gray-200 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 dark:border-gray-700 divide-gray-100 dark:divide-gray-700 px-2 sm:px-4 py-2.5 w-full fixed bottom-0 left-0 z-20"
>
  <div
    class="mx-auto flex flex-wrap justify-between items-center w-full px-2 xxs:px-8 xs:px-10"
  >
    <slot />
  </div>
</nav>
