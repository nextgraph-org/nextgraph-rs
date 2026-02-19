<script setup lang="ts">
import { computed } from "vue";

import ExpenseCategoryCard from "./ExpenseCategoryCard.vue";
import { useDocumentStore } from "./useDocumentStore";

const store = useDocumentStore();
const expenseCategories = computed(
    () => store.value.doc?.expenseCategories
);
const totalCategories = computed(() => expenseCategories.value?.length);

function createCategory() {
    if (!expenseCategories.value) return;
    expenseCategories.value.push({
        categoryName: "New category",
        description: "",
    });
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
                        {{ totalCategories }} total
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
        <p v-if="totalCategories === undefined">
            Loading...
        </p>
        <p v-else-if="totalCategories === 0" class="muted">
            No categories yet
        </p>
        <div v-else class="cards-grid">
            <ExpenseCategoryCard
                v-for="(category, index) in expenseCategories"
                :key="category['@id']"
                :category="category"
            />
        </div>
    </section>
</template>
