import { createSignalObjectForShape } from "../../connector/createSignalObjectForShape";
import type { Scope, Shape } from "../../types";
import useDeepSignal from "./useDeepSignal";
import { onBeforeUnmount } from "vue";
import type { CompactShapeType } from "@ldo/ldo/types/ShapeType";
import type { LdoCompactBase } from "@ldo/ldo";

export function useShape<T extends LdoCompactBase>(
  shape: CompactShapeType<T>,
  scope?: Scope
) {
  const handle = createSignalObjectForShape(shape, scope);

  // Cleanup
  onBeforeUnmount(() => {
    handle.stop();
  });

  const ref = useDeepSignal(handle.signalObject);

  return ref;
}

export default useShape;
