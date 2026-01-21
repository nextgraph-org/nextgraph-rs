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
import type { ExpenseCategory } from "../../types";

export function ExpenseCategoryCard({
    category,
}: {
    category: ExpenseCategory;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const idBase = category["@id"] ?? category.categoryName ?? "category";

    return (
        <article className="category-card">
            <div className="card-header">
                <div>
                    <p className="label-accent">Category</p>
                    <h3 className="title">
                        {category.categoryName || "Untitled category"}
                    </h3>
                </div>
                <button
                    type="button"
                    className="icon-btn"
                    aria-label={isEditing ? "Close editing" : "Edit category"}
                    onClick={() => setIsEditing((prev) => !prev)}
                >
                    {isEditing ? "🗸" : "🖉"}
                </button>
            </div>
            {isEditing ? (
                <div className="edit-grid">
                    <div>
                        <label
                            className="field-label"
                            htmlFor={`${idBase}-name`}
                        >
                            Category name
                        </label>
                        <input
                            id={`${idBase}-name`}
                            className="text-input"
                            value={category.categoryName ?? ""}
                            placeholder="e.g. Groceries"
                            onChange={(e) =>
                                (category.categoryName = e.target.value)
                            }
                        />
                    </div>
                    <div>
                        <label
                            className="field-label"
                            htmlFor={`${idBase}-description`}
                        >
                            Description
                        </label>
                        <textarea
                            id={`${idBase}-description`}
                            className="text-area"
                            value={category.description ?? ""}
                            placeholder="Optional context for this spend bucket"
                            onChange={(e) =>
                                (category.description = e.target.value)
                            }
                        />
                    </div>
                </div>
            ) : (
                <p className="description">
                    {category.description || "No description yet."}
                </p>
            )}
        </article>
    );
}
