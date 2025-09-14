import type { LdoBuilder } from "@ldo/ldo";
import type { LdoBase, LdoDataset, ShapeType } from "@ldo/ldo";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createTrackingProxyBuilder } from "@ldo/connected";

/**
 * @internal
 *
 * A hook for tracking proxies
 */
export function useTrackingProxy<Type extends LdoBase, ReturnType>(
  shapeType: ShapeType<Type>,
  createLdo: (builder: LdoBuilder<Type>) => ReturnType,
  dataset: LdoDataset,
): ReturnType {
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  const forceUpdate = useCallback(
    () => setForceUpdateCounter((val) => val + 1),
    [],
  );

  // The main linked data object
  const linkedDataObject = useMemo(() => {
    // Remove all current subscriptions
    dataset.removeListenerFromAllEvents(forceUpdate);
    const builder = createTrackingProxyBuilder(dataset, shapeType, forceUpdate);
    return createLdo(builder);
  }, [shapeType, dataset, forceUpdateCounter, forceUpdate, createLdo]);

  useEffect(() => {
    // Unregister force update listener upon unmount
    return () => {
      dataset.removeListenerFromAllEvents(forceUpdate);
    };
  }, [shapeType]);

  return linkedDataObject;
}
