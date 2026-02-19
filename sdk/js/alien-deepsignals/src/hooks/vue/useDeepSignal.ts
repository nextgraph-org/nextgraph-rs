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
    customRef,
} from "vue";

import { DeepSignal, deepSignal, DeepSignalOptions, watch } from "../../";

/**
 * Create or use an existing (child) deepSignal object in your component.
 * Modifications to the returned deepSignal object cause an immediate rerender.
 * If modifications of the object are made from somewhere else, the component
 * is rerendered as well.
 *
 * @param object The object that should become reactive (can be a ref or getter)
 * @param options When the object is not a deepSignal already, options passed to `deepSignal`.
 * @returns The deepSignal object of the object param.
 *
 */
export function useDeepSignal<T extends object>(
    object: MaybeRefOrGetter<T>,
    options?: DeepSignalOptions
): DeepSignal<T> {
    const deepProxy = deepSignal(object, {
        ...options,
        subscriberFactories: (options?.subscriberFactories ?? new Set()).union(
            new Set([subscriberFactory])
        ),
    });

    // onBeforeUnmount(() => {
    //     // TODO: Tell signal that subscriber can be removed
    // });

    return deepProxy as DeepSignal<T>;
}

/** Calls Vue's customRef for notifications of value changes. */
const subscriberFactory = () => {
    let onGet: () => void;
    let onSet: () => void;

    // We don't use the actually returned value of the ref.
    // We only need it since Dep is not exposed by vue.
    customRef((track, trigger) => {
        onGet = track;
        onSet = trigger;
        return { get() {}, set() {} };
    });

    return { onGet: onGet!, onSet: onSet! };
};

export default useDeepSignal;
