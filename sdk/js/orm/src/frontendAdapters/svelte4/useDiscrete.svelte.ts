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
} from "@ng-org/alien-deepsignals/svelte4";
import { DiscreteOrmConnection } from "../../connector/discrete/discreteOrmConnectionHandler.ts";
import { DiscreteRootArray, DiscreteRootObject } from "../../types.ts";

/**
 * Svelte 3/4 hook to subscribe to discrete (JSON) CRDT documents.
 * You can modify the returned object like any other JSON object. Changes are immediately
 * reflected in the CRDT.
 *
 * Establishes a 2-way binding: Modifications to the object are immediately committed,
 * changes coming from the backend (or other components) cause an immediate rerender.
 *
 * In comparison to `useShape`, discrete CRDTs are untyped.
 * You can put any JSON data inside and need to validate the schema yourself.
 *
 * @param documentId The IRI of the CRDT document.
 * @returns The reactive JSON object of the CRDT document.
 *
 *@example
 * ```svelte
 * <script lang="ts">
 *
 *     // We assume you have created a CRDT document already, as below.
 *     // const documentId = await ng.doc_create(
 *     //     session_id,
 *     //     crdt, // "Automerge" | "YMap" | "YArray"
 *     //     crdt === "Automerge" ? "data:json" : crdt === "YMap ? "data:map" : "data:array",
 *     //     "store",
 *     //     undefined
 *
 *     const doc = useDiscrete(documentIdPromise);
 *
 *     // If the CRDT document is still empty, we need to initialize it.
 *     if (doc && !doc.expenses) {
 *         doc.expenses = [];
 *     }
 *
 *     // Call doc.expenses.push({title: "Example title"}), to add new elements.
 *
 *
 *     // Note that we use expense["@id"] as a key in the expense list.
 *     // Every object added to a CRDT array gets a stable `@id` property assigned
 *     // which you can use for referencing objects in arrays even as
 *     // objects are removed from the array. The ID is an IRI with the schema `<documentId>:d:<object-specific id>`.
 *     // Since the `@id` is generated in the backend, the object is preliminarily
 *     // given a mock id which will be replaced immediately
 * </script>
 *
 * <section>
 *     <div>
 *         {#if !doc}
 *             Loading...
 *         {:else if doc.expenses.length === 0}
 *         <p>
 *             Nothing tracked yet - log your first purchase to kick things off.
 *         </p>
 *         {:else}
 *         {#each doc.expenses as expense, index (expense['@id']) }
 *             <ExpenseCard
 *             expense={expense}
 *             />
 *         {/each}
 *         {/if}
 *     </div>
 * </section>
 * ```
 *
 * ---
 * In the ExpenseCard component:
 * ```svelte
 *     let {
 *         expense = $bindable(),
 *     }: { expense: Expense; } = $props();
 * </script>
 *
 * <div>
 *     <input
 *         value={expense.title ?? ""}
 *         oninput={(event) => {expense.title = event.currentTarget?.value ?? ""}}
 *         placeholder="Expense title"
 *     />
 * </div>
 * ```
 *
 */
export function useDiscrete(
    documentIdOrPromise: string | Promise<string>
): UseDeepSignalResult<DiscreteRootArray | DiscreteRootObject | undefined> {
    let connection: DiscreteOrmConnection | undefined;
    let isDestroyed = false;

    const objectPromise = new Promise((resolve) => {
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

    return useDeepSignal(objectPromise as any);
}
