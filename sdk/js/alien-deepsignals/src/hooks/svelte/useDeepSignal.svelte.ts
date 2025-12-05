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
export interface UseDeepSignalResult<T extends object> extends Readable<T> {
    /** Store of the full deep proxy tree (also accessible via `subscribe` directly on this result). */
    deep: Readable<T>;
    /** Last batch of deep mutation patches for this root (empties only on next non-empty batch). */
    patches: Readable<DeepPatchBatch | null>;
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
    object: T,
    options?: DeepSignalOptions
): UseDeepSignalResult<RevertDeepSignal<T>> {
    const deepProxy = deepSignal(object, options) as T;
    const rootId = getDeepSignalRootId(deepProxy);
    const initialVersion = getDeepSignalVersion(deepProxy) ?? 0;
    const version = writable(initialVersion);
    const patchesStore = writable<DeepPatchBatch | null>(null);

    const unsubscribe = subscribeDeepMutations(
        deepProxy as any,
        (batch: DeepPatchBatch) => {
            if (!rootId) return;
            if (batch.patches.length) {
                patchesStore.set(batch);
                version.set(batch.version);
            }
        }
    );
    const deep = derived(version, () => deepProxy);
    const select = <U>(selector: (tree: T) => U): Readable<U> =>
        derived(deep, (t) => selector(t));
    const dispose = () => unsubscribe();
    onDestroy(dispose);

    // Expose Svelte store contract by delegating subscribe to deep store.
    const applyReplacement = (next: any) => {
        if (!next || typeof next !== "object") return;
        // Remove keys absent in next
        for (const k of Object.keys(deepProxy as any)) {
            if (!(k in next)) delete (deepProxy as any)[k];
        }
        // Assign / overwrite provided keys
        Object.assign(deepProxy as any, next);
    };

    const store: UseDeepSignalResult<T> = {
        deep,
        patches: patchesStore,
        select,
        dispose,
        subscribe: deep.subscribe,
        set(next) {
            applyReplacement(next);
        },
        update(updater) {
            const result = updater(deepProxy);
            if (result && typeof result === "object") applyReplacement(result);
        },
    };
    return store as any;
}

export default useDeepSignal;
