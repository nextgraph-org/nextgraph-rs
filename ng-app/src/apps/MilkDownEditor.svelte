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
    TODO: 
    https://github.com/Milkdown/milkdown/tree/main/packages/components/src
    https://milkdown-storybook.vercel.app/?path=/story/components-image-block--empty
    https://github.com/Milkdown/milkdown/tree/main/packages/crepe
    https://milkdown-storybook.vercel.app/?path=/story/crepe-crepe--empty
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
        cur_tab_branch_class
    } from "../tab";
    import { t } from "svelte-i18n";
    
    import * as Y from 'yjs'
    
    import { Editor, rootCtx, editorViewCtx } from '@milkdown/core';
    import { commonmark } from '@milkdown/preset-commonmark';
    import { gfm } from '@milkdown/preset-gfm'
    import { nord } from '@milkdown/theme-nord';
    import '@milkdown/theme-nord/style.css';
    import { collab, collabServiceCtx } from '@milkdown/plugin-collab';
    import { placeholder, placeholderCtx } from './milkdown-placeholder'
    import { splitEditing, toggleSplitEditing } from '@milkdown-lab/plugin-split-editing'
    //import { SlashProvider, slashFactory } from '@milkdown/plugin-slash'
    import { callCommand } from '@milkdown/utils';
    import { emoji } from '@milkdown/plugin-emoji';
    //import { math } from '@milkdown/plugin-math';
    import 'katex/dist/katex.min.css';
    import { indent } from '@milkdown/plugin-indent';
    import 'prism-themes/themes/prism-nord.css'

    export let commits = {};

    const ydoc = new Y.Doc()

    let editor;
    let width;
    let split = true;

    function width_changed() {
        if (!editor) return;
        if (width < 768 && split) {
            split = false;
            editor.action(callCommand(toggleSplitEditing.key, true));
        } else if (width >= 768 && !split) {
            split = true;
            editor.action(callCommand(toggleSplitEditing.key, false));
        }
    }

    $: width, width_changed();

    // function slashPluginView(view) {
    //     const content = document.createElement('div');

    //     const provider = new SlashProvider({
    //         content,
    //     });

    //     return {
    //         update: (updatedView, prevState) => {
    //             provider.update(updatedView, prevState);
    //         },
    //         destroy: () => {
    //             provider.destroy();
    //             content.remove();
    //         }
    //     }
    // }

    // const slash = slashFactory('my-slash');

    async function setup() {
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
        let prism = await import("@milkdown/plugin-prism");       

        editor = await Editor.make().config((ctx) => {
            ctx.set(rootCtx, '#mdeditor')
            ctx.set(placeholderCtx, $t("doc.type_your_text_here"))
            // ctx.set(slash.key, {
            //     view: slashPluginView
            // })
        })//.use(slash)
        .config(nord)
        .use(commonmark)
        .use(gfm)
        .use(prism.prism)
        .use(indent)
        //.use(math)
        .use(emoji)
        .use(placeholder)
        .use(splitEditing)
        .use(collab).create();
   
        ydoc.on('update', async (update, origin) => {
            //console.log(update,origin);
            if (!origin.local) {
                try {
                    await discrete_update(update, "YXml", commits.heads);
                } catch (e){
                    toast_error(display_error(e));
                }
            }
        })

        ydoc.on('destroy', async () => {
            commits.discrete?.deregisterOnUpdate();
            await cur_tab_deregister_on_save();
        })

        editor.action((ctx) => {
            const collabService = ctx.get(collabServiceCtx);

            collabService
            // bind doc
            .bindDoc(ydoc)
            // connect yjs with milkdown
            .connect();
        });

        cur_tab_register_on_save(async (updates)=>{
            
            let update = Y.mergeUpdates(updates);
            await live_discrete_update(update, "YXml", commits.heads);
            
        });

        let history = commits.discrete?.registerOnUpdate((update) => {
            Y.applyUpdate(ydoc, update.YXml, {local:true})
        });
        for (const h of history) {
            Y.applyUpdate(ydoc, h.YXml, {local:true})
        }
        await tick();
        editor.action((ctx) => {
            const editorView = ctx.get(editorViewCtx)
            editorView.focus();
        });
        width_changed();
    }

    onMount(async ()=>{
        if (editor) await editor.destroy();
        await setup();

    });

    onDestroy(async ()=>{
        ydoc.destroy();
        if (editor) await editor.destroy();
        editor = undefined;
    });
  
  </script>

  <div class="grow p-5 post-rich-text" style="min-height:300px;" bind:clientWidth={width}>
    <div id="mdeditor" class="prosemirror-editor"></div>
  </div>

