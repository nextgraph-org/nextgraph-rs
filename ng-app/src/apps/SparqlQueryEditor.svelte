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
      sparql_query,
      toast_error,
      toast_success,
      reset_toasts
    } from "../store";
    import { 
      in_memory_discrete, open_viewer, set_viewer
    } from "../tab";
    import{ Sun, RocketLaunch } from "svelte-heros-v2";
    import { t } from "svelte-i18n";

    import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Toggle } from 'flowbite-svelte';
    
    import CodeMirror from "svelte-codemirror-editor";
    import {StreamLanguage} from "@codemirror/language"
    import { sparql } from "@codemirror/legacy-modes/mode/sparql";
    import {basicSetup} from "codemirror"

    import Highlight, { LineNumbers } from "svelte-highlight";
    import hljs from "highlight.js";
    import { definer } from "../turtle";
    import "svelte-highlight/styles/github.css";
    import { each } from "svelte/internal";
    const language = {
      name: "turtle",
      register: (hljs) => {
        return definer(hljs);
      },
    };

    onMount(()=>{
        if (!$in_memory_discrete){
            $in_memory_discrete = "SELECT ?subject ?predicate ?object WHERE {\n   ?subject ?predicate ?object .\n} LIMIT 10";
        }
    });
    let union = false;
    const run = async () => {
      try{
        reset_toasts();
        results = await sparql_query($in_memory_discrete, union);
      } catch(e) {
        toast_error(e);
      }
    }
    const openTurtle = () => {
      reset_toasts();
      set_viewer("n:g:z:rdf_viewer:turtle");
    }
    let results = undefined;
  
  </script>
  <div class="flex-col">
    
    <CodeMirror bind:value={$in_memory_discrete} lineWrapping useTab={false} extensions={[basicSetup,StreamLanguage.define(sparql)]} styles={{
      "&": {
          maxWidth: "100%",
      },
    }}/>
    <Toggle class="mt-1 ml-2" bind:checked={union}>Query all docs</Toggle>
    <button
      on:click={run}
      on:keypress={run}
      class="select-none ml-2 mt-2 mb-10 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
    >
      <RocketLaunch tabindex="-1" class="mr-2 focus:outline-none" />
      Run Query
    </button>
    <button
      on:click={openTurtle}
      on:keypress={openTurtle}
      class="select-none ml-2 mt-2 mb-10 text-gray-600  focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
    >
      <Sun class="mr-2 focus:outline-none" tabindex="-1" />
      View Graph
    </button>
    {#if results!==undefined}
      <div>
        <span class="ml-2 font-bold">Results: <br/></span>
        {#if Array.isArray(results)}
          <Highlight {language} code={results.join(" .\r\n") + " ."} class="mb-10"  let:highlighted >
            <LineNumbers {highlighted} wrapLines hideBorder />
          </Highlight>
        {:else if results?.head} 
          <Table>
            <TableHead>
              {#each results.head.vars as variable}
              <TableHeadCell>{variable}</TableHeadCell>
              {/each}
            </TableHead>
            <TableBody tableBodyClass="divide-y">
              {#each results.results.bindings as row}
                <TableBodyRow>
                  {#each results.head.vars as variable}
                    <TableBodyCell class="px-6 py-4 whitespace-break-spaces font-medium">{row[variable].value}</TableBodyCell>
                  {/each}
                </TableBodyRow>
              {/each}
            </TableBody>
          </Table>
        {:else}
          <span class="ml-2">{results}</span>
        {/if}
      </div>
    {/if}
  </div>