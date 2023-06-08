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
  let cancel = () => {};
  let url = "";
  let commits = branch_commits("ok", false);

  let img_map = {};

  async function get_img(ref) {
    if (!ref) return false;
    let cache = img_map[ref];
    if (cache) {
      console.log("got it from cache");
      return cache;
    }
    try {
      let file = await ng.doc_get_file_from_store_with_object_ref("ng:", ref);
      console.log(file);
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
    greetMsg = await ng.create_wallet(name);
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
</script>

<div>
  <div class="row">
    <input id="greet-input" placeholder="Enter a name..." bind:value={name} />
    <button on:click={greet}> Greet </button>
    <button on:click={cancel}> Cancel </button>
  </div>
  <p>{greetMsg}</p>
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
