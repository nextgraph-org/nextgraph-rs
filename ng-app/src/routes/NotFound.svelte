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

<script>
  import { Alert } from "flowbite-svelte";
  import CenteredLayout from "../lib/CenteredLayout.svelte";
  import { t } from "svelte-i18n";
  import {
    ArrowLeft,
  } from "svelte-heros-v2";
  export let params;
</script>

<CenteredLayout displayFooter={true}>
  <div class="p-8 flex flex-col justify-center">
    <Alert color="red">
      <span class="font-medium">404</span> {$t("pages.not_found.title")}
      <br />
      <span class="text-sm">{@html $t("pages.not_found.message")}</span>
    </Alert>
    <button
      class="mt-10 text-center justify-center align-center flex shrink items-center p-2 text-base font-normal text-white bg-primary-700 dark:bg-primary-400 clickable rounded-lg dark:text-white hover:bg-primary-500 dark:hover:bg-gray-700"
      on:click={() => window.history.go(-1)}
    >
      <ArrowLeft
        tabindex="-1"
        class="w-7 h-7 text-white transition duration-75 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white"
      />
      <span class="ml-3">{$t("buttons.back")}</span>
    </button>
  </div>
</CenteredLayout>
