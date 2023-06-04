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
  let name = "";
  let greetMsg = "";
  let ng;

  if (import.meta.env.NG_APP_WEB) {
    import("ng-sdk-js").then((ng2) => {
      ng = {
        greet: async function (n) {
          ng2.test();
          return "greetings from web " + n;
        },
      };
    });
  } else {
    import("@tauri-apps/api/tauri").then((tauri) => {
      ng = { greet: (n) => tauri.invoke("greet", { name: n }) };
    });
  }

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    greetMsg = await ng?.greet(name);
  }
</script>

<div>
  <div class="row">
    <input id="greet-input" placeholder="Enter a name..." bind:value={name} />
    <button on:click={greet}> Greet </button>
  </div>
  <p>{greetMsg}</p>
</div>
