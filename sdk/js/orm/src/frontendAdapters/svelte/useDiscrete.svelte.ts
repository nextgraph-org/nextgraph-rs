// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { onDestroy } from "svelte";
import type { DeepSignal } from "@ng-org/alien-deepsignals";
import {
    useDeepSignal,
    UseDeepSignalResult,
} from "@ng-org/alien-deepsignals/svelte";
import { DiscreteOrmConnection } from "../../connector/discrete/discreteOrmConnectionHandler.ts";
import { DiscreteArray, DiscreteObject } from "../../types.ts";
import { Writable } from "svelte/store";

/** Extended result including the originating root signal wrapper. */
export interface UseShapeRuneResult<T extends object>
    extends UseDeepSignalResult<T> {
    root: any;
}

export function useDiscrete(documentId: string): Writable<any> {
    onDestroy(close);

    const { signalObject: rootSignal } =
        DiscreteOrmConnection.getOrCreate(documentId);

    const ds = useDeepSignal(rootSignal);

    return {
        set(value) {},
        subscribe(run, invalidate) {},
        update(updater) {},
    };
}
