import type { LdoBuilder } from "@ldo/ldo";
import type { LdoBase, LdoDataset, ShapeType } from "@ldo/ldo";
import { createTrackingProxyBuilder } from "@ldo/connected";
import { writable, type Readable } from "svelte/store";
import type { nodeEventListener } from "@ldo/subscribable-dataset";
import { onDestroy } from "svelte";

/**
 * @internal
 *
 * A hook for tracking proxies
 */
export function useTrackingProxy<Type extends LdoBase, ReturnType>(
  shapeType: ShapeType<Type>,
  createLdo: (builder: LdoBuilder<Type>) => ReturnType,
  dataset: LdoDataset,
): Readable<ReturnType> {
  const forceUpdateInfo: {
    set?: (item: ReturnType) => void;
    ldo?: ReturnType;
  } = {};

  const forceUpdate: nodeEventListener = () => {
    dataset.removeListenerFromAllEvents(forceUpdate);
    const builder = createTrackingProxyBuilder(dataset, shapeType, forceUpdate);
    const linkedDataObject = createLdo(builder);
    forceUpdateInfo.ldo = linkedDataObject;
    if (forceUpdateInfo.set && forceUpdateInfo.ldo)
      forceUpdateInfo.set(forceUpdateInfo.ldo);
  };
  forceUpdate({}, "", [undefined, undefined, undefined, undefined]);

  // The Svelte store
  const store = writable<ReturnType>(forceUpdateInfo.ldo, (set) => {
    forceUpdateInfo.set = set;

    return () => {
      dataset.removeListenerFromAllEvents(forceUpdate);
    };
  });

  onDestroy(() => {
    dataset.removeListenerFromAllEvents(forceUpdate);
  });

  return {
    subscribe: store.subscribe,
  };
}
