// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { computed, signal, isSignal } from "./core";

/** Deep mutation emitted from a deepSignal root. */
export type DeepPatch = {
    path: (string | number)[];
} & (
    | { op: "add"; type?: "object" | "set"; value?: any }
    | { op: "remove"; type?: "set"; value?: any }
);

/** Batched patch payload tagged with a monotonically increasing version. */
export interface DeepPatchBatch {
    version: number;
    patches: DeepPatch[];
}

export type DeepPatchSubscriber = (batch: DeepPatchBatch) => void;

export interface DeepSignalOptions {
    propGenerator?: DeepSignalPropGenFn;
    syntheticIdPropertyName?: string;
    readOnlyProps?: string[];
}

export type DeepSignalPropGenFn = (props: {
    path: (string | number)[];
    inSet: boolean;
    object: any;
}) => {
    syntheticId?: string | number;
    extraProps?: Record<string, unknown>;
};

interface ProxyMeta {
    raw: object;
    parent?: object;
    key?: string | number | symbol;
    isSyntheticId?: boolean;
    root: symbol;
    options?: DeepSignalOptions;
    setInfo?: SetMeta;
}

interface SetMeta {
    idForObject: WeakMap<object, string>;
    objectForId: Map<string, object>;
}

interface RootState {
    options?: DeepSignalOptions;
    version: number;
    listeners: Set<DeepPatchSubscriber>;
    pending: DeepPatch[];
}

type WritableSignal<T = any> = ReturnType<typeof signal<T>>;
type ComputedSignal<T = any> = ReturnType<typeof computed<T>>;
type SignalLike<T = any> = WritableSignal<T> | ComputedSignal<T>;

const rawToProxy = new WeakMap<object, any>();
const proxyToMeta = new WeakMap<object, ProxyMeta>();
const proxySignals = new WeakMap<object, Map<PropertyKey, SignalLike>>();
const iterableSignals = new WeakMap<
    object,
    ReturnType<typeof signal<number>>
>();
const ignored = new WeakSet<object>();
const rootStates = new Map<symbol, RootState>();
const pendingRoots = new Set<symbol>();
const supported = new Set([Object, Array, Set]);
const descriptor = Object.getOwnPropertyDescriptor;
let peeking = false;
let blankNodeCounter = 0;
const wellKnownSymbols = new Set<symbol>([
    Symbol.iterator,
    Symbol.asyncIterator,
    Symbol.hasInstance,
    Symbol.isConcatSpreadable,
    Symbol.match,
    Symbol.matchAll,
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

/**
 * Lookup the metadata record backing a proxy (if the value is proxied).
 * Returns undefined for non-object inputs or values that never went through deepSignal().
 */
function getMeta(target: any): ProxyMeta | undefined {
    if (!target || typeof target !== "object") return undefined;
    return proxyToMeta.get(target as object);
}

/**
 * Resolve the raw underlying object for a possibly proxied value.
 * Falls back to the value itself when no proxy metadata is attached.
 */
function getRaw<T>(value: T): T {
    const meta = getMeta(value);
    return (meta?.raw as T) ?? value;
}

/** Attach ProxyMeta bookkeeping to a freshly created proxy instance. */
function attachMetadata(proxy: any, meta: ProxyMeta) {
    proxyToMeta.set(proxy, meta);
}

/** Decide whether the runtime should wrap the value in a deepSignal proxy. */
function shouldProxy(value: any): value is object {
    return (
        !!value &&
        typeof value === "object" &&
        supported.has(value.constructor) &&
        !ignored.has(value)
    );
}

/**
 * Lazily allocate (and cache) the per-proxy signal map tracking tracked properties.
 */
function ensureSignalMap(proxy: object): Map<PropertyKey, SignalLike> {
    if (!proxySignals.has(proxy)) proxySignals.set(proxy, new Map());
    return proxySignals.get(proxy)!;
}

/**
 * Write a new value into a cached signal, creating it if needed.
 * Guards against computed signals, which do not expose a writable interface.
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
 * Lazily materialize a computed signal for accessor properties so reactivity can track them.
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
        cursor = getMeta(cursor.parent);
    }
    return path;
}

/** Resolve the path for a container itself (without the child key appended). */
function resolveContainerPath(meta: ProxyMeta | undefined) {
    if (!meta || !meta.parent || meta.key === undefined) return [];
    const parentMeta = getMeta(meta.parent);
    return buildPath(parentMeta, meta.key, !!meta.isSyntheticId);
}

/** Queue a microtask flush for the given deepSignal root if not already pending. */
function queueFlush(rootId: symbol) {
    if (pendingRoots.has(rootId)) return;
    pendingRoots.add(rootId);
    queueMicrotask(() => flushRoot(rootId));
}

/** Deliver the pending patch batch (if any) to listeners registered on the root. */
function flushRoot(rootId: symbol) {
    pendingRoots.delete(rootId);
    const state = rootStates.get(rootId);
    if (!state) return;
    if (!state.pending.length || state.listeners.size === 0) {
        state.pending.length = 0;
        return;
    }
    state.version += 1;
    const batch: DeepPatchBatch = {
        version: state.version,
        patches: state.pending.slice(),
    };
    state.pending.length = 0;
    state.listeners.forEach((cb) => cb(batch));
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
    if (!state || state.listeners.size === 0) return;
    const result = build();
    if (!result) return;
    const patches = Array.isArray(result) ? result : [result];
    if (!patches.length) return;
    state.pending.push(...patches);
    queueFlush(meta.root);
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
            if (!(k in value) || value[k] === "") {
                value[k] = v;
            }
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

/** Recursively seed synthetic IDs/extra props when the system is idle. */
function hydrateValueTree(
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
                hydrateValueTree(meta, entry, [...basePath, idx], false);
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
                hydrateValueTree(meta, entry, [...basePath, synthetic], true);
            }
        }
        return;
    }
    if (value.constructor !== Object) return;

    applyPropGeneratorResult(meta, value, basePath, inSet);

    Object.keys(value).forEach((childKey) => {
        if (childKey === "@id") return;
        const child = value[childKey];
        if (child && typeof child === "object") {
            hydrateValueTree(meta, child, [...basePath, childKey], false);
        }
    });
}

/** Apply prop generator side-effects only when the root has no live subscribers. */
function hydrateValueIfIdle(
    meta: ProxyMeta | undefined,
    basePath: (string | number)[] | undefined,
    value: any,
    inSet: boolean
) {
    if (!meta || !meta.options?.propGenerator) return;
    if (!value || typeof value !== "object") return;
    const state = rootStates.get(meta.root);
    if (state && state.listeners.size > 0) return;
    hydrateValueTree(meta, value, basePath ?? [], inSet);
}

/**
 * Return (or create) a proxy for a nested value, updating parent metadata linkage.
 */
function ensureChildProxy(
    value: any,
    parentProxy: any,
    key: PropertyKey,
    isSyntheticId = false
) {
    if (!shouldProxy(value)) return value;
    if (rawToProxy.has(value)) {
        const child = rawToProxy.get(value);
        const childMeta = getMeta(child);
        if (childMeta) {
            childMeta.parent = parentProxy;
            childMeta.key = key;
            childMeta.isSyntheticId = isSyntheticId;
        }
        return child;
    }
    const parentMeta = getMeta(parentProxy);
    if (!parentMeta) return value;
    const proxy = createProxy(
        value,
        parentMeta.root,
        parentMeta.options,
        parentProxy,
        key,
        isSyntheticId
    );
    return proxy;
}

/** Lazily instantiate the Set-specific bookkeeping hanging off ProxyMeta. */
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
 * Assign (or reuse) a synthetic identifier for a Set entry, respecting user options.
 */
function assignSyntheticId(
    meta: ProxyMeta,
    entry: any,
    path: (string | number)[],
    inSet: boolean
) {
    const rawEntry = getRaw(entry);
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
    if (synthetic === undefined && generatorValue?.syntheticId !== undefined) {
        synthetic = generatorValue.syntheticId;
    }
    if (
        generatorValue?.extraProps &&
        rawEntry &&
        typeof rawEntry === "object"
    ) {
        Object.entries(generatorValue.extraProps).forEach(([k, v]) => {
            if (!(k in rawEntry) || rawEntry[k] === "") {
                rawEntry[k] = v;
            }
        });
    }
    const customProp = meta.options?.syntheticIdPropertyName;
    if (
        synthetic === undefined &&
        customProp &&
        rawEntry &&
        typeof rawEntry === "object" &&
        rawEntry[customProp] !== undefined
    ) {
        synthetic = rawEntry[customProp];
    }
    if (synthetic === undefined) {
        synthetic = `_s${++blankNodeCounter}`;
    }
    const idString = String(synthetic);
    info.idForObject.set(rawEntry, idString);
    info.objectForId.set(idString, rawEntry);
    if (
        customProp &&
        rawEntry &&
        typeof rawEntry === "object" &&
        !(customProp in rawEntry)
    ) {
        Object.defineProperty(rawEntry, customProp, {
            value: idString,
            enumerable: true,
            configurable: false,
            writable: false,
        });
    }
    return idString;
}

/** Create the appropriate proxy (object vs Set) and track its metadata. */
function createProxy(
    target: object,
    root: symbol,
    options?: DeepSignalOptions,
    parent?: object,
    key?: PropertyKey,
    isSyntheticId?: boolean
) {
    const handlers = target instanceof Set ? setHandlers : objectHandlers;
    const proxy = new Proxy(target, handlers);
    const meta: ProxyMeta = {
        raw: target,
        parent,
        key,
        isSyntheticId,
        root,
        options,
    };
    attachMetadata(proxy, meta);
    proxySignals.set(proxy, new Map());
    rawToProxy.set(target, proxy);
    return proxy;
}

/** Normalize a value prior to writes, ensuring nested objects are proxied. */
function ensureValueForWrite(value: any, receiver: any, key: PropertyKey) {
    const rawValue = getRaw(value);
    const proxied = shouldProxy(rawValue)
        ? ensureChildProxy(rawValue, receiver, key)
        : rawValue;
    return { raw: rawValue, proxied };
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
 * Emit a recursive snapshot patch sequence for initial object/set/array state.
 */
function emitSnapshot(
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
            type: value instanceof Set ? "set" : "object",
            value: value instanceof Set ? [] : undefined,
        },
    ];
    if ("@id" in value) {
        const literal = snapshotLiteral((value as any)["@id"]);
        if (literal !== undefined) {
            patches.push({
                path: [...basePath, "@id"],
                op: "add",
                value: literal,
            });
        }
    }
    if (Array.isArray(value)) {
        value.forEach((entry, idx) => {
            patches.push(...emitSnapshot(entry, meta, [...basePath, idx]));
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
                    ...emitSnapshot(entry, meta, [...basePath, synthetic], true)
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
            if (childKey === "@id") return;
            patches.push(
                ...emitSnapshot(value[childKey], meta, [...basePath, childKey])
            );
        });
    }
    return patches;
}

/** Proxy handler driving reactivity for plain objects and arrays. */
const objectHandlers: ProxyHandler<any> = {
    get(target, key, receiver) {
        if (peeking) return Reflect.get(target, key, receiver);
        if (key === RAW_KEY) return getMeta(receiver)?.raw ?? target;
        if (key === META_KEY) return getMeta(receiver);
        if (typeof key === "symbol" && !isReactiveSymbol(key))
            return Reflect.get(target, key, receiver);
        const signals = ensureSignalMap(receiver);
        ensureComputed(signals, target, key, receiver);
        if (!signals.has(key)) {
            let value = Reflect.get(target, key, receiver);
            if (typeof value === "function")
                return value.bind((receiver as any) ?? target);
            value = shouldProxy(value)
                ? ensureChildProxy(value, receiver, key)
                : value;
            signals.set(key, signal(value));
        }
        const sig = signals.get(key)!;
        return (sig as any)();
    },
    set(target, key, value, receiver) {
        if (typeof key === "symbol" && !isReactiveSymbol(key))
            return Reflect.set(target, key, value, receiver);
        const meta = getMeta(receiver);
        if (meta?.options?.readOnlyProps?.includes(String(key))) {
            throw new Error(`Cannot modify readonly property '${String(key)}'`);
        }
        const path = meta ? buildPath(meta, key) : undefined;
        const desc = descriptor(target, key);
        const hasAccessor =
            !!desc &&
            (typeof desc.get === "function" || typeof desc.set === "function");
        const { raw, proxied } = ensureValueForWrite(value, receiver, key);
        const hadKey = Object.prototype.hasOwnProperty.call(target, key);
        const previous = hadKey ? (target as any)[key] : undefined;
        const result = Reflect.set(target, key, raw, receiver);
        if (!hasAccessor) {
            const signals = ensureSignalMap(receiver);
            setSignalValue(signals, key, proxied);
        }
        if (!hadKey) touchIterable(target);
        if (meta && path && typeof raw === "object") {
            hydrateValueIfIdle(meta, path, raw, false);
        }
        schedulePatch(meta, () => {
            const resolvedPath = path ?? buildPath(meta, key);
            if (!hadKey || typeof raw === "object") {
                return emitSnapshot(raw, meta!, resolvedPath);
            }
            if (snapshotLiteral(raw) === undefined) return undefined;
            return {
                path: resolvedPath,
                op: "add",
                value: raw,
            };
        });
        return result;
    },
    deleteProperty(target, key) {
        if (typeof key === "symbol" && !isReactiveSymbol(key))
            return Reflect.deleteProperty(target, key);
        const receiver = rawToProxy.get(target);
        const meta = receiver ? getMeta(receiver) : undefined;
        const hadKey = Object.prototype.hasOwnProperty.call(target, key);
        const result = Reflect.deleteProperty(target, key);
        if (hadKey) {
            if (receiver && proxySignals.has(receiver)) {
                const signals = proxySignals.get(receiver)!;
                const existing = signals.get(key);
                if (
                    existing &&
                    typeof (existing as WritableSignal).set === "function"
                ) {
                    (existing as WritableSignal).set(undefined);
                }
                signals.delete(key);
            }
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
    receiver: any,
    entry: any,
    syntheticKey: string | number,
    meta: ProxyMeta
) {
    return shouldProxy(entry)
        ? ensureChildProxy(entry, receiver, syntheticKey, true)
        : entry;
}

/** Wrap the underlying Set iterator so each value is proxied before leaving the trap. */
function createSetIterator(
    target: Set<any>,
    receiver: any,
    mapValue: (value: any) => any
) {
    const iterator = target.values();
    return {
        [Symbol.iterator]() {
            return this;
        },
        next() {
            const next = iterator.next();
            if (next.done) return next;
            const meta = getMeta(receiver)!;
            const proxied = ensureEntryProxy(
                receiver,
                next.value,
                assignSyntheticId(meta, next.value, [], true),
                meta
            );
            return {
                value: mapValue(proxied),
                done: false,
            };
        },
    };
}

/** Proxy handler providing deep-signal semantics for native Set instances. */
const setHandlers: ProxyHandler<Set<any>> = {
    get(target, key, receiver) {
        if (key === RAW_KEY) return getMeta(receiver)?.raw ?? target;
        if (key === META_KEY) return getMeta(receiver);
        if (key === "size") {
            const sig = ensureIterableSignal(target);
            sig();
            return target.size;
        }
        if (key === "first") {
            return function first() {
                const iterator = target.values().next();
                if (iterator.done) return undefined;
                const meta = getMeta(receiver)!;
                return ensureEntryProxy(
                    receiver,
                    iterator.value,
                    assignSyntheticId(meta, iterator.value, [], true),
                    meta
                );
            };
        }
        if (key === "getById") {
            return function getById(this: any, id: string | number) {
                const meta = getMeta(receiver);
                if (!meta?.setInfo) return undefined;
                const entry = meta.setInfo.objectForId.get(String(id));
                if (!entry) return undefined;
                return ensureEntryProxy(receiver, entry, String(id), meta);
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
                const meta = getMeta(receiver)!;
                const containerPath = resolveContainerPath(meta);
                const rawValue = getRaw(value);
                const sizeBefore = target.size;
                const result = target.add(rawValue);
                if (target.size !== sizeBefore) {
                    touchIterable(target);
                    if (rawValue && typeof rawValue === "object") {
                        const synthetic = assignSyntheticId(
                            meta,
                            rawValue,
                            containerPath,
                            true
                        );
                        hydrateValueIfIdle(
                            meta,
                            [...containerPath, synthetic],
                            rawValue,
                            true
                        );
                        ensureEntryProxy(receiver, rawValue, synthetic, meta);
                        schedulePatch(meta, () =>
                            emitSnapshot(
                                rawValue,
                                meta,
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
                const meta = getMeta(receiver)!;
                const containerPath = resolveContainerPath(meta);
                const rawValue = getRaw(value);
                const synthetic =
                    rawValue && typeof rawValue === "object"
                        ? ensureSetInfo(meta).idForObject.get(rawValue)
                        : rawValue;
                const existed = target.delete(rawValue);
                if (existed && synthetic !== undefined) {
                    touchIterable(target);
                    if (rawValue && typeof rawValue === "object") {
                        schedulePatch(meta, () => ({
                            path: [...containerPath, synthetic as string],
                            op: "remove",
                        }));
                        if (meta.setInfo) {
                            meta.setInfo.objectForId.delete(String(synthetic));
                            meta.setInfo.idForObject.delete(rawValue);
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
                const meta = getMeta(receiver)!;
                const containerPath = resolveContainerPath(meta);
                if (meta.setInfo) {
                    meta.setInfo.objectForId.clear();
                    meta.setInfo.idForObject = new WeakMap();
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
        if (key === "forEach") {
            return function forEach(
                this: any,
                callback: (value: any, value2: any, set: Set<any>) => void,
                thisArg?: any
            ) {
                const meta = getMeta(receiver)!;
                target.forEach((entry) => {
                    const proxied = ensureEntryProxy(
                        receiver,
                        entry,
                        assignSyntheticId(meta, entry, [], true),
                        meta
                    );
                    callback.call(thisArg, proxied, proxied, receiver);
                });
            };
        }
        if (key === "has") {
            return function has(this: any, value: any) {
                return target.has(getRaw(value));
            };
        }
        return Reflect.get(target, key, receiver);
    },
};

/** Runtime guard that checks whether a value is a deepSignal proxy. */
export function isDeepSignal(value: any): boolean {
    return !!getMeta(value);
}

export type DeepSignal<T> = T extends Function
    ? T
    : T extends Array<infer I>
      ? DeepSignal<I>[] & { [RAW_KEY]?: T; [META_KEY]?: ProxyMeta }
      : T extends Set<infer S>
        ? Set<DeepSignal<S>> & {
              add(value: S): Set<DeepSignal<S>>;
              delete(value: S): boolean;
              clear(): void;
              first(): DeepSignal<S> | undefined;
              getById(id: string | number): DeepSignal<S> | undefined;
              getBy(
                  graphIri: string,
                  subjectIri: string
              ): DeepSignal<S> | undefined;
              [RAW_KEY]?: Set<S>;
              [META_KEY]?: ProxyMeta;
          }
        : T extends object
          ? { [K in keyof T]: DeepSignal<T[K]> } & {
                [RAW_KEY]?: T;
                [META_KEY]?: ProxyMeta;
            }
          : T;

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
    rootStates.set(root, {
        options,
        version: 0,
        listeners: new Set(),
        pending: [],
    });
    const proxy = createProxy(input, root, options);
    return proxy as DeepSignal<T>;
}

/** Register a deep mutation subscriber for the provided root or proxy. */
export function subscribeDeepMutations(
    root: object | symbol,
    cb: DeepPatchSubscriber
): () => void {
    const rootId = typeof root === "symbol" ? root : getDeepSignalRootId(root);
    if (!rootId)
        throw new Error("subscribeDeepMutations() expects a deepSignal root");
    const state = rootStates.get(rootId);
    if (!state) throw new Error("Unknown deepSignal root");
    state.listeners.add(cb);
    return () => {
        state.listeners.delete(cb);
    };
}

/** Return the root identifier symbol for a deepSignal proxy (if any). */
export function getDeepSignalRootId(value: any): symbol | undefined {
    return getMeta(value)?.root;
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
    forcedSyntheticIds.set(getRaw(obj) as object, String(id));
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

/** Non-tracking getter for a property: reads the value without establishing dependencies. */
export function peek<T extends object, K extends keyof T>(
    obj: T,
    key: K
): T[K] {
    peeking = true;
    const value = (obj as any)[key];
    peeking = false;
    return value;
}
