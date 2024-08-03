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
<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import FullLayout from "../lib/FullLayout.svelte";
  import Document from "../lib/Document.svelte";
  import { t } from "svelte-i18n";
  // The params prop contains values matched from the URL
  export let params = {};
  import {
    active_session,
  } from "../store";
  import {
    change_nav_bar, cur_tab, reset_in_memory, cur_tab_doc_is_store, cur_tab_store_type
  } from "../tab";
  import {
    Square3Stack3d,
    Megaphone,
    InboxArrowDown,
    ChatBubbleLeftRight,
    Phone,
    VideoCamera,
  } from "svelte-heros-v2";
  //console.log(params);
  let nuri = "";
  $: if ($active_session && params[1]) { if (params[1].startsWith("o:"+$active_session.private_store_id)) push("#/"); 
                else if (params[1].startsWith("o:"+$active_session.protected_store_id)) push("#/shared"); 
                else if (params[1].startsWith("o:"+$active_session.public_store_id)) push("#/site"); else nuri = params[1]; } 
  onMount(() => {
    change_nav_bar("nav:unknown_doc",$t("doc.doc"), true);
    reset_in_memory();
  });
</script>

<FullLayout>
  {#if nuri && $cur_tab_doc_is_store && $cur_tab_store_type === "group"}
    <div class="bg-gray-100 flex p-1 justify-around md:justify-start h-11 gap-0 xs:gap-3 md:gap-10 text-gray-500">
      <div class="overflow-hidden w-16 xs:ml-3 flex justify-start" role="button" tabindex="0">
        <ChatBubbleLeftRight tabindex="-1" class="mt-1 flex-none w-7 h-7 mr-1 focus:outline-none "/><div class="text-xs xs:text-sm flex items-center"><div style="overflow-wrap: anywhere;" class="max-h-8 xs:max-h-10">{$t("doc.header.buttons.chat")}</div></div>
      </div>
      <div class="overflow-hidden w-8 xs:ml-2 flex justify-start" role="button" tabindex="0">
        <Phone tabindex="-1" class="mt-1 flex-none w-7 h-7 mr-1 focus:outline-none "/><div class="text-xs xs:text-sm flex items-center"></div>
      </div>
      <div class="overflow-hidden w-8 xs:ml-2 flex justify-start" role="button" tabindex="0">
        <VideoCamera tabindex="-1" class="mt-1 flex-none w-7 h-7 mr-1 focus:outline-none "/><div class="text-xs xs:text-sm flex items-center"></div>
      </div>
      <div class="overflow-hidden w-8 xs:ml-3 flex justify-start" role="button" tabindex="0">
        <Megaphone tabindex="-1" class="mt-1 flex-none w-7 h-7 mr-1 focus:outline-none "/><div class="text-xs xs:text-sm flex items-center"></div>
      </div>
      <div class="overflow-hidden w-16 xxs:w-20 xs:w-24 xs:ml-2 flex justify-start" role="button" tabindex="0">
        <Square3Stack3d tabindex="-1" class="mt-1 flex-none w-7 h-7 mr-1 focus:outline-none "/><div class="text-xs xs:text-sm flex items-center"><div style="overflow-wrap: anywhere;" class="max-h-8 xs:max-h-10">{$t("doc.header.buttons.all_docs")}</div></div>
      </div>  
    </div>
  {/if}
  {#if nuri}
  <Document {nuri}/>
  {/if}
</FullLayout>