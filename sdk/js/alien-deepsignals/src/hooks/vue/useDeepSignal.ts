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
    ref,
    onBeforeUnmount,
    type MaybeRefOrGetter,
    watch as vueWatch,
    toValue,
} from "vue";
import { DeepSignal, deepSignal, DeepSignalOptions, watch } from "../../";

/**
 * Create or use an existing deepSignal object in your component.
 * Modifications to the returned deepSignal object cause an immediate rerender.
 * If modifications of the object are made from somewhere else, the component
 * is rerendered as well.
 *
 * @param object The object that should become reactive (can be a ref or getter)
 * @param options When the object is not a deepSignal already, options passed to `deepSignal`.
 * @returns The deepSignal object of the object param.
 *
 */
// Note partly written with the help of Gemini 3.
export function useDeepSignal<T extends object>(
    object: MaybeRefOrGetter<T>,
    options?: DeepSignalOptions
): DeepSignal<T> {
    const version = ref(0);
    // Holds the current reactive signal object.
    let currentSignal: DeepSignal<T>;
    let stopHandle: { stopListening: () => void } | undefined;

    // Watch the input object for changes.
    const stopWatchingSource = vueWatch(
        () => toValue(object),
        (newObj) => {
            if (stopHandle) {
                stopHandle.stopListening();
                stopHandle = undefined;
            }
            if (newObj) {
                currentSignal = deepSignal(newObj, options);
                stopHandle = watch(currentSignal, ({ patches }) => {
                    if (patches.length > 0) version.value++;
                });
            }
            // Trigger Vue update.
            version.value++;
        },
        { immediate: true }
    );

    // Determines the initial target for the Proxy (array vs object).
    const initialVal = toValue(object);
    const proxyTarget = (Array.isArray(initialVal) ? [] : {}) as T;

    // Proxy that creates Vue dependency on version for any access.
    const proxy = new Proxy(proxyTarget, {
        get(target, key: PropertyKey) {
            if (key === "__raw") return currentSignal;

            // Track version to create reactive dependency.
            version.value;

            // Delegate to current signal.
            const actualTarget = currentSignal || target;
            const value = Reflect.get(actualTarget, key);

            // Bind methods to maintain correct `this` context.
            return typeof value === "function"
                ? value.bind(actualTarget)
                : value;
        },
        set(target, key: PropertyKey, value: unknown) {
            // Delegate to current signal.
            const actualTarget = currentSignal || target;
            return Reflect.set(actualTarget, key, value);
        },
        has(target, key: PropertyKey) {
            version.value;
            const actualTarget = currentSignal || target;
            return Reflect.has(actualTarget, key);
        },
        ownKeys(target) {
            version.value;
            const actualTarget = currentSignal || target;
            return Reflect.ownKeys(actualTarget);
        },
        getOwnPropertyDescriptor(target, key: PropertyKey) {
            version.value;
            const actualTarget = currentSignal || target;
            const desc = Reflect.getOwnPropertyDescriptor(actualTarget, key);
            return desc ? { ...desc, configurable: true } : undefined;
        },
    });

    onBeforeUnmount(() => {
        stopWatchingSource();
        if (stopHandle) {
            try {
                stopHandle.stopListening();
            } catch {
                // ignore
            }
        }
    });

    return proxy as DeepSignal<T>;
}

export default useDeepSignal;
