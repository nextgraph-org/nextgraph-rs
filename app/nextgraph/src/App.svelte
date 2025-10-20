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

<script lang="ts">
    import ng from "@ng-org/ui-common/api";
    import Logo from "./assets/logo.svg?component";
    console.log(await ng.locales());
    let info = await ng.client_info();
    console.log(info.V0.details);
    window.ng_spa_loaded = true;
    if (window.ng_supported) {
        console.log("READY");
        window.everything_ready();
    }
</script>

<div class="grid place-items-center" style="height: 100dvh;">
    <div style="height:144px;">
        <Logo class="w-25"/>
    </div>
</div>

<style>

</style>
