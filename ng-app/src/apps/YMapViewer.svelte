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
        cur_tab_doc_can_edit,
        set_view_or_edit
    } from "../tab";
    import { t } from "svelte-i18n";
    import{ PencilSquare } from "svelte-heros-v2";
    
    import * as Y from 'yjs'
    import { JSONEditor } from 'svelte-jsoneditor'

    export let commits = {};

    export let crdt = "YMap";

    const ydoc = new Y.Doc()
    const ymap = ydoc.get('ng', crdt == "YMap" ? Y.Map : Y.Array)

    let editor;
    let loading = true;

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
            loading = false;
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
        loading = false;
    });

    onDestroy(async ()=>{
        ydoc.destroy();
        await editor.destroy();
        editor = undefined;
    });

    const edit = () => {
      set_view_or_edit(false);
    }
  
  </script>

    {#if loading}
        <div class="grow mb-4 flex flex-col justify-center text-primary-700">
            <svg
                class="animate-spin mt-4 h-10 w-10 mb-4 mx-auto"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
                />
                <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
            </svg>
            <p class="text-center">{$t("connectivity.loading")}...</p>
        </div>
    {/if}


  {#if $cur_tab_doc_can_edit && ( crdt=="YMap" && Object.keys(content.json).length == 0 || crdt=="YArray" && Array.isArray(content.json) && content.json.length == 0 ) }
    <div class="flex-row">
        <button
            on:click={edit}
            on:keypress={edit}
            class="shrink select-none ml-4 mt-2 mb-4 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
        >
            <PencilSquare class="mr-2 focus:outline-none" tabindex="-1" />
            {$t("doc.start_editing")}
        </button>
    </div>
  {/if}

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