// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import React from "react";
import type { ReactNode } from "react";
const { useContext, useEffect, useRef } = React;
import {
  MemoryRouter,
  HashRouter,
  BrowserRouter,
  useLocation,
  useNavigate,
} from "react-router";
import { ReactComponentContext } from "@ng-org/frontend/react/context";
import { effect as ngEffect } from "@ng-org/alien-deepsignals";

/** Utility to sync router with external state. */
export default function SyncedRouter({
  children,
  fallbackRouter = null,
}: {
  children?: ReactNode;
  /**
   * The router to use if this component does not have a NG component context,
   * thus is a stand-alone application.
   *
   * For better tree-shaking, you are advised to only set it if your app is in standalone mode,
   * e.g. `import.meta.env.MODE === "standalone" ? "BrowserRouter" : null`.
   *
   * @default null (no fallback)
   */
  fallbackRouter?: "MemoryRouter" | "HashRouter" | "BrowserRouter" | null;
}) {
  const context = useContext(ReactComponentContext);
  // If an initial path is already present, add it here, to prevent flash-navigation triggered in SyncedRouterInner.
  const hist =
    context?.shared?.pathName !== undefined
      ? [context.shared?.pathName]
      : undefined;

  // If we don't have a context, we can't sync the routes with a parent component.
  // We assume that we are stand-alone and use a fallback router.
  if (!context) {
    // @ts-ignore
    if (import.meta.env?.MODE !== "standalone") {
      console.info("SyncedRouter: Falling back to ", fallbackRouter);
    }

    switch (fallbackRouter) {
      case "BrowserRouter":
        return <BrowserRouter>{children}</BrowserRouter>;
      case "HashRouter":
        return <HashRouter>{children}</HashRouter>;
      case "MemoryRouter":
        return <MemoryRouter>{children}</MemoryRouter>;
      default:
        throw new Error(
          "SyncedRouter initialized but no NG ComponentContext available. Use this router within an NgComponent or specify a fallbackRouter.",
        );
    }
  }

  return (
    <MemoryRouter useTransitions={false} initialEntries={hist}>
      <SyncedRouterInner>{children}</SyncedRouterInner>
    </MemoryRouter>
  );
}

function SyncedRouterInner({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const context = useContext(ReactComponentContext);
  if (context) {
    const { shared } = context;

    // Host -> React
    useEffect(() => {
      const disposeEffect = ngEffect(() => {
        if (shared.pathName) {
          navigate(shared.pathName);
        }
      });
      return () => disposeEffect();
    }, []);

    // React -> Host
    const firstRun = useRef(true);
    useEffect(() => {
      // Prevent sending un-initialized route to shell.
      if (firstRun.current) {
        firstRun.current = false;
        return;
      }
      shared.pathName = location.pathname;
    }, [location.pathname]);
  }

  return children;
}
