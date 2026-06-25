// Copyright (c) 2026 Niko Bonnieure, Laurin Weger, NextGraph association
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import Parcel, { ParcelCompProps } from "single-spa-react/parcel";
import {
  ComponentFactoryParams,
  NgComponentProps,
  ParentCallbacks,
} from "../../utils/types.ts";
import { ReactComponentContext } from "@ng-org/frontend/react/context";
import { JSX, useContext, useEffect, useMemo, useState } from "react";
import { deepSignal } from "@ng-org/alien-deepsignals";
import { ParcelConfig } from "single-spa";

type ReactNgComponentProps = NgComponentProps & {
  /** Props specific to  single-spa-react/parcel */
  reactParcelProps?: ParcelCompProps;
  /** Component to show while the NgComponent is not loaded. E.g. a spinner. Default is empty. */
  loadingIndicator?: JSX.Element;
};

/**
 * React element to mount NG components.
 *
 * Note: You should assign a key to this element, to ensure proper unmounting.
 */
export default function NgComponent({
  componentId,
  initialPathName,
  component: componentFactory,
  props,
  reactParcelProps,
  loadingIndicator = <></>,
}: ReactNgComponentProps) {
  const componentContext = useContext(ReactComponentContext);
  if (!componentContext)
    throw new Error(
      "Mounting a component from React root without a component context. If this is intentional, set the ReactComponentContext.",
    );

  // Register child component in context to ensure it's not mounted twice.
  useEffect(() => {
    if (componentContext.childComponentIds.has(componentId)) {
      throw new Error(
        `The component with id ${componentId} is already mounted.`,
      );
    }
    componentContext.childComponentIds.add(componentId);

    return () => {
      componentContext.childComponentIds.delete(componentId);
    };
  }, []);

  // Create callbacks the new component can call to register and unregister children.
  const parentCallbacks: ParentCallbacks = {
    registerChild(ids, reactivePayload) {
      componentContext.parentCallbacks.registerChild(
        [componentId, ...ids],
        reactivePayload,
      );
    },
    unRegisterChild(ids) {
      componentContext.parentCallbacks.unRegisterChild([componentId, ...ids]);
    },
  };

  const componentFactoryParams: ComponentFactoryParams = useMemo(
    () => ({
      parentCallbacks,
      assignedId: componentId,
      shared: deepSignal({ pathName: initialPathName }),
    }),
    [],
  );

  // Register new component.
  useEffect(() => {
    componentContext.parentCallbacks.registerChild(
      [componentId],
      componentFactoryParams.shared,
    );
    return () =>
      componentContext.parentCallbacks.unRegisterChild([componentId]);
  });

  const [resolvedLifecycles, setResolvedLifecycles] = useState<
    ParcelConfig | undefined
  >(undefined);

  useEffect(() => {
    if (!componentFactory) return;

    Promise.try(async () => {
      let lifecycleHooks: any = await componentFactory;
      if (typeof lifecycleHooks === "function") {
        lifecycleHooks = await lifecycleHooks(componentFactoryParams);
      }
      if (typeof lifecycleHooks === "function") {
        lifecycleHooks = await lifecycleHooks(componentFactoryParams);
      }

      setResolvedLifecycles({
        name: componentId,
        ...lifecycleHooks,
      });
    });
  }, [componentId, componentFactory]);

  if (!resolvedLifecycles) return loadingIndicator;

  return (
    <Parcel {...props} {...reactParcelProps} config={resolvedLifecycles} />
  );
}
