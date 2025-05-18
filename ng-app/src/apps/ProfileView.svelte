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
    import { link } from "svelte-spa-router";
    import { Button, Progressbar, Spinner, Alert } from "flowbite-svelte";
    import{ PlusCircle } from "svelte-heros-v2";
    import { t } from "svelte-i18n";
    import { 
      in_memory_discrete, open_viewer, set_viewer, set_editor, set_view_or_edit, cur_tab_branch_class, cur_tab_doc_can_edit, cur_tab
    } from "../tab";
    import DataClassIcon from "../lib/icons/DataClassIcon.svelte";
    import {
        openModalCreate,
        sparql_query,
        active_session
    } from "../store";
    import {
        Clipboard
    } from "svelte-heros-v2";

    export let commits;

    function contained(graph) {
        let ret = [];
        for (const g of graph) {
            if (g.substring(57,90) === "http://www.w3.org/ns/ldp#contains") {
                let nuri = g.substring(93,146);
                let repo = nuri;
                nuri = nuri + ":" + $cur_tab.store.overlay;
                let hash = nuri.substring(9,16);
                ret.push({nuri,hash,repo});
            }
        }
        ret.sort((a, b) => a.hash.localeCompare(b.hash));
        return ret;
    }

    async function fetch_header(repo) {
        try {
            let res = await ng.fetch_header($active_session.session_id, repo);
            return res;
        }catch(e){
            console.error(e);
            return {};
        }
    }

    const create = () => {
        openModalCreate();
    }
    const config = {
        class: "mr-2 w-6 h-6 shrink-0 focus:outline-none"
    }
  
  </script>
  <div class="flex-col p-5">
      {#each contained(commits.graph) as doc}
          {#await fetch_header(doc.repo)}
          <div class="flex"> <Clipboard tabindex="-1" class="mr-2 w-6 h-6 shrink-0 focus:outline-none"/><div class="flex font-mono mb-3"> <a use:link href="/{doc.nuri}">{doc.hash}</a> </div> </div>
          {:then header}
          <div class="flex" title="{header.about || ''}"> {#if header.class}<DataClassIcon {config} dataClass={header.class}/>{:else}<Clipboard tabindex="-1" class="mr-2 w-6 h-6 shrink-0 focus:outline-none"/>{/if}<div class="flex font-mono mb-3"> <a use:link href="/{doc.nuri}">{header.title || doc.hash}</a> </div></div>
          {/await}
      {/each}
      {#if commits.graph.length == 0 || contained(commits.graph).length == 0} 
        <p>{$t("doc.empty_container")}</p>
        {#if $cur_tab_doc_can_edit}
            <button
                on:click={create}
                on:keypress={create}
                class="select-none ml-0 mt-2 mb-10 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            >
                <PlusCircle tabindex="-1" class="mr-2 focus:outline-none" />
                {$t("doc.create")}
            </button>
        {/if}
      {/if}
  </div>