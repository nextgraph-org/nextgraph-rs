<script setup lang="ts">
import { useShape } from "@ng-org/orm/vue";
import { ExpenseCategoryShapeType } from "../../shapes/orm/expenseShapes.shapeTypes";
import type { ExpenseCategory } from "../../shapes/orm/expenseShapes.typings";
import { sessionPromise, session } from "../../utils/ngSession";
import ExpenseCategoryCard from "./ExpenseCategoryCard.vue";

const privateNuri = session && `did:ng:${session?.private_store_id}`;
const { data: expenseCategories, isLoading } = useShape(ExpenseCategoryShapeType, privateNuri);

async function createCategory() {
    const session = await sessionPromise;

    expenseCategories?.add({
        "@graph": `did:ng:${session.private_store_id}`,
        "@type": new Set(["did:ng:z:ExpenseCategory"]),
        "@id": "",
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
                        {{ expenseCategories?.size }} total
                    </span>
                </h2>
            </div>
            <div class="header-actions">
                <button type="button" class="primary-btn" @click="createCategory">
                    + New category
                </button>
            </div>
        </header>
        <p v-if="!expenseCategories" class="muted">
            Loading...
        </p>
        <p v-else-if="expenseCategories.size === 0" class="muted">
            No categories yet
        </p>
        <div v-else class="cards-grid">
            <ExpenseCategoryCard v-for="category in expenseCategories" :key="category['@id']" :category="category" />
        </div>
    </section>
</template>
