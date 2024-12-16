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
      in_memory_discrete, open_viewer, set_viewer, set_editor, set_view_or_edit, cur_tab_doc_can_edit
    } from "../tab";
    import{ PencilSquare, RocketLaunch } from "svelte-heros-v2";
    import { t } from "svelte-i18n";
    import { Button, Progressbar, Spinner, Alert } from "flowbite-svelte";
    
    import Highlight, { LineNumbers } from "svelte-highlight";
    import hljs from "highlight.js";
    import { definer } from "../turtle";
    import "svelte-highlight/styles/github.css";
    const language = {
      name: "turtle",
      register: (hljs) => {
        return definer(hljs);
      },
    };
    
    export let commits = {graph:[]};
    let source = "";
    $: source = commits.graph.join(" .\r\n") + (commits.graph.length ? " .":"");

    const openQuery = () => {
      set_viewer("n:g:z:sparql_query");
    }
    const openUpdate = () => {
      set_editor("n:g:z:sparql_update");
      set_view_or_edit(false);
    }

    onMount(()=>{
        
    });
  
  </script>
  <div class="flex-col">
    {#if !source}
    <p class="p-3">{$t("doc.no_triples")}</p>
    {/if}
    <button
      on:click={openQuery}
      on:keypress={openQuery}
      class="select-none ml-2 mt-2 mb-2 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
    >
      <RocketLaunch tabindex="-1" class="mr-2 focus:outline-none" />
      {$t("doc.sparql_query")}
    </button>
    {#if $cur_tab_doc_can_edit}
      <button
        on:click={openUpdate}
        on:keypress={openUpdate}
        class="select-none ml-2 mt-2  text-gray-600  focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
      >
        <PencilSquare class="mr-2 focus:outline-none" tabindex="-1" />
        {$t("doc.sparql_update")}
      </button>
    {/if}

    {#if source}
      <Highlight {language} code={source} class="mb-10"  let:highlighted >
        <LineNumbers {highlighted} wrapLines hideBorder />
      </Highlight>
    {/if}
      
  </div>
  