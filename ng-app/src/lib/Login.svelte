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
  The Login Procedure.
  Has multiple states (steps) through the user flow.
  -->

<script lang="ts">
  import { Alert, Toggle } from "flowbite-svelte";
  import { onMount, createEventDispatcher, tick } from "svelte";
  import ng from "../api";
  import { emoji_cat, emojis, load_svg } from "../wallet_emojis";
  import {
    PuzzlePiece,
    XCircle,
    ArrowLeftCircle,
    ArrowPath,
    LockOpen,
  } from "svelte-heros-v2";
  //import Worker from "../worker.js?worker&inline";
  export let wallet;
  export let for_import = false;

  let tauri_platform = import.meta.env.TAURI_PLATFORM;
  let mobile = tauri_platform == "android" || tauri_platform == "ios";

  const dispatch = createEventDispatcher();

  onMount(async () => {
    loaded = false;
    await load_svg();
    //console.log(wallet);
    await init();
  });

  async function init() {
    step = "load";
    shuffle = await ng.wallet_gen_shuffle_for_pazzle_opening(pazzle_length);
    emojis2 = [];

    for (const [idx, cat_idx] of shuffle.category_indices.entries()) {
      let cat = emojis[emoji_cat[cat_idx]];
      let items = [];
      for (const id of shuffle.emoji_indices[idx]) {
        items.push(cat[id]);
      }
      emojis2.push(items);
    }
    emojis2 = emojis2;

    pazzlePage = 0;
    selection = [];
    error = undefined;

    loaded = true;
  }

  function letsgo() {
    loaded = false;
    step = "pazzle";
  }

  let emojis2 = [];

  let shuffle;

  let step = "load";

  let loaded = false;

  let pazzle_length = 9;

  let pazzlePage = 0;

  let selection = [].fill(null, 0, pazzle_length);

  let pin_code = [];

  let ordered = [];

  let last_one = {};

  let shuffle_pin;

  let error;

  let trusted = false;

  function order() {
    step = "order";
    ordered = [];
    last_one = {};
    // In case, this is called by the cancel button, we need to reset the selection.
    selection.forEach((emoji) => (emoji.sel = undefined));
    selection = selection;

    for (let i = 0; i < pazzle_length; i++) {
      last_one[i] = true;
    }
  }

  async function start_pin() {
    pin_code = [];
    //console.log(ordered);
    shuffle_pin = await ng.wallet_gen_shuffle_for_pin();
    step = "pin";
    //console.log(shuffle_pin);
  }

  /** Called on selecting emoji in a category. */
  function select(val) {
    //console.log(emojis2[display][val]);
    let cat_idx = shuffle.category_indices[pazzlePage];
    let cat = emojis[emoji_cat[cat_idx]];
    let idx = shuffle.emoji_indices[pazzlePage][val];
    //console.log(cat_idx, emoji_cat[cat_idx], idx, cat[idx].code);

    selection[pazzlePage] = { cat: cat_idx, index: idx };
    console.debug(selection, cat, cat_idx, idx, val);

    if (pazzlePage == pazzle_length - 1) {
      order();
    } else {
      pazzlePage = pazzlePage + 1;
    }
  }

  async function finish() {
    step = "opening";

    let pazzle = [];

    for (const emoji of ordered) {
      pazzle.push((emoji.cat << 4) + emoji.index);
    }

    //console.log(pazzle);
    //console.log(wallet);

    // open the wallet
    try {
      if (tauri_platform) {
        let opened_wallet = await ng.wallet_open_with_pazzle(
          wallet,
          pazzle,
          pin_code
        );
        // try {
        //   let client = await ng.wallet_was_opened(opened_wallet);
        //   opened_wallet.V0.client = client;
        // } catch (e) {
        //   console.log(e);
        //   error = e;
        //   step = "end";
        //   dispatch("error", { error: e });
        //   return;
        // }
        step = "end";
        dispatch("opened", {
          wallet: opened_wallet,
          id: opened_wallet.V0.wallet_id,
          trusted,
        });
      } else {
        let worker_import = await import("../worker.js?worker&inline");
        const myWorker = new worker_import.default();
        myWorker.onerror = (e) => {
          console.error(e);
          error = "WebWorker error";
          step = "end";
          dispatch("error", { error });
        };
        myWorker.onmessageerror = (e) => {
          console.error(e);
          error = e;
          step = "end";
          dispatch("error", { error: e });
        };
        myWorker.onmessage = async (msg) => {
          //console.log("Message received from worker", msg.data);
          if (msg.data.loaded) {
            myWorker.postMessage({ wallet, pazzle, pin_code });
            //console.log("postMessage");
          } else if (msg.data.success) {
            //console.log(msg.data);
            // try {
            //   let client = await ng.wallet_was_opened(msg.data.success);
            //   msg.data.success.V0.client = client;
            // } catch (e) {
            //   console.log(e);
            //   error = e;
            //   step = "end";
            //   dispatch("error", { error: e });
            //   return;
            // }
            step = "end";
            dispatch("opened", {
              wallet: msg.data.success,
              id: msg.data.success.V0.wallet_id,
              trusted,
            });
          } else {
            console.error(msg.data.error);
            error = msg.data.error;
            step = "end";
            dispatch("error", { error: msg.data.error });
          }
        };
      }
    } catch (e) {
      console.error(e);
      error = e;
      step = "end";
      dispatch("error", { error: e });
    }

    // display the result
  }

  function cancel() {
    dispatch("cancel");
  }

  function to_previous_pazzle() {
    pazzlePage = pazzlePage - 1;
  }

  async function on_pin_key(val) {
    pin_code = [...pin_code, val];
  }

  async function select_order(val, pos) {
    delete last_one[pos];
    console.debug(last_one, val);

    ordered.push(val);
    val.sel = ordered.length;
    selection = selection;
    if (ordered.length == pazzle_length - 1) {
      let last = selection[Object.keys(last_one)[0]];
      ordered.push(last);
      last.sel = ordered.length;
      selection = selection;
      //console.log(last);
      await start_pin();
    }
  }
</script>

<div>
  {#if step == "load"}
    <div class=" max-w-xl lg:px-8 mx-auto px-4 mt-10">
      <h2 class="pb-5 text-xl">How to open your wallet, step by step:</h2>
      <ul class="mb-8 ml-3 space-y-4 text-left list-decimal">
        <li>
          For each one of the 9 categories of images, you will be presented with
          the 15 possible image choices. The categories are shuffled at every
          login. They will not always appear in the same order.
        </li>
        <li>
          At each category, only one of the 15 displayed choices is the correct
          image that belongs to your pazzle. Find it and tap or click on that
          one. The 15 images are shuffled too, they will not appear at the same
          position at each login. On a computer, you can also use the tab key on
          your keyboard to move to the desired item on the screen, then press
          the space bar to select each one.
        </li>
        <li>
          Once you completed the last category, you will be presented with all
          the images you have previously selected. Their order is displayed as
          it was when you picked them. But this is not the correct order of the
          images in your pazzle. You now have to order them correctly.
        </li>
        <li>
          You must remember which image should be the first one in your pazzle.
          Find it on the screen and click or tap on it. It will be greyed out
          and the number 1 will appear on top of it.
        </li>
        <li>
          Move on to the second image of your pazzle (that you memorized). Find
          it on the screen and tap on it. Repeat this step until you reached the
          last image.
        </li>
        <li>
          Finally, your PIN code will be asked. enter it by clicking or tapping
          on the digits.
        </li>
      </ul>
    </div>
    <div class=" max-w-xl lg:px-8 mx-auto px-4 text-primary-700">
      {#if !loaded}
        Loading pazzle...
        <svg
          class="animate-spin my-4 h-14 w-14 mx-auto"
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
      {:else}
        <div class="flex justify-center space-x-12 mt-4 mb-4">
          <button
            on:click={letsgo}
            class="mt-1 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
          >
            <PuzzlePiece
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
            />
            Open my wallet now!
          </button>
          <button
            on:click={cancel}
            class="mt-1 mb-2 bg-red-100 hover:bg-red-100/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            ><XCircle
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
            />Cancel</button
          >
        </div>
      {/if}
    </div>
    {#if for_import}
      <div class=" max-w-xl lg:px-8 mx-auto px-4 mb-8">
        <span class="text-xl">Do you trust this device? </span> <br />
        <div class="flex justify-center items-center my-4">
          <Toggle class="" bind:checked={trusted}
            >Yes, save my wallet on this device</Toggle
          >
        </div>
        <p class="text-sm">
          If you do, if this device is yours or is used by few trusted persons
          of your family or workplace, and you would like to login again from
          this device in the future, then you can save your wallet on this
          device. To the contrary, if this device is public and shared by
          strangers, do not save your wallet here. {#if !tauri_platform}By
            selecting this option, you agree to save some cookies on your
            browser.{/if}<br />
        </p>
      </div>
    {/if}
  {:else if step == "pazzle"}
    <div
      class="flex flex-col justify-center h-screen p-4 pazzleline"
      class:min-w-[310px]={mobile}
      class:min-w-[500px]={!mobile}
      class:max-w-[360px]={mobile}
      class:max-w-[600px]={!mobile}
    >
      <div class="mt-auto">
        <p class="max-w-xl md:mx-auto lg:max-w-2xl">
          <span class="text-xl">
            <!-- TODO: Internationalization-->
            Select your emoji of category: {emoji_cat[
              shuffle.category_indices[pazzlePage]
            ]}</span
          >
        </p>
        {#each [0, 1, 2, 3, 4] as row}
          <div class="columns-3 gap-0">
            {#each emojis2[pazzlePage]?.slice(0 + row * 3, 3 + row * 3) || [] as emoji, i (pazzlePage + "-" + row + "-" + i)}
              <div
                role="button"
                tabindex="0"
                class="w-full aspect-square emoji focus:outline-none focus:bg-gray-300"
                on:click={() => select(row * 3 + i)}
                on:keypress={() => select(row * 3 + i)}
              >
                <svelte:component this={emoji.svg?.default} />
              </div>
            {/each}
          </div>
        {/each}
      </div>
      <div class="flex justify-between mt-auto">
        <button
          class="mt-1 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
          on:click={pazzlePage === 0 ? init : to_previous_pazzle}
          ><ArrowLeftCircle
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
          />Go Back</button
        >
        <button
          on:click={cancel}
          class="mt-1 bg-red-100 hover:bg-red-100/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
          ><XCircle
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
          />Cancel</button
        >
      </div>
    </div>
  {:else if step == "order"}
    <!-- console.log(cat_idx, emoji_cat[cat_idx], idx, cat[idx].code); -->
    <div
      class="flex flex-col justify-center h-screen p-4"
      class:min-w-[310px]={mobile}
      class:min-w-[500px]={!mobile}
      class:max-w-[360px]={mobile}
      class:max-w-[600px]={!mobile}
    >
      <div class="mt-auto">
        <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-2">
          <span class="text-xl">Click your emojis in the correct order</span>
        </p>
        {#each [0, 1, 2] as row}
          <div class="columns-3 gap-0">
            {#each selection.slice(0 + row * 3, 3 + row * 3) || [] as emoji, i}
              {#if !emoji.sel}
                <div
                  role="button"
                  tabindex="0"
                  class="w-full aspect-square emoji focus:outline-none focus:bg-gray-300"
                  on:click={() => select_order(emoji, row * 3 + i)}
                  on:keypress={() => select_order(emoji, row * 3 + i)}
                >
                  <svelte:component
                    this={emojis[emoji_cat[emoji.cat]][emoji.index].svg
                      ?.default}
                  />
                </div>
              {:else}
                <div
                  class="w-full aspect-square opacity-25 select-none sel-emoji"
                >
                  <svelte:component
                    this={emojis[emoji_cat[emoji.cat]][emoji.index].svg
                      ?.default}
                  />
                  <span
                    class="sel drop-shadow-[2px_2px_2px_rgba(255,255,255,1)]"
                    >{emoji.sel}</span
                  >
                </div>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
      <div class="flex justify-between mt-auto">
        <button
          class="mt-1 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
          on:click={() => (step = "pazzle")}
        >
          <ArrowLeftCircle
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
          />
          Go Back</button
        >
        <button
          class="mt-1 bg-yellow-100 hover:bg-yellow-100/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
          on:click={order}
          ><ArrowPath
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
          />Clear</button
        >
        <button
          on:click={cancel}
          class="mt-1 bg-red-100 hover:bg-red-100/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
          ><XCircle
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
          />Cancel</button
        >
      </div>
    </div>
  {:else if step == "pin"}
    <div
      class="flex flex-col justify-center h-screen p-4"
      class:min-w-[310px]={mobile}
      class:min-w-[500px]={!mobile}
      class:max-w-[360px]={mobile}
      class:max-w-[600px]={!mobile}
    >
      <div class="mt-auto max-w-6xl lg:px-8">
        <p class="max-w-xl md:mx-auto lg:max-w-2xl">
          <span class="text-xl">Enter your PIN code</span>
        </p>
        {#each [0, 1, 2] as row}
          <div class="columns-3 gap-2">
            {#each shuffle_pin.slice(0 + row * 3, 3 + row * 3) as num}
              <button
                tabindex="0"
                class="m-1 disabled:opacity-15 select-none align-bottom text-7xl p-0 w-full aspect-square border-0"
                on:click={async () => await on_pin_key(num)}
                disabled={pin_code.length >= 4}
              >
                <span>{num}</span>
              </button>
            {/each}
          </div>
        {/each}
        <div class="columns-3 gap-2">
          <div class="m-1 w-full aspect-square" />
          <button
            tabindex="0"
            class="disabled:opacity-15 m-1 select-none align-bottom text-7xl p-0 w-full aspect-square border-0"
            on:click={async () => await on_pin_key(shuffle_pin[9])}
            disabled={pin_code.length >= 4}
          >
            <span>{shuffle_pin[9]}</span>
          </button>
          <button
            tabindex="0"
            class="w-full bg-green-300 hover:bg-green-300/90 disabled:opacity-15 m-1 select-none align-bottom text-7xl p-0 w-full aspect-square border-0"
            on:click={async () => await finish()}
            disabled={pin_code.length < 4}
          >
            <LockOpen
              tabindex="-1"
              class="w-full h-[50%] transition duration-75 group-hover:text-gray-900 dark:group-hover:text-white"
            />
          </button>
        </div>
      </div>
      <div class="flex justify-between mt-auto">
        <button
          class="mt-1 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
          on:click={order}
          ><ArrowLeftCircle
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
          />Go Back</button
        >
        <button
          class="mt-1 bg-yellow-100 hover:bg-yellow-100/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
          on:click={start_pin}
          ><ArrowPath
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
          />Clear</button
        >
        <button
          on:click={cancel}
          class="mt-1 bg-red-100 hover:bg-red-100/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
          ><XCircle
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
          />Cancel</button
        >
      </div>
    </div>
  {:else if step == "opening"}
    <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-primary-700">
      Opening your wallet...<br />
      Please wait
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
  {:else if step == "end"}
    {#if error}
      <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
        <div class="mt-auto max-w-6xl lg:px-8">
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
        </div>
        <div class="flex justify-between mt-auto gap-4">
          <button
            class="mt-10 select-none text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            on:click={init}
          >
            <ArrowPath
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
            />
            Try again
          </button>
          <button
            on:click={cancel}
            class="mt-10 bg-red-100 hover:bg-red-100/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            ><XCircle
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
            />Cancel</button
          >
        </div>
      </div>
    {:else}
      <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-green-800">
        Your wallet is opened! <br />Please wait while the app is loading...
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
      </div>
    {/if}
  {/if}
</div>

<style>
  .pazzleline {
    margin-right: auto;
    margin-left: auto;
  }

  .sel {
    position: absolute;
    width: 100%;
    top: 45%;
    left: 0;
    font-size: 100px;
    font-weight: 700;
  }

  .sel-emoji {
    /* overflow: hidden; */
    position: relative;
  }

  .emoji {
    cursor: pointer;
    /* padding: 0;
  margin: 0;
  border: 0;
  box-shadow: none; */
  }
</style>
