import type { LdoCompactBase } from "@ldo/ldo";
import { watch } from "ng-alien-deepsignals";
import type { CompactShapeType } from "@ldo/ldo";
import { useEffect, useRef, useState } from "react";
import { createSignalObjectForShape } from "../../connector/createSignalObjectForShape";
import type { Scope, Shape } from "../../types";

const useShape = <T extends LdoCompactBase>(
  shape: CompactShapeType<T>,
  scope: Scope = "",
) => {
  const shapeSignalRef = useRef<
    ReturnType<typeof createSignalObjectForShape<T>>
  >(createSignalObjectForShape(shape, scope));
  const [, setTick] = useState(0);

  useEffect(() => {
    const handle = shapeSignalRef.current;
    const deepSignalObj = handle.signalObject;
    const stopListening = watch(deepSignalObj, () => {
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
