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
    } from "../store";
    import { 
      in_memory_discrete, cur_tab
    } from "../tab";
    import{  RocketLaunch } from "svelte-heros-v2";

    import { Button, Progressbar, Spinner, Alert } from "flowbite-svelte";
    
    import CodeMirror from "svelte-codemirror-editor";
    import {StreamLanguage} from "@codemirror/language"
    import { sparql } from "@codemirror/legacy-modes/mode/sparql";
    import {basicSetup} from "codemirror"
    onMount(()=>{
        if (!$in_memory_discrete){
            $in_memory_discrete = "INSERT DATA { \n  <did:ng:test> <test:predicate> \"An example value\".\r}";
            
//             "SELECT * WHERE {\r\
//   ?subject ?predicate ?object .\r\
// } LIMIT 10";
        }
    });
    const run = async () => {
        await sparql_update($in_memory_discrete);
    }
  
  </script>
  <div class="flex-col">
    
    <CodeMirror bind:value={$in_memory_discrete} lineWrapping extensions={[basicSetup,StreamLanguage.define(sparql)]} styles={{
        "&": {
            
            maxWidth: "100%",
            
        },
    }}/>
    <button
      on:click={run}
      on:keypress={run}
      class="select-none ml-2 mt-2 mb-10 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
    >
      <RocketLaunch class="mr-2 focus:outline-none" />
      Run Update
    </button>
    
      
  </div>