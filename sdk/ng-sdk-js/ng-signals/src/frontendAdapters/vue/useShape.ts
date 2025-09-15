import { createSignalObjectForShape } from "../../connector/createSignalObjectForShape.ts";
import type { Scope } from "../../types.ts";
import useDeepSignal from "./useDeepSignal.ts";
import { onBeforeUnmount } from "vue";
import type { OrmBase, ShapeType } from "@nextgraph-monorepo/ng-shex-orm";

export function useShape<T extends OrmBase>(
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
