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

<!--
  Wallet creation page.
  This component manages the whole UX flow, gives infos about wallets,
   offers available brokers, handles wallet creation,
   and shows the wallet pazzle and pin.
-->

<script lang="ts">
  import { Button, Alert, Dropzone, Toggle, Modal } from "flowbite-svelte";
  import { link, querystring } from "svelte-spa-router";
  import CenteredLayout from "../lib/CenteredLayout.svelte";
  import CopyToClipboard from "../lib/components/CopyToClipboard.svelte";
  // @ts-ignore
  import EULogo from "../assets/EU.svg?component";
  // @ts-ignore
  import Logo from "../assets/nextgraph.svg?component";
  import {
    NG_EU_BSP,
    NG_NET_BSP,
    LINK_NG_BOX,
    LINK_SELF_HOST,
    NG_EU_BSP_REGISTER,
    NG_NET_BSP_REGISTER,
    APP_WALLET_CREATE_SUFFIX,
    default as ng,
  } from "../api";
  import {
    display_pazzle,
    emojis_from_pazzle_ids,
    load_svg,
  } from "../wallet_emojis";

  import { onMount, onDestroy, tick } from "svelte";
  import { wallets, set_active_session, has_wallets } from "../store";

  const param = new URLSearchParams($querystring);

  let tauri_platform = import.meta.env.TAURI_PLATFORM;
  let mobile = tauri_platform == "android" || tauri_platform == "ios";
  let is_touch_device =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator?.msMaxTouchPoints > 0;

  const onFileSelected = (image) => {
    animate_bounce = false;
    if (!security_txt) phrase.focus();
    let reader = new FileReader();
    reader.readAsArrayBuffer(image);
    reader.onload = async (e) => {
      security_img = e.target.result;
      //console.log(security_img);
      var blob = new Blob([security_img], {
        type: image.type,
      });
      image_url = URL.createObjectURL(blob);
      phrase.scrollIntoView();
      if (security_txt) {
        await tick();
        validate_button.focus();
      }
    };
  };

  const security_phrase_ok = async (e) => {
    if (!e || e.key == "Enter" || e.keyCode == 13) {
      phrase.blur();
      if (!security_img) {
        animate_bounce = true;
        img_preview.scrollIntoView();
      } else {
        await tick();
        validate_button.scrollIntoView();
        validate_button.focus();
      }
    }
  };

  const dropHandle = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      onFileSelected(files[0]);
    }
  };

  const handleChange = (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      onFileSelected(files[0]);
    }
  };

  let intro = true;
  let wait: any = false;
  let registration_error;
  let registration_success;
  let pin = [];
  let pin_confirm = [];
  let security_txt = "";
  let security_img;
  let top;
  let img_preview;
  let phrase;
  let validate_button;
  let animate_bounce;
  let image_url =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  let info_options;
  let options;
  let creating = false;
  let error;
  let ready;
  let download_link;
  let download_name;
  let cloud_link;
  let animateDownload = true;
  let invitation;
  let pre_invitation;

  let unsub_register_accepted;
  let unsub_register_error;
  let unsub_register_close;
  /** The emojis for the newly created pazzle. */
  let pazzle_emojis = [];
  let confirm_modal_open = false;
  function scrollToTop() {
    top.scrollIntoView();
  }

  function sel_pin(val) {
    if (pin.length < 4) {
      pin.push(val);
      pin = pin;
    }
  }

  async function confirm_pin(val) {
    if (pin_confirm.length < 4) {
      pin_confirm.push(val);
      pin_confirm = pin_confirm;
      if (pin_confirm.length == 4) {
        await tick();
        scrollToTop();
      }
    }
  }

  const api_url = import.meta.env.PROD
    ? "api/v1/"
    : "http://localhost:3030/api/v1/";

  async function bootstrap() {
    //console.log(await ng.client_info());
    if (!tauri_platform || tauri_platform == "android") {
      if (param.get("skipintro") || param.get("rs")) {
        intro = false;
      }
      if (param.get("re")) {
        registration_error = param.get("re");
      }
      if (param.get("rs")) {
        registration_success = param.get("rs");
        invitation = await ng.decode_invitation(param.get("i"));
        window.location.replace(window.location.href.split("?")[0]);
      } else if (param.get("i")) {
        invitation = await ng.get_local_bootstrap_with_public(
          location.href,
          param.get("i")
        );
        console.log("invitation", invitation);
        if (invitation && invitation.V0.url) {
          pre_invitation = invitation;
          invitation = undefined;
        } else if (!invitation) {
          let redirect = await ng.get_ngone_url_of_invitation(param.get("i"));
          if (redirect) {
            console.error("got an invitation for another broker. redirecting");
            window.location.href = redirect;
          } else {
            //let i = await ng.decode_invitation(param.get("i"));
            console.error("invalid invitation. ignoring it");
          }
        }
      } else {
        pre_invitation = await ng.get_local_bootstrap_with_public(
          location.href
        );
        console.log("pre_invitation", pre_invitation);
      }
    }
    scrollToTop();

    // We need them for display later.
    load_svg();
  }

  function create_wallet() {
    intro = false;
    // if (invitation && invitation.V0.url) {
    //   // we redirect to the TOS url of the invitation.
    //   wait = "Redirecting to TOS";
    //   window.location.href = invitation.V0.url;
    // }
    scrollToTop();
  }

  async function save_security() {
    options = {
      trusted: true,
      cloud: false,
      bootstrap: false,
      pdf: false,
    };
    await tick();
    scrollToTop();
  }

  async function do_wallet() {
    creating = true;
    let local_invitation = await ng.get_local_bootstrap(location.href);
    let additional_bootstrap;
    if (local_invitation) {
      additional_bootstrap = local_invitation.V0.bootstrap;
    }
    let core_registration;
    if (invitation.V0.code) {
      core_registration = invitation.V0.code.ChaCha20Key;
    }
    let params = {
      security_img: security_img,
      security_txt,
      pin,
      pazzle_length: 9,
      send_bootstrap: false, //options.cloud || options.bootstrap ?  : undefined,
      send_wallet: options.cloud,
      local_save: options.trusted,
      result_with_wallet_file: false, // this will be automatically changed to true for browser app
      core_bootstrap: invitation.V0.bootstrap,
      core_registration,
      additional_bootstrap,
    };
    //console.log("do wallet with params", params);
    try {
      ready = await ng.wallet_create(params);
      wallets.set(await ng.get_wallets());
      if (!options.trusted && !tauri_platform) {
        let lws = $wallets[ready.wallet_name];
        if (lws.in_memory) {
          let new_in_mem = {
            lws,
            name: ready.wallet_name,
            opened: false,
            cmd: "new_in_mem",
          };
          window.wallet_channel.postMessage(new_in_mem, location.href);
        }
      }
      console.log("pazzle", ready.pazzle);
      console.log("pazzle words", display_pazzle(ready.pazzle));
      console.log("mnemonic", ready.mnemonic);
      console.log("mnemonic words", ready.mnemonic_str);
      download_name = "wallet-" + ready.wallet_name + ".ngw";
      if (options.cloud) {
        cloud_link = "https://nextgraph.one/#/w/" + ready.wallet_name;
      }
      if (ready.wallet_file.length) {
        const blob = new Blob([ready.wallet_file], {
          type: "application/octet-stream",
        });
        download_link = URL.createObjectURL(blob);
      }
    } catch (e) {
      console.error(e);
      error = e;
    }
  }

  // async function getWallet() {
  //   const opts = {
  //     method: "get",
  //   };
  //   const response = await fetch(
  //     api_url + "bootstrap/I8tuoVE-LRH1wuWQpDBPivlSX8Wle39uHSL576BTxsk",
  //     opts
  //   );
  //   const result = await response.json();
  //   console.log("Result:", result);
  // }

  onMount(async () => await bootstrap());

  ready = false;

  const unsub_register = () => {
    if (unsub_register_accepted) unsub_register_accepted();
    if (unsub_register_error) unsub_register_error();
    if (unsub_register_close) unsub_register_close();
    unsub_register_close = undefined;
    unsub_register_error = undefined;
    unsub_register_accepted = undefined;
  };

  onDestroy(() => {
    unsub_register();
  });

  const select_bsp = async (bsp_url, bsp_name) => {
    if (!tauri_platform || tauri_platform == "android") {
      let redirect_url;
      if (tauri_platform) {
        redirect_url = window.location.href;
      } else {
        let local_url;
        if (!import.meta.env.PROD) {
          local_url = "http://localhost:1421";
        } else {
          local_url = await ng.get_local_url(location.href);
        }
        if (local_url) redirect_url = local_url + APP_WALLET_CREATE_SUFFIX;
      }

      let create = {
        V0: {
          redirect_url,
        },
      };
      let ca = await ng.encode_create_account(create);
      wait = "Redirecting to the Broker Service Provider registration page";
      window.location.href = bsp_url + "?ca=" + ca;
      //window.open(), "_self").focus();
    } else {
      let create = {
        V0: {
          redirect_url: undefined,
        },
      };
      wait = "Complete the registration in the popup window";
      let ca = await ng.encode_create_account(create);
      await ng.open_window(
        bsp_url + "?ca=" + ca,
        "registration",
        "Registration at a Broker"
      );
      let window_api = await import("@tauri-apps/plugin-window");
      let event_api = await import("@tauri-apps/api/event");

      unsub_register_accepted = await event_api.listen(
        "accepted",
        async (event) => {
          wait = false;
          console.log("got accepted with payload", event.payload);
          unsub_register();
          let reg_popup = window_api.Window.getByLabel("registration");
          await reg_popup.close();
          registration_success = bsp_name;
          invitation = await ng.decode_invitation(event.payload.invite);
        }
      );
      unsub_register_error = await event_api.listen("error", async (event) => {
        wait = false;
        console.log("got error with payload", event.payload);
        if (event.payload) registration_error = event.payload.error;
        else intro = true;
        unsub_register();
        let reg_popup = window_api.Window.getByLabel("registration");
        await reg_popup.close();
      });
      await tick();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      let reg_popup = window_api.Window.getByLabel("registration");
      unsub_register_close = await reg_popup.onCloseRequested(async (event) => {
        console.log("onCloseRequested");
        wait = false;
        intro = true;
        unsub_register_close = undefined;
        unsub_register();
      });
    }
  };
  const selectEU = async (event) => {
    await select_bsp(NG_EU_BSP_REGISTER, "nextgraph.eu");
  };
  const selectNET = async (event) => {
    await select_bsp(NG_NET_BSP_REGISTER, "nextgraph.net");
  };
  const enterINVITE = (event) => {};
  const enterQRcode = (event) => {};

  const displayPopup = async (url, title) => {
    if (!tauri_platform || tauri_platform == "android") {
      window.open(url, "_blank").focus();
    } else {
      await ng.open_window(url, "viewer", title);
    }
  };
  const displayNGbox = async (event) => {
    await displayPopup(LINK_NG_BOX, "Own your NG-Box");
  };
  const displaySelfHost = async (event) => {
    await displayPopup(LINK_SELF_HOST, "Self-host a broker");
  };
  const tos = async () => {
    await displayPopup(
      "https://nextgraph.one/#/tos",
      "Terms of Service NextGraph.one"
    );
  };

  const load_pazzle_emojis = async (pazzle_ids: number[]) => {
    // We wait until the SVGs are available. If they are already, we return immediately.
    await load_svg();
    pazzle_emojis = emojis_from_pazzle_ids(pazzle_ids);
  };
  $: if (ready?.pazzle) {
    load_pazzle_emojis(ready.pazzle);
  }

  let width: number;
  let height: number;
  const breakPointWidth: number = 450;
  const breakPointHeight: number = 500;
  let small_screen = false;
  $: if (width >= breakPointWidth && height >= breakPointHeight) {
    small_screen = false;
  } else {
    small_screen = true;
  }
</script>

<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

<CenteredLayout>
  <div class="max-w-2xl lg:px-8 mx-auto px-4">
    {#if wait}
      <div class="lg:px-8 text-primary-700">
        {#if wait === true}
          Please wait...
        {:else}
          {wait}
        {/if}
        <svg
          class="animate-spin mt-10 h-14 w-14 mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    {:else}
      <div class="container3" bind:this={top}>
        <div class="row">
          <a href="#/">
            <Logo class="logo block h-[8em]" alt="NextGraph Logo" />
          </a>
        </div>
        {#if registration_error}
          <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
            <svg
              class="animate-bounce mt-10 h-16 w-16 mx-auto"
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
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            {#if registration_error == "AlreadyExists"}
              <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
                The user is already registered with the selected broker.<br /> Try
                logging in instead
              </p>
              <a use:link href="/wallet/login">
                <button
                  tabindex="-1"
                  class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
                >
                  Login
                </button>
              </a>
            {:else}
              <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
                An error occurred during registration:<br />{registration_error}
              </p>
              <a use:link href="/">
                <button
                  tabindex="-1"
                  class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
                >
                  Go back to homepage
                </button>
              </a>
            {/if}
          </div>
        {:else if intro}
          <div class=" max-w-6xl lg:px-8 mx-auto px-4">
            <p class="max-w-xl md:mx-auto lg:max-w-2xl">
              A <b>NextGraph Wallet</b> is unique to each person. It stores your
              credentials and authorizations to access documents. You need one
              in order to start using NextGraph.<br /><br />If you already have
              a wallet, you should not create a new one, instead,
              <a href="/wallet/login" use:link
                >login here with your existing wallet.</a
              >
              If you never created a NextGraph Wallet before, please follow the instructions
              below in order to create your unique personal wallet.
            </p>
          </div>
          {#if $has_wallets}
            <Alert color="yellow" class="mt-5">
              Some wallets are saved on this device,<br /> to log in with one of
              them,
              <a href="/wallet/login" use:link>click here.</a>
            </Alert>
          {/if}
          <div
            class="px-4 pt-5 mx-auto max-w-6xl lg:px-8 lg:pt-10 dark:bg-slate-800"
          >
            <div class="max-w-xl md:mx-auto sm:text-center lg:max-w-2xl">
              <h2 class="pb-5 text-xl">
                What is a wallet? <span class="text-sm">Please read</span>
              </h2>
              <ul
                class="mb-8 space-y-4 text-left text-gray-500 dark:text-gray-400"
              >
                <li class="flex space-x-3">
                  <!-- Icon -->
                  <svg
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
                    stroke="currentColor"
                    fill="none"
                    stroke-width="1.5"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                  <span
                    >It is a secure and encrypted small file that contains some
                    important information that only you should have access to.</span
                  >
                </li>
                <li class="flex space-x-3">
                  <!-- Icon -->
                  <svg
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
                      d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                    />
                  </svg>
                  <span
                    >In your wallet, we store all the permissions to access
                    documents you have been granted with, or that you have
                    created yourself.</span
                  >
                </li>
                <li class="flex space-x-3">
                  <!-- Icon -->
                  <svg
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
                      d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z"
                    />
                  </svg>
                  <span
                    >In order to open it, you will need to enter your <b
                      >pazzle</b
                    >
                    and a
                    <b>PIN code</b> of 4 digits. Your personal pazzle (contraction
                    of puzzle and password) is composed of 9 images you should remember.
                    The order of the images is important too.</span
                  >
                </li>
                <li class="flex space-x-3">
                  <!-- Icon -->

                  <svg
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                  <span
                    >Don't worry, it is easier to remember 9 images than a
                    password like "69$g&ms%C*%", and it has the same strength as
                    a complex password. The entropy of your pazzle is <b
                      >66bits</b
                    >, which is considered very high by all standards.</span
                  >
                </li>

                <li class="flex space-x-3">
                  <!-- Icon -->
                  <svg
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25"
                    />
                  </svg>
                  <span
                    >You should only create <b>one unique wallet for yourself</b
                    >. All your accounts, identities and permissions will be
                    added to this unique wallet later on. Do not create another
                    wallet if you already have one. Instead, you will
                    <b>import</b> your existing wallet in all the apps and websites
                    where you need it</span
                  >
                </li>
                <li class="flex space-x-3">
                  <!-- Icon -->
                  <svg
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
                      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                    />
                  </svg>
                  <span
                    >Your wallet can be imported with the help of a small file
                    that you download, or with a QRcode. In any case, you should
                    never share this file or QRcode with anybody else.</span
                  >
                </li>
                <li class="flex space-x-3">
                  <!-- Icon -->
                  <svg
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                  <span
                    >We at NextGraph will never see the content of your wallet.
                    It is encrypted and we do not know your pazzle, so we cannot
                    see what is inside.</span
                  >
                </li>
                <li class="flex space-x-3 under">
                  <!-- Icon -->
                  <svg
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
                      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                    />
                  </svg>
                  <span
                    >For the same reason, we won't be able to help you if you
                    forget your pazzle or PIN code, or if you loose the wallet
                    file. <span class="text-bold">
                      There is no "password recovery" option</span
                    > in this case. You can note your pazzle down on a piece of paper
                    until you remember it, but don't forget to destroy this note
                    after a while.</span
                  >
                </li>
              </ul>
            </div>
          </div>
          <div class="row mb-20">
            <button
              on:click|once={create_wallet}
              class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
            >
              <svg
                class="w-8 h-8 mr-2 -ml-1"
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
              Ok, I create my wallet now !
            </button>
          </div>
        {:else if !invitation}
          <div class=" max-w-6xl lg:px-8 mx-auto px-4">
            <p class="max-w-xl md:mx-auto lg:max-w-2xl">
              NextGraph is based on an efficient decentralized P2P network, and
              in order to join this network and start using the app, you need to
              first select a <b>broker&nbsp;server</b>.
            </p>
          </div>
          <div
            class="px-4 pt-3 mx-auto max-w-6xl lg:px-8 lg:pt-10 dark:bg-slate-800"
          >
            <div class="max-w-xl md:mx-auto sm:text-center lg:max-w-2xl">
              <h2 class="pb-5 text-xl">
                What is a broker? <span class="text-sm">Please read</span>
              </h2>
              <ul
                class="mb-8 space-y-4 text-left text-gray-500 dark:text-gray-400"
              >
                <li class="flex space-x-3">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  <span>
                    The broker helps you keep all your data in <b>sync</b>, as
                    it is connected to the internet 24/7 and keeps a copy of the
                    updates for you. This way, even if the devices of the other
                    participants are offline, you can still see their changes</span
                  >
                </li>
                <li class="flex space-x-3">
                  <svg
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
                      d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                    />
                  </svg>
                  <span>
                    All your data is secure and <b>end-to-end encrypted</b>, and
                    the broker cannot see the content of the documents as it
                    does not have the keys to decrypt them.</span
                  >
                </li>
                <li class="flex space-x-3">
                  <svg
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                  <span>
                    The broker helps you enforce your <b>privacy</b> as it hides
                    your internet address (IP) from other users you share documents
                    with.</span
                  >
                </li>
                <li class="flex space-x-3">
                  <svg
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
                      d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>

                  <span>
                    It will be possible in the future to use NextGraph without
                    any broker and to have direct connections between peers, but
                    this will imply a less smooth experience.</span
                  >
                </li>
                <li class="flex space-x-3">
                  <svg
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
                      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                    />
                  </svg>
                  <span>
                    At anytime you can decide to switch to another broker
                    service provider or host it yourself. Your data is totally <b
                      >portable</b
                    >
                    and can freely move to another broker.</span
                  >
                </li>
                <li class="flex space-x-3">
                  <svg
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
                      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                    />
                  </svg>

                  <span>
                    Soon we will offer you the opportunity to host your own
                    broker at <b>home</b>
                    or <b>office</b>. Instead of using a "broker service
                    provider", you will own a small device that you connect
                    behind your internet router. It is called <b>NG Box</b> and will
                    be available soon.</span
                  >
                </li>
                <li class="flex space-x-3">
                  <svg
                    class="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400"
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
                      d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
                    />
                  </svg>

                  <span>
                    Organizations and companies have the opportunity to host a
                    broker <b>on-premise</b>
                    or in the <b>cloud</b>, as the software is open source.
                    Individuals can also
                    <b>self-host</b> a broker on any VPS server or at home, on their
                    dedicated hardware.</span
                  >
                </li>
              </ul>
              <h2 class="mt-3 text-xl">
                Please choose one broker among the list
              </h2>
            </div>
          </div>
          {#if pre_invitation}
            <div class="row mt-5">
              <button
                on:click|once={async () => {
                  await select_bsp(
                    pre_invitation.V0.url,
                    pre_invitation.V0.name
                  );
                }}
                class="choice-button text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  class="mr-4 block h-10 w-10"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                  />
                </svg>
                Register with {pre_invitation.V0.name || "this broker"}
              </button>
            </div>
          {:else}
            <div class="row mt-5">
              <button
                on:click|once={selectEU}
                class="choice-button text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mb-2"
              >
                <EULogo
                  class="mr-4 block h-10 w-10"
                  alt="European Union flag"
                />
                For European Union citizens
              </button>
            </div>

            <div class="row mt-5">
              <button
                on:click|once={selectNET}
                class="choice-button text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mb-2"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  class="mr-4 block h-10 w-10"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                  />
                </svg>
                For the rest of the world
              </button>
            </div>
          {/if}

          <div class="row mt-5">
            <Button
              disabled
              style="justify-content: left;"
              on:click|once={enterINVITE}
              class="choice-button text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4  focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mb-2"
            >
              <svg
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                class="mr-4 block h-10 w-10"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                />
              </svg>

              Enter an invitation link
            </Button>
          </div>
          {#if false && mobile}
            <div class="row mt-5">
              <button
                on:click|once={enterQRcode}
                class="choice-button text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mb-2"
                ><svg
                  class="mr-4 block h-10 w-10"
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
                    d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
                  />
                </svg>

                Scan an invitation QRcode
              </button>
            </div>
          {/if}
          <div class="row mt-5">
            <button
              on:click={displaySelfHost}
              class="choice-button text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mb-2"
            >
              <svg
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                class="mr-4 block h-10 w-10"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
                />
              </svg>
              Self-hosted broker
            </button>
          </div>
          <div class="row mt-5 mb-12">
            <button
              on:click={displayNGbox}
              class="choice-button text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mb-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                version="1.1"
                viewBox="0 0 225 225"
                class="mr-4 block h-10 w-10"
                stroke="currentColor"
                stroke-width="12"
                fill="none"
              >
                <path
                  d="M 88.332599,179.77884 C 72.858008,177.42608 59.581081,170.564 48.8817,159.38898 36.800075,146.77026 30.396139,130.74266 30.396139,113.12381 c 0,-8.81477 1.466462,-16.772273 4.503812,-24.439156 3.697755,-9.333883 8.658122,-16.726264 15.988284,-23.827148 4.07992,-3.952299 5.699054,-5.267377 9.730928,-7.903581 10.263753,-6.710853 20.852276,-10.247623 32.861256,-10.976317 17.083161,-1.036581 33.737521,4.410501 47.100151,15.404873 1.30009,1.069669 2.35446,2.035155 2.34305,2.145524 -0.0114,0.110369 -3.32807,3.135042 -7.37038,6.721489 -4.04229,3.586437 -8.6667,7.731233 -10.27646,9.210635 -1.60975,1.479412 -3.05439,2.689839 -3.21032,2.689839 -0.15591,0 -1.2075,-0.642795 -2.33686,-1.428431 -6.49544,-4.518567 -13.79659,-6.747116 -22.104843,-6.747116 -10.982241,0 -20.054641,3.741852 -27.727158,11.435891 -5.517107,5.532575 -9.233107,12.555305 -10.782595,20.377588 -0.596045,3.00901 -0.594915,11.67153 0.0017,14.67182 3.195984,16.0665 15.801761,28.55358 31.607491,31.30987 3.592183,0.62643 10.334745,0.61437 13.792675,-0.0247 12.10383,-2.2368 22.30712,-9.80603 27.83192,-20.64689 0.66747,-1.30971 1.08703,-2.48825 0.93235,-2.61898 -0.1547,-0.13073 -5.9299,-1.01605 -12.83381,-1.96739 -8.43575,-1.16241 -12.87296,-1.9096 -13.52955,-2.27826 -1.31171,-0.73647 -2.44642,-2.49122 -2.44642,-3.78325 0,-1.012 1.74837,-13.68832 2.1486,-15.57814 0.25598,-1.20873 2.0923,-3.01339 3.3151,-3.25795 0.53677,-0.10735 7.61424,0.73799 15.7688,1.88346 8.13723,1.14303 14.89071,1.97925 15.00772,1.85826 0.11702,-0.12098 0.96445,-5.648553 1.88315,-12.283473 0.95557,-6.900944 1.90122,-12.59548 2.20977,-13.306594 0.29667,-0.683692 0.95765,-1.595052 1.46889,-2.025218 1.77972,-1.497534 2.7114,-1.539742 10.52745,-0.476938 8.31229,1.130266 9.2373,1.347581 10.59333,2.488613 1.41776,1.192951 1.96085,2.424677 1.94866,4.419342 -0.006,0.950347 -0.79507,7.156475 -1.75393,13.791395 -0.95885,6.634933 -1.70069,12.111623 -1.64854,12.170443 0.0522,0.0588 6.18174,0.95872 13.62132,1.99978 9.57969,1.34053 13.80866,2.0595 14.49353,2.46406 1.3199,0.77969 2.13943,2.28402 2.1135,3.87957 -0.0399,2.45278 -2.08103,15.63263 -2.5664,16.57122 -0.57073,1.10369 -2.24485,2.197 -3.38232,2.20889 -0.44831,0.004 -6.79249,-0.82755 -14.09817,-1.84941 -7.3057,-1.02186 -13.34942,-1.79161 -13.43049,-1.71053 -0.0811,0.0811 -1.02469,6.33285 -2.09694,13.89286 -1.24218,8.75802 -2.1547,14.1778 -2.51495,14.93697 -0.62565,1.31846 -2.38302,2.64205 -3.91461,2.94836 -0.8254,0.16509 -9.4024,-0.80047 -11.73007,-1.32049 -0.47193,-0.10544 -1.63157,0.58011 -3.8898,2.29957 -9.71515,7.39729 -20.99725,11.99799 -33.08692,13.49241 -3.79574,0.46921 -13.565667,0.37348 -17.125664,-0.16779 z"
                />
                <rect
                  ry="37.596001"
                  y="10.583322"
                  x="14.363095"
                  height="204.86308"
                  width="195.79167"
                />
              </svg>
              NG Box (owned or invited)
            </button>
          </div>
        {:else if pin.length < 4}
          <div class=" max-w-6xl lg:px-8 mx-auto px-3">
            {#if registration_success}
              <Alert color="green" class="mb-5">
                <span class="font-bold text-xl"
                  >You have been successfully registered to {registration_success}</span
                >
              </Alert>
            {/if}
            <p class="max-w-xl md:mx-auto lg:max-w-2xl">
              <span class="text-xl"
                >Let's start creating your wallet by choosing a PIN code</span
              >
              <Alert color="yellow" class="mt-5">
                We recommend you to choose a PIN code that you already know very
                well.
                <br />
                Your credit card PIN, by example, is a good choice.<br />We at
                NextGraph will never see your PIN.
              </Alert>
            </p>
            <p class="text-left mt-5">Here are the rules for the PIN :</p>
            <ul class="text-left list-disc list-inside">
              <li>It cannot be a series like 1234 or 8765</li>
              <li>
                The same digit cannot repeat more than once. By example 4484 is
                invalid
              </li>
              <li>
                Try to avoid birth date, last digits of phone number, or zip
                code
              </li>
            </ul>

            <Alert color="blue" class="mt-5">
              You have chosen: {#each pin as digit}<span
                  class="font-bold text-xl">{digit}</span
                >{/each}
            </Alert>
            <div class="w-[295px] mx-auto mb-4">
              {#each [0, 1, 2] as row}
                <div class="">
                  {#each [1, 2, 3] as num}
                    <button
                      tabindex="0"
                      class="m-1 select-none align-bottom text-7xl w-[90px] h-[90px] p-0"
                      on:click={async () => sel_pin(num + row * 3)}
                    >
                      <span>{num + row * 3}</span>
                    </button>
                  {/each}
                </div>
              {/each}
              <button
                tabindex="0"
                class="m-1 select-none mx-auto align-bottom text-7xl w-[90px] h-[90px] p-0"
                on:click={async () => sel_pin(0)}
              >
                <span>0</span>
              </button>
            </div>
          </div>
        {:else if pin_confirm.length < 4}
          <div class=" max-w-6xl lg:px-8 mx-auto px-3">
            <p class="max-w-xl md:mx-auto lg:max-w-2xl">
              <span class="text-red-800 text-xl"
                >Please confirm your PIN code.</span
              >
              Enter the same PIN again
            </p>
            <Alert color="blue" class="mt-5">
              You have chosen: {#each pin_confirm as digit}<span
                  class="font-bold text-xl">{digit}</span
                >{/each}
            </Alert>
            <div class="w-[295px] mx-auto">
              {#each [0, 1, 2] as row}
                <div class="">
                  {#each [1, 2, 3] as num}
                    <button
                      tabindex="0"
                      class="m-1 select-none align-bottom text-7xl w-[90px] h-[90px] p-0"
                      on:click={async () => await confirm_pin(num + row * 3)}
                    >
                      <span>{num + row * 3}</span>
                    </button>
                  {/each}
                </div>
              {/each}
              <button
                tabindex="0"
                class="m-1 select-none mx-auto align-bottom text-7xl w-[90px] h-[90px] p-0"
                on:click={async () => await confirm_pin(0)}
              >
                <span>0</span>
              </button>
            </div>
          </div>
        {:else if !options}
          <div class=" max-w-6xl lg:px-8 mx-auto px-4">
            {#if pin.toString() === pin_confirm.toString()}
              <Alert color="green" class="mt-5">
                Your PIN is confirmed as : {#each pin_confirm as digit}<span
                    class="font-bold text-xl">{digit}</span
                  >{/each}
              </Alert>
              <h2 class="text-xl my-5">
                Now let's enter a security phrase and a security image
              </h2>
              <p class="max-w-xl md:mx-auto lg:max-w-2xl text-left">
                As a verification step, this phrase and image will be presented
                to you every time you are about to enter your pazzle and PIN in
                order to unlock your wallet.<br />
                This security measure will prevent you from entering your pazzle
                and PIN on malicious sites and apps.
                <Alert color="red" class="mt-5">
                  Every time you will use your wallet, if you do not see and
                  recognize your own security phrase and image before entering
                  your pazzle, please stop and DO NOT enter your pazzle, as you
                  would be the victim of a phishing attempt.
                </Alert>
              </p>
              <p
                class="max-w-xl md:mx-auto lg:max-w-2xl text-left mt-5 text-sm"
              >
                Here are the rules for the security phrase and image :
              </p>
              <ul
                class="max-w-xl md:mx-auto lg:max-w-2xl text-left mt-5 text-sm list-disc list-inside"
              >
                <li>The phrase should be at least 10 characters long</li>
                <li>
                  It should be something you will remember, but not something
                  too personal.
                </li>
                <li>
                  Do not enter your full name, nor address, nor phone number.
                </li>
                <li>
                  Instead, you can enter a quote, a small sentence that you
                  like, or something meaningless to others, but unique to you.
                </li>
                <li>
                  The image should be minimum 150x150px. There is no need to
                  provide more than 400x400px as it will be scaled down anyway.
                </li>
                <li>
                  We accept several formats like JPEG, PNG, GIF, WEBP and more.
                </li>
                <li>
                  The image should be unique to you. But it should not be too
                  personal neither.
                </li>
                <li>
                  Do not upload your face picture, this is not a profile pic.
                </li>
                <li>
                  The best would be a landscape you like or any other picture
                  that you will recognize as unique.
                </li>
                <li>
                  Please be aware that other people who are sharing this device
                  with you, will be able to see this image and phrase.
                </li>
              </ul>

              <input
                bind:this={phrase}
                class="mt-10 mr-0"
                id="security-phrase-input"
                placeholder="Type a security phrase..."
                bind:value={security_txt}
                on:keypress={security_phrase_ok}
              /><button on:click={async () => await security_phrase_ok()}>
                Ok
              </button><br />
              {#if security_txt && security_img}
                <button
                  on:click|once={save_security}
                  bind:this={validate_button}
                  class="animate-bounce mt-10 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
                >
                  <svg
                    class="w-8 h-8 mr-2 -ml-1"
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
                      d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z"
                    />
                  </svg>

                  Save security phrase & image
                </button>
              {/if}
              <Dropzone
                class="mt-10 mb-10"
                defaultClass="flex flex-col justify-center items-center w-full h-30 bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed cursor-pointer dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
                id="dropzone"
                accept=".jpg, .jpeg, .png, .gif, .webp, .pnm, .tiff, .tif, .tga, .bmp, .avif, .qoi, .exr, .ppm"
                on:drop={dropHandle}
                on:dragover={(event) => {
                  event.preventDefault();
                }}
                on:change={handleChange}
              >
                <p class="mt-2 mb-5 text-gray-500 dark:text-gray-400">
                  {#if is_touch_device}
                    <span class="font-semibold">Tap to upload an image</span>
                  {:else}
                    <span class="font-semibold">Click to select an image</span> or
                    drag and drop
                  {/if}
                </p>
                <svg
                  aria-hidden="true"
                  class="mb-3 w-20 mx-auto h-20 text-gray-400"
                  class:animate-bounce={animate_bounce}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  /></svg
                >
              </Dropzone>
              <img
                bind:this={img_preview}
                class="max-w-[250px] h-[250px] mx-auto mb-10"
                src={image_url}
                alt="your security"
              />
            {:else}
              <Alert color="red" class="mt-5">
                You didn't enter the same PIN twice
              </Alert>
              <button
                class="select-none"
                on:click={async () => {
                  pin_confirm = [];
                  pin = [];
                }}
              >
                Start over
              </button>
            {/if}
          </div>
        {:else if !creating}
          <div class=" max-w-6xl lg:px-8 mx-auto px-4" bind:this={info_options}>
            <p class="max-w-xl mb-10 md:mx-auto lg:max-w-2xl">
              <span class="text-xl">We are almost done !</span><br />
              There are 4 options to choose before we can create your wallet. Those
              options can help you to use and keep your wallet. But we also want
              to be careful with your security and privacy.<br /><br />
              Remember that in any case, once your wallet will be created, you will
              download a file that you should keep privately somewhere on your device,
              USB key or hard-disk. This is the default way you can use and keep
              your wallet. Now let's look at some options that can make your life
              a bit easier.
            </p>
            <p class="max-w-xl md:mx-auto lg:max-w-2xl text-left">
              <span class="text-xl">Do you trust this device? </span> <br />
              If you do, if this device is yours or is used by few trusted persons
              of your family or workplace, and you would like to login again from
              this device in the future, then you can save your wallet on this device.
              To the contrary, if this device is public and shared by strangers,
              do not save your wallet here. {#if !tauri_platform}By selecting
                this option, you agree to save some cookies on your browser.{/if}<br
              />
              <Toggle class="mt-3" bind:checked={options.trusted}
                >Save my wallet on this device?</Toggle
              >
            </p>
            <p class="max-w-xl md:mx-auto mt-10 lg:max-w-2xl text-left">
              <span class="text-xl">Keep a copy in the cloud? </span> <br />
              Are you afraid that you will loose the file containing your wallet?
              If this would happen, your wallet would be lost forever, together with
              all your documents. We can keep an encrypted copy of your wallet in
              our cloud. Only you will be able to download it with a special link.
              You would have to keep this link safely though. By selecting this option,
              you agree to the
              <span
                style="font-weight: 500;cursor: pointer; color: #646cff;"
                tabindex="0"
                role="link"
                on:keypress={tos}
                on:click={tos}>Terms of Service of our cloud</span
              >.
              <br />
              <Toggle disabled class="mt-3" bind:checked={options.cloud}
                >Save my wallet in the cloud?</Toggle
              >
            </p>
            <p class="max-w-xl md:mx-auto mt-10 lg:max-w-2xl text-left">
              <span class="text-xl">Create a PDF file of your wallet? </span>
              <br />
              We can prepare for you a PDF file containing all the information of
              your wallet, unencrypted. You should print this file and then delete
              the PDF (and empty the trash). Keep this printed document in a safe
              place. It contains all the information to regenerate your wallet in
              case you lost access to it.
              <br />
              <Toggle disabled class="mt-3" bind:checked={options.pdf}
                >Create a PDF of my wallet?</Toggle
              >
            </p>
            {#if !options.cloud}
              <p class="max-w-xl md:mx-auto mt-10 lg:max-w-2xl text-left">
                <span class="text-xl"
                  >Create a link to access your wallet easily?
                </span> <br />
                When you want to use your wallet on the web or from other devices,
                we can help you find your wallet by creating a simple link accessible
                from anywhere. Only you will have access to this link. In order to
                do so, we will keep your wallet ID and some information about your
                broker on our cloud servers. If you prefer to opt out, just uncheck
                this option. By selecting this option, you agree to the
                <span
                  style="font-weight: 500;cursor: pointer; color: #646cff;"
                  tabindex="0"
                  role="link"
                  on:keypress={tos}
                  on:click={tos}>Terms of Service of our cloud</span
                >.
                <br />
                <Toggle disabled class="mt-3" bind:checked={options.bootstrap}
                  >Create a link to my wallet?</Toggle
                >
              </p>
            {/if}
            <button
              on:click|once={do_wallet}
              class="mt-10 mb-20 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            >
              <svg
                class="w-8 h-8 mr-2 -ml-1"
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
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              Let's create this wallet
            </button>
          </div>
        {:else if !error}
          {#if !ready}
            <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-primary-700">
              Your wallet is being created...
              <svg
                class="animate-spin mt-10 h-6 w-6 mx-auto"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          {:else}
            <div class="text-left">
              <div class="text-green-800 mx-auto flex flex-col items-center">
                <div>Your wallet is ready!</div>
                <svg
                  class="my-10 h-16 w-16"
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
              {#if download_link}
                Please download your wallet and keep it in a safe location<br />
                <a
                  href={download_link}
                  target="_blank"
                  download={download_name}
                >
                  <button
                    tabindex="-1"
                    class:animate-bounce={animateDownload}
                    on:click={() => (animateDownload = false)}
                    class="mt-10 mb-8 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
                  >
                    <svg
                      class="w-8 h-8 mr-2 -ml-1"
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
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>

                    Download my wallet
                  </button>
                </a><br />
              {:else if !options.trusted}
                Your wallet file has been downloaded into your "Downloads"
                folder, with the name<br /><span class="text-black">
                  {download_name}</span
                ><br />
                <span class="font-bold"
                  >Please move it to a safe and durable place.</span
                ><br /><br />
              {/if}
              <!-- Pazzle -->
              Here is your Pazzle
              <br />
              The <span class="font-bold">order</span> of each image is
              <span class="font-bold">important</span>:

              <div
                class="mt-2 bg-white shadow-md rounded-lg max-w-2xl w-full mx-auto"
              >
                {#each pazzle_emojis as emoji, index}
                  <div
                    class="flex items-center w-full py-1 px-2"
                    class:border-b={index !== pazzle_emojis.length - 1}
                    class:justify-center={!small_screen}
                  >
                    <div class="w-[10em] font-bold text-left">
                      <span>{index + 1}</span>: <span>{emoji.cat}</span>
                    </div>
                    <div
                      class="flex justify-center items-center"
                      class:w-[3em]={!small_screen}
                      class:w-[1.8em]={small_screen}
                      title={emoji.code}
                    >
                      <svelte:component
                        this={emoji.svg?.default}
                        class="text-5xl"
                      />
                    </div>
                    <div class="ml-2 w-[6em] font-bold text-left">
                      {emoji.code}
                    </div>
                  </div>
                {/each}
              </div>

              <br />

              <br /><br />
              <!-- Mnemonic (copy button). TODO: once the component is available-->
              <label for="mnemonic mb-2"
                >And here is your mnemonic (your alternative passphrase):</label
              >
              <CopyToClipboard
                id="mnemonic"
                value={ready.mnemonic_str.join(" ")}
              />
              <br />
              You can use both the pazzle or the mnemonic to unlock your wallet.
              The pazzle is easier to remember. The mnemonic is useful in some special
              cases. We recommend that you use the pazzle.

              <em class="font-bold">Copy both on a piece of paper.</em> You
              should try to memorize the pazzle. Once you did, you won't need
              the paper anymore.

              <br /><br />
              Now click on "Continue to Login" and select your new wallet.
              <br />
              It is important that you <em class="font-bold">login</em> with
              this wallet
              <em class="font-bold">at least once</em>
              from this {#if tauri_platform}device{:else}browser tab{/if},<br />
              while connected to the internet, so your personal site can be created
              on your broker.<br /><br />
              <div class="flex flex-col items-center">
                <button
                  tabindex="-1"
                  class="mb-20 text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mr-2"
                  on:click={() => (confirm_modal_open = true)}
                >
                  <svg
                    class="w-8 h-8 mr-2 -ml-1"
                    fill="currentColor"
                    stroke="currentColor"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                  Continue to Login
                </button>
              </div>
              <Modal
                autoclose
                outsideclose
                bind:open={confirm_modal_open}
                title="Did you write down your login credentials?"
              >
                The pazzle and the mnemonic will not be shown to you again.
                Please make sure, you have written it down.
                <div>
                  <button
                    class="m-2"
                    on:click={() => (confirm_modal_open = false)}
                    >Take me back</button
                  >
                  <a href="/wallet/login" use:link>
                    <button class="m-2 bg-primary-700 text-white"
                      >Yes, I did</button
                    >
                    <!-- todo: blue button-->
                  </a>
                </div>
              </Modal>
            </div>
          {/if}
        {:else}
          <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
            An error occurred !
            <svg
              fill="none"
              class="animate-bounce mt-10 h-10 w-10 mx-auto"
              stroke="currentColor"
              stroke-width="1.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <Alert color="red" class="mt-5">
              {error}
            </Alert>
            <button
              class="mt-10 select-none"
              on:click={async () => {
                pin_confirm = [];
                pin = [];
                options = undefined;
                creating = false;
                error = undefined;
                animateDownload = true;
              }}
            >
              Start over
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</CenteredLayout>

<style>
</style>
