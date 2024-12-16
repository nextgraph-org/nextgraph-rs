
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
    import { new_value, find_type, new_prop_types } from "./utils";

    import AValue from "./AValue.svelte";
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    import { next as A  } from "@automerge/automerge/slim";

    export let value;

    export let proxy;

    export let doc;

    export let path = undefined;

    export let readonly = false;

    let props = [];
    $: props = value.map((v,i)=> {
        let ar = [i];
        ar.push(v);
        let type = find_type(v);
        ar.push(type); 
        const with_proxy = type == "counter" || type == "map" || type == "list" ;
        if (with_proxy) {
            ar.push(proxy[i]); 
        }
        return ar;
    });

    function add_prop() {

        doc = A.change(doc, (d) => {
            proxy.push(new_value(new_prop_type_selected))
        });
        let update = A.getLastLocalChange(doc);
        dispatch('update', {
            u: update,
            d: doc,
        });
        
    }

    let new_prop_type_selected = 'text';

    function updateText(event) {
        if (path !== undefined) event.detail.p.unshift(path);
        dispatch('updateText', {
            s: event.detail.s,
            p: event.detail.p,
        });
    }

    function updateScalar(prop, event) {
        doc = A.change(doc, (d) => {
            proxy[prop] = event.detail.v;
        });
        let update = A.getLastLocalChange(doc);
        dispatch('update', {
            u: update,
            d: doc,
        });
    }
</script>

<table class="border-collapse border border-slate-400">
    <thead>
        <tr class="bg-slate-100">
            <th>List</th>
            <th class="text-sm">
                {#if !readonly}
                    <span class="ml-2">Push entry at the end of list:</span>
                    <select bind:value={new_prop_type_selected}>
                        {#each new_prop_types as value}<option value={value.value}>{value.name}</option>{/each}
                    </select>
                    <button on:click={add_prop}>Add</button>
                {/if}
            </th>
        </tr>  
    </thead>
    <tbody>
        {#each props as prop}
            <tr>
                <td>{prop[0]}</td>
                <!-- <td>{prop[2]}</td> -->
                <td>
                    <AValue {readonly} type={prop[2]} value={prop[1]} {doc} on:updateText={updateText} on:update proxy={prop[3]} path={prop[0]} on:updateScalar={(event)=>updateScalar(prop[0],event)} />
                </td>
                <!-- <td>{prop[3]?.constructor.name || ""}</td> -->
            </tr>
        {/each}
    </tbody>
</table>

<style>
    td {
        padding:5px;
    }
    tr {
        border-bottom: 1px;
        border-style: dashed;
        border-top: none;
    }
</style>