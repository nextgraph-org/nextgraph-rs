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
</script>

<CenteredLayout displayFooter={true}>
  <div class="p-8">
    <Alert color="red">
      <span class="font-medium">404</span> {$t("pages.not_found.title")}
      <br />
      <span class="text-sm">{$t("pages.not_found.message")}</span>
    </Alert>
  </div>
</CenteredLayout>
