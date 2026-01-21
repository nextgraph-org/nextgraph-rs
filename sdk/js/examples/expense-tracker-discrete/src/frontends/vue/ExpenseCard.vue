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
import { useDeepSignal } from "@ng-org/alien-deepsignals/vue";
import type { Expense, ExpenseCategory } from "../../types";

const props = defineProps<{
    expense: Expense;
    availableCategories: ExpenseCategory[];
}>();

// Important!
// In vue, you need to wrap children into useDeepSignal hooks, to ensure the component re-renders.
// const expense = useDeepSignal(props.expense);
// const availableCategories = useDeepSignal(props.availableCategories);
const expense = props.expense;
const availableCategories = props.availableCategories;

const isEditing = ref(false);
const paymentStatusLabels: Record<Expense["paymentStatus"], string> = {
    Paid: "Paid",
    Pending: "Pending",
    Overdue: "Overdue",
    Refunded: "Refunded",
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
const isCategorySelected = (category: ExpenseCategory) =>
    !!expense.expenseCategories?.includes(category["@id"] ?? "");

const toggleCategory = (category: ExpenseCategory, checked: boolean) => {
    const categoryId = category["@id"];
    if (!categoryId) return;

    if (checked) {
        if (!expense.expenseCategories) {
            expense.expenseCategories = [categoryId];
        } else if (!expense.expenseCategories.includes(categoryId)) {
            expense.expenseCategories.push(categoryId);
        }
    } else {
        expense.expenseCategories = (expense.expenseCategories ?? []).filter(
            (value) => value !== categoryId
        );
    }
};

function nameOfCategory(categoryIri: string) {
    return availableCategories.find(
        (c: ExpenseCategory) => c["@id"] === categoryIri
    )?.categoryName;
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
                <div v-if="availableCategories.length" class="category-picker">
                    <label
                        v-for="category in availableCategories"
                        :key="category['@id'] ?? category.categoryName"
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
                <div v-if="expense.expenseCategories?.length" class="chip-list">
                    <span
                        v-for="category in expense.expenseCategories"
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
