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
  "Select a wallet to login with" page.
  This page is usually the first page the user sees when they visit the app.
  It allows the user to select a wallet to login with, create, or import a wallet.
-->

<script lang="ts">
    import {onMount, onDestroy, tick} from "svelte";
    import {t, locale} from "svelte-i18n";
    import Login from "./lib/Login.svelte";
    import CenteredLayout from "./lib/CenteredLayout.svelte";
    import {
        default as ng,
    } from "../.auth-react/api";
    import Button, { Label, Icon } from '@smui/button';
    import Typography from "./lib/components/Typography.svelte";
    import {
        redirect_server,
        bootstrap_redirect,
        base64UrlEncode,
        push
    } from "./index";
    import CircleLogo from "./lib/components/CircleLogo.svelte";
    import {
        wallets,
        active_wallet,
        opened_wallets,
        active_session,
        set_active_session,
        has_wallets,
        display_error,
        wallet_from_import,
        redirect_after_login,
        redirect_if_wallet_is,
        boot,
    } from "./store";
    import {
        CheckBadge,
        ExclamationTriangle,
        QrCode,
        Cloud,
        ArrowRightEndOnRectangle,
    } from "svelte-heros-v2";

    let tauri_platform = import.meta.env.TAURI_ENV_PLATFORM;
    let mobile = tauri_platform == "android" || tauri_platform == "ios";

    let wallet;
    let selected;
    let step;
    let error;
    let importing = false;
    let top;

    let wallets_unsub;
    let opened_wallets_unsub;
    let active_wallet_unsub;

    export let without_create = false;

    function convert_img_to_url(buffer) {
        var blob = new Blob([buffer], {
            type: "image/jpeg",
        });
        var imageUrl = URL.createObjectURL(blob);
        return imageUrl;
    }

    //console.log("WalletLogin called")

    onMount(async () => {
        step = "open";

        wallets_unsub = wallets.subscribe((value) => {
            //console.log("wallets.subscribe(", wallet, selected);
            wallet = wallet || selected && $wallets[selected]?.wallet;
            //console.log("wallet found locally", wallet);
        });
        opened_wallets_unsub = opened_wallets.subscribe(async (value) => {
            if (!$active_wallet && selected && value[selected]) {
                //await tick();
                active_wallet.set({wallet: value[selected], id: selected});
            }
        });
        active_wallet_unsub = active_wallet.subscribe(async (value) => {
            if (value && value.wallet) {
                //console.log("active_wallet.subscribe(", value.wallet, wallet, selected);
                step = "loggedin";
                await tick();
                if (!$active_session) {
                    try {
                        let session = await ng.session_start(
                            value.id,
                            value.wallet.V0.personal_site
                        );
                        //console.log(session);
                        if (session) {
                            set_active_session(session);
                            loggedin();
                        }
                    } catch (e) {
                        step = "open";
                        error = e;
                        importing = false;
                        wallet = undefined;
                        selected = undefined;
                        active_wallet.set(undefined);
                    }
                } else {
                    loggedin();
                }
            }
        });

        // Coming from the import Wallet with QR / TextCode ...
        if ($wallet_from_import) {
            wallet = $wallet_from_import;
            importing = true;
        }
    });

    async function loggedin() {
        step = "loggedin";

        if ($redirect_after_login) {
            if (
                !$redirect_if_wallet_is ||
                $redirect_if_wallet_is == $active_wallet?.id
            ) {
                let redir = $redirect_after_login;
                $redirect_after_login = undefined;
                $redirect_if_wallet_is = undefined;
                push("#" + redir);
            } else {
                $redirect_after_login = undefined;
                $redirect_if_wallet_is = undefined;
                push("#/");
            }
        } else {
            push("#/");
        }
    }

    function start_login_from_import() {
        // Login button was clicked and `wallet` was set in `onMount`.
        // Unset variable from store, to show login screen.
        wallet_from_import.set(null);
    }

    onDestroy(() => {
        console.log("onDestroy called");
        if (wallets_unsub) wallets_unsub();
        if (opened_wallets_unsub) opened_wallets_unsub();
        if (active_wallet_unsub) active_wallet_unsub();
        wallet_from_import.set(null);
    });
    async function gotError(event) {
        //importing = false;
        console.error(event.detail);
    }
    async function gotWallet(event) {
        try {
            console.log("gotWallet", event)
            if (importing) {
                step = "loggedin";
                $redirect_after_login = undefined;
                $redirect_if_wallet_is = undefined;
                let in_memory = !event.detail.trusted;
                console.log("IMPORTING", in_memory, event.detail.wallet, wallet);
                //register bootstrap when importing
                if (!in_memory && !tauri_platform && !import.meta.env.NG_ENV_NO_REDIRECT) {
                    let bootstrap_iframe_msgs =
                        await ng.get_bootstrap_iframe_msgs_for_brokers(
                            event.detail.wallet.V0.brokers
                        );
                    let encoded = base64UrlEncode(JSON.stringify(bootstrap_iframe_msgs));
                    let register_bootstrap_url =
                        bootstrap_redirect +
                        encoded +
                        "&close=1&m=add&ab=" +
                        encodeURIComponent(window.location.href);
                    console.log(register_bootstrap_url);
                    window.open(register_bootstrap_url, "_blank");
                }
                let client = await ng.wallet_import(
                    wallet,
                    event.detail.wallet,
                    in_memory
                );
                event.detail.wallet.V0.client = client;
                // refreshing the wallets
                wallets.set(await ng.get_wallets());
                //console.log($wallets);
                let session = await ng.session_start(
                    event.detail.id,
                    event.detail.wallet.V0.personal_site
                );
                //console.log(session);
                if (session) {
                    set_active_session(session);
                }
                if (in_memory && !tauri_platform) {
                    // send a message in BroadcastChannel new_in_mem(lws, opened_wallet=event.detail.wallet).
                    let name = event.detail.id;
                    let lws = $wallets[name];
                    if (lws.in_memory) {
                        let new_in_mem = {
                            lws,
                            name,
                            opened: event.detail.wallet,
                            cmd: "new_in_mem",
                        };
                        window.wallet_channel.postMessage(new_in_mem, location.href);
                    }
                }
            } else {
                let client = await ng.wallet_was_opened(event.detail.wallet);
                event.detail.wallet.V0.client = client;
            }
        } catch (e) {
            if (importing) {
                wallet = undefined;
            }
            importing = false;
            error = e;
            step = "open";
            return;
        }
        //await tick();
        active_wallet.set(event.detail);
        // { wallet,
        // id }
    }
    function cancelLogin(event) {
        console.log("cancelLogin");
        importing = false;
        selected = undefined;
        wallet = undefined;
    }
    function select(id) {
        selected = id;
        if ($opened_wallets[selected]) {
            active_wallet.set({wallet: $opened_wallets[selected], id: selected});
        } else {
            wallet = $wallets[selected]?.wallet;
        }
        importing = false;
        //console.log("select", wallet, selected)
    }
    function handleWalletUpload(event) {
        const files = event.target.files;
        if (files.length > 0) {
            let reader = new FileReader();
            reader.readAsArrayBuffer(files[0]);
            reader.onload = async (e) => {
                try {
                    //console.log(e.target.result);
                    wallet = await ng.wallet_read_file(e.target.result);
                    importing = true;
                } catch (e) {
                    error = e;
                }
            };
        }
    }
    function scrollToTop() {
        top.scrollIntoView();
    }

    onMount(async () => {
        await boot();
        scrollToTop()
    });
</script>

<CenteredLayout displayFooter={!wallet && !selected}>
  <div class="wallet-login-layout form-layout" bind:this={top}>
    {#if error}
      <div class="surface-section status-surface status-error">
        <ExclamationTriangle class="status-icon status-icon--bounce" />

        <Typography variant="body1" className="status-message">
          {@html $t("errors.error_occurred", {
              values: {message: display_error(error)},
          })}
        </Typography>
        <div class="form-actions form-actions--stack">
          <Button
            variant="raised"
            class="mui-button-primary form-button"
            type="button"
            onclick={() => {
              importing = false;
              error = undefined;
            }}
          >
            <Label>{$t("buttons.start_over")}</Label>
          </Button>
        </div>
      </div>
    {:else if step == "loggedin"}
      <div class="surface-section status-surface status-success">
        <Typography variant="body1" className="status-message">
          {@html $t("pages.wallet_login.logged_in")}...
        </Typography>
        <svg
            class="status-icon"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
          <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
          />
        </svg>
      </div>
    {:else if $wallet_from_import}
      <!-- Imported a wallet -->

      <!-- Title -->
      <Typography variant="h5" className="import-title">
        {$t("pages.wallet_login.from_import.title")}
      </Typography>

      <div class="import-success">
        <CheckBadge class="import-badge" size="3em"/>

        <Typography variant="body2" className="import-description">
          {@html $t("pages.wallet_login.from_import.description")}
        </Typography>
      </div>

      <!-- Show wallet security image and phrase. -->
      <div
          class="wallet-box import-wallet-box"
          role="button"
          tabindex="0"
          on:click={start_login_from_import}
          on:keypress={start_login_from_import}
      >
        {#if $wallet_from_import.V0.content.password}
          <div class="wallet-password-content">
            <ArrowRightEndOnRectangle
                style="display:inline;"
                size="40"
            />
            <div>
              {#if mobile}Tap{:else}Click{/if} here to login with your wallet
            </div>
          </div>

          <div class="wallet-button-container">
            <Button
                variant="outlined"
                tabindex="-1"
                style="overflow-wrap: anywhere;"
                class="mui-button-outlined form-button wallet-security-button"
                type="button"
            >
              <Label>{$wallet_from_import.V0.content.security_txt}</Label>
            </Button>
          </div>
        {:else}
          <span class="securitytxt"
          >{$wallet_from_import.V0.content.security_txt}
          </span>
          <img
              alt={$wallet_from_import.V0.content.security_txt}
              class="securityimg"
              src={convert_img_to_url(
              $wallet_from_import.V0.content.security_img
            )}
          />
        {/if}
      </div>

      <!-- Login to finish import instructions-->
      <Typography variant="body2" className="import-instruction">
        {@html $t("pages.wallet_login.from_import.instruction")}
      </Typography>

      <div>
        <Button
            variant="raised"
            class="mui-button-primary form-button"
            type="button"
            onclick={start_login_from_import}
        >
          <Label>{$t("buttons.login")}</Label>
        </Button>
      </div>
    {:else if wallet}
      <Login
          {wallet}
          bind:for_import={importing}
          on:error={gotError}
          on:opened={gotWallet}
          on:cancel={cancelLogin}
      />
    {:else if !$active_wallet && !selected}
      <div class="row">
        <a href="#/">
          <CircleLogo aria-label="NextGraph Logo" />
        </a>
      </div>
      <Typography variant="h5" className="wallet-select-title">
        {$t("pages.wallet_login.select_wallet")}
      </Typography>
      <div class="wallet-grid">
        {#each Object.entries($wallets) as wallet_entry}
          <div
              class="wallet-box"
              role="button"
              tabindex="0"
              on:click={() => {
              select(wallet_entry[0]);
            }}
              on:keypress={() => {
              select(wallet_entry[0]);
            }}
          >
            {#if wallet_entry[1].wallet.V0.content.password}
              <div class="wallet-password-content">
                <ArrowRightEndOnRectangle
                    style="display:inline;"
                    size="40"
                />
                <div>
                  {#if mobile}Tap{:else}Click{/if} here to login with your wallet
                </div>
              </div>

              <div class="wallet-button-container">
                <Button
                    variant="unelevated"
                    tabindex="-1"
                    class="mui-button-primary form-button action-button"
                    type="button"
                    style="border-radius: 20px !important; font-size: 2.5rem!important;height: fit-content!important; word-break: break-all;"
                >
                  <Label>{wallet_entry[1].wallet.V0.content.security_txt}</Label>
                </Button>
              </div>
            {:else}
              <span class="securitytxt"
              >{wallet_entry[1].wallet.V0.content.security_txt}
              </span>
              <img
                  alt={wallet_entry[1].wallet.V0.content.security_txt}
                  class="securityimg"
                  src={convert_img_to_url(
                  wallet_entry[1].wallet.V0.content.security_img
                )}
              />
            {/if}
          </div>
        {/each}
        <div class="wallet-box">
          <!-- <a href="#/wallet/username">
            <button
              style="justify-content: left;"
              tabindex="-1"
              class:mt-10={without_create}
              class:mt-2.5={!without_create}
              class="text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-1.5 text-center inline-flex items-center justify-center dark:focus:ring-primary-100/55 mb-2"
            >
              <Cloud class="w-8 h-8 mr-2 -ml-1" tabindex="-1" />
              {$t("pages.wallet_login.with_username")}
            </button>
          </a> -->
          <input
              style="display:none;"
              id="import_wallet_file"
              type="file"
              accept="application/octet-stream, .ngw"
              on:change={handleWalletUpload}
          />
          <Button
              variant="outlined"
              class="mui-button-outlined form-button action-button"
              type="button"
              style="min-height: 50px; font-size: 1.25rem!important; height:57px;"
              onclick={() => {
              document.getElementById("import_wallet_file").click();
            }}
          >
            <Icon class="button-icon">
              <svg
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
              >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25"
                />
              </svg>
            </Icon>
            <Label>{$t("pages.wallet_login.import_file")}</Label>
          </Button>
          <a href="#/wallet/login-qr">
            <Button
                variant="outlined"
                tabindex="-1"
                style="font-size: 1.25rem!important; height:57px; width: 100%;"
                class="mui-button-outlined form-button action-button"
            >
              <Icon class="button-icon">
                <QrCode tabindex="-1" aria-hidden="true"/>
              </Icon>
              <Label>{$t("pages.wallet_login.import_qr")}</Label>
            </Button>
          </a>
          <a href="#/wallet/login-text-code">
            <Button
                variant="outlined"
                tabindex="-1"
                class="mui-button-outlined form-button action-button"
                style="font-size: 1.25rem!important; height:57px; width: 100%;"
            >
              <Icon class="button-icon">
                <svg
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                  <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                  />
                </svg>
              </Icon>
              <Label>{$t("pages.wallet_login.import_link")}</Label>
            </Button>
          </a>
          {#if !without_create}
            <a href="#/wallet/create">
              <Button
                  variant="unelevated"
                  tabindex="-1"
                  class="mui-button-primary form-button action-button"
                  style="font-size: 1.25rem!important; height:57px; width: 100%;"
              >
                <Icon class="button-icon">
                  <svg
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                  >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
                    />
                  </svg>
                </Icon>
                <Label>{$t("pages.wallet_login.new_wallet")}</Label>
              </Button>
            </a>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</CenteredLayout>


<style>
    .wallet-login-layout {
        max-width: 960px;
        gap: calc(var(--mui-spacing) * 4);
    }

    .import-success {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: var(--mui-palette-success-main);
        gap: calc(var(--mui-spacing) * 2);
    }

    .import-badge {
        width: 100%;
    }

    .import-wallet-box {
        margin-top: calc(var(--mui-spacing) * 2);
        margin-left: auto;
        margin-right: auto;
    }

    .wallet-grid {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: calc(var(--mui-spacing) * 2.5);
        margin-bottom: calc(var(--mui-spacing) * 5);
    }

    .wallet-password-content {
        padding-top: calc(var(--mui-spacing) * 2.5);
    }

    .wallet-button-container {
        padding: calc(var(--mui-spacing) * 2.5);
    }

    .wallet-security-button {
        margin-top: calc(var(--mui-spacing) * 0.5);
    }

    .action-button {
        margin-top: calc(var(--mui-spacing) * 0.5);
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .button-icon {
        width: 2rem;
        height: 2rem;
        margin-right: calc(var(--mui-spacing) * 1);
        margin-left: calc(var(--mui-spacing) * -0.5);
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .wallet-box {
        width: 300px;
        min-height: 300px;
        background-color: #fff;
        position: relative;
        cursor: pointer;
        padding: calc(var(--mui-spacing) * 2);
        border-radius: calc(var(--mui-spacing) * 2);
        display: flex;
        flex-direction: column;
        gap: 10px
    }

    .securitytxt {
        z-index: 100;
        width: 300px;
        position: absolute;
        left: 0;
        padding: calc(var(--mui-spacing) * 0.625);
        background-color: #ffffffd0;
        overflow-wrap: break-word;
    }
    .wallet-box:focus .securitytxt {
        background-color: #ffffffff;
    }
    .securityimg {
        position: absolute;
        left: 0;
        top: 0;
    }
</style>
