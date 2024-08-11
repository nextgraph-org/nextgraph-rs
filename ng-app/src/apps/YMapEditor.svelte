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


    ydoc.on('update', async (update, origin) => {
        //console.log(update, origin)
      if (!origin.local) {
        try {
            await discrete_update(update, crdt, commits.heads);
        } catch (e){
            toast_error(display_error(e));
        }
      }
    })

    function process_value(val) {

        let value;
        if (Array.isArray(val)) {
            const subArray = new Y.Array();
            for (let i=0; i<val.length; i++) {
                let r = process_value(val[i]);
                subArray.insert(i, [r]);
            }
            value = subArray;
        } else if (typeof val === 'object' && val !== null) {
            const ymapNested = new Y.Map();
            for (const [key, value] of Object.entries(val)) {
                ymapNested.set(key, process_value(value));
            }
            value = ymapNested;
        } else {
            value = val;
        }
        return value;
    }

    function handleChange(updatedContent, previousContent, { contentErrors, patchResult }) {
        // content is an object { json: unknown } | { text: string }
        //console.log('onChange: ', patchResult?.redo, patchResult, updatedContent)

        if (patchResult) {
            ydoc.transact((transac) => {
                patchResult.redo.forEach((op)=>{
                    let path = op.path.split("/");
                    path.shift();
                    let key = path.pop();
                    let target = ymap;
                    path.forEach((p)=> { target = target.get(p);});

                    if (op.op == "add") {
                        //console.log("adding", op.value,key, op.path)
                        let value = process_value(op.value);

                        if (target instanceof Y.Map) {
                            target.set(key, value);
                        } else {
                            target.insert(Number(key), [value]);
                        }
                    } else if (op.op == "remove") {
                        //console.log("removing", key, op.path)
                        if (target instanceof Y.Map) {
                            target.delete(key);
                        } else {
                            target.delete(Number(key), 1);
                        }
                    } else if (op.op == "replace") {
                        //console.log("replacing", op.value, key, op.path)
                        if (key === undefined) {
                            if (crdt === "YArray" && Array.isArray(op.value)) {
                                if (target.length) target.delete(0,target.length);
                                op.value.forEach((v)=> {
                                    target.push([process_value(v)]);
                                });
                            } else if (crdt === "YMap" && (typeof op.value === 'object' && op.value !== null)) {
                                target.clear();
                                for (const [key, value] of Object.entries(op.value)) {
                                    target.set(key, process_value(value));
                                }
                            }
                            return;
                        }
                        if (target instanceof Y.Map) {
                            target.set(key, process_value(op.value));
                        } else {
                            let idx = Number(key);
                            target.delete(idx, 1);
                            target.insert(idx, [process_value(op.value)]);
                        }
                    } else if (op.op == "move" || op.op == "copy") {
                        let move = op.op == "move";
                        if (op.from === op.path) return;
                        //console.log("moving or copying", op.from, op.path)
                        let from = op.from.split("/");
                        from.shift();
                        let from_key = from.pop();
                        let origin = ymap;
                        from.forEach((p)=> { origin = origin.get(p);});
                        from_key = (origin instanceof Y.Map) ? from_key : Number(from_key);
                        let value_to_move = origin.get(from_key);
                        if ( value_to_move instanceof Y.Array) value_to_move = value_to_move.clone();
                        else if ( value_to_move instanceof Y.Map) value_to_move = value_to_move.clone();

                        if (target instanceof Y.Map) {
                            target.set(key, value_to_move);
                        } else {
                            let idx = Number(key);
                            target.insert(idx, [value_to_move]);
                        }
                        if (move) {
                            if (typeof from_key === "number") {
                                origin.delete(from_key, 1);
                            } else {
                                origin.delete(from_key);
                            }
                        }
                        
                    } 
                });
            } , {local:false});
        }

        content = updatedContent
    }

    ydoc.on('destroy', async () => {
        commits.discrete?.deregisterOnUpdate();
        await cur_tab_deregister_on_save();
    })

    onMount(async ()=>{

        cur_tab_register_on_save(async (updates)=>{
            
            let update = Y.mergeUpdates(updates);
            await live_discrete_update(update, crdt, commits.heads);
            
        });

        let history = commits.discrete?.registerOnUpdate((update) => {
            Y.applyUpdate(ydoc, update[crdt], {local:true})
        });
        for (const h of history) {
            Y.applyUpdate(ydoc, h[crdt], {local:true})
        }
        await editor.focus()

    });

    onDestroy(async ()=>{
        ydoc.destroy();
        await editor.destroy();
    });

    function onRenderMenu(items, context) {
        items.shift();
        items.pop();
        items.pop();
        items.pop();
        return items;
    }

    function onRenderContextMenu(items, context) {
        if (items[4].items[1].items[0].text == "Convert to:") items[4].items.pop();
        if (Array.isArray(context.selection?.path) && context.selection.path.length == 0 && context.selection.type === "value") {
            items[2].items.shift();
            items[2].items.pop();
            items[4].items[0].items.pop();
        }
        return items;
    }
  
  </script>

  <div class="grow ng-json-editor" style="min-height:300px;">
    <JSONEditor bind:this={editor} {content} onChange={handleChange} {onRenderMenu} {onRenderContextMenu}/>
    
  </div>

  <style>
    .ng-json-editor {
      /* define a custom theme color */
      --jse-theme-color: rgb(73, 114, 165);
      --jse-theme-color-highlight: rgb(30 136 229);
    }
  </style>