<script lang="ts">
  export let value: string = "";
  export let id: string;

  let has_success: boolean = false;

  const tauri_platform = import.meta.env.TAURI_PLATFORM;
  const setClipboard = async (text: string) => {
    if (tauri_platform) {
      // TODO: this won't work for tauri platform.
      // const { writeText } = await import("@tauri-apps/api/clipboard");
      // await writeText(text);
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const on_click = (e) => {
    has_success = true;
    setTimeout(() => (has_success = false), 2_000);
    setClipboard(value);
  };
</script>

<div class="w-full mt-2">
  <div class="relative">
    <textarea
      {id}
      rows="3"
      style="resize: none;"
      {value}
      class="col-span-6 pr-11 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
      disabled
      readonly
    />
    {#if !tauri_platform}
      <button
        on:click={on_click}
        class="absolute inset-y-0 right-0 p-3 flex items-center text-sm leading-5 bg-transparent shadow-none"
      >
        <span id="default-icon" class:hidden={has_success}>
          <svg
            class="w-3.5 h-3.5"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 18 20"
          >
            <path
              d="M16 1h-3.278A1.992 1.992 0 0 0 11 0H7a1.993 1.993 0 0 0-1.722 1H2a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2Zm-3 14H5a1 1 0 0 1 0-2h8a1 1 0 0 1 0 2Zm0-4H5a1 1 0 0 1 0-2h8a1 1 0 1 1 0 2Zm0-5H5a1 1 0 0 1 0-2h2V2h4v2h2a1 1 0 1 1 0 2Z"
            />
          </svg>
        </span>
        <span
          id="success-icon"
          class="inline-flex items-center"
          class:hidden={!has_success}
        >
          <svg
            class="w-3.5 h-3.5 text-blue-700 dark:text-blue-500"
            aria-hidden={!has_success}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 16 12"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M1 5.917 5.724 10.5 15 1.5"
            />
          </svg>
        </span>
      </button>
    {/if}
  </div>
</div>
