// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { alienComputed, alienSignal } from "./core";
import {
    DeepPatch,
    DeepPatchBatch,
    DeepPatchJITSubscriber,
    DeepPatchSubscriber,
    DeepSignal,
    DeepSignalOptions,
    ExternalSubscriberFactory,
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

/** Type to store alien signal and external subscribers  */
type SignalRecord<T = any> = {
    /** The alien signal to store the value in. */
    alienSignal: WritableSignal<T>;
    /**
     * Subscribers from frontend libraries. On changes, `onSet` is called. On property access `onGet`.
     * The keys are the subscriber factories, the values are the returned subscribers.
     */
    // TODO: Find an elegant way to garbage collect unused subscribers.
    externalSubscribers: Map<
        ExternalSubscriberFactory<T>,
        ReturnType<ExternalSubscriberFactory<T>>
    >;
};

/**
 * Mapping of raw objects to child signals.
 * We store them globally because the same object can be attached in different locations.
 */
const propertiesToSignals = new WeakMap<
    object,
    Map<PropertyKey, SignalRecord>
>();

const iterableSignals = new WeakMap<object, SignalRecord<number>>();
const ignored = new WeakSet<object>();

// TODO: We can just add this to the root directly
const rootStates = new Map<symbol, RootState>();
const pendingRoots = new Set<symbol>();
const supported = new Set([Object, Array, Set]);
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
 * Get or create the map in `proxySignals` for raw object to `Map<property key, signal>`
 */
function getOrCreateSignalMap(rawObj: object) {
    if (!propertiesToSignals.has(rawObj))
        propertiesToSignals.set(rawObj, new Map());
    return propertiesToSignals.get(rawObj)!;
}

/**
 * Write a new value into a cached signal, creating it if needed.
 * Does nothing on computed signals.
 */
function setSignalValue(meta: ProxyMeta, key: PropertyKey, value: any) {
    const signals = propertiesToSignals.get(meta.raw)!;

    if (!signals.has(key)) {
        // Add new signal.

        signals.set(key, {
            alienSignal: alienSignal(value),
            // Do not add external subscribers yet, they will be created on first read.
            externalSubscribers: new Map(),
        });
    } else {
        // Update existing signal.

        const existingSignal = signals.get(key)!;
        existingSignal.alienSignal(value);
        existingSignal.externalSubscribers
            .values()
            .forEach((subscriber) => subscriber.onSet(value));
    }
}

/** Gets the current value of a signal and notifies external subscribers about read. */
function getValFromSignalRecord(meta: ProxyMeta, record: SignalRecord) {
    const val = record.alienSignal();

    // Notify external subscribers (usually frontend frameworks) about property access.
    meta.options.subscriberFactories?.forEach((createSubscriber) => {
        let subscriber = record.externalSubscribers.get(createSubscriber);

        if (!subscriber) {
            // Create new subscriber
            subscriber = createSubscriber();
            record.externalSubscribers.set(createSubscriber, subscriber);
        }

        subscriber.onGet();
    });

    return val;
}

/** Sets the current value of a signal and notifies external subscribers about update. */
function setValToSignalRecord(record: SignalRecord, value: any) {
    record.alienSignal(value);

    // Notify external subscribers (usually frontend frameworks) about property update.
    record.externalSubscribers.forEach((subscriber) => subscriber.onSet(value));
}

/** Track mutations that affect object iteration order/length with a counter signal. */
function ensureIterableSignal(meta: ProxyMeta, target: object) {
    // Create new one if none exists.
    if (!iterableSignals.has(target)) {
        iterableSignals.set(target, {
            alienSignal: alienSignal(0),
            externalSubscribers: new Map(),
        });
    }

    const signal = iterableSignals.get(target)!;

    getValFromSignalRecord(meta, signal);
}

/** Notify all iteration-based subscribers that the container changed shape, by increasing the counter signal. */
function touchIterable(meta: ProxyMeta, target: object) {
    if (!iterableSignals.has(target)) return;

    const signalRecord = iterableSignals.get(target)!;
    const oldCountVal = getValFromSignalRecord(meta, signalRecord);

    const newVal = oldCountVal + 1;
    setValToSignalRecord(signalRecord, newVal);
}

/**
 * Create computed signals for getter functions.
 */
function ensureProxiedGetter(
    signals: Map<PropertyKey, SignalRecord>,
    target: any,
    key: PropertyKey,
    receiver: any
) {
    if (
        !signals.has(key) &&
        typeof Object.getOwnPropertyDescriptor(target, key)?.get === "function" // If we have a getter?
    ) {
        signals.set(key, {
            alienSignal: alienComputed(() =>
                Reflect.get(target, key, receiver)
            ),
            externalSubscribers: new Map(),
        });
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
 * Replaces the old rawToProxy object with a proxy object.
 * Used so that we can indicate modifications along the path of a change by equality checks.
 * All values remain the same.
 *
 * Does nothing if the deep signal's options `replaceProxiesInBranchOnChange` is false.
 */
function replaceProxy(meta: ProxyMeta) {
    if (
        !meta.parent ||
        !meta.key ||
        !meta.options.replaceProxiesInBranchOnChange
    )
        return;

    // Create a new proxy for this raw object -- frontend libs like react need this to recognize changes along this path.
    const handlers = meta.raw instanceof Set ? setHandlers : objectHandlers;
    const proxy = new Proxy(meta.raw, handlers);
    rawToProxy.set(meta.raw, proxy);

    const signal = getOrCreateSignalMap(meta.parent.raw).get(meta.key);
    signal?.alienSignal(proxy);
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
 * Return (or create) a proxy for a property value.
 * Ensures the linkage between parent and child in metadata.
 * Does not proxy and returns `value` if @see shouldProxy returns false.
 * Assumes parent has proxy.
 */
function ensureChildProxy<T>(
    rawChild: T,
    parent: any,
    key: PropertyKey,
    isSyntheticId = false
): DeepSignal<T> | T {
    if (!shouldProxy(rawChild)) return rawChild;

    const parentRaw = parent[RAW_KEY] || parent;
    const parentMeta = rawToMeta.get(parentRaw)!;

    // Child is already proxied, ensure the linkage from parent to child.
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

    getOrCreateSignalMap(target);
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
function refreshNumericIndexSignals(
    meta: ProxyMeta,
    target: any[],
    receiver: any
) {
    const signals = getOrCreateSignalMap(meta.raw);

    for (const k of Array.from(signals.keys())) {
        if (typeof k === "string" && /^\d+$/.test(k)) {
            const idx = Number(k);
            if (idx >= target.length) {
                const existing = signals.get(k);
                if (existing) {
                    setSignalValue(meta, k, undefined);
                }
                signals.delete(k);
            } else {
                const val = target[idx];
                const proxied = ensureChildProxy(val, receiver, idx);
                setSignalValue(meta, k, proxied);
            }
        }
    }
}

let hasWarnedAboutMissingSupportForReverse = false;
let hasWarnedAboutMissingSupportForSort = false;
/** Returns proxy function for array-mutating functions. */
const getArrayMutationProxy = (target: any[], key: any, receiver: any[]) => {
    const meta = rawToMeta.get(target)!;

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
            refreshNumericIndexSignals(meta, target, receiver);
        };
    } else if (key === "splice") {
        return (start: number, deleteCount: number, ...items: any[]) => {
            // Call splice on (non-proxied) target.
            const deletedItems = target.splice(start, deleteCount, ...items);

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
            refreshNumericIndexSignals(meta, target, receiver);

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
            refreshNumericIndexSignals(meta, target, receiver);

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

        const meta = rawToMeta.get(target)!;

        if (typeof key === "symbol") {
            if (key === Symbol.iterator) {
                // Ensure that signal exists tracking iteration-based dependencies.
                ensureIterableSignal(meta, target);
            }
            if (!isReactiveSymbol(key))
                // No reactivity for well-known symbols
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
        const signals = getOrCreateSignalMap(meta.raw);

        // If the property value is a getter, create a computed signal for it.
        ensureProxiedGetter(signals, target, key, receiver);

        // Add signal if it does not exist already and did not have a getter.
        if (!signals.has(key)) {
            let rawChild = Reflect.get(target, key, receiver);

            if (typeof rawChild === "function")
                return rawChild.bind(receiver ?? target);

            const childProxyOrRaw = ensureChildProxy(rawChild, receiver, key);

            setSignalValue(meta, key, childProxyOrRaw);
        }

        // Call and return signal.
        const sig = signals.get(key)!;

        return getValFromSignalRecord(meta, sig);
    },

    set(target, key, value, receiver) {
        // Skip reactivity for symbols.
        if (typeof key === "symbol" && !isReactiveSymbol(key))
            return Reflect.set(target, key, value, receiver);

        const meta = rawToMeta.get(target)!;
        if (meta?.options?.readOnlyProps?.includes(String(key))) {
            throw new Error(`Cannot modify readonly property '${String(key)}'`);
        }

        const path = meta ? buildPath(meta, key) : undefined;

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

        // Set signal value.
        setSignalValue(meta, key, proxied);

        if (!hadKey) touchIterable(meta, target);
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

        const meta = rawToMeta.get(target)!;

        const hadKey = Object.prototype.hasOwnProperty.call(target, key);
        const result = Reflect.deleteProperty(target, key);
        if (hadKey) {
            // Trigger signal
            const signals = getOrCreateSignalMap(meta.raw);
            const existing = signals.get(key);
            if (existing) setValToSignalRecord(existing, undefined);

            signals.delete(key);

            // Notify listeners
            touchIterable(meta, target);

            // Schedule remove patch.
            schedulePatch(meta, () => ({
                path: buildPath(meta, key),
                op: "remove",
            }));
        }
        return result;
    },
    ownKeys(target) {
        const meta = rawToMeta.get(target)!;
        const sig = ensureIterableSignal(meta, target);
        return Reflect.ownKeys(target);
    },
};

/** Wrap the underlying Set iterator so each value is proxied before leaving the trap. */
function createSetIterator(
    target: Set<any>,
    receiver: any,
    mapValue: (value: any) => any
) {
    const meta = rawToMeta.get(target)!;

    const iterator = target.values();
    ensureIterableSignal(meta, target);
    return createIteratorWithHelpers(() => {
        const next = iterator.next();
        if (next.done) return next;
        const meta = rawToMeta.get(target)!;
        const proxied = ensureChildProxy(
            next.value,
            target,
            assignSyntheticId(meta, next.value, [], true),
            true
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
        const meta = rawToMeta.get(target)!;

        if (key === RAW_KEY) return target;
        if (key === META_KEY) return meta;

        if (key === "size") {
            ensureIterableSignal(meta, target);
            return target.size;
        }
        if (key === "first") {
            return function first() {
                const iterator = target.values().next();
                if (iterator.done) return undefined;

                const proxy = ensureChildProxy(
                    iterator.value,
                    target,
                    assignSyntheticId(meta!, iterator.value, [], true),
                    true
                );
                ensureIterableSignal(meta, target);
                return proxy;
            };
        }
        if (key === "getById") {
            return function getById(this: any, id: string | number) {
                if (!meta?.setInfo) return undefined;
                const entry = meta.setInfo.objectForId.get(String(id));
                if (!entry) return undefined;

                const proxy = ensureChildProxy(entry, target, String(id));
                ensureIterableSignal(meta, target);
                return proxy;
            };
        }
        if (key === "getBy") {
            return function getBy(
                this: any,
                graphIri: string,
                subjectIri: string
            ) {
                return (this as any).getById(`${graphIri}|${subjectIri}`);
            };
        }
        if (key === "add") {
            return function add(this: any, value: any) {
                const containerPath = resolveContainerPath(meta);

                const rawValue = value[RAW_KEY] ?? value;

                if (target.has(rawValue)) {
                    // Nothing to do.
                    return receiver;
                }

                target.add(rawValue);

                if (rawValue && typeof rawValue === "object") {
                    // Case: Object in set
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
                    ensureChildProxy(rawValue, target, synthetic, true);

                    touchIterable(meta, target);

                    schedulePatch(meta, () =>
                        emitPatchesForNew(
                            rawValue,
                            meta!,
                            [...containerPath, synthetic],
                            true
                        )
                    );
                } else {
                    // Case: Literal in set

                    touchIterable(meta, target);

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

                return receiver;
            };
        }
        if (key === "delete") {
            return function deleteEntry(this: any, value: any) {
                const rawValue = value?.[RAW_KEY] ?? value;
                const synthetic =
                    rawValue && typeof rawValue === "object"
                        ? ensureSetInfo(meta!).idForObject.get(rawValue)
                        : rawValue;

                const existed = target.delete(rawValue);

                if (existed) {
                    touchIterable(meta, target);
                }

                if (existed && synthetic !== undefined) {
                    const containerPath = resolveContainerPath(meta);
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
                // Nothing to do.
                if (target.size === 0) return;

                const containerPath = resolveContainerPath(meta);
                if (meta!.setInfo) {
                    meta!.setInfo.objectForId.clear();
                    meta!.setInfo.idForObject = new WeakMap();
                }

                target.clear();

                touchIterable(meta, target);
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
                ensureIterableSignal(meta, target);
                let index = 0;
                const expectsIteratorSignature = callback.length <= 2;
                const iteratorCallback = callback as unknown as (
                    value: any,
                    index: number
                ) => void;
                target.forEach((entry) => {
                    const proxied = ensureChildProxy(
                        entry,
                        target,
                        assignSyntheticId(meta!, entry, [], true),
                        true
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
                ensureIterableSignal(meta, target);
                return target.has(value?.[RAW_KEY] ?? value);
            };
        }

        // All other cases:
        const res = (target as any)[key];

        if (typeof res === "function") {
            // For all other functions on sets, return a wrapped function
            // that calls ensureIterableSignal() before.
            return (...props: any) => {
                ensureIterableSignal(meta, target);
                return res.bind(target)(...props);
            };
        } else {
            return res;
        }
    },
};

/** Runtime guard that checks whether a value is a deepSignal proxy. */
export function isDeepSignal(value: unknown): value is DeepSignal<any> {
    return !!(value as any)?.[RAW_KEY];
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
    // Is the input already a signal?
    if (isDeepSignal(input)) {
        // Add possibly new external subscribers to existing ones.
        // TODO: Document this behavior.
        const meta = rawToMeta.get((input as any)[RAW_KEY]!)!;
        meta.options.subscriberFactories =
            meta.options.subscriberFactories!.union(
                options?.subscriberFactories ?? new Set()
            );

        meta?.options.replaceProxiesInBranchOnChange ==
            meta?.options.replaceProxiesInBranchOnChange ||
            options?.replaceProxiesInBranchOnChange;

        return input as DeepSignal<T>;
    }

    if (!shouldProxy(input))
        throw new Error("deepSignal() expects an object, array, or Set");

    if (rawToProxy.has(input)) return rawToProxy.get(input);

    const root = Symbol("deepSignalRoot");
    const rootState = {
        options: {
            syntheticIdPropertyName: DEFAULT_SYNTHETIC_ID_PROPERTY_NAME,
            replaceProxiesInBranchOnChange: false,
            subscriberFactories: new Set(),
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

/** Get the original, raw value of a deep signal. */
export function getRaw<T extends object>(value: T | DeepSignal<T>) {
    return (value as any)?.[RAW_KEY] ?? value;
}
