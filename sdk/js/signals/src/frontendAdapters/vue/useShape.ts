import { createSignalObjectForShape } from "../../connector/createSignalObjectForShape.js";
import type { Scope } from "../../types.js";
import useDeepSignal from "./useDeepSignal.js";
import { onBeforeUnmount } from "vue";
import type { BaseType, ShapeType } from "@ng-org/shex-orm";

export function useShape<T extends BaseType>(
    shape: ShapeType<T>,
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
