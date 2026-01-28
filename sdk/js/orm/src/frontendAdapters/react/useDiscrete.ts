// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { useEffect, useMemo, useRef } from "react";
import { DiscreteOrmConnection } from "../../connector/discrete/discreteOrmConnectionHandler.ts";
import { useDeepSignal } from "@ng-org/alien-deepsignals/react";
import { DeepSignal } from "@ng-org/alien-deepsignals";
import { DiscreteArray, DiscreteObject } from "../../types.ts";

const EMPTY_OBJECT = {} as const;

/**
 * Hook to subscribe to an existing discrete (JSON) CRDT document.
 * You can modify the returned object like any other JSON object. Changes are immediately
 * reflected in the CRDT document.
 *
 * Establishes a 2-way binding: Modifications to the object are immediately committed,
 * changes coming from the engine (or other components) cause an immediate rerender.
 *
 * In comparison to {@link useShape}, discrete CRDTs are untyped.
 * You can put any JSON data inside and need to validate the schema yourself.
 *
 * @param documentId The IRI of the CRDT document.
 * @returns An object that contains as `data` the reactive DeepSignal object or undefined if `documentId` is undefined.
 *
 * @example
 * ```tsx
 * // We assume you have created a CRDT document already, as below.
 * // const documentId = await ng.doc_create(
 * //     session_id,
 * //     crdt, // "Automerge" | "YMap" | "YArray". YArray is for root arrays, the other two have objects at root.
 * //     crdt === "Automerge" ? "data:json" : crdt === "YMap ? "data:map" : "data:array",
 * //     "store",
 * //     undefined
 * // );
 *
 * function Expenses({documentId}: {documentId: string}) {
 *     const { data } = useDiscrete(documentId);
 *
 *     // If the CRDT document is still empty, we need to initialize it.
 *     if (data && !data.expenses) {
 *         data.expenses = [];
 *     }
 *     const expenses = data?.expenses;
 *
 *     const createExpense = useCallback(() => {
 *             // Note that we use *expense["@id"]* as a key in the expense list.
 *             // Every object added to a CRDT array gets a stable `@id` property assigned
 *             // which you can use for referencing objects in arrays even as
 *             // objects are removed or added from the array.
 *             // The `@id` is an IRI with the schema `<documentId>:d:<object-specific id>`.
 *             // Since the `@id` is generated in the engine, the object is
 *             // *preliminarily given a mock id* which will be replaced immediately.
 *             expenses.push({
 *                 title: "New expense",
 *                 date: new Date().toISOString(),
 *             });
 *         },
 *         [expenses]
 *     );
 *
 *     // Still loading (data undefined)?
 *     if (!data) return <div>Loading...</div>;
 *
 *     return (
 *         <div>
 *             <button
 *                 onClick={() => createExpense()}
 *             >
 *                 + Add expense
 *             </button>
 *             <div>
 *                 {expenses.length === 0 ? (
 *                     <p>
 *                         No expenses yet.
 *                     </p>
 *                 ) : (
 *                     expenses.map((expense) => (
 *                         <ExpenseCard
 *                             key={expense["@id"]}
 *                             expense={expense}
 *                         />
 *                     ))
 *                 )}
 *             </div>
 *         </div>
 *     );
 * }
 * ```
 *
 * ---
 * In the ExpenseCard component:
 * ```tsx
 * function ExpenseCard({expense}: {expense: Expense}) {
 *    return (
 *        <input
 *            value={expense.title}
 *            onChange={(e) => {
 *                expense.title = e.target.value; // Changes trigger rerender.
 *            }}
 *        />
 *        <div>
 *            <p>Date</p>
 *            <p>{expense.data}
 *        </div
 *    );
 * }
 * ```
 */

export function useDiscrete(documentId: string | undefined) {
    const prevDocumentId = useRef<string | undefined>(undefined);
    const prevOrmConnection = useRef<DiscreteOrmConnection | undefined>(
        undefined
    );

    const ormConnection = useMemo(() => {
        // Close previous connection if documentId changed.
        if (
            prevOrmConnection.current &&
            prevDocumentId.current !== documentId
        ) {
            prevOrmConnection.current.close();
            prevOrmConnection.current = undefined;
        }

        // If no documentId, return undefined.
        if (!documentId) {
            prevDocumentId.current = undefined;
            return undefined;
        }

        // Create new connection only if needed.
        if (
            !prevOrmConnection.current ||
            prevDocumentId.current !== documentId
        ) {
            prevOrmConnection.current =
                DiscreteOrmConnection.getOrCreate(documentId);
            prevDocumentId.current = documentId;
        }

        return prevOrmConnection.current;
    }, [documentId]);

    useEffect(() => {
        return () => {
            prevOrmConnection.current?.close();
        };
    }, []);

    // useDeepSignal requires an object, so pass empty object when no connection.
    const signalSource = ormConnection?.signalObject ?? EMPTY_OBJECT;
    const state = useDeepSignal(signalSource) as DeepSignal<
        DiscreteArray | DiscreteObject
    >;

    // Only return data if we have a valid connection with a signal object.
    const data = ormConnection?.signalObject ? state : undefined;

    return { data };
}
