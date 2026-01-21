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
import { DiscreteOrmConnection } from "@ng-org/orm";
import type { DocumentStore } from "../../types";
import { ormConnection, ormConnectionPromise } from "../../utils/ngSession";

export function useDocumentStore() {
    let data = $state<DocumentStore | undefined>(undefined);
    let cleanup: (() => void) | undefined;

    // Register cleanup synchronously during component initialization
    onDestroy(() => cleanup?.());

    async function loadStore() {
        // Wait for connection if not ready
        const connection = ormConnection ?? (await ormConnectionPromise);

        if (!connection?.documentId) {
            return;
        }

        const { close, readyPromise } = DiscreteOrmConnection.getOrCreate(
            connection.documentId
        );
        cleanup = close;

        // Wait until the backend delivered the initial signal object.
        await readyPromise;

        const { signalObject: rootSignal } = DiscreteOrmConnection.getOrCreate(
            connection.documentId
        );

        if (rootSignal) {
            data = rootSignal as unknown as DocumentStore;
        }
    }

    // Start loading the store
    loadStore();

    return {
        get data() {
            return data;
        },
    };
}
