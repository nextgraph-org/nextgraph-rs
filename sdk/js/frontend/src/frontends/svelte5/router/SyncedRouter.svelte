<!--
// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->

<script lang="ts">
  import { getContext, onDestroy, untrack, type Snippet } from "svelte";
  import {
    initCore,
    location,
    LocationLite,
    Router,
    init,
    initFull,
  } from "@svelte-router/core";
  import { MemoryStockHistoryApi } from "./MemoryHistoryApi.svelte.ts";
  import type { NgComponentContext } from "../../../utils/types.ts";
  import { ngComponentContextKey } from "@ng-org/frontend/svelte";
  import { effect as ngEffect } from "@ng-org/alien-deepsignals";

  let { children, fallbackRouter: fallbackRouterProp = null } = $props<{
    children: Snippet;
    /**
     * The router to use if this component does not have a NG component context,
     * thus is a stand-alone application.
     *
     * For better tree-shaking, you are advised to only set it if your app is in standalone mode,
     * e.g. `import.meta.env.MODE === "standalone" ? "HashRouter" : null`.
     *
     * @default null (no fallback)
     */
    fallbackRouter?:
      | "MemoryRouter"
      | "HashRouter"
      | "DefaultRouter"
      | "FullRouter"
      | null;
  }>();
  const fallbackRouter = untrack(() => fallbackRouterProp);

  // Get the injected NG component context (that includes the path information).
  const context = getContext<NgComponentContext>(ngComponentContextKey);

  const createMemoryRouter = () => {
    // Init svelte-router first with in-memory history API.
    const disposeRouter = initCore(
      new LocationLite(
        new MemoryStockHistoryApi("http://localhost", {
          path: "/",
          hash: {},
        }),
      ),
    );
    onDestroy(disposeRouter);
  };

  if (!context) {
    switch (fallbackRouter) {
      case "MemoryRouter":
        createMemoryRouter();
        break;
      case "HashRouter":
        init({ hashMode: "single", defaultHash: true });
        break;
      case "DefaultRouter":
        init();
        break;
      case "FullRouter":
        initFull();
        break;
      default:
        throw new Error(
          "SyncedRouter initialized but no NG ComponentContext available. Use this router within an NgComponent or specify a fallbackRouter.",
        );
    }
  } else {
    createMemoryRouter();
  }

  if (context) {
    const { shared } = context;

    // We set up a bi-directional sync with shell.

    // Handle changes from shell.
    ngEffect(() => {
      if (location && shared.pathName) {
        // console.log(
        //   "Remote Application.svelte updating router.basePath from",
        //   location.url.hash,
        //   "to",
        //   "#" + componentMeta.pathName,
        // );
        location.navigate(shared.pathName);
      }
    });

    // Handle changes from local router.
    $effect(() => {
      // console.log(
      //   "Remote Application.svelte: Updating route to",
      //   location.url.pathname,
      // );
      shared.pathName = location.url.pathname;
    });
  }
</script>

<!--
@component
A svelte router to be used with `@svelte-router/core` that is capable of synchronizing its location with the shell.

This router calls svelte-router's init() function, so don't do that yourself.

Modifications to location.pathName will be reflected in the shell and vice versa.

You can use Links, Routes, etc. as usual. You should route using path routing (not with hashes).

Use this component at the root of your application.
-->
<Router>
  {@render children?.()}
</Router>
