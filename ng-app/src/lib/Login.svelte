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
  import { Alert, Toggle, Button } from "flowbite-svelte";
  import { onMount, createEventDispatcher } from "svelte";
  import { t } from "svelte-i18n";
  import ng from "../api";
  import { emoji_cat, emojis, load_svg, type Emoji } from "../wallet_emojis";

  import {
    PuzzlePiece,
    XCircle,
    Backspace,
    ArrowPath,
    LockOpen,
    CheckCircle,
    ArrowLeft,
  } from "svelte-heros-v2";
  import PasswordInput from "./components/PasswordInput.svelte";
  import Spinner from "./components/Spinner.svelte";
  import { display_error } from "../store";
  //import Worker from "../worker.js?worker&inline";
  export let wallet;
  export let for_import = false;

  let top;
  function scrollToTop() {
    top.scrollIntoView();
  }

  let tauri_platform = import.meta.env.TAURI_PLATFORM;

  const dispatch = createEventDispatcher();

  onMount(async () => {
    loaded = false;
    if (for_import) {
      device_name = await ng.get_device_name();
    }
    load_svg();
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

    scrollToTop();

    // This is only for awaiting that SVGs are loaded.
    await load_svg();
    loaded = true;
  }

  function start_with_pazzle() {
    loaded = false;
    step = "pazzle";
    unlockWith = "pazzle";
    scrollToTop();
  }
  async function start_with_mnemonic() {
    loaded = false;
    step = "mnemonic";
    unlockWith = "mnemonic";
    scrollToTop();
  }

  let emojis2: Emoji[][] = [];

  let shuffle;

  let step = "load";

  let loaded = false;

  let pazzle_length = 9;

  let pazzlePage = 0;

  /** The selected emojis by category (one for each pazzle page). First will be the selected of first pazzle page. */
  let selection = [].fill(null, 0, pazzle_length);

  let pin_code = [];

  /** The selected order from the order page. */
  let ordered = [];

  let shuffle_pin;

  let error;

  let trusted = true;

  let mnemonic = "";

  let unlockWith: "pazzle" | "mnemonic" | undefined;

  let device_name;

  function order() {
    step = "order";
    ordered = [];
    // In case, this is called by the cancel button, we need to reset the selection.
    selection.forEach((emoji) => (emoji.sel = undefined));
    selection = selection;
    scrollToTop();
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

    selection[pazzlePage] = { cat: cat_idx, index: idx };

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

    const mnemonic_words = mnemonic.split(" ").filter((t) => t !== "");

    // open the wallet
    try {
      if (tauri_platform) {
        // TODO @niko: Add device_name as param to open_with_* APIs
        let opened_wallet =
          unlockWith === "pazzle"
            ? await ng.wallet_open_with_pazzle(wallet, pazzle, pin_code)
            : await ng.wallet_open_with_mnemonic_words(
                wallet,
                mnemonic_words,
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
          device_name,
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
            if (unlockWith === "pazzle") {
              myWorker.postMessage({ wallet, pazzle, pin_code, device_name });
            } else {
              myWorker.postMessage({
                wallet,
                mnemonic_words,
                pin_code,
                device_name,
              });
            }
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
              device_name,
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
      if (e.message && e.message.includes("constructor") || (typeof e === "string" && e.includes("constructor") )) e = "BrowserTooOld";
      error = e;
      step = "end";
      dispatch("error", { error: e });
    }

    // display the result
  }

  function cancel() {
    dispatch("cancel");
  }

  async function on_pin_key(val) {
    pin_code = [...pin_code, val];
    if (pin_code.length == 4) {
      setTimeout(()=>window.document.getElementById("confirm_pin_btn").focus(),50);
    }
  }

  async function select_order(val) {
    ordered.push(val);
    val.sel = ordered.length;

    selection = selection;
    if (ordered.length == pazzle_length - 1) {
      let last = selection.find((emoji) => !emoji.sel);
      ordered.push(last);
      last.sel = ordered.length;
      selection = selection;
      //console.log(last);
      await start_pin();
    }
  }

  function go_back() {
    if (step === "mnemonic") {
      init();
    } else if (step === "pazzle") {
      // Go to previous pazzle or init page, if on first pazzle.
      if (pazzlePage === 0) {
        init();
      } else {
        pazzlePage -= 1;
      }
    } else if (step === "order") {
      if (ordered.length === 0) {
        step = "pazzle";
      } else {
        const last_selected = ordered.pop();
        last_selected.sel = null;
        ordered = ordered;
        selection = selection;
      }
    } else if (step === "pin") {
      if (pin_code.length === 0) {
        if (unlockWith === "mnemonic") {
          start_with_mnemonic();
        } else {
          // Unselect the last two elements.
          const to_unselect = ordered.slice(-2);
          to_unselect.forEach((val) => {
            val.sel = null;
          });

          ordered = ordered.slice(0, -2);
          selection = selection;
          step = "order";
        }
      } else {
        pin_code = pin_code.slice(0, pin_code.length - 1);
      }
    }
  }

  let width: number;
  let height: number;
  const breakPointWidth: number = 535;
  const breakPointHeight: number = 1005;
  let mobile = false;
  $: if (width >= breakPointWidth && height >= breakPointHeight) {
    mobile = false;
  } else {
    mobile = true;
  }
</script>

<div
  class="flex-col justify-center md:max-w-2xl py-4 sm:px-8"
  class:h-screen={step !== "load" && height > 640}
  class:flex={height > 640}
  bind:this={top}
>
  {#if step == "load"}
    <div class="flex flex-col justify-center p-4 pt-6">
      <h2 class="pb-5 text-xl self-start">
        {$t("pages.login.heading")}
      </h2>
      <h3 class="pb-2 text-lg self-start">{$t("pages.login.with_pazzle")}</h3>
      <ul class="mb-8 ml-3 space-y-4 text-justify text-sm list-decimal">
        <li>
          {$t("pages.login.pazzle_steps.1")}
        </li>
        <li>
          {$t("pages.login.pazzle_steps.2")}
        </li>
        <li>
          {$t("pages.login.pazzle_steps.3")}
        </li>
        <li>
          {$t("pages.login.pazzle_steps.4")}
        </li>
        <li>
          {$t("pages.login.pazzle_steps.5")}
        </li>
        <li>
          {$t("pages.login.pazzle_steps.6")}
        </li>
      </ul>

      <h3 class="pb-2 text-lg self-start">
        {$t("pages.login.with_mnemonic")}
      </h3>
      <ul class="mb-8 ml-3 space-y-4 text-justify text-sm list-decimal">
        <li>
          {$t("pages.login.mnemonic_steps.1")}
        </li>
        <li>
          {$t("pages.login.mnemonic_steps.2")}
        </li>
      </ul>

      <!-- Save wallet? -->
      {#if for_import}
        <div class="max-w-xl lg:px-8 mx-auto px-4 mb-2">
          <span class="text-xl"
            >{$t("pages.wallet_create.save_wallet_options.trust")}
          </span> <br />
          <p class="text-sm">
            {$t("pages.wallet_create.save_wallet_options.trust_description")}
            {#if !tauri_platform}
              {$t("pages.login.trust_device_allow_cookies")}{/if}<br />
          </p>
          <div class="flex justify-center items-center my-4">
            <Toggle class="" bind:checked={trusted}
              >{$t("pages.login.trust_device_yes")}</Toggle
            >
          </div>
        </div>
      {/if}

      <div class="max-w-xl lg:px-8 mx-auto px-4 text-primary-700">
        <div class="flex flex-col justify-centerspace-x-12 mt-4 mb-4">
          <!-- Device Name, if trusted-->
          {#if for_import && trusted}
            <label for="device-name-input" class="text-sm text-black">
              {$t("pages.login.device_name_label")}
            </label>
            <input
              id="device-name-input"
              bind:value={device_name}
              placeholder={$t("pages.login.device_name_placeholder")}
              type="text"
              class="w-full mb-10 lg:px-8 mx-auto px-4 bg-gray-50 border border-gray-300 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            />
          {/if}

          {#if !loaded}
            {$t("pages.login.loading_pazzle")}...
            <Spinner className="my-4 h-14 w-14 mx-auto" />
          {:else}
            <button
              on:click={start_with_pazzle}
              class="mt-1 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
            >
              <PuzzlePiece
                tabindex="-1"
                class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
              />
              {$t("pages.login.open_with_pazzle")}
            </button>
          {/if}
          <button
            on:click={cancel}
            class="mt-3 mb-2 text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            ><ArrowLeft
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
            />{$t("pages.login.login_cancel")}</button
          >
          <span
            on:click={start_with_mnemonic}
            on:keypress={start_with_mnemonic}
            role="link"
            tabindex="0"
            class="mt-1 text-lg px-5 py-2.5 text-center inline-flex items-center underline cursor-pointer"
          >
            {$t("pages.login.open_with_mnemonic")}
          </span>
        </div>
      </div>
    </div>
    <!-- The following steps have navigation buttons and fixed layout -->
  {:else if step == "pazzle" || step == "order" || step == "pin" || step == "mnemonic"}
    <div
      class="flex-col justify-center h-screen"
      class:flex={height > 640}
      class:min-w-[300px]={mobile}
      class:min-w-[500px]={!mobile}
      class:max-w-[370px]={mobile}
      class:max-w-[600px]={!mobile}
    >
      <div class="mt-auto flex flex-col justify-center">
        <!-- Unlock Screens -->

        {#if step == "mnemonic"}
          <form on:submit|preventDefault={start_pin}>
            <label
              for="mnemonic-input"
              class="block mb-2 text-xl text-gray-900 dark:text-white"
              >{$t("pages.login.enter_mnemonic")}</label
            >
            <PasswordInput
              id="mnemonic-input"
              placeholder={$t("pages.login.mnemonic_placeholder")}
              bind:value={mnemonic}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              auto_complete="mnemonic"
            />
            <div class="flex">
              <Button
                type="submit"
                class="mt-3 mb-2 ml-auto text-white bg-primary-700 hover:bg-primary-700/90 disabled:opacity-65 focus:ring-4 focus:ring-blue-500 focus:border-blue-500 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-blue-500 dark:focus:border-blue-500"
                on:click={start_pin}
                disabled={mnemonic.split(" ").length !== 12}
                ><CheckCircle
                  tabindex="-1"
                  class="w-8 h-8 mr-2 -ml-1 transition duration-75  group-hover:text-gray-900 dark:group-hover:text-white"
                />{$t("buttons.confirm")}</Button
              >
            </div>
          </form>
        {:else if step == "pazzle"}
          <p class="max-w-xl mx-auto lg:max-w-2xl">
            <span class="text-xl">
              {@html $t("pages.login.select_emoji", {
                values: {
                  category: $t(
                    "emojis.category." +
                      emoji_cat[shuffle.category_indices[pazzlePage]]
                  ),
                },
              })}</span
            >
          </p>
          {#each [0, 1, 2, 3, 4] as row}
            <div class="columns-3 gap-0">
              {#each emojis2[pazzlePage]?.slice(0 + row * 3, 3 + row * 3) || [] as emoji, i (pazzlePage + "-" + row + "-" + i)}
                <div
                  role="button"
                  tabindex="0"
                  class="w-full aspect-square emoji focus:outline-none focus:bg-gray-300"
                  title={$t("emojis.codes." + emoji.code)}
                  on:click={() => select(row * 3 + i)}
                  on:keypress={() => select(row * 3 + i)}
                >
                  <svelte:component this={emoji.svg?.default} />
                </div>
              {/each}
            </div>
          {/each}
        {:else if step == "order"}
          <p class="max-w-xl mx-auto lg:max-w-2xl mb-2">
            <span class="text-xl">{$t("pages.login.order_emojis")}</span>
          </p>
          {#each [0, 1, 2] as row}
            <div class="columns-3 gap-0">
              {#each selection.slice(0 + row * 3, 3 + row * 3) || [] as emoji, i}
                {#if !emoji.sel}
                  <div
                    role="button"
                    tabindex="0"
                    class="w-full aspect-square emoji focus:outline-none focus:bg-gray-300"
                    on:click={() => select_order(emoji)}
                    on:keypress={() => select_order(emoji)}
                    title={$t(
                      "emojis.codes." +
                        emojis[emoji_cat[emoji.cat]][emoji.index].code
                    )}
                  >
                    <svelte:component
                      this={emojis[emoji_cat[emoji.cat]][emoji.index].svg
                        ?.default}
                    />
                  </div>
                {:else}
                  <div
                    class="w-full aspect-square opacity-25 select-none sel-emoji"
                    title={$t(
                      "emojis.codes." +
                        emojis[emoji_cat[emoji.cat]][emoji.index].code
                    )}
                  >
                    <svelte:component
                      this={emojis[emoji_cat[emoji.cat]][emoji.index].svg
                        ?.default}
                    />
                    <span
                      class="sel drop-shadow-[2px_2px_2px_rgba(255,255,255,1)]"
                      class:text-[8em]={!mobile}
                      class:text-[6em]={mobile}>{emoji.sel}</span
                    >
                  </div>
                {/if}
              {/each}
            </div>
          {/each}
        {:else if step == "pin"}
          <p class="items-center">
            <span class="text-xl">{$t("pages.login.enter_pin")}</span>
          </p>
          <!-- Chrome requires the columns-3 __flex__ to be set, or else it wraps the lines incorrectly.
               However, this leads to the width decreasing and the buttons come together in mobile view.
               So we need a way to fix the width across all screens. -->
          {#each [0, 1, 2] as row}
            <div class="columns-3 flex">
              {#each shuffle_pin.slice(0 + row * 3, 3 + row * 3) as num}
                <button
                  tabindex="0"
                  class="pindigit m-1 disabled:opacity-15 disabled:text-gray-200 select-none align-bottom text-7xl p-0 w-full aspect-square border-0"
                  class:h-[160px]={!mobile}
                  class:h-[93px]={mobile}
                  class:text-8xl={!mobile}
                  on:click={async () => {window.document.activeElement.blur(); await on_pin_key(num)}}
                  disabled={pin_code.length >= 4}
                >
                  <span>{num}</span>
                </button>
              {/each}
            </div>
          {/each}
          <div class="columns-3 flex">
            <div class="m-1 w-full aspect-square" />
            <button
              tabindex="0"
              class="pindigit disabled:opacity-15 m-1 disabled:text-gray-200 select-none align-bottom text-7xl p-0 w-full aspect-square border-0"
              class:h-[160px]={!mobile}
              class:h-[93px]={mobile}
              class:text-8xl={!mobile}
              on:click={async () => {window.document.activeElement.blur();await on_pin_key(shuffle_pin[9])}}
              disabled={pin_code.length >= 4}
            >
              <span>{shuffle_pin[9]}</span>
            </button>
            <Button
              tabindex="0"
              id="confirm_pin_btn"
              class="w-full bg-green-300 hover:bg-green-300/90 enabled:animate-bounce disabled:bg-gray-200 disabled:opacity-15 m-1 select-none align-bottom text-7xl p-0 aspect-square border-0"
              on:click={async () => await finish()}
              on:keypress={async () => await finish()}
              disabled={pin_code.length < 4}
            >
              <LockOpen
                tabindex="-1"
                class="w-[50%] h-[50%] transition duration-75 focus:outline-none select-none group-hover:text-gray-900 dark:group-hover:text-white"
              />
            </Button>
          </div>
          <span class="select-none text-9xl h-[4rem] text-center"
            >{#each pin_code as pin_key}*{/each}</span
          >
        {/if}
      </div>
      <!-- Navigation Buttons for pazzle, order pin, mnemonic -->
      <div class="flex justify-between mb-6 mt-auto">
        <button
          on:click={cancel}
          class="mt-1 bg-red-100 hover:bg-red-100/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg sm:text-lg px-5 py-2.5 text-center select-none inline-flex items-center dark:focus:ring-primary-700/55"
          ><XCircle
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition focus:outline-none duration-75 group-hover:text-gray-900 dark:group-hover:text-white"
          />{$t("buttons.cancel")}</button
        >
        <button
          class="mt-1 ml-2 min-w-[141px] focus:ring-4 focus:ring-primary-100/50 rounded-lg sm:text-lg px-5 py-2.5 text-center select-none inline-flex items-center dark:focus:ring-primary-700/55"
          on:click={go_back}
          ><Backspace
            tabindex="-1"
            class="w-8 h-8 mr-2 -ml-1 transition focus:outline-none duration-75 group-hover:text-gray-900 dark:group-hover:text-white"
          />
          {#if step === "mnemonic" || (step === "pazzle" && pazzlePage === 0)}
            {$t("buttons.go_back")}
          {:else}
            {$t("buttons.correct")}
          {/if}
        </button>
      </div>
    </div>
  {:else if step == "opening"}
    <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-primary-700">
      {@html $t("pages.login.opening_wallet")}
      <Spinner className="mt-10 h-14 w-14 mx-auto" />
    </div>
  {:else if step == "end"}
    {#if error}
      <div class=" max-w-6xl lg:px-8 mx-auto text-red-800">
        <div class="mt-auto max-w-6xl lg:px-8">
          {$t("errors.an_error_occurred")}
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
            {display_error(error)}
          </Alert>
        </div>
        <div class="flex justify-between mt-auto gap-4">
          <button
            on:click={cancel}
            class="mt-10 bg-red-100 hover:bg-red-100/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            ><XCircle
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none group-hover:text-gray-900 dark:group-hover:text-white"
            />{$t("buttons.cancel")}</button
          >
          <button
            class="mt-10 ml-2 select-none text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-100/50 rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            on:click={init}
          >
            <ArrowPath
              tabindex="-1"
              class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none group-hover:text-gray-900 dark:group-hover:text-white"
            />
            {$t("buttons.try_again")}
          </button>
        </div>
      </div>
    {:else}
      <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-green-800">
        {@html $t("pages.login.wallet_opened")}
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

<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

<style>
  .pindigit {
    min-height: 93px;
  }

  /* .pazzleline {
    margin-right: auto;
    margin-left: auto;
  } */

  .sel {
    position: absolute;
    display: flex;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    font-weight: 700;
    justify-content: center;
    align-items: center;
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
