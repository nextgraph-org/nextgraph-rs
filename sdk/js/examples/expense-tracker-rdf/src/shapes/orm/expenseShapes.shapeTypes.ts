import type { ShapeType } from "@ng-org/shex-orm";
import { expenseShapesSchema } from "./expenseShapes.schema";
import type { Expense, ExpenseCategory } from "./expenseShapes.typings";

// ShapeTypes for expenseShapes
export const ExpenseShapeType = {
  schema: expenseShapesSchema,
  shape: "did:ng:z:ExpenseShape",
} as const satisfies ShapeType<Expense>;

export const ExpenseCategoryShapeType = {
  schema: expenseShapesSchema,
  shape: "did:ng:z:ExpenseCategoryShape",
} as const satisfies ShapeType<ExpenseCategory>;
