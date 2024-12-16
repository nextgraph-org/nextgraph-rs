
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
    
    import AMap from "./AMap.svelte";
    import AList from "./AList.svelte";
    import ACounter from "./ACounter.svelte";
    import AString from "./AString.svelte";
    import ABoolean from "./ABoolean.svelte";
    import ANumber from "./ANumber.svelte";
    import ADate from "./ADate.svelte";
  
    export let value;

    export let type;

    export let doc;

    export let proxy;

    export let path;

    export let readonly = false;

    function render_date(value) {
        let time = value.toLocaleTimeString([],{
            hour: "2-digit",
            minute: "2-digit"
        });
        let date = value.toLocaleDateString([],{
            year: "numeric",
            month: "numeric",
            day: "numeric",
        });
        return `${date} ${time}`;
    }

</script>


{#if type==="map"} 
    <AMap {readonly} {value} {doc} on:updateText on:update {proxy} {path}/>
{:else if type==="list"}
    <AList {readonly} {value} {doc} on:updateText on:update {proxy} {path}/>
{:else if type==="counter"}
    {#if !readonly}
        <ACounter {value} {doc} on:update {proxy} />
    {:else}
        : {value}
    {/if}
{:else if type==="text"}
    {#if !readonly}
        <AString {value} on:updateText {path}/>
    {:else}
        : {value}
    {/if}  
{:else if type==="boolean"}
    {#if !readonly}
        <ABoolean {value} on:updateScalar/>
    {:else}
        : {value}
    {/if}
{:else if type==="number"}
    {#if !readonly}
        <ANumber {value} on:updateScalar/>
    {:else}
        : {value}
    {/if}
{:else if value?.toDateString || type==="timestamp"}
    {#if !readonly}
        <ADate {value} on:updateScalar/>
    {:else}
        : {render_date(value)}
    {/if}
{:else}
    : {value}
{/if}