<!--
// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->

<!--
  @component
  "Wallet Info" user panel sub menu.
  Provides info about wallet, broker, etc. and download option.
-->

<script lang="ts">
  import Button, { Label } from "@smui/button";
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import CircularProgress from "@smui/circular-progress";
  import Typography from "./lib/components/Typography.svelte";
  import { push } from "./index";
  import {
    ArrowLeft,
    DocumentArrowDown,
    NoSymbol,
    QrCode,
    Link,
    Camera,
    CheckBadge,
    ExclamationTriangle,
    ArrowUpTray,
  } from "svelte-heros-v2";
  import { onDestroy, onMount, tick } from "svelte";
  import { t } from "svelte-i18n";

  import {
    close_active_wallet,
    active_session,
    active_wallet,
    display_error,
    online,
    scanned_qr_code,
    check_has_camera,
    redirect_after_scanned_qr_code,
    uploadFile,
    getBlob
  } from "./store";

  import { default as ng } from "../.auth-react/api";
  import CopyToClipboard from "./lib/components/CopyToClipboard.svelte";

  let tauri_platform = import.meta.env.TAURI_ENV_PLATFORM;
  let error;

  let container: HTMLElement;

  let sub_menu: "scan_qr" | "generate_qr" | "text_code" | null = null;

  let generation_state: "before_start" | "loading" | "generated" =
    "before_start";

  let generated_qr: string | undefined = undefined;
  let generated_text_code: string | null = null;

  let scanner_state: "before_start" | "scanned" | "success" = "before_start";

  let has_camera = false;

  // Tab management
  let activeTab = "wallet";
  const tabs = [
    { id: "wallet", label: $t("pages.wallet_info.title") || "Wallet" },
  ];

  async function scrollToTop() {
    await tick();
    container.scrollIntoView();
  }
  onMount(async () => {
    if (!$active_session) {
      push("#/");
      return;
    }
    if ($scanned_qr_code) {
      sub_menu = "scan_qr";
      on_qr_scanned($scanned_qr_code);
      scanned_qr_code.set("");
    }
    await scrollToTop();
    has_camera = await check_has_camera();
  });

  function open_scan_menu() {
    sub_menu = "scan_qr";
  }

  async function open_gen_menu() {
    sub_menu = "generate_qr";
    generation_state = "before_start";
  }

  function open_textcode_menu() {
    sub_menu = "text_code";
    scanner_state = "before_start";
  }

  async function generate_qr_code() {
    generation_state = "loading";
    generated_qr = await ng.wallet_export_get_qrcode(
      $active_session.session_id,
      container.clientWidth
    );
    generation_state = "generated";
  }

  async function on_qr_scanned(text: string) {
    try {
      await ng.wallet_export_rendezvous($active_session.session_id, text);
      scanner_state = "success";
    } catch (e) {
      error = e;
    }
  }

  async function open_scanner() {
    redirect_after_scanned_qr_code.set("#/wallet");
    push("#/scanqr");
  }

  async function generate_text_code() {
    generation_state = "loading";
    generated_text_code = await ng.wallet_export_get_textcode(
      $active_session.session_id
    );
    generation_state = "generated";
  }

  function to_main_menu() {
    cancel_wallet_transfers();

    sub_menu = null;
    generated_qr = undefined;
    generated_text_code = null;
    generation_state = "before_start";
    scanner_state = "before_start";
  }

  let downloading = false;
  let wallet_file_ready = false;
  let download_link = false;
  let download_error = false;
  async function download_wallet() {
    try {
      downloading = true;
      let file = await ng.wallet_get_file($active_wallet.id);
      // @ts-ignore
      wallet_file_ready = "wallet-" + $active_wallet.id + ".ngw";
      if (!tauri_platform) {
        const blob = new Blob([file], {
          type: "application/octet-stream",
        });
        // @ts-ignore
        download_link = URL.createObjectURL(blob);
      } else {
        download_link = true;
      }
    } catch (e) {
      download_error = e;
    }
  }

  let wallet_remove_modal_open = false;
  async function remove_wallet_clicked() {
    wallet_remove_modal_open = true;
  }

  const close_modal = () => {
    wallet_remove_modal_open = false;
  };

  async function remove_wallet_confirmed() {
    if (!$active_wallet) return;
    // TODO: Wait for implementation
    // await ng.wallet_remove($active_wallet.id);
    close_active_wallet();
    close_modal();
  }

  async function cancel_wallet_transfers() {
    // TODO
  }

  onDestroy(() => {
    cancel_wallet_transfers();
  });

  // //// USED FOR THE IMAGE EXAMPLE - PLEASE REMOTE IT
  // let fileinput;
  // let img_nuri;
  // const onFileSelected = async (e) => {
  //   let image = e.target.files[0];
  //   img_nuri = await uploadFile(image, "", (progress) => {console.log(progress)});
  //   console.log(img_nuri);
  //   // img_nuri is what you would save in a property, by example profile.photo.value
  //   fileinput.value = "";
  // }
  // //// UNTIL HERE

</script>

  <div class="dashboard-container" bind:this={container}>
    <!-- Tab Content -->
    <div class="tab-content">
      {#if activeTab === "wallet"}
        <div class="form-layout">
          {#if sub_menu === null}
            <div class="surface-section">

              <!-- EXAMPLE OF FILE UPLOADING - PLEASE REMOVE THE BELOW CODE 
              <Button
                type="button"
                onclick={() => {
                  fileinput.click();
                }}
                class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mr-2 mb-2"
              >
                <ArrowUpTray class="w-8 h-8 mr-2 -ml-1" />
                {$t("doc.file.upload")}
              </Button>

              {#if img_nuri}
                {#await getBlob("",img_nuri, true)}
                  <div class="ml-2">
                    <CircularProgress style="height: 28px; width: 28px" indeterminate />
                  </div>
                {:then url}
                  <img width=50 height=50 src={url} />
                {/await}
              {/if}
              <input
                style="display:none"
                type="file"
                on:change={(e) => onFileSelected(e)}
                bind:this={fileinput}
              />
              EXAMPLE ENDS HERE - PLEASE REMOVE THE ABOVE CODE -->

              <Typography variant="h4" component="h1" style="margin-bottom: calc(var(--mui-spacing) * 3);">
                {$t("pages.wallet_info.title")}
              </Typography>
              <Typography variant="body2" className="text-muted" style="word-break: break-all; margin-bottom: calc(var(--mui-spacing) * 2);">
                ID: {$active_wallet?.id}
              </Typography>

              <div class="wallet-menu-list">
                <!-- Scan QR Code to export wallet to another device -->
                <Button
                  class="wallet-menu-item"
                  onclick={open_scan_menu}
                >
                  <div class="wallet-menu-icon">
                    <Camera class="icon" />
                  </div>
                  <Typography variant="body1">
                    {$t("pages.wallet_info.scan_qr.title")}
                  </Typography>
                </Button>

                <!-- Generate QR Code export wallet to another device -->
                <Button
                  class="wallet-menu-item"
                  onclick={open_gen_menu}
                >
                  <div class="wallet-menu-icon">
                    <QrCode class="icon" />
                  </div>
                  <Typography variant="body1">
                    {$t("pages.wallet_info.gen_qr.title")}
                  </Typography>
                </Button>

                <!-- Copy Wallet TextCode -->
                <Button
                  class="wallet-menu-item"
                  onclick={open_textcode_menu}
                >
                  <div class="wallet-menu-icon">
                    <Link class="icon" />
                  </div>
                  <Typography variant="body1">
                    {$t("pages.wallet_info.create_text_code")}
                  </Typography>
                </Button>

                <!-- Download Wallet -->
                {#if !downloading}
                  <Button
                    class="wallet-menu-item"
                    onclick={download_wallet}
                  >
                    <div class="wallet-menu-icon">
                      <DocumentArrowDown class="icon" />
                    </div>
                    <Typography variant="body1">
                      {$t("pages.wallet_info.download")}
                    </Typography>
                  </Button>
                {:else if download_error}
                  <div class="wallet-menu-item wallet-menu-item--error">
                    <div class="wallet-menu-icon">
                      <NoSymbol class="icon" />
                    </div>
                    <Typography variant="body2">
                      {$t("pages.wallet_info.download_failed", {
                        values: { error: download_error },
                      })}
                    </Typography>
                  </div>
                {:else if !wallet_file_ready}
                  <div class="wallet-menu-item wallet-menu-item--info">
                    <div class="wallet-menu-icon">
                      <CircularProgress style="height: 28px; width: 28px" indeterminate />
                    </div>
                    <Typography variant="body2">
                      {$t("pages.wallet_info.download_in_progress")}
                    </Typography>
                  </div>
                {:else if download_link === true}
                  <div class="wallet-menu-item wallet-menu-item--success">
                    <Typography variant="body2">
                      {@html $t("pages.wallet_info.download_successful", {
                        values: { wallet_file: wallet_file_ready },
                      })}
                    </Typography>
                  </div>
                {:else}
                  <a
                    href={download_link || ""}
                    target="_blank"
                    download={wallet_file_ready}
                    class="wallet-download-link "
                  >
                    <Button variant="raised" class="wallet-menu-item mui-button-primary form-button" style="width:100%">
                      <div class="wallet-menu-icon">
                        <DocumentArrowDown />
                      </div>
                      <Label>{$t("pages.wallet_info.download_file_button")}</Label>
                    </Button>
                  </a>
                {/if}
              </div>
            </div>

            <!-- Confirm Remove Wallet Dialog -->
            <Dialog bind:open={wallet_remove_modal_open}>
              <Title>{$t("pages.wallet_info.remove_wallet_modal.title")}</Title>
              <Content>
                <Typography variant="body1">
                  {$t("pages.wallet_info.remove_wallet_modal.confirm")}
                </Typography>
              </Content>
              <Actions>
                <Button variant="outlined" class="mui-button-outlined" onclick={close_modal}>
                  <Label>{$t("buttons.cancel")}</Label>
                </Button>
                <Button variant="raised" class="mui-button-primary" onclick={remove_wallet_confirmed}>
                  <Label>{$t("buttons.remove")}</Label>
                </Button>
              </Actions>
            </Dialog>

          {:else if sub_menu === "scan_qr"}
            <div class="surface-section">
              <Typography variant="h4" component="h1" style="margin-bottom: calc(var(--mui-spacing) * 3);">
                {$t("pages.wallet_info.scan_qr.title")}
              </Typography>

              <!-- Go Back -->
              <Button variant="outlined" class="mui-button-outlined form-button" onclick={to_main_menu} style="align-self: flex-start; margin-bottom: calc(var(--mui-spacing) * 2);">
                <div class="button-icon">
                  <ArrowLeft />
                </div>
                <Label>{$t("buttons.back")}</Label>
              </Button>

              {#if !has_camera}
                <div class="mui-alert mui-alert-error" style="margin-bottom: calc(var(--mui-spacing) * 2);">
                  <Typography variant="body2">
                    {@html $t("wallet_sync.no_camera")}
                  </Typography>
                </div>
                <div class="mui-alert" style="margin-bottom: calc(var(--mui-spacing) * 2);">
                  <Typography variant="body2">
                    {@html $t("pages.wallet_info.scan_qr.other_has_camera")}
                  </Typography>
                </div>
                <div class="mui-alert" style="margin-bottom: calc(var(--mui-spacing) * 2);">
                  <Typography variant="body2">
                    {@html $t("pages.wallet_info.scan_qr.no_camera")}
                    {@html $t("wallet_sync.no_camera_alternatives")}
                  </Typography>
                </div>
              {:else if scanner_state === "before_start"}
                <!-- NOTES ABOUT QR-->
                <div style="margin-bottom: calc(var(--mui-spacing) * 2);">
                  <Typography variant="body1">
                    {@html $t("pages.wallet_info.scan_qr.notes")}
                  </Typography>
                  <Typography variant="body2" className="text-muted" style="margin-top: calc(var(--mui-spacing) * 2);">
                    {@html $t("wallet_sync.server_transfer_notice")}
                  </Typography>
                </div>

                <!-- Warning if offline -->
                {#if !$online}
                  <div class="mui-alert mui-alert-error" style="margin-bottom: calc(var(--mui-spacing) * 2);">
                    <Typography variant="body2">
                      {@html $t("wallet_sync.offline_warning")}
                    </Typography>
                  </div>
                {/if}

                <Button
                  variant="raised"
                  class="mui-button-primary form-button"
                  disabled={!$online}
                  onclick={open_scanner}
                >
                  <Label>{$t("buttons.scan_qr")}</Label>
                </Button>
              {:else if scanner_state === "scanned"}
                <div class="surface-section status-surface status-info">
                  <CircularProgress style="height: 48px; width: 48px" indeterminate />
                  <Typography variant="body1" className="status-message">
                    {@html $t("pages.wallet_info.scan_qr.syncing")}...
                  </Typography>
                </div>
              {:else if scanner_state === "success"}
                <div class="surface-section status-surface status-success">
                  <CheckBadge class="status-icon" size="4em" />
                  <Typography variant="body1" className="status-message">
                    {@html $t("pages.wallet_info.scan_qr.scan_successful")}
                  </Typography>
                  <Button
                    variant="raised"
                    class="mui-button-primary form-button"
                    onclick={to_main_menu}
                  >
                    <Label>{$t("buttons.go_back")}</Label>
                  </Button>
                </div>
              {/if}
            </div>

          {:else if sub_menu === "generate_qr"}
            <div class="surface-section">
              <Typography variant="h4" component="h1" style="margin-bottom: calc(var(--mui-spacing) * 3);">
                {$t("pages.wallet_info.gen_qr.title")}
              </Typography>

              {#if generation_state !== "generated"}
                <!-- Notes about generated QR -->
                <div style="margin-bottom: calc(var(--mui-spacing) * 2);">
                  <Typography variant="body1">
                    {@html $t("pages.wallet_info.gen_qr.notes")}
                  </Typography>
                  <Typography variant="body2" className="text-muted" style="margin-top: calc(var(--mui-spacing) * 2);">
                    {@html $t("pages.wallet_info.gen_qr.no_camera")}
                    {@html $t("wallet_sync.no_camera_alternatives")}
                  </Typography>
                  <Typography variant="body2" className="text-muted" style="margin-top: calc(var(--mui-spacing) * 2);">
                    {@html $t("wallet_sync.server_transfer_notice")}
                  </Typography>
                </div>

                <!-- Warning if offline -->
                {#if !$online}
                  <div class="mui-alert mui-alert-error" style="margin-bottom: calc(var(--mui-spacing) * 2);">
                    <Typography variant="body2">
                      {@html $t("wallet_sync.offline_warning")}
                    </Typography>
                  </div>
                {/if}

                {#if generation_state === "before_start"}
                  <div class="form-actions form-actions--stack">
                    <Button
                      variant="raised"
                      class="mui-button-primary form-button"
                      disabled={!$online}
                      onclick={generate_qr_code}
                    >
                      <Label>{$t("pages.wallet_info.gen_qr.gen_button")}</Label>
                    </Button>
                  </div>
                {:else if generation_state === "loading"}
                  <div class="status-surface status-info">
                    <CircularProgress style="height: 48px; width: 48px" indeterminate />
                  </div>
                {/if}

                <Button variant="outlined" class="mui-button-outlined form-button" onclick={to_main_menu} style="margin-top: calc(var(--mui-spacing) * 2);">
                  <div class="button-icon">
                    <ArrowLeft />
                  </div>
                  <Label>{$t("buttons.back")}</Label>
                </Button>
              {:else}
                <Typography variant="body1" align="center" style="margin-bottom: calc(var(--mui-spacing) * 2);">
                  {@html $t("pages.wallet_login_qr.gen.generated")}
                </Typography>

                <!-- Generated QR Code -->
                <div class="qr-code-container">
                  {@html generated_qr}
                </div>

                <Button variant="outlined" class="mui-button-outlined form-button" onclick={to_main_menu} style="margin-top: calc(var(--mui-spacing) * 4);">
                  <div class="button-icon">
                    <ArrowLeft />
                  </div>
                  <Label>{$t("buttons.back")}</Label>
                </Button>
              {/if}
            </div>

          {:else if sub_menu === "text_code"}
            <div class="surface-section">
              <Typography variant="h4" component="h1" style="margin-bottom: calc(var(--mui-spacing) * 3);">
                {$t("pages.wallet_info.gen_text_code.title")}
              </Typography>

              <!-- Go Back -->
              <Button variant="outlined" class="mui-button-outlined form-button" onclick={to_main_menu} style="margin-bottom: calc(var(--mui-spacing) * 2);">
                <div class="button-icon">
                  <ArrowLeft />
                </div>
                <Label>{$t("buttons.back")}</Label>
              </Button>

              <!-- Warning to prefer QR codes or wallet downloads -->
              {#if generation_state === "before_start"}
                <div class="mui-alert mui-alert-warning" style="margin-bottom: calc(var(--mui-spacing) * 2);">
                  <Typography variant="body2">
                    {@html $t("wallet_sync.textcode.usage_warning")}
                  </Typography>
                </div>
              {/if}

              <!-- Warning if offline -->
              {#if !$online}
                <div class="mui-alert mui-alert-error" style="margin-bottom: calc(var(--mui-spacing) * 2);">
                  <Typography variant="body2">
                    {@html $t("wallet_sync.offline_warning")}
                  </Typography>
                </div>
              {:else}
                <Typography variant="body2" className="text-muted" style="margin-bottom: calc(var(--mui-spacing) * 2);">
                  {@html $t("wallet_sync.expiry")}
                </Typography>
              {/if}

              {#if generation_state === "before_start"}
                <Button
                  variant="raised"
                  class="mui-button-primary form-button"
                  disabled={!$online}
                  onclick={generate_text_code}
                >
                  <Label>{$t("pages.wallet_info.gen_text_code.gen_btn")}</Label>
                </Button>
              {:else if generation_state == "loading"}
                <div class="status-surface status-info">
                  <CircularProgress style="height: 48px; width: 48px" indeterminate />
                </div>
              {:else}
                <!-- TextCode Code -->
                <Typography variant="subtitle1" style="margin-bottom: calc(var(--mui-spacing) * 1);">
                  {$t("pages.wallet_info.gen_text_code.label")}
                </Typography>
                <div>
                  <CopyToClipboard rows={8} value={generated_text_code} />
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    {#if error}
      <div class="surface-section status-surface status-error" style="max-width: 640px; margin: calc(var(--mui-spacing) * 4) auto;">
        <ExclamationTriangle class="status-icon status-icon--bounce" />
        <Typography variant="body1" className="status-message">
          {@html $t("errors.error_occurred", {
            values: { message: display_error(error) },
          })}
        </Typography>
      </div>
    {/if}
  </div>

<style>
  .dashboard-container {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    padding: calc(var(--mui-spacing) * 1.25);
    margin: 0 auto;
  }

  @media (min-width: 768px) {
    .dashboard-container {
      padding: 0;
    }
  }

  .tab-content {
    width: 100%;
  }

  .wallet-menu-list {
    display: flex;
    flex-direction: column;
    gap: calc(var(--mui-spacing) * 1.5);
  }

  .wallet-menu-item--error {
    background-color: var(--mui-palette-error-light);
    border-color: var(--mui-palette-error-main);
    cursor: default;
  }

  .wallet-menu-item--info {
    background-color: var(--mui-palette-primary-light);
    border-color: var(--mui-palette-primary-main);
    cursor: default;
  }

  .wallet-menu-item--success {
    background-color: var(--mui-palette-success-light);
    border-color: var(--mui-palette-success-main);
    cursor: default;
    word-break: break-all;
  }

  .wallet-menu-icon {
    flex-shrink: 0;
    margin-right:5px;
  }

  .wallet-menu-icon :global(.icon) {
    width: 28px;
    height: 28px;
    color: var(--mui-palette-text-primary);
  }

  .wallet-download-link {
    display: block;
    text-decoration: none;
  }

  .qr-code-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }

  .qr-code-container :global(svg) {
    max-width: 100%;
    height: auto;
  }
</style>