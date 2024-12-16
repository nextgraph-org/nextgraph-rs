
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
  
    import { createEventDispatcher } from 'svelte';
    import { Toggle } from 'flowbite-svelte';
    const dispatch = createEventDispatcher();

    export let value;

    function update() {
        temp_val = value;
    }

    let temp_val;
    $: value, update();

    const change = (event) => { 
        dispatch('updateScalar', {
            v: temp_val,
        });
    }

</script>

<Toggle bind:checked={temp_val} on:change={change} />