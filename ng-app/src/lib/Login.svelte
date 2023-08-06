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

<script lang="ts">
  import { Alert } from "flowbite-svelte";
  import { onMount, createEventDispatcher, tick } from "svelte";
  import ng from "../api";
  import { emoji_cat, emojis, load_svg } from "../wallet_emojis";
  export let wallet;

  const dispatch = createEventDispatcher();

  onMount(async () => {
    await load_svg();
    console.log(wallet);
    await init();
  });

  async function init() {
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

    step = "pazzle";
  }

  let emojis2 = [];

  let shuffle;

  let step = "load";

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
    console.log(ordered);
    shuffle_pin = await ng.wallet_gen_shuffle_for_pin();
    step = "pin";
    console.log(shuffle_pin);
  }

  function select(val) {
    //console.log(emojis2[display][val]);
    let cat_idx = shuffle.category_indices[display];
    let cat = emojis[emoji_cat[cat_idx]];
    let idx = shuffle.emoji_indices[display][val];
    console.log(cat_idx, emoji_cat[cat_idx], idx, cat[idx].code);

    selection.push({ cat: cat_idx, index: idx });
    console.log(selection);

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

    console.log(pazzle);
    console.log(wallet);

    // open the wallet
    try {
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
    console.log(val);
    pin_code.push(val);
    if (pin_code.length == 4) {
      await finish();
    }
  }

  async function select_order(val, pos) {
    delete last_one[pos];
    console.log(last_one);
    console.log(val);
    ordered.push(val);
    val.sel = ordered.length;
    selection = selection;
    if (ordered.length == pazzle_length - 1) {
      let last = selection[Object.keys(last_one)[0]];
      ordered.push(last);
      last.sel = ordered.length;
      selection = selection;
      console.log(last);
      await start_pin();
    }
  }
</script>

{#if step == "load"}
  <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-primary-700">
    Loading...
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
{:else if step == "pazzle"}
  <div class="h-screen aspect-[3/5] pazzleline max-w-[600px] min-w-[350px]">
    {#each [0, 1, 2, 3, 4] as row}
      <div class="columns-3 gap-0">
        {#each emojis2[display]?.slice(0 + row * 3, 3 + row * 3) || [] as emoji, i}
          <div
            role="button"
            tabindex="0"
            class="w-full aspect-square emoji"
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
  <div class="h-screen aspect-[3/3] pazzleline max-w-[600px] min-w-[350px]">
    {#each [0, 1, 2] as row}
      <div class="columns-3 gap-0">
        {#each selection.slice(0 + row * 3, 3 + row * 3) || [] as emoji, i}
          {#if !emoji.sel}
            <div
              role="button"
              tabindex="0"
              class="w-full aspect-square emoji"
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
  <div class=" max-w-6xl lg:px-8 mx-auto px-4">
    <p class="max-w-xl md:mx-auto lg:max-w-2xl">
      <span class="text-xl">Enter your PIN code</span>
    </p>
    <div class="w-[325px] mx-auto">
      {#each [0, 1, 2] as row}
        <div class="">
          {#each shuffle_pin.slice(0 + row * 3, 3 + row * 3) as num}
            <button
              tabindex="0"
              class="m-1 select-none align-bottom text-7xl w-[100px] h-[100px] p-0"
              on:click={async () => await pin(num)}
            >
              <span>{num}</span>
            </button>
          {/each}
        </div>
      {/each}
      <button
        tabindex="0"
        class="m-1 select-none mx-auto align-bottom text-7xl w-[100px] h-[100px] p-0"
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
      Your wallet is opened!
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
