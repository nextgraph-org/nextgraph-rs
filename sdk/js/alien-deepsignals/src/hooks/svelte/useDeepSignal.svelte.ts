// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { derived, writable, type Readable } from "svelte/store";
import { createSubscriber } from "svelte/reactivity";
import { onDestroy } from "svelte";
import {
    subscribeDeepMutations,
    getDeepSignalRootId,
    type DeepPatchBatch,
    DeepSignalOptions,
    deepSignal,
    RevertDeepSignal,
    getDeepSignalVersion,
    DeepSignal,
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
    object: T,
    options?: DeepSignalOptions
) {
    const deepProxy = deepSignal(object, {
        ...options,
        subscriberFactories: (options?.subscriberFactories ?? new Set()).union(
            new Set([subscriberFactory])
        ),
    });

    onDestroy(() => {
        // TODO: Tell signal that subscriber can be removed
    });

    return deepProxy as T extends DeepSignal<any> ? T : DeepSignal<T>;
}

/**
 * Calls Svelte's `createSubscriber` and wraps it for compatibility with
 * deepSignal's external subscriber format.
 * @returns
 */
const subscriberFactory = () => {
    let setter: () => void;
    let onSet = () => {
        setter?.();
    };

    const onGet = createSubscriber((update) => {
        setter = () => {
            update();
        };
    });

    return {
        onGet,
        onSet: onSet,
    };
};

export default useDeepSignal;
