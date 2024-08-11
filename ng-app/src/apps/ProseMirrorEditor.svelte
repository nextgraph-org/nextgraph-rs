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
      toast_error,
      toast_success,
      reset_toasts,
      display_error,
      live_discrete_update,
      discrete_update
    } from "../store";
    import { 
        cur_tab_register_on_save,
        cur_tab_deregister_on_save,
        cur_tab_branch_class
    } from "../tab";
    import { t } from "svelte-i18n";
    
    import * as Y from 'yjs'
    // @ts-ignore
    import { ySyncPlugin, initProseMirrorDoc } from 'y-prosemirror';
    import ProsemirrorEditor from 'prosemirror-svelte';
    import { richTextSchema } from 'prosemirror-svelte/state'; 
    import { richTextPlugins, corePlugins } from 'prosemirror-svelte/helpers'; 
    import { EditorState } from "prosemirror-state";

    export let commits = {};

    const ydoc = new Y.Doc()
    const yxml = ydoc.getXmlFragment('prosemirror')

    let view;

    ydoc.on('update', async (update, origin) => {
      if (!origin.local) {
        try {
            await discrete_update(update, "YXml", commits.heads);
        } catch (e){
            toast_error(display_error(e));
        }
      }
    })

    ydoc.on('destroy', async () => {
        commits.discrete?.deregisterOnUpdate();
        await cur_tab_deregister_on_save();
    })

    const { doc, mapping } = initProseMirrorDoc(yxml, richTextSchema)
    let selection;
    let editorState =  EditorState.create({
        schema: richTextSchema,
        doc,
        selection,
        plugins: [
        ...corePlugins,
        ...richTextPlugins,
        ySyncPlugin(yxml, { mapping })
        ]
    });

    onMount(()=>{

        cur_tab_register_on_save(async (updates)=>{
            
            let update = Y.mergeUpdates(updates);
            await live_discrete_update(update, "YXml", commits.heads);
            
        });

        let history = commits.discrete?.registerOnUpdate((update) => {
            Y.applyUpdate(ydoc, update.YXml, {local:true})
        });
        for (const h of history) {
            Y.applyUpdate(ydoc, h.YXml, {local:true})
        }
        view.focus()

    });

    onDestroy(()=>{
        ydoc.destroy();
    });
  
  </script>
  <div class="grow p-5 post-rich-text prose" style="min-height:300px;">
    <ProsemirrorEditor 
        className="prosemirror-editor"
        {editorState} 
        debounceChangeEventsInterval=2000
        placeholder={$t("doc.type_your_text_here")}
        bind:view={view}
    />
    
  </div>