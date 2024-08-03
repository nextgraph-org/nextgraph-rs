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
    
    export let commits;

    function contained(graph) {
        let ret = [];
        for (const g of graph) {
            console.log(g)
            if (g.substring(104,137) === "http://www.w3.org/ns/ldp#contains") {
                let nuri = g.substring(140,240);
                let hash = nuri.substring(9,16);
                ret.push({nuri,hash});
            }
        }
        return ret;
    }
  
  </script>
  <div class="flex-col p-5">
      {#each contained(commits.graph) as doc}
          <div class="flex font-mono mb-3"> <a use:link href="/{doc.nuri}">{doc.hash}</a> </div> 
      {/each}

  </div>