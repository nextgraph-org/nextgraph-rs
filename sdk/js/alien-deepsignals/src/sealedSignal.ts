import { META_KEY, RAW_KEY } from "./deepSignal.ts";
import {
    nonMutatingArrayFnKeys,
    nonMutatingSetFnKeys,
} from "./iteratorHelpers.ts";
import { DeepSignal, ProxyMeta } from "./types.ts";

/**
 * Function to create a seal on a deep signal.
 *
 * The properties listed in `propertyNames` are not modifiable by the returned object.
 * This includes the property name at any level. If an object is sealed, all its properties
 * are as well.
 * If all props should be sealed, set `disallowedProps` to `[sealAllProps]`
 *
 * @param value The deep signal object to seal properties of.
 * @param disallowedProps The property names to seal. Nested properties are sealed as well. If an array, it's the path to a property.
 *
 * @example
 * ```ts
 * const myReactiveObject = deepSignal({
 *   modifiableRootProp: "value",
 *   sealedRootProp: "I'm sealed.",
 *   sealedEverywhere: "I'm sealed everywhere",
 *   sealedSet: new Set([1,2,3]),
 *   child: {
 *     modifiableChildProp: "I'm modifiable",
 *     sealedEverywhere: "I'm sealed everywhere",
 *     sealedChildProp: "I'm sealed."
 *     childChild: {childChildProp: "I'm sealed because childChild is."}
 * }});
 *
 * const sealedObj = createSeal([
 *   "sealedEverywhere",
 *   ["sealedRootProp"],
 *   ["child", "sealedChildProp"],
 *   ["child", "childChild"],
 * ]);
 *
 * // Allowed:
 * sealedObj.modifiableRootProp = "updated root prop";
 * sealedObj.child.modifiableChildProp = "updated child prop";
 * // Returns `true`.
 * sealedObj.sealedSet.has(2);
 *
 * // Throws "Cannot set value on sealed property".
 * sealedObj.sealedEverywhere = "illegal modification";
 * // Throws "Cannot set value on sealed property".
 * sealedObj.child.childChild.childChildProp = "illegal modification";
 *
 * // Throws "Sets of sealed deep signal objects only expose non-mutating functions".
 * sealedObj.sealedSet.add(4);
 * ```
 */
export function createSeal<T>(
    value: DeepSignal<T>,
    disallowedProps: ((string | symbol)[] | string | symbol)[]
): DeepSignal<T> {
    const deepSignalMeta: ProxyMeta = (value as any)?.[META_KEY];
    if (!deepSignalMeta) throw new Error("Value must be a deep signal object");

    if (deepSignalMeta.options.replaceProxiesInBranchOnChange) {
        // TODO: We could build a parallel structure to the one we use to orient ourselves with
        //  when it comes to listening to changes in the hierarchy. Currently, all references are replaced.
        //  we need to replace all references to sealed objects too. Just that here we store the metadata
        //  with the current proxy (because there might be more than one sealed version).
        //  we can tackle that problem by creating a WeakMap<proxy, meta>. Unused proxies are dropped.
        //  on replace, only new references are made.
        throw new Error(
            "replaceProxiesInBranchOnChange is currently not supported for seals."
        );
    }

    const sealedObject = new Proxy(value, sealedProxyHandlers);

    const disallowedMeta = [RAW_KEY, META_KEY];

    const sealMeta: SealMeta = {
        disallowed: [...disallowedProps, ...disallowedMeta],
        path: [],
        sealedObject: sealedObject,
    };

    deepSignalToSealMeta.set(value, sealMeta);

    return sealedObject;
}

type SealMeta = {
    path: (string | symbol)[];
    disallowed: ((string | symbol)[] | string | symbol)[];
    sealedObject: DeepSignal<any>;
};

const deepSignalToSealMeta: WeakMap<any, SealMeta> = new WeakMap();

/** Property symbol which indicates that all properties of a seal are read-only. */
export const sealAllProps = Symbol("Key to seal all properties");

/**
 * Checks is property `p` is sealed on `target` object.
 * Target must be a sealed object created with @see createSeal or a nested object thereof.
 */
const isPropSealed = (target: any, p: string | symbol): boolean => {
    const sealMeta = deepSignalToSealMeta.get(target);
    if (!sealMeta) {
        throw new Error("isPropSealed() was called on a non-seal object.");
    }

    // Get all props that are to be applied on any level (all that are not wrapped in array).
    const rootLevelDeny = new Set(
        sealMeta.disallowed.filter(
            (disallowed) => !Array.isArray(disallowed)
        ) as (string | symbol)[]
    );

    if (rootLevelDeny.has(p) || rootLevelDeny.has(sealAllProps)) {
        return true;
    }

    // // Not necessary, we guard for this when creating a new proxy for child in the get proxy handler.
    // if (sealMeta.path.some((prop) => rootLevelDeny.has(prop))) {
    //     return false;
    // }

    let candidates: (string | symbol)[][] = sealMeta.disallowed.filter((d) =>
        Array.isArray(d)
    );

    let i = 0;
    const newPath = [...sealMeta.path, p];
    let currentProp = newPath[0];
    do {
        const hasMatch = candidates.some(
            (c) => c.length === 1 && c[0] === currentProp
        );
        if (hasMatch) return true;

        // We can break early, if we are at the end of the path.
        if (i >= newPath.length - 1) break;

        // Traverse disallowed paths. If a path starts with currentProp, slice it away.
        // Otherwise, drop candidate.
        candidates = candidates
            .map((candidatePath) =>
                candidatePath.length > 1 && candidatePath[0] === currentProp
                    ? candidatePath.slice(1)
                    : undefined
            )
            .filter((v) => v) as (string | symbol)[][];

        i += 1;
        currentProp = newPath[i];
    } while (candidates.length > 0);

    return false;
};

const sealedProxyHandlers: Required<ProxyHandler<any>> = {
    apply(target, thisArg, argArray) {
        return Reflect.apply(target, thisArg, argArray);
    },
    construct(target, argArray, newTarget) {
        throw new Error(
            "construct() is not supported on sealed deep signal objects."
        );
    },
    defineProperty(target, property, attributes) {
        if (isPropSealed(target, property)) {
            throw new Error(
                `Cannot define property on sealed property ${property.toString()}`
            );
        }
        return Reflect.defineProperty(target, property, attributes);
    },
    deleteProperty(target, p) {
        if (isPropSealed(target, p)) {
            throw new Error(`Cannot delete sealed property ${p.toString()}.`);
        }
        return Reflect.deleteProperty(target, p);
    },
    get(target, p, receiver) {
        const shouldSeal = isPropSealed(target, p);

        // Do not return functions that can mutate arrays or sets.
        if (shouldSeal) {
            if (typeof target[RAW_KEY][p] === "function") {
                if (Array.isArray(target)) {
                    if (!nonMutatingArrayFnKeys.has(p)) {
                        throw new Error(
                            `Arrays of sealed deep signal objects only expose non-mutating functions. Requested was ${p.toString()}`
                        );
                    }
                } else if (target instanceof Set) {
                    if (!nonMutatingSetFnKeys.has(p)) {
                        throw new Error(
                            "Sets of sealed deep signal objects only expose non-mutating functions. Requested was ${p.toString()}"
                        );
                    }
                }
            }
        }

        const gottenValue = target[p];

        // Literal values and functions are returned.
        if (typeof gottenValue !== "object") {
            return gottenValue;
        }

        // Case: Nested objects: We wrap around a seal proxy.

        // Create or get sealed child object.
        const meta = deepSignalToSealMeta.get(target)!;

        let childMeta = deepSignalToSealMeta.get(gottenValue);
        if (!childMeta) {
            // Not sealed before. We create a new seal proxy.

            const sealedChild = new Proxy(gottenValue, sealedProxyHandlers);

            // Meta: Use same disallowed values but update path.
            // If whole object is sealed, we use [sealAllProps] though.
            childMeta = {
                disallowed: shouldSeal ? [sealAllProps] : meta.disallowed,
                path: [...meta.path, p],
                sealedObject: sealedChild,
            };

            deepSignalToSealMeta.set(gottenValue, childMeta);

            return sealedChild;
        } else {
            return childMeta.sealedObject;
        }
    },
    getPrototypeOf(target) {
        return null;
    },
    getOwnPropertyDescriptor(target, p) {
        const shouldSeal = isPropSealed(target, p);

        return {
            get: () => {
                sealedProxyHandlers.get(target, p, undefined);
            },
            configurable: false,
            enumerable: true,
            get value() {
                return sealedProxyHandlers.get(target, p, undefined);
            },
            get writable() {
                return !shouldSeal;
            },
            set(v) {
                if (shouldSeal) {
                    throw new Error("Cannot set value on sealed property");
                }
                sealedProxyHandlers.set(target, p, v, undefined);
            },
        };
    },
    has(target, p) {
        return Reflect.has(target, p);
    },

    isExtensible(target) {
        return true;
    },
    ownKeys(target) {
        return target.ownKeys?.();
    },
    preventExtensions(target) {
        throw new Error(
            "preventExtension() is not supported on sealed deep signal objects."
        );
    },
    set(target, p, newValue, receiver) {
        if (isPropSealed(target, p)) {
            throw new Error(
                `Cannot set value on sealed property ${p.toString()}`
            );
        }
        target[p] = newValue;
        return true;
    },
    setPrototypeOf(target, v) {
        throw new Error(
            "setPrototypeOf() is not supported on sealed deep signal objects."
        );
    },
};
