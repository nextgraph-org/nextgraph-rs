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
import { useShape } from "@ng-org/signals/react";
import { ExpenseCategoryShapeType } from "../../shapes/orm/expenseShapes.shapeTypes";
import { sessionPromise } from "../../utils/ngSession";
import { ExpenseCategoryCard } from "./ExpenseCategoryCard";

export function ExpenseCategories() {
    const expenseCategories = useShape(ExpenseCategoryShapeType);

    const createCategory = useCallback(async () => {
        const session = await sessionPromise;
        const docId = await session.ng.doc_create(
            session.session_id,
            "Graph",
            "data:graph",
            "store",
            undefined
        );

        expenseCategories.add({
            "@graph": docId,
            "@type": new Set(["http://example.org/ExpenseCategory"]),
            "@id": "",
            categoryName: "New category",
            description: "",
        });
    }, [expenseCategories]);

    const categoryKey = (category: { "@graph": string; "@id": string }) =>
        `${category["@graph"]}|${category["@id"]}`;

    return (
        <section className="panel">
            <header className="panel-header">
                <div>
                    <p className="label-accent">Categories</p>
                    <h2 className="title">
                        Expense Categories
                        <span className="badge">
                            {expenseCategories.size} total
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
            {expenseCategories.size === 0 ? (
                <p className="muted">No categories yet</p>
            ) : (
                <div className="cards-grid">
                    {[...expenseCategories].map((category) => (
                        <ExpenseCategoryCard
                            category={category}
                            key={categoryKey(category)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
