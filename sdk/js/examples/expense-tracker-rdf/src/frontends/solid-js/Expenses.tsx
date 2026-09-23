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

import {
    ExpenseCategoryShapeType,
    ExpenseShapeType,
} from "../../shapes/orm/expenseShapes.shapeTypes.ts";
import type { Expense } from "../../shapes/orm/expenseShapes.typings.ts";
import { sessionPromise } from "../../utils/ngSession.ts";
import { insertObject } from "@ng-org/orm";
import { ExpenseList } from "./ExpenseList.tsx";
import { createMemo, createResource, createSignal, For } from "solid-js";
import { useShape } from "@ng-org/orm/solid-js";

const paymentStatusLabels = {
    "": "All statuses",
    "did:ng:z:Paid": "Paid",
    "did:ng:z:Pending": "Pending",
    "did:ng:z:Overdue": "Overdue",
    "did:ng:z:Refunded": "Refunded",
} as const;

const sortByLabels = {
    dateOfPurchase: "date",
    amount: "quantity",
    totalPrice: "price",
} as const;

type PaymentStatusFilter = keyof typeof paymentStatusLabels;
type SortByFilter = keyof typeof sortByLabels;
type PageSize = 5 | 10 | 15;

export function Expenses() {
    const [session] = createResource(() => sessionPromise);
    const privateNuri = createMemo(
        () => session() && `did:ng:${session()!.private_store_id}`
    );
    const categories = useShape(ExpenseCategoryShapeType, privateNuri);

    const [selectedPaymentStatus, setSelectedPaymentStatus] = createSignal(
        "" as PaymentStatusFilter
    );
    const [selectedSortBy, setSelectedSortBy] = createSignal(
        "dateOfPurchase" as SortByFilter
    );
    const [selectedCategoryId, setSelectedCategoryId] = createSignal("");
    const [selectedPageSize, setSelectedPageSize] = createSignal(
        undefined as PageSize | undefined
    );

    const createExpense = async (obj: Partial<Expense> = {}) => {
        const session = await sessionPromise;

        insertObject(ExpenseShapeType, {
            "@graph": `did:ng:${session.private_store_id}`,
            "@type": "did:ng:z:Expense",
            "@id": "",
            amount: obj.amount ?? 1,
            recurrenceInterval: obj.recurrenceInterval ?? "",
            description: obj.description ?? undefined,
            totalPrice: obj.totalPrice ?? 0,
            paymentStatus: obj.paymentStatus ?? "did:ng:z:Paid",
            isRecurring: obj.isRecurring ?? false,
            expenseCategory: obj.expenseCategory ?? new Set<string>(),
            dateOfPurchase: obj.dateOfPurchase ?? new Date().toISOString(),
            title: obj.title ?? "New Expense",
        });
    };

    const paymentStatusEntries = Object.entries(paymentStatusLabels);

    return (
        <section class="panel">
            <header class="panel-header">
                <div>
                    <p class="label-accent">Expenses</p>
                    <h2 class="title">Recent activity</h2>
                </div>
                <button
                    type="button"
                    class="primary-btn"
                    onClick={() => createExpense({})}
                >
                    + Add expense
                </button>
            </header>
            <div class="filters-bar">
                <label class="field-group">
                    <span class="field-label">Payment status</span>
                    <select
                        class="select"
                        value={selectedPaymentStatus()}
                        onChange={(event) =>
                            setSelectedPaymentStatus(
                                event.target.value as PaymentStatusFilter
                            )
                        }
                    >
                        <For each={paymentStatusEntries}>
                            {([statusIri, label]) => (
                                <option value={statusIri}>{label}</option>
                            )}
                        </For>
                    </select>
                </label>
                <label class="field-group">
                    <span class="field-label">Sort by</span>
                    <select
                        class="select"
                        value={selectedSortBy()}
                        onChange={(event) =>
                            setSelectedSortBy(
                                event.target.value as SortByFilter
                            )
                        }
                    >
                        <For each={Object.entries(sortByLabels)}>
                            {([sortField, label]) => (
                                <option value={sortField}>{label}</option>
                            )}
                        </For>
                    </select>
                </label>
                <label class="field-group">
                    <span class="field-label">Category</span>
                    <select
                        class="select"
                        value={selectedCategoryId()}
                        onChange={(event) =>
                            setSelectedCategoryId(event.target.value)
                        }
                    >
                        <option value="">All categories</option>
                        <For each={[...(categories.data || [])]}>
                            {(category) => (
                                <option value={category["@id"]}>
                                    {category.categoryName ||
                                        "Unnamed category"}
                                </option>
                            )}
                        </For>
                    </select>
                </label>
                <label class="field-group">
                    <span class="field-label">Pagination</span>
                    <select
                        class="select"
                        value={selectedPageSize() ?? ""}
                        onChange={(event) => {
                            const next = event.target.value;
                            setSelectedPageSize(
                                next ? (Number(next) as PageSize) : undefined
                            );
                        }}
                    >
                        <option value="">No pagination</option>
                        <option value="5">Page size 5</option>
                        <option value="10">Page size 10</option>
                        <option value="15">Page size 15</option>
                    </select>
                </label>
            </div>
            <ExpenseList
                paymentStatusFilter={selectedPaymentStatus() || undefined}
                categoryFilter={selectedCategoryId() || undefined}
                sortBy={selectedSortBy()}
                pageSize={selectedPageSize()}
                availableCategories={categories.data}
            />
        </section>
    );
}
