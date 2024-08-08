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
        cur_tab_branch_class
    } from "../tab";
    import { t } from "svelte-i18n";
    import wasmUrl from "@automerge/automerge/automerge.wasm?url";
    import { next as A } from "@automerge/automerge/slim";
    import Highlight, { LineNumbers } from "svelte-highlight";
    import json from "svelte-highlight/languages/json";
    import "svelte-highlight/styles/github.css";

    export let commits = {};

    let doc = {};
    let source = "";

    let safari_error = false;

    onMount(async ()=>{
        try {
            await A.initializeWasm(wasmUrl);
        } catch (e) {
            toast_error($t("errors.no_wasm_on_old_safari"));
            safari_error = true;
            return;
        }
        doc = A.init();

        let history = commits.discrete?.registerOnUpdate((update) => {
            doc = A.loadIncremental(doc, update.Automerge);
            source = JSON.stringify(doc,null , 4 );
        });
        for (const h of history) {
            doc = A.loadIncremental(doc, h.Automerge);
        }
        source = JSON.stringify(doc,null , 4 );
    });

    onDestroy(async ()=>{
        commits.discrete?.deregisterOnUpdate();
    });
  
</script>

{#if safari_error}
    <Alert class="m-2" color="red">{$t("errors.no_wasm_on_old_safari")}</Alert>
{:else if source}
    <Highlight language={json} code={source} class="mb-10"  let:highlighted >
        <LineNumbers {highlighted} wrapLines hideBorder />
    </Highlight>
{/if}
