<!--
// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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
  import branch_commits from "../store";
  let name = "";
  let greetMsg = "";
  let commits = branch_commits("ok", false);

  let img_map = {};

  async function get_img(ref) {
    if (!ref) return false;
    let cache = img_map[ref];
    if (cache) {
      return cache;
    }
    try {
      //console.log(JSON.stringify(ref));
      let file = await ng.doc_get_file_from_store_with_object_ref("ng:", ref);
      //console.log(file);
      var blob = new Blob([file["File"].V0.content], {
        type: file["File"].V0.content_type,
      });
      var imageUrl = URL.createObjectURL(blob);
      img_map[ref] = imageUrl;
      return imageUrl;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function greet() {
    //greetMsg = await ng.create_wallet(name);
    // cancel = await ng.doc_sync_branch("ok", async (commit) => {
    //   console.log(commit);
    //   try {
    //     let file = await ng.doc_get_file_from_store_with_object_ref(
    //       "ng:",
    //       commit.V0.content.refs[0]
    //     );
    //     console.log(file);
    //     var blob = new Blob([file["File"].V0.content], {
    //       type: file["File"].V0.content_type,
    //     });
    //     var imageUrl = URL.createObjectURL(blob);
    //     url = imageUrl;
    //   } catch (e) {
    //     console.error(e);
    //   }
    // });
    //cancel();
  }

  let fileinput;

  const onFileSelected = (e) => {
    let image = e.target.files[0];
    let reader = new FileReader();
    reader.readAsArrayBuffer(image);
    reader.onload = (e) => {
      console.log(e.target.result);
    };
  };
</script>

<div>
  <!-- <div class="row">
    <input id="greet-input" placeholder="Enter a name..." bind:value={name} />
    <button on:click={greet}> Greet </button>
  </div> -->
  <div class="row mt-2">
    <button
      type="button"
      on:click={() => {
        fileinput.click();
      }}
      class="text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-700/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-700/55 mr-2 mb-2"
    >
      <svg
        class="w-8 h-8 mr-2 -ml-1"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      </svg>
      Add image
    </button>
    <input
      style="display:none"
      type="file"
      accept=".jpg, .jpeg, .png"
      on:change={(e) => onFileSelected(e)}
      bind:this={fileinput}
    />
  </div>
  <!-- <p>{greetMsg}</p> -->
  {#await commits.load()}
    <p>Currently loading...</p>
  {:then}
    {#each $commits as commit}
      <p>
        {#await get_img(commit.V0.content.refs[0]) then url}
          {#if url}
            <img src={url} />
          {/if}
        {/await}
      </p>
    {/each}
  {/await}
</div>
