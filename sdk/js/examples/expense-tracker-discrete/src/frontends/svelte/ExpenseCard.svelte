<!--
// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT
-->
<script lang="ts">
  import type { Expense, ExpenseCategory } from "../../types";

  let {
    expense,
    availableCategories,
  }: { expense: Expense; availableCategories: ExpenseCategory[] } = $props();

  let isEditing = $state(false);

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

  const purchaseDate = $derived(
    expense.dateOfPurchase
      ? new Date(expense.dateOfPurchase).toLocaleDateString()
      : "Date not set"
  );
  const totalPriceDisplay = $derived(
    currencyFormatter.format(expense.totalPrice ?? 0)
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
    return availableCategories.find((c) => c["@id"] === categoryIri)
      ?.categoryName;
  }
</script>

<article class="expense-card">
  <div class="expense-header">
    <div class="header-text">
      {#if isEditing}
        <input
          class="header-input"
          value={expense.title ?? ""}
          oninput={(event) =>
            (expense.title = event.currentTarget?.value ?? "")}
          placeholder="Expense title"
        />
      {:else}
        <h3 class="header-title">{expense.title || "New expense"}</h3>
      {/if}
      <p class="muted small-margin">{purchaseDate}</p>
    </div>
    <button
      type="button"
      class="icon-btn"
      aria-label={isEditing ? "Close editing" : "Edit expense"}
      onclick={() => (isEditing = !isEditing)}
    >
      {#if isEditing }
        <svg data-slot="icon" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"></path>
        </svg>
      {:else}
        <svg data-slot="icon" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"></path>
        </svg>
      {/if}
    </button>
  </div>
  <div class="info-grid">
    <div class="field-group">
      <span class="field-label">Description</span>
      {#if isEditing}
        <textarea
          class="textarea"
          value={expense.description ?? ""}
          oninput={(event) =>
            (expense.description = event.currentTarget?.value ?? "")}
          placeholder="Add helpful context"
        ></textarea>
      {:else}
        <p class="value-text">{expense.description || "No description yet."}</p>
      {/if}
    </div>
    <div class="field-group">
      <span class="field-label">Total price (€)</span>
      {#if isEditing}
        <input
          type="number"
          class="input"
          value={expense.totalPrice ?? 0}
          oninput={(event) => {
            const next = event.currentTarget?.valueAsNumber;
            expense.totalPrice = Number.isFinite(next) ? (next ?? 0) : 0;
          }}
        />
      {:else}
        <span class="value-text">{totalPriceDisplay}</span>
      {/if}
    </div>
    <div class="field-group">
      <span class="field-label">Quantity</span>
      {#if isEditing}
        <input
          type="number"
          min="1"
          class="input"
          value={expense.amount ?? 1}
          oninput={(event) => {
            const next = event.currentTarget?.valueAsNumber;
            expense.amount = Number.isFinite(next) ? (next ?? 1) : 1;
          }}
        />
      {:else}
        <span class="value-text">{expense.amount ?? 1}</span>
      {/if}
    </div>
    <div class="field-group">
      <span class="field-label">Payment status</span>
      {#if isEditing}
        <select
          class="select"
          value={expense.paymentStatus}
          onchange={(event) => {
            const selected = event.currentTarget?.value;
            if (selected) {
              expense.paymentStatus = selected as Expense["paymentStatus"];
            }
          }}
        >
          {#each paymentStatusEntries as [iri, label]}
            <option value={iri}>{label}</option>
          {/each}
        </select>
      {:else}
        <span class="value-text">
          {paymentStatusLabels[expense.paymentStatus] ?? "Unknown"}
        </span>
      {/if}
    </div>
  </div>
  <div class="field-group">
    <span class="field-label">Categories</span>
    {#if isEditing}
      {#if availableCategories.length}
        <div class="category-picker">
          {#each availableCategories as category}
            <label class="category-option">
              <input
                type="checkbox"
                class="checkbox"
                checked={isCategorySelected(category)}
                onchange={(event) =>
                  toggleCategory(
                    category,
                    event.currentTarget?.checked ?? false
                  )}
              />
              <span class="category-text">
                <strong>{category.categoryName || "Unnamed"}</strong>
                <small class="muted">
                  {category.description || "No description"}
                </small>
              </span>
            </label>
          {/each}
        </div>
      {:else}
        <p class="muted">No categories available yet. Create one above.</p>
      {/if}
    {:else}
      {#if expense.expenseCategories?.length}
        <div class="chip-list">
          {#each expense.expenseCategories as categoryIri}
            <span class="chip">{nameOfCategory(categoryIri) || "Unnamed"}</span>
          {/each}
        </div>
      {:else}
        <p class="muted">No categories linked.</p>
      {/if}
      <small class="helper-text">Enter edit mode to link categories.</small>
    {/if}
  </div>
</article>
