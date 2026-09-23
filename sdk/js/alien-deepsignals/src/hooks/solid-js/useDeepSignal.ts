// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { deepSignal, removeSubscriberFactory } from "../../deepSignal.ts";
import { DeepSignalOptions } from "../../types.ts";
import { createSignal, onCleanup } from "solid-js";

/**
 * Create or use an existing deepSignal object in your component.
 * Like with mutable stores, modifications to the returned deepSignal object
 * cause an immediate rerender. If modifications of the object are made from
 * somewhere else, the component is rerendered as well.
 *
 * @param object The regular object or signal that should become reactive with solid-js.
 * @param options The options passed to {@link deepSignal}.
 * @returns The deepSignal object of the object.
 */
const useDeepSignal = <T extends object>(
    object: T,
    options?: DeepSignalOptions & {
        /** @internal */ registerCleanup(fn: () => any): void;
    }
) => {
    const deepProxy = deepSignal(object, {
        ...options,
        subscriberFactories: (options?.subscriberFactories ?? new Set()).union(
            new Set([subscriberFactory])
        ),
    });

    // Remove subscriber factory on component unmount.
    (options?.registerCleanup ?? onCleanup)(() =>
        removeSubscriberFactory(deepProxy, subscriberFactory)
    );

    return deepProxy;
};

/** Use solid-js's `from` method, to create subscriber factory callbacks. */
const subscriberFactory = () => {
    let [onGet, onSet] = createSignal(undefined, { equals: false });

    return { onGet: onGet, onSet: onSet };
};

export default useDeepSignal;
