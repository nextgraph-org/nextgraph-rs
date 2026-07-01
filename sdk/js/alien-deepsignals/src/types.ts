// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { computed, alienSignal } from "./core.ts";
import { deepSignal } from "./deepSignal.ts";
import type { watch } from "./watch.ts";

/** Deep mutation emitted from a deepSignal root. */
export type DeepPatch = {
    path: (string | number | symbol)[];
} & (
    | { op: "add"; type?: "object" | "set"; value?: any }
    | { op: "remove"; type?: "set"; value?: any }
);

/** Batched patch payload tagged with a monotonically increasing version. */
export interface DeepPatchBatch {
    version: number;
    patches: DeepPatch[];
}

/** @ignore Batched patch payload for justInTime listeners. */
export interface DeepPatchJITBatch {
    patches: DeepPatch[];
}

/** @ignore */
export type DeepPatchSubscriber = (batch: DeepPatchBatch) => void;
/** @ignore */
export type DeepPatchJITSubscriber = (batch: DeepPatchJITBatch) => void;

/**
 * Options to pass to {@link deepSignal}
 * @internal
 */
export interface DeepSignalOptions {
    /**
     * An optional function that is called when an object, array, or set is attached to a (nested) signal object, set, or array.
     * The raw object may be modified or replaced by the function.
     * For sets, a synthetic id may be specified that is used for creating the patches in the @see watch callback.
     * Will also be called on the root object.
     */
    onObjectAttached?: OnObjectAttachedFn;
    /**
     * The property name which should be used as an object identifier in sets.
     * You will see it when patches are generated with a path to an object in a set.
     * The `syntheticId` will be a patch element then.
     * Objects with existing properties matching `syntheticIdPropertyName` keep their values (not overwritten).
     */
    syntheticIdPropertyName?: string;
    /**
     * Optional: Properties that are made read-only in objects.
     * Can only be attached by `onObjectAttached` callback or must already be set
     * on the new object before attaching it.
     */
    readOnlyProps?: string[];
    /**
     * If set to `true`, all proxies in the branch to a modified nested property are replaced.
     * This has no effect except for equality checks (===). This is necessary for react to notice the change.
     * @default false
     */
    replaceProxiesInBranchOnChange?: boolean;
    /*
     * External subscribers that are called when a signal updates or is read.
     */
    //  TODO: Is the an onDestroy fn necessary?
    subscriberFactories?: Set<ExternalSubscriberFactory>;
}

export type ExternalSubscriberFactory<T = any> = () => {
    onGet: () => void;
    onSet: (newVal: T) => void;
};

/**
 *
 * The `onObjectAttached` function is called when an object is added to the deep signal tree.
 * @example
 * ```ts
 * let counter = 0;
 * const state = deepSignal(
 *     { items: new Set() },
 *     {
 *         onObjectAttached: ({ path, inSet, object }) => {
 *             return {
 *                 syntheticId: inSet
 *                     ? `urn:item:${++counter}`
 *                     : undefined,
 *                 replaceWith: {
 *                      createdAt: new Date().toISOString(),
 *                      name: object.name,
 *                      bar: object.bar
 *                 }
 *             };
 *         }
 *     }
 * );
 *
 * state.items.add({ name: "Item 1", ignoredProp: "won't be added" });
 * // Attaches `{ name: "Item 1",  createdAt: <current date>}`
 *
 * state.foo = {bar: 42};
 * // Attaches `{bar: 42, createdAt: <current date>}`
 * ```
 */
export type OnObjectAttachedFn = (props: {
    /**
     * The path of the newly added object. In case of sets, the synthetic id is not part of the path.
     */
    path: (string | number | symbol)[];
    /** Whether the object is being added to a Set (true) or not (false) */
    inSet: Set<any> | false;
    /** The newly added, non-proxied raw object. You may modify it. */
    rawObject: Record<string, any> | Set<any> | any[];
}) =>
    | void
    | undefined
    | {
          /** A custom identifier for the object (used in Set entry paths and optionally as a property). */
          syntheticId?: string | number;
          /**
           * By returning a replaceObject, you can intercept what is added to the raw object. The original object won't be used.
           * The value may be a signal in which case, the underlying raw object is attached.
           *
           * If left undefined / unset, the original object is attached (which you may still modify).
           */
          replaceWith?: any;
      };

/**@ignore*/
export interface ProxyMeta {
    raw: object;
    parent?: ProxyMeta;
    key?: string | number | symbol;
    isSyntheticId?: boolean;
    root: symbol;
    options: DeepSignalOptions;
}

/** @hidden */
export interface SetMeta {
    objectToId: WeakMap<object, string | number | symbol>;
    idToObject: Map<string | number | symbol, object>;
}

/**@ignore*/
export interface RootState {
    options?: DeepSignalOptions;
    version: number;
    justInTimeListeners: Set<DeepPatchJITSubscriber>;
    listeners: Set<DeepPatchSubscriber>;
    pendingPatches: DeepPatch[];
}

/** @ignore */
export type WritableSignal<T = any> = ReturnType<typeof alienSignal<T>>;
export type ComputedSignal<T = any> = ReturnType<typeof computed<T>>;
export type SignalLike<T = any> = WritableSignal<T> | ComputedSignal<T>;

/** @ignore Raw and meta key. */
export type DeepSignalObjectProps<T> = {
    /** The original raw object. */
    __raw__: T;
    /** @internal meta information @ignore */
    __meta__: ProxyMeta;
};

/** Utility functions for sets. */
export type DeepSignalSetProps<T> = {
    /** Get the element that was first inserted into the set. */
    first(): undefined | (T extends object ? DeepSignal<T> : T);

    /**
     * @internal This is only useful when you are using custom ids for sets.
     *           You should probably use {@link DeepSignalSetProps.getBy}.
     *
     * Retrieve an entry from the Set by its synthetic set ID.
     * @param id - The synthetic ID (string or number) assigned to the entry.
     * @returns The proxied entry if found, undefined otherwise.
     * @ignore
     */
    getById(id: string | number): DeepSignal<T> | undefined;

    /**
     * Retrieve an object from the Set by its `@graph` and `@id`.
     *
     * @param graphIri - The `@graph` NURI of the object.
     * @param subjectIri - The `@subject` IRI of the object.
     * @returns The proxied entry if found, undefined otherwise.
     */
    getBy(graphIri: string, subjectIri: string): DeepSignal<T> | undefined;
};

/**
 * Type alias for `DeepSignal<Set<T>>` and reactive Set wrapper that accepts raw or proxied entries.
 * Additionally it is decorated with {@link DeepSignalSetProps}
 * and iterator utilities like `.map()`, `.filter()`, `.some()`, ....
 *
 * Note that you can assign plain `Set`s to properties with type DeepSignalSet,
 * however Typescript will give you a warning. That is a limitation of TypeScript's capability.
 * Internally, the object will be converted to a DeepSignalSet.
 * You can instruct TypeScript to ignore this with `parent.children = new Set() as DeepSignal<Set<any>>`.
 */
export type DeepSignalSet<T> = DeepSignalSet_<T> &
    DeepSignalSetProps<T> &
    DeepSignalObjectProps<T>;

/**
 * Helper type to prevent excessive documentation to be generated for each property.
 * @ignore
 */
export interface DeepSignalSet_<T>
    extends Set<DeepSignal<T>>,
        DeepSignalObjectProps<Set<T>>,
        SetIterator<DeepSignal<T>>,
        DeepSignalSetProps<T> {
    add(value: T | DeepSignal<T>): this;
    delete(value: T | DeepSignal<T>): boolean;
    has(value: T | DeepSignal<T>): boolean;
    forEach(
        callbackfn: (
            value: DeepSignal<T>,
            value2: DeepSignal<T>,
            set: DeepSignalSet<T>
        ) => void,
        thisArg?: any
    ): void;
    forEach(
        callbackfn: (value: DeepSignal<T>, index: number) => void,
        thisArg?: any
    ): void;
}

/**
 * The object returned by the {@link deepSignal} function.
 * It is decorated with utility functions for sets, see {@link DeepSignalSetProps}
 * and a `__raw__` prop to get the underlying non-reactive object.
 */
export type DeepSignal<T> = T extends Function
    ? T
    : T extends string | number | boolean
      ? T
      : T extends DeepSignalObjectProps<any> | DeepSignalObjectProps<any>[]
        ? T
        : T extends Array<infer I>
          ? DeepSignal<I>[]
          : T extends Set<infer S>
            ? DeepSignalSet<S>
            : T extends object
              ? DeepSignalObject<T>
              : T;

export type DeepSignalObject<T extends object> = {
    [K in keyof T]: DeepSignal<T[K]>;
}; // DeepSignalObjectProps<T>;

export type UnwrapDeepSignal<T> = T extends DeepSignal<infer S> ? S : T;

/** Union allowing a plain value or a writable signal wrapping that value. */
export type MaybeSignal<T = any> = T | ReturnType<typeof alienSignal>;
/** Union allowing value, writable signal, computed signal or plain getter function. */
export type MaybeSignalOrComputed<T = any> = MaybeSignal<T> | (() => T);
