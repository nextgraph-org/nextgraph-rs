// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { watch } from "../../watch.js";
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { deepSignal, DeepSignalOptions } from "../..";

/**
 * Create or use an existing deepSignal object in your component.
 * Modifications to the returned deepSignal object cause an immediate rerender.
 * If modifications of the object are made from somewhere else, the component
 * is rerendered as well.
 *
 * @param object The object that should become reactive
 * @param deepSignalOptions When the object is not a deepSignal already, options passed to `deepSignal`.
 * @returns The deepSignal object of the object param. On every change, the returned object will change (a new no-op proxy is created) around the deepSignal object.
 */
const useSignal = <T extends object>(
    object: T,
    deepSignalOptions?: DeepSignalOptions
) => {
    // Create the actual deepSignal object from the raw object (if the object is a deepSignal object already, it returns itself).
    const signal = useMemo(
        () => deepSignal(object, deepSignalOptions),
        [object, deepSignalOptions]
    );

    // Create a shallow proxy of the original object which can be disposed and a new one
    // recreated on rerenders so that react knows it changed on comparisons.
    const proxyRef = useRef(new Proxy(signal, {}));

    // Update proxy ref when shapeSignal changes
    useMemo(() => {
        proxyRef.current = new Proxy(signal, {});
    }, [signal]);

    const subscribe = useCallback(
        (onStoreChange: () => void) => {
            const { stopListening } = watch(
                signal,
                () => {
                    // Create a new shallow proxy and notify react about the change.
                    proxyRef.current = new Proxy(signal, {});
                    onStoreChange();
                },
                { triggerInstantly: true }
            );

            return stopListening;
        },
        [signal]
    );

    const getSnapshot = useCallback(() => proxyRef.current, []);

    return useSyncExternalStore(subscribe, getSnapshot);
};

export default useSignal;
