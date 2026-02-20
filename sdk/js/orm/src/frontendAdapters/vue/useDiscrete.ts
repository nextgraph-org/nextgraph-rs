// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import {
    computed,
    MaybeRefOrGetter,
    onBeforeUnmount,
    shallowReactive,
    ToRefs,
    toRefs,
    toValue,
    watchEffect,
} from "vue";
import { useDeepSignal } from "@ng-org/alien-deepsignals/vue";
import { DiscreteOrmSubscription } from "../../connector/discrete/discreteOrmSubscriptionHandler.ts";
import { DiscreteRootObject } from "../../types.ts";

/**
 * Hook to subscribe to an existing discrete (JSON) CRDT document.
 * You can modify the returned object like any other JSON object. Changes are immediately
 * reflected in the CRDT document.
 *
 * Establishes a 2-way binding: Modifications to the object are immediately committed,
 * changes coming from the engine (or other components) cause an immediate rerender.
 *
 * In comparison to `useShape`, discrete CRDTs are untyped.
 * You can put any JSON data inside and need to validate the schema yourself.
 *
 * @param documentId The IRI of the CRDT document or `undefined` as MaybeRefOrGetter.
 * @returns An object that contains as `data` the reactive DeepSignal object or undefined if not loaded yet or `documentId` is undefined.
 *
 *@example
 * ```html
 * <script lang="ts">
 * // We assume you have created a CRDT document already, as below.
 * // const documentId = await ng.doc_create(
 * //     session_id,
 * //     crdt, // "Automerge" | "YMap" | "YArray"
 * //     crdt === "Automerge" ? "data:json" : crdt === "YMap ? "data:map" : "data:array",
 * //     "store",
 * //     undefined
 * // );
 * const { doc } = useDiscrete(documentId);
 *
 * // If document is new, we need to set up the basic structure.
 * effect(() => {
 *     if (doc.value && !doc.value.expenses) {
 *         doc.value.expenses = [];
 *     }
 * })
 *
 * const createExpense = () => {
 *     // Note that we use *expense["@id"]* as a key in the expense list.
 *     // Every object added to a CRDT array gets a stable `@id` property assigned
 *     // which you can use for referencing objects in arrays even as
 *     // objects are removed or added from the array.
 *     // The `@id` is an IRI with the schema `<documentId>:d:<object-specific id>`.
 *     // Since the `@id` is generated in the engine, the object is
 *     // *preliminarily given a mock id* which will be replaced immediately.
 *     doc.value.expenses.push({
 *         title: "New expense",
 *         date: new Date().toISOString(),
 *     });
 * };
 * </script>
 *
 * <template>
 *     <div v-if="!doc">
 *         Loading...
 *     </div>
 *     <div v-else>
 *         <p v-if="expenses.length === 0">
 *             No expenses yet.
 *         </p>
 *         <template v-else>
 *             <button
 *                 @click={() => createExpense()}
 *             >
 *                 + Add expense
 *             </button>
 *             <ExpenseCard
 *                 v-for="expense in expenses"
 *                 :key="expense['@id']"
 *                 :expense="expense"
 *             />
 *         </template>
 *     </div>
 * </template>
 * ```
 *
 * In the `ExpenseCard` component:
 * ```html
 * <script lang="ts">
 * const { expense } = defineProps<{
 *     expense: DeepSignal<Expense>;
 * }>();
 *
 * // If you modify expense in the component,
 * // the changes are immediately propagated to the other components
 * // And persisted in the database.
 * </script>
 *
 * <template>
 *     <input
 *         v-model="expense.title"
 *         placeholder="Expense title"
 *     />
 * </template>
 * ```
 */
export function useDiscrete(documentId: MaybeRefOrGetter<string | undefined>) {
    const ormSubscription = computed(() => {
        const id = toValue(documentId);
        return id ? DiscreteOrmSubscription.getOrCreate(id) : undefined;
    });

    const ret = shallowReactive({
        doc: undefined as undefined | DiscreteRootObject,
    });
    watchEffect(() => {
        ormSubscription.value?.readyPromise.then(() => {
            ret.doc = useDeepSignal(ormSubscription.value!.signalObject as any);
        });
    });

    onBeforeUnmount(() => {
        ormSubscription.value?.close();
    });

    return toRefs(ret) as ToRefs<{ doc: DiscreteRootObject }>;
}
