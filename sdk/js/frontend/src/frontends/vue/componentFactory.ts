// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import singleSpaVue, { type SingleSpaVueOptions } from "./single-spa-vue.ts";
import { createApp } from "vue";
import type {
  ComponentFactoryParams,
  NgComponentContext,
} from "../../utils/types.ts";
import { ngComponentContextKey } from "./ngComponentContext.ts";
import { cssLifecycleFactory } from "vite-plugin-single-spa/ex";
import { cleanFilename } from "../../index.ts";

type CreateComponentFactoryProps<ExtraProps> = Omit<
  SingleSpaVueOptions<ExtraProps>,
  "createApp"
> & {
  /** The file name of the entry point (without the extension). */
  cssEntryPoint: string;
};

export const createComponentFactory = <ExtraProps>(
  options: CreateComponentFactoryProps<ExtraProps>,
) => {
  return ({ assignedId, parentCallbacks, shared }: ComponentFactoryParams) => {
    const lifecycles = singleSpaVue({
      ...options,
      createApp,
      setupInstance: (app) => {
        // Set context for this component's meta info.
        app.provide(ngComponentContextKey, {
          parentCallbacks,
          componentId: assignedId,
          shared,
          childComponentIds: new Set(),
        } satisfies NgComponentContext);

        options.setupInstance?.(app);
      },
    });

    const cssLc = cssLifecycleFactory(cleanFilename(options.cssEntryPoint), {});

    const bootstrap = [cssLc.bootstrap, lifecycles.bootstrap];
    const mount = [cssLc.mount, lifecycles.mount];
    const unmount = [cssLc.unmount, lifecycles.unmount];
    const update = [lifecycles.update];

    return { bootstrap, mount, unmount, update };
  };
};
