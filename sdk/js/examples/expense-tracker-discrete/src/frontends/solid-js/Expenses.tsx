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

import type { Expense } from "../../types";
import {
    createMemo,
    createResource,
    createSignal,
    For,
    Match,
    Switch,
} from "solid-js";
import { ExpenseCard } from "./ExpenseCard.tsx";
import { useDocumentStore } from "./useDocumentStore.ts";

export function Expenses() {
    const store = useDocumentStore();

    const expensesSorted = createMemo(
        () =>
            store.doc?.expenses &&
            [...store.doc.expenses].sort((a, b) =>
                a.dateOfPurchase.localeCompare(b.dateOfPurchase)
            )
    );

    const createExpense = async (obj: Partial<Expense> = {}) => {
        await store.promise;

        store.doc!.expenses!.push({
            amount: obj.amount ?? 1,
            description: obj.description ?? "",
            totalPrice: obj.totalPrice ?? 0,
            paymentStatus: obj.paymentStatus ?? "Paid",
            isRecurring: obj.isRecurring ?? false,
            expenseCategories: obj.expenseCategories ?? [],
            dateOfPurchase: obj.dateOfPurchase ?? new Date().toISOString(),
            title: obj.title ?? "New expense",
            recurrenceInterval: obj.recurrenceInterval ?? "",
        });
    };

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
            <div class="cards-stack">
                <Switch>
                    <Match when={!store.doc}>Loading...</Match>
                    <Match when={store.doc!.expenses.length === 0}>
                        <p class="muted">
                            Nothing tracked yet - log your first purchase to
                            kick things off.
                        </p>
                    </Match>
                    <Match when={store.doc!.expenses.length > 0}>
                        <For each={expensesSorted()}>
                            {(expense) => (
                                <ExpenseCard
                                    expense={expense}
                                    availableCategories={
                                        store.doc!.expenseCategories
                                    }
                                />
                            )}
                        </For>
                    </Match>
                </Switch>
            </div>
        </section>
    );
}
