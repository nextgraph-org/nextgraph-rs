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
    import { onMount, tick, onDestroy } from "svelte";
    import { Button, Progressbar, Spinner, Alert } from "flowbite-svelte";
    import { 
      toast_error,
      toast_success,
      reset_toasts,
      display_error,
      live_discrete_update,
      discrete_update
    } from "../store";
    import { 
        cur_tab_register_on_save,
        cur_tab_deregister_on_save,
        cur_tab_doc_can_edit,
        set_view_or_edit
    } from "../tab";
    import { t } from "svelte-i18n";
    import wasmUrl from "@automerge/automerge/automerge.wasm?url";
    import { next as A } from "@automerge/automerge/slim";
    import{ PencilSquare } from "svelte-heros-v2";

    import AMap from "./automerge/AMap.svelte";

    export let commits = {};

    export let readonly = false;

    let doc = {};

    let safari_error = false;

    function concatenate(uint8arrays) {
        const totalLength = uint8arrays.reduce(
            (total, uint8array) => total + uint8array.byteLength,
            0
        );

        const result = new Uint8Array(totalLength);

        let offset = 0;
        uint8arrays.forEach((uint8array) => {
            result.set(uint8array, offset);
            offset += uint8array.byteLength;
        });

        return result;
    }

    let root_proxy;

    onMount(async ()=>{
        try {
            await A.initializeWasm(wasmUrl);
        } catch (e) {
            safari_error = true;
            return;
        }
        doc = A.init();
        if (!readonly) {
            cur_tab_register_on_save(async (updates)=>{
                
                let update = concatenate(updates);
                await live_discrete_update(update, "Automerge", commits.heads);
            });
        }

        let history = commits.discrete?.registerOnUpdate((update) => {
            doc = A.loadIncremental(doc, update.Automerge);
        });
        for (const h of history) {
            doc = A.loadIncremental(doc, h.Automerge);
        }

        A.change(doc, (d) => {
            root_proxy = d;
        });

    });

    async function update(event) {
        //console.log("got update", event)
        doc = event.detail.d;
        try {
            await discrete_update(event.detail.u, "Automerge", commits.heads);
        } catch (e){
            toast_error(display_error(e));
        }
    }

    onDestroy(async ()=>{
        commits.discrete?.deregisterOnUpdate();
        if (!readonly) {
            await cur_tab_deregister_on_save();
        }
    });

    async function updateText(event) {
        doc = A.change(doc, (d) => {
            A.updateText(d, event.detail.p, event.detail.s)
        });
        let update = A.getLastLocalChange(doc);
        try {
            await discrete_update(update, "Automerge", commits.heads);
        } catch (e){
            toast_error(display_error(e));
        }
    }

    const edit = () => {
      set_view_or_edit(false);
    }
  
  </script>
    {#if safari_error}
        <Alert class="m-2" color="red">{$t("errors.no_wasm_on_old_safari")}</Alert>
    {:else}
        {#if Object.keys(doc).length !== 0 || !readonly}
            <div class="grow mb-20" style="min-height:300px;">
                <AMap {readonly} value={doc} {doc} on:update={update} on:updateText={updateText} proxy={root_proxy}/>
            </div>
        {:else if $cur_tab_doc_can_edit}
            <button
                on:click={edit}
                on:keypress={edit}
                class="select-none ml-4 mt-2 mb-10 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            >
                <PencilSquare class="mr-2 focus:outline-none" tabindex="-1" />
                {$t("doc.start_editing")}
            </button>
        {:else}
            <p class="ml-5">{$t("doc.empty")}</p>
        {/if}
    {/if}
  <style>

  </style>