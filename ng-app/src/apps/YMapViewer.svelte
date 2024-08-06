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
    import { JSONEditor } from 'svelte-jsoneditor'

    export let commits = {};

    export let crdt = "YMap";

    const ydoc = new Y.Doc()
    const ymap = ydoc.get('ng', crdt == "YMap" ? Y.Map : Y.Array)

    let editor;

    let content = {
        text: undefined,
        json: crdt=="YMap"? {
        } : []
    }

    ymap.observeDeep((events, transaction) => {
        if (transaction.origin.local) {
            let operations = [];
            events.forEach((event) => {
                let target = ymap;
                let path = "";
                event.path.forEach((p)=> { target = target.get(p); path += `/${p}`;});

                event.changes.keys.forEach((change, key) => {
                    if (change.action === 'add') {
                        
                        let newval = target.get(key);
                        if ( newval instanceof Y.Array) newval = newval.toJSON();
                        else if ( newval instanceof Y.Map) newval = newval.toJSON();
                        //console.log(`Property "${key}" was added in path "${path}". Initial value: "`,newval)
                        let p = path + `/${key}`;
                        operations.push({ op: 'add', path:p, value: newval });
                        
                    } else if (change.action === 'update') {
                        
                        let newval = target.get(key);
                        if ( newval instanceof Y.Array) newval = newval.toJSON();
                        else if ( newval instanceof Y.Map) newval = newval.toJSON();
                        //console.log(`Property "${key}" was updated in path "${path}". Previous value: "${change.oldValue}". New value: `, newval)
                        let p = path + `/${key}`;
                        
                        operations.push({ op: 'replace', path:p, value: newval });
                    
                    } else if (change.action === 'delete') {
                        
                        //console.log(`Property "${key}" was deleted in path "${path}". Previous value: "${change.oldValue}".`)
                        let p = path + `/${key}`;
                        operations.push({ op: 'remove', path:p });
                    }
                });
                let pos = 0;
                event.changes.delta.forEach((delta) => { 
                    if (delta.retain) pos += delta.retain;
                    else if (delta.insert && Array.isArray(delta.insert)) {
                        delta.insert.forEach((newval) => {
                            let p = path + `/${pos}`;
                            if ( newval instanceof Y.Array) newval = newval.toJSON();
                            else if ( newval instanceof Y.Map) newval = newval.toJSON();
                            //console.log(`Adding array element to path "${p}". New value: `, newval)
                            operations.push({ op: 'add', path:p, value: newval });
                            pos += 1;
                        });
                    } else if (delta.delete) {
                        let p = path + `/${pos}`;
                        for (let i=0; i< delta.delete; i++) {
                            //console.log(`removing array element in path "${p}"`)
                            operations.push({ op: 'remove', path:p });
                        }
                    }
                });
            });
            editor.patch(operations);
            content.json = ymap.toJSON();
        }
    });

    ydoc.on('destroy', async () => {
        commits.discrete?.deregisterOnUpdate();
    })

    onMount(async ()=>{

        let history = commits.discrete?.registerOnUpdate((update) => {
            Y.applyUpdate(ydoc, update[crdt], {local:true})
        });
        for (const h of history) {
            Y.applyUpdate(ydoc, h[crdt], {local:true})
        }

    });

    onDestroy(async ()=>{
        ydoc.destroy();
        await editor.destroy();
    });
  
  </script>
  <div class="grow ng-json-editor" style="min-height:300px;">
    <JSONEditor bind:this={editor} {content} readOnly={true} />
    
  </div>

  <style>
    .ng-json-editor {
      /* define a custom theme color */
      --jse-theme-color: rgb(73, 114, 165);
      --jse-theme-color-highlight: rgb(30 136 229);
    }
  </style>