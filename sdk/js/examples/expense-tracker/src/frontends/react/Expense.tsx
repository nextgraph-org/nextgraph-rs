// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { useCallback, useState } from "react";
import { useShape } from "@ng-org/signals/react";
import {
    ExpenseCategoryShapeType,
    ExpenseShapeType,
} from "../../shapes/orm/expenseShapes.shapeTypes";
import type {
    Expense,
    ExpenseCategory,
} from "../../shapes/orm/expenseShapes.typings";
import { sessionPromise } from "../../utils/ngSession";

const paymentStatusLabels: Record<Expense["paymentStatus"], string> = {
    "http://example.org/Paid": "Paid",
    "http://example.org/Pending": "Pending",
    "http://example.org/Overdue": "Overdue",
    "http://example.org/Refunded": "Refunded",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
});

export function Expenses() {
    const expenses = useShape(ExpenseShapeType);
    const expenseCategories = useShape(ExpenseCategoryShapeType);

    const availableCategories = [...expenseCategories];

    const createExpense = useCallback(async () => {
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
            amount: 1,
            description: "",
            totalPrice: 0,
            paymentStatus: "http://example.org/Paid",
            isRecurring: false,
            expenseCategory: new Set<string>(),
            dateOfPurchase: new Date().toISOString(),
            title: "New expense",
            recurrenceInterval: "",
        });
    }, [expenses]);

    const expensesSorted = [...expenses].sort((a, b) =>
        a.dateOfPurchase.localeCompare(b.dateOfPurchase)
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
                    onClick={createExpense}
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
                        <Expense
                            key={expense["@graph"] + "|" + expense["@id"]}
                            expense={expense}
                            availableCategories={availableCategories}
                        />
                    ))
                )}
            </div>
        </section>
    );
}

export function Expense({
    expense,
    availableCategories,
}: {
    expense: Expense;
    availableCategories: ExpenseCategory[];
}) {
    const [isEditing, setIsEditing] = useState(false);
    const purchaseDate = expense.dateOfPurchase
        ? new Date(expense.dateOfPurchase).toLocaleDateString()
        : "Date not set";
    const totalPriceDisplay = currencyFormatter.format(expense.totalPrice ?? 0);

    return (
        <article className="expense-card">
            <div className="expense-header">
                <div className="header-text">
                    {isEditing ? (
                        <input
                            className="header-input"
                            value={expense.title ?? ""}
                            placeholder="Expense title"
                            onChange={(e) => (expense.title = e.target.value)}
                        />
                    ) : (
                        <h3 className="header-title">
                            {expense.title || "New expense"}
                        </h3>
                    )}
                    <p className="muted small-margin">{purchaseDate}</p>
                </div>
                <button
                    type="button"
                    className="icon-btn"
                    aria-label={isEditing ? "Close editing" : "Edit expense"}
                    onClick={() => setIsEditing((prev) => !prev)}
                >
                    {isEditing ? "🗸" : "🖉"}
                </button>
            </div>
            <div className="info-grid">
                <div className="field-group">
                    <span className="field-label">Description</span>
                    {isEditing ? (
                        <textarea
                            className="textarea"
                            value={expense.description ?? ""}
                            placeholder="Add helpful context"
                            onChange={(e) =>
                                (expense.description = e.target.value)
                            }
                        />
                    ) : (
                        <p className="value-text">
                            {expense.description || "No description yet."}
                        </p>
                    )}
                </div>
                <div className="field-group">
                    <span className="field-label">Total price (€)</span>
                    {isEditing ? (
                        <input
                            type="number"
                            className="input"
                            value={expense.totalPrice ?? 0}
                            onChange={(e) =>
                                (expense.totalPrice = Number(e.target.value))
                            }
                        />
                    ) : (
                        <span className="value-text">{totalPriceDisplay}</span>
                    )}
                </div>
                <div className="field-group">
                    <span className="field-label">Quantity</span>
                    {isEditing ? (
                        <input
                            type="number"
                            min={1}
                            className="input"
                            value={expense.amount ?? 1}
                            onChange={(e) =>
                                (expense.amount = Number(e.target.value))
                            }
                        />
                    ) : (
                        <span className="value-text">
                            {expense.amount ?? 1}
                        </span>
                    )}
                </div>
                <div className="field-group">
                    <span className="field-label">Payment status</span>
                    {isEditing ? (
                        <select
                            className="select"
                            value={expense.paymentStatus}
                            onChange={(e) =>
                                (expense.paymentStatus = e.target
                                    .value as Expense["paymentStatus"])
                            }
                        >
                            {Object.entries(paymentStatusLabels).map(
                                ([paymentStatusIri, label]) => (
                                    <option
                                        value={paymentStatusIri}
                                        key={paymentStatusIri}
                                    >
                                        {label}
                                    </option>
                                )
                            )}
                        </select>
                    ) : (
                        <span className="value-text">
                            {paymentStatusLabels[expense.paymentStatus] ??
                                "Unknown"}
                        </span>
                    )}
                </div>
            </div>
            <div className="field-group">
                <span className="field-label">Categories</span>
                {isEditing ? (
                    availableCategories.length ? (
                        <div className="category-picker">
                            {availableCategories.map((category) => {
                                const isChecked = expense.expenseCategory.has(
                                    category["@id"]
                                );

                                const key =
                                    category["@graph"] + "|" + category["@id"];
                                return (
                                    <label
                                        className="category-option"
                                        key={key}
                                    >
                                        <input
                                            type="checkbox"
                                            className="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    expense.expenseCategory.add(
                                                        category["@id"]
                                                    );
                                                } else {
                                                    expense.expenseCategory.delete(
                                                        category["@id"]
                                                    );
                                                }
                                            }}
                                        />
                                        <span className="category-text">
                                            <strong>
                                                {category.categoryName ||
                                                    "Unnamed"}
                                            </strong>
                                            <small className="muted">
                                                {category.description ||
                                                    "No description"}
                                            </small>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="muted">
                            No categories available yet. Create one in the panel
                            above.
                        </p>
                    )
                ) : expense.expenseCategory.size ? (
                    <div className="chip-list">
                        {[...expense.expenseCategory].map((categoryIri) => {
                            return (
                                <span className="chip" key={categoryIri}>
                                    {availableCategories.find(
                                        (c) => c["@id"] === categoryIri
                                    )?.categoryName || "Unnamed"}
                                </span>
                            );
                        })}
                    </div>
                ) : (
                    <p className="muted">No categories linked.</p>
                )}
                {!isEditing && (
                    <small className="helper-text">
                        Enter edit mode to link categories.
                    </small>
                )}
            </div>
        </article>
    );
}
