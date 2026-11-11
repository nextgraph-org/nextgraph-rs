import type { Unsynced } from "@ng-org/shex-orm";
import type * as Synced from "./expenseShapes.syncedTypings.ts";

/**
 * =============================================================================
 * Unsynced Typescript Typings for expenseShapes
 * =============================================================================
 */

/** Expense Type, for creating objects that are not yet attached to the ORM. */
export type Expense = Unsynced<Synced.Expense>;

/** ExpenseCategory Type, for creating objects that are not yet attached to the ORM. */
export type ExpenseCategory = Unsynced<Synced.ExpenseCategory>;
