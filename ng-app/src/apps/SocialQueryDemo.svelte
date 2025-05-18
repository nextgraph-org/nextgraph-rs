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
      toast_success,
      active_session,
      display_error,
      online
    } from "../store";
    import ng from "../api";
    import { 
      in_memory_discrete, open_viewer, set_viewer, set_editor, set_view_or_edit, cur_tab_doc_can_edit, cur_tab
    } from "../tab";
    import{ PencilSquare, Lifebuoy } from "svelte-heros-v2";
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

    const openQuery = async () => {
      
      //TODO : return now if already processing (when LDO for svelte is ready)
      // and even disable the button in that case
      try {
        await sparql_update("INSERT DATA { <> <did:ng:x:ng#social_query_sparql> \"CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }\".}");
        let commit_id = commits.heads[0];
        let commit_key = commits.head_keys[0];
        let session = $active_session;
        if (!session) return;
        let request_nuri = "did:ng:"+$cur_tab.doc.nuri+":c:"+commit_id+":k:"+commit_key;
        await ng.social_query_start(
          session.session_id,
          "did:ng:a", 
          request_nuri,
          "did:ng:d:c", 
          2,
        );
      } catch (e) {
        toast_error(display_error(e));
      }
    }

    onMount(()=>{
        console.log($active_session);
    });

    const info = () => {
    }
  
  </script>
  <div class="flex-col">
    <h1> Social Query</h1>
    {#if !source}
    <p class="p-3">{$t("doc.no_triples")}</p>
    {/if}
    <button
      on:click={info}
      on:keypress={info}
      class="select-none ml-2 mt-2 mb-2 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
    >
      info
    </button>
    <Button
      on:click={openQuery}
      on:keypress={openQuery}
      disabled={!$online}      
      class="select-none ml-2 mt-2 mb-2 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
    >
      <Lifebuoy tabindex="-1" class="mr-2 focus:outline-none" />
      Start query
    </Button>

    {#if source}
      <Highlight {language} code={source} class="mb-10"  let:highlighted >
        <LineNumbers {highlighted} wrapLines hideBorder />
      </Highlight>
    {/if}
      
  </div>
  