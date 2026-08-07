// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { useCallback, useMemo, useState } from "react";
import { useShape } from "@ng-org/orm/react";
import {
    ExpenseCategoryShapeType,
    ExpenseShapeType,
} from "../../shapes/orm/expenseShapes.shapeTypes.ts";
import type { Expense } from "../../shapes/orm/expenseShapes.typings.ts";
import { sessionPromise, session } from "../../utils/ngSession.ts";
import { insertObject } from "@ng-org/orm";
import { ExpenseList } from "./ExpenseList.tsx";

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
    const privateNuri = session && `did:ng:${session?.private_store_id}`;
    const { data: expenseCategories } = useShape(ExpenseCategoryShapeType, {
        graphs: privateNuri ? [privateNuri] : [],
    });

    const [selectedPaymentStatus, setSelectedPaymentStatus] = useState(
        "" as PaymentStatusFilter
    );
	const [selectedSortBy, setSelectedSortBy] = useState(
		"dateOfPurchase" as SortByFilter
	);
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [selectedPageSize, setSelectedPageSize] = useState(
        undefined as PageSize | undefined
    );

    const categoryOptions = useMemo(
        () => Array.from(expenseCategories ?? []),
        [expenseCategories]
    );
    const expenseListKey = useMemo(
        () => `${selectedPaymentStatus}:${selectedCategoryId}:${selectedPageSize}`,
        [selectedCategoryId, selectedPageSize, selectedPaymentStatus]
    );
    const createExpense = useCallback(
        async (obj: Partial<Expense> = {}) => {
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
        },
        []
    );

    const paymentStatusEntries = Object.entries(paymentStatusLabels);

    const expensePageSize = selectedPageSize ?? undefined;

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
            <div className="filters-bar">
                <label className="field-group">
                    <span className="field-label">Payment status</span>
                    <select
                        className="select"
                        value={selectedPaymentStatus}
                        onChange={(event) =>
                            setSelectedPaymentStatus(
                                event.target.value as PaymentStatusFilter
                            )
                        }
                    >
                        {paymentStatusEntries.map(([statusIri, label]) => (
                            <option key={statusIri} value={statusIri}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-group">
                  <span className="field-label">Sort by</span>
                  <select
                    className="select"
                    value={selectedSortBy}
                    onChange={(event) =>
                      setSelectedSortBy(
                        event.target.value as SortByFilter
                      )
                    }
                  >
                    {Object.entries(sortByLabels).map(([sortField, label]) => (
                      <option key={sortField} value={sortField}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-group">
                    <span className="field-label">Category</span>
                    <select
                        className="select"
                        value={selectedCategoryId}
                        onChange={(event) =>
                            setSelectedCategoryId(event.target.value)
                        }
                    >
                        <option value="">All categories</option>
                        {categoryOptions.map((category) => (
                            <option key={category["@id"]} value={category["@id"]}>
                                {category.categoryName || "Unnamed category"}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-group">
                    <span className="field-label">Pagination</span>
                    <select
                        className="select"
                        value={selectedPageSize ?? ""}
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
                  key={expenseListKey}
                  paymentStatusFilter={selectedPaymentStatus || undefined}
                  categoryFilter={selectedCategoryId || undefined}
                  sortBy={selectedSortBy}
                  pageSize={expensePageSize}
                  availableCategories={expenseCategories}
              />
        </section>
    );
}