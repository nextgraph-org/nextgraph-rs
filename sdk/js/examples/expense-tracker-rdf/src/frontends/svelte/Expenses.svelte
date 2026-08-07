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
<script lang="ts">
  import { useShape } from "@ng-org/orm/svelte";
  import {
    ExpenseCategoryShapeType,
    ExpenseShapeType,
  } from "../../shapes/orm/expenseShapes.shapeTypes";
  import type { Expense } from "../../shapes/orm/expenseShapes.typings";
  import { sessionPromise, session } from "../../utils/ngSession";
  import { insertObject } from "@ng-org/orm";
  import ExpenseList from "./ExpenseList.svelte";

  const privateNuri = session && `did:ng:${session?.private_store_id}`;

  const { data: categories } = $derived(
    useShape(ExpenseCategoryShapeType, {
      graphs: privateNuri ? [privateNuri] : [],
    })
  );

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

  type PaymentStatusFilter = keyof typeof paymentStatusLabels;
  type SortByFilter = keyof typeof sortByLabels;

  let selectedPaymentStatus = $state<PaymentStatusFilter>("");
  let selectedSortBy = $state<SortByFilter>("dateOfPurchase");
  let selectedCategoryId = $state("");
  let selectedPageSize = $state<5 | 10 | 15 | undefined>(undefined);

  const categoryOptions = $derived(Array.from(categories ?? []));
  const expenseListKey = $derived(
    `${selectedPaymentStatus}:${selectedSortBy}:${selectedCategoryId}:${selectedPageSize}`
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

<section class="panel">
  <header class="panel-header">
    <div>
      <p class="label-accent">Expenses</p>
      <h2 class="title">Recent activity</h2>
    </div>
    <button class="primary-btn" onclick={() => createExpense({})}>
      + Add expense
    </button>
  </header>
  <div class="filters-bar">
    <label class="field-group">
      <span class="field-label">Payment status</span>
      <select bind:value={selectedPaymentStatus} class="select">
        {#each Object.entries(paymentStatusLabels) as [statusIri, label]}
          <option value={statusIri}>{label}</option>
        {/each}
      </select>
    </label>
    <label class="field-group">
      <span class="field-label">Sort by</span>
      <select bind:value={selectedSortBy} class="select">
        {#each Object.entries(sortByLabels) as [sortField, label]}
          <option value={sortField}>{label}</option>
        {/each}
      </select>
    </label>
    <label class="field-group">
      <span class="field-label">Category</span>
      <select bind:value={selectedCategoryId} class="select">
        <option value="">All categories</option>
        {#each categories || [] as category (category["@id"])}
          <option value={category["@id"]}>
            {category.categoryName || "Unnamed category"}
          </option>
        {/each}
      </select>
    </label>
    <label class="field-group">
      <span class="field-label">Pagination</span>
      <select
        class="select"
        value={selectedPageSize ?? ""}
        onchange={(event: Event) => {
          const next = (event.currentTarget as HTMLSelectElement | null)?.value;
          selectedPageSize = next ? (Number(next) as 5 | 10 | 15) : undefined;
        }}
      >
        <option value="">No pagination</option>
        <option value={5}>Page size 5</option>
        <option value={10}>Page size 10</option>
        <option value={15}>Page size 15</option>
      </select>
    </label>
  </div>

  <ExpenseList
    paymentStatusFilter={selectedPaymentStatus || undefined}
    sortBy={selectedSortBy}
    categoryFilter={selectedCategoryId || undefined}
    pageSize={selectedPageSize}
    availableCategories={categories}
  />
</section>
