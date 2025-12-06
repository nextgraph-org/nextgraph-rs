<script setup lang="ts">
import { computed } from "vue";
import { useShape } from "@ng-org/signals/vue";
import {
    ExpenseCategoryShapeType,
    ExpenseShapeType,
} from "../../shapes/orm/expenseShapes.shapeTypes";
import type {
    Expense,
    ExpenseCategory,
} from "../../shapes/orm/expenseShapes.typings";
import { sessionPromise } from "../../utils/ngSession";
import ExpenseCard from "./ExpenseCard.vue";

const expenses = useShape(ExpenseShapeType);
const categories = useShape(ExpenseCategoryShapeType);

async function createExpense(obj: Partial<Expense> = {}) {
    const session = await sessionPromise;
    const docId = await session.ng.doc_create(
        session.session_id,
        "Graph",
        "data:graph",
        "store",
        undefined
    );
    expenses.add({
        "@graph": docId,
        "@type": "http://example.org/Expense",
        "@id": "",
        amount: obj.amount ?? 1,
        recurrenceInterval: obj.recurrenceInterval ?? "",
        description: obj.description ?? undefined,
        totalPrice: obj.totalPrice ?? 0,
        paymentStatus: obj.paymentStatus ?? "http://example.org/Paid",
        isRecurring: obj.isRecurring ?? false,
        expenseCategory: obj.expenseCategory ?? new Set<ExpenseCategory>(),
        dateOfPurchase: obj.dateOfPurchase ?? new Date().toISOString(),
        title: obj.title ?? "New Expense",
    });
}

function expenseKey(expense: Expense) {
    return `${expense["@graph"]}|${expense["@id"]}`;
}
</script>

<template>
    <section class="panel">
        <header class="panel-header">
            <div>
                <p class="field-label">Expenses</p>
                <h2 class="title">Recent activity</h2>
            </div>
            <button class="primary-btn" @click="() => createExpense({})">
                + Add expense
            </button>
        </header>
        <div class="cards-stack">
            <p v-if="expenses.size === 0" class="muted">
                Nothing tracked yet - log your first purchase to kick things off.
            </p>
            <template v-else>
                <ExpenseCard
                    v-for="expense in expenses"
                    :key="expenseKey(expense)"
                    :expense="expense"
                    :available-categories="categories"
                />
            </template>
        </div>
    </section>
</template>
