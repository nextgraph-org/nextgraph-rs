import type { ShapeType } from "@ng-org/shex-orm";
import { expenseShapesSchema } from "./expenseShapes.schema.ts";
import type { Expense, ExpenseCategory } from "./expenseShapes.typings.ts";

// ShapeTypes for expenseShapes

export const ExpenseShapeType: ShapeType<Expense> = {
  schema: expenseShapesSchema,
  shape: "did:ng:z:ExpenseShape",
};

export const ExpenseCategoryShapeType: ShapeType<ExpenseCategory> = {
  schema: expenseShapesSchema,
  shape: "did:ng:z:ExpenseCategoryShape",
};
