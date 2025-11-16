// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { ReactiveFlags } from "./contents";
import { computed, signal, isSignal } from "./core";
/**
 * deepSignal: wrap an object / array / Set graph in lazy per-property signals plus an optional deep patch stream.
 *  - `$prop` returns a signal; plain prop returns its current value.
 *  - Getter props become computed signals.
 *  - Arrays expose `$` (index signals) & `$length`; Sets emit structural entry patches with synthetic ids.
 *  - subscribeDeepMutations(root, cb) batches set/delete ops per microtask (DeepPatch[]).
 *  - shallow(obj) skips deep proxying of a subtree.
 */

/** A batched deep mutation (set/add/remove) from a deepSignal root. */
export type DeepPatch = {
    /** Property path (array indices, object keys, synthetic Set entry ids) from the root to the mutated location. */
    path: (string | number)[];
} & (
    | DeepSetAddPatch
    | DeepSetRemovePatch
    | DeepObjectAddPatch
    | DeepRemovePatch
    | DeepLiteralAddPatch
);
export type DeepPatchInternal = {
    /** Unique identifier for the deep signal root which produced this patch. */
    root: symbol;
    /** Property path (array indices, object keys, synthetic Set entry ids) from the root to the mutated location. */
    path: (string | number)[];
} & (
    | DeepSetAddPatch
    | DeepSetRemovePatch
    | DeepObjectAddPatch
    | DeepRemovePatch
    | DeepLiteralAddPatch
);

export interface DeepSetAddPatch {
    /** Mutation kind applied at the resolved `path`. */
    op: "add";
    type: "set";
    /** New value for `set` mutations (omitted for `delete`). */
    value: (number | string | boolean)[] | { [id: string]: object };
}
export interface DeepSetRemovePatch {
    /** Mutation kind applied at the resolved `path`. */
    op: "remove";
    type: "set";
    /** The value to be removed from the set. Either a literal or the key (id) of an object. */
    value: string | number | boolean;
}
export interface DeepObjectAddPatch {
    /** Mutation kind applied at the resolved `path`. */
    op: "add";
    type: "object";
}

export interface DeepRemovePatch {
    /** Mutation kind applied at the resolved `path`. */
    op: "remove";
}
export interface DeepLiteralAddPatch {
    /** Mutation kind applied at the resolved `path` */
    op: "add";
    /** The literal value to be added at the resolved `path` */
    value: string | number | boolean;
}

/** Callback signature for subscribeDeepMutations. */
export type DeepPatchSubscriber = (patches: DeepPatch[]) => void;

/** Options for configuring deepSignal behavior. */
export interface DeepSignalOptions {
    /**
     * A function that  is called when a new object is added to the deep signal object.
     * If it is added in a set, `inSet` is going to be true and the function may return
     * a `syntheticId` as identifier for patches.
     * The function may always return `extraProps` which are added to the new object.
     *
     */
    propGenerator?: DeepSignalPropGenFn;

    /** If set, the synthetic id is exposed to objects in sets under the given property name. */
    syntheticIdPropertyName?: string;
    /**
     * Property names that may not be changed on objects.
     * Attempts to changes throw an error.
     */
    readOnlyProps?: string[];
}

export type DeepSignalPropGenFn = (props: {
    /** The path of the newly added object. */
    path: (string | number)[];
    /** If the newly added object is a set. */
    inSet: boolean;
    /** The newly added object itself. */
    object: any;
}) => {
    /** If the object is in a set, return a synthetic id as custom identifier and for patch path generation. */
    syntheticId?: string;
    /** Additional props to be added to the new object */
    extraProps?: Record<string, unknown>;
};

/** Minimal per-proxy metadata for path reconstruction. */
interface ProxyMeta {
    /** Parent proxy in the object graph (undefined for root). */
    parent?: object;
    /** Key within the parent pointing to this proxy (undefined for root). */
    key?: string | number;
    /** True if this key is a synthetic ID (for Set entries) and should not be escaped. */
    isSyntheticId?: boolean;
    /** Stable root id symbol shared by the entire deepSignal tree. */
    root: symbol;
    /** Options inherited from root. */
    options?: DeepSignalOptions;
}

// Proxy -> metadata
const proxyMeta = new WeakMap<object, ProxyMeta>();
// Root symbol -> options
const rootOptions = new Map<symbol, DeepSignalOptions>();
// Root symbol -> subscribers
const mutationSubscribers = new Map<symbol, Set<DeepPatchSubscriber>>();
// Pending patches grouped per root (flushed once per microtask)
let pendingPatches: Map<symbol, DeepPatch[]> | null = null;
let microtaskScheduled = false;

/** Sentinel symbol; get concrete root id via getDeepSignalRootId(proxy). */
export const DEEP_SIGNAL_ROOT_ID = Symbol("alienDeepSignalRootId");

/** Escape path segment for JSON Pointer compatibility (except synthetic IDs). */
function escapePathSegment(segment: string): string {
    return segment
        .replace(/~/g, "~0")
        .replace(/\//g, "~1")
        .replace(/\|/g, "~2");
}

function buildPath(
    startProxy: object,
    leafKey: string | number
): (string | number)[] {
    const path: (string | number)[] = [
        typeof leafKey === "string" ? escapePathSegment(leafKey) : leafKey,
    ];
    let cur: object | undefined = startProxy;
    while (cur) {
        const meta = proxyMeta.get(cur);
        if (!meta) break; // Defensive: metadata should always exist.
        if (meta.key === undefined) break; // Reached root (no key recorded).
        // Escape string keys unless they're synthetic IDs
        const escapedKey =
            typeof meta.key === "string" && !meta.isSyntheticId
                ? escapePathSegment(meta.key)
                : meta.key;
        path.unshift(escapedKey);
        cur = meta.parent;
    }
    return path;
}

function queuePatch(patch: DeepPatchInternal) {
    if (!pendingPatches) pendingPatches = new Map();
    const root = patch.root;
    let list = pendingPatches.get(root);
    if (!list) {
        list = [];
        pendingPatches.set(root, list);
    }
    // Remove root, we do not send that back.
    // @ts-ignore
    delete patch.root;
    list.push(patch);
    if (!microtaskScheduled) {
        microtaskScheduled = true;
        queueMicrotask(() => {
            microtaskScheduled = false;
            const groups = pendingPatches;
            pendingPatches = null;
            if (!groups) return;
            for (const [rootId, patches] of groups) {
                if (!patches.length) continue;
                const subs = mutationSubscribers.get(rootId);
                if (subs) subs.forEach((callback) => callback(patches));
            }
        });
    }
}

/** Recursively emit patches for all nested properties of a newly attached object. */
function queueDeepPatches(
    val: any,
    rootId: symbol,
    basePath: (string | number)[],
    options?: DeepSignalOptions
) {
    if (!val || typeof val !== "object") {
        // Emit patch for primitive leaf
        queuePatch({
            root: rootId,
            path: basePath,
            op: "add",
            value: val,
        });
        return;
    }

    // Add an id to object not in set as well,
    // if the id generator function returns it.
    if (
        options?.syntheticIdPropertyName &&
        val.constructor === Object &&
        !(options.syntheticIdPropertyName in val)
    ) {
        let newId = options.propGenerator?.({
            path: basePath,
            inSet: false,
            object: val,
        }).syntheticId;
        if (newId !== undefined) {
            // Add synthetic id to the raw object before proxying
            Object.defineProperty(val, options.syntheticIdPropertyName, {
                value: newId,
                writable: false,
                enumerable: true,
                configurable: false,
            });
        }
    }

    // Emit patch for the object/array/Set itself
    queuePatch({
        root: rootId,
        path: basePath,
        op: "add",
        type: "object",
    });

    // Emit patch for @id if it exists
    if ("@id" in val) {
        queuePatch({
            root: rootId,
            path: [...basePath, "@id"],
            op: "add",
            value: (val as any)["@id"],
        });
    }

    // Recursively process nested properties
    if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
            queueDeepPatches(val[i], rootId, [...basePath, i], options);
        }
    } else if (val instanceof Set) {
        for (const entry of val) {
            // Call propGenerator for object entries in nested Sets
            if (
                entry &&
                typeof entry === "object" &&
                entry.constructor === Object &&
                options?.propGenerator
            ) {
                const result = options.propGenerator({
                    path: basePath,
                    inSet: true,
                    object: entry,
                });

                // Add synthetic id if specified and not already present
                if (
                    options.syntheticIdPropertyName &&
                    result.syntheticId !== undefined &&
                    !(options.syntheticIdPropertyName in entry)
                ) {
                    Object.defineProperty(
                        entry,
                        options.syntheticIdPropertyName,
                        {
                            value: result.syntheticId,
                            writable: false,
                            enumerable: true,
                            configurable: false,
                        }
                    );
                    // Also record in setObjectIds so key resolution is stable without re-running generator
                    setObjectIds.set(entry, String(result.syntheticId));
                }
            }

            const key = getSetEntryKey(entry, options, basePath, true);
            queueDeepPatches(entry, rootId, [...basePath, key], options);
        }
    } else if (val.constructor === Object) {
        for (const key in val) {
            if (
                Object.prototype.hasOwnProperty.call(val, key) &&
                key !== "@id"
            ) {
                queueDeepPatches(val[key], rootId, [...basePath, key], options);
            }
        }
    }
}

/** Subscribe to microtask-batched deep patches for a root (returns unsubscribe). */
export function subscribeDeepMutations(
    root: object | symbol,
    sub: DeepPatchSubscriber
): () => void {
    const rootId = typeof root === "symbol" ? root : getDeepSignalRootId(root);
    if (!rootId)
        throw new Error(
            "subscribeDeepMutations() expects a deepSignal root proxy or root id symbol"
        );
    let set = mutationSubscribers.get(rootId);
    if (!set) {
        set = new Set();
        mutationSubscribers.set(rootId, set);
    }
    set.add(sub);
    return () => {
        const bucket = mutationSubscribers.get(rootId);
        if (!bucket) return;
        bucket.delete(sub);
        if (bucket.size === 0) mutationSubscribers.delete(rootId);
    };
}

/** Return the stable root symbol for any deepSignal proxy (undefined if not one). */
export function getDeepSignalRootId(obj: any): symbol | undefined {
    return proxyMeta.get(obj)?.root;
}

// Proxy -> Map of property name -> signal function
/** Proxy -> Map<propertyName, signalFn> (lazy). */
const proxyToSignals = new WeakMap();
// Raw object/array/Set -> stable proxy
const objToProxy = new WeakMap();
// Proxy -> raw object/array/Set (reverse lookup)
const proxyToRaw = new WeakMap();
// Raw array -> `$` meta proxy with index signals
const arrayToArrayOfSignals = new WeakMap();
// Objects already proxied or marked shallow
const ignore = new WeakSet();
// Object -> signal counter for enumeration invalidation
const objToIterable = new WeakMap();
const rg = /^\$/;
const descriptor = Object.getOwnPropertyDescriptor;
let peeking = false;

// Deep array interface refining callback parameter types.
type DeepArray<T> = Array<T> & {
    map: <U>(
        callbackfn: (
            value: DeepSignal<T>,
            index: number,
            array: DeepSignalArray<T[]>
        ) => U,
        thisArg?: any
    ) => U[];
    forEach: (
        callbackfn: (
            value: DeepSignal<T>,
            index: number,
            array: DeepSignalArray<T[]>
        ) => void,
        thisArg?: any
    ) => void;
    concat(...items: ConcatArray<T>[]): DeepSignalArray<T[]>;
    concat(...items: (T | ConcatArray<T>)[]): DeepSignalArray<T[]>;
    reverse(): DeepSignalArray<T[]>;
    shift(): DeepSignal<T> | undefined;
    slice(start?: number, end?: number): DeepSignalArray<T[]>;
    splice(start: number, deleteCount?: number): DeepSignalArray<T[]>;
    splice(
        start: number,
        deleteCount: number,
        ...items: T[]
    ): DeepSignalArray<T[]>;
    filter<S extends T>(
        predicate: (
            value: DeepSignal<T>,
            index: number,
            array: DeepSignalArray<T[]>
        ) => value is DeepSignal<S>,
        thisArg?: any
    ): DeepSignalArray<S[]>;
    filter(
        predicate: (
            value: DeepSignal<T>,
            index: number,
            array: DeepSignalArray<T[]>
        ) => unknown,
        thisArg?: any
    ): DeepSignalArray<T[]>;
    reduce(
        callbackfn: (
            previousValue: DeepSignal<T>,
            currentValue: DeepSignal<T>,
            currentIndex: number,
            array: DeepSignalArray<T[]>
        ) => T
    ): DeepSignal<T>;
    reduce(
        callbackfn: (
            previousValue: DeepSignal<T>,
            currentValue: DeepSignal<T>,
            currentIndex: number,
            array: DeepSignalArray<T[]>
        ) => DeepSignal<T>,
        initialValue: T
    ): DeepSignal<T>;
    reduce<U>(
        callbackfn: (
            previousValue: U,
            currentValue: DeepSignal<T>,
            currentIndex: number,
            array: DeepSignalArray<T[]>
        ) => U,
        initialValue: U
    ): U;
    reduceRight(
        callbackfn: (
            previousValue: DeepSignal<T>,
            currentValue: DeepSignal<T>,
            currentIndex: number,
            array: DeepSignalArray<T[]>
        ) => T
    ): DeepSignal<T>;
    reduceRight(
        callbackfn: (
            previousValue: DeepSignal<T>,
            currentValue: DeepSignal<T>,
            currentIndex: number,
            array: DeepSignalArray<T[]>
        ) => DeepSignal<T>,
        initialValue: T
    ): DeepSignal<T>;
    reduceRight<U>(
        callbackfn: (
            previousValue: U,
            currentValue: DeepSignal<T>,
            currentIndex: number,
            array: DeepSignalArray<T[]>
        ) => U,
        initialValue: U
    ): U;
};
// Synthetic ids for Set entry objects (stable key for patches)
let __blankNodeCounter = 0;
const setObjectIds = new WeakMap<object, string>();
const assignBlankNodeId = (obj: any) => {
    if (setObjectIds.has(obj)) return setObjectIds.get(obj)!;
    const id = `_b${++__blankNodeCounter}`;
    setObjectIds.set(obj, id);
    return id;
};

// Reverse index: Set -> Map<syntheticId, rawObject> for O(1) getById lookups
const setIdToObject = new WeakMap<Set<any>, Map<string, any>>();

/** Assign (or override) synthetic id before Set.add(). */
export function setSetEntrySyntheticId(obj: object, id: string | number) {
    setObjectIds.set(obj, String(id));
}
const getSetEntryKey = (
    val: any,
    options?: DeepSignalOptions,
    path?: (string | number)[],
    inSet?: boolean
): string | number => {
    if (val && typeof val === "object") {
        // If val is a proxy, get the raw object first
        const rawVal = proxyToRaw.get(val) || val;

        // 1) Respect an explicitly assigned synthetic ID (e.g., via addWithId)
        if (setObjectIds.has(rawVal)) {
            return setObjectIds.get(rawVal)!;
        }

        // 2) Ask propGenerator for a synthetic id when available
        if (options?.propGenerator && path) {
            const generated = options.propGenerator({
                path,
                inSet: !!inSet,
                object: rawVal,
            })?.syntheticId;
            if (generated !== undefined) {
                const idStr = String(generated);
                setObjectIds.set(rawVal, idStr);
                return idStr;
            }
        }

        // 3) Use custom id property on the object if configured
        const customIdProp = options?.syntheticIdPropertyName;
        const customIdVal = customIdProp
            ? (rawVal as any)[customIdProp]
            : undefined;
        if (
            customIdProp &&
            (typeof customIdVal === "string" || typeof customIdVal === "number")
        ) {
            const idStr = String(customIdVal);
            setObjectIds.set(rawVal, idStr);
            return idStr;
        }

        // 4) Fallback to a stable auto-generated blank node id
        return assignBlankNodeId(rawVal);
    }
    return val as any;
};

/**
 * Build or retrieve the reverse index (syntheticId -> rawObject) for a Set.
 * Uses lazy initialization: index is only built when first accessed.
 */
function ensureSetIndex(
    raw: Set<any>,
    options?: DeepSignalOptions
): Map<string, any> {
    if (!setIdToObject.has(raw)) {
        const index = new Map<string, any>();
        for (const entry of raw) {
            if (entry && typeof entry === "object") {
                const entryId = getSetEntryKey(entry, options);
                index.set(String(entryId), entry);
            }
        }
        setIdToObject.set(raw, index);
    }
    return setIdToObject.get(raw)!;
}

/**
 * Update the index when an entry is added to a Set (if index exists).
 * Uses incremental updates to maintain O(1) lookup performance.
 */
function addToSetIndex(
    raw: Set<any>,
    entry: any,
    syntheticId: string | number
) {
    if (setIdToObject.has(raw)) {
        const index = setIdToObject.get(raw)!;
        index.set(String(syntheticId), entry);
    }
}

/**
 * Update the index when an entry is removed from a Set (if index exists).
 */
function removeFromSetIndex(raw: Set<any>, syntheticId: string | number) {
    if (setIdToObject.has(raw)) {
        const index = setIdToObject.get(raw)!;
        index.delete(String(syntheticId));
    }
}

/**
 * Clear the index when a Set is cleared.
 */
function clearSetIndex(raw: Set<any>) {
    if (setIdToObject.has(raw)) {
        setIdToObject.get(raw)!.clear();
    }
}

/** Add entry with synthetic id; returns proxied object if applicable. */
export function addWithId<T extends object>(
    set: Set<T>,
    entry: T,
    id: string | number
): DeepSignal<T>;
export function addWithId<T>(set: Set<T>, entry: T, id: string | number): T;
export function addWithId(set: Set<any>, entry: any, id: string | number) {
    if (entry && typeof entry === "object") setSetEntrySyntheticId(entry, id);
    (set as any).add(entry);
    if (entry && typeof entry === "object" && objToProxy.has(entry))
        return objToProxy.get(entry);
    return entry;
}

/**
 * Get index statistics for a Set (useful for debugging and optimization).
 * Returns information about whether the Set has an index and its size.
 */
export function getSetIndexStats(set: Set<any>): {
    hasIndex: boolean;
    setSize: number;
    indexSize?: number;
} {
    const rawSet = proxyToRaw.get(set) || set;
    const hasIndex = setIdToObject.has(rawSet);
    return {
        hasIndex,
        setSize: rawSet.size,
        indexSize: hasIndex ? setIdToObject.get(rawSet)!.size : undefined,
    };
}

/** Is value a deepSignal-managed proxy? */
export const isDeepSignal = (source: any) => {
    return proxyToSignals.has(source);
};

/** Was value explicitly marked shallow? */
export const isShallow = (source: any) => {
    return ignore.has(source);
};

/** Create (or reuse) a deep reactive proxy for an object / array / Set. */
export const deepSignal = <T extends object>(
    obj: T,
    options?: DeepSignalOptions
): DeepSignal<T> => {
    if (!shouldProxy(obj)) throw new Error("This object can't be observed.");
    if (!objToProxy.has(obj)) {
        // Create a unique root id symbol to identify this deep signal tree in patches.
        const rootId = Symbol("deepSignalRoot");
        if (options) {
            rootOptions.set(rootId, options);
        }
        const proxy = createProxy(
            obj,
            objectHandlers,
            rootId,
            options
        ) as DeepSignal<T>;
        const meta = proxyMeta.get(proxy)!;
        meta.parent = undefined; // root has no parent
        meta.key = undefined; // root not addressed by a key
        meta.root = rootId; // ensure root id stored (explicit)
        meta.options = options; // store options in metadata
        // Pre-register an empty signals map so isDeepSignal() is true before any property access.
        if (!proxyToSignals.has(proxy)) proxyToSignals.set(proxy, new Map());
        objToProxy.set(obj, proxy);
        proxyToRaw.set(proxy, obj);
    }
    return objToProxy.get(obj);
};

/** Read property without tracking (untracked read). */
export const peek = <
    T extends DeepSignalObject<object>,
    K extends keyof RevertDeepSignalObject<T>,
>(
    obj: T,
    key: K
): RevertDeepSignal<RevertDeepSignalObject<T>[K]> => {
    peeking = true;
    const value = obj[key];
    try {
        peeking = false;
    } catch (e) {}
    return value as RevertDeepSignal<RevertDeepSignalObject<T>[K]>;
};

const shallowFlag = Symbol(ReactiveFlags.IS_SHALLOW);
/** Mark object to skip deep proxying (only reference changes tracked). */
export function shallow<T extends object>(obj: T): Shallow<T> {
    ignore.add(obj);
    return obj as Shallow<T>;
}

// Create a proxy and attach root/options metadata lazily.
const createProxy = (
    target: object,
    handlers: ProxyHandler<object>,
    rootId?: symbol,
    options?: DeepSignalOptions
) => {
    const proxy = new Proxy(target, handlers);
    ignore.add(proxy);
    if (!proxyMeta.has(proxy)) {
        proxyMeta.set(proxy, {
            root: rootId || Symbol("deepSignalDetachedRoot"),
            options: options || (rootId ? rootOptions.get(rootId) : undefined),
        });
    }
    return proxy;
};

// Set-specific access & structural patch emission.
function getFromSet(
    raw: Set<any>,
    key: string | symbol,
    receiver: object
): any {
    const meta = proxyMeta.get(receiver);
    // Helper to proxy a single entry (object) & assign synthetic id if needed.
    const ensureEntryProxy = (entry: any) => {
        if (
            entry &&
            typeof entry === "object" &&
            shouldProxy(entry) &&
            !objToProxy.has(entry)
        ) {
            const synthetic = getSetEntryKey(entry, meta!.options);
            const childProxy = createProxy(
                entry,
                objectHandlers,
                meta!.root,
                meta!.options
            );
            const childMeta = proxyMeta.get(childProxy)!;
            childMeta.parent = receiver;
            childMeta.key = synthetic;
            childMeta.isSyntheticId = true; // Mark as synthetic ID (should not be escaped)
            objToProxy.set(entry, childProxy);
            proxyToRaw.set(childProxy, entry);
            return childProxy;
        }
        if (objToProxy.has(entry)) return objToProxy.get(entry);
        return entry;
    };
    // Pre-pass to ensure any existing non-proxied object entries are proxied (enables deep patches after iteration)
    if (meta) raw.forEach(ensureEntryProxy);

    if (key === "add" || key === "delete" || key === "clear") {
        const fn: Function = (raw as any)[key];
        return function (this: any, ...args: any[]) {
            // For delete, keep track of the original entry for patch emission
            const originalEntry = key === "delete" ? args[0] : undefined;

            // For delete, if the argument is a proxy, get the raw object for the actual Set operation
            if (key === "delete" && args[0] && typeof args[0] === "object") {
                const rawArg = proxyToRaw.get(args[0]);
                if (rawArg) {
                    args = [rawArg];
                }
            }
            const sizeBefore = raw.size;
            const result = fn.apply(raw, args);
            if (raw.size !== sizeBefore) {
                const metaNow = proxyMeta.get(receiver);
                if (metaNow) {
                    // For root Set, containerPath is empty; for nested Set, build path from parent
                    const containerPath =
                        metaNow.parent !== undefined &&
                        metaNow.key !== undefined
                            ? buildPath(metaNow.parent, metaNow.key)
                            : [];
                    if (key === "add") {
                        const entry = args[0];

                        // Call propGenerator for object entries to allow ID generation and extra props
                        if (
                            entry &&
                            typeof entry === "object" &&
                            entry.constructor === Object &&
                            metaNow.options?.propGenerator
                        ) {
                            const result = metaNow.options.propGenerator({
                                path: containerPath,
                                inSet: true,
                                object: entry,
                            });

                            // Add synthetic id if specified and not already present
                            if (
                                metaNow.options.syntheticIdPropertyName &&
                                result.syntheticId !== undefined &&
                                !(
                                    metaNow.options.syntheticIdPropertyName in
                                    entry
                                )
                            ) {
                                Object.defineProperty(
                                    entry,
                                    metaNow.options.syntheticIdPropertyName,
                                    {
                                        value: result.syntheticId,
                                        writable: false,
                                        enumerable: true,
                                        configurable: false,
                                    }
                                );
                                // Also record in setObjectIds so key resolution is stable without re-running generator
                                setObjectIds.set(
                                    entry,
                                    String(result.syntheticId)
                                );
                            }
                        }

                        let synthetic = getSetEntryKey(
                            entry,
                            metaNow.options,
                            containerPath,
                            true
                        );
                        if (entry && typeof entry === "object") {
                            for (const existing of raw.values()) {
                                if (existing === entry) continue;
                                if (
                                    getSetEntryKey(
                                        existing,
                                        metaNow.options
                                    ) === synthetic
                                ) {
                                    synthetic = assignBlankNodeId(entry);
                                    break;
                                }
                            }
                        }
                        let entryVal = entry;
                        if (
                            entryVal &&
                            typeof entryVal === "object" &&
                            shouldProxy(entryVal) &&
                            !objToProxy.has(entryVal)
                        ) {
                            const childProxy = createProxy(
                                entryVal,
                                objectHandlers,
                                metaNow.root,
                                metaNow.options
                            );
                            const childMeta = proxyMeta.get(childProxy)!;
                            childMeta.parent = receiver;
                            childMeta.key = synthetic;
                            childMeta.isSyntheticId = true; // Mark as synthetic ID (should not be escaped)
                            objToProxy.set(entryVal, childProxy);
                            proxyToRaw.set(childProxy, entryVal);
                            entryVal = childProxy;
                        }
                        // Set entry add: emit object vs primitive variant.
                        if (entryVal && typeof entryVal === "object") {
                            // Object entry: path includes synthetic id, and emit deep patches for nested properties
                            queueDeepPatches(
                                entry,
                                metaNow.root,
                                [...containerPath, synthetic],
                                metaNow.options
                            );
                            // Update index if it exists (incremental update for O(1) lookups)
                            addToSetIndex(raw, entry, synthetic);
                        } else {
                            // Primitive entry: path is just the Set, value contains the primitive
                            queuePatch({
                                root: metaNow.root,
                                path: containerPath,
                                op: "add",
                                type: "set",
                                value: [entryVal],
                            });
                        }
                    } else if (key === "delete") {
                        // Use the original entry (before proxy-to-raw conversion) for getting the synthetic key
                        const entry = originalEntry;
                        const synthetic = getSetEntryKey(
                            entry,
                            metaNow.options
                        );
                        // Check if entry is primitive or object
                        if (entry && typeof entry === "object") {
                            // Object entry: path includes synthetic id
                            queuePatch({
                                root: metaNow.root,
                                path: [...containerPath, synthetic],
                                op: "remove",
                            });
                            // Update index if it exists
                            removeFromSetIndex(raw, synthetic);
                        } else {
                            // Primitive entry: path is just the Set, value contains the primitive
                            queuePatch({
                                root: metaNow.root,
                                path: containerPath,
                                op: "remove",
                                type: "set",
                                value: entry,
                            });
                        }
                    } else if (key === "clear") {
                        // Structural clear: remove prior entry-level patches for this Set this tick.
                        if (pendingPatches) {
                            const group = pendingPatches.get(metaNow.root);
                            if (group && group.length) {
                                for (let i = group.length - 1; i >= 0; i--) {
                                    const p = group[i];
                                    if (
                                        p.path.length ===
                                            containerPath.length + 1 &&
                                        containerPath.every(
                                            (seg, idx) => p.path[idx] === seg
                                        )
                                    ) {
                                        group.splice(i, 1);
                                    }
                                }
                            }
                        }
                        queuePatch({
                            root: metaNow.root,
                            path: containerPath,
                            op: "add",
                            type: "set",
                            value: [],
                        });
                        // Clear the index if it exists
                        clearSetIndex(raw);
                    }
                }
            }
            return result;
        };
    }
    const makeIterator = (pair: boolean) => {
        return function thisIter(this: any) {
            const iterable = raw.values();
            // Create an Iterator that inherits Iterator.prototype methods (map, filter, etc.)
            // Wrap the iterator to proxy entries on-demand
            const wrappedIterator = {
                next() {
                    const n = iterable.next();
                    if (n.done) return n;
                    const entry = ensureEntryProxy(n.value);
                    return {
                        value: pair ? [entry, entry] : entry,
                        done: false,
                    };
                },
            };
            // Set the prototype to Iterator.prototype if available (ES2023+ Iterator Helpers)
            if (typeof Iterator !== "undefined" && Iterator.prototype) {
                Object.setPrototypeOf(wrappedIterator, Iterator.prototype);
            }
            return wrappedIterator;
        };
    };
    if (key === "values" || key === "keys") return makeIterator(false);
    if (key === "entries") return makeIterator(true);
    if (key === "forEach") {
        return function thisForEach(this: any, cb: any, thisArg?: any) {
            raw.forEach((entry: any) => {
                cb.call(
                    thisArg,
                    ensureEntryProxy(entry),
                    ensureEntryProxy(entry),
                    raw
                );
            });
        };
    }
    // Custom methods for retrieving entries by synthetic ID
    if (key === "getById") {
        return function getById(
            this: any,
            id: string | number
        ): any | undefined {
            const idStr = String(id);
            // Use O(1) indexed lookup if available, build index lazily on first access
            const index = ensureSetIndex(raw, meta?.options);
            const entry = index.get(idStr);
            return entry ? ensureEntryProxy(entry) : undefined;
        };
    }
    if (key === "getBy") {
        return function getBy(
            this: any,
            graphIri: string,
            subjectIri: string
        ): any | undefined {
            const id = `${graphIri}|${subjectIri}`;
            return (receiver as any).getById(id);
        };
    }
    // Properly handle native iteration (for..of, Array.from, spread) by binding to the raw Set.
    if (key === Symbol.iterator) {
        // Return a function whose `this` is the raw Set (avoids brand check failure on the proxy).
        return function (this: any) {
            // Use raw.values() so we can still ensure child entries are proxied lazily.
            const iterable = raw.values();
            return {
                [Symbol.iterator]() {
                    return this;
                },
                next() {
                    const n = iterable.next();
                    if (n.done) return n;
                    const entry = ensureEntryProxy(n.value);
                    return { value: entry, done: false };
                },
            } as Iterator<any>;
        };
    }
    if (key === Symbol.iterator.toString()) {
        // string form access of iterator symbol; pass through (rare path)
    }
    const val = (raw as any)[key];
    if (typeof val === "function") return val.bind(raw);
    return val;
}

const throwOnMutation = () => {
    throw new Error(
        "Don't mutate the signals directly (use the underlying property/value instead)."
    );
};

// Does target define a getter for key?
function hasGetter(target: any, key: any) {
    return typeof descriptor(target, key)?.get === "function";
}

// Lazily allocate / fetch signal map for a proxy receiver.
function getSignals(receiver: object) {
    if (!proxyToSignals.has(receiver)) proxyToSignals.set(receiver, new Map());
    return proxyToSignals.get(receiver)!;
}

// Wrap & link child object/array/Set if needed.
function ensureChildProxy(value: any, parent: object, key: string | number) {
    if (!shouldProxy(value)) return value;
    if (!objToProxy.has(value)) {
        const parentMeta = proxyMeta.get(parent)!;
        const childProxy = createProxy(
            value,
            objectHandlers,
            parentMeta.root,
            parentMeta.options
        );
        const childMeta = proxyMeta.get(childProxy)!;
        childMeta.parent = parent;
        childMeta.key = key as string;
        objToProxy.set(value, childProxy);
    }
    return objToProxy.get(value);
}

// Normalize raw property key (handles $-prefix & array meta) -> { key, returnSignal }
function normalizeKey(
    target: any,
    fullKey: string,
    isArrayMeta: boolean,
    receiver: object
) {
    let returnSignal = isArrayMeta || fullKey[0] === "$";
    if (!isArrayMeta && Array.isArray(target) && returnSignal) {
        if (fullKey === "$") {
            // Provide $ meta proxy for array index signals
            if (!arrayToArrayOfSignals.has(target)) {
                const receiverMeta = proxyMeta.get(receiver);
                arrayToArrayOfSignals.set(
                    target,
                    createProxy(
                        target,
                        arrayHandlers,
                        receiverMeta?.root,
                        receiverMeta?.options
                    )
                );
            }
            return { shortCircuit: arrayToArrayOfSignals.get(target) };
        }
        returnSignal = fullKey === "$length";
    }
    const key = returnSignal ? fullKey.replace(rg, "") : fullKey;
    return { key, returnSignal } as any;
}

// Create computed signal for getter property if needed.
function ensureComputed(
    signals: Map<any, any>,
    target: any,
    key: any,
    receiver: any
) {
    if (!signals.has(key) && hasGetter(target, key)) {
        signals.set(
            key,
            computed(() => Reflect.get(target, key, receiver))
        );
    }
}

// Unified get trap factory (object / array meta variant)
const get =
    (isArrayMeta: boolean) =>
    (target: object, fullKey: string, receiver: object): unknown => {
        if (peeking) return Reflect.get(target, fullKey, receiver);
        // Set handling delegated completely.
        if (target instanceof Set) {
            return getFromSet(target as Set<any>, fullKey as any, receiver);
        }
        // Special case: accessing `$` on a non-array object returns the raw target
        if (fullKey === "$" && !Array.isArray(target)) {
            return target;
        }
        const norm = normalizeKey(target, fullKey, isArrayMeta, receiver);
        if ((norm as any).shortCircuit) return (norm as any).shortCircuit; // returned meta proxy
        const { key, returnSignal } = norm as {
            key: string;
            returnSignal: boolean;
        };
        // Symbol fast-path
        if (typeof key === "symbol" && wellKnownSymbols.has(key))
            return Reflect.get(target, key, receiver);
        const signals = getSignals(receiver);
        ensureComputed(signals, target, key, receiver);
        if (!signals.has(key)) {
            let value = Reflect.get(target, key, receiver);
            if (returnSignal && typeof value === "function") return; // user asked for signal wrapper of function => ignore
            value = ensureChildProxy(value, receiver, key);
            signals.set(key, signal(value));
        }
        const sig = signals.get(key);
        return returnSignal ? sig : sig();
    };

// Standard object / array handlers
const objectHandlers = {
    get: get(false),
    set(target: object, fullKey: string, val: any, receiver: object): boolean {
        // Prevent modification of readonly properties
        const meta = proxyMeta.get(receiver);
        if (meta?.options?.readOnlyProps?.includes(fullKey)) {
            throw new Error(`Cannot modify readonly property '${fullKey}'`);
        }
        // Respect original getter/setter semantics
        if (typeof descriptor(target, fullKey)?.set === "function")
            return Reflect.set(target, fullKey, val, receiver);
        if (!proxyToSignals.has(receiver))
            proxyToSignals.set(receiver, new Map());
        const signals = proxyToSignals.get(receiver);
        if (fullKey[0] === "$") {
            if (!isSignal(val)) throwOnMutation();
            const key = fullKey.replace(rg, "");
            signals.set(key, val);
            return Reflect.set(target, key, val.peek(), receiver);
        } else {
            let internal = val;
            if (shouldProxy(val)) {
                if (!objToProxy.has(val)) {
                    // Link newly wrapped child to its parent for path reconstruction.
                    // In some edge cases parent metadata might not yet be initialized (e.g.,
                    // if a proxied structure was reconstructed in a way that bypassed the
                    // original deepSignal root path). Fall back to creating/assigning it.
                    let parentMeta = proxyMeta.get(receiver);
                    if (!parentMeta) {
                        // Assign a root id (new symbol) so downstream patches remain groupable.
                        const created: ProxyMeta = {
                            root: Symbol("deepSignalRootAuto"),
                        } as ProxyMeta;
                        proxyMeta.set(receiver, created);
                        parentMeta = created;
                    }
                    const childProxy = createProxy(
                        val,
                        objectHandlers,
                        parentMeta!.root,
                        parentMeta!.options
                    );
                    const childMeta = proxyMeta.get(childProxy)!;
                    childMeta.parent = receiver;
                    childMeta.key = fullKey;
                    objToProxy.set(val, childProxy);
                }
                internal = objToProxy.get(val);
            }
            const isNew = !(fullKey in target);
            const oldValue = isNew ? undefined : (target as any)[fullKey];
            const oldWasObject = oldValue && typeof oldValue === "object";
            const result = Reflect.set(target, fullKey, val, receiver);

            if (!signals.has(fullKey)) {
                // First write after structure change -> create signal.
                signals.set(fullKey, signal(internal));
            } else {
                // Subsequent writes -> update underlying signal.
                signals.get(fullKey).set(internal);
            }
            if (isNew && objToIterable.has(target))
                objToIterable.get(target).value++;
            if (Array.isArray(target) && signals.has("length"))
                signals.get("length").set(target.length);
            // Emit patch (after mutation) so subscribers get final value snapshot.
            const meta = proxyMeta.get(receiver);
            if (meta) {
                const newIsObject = val && typeof val === "object";

                if (isNew || !oldWasObject) {
                    // Emit deep patches for:
                    // 1. NEW properties (initial add), OR
                    // 2. Existing properties where old value was NOT an object (null, primitive, etc.)
                    //    This handles cases like { data: null } -> { data: { ... } }
                    queueDeepPatches(
                        val,
                        meta.root,
                        buildPath(receiver, fullKey),
                        meta.options
                    );
                } else if (!newIsObject) {
                    // For updates to EXISTING properties with primitive NEW values, emit a single patch.
                    queuePatch({
                        root: meta.root,
                        path: buildPath(receiver, fullKey),
                        op: "add",
                        value: val,
                    });
                }
                // For updates where BOTH old and new values are objects (e.g., replacing one Set with another),
                // don't emit deep patches - the new value is now tracked, and subsequent
                // mutations will emit their own patches through Set/Array/Object operations.
            }
            return result;
        }
    },
    deleteProperty(target: object, key: string): boolean {
        if (key[0] === "$") throwOnMutation();
        const signals = proxyToSignals.get(objToProxy.get(target));
        const result = Reflect.deleteProperty(target, key);
        if (signals && signals.has(key)) signals.get(key).value = undefined;
        objToIterable.has(target) && objToIterable.get(target).value++;
        // Emit deletion patch
        const receiverProxy = objToProxy.get(target);
        const meta = receiverProxy && proxyMeta.get(receiverProxy);
        if (meta) {
            queuePatch({
                root: meta.root,
                path: buildPath(receiverProxy, key),
                op: "remove",
            });
        }
        return result;
    },
    ownKeys(target: object): (string | symbol)[] {
        if (!objToIterable.has(target)) objToIterable.set(target, signal(0));
        (objToIterable as any)._ = objToIterable.get(target).get();
        return Reflect.ownKeys(target);
    },
};

// Array `$` meta proxy handlers (index signals only)
const arrayHandlers = {
    get: get(true),
    set: throwOnMutation,
    deleteProperty: throwOnMutation,
};

const wellKnownSymbols = new Set(
    Object.getOwnPropertyNames(Symbol)
        .map((key) => Symbol[key as WellKnownSymbols])
        .filter((value) => typeof value === "symbol")
);
// Supported constructors (Map intentionally excluded for now)
const supported = new Set([Object, Array, Set]);
const shouldProxy = (val: any): boolean => {
    if (typeof val !== "object" || val === null) return false;
    return supported.has(val.constructor) && !ignore.has(val);
};

/** TYPES **/ // Structural deep reactive view of an input type.
export type DeepSignal<T> = T extends Function
    ? T
    : T extends { [shallowFlag]: true }
      ? T
      : T extends Set<infer U>
        ? DeepSignalSet<U>
        : T extends Array<unknown>
          ? DeepSignalArray<T>
          : T extends object
            ? DeepSignalObject<T>
            : T;

/** Recursive mapped type converting an object graph into its deepSignal proxy shape. */
export type DeepSignalObject<T extends object> = {
    [P in keyof T & string as `$${P}`]?: T[P] extends Function
        ? never
        : ReturnType<typeof signal<T[P]>>;
} & {
    [P in keyof T]: DeepSignal<T[P]>;
} & {
    /** Access the raw (unwrapped) object without reactivity tracking. */
    $?: T;
};

/** Extract element type from an array. */
type ArrayType<T> = T extends Array<infer I> ? I : T;
/** DeepSignal-enhanced array type (numeric indices & `$` meta accessors). */
type DeepSignalArray<T> = DeepArray<ArrayType<T>> & {
    [key: number]: DeepSignal<ArrayType<T>>;
    $?: { [key: number]: ReturnType<typeof signal<ArrayType<T>>> };
    $length?: ReturnType<typeof signal<number>>;
};

/** DeepSignal-enhanced Set type with custom query methods. */
export type DeepSignalSet<T> = Omit<
    Set<DeepSignal<T>>,
    "add" | "delete" | "clear"
> & {
    /** Add an element to the set. */
    add(value: T): DeepSignalSet<T>;
    /** Delete an element from the set. */
    delete(value: T): boolean;
    /** Clear all elements from the set. */
    clear(): void;
    /**
     * Retrieve an entry from the Set by its synthetic ID.
     * @param id - The synthetic ID (string or number) assigned to the entry.
     * @returns The proxied entry if found, undefined otherwise.
     */
    getById(id: string | number): DeepSignal<T> | undefined;
    /**
     * Retrieve an entry from the Set by constructing an ID from graphIri and subjectIri.
     * This is a convenience method that constructs the ID as "graphIri|subjectIri".
     * @param graphIri - The graph IRI part of the identifier.
     * @param subjectIri - The subject IRI part of the identifier.
     * @returns The proxied entry if found, undefined otherwise.
     */
    // NOTE: This is a bad separation of concerns here.
    getBy(graphIri: string, subjectIri: string): DeepSignal<T> | undefined;
    /** Access the raw (unwrapped) Set without reactivity tracking. */
    $?: Set<T>;
};

/** Marker utility type for objects passed through without deep proxying. */
export type Shallow<T extends object> = T & { [shallowFlag]: true };

/** Framework adapter hook returning a DeepSignal proxy. */
export declare const useDeepSignal: <T extends object>(obj: T) => DeepSignal<T>;
// @ts-ignore
// Strip `$`-prefixed synthetic signal accessors from key union.
type FilterSignals<K> = K extends `$${string}` ? never : K;
/** Reverse of DeepSignalObject: remove signal accessors to obtain original object shape. */
type RevertDeepSignalObject<T> = Pick<T, FilterSignals<keyof T>>;
/** Reverse of DeepSignalArray: omit meta accessors. */
type RevertDeepSignalArray<T> = Omit<T, "$" | "$length">;

/** Inverse mapped type removing deepSignal wrapper affordances. */
export type RevertDeepSignal<T> =
    T extends Array<unknown>
        ? RevertDeepSignalArray<T>
        : T extends object
          ? RevertDeepSignalObject<T>
          : T;

/** Subset of ECMAScript well-known symbols we explicitly pass through without proxy wrapping. */
type WellKnownSymbols =
    | "asyncIterator"
    | "hasInstance"
    | "isConcatSpreadable"
    | "iterator"
    | "match"
    | "matchAll"
    | "replace"
    | "search"
    | "species"
    | "split"
    | "toPrimitive"
    | "toStringTag"
    | "unscopables";
