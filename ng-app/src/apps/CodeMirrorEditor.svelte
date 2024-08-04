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
      sparql_query,
      toast_error,
      toast_success,
      reset_toasts,
      display_error,
      live_discrete_update
    } from "../store";
    
    import * as Y from 'yjs'
    // @ts-ignore
    import { yCollab } from 'y-codemirror.next'

    import CodeMirror from "svelte-codemirror-editor";
    import { javascript } from '@codemirror/lang-javascript'
    import {basicSetup} from "codemirror"

    export let commits = {};

    const ydoc = new Y.Doc()
    const ytext = ydoc.getText('ng')

    ydoc.on('update', async (update, origin) => {
      if (!origin.local) {
        try {
            await live_discrete_update(update, "YText", commits.heads);
        } catch (e){
            toast_error(display_error(e));
        }
      }
    })

    ydoc.on('destroy', () => {
        commits.discrete?.deregisterOnUpdate();
    })

    onMount(()=>{
        let history = commits.discrete?.registerOnUpdate((update) => {
            Y.applyUpdate(ydoc, update.YText, {local:true})
        });
        for (const h of history) {
            Y.applyUpdate(ydoc, h.YText, {local:true})
        }
    });

    onDestroy(()=>{
        ydoc.destroy();
    });
  
  </script>
  <div class="flex-col">
    
    <CodeMirror lang={javascript()} lineWrapping useTab={false} extensions={[basicSetup, yCollab(ytext, false, { undoManager: false })]} styles={{
      "&": {
          maxWidth: "100%",
      },
    }}/>
    
  </div>