
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
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    import { next as A } from "@automerge/automerge/slim";

    export let value;

    export let proxy;

    export let doc;

    async function increment(val) {

        doc = A.change(doc, (d) => {
            proxy.increment(val);
        });
        let update = A.getLastLocalChange(doc);
        dispatch('update', {
            u: update,
            d: doc,
        });
        
    }

    function update() {
        temp_val = value.value;
        previous_val = value.value;
    }

    let temp_val;
    let previous_val;
    $: value, update();

    const inc = async () => { temp_val+=1; await increment(1) }
    const dec = async () => { temp_val-=1; await increment(-1) }
    const change = async () => { let diff = Math.round(temp_val - previous_val); if (diff !==0) await increment(diff); else temp_val = previous_val; }

</script>

<div class="relative flex items-center max-w-[8rem]">
    <button type="button" on:click={dec} class="bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600 hover:bg-gray-200 border border-gray-300 rounded-s-lg p-2 h-7 focus:ring-gray-100 dark:focus:ring-gray-700 focus:ring-2 focus:outline-none">
        <svg class="w-3 h-3 text-gray-900 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 2">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h16"/>
        </svg>
    </button>
    <input bind:value={temp_val} on:change={change} type="text" id="quantity-input" data-input-counter aria-describedby="helper-text-explanation" style="max-width:70px;" class="bg-gray-50 border-x-0 border-gray-300 h-7 text-center text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block w-full py-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="999" required />
    <button type="button" on:click={inc}  class="bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600 hover:bg-gray-200 border border-gray-300 rounded-e-lg p-2 h-7 focus:ring-gray-100 dark:focus:ring-gray-700 focus:ring-2 focus:outline-none">
        <svg class="w-3 h-3 text-gray-900 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 18">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 1v16M1 9h16"/>
        </svg>
    </button>
</div>