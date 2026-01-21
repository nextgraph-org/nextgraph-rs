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
import {
    useDeepSignal,
    UseDeepSignalResult,
} from "@ng-org/alien-deepsignals/svelte";
import { DiscreteOrmConnection } from "../../connector/discrete/discreteOrmConnectionHandler.ts";
import { DiscreteRootArray, DiscreteRootObject } from "../../types.ts";

export function useDiscrete(
    documentIdOrPromise: string | Promise<string>
): UseDeepSignalResult<DiscreteRootArray | DiscreteRootObject | undefined> {
    let connection: DiscreteOrmConnection | undefined;
    let isDestroyed = false;

    const objectPromise = new Promise<any>((resolve) => {
        const init = (docId: string) => {
            if (isDestroyed) return;
            connection = DiscreteOrmConnection.getOrCreate(docId);
            connection.readyPromise.then(() => {
                if (isDestroyed) {
                    connection?.close();
                    return;
                }
                resolve(connection!.signalObject!);
            });
        };

        if (typeof documentIdOrPromise === "string") {
            init(documentIdOrPromise);
        } else {
            documentIdOrPromise.then(init);
        }
    });

    onDestroy(() => {
        isDestroyed = true;
        if (connection) {
            connection.close();
        }
    });

    return useDeepSignal(objectPromise);
}
