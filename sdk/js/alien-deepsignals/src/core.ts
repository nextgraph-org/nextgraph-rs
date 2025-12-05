// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/** Lightweight facade adding ergonomic helpers (.value/.peek/.get/.set) to native alien-signals function signals. */

// Native re-exports for advanced usage.
export {
    signal as _rawSignal,
    computed as _rawComputed,
    startBatch as _rawStartBatch,
    endBatch as _rawEndBatch,
    getCurrentSub as _rawGetCurrentSub,
    setCurrentSub as _rawSetCurrentSub,
    effect as _rawEffect,
} from "alien-signals";

import {
    signal as alienSignal,
    computed as alienComputed,
    effect as alienEffect,
    startBatch as alienStartBatch,
    endBatch as alienEndBatch,
} from "alien-signals";
import { ReactiveFlags as ReactiveFlags_ } from "./contents";

// Nominal constructor removal: we no longer expose classes; signals are plain tagged functions.

/** Internal shape of a tagged writable signal after adding ergonomic helpers. */
type TaggedSignal<T> = ReturnType<typeof alienSignal<T>> & {
    /** Tracking read / write via property syntax */
    value: T;
    /** Non-tracking read */
    peek(): T;
    /** Alias for tracking read */
    get(): T;
    /** Write helper */
    set(v: T): void;
};

/**
 * Decorate a native signal function with helpers & identity.
 */
function tagSignal(fn: any): TaggedSignal<any> {
    Object.defineProperty(fn, ReactiveFlags_.IS_SIGNAL, { value: true });
    Object.defineProperty(fn, "value", {
        get: () => fn(),
        set: (v) => fn(v),
    });
    // Add peek to mirror old API (non-tracking read)
    if (!fn.peek) Object.defineProperty(fn, "peek", { value: () => fn() });
    if (!fn.get) Object.defineProperty(fn, "get", { value: () => fn() });
    if (!fn.set) Object.defineProperty(fn, "set", { value: (v: any) => fn(v) });
    return fn;
}

/**
 * Decorate a native computed function with ergonomic helpers & readonly value accessor.
 */
function tagComputed<T>(fn: any): TaggedComputed<T> {
    Object.defineProperty(fn, ReactiveFlags_.IS_SIGNAL, { value: true });
    Object.defineProperty(fn, "value", { get: () => fn() });
    if (!fn.peek) Object.defineProperty(fn, "peek", { value: () => fn() });
    if (!fn.get) Object.defineProperty(fn, "get", { value: () => fn() });
    return fn;
}

/**
 * Create a new writable function-form signal enhanced with `.value`, `.peek()`, `.get()`, `.set()`.
 *
 * @example
 * const count = signal(0);
 * count();      // 0 (track)
 * count(1);     // write
 * count.value;  // 1 (track)
 * count.peek(); // 1 (non-tracking)
 */
export const signal = <T>(v?: T) => tagSignal(alienSignal(v));
/** Internal shape of a tagged computed signal after adding ergonomic helpers. */
type TaggedComputed<T> = ReturnType<typeof alienComputed<T>> & {
    /** Tracking read via property syntax (readonly) */
    readonly value: T;
    /** Non-tracking read */
    peek(): T;
    /** Alias for tracking read */
    get(): T;
};

/**
 * Create a lazy computed (readonly) signal derived from other signals.
 *
 * Computed signals are automatically cached and only recompute when their tracked
 * dependencies change. The getter function is evaluated lazily—if you never read
 * the computed value, the computation never runs.
 *
 * The returned function can be called directly `computed()` or accessed via `.value`.
 * Use `.peek()` for non-tracking reads (won't establish reactive dependency).
 *
 * @example
 * const count = signal(5);
 * const doubled = computed(() => count() * 2);
 * doubled();       // 10 (establishes dependency, caches result)
 * doubled.value;   // 10 (cached, same as calling it)
 * doubled.peek();  // 10 (no dependency tracking)
 * count(10);
 * doubled();       // 20 (recomputed because count changed)
 */
export const computed = <T>(getter: () => T): TaggedComputed<T> =>
    tagComputed(alienComputed(getter));

/** Union allowing a plain value or a writable signal wrapping that value. */
export type MaybeSignal<T = any> = T | ReturnType<typeof signal>;
/** Union allowing value, writable signal, computed signal or plain getter function. */
export type MaybeSignalOrGetter<T = any> =
    | MaybeSignal<T>
    | ReturnType<typeof computed>
    | (() => T);
/** Runtime guard that an unknown value is one of our tagged signals/computeds. */
export const isSignal = (s: any): boolean =>
    typeof s === "function" && !!s && !!s[ReactiveFlags_.IS_SIGNAL];

/**
 * Execute multiple signal writes in a single batched update frame.
 * All downstream computed/effect re-evaluations are deferred until the function exits.
 *
 * IMPORTANT: The callback MUST be synchronous. If it returns a Promise the batch will
 * still end immediately after scheduling, possibly causing mid-async flushes.
 *
 * @example
 * batch(() => {
 *   count(count() + 1);
 *   other(other() + 2);
 * }); // effects observing both run only once
 */
export function batch<T>(fn: () => T): T {
    alienStartBatch();
    try {
        return fn();
    } finally {
        alienEndBatch();
    }
}
