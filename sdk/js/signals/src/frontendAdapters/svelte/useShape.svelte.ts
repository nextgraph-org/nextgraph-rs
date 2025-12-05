// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { createSignalObjectForShape } from "../../connector/createSignalObjectForShape.js";
import type { Scope } from "../../types.js";
import { onDestroy } from "svelte";
import type { BaseType, ShapeType } from "@ng-org/shex-orm";
import {
    useDeepSignal,
    type UseDeepSignalResult,
} from "@ng-org/alien-deepsignals/svelte";

export type { UseDeepSignalResult } from "@ng-org/alien-deepsignals/svelte";

/** Extended result including the originating root signal wrapper from shape logic. */
export interface UseShapeRuneResult<T extends object>
    extends UseDeepSignalResult<T> {
    root: any;
}

/**
 * Shape-specific rune: constructs the signal object for a shape then delegates to {@link useDeepSignal}.
 */
export function useShapeRune<T extends BaseType>(
    shape: ShapeType<T>,
    scope?: Scope
): UseShapeRuneResult<Set<T>> {
    const { signalObject: rootSignal, stop } = createSignalObjectForShape(
        shape,
        scope
    );

    onDestroy(stop);

    const ds = useDeepSignal<Set<T>>(rootSignal as Set<T>);
    return { root: rootSignal, ...ds } as UseShapeRuneResult<Set<T>>;
}

export default useShapeRune;
