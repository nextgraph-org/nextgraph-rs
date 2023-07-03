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
  import { onMount } from "svelte";
  import ng from "../api";
  import { emoji_cat, emojis, load_svg } from "../wallet_emojis";

  onMount(async () => {
    await load_svg();

    shuffle = await ng.wallet_gen_shuffle_for_pazzle_opening(pazzle_length);

    for (const [idx, cat_idx] of shuffle.category_indices.entries()) {
      let cat = emojis[emoji_cat[cat_idx]];
      let items = [];
      for (const id of shuffle.emoji_indices[idx]) {
        items.push(cat[id]);
      }
      emojis2.push(items);
    }
    emojis2 = emojis2;

    //console.log(JSON.stringify(await ng.test_create_wallet()));
    //console.log(await ng.test_create_wallet());

    let ref = {
      id: {
        Blake3Digest32: [
          228, 228, 181, 117, 36, 206, 41, 223, 130, 96, 85, 195, 104, 137, 78,
          145, 42, 176, 58, 244, 111, 97, 246, 39, 11, 76, 135, 150, 188, 111,
          66, 33,
        ],
      },
      key: {
        ChaCha20Key: [
          100, 243, 39, 242, 203, 131, 102, 50, 9, 54, 248, 113, 4, 160, 28, 45,
          73, 56, 217, 112, 95, 150, 144, 137, 9, 57, 106, 5, 39, 202, 146, 94,
        ],
      },
    };

    let img = await ng.doc_get_file_from_store_with_object_ref("ng:", ref);

    let c = {
      security_img: img["File"].V0.content,
      security_txt: "   know     yourself  ",
      pin: [5, 2, 9, 1],
      pazzle_length: 9,
      send_bootstrap: false,
      send_wallet: false,
      result_with_wallet_file: true,
      local_save: false,
    };

    try {
      let res = await ng.wallet_create_wallet(c);
      console.log(res);
      wallet = res.wallet;

      for (const emoji of res.pazzle) {
        let cat = (emoji & 240) >> 4;
        let idx = emoji & 15;
        console.log(emoji_cat[cat], emojis[emoji_cat[cat]][idx].code);
      }
    } catch (e) {
      console.error(e);
    }

    //await start_pin();
  });

  let wallet;

  let emojis2 = [];

  let shuffle;

  let step = "pazzle";

  let pazzle_length = 9;

  let display = 0;

  let selection = [];

  let pin_code = [];

  let ordered = [];

  let last_one = {};

  let shuffle_pin;

  function order() {
    step = "order";
    last_one = {};
    for (let i = 0; i < pazzle_length; i++) {
      last_one[i] = true;
    }
  }

  async function start_pin() {
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
    step = "end";

    let pazzle = [];

    for (const emoji of ordered) {
      pazzle.push((emoji.cat << 4) + emoji.index);
    }

    console.log(pazzle);

    // open the wallet
    try {
      let secret_wallet = await ng.wallet_open_wallet_with_pazzle(
        wallet,
        pazzle,
        pin_code
      );
      console.log(secret_wallet);
    } catch (e) {
      console.error(e);
    }

    // display the result
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

{#if step == "pazzle"}
  <div class="h-screen aspect-[3/5] pazzleline max-w-[500px] min-w-[200px]">
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
  <div class="h-screen aspect-[3/3] pazzleline max-w-[500px] min-w-[200px]">
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
  <div class="aspect-[5/2] pazzleline max-w-[800px] min-w-[200px] mt-20">
    {#each [0, 1] as row}
      <div class="columns-5 gap-0">
        {#each shuffle_pin.slice(0 + row * 5, 5 + row * 5) as num, i}
          <div
            role="button"
            tabindex="0"
            class="w-full aspect-square pin align-bottom text-9xl"
            on:click={async () => await pin(num)}
            on:keypress={async () => await pin(num)}
          >
            <span>{num}</span>
          </div>
        {/each}
      </div>
    {/each}
  </div>
{:else if step == "end"}{/if}

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
    position: relative;
    top: -56%;
    font-size: 100px;
    left: 30%;
    font-weight: 700;
  }

  .sel-emoji {
    overflow: hidden;
  }

  .emoji {
    cursor: pointer;
    /* padding: 0;
  margin: 0;
  border: 0;
  box-shadow: none; */
  }
</style>
