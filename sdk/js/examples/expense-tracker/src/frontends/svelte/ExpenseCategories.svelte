<script lang="ts">
  import { useShape } from "@ng-org/signals/svelte";
  import { ExpenseCategoryShapeType } from "../../shapes/orm/expenseShapes.shapeTypes";
  import { sessionPromise } from "../../utils/ngSession";
  import ExpenseCategoryCard from "./ExpenseCategoryCard.svelte";

  const expenseCategories = useShape(ExpenseCategoryShapeType);

  async function createCategory() {
    const session = await sessionPromise;
    const docId = await session.ng.doc_create(
      session.session_id,
      "Graph",
      "data:graph",
      "store",
      undefined
    );

    $expenseCategories.add({
      "@graph": docId,
      "@type": new Set(["http://example.org/ExpenseCategory"]),
      "@id": "",
      categoryName: "New category",
      description: "",
    });
  }

  const categoryKey = (category: any) =>
    `${category["@graph"]}|${category["@id"]}`;
</script>

<section class="panel">
  <header class="panel-header">
    <div>
      <p class="label-accent">Categories</p>
      <h2 class="title">
        Expense Categories
        <span class="badge">{$expenseCategories?.size ?? 0} total</span>
      </h2>
    </div>
    <div class="header-actions">
      <button type="button" class="primary-btn" on:click={createCategory}>
        + New category
      </button>
    </div>
  </header>
  {#if !$expenseCategories.size}
    <p class="muted">No categories yet</p>
  {:else}
    <div class="cards-grid">
      {#each $expenseCategories as category (categoryKey(category))}
        <ExpenseCategoryCard {category} />
      {/each}
    </div>
  {/if}
</section>
