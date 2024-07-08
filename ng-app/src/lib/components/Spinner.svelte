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

<script lang="ts">
  export let className: string = "";
  export let color: string = "currentColor";
  export let width: number = 24;
</script>

<svg
  class={"animate-spin " + className}
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  stroke={color}
  viewBox={`0 0 ${width} ${width}`}
>
  <circle
    class="opacity-25"
    cx={width / 2}
    cy={width / 2}
    r={width / 2.4}
    stroke={color}
    stroke-width={width / 6}
  />
  <path
    class="opacity-75"
    fill={color}
    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
  />
</svg>
