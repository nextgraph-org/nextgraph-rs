// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { ref, onBeforeUnmount } from "vue";
import { DeepSignal, deepSignal, DeepSignalOptions, watch } from "../../";

/**
 * Create or use an existing deepSignal object in your component.
 * Modifications to the returned deepSignal object cause an immediate rerender.
 * If modifications of the object are made from somewhere else, the component
 * is rerendered as well.
 *
 * @param object The object that should become reactive
 * @param deepSignalObjects When the object is not a deepSignal already, options passed to `deepSignal`.
 * @returns The deepSignal object of the object param.
 *
 */
export function useDeepSignal<T extends object>(
    object: T,
    options?: DeepSignalOptions
): DeepSignal<T> {
    const version = ref(0);
    const signalObject = deepSignal(object, options);

    const stopHandle = watch(signalObject, ({ patches }) => {
        if (patches.length > 0) {
            version.value++;
        }
    });

    // Proxy that creates Vue dependency on version for any access
    const proxy = new Proxy(signalObject as any, {
        get(target, key: PropertyKey) {
            if (key === "__raw") return target;
            // Track version to create reactive dependency
            version.value;
            const value = target[key];
            // Bind methods to maintain correct `this` context
            return typeof value === "function" ? value.bind(target) : value;
        },
        set(target, key: PropertyKey, value: unknown) {
            // Directly forward writes to the deep signal root so other frameworks observe the change.
            return Reflect.set(target, key, value);
        },
        has(target, key: PropertyKey) {
            version.value;
            return key in target;
        },
        ownKeys(target) {
            version.value;
            return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(target, key: PropertyKey) {
            version.value;
            const desc = Object.getOwnPropertyDescriptor(target, key);
            return desc ? { ...desc, configurable: true } : undefined;
        },
    });

    onBeforeUnmount(() => {
        try {
            stopHandle.stopListening();
        } catch {
            // ignore
        }
    });

    return proxy;
}

export default useDeepSignal;
