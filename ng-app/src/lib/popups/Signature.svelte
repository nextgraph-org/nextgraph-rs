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
      ShieldExclamation,
      ShieldCheck,
      Camera
    } from "svelte-heros-v2";
    import {
        Toggle,
        Button
    } from "flowbite-svelte";
    let is_tauri = import.meta.env.TAURI_PLATFORM;

    let heads = [];
    onMount(async ()=>{
        heads = await ng.signature_status($active_session.session_id, "did:ng:"+$cur_tab.branch.nuri+":"+$cur_tab.store.overlay);
    });
    let snapshot = false;
    let force_snapshot = false;
    let can_sign = false;
    let has_signatures = false;
    let hide_snapshot = false;
    $: force_snapshot = heads.every(h => h[1]) && heads.length && !heads[0][2];
    $: can_sign = force_snapshot || !heads[0]?.[2] ; 
    $: has_signatures = heads.some(h => h[1]);
    let cur_link;

    function signed_commit_link(head) {
        return `did:ng:${$cur_tab.branch.nuri}:${$cur_tab.store.overlay}:${head[1]}:${$cur_tab.store.has_outer}`
    }

    async function sign() {
        if (snapshot) await sign_snapshot();
        else {
            try {
                let immediate = await ng.signature_request($active_session.session_id, "did:ng:"+$cur_tab.branch.nuri+":"+$cur_tab.store.overlay);
                if (immediate) {
                    heads = await ng.signature_status($active_session.session_id, "did:ng:"+$cur_tab.branch.nuri+":"+$cur_tab.store.overlay);
                    cur_link=signed_commit_link(heads[0]);
                    hide_snapshot = true;
                    toast_success($t("doc.signature_is_ready"));
                } else {
                    $show_doc_popup = false;
                    toast_success($t("doc.signature_is_on_its_way"));
                }
            } catch (e) {
                toast_error(display_error(e));
            }
        }
    }
    async function sign_snapshot() {
        try {
            let immediate = await ng.signed_snapshot_request($active_session.session_id, "did:ng:"+$cur_tab.branch.nuri+":"+$cur_tab.store.overlay);
            if (immediate) {
                heads = await ng.signature_status($active_session.session_id, "did:ng:"+$cur_tab.branch.nuri+":"+$cur_tab.store.overlay);
            } else {
                $show_doc_popup = false;
                toast_success($t("doc.signed_snapshot_is_on_its_way"));
            }
        } catch (e) {
            toast_error(display_error(e));
        }
    }

</script>

<div class="flex flex-col">
    <span class="font-bold text-xl">Signature</span>
    
    Current heads :
    {#each heads as head} 
        {#if head[1]}
            <div style="font-family: monospace; font: Courier; font-size:16px;" class="flex text-green-600 clickable my-2" 
                on:click={()=>cur_link=signed_commit_link(head)} on:keypress={()=>cur_link=signed_commit_link(head)} tabindex="0" role="button">
                <ShieldCheck tabindex="-1" class="w-5 h-5 mr-2"  />
                {head[0].substring(0,7)}
            </div>
        {:else}
            <div style="font-family: monospace; font: Courier; font-size:16px;" class="flex my-2">
                <ShieldExclamation tabindex="-1" class="w-5 h-5 mr-2"  />
                {head[0].substring(0,7)}
            </div>
        {/if}
    {/each}
    {#if !hide_snapshot}
        {#if force_snapshot} 
            <Button
                disabled={!$online && !is_tauri}
                on:click|once={sign_snapshot}
                on:keypress|once={sign_snapshot}
                class="select-none mt-2 mb-2 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            >
                <ShieldCheck tabindex="-1" class="mr-2 focus:outline-none" />
                {$t("doc.sign_snapshot")}            
            </Button>
            <span class="mb-2">or click on one of the signed heads to get its link.</span>

        {:else if can_sign} 
            <button
                on:click|once={sign}
                on:keypress|once={sign}
                class="shrink select-none mt-2 mb-3 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            >
                <ShieldCheck tabindex="-1" class="mr-2 focus:outline-none" />
                {$t("doc.sign_heads")}            
            </button>
            <Toggle
                disabled={!$online && !is_tauri}
                class="clickable mb-3"
                bind:checked={ snapshot }
                ><span class="text-gray-700 text-base">{$t("doc.take_snapshot")}</span>
            </Toggle>
            {#if has_signatures}<span>or click on one of the signed heads to get its link</span>{/if}
        {:else}
            <div class="flex mt-3"><Camera tabindex="-1" class="w-6 h-6 mr-3 text-green-600"/><span class="text-green-600">A signed snapshot is currently at the head.</span></div>
            <span>Here is its link that you can share.<br/>For now this link is only usable with the CLI, by running the following command :<br/><br/></span>
            <span style="font-family: monospace; font: Courier; font-size:16px;" class="break-all">ngcli get {signed_commit_link(heads[0])}</span>
        {/if}
    {/if}
    {#if (force_snapshot || can_sign) && cur_link }
        <span class="mt-3">For now the link is only usable with the CLI, by running the following command :<br/><br/></span>
        <span style="font-family: monospace; font: Courier; font-size:16px;" class="break-all">ngcli get {cur_link}</span>
    {/if}
</div>


