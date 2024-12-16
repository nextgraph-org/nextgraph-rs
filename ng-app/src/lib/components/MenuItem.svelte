
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
  
    export let clickable;
    export let extraClass = "";
    export let selected = false;
    export let title = "";
    export let dropdown = undefined;
    export let offset = false;

    import {
        ChevronUp,
        ChevronDown,
    } from "svelte-heros-v2";

</script>

{#if clickable}
    <li {title} role="menuitem" tabindex="0" class:text-primary-600={selected} class:text-gray-800={!selected} class:dark:text-white={!selected} class:dark:text-primary-300={selected} 
        class="{extraClass} select-none clickable focus:outline-2 focus:outline flex items-center pl-2 py-1 text-base font-normal rounded-lg  hover:bg-gray-200 dark:hover:bg-gray-700 mt-1 pr-0"
        on:click={(e) => { e.currentTarget.blur(); clickable();}} on:keypress={clickable} on:keydown={(e) => {if (e.code=='Space') { e.preventDefault(); clickable();} }}>
        <slot />
        {#if dropdown!==undefined}
            <div class="grow"></div>
            {#if dropdown}
                <ChevronUp/>
            {:else}
                <ChevronDown/>
            {/if}
            {#if offset}
                <div style="width:35px;">

                </div>
            {/if}
        {/if}
    </li>
{:else if clickable === false}
    <li {title} class="{extraClass} select-none flex items-center px-2 py-1 text-base font-normal  text-primary-600 rounded-lg dark:text-primary-300  mt-1">
        <slot />
    </li>
{:else}
    <li {title} class="{extraClass} select-none flex items-center px-2 py-1 text-base font-normal deactivated-menu text-gray-400 rounded-lg dark:text-gray-400  mt-1" >
        <slot />
    </li>
{/if}

