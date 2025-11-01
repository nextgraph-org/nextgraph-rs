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
    import * as ng from "../../.auth-react/api";
    import LogoSimple from "./components/LogoSimple.svelte";
    import {t} from "svelte-i18n";
    import Button from '@smui/button';

    export let displayFooter = false;

    let top;

    let tauri_platform = import.meta.env.TAURI_ENV_PLATFORM;

    const displayPopup = async (url, title) => {
        if (!tauri_platform || tauri_platform == "android" || tauri_platform == "ios") {
            window.open(url, "_blank").focus();
        } else {
            await ng.open_window(url, "viewer", title);
        }
    };

    const displayNextgraphOrg = async () => {
        await displayPopup("https://nextgraph.org", "NextGraph.org");
    };

</script>

<div class="centered" bind:this={top}>
  <slot/>
  {#if displayFooter}
    <div class="footer">
      
      <Button
          variant="outlined"
          onclick={displayNextgraphOrg}
          style="height: 45px; background-color: #fff"
      >
        <LogoSimple/> &nbsp;{$t("common.about_nextgraph")}
      </Button>
    </div>
  {/if}
</div>

<style>
    .centered {
        display: flex;
        flex-direction: column;
        padding: 0;
        text-align: center;
        align-content: center;
        justify-content: center;
        min-height: 100vh
    }

    .footer {
        margin-top: calc(var(--mui-spacing) * 5);
        margin-bottom: calc(var(--mui-spacing) * 10);
    }
</style>
