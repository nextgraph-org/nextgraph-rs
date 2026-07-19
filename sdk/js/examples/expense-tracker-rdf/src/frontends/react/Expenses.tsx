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
import { useShape } from "@ng-org/orm/react";
import {
    ExpenseCategoryShapeType,
    ExpenseShapeType,
} from "../../shapes/orm/expenseShapes.shapeTypes";
import type { Expense } from "../../shapes/orm/expenseShapes.typings";
import { sessionPromise, session } from "../../utils/ngSession";
import { ExpenseCard } from "./ExpenseCard";
import { insertObject } from "@ng-org/orm";

export function Expenses() {
    const privateNuri = session && `did:ng:${session?.private_store_id}`;
    const {data: expenses , nextPage, previousPage} = useShape(ExpenseShapeType, session && {
        graphs: [privateNuri!],
        orderBy: {dateOfPurchase: "desc"},
        maxActivePages: 2,
        pageSize: 2
    });
    const {data: expenseCategories } = useShape(ExpenseCategoryShapeType, privateNuri );
    const createExpense = useCallback(
        async (obj: Partial<Expense> = {}) => {
            const session = await sessionPromise;

            insertObject(ExpenseShapeType,{
                "@graph": `did:ng:${session.private_store_id}`,
                "@type": "did:ng:z:Expense",
                "@id": "",
                amount: obj.amount ?? 1,
                description: obj.description ?? "",
                totalPrice: obj.totalPrice ?? 0,
                paymentStatus: obj.paymentStatus ?? "did:ng:z:Paid",
                isRecurring: obj.isRecurring ?? false,
                expenseCategory: obj.expenseCategory ?? new Set<string>(),
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
                <button
                    type="button"
                    className="primary-btn"
                    onClick={() => nextPage()}
                >
                    next page
                </button>
                <button
                    type="button"
                    className="primary-btn"
                    onClick={() => previousPage()}
                >
                    previous page
                </button>
            </header>
            <div className="cards-stack">
                {!expenses && (
                    <p className="muted">
                        Loading...
                    </p>
                )}
                {(expenses && expenses.length === 0) && (
                    <p className="muted">
                        Nothing tracked yet - log your first purchase to kick
                        things off.
                    </p>
                )}
                {expenses && expenses.length > 0 && (
                    expenses.map((expense) => (
                        <ExpenseCard
                            key={expense['@id']}
                            expense={expense}
                            availableCategories={expenseCategories}
                        />
                    ))
                )}
            </div>
        </section>
    );
}
