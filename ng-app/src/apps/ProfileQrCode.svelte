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
    
    import ng from "../api";
    import { link, push } from "svelte-spa-router";
    import { onDestroy, onMount, tick } from "svelte";
    import { Button, Progressbar, Spinner, Alert } from "flowbite-svelte";
    import{ PlusCircle, ArrowLeft, PencilSquare } from "svelte-heros-v2";

    import { t } from "svelte-i18n";
    import { 
      in_memory_discrete, open_viewer, set_viewer, set_editor, set_view_or_edit, cur_tab_branch_class, cur_tab_doc_can_edit, cur_tab
    } from "../tab";
    import {
        openModalCreate,
        sparql_query,
        active_session,
        display_error,
    } from "../store";


    export let commits;

    let container: HTMLElement;
    let generation_state: "before_start" | "loading" | "generated" =
    "before_start";
    let generated_qr: string | undefined = undefined;
    let error = undefined;

    async function scrollToTop() {
        await tick();
        container.scrollIntoView();
    }

    onMount(async () => {
        if (!$active_session) {
            push("#/");
            return;
        }
        await scrollToTop();
        await generate_qr_code();
    });

    async function generate_qr_code() {
        generation_state = "loading";
        try {
          generated_qr = await ng.get_qrcode_for_profile(
              $active_session.session_id,
              $cur_tab.store.store_type == "public", // are we public or protected?
              Math.min(container.clientWidth, 800)
          );
          generation_state = "generated";
        } catch (e) {
          error = e;
        }
    }

    function back_to_profile_viewer() {
        set_viewer("n:g:z:profile");
    }

    function edit() {
        set_editor("n:g:z:profile_editor");
        set_view_or_edit(false);
    }
  
  </script>
  <div class="flex-col" bind:this={container}>
    {#if error}
      <Alert class="m-2" color="red" style="word-break: break-word;">{display_error(error)}</Alert>
      <button
        on:click={edit}
        on:keypress={edit}
        class="select-none mx-6 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
        ><PencilSquare
          tabindex="-1"
          class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
        />Edit profile</button
      >
    {/if}
    {#if generation_state == "generated"}
      <div class="mx-auto">
        {@html generated_qr}
      </div>

      <button
        on:click={back_to_profile_viewer}
        on:keypress={back_to_profile_viewer}
        class="select-none mx-6 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
        ><ArrowLeft
          tabindex="-1"
          class="w-8 h-8 mr-2 -ml-1 transition duration-75 focus:outline-none  group-hover:text-gray-900 dark:group-hover:text-white"
        />{$t("buttons.back")}</button
      >
    {/if}
  </div>