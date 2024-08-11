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
    
    import { 
    } from "../store";
    import { link } from "svelte-spa-router";
    import { Button, Progressbar, Spinner, Alert } from "flowbite-svelte";
    import{ PencilSquare } from "svelte-heros-v2";
    import { t } from "svelte-i18n";
    import { 
      in_memory_discrete, open_viewer, set_viewer, set_editor, set_view_or_edit, cur_tab_branch_class, cur_tab_doc_can_edit
    } from "../tab";
    import {
        openModalCreate
    } from "../store";
    export let commits;

    function contained(graph) {
        let ret = [];
        for (const g of graph) {
            if (g.substring(104,137) === "http://www.w3.org/ns/ldp#contains") {
                let nuri = g.substring(140,240);
                let hash = nuri.substring(9,16);
                ret.push({nuri,hash});
            }
        }
        ret.sort((a, b) => a.hash.localeCompare(b.hash));
        return ret;
    }

    const create = () => {
        openModalCreate();
    }
  
  </script>
  <div class="flex-col p-5">
      {#each contained(commits.graph) as doc}
          <div class="flex font-mono mb-3"> <a use:link href="/{doc.nuri}">{doc.hash}</a> </div> 
      {/each}
      {#if commits.graph.length == 0 || contained(commits.graph).length == 0} 
        <p>{$t("doc.empty_container")}</p>
        {#if $cur_tab_doc_can_edit}
            <button
                on:click={create}
                on:keypress={create}
                class="select-none ml-0 mt-2 mb-10 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            >
                <PencilSquare tabindex="-1" class="mr-2 focus:outline-none" />
                {$t("doc.create")}
            </button>
        {/if}
      {/if}
  </div>