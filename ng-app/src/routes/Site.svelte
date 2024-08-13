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
    import { onMount, tick } from "svelte";
    import { t } from "svelte-i18n";
    import FullLayout from "../lib/FullLayout.svelte";
    import Document from "../lib/Document.svelte";
    import {
      active_session,
    } from "../store";
    import {
      change_nav_bar,reset_in_memory
    } from "../tab";
    import {
      Square3Stack3d,
      Megaphone,
    } from "svelte-heros-v2";
    onMount(() => {
      change_nav_bar("nav:public",$t("doc.public_store"), false);
      reset_in_memory();
    });
    let nuri = $active_session && $active_session.public_store_id;
  </script>
  
  <FullLayout>
    <div class="bg-gray-100 flex p-1 justify-start h-11 gap-3 text-gray-500">
      <div class="overflow-hidden w-32 ml-3 flex justify-start mr-1" role="button" tabindex="0">
        <Megaphone tabindex="-1" class="mt-1 flex-none w-7 h-7 mr-1 focus:outline-none "/><div class="text-sm flex items-center"><div style="overflow-wrap: anywhere;" class="max-h-10">{$t("doc.header.buttons.channels")}</div></div>
      </div>
      <div class="overflow-hidden w-32 ml-3 flex justify-start" role="button" tabindex="0">
        <Square3Stack3d tabindex="-1" class="mt-1 flex-none w-7 h-7 mr-1 focus:outline-none "/><div class="text-sm flex items-center"><div style="overflow-wrap: anywhere;" class="max-h-10">{$t("doc.header.buttons.all_docs")}</div></div>
      </div>
    </div>
    <Document {nuri}/>
  </FullLayout>

  