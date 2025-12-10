// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { useCallback } from "react";
import { useShape } from "@ng-org/signals/react";
import {
    ExpenseCategoryShapeType,
    ExpenseShapeType,
} from "../../shapes/orm/expenseShapes.shapeTypes";
import type { Expense } from "../../shapes/orm/expenseShapes.typings";
import { sessionPromise } from "../../utils/ngSession";
import { ExpenseCard } from "./ExpenseCard";

export function Expenses() {
    const expenses = useShape(ExpenseShapeType);
    const expenseCategories = useShape(ExpenseCategoryShapeType);

    const createExpense = useCallback(
        async (obj: Partial<Expense> = {}) => {
            const session = await sessionPromise;
            const docId = await session.ng.doc_create(
                session.session_id,
                "Graph",
                "data:graph",
                "store",
                undefined
            );

            expenses.add({
                "@graph": docId,
                "@type": "http://example.org/Expense",
                "@id": "",
                amount: obj.amount ?? 1,
                description: obj.description ?? "",
                totalPrice: obj.totalPrice ?? 0,
                paymentStatus: obj.paymentStatus ?? "http://example.org/Paid",
                isRecurring: obj.isRecurring ?? false,
                expenseCategory: obj.expenseCategory ?? new Set<string>(),
                dateOfPurchase: obj.dateOfPurchase ?? new Date().toISOString(),
                title: obj.title ?? "New expense",
                recurrenceInterval: obj.recurrenceInterval ?? "",
            });
        },
        [expenses]
    );

    const expensesSorted = [...expenses].sort((a, b) =>
        a.dateOfPurchase.localeCompare(b.dateOfPurchase)
    );

    const expenseKey = (expense: Expense) =>
        `${expense["@graph"]}|${expense["@id"]}`;

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
                {expensesSorted.length === 0 ? (
                    <p className="muted">
                        Nothing tracked yet — log your first purchase to kick
                        things off.
                    </p>
                ) : (
                    expensesSorted.map((expense) => (
                        <ExpenseCard
                            key={expenseKey(expense)}
                            expense={expense}
                            availableCategories={expenseCategories}
                        />
                    ))
                )}
            </div>
        </section>
    );
}
