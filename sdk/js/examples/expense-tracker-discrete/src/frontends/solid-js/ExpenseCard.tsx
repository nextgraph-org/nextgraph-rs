// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/** @jsxImportSource solid-js */

import { createSignal, For } from "solid-js";
import type { Expense, ExpenseCategory } from "../../types";
import { useDocumentStore } from "./useDocumentStore";

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

export function ExpenseCard(props: {
    expense: Expense;
    availableCategories: ExpenseCategory[];
}) {
    const [isEditing, setIsEditing] = createSignal(false);
    const store = useDocumentStore();

    const purchaseDate = props.expense.dateOfPurchase
        ? new Date(props.expense.dateOfPurchase).toLocaleDateString()
        : "Date not set";
    const totalPriceDisplay = currencyFormatter.format(
        props.expense.totalPrice ?? 0
    );

    const isCategorySelected = (category: ExpenseCategory) =>
        !!props.expense.expenseCategories?.includes(category["@id"]!);

    const toggleCategory = (category: ExpenseCategory, checked: boolean) => {
        if (checked) {
            if (!props.expense.expenseCategories) {
                props.expense.expenseCategories = [category["@id"]!];
            } else {
                props.expense.expenseCategories.push(category["@id"]!);
            }
        } else {
            props.expense.expenseCategories =
                props.expense.expenseCategories?.filter(
                    (e) => e !== category["@id"]
                );
        }
    };

    const nameOfCategory = (categoryIri: string) =>
        props.availableCategories.find((c) => c["@id"] === categoryIri)
            ?.categoryName || "Unnamed";

    return (
        <article class="expense-card">
            <div class="expense-header">
                <div class="header-text">
                    {isEditing() ? (
                        <input
                            class="header-input"
                            value={props.expense.title ?? ""}
                            placeholder="Expense title"
                            onChange={(e) => {
                                props.expense.title = e.target.value;
                            }}
                        />
                    ) : (
                        <h3 class="header-title">
                            {props.expense.title || "New expense"}
                        </h3>
                    )}
                    <p class="muted small-margin">{purchaseDate}</p>
                </div>
                <button
                    type="button"
                    class="icon-btn"
                    aria-label={isEditing() ? "Close editing" : "Edit expense"}
                    onClick={() => setIsEditing((prev) => !prev)}
                >
                    {isEditing() ? (
                        <svg
                            data-slot="icon"
                            fill="none"
                            stroke-width="1.5"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M6 18 18 6M6 6l12 12"
                            ></path>
                        </svg>
                    ) : (
                        <svg
                            data-slot="icon"
                            fill="none"
                            stroke-width="1.5"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                            ></path>
                        </svg>
                    )}
                </button>
            </div>
            <div class="info-grid">
                <div class="field-group">
                    <span class="field-label">Description</span>
                    {isEditing() ? (
                        <textarea
                            class="textarea"
                            value={props.expense.description ?? ""}
                            placeholder="Add helpful context"
                            onChange={(e) =>
                                (props.expense.description = e.target.value)
                            }
                        />
                    ) : (
                        <p class="value-text">
                            {props.expense.description || "No description yet."}
                        </p>
                    )}
                </div>
                <div class="field-group">
                    <span class="field-label">Total price (€)</span>
                    {isEditing() ? (
                        <input
                            type="number"
                            class="input"
                            value={props.expense.totalPrice ?? 0}
                            onChange={(e) =>
                                (props.expense.totalPrice = Number(
                                    e.target.value
                                ))
                            }
                        />
                    ) : (
                        <span class="value-text">{totalPriceDisplay}</span>
                    )}
                </div>
                <div class="field-group">
                    <span class="field-label">Quantity</span>
                    {isEditing() ? (
                        <input
                            type="number"
                            min={1}
                            class="input"
                            value={props.expense.amount ?? 1}
                            onChange={(e) =>
                                (props.expense.amount = Number(e.target.value))
                            }
                        />
                    ) : (
                        <span class="value-text">
                            {props.expense.amount ?? 1}
                        </span>
                    )}
                </div>
                <div class="field-group">
                    <span class="field-label">Payment status</span>
                    {isEditing() ? (
                        <select
                            class="select"
                            value={props.expense.paymentStatus}
                            onChange={(e) =>
                                (props.expense.paymentStatus = e.target
                                    .value as Expense["paymentStatus"])
                            }
                        >
                            <For each={Object.entries(paymentStatusLabels)}>
                                {([paymentStatusIri, label]) => (
                                    <option value={paymentStatusIri}>
                                        {label}
                                    </option>
                                )}
                            </For>
                        </select>
                    ) : (
                        <span class="value-text">
                            {paymentStatusLabels[props.expense.paymentStatus] ??
                                "Unknown"}
                        </span>
                    )}
                </div>
            </div>
            <div class="field-group">
                <span class="field-label">Categories</span>
                {isEditing() ? (
                    props.availableCategories.length ? (
                        <div class="category-picker">
                            <For each={[...props.availableCategories]}>
                                {(category) => (
                                    <label class="category-option">
                                        <input
                                            type="checkbox"
                                            class="checkbox"
                                            checked={isCategorySelected(
                                                category
                                            )}
                                            onChange={(e) =>
                                                toggleCategory(
                                                    category,
                                                    e.target.checked
                                                )
                                            }
                                        />
                                        <span class="category-text">
                                            <strong>
                                                {category.categoryName ||
                                                    "Unnamed"}
                                            </strong>
                                            <small class="muted">
                                                {category.description ||
                                                    "No description"}
                                            </small>
                                        </span>
                                    </label>
                                )}
                            </For>
                        </div>
                    ) : (
                        <p class="muted">
                            No categories available yet. Create one in the panel
                            above.
                        </p>
                    )
                ) : props.expense.expenseCategories.length ? (
                    <div class="chip-list">
                        <For each={[...props.expense.expenseCategories]}>
                            {(categoryIri, _index) => (
                                <span class="chip">
                                    {nameOfCategory(categoryIri)}
                                </span>
                            )}
                        </For>
                    </div>
                ) : (
                    <p class="muted">No categories linked.</p>
                )}
                {!isEditing() && (
                    <small class="helper-text">
                        Enter edit mode to link categories.
                    </small>
                )}
            </div>
        </article>
    );
}
