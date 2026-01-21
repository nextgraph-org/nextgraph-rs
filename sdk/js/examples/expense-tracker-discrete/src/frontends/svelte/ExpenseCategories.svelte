<script lang="ts">
  import { useDocumentStore } from "./useDocumentStore.svelte";
  import ExpenseCategoryCard from "./ExpenseCategoryCard.svelte";

  const store = useDocumentStore();
  const expenseCategories = $derived(store?.data?.expenseCategories);

  function createCategory() {
    if (!expenseCategories) return;
    expenseCategories.push({
      categoryName: "New category",
      description: "",
    });
  }

  const categoryKey = (category: any, index: number) =>
    category["@id"] ?? `${category.categoryName ?? "category"}-${index}`;
</script>

<section class="panel">
  <header class="panel-header">
    <div>
      <p class="label-accent">Categories</p>
      <h2 class="title">
        Expense Categories
        <span class="badge">{expenseCategories?.length || ""} total</span>
      </h2>
    </div>
    <div class="header-actions">
      <button type="button" class="primary-btn" onclick={createCategory}>
        + New category
      </button>
    </div>
  </header>
  {#if !expenseCategories}
    Loading...
  {:else if !expenseCategories.length}
    <p class="muted">No categories yet</p>
  {:else}
    <div class="cards-grid">
      {#each expenseCategories as category, index (categoryKey(category, index))}
        <ExpenseCategoryCard {category} />
      {/each}
    </div>
  {/if}
</section>
