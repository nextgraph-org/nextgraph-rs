<script lang="ts">
  import { t } from "svelte-i18n";
  import { Alert, Modal, Spinner } from "flowbite-svelte";
  import {
    ArrowLeft,
    ArrowRightCircle,
    Camera,
    CheckBadge,
    QrCode,
  } from "svelte-heros-v2";
  import CenteredLayout from "../lib/CenteredLayout.svelte";
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { online, scanned_qr_code } from "../store";

  let top;

  let gen_state:
    | "before_start"
    | "generating"
    | "generated"
    | "success"
    | Error = "before_start";
  let textcode: string | undefined = undefined;

  // TODO: Check connectivity to sync service.
  let connected = true;

  const textcode_submit = () => {
    scanned_qr_code.set(textcode);
    window.history.go(-1);
  };
</script>

<CenteredLayout>
  <div class="container3" bind:this={top}>
    <div
      class="flex flex-col justify-center max-w-md mx-6 mb-20 bg-gray-60 overflow-y-auto py-4 dark:bg-gray-800"
    >
      <!-- Title -->
      <div>
        <h2 class="text-xl mb-6">{$t("pages.wallet_login_textcode.title")}</h2>
      </div>

      <div class="text-left">
        <Alert color="yellow">
          {@html $t("wallet_sync.textcode.usage_warning")}
        </Alert>
      </div>

      <!-- Disconnection Warning -->
      {#if !connected}
        <div class="text-left my-4">
          <Alert color="red">
            {@html $t("wallet_sync.offline_warning")}
          </Alert>
        </div>
      {/if}

      <!-- Notes about TextCode entering -->
      <div class="text-left text-sm mb-4">
        {@html $t("pages.wallet_login_textcode.description")}
        <br />
        {@html $t("wallet_sync.transfer_notice")}
      </div>

      <!-- TextCode Input -->
      <textarea
        rows="6"
        bind:value={textcode}
        class="col-span-6 pr-11 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
      />

      <div class="mx-auto">
        <!-- Submit Button-->
        <div class="my-4 mx-1">
          <button
            class="mt-4 w-full text-white bg-primary-700 disabled:bg-primary-700/50 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            on:click={textcode_submit}
            disabled={!connected || !textcode}
          >
            <ArrowRightCircle
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
            />
            {$t("pages.wallet_login_textcode.login_btn")}
          </button>

          <!-- Back Button -->
          <button
            on:click={() => window.history.go(-1)}
            class="mt-8 w-full text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            ><ArrowLeft
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
            />{$t("buttons.back")}</button
          >
        </div>
      </div>
    </div>
  </div>
</CenteredLayout>
