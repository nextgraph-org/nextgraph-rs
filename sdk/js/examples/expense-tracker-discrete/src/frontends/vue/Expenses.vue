<script setup lang="ts">
import { computed } from "vue";

import ExpenseCard from "./ExpenseCard.vue";
import { useDocumentStore } from "./useDocumentStore";
import type { Expense } from "../../types";

const store = useDocumentStore();
const expenses = computed(() => store.data.value?.expenses);
const expenseCategories = computed(
    () => store.data.value?.expenseCategories ?? []
);

function createExpense(obj: Partial<Expense> = {}) {
    if (!expenses.value) return;
    expenses.value.push({
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
    expenses.value && expenses.value.sort((a, b) =>
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
