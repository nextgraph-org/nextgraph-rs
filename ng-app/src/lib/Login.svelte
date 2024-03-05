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

<script lang="ts">
  import { Alert } from "flowbite-svelte";
  import { onMount, createEventDispatcher, tick } from "svelte";
  import ng from "../api";
  import { emoji_cat, emojis, load_svg } from "../wallet_emojis";
  import { PuzzlePiece } from "svelte-heros-v2";
  //import Worker from "../worker.js?worker&inline";
  export let wallet;

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

    display = 0;
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

  let display = 0;

  let selection = [];

  let pin_code = [];

  let ordered = [];

  let last_one = {};

  let shuffle_pin;

  let error;

  function order() {
    step = "order";
    ordered = [];
    last_one = {};
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

  function select(val) {
    //console.log(emojis2[display][val]);
    let cat_idx = shuffle.category_indices[display];
    let cat = emojis[emoji_cat[cat_idx]];
    let idx = shuffle.emoji_indices[display][val];
    //console.log(cat_idx, emoji_cat[cat_idx], idx, cat[idx].code);

    selection.push({ cat: cat_idx, index: idx });
    //console.log(selection);

    if (display == pazzle_length - 1) {
      order();
    } else {
      display = display + 1;
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
        let secret_wallet = await ng.wallet_open_wallet_with_pazzle(
          wallet,
          pazzle,
          pin_code
        );
        step = "end";
        dispatch("opened", {
          wallet: secret_wallet,
          id: secret_wallet.V0.wallet_id,
        });
      } else {
        let worker_import = await import("../worker.js?worker&inline");
        const myWorker = new worker_import.default();
        //const myWorker = new Worker();
        myWorker.onerror = (e) => {
          console.error(e);
          error = e;
          step = "end";
          dispatch("error", { error: e });
        };
        myWorker.onmessageerror = (e) => {
          console.error(e);
          error = e;
          step = "end";
          dispatch("error", { error: e });
        };
        myWorker.onmessage = (msg) => {
          //console.log("Message received from worker", msg.data);
          if (msg.data.loaded) {
            myWorker.postMessage({ wallet, pazzle, pin_code });
            //console.log("postMessage");
          } else if (msg.data.success) {
            step = "end";
            dispatch("opened", {
              wallet: msg.data.success,
              id: msg.data.success.V0.wallet_id,
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

  async function pin(val) {
    //console.log(val);
    pin_code.push(val);
    if (pin_code.length == 4) {
      await finish();
    }
  }

  async function select_order(val, pos) {
    delete last_one[pos];
    //console.log(last_one);
    //console.log(val);
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

{#if step == "load"}
  <div class=" max-w-xl lg:px-8 mx-auto px-4 mb-10">
    <h2 class="pb-5 text-xl">How to open your wallet, step by step :</h2>
    <ul class="mb-8 ml-3 space-y-4 text-left list-decimal">
      <li>
        For each category of images, you will be presented with the 15 possible
        image choices. The categories are shuffled at every login. They will not
        always appear in the same order.
      </li>
      <li>
        At each category, only one of the 15 displayed choices is the correct
        image that belongs to your pazzle. Find it and tap or click on that one.
        The 15 images are shuffled too, they will not appear at the same
        position at each login. On a computer, you can also use the tab key on
        your keyboard to move to the desired item on the screen, then press the
        space bar.
      </li>
      <li>
        Once you completed the last category, you will be presented with all the
        images you have previously selected. Their order is displayed as it was
        when you picked them. But this is not the correct order of the images in
        your pazzle. You now have to order them correctly.
      </li>
      <li>
        You must remember which image should be the first one in your pazzle.
        Find it on the screen and click or tap on it. It will be greyed out and
        the number 1 will appear on top of it.
      </li>
      <li>
        Move on to the second image of your pazzle (that you memorized). Find it
        on the screen and tap on it. Repeat this step until you reached the last
        image.
      </li>
      <li>
        Finally, your PIN code will be asked. enter it by clicking or tapping on
        the digits.
      </li>
    </ul>
  </div>
  <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-primary-700">
    {#if !loaded}
      Loading...
      <svg
        class="animate-spin mt-2 h-14 w-14 mx-auto"
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
      <button
        on:click={letsgo}
        class="mt-1 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
      >
        <PuzzlePiece
          tabindex="-1"
          class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
        />
        Open my wallet now!
      </button>
    {/if}
  </div>
{:else if step == "pazzle"}
  <div
    class="h-screen aspect-[3/5] pazzleline"
    class:min-w-[310px]={mobile}
    class:min-w-[500px]={!mobile}
    class:max-w-[360px]={mobile}
    class:max-w-[600px]={!mobile}
  >
    {#each [0, 1, 2, 3, 4] as row}
      <div class="columns-3 gap-0">
        {#each emojis2[display]?.slice(0 + row * 3, 3 + row * 3) || [] as emoji, i}
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
{:else if step == "order"}
  <!-- console.log(cat_idx, emoji_cat[cat_idx], idx, cat[idx].code); -->
  <div
    class="h-screen aspect-[3/3] pazzleline"
    class:min-w-[320px]={mobile}
    class:min-w-[500px]={!mobile}
    class:max-w-[360px]={mobile}
    class:max-w-[600px]={!mobile}
  >
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
                this={emojis[emoji_cat[emoji.cat]][emoji.index].svg?.default}
              />
            </div>
          {:else}
            <div class="w-full aspect-square opacity-25 select-none sel-emoji">
              <svelte:component
                this={emojis[emoji_cat[emoji.cat]][emoji.index].svg?.default}
              />
              <span class="sel drop-shadow-[2px_2px_2px_rgba(255,255,255,1)]"
                >{emoji.sel}</span
              >
            </div>
          {/if}
        {/each}
      </div>
    {/each}
  </div>
{:else if step == "pin"}
  <div class=" max-w-6xl lg:px-8 mx-auto px-3">
    <p class="max-w-xl md:mx-auto lg:max-w-2xl">
      <span class="text-xl">Enter your PIN code</span>
    </p>
    <div class="w-[295px] mx-auto">
      {#each [0, 1, 2] as row}
        <div class="">
          {#each shuffle_pin.slice(0 + row * 3, 3 + row * 3) as num}
            <button
              tabindex="0"
              class="m-1 select-none align-bottom text-7xl w-[90px] h-[90px] p-0"
              on:click={async () => await pin(num)}
            >
              <span>{num}</span>
            </button>
          {/each}
        </div>
      {/each}
      <button
        tabindex="0"
        class="m-1 select-none mx-auto align-bottom text-7xl w-[90px] h-[90px] p-0"
        on:click={async () => await pin(shuffle_pin[9])}
      >
        <span>{shuffle_pin[9]}</span>
      </button>
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
      <button class="mt-10 select-none" on:click={init}> Try again </button>
      <button class="mt-10 ml-5 select-none" on:click={cancel}> Cancel </button>
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

<style>
  .pazzleline {
    margin-right: auto;
    margin-left: auto;
  }

  .pin {
    cursor: pointer;
    text-align: center;
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
