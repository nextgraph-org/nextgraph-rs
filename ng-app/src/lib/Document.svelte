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
  import { cur_tab, cur_tab_view_or_edit, nav_bar, can_have_header, header_icon, header_title, header_description, cur_branch, set_header_in_view, edit_header_button, cur_app, load_official_app, nav_bar_reset_newest } from "../tab";
  import NavIcon from "./icons/NavIcon.svelte";

  export let nuri = ""; 

  let width;

  let center;
  $: center = width > 1024 && !$cur_app?.full_width

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
    <div class="flex justify-left" class:justify-center={center} use:inview={inview_options} on:inview_change={(event) => {
        const { inView, entry, scrollDirection, observer, node} = event.detail;
        if ($cur_branch) { set_header_in_view(inView); }
        if (inView) nav_bar_reset_newest();
      }}>
        
        <div class="flex flex-col" class:grow={width<=1024 || $cur_app?.full_width}>
            {#if $can_have_header}
            
                <div class:max-w-screen-lg={center} class="flex p-4 justify-start flex-wrap" class:w-[1024px]={center} > 
                    {#if $header_icon} 
                    <NavIcon img={$header_icon} config={{
                        tabindex:"-1",
                        class:"w-8 h-8 mr-2 mb-2 flex-none focus:outline-none"
                    }}/>
                    {/if}
                    {#if !$header_title} <span class="font-mono h-8 py-1 inline-block align-middle mr-2"> {$cur_tab.doc.nuri.substring(2,9)} </span>  {/if}
                    {#if !$cur_tab_view_or_edit}
                    <button class="p-1 mr-2 mb-2 w-8 h-8 flex-none" on:click={openEditHeader} title={$t($edit_header_button)}>
                        <Pencil tabindex=-1 class="w-5 h-5 focus:outline-none" />
                        
                    </button>{#if !$header_title}<span role="button" on:click={openEditHeader} on:keypress={openEditHeader} tabindex="-1" class="h-8 py-1 inline-block align-middle ">{$t($edit_header_button)}</span>  {/if}
                    {/if}
                    {#if $header_title}
                        <h1 class="grow text-left text-2xl">{$header_title}</h1>
                    {/if}
                </div>
                {#if $header_description}
                    <div class:max-w-screen-lg={center} class="flex p-4 text-left text-gray-600 dark:text-white" class:w-[1024px]={center}> 
                        {$header_description}
                    </div>
                {/if}
            {/if}
            {#if commits}
                {#await commits.load()}
                  <div class="flex flex-col justify-center text-primary-700">
                    <div class:max-w-screen-lg={center} class="p-4" class:w-[1024px]={center}> 
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
                  </div>
                {:then}
                    {#if $cur_app}
                        {#await load_official_app($cur_app) then app}
                        <div class:max-w-screen-lg={center} class="flex flex-col" style="overflow-wrap: anywhere;" class:w-[1024px]={center} > 
                            <svelte:component this={app} commits={$commits}/>
                        </div>
                        {/await}
                    {:else}
                      <div class="flex flex-col justify-center text-primary-700">
                        <div class:max-w-screen-lg={center} class="p-4" class:w-[1024px]={center}> 
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
                      </div>
                    {/if}
                {/await}
            {:else}
              <div class="flex flex-col justify-center text-primary-700">
                <div class:max-w-screen-lg={center} class="p-4" class:w-[1024px]={center}> 
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
              </div>
            {/if}

        </div>
        
    </div>
    
    
  {/if}

</div>