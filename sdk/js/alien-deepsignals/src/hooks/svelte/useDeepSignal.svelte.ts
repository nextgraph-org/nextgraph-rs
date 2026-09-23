// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { createSubscriber } from "svelte/reactivity";
import { DeepSignalOptions, deepSignal } from "../../index.ts";
import { removeSubscriberFactory } from "../../deepSignal.ts";
import { onDestroy as svelteOnDestroy } from "svelte";

/**
 * Create a rune from a deepSignal object (creates one if it is just a regular object).
 *
 * Modifications to the returned deepSignal object cause an immediate rerender.
 * If modifications of the object are made from somewhere else, the component
 * is rerendered as well.
 *
 * @param object The object that should become reactive
 * @param options Options passed to {@link deepSignal}.
 * @returns A rune for using the deepSignal object in svelte.
 */
export function useDeepSignal<T extends object>(
    object: T,
    options?: DeepSignalOptions & {
        /** @internal */ registerCleanup(fn: () => any): void;
    }
) {
    const ret = deepSignal(object, {
        ...options,
        subscriberFactories: (options?.subscriberFactories ?? new Set()).union(
            new Set([subscriberFactory])
        ),
    });

    // Remove subscriber factory on component unmount.
    (options?.registerCleanup ?? svelteOnDestroy)(() => {
        removeSubscriberFactory(ret, subscriberFactory);
    });

    return ret;
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
        onSet,
    };
};

export default useDeepSignal;
