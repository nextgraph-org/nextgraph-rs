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
    
    import { Editor, rootCtx,  editorViewOptionsCtx } from '@milkdown/core';
    import { commonmark } from '@milkdown/preset-commonmark';
    import { gfm } from '@milkdown/preset-gfm'
    import { nord } from '@milkdown/theme-nord';
    import '@milkdown/theme-nord/style.css';
    import { collab, collabServiceCtx } from '@milkdown/plugin-collab';
    import "svelte-highlight/styles/github.css";
    import { emoji } from '@milkdown/plugin-emoji';
    //import { math } from '@milkdown/plugin-math';
    import 'katex/dist/katex.min.css';
    import { indent } from '@milkdown/plugin-indent';
    import "prism-themes/themes/prism-nord.css";

    export let commits = {};

    const ydoc = new Y.Doc()

    let editor;
    let has_content = true;
    let loading = true;

    async function setup() {
        try {
            editor = Editor.make().config((ctx) => {
                ctx.set(rootCtx, '#mdeditor')
                ctx.update(editorViewOptionsCtx, (prev) => ({
                    ...prev,
                    editable:() => false,
                }))
            }).config(nord)
            .use(commonmark)
            .use(gfm);
            // polyfill if Safari < 15.4
            if (!Array.prototype.at) {
                Array.prototype.at = function at(n) {
                    let i = Math.trunc(n) || 0
                    i = i < 0 ? this.length + i : i

                    if (i < 0 || i >= this.length) return undefined

                    return this[i]
                }
            }
            if (!Element.prototype.replaceChildren) {
                Element.prototype.replaceChildren = function replaceChildren(...new_children) {
                    const { childNodes } = this;
                    while (childNodes.length) {
                        childNodes[0].remove();
                    }
                    this.append(...new_children);
                }
            }
            if ([].at) {
                let prism = await import("@milkdown/plugin-prism");
                editor = editor.use(prism.prism);
            }
            
            editor = await editor
            .use(indent)
            //.use(math)
            .use(emoji)
            .use(collab)
            .create();
    
            ydoc.on('destroy', async () => {
                commits.discrete?.deregisterOnUpdate();
            })

            editor.action((ctx) => {
                const collabService = ctx.get(collabServiceCtx);

                collabService
                // bind doc and awareness
                .bindDoc(ydoc)
                // connect yjs with milkdown
                .connect();
            });

            has_content = false;
            let history = commits.discrete?.registerOnUpdate((update) => {
                Y.applyUpdate(ydoc, update.YXml, {local:true})
                has_content = true;
            });
            for (const h of history) {
                Y.applyUpdate(ydoc, h.YXml, {local:true})
                has_content = true;
            }
            loading = false;
        }
        catch (e){
            console.log(e)
        }
    }

    onMount(async ()=>{
        if (editor) await editor.destroy();
        await setup();

    });

    onDestroy(async ()=>{
        ydoc.destroy();
        try {
            if (editor) await editor.destroy();
            editor = undefined;
        } catch(e) {
            console.log(e);
        }

    });

    const edit = () => {
      set_view_or_edit(false);
    }
  
  </script>

    {#if !has_content}
      <div class="flex-row">
        <button
            on:click={edit}
            on:keypress={edit}
            class="select-none ml-5 mb-10 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
        >
            <PencilSquare tabindex="-1" class="mr-2 focus:outline-none" />
            {$t("doc.start_editing")}            
        </button>
      </div>
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

  <div class="grow p-5 post-rich-text prose">
    <div id="mdeditor" class="prosemirror-editor"></div>
  </div>

