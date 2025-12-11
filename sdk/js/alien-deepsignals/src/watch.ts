// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import {
    getDeepSignalRootId,
    getDeepSignalVersion,
    isDeepSignal,
    subscribeDeepMutations,
} from "./deepSignal";
import {
    DeepPatch,
    DeepPatchBatch,
    DeepSignal,
    DeepSignalObject,
    DeepSignalSet,
} from "./types";

export type RegisterCleanup = (cleanupFn: () => void) => void;

export interface WatchOptions {
    /** True, if the callback should be run immediately after `watch` was called. @default false*/
    immediate?: boolean;
    /** True, if the watcher should be unsubscribed after the first event. @default false*/
    once?: boolean;
    /**
     * If true, triggers watch callback instantly after changes to the signal object.
     * Otherwise, changes are batched and the watch callback is triggered in a microtask.
     * This is useful for frontends like React where modifications on the changed input in
     * a separate (microtask) will cause the cursor in input elements to reset.
     */
    triggerInstantly?: boolean;
}

export interface WatchPatchEvent<T extends object> {
    patches: DeepPatch[];
    /** The version if `triggerInstantly` is not true. */
    version?: number;
    newValue: DeepSignal<T>;
}

export type WatchPatchCallback<T extends object> = (
    event: WatchPatchEvent<T>
) => void;

export function watch<T extends object>(
    source: DeepSignalSet<T> | DeepSignalObject<T> | DeepSignal<T>,
    callback: WatchPatchCallback<T>,
    options: WatchOptions = {}
) {
    if (!isDeepSignal(source)) {
        throw new Error("watch() expects a deepSignal root proxy");
    }

    const rootId = getDeepSignalRootId(source as any);
    if (!rootId) throw new Error("Unable to resolve deepSignal root id");

    let active = true;
    let cleanup: (() => void) | undefined;
    const { immediate, once } = options;

    const registerCleanup: RegisterCleanup = (fn) => {
        cleanup = fn;
    };

    const runCleanup = () => {
        if (!cleanup) return;
        try {
            cleanup();
        } finally {
            cleanup = undefined;
        }
    };

    const stopListening = () => {
        if (!active) return;
        active = false;
        runCleanup();
        unsubscribe();
    };

    const deliver = (batch: DeepPatchBatch) => {
        if (!active) return;
        runCleanup();
        const next = source;
        callback({
            patches: batch.patches,
            version: batch.version,
            newValue: next as DeepSignal<T>,
        });
        if (once) stopListening();
    };

    const unsubscribe = subscribeDeepMutations(
        rootId,
        (batch: DeepPatchBatch) => {
            if (!batch.patches.length) return;
            deliver(batch);
        },
        options.triggerInstantly
    );

    if (immediate) {
        deliver({
            patches: [],
            version: getDeepSignalVersion(rootId) ?? 0,
        });
    }

    return {
        stopListening,
        registerCleanup,
    };
}
