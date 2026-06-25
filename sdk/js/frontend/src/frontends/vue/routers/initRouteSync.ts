// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import type { NgComponentContext } from "@ng-org/frontend";
import {
  ngComponentContextKey,
  createComponentFactory,
} from "@ng-org/frontend/vue";
import { inject } from "vue";
import { effect as alienEffect } from "@ng-org/alien-deepsignals";
import { useRouter } from "vue-router";

/**
 * Function that sets up synchronization of routes between this component and its parent.
 * Assumes that this vue instance uses a memory router and was invoked with a component factory.
 * Call it in your top-level component.
 *
 * This function does nothing if the calling component in an NgComponent / was not
 * invoked through the component factory.
 *
 * @see createComponentFactory
 */
export function initRouteSync() {
  const router = useRouter();
  let firstRun = true;

  const componentContext = inject<NgComponentContext>(ngComponentContextKey);
  if (!componentContext) {
    return;
  }

  // sync vue -> host
  router.afterEach((to) => {
    if (firstRun) {
      firstRun = false;
      return;
    }

    // Note that hashes in the URL are going to be sanitized away.
    componentContext.shared.pathName = to.fullPath;
  });

  // sync host -> vue
  alienEffect(() => {
    const newPath = componentContext.shared.pathName;
    if (newPath && newPath !== router.currentRoute.value.fullPath) {
      router.push(newPath).catch(() => {});
    }
  });
}
