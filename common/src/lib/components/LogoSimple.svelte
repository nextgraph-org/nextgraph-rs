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
@component LogoSimple
The NextGraph Logo svg
-->

<script lang="ts">
  // @ts-ignore
  import Logo from "../../assets/nextgraph.svg?component";
  import { t } from "svelte-i18n";
</script>
<Logo class="logo block h-[8em]" alt={$t("common.logo")} />

