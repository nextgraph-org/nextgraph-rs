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
    XMark,
    Icon,
    CheckCircle,
    CheckBadge,
    EllipsisVertical,
  } from "svelte-heros-v2";
  import { t } from "svelte-i18n";
  import {cur_tab} from "../../tab";

  export let pane_name = "";
  export let pane_items = {};

  const closePane = (pane:string|boolean) => {
    if (pane=="folders") {
      $cur_tab.folders_pane = false;
    } else if (pane=="toc") {
      $cur_tab.toc_pane = false;
    } else {
      $cur_tab.right_pane = "";
    }
  }
</script>
  
<div style="height:44px; background-color: rgb(251, 251, 251);" class={`${$$props.class || ''} fixed top-0  w-10 h-10 p-1 bg-white dark:bg-black; rounded-bl-xl`} role="button" aria-label="Close pane" title="Close pane" 
    on:click={()=>closePane(pane_name)}
    on:keypress={()=>closePane(pane_name)}
    tabindex="0">
    <XMark class="w-8 h-8 p-1 text-gray-300  focus:outline-none dark:text-white"/>
</div>
<div style="height:44px; background-color: rgb(251, 251, 251);" class="p-1 flex items-center">
    <Icon tabindex="-1" class="w-8 h-8 text-gray-400 dark:text-white focus:outline-none " variation="outline" color="currentColor" icon={pane_items[pane_name]} />
    <span class="ml-2 inline-block text-gray-500 select-none dark:text-white">{$t(`doc.menu.items.${pane_name}.label`)}</span>
</div>