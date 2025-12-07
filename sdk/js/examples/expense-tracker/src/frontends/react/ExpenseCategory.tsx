import { useCallback, useState } from "react";
import { useShape } from "@ng-org/signals/react";
import { ExpenseCategoryShapeType } from "../../shapes/orm/expenseShapes.shapeTypes";
import type { ExpenseCategory } from "../../shapes/orm/expenseShapes.typings";
import { sessionPromise } from "../../utils/ngSession";

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

    return (
        <section className="panel">
            <header className="panel-header">
                <div>
                    <p className="label-accent">Categories</p>
                    <h2 className="badge-line">
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
                        <ExpenseCategory
                            category={category}
                            key={category["@graph"] + "|" + category["@id"]}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function ExpenseCategory({ category }: { category: ExpenseCategory }) {
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
