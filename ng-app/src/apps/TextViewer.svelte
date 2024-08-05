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
    import { 
      sparql_update,
      toast_error,
      toast_success
    } from "../store";
    import { 
      in_memory_discrete, open_viewer, set_viewer, set_editor, set_view_or_edit, cur_tab_branch_class, cur_tab_doc_can_edit
    } from "../tab";
    import{ PencilSquare, RocketLaunch } from "svelte-heros-v2";
    import { t } from "svelte-i18n";
    import { Button, Progressbar, Spinner, Alert } from "flowbite-svelte";
    
    import * as Y from 'yjs'

    import Highlight, { LineNumbers, HighlightSvelte } from "svelte-highlight";
    import typescript from "svelte-highlight/languages/typescript";
    import javascript from "svelte-highlight/languages/javascript";
    import rust from "svelte-highlight/languages/rust";
    import "svelte-highlight/styles/github.css";

    const class_to_lang = {
        "code:js" : javascript,
        "code:ts" : typescript,
        "code:rust" : rust,
        "code:react" : javascript,
    }

    let language;
    $: language = $cur_tab_branch_class && class_to_lang[$cur_tab_branch_class]
    
    export let commits = {};
    let source = "";

    const ydoc = new Y.Doc()
    const ytext = ydoc.getText('ng')

    ydoc.on('destroy', async () => {
        commits.discrete?.deregisterOnUpdate();
    })

    onMount(()=>{
        let history = commits.discrete?.registerOnUpdate((update) => {
            Y.applyUpdate(ydoc, update.YText, {local:true})
            source = ytext.toString()
        });
        for (const h of history) {
            Y.applyUpdate(ydoc, h.YText, {local:true})
        }
        source = ytext.toString()
    });

    onDestroy(()=>{
        ydoc.destroy();
    });

    const edit = () => {
      set_view_or_edit(false);
    }
  
  </script>
  <div class="flex-col">
    {#if source}
      {#if $cur_tab_branch_class === "code:svelte"}
        <HighlightSvelte code={source} class="mb-10" let:highlighted>
            <LineNumbers {highlighted} wrapLines hideBorder />
        </HighlightSvelte>
      {:else if language}
        <Highlight {language} code={source} class="mb-10" let:highlighted>
            <LineNumbers {highlighted} wrapLines hideBorder />
        </Highlight>
      {:else}
        <p class="font-mono whitespace-pre-wrap p-5">
            {source}
        </p>
      {/if}
    {:else if $cur_tab_doc_can_edit}
        <button
            on:click={edit}
            on:keypress={edit}
            class="select-none ml-5 mt-2 mb-10 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
        >
            <PencilSquare tabindex="-1" class="mr-2 focus:outline-none" />
            {$t("doc.start_editing")}            
        </button>
    {/if}
      
  </div>
  