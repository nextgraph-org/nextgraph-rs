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

  export let pane_name = "";

  const panes = {
    "history": "History",
    "files": "Files",
  };

  const load_pane = async (pane_name) => {
    if (!panes[pane_name]) return false;
    let component = await import(`./panes/${panes[pane_name]}.svelte`);
    return component.default;
  };

</script>

<div>

  {#if pane_name}
      {#await load_pane(pane_name) then pane}
        {#if pane}
          <div class="flex w-full" style="overflow-wrap: anywhere;"> 
              <svelte:component this={pane}/>
          </div>
        {/if}
      {/await}
  {/if}

</div>