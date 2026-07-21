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
  import { ExpenseCategoryShapeType } from "../../shapes/orm/expenseShapes.shapeTypes";
  import { sessionPromise, session } from "../../utils/ngSession";
  import ExpenseCategoryCard from "./ExpenseCategoryCard.svelte";
  import { insertObject } from "@ng-org/orm";

  const privateNuri = session && `did:ng:${session?.private_store_id}`;
  const { data: expenseCategories, isLoading } = $derived(
    useShape(ExpenseCategoryShapeType, privateNuri)
  );

  async function createCategory() {
    const session = await sessionPromise;
    insertObject(ExpenseCategoryShapeType, {
      "@graph": `did:ng:${session.private_store_id}`,
      "@type": new Set(["did:ng:z:ExpenseCategory"]),
      "@id": "",
      categoryName: "New category",
      description: "",
    });
  }
</script>

<section class="panel">
  <header class="panel-header">
    <div>
      <p class="label-accent">Categories</p>
      <h2 class="title">
        Expense Categories
        <span class="badge">{expenseCategories?.size ?? 0} total</span>
      </h2>
    </div>
    <div class="header-actions">
      <button type="button" class="primary-btn" on:click={createCategory}>
        + New category
      </button>
    </div>
  </header>
  {#if !expenseCategories}
    <p class="muted">Loading...</p>
  {:else if expenseCategories.size === 0}
    <p class="muted">No categories yet</p>
  {:else}
    <div class="cards-grid">
      {#each expenseCategories as category (category["@id"])}
        <ExpenseCategoryCard {category} />
      {/each}
    </div>
  {/if}
</section>
