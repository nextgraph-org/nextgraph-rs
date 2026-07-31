// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import type { DeepSignal } from "@ng-org/alien-deepsignals";
import type { LifeCycles } from "single-spa";

export type ComponentFactoryParams = {
  parentCallbacks: ParentCallbacks;
  assignedId: string;
  shared: SharedObject;
};

/**
 * Reactive object with properties that both the component and shell can modify.
 */
export type SharedObject = DeepSignal<
  Record<string, any> & { pathName?: string }
>;

export type ComponentFactory = (params: ComponentFactoryParams) => LifeCycles;

export type NgComponentContext = {
  componentId: string;

  shared: SharedObject;

  parentCallbacks: ParentCallbacks;

  childComponentIds: Set<string>;
};

export interface NgComponentProps {
  /** The factory of the component to be mounted. */
  component:
    | ComponentFactory
    | Promise<ComponentFactory>
    | (() => ComponentFactory)
    | (() => Promise<ComponentFactory>)
    | undefined;

  /** The props to be passed to the component. They are reactive. */
  props?: Record<string, any>;
  /** The ID of this component. It is used for creating the name of svelte-router's universe.*/
  componentId: string;
  /** The initial path name for a routed component. */
  initialPathName?: string;
}

/** Callbacks to notify parents of events. */
export type ParentCallbacks = {
  registerChild(ids: string[], reactivePayload: SharedObject): void;
  unRegisterChild(ids: string[]): void;
};
