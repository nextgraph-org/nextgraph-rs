<script lang="ts">
  import type {
    Expense,
    ExpenseCategory,
  } from "../../shapes/orm/expenseShapes.typings";

  let {
    expense = $bindable(),
    availableCategories = $bindable(),
  }: { expense: Expense; availableCategories: Set<ExpenseCategory> } = $props();

  let isEditing = $state(false);

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

  const purchaseDate = $derived(
    expense.dateOfPurchase
      ? new Date(expense.dateOfPurchase).toLocaleDateString()
      : "Date not set"
  );
  const totalPriceDisplay = $derived(
    currencyFormatter.format(expense.totalPrice ?? 0)
  );

  const categoryKey = (category: ExpenseCategory) => {
    return `${category["@graph"]}|${category["@id"]}`;
  };

  function toggleCategory(category: ExpenseCategory, checked: boolean) {
    if (checked) {
      expense.expenseCategory.add(category["@id"]);
    } else {
      expense.expenseCategory.delete(category["@id"]);
    }
  }

  function isCategorySelected(category: ExpenseCategory) {
    return expense.expenseCategory.has(category["@id"]);
  }

  function nameOfCategory(categoryIri: string) {
    return availableCategories.values().find((c) => c["@id"] === categoryIri)
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
      {isEditing ? "🗸" : "🖉"}
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
      {#if availableCategories.size}
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
      {#if expense.expenseCategory.size}
        <div class="chip-list">
          {#each expense.expenseCategory as categoryIri}
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
