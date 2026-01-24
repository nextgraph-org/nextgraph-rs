// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { computed, signal } from "./core";
import {
    DeepPatch,
    DeepPatchBatch,
    DeepPatchJITSubscriber,
    DeepPatchSubscriber,
    DeepSignal,
    DeepSignalOptions,
    ProxyMeta,
    RootState,
    SetMeta,
    SignalLike,
    WritableSignal,
} from "./types";
import {
    createIteratorWithHelpers,
    iteratorHelperKeys,
} from "./iteratorHelpers";

/** The current proxy object for the raw object (others might exist but are not the current / clean ones). */
const rawToProxy = new WeakMap<object, any>();
const rawToMeta = new WeakMap<object, ProxyMeta>();
// TODO: We can move them to the meta objects.
const propertiesToSignals = new WeakMap<object, Map<PropertyKey, SignalLike>>();
const iterableSignals = new WeakMap<
    object,
    ReturnType<typeof signal<number>>
>();
const ignored = new WeakSet<object>();

const rootStates = new Map<symbol, RootState>();
const pendingRoots = new Set<symbol>();
const supported = new Set([Object, Array, Set]);
const descriptor = Object.getOwnPropertyDescriptor;
let blankNodeCounter = 0;
let tmpIdCounter = 0;
const wellKnownSymbols = new Set<symbol>([
    Symbol.asyncDispose,
    Symbol.asyncIterator,
    Symbol.dispose,
    Symbol.hasInstance,
    Symbol.iterator,
    Symbol.isConcatSpreadable,
    Symbol.match,
    Symbol.matchAll,
    Symbol.metadata,
    Symbol.replace,
    Symbol.search,
    Symbol.species,
    Symbol.split,
    Symbol.toPrimitive,
    Symbol.toStringTag,
    Symbol.unscopables,
]);
const forcedSyntheticIds = new WeakMap<object, string>();

const META_KEY = "__meta__" as const;
const RAW_KEY = "__raw__" as const;
const DEFAULT_SYNTHETIC_ID_PROPERTY_NAME = "@id";

/** Returns `true` if `value` is an object, array or set and is not in `ignored`. */
function shouldProxy(value: any): value is object {
    return (
        !!value &&
        typeof value === "object" &&
        (supported.has(value.constructor) || value instanceof Set) &&
        !ignored.has(value)
    );
}

/**
 * Get or create the map in `proxySignals` for key `proxy`.
 */
function ensureSignalMap(rawObj: object): Map<PropertyKey, SignalLike> {
    if (!propertiesToSignals.has(rawObj))
        propertiesToSignals.set(rawObj, new Map());
    return propertiesToSignals.get(rawObj)!;
}

/**
 * Write a new value into a cached signal, creating it if needed.
 * Does nothing computed signals.
 */
function setSignalValue(
    signals: Map<PropertyKey, SignalLike>,
    key: PropertyKey,
    value: any
) {
    if (!signals.has(key)) {
        signals.set(key, signal(value));
        return;
    }
    const existing = signals.get(key)!;
    if (typeof (existing as WritableSignal).set === "function") {
        (existing as WritableSignal).set(value);
    }
}

/** Track mutations that affect object iteration order/length. */
function ensureIterableSignal(target: object) {
    if (!iterableSignals.has(target)) iterableSignals.set(target, signal(0));
    return iterableSignals.get(target)!;
}

/** Notify all iteration-based subscribers that the container changed shape. */
function touchIterable(target: object) {
    if (!iterableSignals.has(target)) return;
    const sig = iterableSignals.get(target)!;
    sig.set(sig() + 1);
}

/** True when the target has a getter defined for the provided key. */
function hasGetter(target: any, key: PropertyKey) {
    return typeof descriptor(target, key)?.get === "function";
}

/**
 * Ensure that `signals` has a computed signal for the property with `key` on target.
 * TODO: Why is this necessary?
 */
function ensureComputed(
    signals: Map<PropertyKey, SignalLike>,
    target: any,
    key: PropertyKey,
    receiver: any
) {
    if (!signals.has(key) && hasGetter(target, key)) {
        signals.set(
            key,
            computed(() => Reflect.get(target, key, receiver))
        );
    }
}

/** Escape JSON-pointer-like path segments so patches remain unambiguous. */
function escapePathSegment(segment: string): string {
    return segment
        .replace(/~/g, "~0")
        .replace(/\//g, "~1")
        .replace(/\|/g, "~2");
}

/** Filter out well-known symbols that should bypass reactivity. */
function isReactiveSymbol(key: PropertyKey): key is symbol {
    return typeof key === "symbol" && !wellKnownSymbols.has(key);
}

/**
 * Replaces the old proxy to a raw object with a new one.
 * Used so that we can indicate modifications along the path of a change by equality checks.
 */
function replaceProxy(meta: ProxyMeta) {
    if (!meta.parent || !meta.key) return;

    // Create a new proxy for this raw object -- frontend libs like react need this to recognize changes along this path.
    const handlers = meta.raw instanceof Set ? setHandlers : objectHandlers;
    const proxy = new Proxy(meta.raw, handlers);
    rawToProxy.set(meta.raw, proxy);
    const signal = propertiesToSignals.get(meta.parent.raw)?.get(meta.key);
    signal?.(proxy);
}

/**
 * Walk the metadata chain to build the patch path for a property access.
 * Handles numbers, symbols (using description) and synthetic ID markers.
 */
function buildPath(
    meta: ProxyMeta | undefined,
    key: string | number | symbol,
    skipEscape = false
) {
    const path: (string | number)[] = [];
    const format = (segment: string | number | symbol): string | number => {
        if (typeof segment === "symbol") {
            return segment.description ?? segment.toString();
        }
        return segment;
    };
    const push = (segment: string | number | symbol, synthetic = false) => {
        if (typeof segment === "number") {
            path.unshift(segment);
            return;
        }
        const normalized = format(segment);
        path.unshift(
            synthetic || skipEscape
                ? normalized
                : escapePathSegment(String(normalized))
        );
    };

    push(key, skipEscape);
    let cursor = meta;
    while (cursor && cursor.parent && cursor.key !== undefined) {
        push(cursor.key, !!cursor.isSyntheticId);

        replaceProxy(cursor);

        cursor = cursor.parent;
    }
    return path;
}

/** Resolve the path for a container itself (without the child key appended). */
function resolveContainerPath(meta: ProxyMeta | undefined) {
    if (!meta || !meta.parent || meta.key === undefined) return [];
    replaceProxy(meta);
    return buildPath(meta.parent, meta.key, !!meta.isSyntheticId);
}

/**
 * Build and enqueue patches for a mutation, only if listeners exist on the root.
 */
function schedulePatch(
    meta: ProxyMeta | undefined,
    build: () => DeepPatch | DeepPatch[] | undefined
) {
    if (!meta) return;
    const state = rootStates.get(meta.root);
    const hasListeners =
        state &&
        (state.listeners.size > 0 || state.justInTimeListeners.size > 0);
    if (!hasListeners) return;

    const result = build();
    if (!result) return;
    const patches = Array.isArray(result) ? result : [result];
    if (!patches.length) return;

    state.pendingPatches.push(...patches);

    // Notify justInTimeListeners immediately (without version, since batch hasn't finalized).
    state.justInTimeListeners.forEach((cb) => cb({ patches }));

    // Schedule a microtask flush for batched listeners if it hasn't been from previous calls.
    if (state.listeners.size > 0 && !pendingRoots.has(meta.root)) {
        pendingRoots.add(meta.root);

        queueMicrotask(() => {
            pendingRoots.delete(meta.root);
            const state = rootStates.get(meta.root);
            if (!state) return;
            if (!state.pendingPatches.length || state.listeners.size === 0) {
                state.pendingPatches.length = 0;
                return;
            }
            state.version += 1;
            const batch: DeepPatchBatch = {
                version: state.version,
                patches: state.pendingPatches.slice(),
            };
            state.pendingPatches.length = 0;
            state.listeners.forEach((cb) => cb(batch));
        });
    }
}

/**
 * Apply the user-provided propGenerator result, injecting synthetic IDs and extra props.
 */
function applyPropGeneratorResult(
    meta: ProxyMeta,
    value: any,
    basePath: (string | number)[],
    inSet: boolean
) {
    if (
        !value ||
        typeof value !== "object" ||
        value.constructor !== Object ||
        !meta.options?.propGenerator
    ) {
        return;
    }
    const result = meta.options.propGenerator({
        path: basePath,
        inSet,
        object: value,
    });
    if (result.extraProps) {
        Object.entries(result.extraProps).forEach(([k, v]) => {
            value[k] = v;
        });
    }
    if (
        result.syntheticId !== undefined &&
        meta.options.syntheticIdPropertyName &&
        !(meta.options.syntheticIdPropertyName in value)
    ) {
        Object.defineProperty(value, meta.options.syntheticIdPropertyName, {
            value: result.syntheticId,
            enumerable: true,
            configurable: false,
            writable: false,
        });
    }
}

/** Recursively add synthetic IDs/extra props from prop generator. */
function initializeObjectTree(
    meta: ProxyMeta,
    value: any,
    basePath: (string | number)[],
    inSet: boolean
) {
    if (!meta.options?.propGenerator) return;
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
        value.forEach((entry, idx) => {
            if (entry && typeof entry === "object") {
                initializeObjectTree(meta, entry, [...basePath, idx], false);
            }
        });
        return;
    }
    if (value instanceof Set) {
        for (const entry of value) {
            if (entry && typeof entry === "object") {
                const synthetic = assignSyntheticId(
                    meta,
                    entry,
                    basePath,
                    true
                );
                initializeObjectTree(
                    meta,
                    entry,
                    [...basePath, synthetic],
                    true
                );
            }
        }
        return;
    }
    if (value.constructor !== Object) return;

    applyPropGeneratorResult(meta, value, basePath, inSet);

    Object.keys(value).forEach((childKey) => {
        if (childKey === meta.options.syntheticIdPropertyName) return;
        const child = value[childKey];
        if (child && typeof child === "object") {
            initializeObjectTree(meta, child, [...basePath, childKey], false);
        }
    });
}

/** Apply prop generator side-effects only when the root has no live subscribers. */
function initializeObjectTreeIfNoListeners(
    meta: ProxyMeta | undefined,
    basePath: (string | number)[] | undefined,
    value: any,
    inSet: boolean
) {
    if (!meta || !meta.options?.propGenerator) return;
    if (!value || typeof value !== "object") return;
    const state = rootStates.get(meta.root);
    if (
        state &&
        (state.listeners.size > 0 || state.justInTimeListeners.size > 0)
    )
        return;
    initializeObjectTree(meta, value, basePath ?? [], inSet);
}

/**
 * Return (or create) a proxy for a nested value.
 * Ensures the linkage between parent and child in metadata.
 * Does not proxy and returns `value` if @see shouldProxy returns false.
 * Returns value if parent has no metadata record.
 */
function ensureChildProxy<T>(
    rawChild: T,
    parent: any,
    key: PropertyKey,
    isSyntheticId = false
): DeepSignal<T> | T {
    if (!shouldProxy(rawChild)) return rawChild;

    const parentRaw = parent[RAW_KEY] || parent;
    const parentMeta = rawToMeta?.get(parentRaw);

    if (rawToProxy.has(rawChild)) {
        const proxied = rawToProxy.get(rawChild);
        const proxiedMeta = rawToMeta.get(rawChild);
        if (proxiedMeta) {
            proxiedMeta.parent = parentMeta;
            proxiedMeta.key = key;
            proxiedMeta.isSyntheticId = isSyntheticId;
        }
        return proxied;
    }

    if (!parentMeta) return rawChild;

    // Create proxy if none exists yet.
    const proxy = createProxy(
        rawChild,
        parentMeta.root,
        parentMeta.options,
        parentMeta,
        key,
        isSyntheticId
    );
    return proxy as DeepSignal<T>;
}

/**
 * Sets `idForObject: new WeakMap(), objectForId: new Map()`
 * to `meta.setInfo` if it does not exist yet.
 */
function ensureSetInfo(meta: ProxyMeta): SetMeta {
    if (!meta.setInfo) {
        meta.setInfo = {
            idForObject: new WeakMap(),
            objectForId: new Map(),
        };
    }
    return meta.setInfo;
}

/**
 * Assign (or reuse) a synthetic identifier for a Set entry, respecting user options:
 * - Use user-provided propGenerator for synthetic ids and add add returned extra properties
 * - Check if the object has a property of `syntheticIdPropertyName` (default `@id`)
 * - Use a blank node id as a fallback.
 * - Add object and id to `idForObject` and `objectForId` maps.
 */
function assignSyntheticId(
    meta: ProxyMeta,
    entry: any,
    path: (string | number)[],
    inSet: boolean
) {
    const rawEntry: any = entry?.[RAW_KEY] ?? entry;
    if (!rawEntry || typeof rawEntry !== "object") {
        return rawEntry as string | number;
    }

    const info = ensureSetInfo(meta);
    if (info.idForObject.has(rawEntry)) return info.idForObject.get(rawEntry)!;

    let synthetic: string | number | undefined =
        forcedSyntheticIds.get(rawEntry);

    const generatorValue = meta.options?.propGenerator?.({
        path,
        inSet,
        object: rawEntry,
    });

    // If the propGenerator returned a syntheticId, use it.
    if (synthetic === undefined && generatorValue?.syntheticId !== undefined) {
        synthetic = generatorValue.syntheticId;
    }

    // Add extra props from propGenerator (if present).
    if (
        generatorValue?.extraProps &&
        rawEntry &&
        typeof rawEntry === "object"
    ) {
        Object.entries(generatorValue.extraProps).forEach(([k, v]) => {
            rawEntry[k] = v;
        });
    }

    const idPropName = meta.options?.syntheticIdPropertyName;
    // If synthetic id is still undefined, try to get it
    // from `syntheticIdPropertyName` (default `@id` property).
    if (
        synthetic === undefined &&
        idPropName &&
        rawEntry &&
        typeof rawEntry === "object" &&
        rawEntry[idPropName] !== undefined
    ) {
        synthetic = rawEntry[idPropName];
    }

    // If `synthetic` still undefined, add a blank node id.
    if (synthetic === undefined) {
        synthetic = `_s${++blankNodeCounter}`;
    }

    const idString = String(synthetic);

    // Add mappings for `id -> object` and `object -> id`.
    info.idForObject.set(rawEntry, idString);
    info.objectForId.set(idString, rawEntry);

    // Add synthetic id to `idPropertyName` property (default `@id`)
    // if not set.
    if (
        idPropName &&
        rawEntry &&
        typeof rawEntry === "object" &&
        !(idPropName in rawEntry)
    ) {
        Object.defineProperty(rawEntry, idPropName, {
            value: idString,
            enumerable: true,
            configurable: false,
            writable: false,
        });
    }

    return idString;
}

/** Create the appropriate proxy (object vs Set) and track its metadata. */
function createProxy<T extends object>(
    target: object,
    root: symbol,
    options: DeepSignalOptions,
    parentMeta?: ProxyMeta,
    key?: PropertyKey,
    isSyntheticId?: boolean
): DeepSignal<T> {
    const handlers = target instanceof Set ? setHandlers : objectHandlers;
    const proxy = new Proxy(target, handlers);
    const meta: ProxyMeta = {
        raw: target,
        parent: parentMeta,
        key,
        isSyntheticId,
        root,
        options,
    };

    propertiesToSignals.set(target, new Map());
    rawToMeta.set(target, meta);
    rawToProxy.set(target, proxy);

    return proxy as DeepSignal<T>;
}

/** Return primitive literals (string/number/boolean) for patch serialization. */
function snapshotLiteral(value: any) {
    if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return value;
    }
    return undefined;
}

/**
 * Emit a recursive patch sequence for a whole object, array, or set
 * that was added to the deepSignal object.
 *
 */
function emitPatchesForNew(
    value: any,
    meta: ProxyMeta,
    basePath: (string | number)[],
    inSet = false
): DeepPatch[] {
    applyPropGeneratorResult(meta, value, basePath, inSet);
    if (value === null || value === undefined || typeof value !== "object") {
        const literal = snapshotLiteral(value);
        if (literal === undefined) return [];
        return [
            {
                path: basePath,
                op: "add",
                value: literal,
            },
        ];
    }
    const patches: DeepPatch[] = [
        {
            path: basePath,
            op: "add",
            value: value instanceof Set || Array.isArray(value) ? [] : {},
            type: value instanceof Set ? "set" : undefined,
        },
    ];

    // The id property name, usually `@id`
    const idPropName = meta.options.syntheticIdPropertyName!;

    if (idPropName in value) {
        const literal = snapshotLiteral(value[idPropName]);
        if (literal !== undefined) {
            patches.push({
                path: [...basePath, idPropName],
                op: "add",
                value: literal,
            });
        }
    }

    // For array, recurse
    if (Array.isArray(value)) {
        value.forEach((entry, idx) => {
            patches.push(...emitPatchesForNew(entry, meta, [...basePath, idx]));
        });
    } else if (value instanceof Set) {
        const setMeta = ensureSetInfo(meta);
        for (const entry of value) {
            if (entry && typeof entry === "object") {
                const synthetic = assignSyntheticId(
                    meta,
                    entry,
                    basePath,
                    true
                );
                setMeta.objectForId.set(String(synthetic), entry);
                patches.push(
                    ...emitPatchesForNew(
                        entry,
                        meta,
                        [...basePath, synthetic],
                        true
                    )
                );
            } else {
                const literal = snapshotLiteral(entry);
                if (literal !== undefined) {
                    patches.push({
                        path: basePath,
                        op: "add",
                        type: "set",
                        value: [literal],
                    });
                }
            }
        }
    } else {
        Object.keys(value).forEach((childKey) => {
            if (childKey === idPropName) return;
            patches.push(
                ...emitPatchesForNew(value[childKey], meta, [
                    ...basePath,
                    childKey,
                ])
            );
        });
    }
    return patches;
}

/**
 * Refresh numeric index signals for an array target so reads return current items
 * and dependent effects are notified. Recreates/proxies values for indices < length
 * and clears signals for indices >= length.
 */
function refreshNumericIndexSignals(target: any[], receiver: any) {
    const sigs = propertiesToSignals.get(target);
    if (!sigs) return;

    for (const k of Array.from(sigs.keys())) {
        if (typeof k === "string" && /^\d+$/.test(k)) {
            const idx = Number(k);
            if (idx >= target.length) {
                const existing = sigs.get(k);
                if (
                    existing &&
                    typeof (existing as WritableSignal).set === "function"
                ) {
                    (existing as WritableSignal).set(undefined);
                }
                sigs.delete(k);
            } else {
                const val = target[idx];
                const proxied = ensureChildProxy(val, receiver, idx);
                setSignalValue(sigs, k, proxied);
            }
        }
    }
}

let hasWarnedAboutMissingSupportForReverse = false;
let hasWarnedAboutMissingSupportForSort = false;
/** Returns proxy function for array-mutating functions. */
const getArrayMutationProxy = (target: any[], key: any, receiver: any[]) => {
    const meta = rawToMeta.get(target);

    if (key === "reverse") {
        if (!hasWarnedAboutMissingSupportForReverse) {
            console.warn(
                ".reverse() was called on deepSignal array. In place modifications with .sort() and .reverse() are not supported. `toReversed` will be called instead."
            );
            hasWarnedAboutMissingSupportForReverse = true;
        }
        return target.toReversed;
    } else if (key === "sort") {
        if (!hasWarnedAboutMissingSupportForSort) {
            console.warn(
                ".sort() was called on deepSignal array. In place modifications with .sort() and .reverse() are not supported. `toSorted` will be called instead."
            );
            hasWarnedAboutMissingSupportForSort = true;
        }
        return target.toSorted;
    } else if (key === "shift") {
        return () => {
            target.shift();

            schedulePatch(meta, () => ({
                op: "remove",
                path: buildPath(meta, "0"),
            }));

            // Update length of proxy explicitly.
            receiver.length = target.length;

            // Refresh numeric index signals so shifted indices don't return stale values.
            refreshNumericIndexSignals(target, receiver);
        };
    } else if (key === "splice") {
        return (start: number, deleteCount: number, ...items: any[]) => {
            // Call splice on (non-proxied) target.
            const deletedItems = target.splice(start, deleteCount, ...items);

            console.log(target, key, receiver, start, deleteCount, items);

            // Manually schedule patches.
            schedulePatch(meta, () => {
                const patches: DeepPatch[] = [];
                // All items can be deleted at the same path / index.
                for (let i = 0; i < deleteCount; i++) {
                    patches.push({
                        op: "remove",
                        path: buildPath(meta, String(start)),
                    });
                }
                // All items can be inserted at same path / index, by adding items in reverse order.
                for (const newItem of items.toReversed()) {
                    patches.push({
                        op: "add",
                        path: buildPath(meta, String(start)),
                        value: newItem,
                    });
                }

                return patches;
            });

            // Ensure newly added items are proxied.
            for (let i = 0; i < items.length; i++) {
                ensureChildProxy(items[i], target, start + i);
            }

            // Refresh numeric index signals so shifted indices don't return stale values.
            refreshNumericIndexSignals(target, receiver);

            // Update length of proxy explicitly.
            receiver.length = target.length;

            return deletedItems;
        };
    } else if (key === "unshift") {
        return (...items: any[]) => {
            const deletedItems = target.unshift(...items);

            schedulePatch(meta, () => {
                const patches: DeepPatch[] = [];

                // All items can be inserted at index 0, by adding items in reverse order.
                for (const newItem of items.toReversed()) {
                    patches.push({
                        op: "add",
                        path: buildPath(meta, "0"),
                        value: newItem,
                    });
                }

                return patches;
            });

            // Ensure newly added items are proxied.
            for (let i = 0; i < items.length; i++) {
                ensureChildProxy(items[i], target, i);
            }
            // Update length of proxy explicitly.
            receiver.length = target.length;

            // Refresh numeric index signals so shifted indices don't return stale values.
            refreshNumericIndexSignals(target, receiver);

            return deletedItems;
        };
    }
};

/** Proxy handler driving reactivity for plain objects and arrays. */
const objectHandlers: ProxyHandler<any> = {
    get(target, key, receiver) {
        // Handle meta keys
        if (key === RAW_KEY) return target;
        if (key === META_KEY) return rawToMeta.get(target);

        // TODO: Why are we doing this?
        if (typeof key === "symbol") {
            if (key === Symbol.iterator) {
                const iterableSig = ensureIterableSignal(target);
                iterableSig();
            }
            if (!isReactiveSymbol(key))
                return Reflect.get(target, key, receiver);
        }

        // Array helper handling. We need that because otherwise, every array position change would go as a separate operation through the proxy.
        // Thus, we need to schedule the patches manually for mutating array functions.
        if (Array.isArray(target)) {
            const mutationProxy = getArrayMutationProxy(target, key, receiver);
            if (mutationProxy) {
                return mutationProxy;
            }
        }

        // Get object map from key to signal.
        const signals = ensureSignalMap(target);

        // Ensure that target object is signal.
        ensureComputed(signals, target, key, receiver);

        // Add signal if it does not exist already and did not have a getter.
        if (!signals.has(key)) {
            let rawChild = Reflect.get(target, key, receiver);

            if (typeof rawChild === "function")
                return rawChild.bind(receiver ?? target);

            const childProxyOrRaw = ensureChildProxy(rawChild, receiver, key);

            signals.set(key, signal(childProxyOrRaw));
        }

        // Call and return signal
        const sig = signals.get(key)!;
        return sig();
    },

    set(target, key, value, receiver) {
        // Skip reactivity for symbols.
        if (typeof key === "symbol" && !isReactiveSymbol(key))
            return Reflect.set(target, key, value, receiver);

        const meta = rawToMeta.get(target);
        if (meta?.options?.readOnlyProps?.includes(String(key))) {
            throw new Error(`Cannot modify readonly property '${String(key)}'`);
        }

        const path = meta ? buildPath(meta, key) : undefined;
        const desc = descriptor(target, key);
        const hasAccessor =
            !!desc &&
            (typeof desc.get === "function" || typeof desc.set === "function");

        const proxied = ensureChildProxy(value, target, key);
        const rawValue = value?.[RAW_KEY] ?? value;

        const hadKey = Object.prototype.hasOwnProperty.call(target, key);

        const shouldManuallyTrimLength =
            Array.isArray(target) && key === "length" && value < target.length;

        // If `length` is used to reduce the size of the array, delete the overflowing slots
        // manually so that existing delete reactivity emits the patches and clears signals.
        if (shouldManuallyTrimLength) {
            for (let i = target.length - 1; i >= value; i -= 1) {
                delete receiver[i];
            }
        }

        // === Set value on actual target ===
        const result = Reflect.set(target, key, rawValue, receiver);

        if (!hasAccessor) {
            const signals = ensureSignalMap(target);
            setSignalValue(signals, key, proxied);
        }
        if (!hadKey) touchIterable(target);
        if (meta && path && typeof rawValue === "object") {
            initializeObjectTreeIfNoListeners(meta, path, rawValue, false);
        }

        // Modifications to the length should not emit patches
        if (Array.isArray(target) && key === "length") {
            return result;
        }

        schedulePatch(meta, () => {
            const resolvedPath = path ?? buildPath(meta, key);
            if (!hadKey || typeof rawValue === "object") {
                const patches = emitPatchesForNew(
                    rawValue,
                    meta!,
                    resolvedPath
                );

                // TODO: Document
                // If an object is added to an array (this happens in discrete CRDTs), we will eventually receive an @id back.
                // However, the @id is not available from the beginning but frontend frameworks might depend on @id.
                // Thus, we set a temporary @id which will be replaced once we are called back with the real @id.
                // Also, we don't emit a patch for this.
                if (
                    Array.isArray(target) &&
                    !isNaN(Number(key)) &&
                    value &&
                    typeof value === "object" &&
                    meta?.options.syntheticIdPropertyName !== "@id"
                ) {
                    rawValue["@id"] = `tmp-${++tmpIdCounter}`;
                }

                return patches;
            }
            if (snapshotLiteral(rawValue) === undefined) return undefined;
            return {
                path: resolvedPath,
                op: "add",
                value: rawValue,
            };
        });

        return result;
    },
    deleteProperty(target, key) {
        if (typeof key === "symbol" && !isReactiveSymbol(key))
            return Reflect.deleteProperty(target, key);

        const meta = rawToMeta.get(target);

        const hadKey = Object.prototype.hasOwnProperty.call(target, key);
        const result = Reflect.deleteProperty(target, key);
        if (hadKey) {
            if (propertiesToSignals.has(target)) {
                // Trigger signal
                const signals = propertiesToSignals.get(target)!;
                const existing = signals.get(key);
                if (
                    existing &&
                    typeof (existing as WritableSignal).set === "function"
                ) {
                    (existing as WritableSignal).set(undefined);
                }
                signals.delete(key);
            }
            // Notify listeners
            touchIterable(target);
            schedulePatch(meta, () => ({
                path: buildPath(meta, key),
                op: "remove",
            }));
        }
        return result;
    },
    ownKeys(target) {
        const sig = ensureIterableSignal(target);
        sig();
        return Reflect.ownKeys(target);
    },
};

/**
 * Guarantee Set iteration always surfaces proxies, even when raw values were stored.
 */
function ensureEntryProxy(
    raw: any,
    entry: any,
    syntheticKey: string | number,
    meta: ProxyMeta
) {
    return shouldProxy(entry)
        ? ensureChildProxy(entry, raw, syntheticKey, true)
        : entry;
}

/** Wrap the underlying Set iterator so each value is proxied before leaving the trap. */
function createSetIterator(
    target: Set<any>,
    receiver: any,
    mapValue: (value: any) => any
) {
    const iterator = target.values();
    const iterableSignal = ensureIterableSignal(target);
    iterableSignal();
    return createIteratorWithHelpers(() => {
        const next = iterator.next();
        if (next.done) return next;
        const meta = rawToMeta.get(target)!;
        const proxied = ensureEntryProxy(
            target,
            next.value,
            assignSyntheticId(meta, next.value, [], true),
            meta
        );
        return {
            value: mapValue(proxied),
            done: false,
        };
    });
}

/** Proxy handler providing deep-signal semantics for native Set instances. */
const setHandlers: ProxyHandler<Set<any>> = {
    get(target, key, receiver) {
        const meta = rawToMeta.get(target);

        if (key === RAW_KEY) return target;
        if (key === META_KEY) return meta;
        if (key === "size") {
            const sig = ensureIterableSignal(target);
            sig();
            return target.size;
        }
        if (key === "first") {
            return function first() {
                const iterableSig = ensureIterableSignal(target);
                iterableSig();
                const iterator = target.values().next();
                if (iterator.done) return undefined;

                return ensureEntryProxy(
                    target,
                    iterator.value,
                    assignSyntheticId(meta!, iterator.value, [], true),
                    meta!
                );
            };
        }
        if (key === "getById") {
            return function getById(this: any, id: string | number) {
                const iterableSig = ensureIterableSignal(target);
                iterableSig();
                if (!meta?.setInfo) return undefined;
                const entry = meta.setInfo.objectForId.get(String(id));
                if (!entry) return undefined;
                return ensureEntryProxy(target, entry, String(id), meta);
            };
        }
        if (key === "getBy") {
            return function getBy(
                this: any,
                graphIri: string,
                subjectIri: string
            ) {
                const iterableSig = ensureIterableSignal(target);
                iterableSig();
                return (this as any).getById(`${graphIri}|${subjectIri}`);
            };
        }
        if (key === "add") {
            return function add(this: any, value: any) {
                const containerPath = resolveContainerPath(meta);

                const rawValue = value[RAW_KEY] ?? value;
                const sizeBefore = target.size;
                const result = target.add(rawValue);
                if (target.size !== sizeBefore) {
                    touchIterable(target);
                    if (rawValue && typeof rawValue === "object") {
                        const synthetic = assignSyntheticId(
                            meta!,
                            rawValue,
                            containerPath,
                            true
                        );
                        initializeObjectTreeIfNoListeners(
                            meta,
                            [...containerPath, synthetic],
                            rawValue,
                            true
                        );
                        ensureEntryProxy(target, rawValue, synthetic, meta!);
                        schedulePatch(meta, () =>
                            emitPatchesForNew(
                                rawValue,
                                meta!,
                                [...containerPath, synthetic],
                                true
                            )
                        );
                    } else {
                        const literal = snapshotLiteral(rawValue);
                        if (literal !== undefined) {
                            schedulePatch(meta, () => ({
                                path: containerPath,
                                op: "add",
                                type: "set",
                                value: [literal],
                            }));
                        }
                    }
                }
                return receiver;
            };
        }
        if (key === "delete") {
            return function deleteEntry(this: any, value: any) {
                const containerPath = resolveContainerPath(meta);
                const rawValue = value?.[RAW_KEY] ?? value;
                const synthetic =
                    rawValue && typeof rawValue === "object"
                        ? ensureSetInfo(meta!).idForObject.get(rawValue)
                        : rawValue;
                const existed = target.delete(rawValue);
                if (existed && synthetic !== undefined) {
                    touchIterable(target);
                    if (rawValue && typeof rawValue === "object") {
                        schedulePatch(meta, () => ({
                            path: [...containerPath, synthetic as string],
                            op: "remove",
                        }));
                        if (meta!.setInfo) {
                            meta!.setInfo.objectForId.delete(String(synthetic));
                            meta!.setInfo.idForObject.delete(rawValue);
                        }
                    } else {
                        schedulePatch(meta, () => ({
                            path: containerPath,
                            op: "remove",
                            type: "set",
                            value: rawValue,
                        }));
                    }
                }
                return existed;
            };
        }
        if (key === "clear") {
            return function clear(this: any) {
                const containerPath = resolveContainerPath(meta);
                if (meta!.setInfo) {
                    meta!.setInfo.objectForId.clear();
                    meta!.setInfo.idForObject = new WeakMap();
                }
                target.clear();
                touchIterable(target);
                schedulePatch(meta, () => ({
                    path: containerPath,
                    op: "add",
                    type: "set",
                    value: [],
                }));
            };
        }
        if (key === Symbol.iterator) {
            return function iterator(this: any) {
                return createSetIterator(target, receiver, (value) => value);
            };
        }
        if (key === "values" || key === "keys") {
            return function values(this: any) {
                return createSetIterator(target, receiver, (value) => value);
            };
        }
        if (key === "entries") {
            return function entries(this: any) {
                return createSetIterator(target, receiver, (value) => [
                    value,
                    value,
                ]);
            };
        }
        if (typeof key === "string" && iteratorHelperKeys.has(key)) {
            return function iteratorHelper(this: any, ...args: any[]) {
                const iterator = createSetIterator(
                    target,
                    receiver,
                    (value) => value
                );
                const helper = (iterator as any)[key];
                if (typeof helper !== "function") {
                    throw new TypeError(
                        `Iterator helper '${String(key)}' is not available`
                    );
                }
                return helper.apply(iterator, args);
            };
        }
        if (key === "forEach") {
            return function forEach(
                this: any,
                callback: (value: any, value2: any, set: Set<any>) => void,
                thisArg?: any
            ) {
                const iterableSig = ensureIterableSignal(target);
                iterableSig();
                let index = 0;
                const expectsIteratorSignature = callback.length <= 2;
                const iteratorCallback = callback as unknown as (
                    value: any,
                    index: number
                ) => void;
                target.forEach((entry) => {
                    const proxied = ensureEntryProxy(
                        target,
                        entry,
                        assignSyntheticId(meta!, entry, [], true),
                        meta!
                    );
                    if (expectsIteratorSignature) {
                        iteratorCallback.call(thisArg, proxied, index++);
                    } else {
                        callback.call(thisArg, proxied, proxied, receiver);
                    }
                });
            };
        }
        if (key === "has") {
            return function has(this: any, value: any) {
                return target.has(value?.[RAW_KEY] ?? value);
            };
        }
        return Reflect.get(target, key, receiver);
    },
};

/** Runtime guard that checks whether a value is a deepSignal proxy. */
export function isDeepSignal(value: any): boolean {
    return !!value?.[RAW_KEY];
}

/**
 * Create a deep reactive proxy for objects, arrays or Sets.
 * Returns the input itself, if it's a deepSignal already.
 * Throws if provided with unsupported input types.
 */
export function deepSignal<T extends object>(
    input: T,
    options?: DeepSignalOptions
): DeepSignal<T> {
    if (isDeepSignal(input)) return input as DeepSignal<T>;

    if (!shouldProxy(input))
        throw new Error("deepSignal() expects an object, array, or Set");

    if (rawToProxy.has(input)) return rawToProxy.get(input);

    const root = Symbol("deepSignalRoot");
    const rootState = {
        options: {
            syntheticIdPropertyName: DEFAULT_SYNTHETIC_ID_PROPERTY_NAME,
            ...options,
        },
        version: 0,
        listeners: new Set<DeepPatchSubscriber>(),
        justInTimeListeners: new Set<DeepPatchJITSubscriber>(),
        pendingPatches: [],
    } satisfies RootState;

    rootStates.set(root, rootState);

    const proxy = createProxy(input, root, rootState.options);
    return proxy as DeepSignal<T>;
}

/**
 * Low-level function, you should probably use `watch` instead.
 *
 * Register a deep mutation subscriber for the provided root or proxy.
 */
export function subscribeDeepMutations(
    root: object | symbol,
    cb: DeepPatchSubscriber | DeepPatchJITSubscriber,
    triggerInstantly: boolean = false
): () => void {
    const rootId = typeof root === "symbol" ? root : getDeepSignalRootId(root);
    if (!rootId)
        throw new Error("subscribeDeepMutations() expects a deepSignal root");

    const state = rootStates.get(rootId);
    if (!state) throw new Error("Unknown deepSignal root");

    // Add to listeners / justInTimeListeners.
    if (triggerInstantly) {
        state.justInTimeListeners.add(cb as DeepPatchJITSubscriber);
        return () => {
            state.justInTimeListeners.delete(cb as DeepPatchJITSubscriber);
        };
    } else {
        state.listeners.add(cb);
        return () => {
            state.listeners.delete(cb);
        };
    }
}

/** Return the root identifier symbol for a deepSignal proxy (if any). */
export function getDeepSignalRootId(value: any): symbol | undefined {
    return rawToMeta.get(value?.[RAW_KEY] ?? value)?.root;
}

/** Retrieve the current patch version for a deepSignal root (if tracked). */
export function getDeepSignalVersion(
    root: object | symbol
): number | undefined {
    const rootId = typeof root === "symbol" ? root : getDeepSignalRootId(root);
    if (!rootId) return undefined;
    return rootStates.get(rootId)?.version;
}

/** Mark an object so deepSignal skips proxying it (shallow boundary). */
export function shallow<T extends object>(obj: T): T {
    ignored.add(obj);
    return obj;
}

/** Force a specific synthetic ID to be used for a Set entry prior to insertion. */
export function setSetEntrySyntheticId(obj: object, id: string | number) {
    if (!obj || typeof obj !== "object") return;
    // @ts-ignore
    forcedSyntheticIds.set(obj[RAW_KEY] ?? obj, String(id));
}

/** Convenience helper to add an entry to a proxied Set with a pre-defined synthetic ID. */
export function addWithId<T>(set: Set<T>, entry: T, id: string | number): T {
    if (entry && typeof entry === "object") {
        setSetEntrySyntheticId(entry as object, id);
    }
    set.add(entry);
    if (entry && typeof entry === "object") {
        const getter = (set as any)?.getById;
        if (typeof getter === "function") {
            const proxied = getter.call(set, String(id));
            if (proxied) return proxied;
        }
    }
    return entry;
}
