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
  import Logo from "../../assets/nextgraph.svg?component";

  export let className: string = "";

  // Color is adjusted to connection status.
  let connection_status_class = ""; // Default is blue.
  if ($connection_status === "connecting") {
    connection_status_class = "logo-pulse";
  } else if ($connection_status === "disconnected") {
    connection_status_class = "logo-gray";
  }
</script>

<Logo class={`${className} ${connection_status_class}`} />

<!-- Sorry for the global but this way we can change the Logo's css from this component. -->
<style global>
  @keyframes pulse-logo-color {
    0%,
    100% {
      /* Default colors come from the svg. */
    }
    50% {
      /* Mid-transition color */
      stroke: #888;
      fill: #888;
    }
  }

  .logo-pulse path {
    animation: pulse-logo-color 2s infinite;
    animation-timing-function: cubic-bezier(0.65, 0.01, 0.59, 0.83);
  }

  .logo-gray path {
    fill: #888;
    stroke: #888;
  }
</style>
