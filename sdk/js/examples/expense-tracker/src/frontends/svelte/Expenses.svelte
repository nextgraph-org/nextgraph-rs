<script lang="ts">
  import { useShape } from "@ng-org/signals/svelte";
  import {
    ExpenseCategoryShapeType,
    ExpenseShapeType,
  } from "../../shapes/orm/expenseShapes.shapeTypes";
  import type {
    Expense,
    ExpenseCategory,
  } from "../../shapes/orm/expenseShapes.typings";
  import { sessionPromise } from "../../utils/ngSession";
  import ExpenseCard from "./ExpenseCard.svelte";

  const expenses = useShape(ExpenseShapeType);
  const categories = useShape(ExpenseCategoryShapeType);

  async function createExpense(obj: Partial<Expense> = {}) {
    const session = await sessionPromise;
    const docId = await session.ng.doc_create(
      session.session_id,
      "Graph",
      "data:graph",
      "store",
      undefined
    );
    $expenses.add({
      "@graph": docId,
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
    [...$expenses].sort((a, b) =>
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
    {#if !$expenses.size}
      <p class="muted">
        Nothing tracked yet — log your first purchase to kick things off.
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
