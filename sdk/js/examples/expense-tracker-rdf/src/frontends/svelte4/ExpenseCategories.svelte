<!--
// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
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
  import { useShape } from "@ng-org/orm/svelte4";
  import { ExpenseCategoryShapeType } from "../../shapes/orm/expenseShapes.shapeTypes";
  import { sessionPromise, session } from "../../utils/ngSession";
  import ExpenseCategoryCard from "./ExpenseCategoryCard.svelte";

  const privateNuri = session && `did:ng:${session?.private_store_id}`;
  const expenseCategories = useShape(ExpenseCategoryShapeType, { graphs: [privateNuri || ""] });

  async function createCategory() {
    const session = await sessionPromise;
    $expenseCategories.add({
      "@graph": `did:ng:${session.private_store_id}`,
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
