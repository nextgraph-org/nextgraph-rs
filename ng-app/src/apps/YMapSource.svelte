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
    import { onMount, tick, onDestroy } from "svelte";
    import { 
      sparql_update,
      toast_error,
      toast_success
    } from "../store";
    import { 
       set_view_or_edit, cur_tab_doc_can_edit
    } from "../tab";
    import{ PencilSquare, } from "svelte-heros-v2";
    import { t } from "svelte-i18n";   
    import Highlight, { LineNumbers } from "svelte-highlight";
    import json from "svelte-highlight/languages/json";
    import "svelte-highlight/styles/github.css";
    
    import * as Y from 'yjs'

    let source = "";

    const edit = () => {
      set_view_or_edit(false);
    }

    export let commits = {};

    export let crdt = "YMap";

    const ydoc = new Y.Doc()
    const ymap = ydoc.get('ng', crdt == "YMap" ? Y.Map : Y.Array)


    ydoc.on('destroy', async () => {
        commits.discrete?.deregisterOnUpdate();
    })

    onMount(()=>{
        let history = commits.discrete?.registerOnUpdate((update) => {
            Y.applyUpdate(ydoc, update[crdt], {local:true})
            source = JSON.stringify(ymap.toJSON(),null , 4 );

        });
        for (const h of history) {
            if (h[crdt]) Y.applyUpdate(ydoc, h[crdt], {local:true})
        }
        source = JSON.stringify(ymap.toJSON(), null , 4 );

    });
  
  </script>
  <div class="flex-col">
    {#if source}
      <Highlight language={json} code={source} class="mb-10"  let:highlighted >
        <LineNumbers {highlighted} wrapLines hideBorder />
      </Highlight>
    {:else if $cur_tab_doc_can_edit}
      <button
        on:click={edit}
        on:keypress={edit}
        class="select-none ml-2 mt-2 mb-10 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
    >
        <PencilSquare class="mr-2 focus:outline-none" tabindex="-1" />
        {$t("doc.start_editing")}
      </button>
    {/if}
      
  </div>
  