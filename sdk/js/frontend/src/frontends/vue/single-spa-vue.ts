// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import type { AppProps, LifeCycles } from "single-spa";
import type { App, Component, createApp, createSSRApp } from "vue";
import { chooseDomElementGetter } from "dom-element-getter-helpers";
import type { DomElementGetterOpts } from "dom-element-getter-helpers";

export interface SingleSpaVueOptions<ExtraProps> extends DomElementGetterOpts {
  component:
    | Component<ExtraProps>
    | ((props: AppProps & ExtraProps) => Promise<Component<ExtraProps>>);
  createApp: typeof createApp | typeof createSSRApp;
  setupInstance?(app: App): void;
}

export default function singleSpaVue<ExtraProps>(
  opts: SingleSpaVueOptions<ExtraProps>,
): LifeCycles<ExtraProps> {
  if (!opts) {
    err(`opts required`);
  }

  if (!opts.component) {
    err(`opts.rootComponent required`);
  }

  if (typeof opts.createApp !== "function") {
    err(`opts.createApp must be a function`);
  }

  const mountedInstances: Record<string, App> = {};
  let RootComponent: Component<AppProps & ExtraProps>;

  return {
    async bootstrap(props) {
      if (typeof opts.component === "function") {
        RootComponent = await (opts.component as Function)(props);
      } else {
        RootComponent = opts.component as Component<AppProps & ExtraProps>;
      }

      // https://vuejs.org/api/options-misc.html#inheritattrs
      // The single-spa props should not be inherited as DOM attributes
      // @ts-ignore
      RootComponent.inheritAttrs = false;
    },
    async mount(props) {
      const app = opts.createApp(RootComponent, props);
      if (opts["setupInstance"]) {
        opts.setupInstance(app);
      }
      const domElement = chooseDomElementGetter(opts, props)();
      app.mount(domElement);
      mountedInstances[props.name] = app;
    },
    async update(props) {
      const app = mountedInstances[props.name];
      if (app && app._instance?.props) {
        Object.assign(app._instance.props, props);
      }
    },
    async unmount(props) {
      const app = mountedInstances[props.name];
      app!.unmount();
      const domElement = chooseDomElementGetter(opts, props)();
      domElement.remove();
      delete mountedInstances[props.name];
    },
  };
}

function err(msg: string) {
  throw Error(`single-spa-vue: ${msg}`);
}
