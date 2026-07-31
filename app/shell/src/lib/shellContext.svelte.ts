// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import { effect } from "@ng-org/alien-deepsignals";
import type { NgComponentContext, SharedObject } from "@ng-org/frontend";
import { ngComponentContextKey } from "@ng-org/frontend/svelte";
import { location } from "@svelte-router/core";
import { setContext } from "svelte";
import {
  handleComponentRouteChange,
  handleShellRouteChange,
} from "./componentRouteHandlers";

export const ROOT_COMPONENT_ID = "ROOT_COMPONENT_ID";

/** Store the current path names of the child components. */
const reactiveChildPayloads: Record<
  string,
  { payload: SharedObject; unregister: () => void }
> = {};

/**
 * Creates the initial context map for the shell.
 * It sets up the callbacks for (un)registering child components
 * and handling their routing.
 */
export function initShellContext() {
  const componentContext: NgComponentContext = {
    componentId: ROOT_COMPONENT_ID,
    parentCallbacks: { registerChild, unRegisterChild },
    shared: {},
    childComponentIds: new Set(),
  };

  // Handle location changes in the shell and pass them to the child micro apps.
  $effect(() => {
    handleShellRouteChange(reactiveChildPayloads);
  });

  setContext(ngComponentContextKey, componentContext);
}

const registerChild = (ids: string[], reactivePayload: SharedObject) => {
  const universeId = joinComponentId(ids);

  if (reactiveChildPayloads[universeId]) {
    throw new Error(`Component ${universeId} is already registered.`);
  }

  // Effect to handle path changes coming from the child.
  const unregisterEffect = effect(() => {
    handleComponentRouteChange(reactivePayload, universeId);
  });

  reactiveChildPayloads[universeId] = {
    payload: reactivePayload,
    unregister: unregisterEffect,
  };
};

const unRegisterChild = (id: string[]) => {
  const joinedId = joinComponentId(id);

  if (!reactiveChildPayloads[joinedId]) {
    throw new Error(
      `Component ${joinedId} could not unregister because it was not registered.`,
    );
  }

  reactiveChildPayloads[joinedId].unregister();

  // This is a hack to remove the universe from the url.
  // @ts-expect-error
  location.navigate(undefined, { hash: joinedId, replace: true });
  delete reactiveChildPayloads[joinedId];
  delete location.hashPaths[joinedId];
};

/** Concatenates chain of identifiers with `:` while ensuring it is alphanumerical and not the root component. */
const joinComponentId = (ids: string[]) => {
  if (ids.some((id) => id.match(/[^a-zA-Z0-9]/) || id === ROOT_COMPONENT_ID)) {
    throw new Error(
      `Component identifier detected which contains non-alphanumeric character or ${ROOT_COMPONENT_ID}'. Ids: [${ids}]`,
    );
  }
  return ids.join(":");
};
