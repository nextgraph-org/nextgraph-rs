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
  import { ExpenseShapeType } from "../../shapes/orm/expenseShapes.shapeTypes";
  import type {
    Expense,
    ExpenseCategory,
  } from "../../shapes/orm/expenseShapes.typings";
  import { session } from "../../utils/ngSession";
  import ExpenseCard from "./ExpenseCard.svelte";

  let {
    paymentStatusFilter,
    categoryFilter,
    pageSize,
    availableCategories,
    sortBy,
  }: {
    paymentStatusFilter?: Expense["paymentStatus"];
    categoryFilter?: string;
    pageSize?: 5 | 10 | 15;
    availableCategories: Set<ExpenseCategory> | undefined;
    sortBy?: "dateOfPurchase" | "amount" | "totalPrice";
  } = $props();

  const privateNuri = session && `did:ng:${session?.private_store_id}`;

  const orderByConfigs = {
    dateOfPurchase: { dateOfPurchase: "desc" },
    amount: { amount: "desc" },
    totalPrice: { totalPrice: "desc" },
  } as const;

  let {
    data: expenses,
    nextPage,
    previousPage,
  } = $derived(
    useShape(ExpenseShapeType, {
      graphs: privateNuri ? [privateNuri] : [],
      orderBy: orderByConfigs[sortBy || "dateOfPurchase"],
      ...(pageSize
        ? {
            pageSize,
            maxActivePages: 1,
          }
        : {}),
      where: {
        ...(paymentStatusFilter ? { paymentStatus: paymentStatusFilter } : {}),
        ...(categoryFilter ? { expenseCategory: categoryFilter } : {}),
      },
    })
  );
</script>

<div class="cards-stack">
  {#if !expenses || !availableCategories}
    <p class="muted">Loading...</p>
  {:else if expenses.length === 0}
    <p class="muted">No items found</p>
  {:else}
    {#each expenses as expense (expense["@id"])}
      <ExpenseCard {expense} {availableCategories} />
    {/each}
  {/if}
</div>
{#if pageSize}
  <div class="pagination-bar">
    <button type="button" class="primary-btn" onclick={() => previousPage?.()}>
      load previous
    </button>
    <button type="button" class="primary-btn" onclick={() => nextPage?.()}>
      load next
    </button>
  </div>
{/if}
