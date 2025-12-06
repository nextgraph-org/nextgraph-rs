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
  const categoryShape = useShape(ExpenseCategoryShapeType);

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
      expenseCategory: obj.expenseCategory ?? new Set<ExpenseCategory>(),
      dateOfPurchase: obj.dateOfPurchase ?? new Date().toISOString(),
      title: obj.title ?? "New Expense",
    });
  }

  $: expenseList = Array.from($expenses ?? []);
  $: availableCategories = Array.from($categoryShape ?? []);
  const expenseKey = (expense: Expense) =>
    `${expense["@graph"]}|${expense["@id"]}`;
</script>

<section class="panel">
  <header class="panel-header">
    <div>
      <p class="label-accent">Expenses</p>
      <h2 class="title">Recent activity</h2>
    </div>
    <button class="primary-btn" on:click={() => createExpense({})}>
      + Add expense
    </button>
  </header>
  <div class="cards-stack">
    {#if !expenseList.length}
      <p class="muted">
        Nothing tracked yet — log your first purchase to kick things off.
      </p>
    {:else}
      {#each expenseList as expense (expenseKey(expense))}
        <ExpenseCard {expense} {availableCategories} />
      {/each}
    {/if}
  </div>
</section>
