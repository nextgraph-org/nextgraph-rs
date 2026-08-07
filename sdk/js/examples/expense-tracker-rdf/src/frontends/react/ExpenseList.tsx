// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type { ReactNode } from "react";
import { useShape } from "@ng-org/orm/react";
import { ExpenseShapeType } from "../../shapes/orm/expenseShapes.shapeTypes";
import type {
    Expense,
    ExpenseCategory,
} from "../../shapes/orm/expenseShapes.typings";
import { session } from "../../utils/ngSession";
import { ExpenseCard } from "./ExpenseCard";

  const orderByConfigs = {
    dateOfPurchase: { dateOfPurchase: "desc" },
    amount: { amount: "desc" },
    totalPrice: { totalPrice: "desc" },
  } as const;

export function ExpenseList({
    paymentStatusFilter,
    categoryFilter,
    pageSize,
    availableCategories,
    sortBy,
}: {
    paymentStatusFilter?: Expense["paymentStatus"];
    categoryFilter?: string;
    pageSize?: 5 | 10 | 15;
    availableCategories: Set<ExpenseCategory> | undefined;
    sortBy?: "dateOfPurchase" | "amount" | "totalPrice";
}) {
    const privateNuri = session && `did:ng:${session?.private_store_id}`;
    const { data: expenses, nextPage, previousPage } = useShape(
        ExpenseShapeType,
        {
            graphs: privateNuri ? [privateNuri] : [],
            orderBy: orderByConfigs[sortBy  || "dateOfPurchase"],
            ...(pageSize
                ? {
                      pageSize,
                      maxActivePages: 1,
                  }
                : {}),
            where: {
                ...(paymentStatusFilter ? { paymentStatus: paymentStatusFilter } : {}),
                ...(categoryFilter ? { expenseCategory: categoryFilter } : {}),
            },
        }
    );

    return (
        <>
            <div className="cards-stack">
                {!expenses || !availableCategories && <p className="muted">Loading...</p>}
                {expenses && expenses.length === 0 && (
                    <p className="muted">No items found</p>
                )}
                {expenses && expenses.length > 0 &&
                    expenses.map((expense) => (
                        <ExpenseCard
                            key={expense["@id"]}
                            expense={expense}
                            availableCategories={availableCategories}
                        />
                    ))}
            </div>
            {pageSize && (
                <div className="pagination-bar">
                    <button
                        type="button"
                        className="primary-btn"
                        onClick={() => previousPage?.()}
                    >
                        load previous
                    </button>
                    <button
                        type="button"
                        className="primary-btn"
                        onClick={() => nextPage?.()}
                    >
                        load next
                    </button>
                </div>
            )}
        </>
    );
}