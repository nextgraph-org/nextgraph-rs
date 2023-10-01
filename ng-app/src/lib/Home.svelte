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
  import { close_active_wallet, online } from "../store";
  import { ArrowRightOnRectangle } from "svelte-heros-v2";
  import FullLayout from "./FullLayout.svelte";
  function logout() {
    close_active_wallet();
  }
</script>

<FullLayout>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>

  <h1>Welcome</h1>

  <div class="row mt-10">
    <button
      on:click={logout}
      class="text-primary-700 bg-primary-100 hover:bg-primary-100/90 focus:ring-4 focus:ring-primary-100/50 font-medium rounded-lg text-lg px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-primary-100/55 mr-2 mb-2"
    >
      <ArrowRightOnRectangle tabindex="-1" class="w-8 h-8 mr-2 -ml-1" />

      Logout
    </button>
  </div>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>Welcome</h1>
  <h1>End</h1>
</FullLayout>
