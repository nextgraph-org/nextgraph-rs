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
    import { t } from "svelte-i18n";
    import { 
      in_memory_discrete, open_viewer, set_viewer, set_editor, set_view_or_edit, cur_tab_branch_class, cur_tab_doc_can_edit, cur_tab
    } from "../tab";
    import DataClassIcon from "../lib/icons/DataClassIcon.svelte";
    import {
        openModalCreate,
        sparql_query,
        active_session,
        toast_error,
        display_error,
        toast_success,
    } from "../store";
    import {
        CheckCircle,
        ArrowLeft
    } from "svelte-heros-v2";

    export let commits;

    let name = "";
    let email = "";
    let readonly = false;

    $: valid = name.trim().length > 1 && email.trim().length > 6 && email.indexOf("@") >= 0 && email.indexOf("\"") < 0;
  
    function contained(graph) {
        for (const g of graph) {
            if (g.substring(57,91) === "http://www.w3.org/2006/vcard/ns#fn") {
                name = g.substring(94, g.length-1);
                readonly = true;
            } else if (g.substring(57,97) === "http://www.w3.org/2006/vcard/ns#hasEmail") {
                email = g.substring(100, g.length-1);
                readonly = true;
            }
        }
    }

    $: if (commits) { contained(commits.graph) }

    async function save() {
        try {
            console.log($cur_tab.doc.nuri);
            //TODO: more sanitation on the input here!
            await ng.sparql_update($active_session.session_id, "PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>"
                            +"INSERT DATA { <> a vcard:Individual . <> vcard:fn \""+name.replace('"',"\\\"")+"\". <> vcard:hasEmail \""+email+"\" }", "did:ng:"+$cur_tab.doc.nuri );
            toast_success("Your profile was edited successfully!");
            set_view_or_edit(true);
        } catch (e) {
            toast_error(display_error(e));
        }
    }

    function cancel() {
        set_view_or_edit(true);
    }
  </script>
  <div class="flex-col p-5">
    <h2>Editing your profile</h2>
    <input
        class="mt-5"
        id="name"
        placeholder="Enter your name"
        bind:value={name}
        disabled={readonly}
    />
    <br/>
    <input
        class="mt-5"
        id="name"
        placeholder="Enter your email address"
        bind:value={email}
        disabled={readonly}
    />
    <br/>
    <Button
            on:click={save}
            disabled={!valid || readonly} 
            class="select-none mt-5 mb-2 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
        >
        <CheckCircle tabindex="-1" class="mr-2 focus:outline-none" />
            Save
    </Button>
    <button
            on:click={cancel}
            class="mt-5 mb-2 text-gray-500 dark:text-gray-400 focus:ring-4 focus:ring-primary-100/50 ounded-lg text-base p-2  text-center inline-flex items-center dark:focus:ring-primary-700/55"
            ><ArrowLeft
              tabindex="-1"
              class="mr-2 focus:outline-none"
            />Cancel</button
          >
  </div>