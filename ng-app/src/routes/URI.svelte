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
<script>
  // The params prop contains values matched from the URL
  export let params = {};

  console.log(params);
</script>

<div class="fix">
  <div
    class="h-screen aspect-[3/5] pazzleline max-w-[720px] bg-yellow-300 inner"
  >
    <p>nextgraph URI {params[1]}</p>
  </div>
</div>
