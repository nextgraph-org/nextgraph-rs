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
@component Logo
The NextGraph Logo svg with color changing between blue and gray,
depending on connection status:
- connected: blue
- connecting: pulse between blue and gray
- disconnected: gray

Provide classes using the `className` prop.
-->

<script lang="ts">
  import { connection_status } from "../../store";
  // @ts-ignore
  import Logo from "../../assets/nextgraph-nofill.svg?component";

  export let className: string = "";
  let connection_status_class = "logo-blue";
  // Color is adjusted to connection status.
  $: if ($connection_status === "connecting" || $connection_status === "starting") {
    connection_status_class = "logo-pulse";
  } else if ($connection_status === "disconnected") {
    connection_status_class = "logo-gray";
  } else {
    connection_status_class = "logo-blue";
  }
</script>

<Logo class={`${className} ${connection_status_class}`} />
