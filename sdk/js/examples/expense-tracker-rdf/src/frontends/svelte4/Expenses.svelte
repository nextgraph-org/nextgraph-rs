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
  import {
    ExpenseCategoryShapeType,
    ExpenseShapeType,
  } from "../../shapes/orm/expenseShapes.shapeTypes";
  import { session } from "../../utils/ngSession";
  import ExpenseCard from "./ExpenseCard.svelte";
  import { createExpense } from "../../utils/createExpense";

  const privateNuri = session && `did:ng:${session?.private_store_id}`;
  const {
    data: expenses,
    nextPage,
    previousPage,
  } = useShape(ExpenseShapeType, {
    graphs: ["did:ng:i"],
    orderBy: { dateOfPurchase: "desc" },
    pageSize: 4,
    maxActivePages: 1,
  });
  const { data: categories } = useShape(ExpenseCategoryShapeType, privateNuri);
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
  <div class="cards-stack">
    {#if !$expenses.size}
      <p class="muted">
        Nothing tracked yet - log your first purchase to kick things off.
      </p>
    {:else}
      {#each expensesSorted as expense, index (expenseKey(expense))}
        <ExpenseCard
          expense={expensesSorted[index]}
          availableCategories={$categories}
        />
      {/each}
    {/if}
  </div>
</section>
