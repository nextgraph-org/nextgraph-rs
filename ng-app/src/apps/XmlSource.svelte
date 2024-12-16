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

<!--
    We could maybe also use https://ssssota.github.io/svelte-exmarkdown/ for rendering the MD (but to obtain the MD, we need to instantiate Milkdown anyway)
-->

<script lang="ts">
    import { onMount, tick, onDestroy } from "svelte";
    import { 
      toast_error,
      toast_success,
      reset_toasts,
      display_error,
      live_discrete_update,
      discrete_update
    } from "../store";
    import { 
        cur_tab_register_on_save,
        cur_tab_deregister_on_save,
        cur_tab_branch_class,
        set_view_or_edit
    } from "../tab";
    import { t } from "svelte-i18n";
    import{ PencilSquare } from "svelte-heros-v2";
    
    import * as Y from 'yjs'
    
    import xml from "svelte-highlight/languages/xml";
    import Highlight, { LineNumbers } from "svelte-highlight";
    import "svelte-highlight/styles/github.css";
    import beautify from "xml-beautifier";

    export let commits = {};

    const ydoc = new Y.Doc();
    const yxml = ydoc.getXmlFragment('prosemirror');

    let has_content = true;
    let loading = true;

    let source = "";

    function process_doc() {
        source = beautify("<?xml version=\"1.0\" encoding=\"utf-8\"?>"+yxml.toString());
        //console.log(source);
    }

    async function setup() {
        try {
        
            ydoc.on('destroy', async () => {
                
            })

            has_content = false;
            let history = commits.discrete?.registerOnUpdate((update) => {
                Y.applyUpdate(ydoc, update.YXml, {local:true})
                has_content = true;
                process_doc();
            });
            for (const h of history) {
                Y.applyUpdate(ydoc, h.YXml, {local:true})
                has_content = true;
            }
            if (has_content) process_doc();
            loading = false;

        }
        catch (e){
            console.log(e)
        }
    }

    onMount(async ()=>{
        await setup();

    });

    onDestroy(async ()=>{
        ydoc.destroy();
        commits.discrete?.deregisterOnUpdate();
    });

 
  </script>

    {#if !has_content}
        <p class="ml-5">{$t("doc.empty")}</p>
    {/if}

  {#if loading}
    <div class="grow flex flex-col justify-center text-primary-700">
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
  {/if}

    {#if source} 
        <Highlight language={xml} code={source} class="mb-10" let:highlighted>
            <LineNumbers {highlighted} wrapLines hideBorder />
        </Highlight>
    {/if}
