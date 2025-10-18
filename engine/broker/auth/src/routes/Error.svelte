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
  Error page (?o=https://domain.tld was not provided or is invalid)
-->

<script>
  import { ExclamationTriangle} from "svelte-heros-v2";
</script>

<div class="text-center max-w-6xl lg:px-8 mx-auto px-4 text-green-800">
  <div class=" max-w-6xl lg:px-8 mx-auto px-4 text-red-800">
    <ExclamationTriangle class="animate-bounce mt-10 h-16 w-16 mx-auto" />
    <p class="max-w-xl md:mx-auto lg:max-w-2xl mb-5">
      Invalid request
    </p>
  </div>
</div>
