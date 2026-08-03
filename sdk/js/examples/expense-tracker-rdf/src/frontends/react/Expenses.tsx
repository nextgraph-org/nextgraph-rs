// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { useShape } from "@ng-org/orm/react";
import {
    ExpenseCategoryShapeType,
    ExpenseShapeType,
} from "../../shapes/orm/expenseShapes.shapeTypes";
import {  session } from "../../utils/ngSession";
import { ExpenseCard } from "./ExpenseCard";
import { createExpense } from "../../utils/createExpense";

export function Expenses() {
    const privateNuri = session && `did:ng:${session?.private_store_id}`;
    const {data: expenses , nextPage, previousPage} = useShape(ExpenseShapeType, {
        graphs: ["did:ng:i"],
        orderBy: {dateOfPurchase: "desc"},
        maxActivePages: 1,
        pageSize: 4
    });
    const {data: expenseCategories } = useShape(ExpenseCategoryShapeType, privateNuri );

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
                        Nothing tracked yet - log your first purchase to kick
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
