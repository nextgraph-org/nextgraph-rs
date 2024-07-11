<script lang="ts">
  import { t } from "svelte-i18n";
  import { Alert, Modal, Spinner } from "flowbite-svelte";
  import { ArrowLeft, Camera, QrCode } from "svelte-heros-v2";
  import { onDestroy, onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import CenteredLayout from "../lib/CenteredLayout.svelte";
  import { wallet_from_import, scanned_qr_code, display_error } from "../store";
  import ng from "../api";

  // <a href="/wallet/scanqr" use:link>

  let top: HTMLElement;
  const tauri_platform: string | undefined = import.meta.env.TAURI_PLATFORM;
  const use_native_cam =
    tauri_platform === "ios" || tauri_platform === "android";
  // TODO: Check connectivity to sync service.
  let connected = true;
  let has_camera: boolean | "checking" = "checking";
  let login_method: "scan" | "gen" | undefined = undefined;

  let error;

  let scan_state: "before_start" | "importing" = "before_start";

  let gen_state: "before_start" | "generating" | "generated" = "before_start";
  let qr_code_html: string | undefined = undefined;
  let rendezvous_code;

  const open_scanner = () => {
    push("#/wallet/scanqr");
  };

  const check_has_camera = async () => {
    if (!use_native_cam) {
      // If there is a camera, go to scan mode, else gen mode.
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        has_camera =
          devices.filter((device) => device.kind === "videoinput").length > 0;
      } catch {
        has_camera = false;
      }
      has_camera = false;
      login_method = has_camera ? "scan" : "gen";
    } else {
      // TODO: There does not seem to be an API for checking, if the native device
      //  really supports cameras, as far as I can tell?
      // https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/barcode-scanner/guest-js/index.ts
      has_camera = true;
    }
  };

  async function on_qr_scanned(code) {
    login_method = "scan";
    scan_state = "importing";
    try {
      const imported_wallet = await ng.wallet_import_from_code(code);
      wallet_from_import.set(imported_wallet);
      // Login in with imported wallet.
      push("#/wallet/login");
    } catch (e) {
      error = e;
    }
  }

  async function generate_qr() {
    gen_state = "generating";
    try {
      const [qr_code_el, code] = await ng.wallet_import_rendezvous(
        top.clientWidth
      );
      rendezvous_code = code;
      qr_code_html = qr_code_el;
      gen_state = "generated";
      const imported_wallet = await ng.wallet_import_from_code(code);
      // Login with imported wallet.
      wallet_from_import.set(imported_wallet);
      push("#/wallet/login");
    } catch (e) {
      error = e;
    }
  }

  function scrollToTop() {
    top.scrollIntoView();
  }

  onMount(() => {
    // Handle return from QR scanner.
    if ($scanned_qr_code) {
      on_qr_scanned($scanned_qr_code);
      scanned_qr_code.set("");
    } else {
      // Or check, if a camera exists and offer scanner or QR generator, respectively.
      check_has_camera();
    }
    scrollToTop();
  });
  onDestroy(() => {
    if (rendezvous_code) {
      // TODO: Destroy
    }
  });
</script>

<CenteredLayout>
  <div class="container3" bind:this={top}>
    <div
      class="flex flex-col justify-center max-w-md mx-6 mb-20 bg-gray-60 overflow-y-auto py-4 dark:bg-gray-800"
    >
      <!-- Title -->
      <div>
        <h2 class="text-xl mb-6">{$t("pages.wallet_login_qr.title")}</h2>
      </div>

      <!-- Checking, if camera is available... -->
      {#if login_method === undefined}
        <div><Spinner /></div>
      {:else if !connected}
        <!-- Warning, if offline -->
        <!-- TODO: just use $online from store to know if it is online -->
        <!-- @Niko isnt online only true, when logged in and connected to a broker? -->
        <div class="text-left">
          <Alert color="red">
            {@html $t("wallet_sync.offline_warning")}
          </Alert>
        </div>
      {:else if error}
        <Alert color="red">
          {@html $t("wallet_sync.error", {
            values: { error: display_error(error) },
          })}
        </Alert>
      {:else if login_method === "scan"}
        {#if scan_state === "before_start"}
          <!-- Scan Mode -->
          <!-- Notes about QR -->
          <div class="text-left text-sm">
            {@html $t("pages.wallet_login_qr.scan.description")}
            <br />
            {@html $t("wallet_sync.server_transfer_notice")}
          </div>
        {:else if scan_state === "importing"}
          <div class="mb-4 w-full">
            {@html $t("wallet_sync.importing")}
          </div>

          <div class="w-full"><Spinner /></div>
        {/if}
      {:else if login_method === "gen"}
        <!-- Generate QR Code to log in with another device -->
        {#if gen_state == "before_start"}
          <!-- Notes about QR Generation -->
          <div class="text-left text-sm">
            {@html $t("pages.wallet_login_qr.gen.description")}
            <br />
            {@html $t("wallet_sync.server_transfer_notice")}
          </div>
        {:else if gen_state === "generating"}
          <div>
            <Spinner class="w-full" />
          </div>
        {:else if gen_state === "generated"}
          <!-- Notes about generated QR -->
          <div class="text-left text-sm">
            {@html $t("pages.wallet_login_qr.gen.generated")}
          </div>

          <!-- Generated QR Code -->
          <div>
            {@html qr_code_html}
          </div>
        {/if}
      {/if}

      <div class="mx-auto">
        <div class="my-4 mx-1">
          {#if login_method === "scan" && scan_state === "before_start"}
            <!-- Open Scanner Button-->
            <button
              on:click={open_scanner}
              class="mt-4 w-full text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
            >
              <Camera
                tabindex="-1"
                class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
              />
              {$t("pages.wallet_login_qr.scan.button")}
            </button>
          {:else if login_method === "gen" && gen_state === "before_start"}
            <!-- Generate QR Button -->
            <button
              on:click={generate_qr}
              class="mt-4 w-full text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
            >
              <QrCode
                tabindex="-1"
                class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
              />
              {$t("pages.wallet_login_qr.gen.button")}
            </button>
          {/if}

          <!-- Go Back -->
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
