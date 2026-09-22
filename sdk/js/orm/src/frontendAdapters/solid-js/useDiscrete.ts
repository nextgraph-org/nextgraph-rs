// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights diserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { useDeepSignal } from "@ng-org/alien-deepsignals/solid-js";
import { DiscreteOrmSubscription } from "../../connector/DiscreteOrmSubscription.ts";
import { DiscreteRoot } from "../../types.ts";
import { DeepSignal } from "@ng-org/alien-deepsignals";
import {
    Accessor,
    createEffect,
    createMemo,
    createResource,
    createSignal,
    onCleanup,
} from "solid-js";

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
 * @param documentId The NURI of the CRDT document or and Accessor that eventually returns a string.
 * @returns An store-like object that contains as `data` the reactive DeepSignal object or undefined if available yet.
 *          As long as the accessor returns `undefined`, `subscription` is undefined too.
 *
 *@example
 * ```tsx
 * function Expenses() {
 *    // We assume you have created a CRDT document already, as below.
 *    // const documentId = await ng.doc_create(
 *    //     session_id,
 *    //     crdt, // "Automerge" | "YMap" | "YArray"
 *    //     crdt === "Automerge" ? "data:json" : crdt === "YMap ? "data:map" : "data:array",
 *    //     "store",
 *    //     undefined
 *    // );
 *    const dis = useDiscrete(documentId);
 *
 *    // If document is new / empty, we need to set up the basic structure.
 *    createEffect(() => {
 *        if (dis.doc && !dis.doc.expenses) {
 *            dis.doc.expenses = [];
 *        }
 *    });
 *
 *    const createExpense = () => {
 *        dis.doc?.expenses?.push({
 *            title: "New expense",
 *            date: new Date().toISOString(),
 *        });
 *    };
 *    return (
 *       <div v-if="!doc">
 *          {!dis.doc.expenses &&
 *             <>Loading...</>
 *          }
 *          {dis.doc &&
 *             <Show when={dis.doc.expenses.length === 0}>
 *                 No expenses yet.
 *             </Show>
 *             <Show when={dis.doc.expenses.length > 0}>
 *                <button
 *                    onclick={() => createExpense()}
 *                >
 *                    + Add expense
 *                </button>
 *                <For each={dis.doc.expenses}>
 *                   {expense =>
 *                      <ExpenseCard
 *                         expense={expense}
 *                      />
 *                   }
 *                </For>
 *             </Show>
 *          }
 *       </div>
 *    );
 * }
 *
 * // If you modify expense in the component,
 * // the changes are immediately propagated to other consuming components
 * // And persisted in the database.
 * function ExpenseCard(props: {expense: DeepSignal<Expense>}) {
 *    const { expense } = defineProps<{
 *        expense: DeepSignal<Expense>;
 *    }>();
 *
 *    return (
 *       <input
 *          placeholder="Expense title"
 *          value={expense.title}
 *          onchange={e => expense.title = e.target.value}
 *       />
 * }
 * ```
 */
export function useDiscrete<
    T extends object | Array<any> = DiscreteRoot,
    DOC_ID extends string | Accessor<string | undefined> =
        | string
        | Accessor<string | undefined>,
    DOC_ID_FLAT = DOC_ID extends Accessor<infer D> ? D : DOC_ID,
>(
    documentId: DOC_ID
): undefined extends DOC_ID_FLAT
    ? EmptyUseShapeResult<T> | UseShapeResult<T>
    : UseShapeResult<T> {
    const subscriptionSignal = createMemo(() => {
        let resolvedId: string;
        if (typeof documentId === "function") {
            const d = documentId();
            if (!d) return undefined;
            resolvedId = d;
        } else {
            resolvedId = documentId;
        }
        const subscription = DiscreteOrmSubscription.getOrCreate<T>(resolvedId);

        onCleanup(() => {
            subscription.close();
        });

        return subscription;
    });

    // Signal-ize (useDeepSignal-bound) data from subscriptions's readyPromise.
    const [dataSignal] = createResource(
        () => subscriptionSignal(),
        async (sub) => {
            // If we call useDeepSignal async, it won't be called inside
            // component initialization, so we pass a bound version.
            let onClean: undefined | (() => void) = undefined;
            let registerCleanup = (cb: () => void) => {
                onClean = cb;
            };
            onCleanup(() => {
                onClean?.();
            });

            return useDeepSignal((await sub.readyPromise) as T, {
                registerCleanup,
            });
        }
    );

    // isLoading getter (just to trigger)
    const [onIsLoadingGet, onIsLoadingSet] = createSignal(undefined, {
        equals: false,
    });
    createEffect(() => {
        subscriptionSignal()?.readyPromise.then(() => {
            onIsLoadingSet();
        });
    });

    // Construct promise.
    let resolveDataPromise: (p: any) => any;
    let rejectDataPromise: (p: any) => any;
    const dataPromise = new Promise((resolve, reject) => {
        resolveDataPromise = resolve;
        rejectDataPromise = reject;
    });
    createEffect(() => {
        subscriptionSignal()
            ?.readyPromise.then(resolveDataPromise)
            .catch(rejectDataPromise);
    });

    // @ts-ignore
    return {
        get doc() {
            return dataSignal();
        },
        get isLoading() {
            onIsLoadingGet();
            const sub = subscriptionSignal();
            return !sub?.isReady;
        },
        get subscription() {
            return subscriptionSignal() as any;
        },
        promise: dataPromise as any,
    };
}

type EmptyUseShapeResult<T = DiscreteRoot> = Omit<
    UseShapeResult<T>,
    "subscription"
> & {
    subscription: undefined;
    doc: undefined;
    isLoading: true;
};

type UseShapeResult<T = DiscreteRoot> = {
    /**
     * A promise that resolves once the data is loaded.
     * Note that if `conf` is `undefined`, this property is `undefined`.
     */
    promise: Promise<DeepSignal<T>>;
    /** The underlying {@link DiscreteOrmSubscription} through which the data is loaded. */
    subscription: DiscreteOrmSubscription<T>;
} & DATA_STATE<T>;

type DATA_STATE<T = DiscreteRoot> =
    | {
          /**
           * `true` when no data is available yet.
           *
           * It is *not* set to `true` while loading pages (through `nextPage()` or `previousPage()`.
           */
          isLoading: false;
          /**
           * The requested data, once loaded. While still loading, `data` wil be empty.
           *
           * Depending on your orderBy config, this will either be a {@link DeepSignalSet}
           * or a [`DeepSignal<ReadonlyArray>`]({@link DeepSignal}) (you can modify its properties and sub-objects though).
           *
           * This object is the value returned by {@link DiscreteOrmSubscription.signalObject}.
           */
          doc: T;
      }
    | {
          isLoading: true;
          doc: undefined;
      };
