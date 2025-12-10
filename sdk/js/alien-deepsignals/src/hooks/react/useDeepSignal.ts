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
import { useEffect, useRef, useState } from "react";
import { deepSignal } from "../../deepSignal";
import { DeepSignalOptions } from "../../types.js";

/**
 * Create or use an existing deepSignal object in your component.
 * Modifications to the returned deepSignal object cause an immediate rerender.
 * If modifications of the object are made from somewhere else, the component
 * is rerendered as well.
 *
 * @param object The object that should become reactive
 * @param deepSignalObjects When the object is not a deepSignal already, options passed to `deepSignal`.
 * @returns The deepSignal object of the object param.
 */
const useSignal = <T extends object>(
    object: T,
    deepSignalObjects?: DeepSignalOptions
) => {
    const shapeSignalRef = useRef(deepSignal(object, deepSignalObjects));
    const [, setTick] = useState(0);

    useEffect(() => {
        const { stopListening } = watch(
            shapeSignalRef.current,
            () => {
                // trigger a React re-render when the deep signal updates
                setTick((t) => t + 1);
            },
            { triggerInstantly: true }
        );

        return () => {
            stopListening();
        };
    }, []);

    return shapeSignalRef.current;
};

export default useSignal;
