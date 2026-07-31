// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import {
  singleSpaSvelte as singleSpaSvelteWjfe,
  LifecycleOptions,
} from "@wjfe/single-spa-svelte";
import { Component } from "svelte";
import { ngComponentContextKey } from "./ngComponentContext.ts";
import { cssLifecycleFactory } from "vite-plugin-single-spa/ex";
import { cleanFilename } from "../../index.ts";

import {
  ComponentFactoryParams,
  NgComponentContext,
} from "../../utils/types.ts";
import { deepSignal } from "@ng-org/alien-deepsignals";

type SvelteLifecycleFactoryConfig<Props extends Record<string, any>> = {
  component: Component<Props>;
  options?: LifecycleOptions;
  cssEntryPoint: string;
};

export const createComponentFactory =
  <Props extends Record<string, any>>({
    component,
    options,
    cssEntryPoint,
  }: SvelteLifecycleFactoryConfig<Props>) =>
  ({ parentCallbacks, assignedId, shared }: ComponentFactoryParams) => {
    const mergedContext = new Map(options?.mountOptions?.context);
    const contextVal: NgComponentContext = {
      parentCallbacks,
      shared,
      componentId: assignedId,
      childComponentIds: new Set(),
    };
    mergedContext.set(ngComponentContextKey, contextVal);

    const mergedMountOptions = {
      ...(options?.mountOptions ?? {}),
      context: mergedContext,
    };

    const mergedOptions = options
      ? { ...options, mountOptions: mergedMountOptions }
      : { mountOptions: mergedMountOptions };

    const svelteLifecycles = singleSpaSvelteWjfe(
      component,
      undefined,
      // @ts-expect-error
      mergedOptions,
    );

    const cssLifecycles = cssLifecycleFactory(cleanFilename(cssEntryPoint), {});
    const bootstrap = [cssLifecycles.bootstrap, svelteLifecycles.bootstrap];
    const mount = [cssLifecycles.mount, svelteLifecycles.mount];
    const unmount = [cssLifecycles.unmount, svelteLifecycles.unmount];
    const update = [svelteLifecycles.update];

    return { bootstrap, mount, update, unmount };
  };
