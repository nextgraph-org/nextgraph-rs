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
import { useEffect, useMemo, useRef, useState } from "react";
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
    const shapeSignal = useMemo(
        () => deepSignal(object, deepSignalOptions),
        [object, deepSignalOptions]
    );

    const isFirstRender = useRef(true);

    // The signal object is proxied every time a value changes.
    // This way, we make it a dependency in `useEffect` etc.
    const [ret, setRet] = useState(new Proxy(shapeSignal, {}));

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
        } else {
            setRet(new Proxy(shapeSignal, {}));
        }

        const { stopListening } = watch(
            shapeSignal,
            () => {
                // Trigger a re-render when the deep signal updates.
                setRet(() => new Proxy(shapeSignal, {}));
            },
            { triggerInstantly: true }
        );

        return () => {
            stopListening();
        };
    }, []);

    return ret;
};

export default useSignal;
