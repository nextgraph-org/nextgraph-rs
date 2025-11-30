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
    type DeepPatch,
    type DeepPatchBatch,
} from "./deepSignal";

export type RegisterCleanup = (cleanupFn: () => void) => void;

export interface WatchOptions {
    immediate?: boolean;
    once?: boolean;
}

export interface WatchPatchEvent<Root = any> {
    patches: DeepPatch[];
    version: number;
    oldValue: Root | undefined;
    newValue: Root;
}

export type WatchPatchCallback<Root = any> = (
    event: WatchPatchEvent<Root>
) => void;

export function watch<Root extends object>(
    source: Root,
    callback: WatchPatchCallback<Root>,
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

    const clone = (value: any) => {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch {
            return undefined;
        }
    };

    let lastSnapshot: Root | undefined = clone(source);

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
            oldValue: lastSnapshot,
            newValue: next,
        });
        if (active) lastSnapshot = clone(next);
        if (once) stopListening();
    };

    const unsubscribe = subscribeDeepMutations(rootId, (batch) => {
        if (!batch.patches.length) return;
        deliver(batch);
    });

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

export const observe = watch;
