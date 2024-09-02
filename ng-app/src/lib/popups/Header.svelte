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
      toast_error,
      toast_success,
      display_error,
      online,
      change_header
    } from "../../store";
    import {
        cur_tab,
        show_doc_popup
    } from "../../tab";
    import { get } from "svelte/store";
    import { onMount, onDestroy, tick } from "svelte";
    import ng from "../../api";
    import { t } from "svelte-i18n";
    import {
        CheckCircle
    } from "svelte-heros-v2";
    import {

    } from "flowbite-svelte";
    let is_tauri = import.meta.env.TAURI_PLATFORM;

    onMount(()=>{
        title = $cur_tab.doc.title;
        about = $cur_tab.doc.description;
    });

    async function update_header() {
        await change_header(title,about);
        $show_doc_popup = false;
    }

    let title;
    let about;

</script>

<div class="flex flex-col">
    <span class="font-bold text-xl mb-3">{$t("doc.header.buttons.edit_intro")}</span>
    {$t("doc.header.doc.title")} :
    <input placeholder="Enter the title of the document" bind:value={title} class="mb-3"/>
    {$t("doc.header.doc.about")} :
    <textarea rows=6 class="my-4 col-span-6 pr-11 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
     placeholder="Enter the introduction" bind:value={about}/>
    <button
        style="width:120px;"
        on:click|once={update_header}
        class="mt-4 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-3 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mb-2"
    >
        <CheckCircle class="w-8 h-8 mr-3"/>
        {$t("doc.header.buttons.save")}
    </button>
</div>


