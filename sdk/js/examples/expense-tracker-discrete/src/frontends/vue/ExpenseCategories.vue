<script setup lang="ts">
import { useShape } from "@ng-org/orm/vue";

import { sessionPromise } from "../../utils/ngSession";
import ExpenseCategoryCard from "./ExpenseCategoryCard.vue";

const expenseCategories = useShape(ExpenseCategoryShapeType);

async function createCategory() {
    const session = await sessionPromise;

    expenseCategories.add({
        "@graph": `did:ng:${session.private_store_id}`,
        "@type": new Set(["http://example.org/ExpenseCategory"]),
        "@id": "",
        categoryName: "New category",
        description: "",
    });
}

function categoryKey(category: ExpenseCategory) {
    return `${category["@graph"]}|${category["@id"]}`;
}
</script>

<template>
    <section class="panel">
        <header class="panel-header">
            <div>
                <p class="label-accent">Categories</p>
                <h2 class="title">
                    Expense Categories
                    <span class="badge">
                        {{ expenseCategories.size }} total
                    </span>
                </h2>
            </div>
            <div class="header-actions">
                <button
                    type="button"
                    class="primary-btn"
                    @click="createCategory"
                >
                    + New category
                </button>
            </div>
        </header>
        <p v-if="expenseCategories.size === 0" class="muted">
            No categories yet
        </p>
        <div v-else class="cards-grid">
            <ExpenseCategoryCard
                v-for="category in expenseCategories"
                :key="categoryKey(category)"
                :category="category"
            />
        </div>
    </section>
</template>
