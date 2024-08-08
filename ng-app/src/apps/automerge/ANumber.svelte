
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
    import { Input } from 'flowbite-svelte';
    const dispatch = createEventDispatcher();

    export let value;

    function update() {
        temp_val = value;
        previous_val = value;
    }

    let temp_val;
    let previous_val;
    $: value, update();

    const change = (event) => { 
        
        let newval = parseFloat(event.target.value.replace(",", "."));
        //console.log(previous_val, temp_val, newval)
        if (isNaN(newval) || previous_val === newval) return;
        dispatch('updateScalar', {
            v: newval,
        });
    }

</script>

<Input style="max-width: 129px;" bind:value={temp_val} on:change={change} on:keyup={change} type="number" />