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
  import { useShape } from "@ng-org/orm/svelte";
  import {
    ExpenseCategoryShapeType,
    ExpenseShapeType,
  } from "../../shapes/orm/expenseShapes.shapeTypes";
  import type { Expense } from "../../shapes/orm/expenseShapes.typings";
  import { sessionPromise, session } from "../../utils/ngSession";
  import ExpenseCard from "./ExpenseCard.svelte";

  const privateNuri = session && `did:ng:${session?.private_store_id}`;
  const expenses = useShape(ExpenseShapeType, { graphs: [privateNuri || ""] });
  const categories = useShape(ExpenseCategoryShapeType, { graphs: [privateNuri || ""] });

  async function createExpense(obj: Partial<Expense> = {}) {
    const session = await sessionPromise;

    expenses.add({
      "@graph": `did:ng:${session.private_store_id}`,
      "@type": "http://example.org/Expense",
      "@id": "",
      amount: obj.amount ?? 1,
      recurrenceInterval: obj.recurrenceInterval ?? "",
      description: obj.description ?? undefined,
      totalPrice: obj.totalPrice ?? 0,
      paymentStatus: obj.paymentStatus ?? "http://example.org/Paid",
      isRecurring: obj.isRecurring ?? false,
      expenseCategory: obj.expenseCategory ?? new Set<string>(),
      dateOfPurchase: obj.dateOfPurchase ?? new Date().toISOString(),
      title: obj.title ?? "New Expense",
    });
  }
  const expensesSorted = $derived(
    [...expenses].sort((a, b) =>
      a.dateOfPurchase.localeCompare(b.dateOfPurchase)
    )
  );

  const expenseKey = (expense: Expense) =>
    `${expense["@graph"]}|${expense["@id"]}`;
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
    {#if !expenses.size}
      <p class="muted">
        Nothing tracked yet - log your first purchase to kick things off.
      </p>
    {:else}
      {#each expensesSorted as expense, index (expenseKey(expense))}
        <ExpenseCard
          expense={expensesSorted[index]}
          availableCategories={categories}
        />
      {/each}
    {/if}
  </div>
</section>
