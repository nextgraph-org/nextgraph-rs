<script lang="ts">
  import type {
    Expense,
    ExpenseCategory,
  } from "../../shapes/orm/expenseShapes.typings";

  export let expense: Expense;
  export let availableCategories: ExpenseCategory[] = [];

  let isEditing = false;

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

  $: purchaseDate = expense.dateOfPurchase
    ? new Date(expense.dateOfPurchase).toLocaleDateString()
    : "Date not set";
  $: totalPriceDisplay = currencyFormatter.format(expense.totalPrice ?? 0);
  $: selectedCategories = Array.from(expense.expenseCategory ?? []);

  const categoryKey = (category: ExpenseCategory) =>
    `${category["@graph"]}|${category["@id"]}`;

  function toggleCategory(category: ExpenseCategory, checked: boolean) {
    if (checked) {
      expense.expenseCategory.add(category);
    } else {
      expense.expenseCategory.delete(category);
    }
  }

  function isCategorySelected(category: ExpenseCategory) {
    return selectedCategories.some(
      (entry) =>
        entry["@graph"] === category["@graph"] &&
        entry["@id"] === category["@id"]
    );
  }
</script>

<article class="expense-card">
  <div class="expense-header">
    <div class="header-text">
      {#if isEditing}
        <input
          class="header-input"
          bind:value={expense.title}
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
      on:click={() => (isEditing = !isEditing)}
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
          bind:value={expense.description}
          placeholder="Add helpful context"
        ></textarea>
      {:else}
        <p class="value-text">{expense.description || "No description yet."}</p>
      {/if}
    </div>
    <div class="field-group">
      <span class="field-label">Total price (€)</span>
      {#if isEditing}
        <input type="number" class="input" bind:value={expense.totalPrice} />
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
          bind:value={expense.amount}
        />
      {:else}
        <span class="value-text">{expense.amount ?? 1}</span>
      {/if}
    </div>
    <div class="field-group">
      <span class="field-label">Payment status</span>
      {#if isEditing}
        <select class="select" bind:value={expense.paymentStatus}>
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
          {#each availableCategories as category (categoryKey(category))}
            <label class="category-option">
              <input
                type="checkbox"
                class="checkbox"
                checked={isCategorySelected(category)}
                on:change={(event) =>
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
      {#if selectedCategories.length}
        <div class="chip-list">
          {#each selectedCategories as category (categoryKey(category))}
            <span class="chip">{category.categoryName || "Unnamed"}</span>
          {/each}
        </div>
      {:else}
        <p class="muted">No categories linked.</p>
      {/if}
      <small class="helper-text">Enter edit mode to link categories.</small>
    {/if}
  </div>
</article>
