<script lang="ts">
  import { t } from "svelte-i18n";
  import {
    type Html5QrcodeResult,
    type Html5QrcodeScanner,
  } from "html5-qrcode";
  import {
    Alert,
    Modal,
    Sidebar,
    SidebarGroup,
    SidebarWrapper,
    Spinner,
  } from "flowbite-svelte";
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

  let WebQRScannerClassPromise: Promise<typeof Html5QrcodeScanner>;
  let html5QrcodeScanner: Html5QrcodeScanner;
  async function load_qr_scanner_lib() {
    // Load in browser only
    if (!tauri_platform && !WebQRScannerClassPromise) {
      WebQRScannerClassPromise = new Promise((resolve) => {
        import("html5-qrcode").then((lib) => resolve(lib.Html5QrcodeScanner));
      });
    }
    // TODO: Load alternative for native apps?
  }

  let top;
  const tauri_platform: string | undefined = import.meta.env.TAURI_PLATFORM;
  let has_camera: boolean | "checking" = "checking";
  let login_method: "scan" | "gen" | undefined = undefined;

  let scan_state:
    | "before_start"
    | "scanning"
    | "has_scanned"
    | "success"
    | Error = "before_start";
  let scanned_qr: string | undefined = undefined;

  let gen_state:
    | "before_start"
    | "generating"
    | "generated"
    | "success"
    | Error = "before_start";
  let generated_qr: string | undefined = undefined;

  const check_has_camera = async () => {
    if (!tauri_platform) {
      // If there is a camera, go to scan mode, else gen mode.
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        has_camera =
          devices.filter((device) => device.kind === "videoinput").length > 0;
      } catch {
        has_camera = false;
      }
      login_method = has_camera ? "scan" : "gen";
      // Load Scanner lib, if necessary.
      if (has_camera) load_qr_scanner_lib();
    } else {
      // TODO: rust API @niko
    }
  };
  check_has_camera();

  function on_qr_scanned(text: string) {
    scan_state = "has_scanned";
    scanned_qr = text;
    // TODO: API calls for synchronization @niko
    // ToRemove:
    setTimeout(() => {
      scan_state = "success";
    }, 2_000);
  }

  function clear_scanner() {
    if (html5QrcodeScanner) html5QrcodeScanner.clear();
    html5QrcodeScanner = null;
  }

  async function open_scanner() {
    scan_state = "scanning";

    const WebQRScanner = await WebQRScannerClassPromise;
    html5QrcodeScanner = new WebQRScanner(
      "scanner-div",
      { fps: 10, qrbox: { width: 300, height: 300 }, formatsToSupport: [0] },
      false
    );

    html5QrcodeScanner.render((decoded_text, decoded_result) => {
      // Handle scan result
      on_qr_scanned(decoded_text);
      clear_scanner();
    }, undefined);

    // Auto-Request camera permissions (there's no native way, unfortunately...)
    setTimeout(() => {
      // Auto-start by clicking button
      document.getElementById("html5-qrcode-button-camera-permission")?.click();
    }, 100);
  }

  function close_scanner_modal() {
    clear_scanner();
    if (scanned_qr) {
      scan_state = "has_scanned";
    } else {
      scan_state = "before_start";
    }
  }

  function generate_qr() {
    gen_state = "generating";
    // TODO: @niko  generated_qr = await ng.generate_export_qr();
    // ToRemove:
    setTimeout(() => {
      gen_state = "generated";
      generated_qr = "dummy";
    }, 1500);
    setTimeout(() => {
      gen_state = "success";
    }, 3500);
  }

  function continue_to_login(wallet) {}

  function scrollToTop() {
    top.scrollIntoView();
  }
  onMount(() => scrollToTop());
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
        <!-- TODO: Check connectivity here-->
        <div><Spinner /></div>
      {:else if false}
        <!-- Warning, if offline -->
        <!-- TODO: get connection status to nextgraph.one -->
        <div class="text-left">
          <Alert color="red">
            {@html $t("pages.wallet_login_qr.offline_warning")}
          </Alert>
        </div>
      {:else if login_method === "scan"}
        <!-- Scan Mode -->
        {#if scan_state === "before_start"}
          <!-- Notes about QR -->
          <div class="text-left text-sm">
            {@html $t("pages.wallet_login_qr.scan.description")}
          </div>
        {:else if scan_state === "scanning"}
          <!-- Modal is down at the bottom -->
        {:else if scan_state === "has_scanned"}
          <!-- Scanned QR -->
          <div>
            <Spinner />
          </div>
          <div class="mt-2">
            {$t("pages.wallet_login_qr.scan.syncing")}
          </div>
        {:else if scan_state === "success"}
          <div class="mt-4">
            <CheckBadge class="w-full" color="green" size="3em" />
          </div>
          <div class="mt-4">
            {@html $t("pages.wallet_login_qr.scan.success")}
          </div>
        {:else}
          <!-- Error -->
          {$t("pages.wallet_login_qr.scan.error", {
            values: { error: $t("errors." + scan_state) },
          })}
        {/if}
      {:else if login_method === "gen"}
        <!-- Generate QR Code to log in with another device -->
        {#if gen_state == "before_start"}
          <!-- Notes about QR Generation -->
          <div class="text-left text-sm">
            {@html $t("pages.wallet_login_qr.gen.description")}
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
            {#if generated_qr === "dummy"}
              <div title={$t("pages.wallet_info.gen_qr.img_title")}>
                <QrCode class="w-full h-full" />
              </div>
            {:else}
              <img
                src={generated_qr}
                title={$t("pages.wallet_info.gen_qr.img_title")}
                alt="pages.wallet_info.gen_qr_alt"
                class="w-full h-full"
              />
            {/if}
          </div>
        {:else if gen_state === "success"}
          <div class="mt-4">
            <CheckBadge class="w-full" color="green" size="3em" />
          </div>
          <div class="mt-4">
            {@html $t("pages.wallet_login_qr.gen.success")}
          </div>
        {:else}
          <!-- gen_state has Error -->
          {$t("pages.wallet_login_qr.gen.error")}
        {/if}
      {/if}

      <div class="mx-auto">
        <div class="my-4">
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
          {:else if scan_state === "success" || gen_state === "success"}
            <a href="#/wallet/login">
              <button
                class="mt-4 w-full text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
              >
                <ArrowRightCircle
                  tabindex="-1"
                  class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
                />
                {$t("pages.wallet_login_qr.success_btn")}
              </button>
            </a>
          {/if}

          <!-- Go Back -->
          {#if scan_state !== "success" && gen_state !== "success"}
            <button
              on:click={() => window.history.go(-1)}
              class="mt-8 w-full text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
              ><ArrowLeft
                tabindex="-1"
                class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
              />{$t("buttons.back")}</button
            >
          {/if}
        </div>
      </div>
    </div>
    <!-- Scanner Open-->
    <Modal
      title={$t("pages.wallet_login_qr.scan.modal.title")}
      placement="center"
      on:hide={close_scanner_modal}
      open={scan_state === "scanning"}
      class="h-[85vh]"
    >
      <div id="scanner-div" class="h-full">
        {$t("pages.wallet_login_qr.scan.modal.loading")}...
      </div>
    </Modal>
  </div>
</CenteredLayout>
