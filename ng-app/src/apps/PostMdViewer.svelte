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

<!--
    We could maybe also use https://ssssota.github.io/svelte-exmarkdown/ for rendering the MD (but to obtain the MD, we need to instantiate Milkdown anyway)
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
    
    import { Editor, rootCtx,  editorViewOptionsCtx } from '@milkdown/core';
    import { commonmark } from '@milkdown/preset-commonmark';
    import { gfm } from '@milkdown/preset-gfm'
    import { nord } from '@milkdown/theme-nord';
    import '@milkdown/theme-nord/style.css';
    import { collab, collabServiceCtx } from '@milkdown/plugin-collab';

    export let commits = {};

    const ydoc = new Y.Doc()

    let editor;

    async function setup() {
        editor = await Editor.make().config((ctx) => {
            ctx.set(rootCtx, '#mdeditor')
            ctx.update(editorViewOptionsCtx, (prev) => ({
                ...prev,
                editable:() => false,
            }))
        }).config(nord).use(commonmark).use(gfm).use(collab).create();
   
        ydoc.on('destroy', async () => {
            commits.discrete?.deregisterOnUpdate();
        })

        editor.action((ctx) => {
            const collabService = ctx.get(collabServiceCtx);

            collabService
            // bind doc and awareness
            .bindDoc(ydoc)
            // connect yjs with milkdown
            .connect();
        });

        let history = commits.discrete?.registerOnUpdate((update) => {
            Y.applyUpdate(ydoc, update.YXml, {local:true})
        });
        for (const h of history) {
            Y.applyUpdate(ydoc, h.YXml, {local:true})
        }
    }

    onMount(async ()=>{
        await setup();

    });

    onDestroy(async ()=>{
        ydoc.destroy();
        await editor.destroy();
    });
  
  </script>

  <div class="grow p-5 post-rich-text">
    <div id="mdeditor" class="prosemirror-editor"></div>
  </div>

