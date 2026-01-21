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
import type { ExpenseCategory } from "../../types";
import { useDeepSignal } from "@ng-org/alien-deepsignals/vue";

const props = defineProps<{
    category: ExpenseCategory;
}>();

// Important! To subscribe to reactivity of deepSignal children, you mus call `useDeepSignal`.
// const category = useDeepSignal(props.category);
const category = props.category;

const isEditing = ref(false);
const idBase = computed(
    () => category["@id"] ?? category.categoryName ?? "category"
);

</script>

<template>
    <article class="category-card">
        <div class="card-header">
            <div>
                <p class="label-accent">Category</p>
                <h3 class="title">
                    {{ category.categoryName || "Untitled category" }}
                </h3>
            </div>
            <button
                type="button"
                class="icon-btn"
                :aria-label="isEditing ? 'Close editing' : 'Edit category'"
                @click="isEditing = !isEditing"
            >
                {{ isEditing ? "🗸" : "🖉" }}
            </button>
        </div>
        <div v-if="isEditing" class="edit-grid">
            <div>
                <label
                    class="field-label"
                    :for="`${idBase}-name`"
                >
                    Category name
                </label>
                <input
                    :id="`${idBase}-name`"
                    class="text-input"
                    :value="category.categoryName ?? ''"
                    placeholder="e.g. Groceries"
                    @input="(e) => (category.categoryName = (e.target as HTMLInputElement).value)"
                />
            </div>
            <div>
                <label
                    class="field-label"
                    :for="`${idBase}-description`"
                >
                    Description
                </label>
                <textarea
                    :id="`${idBase}-description`"
                    class="text-area"
                    :value="category.description ?? ''"
                    placeholder="Optional context for this spend bucket"
                    @input="(e) => (category.description = (e.target as HTMLTextAreaElement).value)"
                ></textarea>
            </div>
        </div>
        <p v-else class="description">
            {{ category.description || "No description yet." }}
        </p>
    </article>
</template>
