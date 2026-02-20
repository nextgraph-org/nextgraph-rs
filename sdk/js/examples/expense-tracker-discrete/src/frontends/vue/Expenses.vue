<!--
// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT
-->

<script setup lang="ts">
import { computed } from "vue";

import ExpenseCard from "./ExpenseCard.vue";
import { useDocumentStore } from "./useDocumentStore";
import type { Expense } from "../../types";

const { doc } = useDocumentStore();
const expenses = computed(() => doc.value?.expenses);
const expenseCategories = computed(
    () => doc.value?.expenseCategories ?? []
);

function createExpense(obj: Partial<Expense> = {}) {
    if (!expenses) return;
    expenses.value?.push({
        amount: obj.amount ?? 1,
        recurrenceInterval: obj.recurrenceInterval ?? "",
        description: obj.description ?? undefined,
        totalPrice: obj.totalPrice ?? 0,
        paymentStatus: obj.paymentStatus ?? "Paid",
        isRecurring: obj.isRecurring ?? false,
        expenseCategories: obj.expenseCategories ?? [],
        dateOfPurchase: obj.dateOfPurchase ?? new Date().toISOString(),
        title: obj.title ?? "New Expense",
    });
}

const expensesSorted = computed(() =>
    expenses.value && [...expenses.value].sort((a, b) =>
        a.dateOfPurchase.localeCompare(b.dateOfPurchase)
    )
);

</script>

<template>
    <section class="panel">
        <header class="panel-header">
            <div>
                <p class="label-accent">Expenses</p>
                <h2 class="title">Recent activity</h2>
            </div>
            <button class="primary-btn" @click="() => createExpense({})">
                + Add expense
            </button>
        </header>
        <div class="cards-stack">
            <p v-if="!expensesSorted" class="muted">
                Loading...
            </p>
            <p v-else-if="expensesSorted.length === 0" class="muted">
                Nothing tracked yet - log your first purchase to kick things
                off.
            </p>
            <template v-else>
                <ExpenseCard
                    v-for="(expense, index) in expensesSorted"
                    :key="expense['@id']"
                    :expense="expense"
                    :available-categories="expenseCategories"
                />
            </template>
        </div>
    </section>
</template>
