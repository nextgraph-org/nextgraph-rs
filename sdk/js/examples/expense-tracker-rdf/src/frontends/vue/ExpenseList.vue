<script setup lang="ts">
import { useShape } from "@ng-org/orm/vue";
import { ExpenseShapeType } from "../../shapes/orm/expenseShapes.shapeTypes.ts";
import type { Expense, ExpenseCategory } from "../../shapes/orm/expenseShapes.typings.ts";
import { session } from "../../utils/ngSession.ts";
import ExpenseCard from "./ExpenseCard.vue";

const {
  availableCategories,
  categoryFilter,
  pageSize,
  paymentStatusFilter,
  sortBy,
} = defineProps<{
  paymentStatusFilter?: Expense["paymentStatus"];
  categoryFilter?: string;
  pageSize?: 5 | 10 | 15;
  availableCategories: Set<ExpenseCategory> | undefined;
  sortBy?: "dateOfPurchase" | "amount" | "totalPrice";
}>();

const privateNuri = session && `did:ng:${session?.private_store_id}`;

const orderByConfigs = {
  dateOfPurchase: { dateOfPurchase: "desc" },
  amount: { amount: "desc" },
  totalPrice: { totalPrice: "desc" },
} as const;

const { data: expenses, nextPage, previousPage } = useShape(
  ExpenseShapeType,
  {
    graphs: [privateNuri || "did:ng:i"],
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
    }
  }
);
</script>

<template>
  <div class="cards-stack">
    <p v-if="!expenses || !availableCategories" class="muted">Loading...</p>
    <p v-else-if="expenses.length === 0" class="muted">
      No items found
    </p>
    <template v-else>
      <ExpenseCard v-for="expense in expenses" :key="expense['@id']" :expense="expense"
        :available-categories="availableCategories" />
    </template>
  </div>
  <div v-if="pageSize" class="pagination-bar">
    <button type="button" class="primary-btn" @click="previousPage?.()">
      load previous
    </button>
    <button type="button" class="primary-btn" @click="nextPage?.()">
      load next
    </button>
  </div>
</template>