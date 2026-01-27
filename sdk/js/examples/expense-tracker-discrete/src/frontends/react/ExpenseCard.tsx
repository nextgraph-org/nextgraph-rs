// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { useState } from "react";
import type { DeepSignalSet } from "@ng-org/alien-deepsignals";
import type { Expense, ExpenseCategory } from "../../types";

const paymentStatusLabels: Record<Expense["paymentStatus"], string> = {
    Paid: "Paid",
    Pending: "Pending",
    Overdue: "Overdue",
    Refunded: "Refunded",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
});

export function ExpenseCard({
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

    const isCategorySelected = (category: ExpenseCategory) =>
        !!expense.expenseCategories?.includes(category["@id"]!);

    const toggleCategory = (category: ExpenseCategory, checked: boolean) => {
        if (checked) {
            if (!expense.expenseCategories) {
                expense.expenseCategories = [category["@id"]!];
            } else {
                expense.expenseCategories.push(category["@id"]!);
            }
        } else {
            expense.expenseCategories = expense.expenseCategories?.filter(
                (e) => e !== category["@id"]
            );
        }
    };

    const nameOfCategory = (categoryIri: string) =>
        availableCategories.find((c) => c["@id"] === categoryIri)
            ?.categoryName || "Unnamed";

    return (
        <article className="expense-card">
            <div className="expense-header">
                <div className="header-text">
                    {isEditing ? (
                        <input
                            className="header-input"
                            value={expense.title ?? ""}
                            placeholder="Expense title"
                            onChange={(e) => {
                                expense.title = e.target.value;
                            }}
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
                    {isEditing ? (
                        <svg data-slot="icon" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"></path>
                        </svg>
                    ) : (
                        <svg data-slot="icon" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"></path>
                        </svg>
                    )}
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
                                ([paymentStatus, label]) => (
                                    <option
                                        value={paymentStatus}
                                        key={paymentStatus}
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
                            {availableCategories.map((category) => (
                                <label
                                    className="category-option"
                                    key={category["@id"]}
                                >
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={isCategorySelected(category)}
                                        onChange={(e) =>
                                            toggleCategory(
                                                category,
                                                e.target.checked
                                            )
                                        }
                                    />
                                    <span className="category-text">
                                        <strong>
                                            {category.categoryName || "Unnamed"}
                                        </strong>
                                        <small className="muted">
                                            {category.description ||
                                                "No description"}
                                        </small>
                                    </span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <p className="muted">
                            No categories available yet. Create one in the panel
                            above.
                        </p>
                    )
                ) : expense.expenseCategories?.length ? (
                    <div className="chip-list">
                        {[...expense.expenseCategories].map((categoryIri) => (
                            <span className="chip" key={categoryIri}>
                                {nameOfCategory(categoryIri)}
                            </span>
                        ))}
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
