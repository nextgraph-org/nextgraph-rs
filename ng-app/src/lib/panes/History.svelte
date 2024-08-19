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
    } from "../../store";
    import { get } from "svelte/store";
    import { onMount, onDestroy, tick } from "svelte";
    import {
      Sun,
      Cloud,
      DocumentPlus,
      DocumentMinus,
      Camera,
      Funnel,
      FingerPrint,
      Key,
      Cog,
      Icon,
      ShieldCheck,
    } from "svelte-heros-v2";
    import BranchIcon from "../icons/BranchIcon.svelte";

    import { t } from "svelte-i18n";
    import { Button, Progressbar, Spinner, Alert } from "flowbite-svelte";
    import { cur_tab } from "../../tab";
    import ng from "../../api";

    import {
        createGitgraph,
        templateExtend,
        TemplateName,
    } from "./history/gitgraph-js/gitgraph";

    let gitgraph;
    let history = [];
    let unsub = () => {};

    onMount(async ()=>{
        setTimeout(async()=> {
            const graphContainer = document.getElementById("graph-container");
            gitgraph = createGitgraph(graphContainer, {
            template: templateExtend(TemplateName.Metro, {
                branch: { label: { display: false } },
                commit: { message: { displayAuthor: false, displayHash: false } },
            }),
            });
            let res = await ng.branch_history($active_session.session_id, "did:ng:"+$cur_tab.branch.nuri+":"+$cur_tab.store.overlay);
            // for (const h of res.history) {
            //     console.log(h[0], h[1]);
            // }
            //console.log(res.swimlane_state);
            history = [...res.history].reverse();

            gitgraph.swimlanes(res.swimlane_state.map((s)=> s || false));
            gitgraph.import(res.history.map((h)=>{return { 
                hash:h[0], 
                branch:h[1].branch, 
                author:h[1].author, 
                parents:h[1].past, 
                x:h[1].x, 
                y:h[1].y, 
                subject:h[1].timestamp,
                onClick:()=>openCommit(h[0]),
                onMessageClick:()=>openCommit(h[0])
            };}));

            let branch = branch_subscribe($cur_tab.branch.nuri+":"+$cur_tab.store.overlay,false);
            unsub();
            unsub = branch.subscribe((b) => {
                //console.log("subscription callbak",b.history.commits);
                if (Array.isArray(b.history.commits)) {
                    for (var h; h = b.history.commits.pop(); ) {
                        //console.log(h);
                        history.unshift(h);
                        if (h[1].async_sig) {                                                   
                            for (let hh of history) {
                                const index = h[1].async_sig[1].indexOf(hh[0]);
                                if (index > -1) {
                                    h[1].async_sig[1].splice(index, 1);
                                    hh[1].final_consistency = false;
                                    hh[1].signature = h[1].async_sig[0];
                                }
                                if (h[1].async_sig[1].length == 0) break;
                            }
                        }
                        history = history;
                        gitgraph.commit({
                            hash: h[0], 
                            author:h[1].author, 
                            parents:h[1].past, 
                            subject:h[1].timestamp,
                            onClick:()=>openCommit(h[0]),
                            onMessageClick:()=>openCommit(h[0])
                        });
                    }
                }
            });
            get(branch).history.start();
        },1);
    });

    onDestroy( ()=>{ 
        let branch = branch_subscribe($cur_tab.branch.nuri+":"+$cur_tab.store.overlay,false);
        get(branch).history.stop();
        unsub();
    });

    const openCommit = (id:string) => {
        console.log("open commit",id);
    }
  
    const commit_type_icons = {
        "TransactionGraph": Sun,
        "TransactionDiscrete": Cloud,
        "TransactionBoth": Sun,
        "FileAdd": DocumentPlus,
        "FileRemove": DocumentMinus,
        "Snapshot": Camera,
        "Compact": Funnel,
        "AsyncSignature": FingerPrint,
        "SyncSignature": FingerPrint,
        "Branch": BranchIcon,
        "UpdateBranch": BranchIcon,
        "BranchCapRefresh": Key,
        "CapRefreshed": Key,
        "Other": Cog,
    };

  </script>
  
  <div style="width:120px; min-width:120px;font-family: monospace; font: Courier; font-size:16px;">
  
    {#each history as commit}
    
        <div class="w-full commit relative text-gray-500" style="height:60px;" role="button" title={commit[0]} tabindex=0 on:click={()=>openCommit(commit[0])} on:keypress={()=>openCommit(commit[0])}>
            {#if commit[1].final_consistency}<ShieldCheck tabindex="-1" class="w-5 h-5 absolute text-primary-600" style="top:9px;right:20px;" />
            {:else if commit[1].signature}<ShieldCheck tabindex="-1" class="w-5 h-5 absolute text-green-600" style="top:9px;right:20px;" />
            {/if}
            <Icon tabindex="-1" class="w-5 h-5 focus:outline-none absolute " style="top:9px;right:0px;" variation="outline" color="currentColor" icon={commit_type_icons[commit[1].commit_type]} />
            {#if commit[1].commit_type==="TransactionBoth"}<Cloud tabindex="-1" class="w-5 h-5 absolute " style="top:28px;right:0px;" />{/if}
            <b>{commit[0].substring(0,7)}</b><br/>
            <span class="text-xs leading-tight">{commit[1].author.substring(0,9)}</span>
        </div>
    
    {/each}
  
  </div>

  <div style="cursor:pointer;" id="graph-container"></div>

  <style>
    .commit {
        padding: 8px;
    }
  </style>