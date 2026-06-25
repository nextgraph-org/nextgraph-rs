<!--
// Copyright (c) 2022 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->

<script lang="ts">
    import Counter from "./lib/Counter.svelte";
    import Slider from "./lib/Slider.svelte";
    import { initShellContext, ROOT_COMPONENT_ID } from "./lib/shellContext.svelte";
    import { Route, Router, RouterEngine, RouterTrace } from "@svelte-router/core";
    import { onMount } from "svelte";
    import { NgComponent } from "@ng-org/frontend/svelte";
    import { loadApp } from "@ng-org/frontend";
    import { setSingleSpaContext } from "@wjfe/single-spa-svelte";
    import * as singleSpa from "single-spa";
    import { resetMainApp, setMainApp } from "./lib/componentRouteHandlers";
    import { api as ng, wait_api } from "@ng-org/api";
    import Logo from "./assets/logo.svg?component";

    initShellContext();
    setSingleSpaContext({ library: singleSpa });
    let rootRouter = $state<RouterEngine>();

    const docsApp = loadApp("n:g:elfa:docs", "app");
    const calcApp = loadApp("n:g:elfa:calc", "app");
    const react2App = loadApp("n:g:example:react2", "app");
    const react2Switch = loadApp("n:g:example:react2", "switch");

    await wait_api();
    console.log(await ng.locales());
    let info = await ng.client_info();
    console.log(info.V0.details);
    window.ng_spa_loaded = true;
    if (window.ng_supported) {
        console.log("READY");
        window.everything_ready();
    }
</script>

<Router id={ROOT_COMPONENT_ID} bind:router={rootRouter}>
    <div class="grid place-items-center" style="height: 100dvh;">
        <div style="height:144px;">
            <Logo class="w-25" />
        </div>
        <div class="card shadow">
            <div class="card-body gap-4">
                <NgComponent component={docsApp} componentId="docsApp" />
            </div>
        </div>

        <div class="card shadow">
            <div class="card-body gap-4">
                <NgComponent component={calcApp} componentId="calcApp" />
            </div>
        </div>

        <div class="card shadow">
            <div class="card-body gap-4">
                <div>
                    <h2 class="text-lg">Sliders</h2>
                    <p class="text-sm opacity-70">Drag to modify both sliders.</p>
                </div>
                <Slider />
            </div>

            <NgComponent component={react2App} componentId="react2App" />
        </div>
    </div>
</Router>

<style>
</style>
