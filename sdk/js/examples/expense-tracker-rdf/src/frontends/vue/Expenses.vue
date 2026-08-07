<script setup lang="ts">
import { computed, ref } from "vue";
import { useShape } from "@ng-org/orm/vue";
import {
    ExpenseCategoryShapeType,
    ExpenseShapeType,
} from "../../shapes/orm/expenseShapes.shapeTypes.ts";
import type { Expense } from "../../shapes/orm/expenseShapes.typings.ts";
import { sessionPromise, session } from "../../utils/ngSession.ts";
import ExpenseList from "./ExpenseList.vue";
import { insertObject } from "@ng-org/orm";

const privateNuri = ref(session && `did:ng:${session?.private_store_id}`);
sessionPromise.then(session => privateNuri.value = `did:ng:${session?.private_store_id}`);

const paymentStatusLabels = {
    "": "All statuses",
    "did:ng:z:Paid": "Paid",
    "did:ng:z:Pending": "Pending",
    "did:ng:z:Overdue": "Overdue",
    "did:ng:z:Refunded": "Refunded",
} as const;

const sortByLabels = {
    dateOfPurchase: "date",
    amount: "quantity",
    totalPrice: "price",
} as const;

const selectedPaymentStatus = ref<keyof typeof paymentStatusLabels>("");
const selectedSortBy = ref<keyof typeof sortByLabels>("dateOfPurchase");
const selectedCategoryId = ref("");
const selectedPageSize = ref<undefined | 5 | 10 | 15>(undefined);

const { data: categories } = computed(() => useShape(
    ExpenseCategoryShapeType,
    {
        graphs: privateNuri.value ? [privateNuri.value] : ["did:ng:i"],
    }
)).value;

const categoryOptions = computed(() => Array.from(categories.value ?? []));
const expenseListKey = computed(
    () =>
        `${selectedPaymentStatus.value}:${selectedSortBy.value}:${selectedCategoryId.value}:${selectedPageSize.value}`
);

async function createExpense(obj: Partial<Expense> = {}) {
    const session = await sessionPromise;

    insertObject(ExpenseShapeType, {
        "@graph": `did:ng:${session.private_store_id}`,
        "@type": "did:ng:z:Expense",
        "@id": "",
        amount: obj.amount ?? 1,
        recurrenceInterval: obj.recurrenceInterval ?? "",
        description: obj.description ?? undefined,
        totalPrice: obj.totalPrice ?? 0,
        paymentStatus: obj.paymentStatus ?? "did:ng:z:Paid",
        isRecurring: obj.isRecurring ?? false,
        expenseCategory: obj.expenseCategory ?? new Set<string>(),
        dateOfPurchase: obj.dateOfPurchase ?? new Date().toISOString(),
        title: obj.title ?? "New Expense",
    });
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
        <div class="filters-bar">
            <label class="field-group">
                <span class="field-label">Payment status</span>
                <select v-model="selectedPaymentStatus" class="select">
                    <option v-for="(label, statusIri) in paymentStatusLabels" :key="statusIri" :value="statusIri">
                        {{ label }}
                    </option>
                </select>
            </label>
            <label class="field-group">
                <span class="field-label">Sort by</span>
                <select v-model="selectedSortBy" class="select">
                    <option v-for="(label, sortField) in sortByLabels" :key="sortField" :value="sortField">
                        {{ label }}
                    </option>
                </select>
            </label>
            <label class="field-group">
                <span class="field-label">Category</span>
                <select v-model="selectedCategoryId" class="select">
                    <option value="">All categories</option>
                    <option v-for="category in categoryOptions" :key="category['@id']" :value="category['@id']">
                        {{ category.categoryName || "Unnamed category" }}
                    </option>
                </select>
            </label>
            <label class="field-group">
                <span class="field-label">Pagination</span>
                <select v-model.number="selectedPageSize" class="select">
                    <option :value="undefined">No pagination</option>
                    <option :value="5">Page size 5</option>
                    <option :value="10">Page size 10</option>
                    <option :value="15">Page size 15</option>
                </select>
            </label>
        </div>
        <ExpenseList :key="expenseListKey" :payment-status-filter="selectedPaymentStatus || undefined"
            :sort-by="selectedSortBy" :category-filter="selectedCategoryId || undefined"
            :page-size="selectedPageSize || undefined" :available-categories="categories" />
    </section>
</template>
