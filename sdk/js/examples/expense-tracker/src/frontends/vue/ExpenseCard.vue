<!--
Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
All rights reserved.
Licensed under the Apache License, Version 2.0
<LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
at your option. All files in the project carrying such
notice may not be copied, modified, or distributed except
according to those terms.
SPDX-License-Identifier: Apache-2.0 OR MIT
-->
<script setup lang="ts">
import { computed, ref } from "vue";
import type {
    Expense,
    ExpenseCategory,
} from "../../shapes/orm/expenseShapes.typings";
import type { DeepSignalSet } from "@ng-org/alien-deepsignals";
import { useDeepSignal } from "@ng-org/alien-deepsignals/vue";

const props = defineProps<{
    expense: Expense;
    availableCategories: DeepSignalSet<ExpenseCategory>;
}>();

// Important!
// In vue, you need to wrap children into useDeepSignal hooks, to ensure the component re-renders.
const expense = useDeepSignal(props.expense);

const isEditing = ref(false);
const paymentStatusLabels: Record<Expense["paymentStatus"], string> = {
    "http://example.org/Paid": "Paid",
    "http://example.org/Pending": "Pending",
    "http://example.org/Overdue": "Overdue",
    "http://example.org/Refunded": "Refunded",
};

const paymentStatusEntries = Object.entries(paymentStatusLabels);

const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
});

const purchaseDate = computed(() =>
    expense.dateOfPurchase
        ? new Date(expense.dateOfPurchase).toLocaleDateString()
        : "Date not set"
);

const totalPriceDisplay = computed(() =>
    currencyFormatter.format(expense.totalPrice)
);



function toggleCategory(category: ExpenseCategory, checked: boolean) {
    if (checked) {
        expense.expenseCategory.add(category["@id"]);
    } else {
        expense.expenseCategory.delete(category["@id"]);
    }
}

function isCategorySelected(category: ExpenseCategory) {
    return expense.expenseCategory.has(category["@id"])
}

function nameOfCategory(categoryIri: string) {
    return props.availableCategories.find(c => c["@id"] === categoryIri)?.categoryName;
}

function categoryKey(category: ExpenseCategory) {
    return `${category["@graph"]}|${category["@id"]}`;
}
</script>

<template>
    <article class="expense-card">
        <div class="expense-header">
            <div class="header-text">
                <input
                    v-if="isEditing"
                    class="header-input"
                    v-model="expense.title"
                    placeholder="Expense title"
                />
                <h3 v-else class="header-title">
                    {{ expense.title || "New expense" }}
                </h3>
                <p class="muted small-margin">
                    {{ purchaseDate }}
                </p>
            </div>
            <button
                type="button"
                class="icon-btn"
                :aria-label="isEditing ? 'Close editing' : 'Edit expense'"
                @click="isEditing = !isEditing"
            >
                {{ isEditing ? "🗸" : "🖉" }}
            </button>
        </div>
        <div class="info-grid">
            <div class="field-group">
                <span class="field-label">Description</span>
                <textarea
                    v-if="isEditing"
                    class="textarea"
                    v-model="expense.description"
                    placeholder="Add helpful context"
                ></textarea>
                <p v-else class="value-text">
                    {{ expense.description || "No description yet." }}
                </p>
            </div>
            <div class="field-group">
                <span class="field-label">Total price (€)</span>
                <input
                    v-if="isEditing"
                    type="number"
                    class="input"
                    v-model="expense.totalPrice"
                />
                <span v-else class="value-text">{{ totalPriceDisplay }}</span>
            </div>
            <div class="field-group">
                <span class="field-label">Quantity</span>
                <input
                    v-if="isEditing"
                    type="number"
                    min="1"
                    class="input"
                    v-model="expense.amount"
                />
                <span v-else class="value-text">{{ expense.amount ?? 1 }}</span>
            </div>
            <div class="field-group">
                <span class="field-label">Payment status</span>
                <select
                    v-if="isEditing"
                    class="select"
                    v-model="expense.paymentStatus"
                >
                    <option
                        v-for="[statusIri, label] in paymentStatusEntries"
                        :key="statusIri"
                        :value="statusIri"
                    >
                        {{ label }}
                    </option>
                </select>
                <span v-else class="value-text">
                    {{ paymentStatusLabels[expense.paymentStatus] ?? "Unknown" }}
                </span>
            </div>
        </div>
        <div class="field-group">
            <span class="field-label">Categories</span>
            <template v-if="isEditing">
                <div v-if="props.availableCategories.size" class="category-picker">
                    <label
                        v-for="category in props.availableCategories"
                        :key="categoryKey(category)"
                        class="category-option"
                    >
                        <input
                            type="checkbox"
                            class="checkbox"
                            :checked="isCategorySelected(category)"
                            @change="(e) => toggleCategory(category, (e.target as HTMLInputElement).checked)"
                        />
                        <span class="category-text">
                            <strong>
                                {{ category.categoryName || "Unnamed" }}
                            </strong>
                            <small class="muted">
                                {{ category.description || "No description" }}
                            </small>
                        </span>
                    </label>
                </div>
                <p v-else class="muted">
                    No categories available yet. Create one in the panel above.
                </p>
            </template>
            <template v-else>
                <div v-if="expense.expenseCategory.size" class="chip-list">
                    <span
                        v-for="category in expense.expenseCategory"
                        :key="category"
                        class="chip"
                    >
                        {{ nameOfCategory(category) || "Unnamed" }}
                    </span>
                </div>
                <p v-else class="muted">
                    No categories linked.
                </p>
                <small class="helper-text">
                    Enter edit mode to link categories.
                </small>
            </template>
        </div>
    </article>
</template>
