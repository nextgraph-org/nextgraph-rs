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
import { watch } from "@ng-org/alien-deepsignals";

/**
 * Bridge a deepSignal root into Vue with reactivity.
 * Uses a single version counter that increments on any deep mutation,
 * causing Vue to re-render when the deepSignal changes.
 *
 * TODO: Check performance and potentially improve.
 */
export function useDeepSignal<T>(deepProxy: T): T {
    const version = ref(0);

    const stopHandle = watch(deepProxy, ({ patches }) => {
        if (patches.length > 0) {
            version.value++;
        }
    });

    // Proxy that creates Vue dependency on version for any access
    const proxy = new Proxy(deepProxy as any, {
        get(target, key: PropertyKey) {
            if (key === "__raw") return target;
            // Track version to create reactive dependency
            version.value;
            const value = target[key];
            // Bind methods to maintain correct `this` context
            return typeof value === "function" ? value.bind(target) : value;
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

    return proxy as T;
}

export default useDeepSignal;
