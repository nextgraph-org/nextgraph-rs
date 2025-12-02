import type { BaseType } from "@ng-org/shex-orm";
import { watch } from "@ng-org/alien-deepsignals";
import type { ShapeType } from "@ng-org/shex-orm";
import { useEffect, useRef, useState } from "react";
import { createSignalObjectForShape } from "../../connector/createSignalObjectForShape.js";
import type { Scope } from "../../types.js";

const useShape = <T extends BaseType>(
    shape: ShapeType<T>,
    scope: Scope = ""
) => {
    const shapeSignalRef = useRef<ReturnType<
        typeof createSignalObjectForShape<T>
    > | null>(null);
    const [, setTick] = useState(0);

    useEffect(() => {
        shapeSignalRef.current = createSignalObjectForShape(shape, scope);
        const handle = shapeSignalRef.current;
        const deepSignalObj = handle.signalObject;

        const { stopListening } = watch(deepSignalObj, () => {
            // trigger a React re-render when the deep signal updates
            setTick((t) => t + 1);
        });

        // Ensure first render after initial data is applied
        handle.readyPromise?.then(() => setTick((t) => t + 1));

        return () => {
            stopListening();
            handle.stop();
        };
    }, [shape, scope]);

    return shapeSignalRef.current?.signalObject;
};

export default useShape;
