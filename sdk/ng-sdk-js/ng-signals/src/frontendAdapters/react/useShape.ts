import type { OrmBase } from "@nextgraph-monorepo/ng-shex-orm";
import { watch } from "@nextgraph-monorepo/ng-alien-deepsignals";
import type { ShapeType } from "@nextgraph-monorepo/ng-shex-orm";
import { useEffect, useRef, useState } from "react";
import { createSignalObjectForShape } from "../../connector/createSignalObjectForShape.ts";
import type { Scope } from "../../types.ts";

const useShape = <T extends OrmBase>(
    shape: ShapeType<T>,
    scope: Scope = ""
) => {
    const shapeSignalRef = useRef<
        ReturnType<typeof createSignalObjectForShape<T>>
    >(createSignalObjectForShape(shape, scope));
    const [, setTick] = useState(0);

    useEffect(() => {
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
    }, []);

    if ("id" in shapeSignalRef.current.signalObject)
        return shapeSignalRef.current.signalObject;
    else return null;
};

export default useShape;
