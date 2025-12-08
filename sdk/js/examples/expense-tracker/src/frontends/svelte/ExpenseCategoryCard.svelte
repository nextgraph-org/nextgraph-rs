<script lang="ts">
  import type { ExpenseCategory } from "../../shapes/orm/expenseShapes.typings";

  export let category: ExpenseCategory;
  let isEditing = false;

  $: idBase = category["@id"] ?? category.categoryName ?? "category";
</script>

<article class="category-card">
  <div class="card-header">
    <div>
      <p class="label-accent">Category</p>
      <h3 class="title">{category.categoryName || "Untitled category"}</h3>
    </div>
    <button
      type="button"
      class="icon-btn"
      aria-label={isEditing ? "Close editing" : "Edit category"}
      onclick={() => (isEditing = !isEditing)}
    >
      {isEditing ? "🗸" : "🖉"}
    </button>
  </div>
  {#if isEditing}
    <div class="edit-grid">
      <div>
        <label class="field-label" for={`${idBase}-name`}>Category name</label>
        <input
          id={`${idBase}-name`}
          class="text-input"
          value={category.categoryName ?? ""}
          oninput={(event) =>
            (category.categoryName = event.currentTarget?.value ?? "")}
          placeholder="e.g. Groceries"
        />
      </div>
      <div>
        <label class="field-label" for={`${idBase}-description`}
          >Description</label
        >
        <textarea
          id={`${idBase}-description`}
          class="text-area"
          value={category.description ?? ""}
          oninput={(event) =>
            (category.description = event.currentTarget?.value ?? "")}
          placeholder="Optional context for this spend bucket"
        ></textarea>
      </div>
    </div>
  {:else}
    <p class="description">{category.description || "No description yet."}</p>
  {/if}
</article>
