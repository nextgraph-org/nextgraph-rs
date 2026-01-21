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
import { ExpenseCategoryCard } from "./ExpenseCategoryCard";
import { useDocumentStore } from "./useDocumentStore";

export function ExpenseCategories() {
    const store = useDocumentStore();
    const expenseCategories = store.data?.expenseCategories;

    const createCategory = useCallback(async () => {
        if (!expenseCategories) return;
        expenseCategories.push({
            categoryName: "New category",
            description: "",
        });
    }, [expenseCategories]);

    const categoryKey = (category: any, index: number) =>
        category["@id"] ?? `${category.categoryName ?? "category"}-${index}`;

    return (
        <section className="panel">
            <header className="panel-header">
                <div>
                    <p className="label-accent">Categories</p>
                    <h2 className="title">
                        Expense Categories
                        <span className="badge">
                            {expenseCategories
                                ? expenseCategories.length + " total"
                                : "total"}
                        </span>
                    </h2>
                </div>
                <div className="header-actions">
                    <button
                        type="button"
                        className="primary-btn"
                        onClick={createCategory}
                    >
                        + New category
                    </button>
                </div>
            </header>
            {!expenseCategories ? (
                "Loading..."
            ) : expenseCategories.length === 0 ? (
                <p className="muted">No categories yet</p>
            ) : (
                <div className="cards-grid">
                    {expenseCategories.map((category, i) => (
                        <ExpenseCategoryCard
                            category={category}
                            key={categoryKey(category, i)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
