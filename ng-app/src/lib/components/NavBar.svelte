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
  import {
    ArrowLeft,
    ChevronDoubleUp,
    CheckCircle,
    CheckBadge,
    EllipsisVertical,
  } from "svelte-heros-v2";
  import NavIcon from "./NavIcon.svelte";

  import {save, nav_bar, showMenu} from "../../tab";

  export let scrollToTop = () => {};

  const back = () => {
    // going back
    window.history.go(-1);
  }
</script>
  
<div style="background-color: #fbfbfb;" class="h-11 pb-1 flex text-center text-gray-700 dark:text-white">
    {#if $nav_bar.back}
        <div role="button" tabindex="0" on:click={back} on:keypress={back} class="flex-none w-10 flex justify-center items-center">
        <ArrowLeft tabindex="-1" class="w-8 h-8 focus:outline-none"/>
        </div>
    {/if}
    {#if $nav_bar.icon}
        <div style="cursor:pointer;" class:w-10={!$nav_bar.back} class:ml-3={!$nav_bar.back} class="flex-none w-8 m-1 " on:click={scrollToTop} on:keypress={scrollToTop}>
        <NavIcon img={$nav_bar.icon} config={{
            tabindex:"-1",
            class:"w-8 h-8 focus:outline-none"
        }}/>
        </div>
    {/if}
    <div style="cursor:pointer;" class:pl-3={!$nav_bar.back && !$nav_bar.icon} class="grow w-10 items-center flex px-1"><span class="inline-block truncate" on:click={scrollToTop} on:keypress={scrollToTop}> {$nav_bar.title} </span></div>
    {#if $nav_bar.newest}
        <div role="button" tabindex="0" class="flex-none m-1 rounded-full bg-primary-700 text-white dark:bg-primary-700" on:click={scrollToTop} on:keypress={scrollToTop}>
        <div class="flex items-center grow pr-2"> 
            <ChevronDoubleUp tabindex="-1" class="w-6 h-6 m-1 focus:outline-none"/>
            <span class="inline-block">{@html $nav_bar.newest < 100 ? "+ "+$nav_bar.newest : "<span class=\"text-xl\">&infin;</span>"}</span>
        </div>
        </div>
    {/if}
    {#if $nav_bar.save !== undefined}
        
        {#if $nav_bar.save }
        <div tabindex="0" class="flex-none w-10" role="button" on:click={save} on:keypress={save} title="Save">
            <CheckCircle variation="solid" tabindex="-1" strokeWidth="3" class="w-10 h-10  text-primary-400 focus:outline-none"/>
        </div>
        {:else}
        <div class="flex-none w-10" title="Saved!">
            <CheckBadge tabindex="-1" class="w-8 h-8 m-1 text-green-500 focus:outline-none"/>
        </div>
        {/if}

    {/if}
    <div tabindex="0" class="flex-none w-10 " role="button" title="Open Menu" on:click={showMenu} on:keypress={showMenu}>
        <EllipsisVertical tabindex="-1" class="w-8 h-8 my-1 mr-2"/>
    </div>
</div>