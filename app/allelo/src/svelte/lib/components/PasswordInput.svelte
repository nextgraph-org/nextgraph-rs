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

<script lang="ts">
  import { createEventDispatcher, tick } from "svelte";
  import Textfield from "@smui/textfield";

  export let value: string = "";
  export let label: string | undefined = undefined;
  export let placeholder: string | undefined = undefined;
  export let id: string | undefined = undefined;
  export let auto_complete: string | undefined = undefined;
  export let autofocus = false;
  export let className: string | undefined = undefined;

  const dispatch = createEventDispatcher();

  export let show = false;
  let type: "password" | "text" = "password";
  $: type = show ? "text" : "password";

  let inputElement: HTMLInputElement | undefined;
  let wrapper: HTMLDivElement | undefined;

  async function toggle() {
    const selectionStart = inputElement?.selectionStart ?? null;
    const selectionEnd = inputElement?.selectionEnd ?? null;
    show = !show;
    await tick();
    if (inputElement) {
      inputElement.focus();
      if (selectionStart !== null && selectionEnd !== null) {
        inputElement.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }

  function toggleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      dispatch("enter");
    }
  }

  export function focus() {
    inputElement?.focus();
  }

  export function scrollIntoView(options?: ScrollIntoViewOptions) {
    wrapper?.scrollIntoView(options);
  }
</script>

<div class="password-field" bind:this={wrapper}>
  <Textfield
    class={["mui-textfield", "password-textfield", className, "shaped-outlined"].filter(Boolean).join(" ")}
    variant="outlined"
    bind:value
    label={label ?? placeholder}
    input$id={id}
    input$type={type}
    input$autocomplete={auto_complete}
    input$autofocus={autofocus}
    input$bind:this={inputElement}
    input$onkeydown={handleKeydown}
  />

  <button
    type="button"
    class="password-toggle"
    on:click={toggle}
    on:keydown={toggleKeydown}
    aria-label="Toggle password visibility"
    aria-pressed={show}
  >
    {#if show}
      <svg
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 576 512"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M572.52 241.4C518.29 135.59 410.93 64 288 64S57.68 135.64 3.48 241.41a32.35 32.35 0 0 0 0 29.19C57.71 376.41 165.07 448 288 448s230.32-71.64 284.52-177.41a32.35 32.35 0 0 0 0-29.19zM288 400a144 144 0 1 1 144-144 143.93 143.93 0 0 1-144 144zm0-240a95.31 95.31 0 0 0-25.31 3.79 47.85 47.85 0 0 1-66.9 66.9A95.78 95.78 0 1 0 288 160z"
        />
      </svg>
    {:else}
      <svg
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 640 512"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M320 400c-75.85 0-137.25-58.71-142.9-133.11L72.2 185.82c-13.79 17.3-26.48 35.59-36.72 55.59a32.35 32.35 0 0 0 0 29.19C89.71 376.41 197.07 448 320 448c26.91 0 52.87-4 77.89-10.46L346 397.39a144.13 144.13 0 0 1-26 2.61zm313.82 58.1l-110.55-85.44a331.25 331.25 0 0 0 81.25-102.07 32.35 32.35 0 0 0 0-29.19C550.29 135.59 442.93 64 320 64a308.15 308.15 0 0 0-147.32 37.7L45.46 3.37A16 16 0 0 0 23 6.18L3.37 31.45A16 16 0 0 0 6.18 53.9l588.36 454.73a16 16 0 0 0 22.46-2.81l19.64-25.27a16 16 0 0 0-2.82-22.45zm-183.72-142-39.3-30.38A94.75 94.75 0 0 0 416 256a94.76 94.76 0 0 0-121.31-92.21A47.65 47.65 0 0 1 304 192a46.64 46.64 0 0 1-1.54 10l-73.61-56.89A142.31 142.31 0 0 1 320 112a143.92 143.92 0 0 1 144 144c0 21.63-5.29 41.79-13.9 60.11z"
        />
      </svg>
    {/if}
  </button>
</div>

<style>
  .password-field {
    position: relative;
  }

  .password-textfield {
    width: 100%;
  }

  :global(.password-textfield .mdc-text-field__input) {
    padding-right: calc(var(--mui-spacing) * 6);
  }

  .password-toggle {
    position: absolute;
    inset-block: 0;
    inset-inline-end: calc(var(--mui-spacing) * 1);
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--mui-palette-text-secondary);
    transition: color 0.2s ease;
  }

  .password-toggle:hover {
    color: var(--mui-palette-text-primary);
  }

  .password-toggle:focus-visible {
    outline: 2px solid var(--mui-palette-primary-main);
    outline-offset: 2px;
  }

  .password-toggle svg {
    width: 1.75rem;
    height: 1.75rem;
  }
</style>
