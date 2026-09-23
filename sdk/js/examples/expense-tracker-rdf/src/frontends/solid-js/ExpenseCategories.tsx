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

import { useShape } from "@ng-org/orm/solid-js";
import { ExpenseCategoryShapeType } from "../../shapes/orm/expenseShapes.shapeTypes";
import { sessionPromise } from "../../utils/ngSession";
import { ExpenseCategoryCard } from "./ExpenseCategoryCard";
import { createResource, For, createMemo } from "solid-js";

export function ExpenseCategories() {
    const [session] = createResource(() => sessionPromise);
    const privateNuri = createMemo(
        () =>
            (session() && `did:ng:${session()!.private_store_id}`) || undefined
    );
    const categories = useShape(ExpenseCategoryShapeType, privateNuri);

    const createCategory = async () => {
        const session = await sessionPromise;

        categories.data?.add({
            "@graph": `did:ng:${session.private_store_id}`,
            "@type": new Set(["did:ng:z:ExpenseCategory"]),
            "@id": "",
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
                        {categories.data && (
                            <span class="badge">
                                {categories.data!.size} total
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
            {!categories.data && <p class="muted">Loading...</p>}
            {categories.data && categories.data?.size === 0 && (
                <p class="muted">No categories yet</p>
            )}
            {categories.data && categories.data.size > 0 && (
                <div class="cards-grid">
                    <For each={[...categories.data!]}>
                        {(category, index) => (
                            <ExpenseCategoryCard category={category} />
                        )}
                    </For>
                </div>
            )}
        </section>
    );
}
