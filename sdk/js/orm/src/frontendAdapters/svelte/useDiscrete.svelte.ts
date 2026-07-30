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
import { useDeepSignal } from "@ng-org/alien-deepsignals/svelte";
import { DiscreteOrmSubscription } from "../../connector/DiscreteOrmSubscription.ts";
import { DiscreteRoot } from "../../types.ts";
import { DeepSignal } from "@ng-org/alien-deepsignals";
import { setRawPrototype } from "../utils.ts";

/**
 * Svelte 5 hook to subscribe to existing discrete (JSON) CRDT documents.
 * You can modify the returned object like any other JSON object. Changes are immediately
 * reflected in the CRDT.
 *
 * Establishes a 2-way binding: Modifications to the object are immediately committed,
 * changes coming from the engine (or other components) cause an immediate rerender.
 *
 * In comparison to {@link svelteUseShape}, discrete CRDTs are untyped.
 * You can put any JSON data inside and need to validate the schema yourself.
 *
 * @param documentIdOrPromise The NURI of the CRDT document or a promise to that.
 * @returns The reactive JSON object of the CRDT document.
 *
 *@example
 * ```svelte
 * <script lang="ts">
 *     // We assume you have created a CRDT document already, as below.
 *     // const documentId = await ng.doc_create(
 *     //     session_id,
 *     //     crdt, // "Automerge" | "YMap" | "YArray"
 *     //     crdt === "Automerge" ? "data:json" : crdt === "YMap ? "data:map" : "data:array",
 *     //     "store",
 *     //     undefined,
 *     // );
 *
 *     const { doc } = useDiscrete(documentIdPromise);
 *
 *     $effect(() => {
 *         // If the CRDT document is still empty, we need to initialize it.
 *         if (doc && !doc.expenses) {
 *             doc.expenses = [];
 *         }
 *     });
 *
 *     const createExpense = () => {
 *         // Note that we use *expense["@id"]* as a key in the expense list.
 *         // Every object added to a CRDT array gets a stable `@id` property assigned
 *         // which you can use for referencing objects in arrays even as
 *         // preceding objects are removed or added from the array.
 *         // The `@id` is an NURI with the schema `<documentId>:d:<object-specific id>`.
 *         // Since the `@id` is generated in the engine, the object is
 *         // *preliminarily given a mock id* which will be replaced immediately.
 *         expenses.push({
 *             title: "New expense",
 *             date: new Date().toISOString(),
 *         });
 *      };
 *
 *
 * </script>
 *
 * <section>
 *     <div>
 *         <button on:click={() => createExpense({})}/>
 *
 *         {#if !doc}
 *             Loading...
 *         {:else if doc.expenses.length === 0}
 *             <p>
 *                 Nothing tracked yet - log your first purchase to kick things off.
 *             </p>
 *         {:else}
 *             {#each doc.expenses as expense, index (expense['@id']) }
 *                 <ExpenseCard
 *                     expense={expense}
 *                 />
 *             {/each}
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
 *         bind:value={expense.title}
 *     />
 * </div>
 * ```
 */
export function useDiscrete<
    T = DiscreteRoot,
    DocIdOrPromise extends string | Promise<string> | undefined =
        | string
        | Promise<string>
        | undefined,
>(
    documentIdOrPromise: DocIdOrPromise
): UseDiscreteResult<
    // @ts-ignore
    T,
    DocIdOrPromise
> {
    let isDestroyed = false;

    let ret = $state({}) as UseDiscreteResult<any, DocIdOrPromise>;

    const init = (docId: string) => {
        if (isDestroyed) return;
        const subscription = DiscreteOrmSubscription.getOrCreate(docId);
        ret.subscription = subscription as any;
        ret.promise = subscription.readyPromise as any;
        subscription.readyPromise.then(() => {
            if (isDestroyed) {
                subscription?.close();
                return;
            }
            const doc = useDeepSignal(
                subscription!.signalObject!
            ) as DeepSignal<T>;
            // Set different prototype to prevent svelte from proxying.
            setRawPrototype(doc);
            ret.doc = doc;
            ret.isLoading = false;
        });
    };

    if (typeof documentIdOrPromise === "string") {
        init(documentIdOrPromise);
    } else if (documentIdOrPromise === undefined) {
        // There is nothing to initialize.
    } else {
        documentIdOrPromise.then(init);
    }

    onDestroy(() => {
        isDestroyed = true;
        if (ret.subscription) {
            ret.subscription.close();
        }
    });

    ret.isLoading = !!ret.subscription && !ret.subscription.isReady;

    return ret;
}

type UseDiscreteResult<
    T extends DiscreteRoot,
    DocIdOrPromise extends string | Promise<string> | undefined,
> = {
    /**
     * `true` when no data is available yet and `conf` is not `undefined`.
     */
    isLoading: boolean;
    /**
     * The JSON object of the requested CRDT document.
     *
     * This object is a svelte-reactive version of the value returned by {@link DiscreteOrmSubscription.signalObject}.
     */
    doc: DeepSignal<T> | undefined;
    /**
     * A promise that resolves once the data is loaded.
     * Note that if `conf` is `undefined`, this property is `undefined`.
     */
    promise: DocIdOrPromise extends undefined
        ? undefined
        : Promise<DeepSignal<T>>;
    /** The underlying {@link DiscreteOrmSubscription} through which the data is loaded. */
    subscription: DocIdOrPromise extends undefined
        ? undefined
        : DiscreteOrmSubscription<T>;
};
