<script setup lang="ts">
import { useShape } from "@ng-org/orm/vue";
import {
    ExpenseCategoryShapeType,
    ExpenseShapeType,
} from "../../shapes/orm/expenseShapes.shapeTypes";
import { session } from "../../utils/ngSession";
import ExpenseCard from "./ExpenseCard.vue";
import { createExpense } from "../../utils/createExpense.ts";

const privateNuri = session && `did:ng:${session?.private_store_id}`;
const { data: expenses, } = useShape(ExpenseShapeType, {
    graphs: ["did:ng:i"],
    orderBy: { dateOfPurchase: "desc" },
});
const { data: categories } = useShape(ExpenseCategoryShapeType, {
    graphs: [privateNuri || ""],
});

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
            <p v-if="!expenses || !categories" class="muted">
                Loading...
            </p>
            <p v-else-if="expenses.length === 0" class="muted">
                Nothing tracked yet - log your first purchase to kick things
                off.
            </p>
            <template v-else>
                <ExpenseCard v-for="expense in expenses" :key="expense['@id']" :expense="expense"
                    :available-categories="categories" />
            </template>
        </div>

    </section>
</template>
