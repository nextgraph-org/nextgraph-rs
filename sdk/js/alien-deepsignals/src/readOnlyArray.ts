import { RAW_KEY } from "./deepSignal.ts";
import { nonMutatingArrayFnKeys } from "./iteratorHelpers.ts";
import { DeepSignal, ReadOnlyArray } from "./types.ts";

const readonlyArrayProxy: ProxyHandler<DeepSignal<any>> = {
    construct() {
        throw new Error(
            "construct() is not supported on sealed deep signal objects."
        );
    },
    defineProperty() {
        throw new Error(`Cannot modify readonly array.`);
    },
    deleteProperty() {
        throw new Error(`Cannot modify readonly array.`);
    },
    get(target, p: any) {
        // Do not return functions that can mutate arrays or sets.
        if (typeof target[RAW_KEY][p] === "function") {
            if (!nonMutatingArrayFnKeys.has(p)) {
                throw new Error(
                    `Readonly arrays do not expose non-mutating functions. Requested was ${p.toString()}`
                );
            }
        }

        return target[p];
    },

    set() {
        throw new Error(`Cannot modify readonly array.`);
    },
};

/**
 * Create a non-modifiable array from a normal array.
 * Everything is allowed except for adding, moving or removing elements.
 *
 * The returned proxy does not expose mutating functions like `push()` and will throw
 * if you try to `get` them.
 *
 * NOTE: It does not prevent modifications to its children.
 *
 */
export function readOnlyArray<T>(array: DeepSignal<T[]>): ReadOnlyArray<T> {
    return new Proxy(array, readonlyArrayProxy);
}
