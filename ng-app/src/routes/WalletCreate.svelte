<!--
// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->

<script>
  import { Button, Alert, Dropzone, Toggle } from "flowbite-svelte";
  import { link } from "svelte-spa-router";
  import EULogo from "../assets/EU.svg?component";
  import Logo from "../assets/nextgraph.svg?component";
  import ng from "../api";
  import { display_pazzle } from "../wallet_emojis";

  import { onMount, tick } from "svelte";

  let mobile =
    import.meta.env.TAURI_PLATFORM == "android" ||
    import.meta.env.TAURI_PLATFORM == "ios";

  const onFileSelected = (image) => {
    animate_bounce = false;
    if (!security_txt) phrase.focus();
    let reader = new FileReader();
    reader.readAsArrayBuffer(image);
    reader.onload = async (e) => {
      security_img = e.target.result;
      console.log(security_img);
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

  let intro = false;
  let pin = [];
  let pin_confirm = [];
  let security_txt = "";
  let security_img;
  let top;
  let img_preview;
  let phrase;
  let validate_button;
  let animate_bounce;
  let image_url;
  let info_options;
  let options;
  let creating = false;
  let error;
  let ready;
  let download_link;
  let download_name;
  let cloud_link;
  let animateDownload = true;

  function scrollToTop() {
    top.scrollIntoView();
  }

  function sel_pin(val) {
    if (pin.length < 4) {
      pin.push(val);
      pin = pin;
    }
  }

  function confirm_pin(val) {
    if (pin_confirm.length < 4) {
      pin_confirm.push(val);
      pin_confirm = pin_confirm;
    }
  }

  const api_url = import.meta.env.PROD
    ? "api/v1/"
    : "http://localhost:3030/api/v1/";

  let display_note_on_local_wallets = true;

  async function bootstrap() {
    scrollToTop();
    let bs;
    try {
      bs = localStorage.getItem("bootstrap");
    } catch (e) {}
    if (bs) {
      display_note_on_local_wallets = true;
    }
  }

  function create_wallet() {
    intro = false;
    scrollToTop();
  }

  async function save_security() {
    options = {
      trusted: true,
      cloud: false,
      bootstrap: true,
      pdf: true,
    };
    console.log("saved");
    await tick();
    scrollToTop();
  }

  async function do_wallet() {
    creating = true;
    let params = {
      security_img: security_img,
      security_txt,
      pin,
      pazzle_length: 9,
      send_bootstrap: undefined, //options.cloud || options.bootstrap ?  : undefined,
      send_wallet: options.cloud,
      peer_id: {
        Ed25519PubKey: [
          119, 251, 253, 29, 135, 199, 254, 50, 134, 67, 1, 208, 117, 196, 167,
          107, 2, 113, 98, 243, 49, 90, 7, 0, 157, 58, 14, 187, 14, 3, 116, 86,
        ],
      },
      nonce: 0,
      local_save: options.trusted, // this is only used for tauri apps
      result_with_wallet_file: false, // this will be automatically changed to true for browser app
    };
    console.log(params);
    try {
      let res = await ng.wallet_create_wallet(params);
      console.log(res);
      console.log(display_pazzle(res.pazzle));
      ready = res;
      download_name = "wallet-" + res.wallet_name + ".ngw";
      if (options.cloud) {
        cloud_link = "https://nextgraph.one/#/w/" + res.wallet_name;
      }
      if (res.wallet_file.length) {
        const blob = new Blob([res.wallet_file]);
        download_link = URL.createObjectURL(blob);

        // we also save the wallet to localStorage here, and only if options.trusted is true
        // indeed if a wallet_file is sent in the result, it means we are not on tauri app
        // therefor we are on a web-browser.
        if (options.trusted) {
          //TODO save in localStorage
        }
      }
    } catch (e) {
      console.log(e);
      error = e;
    }
  }

  async function getWallet() {
    const opts = {
      method: "get",
    };
    const response = await fetch(
      api_url + "bootstrap/I8tuoVE-LRH1wuWQpDBPivlSX8Wle39uHSL576BTxsk",
      opts
    );
    const result = await response.json();
    console.log("Result:", result);
  }

  onMount(() => bootstrap());
</script>

<main class="container3" bind:this={top}>
  <div class="row">
    <a href="#/">
      <Logo class="logo block h-40" alt="NextGraph Logo" />
    </a>
  </div>
  {#if intro}
    <div class=" max-w-6xl lg:px-8 mx-auto px-4">
      <p class="max-w-xl md:mx-auto lg:max-w-2xl">
        A <b>NextGraph Wallet</b> is unique to each individual. It stores your
        credentials and authorizations to access documents. <br /><br />If you
        already have a wallet, you should not create a new one, instead,
        <a href="/wallet/login" use:link
          >login here with your existing wallet.</a
        >
        If you never created a NextGraph Wallet before, please follow the instructions
        below in order to create your personal wallet.
      </p>
    </div>
    {#if display_note_on_local_wallets}
      <Alert color="yellow" class="mt-5">
        Some wallets are saved on this device,<br /> to log in with one of them,
        <a href="/wallet/login" use:link>click here.</a>
      </Alert>
    {/if}
    <div class="px-4 pt-5 mx-auto max-w-6xl lg:px-8 lg:pt-10 dark:bg-slate-800">
      <div class="max-w-xl md:mx-auto sm:text-center lg:max-w-2xl">
        <h2 class="pb-5 text-xl">
          What is a wallet? <span class="text-sm">Please read</span>
        </h2>
        <ul class="mb-8 space-y-4 text-left text-gray-500 dark:text-gray-400">
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
              >In it, we store all the permissions to access documents you have
              been granted with, or that you have created yourself.</span
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
              >In order to open it, you will need to enter your <b>pazzle</b>
              and a
              <b>PIN code</b> of 4 digits. Your personal pazzle (contraction of puzzle
              and password) is composed of 9 images you should remember. The order
              of the images is important too.</span
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
              >Don't worry, it is easier to remember 9 images than a password
              like "69$g&ms%C*%", and it has the same strength than a complex
              password. The entropy of your pazzle is <b>66bits</b>, which is
              considered very high by all standards.</span
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
              >You should only create <b>one unique wallet for yourself</b>. All
              your accounts, identities and permissions will be added to this
              unique wallet later on. Do not create another wallet if you
              already have one. Instead, you will
              <b>import</b> your existing wallet in all the apps and websites where
              you need it</span
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
              >Your wallet can be imported with the help of a small file that
              you download, or with a QRcode. In any case, you should never
              share this file or QRcode with anybody else.</span
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
              >We at NextGraph will never see the content of your wallet. It is
              encrypted and we do not know your pazzle, so we cannot see what is
              inside.</span
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
              >For the same reason, we won't be able to help you if you forget
              your pazzle or PIN code. There is no "password recovery" option in
              this case. You can note your pazzle down on a piece of paper until
              you remember it, but don't forget to destroy this note after a
              while.</span
            >
          </li>
        </ul>
      </div>
    </div>
    <div class="row mb-20">
      <button
        on:click|once={create_wallet}
        role="button"
        class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:outline-none focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mr-2 mb-2"
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
  {:else if pin.length < 4}
    <div class=" max-w-6xl lg:px-8 mx-auto px-4">
      <p class="max-w-xl md:mx-auto lg:max-w-2xl">
        <span class="text-xl">Let's start by choosing a PIN code</span>
        <Alert color="yellow" class="mt-5">
          We recommend you to choose a PIN code that you already know very well
          :<br />
          your credit card PIN, by example, is a good choice
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
          Try to avoid birth date, last digits of phone number, or zip code
        </li>
      </ul>

      <Alert color="blue" class="mt-5">
        You have chosen: {#each pin as digit}<span class="font-bold text-xl"
            >{digit}</span
          >{/each}
      </Alert>
      <div class="w-[325px] mx-auto">
        {#each [0, 1, 2] as row}
          <div class="">
            {#each [1, 2, 3] as num}
              <button
                tabindex="0"
                class="m-1 select-none align-bottom text-7xl w-[100px] h-[100px] p-0"
                on:click={async () => sel_pin(num + row * 3)}
              >
                <span>{num + row * 3}</span>
              </button>
            {/each}
          </div>
        {/each}
        <button
          tabindex="0"
          class="m-1 select-none mx-auto align-bottom text-7xl w-[100px] h-[100px] p-0"
          on:click={async () => sel_pin(0)}
        >
          <span>0</span>
        </button>
      </div>
    </div>
  {:else if pin_confirm.length < 4}
    <div class=" max-w-6xl lg:px-8 mx-auto px-4">
      <p class="max-w-xl md:mx-auto lg:max-w-2xl">
        <span class="text-xl">Please confirm your PIN code.</span>
        Enter the same PIN again
      </p>
      <Alert color="blue" class="mt-5">
        You have chosen: {#each pin_confirm as digit}<span
            class="font-bold text-xl">{digit}</span
          >{/each}
      </Alert>
      <div class="w-[325px] mx-auto">
        {#each [0, 1, 2] as row}
          <div class="">
            {#each [1, 2, 3] as num}
              <button
                tabindex="0"
                class="m-1 select-none align-bottom text-7xl w-[100px] h-[100px] p-0"
                on:click={async () => confirm_pin(num + row * 3)}
              >
                <span>{num + row * 3}</span>
              </button>
            {/each}
          </div>
        {/each}
        <button
          tabindex="0"
          class="m-1 select-none mx-auto align-bottom text-7xl w-[100px] h-[100px] p-0"
          on:click={async () => confirm_pin(0)}
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
          As a verification step, this phrase and image will be presented to you
          every time you are about to enter your pazzle and PIN before you
          unlock your wallet.<br />
          This security measure will prevent you from entering your pazzle and PIN
          on malicious sites and apps.
          <Alert color="red" class="mt-5">
            Every time you will use your wallet, if you do not see and recognize
            your own security phrase and image before entering your pazzle,
            please stop and DO NOT enter your pazzle, as you would be the victim
            of a phishing attempt.
          </Alert>
        </p>
        <p class="text-left mt-5">
          Here are the rules for the security phrase and image :
        </p>
        <ul class="text-left list-disc list-inside">
          <li>The phrase should be at least 10 characters long</li>
          <li>
            It should be something you will remember, but not something too
            personal.
          </li>
          <li>Do not enter your full name, nor address, nor phone number.</li>
          <li>
            Instead, you can enter a quote, a small sentence that you like, or
            something meaningless to others, but unique to you.
          </li>
          <li>
            The image should be minimum 150x150px. There is no need to provide
            more than 400x400px as it will be scaled down anyway.
          </li>
          <li>We accept several formats like JPEG, PNG, GIF, WEBP and more.</li>
          <li>
            The image should be unique to you. But it should not be too personal
            neither.
          </li>
          <li>Do not upload your face picture, this is not a profile pic.</li>
          <li>
            The best would be a landscape you like or any other picture that you
            will recognize as unique.
          </li>
          <li>
            Please be aware that other people who are sharing this device with
            you, will be able to see this image and phrase.
          </li>
        </ul>
        <input
          bind:this={phrase}
          class="mt-10 mr-0"
          id="security-phrase-input"
          placeholder="Type a security phrase..."
          bind:value={security_txt}
          on:keydown={security_phrase_ok}
        /><button on:click={async () => await security_phrase_ok()}>
          Ok
        </button><br />
        {#if security_txt && security_img}
          <button
            on:click|once={save_security}
            bind:this={validate_button}
            class="animate-bounce mt-10 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:outline-none focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mr-2 mb-2"
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
            {#if mobile}
              <span class="font-semibold">Tap to upload an image</span>
            {:else}
              <span class="font-semibold">Click to select an image</span> or drag
              and drop
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
          class="max-w-[300px] h-[300px] mx-auto mb-10"
          src={image_url}
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
        There are 4 options to choose before we can create your wallet. Those options
        can help you to use and keep your wallet. But we also want to be careful
        with your security and privacy.<br /><br />
        Remember that in any case, once your wallet will be created, you will download
        a file that you should keep privately somewhere on your device, USB key or
        harddisk. This is the default way you can use and keep your wallet. Now let's
        look at some options that can make your life a bit easier.
      </p>
      <p class="max-w-xl md:mx-auto lg:max-w-2xl text-left">
        <span class="text-xl">Do you trust this device? </span> <br />
        If you do, if this device is yours or is used by few trusted persons of your
        family or workplace, then you can save your wallet in this device. To the
        contrary, if this device is public and shared by strangers, do not save your
        wallet here. {#if !import.meta.env.TAURI_PLATFORM}By selecting this
          option, you agree to save some cookies on your browser.{/if}<br />
        <Toggle class="mt-3" bind:checked={options.trusted}
          >Save your wallet here?</Toggle
        >
      </p>
      <p class="max-w-xl md:mx-auto mt-10 lg:max-w-2xl text-left">
        <span class="text-xl">Keep a copy in the cloud? </span> <br />
        Are you afraid that you will loose the file containing your wallet? If this
        would happen, your wallet would be lost forever, together with all your documents.
        We can keep an encrypted copy of your wallet in our cloud. Only you will
        be able to download it with a special link. You would have to keep this link
        safely though. By selecting this option, you agree to the
        <a target="_blank" href="https://nextgraph.one/tos"
          >Terms and Conditions of our cloud</a
        >.
        <br />
        <Toggle class="mt-3" bind:checked={options.cloud}
          >Save your wallet in the cloud?</Toggle
        >
      </p>
      <p class="max-w-xl md:mx-auto mt-10 lg:max-w-2xl text-left">
        <span class="text-xl">Create a PDF file of your wallet? </span> <br />
        We can prepare for you a PDF file containing all the information of your
        wallet, unencrypted. You should print this file and then delete the PDF (and
        empty the trash). Keep this printed documented in a safe place. It contains
        all the information to regenerate your wallet in case you lost access to
        it.
        <br />
        <Toggle class="mt-3" bind:checked={options.pdf}
          >Create a PDF of my wallet?</Toggle
        >
      </p>
      {#if !options.cloud}
        <p class="max-w-xl md:mx-auto mt-10 lg:max-w-2xl text-left">
          <span class="text-xl"
            >Create a link to access your wallet easily?
          </span> <br />
          When you want to use your wallet on the web or in other apps, we can help
          you find your wallet by creating a simple link accessible from anywhere.
          Only you will have access to this link. In order to do so, we will keep
          your wallet ID and some information about your broker on our cloud servers.
          If you prefer to opt out, just uncheck this option.
          <br />
          <Toggle class="mt-3" bind:checked={options.bootstrap}
            >Create a link to my wallet?</Toggle
          >
        </p>
      {/if}
      <button
        on:click|once={do_wallet}
        class="mt-10 mb-8 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:outline-none focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mr-2"
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
        We are creating your wallet...
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
      <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-green-800">
        Your wallet is ready!
        <svg
          class="my-10 h-16 w-16 mx-auto"
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
        {#if download_link}
          Please download your wallet and keep it in a safe location<br />
          <a href={download_link} target="_blank" download={download_name}>
            <button
              tabindex="-1"
              class:animate-bounce={animateDownload}
              on:click={() => (animateDownload = false)}
              class="mt-10 mb-8 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:outline-none focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mr-2"
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
          Your wallet file has been downloaded into your "Downloads" folder,
          with the name<br /><span class="text-black"> {download_name}</span><br
          />
          Please move it to a safe and durable place.<br /><br />
        {/if}
        {#each display_pazzle(ready.pazzle) as emoji}
          <span>{emoji}</span><br />
        {/each}
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
</main>
