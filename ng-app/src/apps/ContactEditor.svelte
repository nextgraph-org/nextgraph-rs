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
    
    import ng from "../api";
    import { link } from "svelte-spa-router";
    import { Button, Progressbar, Spinner, Alert } from "flowbite-svelte";
    import{ PlusCircle } from "svelte-heros-v2";
    import { push } from "svelte-spa-router";
    import{ QrCode } from "svelte-heros-v2";
    import { t } from "svelte-i18n";
    import { 
      in_memory_discrete, open_viewer, set_viewer, set_editor, set_view_or_edit, cur_tab_branch_class, cur_tab_doc_can_edit, cur_tab
    } from "../tab";
    import DataClassIcon from "../lib/icons/DataClassIcon.svelte";
    import {
        openModalCreate,
        sparql_query,
        active_session,
        scanned_qr_code,
        check_has_camera,
        toast_error,
        display_error,
        online
    } from "../store";
    import { onDestroy, onMount, tick } from "svelte";

    export let commits;

    const open_scanner = () => {
        push("#/scanqr");
    };

    let container: HTMLElement;
    let has_camera = false;
    let has_name = undefined;
    let has_email = undefined;

    async function scrollToTop() {
        await tick();
        if (container) container.scrollIntoView();
    }
    onMount(async () => {
        if (!$active_session) {
            push("#/");
            return;
        }
        has_camera = await check_has_camera();
        console.log("has_camera",has_camera)
        if ($scanned_qr_code) {
            on_qr_scanned($scanned_qr_code);
            scanned_qr_code.set("");
        } 
        await scrollToTop();
        
    });

    $: if (commits) { contained(commits.graph) }

    async function on_qr_scanned(text: string) {
        try {
            console.log("got QR",text, "did:ng:"+$cur_tab.doc.nuri);
            await ng.import_contact_from_qrcode($active_session.session_id, "did:ng:"+$cur_tab.doc.nuri, text);
        } catch (e) {
            console.error(e)
            toast_error(display_error(e));
        }
    }

    function contained(graph) {
        let ret = [];
        for (const g of graph) {
            if (g.substring(57,91) === "http://www.w3.org/2006/vcard/ns#fn") {
                has_name = g.substring(94, g.length-1);
            } else if (g.substring(57,97) === "http://www.w3.org/2006/vcard/ns#hasEmail") {
                has_email = g.substring(100, g.length-1);
            }
        }
        ret.sort((a, b) => a.hash.localeCompare(b.hash));
        return ret;
    }

    async function test() {
        if (!has_camera) {
            await on_qr_scanned("AgBPtkD9jg11uDj7FTK0VqWb_aVxYvoyjFyIWs5VwCOICwAAABsxv_FXViA-5LUMNjARLJCiS3nOc7WYdoVQYgWn2ukcB25vIG5hbWUBDmZha2VAZW1haWwuY29t");
        }
    }

  </script>
  <div class="flex-col p-5"bind:this={container}>
    <h1 class="font-bold text-xl text-blue-700">Contact</h1>
      {#if !has_camera && !has_name}
        <Alert class="m-2" color="red" style="word-break: break-word;" >No camera available. You cannot import with QR-code</Alert>
      {/if}
      {#if !has_name && has_camera}
        <Button
            on:click={open_scanner}
            on:keypress={open_scanner}
            disabled={!$online} 
            class="select-none ml-2 mt-2 mb-2 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
        >
            <QrCode tabindex="-1" class="mr-2 focus:outline-none" />
            Import with QR-code
        </Button><br/>
      {/if}
      {#if has_name}
      Name: {has_name}<br/>
      {/if}
      {#if has_email}
      Email: {has_email}<br/>
      {/if}
  </div>