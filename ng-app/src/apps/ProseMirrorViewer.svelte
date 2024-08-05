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
      toast_error,
      toast_success
    } from "../store";
    import { 
      set_view_or_edit, cur_tab_doc_can_edit
    } from "../tab";
    import{ PencilSquare, RocketLaunch } from "svelte-heros-v2";
    import { t } from "svelte-i18n";
    
    import * as Y from 'yjs'
    import { yXmlFragmentToProseMirrorRootNode } from 'y-prosemirror';
    import { richTextSchema } from 'prosemirror-svelte/state'; 
    import { DOMSerializer } from "prosemirror-model"; 
   
    export let commits = {};
    let source = "";

    const ydoc = new Y.Doc()
    const yxml = ydoc.getXmlFragment('ng')

    ydoc.on('destroy', async () => {
        commits.discrete?.deregisterOnUpdate();
    })

    const toHTML = () => {
        const serializer = DOMSerializer.fromSchema(richTextSchema);
        const fragment = serializer.serializeFragment(yXmlFragmentToProseMirrorRootNode(yxml, richTextSchema));
        const node = document.createElement('div');
        node.append(fragment);
        return node.innerHTML;
    }

    onMount(()=>{
        let history = commits.discrete?.registerOnUpdate((update) => {
            Y.applyUpdate(ydoc, update.YXml, {local:true})
            source = toHTML()
            
        });
        
        for (const h of history) {
            Y.applyUpdate(ydoc, h.YXml, {local:true})
        }
        source = toHTML()
    });

    onDestroy(()=>{
        ydoc.destroy();
    });

    const edit = () => {
      set_view_or_edit(false);
    }
  
  </script>
  <div class="grow p-5">
    {#if source}
      
        <div class="post-rich-text">
            {@html source}
        </div>

    {:else if $cur_tab_doc_can_edit}
        <button
            on:click={edit}
            on:keypress={edit}
            class="select-none mb-10 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
        >
            <PencilSquare tabindex="-1" class="mr-2 focus:outline-none" />
            {$t("doc.start_editing")}            
        </button>
    {/if}
      
  </div>
  