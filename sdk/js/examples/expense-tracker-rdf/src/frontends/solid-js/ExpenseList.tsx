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
import { ExpenseShapeType } from "../../shapes/orm/expenseShapes.shapeTypes";
import type {
    Expense,
    ExpenseCategory,
} from "../../shapes/orm/expenseShapes.typings";
import { session as ngSession, sessionPromise } from "../../utils/ngSession";
import { ExpenseCard } from "./ExpenseCard";
import { createResource, For, Match, Switch } from "solid-js";

const orderByConfigs = {
    dateOfPurchase: { dateOfPurchase: "desc" },
    amount: { amount: "desc" },
    totalPrice: { totalPrice: "desc" },
} as const;

export function ExpenseList(props: {
    paymentStatusFilter?: Expense["paymentStatus"];
    categoryFilter?: string;
    pageSize?: 5 | 10 | 15;
    availableCategories: Set<ExpenseCategory> | undefined;
    sortBy?: "dateOfPurchase" | "amount" | "totalPrice";
}) {
    const [session] = createResource(() => sessionPromise, {
        initialValue: ngSession,
    });

    const expenses = useShape(
        ExpenseShapeType,
        () =>
            session() && {
                graphs: `did:ng:${session()!.private_store_id}`,
                orderBy: orderByConfigs[props.sortBy || "dateOfPurchase"],
                ...(props.pageSize
                    ? {
                          pageSize: props.pageSize,
                          maxActivePages: 1,
                      }
                    : {}),
                where: {
                    ...(props.paymentStatusFilter
                        ? { paymentStatus: props.paymentStatusFilter }
                        : {}),
                    ...(props.categoryFilter
                        ? { expenseCategory: props.categoryFilter }
                        : {}),
                },
            }
    );

    return (
        <>
            <div class="cards-stack">
                <Switch>
                    <Match when={!expenses.data || !props.availableCategories}>
                        <p class="muted">Loading...</p>
                    </Match>
                    <Match when={expenses.data?.length === 0}>
                        <p class="muted">No items found</p>
                    </Match>
                    <Match
                        when={
                            expenses.data &&
                            expenses.data?.length > 0 &&
                            !!props.availableCategories
                        }
                    >
                        <For each={expenses.data}>
                            {(expense) => (
                                <ExpenseCard
                                    expense={expense}
                                    availableCategories={
                                        props.availableCategories!
                                    }
                                />
                            )}
                        </For>
                    </Match>
                </Switch>
            </div>
            {props.pageSize && (
                <div class="pagination-bar">
                    <button
                        type="button"
                        class="primary-btn"
                        onClick={() => expenses.previousPage?.()}
                    >
                        load previous
                    </button>
                    <button
                        type="button"
                        class="primary-btn"
                        onClick={() => expenses.nextPage?.()}
                    >
                        load next
                    </button>
                </div>
            )}
        </>
    );
}

const a: ReadonlyArray<number> = [];

type Exp = typeof a extends number[] ? true : false;
