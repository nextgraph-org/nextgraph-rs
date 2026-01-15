<script setup lang="ts">
import { computed } from "vue";
import { useShape } from "@ng-org/orm/vue";
import {
    ExpenseCategoryShapeType,
    ExpenseShapeType,
} from "../../shapes/orm/expenseShapes.shapeTypes";
import type {
    Expense,
} from "../../shapes/orm/expenseShapes.typings";
import { sessionPromise } from "../../utils/ngSession";
import ExpenseCard from "./ExpenseCard.vue";

const expenses = useShape(ExpenseShapeType);
const categories = useShape(ExpenseCategoryShapeType);

async function createExpense(obj: Partial<Expense> = {}) {
    const session = await sessionPromise;

    expenses.add({
        "@graph": `did:ng:${session.private_store_id}`,
        "@type": "http://example.org/Expense",
        "@id": "",
        amount: obj.amount ?? 1,
        recurrenceInterval: obj.recurrenceInterval ?? "",
        description: obj.description ?? undefined,
        totalPrice: obj.totalPrice ?? 0,
        paymentStatus: obj.paymentStatus ?? "http://example.org/Paid",
        isRecurring: obj.isRecurring ?? false,
        expenseCategory: obj.expenseCategory ?? new Set<string>(),
        dateOfPurchase: obj.dateOfPurchase ?? new Date().toISOString(),
        title: obj.title ?? "New Expense",
    });
}

  const expensesSorted = computed(() => [...expenses].sort((a, b) =>
    a.dateOfPurchase.localeCompare(b.dateOfPurchase)
  ));

function expenseKey(expense: Expense) {
    return `${expense["@graph"]}|${expense["@id"]}`;
}
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
            <p v-if="expensesSorted.length === 0" class="muted">
                Nothing tracked yet - log your first purchase to kick things off.
            </p>
            <template v-else>
                <ExpenseCard
                    v-for="expense in expensesSorted"
                    :key="expenseKey(expense)"
                    :expense="expense"
                    :available-categories="categories"
                />
            </template>
        </div>
    </section>
</template>
