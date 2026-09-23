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

import { For } from "solid-js";
import { ExpenseCategoryCard } from "./ExpenseCategoryCard";
import { useDocumentStore } from "./useDocumentStore";

export function ExpenseCategories() {
    const store = useDocumentStore();

    const createCategory = async () => {
        const doc = await store.promise;

        doc.expenseCategories.push({
            categoryName: "New category",
            description: "",
        });
    };

    return (
        <section class="panel">
            <header class="panel-header">
                <div>
                    <p class="label-accent">Categories</p>
                    <h2 class="title">
                        Expense Categories
                        {store.doc && (
                            <span class="badge">
                                {store.doc.expenseCategories.length} total
                            </span>
                        )}
                    </h2>
                </div>
                <div class="header-actions">
                    <button
                        type="button"
                        class="primary-btn"
                        onClick={createCategory}
                    >
                        + New category
                    </button>
                </div>
            </header>
            {!store.doc && <p class="muted">Loading...</p>}
            {store.doc && store.doc.expenseCategories.length === 0 && (
                <p class="muted">No categories yet</p>
            )}
            {store.doc && store.doc.expenseCategories.length > 0 && (
                <div class="cards-grid">
                    <For each={store.doc.expenseCategories}>
                        {(category) => (
                            <ExpenseCategoryCard category={category} />
                        )}
                    </For>
                </div>
            )}
        </section>
    );
}
