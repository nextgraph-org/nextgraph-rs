// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { useCallback, useMemo } from "react";

import { sessionPromise } from "../../utils/ngSession";
import { ExpenseCard } from "./ExpenseCard";
import { useDocumentStore } from "./useDocumentStore";
import type { Expense } from "../../types";

export function Expenses() {
    const store = useDocumentStore();
    const expenses = store.data?.expenses;
    const expenseCategories = store.data?.expenseCategories;

    const expensesSorted = useMemo(
        () =>
            expenses &&
            [...expenses].sort((a, b) =>
                a.dateOfPurchase.localeCompare(b.dateOfPurchase)
            ),
        [expenses]
    );

    const createExpense = useCallback(
        async (obj: Partial<Expense> = {}) => {
            const session = await sessionPromise;

            expenses!.push({
                amount: obj.amount ?? 1,
                description: obj.description ?? "",
                totalPrice: obj.totalPrice ?? 0,
                paymentStatus: obj.paymentStatus ?? "Paid",
                isRecurring: obj.isRecurring ?? false,
                expenseCategories: obj.expenseCategories ?? [],
                dateOfPurchase: obj.dateOfPurchase ?? new Date().toISOString(),
                title: obj.title ?? "New expense",
                recurrenceInterval: obj.recurrenceInterval ?? "",
            });
        },
        [expenses]
    );

    return (
        <section className="panel">
            <header className="panel-header">
                <div>
                    <p className="label-accent">Expenses</p>
                    <h2 className="title">Recent activity</h2>
                </div>
                <button
                    type="button"
                    className="primary-btn"
                    onClick={() => createExpense({})}
                >
                    + Add expense
                </button>
            </header>
            <div className="cards-stack">
                {!expensesSorted && "Loading..."}

                {expensesSorted?.length === 0 && (
                    <p className="muted">
                        Nothing tracked yet - log your first purchase to kick
                        things off.
                    </p>
                )}
                {expensesSorted &&
                    expensesSorted.length > 0 &&
                    expensesSorted.map((expense, i) => {
                        if (!expense["@id"]) return;
                        return (
                            <ExpenseCard
                                key={expense["@id"]}
                                expense={expense}
                                availableCategories={expenseCategories!}
                            />
                        );
                    })}
            </div>
        </section>
    );
}
