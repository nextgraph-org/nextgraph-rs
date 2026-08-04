// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import React, { ComponentType } from "react";
import ReactDOMClient from "react-dom/client";
import singleSpaReact, { SingleSpaReactOpts } from "single-spa-react";
import type { AppProps } from "single-spa";
import { ReactComponentContext } from "@ng-org/frontend/react/context";
import { ComponentFactoryParams, NgComponentContext } from "@ng-org/frontend";
import { cssLifecycleFactory } from "vite-plugin-single-spa/ex";
import { cleanFilename } from "../../index.ts";

type ReactComponentFactoryConfig<Props extends Record<string, any>> = {
  opts: Omit<
    SingleSpaReactOpts<Props & AppProps>,
    "rootComponent" | "React" | "ReactDOMClient"
  >;
  component: ComponentType<Props>;
  cssEntryPoint: string;
} & ReactRefreshProps;

type ReactRefreshProps =
  | {
      /**
       * Set it to `import.meta.url`. Needed for importing react-refresh for HMR from the origin.
       * It is inferred by the url's origin + `/@react-refresh`.
       *
       * If react-refresh is not served from this location, set @see reactRefreshUrl instead.
       */
      importMetaUrl: string;
    }
  | {
      /**
       * The URL that react-refresh should be imported from, for HMR.
       * In most cases, you can just set `importMetaUrl` to `import.meta.url`
       * instead which sets it to `${origin}/@react-refresh`.
       */
      reactRefreshUrl: string;
    }
  | {};

export const createComponentFactory = <Props extends Record<string, any>>({
  component,
  opts,
  cssEntryPoint,
}: ReactComponentFactoryConfig<Props>) => {
  const Component = component;

  // The actual function that creates lifecycles and that is handed to NG Components.
  return (props: ComponentFactoryParams) => {
    const { assignedId, parentCallbacks, shared } = props;
    const contextVal: NgComponentContext = {
      componentId: assignedId,
      parentCallbacks,
      shared,
      childComponentIds: new Set(),
    };

    const ContextWrappedComponent = (appProps: Props & AppProps) => (
      <ReactComponentContext.Provider value={contextVal}>
        <Component {...appProps} />
      </ReactComponentContext.Provider>
    );

    const options = {
      React,
      ReactDOMClient,
      ...opts,
      rootComponent: ContextWrappedComponent,
    };

    const reactLifecycles = singleSpaReact<Props>({
      errorBoundary: DefaultErrorBoundary,
      ...options,
    });

    const cssLc = cssLifecycleFactory(cleanFilename(cssEntryPoint), {
      logger: { ...console },
    });

    const bootstrap = [cssLc.bootstrap, reactLifecycles.bootstrap];
    const mount = [cssLc.mount, reactLifecycles.mount];
    const unmount = [cssLc.unmount, reactLifecycles.unmount];
    const update = [reactLifecycles.update];

    return { bootstrap, mount, unmount, update };
  };
};

function DefaultErrorBoundary(
  err: Error,
  errInfo: React.ErrorInfo,
  props: Record<string, any>,
) {
  let propsString = "";
  try {
    propsString = JSON.stringify(props, null, 2);
  } catch (e) {
    propsString = String(props);
  }

  return (
    <div style={{ padding: 12, fontFamily: "monospace" }}>
      <h3>Oops. An error occurred:</h3>
      <div>
        <strong>Message:</strong> {err?.message}
      </div>
      {err?.stack && (
        <details style={{ whiteSpace: "pre-wrap" }}>
          <summary>Stack</summary>
          <div>{err.stack}</div>
        </details>
      )}
      {errInfo?.componentStack && (
        <details style={{ whiteSpace: "pre-wrap" }}>
          <summary>Component Stack</summary>
          <div>{errInfo.componentStack}</div>
        </details>
      )}
      <details style={{ whiteSpace: "pre-wrap" }}>
        <summary>Props</summary>
        <pre style={{ margin: 0 }}>{propsString}</pre>
      </details>
    </div>
  );
}
