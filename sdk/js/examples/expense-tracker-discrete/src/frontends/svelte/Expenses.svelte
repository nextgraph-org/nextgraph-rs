<script lang="ts">
  import type { Expense } from "../../types";
  import { useDocumentStore } from "./useDocumentStore.svelte";
  import ExpenseCard from "./ExpenseCard.svelte";

  const store = useDocumentStore();
  const expenses = $derived(store.data?.expenses);
  const expenseCategories = $derived(store.data?.expenseCategories);

  function createExpense(obj: Partial<Expense> = {}) {
    if (!expenses) return;
    expenses.push({
      amount: obj.amount ?? 1,
      recurrenceInterval: obj.recurrenceInterval ?? "",
      description: obj.description ?? "",
      totalPrice: obj.totalPrice ?? 0,
      paymentStatus: obj.paymentStatus ?? "Paid",
      isRecurring: obj.isRecurring ?? false,
      expenseCategories: obj.expenseCategories ?? [],
      dateOfPurchase: obj.dateOfPurchase ?? new Date().toISOString(),
      title: obj.title ?? "New Expense",
    });
  }

  const expensesSorted = $derived(
    expenses &&
      expenses.sort((a, b) => a.dateOfPurchase.localeCompare(b.dateOfPurchase))
  );

  const expenseKey = (expense: Expense, index: number) =>
    expense["@id"] ?? `${expense.title ?? "expense"}-${index}`;
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
    {#if !expenses}
      Loading...
    {:else if expenses.length === 0}
      <p class="muted">
        Nothing tracked yet — log your first purchase to kick things off.
      </p>
    {:else}
      {#each expensesSorted as expense, index (expenseKey(expense, index))}
        <ExpenseCard
          bind:expense={expensesSorted![index]}
          availableCategories={expenseCategories!}
        />
      {/each}
    {/if}
  </div>
</section>
