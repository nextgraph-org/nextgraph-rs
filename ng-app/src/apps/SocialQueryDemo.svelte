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
    import { onMount, tick, onDestroy } from "svelte";
    import { 
      sparql_update,
      sparql_query,
      toast_error,
      toast_success,
      active_session,
      display_error,
      online
    } from "../store";
    import ng from "../api";
    import { 
      in_memory_discrete, open_viewer, set_viewer, set_editor, set_view_or_edit, cur_tab_doc_can_edit, cur_tab
    } from "../tab";
    import{ PencilSquare, Lifebuoy } from "svelte-heros-v2";
    import { t } from "svelte-i18n";
    import { Button, Progressbar, Spinner, Alert } from "flowbite-svelte";
    
    import Highlight, { LineNumbers } from "svelte-highlight";
    import hljs from "highlight.js";
    import { definer } from "../turtle";
    import "svelte-highlight/styles/github.css";
    const language = {
      name: "turtle",
      register: (hljs) => {
        return definer(hljs);
      },
    };

const ranking_query = `SELECT ?mail (SAMPLE(?n) as?name) (MAX(?rust_) as ?rust) (MAX(?svelte_) as ?svelte) (MAX(?tailwind_) as ?tailwind) 
(MAX(?rdf_) as ?rdf) (MAX(?yjs_) as ?yjs) (MAX(?automerge_) as ?automerge) (SUM(?total_) as ?total) 
WHERE { 
  { SELECT ?mail (SAMPLE(?name) as ?n) ?skill (AVG(?value)+1 AS ?score) 
    WHERE {
	    ?rating <http://www.w3.org/2006/vcard/ns#hasEmail> ?mail.
      ?rating <http://www.w3.org/2006/vcard/ns#fn> ?name.
	    ?rating <did:ng:x:skills#hasRating> ?hasrating.
	      ?hasrating <did:ng:x:skills#rated> ?value.
	      ?hasrating <did:ng:x:skills#skill> ?skill.
    } GROUP BY ?mail ?skill 
  }
  BIND (IF(sameTerm(?skill, <did:ng:k:skills:programming:rust>), ?score, 0) AS ?rust_)
  BIND (IF(sameTerm(?skill, <did:ng:k:skills:programming:svelte>), ?score, 0) AS ?svelte_)
  BIND (IF(sameTerm(?skill, <did:ng:k:skills:programming:tailwind>), ?score, 0) AS ?tailwind_)
  BIND (IF(sameTerm(?skill, <did:ng:k:skills:programming:rdf>), ?score, 0) AS ?rdf_)
  BIND (IF(sameTerm(?skill, <did:ng:k:skills:programming:yjs>), ?score, 0) AS ?yjs_)
  BIND (IF(sameTerm(?skill, <did:ng:k:skills:programming:automerge>), ?score, 0) AS ?automerge_)
  BIND (?tailwind_+?svelte_+?rust_+?rdf_+?yjs_+?automerge_ AS ?total_)
} GROUP BY ?mail
ORDER BY DESC(?total)`;

    export let commits = {graph:[]};
    let source = "";
    $: source = commits.graph.join(" .\r\n") + (commits.graph.length ? " .":"");

    let results = [];

    $: if (commits.graph.length > 4) {
      sparql_query(ranking_query, false).then((res) => {
        //console.log(res.results?.bindings);
        results = res.results?.bindings;
      });
    }

    const query = `PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
PREFIX xskills: <did:ng:x:skills#>
PREFIX ksp: <did:ng:k:skills:programming:>
PREFIX ng: <did:ng:x:ng#>
CONSTRUCT { [
    vcard:hasEmail ?email;
    vcard:fn ?name;
    a vcard:Individual;
    ng:site ?public_profile;
    ng:protected ?protected_profile;
    xskills:hasRating [
      a xskills:Rating ;
      xskills:rated ?level;
      xskills:skill ?skill
    ]
  ]
}
WHERE { 
  ?contact a vcard:Individual.
  ?contact vcard:fn ?name.
  ?contact vcard:hasEmail ?email.
  OPTIONAL { ?contact ng:site ?public_profile . ?contact ng:site_inbox ?public_inbox }
  OPTIONAL { ?contact ng:protected ?protected_profile . ?contact ng:protected_inbox ?prot_inbox }
  ?contact xskills:hasRating [
    a xskills:Rating ;
    xskills:rated ?level;
    xskills:skill ?skill
  ].
  ?contact xskills:hasRating/xskills:skill ksp:rust.
  ?contact xskills:hasRating/xskills:skill ksp:svelte.
  FILTER ( ?skill IN (
  	ksp:rust, ksp:svelte, ksp:rdf, ksp:tailwind, ksp:yjs, ksp:automerge
  ) )
}`;

    const openQuery = async () => {
      
      //TODO : return now if already processing (when LDO for svelte is ready)
      // and even disable the button in that case
      try {
        await sparql_update(`INSERT DATA { <> <did:ng:x:ng#social_query_sparql> \"${query.replaceAll("\n"," ")}\".}`);
        let commit_id = commits.heads[0];
        let commit_key = commits.head_keys[0];
        let session = $active_session;
        if (!session) return;
        let request_nuri = "did:ng:"+$cur_tab.doc.nuri+":c:"+commit_id+":k:"+commit_key;
        await ng.social_query_start(
          session.session_id,
          "did:ng:a", 
          request_nuri,
          "did:ng:d:c", 
          0,
        );
      } catch (e) {
        toast_error(display_error(e));
      }
    }

    onMount(()=>{
        //console.log($active_session);
    });
  
  </script>
  <div class="flex-col">
    <p class="p-3">
      Social Query
    </p>
    <Button
      on:click={openQuery}
      on:keypress={openQuery}
      disabled={!$online}      
      class="select-none ml-2 mt-2 mb-2 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
    >
      <Lifebuoy tabindex="-1" class="mr-2 focus:outline-none" />
      Start query
    </Button>

    <div class="relative overflow-x-auto">
      <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 table-auto">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <th scope="col" class="px-6 py-3">Email</th>
          <th scope="col" class="px-6 py-3">Name</th>
          <th scope="col" class="px-6 py-3">Rust</th>
          <th scope="col" class="px-6 py-3">Svelte</th>
          <th scope="col" class="px-6 py-3">Tailwind</th>
          <th scope="col" class="px-6 py-3">Rdf</th>
          <th scope="col" class="px-6 py-3">Yjs</th>
          <th scope="col" class="px-6 py-3">Automerge</th>
          <th scope="col" class="px-6 py-3">Total</th>
        </thead>
        <tbody>
          {#each results as res}
          <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
            <td scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{res.mail.value}</td>
            <td scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{res.name.value}</td>
            <td scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{Math.round(res.rust.value * 10) / 10 }</td>
            <td scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{Math.round(res.svelte.value * 10) / 10 }</td>
            <td scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{Math.round(res.tailwind.value * 10) / 10 }</td>
            <td scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{Math.round(res.rdf.value * 10) / 10 }</td>
            <td scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{Math.round(res.yjs.value * 10) / 10 }</td>
            <td scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{Math.round(res.automerge.value * 10) / 10 }</td>
            <td scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{Math.round(res.total.value * 10) / 10 }</td>
          </tr>
          {/each}
        </tbody>
      </table>
    </div>
    
    <p class="p-3 mt-10">
      Raw data
    </p>
    {#if source}
      <Highlight {language} code={source} class="mb-10"  let:highlighted >
        <LineNumbers {highlighted} wrapLines hideBorder />
      </Highlight>
    {/if}
      
  </div>
  