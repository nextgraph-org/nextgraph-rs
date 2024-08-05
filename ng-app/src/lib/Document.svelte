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
    branch_subscribe,
    active_session,
    cannot_load_offline,
    online,
  } from "../store";
  
  import {
    Pencil,
  } from "svelte-heros-v2";

  import { t } from "svelte-i18n";
  import { Button, Progressbar, Spinner, Alert } from "flowbite-svelte";
  import { inview } from 'svelte-inview';
  import { cur_tab, cur_tab_doc_can_edit, nav_bar, can_have_header, header_icon, header_title, header_description, cur_branch, set_header_in_view, edit_header_button, cur_app, load_official_app, nav_bar_reset_newest } from "../tab";
  import NavIcon from "./icons/NavIcon.svelte";

  export let nuri = ""; 

  let width;

  let commits;
  // TODO deals with cases when nuri has :r :w :l (remove them from nuri that should only have :o:v format , and add them in cur_tab)
  $: commits = $active_session && nuri && branch_subscribe(nuri, true);

  const inview_options = {};//{rootMargin: "-44px"};

  function openEditHeader() {
    //TODO
  }
</script>

<div bind:clientWidth={width}>

  {#if $cannot_load_offline}
    <div class="row p-4">
       <Alert color="yellow">
        {@html $t("doc.cannot_load_offline")}
        <a href="#/user">{$t("pages.user_panel.title")}</a>.
      </Alert>
    </div>
  {:else}
    <div class="flex justify-left" class:justify-center={width>1024} use:inview={inview_options} on:inview_change={(event) => {
        const { inView, entry, scrollDirection, observer, node} = event.detail;
        if ($cur_branch) { set_header_in_view(inView); }
        if (inView) nav_bar_reset_newest();
      }}>
        
        <div class="flex flex-col ">
            {#if $can_have_header}
            
                <div class="flex p-4 max-w-screen-lg justify-start flex-wrap" class:w-[1024px]={width>1024} > 
                    {#if $header_icon} 
                    <NavIcon img={$header_icon} config={{
                        tabindex:"-1",
                        class:"w-8 h-8 mr-2 mb-2 flex-none focus:outline-none"
                    }}/>
                    {/if}
                    {#if !$header_title} <span class="font-mono h-8 py-1 inline-block align-middle mr-2"> {$cur_tab.doc.nuri.substring(2,9)} </span>  {/if}
                    {#if $cur_tab_doc_can_edit}
                    <button class="p-1 mr-2 mb-2 w-8 h-8 flex-none" on:click={openEditHeader} title={$t($edit_header_button)}>
                        <Pencil tabindex=-1 class="w-5 h-5 focus:outline-none" />
                        
                    </button>{#if !$header_title}<span role="button" on:click={openEditHeader} on:keypress={openEditHeader} tabindex="-1" class="h-8 py-1 inline-block align-middle ">{$t($edit_header_button)}</span>  {/if}
                    {/if}
                    {#if $header_title}
                        <h1 class="grow text-left text-2xl">{$header_title}</h1>
                    {/if}
                </div>
                {#if $header_description}
                    <div class="flex p-4 max-w-screen-lg text-left text-gray-600 dark:text-white" class:w-[1024px]={width>1024}> 
                        {$header_description}
                    </div>
                {/if}
            {/if}
            {#if commits}
                {#await commits.load()}
                    <div class="row p-4 max-w-screen-lg text-gray-600" class:w-[1024px]={width>1024}> 
                        <p>{$t("connectivity.loading")}...</p>
                    </div>
                {:then}
                
                    {#if $cur_app}
                        {#await load_official_app($cur_app) then app}
                        <div class="flex max-w-screen-lg" style="overflow-wrap: anywhere;" class:w-[1024px]={width>1024} > 
                            <svelte:component this={app} commits={$commits}/>
                        </div>
                        {/await}
                    {/if}
                {/await}
            {/if}

        </div>
        
    </div>
    
    
  {/if}

</div>