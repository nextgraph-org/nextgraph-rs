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
  import Parcel from "./Parcel.svelte";
  import { getContext, onDestroy, onMount, unmount, untrack } from "svelte";
  import type { SvelteComponent } from "svelte";
  import { ngComponentContextKey } from "./ngComponentContext.ts";
  import type {
    ComponentFactoryParams,
    NgComponentContext,
    NgComponentProps,
    ParentCallbacks,
  } from "../../utils/types.ts";
  import { deepSignal } from "@ng-org/alien-deepsignals";
  import type { SspaParcelConfigObject } from "@wjfe/single-spa-svelte";

  type SvelteComponentProps = NgComponentProps & {
    /** Component to show while the NgComponent is not loaded. E.g. a spinner. Default is none. */
    loadingIndicator?: SvelteComponent;
  };

  let {
    componentId: componentIdTracked,
    props,
    initialPathName,
    component: componentFactory,
    loadingIndicator,
  }: SvelteComponentProps = $props();
  // This will only capture the initial value of componentId. It must not be changed later on.
  const componentId = untrack(() => componentIdTracked);

  const componentContext = getContext<NgComponentContext | undefined>(
    ngComponentContextKey,
  );
  if (!componentContext) {
    throw new Error(
      "Mounting a component from Svelte without a component context. If this is intentional, set the SvelteComponentContext.",
    );
  }

  // Register child component in context to ensure it's not mounted twice.
  if (componentContext.childComponentIds.has(componentId)) {
    throw new Error(`The component with id ${componentId} is already mounted.`);
  }
  componentContext.childComponentIds.add(componentId);
  onDestroy(() => componentContext.childComponentIds.delete(componentId));

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
  const componentFactoryParams: ComponentFactoryParams = $derived({
    parentCallbacks,
    assignedId: componentId,
    initialPathName,
    shared: deepSignal({ pathName: initialPathName, foo: true }),
  });

  // Register new component.
  onMount(() => {
    componentContext.parentCallbacks.registerChild(
      [componentId],
      componentFactoryParams.shared,
    );
  });
  onDestroy(() =>
    componentContext.parentCallbacks.unRegisterChild([componentId]),
  );

  let lifecycles: SspaParcelConfigObject | undefined = $state(undefined);

  $effect.pre(() => {
    if (!componentFactory) return;

    Promise.try(async () => {
      let lifecycleHooks: any = await componentFactory;
      if (typeof lifecycleHooks === "function") {
        lifecycleHooks = await lifecycleHooks(componentFactoryParams);
      }
      if (typeof lifecycleHooks === "function") {
        lifecycleHooks = await lifecycleHooks(componentFactoryParams);
      }

      const res = {
        name: componentId,
        ...lifecycleHooks,
      };

      lifecycles = res;
    });
  });
</script>

{#if lifecycles}
  <Parcel
    sspa={{
      config: lifecycles,
    }}
    {...props}
  />
{:else}
  {loadingIndicator}
{/if}
