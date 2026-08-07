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
import { DiscreteOrmSubscription } from "../../connector/DiscreteOrmSubscription.ts";
import { DiscreteRoot } from "../../types.ts";
import { UseShapeStoreResult } from "./useShape.svelte.ts";
import { Readable, Writable, writable } from "svelte/store";
import { DeepSignal } from "@ng-org/alien-deepsignals";

/**
 * Svelte 4 hook to subscribe to discrete (JSON) CRDT documents.
 * You can modify the returned object like any other JSON object. Changes are immediately
 * reflected in the CRDT.
 *
 * Establishes a 2-way binding: Modifications to the object are immediately committed,
 * changes coming from the backend (or other components) cause an immediate rerender.
 *
 * In comparison to {@link svelte4UseShape}, discrete CRDTs are untyped.
 * You can put any JSON data inside and need to validate the schema yourself.
 *
 * @param documentIdOrPromise The NURI of the CRDT document or a promise to that.
 * @returns The store of the reactive JSON object of the CRDT document or undefined.
 *
 * @example
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
 *     const { doc, isLoading } = useDiscrete(documentIdPromise);
 *
 *     // If the CRDT document is still empty, we need to initialize it.
 *     $: if (doc && !doc.expenses) {
 *         doc.expenses = [];
 *     }
 *
 *     // Call doc.expenses.push({title: "Example title"}), to add new elements.
 *
 *     // Note that we use expense["@id"] NURI as a key in the expense list.
 *     // Every object added to a CRDT array gets a stable `@id` property assigned
 *     // which you can use for referencing objects in arrays even as
 *     // objects are removed from the array.
 *     // Since the `@id` is generated in the backend, the object is preliminarily
 *     // given a mock ID which will be replaced immediately
 * </script>
 *
 * <section>
 *     <div>
 *         {#if isLoading}
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
export function useDiscrete<T = DiscreteRoot>(
    documentIdOrPromise: string | Promise<string> | undefined
): UseDiscreteResult<T> {
    let subscription: Writable<DiscreteOrmSubscription<T> | undefined> =
        writable(undefined);
    let sub: DiscreteOrmSubscription<T> | undefined = undefined;
    let isDestroyed = false;
    let isLoading = writable(false);
    let promise: Writable<Promise<DeepSignal<T>> | undefined> =
        writable(undefined);

    const objectPromise = new Promise((resolve) => {
        const init = (docId: string) => {
            if (isDestroyed) return;
            sub = DiscreteOrmSubscription.getOrCreate<T>(docId);
            subscription.set(sub);
            sub.readyPromise.then(() => {
                isLoading.set(false);
                if (isDestroyed) {
                    sub!.close();
                    return;
                }
                resolve(sub!.signalObject!);
            });
            promise.set(sub.readyPromise);
        };

        if (typeof documentIdOrPromise === "string") {
            isLoading.set(true);
            init(documentIdOrPromise);
        } else if (documentIdOrPromise === undefined) {
            // There is nothing to do without a document ID.
        } else {
            isLoading.set(true);
            documentIdOrPromise.then(init);
        }
    });

    onDestroy(() => {
        isDestroyed = true;
        if (sub) {
            sub.close();
        }
    });

    return {
        doc: useDeepSignal(objectPromise) as UseShapeStoreResult<T>,
        promise,
        subscription,
        isLoading,
    };
}

type UseDiscreteResult<T = DiscreteRoot> = {
    /**
     * `true` when no data is available yet and `conf` is not `undefined`.
     */
    isLoading: Readable<boolean>;
    /**
     * The JSON object of the requested CRDT document.
     *
     * This object is a svelte-reactive version of the value returned by {@link DiscreteOrmSubscription.signalObject}.
     */
    doc: UseDeepSignalResult<T | undefined>;
    /**
     * A promise that resolves once the data is loaded.
     * Note that if `conf` is `undefined`, this property is `undefined`.
     */
    promise: Readable<undefined | Promise<DeepSignal<T>>>;
    /** The underlying {@link DiscreteOrmSubscription} through which the data is loaded. */
    subscription: Readable<DiscreteOrmSubscription<T> | undefined>;
};
