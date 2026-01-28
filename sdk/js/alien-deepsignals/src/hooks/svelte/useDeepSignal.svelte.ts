// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { derived, writable, type Readable } from "svelte/store";
import { onDestroy } from "svelte";
import {
    subscribeDeepMutations,
    getDeepSignalRootId,
    type DeepPatchBatch,
    DeepSignalOptions,
    deepSignal,
    RevertDeepSignal,
    getDeepSignalVersion,
} from "../../index";

/** Base result contract for a deepSignal-backed Svelte integration. */
export interface UseDeepSignalResult<T> extends Readable<T> {
    /** Derive a nested selection; re-runs when the underlying tree version increments. */
    select<U>(selector: (tree: T) => U): Readable<U>;
    /** Stop receiving further updates (invoked automatically on component destroy). */
    dispose(): void;
    /** Replace root shape contents (mutative merge) – enables Svelte writable store binding semantics. */
    set(next: Partial<T> | T): void;
    /** Functional update helper using current tree snapshot. */
    update(updater: (current: T) => T | void): void;
}

/**
 * Create a rune from a deepSignal object (creates one if it is just a regular object).
 *
 * Modifications to the returned deepSignal object cause an immediate rerender.
 * If modifications of the object are made from somewhere else, the component
 * is rerendered as well.
 *
 * @param object The object that should become reactive
 * @param deepSignalObjects When the object is not a deepSignal already, options passed to `deepSignal`.
 * @returns A rune for using the deepSignal object in svelte.
 */
export function useDeepSignal<T extends object>(
    object: T | Promise<T>,
    options?: DeepSignalOptions
): UseDeepSignalResult<RevertDeepSignal<T>> {
    const version = writable(-1);

    let deepProxy: T;
    let unsubscribe: (() => void) | undefined;
    let isDestroyed = false;

    const init = (obj: T) => {
        if (isDestroyed) return;
        deepProxy = deepSignal(obj, options) as T;
        const rootId = getDeepSignalRootId(deepProxy);
        const initialVersion = getDeepSignalVersion(deepProxy) ?? 0;

        unsubscribe = subscribeDeepMutations(
            deepProxy,
            (batch: DeepPatchBatch) => {
                if (!rootId) return;
                if (batch.patches.length) {
                    version.set(batch.version);
                }
            }
        );
        version.set(initialVersion);
    };

    if (object instanceof Promise) {
        object.then(init);
    } else {
        init(object);
    }

    const dispose = () => {
        isDestroyed = true;
        if (unsubscribe) unsubscribe();
    };
    onDestroy(dispose);

    const deep = derived(version, () => deepProxy);
    const select = <U>(selector: (tree: T) => U): Readable<U> =>
        derived(deep, (t) => (t ? selector(t) : (undefined as unknown as U)));

    // Expose Svelte store contract by delegating subscribe to deep store.
    const applyReplacement = (next: any) => {
        if (!deepProxy || !next || typeof next !== "object") return;
        // Remove keys absent in next
        for (const k of Object.keys(deepProxy)) {
            if (!(k in next)) delete (deepProxy as any)[k];
        }
        // Assign / overwrite provided keys
        Object.assign(deepProxy, next);
    };

    const store: UseDeepSignalResult<T> = {
        select,
        dispose,
        subscribe: deep.subscribe,
        set(next) {
            applyReplacement(next);
        },
        update(updater) {
            if (!deepProxy) return;
            const result = updater(deepProxy);
            if (result && typeof result === "object") applyReplacement(result);
        },
    };
    return store as any;
}

export default useDeepSignal;
