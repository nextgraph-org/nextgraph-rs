// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type { BaseType } from "@ng-org/shex-orm";
import { useDeepSignal } from "@ng-org/alien-deepsignals/react";
import type { ShapeType } from "@ng-org/shex-orm";
import { useEffect, useRef, useState } from "react";
import { createSignalObjectForShape } from "../../connector/createSignalObjectForShape.js";
import type { Scope } from "../../types.js";

const useShape = <T extends BaseType>(
    shape: ShapeType<T>,
    scope: Scope = ""
) => {
    const handleRef = useRef(createSignalObjectForShape(shape, scope));

    const handle = handleRef.current;
    const state = useDeepSignal(handle.signalObject);

    useEffect(() => {
        return () => {
            handleRef.current.stop();
        };
    }, [shape, scope]);

    return state;
};

export default useShape;
