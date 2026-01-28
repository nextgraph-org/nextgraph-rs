<script lang="ts">
  import type { ExpenseCategory } from "../../types";

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
