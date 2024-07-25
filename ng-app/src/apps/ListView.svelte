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
      get_blob,
    } from "../store";
  
    import { Button, Progressbar, Spinner, Alert } from "flowbite-svelte";
    
    export let commits;
  
  </script>
  <div class="flex-col">
      <h2>ListView</h2>
      <div class="flex">
          HEADS: {#each commits.heads as head} {head} , {/each}
      </div>
      TRIPLES:
      {#each commits.graph as triple}
          <div class="flex"> {triple}</div> 
      {/each}
  
      
      {#each commits.files as file}
      <div class="flex">
          {file.name}
  
          {#await get_blob(file)}
              <div class="row">
              <Spinner />
              </div>
          {:then url}
              {#if url}
              <img src={url} title={file.nuri} alt={file.name} />
              {/if}
          {/await}
      </div>
      {/each}
  </div>