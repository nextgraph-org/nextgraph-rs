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
  export let value: string = "";
  export let id: string | undefined = undefined;
  export let rows: number = 3;

  let has_success: boolean = false;

  const tauri_platform = import.meta.env.TAURI_ENV_PLATFORM;
  const setClipboard = async (text: string) => {
    if (tauri_platform) {
      // TODO: this won't work for tauri platform.
      // const { writeText } = await import("@tauri-apps/api/clipboard");
      // await writeText(text);
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const on_click = (e) => {
    has_success = true;
    setTimeout(() => (has_success = false), 2_000);
    setClipboard(value);
  };
</script>

<div class="copy-to-clipboard-container">
  <div class="copy-to-clipboard-wrapper">
    <textarea
      {id}
      {rows}
      {value}
      class="copy-textarea"
      class:with-button={!tauri_platform}
      disabled
      readonly
    />
    {#if !tauri_platform}
      <button
        on:click={on_click}
        class="copy-button"
        aria-label="Copy to clipboard"
      >
        <span class="copy-icon" class:hidden={has_success}>
          <svg
            width="14"
            height="16"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 18 20"
          >
            <path
              d="M16 1h-3.278A1.992 1.992 0 0 0 11 0H7a1.993 1.993 0 0 0-1.722 1H2a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2Zm-3 14H5a1 1 0 0 1 0-2h8a1 1 0 0 1 0 2Zm0-4H5a1 1 0 0 1 0-2h8a1 1 0 1 1 0 2Zm0-5H5a1 1 0 0 1 0-2h2V2h4v2h2a1 1 0 1 1 0 2Z"
            />
          </svg>
        </span>
        <span
          class="copy-icon success-icon"
          class:hidden={!has_success}
        >
          <svg
            width="14"
            height="12"
            aria-hidden={!has_success}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 16 12"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M1 5.917 5.724 10.5 15 1.5"
            />
          </svg>
        </span>
      </button>
    {/if}
  </div>
</div>

<style>
  .copy-to-clipboard-container {
    width: 100%;
    margin-top: calc(var(--mui-spacing) * 1);
  }

  .copy-to-clipboard-wrapper {
    position: relative;
  }

  .copy-textarea {
    width: 100%;
    resize: none;
    display: block;
    padding: calc(var(--mui-spacing) * 1.5);
    font-size: var(--mui-typography-body2-fontSize);
    line-height: var(--mui-typography-body2-lineHeight);
    color: var(--mui-palette-text-primary);
    background-color: var(--mui-palette-background-default);
    border: 1px solid var(--mui-palette-divider);
    border-radius: var(--textfield-border-radius);
    font-family: var(--mui-typography-fontFamily);
    transition: border-color 0.2s ease;
  }

  .copy-textarea:focus {
    outline: none;
    border-color: var(--mui-palette-primary-main);
  }

  .copy-textarea.with-button {
    padding-right: calc(var(--mui-spacing) * 6);
  }

  .copy-button {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    padding: 0 calc(var(--mui-spacing) * 1.5);
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--mui-palette-text-secondary);
    transition: color 0.2s ease;
  }

  .copy-button:hover {
    color: var(--mui-palette-primary-main);
  }

  .copy-button:active {
    color: var(--mui-palette-primary-dark);
  }

  .copy-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .copy-icon.hidden {
    display: none;
  }

  .success-icon {
    color: var(--mui-palette-success-main);
  }
</style>
